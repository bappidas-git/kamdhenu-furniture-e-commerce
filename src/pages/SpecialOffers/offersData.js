import { useState, useEffect } from "react";
import { resolveCountdownTarget, diffToParts } from "../../utils/dealsConfig";

// =============================================================================
// Special Offers — the page's rules
// =============================================================================
// The coupon helpers, the selection helpers and the countdown below moved here
// from SpecialOffers.js unchanged (Prompt 19), so they can be tested on their
// own. The two helpers at the end are new and only shape what is shown.
// =============================================================================

// ── Coupon display helpers ───────────────────────────────────────────────────
// Coupons shown here come from the same store the Admin manages and Checkout
// validates against (apiService.coupons), so every advertised code redeems.

// Compact rupee figure for promo copy — round values read cleaner without paise.
export const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

// Expiry shown on a coupon card — the same instant the checkout enforces.
export const formatExpiry = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Headline figure on a coupon's stub: "20%" for percentage, "₹500" for fixed.
export const couponHeadline = (c) => (c.type === "percentage" ? `${c.value}%` : rupees(c.value));

// Only advertise coupons a shopper can actually redeem right now: active, not
// past expiry, not usage-exhausted — the same gates checkout enforces.
// (minOrderAmount is order-dependent, so it's shown on the card instead.)
export const isCouponValid = (c, now = new Date()) =>
  c &&
  c.isActive !== false &&
  (!c.expiresAt || new Date(c.expiresAt) > now) &&
  !(c.usageLimit && c.usedCount >= c.usageLimit);

// Resolve an ordered id selection against a list, preserving the admin order and
// dropping ids that no longer exist.
export const pickByIds = (items, ids) => {
  const byId = new Map(items.map((it) => [String(it.id), it]));
  return (ids || []).map((id) => byId.get(String(id))).filter(Boolean);
};

export const pad = (n) => String(n).padStart(2, "0");

// ── Countdown Hook (admin-configured) ────────────────────────────────────────
// Targets the admin's window (fixed end date, or end-of-day when none) and
// re-evaluates each second so a fixed end can expire live and honour onExpiry.
export const computeCountdown = (timer) => {
  const r = resolveCountdownTarget(timer);
  if (!r.active) {
    return { show: false, ended: !!r.ended, parts: { hours: 0, minutes: 0, seconds: 0 } };
  }
  return { show: true, ended: false, parts: diffToParts(r.target) };
};

export const useDealsCountdown = (timer) => {
  const [state, setState] = useState(() => computeCountdown(timer));
  const enabled = timer?.enabled;
  const endAt = timer?.endAt;
  const onExpiry = timer?.onExpiry;

  useEffect(() => {
    setState(computeCountdown({ enabled, endAt, onExpiry }));
    const id = setInterval(
      () => setState(computeCountdown({ enabled, endAt, onExpiry })),
      1000
    );
    return () => clearInterval(id);
  }, [enabled, endAt, onExpiry]);

  return state;
};

// ── What assistive technology hears for the countdown (new) ──────────────────
// The timer's accessible name. Hours and minutes only ("Offers end in 5 hours
// and 12 minutes"), so the name changes at most once a minute while the
// visible seconds tick; under a minute it says "less than a minute".
export const timeLeftLabel = ({ hours = 0, minutes = 0 } = {}) => {
  const parts = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  return `Offers end in ${parts.length ? parts.join(" and ") : "less than a minute"}`;
};

// ── Telling repeated chip names apart (new) ──────────────────────────────────
// Leaf names repeat across tiers ("High-Back Chairs" under Essentials and
// under Premium). For a chip whose name another chip shares, this returns its
// parent's name (Map: categoryId → parent name), so no two chips read the
// same. Display only: which categories get a chip, and in what order, stays
// the page's rule.
export const chipContexts = (dealCategories, categories) => {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const counts = new Map();
  dealCategories.forEach((c) => counts.set(c.name, (counts.get(c.name) || 0) + 1));
  const contexts = new Map();
  dealCategories.forEach((c) => {
    const parent = byId.get(c.parentId);
    if (counts.get(c.name) > 1 && parent?.name) contexts.set(c.id, parent.name);
  });
  return contexts;
};
