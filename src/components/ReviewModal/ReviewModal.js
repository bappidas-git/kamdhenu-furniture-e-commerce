import React, { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { onImageError, PLACEHOLDER_IMG } from "../../utils/helpers";
import useFocusTrap, { useBodyScrollLock } from "../ui/useFocusTrap";
import { overlayBackdropMotion, overlayPanelMotion } from "../ui/motionPresets";
import styles from "./ReviewModal.module.css";

// =============================================================================
// ReviewModal — rate / review a purchased piece (prompts/DESIGN_SYSTEM.md §34.8)
// =============================================================================
// <ReviewModal open onClose product={{ productId, name, image }}
//              existing={review | null} onSubmit={async ({ rating, title, body }) => …}
//              isDarkMode />
//
// Used from Order History, which decides eligibility (purchase-gated: a kept,
// delivered order) and submits; this is the form. Submitting (or editing)
// (re)enters the pending state for admin moderation, which the caller says.
// The props are the old ones. `isDarkMode` is still accepted, but the colours
// come from the tokens, which flip on body.dark by themselves.
//
// A modal dialog (DESIGN_SYSTEM §19.1): a portal on <body> at --sf-z-modal,
// named by its heading and described by the product's name; useFocusTrap puts
// focus on the star radio group's tab stop (the chosen star, else the first),
// keeps Tab inside, closes on Escape and gives focus back to the opener;
// useBodyScrollLock holds the page still. Paper surface and a hairline from
// 641px, a bottom sheet below.
//
// The stars are an ARIA radio group: one tab stop; the arrow keys move and
// choose (wrapping), Home and End jump, as the address-type chips do (§32.2).
// A missing rating is an inline message under the stars, and focus goes back
// to them. The request's own failure is an alert above the buttons. While the
// request runs the submit button is busy (aria-disabled), not disabled, and
// the dialog cannot be dismissed half-way.
// =============================================================================

const TITLE_MAX = 80;
const BODY_MAX = 1000;
const STARS = [1, 2, 3, 4, 5];

// The dialog's two messages.
const MESSAGES = {
  rating: "Choose a star rating",
  failed: "We couldn’t send your review. Try again in a moment.",
};

const cx = (...names) => names.filter(Boolean).join(" ");

const starLabel = (stars) => `${stars} star${stars > 1 ? "s" : ""}`;

// ---------------------------------------------------------------------------
// Glyphs (strokes in currentColor)
// ---------------------------------------------------------------------------
const StarGlyph = ({ filled }) => (
  <svg className={styles.starGlyph} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M12 3.4l2.6 5.58 6.08.72-4.49 4.17 1.19 6.02L12 16.92l-5.38 2.97 1.19-6.02L3.32 9.7l6.08-.72z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />
  </svg>
);

const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const AlertGlyph = () => (
  <svg className={styles.alertGlyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.25v.25" />
  </svg>
);

// ---------------------------------------------------------------------------
// The 1–5 star picker, with the old hover preview
// ---------------------------------------------------------------------------
const StarInput = ({ value, onChange, labelledBy, describedBy, invalid, tabStopRef }) => {
  const [hover, setHover] = useState(0);
  const buttons = useRef({});
  const shown = hover || value;

  const choose = (stars) => {
    onChange(stars);
    const button = buttons.current[stars];
    if (button) button.focus();
  };

  const handleKeyDown = (event, stars) => {
    let next;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = stars === STARS.length ? 1 : stars + 1;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = stars === 1 ? STARS.length : stars - 1;
        break;
      case "Home":
        next = 1;
        break;
      case "End":
        next = STARS.length;
        break;
      default:
        return;
    }
    event.preventDefault();
    choose(next);
  };

  return (
    <div className={styles.ratingRow}>
      <div
        className={styles.stars}
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-required="true"
        aria-invalid={invalid || undefined}
        onMouseLeave={() => setHover(0)}
      >
        {STARS.map((stars) => {
          // The group's one tab stop: the chosen star, else the first.
          const isTabStop = value ? value === stars : stars === 1;
          return (
            <button
              key={stars}
              ref={(node) => {
                buttons.current[stars] = node;
                if (isTabStop && tabStopRef) tabStopRef.current = node;
              }}
              type="button"
              role="radio"
              aria-checked={value === stars}
              aria-label={starLabel(stars)}
              tabIndex={isTabStop ? 0 : -1}
              className={cx(styles.star, shown >= stars && styles.starFilled)}
              onClick={() => choose(stars)}
              onMouseEnter={() => setHover(stars)}
              onKeyDown={(event) => handleKeyDown(event, stars)}
            >
              <StarGlyph filled={shown >= stars} />
            </button>
          );
        })}
      </div>
      {/* What the stars show, for sighted users (the radios carry it). */}
      <p className={styles.ratingValue} aria-hidden="true">
        {shown ? `${shown} out of 5` : ""}
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// The dialog
// ---------------------------------------------------------------------------
const ReviewModal = ({ open, onClose, product, existing, onSubmit, isDarkMode }) => {
  const reduceMotion = useReducedMotion();
  const uid = useId();
  const id = (name) => `${uid}${name}`;

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [submitError, setSubmitError] = useState("");

  // The old reset, on opening and when the review being edited changes while
  // open. Done while rendering, so the dialog's first frame already holds the
  // right values and focus lands on the right star.
  const [shownFor, setShownFor] = useState({ open: false, existing: null });
  if (shownFor.open !== open || (open && shownFor.existing !== existing)) {
    setShownFor({ open, existing });
    if (open) {
      setRating(existing?.rating || 0);
      setTitle(existing?.title || "");
      setBody(existing?.body || "");
      setRatingError("");
      setSubmitError("");
    }
  }

  const dialogRef = useRef(null);
  const starRef = useRef(null);

  // Nothing closes the dialog while the request runs (the old Cancel was
  // disabled then); afterwards the caller closes it on success.
  const requestClose = () => {
    if (!submitting) onClose();
  };

  useFocusTrap(dialogRef, { active: open, onEscape: requestClose, initialFocusRef: starRef });
  useBodyScrollLock(open);

  const chooseRating = (value) => {
    setRating(value);
    setRatingError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!rating) {
      setRatingError(MESSAGES.rating);
      if (starRef.current) starRef.current.focus();
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    try {
      await onSubmit({ rating, title: title.trim(), body: body.trim() });
    } catch (e) {
      setSubmitError(MESSAGES.failed);
    } finally {
      setSubmitting(false);
    }
  };

  const counter = (fieldId, length, max) => (
    <p id={fieldId} className={cx("sf-field__hint", styles.count)}>
      <span aria-hidden="true">
        {length}/{max}
      </span>
      <span className="sf-visually-hidden">
        {length} of {max} characters
      </span>
    </p>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="review-modal" className={styles.root}>
          <motion.div
            className={styles.backdrop}
            aria-hidden="true"
            onClick={requestClose}
            {...overlayBackdropMotion}
          />
          <motion.div
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id("title")}
            aria-describedby={id("product")}
            tabIndex={-1}
            {...overlayPanelMotion("dialog", reduceMotion)}
          >
            <button
              type="button"
              className={cx("sf-btn sf-btn--icon", styles.close)}
              onClick={requestClose}
              aria-label="Close"
              aria-disabled={submitting || undefined}
            >
              <CloseGlyph />
            </button>

            <form className={styles.body} noValidate onSubmit={handleSubmit}>
              <h2 id={id("title")} className={cx("sf-display-sm", styles.title)}>
                {existing ? "Edit your review" : "Write a review"}
              </h2>

              <div className={styles.product}>
                <img
                  className={styles.thumb}
                  src={product?.image || PLACEHOLDER_IMG}
                  alt=""
                  width="44"
                  height="55"
                  onError={onImageError}
                />
                <p id={id("product")} className={styles.productName}>
                  {product?.name}
                </p>
              </div>

              {existing && (
                <p className={cx("sf-panel", styles.note)}>
                  Editing resubmits your review for approval before it shows on the product page.
                </p>
              )}

              <div className={styles.rating}>
                <p id={id("rating")} className="sf-field__label">
                  Your rating
                </p>
                <StarInput
                  value={rating}
                  onChange={chooseRating}
                  labelledBy={id("rating")}
                  describedBy={ratingError ? id("rating-error") : undefined}
                  invalid={!!ratingError}
                  tabStopRef={starRef}
                />
                {ratingError && (
                  <p id={id("rating-error")} className="sf-field__error">
                    {ratingError}
                  </p>
                )}
              </div>

              <div className="sf-field">
                <label htmlFor={id("review-title")}>
                  Title <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id={id("review-title")}
                  className="sf-input"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={TITLE_MAX}
                  autoComplete="off"
                  aria-describedby={`${id("title-hint")} ${id("title-count")}`}
                />
                <div className={styles.fieldFoot}>
                  <p id={id("title-hint")} className="sf-field__hint">
                    Sum it up in a line.
                  </p>
                  {counter(id("title-count"), title.length, TITLE_MAX)}
                </div>
              </div>

              <div className="sf-field">
                <label htmlFor={id("review-body")}>
                  Review <span className={styles.optional}>(optional)</span>
                </label>
                <textarea
                  id={id("review-body")}
                  className={cx("sf-textarea", styles.textarea)}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={5}
                  maxLength={BODY_MAX}
                  aria-describedby={`${id("body-hint")} ${id("body-count")}`}
                />
                <div className={styles.fieldFoot}>
                  <p id={id("body-hint")} className="sf-field__hint">
                    What did you like or dislike? How is the quality?
                  </p>
                  {counter(id("body-count"), body.length, BODY_MAX)}
                </div>
              </div>

              {/* Always in the page, so the failure is announced as it arrives. */}
              <div role="alert" className={styles.alertSlot}>
                {submitError && (
                  <p className={styles.alert}>
                    <AlertGlyph />
                    <span>{submitError}</span>
                  </p>
                )}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className="sf-btn sf-btn--ghost"
                  onClick={requestClose}
                  aria-disabled={submitting || undefined}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={cx("sf-btn sf-btn--primary", styles.submit)}
                  aria-disabled={submitting || undefined}
                  data-busy={submitting || undefined}
                >
                  {submitting ? "Submitting…" : existing ? "Update review" : "Submit review"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ReviewModal;
