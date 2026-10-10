// =============================================================================
// STOREFRONT TOKENS & CONFIG (JS layer)
// =============================================================================
//
// Two things live here:
//
//   1. TOKENS — a JS mirror of the structural design tokens (the visual scale)
//      defined as CSS custom properties in `storefront-tokens.css`. Use these in
//      the rare places JS needs a token value (e.g. inline styles, framer-motion).
//      CSS Modules should prefer the `var(--sf-*)` custom properties directly.
//
//   2. STOREFRONT_CONFIG — the themeable *content* configuration that lets a new
//      client re-skin the storefront's persuasive surfaces WITHOUT touching
//      component code: which trust badges to show, the returns window, and which
//      Average-Order-Value modules are enabled.
//
// ETHICS BOUNDARY (read STOREFRONT_UX_GUIDELINES.md):
//   The values here are *store-owner-attested policy* (e.g. "we offer 7-day
//   returns", "payments are secure") — legitimately configurable copy. They are
//   NOT live "social proof" or "urgency" signals. Anything that implies live
//   demand, stock, ratings or deal-timing must come from the API at render time,
//   never from this config. Components are built so that fake live signals are
//   structurally impossible (see SocialProof, RelatedProducts, AddToCartBar).
// =============================================================================

// --- Structural token mirror (keep in sync with storefront-tokens.css) -------
// `node scripts/check-contrast.js` fails when these drift from the CSS.
export const TOKENS = {
  radius: { sm: 2, md: 4, lg: 8, xl: 12, pill: 999 },
  space: {
    1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
    20: 80, 24: 96, 32: 128,
  },
  breakpoints: { xs: 480, sm: 768, md: 1024, lg: 1280, xl: 1440 },
  tapTarget: 44,
  containerMax: 1280,
  container: { max: 1280, wide: 1440, narrow: 720 },
  type: {
    fontDisplay: '"Playfair Display", Georgia, "Times New Roman", serif',
    fontSans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    // Keys match the --sf-text-* suffixes
    size: {
      "display-xl": "clamp(3.5rem, 2.833rem + 2.963vw, 5.5rem)",
      "display-lg": "clamp(2.5rem, 2.167rem + 1.481vw, 3.5rem)",
      "display-md": "clamp(1.75rem, 1.583rem + 0.741vw, 2.25rem)",
      "display-sm": "clamp(1.375rem, 1.292rem + 0.37vw, 1.625rem)",
      "2xs": "0.6875rem",
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      md: "1.0625rem",
      lg: "1.25rem",
      xl: "1.5rem",
      "2xl": "1.875rem",
      "3xl": "2.25rem",
      eyebrow: "0.75rem",
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 600 },
    leading: { display: 1.04, heading: 1.1, tight: 1.25, normal: 1.5, body: 1.6, relaxed: 1.7 },
    tracking: { display: "-0.015em", eyebrow: "0.16em", button: "0.02em" },
    measure: "66ch",
  },
  // framer-motion takes seconds and cubic-bezier arrays; the *Ms values match
  // the CSS. Under reduced motion the CSS collapses on its own; JS callers
  // check useReducedMotion() (or rely on <MotionConfig reducedMotion="user">).
  motion: {
    easeOut: [0.22, 1, 0.36, 1],
    easeInOut: [0.65, 0, 0.35, 1],
    duration: { fast: 0.16, base: 0.32, slow: 0.64, reveal: 0.9 },
    durationMs: { fast: 160, base: 320, slow: 640, reveal: 900 },
    revealDistance: 20,
    stagger: 0.09,
    staggerMs: 90,
  },
};

// --- Trust-badge catalogue ---------------------------------------------------
// A small, fixed catalogue of reassurance badges keyed by id. A client picks
// which to show via STOREFRONT_CONFIG.trustBadges (an ordered list of ids). The
// icon set is built into <TrustBadges/>; copy can be overridden per badge.
// `dynamic` badges (e.g. free-shipping threshold) have their value filled from
// live settings/shipping data at render time, so the number is never stale.
export const TRUST_BADGE_CATALOG = {
  genuine: { icon: "shield", label: "Genuine products" },
  securePayment: { icon: "lock", label: "Secure payment" },
  easyReturns: { icon: "rotate", label: "Easy returns", dynamic: "returns" },
  freeShipping: { icon: "truck", label: "Free delivery", dynamic: "freeShipping" },
  support: { icon: "headset", label: "Customer support" },
  warranty: { icon: "badge", label: "Brand warranty" },
  cod: { icon: "cash", label: "Cash on Delivery", dynamic: "cod" },
};

// --- The per-client storefront configuration --------------------------------
export const STOREFRONT_CONFIG = {
  // Which trust badges appear near the buy box, in order. Only badges the
  // business can honestly show: "warranty" and "support" stay out until the
  // client confirms them (see prompts/BUILD_LOG.md, Prompt 02).
  trustBadges: ["securePayment", "cod", "easyReturns", "genuine"],

  // Returns policy window (days). Drives the "Easy Returns" badge + the
  // Delivery & Returns panel copy. Set to 0 to advertise "no returns".
  // Placeholder pending client confirmation of the returns policy.
  returnsWindowDays: 7,

  // Average-Order-Value modules. Each is data-driven and renders nothing when
  // there is no real data to back it — toggles here only gate *whether we try*.
  aov: {
    frequentlyBoughtTogether: true,
    relatedProducts: true,
    maxRelated: 10,
    maxBundle: 3, // items in a "frequently bought together" bundle incl. anchor
  },

  // Product gallery behaviour (presentation only).
  gallery: {
    zoom: true,          // desktop hover-zoom on the main image
    thumbnailPosition: "side", // "side" (desktop) gracefully stacks on mobile
  },
};

// Resolve the dynamic value for a trust badge from live store data, so the badge
// never shows a fabricated or stale number. Returns a sublabel string or null.
// `settings` = public store settings; `shipping` = active shipping methods.
export const resolveTrustBadgeDetail = (badgeId, { settings, shipping } = {}) => {
  if (badgeId === "freeShipping") {
    const fromMethods = (shipping || [])
      .map((m) => Number(m.freeAbove))
      .filter((n) => Number.isFinite(n) && n > 0);
    const threshold = fromMethods.length ? Math.min(...fromMethods) : null;
    if (threshold == null) return null;
    return `Above ₹${threshold.toLocaleString("en-IN")}`;
  }
  if (badgeId === "easyReturns") {
    const days = STOREFRONT_CONFIG.returnsWindowDays;
    return days > 0 ? `${days}-day returns` : null;
  }
  if (badgeId === "cod") {
    return settings?.payment?.codEnabled ? "Available" : null;
  }
  return null;
};

const tokens = { TOKENS, STOREFRONT_CONFIG, TRUST_BADGE_CATALOG, resolveTrustBadgeDetail };
export default tokens;
