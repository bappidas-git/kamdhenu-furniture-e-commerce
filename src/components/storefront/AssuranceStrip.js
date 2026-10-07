import React, { useEffect, useState } from "react";
import apiService from "../../services/api";
import { ASSURANCE_ITEMS } from "../../content/brandContent";
import { STOREFRONT_CONFIG, resolveTrustBadgeDetail } from "../../theme/tokens";
import TRUST_ICONS from "./trustIcons";
import styles from "./AssuranceStrip.module.css";

// =============================================================================
// AssuranceStrip — the slim row of store promises under the home hero
// =============================================================================
// Items, labels and details come from ASSURANCE_ITEMS (brandContent.js). Each
// shows only when the store backs it, by the rules the footer's trust bar and
// the product page's TrustBadges use (resolveTrustBadgeDetail):
//
//   delivery       the lowest free-delivery threshold of the active shipping
//                  methods; its detail is the resolver's own "Above ₹9,999",
//                  so every surface prints the same amount; hidden when none
//   returns        STOREFRONT_CONFIG.returnsWindowDays fills {days}; hidden at 0
//   securePayment  a stated policy: always shown
//   cod            only while settings.payment.codEnabled
//
// Settings and shipping methods are read once, on mount. Until both settle a
// skeleton line holds the strip at its full height, then the items fade in.
// A failed read counts as no data, so on errors only the static items
// (returns, secure payment) remain: the strip never claims what the store
// has not confirmed.
// =============================================================================

const ICON_FOR = {
  delivery: "truck",
  returns: "rotate",
  securePayment: "lock",
  cod: "cash",
};

// Fills "{days}-day returns" from `values`; null when a value is missing.
const fillTemplate = (template, values) => {
  let missing = false;
  const text = template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key];
    if (value === undefined || value === null) {
      missing = true;
      return "";
    }
    return String(value);
  });
  return missing ? null : text;
};

// An item ready to render, or null when the data does not back it.
const resolveItem = (item, { settings, shipping }) => {
  if (item.id === "delivery") {
    const detail = resolveTrustBadgeDetail("freeShipping", { shipping });
    return detail ? { ...item, detail } : null;
  }
  if (item.id === "returns" && resolveTrustBadgeDetail("easyReturns") === null) return null;
  if (item.id === "cod" && resolveTrustBadgeDetail("cod", { settings }) === null) return null;
  if (!item.detail) return item;
  const detail = fillTemplate(item.detail, { days: STOREFRONT_CONFIG.returnsWindowDays });
  return detail === null ? null : { ...item, detail };
};

// Every item with its static text, laid out invisibly while the data loads,
// so the strip already has the height it will have (no layout shift). The
// delivery amount is not known yet: a no-break space keeps its line.
const PLACEHOLDER_ITEMS = ASSURANCE_ITEMS.map((item) => ({
  ...item,
  detail:
    item.id === "delivery" || !item.detail
      ? " "
      : fillTemplate(item.detail, { days: STOREFRONT_CONFIG.returnsWindowDays }) || " ",
}));

// Settings and shipping methods, each read once; null until both settle.
const useAssuranceData = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([apiService.settings.get(), apiService.shipping.getMethods()]).then(
      ([settings, shipping]) => {
        if (!active) return;
        setData({
          settings: settings.status === "fulfilled" ? settings.value || null : null,
          shipping:
            shipping.status === "fulfilled" && Array.isArray(shipping.value) ? shipping.value : [],
        });
      }
    );
    return () => {
      active = false;
    };
  }, []);

  return data;
};

const AssuranceList = ({ items, className, ...rest }) => (
  <ul className={`${styles.list} ${className}`} {...rest}>
    {items.map((item) => (
      <li key={item.id} className={styles.item}>
        {TRUST_ICONS[ICON_FOR[item.id]] && (
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            {TRUST_ICONS[ICON_FOR[item.id]]}
          </svg>
        )}
        <span className={styles.text}>
          <span className={styles.label}>{item.label}</span>
          {item.detail && (
            <>
              <span className="sf-visually-hidden">, </span>
              <span className={styles.detail}>{item.detail}</span>
            </>
          )}
        </span>
      </li>
    ))}
  </ul>
);

const AssuranceStrip = () => {
  const data = useAssuranceData();
  const loading = data === null;

  return (
    <div className={styles.strip} aria-busy={loading || undefined}>
      <div className={`sf-container sf-container--wide ${styles.inner}`}>
        {loading ? (
          <>
            <AssuranceList items={PLACEHOLDER_ITEMS} className={styles.ghost} aria-hidden="true" />
            <span className={`sf-skeleton sf-skeleton--text ${styles.skeleton}`} aria-hidden="true" />
          </>
        ) : (
          <AssuranceList
            items={ASSURANCE_ITEMS.map((item) => resolveItem(item, data)).filter(Boolean)}
            className={styles.ready}
            aria-label="Our assurances"
          />
        )}
      </div>
    </div>
  );
};

export default AssuranceStrip;
