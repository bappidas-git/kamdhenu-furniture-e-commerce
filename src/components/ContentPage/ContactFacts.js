import React from "react";
import {
  SOCIAL_LINKS,
  SUPPORT_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE,
} from "../../utils/constants";
import styles from "./ContactFacts.module.css";

// =============================================================================
// ContactFacts — how to reach the store, as a <dl> (§38.6)
// =============================================================================
// Email, phone, WhatsApp (only while SOCIAL_LINKS.WHATSAPP is set), hours and,
// with `address`, the address: every value from constants.js, so the header,
// footer, Help centre and Support page always agree. Nothing here promises a
// reply time (none is confirmed).
//
// address  true adds SUPPORT_ADDRESS
// layout   "stack" (a column with hairlines between facts) or "row" (a grid
//          that fits as many columns as the width allows)
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

// "+91 84729 18653" → "tel:+918472918653" (the header's normalisation).
export const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, "")}`;

const ContactFacts = ({ address = false, layout = "stack", className }) => (
  <dl className={cx(styles.facts, layout === "row" ? styles.row : styles.stack, className)}>
    <div className={styles.fact}>
      <dt className={styles.term}>Email</dt>
      <dd className={styles.value}>
        <a className={cx("sf-btn sf-btn--link", styles.link)} href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
      </dd>
    </div>
    <div className={styles.fact}>
      <dt className={styles.term}>Phone</dt>
      <dd className={styles.value}>
        <a className={cx("sf-btn sf-btn--link", styles.link)} href={telHref(SUPPORT_PHONE)}>
          {SUPPORT_PHONE}
        </a>
      </dd>
    </div>
    {SOCIAL_LINKS.WHATSAPP && (
      <div className={styles.fact}>
        <dt className={styles.term}>WhatsApp</dt>
        <dd className={styles.value}>
          <a
            className={cx("sf-btn sf-btn--link", styles.link)}
            href={SOCIAL_LINKS.WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
          >
            Message us on WhatsApp
            <span className="sf-visually-hidden"> (opens in a new tab)</span>
          </a>
        </dd>
      </div>
    )}
    <div className={styles.fact}>
      <dt className={styles.term}>Hours</dt>
      <dd className={styles.value}>{SUPPORT_HOURS}</dd>
    </div>
    {address && (
      <div className={styles.fact}>
        <dt className={styles.term}>Address</dt>
        <dd className={styles.value}>{SUPPORT_ADDRESS}</dd>
      </div>
    )}
  </dl>
);

export default ContactFacts;
