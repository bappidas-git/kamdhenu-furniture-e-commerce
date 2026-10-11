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
// extended the full-mode checks (nothing loosened): leads in the boilerplate
// scan, "Overall size"/"Height" specs against the dimension fields, a full
// return leaving its order "returned", no pending payment on a paid order, and
// coupon expiries at the end of an Indian day. V2-02 (the max-effort
// re-verification of Prompt 03) added the catalogue-mode checks marked
// "V2-02": every machine-checkable rule of Prompt 03 (department names, the
// Plastic and Office Chairs subtrees, category copy and images, price bands and
// formats, stock counts, flags, relations, tags, image texts, dates), the
// specifications read by the product page's own parser, and Prompt 34's size
// check moved unchanged into catalogue mode (it still runs in full mode) and
// extended to "Width × depth", bare "Width"/"Length"/"Depth", "Seat height"
// and "Weight". Nothing was removed or loosened.
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

// The six departments, fixed in id, slug and menu order (and, V2-02, name).
const DEPARTMENTS = [
  [1, "plastic-furniture", "Plastic Furniture"], [2, "office-chairs", "Office Chairs"],
  [3, "cafe-restaurant-chairs", "Café & Restaurant Chairs"], [4, "outdoor-furniture", "Outdoor Furniture"],
  [5, "home-furniture", "Home Furniture"], [6, "office-tables-desks", "Office Tables & Desks"],
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
// V2-02: Prompt 03's Plastic (10–19) and Office Chairs (20–29) subtrees, by the
// id plan: id -> [name, slug, parent id, sortOrder].
const TREE_03 = {
  10: ["Essentials", "plastic-essentials", 1, 1],
  11: ["Chairs with Arms", "plastic-essentials-armchairs", 10, 1],
  12: ["Chairs without Arms", "plastic-essentials-chairs", 10, 2],
  13: ["Centre Tables", "plastic-essentials-centre-tables", 10, 3],
  14: ["Shoe Racks", "plastic-shoe-racks", 10, 4],
  15: ["Premium", "plastic-premium", 1, 2],
  16: ["Chairs with Arms", "plastic-premium-armchairs", 15, 1],
  17: ["Chairs without Arms", "plastic-premium-chairs", 15, 2],
  18: ["Centre Tables", "plastic-premium-centre-tables", 15, 3],
  20: ["Essentials", "office-chairs-essentials", 2, 1],
  21: ["High-Back Chairs", "office-essentials-high-back", 20, 1],
  22: ["Low-Back Chairs", "office-essentials-low-back", 20, 2],
  23: ["Waiting Chairs", "office-essentials-waiting", 20, 3],
  24: ["Premium", "office-chairs-premium", 2, 2],
  25: ["High-Back Chairs", "office-premium-high-back", 24, 1],
  26: ["Low-Back Chairs", "office-premium-low-back", 24, 2],
  27: ["Waiting Chairs", "office-premium-waiting", 24, 3],
};
// V2-02: Prompt 03's checklist line by line: the type tag, the indicative price
// band (every variant price inside it) and the variants the line asks for
// (attribute, fewest and most options; [] allowed where the line says "none").
const PROMPT_03 = {
  "plastic-essentials-armchairs": { type: "armchair", band: [650, 1300], attr: ["Colour"], min: 3, max: 4 },
  "plastic-essentials-chairs": { type: "chair", band: [650, 1300], attr: ["Colour"], min: 2, max: 4 },
  "plastic-essentials-centre-tables": { type: "centre table", band: [900, 2600], attr: ["Colour"], min: 2, max: 2 },
  "plastic-shoe-racks": { type: "shoe rack", band: [1200, 3600], attr: ["Shelves"], min: 4, max: 4 },
  "plastic-premium-armchairs": { type: "armchair", band: [1400, 2900], attr: ["Colour"], min: 2, max: 4 },
  "plastic-premium-chairs": { type: "chair", band: [1400, 2900], attr: ["Colour"], min: 2, max: 4 },
  "plastic-premium-centre-tables": { type: "centre table", band: [900, 2600], attr: ["Colour"], min: 2, max: 2 },
  "outdoor-furniture": { attr: ["Size"], min: 2, max: 2 }, // type and band per product, below
  "office-essentials-high-back": { type: "office chair", band: [3500, 8500], attr: ["Colour"], min: 2, max: 3 },
  "office-essentials-low-back": { type: "office chair", band: [3500, 8500], attr: ["Colour"], min: 2, max: 3 },
  "office-essentials-waiting": { type: "waiting chair", band: [4500, 16000], attr: ["Colour"], min: 0, max: 3 },
  "office-premium-high-back": { type: "office chair", band: [9000, 22000], attr: ["Colour"], min: 2, max: 3 },
  "office-premium-low-back": { type: "office chair", band: [9000, 22000], attr: ["Colour"], min: 2, max: 3 },
  "office-premium-waiting": { type: "waiting chair", band: [4500, 16000], attr: ["Colour"], min: 0, max: 3 },
  "cafe-restaurant-chairs": { type: "cafe chair", band: [1800, 6500], attr: ["Colour", "Finish"], min: 2, max: 3 },
};
const OUTDOOR_03 = { "lobby-set": { type: "lobby set", band: [18000, 45000] }, "jhula-garden-swing": { type: "jhula", band: [9000, 26000] } };
// Premium above Essentials within the same type: [Essentials slug, Premium slug].
const TIER_PAIRS = [
  ["plastic-essentials-armchairs", "plastic-premium-armchairs"], ["plastic-essentials-chairs", "plastic-premium-chairs"],
  ["plastic-essentials-centre-tables", "plastic-premium-centre-tables"], ["office-essentials-high-back", "office-premium-high-back"],
  ["office-essentials-low-back", "office-premium-low-back"], ["office-essentials-waiting", "office-premium-waiting"],
];
// Material tags a Prompt 03 product may carry, each with the words its own
// specifications must use for it.
const MATERIAL_TAGS = {
  plastic: /plastic|polypropylene/, polypropylene: /polypropylene/, mesh: /mesh/, fabric: /fabric/,
  leatherette: /leatherette/, steel: /steel/, metal: /metal|steel|wire|iron|aluminium/, wood: /wood|timber/, cane: /cane/,
};
// "Within the last six months" of the build: Prompt 03 ran on 2026-10-07.
const BUILD_DATE = "2026-10-07T23:59:59.999Z";
const WINDOW_START = "2026-04-07T00:00:00.000Z";

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
// V2-02: the product page's own functions, read from src/utils/helpers.js (an
// ES module the app imports), so these checks parse a description and build a
// slug exactly as the storefront does and cannot drift from it.
const helpersSource = fs.readFileSync(path.join(__dirname, "..", "src", "utils", "helpers.js"), "utf8");
const appFunction = (name) => {
  const m = helpersSource.match(new RegExp(`\\nexport const ${name} = (\\([^)]*\\) => \\{[\\s\\S]*?\\n\\});`));
  try { return m ? new Function(`return (${m[1]});`)() : null; } catch (e) { return null; }
};
const parseSpecifications = appFunction("parseSpecifications");
const appSlugify = appFunction("slugify");
check(typeof parseSpecifications === "function" && typeof appSlugify === "function",
  "src/utils/helpers.js", "parseSpecifications or slugify could not be read; update appFunction() in this script");
const parsedSpecs = (description) => (parseSpecifications ? parseSpecifications(description) : { body: String(description), specs: [] });
const NOW = new Date().toISOString();

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

// ---- V2-02: Prompt 03's tree and category copy ------------------------------
DEPARTMENTS.forEach(([id, , name]) => {
  const c = catById.get(String(id));
  if (c) check(c.name === name, `department ${id}`, `name "${c.name}" ≠ "${name}"`);
});
Object.entries(TREE_03).forEach(([id, [name, slug, parentId, sortOrder]]) => {
  const c = catById.get(id);
  if (check(c, "tree", `Prompt 03 category ${id} (${slug}) missing`)) {
    check(c.name === name && c.slug === slug && c.parentId === parentId && c.sortOrder === sortOrder && c.isActive,
      `category ${id} (${c.slug})`, `must be "${name}" (${slug}), active, under ${parentId} at sortOrder ${sortOrder}`);
  }
});
// The id plan: 10–19 belong to Plastic Furniture, 20–29 to Office Chairs.
// (A bounded walk: a parent cycle is reported above and must not hang this.)
const rootOf = (c) => {
  let x = c;
  for (let i = 0; x && x.parentId !== null && i < 20; i += 1) x = catById.get(String(x.parentId));
  return x ? x.id : null;
};
categories.forEach((c) => {
  const at = `category ${c.id} (${c.slug})`;
  if (c.id >= 10 && c.id <= 19) check(rootOf(c) === 1, at, "ids 10–19 belong to the Plastic Furniture subtree");
  if (c.id >= 20 && c.id <= 29) check(rootOf(c) === 2, at, "ids 20–29 belong to the Office Chairs subtree");
  // One refined sentence (the listing's introduction and the mega-menu), and
  // the tiers in honest words.
  check((String(c.description).match(/[.!?](\s|$)/g) || []).length === 1 && /\.$/.test(c.description),
    at, "description must be one sentence ending in a full stop");
  check(!/\bcheap|\bbasic\b/i.test(`${c.name} ${c.description}`), at, 'says "cheap" or "basic"');
  check(/^https:\/\/placehold\.co\/1600x1000\/f1ebe1\/686158\?text=.+/.test(c.image) || /^https:\/\/res\.cloudinary\.com\//.test(c.image),
    at, `image is not a 1600x1000 placeholder in the design-system tones: ${c.image}`);
  check(c.createdAt <= c.updatedAt && c.updatedAt <= NOW, at, "createdAt must not follow updatedAt, and updatedAt must not lie in the future");
});
[10, 20].forEach((id) => {
  const c = catById.get(String(id));
  if (c) check(/dependable everyday value/i.test(c.description), `category ${id} (${c.slug})`, 'an Essentials group must say "dependable everyday value"');
});
[15, 24].forEach((id) => {
  const c = catById.get(String(id));
  if (c) check(/heavier build/i.test(c.description) && /finer finish/i.test(c.description), `category ${id} (${c.slug})`, 'a Premium group must say "heavier build" and "finer finish"');
});
[...DEPARTMENTS.map(([id]) => id), ...Object.keys(TREE_03).map(Number)].forEach((id) => {
  const c = catById.get(String(id));
  if (c) check(c.createdAt >= WINDOW_START && c.createdAt <= BUILD_DATE, `category ${id} (${c.slug})`, `createdAt ${c.createdAt} is not within the six months before the build`);
});

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

// ---- V2-02: the catalogue rules of Prompt 03, for every product --------------
const catSlugOf = (p) => catById.get(String(p.categoryId))?.slug;
const roundPrice = (n) => /(49|99|00)$/.test(String(n));
// The tier a product sits under: the Essentials (10, 20) or Premium (15, 24) group.
const tierOf = (catId) => {
  let c = catById.get(String(catId));
  for (let i = 0; c && i < 20; i += 1) {
    if ([10, 20].includes(c.id)) return "essentials";
    if ([15, 24].includes(c.id)) return "premium";
    c = c.parentId === null ? null : catById.get(String(c.parentId));
  }
  return null;
};
check(!/electronic|smartwatch|earbud|headphone|t-shirt|sneaker|smartphone|fashion/i.test(JSON.stringify({ categories, products })),
  "catalogue", "categories or products still mention the boilerplate's electronics/fashion catalogue");
products.forEach((p) => {
  const at = `product ${p.id} (${p.slug})`;
  const vs = Array.isArray(p.variants) ? p.variants : [];
  vs.forEach((v) => {
    const vat = `${at} variant ${v.id}`;
    const order = VARIANT_KEYS.filter((k) => k in v);
    check(JSON.stringify(Object.keys(v)) === JSON.stringify(order), vat, `keys out of order: ${Object.keys(v).join(",")} (expected ${order.join(",")})`);
    // The selector prints the attribute value, the cart and orders the name.
    if (v.attributes && Object.keys(v.attributes).length) {
      check(Object.values(v.attributes).join(" / ") === v.name, vat, `name "${v.name}" ≠ its attribute value "${Object.values(v.attributes).join(" / ")}"`);
    }
    check(typeof v.sku === "string" && v.sku.startsWith(`${p.sku}-`), vat, `SKU ${v.sku} must be the product's SKU plus a code`);
  });
  if (vs.length && vs.every((v) => v.attributes && Object.keys(v.attributes).length === 1 && /colou?r|shade|finish/i.test(Object.keys(v.attributes)[0]))) {
    check(new Set(vs.map((v) => v.price)).size === 1, at, "colour or finish options must share one price");
  }
  if (appSlugify) check(p.slug === appSlugify(fold(p.name)), at, `slug must be helpers.js slugify() of the name with accents folded ("${appSlugify(fold(p.name))}")`);
  // The description as the product page reads it: 2–3 paragraphs of prose and
  // 5–7 specification rows, measurements hedged, no certification or warranty.
  const { body, specs } = parsedSpecs(p.description);
  const prose = String(body).split(/\n[^\S\n]*\n\s*/).filter((x) => x.trim());
  check(prose.length >= 2 && prose.length <= 3 && specs.length >= 5 && specs.length <= 7, at,
    `the product page reads ${prose.length} paragraph(s) and ${specs.length} specification row(s); needs 2–3 and 5–7`);
  specs.filter((s) => /\d\s*(cm|kg)\b/.test(s.value) && !/approx\./.test(s.value))
    .forEach((s) => fail(at, `"${s.key}: ${s.value}" gives a measurement without "approx."`));
  const copy = `${p.name} ${p.shortDescription} ${p.description}`;
  check(!/warrant|guarantee|certif|\bISI\b|\bBIS\b|\bISO\s?\d|BIFMA|lifetime|tested to|approved by/i.test(copy), at, "claims a certification or warranty");
  check(!copy.includes("!"), at, "copy uses an exclamation mark");
  check(!/^(essentials|non[- ]?premium)\b/i.test(p.name) && !p.name.split(/\s+/).some((t) => /[A-Za-z]/.test(t) && /\d/.test(t) && !/^\d+-Seater$/.test(t)),
    at, "name must stand alone: no tier prefix, no model number");
  // Money: round figures, compare-at 10–20% above, cost 60–70% of the price.
  [p.price, ...(p.comparePrice ? [p.comparePrice] : []), ...vs.map((v) => v.price)]
    .forEach((n) => check(roundPrice(n), at, `price ${n} must end in 49, 99 or 00`));
  // (Whole-number arithmetic: 1000 * 1.1 is 1100.0000000000002.)
  if (p.comparePrice) check(p.comparePrice * 10 >= p.price * 11 && p.comparePrice * 10 <= p.price * 12, at, `comparePrice ${p.comparePrice} must be 10–20% above price ${p.price}`);
  check(p.costPrice * 10 >= p.price * 6 && p.costPrice * 10 <= p.price * 7, at, `costPrice ${p.costPrice} must be 60–70% of price ${p.price}`);
  if (!vs.length) check(Number.isInteger(p.stock) && p.stock <= 60, at, "stock must be an integer 0–60");
  // A placeholder image is labelled with the name, the storefront's alt text.
  (p.images || []).forEach((u, i) => {
    const m = /^https:\/\/placehold\.co\/1200x1500\/f1ebe1\/686158\?text=(.+)$/.exec(u);
    const label = [p.name, `${p.name} Detail`, `${p.name} In situ`][i];
    let text = null;
    try { text = m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null; } catch (e) { text = undefined; }
    if (m) check(text === label, at, text === undefined ? `image ${i + 1}'s label is not URL-encoded` : `image ${i + 1} must be labelled "${label}"`);
  });
  // Prompt 32 makes these the product page's title and description.
  check(typeof p.metaTitle === "string" && p.metaTitle.trim() && typeof p.metaDescription === "string" && p.metaDescription.trim()
    && p.metaDescription.length <= 160, at, "metaTitle and metaDescription must be set, the description at most 160 characters");
  // Related: 3–5 within the department. A department with fewer than four
  // products (Prompt 03's Outdoor: two) lists all its own first, then others.
  const rel = p.relatedProductIds || [];
  const dep = deptOf(p.categoryId);
  const own = products.filter((q) => q.isActive && q.id !== p.id && deptOf(q.categoryId) === dep).map((q) => q.id);
  check(rel.length >= 3, at, `relatedProductIds has ${rel.length} ids (3–5)`);
  if (own.length >= 3) rel.forEach((id) => check(own.includes(id), at, `related product ${id} is not in the same department`));
  else check(JSON.stringify(rel.slice(0, own.length).sort()) === JSON.stringify([...own].sort()), at, `related ids must start with the department's own products (${own.join(",")})`);
  const tier = tierOf(p.categoryId);
  if (tier) check((p.tags || []).includes(tier), at, `tags must include the tier "${tier}"`);
  check(p.createdAt <= NOW && p.updatedAt <= NOW, at, "dates must not lie in the future");
});

// ---- V2-02: the 46 products of Prompt 03's checklist -------------------------
const P03 = products.filter((p) => Object.prototype.hasOwnProperty.call(PROMPT_03, catSlugOf(p)));
P03.forEach((p) => {
  const at = `product ${p.id} (${p.slug})`;
  const rule = PROMPT_03[catSlugOf(p)];
  const type = rule.type || OUTDOOR_03[p.slug]?.type;
  const band = rule.band || OUTDOOR_03[p.slug]?.band;
  const vs = p.variants || [];
  const prices = vs.length ? vs.map((v) => v.price) : [p.price];
  check(band && prices.every((x) => x >= band[0] && x <= band[1]), at, `prices ${prices.join(" / ")} outside the band ${band ? band.join("–") : "(none for this piece)"}`);
  const attr = vs.length ? Object.keys(vs[0].attributes || {})[0] : null;
  check(vs.length === 0 ? rule.min === 0 : rule.attr.includes(attr) && vs.length >= Math.max(2, rule.min) && vs.length <= rule.max,
    at, `variants must be ${rule.attr.join(" or ")}, ${Math.max(2, rule.min)}–${rule.max} options${rule.min === 0 ? ", or none" : ""}`);
  check(type && (p.tags || []).includes(type), at, `tags must include the type "${type}"`);
  const specText = `${p.name} ${parsedSpecs(p.description).specs.map((s) => s.value).join(" ")}`.toLowerCase();
  const materials = (p.tags || []).filter((t) => MATERIAL_TAGS[t]);
  check(materials.length > 0 && materials.every((t) => MATERIAL_TAGS[t].test(specText)), at,
    `tags must name a material its specifications use (${materials.join(", ") || "none"})`);
  const dep = deptOf(p.categoryId);
  check(dep === 1 ? p.brand === "Nilkamal" : p.brand === "", at, `brand must be ${dep === 1 ? '"Nilkamal" (plastic)' : '"" (office, café, outdoor)'}`);
  check(p.isActive, at, "Prompt 03's products are all active");
  check(p.createdAt >= WINDOW_START && p.createdAt <= BUILD_DATE, at, `createdAt ${p.createdAt} is not within the six months before the build`);
});
check(P03.length === 46, "coverage", `Prompt 03's checklist has 46 products, found ${P03.length}`);
TIER_PAIRS.forEach(([essentials, premium]) => {
  const e = P03.filter((p) => catSlugOf(p) === essentials).map((p) => p.price);
  const pr = P03.filter((p) => catSlugOf(p) === premium).map((p) => p.price);
  if (e.length && pr.length) check(Math.max(...e) < Math.min(...pr), "prices", `${premium} (from ${Math.min(...pr)}) must sit above ${essentials} (to ${Math.max(...e)})`);
});
const compared03 = P03.filter((p) => p.comparePrice > 0).length;
check(P03.length && compared03 / P03.length >= 0.25 && compared03 / P03.length <= 0.4, "prices", `${compared03} of ${P03.length} Prompt 03 products have a comparePrice; give roughly a third one`);
let low03 = 0;
let soldOut03 = 0;
P03.forEach((p) => (p.variants.length ? p.variants : [{ stock: p.stock }]).forEach((v) => {
  if (v.stock === 0) soldOut03 += 1;
  else if (v.stock <= p.lowStockThreshold) low03 += 1;
}));
check(low03 >= 2 && low03 <= 3, "stock", `Prompt 03's products need 2–3 deliberately low-stock variants (found ${low03})`);
check(soldOut03 >= 1 && soldOut03 <= 2, "stock", `Prompt 03's products need 1–2 sold-out variants (found ${soldOut03})`);
const flagged03 = (k) => P03.filter((p) => p[k]);
const featuredDepts = new Set(flagged03("featured").map((p) => deptOf(p.categoryId))).size;
check(flagged03("featured").length >= 8 && flagged03("featured").length <= 10 && featuredDepts === 4,
  "flags", `featured: ${flagged03("featured").length} of Prompt 03's products in ${featuredDepts} departments (8–10, all four)`);
check(flagged03("trending").length >= 6 && flagged03("trending").length <= 8, "flags", `trending: ${flagged03("trending").length} of Prompt 03's products (6–8)`);
check(flagged03("hot").length >= 3 && flagged03("hot").length <= 4, "flags", `hot: ${flagged03("hot").length} of Prompt 03's products (3–4)`);

// ---- Prompt 34: what a shopper or the admin would see disagree ------------
// (Moved here unchanged from the full-mode block by V2-02, so that
// --catalogue runs it too; full mode still does.)
// The product page prints the description's "Specifications:" pairs and,
// beside them, the dimension fields as "Dimensions (L × W × H)". An "Overall
// size" must give the fields' three figures in that order (a height range
// ends at the field's height), and a "Height" listing several options must
// top out at it.
const specPairs = (description) => {
  const paras = String(description || "").replace(/\r\n?/g, "\n").trim().split(/\n[^\S\n]*\n\s*/);
  const m = /^specifications\s*:\s*([\s\S]*)$/i.exec(paras[paras.length - 1] || "");
  if (!m) return [];
  return m[1].split(/\s*;\s*/).map((part) => {
    const at = part.indexOf(": ");
    return at > 0 ? [part.slice(0, at).trim().toLowerCase(), part.slice(at + 2).trim()] : null;
  }).filter(Boolean);
};
const N = "(\\d+(?:\\.\\d+)?)"; // a figure, as a capture group
products.forEach((p) => {
  const at = `product ${p.id} (${p.slug})`;
  const d = p.dimensions || {};
  specPairs(p.description).forEach(([key, value]) => {
    if (key === "overall size") {
      const box = value.match(new RegExp(`${N}\\s*×\\s*${N}\\s*×\\s*${N}(?:\\s*[–-]\\s*${N})?\\s*cm`));
      const round = value.match(new RegExp(`${N}\\s*cm diameter\\s*×\\s*${N}\\s*cm high`));
      const [l, w, h] = box ? [box[1], box[2], box[4] || box[3]].map(Number) : round ? [round[1], round[1], round[2]].map(Number) : [];
      if (box || round) {
        check(l === d.length && w === d.width && h === d.height, at,
          `"Overall size: ${value}" ≠ dimensions ${d.length} × ${d.width} × ${d.height} (L × W × H)`);
      }
    }
    if (key === "height") {
      const heights = (value.split("(")[0].match(/\d+(?:\.\d+)?/g) || []).map(Number);
      if (heights.length) check(Math.max(...heights) === d.height, at, `"Height: ${value}" tops out at ${Math.max(...heights)}, dimensions say ${d.height}`);
    }
  });
});
// V2-02: the table's other size rows. "Width × depth" gives the fields' first
// two figures; a bare "Width", "Length" or "Depth" reads against the row's own
// W (the shoe racks printed "Width: approx. 62 cm" above "62 × 33 × 96 cm");
// a seat sits below the overall height; a "Weight" pair (it replaces the
// field's row) must equal the field. And this script's reading of the pairs
// must equal the product page's.
products.forEach((p) => {
  const at = `product ${p.id} (${p.slug})`;
  const d = p.dimensions || {};
  const pagePairs = parsedSpecs(p.description).specs.map((s) => [s.key.toLowerCase(), s.value]);
  check(JSON.stringify(specPairs(p.description)) === JSON.stringify(pagePairs), at, "this script and the product page's parseSpecifications() read the specifications differently");
  specPairs(p.description).forEach(([key, value]) => {
    if (key === "width × depth") {
      const m = value.match(new RegExp(`${N}\\s*×\\s*${N}\\s*cm`));
      check(m && Number(m[1]) === d.length && Number(m[2]) === d.width, at, `"Width × depth: ${value}" ≠ dimensions ${d.length} × ${d.width} (L × W)`);
    }
    if (["width", "length", "depth"].includes(key)) {
      fail(at, `"${key}: ${value}" reads against the table's "Dimensions (L × W × H)" row; give "Width × depth" or "Overall size"`);
    }
    if (key === "seat height") {
      const heights = (value.match(/\d+(?:\.\d+)?/g) || []).map(Number);
      check(heights.length && Math.max(...heights) < d.height, at, `"Seat height: ${value}" must sit below the overall height ${d.height}`);
    }
    if (key === "weight") {
      const kg = Number((value.match(/\d+(?:\.\d+)?/) || [])[0]);
      check(kg === p.weight, at, `"Weight: ${value}" ≠ weight ${p.weight} kg`);
    }
  });
});

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
    l: db.leads, // Prompt 34: leads 3 and 4 still asked about a smartwatch and running shoes
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

  // Prompt 34's "Overall size"/"Height" check runs above, in both modes
  // (moved there unchanged by V2-02).

  // A processed full return leaves its order "returned" (api.js's return
  // cascade writes fulfillmentStatus "returned"); My orders and the
  // confirmation page read that state.
  returns.filter((r) => r.refundStatus === "processed").forEach((r) => {
    const o = orderById.get(String(r.orderId));
    if (!o) return;
    const ordered = (o.items || []).reduce((a, it) => a + (Number(it.quantity) || 0), 0);
    const returned = (r.items || []).reduce((a, it) => a + (Number(it.quantity) || 0), 0);
    if (returned >= ordered) check(o.fulfillmentStatus === "returned", `order ${o.id} (${o.orderNumber})`, `returned in full by ${r.returnNumber}, but fulfillmentStatus is ${o.fulfillmentStatus}`);
  });

  // An order marked paid has no payment still waiting (Admin → Payments would
  // say pending while Admin → Orders says paid).
  orders.filter((o) => o.paymentStatus === "paid").forEach((o) => {
    const p = payments.find((x) => String(x.orderId) === String(o.id));
    if (p) check(p.status !== "pending", `payment ${p.id}`, `pending, but order ${o.orderNumber} is paid`);
  });

  // Coupons end at 23:59:59 in the store's time zone (Asia/Kolkata, UTC+5:30):
  // 18:29:59Z. A 23:59:59Z expiry is 05:29 the next morning in India, so the
  // offers page and the admin (both local dates) would show the next day.
  coupons.filter((c) => c.expiresAt).forEach((c) => {
    check(!/T23:59:59(\.\d{3})?Z$/.test(c.expiresAt), `coupon ${c.id} (${c.code})`,
      `expiresAt ${c.expiresAt} is the end of a UTC day; use 18:29:59Z (23:59:59 in India)`);
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
row("Prompt 03 set (V2-02)", `${P03.length} products: compare-at ${compared03}, low ${low03} / sold out ${soldOut03}, `
  + `featured ${flagged03("featured").length} / trending ${flagged03("trending").length} / hot ${flagged03("hot").length}`);
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
