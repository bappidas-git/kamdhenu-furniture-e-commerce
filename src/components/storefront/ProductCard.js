import React, { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import StarRating from "./StarRating";
import PriceBlock from "./PriceBlock";
import {
  getProductMinPrice,
  buildCartItem,
  productPath,
  truncateText,
  PLACEHOLDER_IMG,
  onImageError,
} from "../../utils/helpers";
import styles from "./ProductCard.module.css";

// =============================================================================
// ProductCard — the reusable storefront product card
// =============================================================================
// One card, used by every product surface (home rails and curations, related
// carousels, listing grids, search, offers, wishlist). Image-forward and
// quiet: a 4:5 photograph, the brand as an eyebrow, the name in the display
// serif, the rating row and the price. Domain-agnostic: it renders whatever
// real product data it's given and makes no API calls.
//
// Honesty rules: stars + count show ONLY when there are real reviews (never a
// hollow "(0)"); the chips come from data alone ("Sold out" from stock === 0,
// "Sale" from a real compare-at price, "New" from the admin's `hot` flag; two
// at most).
//
// Structure: an <article> named by the product name. One link wraps the image
// and the titles; the chips, the wishlist toggle and the quick add sit over
// the image in a sibling layer, so no control is nested in the link. Tab
// order: the link, the heart, the quick add.
//
// Pointer devices: on hover the photograph scales to 1.03, crossfades to the
// second photograph (mounted on the first hover, lazy, shown once loaded), a
// hairline frames it and the "Add to cart" bar slides up from its bottom edge
// (keyboard focus inside the card shows the bar too). Touch devices get a
// persistent "+" button instead. For 1.2s after a click the bar reads "Added"
// and the "+" turns into a check; the page's handler and CartContext own the
// toast and the drawer.
//
// Props:
//   product           object  (required)
//   onAddToCart       fn      (cartItem) => void  — omit to hide the quick add
//   onToggleWishlist  fn      (product) => void   — omit to hide the heart
//   isWishlisted      boolean
//   showAddToCart     boolean default true (when onAddToCart given)
//
// Also exports ProductCardSkeleton: the same box (4:5 image + three lines) for
// pages to show while products load.
// =============================================================================

// The catalogue's photographs and placeholders are 1200 × 1500 (4:5); the
// attributes let the browser reserve the box before any CSS applies.
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 1500;
// How long the quick add reads "Added" after a click.
const ADDED_FOR_MS = 1200;
// CSS clamps every name to two lines; only a name longer than this is also
// cut in the markup.
const NAME_FALLBACK_LENGTH = 100;

const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <path
      d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path
      d="M5 12.5l4.5 4.5L19 7.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// The chips a product has earned from its data, most important first; never
// more than two.
const productChips = ({ soldOut, onSale, isNew }) =>
  [soldOut && "Sold out", onSale && "Sale", isNew && "New"].filter(Boolean).slice(0, 2);

const ProductCard = ({
  product,
  onAddToCart,
  onToggleWishlist,
  isWishlisted = false,
  showAddToCart = true,
}) => {
  const id = useId();
  const nameId = `${id}name`;
  const brandId = `${id}brand`;
  // The second photograph is mounted on the first pointer hover (never on
  // touch) and fades in only once it has loaded.
  const [wantsAlternate, setWantsAlternate] = useState(false);
  const [loadedAlternate, setLoadedAlternate] = useState(null);
  const [failedAlternate, setFailedAlternate] = useState(null);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  if (!product) return null;

  const { sellingPrice, originalPrice, discount } = getProductMinPrice(product);
  const ratingCount = Number(product.totalReviews) || 0;
  const rating = Math.max(0, Math.min(5, Number(product.rating) || 0));
  const outOfStock = product.stock === 0;
  const name = product.name || "";
  const displayName =
    name.length > NAME_FALLBACK_LENGTH ? truncateText(name, NAME_FALLBACK_LENGTH) : name;
  const brand = typeof product.brand === "string" ? product.brand.trim() : "";
  const href = productPath(product);

  const image = product.images?.[0] || product.image || PLACEHOLDER_IMG;
  const second = product.images?.[1];
  const alternate =
    typeof second === "string" && second && second !== image && second !== failedAlternate
      ? second
      : null;

  const chips = productChips({
    soldOut: outOfStock,
    onSale: discount > 0,
    isNew: Boolean(product.hot),
  });
  const quickAdd = showAddToCart && typeof onAddToCart === "function";

  const handlePointerEnter = (event) => {
    if (event.pointerType !== "touch") setWantsAlternate(true);
  };

  const handleQuickAdd = () => {
    onAddToCart(buildCartItem(product));
    setAdded(true);
    window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), ADDED_FOR_MS);
  };

  return (
    <article
      className={`${styles.card} ${outOfStock ? styles.soldOut : ""}`}
      aria-labelledby={nameId}
      onPointerEnter={alternate && !wantsAlternate ? handlePointerEnter : undefined}
    >
      <Link
        to={href}
        className={styles.link}
        aria-labelledby={nameId}
        aria-describedby={brand ? brandId : undefined}
      >
        <span className={styles.frame}>
          <span className={styles.media}>
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
            {alternate && wantsAlternate && (
              <img
                key={alternate}
                className={`${styles.image} ${styles.alternate} ${
                  loadedAlternate === alternate ? styles.alternateReady : ""
                }`}
                src={alternate}
                alt=""
                aria-hidden="true"
                width={IMAGE_WIDTH}
                height={IMAGE_HEIGHT}
                loading="lazy"
                decoding="async"
                onLoad={() => setLoadedAlternate(alternate)}
                onError={() => setFailedAlternate(alternate)}
              />
            )}
          </span>
        </span>
        <span className={styles.titles}>
          {brand && (
            <span id={brandId} className={styles.brand}>
              {brand}
            </span>
          )}
          <span id={nameId} className={styles.name}>
            {displayName}
          </span>
        </span>
      </Link>

      {(chips.length > 0 || onToggleWishlist || quickAdd) && (
        <div className={styles.overlay}>
          {chips.length > 0 && (
            <div className={styles.chips}>
              {chips.map((chip) => (
                <span key={chip} className={`sf-badge ${styles.chip}`}>
                  {chip}
                </span>
              ))}
            </div>
          )}

          {onToggleWishlist && (
            <button
              type="button"
              className={`${styles.wishlist} ${isWishlisted ? styles.wishlisted : ""}`}
              aria-pressed={Boolean(isWishlisted)}
              aria-label={isWishlisted ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
              onClick={() => onToggleWishlist(product)}
            >
              <HeartIcon filled={Boolean(isWishlisted)} />
            </button>
          )}

          {quickAdd && (
            <button
              type="button"
              className={`${styles.quickAdd} ${added ? styles.added : ""}`}
              disabled={outOfStock}
              aria-label={outOfStock ? "Sold out" : `Add ${name} to cart`}
              onClick={handleQuickAdd}
            >
              <span className={styles.quickAddLabel} aria-hidden="true">
                {outOfStock ? "Sold out" : added ? "Added" : "Add to cart"}
              </span>
              <span className={styles.quickAddIcon} aria-hidden="true">
                {added ? <CheckIcon /> : <PlusIcon />}
              </span>
            </button>
          )}
        </div>
      )}

      <div className={styles.meta}>
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

        <PriceBlock
          price={sellingPrice}
          comparePrice={originalPrice}
          size="sm"
          showSavings={false}
        />
      </div>
    </article>
  );
};

// The card's box while products load: the 4:5 image block and three lines
// (brand, name, price) at the heights of a card whose name runs to two lines.
// Hidden from assistive technology; mark the loading region aria-busy.
export const ProductCardSkeleton = ({ className }) => (
  <div className={[styles.skeleton, className].filter(Boolean).join(" ")} aria-hidden="true">
    <span className="sf-skeleton sf-skeleton--image" />
    <span className={styles.skeletonBody}>
      <span className={`sf-skeleton ${styles.skeletonLine} ${styles.skeletonBrand}`} />
      <span className={`sf-skeleton ${styles.skeletonLine} ${styles.skeletonName}`} />
      <span className={`sf-skeleton ${styles.skeletonLine} ${styles.skeletonPrice}`} />
    </span>
  </div>
);

export default ProductCard;
