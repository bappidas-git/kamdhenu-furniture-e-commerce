import React from "react";
import { formatCurrency } from "../../utils/helpers";
import { STOREFRONT_CONFIG } from "../../theme/tokens";
import styles from "./DeliveryReturnsInfo.module.css";

// =============================================================================
// DeliveryReturnsInfo — transparent shipping, COD & returns, shown UPFRONT
// =============================================================================
// Replaces the old "enter a pincode" widget that FABRICATED serviceability
// (it guessed availability from the first digit of the pincode). That violated
// the authenticity rule, so it's gone. Instead we surface the REAL, store-
// configured delivery options, free-shipping threshold, COD availability and
// returns window — the same data checkout and the admin use — so costs are never
// hidden until checkout. If a data source is empty, its line simply doesn't show.
//
// Look (Prompt 16): a small serif heading over a list of facts between
// hairlines: each active delivery method (name and window; cost, and the
// free-delivery threshold under it), then the COD, returns and tax lines.
// While the store data loads (`loading`) the rows are skeletons.
//
// Props:
//   shipping           array    active shipping methods from the API
//   settings           object   public store settings (tax, COD)
//   returnsWindowDays  number   defaults to STOREFRONT_CONFIG.returnsWindowDays
//   currency           string
//   loading            boolean  settings/shipping not read yet
//   title              string   default "Delivery & returns"
// =============================================================================

// "7-10" → "7–10 business days"; "0" → "Same day"; empty → nothing.
const describeWindow = (estimatedDays) => {
  if (estimatedDays == null || estimatedDays === "") return null;
  const days = String(estimatedDays).trim();
  if (days === "0") return "Same day";
  return `${days.replace(/^(\d+)\s*-\s*(\d+)$/, "$1\u2013$2")} business days`;
};

const SKELETON_ROWS = [
  { key: "m1", method: true },
  { key: "m2", method: true },
  { key: "f1" },
  { key: "f2" },
  { key: "f3" },
];

const DeliveryReturnsInfo = ({
  shipping = [],
  settings,
  returnsWindowDays = STOREFRONT_CONFIG.returnsWindowDays,
  currency = "INR",
  loading = false,
  title = "Delivery & returns",
}) => {
  const methods = (Array.isArray(shipping) ? shipping : []).filter(
    (m) => m && m.isActive !== false
  );
  const codEnabled = settings?.payment?.codEnabled;
  const codMax = Number(settings?.payment?.codMaxOrder) || 0;
  const taxKnown = settings?.store?.taxIncluded != null;

  const describeCost = (m) => {
    if (m.rateType === "free" || Number(m.flatRate) === 0) return { cost: "Free", freeAbove: null };
    return {
      cost: formatCurrency(Number(m.flatRate) || 0, currency),
      freeAbove: Number(m.freeAbove) > 0 ? formatCurrency(Number(m.freeAbove), currency) : null,
    };
  };

  if (loading) {
    return (
      <div className={styles.panel} aria-busy="true">
        <h2 className={styles.title}>{title}</h2>
        <ul className={styles.list} aria-hidden="true">
          {SKELETON_ROWS.map((row) => (
            <li className={row.method ? styles.row : styles.fact} key={row.key}>
              {row.method ? (
                <>
                  <span className={styles.main}>
                    <span className={`sf-skeleton ${styles.skeletonName}`} />
                    <span className={`sf-skeleton ${styles.skeletonMeta}`} />
                  </span>
                  <span className={`sf-skeleton ${styles.skeletonCost}`} />
                </>
              ) : (
                <span className={`sf-skeleton ${styles.skeletonFact}`} />
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const facts = [];
  if (codEnabled) {
    facts.push({
      key: "cod",
      text: `Cash on Delivery available${
        codMax > 0 ? ` on orders up to ${formatCurrency(codMax, currency)}` : ""
      }`,
    });
  }
  if (returnsWindowDays > 0) {
    facts.push({ key: "returns", text: `Easy ${returnsWindowDays}-day returns` });
  }
  if (taxKnown) {
    facts.push({
      key: "tax",
      text: settings.store.taxIncluded
        ? "Prices inclusive of all taxes"
        : `Taxes calculated at checkout${
            settings.store.taxRate ? ` (${settings.store.taxRate}% GST)` : ""
          }`,
    });
  }

  if (methods.length === 0 && facts.length === 0) return null;

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.list}>
        {methods.map((m) => {
          const { cost, freeAbove } = describeCost(m);
          const eta = describeWindow(m.estimatedDays);
          return (
            <li className={styles.row} key={m.id || m.name}>
              <span className={styles.main}>
                <span className={styles.name}>{m.name}</span>
                {eta && (
                  <>
                    <span className="sf-visually-hidden">, </span>
                    <span className={styles.meta}>{eta}</span>
                  </>
                )}
              </span>
              <span className={styles.cost}>
                <span className="sf-visually-hidden">, </span>
                <span className={styles.price}>{cost}</span>
                {freeAbove && (
                  <>
                    <span className="sf-visually-hidden">, </span>
                    <span className={styles.meta}>Free above {freeAbove}</span>
                  </>
                )}
              </span>
            </li>
          );
        })}
        {facts.map((f) => (
          <li className={styles.fact} key={f.key}>
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DeliveryReturnsInfo;
