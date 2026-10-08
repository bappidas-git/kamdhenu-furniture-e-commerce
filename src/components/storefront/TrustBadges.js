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
//
// Where a badge depends on a number or a setting (free-shipping threshold,
// returns window, COD), its value is resolved from LIVE settings/shipping data
// through resolveTrustBadgeDetail, and the badge is shown ONLY when the data
// backs it: no "Cash on Delivery" while COD is switched off, no "Easy Returns"
// at 0 days, no "Free Shipping" without a threshold. These are the rules the
// footer's trust bar and the home assurance strip already follow. While the
// data is still loading (`loading`), a dynamic badge is a skeleton, so nothing
// is claimed before the data says so; every badge keeps two lines' room, so
// the grid does not change height when one drops out.
//
// Look (Prompt 16): a 2 × 2 grid ("grid") or one row ("row") of 20px outline
// icons in the accent, each with an eyebrow-style label and a muted detail;
// no tinted chips.
//
// Props:
//   ids       array    override the configured badge ids (optional)
//   settings  object   public store settings (for COD)
//   shipping  array    active shipping methods (for the free-shipping threshold)
//   variant   "row"|"grid"
//   loading   boolean  settings/shipping not read yet
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

const TrustBadges = ({
  ids = STOREFRONT_CONFIG.trustBadges,
  settings,
  shipping,
  variant = "grid",
  loading = false,
}) => {
  const badges = (ids || [])
    .map((id) => ({ id, ...TRUST_BADGE_CATALOG[id] }))
    .filter((b) => b.icon)
    .map((b) => ({
      ...b,
      pending: !!b.dynamic && loading,
      detail: b.dynamic && !loading ? resolveTrustBadgeDetail(b.id, { settings, shipping }) : null,
    }))
    // A dynamic badge stays only while the live data backs it.
    .filter((b) => !b.dynamic || b.pending || b.detail);

  if (badges.length === 0) return null;

  return (
    <ul
      className={cx(styles.badges, styles[variant])}
      aria-label="Our promises"
      aria-busy={loading || undefined}
    >
      {badges.map((b) =>
        b.pending ? (
          <li className={cx(styles.badge, styles.pending)} key={b.id} aria-hidden="true">
            <span className={`sf-skeleton ${styles.iconSkeleton}`} />
            <span className={styles.text}>
              <span className={`sf-skeleton ${styles.labelSkeleton}`} />
              <span className={`sf-skeleton ${styles.detailSkeleton}`} />
            </span>
          </li>
        ) : (
          <li className={styles.badge} key={b.id}>
            <span className={styles.iconWrap} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                focusable="false"
              >
                {TRUST_ICONS[b.icon]}
              </svg>
            </span>
            <span className={styles.text}>
              <span className={styles.label}>{b.label}</span>
              {b.detail && (
                <>
                  <span className="sf-visually-hidden">, </span>
                  <span className={styles.detail}>{b.detail}</span>
                </>
              )}
            </span>
          </li>
        )
      )}
    </ul>
  );
};

export default TrustBadges;
