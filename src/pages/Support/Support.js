import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import ContentPage from "../../components/ContentPage/ContentPage";
import ContactFacts from "../../components/ContentPage/ContactFacts";
import { Reveal } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api";
import { TOKENS } from "../../theme/tokens";
import { SUPPORT_CATEGORIES, SUPPORT_EMAIL } from "../../utils/constants";
import { isEmailValid, isValidPhone } from "../../utils/helpers";
import styles from "./Support.module.css";

// =============================================================================
// /support — Contact us (prompts/DESIGN_SYSTEM.md §38.6)
// =============================================================================
// Two columns from 900px (5 / 7): how to reach the store (ContactFacts with
// the address, the reply line, quick links), and the form. The form sends
// exactly what it always sent, apiService.leads.createContact(formData) with
// { name, email, phone, orderNumber, category, subject, message }, under the
// same rules (name, email, subject and a message of 20+ characters required;
// a phone, when given, an Indian mobile number).
//
// Prefill: `?order=<orderNumber>` fills the order number and `?category=<value>`
// chooses the topic when it is one of SUPPORT_CATEGORIES (Order History's
// "Return or exchange" sends `?order=…&category=returns`; the confirmation
// page's Help link sends `?order=…`). A signed-in shopper's name and email
// fill in too, never over anything typed.
//
// A failed submit: every failing field says why (aria-invalid, its message in
// aria-describedby) and focus moves to the first, brought under the sticky
// header (if it already had focus, a hidden status line reads its message).
// Sending: "Sending…", aria-disabled, focus kept on the button. A failed
// request: a role="alert" line above the button, the values kept. Sent: the
// form gives way to a sand panel (role="status") that takes focus; "Send
// another message" brings the form back with focus on its heading.
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

export const MESSAGE_MIN_LENGTH = 20;

export const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  orderNumber: "",
  category: "general",
  subject: "",
  message: "",
};

// Form order: the first failing field in this order takes focus.
const FIELD_ORDER = ["name", "email", "phone", "orderNumber", "category", "subject", "message"];
const CATEGORY_VALUES = SUPPORT_CATEGORIES.map((category) => category.value);

// The prefill a URL asks for: { orderNumber?, category? }. An unknown topic is
// ignored (the select keeps "general"), and an order number is trimmed and
// kept to a sane length.
export const prefillFromParams = (params) => {
  const prefill = {};
  const order = String(params.get("order") ?? "").trim();
  if (order) prefill.orderNumber = order.slice(0, 64);
  const category = String(params.get("category") ?? "").trim();
  if (CATEGORY_VALUES.includes(category)) prefill.category = category;
  return prefill;
};

// The old page's rules, one message per field.
export const validateContact = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = "Enter your name";
  if (!form.email.trim()) errors.email = "Enter your email address";
  else if (!isEmailValid(form.email)) errors.email = "Enter a valid email address, like name@example.com";
  if (form.phone.trim() && !isValidPhone(form.phone)) errors.phone = "Enter a 10-digit mobile number";
  if (!form.subject.trim()) errors.subject = "Enter a subject";
  if (!form.message.trim()) errors.message = "Write your message";
  else if (form.message.trim().length < MESSAGE_MIN_LENGTH) {
    errors.message = `Write at least ${MESSAGE_MIN_LENGTH} characters`;
  }
  return errors;
};

const SEND_FAILED = `We couldn’t send your message. Try again in a moment, or email us at ${SUPPORT_EMAIL}.`;

// The sticky header's visible height (§17.2), and a scroll that brings a
// field to 16px under it ("instant" under reduced motion: the root's
// scroll-behavior is smooth).
const headerHeight = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sf-header-height")) || 0;

const focusAndReveal = (element, reduceMotion, box = element) => {
  element.focus({ preventScroll: true });
  const rect = box.getBoundingClientRect();
  if (rect.top < headerHeight() || rect.bottom > window.innerHeight) {
    window.scrollTo({
      top: Math.max(0, window.scrollY + rect.top - headerHeight() - TOKENS.space[4]),
      behavior: reduceMotion ? "instant" : "smooth",
    });
  }
};

const userName = (user) =>
  [user?.firstName, user?.lastName]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim())
    .join(" ");

const CheckGlyph = () => (
  <svg className={styles.glyph} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AlertGlyph = () => (
  <svg className={styles.glyph} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 7v6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="16.75" r="1" fill="currentColor" />
  </svg>
);

// One labelled field: the label (with "(optional)"), the control, an optional
// hint and the field's message. `children` renders the control itself.
const Field = ({ id, label, optional, hint, error, wide, children }) => (
  <div className={cx("sf-field", wide && styles.wide)}>
    <label className="sf-field__label" htmlFor={id}>
      {label}
      {optional && <span className={styles.optional}> (optional)</span>}
    </label>
    {children}
    {hint && (
      <p id={`${id}-hint`} className="sf-field__hint">
        {hint}
      </p>
    )}
    {error && (
      <p id={`${id}-error`} className="sf-field__error">
        {error}
      </p>
    )}
  </div>
);

// aria-describedby for a field: its hint, then its message.
const describedBy = (id, { hint, error, extra } = {}) =>
  [hint && `${id}-hint`, extra, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

const Support = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const reduceMotion = useReducedMotion();
  const orderParam = searchParams.get("order") ?? "";
  const categoryParam = searchParams.get("category") ?? "";

  const [formData, setFormData] = useState(() => ({ ...EMPTY_FORM, ...prefillFromParams(searchParams) }));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [focusTarget, setFocusTarget] = useState(null);
  const [announcement, setAnnouncement] = useState("");

  const fieldRefs = useRef({});
  const successRef = useRef(null);
  const formTitleRef = useRef(null);
  const sendingRef = useRef(false);
  const announceTimer = useRef(null);

  useEffect(() => () => clearTimeout(announceTimer.current), []);

  // A new deep link fills the order number and the topic (an unchanged one
  // changes nothing, so nothing typed is lost to a re-render).
  useEffect(() => {
    const prefill = prefillFromParams(
      new URLSearchParams([
        ["order", orderParam],
        ["category", categoryParam],
      ])
    );
    if (Object.keys(prefill).length) setFormData((prev) => ({ ...prev, ...prefill }));
  }, [orderParam, categoryParam]);

  // A signed-in shopper's name and email, once the session is known, without
  // replacing anything already typed.
  useEffect(() => {
    if (!user) return;
    const name = userName(user);
    setFormData((prev) => ({
      ...prev,
      name: prev.name || name,
      email: prev.email || user.email || "",
    }));
  }, [user]);

  // Focus moves after the render that shows its target, so the target is read
  // as it now is: the first failing field with its message ("field:<name>"),
  // the sent panel, or the form's heading when the form comes back.
  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget.startsWith("field:")) {
      const input = fieldRefs.current[focusTarget.slice("field:".length)];
      if (input) focusAndReveal(input, reduceMotion, input.closest(".sf-field") || input);
    }
    if (focusTarget === "success" && successRef.current) successRef.current.focus();
    if (focusTarget === "form" && formTitleRef.current) formTitleRef.current.focus();
    setFocusTarget(null);
  }, [focusTarget, reduceMotion]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (sendingRef.current) return;

    const nextErrors = validateContact(formData);
    setErrors(nextErrors);
    setSubmitError("");
    const firstInvalid = FIELD_ORDER.find((key) => nextErrors[key]);
    if (firstInvalid) {
      // Focus on the field reads its message. When the field already has
      // focus (Enter pressed in it), nothing would be read, so the hidden
      // status line says the message instead, for five seconds.
      if (document.activeElement === fieldRefs.current[firstInvalid]) {
        setAnnouncement(nextErrors[firstInvalid]);
        clearTimeout(announceTimer.current);
        announceTimer.current = setTimeout(() => setAnnouncement(""), 5000);
      }
      setFocusTarget(`field:${firstInvalid}`);
      return;
    }

    sendingRef.current = true;
    setIsSubmitting(true);
    try {
      await apiService.leads.createContact(formData);
      setIsSubmitted(true);
      setFormData({ ...EMPTY_FORM, name: userName(user), email: user?.email || "" });
      setFocusTarget("success");
    } catch {
      setSubmitError(SEND_FAILED);
    } finally {
      sendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const sendAnother = () => {
    setIsSubmitted(false);
    setErrors({});
    setFocusTarget("form");
  };

  const fieldProps = (name, { hint, extra } = {}) => {
    const id = `support-${name}`;
    return {
      id,
      name,
      value: formData[name],
      onChange: handleChange,
      ref: (element) => {
        fieldRefs.current[name] = element;
      },
      "aria-invalid": errors[name] ? "true" : undefined,
      "aria-describedby": describedBy(id, { hint, error: errors[name], extra }),
    };
  };

  const messageLength = formData.message.trim().length;

  return (
    <ContentPage
      width="default"
      crumb="Contact us"
      eyebrow="Contact us"
      title="Talk to *us*."
      intro="Questions about a piece, an order or a delivery? Send us a message, or reach us by phone or WhatsApp."
      contact={false}
    >
      <div className={styles.layout}>
        <section className={styles.facts} aria-labelledby="support-facts-title">
          <h2 id="support-facts-title" className={cx("sf-display-sm", styles.columnTitle)}>
            Reach us directly
          </h2>
          <ContactFacts address />
          {/* CONFIRM (client): a reply-time promise; until then, this line. */}
          <p className={styles.replyLine}>We reply during working hours.</p>

          <p className={cx("sf-eyebrow", styles.quickTitle)} id="support-quick-title">
            Quick answers
          </p>
          <ul className={styles.quickLinks} aria-labelledby="support-quick-title">
            <li>
              <Link to="/help" className="sf-btn sf-btn--link">
                Help centre
              </Link>
            </li>
            <li>
              <Link to="/orders" className="sf-btn sf-btn--link">
                Track an order
              </Link>
            </li>
            <li>
              <Link to="/refund" className="sf-btn sf-btn--link">
                Returns & refunds
              </Link>
            </li>
          </ul>
        </section>

        <div className={styles.formColumn}>
          {isSubmitted ? (
            <div
              ref={successRef}
              className={cx("sf-panel", styles.success)}
              role="status"
              tabIndex={-1}
            >
              <span className={styles.successMark}>
                <CheckGlyph />
              </span>
              <h2 className={cx("sf-display-sm", styles.successTitle)}>Message sent.</h2>
              <p className={styles.successLine}>
                Thank you for writing to us. We reply during working hours.
              </p>
              <button type="button" className={cx("sf-btn sf-btn--ghost", styles.again)} onClick={sendAnother}>
                Send another message
              </button>
            </div>
          ) : (
            <Reveal className={cx("sf-card sf-card--hairline", styles.card)}>
              <form
                className={styles.form}
                onSubmit={handleSubmit}
                noValidate
                aria-labelledby="support-form-title"
              >
                <h2
                  id="support-form-title"
                  ref={formTitleRef}
                  tabIndex={-1}
                  className={cx("sf-display-sm", styles.columnTitle, styles.formTitle)}
                >
                  Send us a message
                </h2>

                <div className={styles.fields}>
                  <Field id="support-name" label="Full name" error={errors.name}>
                    <input
                      {...fieldProps("name")}
                      className="sf-input"
                      type="text"
                      autoComplete="name"
                      autoCapitalize="words"
                      required
                    />
                  </Field>

                  <Field id="support-email" label="Email address" error={errors.email}>
                    <input
                      {...fieldProps("email")}
                      className="sf-input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                    />
                  </Field>

                  <Field
                    id="support-phone"
                    label="Phone number"
                    optional
                    hint="10-digit mobile number"
                    error={errors.phone}
                  >
                    <input
                      {...fieldProps("phone", { hint: true })}
                      className="sf-input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </Field>

                  <Field
                    id="support-orderNumber"
                    label="Order number"
                    optional
                    hint="From your order confirmation or My orders"
                    error={errors.orderNumber}
                  >
                    <input
                      {...fieldProps("orderNumber", { hint: true })}
                      className="sf-input"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                    />
                  </Field>

                  <Field id="support-category" label="Topic" wide>
                    <select {...fieldProps("category")} className="sf-select">
                      {SUPPORT_CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field id="support-subject" label="Subject" error={errors.subject} wide>
                    <input
                      {...fieldProps("subject")}
                      className="sf-input"
                      type="text"
                      autoComplete="off"
                      required
                    />
                  </Field>

                  <div className={cx("sf-field", styles.wide)}>
                    <label className="sf-field__label" htmlFor="support-message">
                      Message
                    </label>
                    <textarea
                      {...fieldProps("message", { hint: true, extra: "support-message-count" })}
                      className="sf-textarea"
                      rows={6}
                      required
                    />
                    <div className={styles.messageMeta}>
                      <p id="support-message-hint" className="sf-field__hint">
                        At least {MESSAGE_MIN_LENGTH} characters.
                      </p>
                      <p
                        id="support-message-count"
                        className={cx(
                          "sf-field__hint",
                          styles.count,
                          messageLength >= MESSAGE_MIN_LENGTH && styles.countMet
                        )}
                      >
                        {messageLength} {messageLength === 1 ? "character" : "characters"}
                      </p>
                    </div>
                    {errors.message && (
                      <p id="support-message-error" className="sf-field__error">
                        {errors.message}
                      </p>
                    )}
                  </div>
                </div>

                <p className="sf-visually-hidden" role="status">
                  {announcement}
                </p>

                {/* Always in the page, so the failure is announced when it arrives. */}
                <div role="alert">
                  {submitError && (
                    <p className={styles.alert}>
                      <AlertGlyph />
                      <span>{submitError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className={cx("sf-btn sf-btn--primary", styles.submit)}
                  aria-disabled={isSubmitting ? "true" : undefined}
                  data-busy={isSubmitting ? "true" : undefined}
                >
                  {isSubmitting ? "Sending…" : "Send message"}
                </button>
              </form>
            </Reveal>
          )}
        </div>
      </div>
    </ContentPage>
  );
};

export default Support;
