import React from "react";
import styles from "./StarRating.module.css";

// =============================================================================
// StarRating — shared, accessible star display
// =============================================================================
// Domain-agnostic presentation atom used by SocialProof, ProductCard, the
// reviews list and the review carousel. Renders five stars from a numeric
// rating, each filled by exactly its share of the rating (4.3 fills four stars
// and 30% of the fifth), so the stars never round a rating up. Purely
// presentational: it shows whatever real rating it is given and never invents
// one.
//
// The stars are inline SVG (crisp at any size, identical on every platform,
// unlike a font's "★"). Empty stars use --sf-color-border-strong, filled ones
// --sf-color-star; a parent can override --sf-color-star (the review carousel
// draws its stars in ink on sand).
//
// Props:
//   rating  number  0–5 (clamped)
//   size    number  px size of each star (default 18)
//   label   string  optional aria-label override
// =============================================================================

// One five-point star on a 20 × 20 grid, centred both ways.
const STAR_PATH =
  "M10 1.5L12.21 7.86L18.94 7.99L13.58 12.06L15.53 18.5L10 14.66L4.47 18.5L6.42 12.06L1.06 7.99L7.79 7.86Z";

const StarShape = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d={STAR_PATH} />
  </svg>
);

const StarRating = ({ rating = 0, size = 18, label }) => {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    // This star's share of the rating, 0–1 (to the nearest percent).
    const share = Math.round(Math.max(0, Math.min(1, value - (i - 1))) * 100);
    stars.push(
      <span key={i} className={styles.star}>
        <StarShape className={styles.empty} />
        {share > 0 && (
          <span className={styles.fill} style={{ width: `${share}%` }}>
            <StarShape className={styles.filled} />
          </span>
        )}
      </span>
    );
  }
  return (
    <span
      className={styles.stars}
      style={{ fontSize: size }}
      role="img"
      aria-label={label || `Rated ${value.toFixed(1)} out of 5`}
    >
      {stars}
    </span>
  );
};

export default StarRating;
