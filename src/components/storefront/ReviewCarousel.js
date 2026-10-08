import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import StarRating from "./StarRating";
import { formatDate, productPath } from "../../utils/helpers";
import styles from "./ReviewCarousel.module.css";

// =============================================================================
// ReviewCarousel — customer reviews, one to three at a time
// =============================================================================
// A snap-scrolling row of review slides with hairline previous/next buttons
// and one dot per review. It shows only the reviews it is handed (the home
// page passes approved reviews from the API) and invents nothing: no avatars,
// places or dates beyond the review's own `createdAt`, no rating it was not
// given.
//
// Each slide (a sand panel): the review text as a serif quote of at most 240
// characters (cut at a word, with an ellipsis), then its stars (StarRating,
// in ink on the sand), the reviewer's name as stored (`userName`), "Verified
// purchase" only when `isVerifiedPurchase` is true, the product's name
// linking to its page (`review.product`: { id, name, slug }) and the short
// date.
//
// Slides per view: 1 on phones, 2 from 768px, 3 from 1024px.
//
// Accessibility: a group with aria-roledescription="carousel", named by
// `label` (or `labelledBy`); each slide is a group with
// aria-roledescription="slide" and a name ("Review 2 of 7"). The buttons
// scroll one page of slides and stay focusable at either end (aria-disabled);
// each dot ("Review N of M") brings its slide into view, and the dots of the
// slides in view carry aria-current. Every slide stays in the reading order,
// so screen-reader users can also simply read on.
//
// Props:
//   reviews        array    the reviews to show
//   loading        boolean  skeleton slides while they load
//   error          boolean  the reviews could not be read (with none to show)
//   label          string   accessible name of the carousel
//   labelledBy     string   id of a visible element naming it (instead of label)
//   previousLabel, nextLabel        the buttons' names
//   slideLabel     string   "Review {index} of {count}": the slides' and dots' names
//   verifiedLabel  string   "Verified purchase"
//   emptyLabel     string   shown when there are no reviews (honest empty state)
//   errorLabel     string   shown on error when there are no reviews
//   skeletonCount  number   default 3
//   className      string   extra class on the root
// =============================================================================

export const QUOTE_MAX_LENGTH = 240;

/** The review text as a quote of at most `max` characters, cut at a word. */
export const clampQuote = (text, max = QUOTE_MAX_LENGTH) => {
  const clean = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > max / 2 ? cut.slice(0, space) : cut;
  return `${base.replace(/[\s,;:.!?–—-]+$/, "")}…`;
};

const fillLabel = (template, values) =>
  String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));

const shortDate = (value) => (Number.isFinite(Date.parse(value)) ? formatDate(value, "short") : null);

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

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <path
      d="M3.5 8.5 6.5 11.5 12.5 4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ReviewSlide = ({ review, label, verifiedLabel }) => {
  const rating = Number(review.rating);
  const name = typeof review.userName === "string" ? review.userName.trim() : "";
  const verified = review.isVerifiedPurchase === true;
  const product = review.product?.name ? review.product : null;
  const date = shortDate(review.createdAt);

  return (
    <div role="group" aria-roledescription="slide" aria-label={label} className={styles.slide}>
      <figure className={styles.figure}>
        <blockquote className={styles.quote}>
          <p>{clampQuote(review.body)}</p>
        </blockquote>
        <figcaption className={styles.caption}>
          {rating > 0 && <StarRating rating={rating} size={14} />}
          {(name || verified) && (
            <p className={styles.byline}>
              {name && <span className={styles.name}>{name}</span>}
              {name && verified && <span className="sf-visually-hidden">, </span>}
              {verified && (
                <span className={styles.verified}>
                  <CheckIcon />
                  {verifiedLabel}
                </span>
              )}
            </p>
          )}
          {(product || date) && (
            <p className={styles.meta}>
              {product && (
                <Link to={productPath(product)} className={styles.product}>
                  {product.name}
                </Link>
              )}
              {product && date && <span className="sf-visually-hidden">, </span>}
              {date && <time dateTime={review.createdAt}>{date}</time>}
            </p>
          )}
        </figcaption>
      </figure>
    </div>
  );
};

const px = (value) => parseFloat(value) || 0;

const INITIAL_SCROLL = { overflows: false, atStart: true, atEnd: true, first: 0, last: 0 };

const sameScroll = (a, b) =>
  a.overflows === b.overflows &&
  a.atStart === b.atStart &&
  a.atEnd === b.atEnd &&
  a.first === b.first &&
  a.last === b.last;

const ReviewCarousel = ({
  reviews = [],
  loading = false,
  error = false,
  label,
  labelledBy,
  previousLabel = "Previous reviews",
  nextLabel = "Next reviews",
  slideLabel = "Review {index} of {count}",
  verifiedLabel = "Verified purchase",
  emptyLabel = "No customer reviews yet.",
  errorLabel = "Reviews could not be loaded just now.",
  skeletonCount = 3,
  className,
}) => {
  const trackId = `${useId()}reviews`;
  const trackRef = useRef(null);
  const frameRef = useRef(0);
  const reduceMotion = useReducedMotion();
  const [scroll, setScroll] = useState(INITIAL_SCROLL);

  const items = (Array.isArray(reviews) ? reviews : []).filter(Boolean);
  const count = items.length;
  const hasTrack = loading || count > 0;

  // Reads the track: whether it overflows, whether either end is reached, and
  // which slides are in view (at least half visible), for the dots.
  const measure = useCallback(() => {
    frameRef.current = 0;
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    const start = track.scrollLeft;
    const end = start + track.clientWidth;
    let first = -1;
    let last = -1;
    Array.from(track.children).forEach((slide, index) => {
      const width = slide.offsetWidth;
      const visible = Math.min(end, slide.offsetLeft + width) - Math.max(start, slide.offsetLeft);
      if (width > 0 && visible >= width / 2 - 1) {
        if (first < 0) first = index;
        last = index;
      }
    });
    const next = {
      overflows: max > 1,
      atStart: start <= 1,
      atEnd: start >= max - 1,
      first: Math.max(first, 0),
      last: Math.max(last, first, 0),
    };
    setScroll((prev) => (sameScroll(prev, next) ? prev : next));
  }, []);

  const scheduleMeasure = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(measure);
  }, [measure]);

  // Before paint whenever the content changes, so the controls appear with
  // the slides.
  useLayoutEffect(() => {
    measure();
  }, [measure, count, loading]);

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

  const behavior = reduceMotion ? "auto" : "smooth";

  // One page = the whole slides in view; scroll snapping settles the rest.
  const scrollPage = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const gap = px(window.getComputedStyle(track).columnGap);
    const first = track.firstElementChild;
    const step = (first ? first.getBoundingClientRect().width : 0) + gap;
    const perPage = step > gap ? Math.max(1, Math.floor((track.clientWidth + gap) / step + 0.01)) : 0;
    track.scrollBy({ left: direction * (perPage ? perPage * step : track.clientWidth), behavior });
  };

  const scrollToSlide = (index) => {
    const track = trackRef.current;
    const slide = track?.children[index];
    if (!slide) return;
    const max = track.scrollWidth - track.clientWidth;
    track.scrollTo({ left: Math.max(0, Math.min(slide.offsetLeft, max)), behavior });
  };

  if (!hasTrack) {
    return (
      <p className={[`sf-eyebrow ${styles.state}`, className].filter(Boolean).join(" ")}>
        {error ? errorLabel : emptyLabel}
      </p>
    );
  }

  const name = labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": label };
  const rootClass = [styles.carousel, className].filter(Boolean).join(" ");

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      {...name}
      aria-busy={loading || undefined}
      className={rootClass}
    >
      <div id={trackId} ref={trackRef} className={styles.track}>
        {loading
          ? Array.from({ length: skeletonCount }, (_, index) => (
              <span key={index} className={`sf-skeleton ${styles.skeleton}`} aria-hidden="true" />
            ))
          : items.map((review, index) => (
              <ReviewSlide
                key={review.id ?? index}
                review={review}
                label={fillLabel(slideLabel, { index: index + 1, count })}
                verifiedLabel={verifiedLabel}
              />
            ))}
      </div>

      {/* While loading, an empty row of the same height holds the controls'
          place, so the carousel keeps its height when the reviews arrive. */}
      {loading && <div className={styles.controls} aria-hidden="true" />}
      {!loading && scroll.overflows && (
        <div className={styles.controls}>
          <div className={styles.dots}>
            {items.map((review, index) => (
              <button
                key={review.id ?? index}
                type="button"
                className={`sf-focus ${styles.dot}`}
                aria-label={fillLabel(slideLabel, { index: index + 1, count })}
                aria-controls={trackId}
                aria-current={index >= scroll.first && index <= scroll.last ? "true" : undefined}
                onClick={() => scrollToSlide(index)}
              >
                <span className={styles.dotMark} aria-hidden="true" />
              </button>
            ))}
          </div>
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

export default ReviewCarousel;
