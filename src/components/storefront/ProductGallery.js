import React, { useState, useEffect, useCallback, useRef, useId } from "react";
import { PLACEHOLDER_IMG, onImageError } from "../../utils/helpers";
import { STOREFRONT_CONFIG } from "../../theme/tokens";
import styles from "./ProductGallery.module.css";

// =============================================================================
// ProductGallery — trustworthy product media (Prompt 16)
// =============================================================================
// One 4:5 frame with a hairline edge and every photograph stacked inside it, so
// changing the view is a crossfade (--sf-duration-slow) rather than a reload.
// A strip of 56px thumbnails sits beside the frame from 769px (a vertical
// hairline strip) and under it below that (a horizontal row). The strip hides
// when the product has a single image.
//
// Honest media only: the one overlay is a quiet "Sale" chip, shown when the
// caller passes a real discount (> 0); no percentage badge, no dots.
//
// Interaction:
//   • thumbnails: a tablist with a roving tab stop; the arrow keys, Home and
//     End move between them (selection follows focus); click or hover shows
//     an image, as before;
//   • the frame: a focusable group (when there is more than one image) whose
//     Left/Right arrow keys step through the images, as before;
//   • desktop hover-zoom (scale 2 at the cursor) for a mouse only, so a tap on
//     a phone never leaves the image zoomed;
//   • a horizontal swipe on the frame steps through the images on touch
//     screens (the thumbnails remain the single-pointer alternative).
//
// Loading: the first photograph is eager with fetchpriority="high" (it is the
// page's largest paint); the others are lazy. Every image carries
// width/height, and the frame reserves its 4:5 box with aspect-ratio, so
// nothing moves when a photograph arrives.
//
// Props:
//   images     string[]  image URLs (falls back to a placeholder)
//   alt        string    base alt text (the product name)
//   discount   number    a real discount % from the caller; > 0 shows "Sale"
//   zoom       boolean   enable hover-zoom (default from STOREFRONT_CONFIG)
//   fit        "cover"|"contain"  how a photograph fills the frame (default
//              "cover"; "contain" keeps whole photographs with sand around)
//   className  string    appended to the root (a layout hook for the page)
//
// Sizing hook: set --gallery-max-width on an ancestor to cap the frame's width
// (the page caps it so the frame never outgrows the viewport); the strip is
// added to it beside the frame.
// =============================================================================

const SWIPE_MIN = 40; // px of horizontal travel that counts as a swipe

const cx = (...names) => names.filter(Boolean).join(" ");

const ProductGallery = ({
  images = [],
  alt = "Product image",
  discount = 0,
  zoom = STOREFRONT_CONFIG.gallery.zoom,
  fit = "cover",
  className,
}) => {
  const pics = images && images.length > 0 ? images : [PLACEHOLDER_IMG];
  const multi = pics.length > 1;
  const [index, setIndex] = useState(0);
  const [lens, setLens] = useState(null); // { x, y } in % while zooming
  const uid = useId();
  const frameId = `${uid}-frame`;
  const stripRef = useRef(null);
  const thumbRefs = useRef([]);
  const swipe = useRef(null);

  // Back to the first image whenever the set of images changes (a new product).
  const setKey = pics.join("\n");
  useEffect(() => {
    setIndex(0);
    setLens(null);
  }, [setKey]);

  const current = Math.min(index, pics.length - 1);

  const step = useCallback(
    (delta) => setIndex((i) => (i + delta + pics.length) % pics.length),
    [pics.length]
  );

  // Keep the active thumbnail inside the strip's scrollport (a long strip)
  // without scrolling the page.
  useEffect(() => {
    const strip = stripRef.current;
    const thumb = thumbRefs.current[current];
    if (!strip || !thumb) return;
    const { offsetLeft: left, offsetTop: top, offsetWidth: width, offsetHeight: height } = thumb;
    if (left < strip.scrollLeft) strip.scrollLeft = left;
    else if (left + width > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = left + width - strip.clientWidth;
    }
    if (top < strip.scrollTop) strip.scrollTop = top;
    else if (top + height > strip.scrollTop + strip.clientHeight) {
      strip.scrollTop = top + height - strip.clientHeight;
    }
  }, [current]);

  // ── Frame: keyboard ────────────────────────────────────────────────────────
  const onFrameKeyDown = (e) => {
    if (!multi) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };

  // ── Frame: hover-zoom (mouse only) ─────────────────────────────────────────
  const lensAt = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };
  const onPointerMove = (e) => {
    if (!zoom || e.pointerType !== "mouse") return;
    setLens(lensAt(e));
  };
  const onPointerLeave = () => setLens(null);

  // ── Frame: swipe (touch and pen) ───────────────────────────────────────────
  const onPointerDown = (e) => {
    if (e.pointerType === "mouse") return;
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== e.pointerId || !multi) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  };
  const onPointerCancel = () => {
    swipe.current = null;
  };

  // ── Thumbnails: roving focus ───────────────────────────────────────────────
  const onThumbKeyDown = (e, i) => {
    const last = pics.length - 1;
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next == null) return;
    e.preventDefault();
    setIndex(next);
    thumbRefs.current[next]?.focus();
  };

  const zooming = !!lens;

  return (
    <div className={cx(styles.gallery, multi && styles.multi, fit === "contain" && styles.contain, className)}>
      <div
        id={frameId}
        className={cx(styles.frame, zoom && styles.zoomable)}
        role="group"
        aria-label={multi ? `${alt}, image ${current + 1} of ${pics.length}` : alt}
        tabIndex={multi ? 0 : undefined}
        onKeyDown={onFrameKeyDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {pics.map((src, i) => {
          const active = i === current;
          return (
            <img
              key={`${i}-${src}`}
              src={src || PLACEHOLDER_IMG}
              alt={active ? (multi ? `${alt}, view ${i + 1}` : alt) : ""}
              className={cx(styles.image, active && styles.imageActive)}
              width="1200"
              height="1500"
              loading={i === 0 ? "eager" : "lazy"}
              fetchpriority={i === 0 ? "high" : undefined}
              decoding="async"
              draggable="false"
              onError={onImageError}
              style={
                active && zooming
                  ? { transform: "scale(2)", transformOrigin: `${lens.x}% ${lens.y}%` }
                  : undefined
              }
            />
          );
        })}
        {discount > 0 && <span className={`sf-badge sf-badge--paper ${styles.sale}`}>Sale</span>}
      </div>

      {multi && (
        <div ref={stripRef} className={styles.thumbs} role="tablist" aria-label="Product images">
          {pics.map((src, i) => {
            const active = i === current;
            return (
              <button
                key={`${i}-${src}`}
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={frameId}
                aria-label={`Show image ${i + 1} of ${pics.length}`}
                tabIndex={active ? 0 : -1}
                className={cx(styles.thumb, active && styles.thumbActive)}
                onClick={() => setIndex(i)}
                onMouseEnter={() => setIndex(i)}
                onKeyDown={(e) => onThumbKeyDown(e, i)}
              >
                <img
                  src={src || PLACEHOLDER_IMG}
                  alt=""
                  width="56"
                  height="56"
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                  onError={onImageError}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// The gallery's loading box: the same frame (and, with `thumbs`, the strip)
// as sand skeletons, so the page does not move when the photographs arrive.
export const ProductGallerySkeleton = ({ thumbs = 3, className }) => (
  <div className={cx(styles.gallery, thumbs > 1 && styles.multi, className)} aria-hidden="true">
    <span className={`sf-skeleton ${styles.frameSkeleton}`} />
    {thumbs > 1 && (
      <span className={styles.thumbs}>
        {Array.from({ length: thumbs }, (_, i) => (
          <span key={i} className={`sf-skeleton ${styles.thumbSkeleton}`} />
        ))}
      </span>
    )}
  </div>
);

export default ProductGallery;
