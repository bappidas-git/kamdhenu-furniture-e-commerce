import React from "react";
import {
  STOREFRONT_CONFIG,
  TRUST_BADGE_CATALOG,
  resolveTrustBadgeDetail,
} from "../../theme/tokens";
import TRUST_ICONS from "./trustIcons";
import styles from "./TrustBadges.module.css";

// =============================================================================
// TrustBadges — reassurance signals near the decision point
// =============================================================================
// Which badges appear (and their order) is CONFIG-DRIVEN via
// STOREFRONT_CONFIG.trustBadges — a new client re-skins these without code.
// These are store-owner-attested *policies* (genuine product, secure payment,
// returns) — legitimately configurable copy, NOT live demand/scarcity signals.
// Where a badge implies a number (free-shipping threshold, returns window, COD),
// the value is resolved from LIVE settings/shipping data so it is never stale or
// invented; if the real data doesn't support it, the badge's sub-label is hidden.
//
// Props:
//   ids       array   override the configured badge ids (optional)
//   settings  object  public store settings (for COD)
//   shipping  array   active shipping methods (for the free-shipping threshold)
//   variant   "row"|"grid"
// =============================================================================

const TrustBadges = ({
  ids = STOREFRONT_CONFIG.trustBadges,
  settings,
  shipping,
  variant = "grid",
}) => {
  const badges = (ids || [])
    .map((id) => ({ id, ...TRUST_BADGE_CATALOG[id] }))
    .filter((b) => b.icon);

  if (badges.length === 0) return null;

  return (
    <ul className={`${styles.badges} ${styles[variant]}`} aria-label="Our promises">
      {badges.map((b) => {
        const detail = b.dynamic
          ? resolveTrustBadgeDetail(b.id, { settings, shipping })
          : null;
        return (
          <li className={styles.badge} key={b.id}>
            <span className={styles.iconWrap} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {TRUST_ICONS[b.icon]}
              </svg>
            </span>
            <span className={styles.text}>
              <span className={styles.label}>{b.label}</span>
              {detail && <span className={styles.detail}>{detail}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default TrustBadges;
