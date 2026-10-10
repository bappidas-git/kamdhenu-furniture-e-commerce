import React, { forwardRef, useCallback, useId, useRef } from "react";
import { Reveal, SectionHeading } from "../ui";
import StarRating from "./StarRating";
import { formatDateIN, onImageError } from "../../utils/helpers";
import styles from "./ReviewsSection.module.css";

// =============================================================================
// ReviewsSection — authentic customer reviews + UGC
// =============================================================================
// Renders ONLY the real, approved reviews it is handed (the API already filters
// to status="approved"). Reviews are written from Order History for delivered
// pieces and published after moderation in the admin, so there is no write
// form here, and no sorting. The summary average + count are passed in by the
// page (its reviews blend), never invented here.
//
// Look (Prompt 17): an editorial section. From 980px, the eyebrow, the serif
// heading, the summary (a 48px serif average, stars and "Based on N
// ratings") and the rating bars sit in the left five columns, and the reviews,
// hairline-separated articles, in the right six; one column below 980px.
// With no ratings the average is not shown at all: "No reviews yet" and a
// line on where reviews come from take its place. Loading shows skeleton
// reviews; a failed read says so and offers "Try again".
//
// Props:
//   reviews            array   approved reviews (real)
//   displayAvg         number  aggregate rating to show (real)
//   totalRatingsCount  number  number of ratings behind the average (real)
//   loading, error     boolean
//   onRetry            fn      reads the reviews again
//   id                 string  the section's id (an in-page link's target);
//                              its heading is `${id}-title`
//   eyebrow, title     string  "Reviews", "What customers *say*."
//   className          string  on the <section>
// The ref reaches the <section>, which can take focus (tabIndex -1) so an
// in-page jump can move focus to it.
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

const plural = (count, one, many) => `${count.toLocaleString("en-IN")} ${count === 1 ? one : many}`;

const text = (value) => (typeof value === "string" ? value.trim() : "");

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

const StarGlyph = () => (
  <svg viewBox="0 0 20 20" width="10" height="10" aria-hidden="true" focusable="false">
    <path d="M10 1.5L12.21 7.86L18.94 7.99L13.58 12.06L15.53 18.5L10 14.66L4.47 18.5L6.42 12.06L1.06 7.99L7.79 7.86Z" />
  </svg>
);

// How the written reviews spread over 5 → 1 stars: sand tracks, ink fills.
const RatingBars = ({ reviews }) => {
  const total = reviews.length;
  return (
    <ul className={styles.ratingBars} aria-label="Ratings by star">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = reviews.filter((r) => Math.round(Number(r.rating)) === star).length;
        return (
          <li key={star}>
            <div
              className={styles.ratingRow}
              role="img"
              aria-label={`${plural(star, "star", "stars")}: ${plural(count, "review", "reviews")}`}
            >
              <span className={styles.ratingStar}>
                {star}
                <StarGlyph />
              </span>
              <span className={styles.ratingTrack}>
                <span className={styles.ratingFill} style={{ "--share": total > 0 ? count / total : 0 }} />
              </span>
              <span className={styles.ratingCount}>{count}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const Review = ({ review }) => {
  const name = text(review.userName) || text(review.name) || "Anonymous";
  const verified = review.isVerifiedPurchase === true || review.verified === true;
  const date = Number.isFinite(Date.parse(review.createdAt)) ? review.createdAt : null;
  const rating = Number(review.rating) || 0;
  const title = text(review.title);
  const body = text(review.body) || text(review.comment) || text(review.text);
  const photos = Array.isArray(review.photos) ? review.photos.filter((src) => text(src)) : [];
  const helpful = Math.max(0, Math.floor(Number(review.helpfulCount) || 0));

  return (
    <article className={styles.review}>
      <header className={styles.reviewHead}>
        <p className={styles.reviewer}>
          <span className={styles.name}>{name}</span>
          {verified && (
            <>
              <span className="sf-visually-hidden">, </span>
              <span className={cx("sf-eyebrow", styles.verified)}>
                <CheckIcon />
                Verified purchase
              </span>
            </>
          )}
        </p>
        {date && (
          <time className={styles.date} dateTime={date}>
            {formatDateIN(date, "short")}
          </time>
        )}
      </header>

      {rating > 0 && (
        <div className={styles.reviewStars}>
          <StarRating rating={rating} size={14} />
        </div>
      )}
      {title && <h3 className={styles.reviewTitle}>{title}</h3>}
      {body && <p className={styles.body}>{body}</p>}

      {/* Customer photos (UGC): only when the review really has them. */}
      {photos.length > 0 && (
        <ul className={styles.photos} aria-label="Customer photos">
          {photos.map((src, index) => (
            <li key={`${index}-${src}`}>
              <img
                src={src}
                alt={`Customer upload ${index + 1} of ${photos.length}`}
                width="72"
                height="72"
                loading="lazy"
                decoding="async"
                onError={onImageError}
                className={styles.photo}
              />
            </li>
          ))}
        </ul>
      )}

      {helpful > 0 && (
        <p className={styles.helpful}>{plural(helpful, "person", "people")} found this helpful</p>
      )}
    </article>
  );
};

const SkeletonReview = () => (
  <div className={styles.skeletonReview} aria-hidden="true">
    <span className={`sf-skeleton ${styles.skeletonName}`} />
    <span className={`sf-skeleton ${styles.skeletonStars}`} />
    <span className={`sf-skeleton ${styles.skeletonTitle}`} />
    <span className={`sf-skeleton ${styles.skeletonLine}`} />
    <span className={`sf-skeleton ${styles.skeletonLine}`} />
  </div>
);

const ReviewsSection = forwardRef(function ReviewsSection(
  {
    reviews = [],
    displayAvg = 0,
    totalRatingsCount = 0,
    loading = false,
    error = false,
    onRetry,
    id,
    eyebrow = "Reviews",
    title = "What customers *say*.",
    className,
  },
  ref
) {
  const autoId = useId();
  const headingId = id ? `${id}-title` : `${autoId}reviews-title`;
  const sectionRef = useRef(null);
  const setSectionRef = useCallback(
    (node) => {
      sectionRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  const list = Array.isArray(reviews) ? reviews.filter(Boolean) : [];
  const count = Math.max(0, Number(totalRatingsCount) || 0);
  const average = Math.max(0, Math.min(5, Number(displayAvg) || 0));
  const settled = !loading && !error;

  // "Try again" makes way for the loading state, so focus moves to the
  // section rather than dropping to the page.
  const retry = () => {
    sectionRef.current?.focus({ preventScroll: true });
    onRetry();
  };

  return (
    <section
      ref={setSectionRef}
      id={id}
      tabIndex={-1}
      aria-labelledby={headingId}
      className={cx(styles.section, className)}
    >
      <Reveal className={styles.layout}>
        <div className={styles.aside}>
          <SectionHeading id={headingId} eyebrow={eyebrow} title={title} className={styles.heading} />

          {count > 0 ? (
            <div className={styles.summary}>
              <p className={styles.average}>
                {average.toFixed(1)}
                <span className="sf-visually-hidden"> out of 5</span>
              </p>
              <div className={styles.basis}>
                <span aria-hidden="true">
                  <StarRating rating={average} size={18} />
                </span>
                <p className={styles.basisText}>Based on {plural(count, "rating", "ratings")}</p>
              </div>
            </div>
          ) : (
            settled && (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>No reviews yet.</p>
                <p className={styles.note}>
                  Reviews come from verified orders and are published after moderation.
                </p>
              </div>
            )
          )}

          {settled && list.length > 0 && <RatingBars reviews={list} />}
        </div>

        <div className={styles.main} aria-busy={loading || undefined}>
          {loading ? (
            <div className={styles.loading}>
              <p className="sf-visually-hidden">Loading reviews</p>
              <SkeletonReview />
              <SkeletonReview />
            </div>
          ) : error ? (
            <div className={styles.state}>
              <p className={styles.stateText}>We couldn’t load the reviews.</p>
              {onRetry && (
                <button type="button" className="sf-btn sf-btn--ghost" onClick={retry}>
                  Try again
                </button>
              )}
            </div>
          ) : (
            list.length > 0 && (
              <ul className={styles.list}>
                {list.map((review, index) => (
                  <li key={review.id ?? index} className={styles.item}>
                    <Review review={review} />
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </Reveal>
    </section>
  );
});

export default ReviewsSection;
