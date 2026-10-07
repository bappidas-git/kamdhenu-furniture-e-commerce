import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import apiService from "../../services/api";
import { ASSURANCE_ITEMS } from "../../content/brandContent";
import {
  STOREFRONT_CONFIG,
  TOKENS,
  resolveTrustBadgeDetail,
} from "../../theme/tokens";
import { TRUST_BADGE_ICONS } from "./TrustBadges";
import styles from "./AssuranceStrip.module.css";

// =============================================================================
// AssuranceStrip — the slim row of store policies under the home hero
// =============================================================================
// Copy comes from ASSURANCE_ITEMS (brandContent.js). Every item is backed by
// live data or a stated policy, with the same rules as the product page's
// TrustBadges and the footer's trust bar (resolveTrustBadgeDetail):
//   delivery       lowest positive shipping_methods[].freeAbove; hidden when none
//   returns        STOREFRONT_CONFIG.returnsWindowDays; hidden when 0
//   securePayment  static policy
//   cod            settings.payment.codEnabled; hidden when off
// A failed fetch hides only the items that depend on it.
// =============================================================================

const ICON_FOR = {
  delivery: "truck",
  returns: "rotate",
  securePayment: "lock",
  cod: "cash",
};

const fill = (template, values) =>
  template.replace(/\{(\w+)\}/g, (match, key) =>
    values[key] != null ? String(values[key]) : match
  );

/**
 * The items the store can honestly show, in ASSURANCE_ITEMS order.
 * `settings` / `shipping` are undefined when their fetch failed.
 */
export const resolveAssuranceItems = ({ settings, shipping } = {}) =>
  ASSURANCE_ITEMS.map((item) => {
    switch (item.id) {
      case "delivery": {
        // "Above ₹9,999": the label already says "Free delivery".
        const detail = resolveTrustBadgeDetail("freeShipping", { shipping });
        return detail && { ...item, detail };
      }
      case "returns":
        return (
          resolveTrustBadgeDetail("easyReturns") !== null && {
            ...item,
            detail: fill(item.detail, { days: STOREFRONT_CONFIG.returnsWindowDays }),
          }
        );
      case "cod":
        return resolveTrustBadgeDetail("cod", { settings }) !== null && item;
      case "securePayment":
        return item;
      default:
        return null;
    }
  })
    .filter(Boolean)
    .map((item) => ({ ...item, icon: ICON_FOR[item.id] }));

const Icon = ({ name }) => (
  <svg
    className={styles.icon}
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {TRUST_BADGE_ICONS[name]}
  </svg>
);

const SKELETON_CELLS = ASSURANCE_ITEMS.length;

const AssuranceStrip = () => {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiService.settings.get(),
      apiService.shipping.getMethods(),
    ]).then(([settings, shipping]) => {
      if (!active) return;
      setItems(
        resolveAssuranceItems({
          settings: settings.status === "fulfilled" ? settings.value : undefined,
          shipping:
            shipping.status === "fulfilled" && Array.isArray(shipping.value)
              ? shipping.value
              : undefined,
        })
      );
    });
    return () => {
      active = false;
    };
  }, []);

  const loading = items === null;

  return (
    <div className={styles.strip} aria-busy={loading || undefined}>
      <div className={styles.inner}>
        {loading ? (
          <div className={`${styles.list} ${styles.skeletonList}`} aria-hidden="true">
            {Array.from({ length: SKELETON_CELLS }).map((_, i) => (
              <span key={i} className={styles.item}>
                <span className={`sf-skeleton sf-skeleton--text ${styles.skeleton}`} />
              </span>
            ))}
          </div>
        ) : (
          <motion.ul
            className={styles.list}
            aria-label="Our assurances"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: TOKENS.motion.duration.base, ease: TOKENS.motion.easeOut }}
          >
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <Icon name={item.icon} />
                <span className={styles.text}>
                  <span className={styles.label}>{item.label}</span>
                  {item.detail && <span className={styles.detail}>{item.detail}</span>}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </div>
    </div>
  );
};

export default AssuranceStrip;
