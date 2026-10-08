import { resolveTrustBadgeDetail } from "../../theme/tokens";

// =============================================================================
// cartDelivery — what the cart drawer says about delivery, from live data
// =============================================================================
// Display only: the drawer never charges anything and never computes taxes.
// Checkout (Checkout.js) prices the method the shopper picks:
//
//   rateType === "free" || (freeAbove && subtotal >= freeAbove) ? 0 : flatRate
//
// and the drawer describes the same rule ahead of time:
//
//   threshold  the lowest positive `freeAbove` among the active methods. That
//              is resolveTrustBadgeDetail("freeShipping")'s rule, which the
//              footer, the home assurance strip and the product page print,
//              so every surface names one amount. The resolver decides whether
//              a threshold exists; it returns display text ("Above ₹9,999"), so
//              the amount itself is read here by the same rule
//              (cartDelivery.test.js pins the two together).
//   rate       the flat rate of the method carrying that threshold; with no
//              threshold, the lowest rate of any active method.
//
// A method that is free at any amount (rateType "free", or a ₹0 rate, which
// checkout charges as nothing) makes delivery free outright: there is no
// threshold left to reach, so none is reported.
//
// No active methods, or a read that failed, gives null: the drawer then says
// "Calculated at checkout" and draws no progress. Nothing here invents a
// threshold or a rate.
// =============================================================================

const finite = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/** The active methods of a shipping.getMethods() answer; null when it is not a list. */
export const activeMethods = (data) =>
  Array.isArray(data) ? data.filter((method) => method && method.isActive !== false) : null;

/** What a method charges below any threshold: 0 when free, its flat rate, or null when unknown. */
export const methodRate = (method) => {
  if (method.rateType === "free") return 0;
  const rate = finite(method.flatRate);
  return rate !== null && rate >= 0 ? rate : null;
};

const freeAboveOf = (method) => {
  const amount = finite(method.freeAbove);
  return amount !== null && amount > 0 ? amount : null;
};

/** The lowest positive `freeAbove` of `methods` (the resolver's rule), or null. */
export const freeDeliveryThreshold = (methods) => {
  if (!Array.isArray(methods)) return null;
  if (resolveTrustBadgeDetail("freeShipping", { shipping: methods }) === null) return null;
  const amounts = methods.map(freeAboveOf).filter((amount) => amount !== null);
  return amounts.length ? Math.min(...amounts) : null;
};

/**
 * The drawer's delivery estimate for the active `methods`, or null when there
 * is nothing to go on (no methods, or the read failed).
 *   threshold  number | null  free above this subtotal (inclusive, as at checkout)
 *   rate       number | null  the charge below it; 0 = free outright, null = unknown
 */
export const deliveryEstimate = (methods) => {
  if (!Array.isArray(methods) || methods.length === 0) return null;
  const rates = methods.map(methodRate).filter((rate) => rate !== null);
  if (rates.includes(0)) return { threshold: null, rate: 0 };

  const threshold = freeDeliveryThreshold(methods);
  if (threshold === null) {
    return { threshold: null, rate: rates.length ? Math.min(...rates) : null };
  }
  const carrier = methods.find((method) => freeAboveOf(method) === threshold);
  return { threshold, rate: methodRate(carrier) };
};
