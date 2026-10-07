#!/usr/bin/env node
/* eslint-disable no-console */
// =============================================================================
// validate-db.js — referential-integrity and content check for db.json
// =============================================================================
// Dev tool only (not imported by the app). No dependencies.
//
//   node scripts/validate-db.js --catalogue   categories + products only
//   node scripts/validate-db.js               full mode (also orders, returns,
//                                             reviews, wishlist, dealsConfig,
//                                             order money math, wallet ledger)
//   node scripts/validate-db.js path/to/db.json [--catalogue]
//
// Exits 1 when any check fails. Prompt 04 added its COVERAGE rows, TREE, BRANDS
// and leaf checks; Prompt 05 added the supporting-data checks (settings,
// shipping and FREE_SHIPPING_THRESHOLD, coupons, order money math, payments,
// refunds, returns, reviews, wishlist, deals, banners, leads). Prompt 34
// extends the full-mode checks rather than loosening anything here.
// =============================================================================

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const CATALOGUE_ONLY = args.includes("--catalogue");
const file = args.find((a) => !a.startsWith("--")) || path.join(__dirname, "..", "db.json");
const raw = fs.readFileSync(file, "utf8");
const db = JSON.parse(raw);

// ---------------------------------------------------------------- reference shapes
// Key order of the boilerplate's first record in each collection.
const CATEGORY_KEYS = [
  "id", "name", "slug", "description", "image", "parentId", "isActive", "sortOrder",
  "showInMainMenu", "menuOrder", "createdAt", "updatedAt",
];
const PRODUCT_KEYS = [
  "id", "name", "slug", "sku", "shortDescription", "description", "categoryId", "brand",
  "images", "price", "comparePrice", "costPrice", "stock", "lowStockThreshold", "weight",
  "dimensions", "variants", "tags", "featured", "trending", "hot", "isActive", "rating",
  "totalReviews", "metaTitle", "metaDescription", "createdAt", "updatedAt",
  "frequentlyBoughtTogetherIds", "relatedProductIds",
];
const DIMENSION_KEYS = ["length", "width", "height"];
const VARIANT_KEYS = ["id", "name", "price", "stock", "sku", "attributes", "swatchHex"]; // last two optional

// The six departments, fixed in id, slug and menu order.
const DEPARTMENTS = [
  [1, "plastic-furniture"], [2, "office-chairs"], [3, "cafe-restaurant-chairs"],
  [4, "outdoor-furniture"], [5, "home-furniture"], [6, "office-tables-desks"],
];

// Proof of coverage: exact product count per category slug. Every active
// product must sit in a slug listed here.
const COVERAGE = [
  // Prompt 03 — client-specified ranges (46)
  ["plastic-essentials-armchairs", 3],
  ["plastic-essentials-chairs", 3],
  ["plastic-essentials-centre-tables", 2],
  ["plastic-shoe-racks", 3],
  ["plastic-premium-armchairs", 3],
  ["plastic-premium-chairs", 2],
  ["plastic-premium-centre-tables", 2],
  ["outdoor-furniture", 2],
  ["office-essentials-high-back", 3],
  ["office-essentials-low-back", 2],
  ["office-essentials-waiting", 3],
  ["office-premium-high-back", 3],
  ["office-premium-low-back", 2],
  ["office-premium-waiting", 3],
  ["cafe-restaurant-chairs", 10],
  // Prompt 04 — ranges from the client's existing website (38)
  ["sofas", 4],
  ["sofa-cum-beds", 2],
  ["centre-tables-showcases", 2],
  ["beds", 3],
  ["mattresses", 2],
  ["dressing-tables-mirrors", 4],
  ["bedside-bed-tables", 3],
  ["almirahs", 2],
  ["alna-clothes-stands", 2],
  ["racks", 2],
  ["dining-sets", 3],
  ["office-tables", 2],
  ["computer-tables", 2],
  ["reading-tables", 2],
  ["plastic-dining-sets", 2],
  ["plastic-sofas", 1],
];
// Leaves may hold a single product only where the reference site lists a
// single model and the tree in Prompt 04 still gives it its own leaf.
const SINGLE_PRODUCT_LEAVES = ["plastic-sofas"];
// Prompt 04 subtrees: slug -> [parent slug, sortOrder].
const TREE = {
  "living-room": ["home-furniture", 1], "sofas": ["living-room", 1], "sofa-cum-beds": ["living-room", 2],
  "centre-tables-showcases": ["living-room", 3], "bedroom": ["home-furniture", 2], "beds": ["bedroom", 1],
  "mattresses": ["bedroom", 2], "dressing-tables-mirrors": ["bedroom", 3], "bedside-bed-tables": ["bedroom", 4],
  "almirahs": ["bedroom", 5], "alna-clothes-stands": ["bedroom", 6], "dining-room": ["home-furniture", 3],
  "dining-sets": ["dining-room", 1], "storage": ["home-furniture", 4], "racks": ["storage", 1],
  "office-tables": ["office-tables-desks", 1], "computer-tables": ["office-tables-desks", 2],
  "reading-tables": ["office-tables-desks", 3], "plastic-dining-sets": ["plastic-furniture", 3],
  "plastic-sofas": ["plastic-furniture", 4],
};
// The only brand values allowed on products ("" hides the brand on the card).
const BRANDS = ["", "A & S Urbanseat", "Nilkamal", "Carlton", "Winsome"];
// Variant structure required per slug: attribute name and exact values.
const VARIANT_RULES = {
  "plastic-shoe-racks": { attr: "Shelves", values: ["2 shelves", "3 shelves", "4 shelves", "5 shelves"], perVariantPrice: true },
  "outdoor-furniture": { attr: "Size", values: ["Small", "Large"], perVariantPrice: true },
  "mattresses": { attr: "Size", values: ["Single", "Double", "Queen", "King"], perVariantPrice: true },
  "racks": { attr: "Shelves", values: ["3 shelves", "4 shelves", "5 shelves"], perVariantPrice: true },
  "office-tables": { attr: "Size", values: ["120 × 60 cm", "150 × 75 cm"], perVariantPrice: true },
  "computer-tables": { attr: "Size", values: ["90 × 60 cm", "120 × 60 cm"], perVariantPrice: true },
  "reading-tables": { attr: "Size", values: ["75 × 50 cm", "90 × 60 cm"], perVariantPrice: true },
};

// ---------------------------------------------------------------- helpers
const failures = [];
const summary = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);
const check = (cond, where, msg) => { if (!cond) fail(where, msg); return !!cond; };
const sameKeys = (obj, ref) => JSON.stringify(Object.keys(obj)) === JSON.stringify(ref);
const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
// Same rule as slugify() in src/utils/helpers.js, applied after folding accents
// so "Café" becomes "cafe" rather than "caf".
const slugify = (text) => fold(text).toLowerCase().replace(/\s+/g, "-")
  .replace(/[^\w-]+/g, "").replace(/--+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
const dupes = (list) => list.filter((v, i) => list.indexOf(v) !== i);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

// ---------------------------------------------------------------- banned wording
check(!/non[- ]?premium/i.test(raw), "db.json", 'contains "non-premium"');

// ---------------------------------------------------------------- categories
const categories = db.categories || [];
const catById = new Map(categories.map((c) => [String(c.id), c]));
dupes(categories.map((c) => c.id)).forEach((d) => fail("categories", `duplicate id ${d}`));
dupes(categories.map((c) => c.slug)).forEach((d) => fail("categories", `duplicate slug ${d}`));

categories.forEach((c) => {
  const at = `category ${c.id} (${c.slug})`;
  check(sameKeys(c, CATEGORY_KEYS), at, `keys differ from reference: ${Object.keys(c).join(",")}`);
  check(c.slug === slugify(c.slug) && /^[a-z0-9-]+$/.test(c.slug), at, "slug is not a clean ASCII slug");
  check(typeof c.name === "string" && c.name.trim(), at, "missing name");
  check(typeof c.description === "string" && c.description.trim(), at, "missing description");
  check(typeof c.image === "string" && c.image.startsWith("https://"), at, "missing image");
  check(ISO.test(c.createdAt) && ISO.test(c.updatedAt), at, "dates are not ISO strings");
  if (c.parentId !== null) {
    check(catById.has(String(c.parentId)), at, `parentId ${c.parentId} does not exist`);
    check(c.showInMainMenu === false && c.menuOrder === 0, at, "child category must have showInMainMenu false, menuOrder 0");
  }
  // cycle guard
  const seen = new Set();
  let cur = c;
  while (cur && cur.parentId !== null) {
    if (seen.has(cur.id)) { fail(at, "parentId cycle"); break; }
    seen.add(cur.id);
    cur = catById.get(String(cur.parentId));
  }
});
// sortOrder counts 1..n within each parent
const byParent = {};
categories.forEach((c) => { (byParent[String(c.parentId)] = byParent[String(c.parentId)] || []).push(c.sortOrder); });
Object.entries(byParent).forEach(([pid, orders]) => {
  const sorted = [...orders].sort((a, b) => a - b);
  check(sorted.every((v, i) => v === i + 1), `categories under parent ${pid}`, `sortOrder is not 1..${orders.length} (${sorted.join(",")})`);
});
DEPARTMENTS.forEach(([id, slug], i) => {
  const c = catById.get(String(id));
  if (check(c, "departments", `department ${id} missing`)) {
    check(c.slug === slug, `department ${id}`, `slug ${c.slug} ≠ ${slug}`);
    check(c.parentId === null && c.isActive && c.showInMainMenu === true && c.menuOrder === i + 1,
      `department ${id}`, "must be active, top-level, in the main menu at its fixed menuOrder");
  }
});
Object.entries(TREE).forEach(([slug, [parentSlug, sortOrder]]) => {
  const c = categories.find((x) => x.slug === slug);
  if (check(c, "tree", `category ${slug} missing`)) {
    check(catById.get(String(c.parentId))?.slug === parentSlug, `category ${c.id} (${slug})`, `parent must be ${parentSlug}`);
    check(c.sortOrder === sortOrder && c.isActive, `category ${c.id} (${slug})`, `must be active with sortOrder ${sortOrder}`);
  }
});
categories.filter((c) => c.showInMainMenu && !DEPARTMENTS.some(([id]) => id === c.id))
  .forEach((c) => fail(`category ${c.id}`, "only the six departments may be in the main menu"));

const deptOf = (catId) => {
  let c = catById.get(String(catId));
  while (c && c.parentId !== null) c = catById.get(String(c.parentId));
  return c ? c.id : null;
};
const hasActiveChildren = (id) => categories.some((c) => String(c.parentId) === String(id) && c.isActive);

// ---------------------------------------------------------------- products
const products = db.products || [];
const prodById = new Map(products.map((p) => [String(p.id), p]));
dupes(products.map((p) => p.id)).forEach((d) => fail("products", `duplicate id ${d}`));
dupes(products.map((p) => p.slug)).forEach((d) => fail("products", `duplicate slug ${d}`));
const allSkus = [];
products.forEach((p) => { allSkus.push(p.sku); (p.variants || []).forEach((v) => allSkus.push(v.sku)); });
dupes(allSkus).forEach((d) => fail("products", `duplicate SKU ${d}`));

let lowStockVariants = 0;
let outOfStockVariants = 0;

products.forEach((p) => {
  const at = `product ${p.id} (${p.slug})`;
  check(sameKeys(p, PRODUCT_KEYS), at, `keys differ from reference: ${Object.keys(p).join(",")}`);
  check(p.slug === slugify(p.name), at, `slug should be "${slugify(p.name)}"`);
  check(/^[a-z0-9-]+$/.test(p.slug), at, "slug is not ASCII");
  check(typeof p.sku === "string" && p.sku && p.sku === p.sku.toUpperCase(), at, "SKU must be uppercase");
  check(p.name.length <= 48, at, `name is ${p.name.length} chars (max 48)`);
  check(p.shortDescription.length <= 110, at, `shortDescription is ${p.shortDescription.length} chars (max 110)`);

  // description: paragraphs, ending with a parseable Specifications paragraph
  const paras = String(p.description).split("\n\n");
  const spec = paras[paras.length - 1];
  check(paras.length >= 3 && paras.length <= 4, at, "description should be 2–3 paragraphs plus Specifications");
  if (check(spec.startsWith("Specifications: "), at, "last paragraph must start with \"Specifications: \"")) {
    const pairs = spec.slice("Specifications: ".length).split("; ");
    check(pairs.length >= 5 && pairs.length <= 7, at, `Specifications has ${pairs.length} pairs (5–7)`);
    check(pairs.every((kv) => /^[^:;]+: .+/.test(kv)), at, "Specifications pairs must be \"Key: Value\"");
  }

  // category
  const cat = catById.get(String(p.categoryId));
  if (check(cat, at, `categoryId ${p.categoryId} does not exist`)) {
    check(cat.isActive, at, "category is inactive");
    check(!hasActiveChildren(cat.id), at, `category ${cat.slug} has children; products must sit on a leaf or flat department`);
  }

  // images
  check(Array.isArray(p.images) && p.images.length === 3, at, "needs exactly 3 images");
  (p.images || []).forEach((u) => check(/^https:\/\/placehold\.co\/1200x1500\/f1ebe1\/686158\?text=/.test(u) || /^https:\/\/res\.cloudinary\.com\//.test(u),
    at, `image not on the placeholder pattern: ${u}`));
  check(!/kamdhenufurniture/i.test(JSON.stringify(p.images)), at, "links to the reference site's images");

  // money / stock
  ["price", "comparePrice", "costPrice", "stock", "lowStockThreshold", "weight", "rating", "totalReviews"]
    .forEach((k) => check(isNum(p[k]), at, `${k} must be a number`));
  check(p.price > 0, at, "price must be > 0");
  check(p.comparePrice === 0 || p.comparePrice > p.price, at, "comparePrice must be 0 or above price");
  check(p.costPrice > 0 && p.costPrice < p.price, at, "costPrice must be between 0 and price");
  check(p.lowStockThreshold >= 3 && p.lowStockThreshold <= 8, at, "lowStockThreshold must be 3–8");
  check(p.dimensions && sameKeys(p.dimensions, DIMENSION_KEYS) && DIMENSION_KEYS.every((k) => p.dimensions[k] > 0),
    at, "dimensions must be { length, width, height } > 0");
  check(p.rating >= 0 && p.rating <= 5, at, "rating out of range");
  if (p.totalReviews === 0) check(p.rating === 0, at, "rating must be 0 when totalReviews is 0");

  // variants
  check(Array.isArray(p.variants), at, "variants must be an array ([] when none)");
  const vs = p.variants || [];
  if (vs.length) {
    dupes(vs.map((v) => v.id)).forEach((d) => fail(at, `duplicate variant id ${d}`));
    const withAttrs = vs.filter((v) => v.attributes);
    check(withAttrs.length === 0 || withAttrs.length === vs.length, at, "attributes present on some variants but not all");
    if (withAttrs.length) {
      const keyset = JSON.stringify(Object.keys(vs[0].attributes).sort());
      check(vs.every((v) => JSON.stringify(Object.keys(v.attributes).sort()) === keyset), at, "variants use different attribute keys");
      const combos = vs.map((v) => JSON.stringify(v.attributes));
      check(dupes(combos).length === 0, at, "two variants share the same attribute values");
    }
    vs.forEach((v) => {
      const vat = `${at} variant ${v.id}`;
      const keys = Object.keys(v);
      check(keys.every((k) => VARIANT_KEYS.includes(k)) && ["id", "name", "price", "stock", "sku"].every((k) => keys.includes(k)),
        vat, `unexpected variant keys: ${keys.join(",")}`);
      check(isNum(v.price) && v.price > 0, vat, "price must be > 0");
      check(Number.isInteger(v.stock) && v.stock >= 0 && v.stock <= 60, vat, "stock must be an integer 0–60");
      check(v.sku && v.sku === v.sku.toUpperCase(), vat, "SKU must be uppercase");
      if (v.swatchHex !== undefined) {
        check(/^#[0-9a-f]{6}$/i.test(v.swatchHex), vat, "swatchHex must be #rrggbb");
        check(v.attributes && Object.keys(v.attributes).some((k) => /colou?r|shade|finish/i.test(k)), vat, "swatchHex without a colour/finish attribute");
      }
      if (v.stock === 0) outOfStockVariants += 1;
      else if (v.stock <= p.lowStockThreshold) lowStockVariants += 1;
    });
    const min = Math.min(...vs.map((v) => v.price));
    check(p.price === min, at, `price ${p.price} ≠ lowest variant price ${min}`);
    const sum = vs.reduce((a, v) => a + v.stock, 0);
    check(p.stock === sum, at, `stock ${p.stock} ≠ sum of variant stock ${sum}`);
  } else {
    check(Number.isInteger(p.stock) && p.stock >= 0, at, "stock must be a non-negative integer");
  }

  // tags
  check(Array.isArray(p.tags) && p.tags.length > 0, at, "needs tags");
  check((p.tags || []).every((t) => t === String(t).toLowerCase()), at, "tags must be lowercase");
  check(BRANDS.includes(p.brand), at, `brand "${p.brand}" is not one of ${BRANDS.filter(Boolean).join(", ")} or ""`);
  if (p.brand) check(p.tags.includes(p.brand.toLowerCase()), at, "tags must include the brand");

  // relations
  ["relatedProductIds", "frequentlyBoughtTogetherIds"].forEach((k) => {
    const ids = p[k] || [];
    check(Array.isArray(p[k]), at, `${k} must be an array`);
    check(dupes(ids.map(String)).length === 0, at, `${k} has duplicates`);
    ids.forEach((id) => {
      const q = prodById.get(String(id));
      check(String(id) !== String(p.id), at, `${k} references itself`);
      check(q && q.isActive, at, `${k} references missing or inactive product ${id}`);
    });
  });
  check((p.relatedProductIds || []).length <= 5, at, "relatedProductIds has more than 5 ids");
  check((p.frequentlyBoughtTogetherIds || []).length <= 2, at, "frequentlyBoughtTogetherIds has more than 2 ids");

  check(ISO.test(p.createdAt) && ISO.test(p.updatedAt) && p.updatedAt >= p.createdAt, at, "dates must be ISO and updatedAt ≥ createdAt");
});

// coverage
const slugCount = {};
products.filter((p) => p.isActive).forEach((p) => {
  const slug = catById.get(String(p.categoryId))?.slug;
  slugCount[slug] = (slugCount[slug] || 0) + 1;
});
const covered = new Set(COVERAGE.map(([s]) => s));
COVERAGE.forEach(([slug, n]) => {
  check(catById.has(String(categories.find((c) => c.slug === slug)?.id)), "coverage", `category ${slug} missing`);
  check((slugCount[slug] || 0) === n, "coverage", `${slug}: expected ${n} products, found ${slugCount[slug] || 0}`);
});
Object.keys(slugCount).filter((s) => !covered.has(s))
  .forEach((s) => fail("coverage", `${slugCount[s]} product(s) in ${s}, which is not in the coverage table`));
// every active leaf category holds at least two products (no lonely listing)
categories.filter((c) => c.isActive && !hasActiveChildren(c.id)).forEach((c) => {
  const min = SINGLE_PRODUCT_LEAVES.includes(c.slug) ? 1 : 2;
  check((slugCount[c.slug] || 0) >= min, `category ${c.id} (${c.slug})`, `leaf holds ${slugCount[c.slug] || 0} product(s), needs ${min}+`);
});
const expectedTotal = COVERAGE.reduce((a, [, n]) => a + n, 0);
check(products.length === expectedTotal, "coverage", `expected ${expectedTotal} products, found ${products.length}`);
Object.entries(VARIANT_RULES).forEach(([slug, rule]) => {
  products.filter((p) => catById.get(String(p.categoryId))?.slug === slug).forEach((p) => {
    const at = `product ${p.id} (${slug})`;
    const vals = p.variants.map((v) => v.attributes?.[rule.attr]);
    check(JSON.stringify(vals) === JSON.stringify(rule.values), at, `variants must be ${rule.attr}: ${rule.values.join(" / ")}`);
    if (rule.perVariantPrice) {
      check(p.variants.every((v, i) => i === 0 || v.price > p.variants[i - 1].price), at, "variant price must rise with each step");
    }
  });
});
check(lowStockVariants >= 2, "stock", `need 2+ low-stock variants to exercise the UI (found ${lowStockVariants})`);
check(outOfStockVariants >= 1, "stock", `need 1+ out-of-stock variant to exercise the UI (found ${outOfStockVariants})`);

// ---------------------------------------------------------------- full mode
const pushRef = (where, productId, variantId) => {
  const p = prodById.get(String(productId));
  if (!check(p, where, `product ${productId} does not exist`)) return;
  if (variantId != null && (p.variants || []).length) {
    check(p.variants.some((v) => v.id === variantId), where, `variant ${variantId} not on product ${productId}`);
  }
};

if (!CATALOGUE_ONLY) {
  const near = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) < 0.01;
  (db.orders || []).forEach((o) => {
    const at = `order ${o.id} (${o.orderNumber})`;
    (o.items || []).forEach((it, i) => {
      pushRef(`${at} item ${i}`, it.productId, it.variantId);
      check(near(it.subtotal, it.price * it.quantity), `${at} item ${i}`, "subtotal ≠ price × quantity");
    });
    const itemsSum = (o.items || []).reduce((a, it) => a + (Number(it.subtotal) || 0), 0);
    check(near(o.subtotal, itemsSum), at, `subtotal ${o.subtotal} ≠ sum of items ${itemsSum}`);
    const total = o.subtotal - (o.discountAmount || 0) + (o.shippingAmount || 0) + (o.taxAmount || 0);
    check(near(o.total, total), at, `total ${o.total} ≠ subtotal − discount + shipping + tax (${total})`);
    if (o.amountPayable !== undefined) {
      check(near(o.amountPayable, Math.max(0, o.total - (o.storeCreditUsed || 0))), at, "amountPayable ≠ total − storeCreditUsed");
    }
  });
  const orderIds = new Set((db.orders || []).map((o) => String(o.id)));
  (db.returns || []).forEach((r) => {
    const at = `return ${r.id}`;
    check(orderIds.has(String(r.orderId)), at, `order ${r.orderId} does not exist`);
    (r.items || []).forEach((it, i) => pushRef(`${at} item ${i}`, it.productId, it.variantId));
  });
  (db.reviews || []).forEach((r) => pushRef(`review ${r.id}`, r.productId));
  (db.wishlist || []).forEach((w) => pushRef(`wishlist ${w.id}`, w.productId));

  const d = db.dealsConfig || {};
  const couponIds = new Set((db.coupons || []).map((c) => String(c.id)));
  (d.featuredCouponIds || []).forEach((id) => check(couponIds.has(String(id)), "dealsConfig", `coupon ${id} does not exist`));
  [...(d.dealOfTheDayIds || []), ...(d.featuredProductIds || [])].forEach((id) => {
    const p = prodById.get(String(id));
    check(p && p.isActive, "dealsConfig", `product ${id} missing or inactive`);
  });

  // ratings agree with approved reviews
  products.forEach((p) => {
    const approved = (db.reviews || []).filter((r) => String(r.productId) === String(p.id) && r.status === "approved");
    const avg = approved.length ? Math.round((approved.reduce((a, r) => a + r.rating, 0) / approved.length) * 10) / 10 : 0;
    check(p.totalReviews === approved.length, `product ${p.id}`, `totalReviews ${p.totalReviews} ≠ approved reviews ${approved.length}`);
    check(near(p.rating, avg), `product ${p.id}`, `rating ${p.rating} ≠ approved average ${avg}`);
  });

  // wallet ledger: a running balance per user that ends at users[].storeCredit
  const users = db.users || [];
  const txByUser = {};
  (db.walletTransactions || []).forEach((t) => { (txByUser[t.userId] = txByUser[t.userId] || []).push(t); });
  users.forEach((u) => {
    const txs = (txByUser[u.id] || []).slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id - b.id));
    let bal = 0;
    txs.forEach((t) => {
      const at = `walletTransaction ${t.id} (user ${u.id})`;
      check(near(t.balanceBefore, bal), at, `balanceBefore ${t.balanceBefore} ≠ running balance ${bal}`);
      bal += t.type === "credit" ? t.amount : -t.amount;
      check(near(t.balanceAfter, bal), at, `balanceAfter ${t.balanceAfter} ≠ ${bal}`);
      check(bal >= 0, at, "balance goes negative");
    });
    check(near(u.storeCredit || 0, bal), `user ${u.id}`, `storeCredit ${u.storeCredit} ≠ ledger balance ${bal}`);
  });
  Object.keys(txByUser).forEach((uid) => check(users.some((u) => String(u.id) === uid), "walletTransactions", `user ${uid} does not exist`));

  // ---- Prompt 05: supporting data ------------------------------------------
  const orders = db.orders || [];
  const orderById = new Map(orders.map((o) => [String(o.id), o]));
  const userIds = new Set(users.map((u) => String(u.id)));
  const coupons = db.coupons || [];
  const couponByCode = new Map(coupons.map((c) => [c.code, c]));
  const methods = db.shipping_methods || [];
  const settings = db.settings || {};
  const taxRate = settings.store?.taxRate;
  const payments = db.payments || [];
  const refunds = db.refunds || [];
  const returns = db.returns || [];
  const charged = (o) => (o.amountPayable != null ? o.amountPayable : o.total);
  const nowIso = new Date().toISOString();

  // key sets for collections whose records all share one shape
  const SHAPES = {
    reviews: ["id", "productId", "userId", "userName", "rating", "title", "body", "status", "isVerifiedPurchase", "helpfulCount", "createdAt", "updatedAt"],
    coupons: ["id", "code", "description", "type", "value", "minOrderAmount", "maxDiscount", "usageLimit", "usedCount", "perUserLimit", "isActive", "expiresAt", "createdAt", "updatedAt"],
    shipping_methods: ["id", "name", "carrier", "description", "rateType", "flatRate", "freeAbove", "estimatedDays", "isActive", "createdAt"],
    banners: ["id", "title", "subtitle", "cta", "link", "gradient"],
    wishlist: ["productId", "slug", "name", "image", "brand", "price", "comparePrice", "rating", "totalReviews", "shortDescription", "variants", "stock", "trending", "hot", "addedAt", "userId", "id"],
  };
  Object.entries(SHAPES).forEach(([coll, keys]) => (db[coll] || []).forEach((r) => {
    check(JSON.stringify(Object.keys(r).sort()) === JSON.stringify([...keys].sort()), `${coll} ${r.id}`, `keys differ: ${Object.keys(r).join(",")}`);
  }));
  check(Array.isArray(db.cart) && db.cart.length === 0, "cart", "must stay []");
  check(!/electronic|smartwatch|earbud|laptop|t-shirt|running shoe/i.test(JSON.stringify({
    o: orders, r: returns, p: payments, f: refunds, w: db.wishlist, b: db.banners, c: coupons, d: db.dealsConfig, v: db.reviews,
  })), "supporting data", "still mentions the boilerplate's electronics/fashion catalogue");

  // settings
  check(settings.store?.name === "A & S Urbanseat", "settings", "store.name must be A & S Urbanseat");
  check(isNum(taxRate) && taxRate >= 0, "settings", "store.taxRate must be a number");
  const sp = settings.payment || {};
  check(isNum(sp.codFee) && isNum(sp.codMinOrder) && isNum(sp.codMaxOrder) && sp.codMinOrder <= sp.codMaxOrder, "settings", "COD limits must be numbers with min ≤ max");

  // shipping methods and the storefront constant
  const standard = methods.find((m) => m.name === "Standard Delivery");
  if (check(standard && standard.isActive, "shipping_methods", "an active Standard Delivery method is required")) {
    const constSrc = fs.readFileSync(path.join(__dirname, "..", "src", "utils", "constants.js"), "utf8");
    const m = constSrc.match(/export const FREE_SHIPPING_THRESHOLD\s*=\s*([\d_]+)\s*;/);
    const threshold = m ? Number(m[1].replace(/_/g, "")) : NaN;
    check(threshold === standard.freeAbove, "constants.js", `FREE_SHIPPING_THRESHOLD ${m ? m[1] : "(not found)"} ≠ Standard freeAbove ${standard.freeAbove}`);
  }
  methods.forEach((m) => {
    check(isNum(m.flatRate) && m.flatRate >= 0, `shipping_method ${m.id}`, "flatRate must be a number ≥ 0");
    check(m.freeAbove === null || isNum(m.freeAbove), `shipping_method ${m.id}`, "freeAbove must be a number or null");
  });

  // coupons
  dupes(coupons.map((c) => c.code)).forEach((c) => fail("coupons", `duplicate code ${c}`));
  coupons.forEach((c) => {
    const at = `coupon ${c.id} (${c.code})`;
    check(c.code === c.code.toUpperCase() && /^[A-Z0-9]+$/.test(c.code), at, "code must be uppercase letters and digits");
    check(["fixed", "percentage"].includes(c.type), at, "type must be fixed or percentage");
    check(isNum(c.value) && c.value > 0 && (c.type !== "percentage" || c.value <= 100), at, "value out of range");
    check(c.type !== "percentage" || (isNum(c.maxDiscount) && c.maxDiscount > 0), at, "percentage coupon needs a maxDiscount");
    check(c.usageLimit === null || c.usedCount <= c.usageLimit, at, "usedCount exceeds usageLimit");
    if (c.isActive) {
      check(c.expiresAt > nowIso, at, "active coupon has expired");
      check(c.usageLimit === null || c.usedCount < c.usageLimit, at, "active coupon is exhausted");
      check(c.type !== "fixed" || c.value < c.minOrderAmount, at, "fixed discount must be below its minimum order");
    }
  });
  check(coupons.some((c) => !c.isActive && c.expiresAt < nowIso && c.usageLimit !== null && c.usedCount >= c.usageLimit),
    "coupons", "keep one inactive, expired, exhausted coupon so the admin states stay testable");

  // orders: snapshots and the checkout's money rules
  const discountFor = (c, amount) => {
    const raw = c.type === "percentage" ? Math.round((amount * c.value) / 100) : c.value;
    return Math.max(0, Math.min(raw, c.maxDiscount || Infinity, amount));
  };
  dupes(orders.map((o) => o.orderNumber)).forEach((n) => fail("orders", `duplicate orderNumber ${n}`));
  orders.forEach((o) => {
    const at = `order ${o.id} (${o.orderNumber})`;
    check(userIds.has(String(o.userId)), at, `user ${o.userId} does not exist`);
    (o.items || []).forEach((it, i) => {
      const p = prodById.get(String(it.productId));
      if (!p) return;
      const v = (p.variants || []).find((x) => x.id === it.variantId);
      const name = v ? `${p.name} - ${v.name}` : p.name;
      check(it.name === name, `${at} item ${i}`, `name "${it.name}" ≠ "${name}"`);
      check(it.image === p.images[0], `${at} item ${i}`, "image is not the product's first image");
      check(it.sku === (v ? v.sku : p.sku), `${at} item ${i}`, "sku does not match the variant");
    });
    if (o.couponCode) {
      const c = couponByCode.get(o.couponCode);
      if (check(c, at, `coupon ${o.couponCode} does not exist`)) {
        check(near(o.discountAmount, discountFor(c, o.subtotal)), at, `discountAmount ${o.discountAmount} ≠ ${discountFor(c, o.subtotal)} for ${c.code}`);
      }
    } else {
      check(near(o.discountAmount, 0), at, "discountAmount without a coupon");
    }
    const shipOk = methods.some((m) => (m.rateType === "free" || (m.freeAbove && o.subtotal >= m.freeAbove) ? 0 : m.flatRate) === o.shippingAmount);
    check(shipOk, at, `shippingAmount ${o.shippingAmount} matches no shipping method at subtotal ${o.subtotal}`);
    const tax = Math.round(Math.max(0, o.subtotal - o.discountAmount) * (taxRate / 100));
    check(near(o.taxAmount, tax), at, `taxAmount ${o.taxAmount} ≠ ${tax}`);
    // amounts quoted in refund timeline entries match a booked refund
    const booked = refunds.filter((r) => String(r.orderId) === String(o.id)).map((r) => r.amount);
    (o.statusHistory || []).filter((h) => /refund/i.test(h.action)).forEach((h) => {
      const quoted = `${h.action} ${h.note || ""}`.match(/₹([\d,]+)/g) || [];
      quoted.forEach((q) => check(booked.includes(Number(q.slice(1).replace(/,/g, ""))), at, `timeline quotes ${q}, which matches no refund`));
    });
  });

  // payments
  payments.forEach((p) => {
    const at = `payment ${p.id}`;
    const o = orderById.get(String(p.orderId));
    if (!check(o, at, `order ${p.orderId} does not exist`)) return;
    check(p.orderNumber === o.orderNumber && String(p.userId) === String(o.userId), at, "orderNumber/userId differ from the order");
    check(near(p.amount, charged(o)), at, `amount ${p.amount} ≠ order amount payable ${charged(o)}`);
    if (p.storeCreditApplied !== undefined) check(near(p.storeCreditApplied, o.storeCreditUsed || 0), at, "storeCreditApplied ≠ order storeCreditUsed");
    const refunded = (p.refunds || []).reduce((a, r) => a + r.amount, 0);
    if (p.refundAmount !== undefined) check(near(p.refundAmount, refunded), at, `refundAmount ${p.refundAmount} ≠ sum of refunds[] ${refunded}`);
    check(refunded <= p.amount + 0.01, at, "refunded more than the amount");
    if (p.status === "refunded") check(near(refunded, p.amount), at, "status refunded but not fully refunded");
  });
  dupes(payments.map((p) => p.orderId)).forEach((id) => fail("payments", `two payments for order ${id}`));

  // returns
  returns.forEach((r) => {
    const at = `return ${r.id} (${r.returnNumber})`;
    const o = orderById.get(String(r.orderId));
    if (!o) return;
    check(r.orderNumber === o.orderNumber && String(r.userId) === String(o.userId), at, "orderNumber/userId differ from the order");
    (r.items || []).forEach((it, i) => {
      const oi = o.items.find((x) => x.productId === it.productId && x.variantId === it.variantId);
      if (check(oi, `${at} item ${i}`, "not on the linked order")) {
        check(it.name === oi.name && it.sku === oi.sku && it.price === oi.price && it.quantity <= oi.quantity && near(it.subtotal, it.price * it.quantity),
          `${at} item ${i}`, "snapshot differs from the order item");
      }
    });
    // rule: returned item subtotals + their proportional share of the order's tax
    const sub = (r.items || []).reduce((a, it) => a + it.subtotal, 0);
    const expected = sub + Math.round(o.taxAmount * (sub / o.subtotal));
    check(near(r.refundAmount, expected), at, `refundAmount ${r.refundAmount} ≠ items + proportional tax ${expected}`);
  });

  // refunds ledger
  refunds.forEach((f) => {
    const at = `refund ${f.id} (${f.refundNumber})`;
    const o = orderById.get(String(f.orderId));
    check(o && o.orderNumber === f.orderNumber, at, `order ${f.orderId} missing or orderNumber differs`);
    if (f.returnId != null) {
      const r = returns.find((x) => String(x.id) === String(f.returnId));
      if (check(r, at, `return ${f.returnId} does not exist`)) check(near(f.amount, r.refundAmount - (r.deductionAmount || 0)), at, "amount ≠ return refund payable");
    }
    if (f.paymentId != null) {
      const p = payments.find((x) => String(x.id) === String(f.paymentId));
      if (check(p, at, `payment ${f.paymentId} does not exist`)) check((p.refunds || []).some((x) => near(x.amount, f.amount)), at, "no matching entry in the payment's refunds[]");
    } else if (f.method === "store_credit") {
      check(o && near(o.refundedAmount, f.amount), at, "store-credit refund ≠ order refundedAmount");
      check((db.walletTransactions || []).some((t) => t.type === "credit" && String(t.refundId) === String(f.id) && near(t.amount, f.amount)), at, "no matching wallet credit");
    }
  });
  (db.walletTransactions || []).filter((t) => t.type === "debit" && t.orderId != null).forEach((t) => {
    const o = orderById.get(String(t.orderId));
    check(o && near(o.storeCreditUsed, t.amount), `walletTransaction ${t.id}`, "debit ≠ order storeCreditUsed");
  });

  // reviews
  const ownsProduct = (uid, pid) => orders.filter((o) => String(o.userId) === String(uid) && o.items.some((i) => String(i.productId) === String(pid)));
  (db.reviews || []).forEach((r) => {
    const at = `review ${r.id}`;
    check(["approved", "pending", "rejected"].includes(r.status), at, `unknown status ${r.status}`);
    check(Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5, at, "rating must be an integer 1–5");
    check(typeof r.title === "string" && r.title.length > 0 && r.title.length <= 60, at, "title must be 1–60 characters");
    check(Number.isInteger(r.helpfulCount) && r.helpfulCount >= 0 && r.helpfulCount <= 12, at, "helpfulCount must be 0–12");
    check(r.userId === null || userIds.has(String(r.userId)), at, `user ${r.userId} does not exist`);
    const owned = r.userId === null ? [] : ownsProduct(r.userId, r.productId);
    check(r.isVerifiedPurchase === owned.length > 0, at, `isVerifiedPurchase must be ${owned.length > 0}`);
    if (owned.length) check(owned.some((o) => o.createdAt < r.createdAt), at, "review predates the order");
    check(ISO.test(r.createdAt) && ISO.test(r.updatedAt) && r.updatedAt >= r.createdAt && r.createdAt <= nowIso, at, "dates must be ISO, past, updatedAt ≥ createdAt");
  });
  check(products.some((p) => p.isActive && p.totalReviews === 0), "reviews", "keep some products without reviews (honest empty state)");

  // wishlist snapshots
  (db.wishlist || []).forEach((w) => {
    const at = `wishlist ${w.id}`;
    check(userIds.has(String(w.userId)), at, `user ${w.userId} does not exist`);
    const p = prodById.get(String(w.productId));
    if (!p) return;
    ["slug", "name", "brand", "price", "comparePrice", "rating", "totalReviews", "shortDescription", "stock", "trending", "hot"]
      .forEach((k) => check(JSON.stringify(w[k]) === JSON.stringify(p[k]), at, `${k} differs from product ${p.id}`));
    check(w.image === p.images[0], at, "image is not the product's first image");
    check(JSON.stringify(w.variants) === JSON.stringify(p.variants), at, "variants differ from the product");
  });

  // deals config
  (d.featuredCouponIds || []).forEach((id) => {
    const c = coupons.find((x) => String(x.id) === String(id));
    check(c && c.isActive && c.expiresAt > nowIso, "dealsConfig", `featured coupon ${id} is not active`);
  });
  (d.dealOfTheDayIds || []).forEach((id) => check(prodById.get(String(id))?.comparePrice > 0, "dealsConfig", `deal of the day ${id} has no comparePrice`));
  (d.featuredProductIds || []).forEach((id) => check(prodById.get(String(id))?.comparePrice > 0, "dealsConfig", `featured product ${id} is not discounted`));

  // banners and leads
  (db.banners || []).forEach((b) => {
    const slug = (String(b.link).match(/[?&]category=([^&]+)/) || [])[1];
    check(slug && categories.some((c) => c.slug === slug && c.isActive), `banner ${b.id}`, `link ${b.link} is not an active category`);
    check(typeof b.gradient === "string", `banner ${b.id}`, "gradient must be a string");
  });
  (db.leads || []).filter((l) => l.orderNumber).forEach((l) => {
    check(orders.some((o) => o.orderNumber === l.orderNumber), `lead ${l.id}`, `orderNumber ${l.orderNumber} matches no order`);
  });

}

// ---------------------------------------------------------------- summary
const row = (label, value) => summary.push([label, String(value)]);
row("Mode", CATALOGUE_ONLY ? "catalogue" : "full");
row("Categories", `${categories.length} (${categories.filter((c) => c.parentId === null).length} departments)`);
row("Products", `${products.length} (${products.filter((p) => p.isActive).length} active)`);
row("Variants", products.reduce((a, p) => a + (p.variants || []).length, 0));
row("Featured / trending / hot", ["featured", "trending", "hot"].map((k) => products.filter((p) => p[k]).length).join(" / "));
row("Brands", [...new Set(products.map((p) => p.brand).filter(Boolean))].join(", "));
row("Low-stock / out-of-stock variants", `${lowStockVariants} / ${outOfStockVariants}`);
DEPARTMENTS.forEach(([id, slug]) => row(`  dept ${id} ${slug}`, `${products.filter((p) => deptOf(p.categoryId) === id).length} products`));
COVERAGE.forEach(([slug, n]) => row(`  ${slug}`, `${slugCount[slug] || 0}/${n}`));
if (!CATALOGUE_ONLY) {
  row("Orders / payments / refunds / returns", ["orders", "payments", "refunds", "returns"].map((k) => (db[k] || []).length).join(" / "));
  row("Reviews (approved / pending / rejected)", ["approved", "pending", "rejected"].map((st) => (db.reviews || []).filter((r) => r.status === st).length).join(" / "));
  row("Products with reviews / without", `${products.filter((p) => p.totalReviews > 0).length} / ${products.filter((p) => p.totalReviews === 0).length}`);
  row("Store credit (users[].storeCredit)", (db.users || []).map((u) => `user ${u.id}: ${u.storeCredit || 0}`).join(", "));
}
const w = Math.max(...summary.map(([l]) => l.length));
console.log(`\nvalidate-db: ${path.relative(process.cwd(), file) || file}`);
console.log("-".repeat(w + 14));
summary.forEach(([l, v]) => console.log(`${l.padEnd(w)}  ${v}`));
console.log("-".repeat(w + 14));

if (failures.length) {
  console.log(`\n✗ ${failures.length} problem(s):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("\n✓ all checks passed");
