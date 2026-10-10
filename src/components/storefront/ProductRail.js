import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";
import ProductCard, { ProductCardSkeleton } from "./ProductCard";
import styles from "./ProductRail.module.css";

// =============================================================================
// ProductRail — the storefront's one horizontal product rail
// =============================================================================
// A snap-scrolling row of ProductCards with hairline previous/next buttons and
// a hairline progress line. The home page's Featured Collections
// (FeaturedProducts), Trending and Recently viewed rails use it, and the
// product page's RelatedProducts wraps it (Prompt 17).
//
// Cards per view: 4 from 1024px, 3.2 at 768–1023px, 2.2 on phones (6 / 4.3 /
// 2.6 when `compact`). Below 1024px the track runs to the screen edges while
// its first card stays on the content edge.
//
// Accessibility: the rail is a group with aria-roledescription="carousel",
// named by `label` (or `labelledBy`); its items stay a list, so screen readers
// announce the count and each position. The buttons scroll one page of cards
// and stay focusable at either end (aria-disabled). The track adds no tab
// stop: Tab walks the cards (each scrolls into view) and the arrow keys scroll
// the track while focus is inside it.
//
// Props:
//   products          array   the products to show
//   label             string  accessible name of the carousel
//   labelledBy        string  id of a visible element naming it (instead of label)
//   loading           boolean ProductCardSkeletons while the products load
//   skeletonCount     number  default 4 (6 when compact)
//   compact           boolean smaller cards, more per view
//   onAddToCart       fn      (cartItem) => void   } passed to each ProductCard
//   onToggleWishlist  fn      (product) => void    }
//   showAddToCart     boolean                      }
//   isInWishlist      fn      (productId) => boolean
//   previousLabel, nextLabel  the buttons' accessible names
//   className         string  extra class on the root
// Renders nothing when it is not loading and has no products.
// =============================================================================

const Chevron = ({ back }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path
      d={back ? "M14.5 5.5 8 12l6.5 6.5" : "M9.5 5.5 16 12l-6.5 6.5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const px = (value) => parseFloat(value) || 0;

const sameState = (a, b) =>
  a.overflows === b.overflows && a.atStart === b.atStart && a.atEnd === b.atEnd;

const ProductRail = ({
  products = [],
  label,
  labelledBy,
  loading = false,
  skeletonCount,
  compact = false,
  onAddToCart,
  onToggleWishlist,
  showAddToCart = true,
  isInWishlist,
  previousLabel = "Previous pieces",
  nextLabel = "Next pieces",
  className,
}) => {
  const trackId = `${useId()}rail`;
  const trackRef = useRef(null);
  const progressRef = useRef(null);
  const frameRef = useRef(0);
  const reduceMotion = useReducedMotion();
  const [scroll, setScroll] = useState({ overflows: false, atStart: true, atEnd: true });

  const items = Array.isArray(products) ? products.filter(Boolean) : [];
  const hasTrack = loading || items.length > 0;

  // Reads the track's scroll position: whether it overflows, whether either
  // end is reached, and the progress line's position (set directly on the
  // element, so scrolling never re-renders the cards).
  const measure = useCallback(() => {
    frameRef.current = 0;
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    const left = track.scrollLeft;
    const next = { overflows: max > 1, atStart: left <= 1, atEnd: left >= max - 1 };
    setScroll((prev) => (sameState(prev, next) ? prev : next));
    const progress = progressRef.current;
    if (progress) {
      const visible = track.scrollWidth > 0 ? Math.min(1, track.clientWidth / track.scrollWidth) : 1;
      const ratio = max > 0 ? Math.min(1, Math.max(0, left / max)) : 0;
      progress.style.setProperty("--rail-visible", String(visible));
      progress.style.setProperty("--rail-progress", String(ratio));
    }
  }, []);

  const scheduleMeasure = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(measure);
  }, [measure]);

  // Before paint whenever the content or the controls change.
  useLayoutEffect(() => {
    measure();
  }, [measure, items.length, loading, scroll.overflows]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    track.addEventListener("scroll", scheduleMeasure, { passive: true });
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);
    if (observer) observer.observe(track);
    else window.addEventListener("resize", scheduleMeasure);
    return () => {
      track.removeEventListener("scroll", scheduleMeasure);
      if (observer) observer.disconnect();
      else window.removeEventListener("resize", scheduleMeasure);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [scheduleMeasure, hasTrack]);

  // One page = the whole cards in view; scroll snapping settles the rest.
  const scrollPage = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const style = window.getComputedStyle(track);
    const gap = px(style.columnGap);
    const inner = track.clientWidth - px(style.paddingLeft) - px(style.paddingRight);
    const first = track.firstElementChild;
    const step = (first ? first.getBoundingClientRect().width : 0) + gap;
    const perPage = step > gap ? Math.max(1, Math.floor((inner + gap) / step + 0.01)) : 0;
    track.scrollBy({
      left: direction * (perPage ? perPage * step : inner),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  if (!hasTrack) return null;

  const count = skeletonCount ?? (compact ? 6 : 4);
  const name = labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": label };
  const rootClass = [styles.rail, compact && styles.compact, className].filter(Boolean).join(" ");

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      {...name}
      aria-busy={loading || undefined}
      className={rootClass}
    >
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops a list-style: none list's semantics without it (Prompt 31) */}
      <ul role="list" id={trackId} ref={trackRef} className={styles.track}>
        {loading
          ? Array.from({ length: count }, (_, index) => (
              <li key={index} className={styles.item} aria-hidden="true">
                <ProductCardSkeleton />
              </li>
            ))
          : items.map((product, index) => (
              <li key={product.id ?? index} className={styles.item}>
                <ProductCard
                  product={product}
                  onAddToCart={onAddToCart}
                  onToggleWishlist={onToggleWishlist}
                  isWishlisted={isInWishlist ? Boolean(isInWishlist(product.id)) : false}
                  showAddToCart={showAddToCart}
                />
              </li>
            ))}
      </ul>

      {/* While loading, an empty row of the same height holds the controls'
          place, so the rail keeps its height when the cards arrive. */}
      {loading && <div className={styles.controls} aria-hidden="true" />}
      {!loading && scroll.overflows && (
        <div className={styles.controls}>
          <span ref={progressRef} className={styles.progress} aria-hidden="true">
            <span className={styles.thumb} />
          </span>
          <div className={styles.buttons}>
            <button
              type="button"
              className={`sf-btn sf-btn--icon ${styles.control}`}
              aria-label={previousLabel}
              aria-controls={trackId}
              aria-disabled={scroll.atStart || undefined}
              onClick={() => !scroll.atStart && scrollPage(-1)}
            >
              <Chevron back />
            </button>
            <button
              type="button"
              className={`sf-btn sf-btn--icon ${styles.control}`}
              aria-label={nextLabel}
              aria-controls={trackId}
              aria-disabled={scroll.atEnd || undefined}
              onClick={() => !scroll.atEnd && scrollPage(1)}
            >
              <Chevron />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductRail;
