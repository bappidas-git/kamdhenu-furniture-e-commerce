V2 baseline: 0b9153e490c87c0713c8c802f67185266da424a2 · V2-03 start: 8b9e2eb00b76862a7deea9a26eaa949f2144bd61

# V2-03 report: catalogue data II, reference-site ranges (max-effort re-verification of Prompt 04)

**Date:** 2026-10-11. **Re-verifies:** Prompt 04 (`prompts/04_catalogue-data-reference-site-ranges.md`, commit `4dd5cf2`). **Scope:** categories 30–49 (the Home Furniture and Office Tables & Desks subtrees and the two extra Plastic groups), departments 1, 5 and 6 as their parents, the 38 Prompt 04 products (ids 47–84), the `relatedProductIds` / `frequentlyBoughtTogetherIds` of the Prompt 03 office chairs where a cross-department bundle needs them, and `scripts/validate-db.js`. **Start:** `git rev-parse HEAD` = `8b9e2eb` (V2-02 merged); `db.json` SHA-256 `887637ee…` (V2-02's seed).

**Status:** matrix written before any edit. **228 requirements: 187 met, 4 superseded by or kept under a recorded decision, 10 gaps (R68, R69, R139, R140, R142, R153, R158, R164, R186, R198) and 27 partial (R6, R11, R215 and 24 of the 38 product rows, each inheriting one of the gaps).** Repairs follow in §8.

---

## 1. How this was checked

- **Read in full:** `prompts/00_INDEX.md`, `prompts/04_catalogue-data-reference-site-ranges.md`, `prompts/03_catalogue-data-client-ranges.md` (its content rules apply to these products), the `## Prompt 04` and `## Prompt 05` entries of `prompts/BUILD_LOG.md`, the V2 README, the V2-01 and V2-02 reports and their entries, and this prompt. Every later entry (06–34) was searched for `plastic-sofas`, `single-product`, `Brands we carry`, `synonym`, `almirah`, `alna`, `mattress`, `Winsome`, `Carlton`, `workshop`, `Prompt 04`, `home-furniture`, `office-tables`, `bedroom`, `featured`, `getFeatured` and the Prompt 04 product names, and the matching passages were read (Prompts 07, 09, 11, 12, 14, 15, 16, 17, 19, 28, 29, 32, 34; §3). `DESIGN_SYSTEM.md` §11 (placeholder tones), §39 (voice; §39.9 on admin-managed copy) and §43.5 (validator rules).
- **History:** `git show --stat 4dd5cf2` and its diff; `git log --full-history -- db.json scripts/validate-db.js`; a field-by-field walk of every category and product across `6616837 → 4dd5cf2 → d807ce4 → 7cbe35d → 2c1ea8d → HEAD` (§2).
- **Reference site:** `https://kamdhenufurniture.in/`, `/product/` and the 60 category and model pages it links, downloaded on 2026-10-11 into a scratch folder and read as data (§4).
- **Consuming code read:** `src/utils/categories.js` (`getMainMenuCategories`, `orderCategoriesHierarchically` returns `{ ordered, depthOf }`, `getCategoryScopeIds` returns a Set of string ids); `src/utils/helpers.js` (`slugify`, `getProductMinPrice` returns `{ sellingPrice, … }`, `getDefaultCartVariant`, `buildCartItem`, `parseSpecifications`); `src/components/storefront/variantUtils.js`, `VariantSelector.js`; `src/components/Header/groupCategoryTree.js`; `src/components/SearchModal/searchData.js` (`scoreProduct`: name, tags by substring, category name or slug, brand, short description); `src/pages/Home/homeData.js` (`collectBrands`); `src/pages/ProductDetails/productSpecs.js`; `src/pages/Products/Products.js`; the `products.*` block of `src/services/api.js` (`getFeatured`/`getTrending`: the first N flagged in catalogue order in JSON Server mode; `getRelated`: curated ids, then the same category, then any product with the same brand or a shared tag, in catalogue order); `src/pages/Admin/AdminProducts.js` and `AdminCategories.js` (edit and save paths).
- **Audit script** (`audit-v2-03.cjs`, session scratchpad, not committed): V2-02's script was not in the repository (it lived in that session's scratchpad), so it was rebuilt with V2-02's rule ids where a rule carries over and extended with Prompt 04's own. It loads the storefront's modules through Babel the way Jest does (`babel-preset-react-app`), so every check runs the app's real `parseSpecifications`, `slugify`, `getProductMinPrice`, `getDefaultCartVariant`, `buildCartItem`, `isColorAttribute`, `hasStructuredAttributes`, `buildColorMap`, `getMainMenuCategories`, `orderCategoriesHierarchically`, `getCategoryScopeIds`, `groupCategoryTree`, `searchProducts`, `collectBrands` and `buildSpecRows`. **2,434 checks** on 26 categories (20 new, departments 1–6) and 38 products, plus aggregates; it also writes an identity snapshot (ids, slugs, SKUs, category placements, variant ids and SKUs, key orders, ratings; SHA-256 of every other collection, of products 1–46 without their relation fields and of categories 1–29) for the before/after proof (§9). Summary in §7.
- **Browser checks** (Playwright 1.56.1, Chromium): a production build in JSON Server mode (`REACT_APP_API_URL=http://localhost:3001 REACT_APP_USE_MOCK_API=true CI=true npm run build`: "Compiled successfully.", main JS 399.59 kB, CSS 34.97 kB gzip, V2-02's figures) served with `serve -s` on :5001; JSON Server on a **scratch copy** of `db.json` (`JSON_SERVER_DB`), so the seed was never written (SHA-256 `887637ee…` before and after). **Baseline pass: 95 of 95**, plus an admin pass that saved 5 categories and 11 products without changing them (3 of 3). Results are "browser: <check id>" in the evidence column. The checks: the department row and the Home, Office Tables & Desks and Plastic flyouts (every link); `/products` (84, pagination); the 16 new leaves and 7 parents, each listing compared name by name with the data; all 38 product pages (the `h1`, the price, the specifications table's parsed rows, the prose paragraphs); the mattress sizes (price, SKU, stock line), the arrow keys and End, both racks' shelves, the Winsome table's sizes, the sofa's swatches, the sold-out almirah finish, the alna without variants; two lines in the cart drawer; search "almirah", "alna", "table", "mattress"; "Brands we carry" and the Featured and Trending rails on the home page; `/products?category=home-furniture` and a product page at 360/768/1024/1440; the category filter by keyboard; the admin's Categories (43 rows, the 20 new edit dialogs) and Products (84 rows, the 38 new edit dialogs with every variant); the console.
- **Gate at the start:** `node scripts/validate-db.js` ✓ (full) and `--catalogue` ✓; `CI=true npm test -- --passWithNoTests` **86 suites, 1,429 tests, exit 0** (88 s, no console warning).

## 2. What the medium session did (`4dd5cf2`)

`git show --stat 4dd5cf2`: `db.json` (+3,249 / −10 lines), `prompts/BUILD_LOG.md` (+170), `scripts/validate-db.js` (+55 / −2 lines). Nothing under `src/`, `public/`, `server.js` or `package.json`.

| Area | Change |
|---|---|
| `categories` | 20 records appended (ids 30–49): Living Room, Bedroom, Dining Room and Storage with their leaves under 5; three leaves under 6; `plastic-dining-sets` and `plastic-sofas` under 1. Categories 1–29 byte-identical |
| `products` | 38 records appended (ids 47–84), 85 variants. Products 1–46 byte-identical except `frequentlyBoughtTogetherIds` of 21, 22, 23 (+77), 24, 25 (+79), 29, 30, 31, 32 (+76) and 33 (+78), each appended, never replaced |
| `scripts/validate-db.js` | `COVERAGE` rows for the 16 leaves (expected total 84), `TREE` (parent and `sortOrder` of each new category), `BRANDS` (four brands and `""`), the 2+ products per leaf check with `SINGLE_PRODUCT_LEAVES = ["plastic-sofas"]`, `VARIANT_RULES` for mattresses, racks and the three table leaves, a Brands summary row |
| other collections | unchanged (per-collection SHA-256, `6616837` vs `4dd5cf2`); the collection order is the same |

Later commits touched these records only as follows (field-by-field walk): Prompt 05 (`d807ce4`) set `rating`/`totalReviews` of 47, 55, 58, 64, 74, 76 and 81 from approved reviews; Prompt 34 (`7cbe35d`) rewrote the "Overall size" pair of 55, 56 and 57 into L × W × H order; V2-02 (`2c1ea8d`) changed none of them.

## 3. Later decisions that changed Prompt 04's data, or the rules it is read by

| Prompt | Commit | Change | Recorded in |
|---|---|---|---|
| 05 | `d807ce4` | `rating`/`totalReviews` of 47, 55, 58, 64, 74, 76, 81 from approved reviews; orders, wishlist and the deals config now point at Prompt 04 products (orders 2, 7–11; wishlist 48; deal of the day 47; grid 55, 74, 78, 81, 84) | BUILD_LOG Prompt 05 |
| 07 | — | The mega-menu reads the tree as data: Plastic Furniture → Essentials (4) · Premium (3) · Dining Sets · Sofas; Home Furniture → Living Room (3) · Bedroom (6) · Dining Room · Storage; Office Tables & Desks → three single-link columns | BUILD_LOG line 904 |
| 11 | — | Home rails: `getFeatured(8)`, `getTrending(8)`. Complete the space anchors on 31 with its bundle (35, 76): "3 pieces, ₹45,997" | BUILD_LOG Prompt 11 |
| 12 | — | "Brands we carry" is `collectBrands` over the active products: Carlton · Nilkamal · Winsome · A & S Urbanseat | BUILD_LOG line 1569 |
| 15 | — | The listing's `?search=` filter uses the overlay's rule (name, tags, category name or slug, brand, short description): "table" 30 → 33 on the listing | BUILD_LOG lines 1946–2044 |
| 16 | — | `VariantSelector` follows the radio-group pattern (arrow keys, Home, End), which Prompt 04 observed missing | BUILD_LOG line 2084 |
| 17 | — | `parseSpecifications` and the specifications table: parsed pairs first, field rows after; a field row named like a pair is left out (the mattresses', Winsome tables' and plastic sofa's Brand pair) | BUILD_LOG Prompt 17; `productSpecs.js` |
| 19 | — | The offers page's department chips: "Sofas" shows the Nilkamal Plastic Sofa Set alone ("Showing 1 piece in Sofas.") | BUILD_LOG line 2592 |
| 28, 29 | — | "Made in our own workshop" kept to some pieces (`ABOUT_INTRO`, `HERO_SUPPORT_LINES[1]`: "Some …"); category and product copy is the client's (§39.9) | BUILD_LOG Prompts 28, 29; `DESIGN_SYSTEM.md` §39.9 |
| 32 | — | `metaTitle`/`metaDescription` are the product page's title and description; `Product` JSON-LD | BUILD_LOG Prompt 32 |
| 34 | `7cbe35d` | 55–57's "Overall size" put in L × W × H order; `00_INDEX.md` §6 lists "the single-product Plastic Sofas leaf" for the client | BUILD_LOG Prompt 34; `00_INDEX.md` line 195 |

The V2-03 prompt expects Prompts 29 and 32 to have edited catalogue data: as V2-02 found, they did not (`git log --full-history -- db.json`: Prompts 03, 04, 05, 34 and V2-02 only).

## 4. The reference site, re-checked on 2026-10-11

`/product/` and its 60 linked category and model pages were read (62 pages, all HTTP 200).

**Reference site changed since 2026-10-06: no range and no model was added or removed.** Every range and model in Prompt 04's inventory is still listed, in the same words; nothing was added to the catalogue from this check. Differences of wording the client may want to see (none changes what we seed):

- The Mattress range's "Popular styles" now read "All Brands, Carlton, Nilkamal" (Prompt 04 recorded "Carlton, Nilkamal"); "All Brands" names no model, as on the plastic-chair range.
- The site's model pages describe both alnas as a "storage cabinet" ("Durable iron storage cabinet", "Classic wooden storage cabinet"), and its rack page lists "Wooden Alna — Stylish wooden display rack". Prompt 04's inventory (and our gloss) reads alna as a clothes stand, its everyday meaning in Assam and Bengal. The client should confirm.
- The office-table model page is "Branded Office Table — Professional branded office table"; Winsome is named only in `/product/`'s "Company Made(Winsome)". The local tables are "Affordable locally made computer table", "Budget-friendly office table" and "Simple reading table for study": "locally made", not "made in our own workshop" (our attribution stays flagged).
- Every category page carries the same template block ("Own Manufacturing — Crafted in our workshop with strict quality control", "Industry-leading warranty on all products"), including the mattress, plastic-chair and plastic-sofa pages, so it is not evidence of what the workshop makes. Only the wooden sofa's own page says "crafted in our own workshop".
- Counts on `/product/` disagree with their own lists ("Dressing 3 / 4 products available", "Plastic Dining 2 / 4 products available"); the lists name four and two models.
- The site still claims "20+ Years Warranty", "Award Winning Designs", "Quality since 20+ years" and shows three testimonials; none is used (Prompt 04 guardrail 6). Its home page says "Partners with Carlton, Nilkamal, Winsome & more".

## 5. Requirement matrix

Status: `✅ Met` · `↪ Superseded by Prompt NN` (a recorded later decision, cited) · `❌ Gap` · `⚠ Partial`. "04:N" is a line of `prompts/04_catalogue-data-reference-site-ranges.md`, "03:" of Prompt 03; audit rule ids are listed in §7; `validate-db.js:N` lines are at the start of V2-03.

### 5.1 Depends on, context, objective and scope (04:5–22)

| # | Requirement (Prompt 04) | Current state | Status | Evidence |
|---|---|---|---|---|
| R1 | Depends on Prompt 03's tree, 46 products and validator (04:7) | present and re-verified by V2-02 | ✅ Met | V2-02 report; `validate-db.js` |
| R2 | Prompt 05 reseeds the collections that reference products (04:7) | done; full mode passes | ↪ Superseded by Prompt 05 (resolved) | BUILD_LOG Prompt 05; `node scripts/validate-db.js` ✓ |
| R3 | The site is the source of facts only, never of layout, design, images or copy (04:11) | no reference-site image; names, materials and brands follow the site's labels, the copy is our own | ✅ Met | audit I04 38/38; §4 compared with the copy |
| R4 | Every range the site lists that Prompt 03 did not cover becomes a category with the models the site lists (04:15) | 18 ranges, 38 models (§6); the site re-check finds nothing new | ✅ Met | R14–R36; §4 |
| R5 | Content only: exact field shapes, no schema change (04:15) | 12 category keys, 30 product keys, the variant keys in order | ✅ Met | audit CT01 26/26, K01–K04 38/38 |
| R6 | "…then finish cross-catalogue relations" (04:15) | relations exist everywhere they should, except the reading tables' bundles, which no chair returns (R158) | ⚠ Partial (R158) | audit R07, R08 |
| R7 | Run the validator and record the proof of coverage (04:15) | both done | ✅ Met | BUILD_LOG lines 379–422, 475–480 |
| R8 | Scope: append the two subtrees and the two Plastic groups (04:19) | ids 30–49 | ✅ Met | R37–R61 |
| R9 | Scope: append 38 products (04:19) | ids 47–84 | ✅ Met | audit G01 |
| R10 | Keep every Prompt 03 record; only its related and bundle ids may be extended (04:19) | only the bundle ids of 10 office chairs, appended | ✅ Met | field walk `6616837 → 4dd5cf2` (§2) |
| R11 | Extend `validate-db.js` to these ranges (04:20) | counts, tree, brands, leaf rule and variant rules asserted; most of the content rules not (R198) | ⚠ Partial (R198) | `validate-db.js:66–125, 259–265, 416, 449–466` |
| R12 | Do not touch `src/`, `public/`, `server.js`, `package.json` (04:22) | not touched | ✅ Met | `git show --stat 4dd5cf2` |
| R13 | Do not touch the other 15 collections (04:22) | unchanged | ✅ Met | per-collection SHA-256, `6616837` vs `4dd5cf2` |

### 5.2 What the reference site lists (04:24–49)

| # | Requirement (Prompt 04) | Current state | Status | Evidence |
|---|---|---|---|---|
| R14 | The site lists range names and one-line descriptions only: no prices, dimensions, colours, sizes or model numbers (04:26) | still so on 2026-10-11, so every name, price and specification is a placeholder | ✅ Met | §4 (62 pages) |
| R15 | Brands named on the site: Nilkamal (plastic sofa, mattress), Carlton (mattress), Winsome (tables); the rest "Local Made" (04:26) | the same; the home page adds "Partners with Carlton, Nilkamal, Winsome & more" | ✅ Met | §4 |
| R16 | Sofa: Wooden ("Own Manufacturing"), L Sofa, 5 Seater, 7 Seater (04:28) | 47, 48, 49, 50 | ✅ Met | §6; audit INV01 |
| R17 | Sofa Cum Bed: Steel, Wooden (04:29) | 51, 52 | ✅ Met | §6 |
| R18 | Center Table: Wooden (04:30) | 53 | ✅ Met | §6 |
| R19 | Showcase: Wooden (04:31) | 54 | ✅ Met | §6 |
| R20 | Bed: King, Queen, Single (04:32) | 55, 56, 57 | ✅ Met | §6 |
| R21 | Mattress: Carlton, Nilkamal (04:33) | 58, 59 | ✅ Met | §6 |
| R22 | Dressing: Plain, Big Size, Standing Mirror, Wall Mirror (04:34) | 60, 61, 62, 63 | ✅ Met | §6 |
| R23 | Bed Set Table (bedside table): Wooden, Particle Board (04:35) | 64, 65 | ✅ Met | §6 |
| R24 | Almari (almirah / wardrobe): Two Doors, 3 Doors (04:36) | 67, 68 | ✅ Met | §6 |
| R25 | Bed Table: Folding Bed Table (04:37) | 66 | ✅ Met | §6 |
| R26 | Alna (clothes stand): Iron, Wooden (04:38) | 69, 70 | ✅ Met | §6 |
| R27 | Rack: Steel, Wooden (04:39) | 71, 72 | ✅ Met | §6 |
| R28 | Dining: 4 Sitter, 6 Sitter, Marble (04:40) | 73, 74, 75 | ✅ Met | §6 |
| R29 | Office Table: Company Made (Winsome), Local Made (04:41) | 76, 77 | ✅ Met | §6 |
| R30 | Computer Table: Company Made (Winsome), Local Made (04:42) | 78, 79 | ✅ Met | §6 |
| R31 | Reading Table: Local Made, Company Made (Winsome) (04:43) | 81, 80 | ✅ Met | §6 |
| R32 | Plastic Dining: 6 Seater, 4 Seater (04:44) | 83, 82 | ✅ Met | §6 |
| R33 | Plastic Sofa: Nilkamal (04:45) | 84 | ✅ Met | §6 |
| R34 | Already covered by Prompt 03 (plastic chair, plastic centre tables, office chairs): not seeded again (04:46) | no duplicate | ✅ Met | audit G09 |
| R35 | Not on the site (café, waiting, lobby, swing, shoe rack): nothing seeded here (04:47) | none among 47–84 | ✅ Met | audit G09 |
| R36 | No range has more than ten models: every model seeded, nothing deferred (04:49) | 38 of 38 | ✅ Met | audit G01, G02 16/16 |

### 5.3 Categories to add (04:51–79)

| # | Requirement (Prompt 04) | Current state | Status | Evidence |
|---|---|---|---|---|
| R37 | Ids from 30 upward (04:51) | 30–49, contiguous; 43 categories in all | ✅ Met | audit CT11 |
| R38 | `showInMainMenu: false`, `menuOrder: 0` below department level (04:51) | 20 of 20 | ✅ Met | audit CT03 |
| R39 | 5 Home Furniture exists: id 5, menu 5, `home-furniture` (04:54) | unchanged since Prompt 03 (record byte-identical) | ✅ Met | audit CT12; field walk |
| R40 | Living Room, `living-room` (04:55) | 30 under 5, sort 1 | ✅ Met | audit CT02–CT10 |
| R41 | Sofas, `sofas` (04:56) | 31 under 30, sort 1 | ✅ Met | same |
| R42 | Sofa-cum-Beds, `sofa-cum-beds` (04:57) | 32 under 30, sort 2 | ✅ Met | same |
| R43 | Centre Tables & Showcases, `centre-tables-showcases` (04:58) | 33 under 30, sort 3 | ✅ Met | same |
| R44 | Bedroom, `bedroom` (04:59) | 34 under 5, sort 2 | ✅ Met | same |
| R45 | Beds, `beds` (04:60) | 35 under 34, sort 1 | ✅ Met | same |
| R46 | Mattresses, `mattresses` (04:61) | 36, sort 2 | ✅ Met | same |
| R47 | Dressing Tables & Mirrors, `dressing-tables-mirrors` (04:62) | 37, sort 3 | ✅ Met | same |
| R48 | Bedside & Bed Tables, `bedside-bed-tables` (04:63) | 38, sort 4 | ✅ Met | same |
| R49 | Almirahs, `almirahs` (04:64) | 39, sort 5 | ✅ Met | same |
| R50 | Alna Clothes Stands, `alna-clothes-stands` (04:65) | 40, sort 6 | ✅ Met | same |
| R51 | Dining Room, `dining-room` (04:66) | 41 under 5, sort 3 | ✅ Met | same |
| R52 | Dining Sets, `dining-sets` (04:67) | 42 under 41, sort 1 | ✅ Met | same |
| R53 | Storage, `storage` (04:68) | 43 under 5, sort 4 | ✅ Met | same |
| R54 | Racks, `racks` (04:69) | 44 under 43, sort 1 | ✅ Met | same |
| R55 | 6 Office Tables & Desks exists: id 6, menu 6, `office-tables-desks` (04:70) | unchanged since Prompt 03 | ✅ Met | audit CT12 |
| R56 | Office Tables, `office-tables` (04:71) | 45 under 6, sort 1 | ✅ Met | audit CT02–CT10 |
| R57 | Computer Tables, `computer-tables` (04:72) | 46, sort 2 | ✅ Met | same |
| R58 | Reading Tables, `reading-tables` (04:73) | 47, sort 3 | ✅ Met | same |
| R59 | 1 Plastic Furniture exists (04:74) | unchanged | ✅ Met | audit CT12 |
| R60 | Dining Sets, `plastic-dining-sets`, sibling of Essentials and Premium, sortOrder 3 (04:75) | 48 under 1, sort 3 | ✅ Met | audit CT02 |
| R61 | Sofas, `plastic-sofas`, sortOrder 4 (04:76) | 49 under 1, sort 4 | ✅ Met | audit CT02 |
| R62 | (Prompt 03) `sortOrder` counts from 1 within each parent | every parent (13) | ✅ Met | audit CT13 13/13 |
| R63 | Every leaf holds at least two products (04:79) | 15 of the 16 new leaves hold 2–4 | ✅ Met | audit CT14; browser: listing/* |
| R64 | …`plastic-sofas` holds one (the site lists one plastic sofa) | kept as Prompt 04 recorded ("Deviation… the tree and the 38-product count were kept as specified"), with the alternatives for the client; Prompt 07 (flyout "Sofas"), Prompt 19 (offers chip "Showing 1 piece in Sofas.") and Prompt 34 (`00_INDEX.md` §6, "the single-product Plastic Sofas leaf") build on it. Merging the leaf would change or retire the `plastic-sofas` URL; adding a model would invent one the site does not list | ↪ Recorded decision (Prompt 04 deviation, carried by Prompts 07, 19, 34) | BUILD_LOG line 377; line 904; line 2592; `00_INDEX.md` line 195 |
| R65 | Singletons from the site share a leaf: centre table + showcase, bedside tables + bed table (04:79) | 33 (53, 54), 38 (64, 65, 66) | ✅ Met | §6 |
| R66 | Record the tree-shaping decision in the build log (04:79) | recorded | ✅ Met | BUILD_LOG line 377 |
| R67 | (Prompt 03) Category description: one refined sentence | 20 of 20, one sentence, full stop, no hype | ✅ Met | audit CT06 |
| R68 | (Prompt 03 "specific"; §39.1 "say what is true") Category copy true to its products | **Found:** 47 Reading Tables says "Compact reading and study tables with a shelf for books", but 81 Workshop Reading Table has a drawer only ("Storage: 1 drawer"); the other 19 agree with their products (manual review of each description against its products' specifications) | ❌ Gap | `db.json` category 47, product 81 |
| R69 | (Guardrail 4) Local terms in category copy carry a gloss | 39 "almirahs (wardrobes)", 40 "Alna Clothes Stands"; **found:** 34 Bedroom says "almirahs" without one | ❌ Gap | audit CT07 (34) |
| R70 | (Prompt 03) Category image: a `1600x1000` placeholder in the tones, labelled with the slug's words | 20 of 20 | ✅ Met | audit CT09 |
| R71 | (Prompt 03) Dates: ISO, created ≤ updated ≤ now, created within six months of the build | created 2026-04-10, updated 2026-10-06 | ✅ Met | audit CT10 |

### 5.4 Products: the proof-of-coverage checklist (04:81–110), one row per product

Each row is every check of §7 for that product (the counts are its checks), plus its browser page.

| # | Site model → product | Leaf (id) · brand | Variants · price | Stock · flags · relations | Status | Evidence |
|---|---|---|---|---|---|---|
| R72 | Sofa → Wooden → **47 Wooden Sofa Set** | `sofas` (31) · A & S Urbanseat | Colour: Sand Beige / Slate Grey / Maroon · ₹32,999, was ₹37,999 | stock 22; featured; related 48, 49, 50, 53; bundle 53 | ✅ Met | audit 56/56; browser: product/wooden-sofa-set |
| R73 | Sofa → L-Shaped → **48 L-Shaped Sofa** | `sofas` (31) · A & S Urbanseat | Colour: Slate Grey / Sand Beige / Teal Blue · ₹44,999 | stock 21; trending; related 49, 50, 47, 53; bundle 53 | ⚠ Partial (R164) | audit 54/55; fails T05; browser: product/l-shaped-sofa |
| R74 | Sofa → 5 Seater → **49 5-Seater Sofa Set** | `sofas` (31) · A & S Urbanseat | Colour: Sand Beige / Slate Grey / Teal Blue · ₹38,999, was ₹44,999 | stock 24; no flags; related 50, 48, 47, 53; bundle 53 | ⚠ Partial (R164) | audit 55/56; fails T05; browser: product/5-seater-sofa-set |
| R75 | Sofa → 7 Seater → **50 7-Seater Sofa Set** | `sofas` (31) · A & S Urbanseat | Colour: Slate Grey / Sand Beige / Maroon · ₹58,999 | stock 16, Slate Grey 3 low; no flags; related 49, 48, 47, 54; bundle 53 | ⚠ Partial (R164) | audit 54/55; fails T05; browser: product/7-seater-sofa-set |
| R76 | Sofa Cum Bed → Steel → **51 Steel Sofa-cum-Bed** | `sofa-cum-beds` (32) · "" | Colour: Slate Grey / Maroon / Teal Blue · ₹15,999 | stock 28; hot; related 52, 47, 48, 53; bundle [] | ✅ Met | audit 55/55; browser: product/steel-sofa-cum-bed |
| R77 | Sofa Cum Bed → Wooden → **52 Wooden Sofa-cum-Bed** | `sofa-cum-beds` (32) · A & S Urbanseat | Colour: Sand Beige / Slate Grey · ₹28,999, was ₹32,999 | stock 13; no flags; related 51, 47, 49, 53; bundle [] | ⚠ Partial (R139) | audit 55/56; fails D10; browser: product/wooden-sofa-cum-bed |
| R78 | Center Table → Wooden → **53 Wooden Centre Table** | `centre-tables-showcases` (33) · A & S Urbanseat | Finish: Walnut / Natural Oak · ₹7,999 | stock 22; no flags; related 54, 47, 48, 49; bundle 47, 49 | ✅ Met | audit 55/55; browser: product/wooden-centre-table |
| R79 | Showcase → Wooden → **54 Wooden Showcase** | `centre-tables-showcases` (33) · A & S Urbanseat | Finish: Walnut / Teak · ₹18,999 | stock 13; no flags; related 53, 47, 50, 72; bundle [] | ⚠ Partial (R153) | audit 54/55; fails R03; browser: product/wooden-showcase |
| R80 | Bed → King → **55 King Size Bed** | `beds` (35) · A & S Urbanseat | Finish: Walnut / Wenge · ₹34,999, was ₹39,999 | stock 13; featured; related 56, 57, 58, 64; bundle 58, 64 | ✅ Met | audit 56/56; browser: product/king-size-bed |
| R81 | Bed → Queen → **56 Queen Size Bed** | `beds` (35) · A & S Urbanseat | Finish: Walnut / Natural Oak · ₹27,999 | stock 14; no flags; related 55, 57, 58, 64; bundle 58, 64 | ⚠ Partial (R186) | audit 55/56; fails D09; browser: product/queen-size-bed |
| R82 | Bed → Single → **57 Single Bed** | `beds` (35) · A & S Urbanseat | Finish: Walnut / Natural Oak · ₹13,999, was ₹15,999 | stock 19; no flags; related 56, 55, 59, 65; bundle 59, 65 | ✅ Met | audit 56/56; browser: product/single-bed |
| R83 | Mattress → Carlton → **58 Carlton Mattress** | `mattresses` (36) · Carlton | Size: Single / Double / Queen / King · ₹8,999 / ₹14,999 / ₹19,999 / ₹23,999 | stock 35, King 4 low; no flags; related 59, 55, 56, 57; bundle 55, 56 | ⚠ Partial (R140) | audit 54/55; fails D04; browser: product/carlton-mattress |
| R84 | Mattress → Nilkamal → **59 Nilkamal Mattress** | `mattresses` (36) · Nilkamal | Size: Single / Double / Queen / King · ₹5,599 / ₹9,499 / ₹12,499 / ₹14,999 | stock 50; trending; related 58, 56, 57, 55; bundle 56, 57 | ⚠ Partial (R140) | audit 54/55; fails D04; browser: product/nilkamal-mattress |
| R85 | Dressing → Plain → **60 Plain Dressing Table** | `dressing-tables-mirrors` (37) · A & S Urbanseat | Finish: Walnut / Frosty White · ₹7,499 | stock 22; no flags; related 61, 62, 63, 67; bundle [] | ⚠ Partial (R142, R164) | audit 53/55; fails Z04, T05; browser: product/plain-dressing-table |
| R86 | Dressing → Big Size → **61 Large Dressing Table** | `dressing-tables-mirrors` (37) · A & S Urbanseat | Finish: Walnut / Wenge · ₹15,999, was ₹17,999 | stock 13; no flags; related 60, 62, 63, 68; bundle [] | ⚠ Partial (R164) | audit 55/56; fails T05; browser: product/large-dressing-table |
| R87 | Dressing → Standing Mirror → **62 Standing Mirror** | `dressing-tables-mirrors` (37) · A & S Urbanseat | Finish: Walnut / Natural Oak · ₹5,499 | stock 18; no flags; related 63, 60, 61, 70; bundle [] | ⚠ Partial (R186, R164) | audit 54/56; fails D09, T05; browser: product/standing-mirror |
| R88 | Dressing → Wall Mirror → **63 Wall Mirror** | `dressing-tables-mirrors` (37) · A & S Urbanseat | Finish: Walnut / Frosty White · ₹2,799 | stock 30; no flags; related 62, 60, 61, 64; bundle [] | ⚠ Partial (R142, R164) | audit 53/55; fails Z04, T05; browser: product/wall-mirror |
| R89 | Bed Set Table → Wooden → **64 Wooden Bedside Table** | `bedside-bed-tables` (38) · A & S Urbanseat | Finish: Walnut / Natural Oak · ₹4,499 | stock 25; no flags; related 65, 66, 55, 56; bundle 55 | ✅ Met | audit 55/55; browser: product/wooden-bedside-table |
| R90 | Bed Set Table → Particle Board → **65 Particle-Board Bedside Table** | `bedside-bed-tables` (38) · "" | Finish: Walnut / Frosty White · ₹2,499, was ₹2,899 | stock 31; no flags; related 64, 66, 57, 56; bundle 57 | ⚠ Partial (R142) | audit 55/56; fails Z04; browser: product/particle-board-bedside-table |
| R91 | Bed Table → Folding → **66 Folding Bed Table** | `bedside-bed-tables` (38) · "" | Colour: Natural Oak / Matte Black · ₹1,899 | stock 40; no flags; related 64, 65, 57, 59; bundle [] | ⚠ Partial (R164) | audit 54/55; fails T05; browser: product/folding-bed-table |
| R92 | Almari → Two Doors → **67 Two-Door Almirah** | `almirahs` (39) · A & S Urbanseat | Finish: Walnut / Wenge · ₹12,999 | stock 16; no flags; related 68, 70, 69, 60; bundle [] | ⚠ Partial (R164) | audit 55/56; fails T05; browser: product/two-door-almirah |
| R93 | Almari → 3 Doors → **68 Three-Door Almirah** | `almirahs` (39) · A & S Urbanseat | Finish: Walnut / Wenge · ₹21,999, was ₹24,999 | stock 6, Wenge sold out; featured; related 67, 70, 61, 55; bundle [] | ⚠ Partial (R164) | audit 56/57; fails T05; browser: product/three-door-almirah |
| R94 | Alna → Iron → **69 Iron Alna (Clothes Stand)** | `alna-clothes-stands` (40) · "" | `[]` · ₹1,699 | stock 34; no flags; related 70, 67, 68, 71; bundle [] | ⚠ Partial (R186, R153) | audit 54/56; fails D09, R03; browser: product/iron-alna-clothes-stand |
| R95 | Alna → Wooden → **70 Wooden Alna (Clothes Stand)** | `alna-clothes-stands` (40) · A & S Urbanseat | `[]` · ₹4,299 | stock 14; no flags; related 69, 67, 68, 62; bundle [] | ✅ Met | audit 55/55; browser: product/wooden-alna-clothes-stand |
| R96 | Rack → Steel → **71 Steel Storage Rack** | `racks` (44) · "" | Shelves: 3 shelves / 4 shelves / 5 shelves · ₹3,199 / ₹3,799 / ₹4,499 | stock 45; no flags; related 72, 69, 67, 54; bundle [] | ✅ Met | audit 55/55; browser: product/steel-storage-rack |
| R97 | Rack → Wooden → **72 Wooden Storage Rack** | `racks` (44) · A & S Urbanseat | Shelves: 3 shelves / 4 shelves / 5 shelves · ₹5,499 / ₹6,999 / ₹8,499 | stock 18, 5 shelves sold out; no flags; related 71, 54, 53, 67; bundle [] | ⚠ Partial (R139) | audit 54/55; fails D10; browser: product/wooden-storage-rack |
| R98 | Dining → 4 Sitter → **73 4-Seater Dining Set** | `dining-sets` (42) · A & S Urbanseat | Finish: Walnut / Natural Oak · ₹21,999 | stock 15; no flags; related 74, 75, 54, 72; bundle [] | ✅ Met | audit 55/55; browser: product/4-seater-dining-set |
| R99 | Dining → 6 Sitter → **74 6-Seater Dining Set** | `dining-sets` (42) · A & S Urbanseat | Finish: Walnut / Teak · ₹34,999, was ₹39,999 | stock 13; featured; related 75, 73, 54, 72; bundle [] | ✅ Met | audit 56/56; browser: product/6-seater-dining-set |
| R100 | Dining → Marble → **75 Marble-Top Dining Set** | `dining-sets` (42) · A & S Urbanseat | Finish: Walnut / Wenge · ₹54,999 | stock 8, Walnut 2 low; hot; related 74, 73, 54, 53; bundle [] | ✅ Met | audit 55/55; browser: product/marble-top-dining-set |
| R101 | Office Table → Company Made (Winsome) → **76 Winsome Office Table** | `office-tables` (45) · Winsome | Size: 120 × 60 cm / 150 × 75 cm · ₹12,999 / ₹16,999 | stock 15; featured; related 77, 78, 80, 79; bundle 29, 31 | ⚠ Partial (R139, R164) | audit 56/58; fails D10, T05; browser: product/winsome-office-table |
| R102 | Office Table → Local Made → **77 Workshop Office Table** | `office-tables` (45) · A & S Urbanseat | Size: 120 × 60 cm / 150 × 75 cm · ₹8,999 / ₹11,999 | stock 19; no flags; related 76, 79, 81, 78; bundle 21, 22 | ⚠ Partial (R164) | audit 57/58; fails T05; browser: product/workshop-office-table |
| R103 | Computer Table → Company Made (Winsome) → **78 Winsome Computer Table** | `computer-tables` (46) · Winsome | Size: 90 × 60 cm / 120 × 60 cm · ₹8,499 / ₹10,999, was ₹9,499 | stock 21; trending; related 79, 76, 80, 77; bundle 33 | ⚠ Partial (R139, R164) | audit 56/58; fails D10, T05; browser: product/winsome-computer-table |
| R104 | Computer Table → Local Made → **79 Workshop Computer Table** | `computer-tables` (46) · A & S Urbanseat | Size: 90 × 60 cm / 120 × 60 cm · ₹5,999 / ₹7,499 | stock 24; no flags; related 78, 77, 81, 76; bundle 24 | ⚠ Partial (R164) | audit 56/57; fails T05; browser: product/workshop-computer-table |
| R105 | Reading Table → Company Made (Winsome) → **80 Winsome Reading Table** | `reading-tables` (47) · Winsome | Size: 75 × 50 cm / 90 × 60 cm · ₹5,999 / ₹7,499 | stock 23; no flags; related 81, 78, 79, 76; bundle 25 | ⚠ Partial (R139, R164, R158) | audit 53/57; fails D10, T05, R07, R08; browser: product/winsome-reading-table |
| R106 | Reading Table → Local Made → **81 Workshop Reading Table** | `reading-tables` (47) · A & S Urbanseat | Size: 75 × 50 cm / 90 × 60 cm · ₹4,199 / ₹5,299, was ₹4,799 | stock 28; no flags; related 80, 79, 78, 77; bundle 25 | ⚠ Partial (R164, R158) | audit 55/58; fails T05, R07, R08; browser: product/workshop-reading-table |
| R107 | Plastic Dining → 4 Seater → **82 4-Seater Plastic Dining Set** | `plastic-dining-sets` (48) · Nilkamal | Colour: Marble Beige / Coffee Brown / White · ₹5,999 | stock 42; no flags; related 83, 84, 4, 7; bundle [] | ✅ Met | audit 55/55; browser: product/4-seater-plastic-dining-set |
| R108 | Plastic Dining → 6 Seater → **83 6-Seater Plastic Dining Set** | `plastic-dining-sets` (48) · Nilkamal | Colour: Marble Beige / Coffee Brown · ₹9,999, was ₹10,999 | stock 22; no flags; related 82, 84, 6, 8; bundle [] | ✅ Met | audit 56/56; browser: product/6-seater-plastic-dining-set |
| R109 | Plastic Sofa → Nilkamal → **84 Nilkamal Plastic Sofa Set** | `plastic-sofas` (49) · Nilkamal | Colour: Coffee Brown / Marble Beige / Pearl Grey · ₹12,999, was ₹14,999 | stock 24; trending; related 82, 83, 12, 17; bundle 17 | ✅ Met | audit 56/56; browser: product/nilkamal-plastic-sofa-set |

| # | Requirement (Prompt 04) | Current state | Status | Evidence |
|---|---|---|---|---|
| R110 | Names are the site's facts in the A & S Urbanseat voice; material and size kept; "Company Made"/"Local Made" dropped from names (04:83) | every name as the table gives it; no label in any name | ✅ Met | audit INV01, N02 38/38 |
| R111 | "Made in our own workshop" only for own manufacturing / Local Made, and flagged (04:83) | 47, 77, 79, 81 (copy, meta description, the "workshop made" tag, the "Workshop …" names); nowhere else; flagged | ✅ Met | audit D08 38/38; BUILD_LOG lines 429, 494–506 |
| R112 | 38 products (04:110) | 38 (ids 47–84) on the 16 leaves | ✅ Met | audit G01, G02 16/16 |
| R113 | Reproduce the table with final ids in the build log (04:110) | present | ✅ Met | BUILD_LOG lines 379–422 |
| R114 | The validator asserts the per-slug counts (04:110) | `COVERAGE` | ✅ Met | `validate-db.js:66–101, 436–455` |

### 5.5 Brand and design requirements (04:112–122)

| # | Requirement (Prompt 04, and Prompt 03's content rules it inherits) | Current state | Status | Evidence |
|---|---|---|---|---|
| R115 | Exact field shapes and key order (04:116) | 30 keys in order; variant keys in order | ✅ Met | audit K01–K04 |
| R116 | `rating: 0`, `totalReviews: 0` (04:116) | 0 at `4dd5cf2`; Prompt 05 set 47, 55, 58, 64, 74, 76, 81 from approved reviews; they agree | ↪ Superseded by Prompt 05 (V2-04 owns them) | field walk; audit (rating drift: none) |
| R117 | Prices are INR placeholders, flagged (04:117) | flagged | ✅ Met | BUILD_LOG lines 436–438, 494–506 |
| R118 | Sofas ₹18,000–₹65,000 | ₹32,999–₹58,999 | ✅ Met | audit M07 |
| R119 | Sofa-cum-beds ₹14,000–₹35,000 | ₹15,999, ₹28,999 | ✅ Met | audit M07 |
| R120 | Centre table and showcase ₹6,000–₹22,000 | ₹7,999, ₹18,999 | ✅ Met | audit M07 |
| R121 | Beds ₹12,000–₹45,000 | ₹13,999–₹34,999 | ✅ Met | audit M07 |
| R122 | Mattresses ₹5,500–₹25,000 by size | Carlton ₹8,999 / 14,999 / 19,999 / 23,999; Nilkamal ₹5,599 / 9,499 / 12,499 / 14,999 | ✅ Met | audit M07, V03 |
| R123 | Dressing tables ₹6,000–₹18,000 | ₹7,499, ₹15,999 | ✅ Met | audit M07 |
| R124 | Mirrors ₹2,500–₹7,000 | ₹5,499, ₹2,799 | ✅ Met | audit M07 |
| R125 | Bedside and bed tables ₹1,800–₹6,000 | ₹4,499, ₹2,499, ₹1,899 | ✅ Met | audit M07 |
| R126 | Almirahs ₹9,000–₹25,000 | ₹12,999, ₹21,999 | ✅ Met | audit M07 |
| R127 | Alna ₹1,500–₹5,000 | ₹1,699, ₹4,299 | ✅ Met | audit M07 |
| R128 | Racks ₹3,000–₹9,000 | ₹3,199–₹4,499; ₹5,499–₹8,499 | ✅ Met | audit M07 |
| R129 | Dining sets ₹15,000–₹60,000, marble highest | ₹21,999, ₹34,999, ₹54,999 (marble) | ✅ Met | audit M07 |
| R130 | Office, computer and reading tables ₹4,000–₹18,000, Winsome above workshop | ₹4,199–₹16,999; per size, Winsome above workshop in all three pairs (₹12,999/16,999 vs 8,999/11,999; 8,499/10,999 vs 5,999/7,499; 5,999/7,499 vs 4,199/5,299) | ✅ Met | audit M07; data |
| R131 | Plastic dining sets ₹5,000–₹11,000 | ₹5,999, ₹9,999 | ✅ Met | audit M07 |
| R132 | Plastic sofa ₹9,000–₹16,000 | ₹12,999 | ✅ Met | audit M07 |
| R133 | (Prompt 03) Round figures ending 49/99/00 | every price, compare-at and variant price ends in 99 | ✅ Met | audit M06 |
| R134 | (Prompt 03) `comparePrice` on roughly a third, 10–20% above | 13 of 38 (34%), 10.0–16.0% above | ✅ Met | audit G05, M04 13/13 |
| R135 | (Prompt 03) `costPrice` ≈ 60–70% of price | 60.6–68.2% | ✅ Met | audit M05 |
| R136 | Descriptions end with the `Specifications:` paragraph in Prompt 03's exact format (04:118) | 38 of 38 | ✅ Met | audit D03 |
| R137 | 5–7 pairs (04:118) | six each | ✅ Met | audit D02 |
| R138 | (V2-03) Parsed correctly by the product page's parser | the app's `parseSpecifications` reads 2 paragraphs and 6 pairs; the page's table starts with those pairs; no row name twice | ✅ Met | audit D02, APP5 38/38; browser: product/* 38/38 |
| R139 | The pairs cover material, finish, size, seating/sleeping capacity, weight capacity and care, where each applies (04:118) | material, size and care everywhere; capacity on every seat and bed; finish stated or chosen as an option. **Found:** 52 Wooden Sofa-cum-Bed gives no capacity (its sibling 51 gives "Sleeping capacity: 2"); 72 Wooden Storage Rack and the three Winsome tables 76, 78, 80 give no weight capacity, which the other piece of the same leaf gives (71 "50 kg per shelf"; 77, 79, 81 "40 / 30 / 25 kg on top") | ❌ Gap | audit D10 (52, 72, 76, 78, 80) |
| R140 | (Prompt 03) Measurements hedged with "approx." | every cm and kg value. **Found:** the mattresses' "Sizes: Single 36 × 78, Double 48 × 78, Queen 60 × 78, King 72 × 78 in" (58, 59) give inch sizes without "approx." (V2-02's F4) | ❌ Gap | audit D04 (58, 59) |
| R141 | (V2-03) Consistent with `dimensions` and `weight` | every "Overall size", "Three-seater size", "Sofa size", "Table size", "Top size" + "Height", "Width × depth" + "Height", "Sizes … high", "Thickness" and "Mattress size" agrees with the fields; no "Weight" pair | ✅ Met | audit Z01 38/38 |
| R142 | (Prompt 03 "specific"; V2-02's R110 standard) Copy true to the record's own options | **Found:** 60 Plain Dressing Table "Finish: Laminated wood grain", 63 Wall Mirror and 65 Particle-Board Bedside Table "Finish: Wood-grain laminate", while one of their two Finish options is Frosty White, a plain white; the table prints that row under a chosen "Frosty White" | ❌ Gap | audit Z04 (60, 63, 65) |
| R143 | Mattress copy makes no orthopaedic or medical claim (04:118) | none; the prompt's grep (`orthop|spine|medical|doctor|therapeutic|back pain`) finds nothing in product copy | ✅ Met | audit D07 38/38, D12; `grep -niE` over `db.json` hits only review 11's title (§11, F3) |
| R144 | (Prompt 03) `shortDescription` ≤ 110 characters | 61–86 | ✅ Met | audit D01 |
| R145 | (Prompt 03) 2–3 short paragraphs in the brand voice | two prose paragraphs each | ✅ Met | audit D02; browser: product/* |
| R146 | (Prompt 03; guardrail 6) No certification, warranty or years-in-business claim | none | ✅ Met | audit D05 |
| R147 | (Prompt 03; §39.2) No "!" and no hype word | none | ✅ Met | audit D06 |
| R148 | Images: Prompt 03's placeholder scheme and tones, three each, labelled name / Detail / In situ (04:119) | 114 of 114 | ✅ Met | audit I01–I03 |
| R149 | (Prompt 03) Never the reference site's images | none | ✅ Met | audit I04 |
| R150 | `featured` on 4–6, so the home page mixes home and office pieces (04:120) | 5: 47, 55, 68, 74 (home), 76 (office) | ✅ Met | audit F01. The home Featured rail in JSON Server mode shows the first 8 featured in catalogue order, all Prompt 03's (§11, F5) |
| R151 | `trending` on 3–4 | 4: 48, 59, 78, 84 | ✅ Met | audit F02 |
| R152 | `hot` on 1–2 | 2: 51, 75 | ✅ Met | audit F03 |
| R153 | `relatedProductIds` within the room/department (04:121) | Home pieces within their room, the rest within their department; rooms with fewer than four pieces (Dining 3, Storage 2) name all their own first, then pieces of the department. **Found:** 54 Wooden Showcase names 72 (Storage) and 69 Iron Alna names 71 (Storage), though the Living Room holds 8 pieces and the Bedroom 16 | ❌ Gap | audit R03 (54, 69) |
| R154 | (Prompt 03) Related: 3–5 ids, existing, active, never self, no duplicates | 4 each | ✅ Met | audit R01, R02 |
| R155 | (Prompt 04's recorded convention) Related ordered same leaf first | 38 of 38 | ✅ Met | audit R04 |
| R156 | `frequentlyBoughtTogetherIds` for natural bundles only; dining set + centre table is not one (04:121) | sofa → centre table, centre table → sofas, bed → mattress + bedside table, mattress → beds, bedside → bed, desk → office chair, plastic sofa → plastic centre table; `[]` elsewhere (dining sets included) | ✅ Met | audit R06 38/38 |
| R157 | (Prompt 03) Bundles of 1–2 ids, `[]` elsewhere | 0–2 | ✅ Met | audit R05 |
| R158 | Office table + office chair across departments; extend Prompt 03's chairs (office chair → office table) (04:121); "in both directions" (V2-03) | every desk names a chair and every high- and low-back chair names a desk (R09 10/10); 76 ↔ 29, 31, 77 ↔ 21, 22, 78 ↔ 33 and 79 ↔ 24 are mutual. **Found:** the reading tables 80 and 81 both name 25, which names 79 instead, so no chair names a reading table; 25 → 79 is one-way while 79 has a free slot | ❌ Gap | audit R07 (25 → 79, 80 → 25, 81 → 25), R08 (80, 81) |
| R159 | Distinct non-empty brands after this prompt: A & S Urbanseat, Nilkamal, Carlton, Winsome (04:122) | exactly those four | ✅ Met | audit G04; browser: home/brands we carry |
| R160 | Flag the A & S Urbanseat (own manufacturing) attribution (04:122) | flagged | ✅ Met | BUILD_LOG lines 494–506 |
| R161 | (V2-03) Brand per product exactly as the table maps it | 38 of 38 | ✅ Met | audit B01 |
| R162 | (Prompt 03) The brand is also a lowercase tag | 33 branded, 33 tagged | ✅ Met | audit B02 |
| R163 | (Prompt 03) Tags lowercase, with the type | 38 of 38 | ✅ Met | audit T01, T03 |
| R164 | (Prompt 03) Tags include the material | 22 name a material ("wooden", "steel", "iron", "particle board", "marble", "plastic", or inside "wooden sofa", "foam mattress", "steel rack", "wooden rack"). **Found:** 16 name none: 48, 49, 50, 60, 61, 62, 63, 66, 67, 68, 76, 77, 78, 79, 80, 81 (V2-02's F3, which counted 22 by exact one-word tags; its list holds 21) | ❌ Gap | audit T05 (16) |
| R165 | (V2-03) Variants as the table specifies | Colour 2–3 on the sofas and sofa-cum-beds; Finish × 2 on every wood piece; Colour on the folding bed table and the plastic sets; Size × 4 on the mattresses; Shelves × 3 on the racks; Size × 2 on the tables; none on the alnas | ✅ Met | audit V01 38/38 |
| R166 | (Prompt 03) Colour and finish options share one price; each has a swatch the selector shows | 26 of 26 | ✅ Met | audit V02, V05; browser: variants/sofa colours |
| R167 | Mattresses: `attributes.Size` Single, Double, Queen, King with per-variant price, SKU and stock, price rising | both; `-SGL/-DBL/-QN/-KG` | ✅ Met | audit V01, V03, N06; browser: variants/mattress sizes |
| R168 | Racks: `attributes.Shelves` 3 / 4 / 5 with rising price | both | ✅ Met | audit V01, V03; browser: variants/rack shelves, steel rack shelves |
| R169 | Office, computer and reading tables: Size × 2, rising | all six | ✅ Met | audit V01, V03; browser: variants/winsome table sizes |
| R170 | Alna: no variants (`[]`) | 69, 70 | ✅ Met | audit V01; browser: variants/alna none |
| R171 | Beds' storage option only as a plain attribute with its own price | not used (Finish only) | ✅ Met | data |
| R172 | (V2-02) One hex per colour or finish name across the catalogue | e.g. Walnut `#5c3d2e`, Natural Oak `#c49a6c`, Coffee Brown `#6b4a33` | ✅ Met | audit G08 |
| R173 | (Prompt 03) A variant's name equals its attribute value; its SKU is the product's plus a code | 85 of 85 | ✅ Met | audit V04, N06 |
| R174 | (Prompt 03) `price` = the lowest variant price; the card and quick add show and charge it | 38 of 38 by `getProductMinPrice` and `buildCartItem` | ✅ Met | audit M01, M02 |
| R175 | (Prompt 03) `stock` = Σ variant stock; `lowStockThreshold` 3–8 (8 below ₹3,000, 6 from ₹3,000, 5 from ₹9,000) | 38 of 38 | ✅ Met | audit S01, S02 |
| R176 | (Prompt 03; guardrail 6) Stock realistic, with a few low-stock and sold-out variants | in-stock options 6–22 units, the alnas 34 and 14; low: 50 Slate Grey 3/5, 58 King 4/6, 75 Walnut 2/5; sold out: 68 Wenge, 72 "5 shelves" | ✅ Met | audit S03, G06; browser: variants/* |
| R177 | (Prompt 03) Names ≤ 48 characters | 10–28 | ✅ Met | audit N01 |
| R178 | (Prompt 03) Slugs by `slugify()` | 38 of 38 | ✅ Met | audit N03 |
| R179 | (Prompt 03; Prompt 04's convention) SKUs unique and uppercase; `LIV-`, `BED-`, `DIN-`, `STO-`, `OFT-`, `PLD-`, `PLS-` | all | ✅ Met | audit N04, N05, G07 |
| R180 | (Prompt 32) `metaTitle` "<name> \| A & S Urbanseat", `metaDescription` ≤ 160 characters | 93–118 characters | ✅ Met | audit D11 |
| R181 | (Prompt 03) Dates ISO, within the six months before the build | created 2026-05-06 → 2026-08-29, updated ≤ 2026-10-02 | ✅ Met | audit DT01, DT02 |

### 5.6 Functional guardrails (04:124–132)

| # | Guardrail | Current state | Status | Evidence |
|---|---|---|---|---|
| R182 | 1. Content only; the validator's key-set check passes for all 84 products and all categories | passes | ✅ Met | `node scripts/validate-db.js --catalogue` ✓ |
| R183 | 2. Placeholder tones from `DESIGN_SYSTEM.md` only | `f1ebe1`/`686158` everywhere | ✅ Met | R70, R148 |
| R184 | 3. Admin untouched; Products and Categories open every record | every new category and product opens with its name, SKU and every variant; saving without a change alters only the `updatedAt` the mock stamps | ✅ Met | browser: admin/categories open (20/20), admin/products open (38/38); the save pass (§1) |
| R185 | 4. Names and copy in the A & S Urbanseat voice | yes (R147) | ✅ Met | audit D06 |
| R186 | 4. Local terms ("Almirah", "Alna", "Jhula") keep a plain-English gloss in the name or description | the almirahs gloss "(wardrobe)" and the alnas carry "(Clothes Stand)". **Found:** three other products use "almirah" with no gloss in their own name or description: 56 Queen Size Bed, 62 Standing Mirror, 69 Iron Alna; and category 34 (R69) | ❌ Gap | audit D09 (56, 62, 69) |
| R187 | 5. Names ≤ 48 characters | yes (R177) | ✅ Met | audit N01 |
| R188 | 6. No warranty or "20+ years" claim in product copy | none | ✅ Met | audit D05 |
| R189 | 6. Stock realistic, a few low and sold out | yes (R176) | ✅ Met | audit G06 |
| R190 | 7. Test before done | Prompt 04 recorded the validator, build, tests and Chromium; V2-03 re-runs them | ✅ Met | BUILD_LOG lines 475–492; §1 |

### 5.7 Implementation notes (04:134–139)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R191 | 1. Read the index, build log, design system, `db.json` and the validator | the entry reflects them (id plan, image pattern, Prompt 03's thresholds) | ✅ Met | BUILD_LOG lines 337–506 |
| R192 | 2. Generate with a script; append; never renumber; product ids continue from 47 | 47–84 after 1–46; 30–49 after 1–29 | ✅ Met | field walk (§2) |
| R193 | (Prompt 03) 2-space JSON like the file | `JSON.stringify(JSON.parse(file), null, 2)` reproduces it byte for byte (313,328 bytes, no trailing newline) | ✅ Met | round-trip check |
| R194 | 3. `--catalogue` passes with 84 products and all categories | passes | ✅ Met | §1 |
| R195 | 4. `getMainMenuCategories` → six departments | `1 plastic-furniture · 2 office-chairs · 3 cafe-restaurant-chairs · 4 outdoor-furniture · 5 home-furniture · 6 office-tables-desks` | ✅ Met | audit APP1 (output in §7) |
| R196 | 4. `orderCategoriesHierarchically` → departments followed by their children, in order | `1,10,11,12,13,14,15,16,17,18,48,49,2,20,…,27,3,4,5,30,31,32,33,34,…,40,41,42,43,44,6,45,46,47`, depths consistent | ✅ Met | audit APP2 (output in §7) |
| R197 | 4. The header shows the flat menu; Prompt 07 builds the flyouts from this tree | built | ↪ Superseded by Prompt 07 (done) | browser: menu/flyout home-furniture, office-tables-desks, plastic-furniture |
| R198 | (V2) The validator asserts every machine-checkable Prompt 04 rule | **Found, not asserted:** the 20 categories' names, slugs, parents and ids (TREE checks parent and sort only); the price bands, Winsome above workshop and marble highest; the brand of each product; each line's variants (VARIANT_RULES covers 3 leaf types; sofas, finishes, alna `[]` not); the type and material tags; the workshop claim and the site's labels; the local-term gloss; hedged inches; the specification topics; finish pairs against the options; related within the room; bundle kinds and both directions; the flag counts among the 38; the compare-at share, low and sold-out counts among the 38; the window for their dates; the names of the checklist; category copy's local terms | ❌ Gap | `validate-db.js` read in full |

### 5.8 Acceptance criteria (04:141–147)

| # | Criterion | Current state | Status | Evidence |
|---|---|---|---|---|
| R199 | All ranges exist as categories with ≥ 2 products per leaf; the six departments unchanged in id, slug and menu order | yes, with `plastic-sofas` under its recorded decision (R64) | ✅ Met | R16–R36, R63, R64; audit CT12 |
| R200 | 84 active products; the 38 match the checklist; `--catalogue` passes | yes | ✅ Met | audit G01, INV01; §1 |
| R201 | Brand values limited to the four brands and `""` | yes | ✅ Met | audit G04 |
| R202 | `home-furniture` lists every home piece; `bedroom` only bedroom pieces; mattress sizes change the price | 29 and 16, name by name; ₹8,999 → ₹14,999 → ₹19,999 → ₹23,999 | ✅ Met | audit APP3; browser: listing/home-furniture, listing/bedroom, variants/mattress sizes |
| R203 | Admin → Categories shows the full tree; Products opens any new product | 43 rows; 38 of 38 open | ✅ Met | browser: admin/* |

### 5.9 Test and QA (04:149–156)

| # | Step | Result (V2-03 baseline pass) | Status | Evidence |
|---|---|---|---|---|
| R204 | 1. `/products` (84, pagination), each new leaf, a sofa, a mattress, a rack, a Winsome table, add to cart and the drawer, search "almirah" and "table" | "Showing 1–12 of 84" → "13–24 of 84"; 16 leaves and 7 parents equal to the data; the four product pages; two drawer lines; "almirah" 2, "table" 33 (30 at Prompt 04: Prompt 15 aligned the listing with the overlay) | ✅ Met | browser: listing/*, product/*, variants/*, cart/*, search/* |
| R205 | 2. 360, 768, 1024, 1440: the listing lays out with the longer category list | no overflow; all 43 categories in the filter rail (sheet below 1024); 4:5 product images | ✅ Met | browser: width/* (8) |
| R206 | 3. Keyboard: category filters and variant tiles | a department's disclosure opens with Enter and a category toggles with Space (focus ring shown); ArrowRight and End move the variant choice (Prompt 04 saw arrows fail; Prompt 16 fixed the selector) | ✅ Met | browser: keyboard/category filter, variants/keyboard |
| R207 | 4. Build passes; tests exit 0 | yes | ✅ Met | §1 |
| R208 | 5. Admin regression as in Prompt 03 | tree, edit dialogs, save without change | ✅ Met | browser: admin/* |
| R209 | 6. The build-log entry under `## Prompt 04 — Catalogue data II` | present | ✅ Met | BUILD_LOG line 337 |

### 5.10 What the Prompt 04 build-log entry had to contain (04:110, 04:156)

| # | Item | Current state | Status | Evidence |
|---|---|---|---|---|
| R210 | The checklist with final ids | present | ✅ Met | BUILD_LOG lines 379–422 |
| R211 | The tree-shaping decision | present, with the `plastic-sofas` deviation | ✅ Met | BUILD_LOG line 377 |
| R212 | The brand mapping | present | ✅ Met | BUILD_LOG lines 451–460 |
| R213 | The prices used | present | ✅ Met | BUILD_LOG line 438 |
| R214 | "Needs client confirmation": all names, prices, specifications, the own-manufacturing attribution, Nilkamal on the plastic dining sets | present | ✅ Met | BUILD_LOG lines 494–506 |
| R215 | (V2) The entry's figures are accurate | all checked; one is off: "`costPrice` is about 65–70% of price" (it is 60.6–68.2%: 66 Folding Bed Table 60.6%, 69 Iron Alna 61.8%, six more below 65%) | ⚠ Partial | audit M05; BUILD_LOG line 438 |

### 5.11 Deep checks of the V2-03 prompt not already rows above

| # | Check | Current state | Status | Evidence |
|---|---|---|---|---|
| R216 | Product names match the table unless a later prompt recorded a rename | all 38 as the table names them; no later rename | ✅ Met | audit INV01 |
| R217 | No café, waiting, lobby, swing or shoe-rack product added here | none | ✅ Met | audit G09 |
| R218 | Departments 5 and 6 unchanged in id, slug and menu order | records byte-identical to Prompt 03's | ✅ Met | audit CT12; field walk |
| R219 | Distinct non-empty brands across the whole catalogue: exactly the four | yes | ✅ Met | audit G04, G10 |
| R220 | The site's labels "Company Made" / "Local Made" never appear verbatim | nowhere in `db.json` | ✅ Met | audit D13 |
| R221 | Every relation id exists and is active, never self, no duplicates | 38 of 38; the 10 chairs too | ✅ Met | audit R02; `validate-db.js:419–431` |
| R222 | "Brands we carry" shows exactly the four brands | Carlton · Nilkamal · Winsome · A & S Urbanseat | ✅ Met | browser: home/brands we carry |
| R223 | Search "almirah", "alna", "table", "mattress" | 2 (67, 68) · 2 (69, 70) · 33 · 5 (58, 59 and the three beds sized for a mattress), each equal to the data | ✅ Met | browser: search/* |
| R224 | Mega-menu flyouts show the new subtrees | Home: 15 links in four groups; Office Tables & Desks: three; Plastic: Dining Sets and Sofas after Essentials and Premium | ✅ Met | browser: menu/flyout * |
| R225 | Console clean | 0 errors or warnings over the pass | ✅ Met | browser: console |
| R226 | Identity stability (frozen ids, slugs, SKUs, variant ids, key sets and order, collections) | baseline snapshot written | ✅ Met (proof after the repair, §9) | audit `--identity` |
| R227 | Beds' "Overall size" in L × W × H order | Prompt 34 corrected 55–57; they agree with the fields | ✅ Met | audit Z01; BUILD_LOG Prompt 34, fix 13 |
| R228 | Specifications by the app's parser equal the product page's table | 38 of 38 | ✅ Met | browser: product/* (spec rows) |

**Totals, counted from the tables (as found).** 228 requirements: ✅ Met 187 · ↪ Superseded 4 (R2, R64, R116, R197) · ❌ Gap 10 (R68, R69, R139, R140, R142, R153, R158, R164, R186, R198) · ⚠ Partial 27 (R6, R11, R215 and 24 product rows, each inheriting one of the gaps).

## 6. Inventory coverage (one row per site model, final ids)

| Site range → model | Category (id) | Product (id) | brand | Variants and placeholder price |
|---|---|---|---|---|
| Sofa → Wooden | `sofas` (31) | 47 Wooden Sofa Set | A & S Urbanseat | Colour: Sand Beige / Slate Grey / Maroon · ₹32,999, was ₹37,999 |
| Sofa → L-Shaped | `sofas` (31) | 48 L-Shaped Sofa | A & S Urbanseat | Colour: Slate Grey / Sand Beige / Teal Blue · ₹44,999 |
| Sofa → 5 Seater | `sofas` (31) | 49 5-Seater Sofa Set | A & S Urbanseat | Colour: Sand Beige / Slate Grey / Teal Blue · ₹38,999, was ₹44,999 |
| Sofa → 7 Seater | `sofas` (31) | 50 7-Seater Sofa Set | A & S Urbanseat | Colour: Slate Grey / Sand Beige / Maroon · ₹58,999 |
| Sofa Cum Bed → Steel | `sofa-cum-beds` (32) | 51 Steel Sofa-cum-Bed | "" | Colour: Slate Grey / Maroon / Teal Blue · ₹15,999 |
| Sofa Cum Bed → Wooden | `sofa-cum-beds` (32) | 52 Wooden Sofa-cum-Bed | A & S Urbanseat | Colour: Sand Beige / Slate Grey · ₹28,999, was ₹32,999 |
| Center Table → Wooden | `centre-tables-showcases` (33) | 53 Wooden Centre Table | A & S Urbanseat | Finish: Walnut / Natural Oak · ₹7,999 |
| Showcase → Wooden | `centre-tables-showcases` (33) | 54 Wooden Showcase | A & S Urbanseat | Finish: Walnut / Teak · ₹18,999 |
| Bed → King | `beds` (35) | 55 King Size Bed | A & S Urbanseat | Finish: Walnut / Wenge · ₹34,999, was ₹39,999 |
| Bed → Queen | `beds` (35) | 56 Queen Size Bed | A & S Urbanseat | Finish: Walnut / Natural Oak · ₹27,999 |
| Bed → Single | `beds` (35) | 57 Single Bed | A & S Urbanseat | Finish: Walnut / Natural Oak · ₹13,999, was ₹15,999 |
| Mattress → Carlton | `mattresses` (36) | 58 Carlton Mattress | Carlton | Size: Single / Double / Queen / King · ₹8,999 / ₹14,999 / ₹19,999 / ₹23,999 |
| Mattress → Nilkamal | `mattresses` (36) | 59 Nilkamal Mattress | Nilkamal | Size: Single / Double / Queen / King · ₹5,599 / ₹9,499 / ₹12,499 / ₹14,999 |
| Dressing → Plain | `dressing-tables-mirrors` (37) | 60 Plain Dressing Table | A & S Urbanseat | Finish: Walnut / Frosty White · ₹7,499 |
| Dressing → Big Size | `dressing-tables-mirrors` (37) | 61 Large Dressing Table | A & S Urbanseat | Finish: Walnut / Wenge · ₹15,999, was ₹17,999 |
| Dressing → Standing Mirror | `dressing-tables-mirrors` (37) | 62 Standing Mirror | A & S Urbanseat | Finish: Walnut / Natural Oak · ₹5,499 |
| Dressing → Wall Mirror | `dressing-tables-mirrors` (37) | 63 Wall Mirror | A & S Urbanseat | Finish: Walnut / Frosty White · ₹2,799 |
| Bed Set Table → Wooden | `bedside-bed-tables` (38) | 64 Wooden Bedside Table | A & S Urbanseat | Finish: Walnut / Natural Oak · ₹4,499 |
| Bed Set Table → Particle Board | `bedside-bed-tables` (38) | 65 Particle-Board Bedside Table | "" | Finish: Walnut / Frosty White · ₹2,499, was ₹2,899 |
| Bed Table → Folding | `bedside-bed-tables` (38) | 66 Folding Bed Table | "" | Colour: Natural Oak / Matte Black · ₹1,899 |
| Almari → Two Doors | `almirahs` (39) | 67 Two-Door Almirah | A & S Urbanseat | Finish: Walnut / Wenge · ₹12,999 |
| Almari → 3 Doors | `almirahs` (39) | 68 Three-Door Almirah | A & S Urbanseat | Finish: Walnut / Wenge · ₹21,999, was ₹24,999 |
| Alna → Iron | `alna-clothes-stands` (40) | 69 Iron Alna (Clothes Stand) | "" | `[]` · ₹1,699 |
| Alna → Wooden | `alna-clothes-stands` (40) | 70 Wooden Alna (Clothes Stand) | A & S Urbanseat | `[]` · ₹4,299 |
| Rack → Steel | `racks` (44) | 71 Steel Storage Rack | "" | Shelves: 3 shelves / 4 shelves / 5 shelves · ₹3,199 / ₹3,799 / ₹4,499 |
| Rack → Wooden | `racks` (44) | 72 Wooden Storage Rack | A & S Urbanseat | Shelves: 3 shelves / 4 shelves / 5 shelves · ₹5,499 / ₹6,999 / ₹8,499 |
| Dining → 4 Sitter | `dining-sets` (42) | 73 4-Seater Dining Set | A & S Urbanseat | Finish: Walnut / Natural Oak · ₹21,999 |
| Dining → 6 Sitter | `dining-sets` (42) | 74 6-Seater Dining Set | A & S Urbanseat | Finish: Walnut / Teak · ₹34,999, was ₹39,999 |
| Dining → Marble | `dining-sets` (42) | 75 Marble-Top Dining Set | A & S Urbanseat | Finish: Walnut / Wenge · ₹54,999 |
| Office Table → Company Made (Winsome) | `office-tables` (45) | 76 Winsome Office Table | Winsome | Size: 120 × 60 cm / 150 × 75 cm · ₹12,999 / ₹16,999 |
| Office Table → Local Made | `office-tables` (45) | 77 Workshop Office Table | A & S Urbanseat | Size: 120 × 60 cm / 150 × 75 cm · ₹8,999 / ₹11,999 |
| Computer Table → Company Made (Winsome) | `computer-tables` (46) | 78 Winsome Computer Table | Winsome | Size: 90 × 60 cm / 120 × 60 cm · ₹8,499 / ₹10,999, was ₹9,499 |
| Computer Table → Local Made | `computer-tables` (46) | 79 Workshop Computer Table | A & S Urbanseat | Size: 90 × 60 cm / 120 × 60 cm · ₹5,999 / ₹7,499 |
| Reading Table → Company Made (Winsome) | `reading-tables` (47) | 80 Winsome Reading Table | Winsome | Size: 75 × 50 cm / 90 × 60 cm · ₹5,999 / ₹7,499 |
| Reading Table → Local Made | `reading-tables` (47) | 81 Workshop Reading Table | A & S Urbanseat | Size: 75 × 50 cm / 90 × 60 cm · ₹4,199 / ₹5,299, was ₹4,799 |
| Plastic Dining → 4 Seater | `plastic-dining-sets` (48) | 82 4-Seater Plastic Dining Set | Nilkamal | Colour: Marble Beige / Coffee Brown / White · ₹5,999 |
| Plastic Dining → 6 Seater | `plastic-dining-sets` (48) | 83 6-Seater Plastic Dining Set | Nilkamal | Colour: Marble Beige / Coffee Brown · ₹9,999, was ₹10,999 |
| Plastic Sofa → Nilkamal | `plastic-sofas` (49) | 84 Nilkamal Plastic Sofa Set | Nilkamal | Colour: Coffee Brown / Marble Beige / Pearl Grey · ₹12,999, was ₹14,999 |

Count: 4 + 2 + 2 + 3 + 2 + 4 + 3 + 2 + 2 + 2 + 3 + 2 + 2 + 2 + 2 + 1 = **38**. Departments: Plastic 21, Office Chairs 16, Café 10, Outdoor 2, Home 29, Office Tables & Desks 6 (84).

## 7. Audit-script summary (baseline)

`node audit-v2-03.cjs db.json`: **2,434 checks, 37 failures.**

| Rule | Check | Pass | Fail |
|---|---|---|---|
| CT01 | category keys and order (26: the 20 new, departments 1–6) | 26 | 0 |
| CT02 | name, slug, parent, sortOrder as Prompt 04's tree (20) | 20 | 0 |
| CT03 | showInMainMenu false, menuOrder 0 | 20 | 0 |
| CT04 | active | 20 | 0 |
| CT05 | parent exists, under department 1, 5 or 6 | 20 | 0 |
| CT06 | description one sentence, full stop, no hype | 20 | 0 |
| CT07 | local terms in category copy glossed | 2 | **1** (34 (almirah)) |
| CT09 | image 1600x1000 placeholder in the tones, slug words | 20 | 0 |
| CT10 | dates ISO, created ≤ updated ≤ now, within the window | 20 | 0 |
| CT11 | ids 30–49 contiguous, 43 categories | 1 | 0 |
| CT12 | departments 1–6: id, slug, name, menu and sort order | 6 | 0 |
| CT13 | sortOrder 1..n under every parent | 13 | 0 |
| CT14 | every active leaf holds 2+ products (or a recorded decision) | 29 | 0 |
| CT15 | every Prompt 04 product on its checklist leaf | 1 | 0 |
| APP1 | getMainMenuCategories: the six departments in order | 1 | 0 |
| APP2 | orderCategoriesHierarchically: departments, each followed by its subtree | 1 | 0 |
| APP3 | getCategoryScopeIds: home-furniture 29, bedroom 16 (bedroom only) | 2 | 0 |
| APP4 | groupCategoryTree: the mega-menu groups of departments 1, 5, 6 | 1 | 0 |
| APP5 | the product page's specification rows: no name twice | 38 | 0 |
| K01 | 30 product keys in order | 38 | 0 |
| K02 | variants is an array | 38 | 0 |
| K03 | dimension keys, > 0 | 38 | 0 |
| K04 | variant keys in order | 38 | 0 |
| INV01 | each site model → its product: name, leaf, active | 38 | 0 |
| N01 | name ≤ 48 | 38 | 0 |
| N02 | no tier prefix, model number or site label in the name | 38 | 0 |
| N03 | slug = app slugify(name) | 38 | 0 |
| N04 | SKU uppercase, PFX-TYP-NN | 38 | 0 |
| N05 | SKU prefix by room or department | 38 | 0 |
| N06 | variant SKU = product SKU + code | 38 | 0 |
| B01 | brand exactly as the checklist | 38 | 0 |
| B02 | brand also a lowercase tag | 38 | 0 |
| V01 | variants as the checklist line | 38 | 0 |
| V02 | colour/finish options share one price | 26 | 0 |
| V03 | size and shelf prices rise | 10 | 0 |
| V04 | variant name = attribute value | 38 | 0 |
| V05 | swatch on colour/finish options only (app's buildColorMap) | 38 | 0 |
| V06 | structured attributes (app) | 38 | 0 |
| V08 | variant ids v1…vn | 38 | 0 |
| M01 | price = min variant price (app's getProductMinPrice) | 38 | 0 |
| M02 | quick add = cheapest variant at the card's price (app's buildCartItem) | 38 | 0 |
| M03 | compare 0 or above price | 38 | 0 |
| M04 | compare 10–20% above | 13 | 0 |
| M05 | cost 60–70% | 38 | 0 |
| M06 | prices end 49/99/00 | 38 | 0 |
| M07 | price band of the line | 38 | 0 |
| S01 | stock = Σ variant stock | 38 | 0 |
| S02 | lowStockThreshold 3–8 by the 8/6/5 convention | 38 | 0 |
| S03 | stock 4–60 unless deliberately low or sold out | 38 | 0 |
| D01 | short description ≤ 110 | 38 | 0 |
| D02 | app parser: 2–3 paragraphs, 5–7 pairs | 38 | 0 |
| D03 | "Specifications: " and "Key: Value" pairs | 38 | 0 |
| D04 | cm, kg and inch values say "approx." | 36 | **2** (58, 59) |
| D05 | no warranty, certification or years claim | 38 | 0 |
| D06 | no "!" or hype word | 38 | 0 |
| D07 | no orthopaedic or medical wording | 38 | 0 |
| D08 | workshop claim only on 47, 77, 79, 81; no site label | 38 | 0 |
| D09 | local terms glossed in the record | 4 | **3** (56 (almirah), 62 (almirah), 69 (almirah)) |
| D10 | specification topics where they apply | 33 | **5** (52, 72, 76, 78, 80) |
| D11 | metaTitle and metaDescription | 38 | 0 |
| D12 | the prompt's medical grep over the catalogue | 1 | 0 |
| D13 | no "Company Made"/"Local Made" in db.json | 1 | 0 |
| Z01 | sizes against dimensions and weight | 38 | 0 |
| Z04 | Finish pair true to the Finish options | 35 | **3** (60, 63, 65) |
| I01 | three images | 38 | 0 |
| I02 | placeholder pattern and tones | 38 | 0 |
| I03 | labels name / Detail / In situ | 38 | 0 |
| I04 | no reference-site link | 38 | 0 |
| T01 | tags lowercase | 38 | 0 |
| T03 | type tag | 38 | 0 |
| T05 | a tag naming a material the specifications use | 22 | **16** (48, 49, 50, 60, 61, 62, 63, 66, 67, 68, 76, 77, 78, 79, 80, 81) |
| R01 | related 3–5 | 38 | 0 |
| R02 | relations exist, active, not self, no duplicates | 38 | 0 |
| R03 | related within the room (Home) or department | 36 | **2** (54, 69) |
| R04 | related: same leaf first | 38 | 0 |
| R05 | bundle 0–2 ids | 38 | 0 |
| R06 | bundle kinds allowed | 38 | 0 |
| R07 | cross-department bundle returned (or the target's two slots hold the source's department) | 15 | **3** (25 → 79, 80 → 25, 81 → 25) |
| R08 | each desk bundles a chair that bundles it back | 4 | **2** (80, 81) |
| R09 | each high- or low-back office chair bundles a desk | 10 | 0 |
| DT01 | dates ISO, created ≤ updated ≤ now | 38 | 0 |
| DT02 | created within the six months before the build | 38 | 0 |
| G01 | 84 products, all active, 47–84 the 38 | 1 | 0 |
| G02 | count per leaf (16) | 16 | 0 |
| G03 | products per department 21/16/10/2/29/6 | 1 | 0 |
| G04 | brands: exactly the four and "" | 1 | 0 |
| G05 | compare-at share of the 38 | 1 | 0 |
| G06 | 2–3 low and 1–2 sold-out options among the 38 | 1 | 0 |
| G07 | SKUs and slugs unique | 1 | 0 |
| G08 | one hex per colour name | 1 | 0 |
| G09 | no café/waiting/lobby/swing/shoe-rack piece in 47–84 | 1 | 0 |
| G10 | "Brands we carry" (app's collectBrands) | 1 | 0 |
| F01 | featured 4–6, home and office | 1 | 0 |
| F02 | trending 3–4 | 1 | 0 |
| F03 | hot 1–2 | 1 | 0 |

App outputs (baseline): `getMainMenuCategories` → 1 plastic-furniture · 2 office-chairs · 3 cafe-restaurant-chairs · 4 outdoor-furniture · 5 home-furniture · 6 office-tables-desks. `orderCategoriesHierarchically` → 1, 10–18, 48, 49, 2, 20–27, 3, 4, 5, 30–44, 6, 45, 46, 47. Mega-menu groups: Plastic Furniture → Essentials (4) · Premium (3) · Dining Sets · Sofas; Home Furniture → Living Room (3) · Bedroom (6) · Dining Room (1) · Storage (1); Office Tables & Desks → Office Tables · Computer Tables · Reading Tables. "Brands we carry" → Carlton · Nilkamal · Winsome · A & S Urbanseat. Search → almirah 2 · alna 2 · table 33 · mattress 5 · sofa 7 · wardrobe 2 · clothes stand 2 · wood 22.

The mega-menu data shape, printed in Node by the app's own `getMainMenuCategories` and `orderCategoriesHierarchically` over the active categories sorted by `sortOrder` (what `categories.getAll` returns), indented by `depthOf`:

```
getMainMenuCategories:
  1  1  plastic-furniture
  2  2  office-chairs
  3  3  cafe-restaurant-chairs
  4  4  outdoor-furniture
  5  5  home-furniture
  6  6  office-tables-desks
orderCategoriesHierarchically (43):
  1 Plastic Furniture (plastic-furniture)
     10 Essentials (plastic-essentials)
        11 Chairs with Arms (plastic-essentials-armchairs)
        12 Chairs without Arms (plastic-essentials-chairs)
        13 Centre Tables (plastic-essentials-centre-tables)
        14 Shoe Racks (plastic-shoe-racks)
     15 Premium (plastic-premium)
        16 Chairs with Arms (plastic-premium-armchairs)
        17 Chairs without Arms (plastic-premium-chairs)
        18 Centre Tables (plastic-premium-centre-tables)
     48 Dining Sets (plastic-dining-sets)
     49 Sofas (plastic-sofas)
  2 Office Chairs (office-chairs)
     20 Essentials (office-chairs-essentials)
        21 High-Back Chairs (office-essentials-high-back)
        22 Low-Back Chairs (office-essentials-low-back)
        23 Waiting Chairs (office-essentials-waiting)
     24 Premium (office-chairs-premium)
        25 High-Back Chairs (office-premium-high-back)
        26 Low-Back Chairs (office-premium-low-back)
        27 Waiting Chairs (office-premium-waiting)
  3 Café & Restaurant Chairs (cafe-restaurant-chairs)
  4 Outdoor Furniture (outdoor-furniture)
  5 Home Furniture (home-furniture)
     30 Living Room (living-room)
        31 Sofas (sofas)
        32 Sofa-cum-Beds (sofa-cum-beds)
        33 Centre Tables & Showcases (centre-tables-showcases)
     34 Bedroom (bedroom)
        35 Beds (beds)
        36 Mattresses (mattresses)
        37 Dressing Tables & Mirrors (dressing-tables-mirrors)
        38 Bedside & Bed Tables (bedside-bed-tables)
        39 Almirahs (almirahs)
        40 Alna Clothes Stands (alna-clothes-stands)
     41 Dining Room (dining-room)
        42 Dining Sets (dining-sets)
     43 Storage (storage)
        44 Racks (racks)
  6 Office Tables & Desks (office-tables-desks)
     45 Office Tables (office-tables)
     46 Computer Tables (computer-tables)
     47 Reading Tables (reading-tables)
```

Report-only (§11): the related rail (`getRelated`, limit 10) takes pieces from another department on 23 of the 38 pages; three orders and one review are dated before their Prompt 04 product's `createdAt`; ratings agree with the approved reviews; the home Featured rail (JSON Server mode) shows 1, 11, 12, 19, 20, 21, 31, 37.

## 8. Gaps found and repairs

(Written after the repair.)

## 9. Identity stability (before → after)

(Written after the repair.)

## 10. Validator assertions added

(Written after the repair.)

## 11. Findings for V2-04 and V2-05 (so far)

| # | Finding | Owner |
|---|---|---|
| F1 | `getRelated` (`api.js`) tops up curated ids with any product of the same brand or a shared tag, in catalogue order: 23 of the 38 product pages' related rails show another department's pieces (the A & S Urbanseat brand pulls home pieces into the workshop tables' rails; "living room" pulls plastic centre tables and armchairs into the sofas'; the empty brand pulls office and café chairs into the unbranded pieces'). The curated ids stay within the room or department (R153 after repair). V2-02's F1, wider | V2-05 / owner |
| F2 | Dated before their product exists: ORD-20250318-0002 (2026-02-01) → 76 (created 2026-07-09); ORD-MQC1HWSZ-CAN8 (2026-06-13) → 63 (2026-08-19); ORD-MQDVIQCV-30A9 (2026-06-14) → 82 (2026-07-11); review 4 (2026-02-21) → 76. Moving these products' `createdAt` earlier would break Prompt 03's six-month window for three of them; the order side is V2-04's (V2-02's F2, for Prompt 04's products) | V2-04 |
| F3 | Two seeded demo reviews give health effects: review 17 on the Carlton Mattress ("Sleeping much better" / "My shoulder aches have eased within two weeks.") and review 11 on the Mesh High-Back Office Chair ("Back pain is better"). The mattress copy makes no such claim; the reviews are Prompt 05's demo content and show on the product pages (and 17 can reach the home carousel only if 58 is featured) | V2-04 |
| F4 | In JSON Server mode the home Featured rail shows the first 8 featured products in catalogue order: all Prompt 03's (1, 11, 12, 19, 20, 21, 31, 37). Prompt 04's five featured pieces (47, 55, 68, 74, 76) never appear there, so the rail does not mix home and office pieces as Prompt 04 intended; the Trending rail does (48) and Complete the space shows 76. The fix is in `api.js` (`getFeatured` slices in catalogue order) or in the flags of Prompt 03's set, both outside V2-03's scope (V2-02's F5) | V2-05 / owner |

## 12. Observations (no change)

- **O1.** Product 82's copy says "the chairs stack away when the table is folded into a corner"; its specifications do not say the table folds. Not contradicted by data; for the client (§14).
- **O2.** Product 58's copy says the mattress "arrives roll-free and ready to place": a delivery statement no data backs. For the client (§14).
- **O3.** The Winsome tables', mattresses' and plastic sofa's specifications open with a "Brand" pair; the product page shows it instead of the field row (Prompt 17), and a test pins the Carlton mattress's row.
- **O4.** Search "mattress" finds the three beds through their short descriptions ("sized for a 72 × 78 inch mattress"); "table" finds 33 pieces, centre tables and dressing tables included. Both follow Prompt 15's rule.

## 13. Gate

(Written after the repair.)

## 14. Needs client confirmation (these ranges)

(Refreshed after the repair.)
