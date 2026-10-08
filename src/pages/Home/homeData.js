import apiService from "../../services/api";
import { STOREFRONT_CONFIG, resolveTrustBadgeDetail } from "../../theme/tokens";
import { APP_NAME } from "../../utils/constants";

// =============================================================================
// Home page data rules for the closing half (Prompt 12)
// =============================================================================
// Pure helpers (and one loader) behind the brands strip, the review carousel
// and the "Our promise" steps. Every value shown comes from the catalogue, the
// approved reviews, the shipping methods, the store settings or the stated
// returns policy; when a value is missing the copy that needs it is left out,
// never filled with a guess.
// =============================================================================

// ── Brands we carry ──────────────────────────────────────────────────────────

// "A & S Urbanseat", "A&S Urbanseat" and "a & s urbanseat" are one brand.
const brandKey = (name) => String(name).toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * The distinct, non-empty `brand` values of the active products, sorted
 * alphabetically, with the store's own brand (`ownBrand`, APP_NAME by default)
 * moved to the end. Duplicates differing only in case, spacing or punctuation
 * count once (the first spelling seen is kept).
 */
export const collectBrands = (products, ownBrand = APP_NAME) => {
  const brands = new Map();
  (Array.isArray(products) ? products : []).forEach((product) => {
    if (!product || product.isActive === false || typeof product.brand !== "string") return;
    const name = product.brand.trim();
    const key = brandKey(name);
    if (key && !brands.has(key)) brands.set(key, name);
  });
  const own = ownBrand ? brandKey(ownBrand) : "";
  return [...brands.entries()]
    .sort(([keyA, nameA], [keyB, nameB]) => {
      if (keyA === own) return 1;
      if (keyB === own) return -1;
      return nameA.localeCompare(nameB, "en-IN", { sensitivity: "base" });
    })
    .map(([, name]) => name);
};

// ── Customer reviews ─────────────────────────────────────────────────────────

export const MAX_REVIEW_PRODUCTS = 8; // at most one read per featured product
export const MAX_REVIEWS = 10;
export const MIN_REVIEW_LENGTH = 40; // characters of review text

const reviewText = (review) => (typeof review?.body === "string" ? review.body.trim() : "");
// The storefront endpoint returns approved reviews only; anything carrying
// another status is dropped all the same.
const isApproved = (review) => review?.status == null || review.status === "approved";
const timeOf = (review) => {
  const time = Date.parse(review?.createdAt);
  return Number.isFinite(time) ? time : 0;
};

/**
 * Flattens `[{ product, reviews }]` into the carousel's list: approved
 * reviews with at least MIN_REVIEW_LENGTH characters of text, newest first,
 * at most MAX_REVIEWS, each carrying its product's id, name and slug (for the
 * link). Reviews that name another product, or repeat an id, are skipped.
 */
export const selectReviews = (entries) => {
  const seen = new Set();
  const selected = [];
  (Array.isArray(entries) ? entries : []).forEach(({ product, reviews } = {}) => {
    if (!product || product.id == null) return;
    (Array.isArray(reviews) ? reviews : []).forEach((review) => {
      if (!review || !isApproved(review)) return;
      if (reviewText(review).length < MIN_REVIEW_LENGTH) return;
      if (review.productId != null && String(review.productId) !== String(product.id)) return;
      if (review.id != null) {
        const key = String(review.id);
        if (seen.has(key)) return;
        seen.add(key);
      }
      selected.push({
        ...review,
        product: { id: product.id, name: product.name, slug: product.slug },
      });
    });
  });
  return selected.sort((a, b) => timeOf(b) - timeOf(a)).slice(0, MAX_REVIEWS);
};

/**
 * Reads the approved reviews of the given (featured) products: one
 * products.getReviews call each, for at most MAX_REVIEW_PRODUCTS distinct
 * active products, in parallel. A failed read counts as no reviews.
 */
export const loadFeaturedReviews = async (products) => {
  const ids = new Set();
  const targets = (Array.isArray(products) ? products : [])
    .filter((product) => {
      if (!product || product.id == null || product.isActive === false) return false;
      const key = String(product.id);
      if (ids.has(key)) return false;
      ids.add(key);
      return true;
    })
    .slice(0, MAX_REVIEW_PRODUCTS);
  const lists = await Promise.all(
    targets.map((product) => apiService.products.getReviews(product.id).catch(() => []))
  );
  return selectReviews(targets.map((product, index) => ({ product, reviews: lists[index] })));
};

// ── Our promise ──────────────────────────────────────────────────────────────

// "7-10" → "7–10", "5" → "5"; anything else (empty, "0" for same day, text)
// is not a Standard delivery window and gives null.
export const formatDeliveryDays = (value) => {
  if (value == null) return null;
  const match = String(value)
    .trim()
    .match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!match) return null;
  const [, from, to] = match;
  if (Number(to ?? from) <= 0) return null;
  return to ? `${from}–${to}` : from;
};

// The active method named "Standard …" (the free-delivery tier).
const standardMethod = (shipping) =>
  (Array.isArray(shipping) ? shipping : []).find(
    (method) => method && method.isActive !== false && /standard/i.test(String(method.name || ""))
  ) || null;

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * The live values a promise step's copy may use, by its `dataKey`:
 *   payment   { cod }        true while settings.payment.codEnabled
 *   delivery  { days, threshold }
 *             days: the Standard method's estimatedDays ("7–10")
 *             threshold: resolveTrustBadgeDetail("freeShipping") in sentence
 *             case ("above ₹9,999"), the amount the strip and footer show
 *   returns   { returns }    STOREFRONT_CONFIG.returnsWindowDays when > 0
 * A value the data does not back is null (false for cod). `data` is
 * `{ settings, shipping }`, or null while those reads are pending.
 */
export const promiseValues = (dataKey, data) => {
  const { settings = null, shipping = [] } = data || {};
  if (dataKey === "payment") {
    return { cod: resolveTrustBadgeDetail("cod", { settings }) !== null };
  }
  if (dataKey === "delivery") {
    const threshold = resolveTrustBadgeDetail("freeShipping", { shipping });
    return {
      days: formatDeliveryDays(standardMethod(shipping)?.estimatedDays),
      threshold: threshold ? lowerFirst(threshold) : null,
    };
  }
  if (dataKey === "returns") {
    return {
      returns:
        resolveTrustBadgeDetail("easyReturns") === null ? null : STOREFRONT_CONFIG.returnsWindowDays,
    };
  }
  return {};
};

const PLACEHOLDER = /\{(\w+)\}/g;
const hasValue = (value) => value !== undefined && value !== null && value !== "" && value !== false;

// One sentence of a step's body: a template string, or { text, requires }.
// Null when a value it needs is missing.
const fillSentence = (entry, values) => {
  const { text, requires } = typeof entry === "string" ? { text: entry } : entry || {};
  if (typeof text !== "string" || !text.trim()) return null;
  if ([].concat(requires ?? []).some((key) => !hasValue(values[key]))) return null;
  let missing = false;
  const filled = text.replace(PLACEHOLDER, (_, key) => {
    if (!hasValue(values[key])) {
      missing = true;
      return "";
    }
    return String(values[key]);
  });
  return missing ? null : filled;
};

/**
 * The body a promise step shows for `data` ({ settings, shipping }): its
 * sentences whose values are all backed, joined, or its `fallback` when none
 * is. `body` may also be a single template string.
 */
export const resolvePromiseBody = (step, data) => {
  if (!step) return "";
  const values = promiseValues(step.dataKey, data);
  const sentences = [].concat(step.body ?? []).map((entry) => fillSentence(entry, values));
  const shown = sentences.filter(Boolean);
  if (shown.length > 0) return shown.join(" ");
  return typeof step.fallback === "string" ? step.fallback : "";
};

// About as wide as the live values: for laying the body out invisibly while
// its data loads, so the step keeps its height when the copy arrives.
const LAYOUT_FILLERS = { cod: true, days: "00–00", threshold: "above ₹0,000", returns: "00" };

/**
 * Every sentence of the step's body with fillers in place of the live values.
 * Layout only: render it hidden (visibility: hidden, aria-hidden), never as
 * copy.
 */
export const promiseBodyLayout = (step) =>
  step
    ? []
        .concat(step.body ?? [])
        .map((entry) => fillSentence(entry, LAYOUT_FILLERS))
        .filter(Boolean)
        .join(" ")
    : "";

/**
 * Settings and shipping methods for the promise steps, each read once; a
 * failed read counts as no data (so only the copy needing it drops out).
 */
export const loadPromiseData = async () => {
  const [settings, shipping] = await Promise.allSettled([
    apiService.settings.get(),
    apiService.shipping.getMethods(),
  ]);
  return {
    settings: settings.status === "fulfilled" ? settings.value || null : null,
    shipping:
      shipping.status === "fulfilled" && Array.isArray(shipping.value) ? shipping.value : [],
  };
};
