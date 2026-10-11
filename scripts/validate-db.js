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
// and "Weight". Nothing was removed or loosened. V2-03 (the max-effort
// re-verification of Prompt 04) added the checks marked "V2-03": Prompt 04's
// tree and its checklist product by product (name, leaf, brand, variants, price
// band, type tag, SKU prefix), a material tag, the specification topics,
// Winsome above the workshop pieces and the marble set the dearest, the flag,
// compare-at and stock counts of the 38; and catalogue-wide: local terms keep
// their gloss, "our own workshop" only on 47, 77, 79 and 81, the site's
// labels nowhere, inches hedged, no medical claim, finish pairs true to the
// options, weight capacity where the leaf gives one, Prompt 04's size pairs
// against the fields, related pieces within their room, cross-department
// bundles returned, and every office chair and desk bundled with each other.
// V2-04 (the max-effort re-verification of Prompt 05) added the full-mode
// checks marked "V2-04": frozen record counts; the settings' 42 key paths and
// Prompt 05's values (contact facts from constants.js, the SEO title and
// description from public/index.html); the four shipping methods; the five
// coupons' values, 2027 expiries, modest use and honest descriptions (no
// "first order" a seeded order contradicts); each order's delivery charged by
// an active method, the coupon's minimum, validity and per-customer limit,
// item prices, timeline order (createdAt ≤ events ≤ updatedAt), the states its
// events leave (a cancelled order's uncollected payment voided), payment
// status, every ₹ amount quoted, and order numbers that encode createdAt;
// payment, return and refund states and timestamps; wallet rows linked to what
// moved the money; review counts, 3–5 ratings, 1–3 plain sentences, no health
// or unconfirmed-service claim, products and departments covered, dates after
// the product existed; user 3's wishlist on active products saved after they
// existed; the deals config's shape and selection rules; banner links to
// departments and DESIGN_SYSTEM.md §12's literal navy. Nothing was loosened.
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
// V2-03: Prompt 04's tree, by the ids its build log recorded:
// id -> [name, slug, parent id, sortOrder].
const TREE_04 = {
  30: ["Living Room", "living-room", 5, 1], 31: ["Sofas", "sofas", 30, 1], 32: ["Sofa-cum-Beds", "sofa-cum-beds", 30, 2],
  33: ["Centre Tables & Showcases", "centre-tables-showcases", 30, 3], 34: ["Bedroom", "bedroom", 5, 2],
  35: ["Beds", "beds", 34, 1], 36: ["Mattresses", "mattresses", 34, 2], 37: ["Dressing Tables & Mirrors", "dressing-tables-mirrors", 34, 3],
  38: ["Bedside & Bed Tables", "bedside-bed-tables", 34, 4], 39: ["Almirahs", "almirahs", 34, 5],
  40: ["Alna Clothes Stands", "alna-clothes-stands", 34, 6], 41: ["Dining Room", "dining-room", 5, 3],
  42: ["Dining Sets", "dining-sets", 41, 1], 43: ["Storage", "storage", 5, 4], 44: ["Racks", "racks", 43, 1],
  45: ["Office Tables", "office-tables", 6, 1], 46: ["Computer Tables", "computer-tables", 6, 2],
  47: ["Reading Tables", "reading-tables", 6, 3], 48: ["Dining Sets", "plastic-dining-sets", 1, 3], 49: ["Sofas", "plastic-sofas", 1, 4],
};
// V2-03: Prompt 04's proof-of-coverage checklist, product by product:
// id -> [name, leaf slug, brand, variants, price band, type tag, SKU prefix].
// Variants: [attribute, fewest, most], [attribute, [the exact values]] or null (`[]`).
const SIZES_4 = ["Single", "Double", "Queen", "King"];
const SHELVES_3 = ["3 shelves", "4 shelves", "5 shelves"];
const PROMPT_04 = {
  47: ["Wooden Sofa Set", "sofas", "A & S Urbanseat", ["Colour", 2, 3], [18000, 65000], "sofa", "LIV"],
  48: ["L-Shaped Sofa", "sofas", "A & S Urbanseat", ["Colour", 2, 3], [18000, 65000], "sofa", "LIV"],
  49: ["5-Seater Sofa Set", "sofas", "A & S Urbanseat", ["Colour", 2, 3], [18000, 65000], "sofa", "LIV"],
  50: ["7-Seater Sofa Set", "sofas", "A & S Urbanseat", ["Colour", 2, 3], [18000, 65000], "sofa", "LIV"],
  51: ["Steel Sofa-cum-Bed", "sofa-cum-beds", "", ["Colour", 2, 3], [14000, 35000], "sofa cum bed", "LIV"],
  52: ["Wooden Sofa-cum-Bed", "sofa-cum-beds", "A & S Urbanseat", ["Colour", 2, 3], [14000, 35000], "sofa cum bed", "LIV"],
  53: ["Wooden Centre Table", "centre-tables-showcases", "A & S Urbanseat", ["Finish", 2, 2], [6000, 22000], "centre table", "LIV"],
  54: ["Wooden Showcase", "centre-tables-showcases", "A & S Urbanseat", ["Finish", 2, 2], [6000, 22000], "showcase", "LIV"],
  55: ["King Size Bed", "beds", "A & S Urbanseat", ["Finish", 2, 2], [12000, 45000], "bed", "BED"],
  56: ["Queen Size Bed", "beds", "A & S Urbanseat", ["Finish", 2, 2], [12000, 45000], "bed", "BED"],
  57: ["Single Bed", "beds", "A & S Urbanseat", ["Finish", 2, 2], [12000, 45000], "bed", "BED"],
  58: ["Carlton Mattress", "mattresses", "Carlton", ["Size", SIZES_4], [5500, 25000], "mattress", "BED"],
  59: ["Nilkamal Mattress", "mattresses", "Nilkamal", ["Size", SIZES_4], [5500, 25000], "mattress", "BED"],
  60: ["Plain Dressing Table", "dressing-tables-mirrors", "A & S Urbanseat", ["Finish", 2, 2], [6000, 18000], "dressing table", "BED"],
  61: ["Large Dressing Table", "dressing-tables-mirrors", "A & S Urbanseat", ["Finish", 2, 2], [6000, 18000], "dressing table", "BED"],
  62: ["Standing Mirror", "dressing-tables-mirrors", "A & S Urbanseat", ["Finish", 2, 2], [2500, 7000], "mirror", "BED"],
  63: ["Wall Mirror", "dressing-tables-mirrors", "A & S Urbanseat", ["Finish", 2, 2], [2500, 7000], "mirror", "BED"],
  64: ["Wooden Bedside Table", "bedside-bed-tables", "A & S Urbanseat", ["Finish", 2, 2], [1800, 6000], "bedside table", "BED"],
  65: ["Particle-Board Bedside Table", "bedside-bed-tables", "", ["Finish", 2, 2], [1800, 6000], "bedside table", "BED"],
  66: ["Folding Bed Table", "bedside-bed-tables", "", ["Colour", 2, 3], [1800, 6000], "bed table", "BED"],
  67: ["Two-Door Almirah", "almirahs", "A & S Urbanseat", ["Finish", 2, 2], [9000, 25000], "almirah", "BED"],
  68: ["Three-Door Almirah", "almirahs", "A & S Urbanseat", ["Finish", 2, 2], [9000, 25000], "almirah", "BED"],
  69: ["Iron Alna (Clothes Stand)", "alna-clothes-stands", "", null, [1500, 5000], "alna", "BED"],
  70: ["Wooden Alna (Clothes Stand)", "alna-clothes-stands", "A & S Urbanseat", null, [1500, 5000], "alna", "BED"],
  71: ["Steel Storage Rack", "racks", "", ["Shelves", SHELVES_3], [3000, 9000], "rack", "STO"],
  72: ["Wooden Storage Rack", "racks", "A & S Urbanseat", ["Shelves", SHELVES_3], [3000, 9000], "rack", "STO"],
  73: ["4-Seater Dining Set", "dining-sets", "A & S Urbanseat", ["Finish", 2, 2], [15000, 60000], "dining set", "DIN"],
  74: ["6-Seater Dining Set", "dining-sets", "A & S Urbanseat", ["Finish", 2, 2], [15000, 60000], "dining set", "DIN"],
  75: ["Marble-Top Dining Set", "dining-sets", "A & S Urbanseat", ["Finish", 2, 2], [15000, 60000], "dining set", "DIN"],
  76: ["Winsome Office Table", "office-tables", "Winsome", ["Size", 2, 2], [4000, 18000], "office table", "OFT"],
  77: ["Workshop Office Table", "office-tables", "A & S Urbanseat", ["Size", 2, 2], [4000, 18000], "office table", "OFT"],
  78: ["Winsome Computer Table", "computer-tables", "Winsome", ["Size", 2, 2], [4000, 18000], "computer table", "OFT"],
  79: ["Workshop Computer Table", "computer-tables", "A & S Urbanseat", ["Size", 2, 2], [4000, 18000], "computer table", "OFT"],
  80: ["Winsome Reading Table", "reading-tables", "Winsome", ["Size", 2, 2], [4000, 18000], "reading table", "OFT"],
  81: ["Workshop Reading Table", "reading-tables", "A & S Urbanseat", ["Size", 2, 2], [4000, 18000], "reading table", "OFT"],
  82: ["4-Seater Plastic Dining Set", "plastic-dining-sets", "Nilkamal", ["Colour", 2, 3], [5000, 11000], "dining set", "PLD"],
  83: ["6-Seater Plastic Dining Set", "plastic-dining-sets", "Nilkamal", ["Colour", 2, 3], [5000, 11000], "dining set", "PLD"],
  84: ["Nilkamal Plastic Sofa Set", "plastic-sofas", "Nilkamal", ["Colour", 2, 3], [9000, 16000], "sofa", "PLS"],
};
// The pieces the reference site marks own manufacturing or "Local Made": the
// only ones whose copy, tags or name may say they come from our own workshop.
const WORKSHOP_IDS = [47, 77, 79, 81];
// Winsome above the workshop piece of the same type, size for size.
const WINSOME_PAIRS = [[76, 77], [78, 79], [80, 81]];
// The bundles Prompt 04 calls natural, by type tag ("dining set" + "centre
// table" is not one); every other Prompt 04 piece bundles nothing.
const BUNDLES_04 = {
  sofa: ["centre table"], "centre table": ["sofa"], bed: ["mattress", "bedside table"], mattress: ["bed"],
  "bedside table": ["bed"], "office table": ["office chair"], "computer table": ["office chair"], "reading table": ["office chair"],
};
const DESK_TYPES = ["office table", "computer table", "reading table"];
// Leaves whose pieces seat or sleep people: their specifications give the capacity.
const CAPACITY_LEAVES = ["sofas", "sofa-cum-beds", "beds", "mattresses", "dining-sets", "plastic-dining-sets", "plastic-sofas"];
// Local terms the client's customers use, each with the plain-English gloss
// the record that uses it must also carry (Prompt 04, guardrail 4).
const LOCAL_TERMS = [[/\balmirahs?\b/i, /wardrobe/i, "almirah", "wardrobe"], [/\balnas?\b/i, /clothes stand/i, "alna", "clothes stand"], [/\bjhula\b/i, /swing/i, "jhula", "swing"]];
// Material words a Prompt 04 tag may name, alone or in a compound such as "steel rack".
const MATERIAL_WORDS_04 = ["solid wood", "engineered wood", "particle board", "wooden", "wood", "steel", "iron", "metal", "marble", "plastic", "polypropylene", "fabric", "foam", "glass", "laminate", "mesh", "leatherette", "cane"];

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

// ---- V2-03: the catalogue rules of Prompt 04 ---------------------------------
// Its tree, its checklist product by product, and the Prompt 03 content rules
// those 38 products inherit. Catalogue-wide where every product already
// passes (copy, sizes, relations); the checklist's own rules for the 38.
const specsOf = (p) => parsedSpecs(p.description).specs;
const copyText = (p) => `${p.name}\n${p.shortDescription}\n${p.description}\n${p.metaTitle}\n${p.metaDescription}`;
// The room a Home Furniture piece belongs to: the ancestor directly under department 5.
const roomOf = (catId) => {
  let c = catById.get(String(catId));
  for (let i = 0; c && c.parentId !== null && i < 20; i += 1) {
    if (String(c.parentId) === "5") return c.id;
    c = catById.get(String(c.parentId));
  }
  return null;
};
// A product's type for bundles: its Prompt 04 type tag, or an office chair or
// centre table of Prompt 03 by its tags.
const typeOf = (p) => PROMPT_04[p.id]?.[5] || ["office chair", "centre table"].find((t) => (p.tags || []).includes(t)) || null;
Object.entries(TREE_04).forEach(([id, [name, slug, parentId, sortOrder]]) => {
  const c = catById.get(id);
  if (check(c, "tree", `Prompt 04 category ${id} (${slug}) missing`)) {
    check(c.name === name && c.slug === slug && c.parentId === parentId && c.sortOrder === sortOrder && c.isActive,
      `category ${id} (${c.slug})`, `must be "${name}" (${slug}), active, under ${parentId} at sortOrder ${sortOrder}`);
  }
});
categories.filter((c) => c.id >= 30 && c.id <= 49).forEach((c) => {
  check([1, 5, 6].includes(rootOf(c)), `category ${c.id} (${c.slug})`, "ids 30–49 belong to Plastic Furniture, Home Furniture or Office Tables & Desks");
});
// Local terms keep their gloss wherever a record uses them.
const glossed = (where, text) => LOCAL_TERMS.forEach(([term, gloss, t, g]) => {
  if (term.test(text)) check(gloss.test(text), where, `uses "${t}" without the gloss "${g}" in its own name or description`);
});
categories.forEach((c) => glossed(`category ${c.id} (${c.slug})`, `${c.name}\n${c.description}`));
check(!/company made|local made/i.test(JSON.stringify({ categories, products })), "catalogue", "the reference site's labels \"Company Made\"/\"Local Made\" must not appear");
const lowerRun = (s) => String(s).toLowerCase().replace(/-/g, " ");
products.forEach((p) => {
  const at = `product ${p.id} (${p.slug})`;
  const d = p.dimensions || {};
  const specs = specsOf(p);
  const copy = copyText(p);
  glossed(at, `${p.name}\n${p.shortDescription}\n${p.description}`);
  // "Made in our own workshop" only where the site marks own manufacturing or Local Made.
  const workshop = /our own workshop/i.test(copy) || (p.tags || []).includes("workshop made") || /^Workshop /.test(p.name);
  check(workshop === WORKSHOP_IDS.includes(p.id), at, workshop ? "claims our own workshop, which the reference site marks only for 47, 77, 79 and 81" : "must say it is made in our own workshop (the reference site marks it own manufacturing / Local Made)");
  check(!/orthop|spine|medical|doctor|therapeutic|back pain/i.test(copy), at, "makes a medical claim");
  // Inches are hedged like centimetres and kilograms.
  specs.filter((s) => /\d\s*in\b/.test(s.value) && !/approx\./.test(s.value))
    .forEach((s) => fail(at, `"${s.key}: ${s.value}" gives a size in inches without "approx."`));
  // A "Finish" pair cannot call every option wood grain when one is a plain colour.
  const finish = specs.find((s) => s.key.toLowerCase() === "finish")?.value || "";
  (p.variants || []).filter((v) => v.attributes?.Finish && /white|black|grey|gray|cream/i.test(v.attributes.Finish)).forEach((v) => {
    check(!/wood[- ]?grain/i.test(finish) || finish.toLowerCase().includes(v.attributes.Finish.toLowerCase()), at, `"Finish: ${finish}" does not describe the ${v.attributes.Finish} option`);
  });
  // Weight capacity applies to a piece when another piece of its leaf states one.
  const leafHasCapacity = products.some((q) => q.id !== p.id && q.categoryId === p.categoryId && specsOf(q).some((s) => s.key.toLowerCase() === "weight capacity"));
  if (leafHasCapacity) check(specs.some((s) => s.key.toLowerCase() === "weight capacity"), at, "gives no weight capacity, which the other pieces of its leaf give");
  // The size pairs Prompt 04 uses, against the dimension fields.
  specs.forEach(({ key, value }) => {
    const k = key.toLowerCase();
    const box = value.match(new RegExp(`${N}\\s*×\\s*${N}\\s*×\\s*${N}\\s*cm`));
    const pair = value.match(new RegExp(`${N}\\s*×\\s*${N}`));
    if (["three-seater size", "sofa size", "table size"].includes(k)) {
      check(box && Number(box[1]) === d.length && Number(box[2]) === d.width && Number(box[3]) === d.height, at, `"${key}: ${value}" ≠ dimensions ${d.length} × ${d.width} × ${d.height}`);
    }
    if (k === "top size") check(pair && Number(pair[1]) === d.length && Number(pair[2]) === d.width, at, `"${key}: ${value}" ≠ dimensions ${d.length} × ${d.width} (L × W)`);
    if (k === "sizes" && /cm/.test(value)) {
      const all = [...value.matchAll(new RegExp(`${N}\\s*×\\s*${N}`, "g"))];
      const big = all[all.length - 1];
      const high = value.match(new RegExp(`${N}\\s*cm high`));
      check(big && Number(big[1]) === d.length && Number(big[2]) === d.width && high && Number(high[1]) === d.height, at, `"${key}: ${value}": the largest size and height must equal dimensions ${d.length} × ${d.width} × ${d.height}`);
    }
    if (k === "thickness") { const cm = value.match(new RegExp(`\\(${N}\\s*cm\\)`)); check(cm && Number(cm[1]) === d.height, at, `"${key}: ${value}" ≠ height ${d.height} cm`); }
    if (k === "mattress size") { const cm = value.match(new RegExp(`approx\\.\\s*${N}\\s*×\\s*${N}\\s*cm`)); check(cm && Number(cm[1]) <= d.width && Number(cm[2]) <= d.length, at, `"${key}: ${value}" does not fit the bed's ${d.length} × ${d.width} cm`); }
  });
  // Related pieces of Home Furniture stay in their room; a room with fewer
  // than four pieces names all its own first, then the rest of the department.
  const room = roomOf(p.categoryId);
  if (room) {
    const own = products.filter((q) => q.isActive && q.id !== p.id && roomOf(q.categoryId) === room).map((q) => q.id);
    const rel = p.relatedProductIds || [];
    if (own.length >= 3) rel.forEach((id) => check(own.includes(id), at, `related product ${id} is outside its room`));
    else check(JSON.stringify(rel.slice(0, own.length).sort()) === JSON.stringify([...own].sort()), at, `related ids must start with its room's own pieces (${own.join(",")})`);
  }
  // A bundle that crosses departments is returned, unless the other piece's
  // two slots already hold pieces of this one's department.
  (p.frequentlyBoughtTogetherIds || []).forEach((id) => {
    const q = prodById.get(String(id));
    if (!q || deptOf(q.categoryId) === deptOf(p.categoryId)) return;
    const back = q.frequentlyBoughtTogetherIds || [];
    const full = back.length >= 2 && back.every((x) => deptOf(prodById.get(String(x))?.categoryId) === deptOf(p.categoryId));
    check(back.includes(p.id) || full, at, `bundles ${id} across departments, which neither bundles it back nor has its two slots full`);
  });
  // Every high- or low-back office chair bundles a desk.
  if (typeOf(p) === "office chair") check((p.frequentlyBoughtTogetherIds || []).some((id) => DESK_TYPES.includes(typeOf(prodById.get(String(id)) || {}))), at, "an office chair must bundle an office, computer or reading table");
});

// ---- V2-03: the 38 products of Prompt 04's checklist --------------------------
const P04 = products.filter((p) => Object.prototype.hasOwnProperty.call(PROMPT_04, p.id));
P04.forEach((p) => {
  const at = `product ${p.id} (${p.slug})`;
  const [name, leaf, brand, rule, band, type, prefix] = PROMPT_04[p.id];
  const vs = p.variants || [];
  const specs = specsOf(p);
  const keys = specs.map((s) => s.key.toLowerCase());
  check(p.name === name && catSlugOf(p) === leaf && p.isActive, at, `must be "${name}", active, in ${leaf}`);
  check(p.brand === brand, at, `brand must be "${brand}"`);
  check(p.sku.startsWith(`${prefix}-`), at, `SKU must start ${prefix}-`);
  check((p.tags || []).includes(type), at, `tags must include the type "${type}"`);
  // Variants as the checklist line asks.
  const attr = vs.length ? Object.keys(vs[0].attributes || {})[0] : null;
  if (rule === null) check(vs.length === 0, at, "must have no variants (`[]`)");
  else if (Array.isArray(rule[1])) check(attr === rule[0] && JSON.stringify(vs.map((v) => v.attributes?.[rule[0]])) === JSON.stringify(rule[1]), at, `variants must be ${rule[0]}: ${rule[1].join(" / ")}`);
  else check(attr === rule[0] && vs.length >= rule[1] && vs.length <= rule[2], at, `variants must be ${rule[0]}, ${rule[1]}–${rule[2]} options`);
  if (attr && ["Size", "Shelves"].includes(attr)) check(vs.every((v, i) => i === 0 || v.price > vs[i - 1].price), at, `${attr} prices must rise option by option`);
  const prices = vs.length ? vs.map((v) => v.price) : [p.price];
  check(prices.every((x) => x >= band[0] && x <= band[1]), at, `prices ${prices.join(" / ")} outside the band ${band.join("–")}`);
  // A tag naming a material its specifications use, alone or in a compound.
  const specText = lowerRun(`${p.name} ${specs.map((s) => s.value).join(" ")}`);
  const material = (p.tags || []).some((t) => MATERIAL_WORDS_04.some((w) => new RegExp(`(^| )${w}( |$)`).test(lowerRun(t)) && specText.includes(w === "wooden" ? "wood" : w)));
  check(material, at, "tags must name a material its specifications use (alone or in a compound such as \"steel rack\")");
  // The specification topics, where each applies.
  check(keys.some((k) => /material|frame|construction|^top$|upholstery|base/.test(k)), at, "the specifications must give the material");
  check(keys.some((k) => /size|width × depth/.test(k)), at, "the specifications must give the size");
  check(keys.includes("care"), at, "the specifications must give the care");
  if (CAPACITY_LEAVES.includes(leaf)) check(keys.some((k) => /seating capacity|sleeping capacity|^configuration$/.test(k)) || (leaf === "mattresses" && keys.includes("sizes")), at, "the specifications must give the seating or sleeping capacity");
  if (leaf !== "mattresses") {
    const surface = specs.filter((s) => /material|frame|top/.test(s.key.toLowerCase())).map((s) => s.value).join(" ");
    check(keys.includes("finish") || /polish|laminat|powder-coated|sealed|moulded/i.test(surface) || ["Finish", "Colour"].includes(attr), at, "the specifications must give the finish, or the options must");
  }
  // Related: its leaf's other pieces first.
  const siblings = P04.filter((q) => q.id !== p.id && q.categoryId === p.categoryId).map((q) => q.id);
  const rel = p.relatedProductIds || [];
  check(rel.slice(0, Math.min(siblings.length, rel.length)).every((id) => siblings.includes(id)), at, `related ids must list its leaf's other pieces first (${siblings.join(",")})`);
  // Bundles: natural ones only.
  (p.frequentlyBoughtTogetherIds || []).forEach((id) => {
    const q = prodById.get(String(id));
    check(q && (BUNDLES_04[type] || []).includes(typeOf(q)), at, `bundle ${id} is not a natural one for a ${type}`);
  });
  check(p.createdAt >= WINDOW_START && p.createdAt <= BUILD_DATE, at, `createdAt ${p.createdAt} is not within the six months before the build`);
});
check(P04.length === 38 && JSON.stringify(P04.map((p) => p.id)) === JSON.stringify(Object.keys(PROMPT_04).map(Number)), "coverage", `Prompt 04's checklist has 38 products (47–84), found ${P04.length}`);
// Every desk bundles an office chair that bundles it back.
P04.filter((p) => DESK_TYPES.includes(PROMPT_04[p.id][5])).forEach((p) => {
  check((p.frequentlyBoughtTogetherIds || []).some((id) => typeOf(prodById.get(String(id)) || {}) === "office chair" && (prodById.get(String(id)).frequentlyBoughtTogetherIds || []).includes(p.id)),
    `product ${p.id} (${p.slug})`, "a desk must bundle an office chair that bundles it back");
});
WINSOME_PAIRS.forEach(([w, s]) => {
  const a = prodById.get(String(w));
  const b = prodById.get(String(s));
  if (a && b) check(a.variants.length === b.variants.length && a.variants.every((v, i) => v.price > b.variants[i].price), "prices", `${a.name} must cost more than ${b.name}, size for size`);
});
const dining = P04.filter((p) => PROMPT_04[p.id][1] === "dining-sets");
check(dining.length && Math.max(...dining.map((p) => p.price)) === prodById.get("75")?.price, "prices", "the Marble-Top Dining Set must be the dearest dining set");
const compared04 = P04.filter((p) => p.comparePrice > 0).length;
check(compared04 / 38 >= 0.25 && compared04 / 38 <= 0.4, "prices", `${compared04} of Prompt 04's 38 products have a comparePrice; give roughly a third one`);
let low04 = 0;
let soldOut04 = 0;
P04.forEach((p) => (p.variants.length ? p.variants : [{ stock: p.stock }]).forEach((v) => {
  if (v.stock === 0) soldOut04 += 1;
  else if (v.stock <= p.lowStockThreshold) low04 += 1;
}));
check(low04 >= 2 && low04 <= 3, "stock", `Prompt 04's products need 2–3 deliberately low-stock variants (found ${low04})`);
check(soldOut04 >= 1 && soldOut04 <= 2, "stock", `Prompt 04's products need 1–2 sold-out variants (found ${soldOut04})`);
const flagged04 = (k) => P04.filter((p) => p[k]);
check(flagged04("featured").length >= 4 && flagged04("featured").length <= 6 && flagged04("featured").some((p) => deptOf(p.categoryId) === 5) && flagged04("featured").some((p) => deptOf(p.categoryId) === 6),
  "flags", `featured: ${flagged04("featured").length} of Prompt 04's products (4–6, home and office pieces both)`);
check(flagged04("trending").length >= 3 && flagged04("trending").length <= 4, "flags", `trending: ${flagged04("trending").length} of Prompt 04's products (3–4)`);
check(flagged04("hot").length >= 1 && flagged04("hot").length <= 2, "flags", `hot: ${flagged04("hot").length} of Prompt 04's products (1–2)`);

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

  // ---- V2-04: Prompt 05's remaining machine-checkable rules ----------------
  // Every value below is Prompt 05's (or a later recorded decision's); the
  // money rules are the checkout's and the cascade's, as src implements them.
  const srcFile = (...p) => fs.readFileSync(path.join(__dirname, "..", ...p), "utf8");
  const constantsSrc = srcFile("src", "utils", "constants.js");
  const constString = (name) => {
    const m = constantsSrc.match(new RegExp(`export const ${name} =[^"\\n]*"([^"]+)"`));
    return m ? m[1] : undefined;
  };
  const SUPPORT_EMAIL = constString("SUPPORT_EMAIL");
  const html = srcFile("public", "index.html");
  const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const htmlTitle = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "");
  const htmlDescription = decode((html.match(/name="description"\s+content="([^"]*)"/) || [])[1] || "");
  const brandNavy = (srcFile("src", "theme", "storefront-tokens.css").match(/--sf-brand-navy:\s*(#[0-9a-fA-F]{6})/) || [])[1];
  const dept = (pid) => { const p = prodById.get(String(pid)); return p ? deptOf(p.categoryId) : null; };
  const discounted = (p) => p && Number(p.comparePrice) > Number(p.price) && Number(p.price) > 0; // getProductMaxDiscount > 0
  const couponValid = (c) => c && c.isActive !== false && (!c.expiresAt || c.expiresAt > nowIso) && !(c.usageLimit && c.usedCount >= c.usageLimit); // offersData.js isCouponValid
  const user3 = users.find((u) => u.email === "mail4bappidas@gmail.com");

  // record counts are frozen (Prompt 05 kept every record; V2 changes values only)
  Object.entries({ banners: 3, users: 3, admins: 1, orders: 11, returns: 2, payments: 9, refunds: 3, shipping_methods: 4, coupons: 5, wishlist: 3, leads: 4, walletTransactions: 3 })
    .forEach(([k, n]) => check((db[k] || []).length === n, k, `${(db[k] || []).length} records; Prompt 05 kept ${n}`));

  // settings: every key of the boilerplate, in order, with Prompt 05's values
  const keyPaths = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keyPaths(v, `${p}${k}.`) : [`${p}${k}`]));
  const SETTINGS_PATHS = ["store.name", "store.tagline", "store.email", "store.phone", "store.address", "store.currency", "store.currencySymbol", "store.timezone", "store.logo", "store.favicon", "store.taxRate", "store.taxIncluded",
    "shipping.shiprocketEnabled", "shipping.shiprocketEmail", "shipping.shiprocketPassword", "shipping.defaultWeight", "shipping.defaultDimensions.length", "shipping.defaultDimensions.width", "shipping.defaultDimensions.height",
    "payment.razorpayEnabled", "payment.razorpayKeyId", "payment.stripeEnabled", "payment.stripePublishableKey", "payment.codEnabled", "payment.codFee", "payment.codMinOrder", "payment.codMaxOrder",
    "notifications.orderConfirmationEmail", "notifications.shippingUpdateEmail", "notifications.adminNewOrderEmail", "notifications.adminEmail", "notifications.lowStockAlert", "notifications.lowStockEmail",
    "seo.metaTitle", "seo.metaDescription", "seo.googleAnalyticsId", "seo.facebookPixelId", "social.facebook", "social.instagram", "social.twitter", "social.youtube", "social.whatsapp"];
  check(JSON.stringify(keyPaths(settings)) === JSON.stringify(SETTINGS_PATHS), "settings", "key paths differ from the boilerplate's 42");
  const st = settings.store || {};
  check(st.tagline === constString("APP_TAGLINE") && st.email === SUPPORT_EMAIL && st.phone === constString("SUPPORT_PHONE") && st.address === constString("SUPPORT_ADDRESS"),
    "settings.store", "tagline, email, phone and address must equal constants.js");
  check(st.currency === "INR" && st.currencySymbol === "₹" && st.timezone === "Asia/Kolkata" && st.logo === null && st.favicon === null && st.taxRate === 18 && st.taxIncluded === false,
    "settings.store", "INR, ₹, Asia/Kolkata, logo and favicon null, taxRate 18, taxIncluded false");
  check(sp.codEnabled === true && sp.codFee === 0 && sp.codMinOrder === 0 && sp.codMaxOrder === 50000 && sp.razorpayEnabled === false && sp.stripeEnabled === false,
    "settings.payment", "COD on, fee 0, min 0, max 50,000; gateways off");
  const ship = settings.shipping || {};
  check(ship.defaultWeight === 8 && ["length", "width", "height"].every((k) => isNum(ship.defaultDimensions?.[k]) && ship.defaultDimensions[k] > 0),
    "settings.shipping", "defaultWeight 8 kg and positive carton dimensions");
  check(settings.notifications?.adminEmail === SUPPORT_EMAIL && settings.notifications?.lowStockEmail === SUPPORT_EMAIL, "settings.notifications", "emails must be the support email");
  check(settings.seo?.metaTitle === htmlTitle, "settings.seo", `metaTitle "${settings.seo?.metaTitle}" ≠ index.html's title "${htmlTitle}"`);
  check(settings.seo?.metaDescription === htmlDescription, "settings.seo", "metaDescription ≠ index.html's description");
  const soc = settings.social || {};
  check(soc.whatsapp === (constantsSrc.match(/WHATSAPP:\s*"([^"]*)"/) || [])[1] && ["facebook", "instagram", "twitter", "youtube"].every((k) => soc[k] === ""),
    "settings.social", "whatsapp = SOCIAL_LINKS.WHATSAPP, the others \"\"");

  // shipping methods: the four records, by id
  check(JSON.stringify(methods.map((m) => [m.id, m.name])) === JSON.stringify([[1, "Standard Delivery"], [2, "Express Delivery"], [3, "Same Day Delivery"], [4, "Free Shipping"]]),
    "shipping_methods", "ids 1–4: Standard Delivery, Express Delivery, Same Day Delivery, Free Shipping");
  const [m1, m2, m3, m4] = [1, 2, 3, 4].map((id) => methods.find((m) => m.id === id) || {});
  check(m1.carrier === "Shiprocket" && m1.description === "Delivered in 7–10 business days" && m1.rateType === "flat" && m1.flatRate === 499 && m1.freeAbove === 9999 && m1.estimatedDays === "7-10" && m1.isActive === true,
    "shipping_method 1", "Standard: Shiprocket, flat ₹499, free above ₹9,999, 7-10 days, active");
  check(m2.flatRate === 999 && m2.freeAbove === null && m2.estimatedDays === "3-5" && m2.isActive === true, "shipping_method 2", "Express: ₹999, never free, 3-5 days, active");
  check(m3.isActive === false && m4.isActive === false, "shipping_methods", "Same Day and Free Shipping stay inactive");
  const activeMethods = methods.filter((m) => m.isActive);

  // coupons: Prompt 05's five, honest descriptions, modest use
  const C = Object.fromEntries(coupons.map((c) => [c.code, c]));
  check(JSON.stringify(coupons.map((c) => c.id)) === "[1,2,3,4,5]" && ["WELCOME500", "FLAT10", "FESTIVE25", "NEWHOME20"].every((k) => C[k]) && (C.WORKSPACE15 || C.OFFICE15),
    "coupons", "ids 1–5: WELCOME500, FLAT10, FESTIVE25, NEWHOME20, WORKSPACE15 (or OFFICE15)");
  const w15 = C.WORKSPACE15 || C.OFFICE15 || {};
  check(C.WELCOME500?.type === "fixed" && C.WELCOME500.value === 500 && C.WELCOME500.minOrderAmount === 5000, "coupon WELCOME500", "fixed ₹500, minimum ₹5,000");
  check(C.FLAT10?.type === "percentage" && C.FLAT10.value === 10 && C.FLAT10.maxDiscount === 2000 && C.FLAT10.minOrderAmount === 2000, "coupon FLAT10", "10%, up to ₹2,000, minimum ₹2,000");
  check(C.FESTIVE25 && !C.FESTIVE25.isActive && C.FESTIVE25.expiresAt < nowIso && C.FESTIVE25.usageLimit !== null && C.FESTIVE25.usedCount >= C.FESTIVE25.usageLimit, "coupon FESTIVE25", "inactive, expired and exhausted");
  check(C.NEWHOME20?.type === "percentage" && C.NEWHOME20.value === 20 && C.NEWHOME20.maxDiscount === 3000, "coupon NEWHOME20", "20%, up to ₹3,000");
  check(w15.type === "percentage" && w15.value === 15 && w15.minOrderAmount === 15000 && !/office|furniture|chair|desk|table|categor/i.test(w15.description || ""),
    `coupon ${w15.code}`, "15% off orders above ₹15,000, with no category claim (coupons have no category restriction)");
  coupons.forEach((c) => {
    const at = `coupon ${c.id} (${c.code})`;
    const used = orders.filter((o) => o.couponCode === c.code);
    if (c.isActive) {
      check(/^2027-/.test(c.expiresAt || ""), at, "an active coupon expires in 2027");
      check(c.usedCount <= 50, at, `usedCount ${c.usedCount} is not modest`);
    }
    check(c.usedCount >= used.length, at, `usedCount ${c.usedCount} is below the ${used.length} seeded orders that used it`);
    // the description promises nothing the seed contradicts: "first order" only
    // where every seeded use was the customer's first order
    if (/first order/i.test(c.description || "")) {
      used.forEach((o) => check(!orders.some((x) => x.userId === o.userId && x.createdAt < o.createdAt), at, `says "first order", but ${o.orderNumber} is not the customer's first`));
    }
  });

  // orders: the checkout's rules at the order's date, timelines, states
  const STATE_OF_PAYMENT = { paid: ["captured"], pending: ["pending"], refunded: ["refunded"], partially_refunded: ["partially_refunded"], voided: ["voided"], failed: ["failed"] };
  orders.forEach((o) => {
    const at = `order ${o.id} (${o.orderNumber})`;
    const hist = o.statusHistory || [];
    const has = (re) => hist.some((h) => re.test(h.action));
    (o.items || []).forEach((it, i) => {
      const p = prodById.get(String(it.productId));
      const v = p && (p.variants || []).find((x) => x.id === it.variantId);
      // historic orders keep their snapshot price; on this seed every snapshot equals the catalogue
      if (p) check(it.price === (v ? v.price : p.price), `${at} item ${i}`, `price ${it.price} ≠ the variant's ${v ? v.price : p.price}`);
    });
    const charge = activeMethods.map((m) => (m.rateType === "free" || (m.freeAbove && o.subtotal >= m.freeAbove) ? 0 : m.flatRate));
    check(charge.includes(o.shippingAmount), at, `shippingAmount ${o.shippingAmount} is no active method's charge at subtotal ${o.subtotal} (${charge.join(" / ")})`);
    if (o.couponCode && C[o.couponCode]) {
      const c = C[o.couponCode];
      check(o.subtotal >= c.minOrderAmount, at, `subtotal ${o.subtotal} is below ${c.code}'s minimum ${c.minOrderAmount}`);
      check(c.createdAt <= o.createdAt && (!c.expiresAt || c.expiresAt > o.createdAt), at, `${c.code} was not valid on ${o.createdAt.slice(0, 10)}`);
      const uses = orders.filter((x) => x.userId === o.userId && x.couponCode === c.code).length;
      check(!c.perUserLimit || uses <= c.perUserLimit, at, `${c.code} used ${uses} times by user ${o.userId} (limit ${c.perUserLimit})`);
    }
    if ((o.storeCreditUsed || 0) > 0) {
      check(o.storeCreditUsed <= o.total, at, "storeCreditUsed above the total");
      check((db.walletTransactions || []).some((t) => t.type === "debit" && String(t.orderId) === String(o.id) && t.amount === o.storeCreditUsed), at, "store credit used with no matching wallet debit");
    }
    // timeline: createdAt ≤ every event ≤ updatedAt, in order
    const times = [o.createdAt, ...hist.map((h) => h.at)];
    check(times.every((t) => ISO.test(t)) && times.every((t, i) => i === 0 || t >= times[i - 1]), at, "timeline out of order (createdAt ≤ each event, in sequence)");
    check(hist.every((h) => h.at <= o.updatedAt) && o.updatedAt <= nowIso, at, `an event follows updatedAt ${o.updatedAt}`);
    const delivered = hist.find((h) => h.action === "Marked delivered");
    if (o.deliveredAt) check(o.deliveredAt >= o.createdAt && o.deliveredAt <= o.updatedAt && (!delivered || o.deliveredAt <= delivered.at), at, "deliveredAt outside the timeline");
    if (o.cancelledAt) check(hist.some((h) => h.action === "Order cancelled" && h.at === o.cancelledAt), at, "cancelledAt is not the cancellation's time");
    // each event leaves its state (api.js's cascades)
    check(!has(/^Order cancelled/) || o.fulfillmentStatus === "cancelled", at, "cancelled in the timeline, not in fulfillmentStatus");
    check(!has(/^Marked delivered/) || o.shippingStatus === "delivered", at, "delivered in the timeline, not in shippingStatus");
    check(!has(/^Fulfilled & shipped/) || ["fulfilled", "returned", "cancelled"].includes(o.fulfillmentStatus), at, "shipped in the timeline, not fulfilled");
    check(!has(/^Return refund processed/) || o.fulfillmentStatus === "returned", at, "a processed return refund leaves the order returned");
    check(!(has(/^Refund (issued|completed)/) || has(/^Return refund processed/)) || ["refunded", "partially_refunded"].includes(o.paymentStatus), at, "a booked refund in the timeline, but the payment is not refunded");
    check(!has(/^Payment voided/) || o.paymentStatus === "voided", at, "voided in the timeline, not in paymentStatus");
    check(!(o.fulfillmentStatus === "cancelled" && o.paymentStatus === "pending"), at, "cancelled with the payment still pending (performCancel voids an uncollected payment)");
    const pay = payments.find((p) => String(p.orderId) === String(o.id));
    if (pay) check((STATE_OF_PAYMENT[o.paymentStatus] || []).includes(pay.status) || (o.paymentStatus === "paid" && pay.status === "refund_pending"), at, `paymentStatus ${o.paymentStatus} but payment ${pay.id} is ${pay.status}`);
    // every ₹ amount the timeline quotes is a booked refund, a return payable or the credit used
    const allowed = new Set([...refunds.filter((r) => String(r.orderId) === String(o.id)).map((r) => r.amount),
      ...returns.filter((r) => String(r.orderId) === String(o.id)).map((r) => r.refundAmount - (r.deductionAmount || 0)), o.storeCreditUsed || 0]);
    hist.forEach((h) => (`${h.action} ${h.note || ""}`.match(/₹[\d,]+/g) || []).forEach((q) => check(allowed.has(Number(q.slice(1).replace(/,/g, ""))), at, `timeline quotes ${q}, which matches no refund, return or credit`)));
    // an ORD-<Date.now() in base 36>-XXXX number encodes its createdAt: the
    // reason order timestamps stay frozen with the numbers (V2-04)
    const m = /^ORD-([0-9A-Z]{8})-[0-9A-Z]{4}$/.exec(o.orderNumber);
    if (m && !/^\d{8}$/.test(m[1])) check(new Date(parseInt(m[1], 36)).toISOString() === o.createdAt, at, "the order number no longer encodes createdAt");
  });

  // payments: refund state and timestamps
  payments.forEach((p) => {
    const at = `payment ${p.id}`;
    const o = orderById.get(String(p.orderId));
    const refunded = (p.refunds || []).reduce((a, r) => a + r.amount, 0);
    if (["captured", "pending", "voided"].includes(p.status)) check(refunded === 0, at, `${p.status} but ₹${refunded} refunded`);
    if (p.status === "partially_refunded") check(refunded > 0 && refunded < p.amount, at, "partially_refunded needs 0 < refunded < amount");
    if (o) check(p.createdAt >= o.createdAt && p.updatedAt >= p.createdAt && (p.refunds || []).every((r) => r.at >= p.createdAt && r.at <= p.updatedAt), at, "timestamps out of order");
  });

  // returns: the status the admin's actions leave, and the timeline
  const RETURN_STATE = [[/^Refund processed/, "refunded"], [/^Items received/, "received"], [/^Return in transit/, "in_transit"], [/^Return pickup scheduled/, "pickup_scheduled"], [/^Return approved/, "approved"], [/^Return rejected/, "rejected"], [/^Return created/, "requested"]];
  returns.forEach((r) => {
    const at = `return ${r.id} (${r.returnNumber})`;
    const hist = r.statusHistory || [];
    const last = hist.length ? hist[hist.length - 1].action : "";
    const expected = (RETURN_STATE.find(([re]) => re.test(last)) || [])[1];
    check(r.status === expected, at, `status ${r.status}, but its timeline ends "${last}" (${expected})`);
    check((r.refundStatus === "processed") === (r.status === "refunded"), at, "refundStatus processed ⇔ status refunded (AdminReturns' Process Refund writes both)");
    const times = [r.createdAt, ...hist.map((h) => h.at)];
    check(times.every((t, i) => i === 0 || t >= times[i - 1]) && hist.every((h) => h.at <= r.updatedAt), at, "timeline out of order");
    const o = orderById.get(String(r.orderId));
    if (o) check(r.createdAt >= o.createdAt, at, "dated before its order");
    const p = o && payments.find((x) => String(x.orderId) === String(o.id));
    if (p) check(r.refundAmount - (r.deductionAmount || 0) <= p.amount, at, "refunds more than the payment holds");
  });

  // refunds ledger timestamps
  refunds.forEach((f) => {
    check(f.createdAt === f.initiatedAt && (!f.settledAt || f.settledAt >= f.initiatedAt) && f.updatedAt >= f.createdAt && (f.status !== "completed" || f.settledAt),
      `refund ${f.id} (${f.refundNumber})`, "initiatedAt = createdAt ≤ settledAt ≤ updatedAt; a completed refund is settled");
  });

  // wallet rows link what moved the money, and follow their order
  (db.walletTransactions || []).forEach((t) => {
    const at = `walletTransaction ${t.id}`;
    const o = orderById.get(String(t.orderId));
    if (t.type === "debit") check(o && /^Applied to order /.test(t.reason), at, "a debit names the order it paid");
    else check((t.refundId != null && refunds.some((f) => String(f.id) === String(t.refundId) && f.method === "store_credit")) || /^Store credit returned/.test(t.reason), at, "a credit links a store-credit refund or a cancellation");
    if (o) check(t.createdAt >= o.createdAt, at, "dated before its order");
  });

  // reviews: Prompt 05's counts and content rules
  const rv = db.reviews || [];
  const byStatus = (s) => rv.filter((r) => r.status === s).length;
  check(rv.length >= 20 && rv.length <= 26, "reviews", `${rv.length} reviews (20–26)`);
  check(byStatus("pending") >= 3 && byStatus("pending") <= 4 && byStatus("rejected") >= 1 && byStatus("rejected") <= 2, "reviews", `${byStatus("pending")} pending (3–4), ${byStatus("rejected")} rejected (1–2)`);
  const reviewed = [...new Set(rv.map((r) => r.productId))];
  check(reviewed.length >= 14 && reviewed.length <= 18, "reviews", `${reviewed.length} distinct products (14–18)`);
  check(DEPARTMENTS.every(([id]) => reviewed.some((pid) => dept(pid) === id)), "reviews", "reviews must cover all six departments");
  const HEALTH = /\b(pain|aches?|aching|sore|backache|lower back|spine|spinal|posture|orthop\w*|medical|doctor|therapeutic|cures?d?|heal\w*|insomnia)\b|sleep(ing)? (much |so |far )?better/i;
  rv.forEach((r) => {
    const at = `review ${r.id}`;
    check(Number.isInteger(r.rating) && r.rating >= 3 && r.rating <= 5, at, "rating must be 3–5");
    const sentences = String(r.body).split(/(?<=[.!?])\s+/).filter(Boolean).length;
    check(sentences >= 1 && sentences <= 3 && !/!/.test(`${r.title} ${r.body}`), at, `${sentences} sentences; bodies are 1–3 plain sentences`);
    check(!HEALTH.test(`${r.title} ${r.body}`), at, "states a health effect");
    // assembly or installation by the store is unconfirmed (legalContent.js CONFIRM)
    check(!/\b(set (it|them) up for (us|me)|assembled (it|them) for (us|me)|install(ed|ation))\b/i.test(r.body), at, "claims a set-up service the store has not confirmed");
    const p = prodById.get(String(r.productId));
    if (p) check(r.createdAt >= p.createdAt, at, `dated before product ${p.id} existed (${p.createdAt.slice(0, 10)})`);
  });

  // wishlist: user 3's three active pieces, saved after they existed
  (db.wishlist || []).forEach((w) => {
    const at = `wishlist ${w.id}`;
    const p = prodById.get(String(w.productId));
    check(user3 && String(w.userId) === String(user3.id), at, "rows belong to mail4bappidas@gmail.com (user 3)");
    if (p) check(p.isActive, at, `product ${p.id} is inactive`);
    if (p) check(w.addedAt >= p.createdAt && (!user3 || w.addedAt >= user3.createdAt) && w.addedAt <= nowIso, at, `addedAt ${w.addedAt} is before product ${p.id} or the account existed`);
  });

  // deals config: Prompt 05's shape and the page's own selection rules
  check(d.enabled === true && ["tag", "title", "subtitle"].every((k) => typeof d.hero?.[k] === "string" && d.hero[k].trim()), "dealsConfig", "enabled, with a hero tag, title and subtitle");
  check(!/unbeatable|don.t miss|hurry|limited time|selling fast/i.test(JSON.stringify(d.hero || {})), "dealsConfig", "hero copy in the brand voice (no urgency)");
  check(d.timer?.enabled === true && d.timer?.endAt === "" && d.timer?.onExpiry === "endOfDay", "dealsConfig", "timer: enabled, endAt \"\", onExpiry endOfDay");
  check((d.featuredCouponIds || []).length === 2 && d.featuredCouponIds.every((id) => couponValid(coupons.find((c) => String(c.id) === String(id)))),
    "dealsConfig", "two featured coupons, each active, unexpired and not exhausted");
  check((d.dealOfTheDayIds || []).length === 3 && d.dealOfTheDayIds.every((id) => { const p = prodById.get(String(id)); return p && p.isActive && discounted(p); }),
    "dealsConfig", "three deals of the day, each active with comparePrice above price");
  const grid = (d.featuredProductIds || []).map((id) => prodById.get(String(id)));
  check(grid.length >= 6 && grid.length <= 8 && grid.every((p) => p && p.isActive && discounted(p)), "dealsConfig", "6–8 grid pieces, each active and discounted");
  const deptsWithDeals = new Set(products.filter((p) => p.isActive && discounted(p)).map((p) => deptOf(p.categoryId)));
  check([...deptsWithDeals].every((id) => grid.some((p) => p && deptOf(p.categoryId) === id)), "dealsConfig", "the grid spans every department that has a discounted piece");
  check(ISO.test(d.updatedAt || "") && d.updatedAt <= nowIso, "dealsConfig", "updatedAt must be a past ISO date");

  // banners: department links and DESIGN_SYSTEM.md §12's literal navy
  (db.banners || []).forEach((b) => {
    const slug = (String(b.link).match(/[?&]category=([^&]+)/) || [])[1];
    check(categories.some((c) => c.slug === slug && c.parentId === null && c.isActive), `banner ${b.id}`, `link ${b.link} is not a department`);
    check(b.gradient === brandNavy, `banner ${b.id}`, `gradient ${JSON.stringify(b.gradient)} ≠ ${brandNavy} (DESIGN_SYSTEM.md §12, --sf-brand-navy)`);
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
row("Prompt 04 set (V2-03)", `${P04.length} products: compare-at ${compared04}, low ${low04} / sold out ${soldOut04}, `
  + `featured ${flagged04("featured").length} / trending ${flagged04("trending").length} / hot ${flagged04("hot").length}`);
DEPARTMENTS.forEach(([id, slug]) => row(`  dept ${id} ${slug}`, `${products.filter((p) => deptOf(p.categoryId) === id).length} products`));
COVERAGE.forEach(([slug, n]) => row(`  ${slug}`, `${slugCount[slug] || 0}/${n}`));
if (!CATALOGUE_ONLY) {
  row("Orders / payments / refunds / returns", ["orders", "payments", "refunds", "returns"].map((k) => (db[k] || []).length).join(" / "));
  row("Reviews (approved / pending / rejected)", ["approved", "pending", "rejected"].map((st) => (db.reviews || []).filter((r) => r.status === st).length).join(" / "));
  row("Products with reviews / without", `${products.filter((p) => p.totalReviews > 0).length} / ${products.filter((p) => p.totalReviews === 0).length}`);
  row("Store credit (users[].storeCredit)", (db.users || []).map((u) => `user ${u.id}: ${u.storeCredit || 0}`).join(", "));
  row("Supporting data (V2-04)", `coupons ${(db.coupons || []).filter((c) => c.isActive).length} active of ${(db.coupons || []).length}; `
    + `deals ${(db.dealsConfig?.dealOfTheDayIds || []).length} + ${(db.dealsConfig?.featuredProductIds || []).length}; `
    + `reviewed products ${new Set((db.reviews || []).map((r) => r.productId)).size}; wishlist ${(db.wishlist || []).length}`);
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
