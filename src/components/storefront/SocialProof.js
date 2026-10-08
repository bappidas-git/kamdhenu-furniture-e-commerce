import React from "react";
import StarRating from "./StarRating";
import styles from "./SocialProof.module.css";

// =============================================================================
// SocialProof — ratings/reviews summary, REAL DATA ONLY
// =============================================================================
// Ethics guardrail (see STOREFRONT_UX_GUIDELINES.md):
//   This component is deliberately built so it CANNOT display a fabricated
//   signal. It accepts only numbers — an aggregate `rating` and a `count` of
//   real ratings — never free-typed claims like "Bestseller!" or "10k sold".
//   When `count` is 0 it renders an honest empty state ("No reviews yet"); it
//   will not show a hollow "0.0 (0)". Callers must pass values derived from the
//   real reviews system, so what shows is always backed by data.
//
// Look (Prompt 16): one quiet row, the stars (14px; 12px at "sm") then
// "4.6 · 12 reviews" in ink. With `onReviewsClick` the row is a button styled
// as a link that jumps to the reviews; screen readers hear
// "Rated 4.6 out of 5, 12 reviews".
//
// Props:
//   rating         number  aggregate rating 0–5 (real)
//   count          number  number of real ratings/reviews behind it
//   onReviewsClick fn      optional — jump to the reviews section
//   size           "sm"|"md"
//   className      string
// =============================================================================
const SocialProof = ({
  rating = 0,
  count = 0,
  onReviewsClick,
  size = "md",
  className = "",
}) => {
  const ratingsCount = Math.max(0, Number(count) || 0);
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const rootClass = `${styles.wrap} ${styles[size] || ""} ${className}`.trim();

  // Honest empty state — no ratings, so claim nothing.
  if (ratingsCount <= 0) {
    return (
      <div className={rootClass}>
        <span className={styles.empty}>No reviews yet</span>
      </div>
    );
  }

  const figure = value.toFixed(1);
  const countLabel = `${ratingsCount.toLocaleString("en-IN")} ${
    ratingsCount === 1 ? "review" : "reviews"
  }`;

  const content = (
    <>
      <span className={styles.stars} aria-hidden="true">
        <StarRating rating={value} size={size === "sm" ? 12 : 14} />
      </span>
      <span className={styles.text}>
        <span className="sf-visually-hidden">Rated </span>
        <span className={styles.figure}>{figure}</span>
        <span className="sf-visually-hidden"> out of 5, </span>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.count}>{countLabel}</span>
      </span>
    </>
  );

  if (onReviewsClick) {
    return (
      <div className={rootClass}>
        <button type="button" className={styles.link} onClick={onReviewsClick}>
          {content}
        </button>
      </div>
    );
  }

  return <div className={rootClass}>{content}</div>;
};

export default SocialProof;
