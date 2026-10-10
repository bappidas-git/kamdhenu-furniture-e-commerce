import React, { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PriceBlock, StarRating } from "../../components/storefront";
import {
  getProductMinPrice,
  buildCartItem,
  productPath,
  PLACEHOLDER_IMG,
  onImageError,
} from "../../utils/helpers";
import styles from "./ProductListRow.module.css";

// =============================================================================
// ProductListRow — the listing's list view (page-local)
// =============================================================================
// ProductCard has no horizontal layout and stays as Prompt 13 left it, so the
// list view renders this row. It reuses the card's parts and keeps its rules:
//   • the thumbnail (4:5, sand while loading, the placeholder on error) and
//     the card's data-only chips: "Sold out", "Sale", "New", two at most;
//   • one link per product: the brand and the name. The thumbnail repeats it
//     as a pointer target, out of the tab order and the accessibility tree;
//   • StarRating only when there are real reviews (ink stars, as on the card);
//   • PriceBlock at "md" with its saving, which the row has room for;
//   • "Only N left" when the page passes `lowStock` (its low-stock rule);
//   • the card's quick add (buildCartItem; "Added" for 1.2s; disabled and
//     "Sold out" at zero stock) and wishlist toggle (aria-pressed, the same
//     labels).
//
// Props: product, onAddToCart(cartItem), onToggleWishlist(product),
// isWishlisted, lowStock (a number, or null). Also exports
// ProductListRowSkeleton for the loading list.
// =============================================================================

// The catalogue's photographs are 1200 × 1500 (4:5).
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 1500;
// How long the quick add reads "Added" after a click (the card's timing).
const ADDED_FOR_MS = 1200;

// The fill is always there; the stylesheet shows it (fill-opacity) while the
// piece is saved, fading over --sf-duration-fast, as on the card.
const HeartIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <path
      d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

// The card's chips, most important first; never more than two.
const rowChips = ({ soldOut, onSale, isNew }) =>
  [soldOut && "Sold out", onSale && "Sale", isNew && "New"].filter(Boolean).slice(0, 2);

const ProductListRow = ({
  product,
  onAddToCart,
  onToggleWishlist,
  isWishlisted = false,
  lowStock = null,
}) => {
  const id = useId();
  const nameId = `${id}name`;
  const brandId = `${id}brand`;
  const [added, setAdded] = useState(false);
  const addedTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  if (!product) return null;

  const { sellingPrice, originalPrice, discount } = getProductMinPrice(product);
  const ratingCount = Number(product.totalReviews) || 0;
  const rating = Math.max(0, Math.min(5, Number(product.rating) || 0));
  const outOfStock = product.stock === 0;
  const name = product.name || "";
  const brand = typeof product.brand === "string" ? product.brand.trim() : "";
  const summary =
    typeof product.shortDescription === "string" ? product.shortDescription.trim() : "";
  const href = productPath(product);
  const image = product.images?.[0] || product.image || PLACEHOLDER_IMG;
  const chips = rowChips({
    soldOut: outOfStock,
    onSale: discount > 0,
    isNew: Boolean(product.hot),
  });

  const handleQuickAdd = () => {
    onAddToCart(buildCartItem(product));
    setAdded(true);
    window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), ADDED_FOR_MS);
  };

  return (
    <article
      className={`${styles.row} ${outOfStock ? styles.soldOut : ""}`}
      aria-labelledby={nameId}
    >
      <div className={styles.media}>
        <Link to={href} className={styles.mediaLink} tabIndex={-1} aria-hidden="true">
          <img
            className={styles.image}
            src={image}
            alt={name}
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
            loading="lazy"
            decoding="async"
            onError={onImageError}
          />
        </Link>
        {chips.length > 0 && (
          <div className={styles.chips}>
            {chips.map((chip) => (
              <span key={chip} className={`sf-badge ${styles.chip}`}>
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.body}>
        <Link
          to={href}
          className={styles.titleLink}
          aria-labelledby={nameId}
          aria-describedby={brand ? brandId : undefined}
        >
          {brand && (
            <span id={brandId} className={styles.brand}>
              {brand}
            </span>
          )}
          <span id={nameId} className={styles.name}>
            {name}
          </span>
        </Link>

        {summary && <p className={styles.summary}>{summary}</p>}

        {ratingCount > 0 && (
          <div className={styles.rating}>
            <StarRating
              rating={rating}
              size={12}
              label={`Rated ${rating.toFixed(1)} out of 5, ${ratingCount.toLocaleString()} ${
                ratingCount === 1 ? "review" : "reviews"
              }`}
            />
            <span className={styles.ratingCount} aria-hidden="true">
              ({ratingCount.toLocaleString()})
            </span>
          </div>
        )}

        <PriceBlock price={sellingPrice} comparePrice={originalPrice} size="md" showSavings />

        {lowStock != null && <p className={styles.stock}>Only {lowStock} left</p>}
      </div>

      {(typeof onAddToCart === "function" || onToggleWishlist) && (
        <div className={styles.actions}>
          {typeof onAddToCart === "function" && (
            <button
              type="button"
              className={`sf-btn sf-btn--ghost ${styles.add}`}
              disabled={outOfStock}
              onClick={handleQuickAdd}
            >
              {/* The visible word changes for a moment; the name does not, so
                  the cart toast is the one announcement. */}
              <span aria-hidden="true">
                {outOfStock ? "Sold out" : added ? <span className="sf-fade-in">Added</span> : "Add to cart"}
              </span>
              <span className="sf-visually-hidden">
                {outOfStock ? `Sold out, ${name}` : `Add to cart, ${name}`}
              </span>
            </button>
          )}
          {onToggleWishlist && (
            <button
              type="button"
              className={`${styles.wishlist} ${isWishlisted ? styles.wishlisted : ""}`}
              aria-pressed={Boolean(isWishlisted)}
              aria-label={isWishlisted ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
              onClick={() => onToggleWishlist(product)}
            >
              <HeartIcon />
            </button>
          )}
        </div>
      )}
    </article>
  );
};

// A row's box while products load: the thumbnail and four lines (brand, name,
// summary, price). Hidden from assistive technology; the list is aria-busy.
export const ProductListRowSkeleton = () => (
  <div className={styles.skeleton} aria-hidden="true">
    <span className={`sf-skeleton sf-skeleton--image ${styles.skeletonMedia}`} />
    <span className={styles.skeletonBody}>
      <span className={`sf-skeleton ${styles.skeletonLine} ${styles.skeletonBrand}`} />
      <span className={`sf-skeleton ${styles.skeletonLine} ${styles.skeletonName}`} />
      <span className={`sf-skeleton ${styles.skeletonLine} ${styles.skeletonSummary}`} />
      <span className={`sf-skeleton ${styles.skeletonLine} ${styles.skeletonPrice}`} />
    </span>
  </div>
);

export default ProductListRow;
