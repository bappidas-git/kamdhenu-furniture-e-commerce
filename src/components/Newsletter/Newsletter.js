import React, { useEffect, useId, useRef, useState } from "react";
import apiService from "../../services/api";
import { isEmailValid } from "../../utils/helpers";
import { NEWSLETTER_LINE } from "../../content/brandContent";
import styles from "./Newsletter.module.css";

// =============================================================================
// Newsletter — the storefront's one sign-up form
// =============================================================================
//
// Rendered once, in the footer's navy top band (Footer.js), so it is styled
// for that always-dark surface in both modes. Sign-ups go through
// apiService.leads.createNewsletter, as before (a "newsletter" lead).
//
//   • Validates on submit. An empty or malformed address marks the field
//     aria-invalid and shows the reason under it (role="alert"); typing
//     clears it.
//   • A failed request keeps what was typed and says so (role="alert").
//   • Success clears the field and says "You're on the list." in a polite
//     live region that is always in the DOM (so it is announced), then
//     resets after a few seconds for another address. The timer is cleared
//     on unmount.
//   • While sending, the button is aria-disabled rather than disabled (a
//     disabled button drops keyboard focus) and repeat submits are ignored.
// =============================================================================

const SUCCESS_RESET_MS = 6000;

const MESSAGES = {
  empty: "Enter your email address.",
  invalid: "Enter a valid email address, like name@example.com.",
  failed: "We couldn't add you just now. Please try again.",
  success: "You're on the list.",
};

const CheckIcon = () => (
  <svg
    className={styles.statusIcon}
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const Newsletter = ({ className }) => {
  const uid = useId();
  const headingId = `${uid}-heading`;
  const inputId = `${uid}-email`;
  const errorId = `${uid}-error`;

  const [email, setEmail] = useState("");
  // { field: true } for validation errors (they mark the input invalid),
  // { field: false } when the request itself failed.
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!subscribed) return undefined;
    const timer = setTimeout(() => setSubscribed(false), SUCCESS_RESET_MS);
    return () => clearTimeout(timer);
  }, [subscribed]);

  const handleChange = (event) => {
    setEmail(event.target.value);
    if (error) setError(null);
    if (subscribed) setSubscribed(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy.current) return;

    const value = email.trim();
    if (!value || !isEmailValid(value)) {
      setSubscribed(false);
      setError({ field: true, text: value ? MESSAGES.invalid : MESSAGES.empty });
      return;
    }

    busy.current = true;
    setSubmitting(true);
    setError(null);
    setSubscribed(false);
    try {
      await apiService.leads.createNewsletter(value);
      if (mounted.current) {
        setEmail("");
        setSubscribed(true);
      }
    } catch {
      // A failed request must never look like a success. The address stays
      // in the field so trying again is one click.
      if (mounted.current) setError({ field: false, text: MESSAGES.failed });
    } finally {
      busy.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  const fieldInvalid = Boolean(error && error.field);

  return (
    <div className={className ? `${styles.newsletter} ${className}` : styles.newsletter}>
      <div className={styles.intro}>
        <h2 id={headingId} className={`sf-eyebrow ${styles.eyebrow}`}>
          Newsletter
        </h2>
        <p className={styles.line}>{NEWSLETTER_LINE}</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate aria-labelledby={headingId}>
        <div className="sf-field">
          <label className={`sf-field__label ${styles.label}`} htmlFor={inputId}>
            Email address
          </label>
          <div className={styles.controls}>
            <input
              id={inputId}
              className={`sf-input ${styles.input}`}
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="name@example.com"
              value={email}
              onChange={handleChange}
              required
              aria-invalid={fieldInvalid || undefined}
              aria-describedby={fieldInvalid ? errorId : undefined}
            />
            <button
              type="submit"
              className={`sf-btn sf-btn--paper ${styles.submit}`}
              aria-disabled={submitting || undefined}
            >
              {/* Both labels share one grid cell, so the button keeps the
                  width of the longer one and the field never jumps. */}
              <span
                className={styles.submitLabel}
                data-active={!submitting}
                aria-hidden={submitting || undefined}
              >
                Subscribe
              </span>
              <span
                className={styles.submitLabel}
                data-active={submitting}
                aria-hidden={!submitting || undefined}
              >
                Subscribing…
              </span>
            </button>
          </div>
          {error && (
            <p id={errorId} className={`sf-field__error ${styles.error}`} role="alert">
              {error.text}
            </p>
          )}
        </div>
        <p className={styles.status} role="status">
          {subscribed && (
            <>
              <CheckIcon />
              {MESSAGES.success}
            </>
          )}
        </p>
      </form>
    </div>
  );
};

export default Newsletter;
