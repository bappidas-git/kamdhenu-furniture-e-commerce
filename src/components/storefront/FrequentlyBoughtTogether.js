import React, { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Reveal, renderAccent } from "../ui";
import {
  getProductMinPrice,
  getDefaultCartVariant,
  buildCartItem,
  productPath,
  formatCurrency,
  PLACEHOLDER_IMG,
  onImageError,
} from "../../utils/helpers";
import styles from "./FrequentlyBoughtTogether.module.css";

// =============================================================================
// FrequentlyBoughtTogether — "Complete the set", a curated bundle (honest AOV)
// =============================================================================
// Shows the current product plus the companions the merchant curated for it
// (frequentlyBoughtTogetherIds, passed in by the caller). It is a curation,
// not a co-purchase statistic, so it never says "customers also bought". The
// shopper ticks what they want; the total is the sum of the real prices
// (getProductMinPrice: the price each card shows), with no invented "bundle
// discount", and "Add N to cart" hands each chosen piece to onAddToCart as
// buildCartItem(product), the card's quick-add line (its cheapest option,
// named under each piece so the shopper sees what will be added). Without
// companions the module renders nothing.
//
// Look (Prompt 17): a sand panel with an eyebrow and a serif heading; a 4:5
// tile per piece (a row from 600px, joined by "+"; stacked rows on phones)
// with its name in the serif, the option and the price; a native checkbox per
// companion (.sf-check), checked until the shopper unticks it; the running
// total in sans 20px and a primary "Add N to cart".
//
// A piece that is sold out (stock 0, the card's rule) cannot be chosen: its
// box stays unticked and disabled, and it is left out of the total and of
// the add.
//
// Props:
//   anchor       object  the product being viewed (always included)
//   companions   array   its curated companions (selectable)
//   onAddToCart  fn      (cartItem) => void — called once per chosen piece
//   currency     string
//   eyebrow, title       "Curated by us", "Complete the *set*."
//   className    string  on the <section>
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

const isSoldOut = (product) =>
  product?.stock != null && product.stock !== "" && Number(product.stock) <= 0;

const FrequentlyBoughtTogether = ({
  anchor,
  companions = [],
  onAddToCart,
  currency = "INR",
  eyebrow = "Curated by us",
  title = "Complete the *set*.",
  className,
}) => {
  const items = useMemo(
    () => (Array.isArray(companions) ? companions.filter(Boolean) : []),
    [companions]
  );
  const baseId = useId();

  // Companions start selected (the anchor is always in). Keyed by product id.
  // We store only explicit toggles and treat "unset" as selected, so
  // companions that arrive AFTER first render (async load) still default to
  // checked without needing a sync effect.
  const [selected, setSelected] = useState({});

  if (!anchor || items.length === 0) return null;

  const isOn = (id) => selected[id] !== false;
  const toggle = (id) => setSelected((s) => ({ ...s, [id]: s[id] === false }));

  const pieces = [anchor, ...items];
  const isChosen = (product, index) =>
    !isSoldOut(product) && (index === 0 || isOn(product.id));
  const chosen = pieces.filter(isChosen);
  const total = chosen.reduce((sum, p) => sum + getProductMinPrice(p).sellingPrice, 0);
  const headingId = `${baseId}title`;

  const handleAddAll = () => {
    chosen.forEach((p) => onAddToCart?.(buildCartItem(p)));
  };

  return (
    <section className={cx(styles.section, className)} aria-labelledby={headingId}>
      <Reveal className={cx("sf-panel", styles.panel)}>
        <div className={styles.head}>
          <p className="sf-eyebrow">{eyebrow}</p>
          <h2 id={headingId} className={cx("sf-display-md", styles.title)}>
            {renderAccent(title)}
          </h2>
        </div>

        <div className={styles.body}>
          <ul className={styles.pieces}>
            {pieces.map((product, index) => {
              const isAnchor = index === 0;
              const soldOut = isSoldOut(product);
              const option = getDefaultCartVariant(product)?.name;
              const detailId = `${baseId}piece-${index}`;
              const image = product.images?.[0] || product.image || PLACEHOLDER_IMG;
              const thumb = (
                <img
                  src={image}
                  alt={isAnchor ? "" : product.name}
                  width="1200"
                  height="1500"
                  loading="lazy"
                  decoding="async"
                  onError={onImageError}
                />
              );

              return (
                <li key={product.id ?? index} className={styles.piece}>
                  {/* The anchor is this page, so its photograph is not a link;
                      a companion's photograph opens its page. */}
                  {isAnchor ? (
                    <span className={styles.thumb}>{thumb}</span>
                  ) : (
                    <Link to={productPath(product)} className={styles.thumb}>
                      {thumb}
                    </Link>
                  )}

                  <div className={styles.text}>
                    <label className={cx("sf-check", styles.check, isAnchor && styles.anchorCheck)}>
                      {isAnchor ? (
                        <input
                          type="checkbox"
                          checked={!soldOut}
                          readOnly
                          disabled
                          aria-describedby={detailId}
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isChosen(product, index)}
                          onChange={() => toggle(product.id)}
                          disabled={soldOut}
                          aria-describedby={detailId}
                        />
                      )}
                      <span className={styles.name}>{product.name}</span>
                    </label>
                    <div id={detailId} className={styles.detail}>
                      {(isAnchor || soldOut || option) && (
                        <p className={styles.meta}>
                          {[isAnchor && "This piece", soldOut && "Sold out", option]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      <p className={cx("sf-price", styles.price)}>
                        {formatCurrency(getProductMinPrice(product).sellingPrice, currency)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={styles.summary}>
            <p className={styles.total} aria-live="polite" aria-atomic="true">
              <span className={styles.totalLabel}>
                Total for {chosen.length} {chosen.length === 1 ? "piece" : "pieces"}
              </span>
              <span className={cx("sf-price", styles.totalValue)}>
                {formatCurrency(total, currency)}
              </span>
            </p>
            <button
              type="button"
              className={cx("sf-btn sf-btn--primary sf-btn--lg", styles.add)}
              onClick={handleAddAll}
              disabled={chosen.length === 0}
            >
              {chosen.length > 0 ? `Add ${chosen.length} to cart` : "Add to cart"}
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
};

export default FrequentlyBoughtTogether;
