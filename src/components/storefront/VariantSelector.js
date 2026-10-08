import React from "react";
import { formatCurrency } from "../../utils/helpers";
import {
  hasStructuredAttributes,
  getAttributeNames,
  getAttributeValues,
  isColorAttribute,
  buildColorMap,
  variantStock,
  isVariantOutOfStock,
  optionAvailability,
  facetInStockGlobally,
  resolveVariantForOption,
} from "./variantUtils";
import styles from "./VariantSelector.module.css";

// =============================================================================
// VariantSelector — visible, tappable variant picker (NEVER a dropdown)
// =============================================================================
// All options are shown at once as swatches/chips so shoppers can scan every
// choice at a glance. Works for ANY domain because attribute names are read from
// the data, not hardcoded:
//
//   • Structured attributes → one labelled row per attribute: colour rows
//     (colour, shade, finish) as 28px swatches when `swatchHex` is provided,
//     every other attribute as 40px chips.
//   • Flat `name` variants   → a single row of price-bearing chips.
//
// Honesty: per-variant price and REAL availability are reflected; impossible
// combinations are disabled and out-of-stock options are clearly marked — no
// faked availability. Implemented as ARIA radiogroups: one tab stop per group
// (the chosen option), the arrow keys, Home and End move the choice, and a
// sold-out option is skipped (it is disabled).
//
// Props:
//   variants       array   product.variants
//   value          object  the selected variant (controlled)
//   onChange       fn      (variant) => void
//   productStock   number  product-level stock fallback
//   currency       string  default "INR"
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

const ROVING_KEYS = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];

// The radio-group keyboard pattern: the arrow keys move focus to the next or
// previous enabled option (wrapping) and choose it, as a click would; Home and
// End go to the first and last.
const onRadioGroupKeyDown = (e) => {
  if (!ROVING_KEYS.includes(e.key)) return;
  const radios = Array.from(e.currentTarget.querySelectorAll('[role="radio"]')).filter(
    (el) => !el.disabled
  );
  if (radios.length === 0) return;
  const at = radios.indexOf(e.target.closest('[role="radio"]'));
  let next;
  if (e.key === "Home") next = 0;
  else if (e.key === "End") next = radios.length - 1;
  else if (e.key === "ArrowRight" || e.key === "ArrowDown") next = at < 0 ? 0 : (at + 1) % radios.length;
  else next = at < 0 ? radios.length - 1 : (at - 1 + radios.length) % radios.length;
  e.preventDefault();
  if (radios[next] === e.target) return;
  radios[next].focus();
  radios[next].click();
};

// One tab stop per group: the chosen option, else the first enabled one.
const rovingIndex = (options) => {
  const chosen = options.findIndex((o) => o.selected && !o.disabled);
  if (chosen >= 0) return chosen;
  return options.findIndex((o) => !o.disabled);
};

const VariantSelector = ({
  variants = [],
  value,
  onChange,
  productStock,
  currency = "INR",
}) => {
  if (!Array.isArray(variants) || variants.length === 0) return null;

  const structured = hasStructuredAttributes(variants);

  // ---------------------------------------------------------------------------
  // FLAT MODE — a single row of selectable chips (name + price + OOS).
  // ---------------------------------------------------------------------------
  if (!structured) {
    const options = variants.map((variant) => ({
      variant,
      selected: value?.id === variant.id,
      disabled: isVariantOutOfStock(variant, productStock),
    }));
    const tabStop = rovingIndex(options);
    return (
      <div className={styles.selector}>
        <div className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.label}>Select Option</span>
            {value?.name && <span className={styles.chosen}>{value.name}</span>}
          </div>
          <div
            className={styles.options}
            role="radiogroup"
            aria-label="Variant"
            onKeyDown={onRadioGroupKeyDown}
          >
            {options.map(({ variant, selected, disabled: oos }, i) => (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={oos}
                tabIndex={i === tabStop ? 0 : -1}
                className={cx("sf-chip", styles.chip, styles.chipFlat, oos && styles.chipOos)}
                onClick={() => !oos && onChange?.(variant)}
              >
                <span className={styles.chipName}>{variant.name}</span>
                {typeof variant.price === "number" && (
                  <span className={styles.chipPrice}>
                    <span className="sf-visually-hidden">, </span>
                    {formatCurrency(variant.price, currency)}
                  </span>
                )}
                {oos && <span className="sf-visually-hidden"> (out of stock)</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STRUCTURED MODE — grouped swatches/chips, one row per attribute.
  // ---------------------------------------------------------------------------
  const attrNames = getAttributeNames(variants);
  const colorMap = buildColorMap(variants);
  // The selected facets are read straight from the controlled variant, so the UI
  // and the resolved variant can never disagree.
  const selectedAttrs = value?.attributes || {};

  const handlePick = (name, optValue) => {
    const others = { ...selectedAttrs };
    delete others[name];
    const next = resolveVariantForOption(variants, name, optValue, others, productStock);
    if (next) onChange?.(next);
  };

  return (
    <div className={styles.selector}>
      {attrNames.map((name) => {
        const values = getAttributeValues(variants, name);
        const colorRow = isColorAttribute(name);
        const others = { ...selectedAttrs };
        delete others[name];
        const selectedValue = selectedAttrs[name];

        const options = values.map((optValue) => {
          const { exists, inStock } = optionAvailability(
            variants,
            name,
            optValue,
            others,
            productStock
          );
          // Buyable somewhere? If not, this facet is genuinely sold out →
          // hard-disable + strike. If it IS buyable but not with the OTHER
          // current selections, keep it CLICKABLE and just mute it: clicking
          // snaps to the nearest real variant (switching the conflicting
          // attribute). This is what prevents dead-ends on disjoint matrices
          // (e.g. Black only in UK7/8, Blue only in UK9/10).
          const buyable = facetInStockGlobally(variants, name, optValue, productStock);
          const soldOut = !buyable;
          return {
            optValue,
            selected: selectedValue === optValue,
            disabled: soldOut,
            soldOut,
            mutedInCombo: buyable && (!exists || !inStock),
          };
        });
        const tabStop = rovingIndex(options);

        return (
          <div className={styles.group} key={name}>
            <div className={styles.groupHead}>
              <span className={styles.label}>{name}</span>
              {selectedValue != null && (
                <span className={styles.chosen}>{selectedValue}</span>
              )}
            </div>
            <div
              className={cx(styles.options, colorRow && styles.optionsColor)}
              role="radiogroup"
              aria-label={name}
              onKeyDown={onRadioGroupKeyDown}
            >
              {options.map(({ optValue, selected, soldOut, mutedInCombo }, i) => {
                const hex = colorMap[optValue];
                const hint = soldOut
                  ? " (sold out)"
                  : mutedInCombo
                  ? " (unavailable with current selection — tap to switch)"
                  : "";

                if (colorRow) {
                  return (
                    <button
                      key={optValue}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${optValue}${hint}`}
                      title={optValue}
                      disabled={soldOut}
                      tabIndex={i === tabStop ? 0 : -1}
                      className={cx(
                        styles.swatch,
                        selected && styles.swatchActive,
                        soldOut && styles.swatchOos,
                        mutedInCombo && styles.swatchMuted
                      )}
                      onClick={() => handlePick(name, optValue)}
                    >
                      <span
                        className={styles.swatchChip}
                        style={hex ? { background: hex } : undefined}
                      >
                        {!hex && (
                          <span className={styles.swatchText} aria-hidden="true">
                            {String(optValue).charAt(0)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={optValue}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${optValue}${hint}`}
                    disabled={soldOut}
                    tabIndex={i === tabStop ? 0 : -1}
                    className={cx(
                      "sf-chip",
                      styles.chip,
                      soldOut && styles.chipOos,
                      mutedInCombo && styles.chipMuted
                    )}
                    onClick={() => handlePick(name, optValue)}
                  >
                    <span className={styles.chipName}>{optValue}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {/* Honest, real per-variant facts for the resolved selection. */}
      {value && (
        <div className={styles.selectedMeta}>
          {(() => {
            const s = variantStock(value, productStock);
            if (typeof s !== "number") return null;
            if (s <= 0) return <span className={styles.metaOos}>This option is out of stock</span>;
            if (s <= (value.lowStockThreshold || 5))
              return <span className={styles.metaLow}>Only {s} left in this option</span>;
            return null;
          })()}
        </div>
      )}
    </div>
  );
};

export default VariantSelector;
