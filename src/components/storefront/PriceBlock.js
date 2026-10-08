import React from "react";
import { formatCurrency } from "../../utils/helpers";
import styles from "./PriceBlock.module.css";

// =============================================================================
// PriceBlock — honest, transparent pricing
// =============================================================================
// Shows the current price in a quiet sans and, ONLY when the compare-at price
// is genuinely higher, the struck-through original (announced as "Was …") and,
// when asked, the saving. The saving can never be fabricated: it is derived
// from (compare − current), so a component author cannot type in a fake
// "% off". If compare ≤ current, nothing but the price renders.
//
// The saving reads "Save 12%" at "sm" and "md" (cards and summaries) and
// "Save ₹1,500" at "lg" (the product page), in the accent-text tone.
//
// Props:
//   price        number   current/selling price (required)
//   comparePrice number   original price (optional)
//   currency     string   ISO code (default "INR")
//   size         "sm"|"md"|"lg"  visual scale (default "lg" for the PDP)
//   showSavings  boolean  show the saving (default true on lg)
//   taxNote      string   optional transparency note, e.g. "Inclusive of all taxes"
// =============================================================================
const PriceBlock = ({
  price = 0,
  comparePrice = 0,
  currency = "INR",
  size = "lg",
  showSavings,
  taxNote,
}) => {
  const current = Number(price) || 0;
  const compare = Number(comparePrice) || 0;
  const hasDiscount = compare > current && current > 0;
  const discount = hasDiscount
    ? Math.round(((compare - current) / compare) * 100)
    : 0;
  const savings = hasDiscount ? compare - current : 0;
  const wantSavings = showSavings ?? size === "lg";
  // A saving that rounds to 0% is not worth a line; the struck price stays.
  const savingsLabel =
    size === "lg"
      ? `Save ${formatCurrency(savings, currency)}`
      : discount > 0
        ? `Save ${discount}%`
        : null;

  return (
    <div className={`${styles.block} ${styles[size] || ""}`}>
      <div className={styles.row}>
        <span className={styles.price}>{formatCurrency(current, currency)}</span>
        {hasDiscount && (
          <span className={styles.compare}>
            <span className="sf-visually-hidden">Was </span>
            {formatCurrency(compare, currency)}
          </span>
        )}
        {hasDiscount && wantSavings && savingsLabel && (
          <span className={styles.savings}>{savingsLabel}</span>
        )}
      </div>
      {taxNote && <div className={styles.taxNote}>{taxNote}</div>}
    </div>
  );
};

export default PriceBlock;
