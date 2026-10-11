V2 baseline: 0b9153e490c87c0713c8c802f67185266da424a2 · V2-02 start: 11e57509fae56ebdb2b841739d1ecbfcf02fd9d5

# V2-02 report: catalogue data I, client ranges (max-effort re-verification of Prompt 03)

**Date:** 2026-10-11. **Re-verifies:** Prompt 03 (`prompts/03_catalogue-data-client-ranges.md`, commit `6616837`). **Scope:** categories 1–6 and 10–29, the 46 products of Prompt 03 (ids 1–46), and `scripts/validate-db.js`. **Start:** `git rev-parse HEAD` = `11e5750` (V2-01 merged); `db.json` SHA-256 `3fc7f8f3…`, the seed Prompt 34 committed and V2-01 left unchanged.

**Status: complete, no row left as a gap or partial.**
- **As found** (matrix committed before any edit, `e9b0c2d`): 172 requirements; 160 met, 7 superseded by a recorded later decision, 3 gaps (R110, R112, R153) and 2 partial (R130, R169).
- **After V2-02's repairs** (§6): 165 met (5 of them repaired here), 7 superseded, 0 gaps, 0 partial. Ten field values in six products changed; no id, slug, SKU, key, key order or collection (§7).
- **Gate green** (§11). Seven findings handed on (§9).

---

## 1. How this was checked

- **Read in full:** `prompts/00_INDEX.md`, `prompts/03_catalogue-data-client-ranges.md`, the `## Prompt 03`, `## Prompt 04` and `## Prompt 05` entries of `prompts/BUILD_LOG.md`, the V2 README, the V2-01 report and its entry, and this prompt. Then every later entry (06–34) was searched for `db.json`, `products`, `categories`, `Specifications`, `shortDescription`, `featured`, `trending`, `hot`, `relatedProductIds`, `comparePrice`, `metaTitle`, `metaDescription` and `validate-db`, and the matching passages were read (Prompts 11–17, 19, 29, 32, 34; §3). `DESIGN_SYSTEM.md` §11 (placeholder tones), §39 (voice, especially §39.9 on admin-managed copy) and §43.5 (validator rules).
- **History:** `git show --stat 6616837` and its validator; the per-record diff of every in-scope category and product across `6616837 → 4dd5cf2 → d807ce4 → 7cbe35d → HEAD` (§3); `git log --full-history -- db.json scripts/validate-db.js`. Only four commits after the first touched `db.json`: Prompts 03, 04, 05 and 34.
- **Consuming code read:** `src/utils/categories.js`; `src/utils/helpers.js` (`slugify`, `getProductMinPrice`, `buildCartItem`, `parseSpecifications`, `getCartSavings`); `src/components/storefront/variantUtils.js`, `VariantSelector.js`, `PriceBlock.js`; `src/context/CartContext.js`; `src/pages/ProductDetails/ProductDetails.js` and `productSpecs.js`; `src/pages/Products/Products.js` (filters); the `products.*` block of `src/services/api.js` (`getRelated`, `getFeatured`, `getFrequentlyBoughtTogether`); `src/hooks/usePageMeta.js`; `src/pages/Admin/AdminProducts.js` and `AdminCategories.js` (save paths).
- **Audit script** (`audit-v2-02.mjs`, session scratchpad, not committed): **3,054 checks**, per category (23 in scope) and per product (46), plus aggregates. It imports the app's own `parseSpecifications`, `slugify`, `getProductMinPrice`, `buildCartItem`, `isColorAttribute`, `hasStructuredAttributes` and `buildColorMap`, so the rules are checked against what the storefront does. It also writes an identity snapshot (ids, slugs, SKUs, variant ids and key orders; hashes of every other collection) for the before/after proof (§7). Summary in §5.
- **Browser checks** (Playwright 1.56.1, Chromium): a production build in JSON Server mode (`REACT_APP_API_URL=http://localhost:3001 REACT_APP_USE_MOCK_API=true CI=true npm run build`: "Compiled successfully.", main JS 399.59 kB, CSS 34.97 kB gzip) served with `serve -s` on :5001; JSON Server on a **scratch copy** of `db.json` (`JSON_SERVER_DB`), so the seed was never written (SHA-256 `3fc7f8f3…` before and after). **Baseline pass: 120 of 120.** Results are "browser: <check id>" in the evidence column. The checks: the header's six departments and two mega-menu flyouts; the listing of every in-scope category (23, each product name compared with the data); all 46 product pages (the `h1`, the price, the specifications table's parsed rows, SKU and dimensions rows); the shoe rack's four options (price, SKU, stock line), the keyboard, the café chair's swatches, a sold-out option, the Lobby Set's sizes; three lines in the cart drawer; search "chair" and "waiting"; four pages at 360/768/1024/1440; the admin's categories tree, its products filter and edit-save without change on 10 products and 5 categories; the console.
- **Gate at the start:** `node scripts/validate-db.js` ✓ (full) and `--catalogue` ✓; `CI=true npm test -- --passWithNoTests` **86 suites, 1,429 tests, exit 0** (102 s).

## 2. What the medium session did (`6616837`)

`git show --stat 6616837`: `db.json` (+4,094 / −1,039 across the file), `prompts/BUILD_LOG.md` (+157), new `scripts/validate-db.js` (+377).

| Area | Change |
|---|---|
| `categories` | the 16 boilerplate records replaced by 23: departments 1–6 (5 and 6 without children), Plastic 10–18, Office Chairs 20–27 |
| `products` | the 19 boilerplate records replaced by 46 (ids 1–46), 114 variants; 30 keys in the boilerplate's order |
| `dealsConfig` | `featuredCouponIds`, `dealOfTheDayIds`, `featuredProductIds` → `[]`; nothing else |
| `scripts/validate-db.js` | catalogue and full modes: wording, key sets, ids/slugs/SKUs, tree, departments, coverage, variants, prices, stock, tags, relations, dates; full mode: references, order money, ratings, wallet |
| other collections | unchanged (per-collection comparison of `91f7b51` and `6616837`: only `categories`, `products`, `dealsConfig` differ) |

The owner-requested follow-up `704888b` ("Keep variant attributes and swatches when saving a product in the admin") spread the original variant first in `AdminProducts.js`; it is the admin change `00_INDEX.md` §5 item 28 records.

## 3. Later decisions that changed Prompt 03's data, or the rules it is read by

| Prompt | Commit | Change | Recorded in |
|---|---|---|---|
| 04 | `4dd5cf2` | Appended categories 30–49 (children of 1, 5, 6) and products 47–84. Extended `frequentlyBoughtTogetherIds` of 21, 22, 23 (+77), 24, 25 (+79), 29, 30, 31, 32 (+76) and 33 (+78): an office chair with a desk. Validator: Prompt 04's `COVERAGE` rows, `TREE`, `BRANDS`, the 2+ products leaf rule, more `VARIANT_RULES` | BUILD_LOG Prompt 04, "Relations" and "validate-db.js (extended)" |
| 05 | `d807ce4` | `rating`/`totalReviews` of 2, 11, 12, 19, 21, 33, 37, 46 from approved reviews. `dealsConfig` reseeded (deal of the day 21, 12; grid 19, 29, 40). Orders now reference 6, 9, 20, 23, 29, 33, 40; the wishlist 31, 37. Full-mode validator | BUILD_LOG Prompt 05 |
| 11, 13, 14, 15, 16 | — | Read the flags and stock as data: the home rails take `getFeatured(8)` / `getTrending(8)`; the card's "New" is `hot`, "Sale" a real compare price, "Sold out" stock 0; the listing and product page say "Only N left" at `lowStockThreshold`; search's "Popular" lists the first six trending names | BUILD_LOG Prompts 11, 13, 14, 15, 16 |
| 17 | — | `parseSpecifications` and the specifications table: the parsed pairs, then Brand, SKU, Weight, "Dimensions (L × W × H)", Category, Tags; a field row is skipped only when a pair has its exact name. Noted the "Overall size" disagreements of 2, 3, 5, 6 for Prompt 34 | BUILD_LOG Prompt 17; `productSpecs.js:1–13` |
| 29 | — | The voice guide. **Admin-managed copy (category descriptions, product copy) is the client's: suggested wording is listed in the build log, never written into `db.json` by a prompt.** Proposals listed: Plastic Furniture's description ("weather-ready" and stacking unconfirmed), Office Tables & Desks' description, straight apostrophes in product descriptions | BUILD_LOG Prompt 29, "Needs client confirmation"; `DESIGN_SYSTEM.md` §39.9 |
| 32 | — | `metaTitle` ("<name> \| A & S Urbanseat", the suffix stripped and re-added) and `metaDescription` (≤ 160 characters) become the product page's title and description; `Product` JSON-LD | BUILD_LOG Prompt 32; `ProductDetails.js:503–517`; `usePageMeta.js` |
| 34 | `7cbe35d` | "Overall size" in the descriptions of 2, 3, 5, 6 and `dimensions.height` of 11 (98 → 96) made to agree; a full-mode validator check of "Overall size"/"Height" against the fields | BUILD_LOG Prompt 34, fixes 11–15; `DESIGN_SYSTEM.md` §43.5 |

The V2-02 prompt expects Prompts 29 and 32 to have edited catalogue copy: they did not. `git log --full-history -- db.json` shows no commit between `d807ce4` (Prompt 05) and `7cbe35d` (Prompt 34); Prompt 29 proposed copy and Prompt 32 reads the meta fields. No later prompt touched categories 1–6 or 10–29.

## 4. Requirement matrix

Status: `✅ Met` · `↪ Superseded by Prompt NN` (a recorded later decision, cited) · `❌ Gap` · `⚠ Partial`. "03:N" is a line of `prompts/03_catalogue-data-client-ranges.md`; audit rule ids (CT, K, A, V, M, S, D, Z, N, B, I, T, R, DT, X, G) are listed in §5; `validate-db.js:N` lines are at the start of V2-02.

### 4.1 Depends on, objective and scope (03:5–22)

| # | Requirement (Prompt 03) | Current state | Status | Evidence |
|---|---|---|---|---|
| R1 | Uses Prompt 01's placeholder tones (03:7) | every product and category image on `f1ebe1`/`686158` | ✅ Met | audit I02 46/46, CT14 23/23; `DESIGN_SYSTEM.md` §11 |
| R2 | Uses Prompt 02's brand name (03:7) | meta titles end "\| A & S Urbanseat"; meta descriptions end "Shop online at A & S Urbanseat." | ✅ Met | audit X03, X04 46/46 |
| R3 | Expect dangling references until Prompt 05 (03:7) | orders, returns, reviews, wishlist and the deals config reseeded by Prompt 05; full mode passes | ↪ Superseded by Prompt 05 (resolved) | BUILD_LOG Prompt 05; `node scripts/validate-db.js` ✓ |
| R4 | Replace the boilerplate's electronics/fashion catalogue with the A & S Urbanseat tree and the client's ranges (03:15) | no boilerplate record left; no electronics or fashion word in any category or product | ✅ Met | `git show --stat 6616837`; audit X01 46/46; catalogue scan for electronic, smartwatch, earbud, headphone, t-shirt, sneaker, smartphone, fashion: none |
| R5 | Content only: the exact field shape, no field added, removed or renamed (03:15) | 12 category keys and 30 product keys in the boilerplate's order | ✅ Met | audit CT01 23/23, K01 46/46; first records of `91f7b51` |
| R6 | ids and slugs follow the existing conventions (03:15) | numeric ids; lowercase hyphenated slugs | ✅ Met | audit N04, CT04 |
| R7 | Passes a referential-integrity check you write (03:15) | `scripts/validate-db.js` passes in both modes | ✅ Met | §1 |
| R8 | Replace all 16 categories (03:19) | 23 at `6616837`; Prompt 04 appended 20 (43 now) | ✅ Met | counts at `91f7b51`, `6616837`, `HEAD` |
| R9 | Replace all 19 products (03:19) | 46 at `6616837` (ids 1–46); Prompt 04 appended 38 | ✅ Met | same |
| R10 | `dealsConfig.featuredCouponIds`, `dealOfTheDayIds`, `featuredProductIds` = `[]` (03:19) | `[]` at `6616837`; Prompt 05 reseeded them ([1, 2], [47, 21, 12], [19, 29, 40, 55, 74, 78, 81, 84]) | ↪ Superseded by Prompt 05 | `git show 6616837` (only those three keys changed); BUILD_LOG Prompt 05, `dealsConfig` row |
| R11 | `scripts/validate-db.js`, a dependency-free dev tool that Prompts 04, 05, 34 re-run (03:20) | exists; extended by each | ✅ Met | `git log -- scripts/validate-db.js` |
| R12 | Do not touch `src/`, `public/`, `server.js`, `package.json` (03:22) | `6616837` changed `db.json`, `BUILD_LOG.md`, `validate-db.js`; the admin fix is the separate owner-requested `704888b` | ✅ Met | `git show --stat 6616837`; `00_INDEX.md` §5 item 28 |
| R13 | Do not touch the other 15 collections (03:22) | `6616837` changed only `categories`, `products`, `dealsConfig` | ✅ Met | per-collection comparison, `91f7b51` vs `6616837` |

### 4.2 Field shapes and the rules that follow from the code (03:24–54)

| # | Requirement (Prompt 03) | Current state | Status | Evidence |
|---|---|---|---|---|
| R14 | Category shape, 12 keys in order (03:26–31) | every category | ✅ Met | audit CT01; `validate-db.js:145` |
| R15 | Product shape, 30 keys in order (03:33–44) | every product | ✅ Met | audit K01; `validate-db.js:210` |
| R16 | Variant shape `id, name, price, stock, sku, attributes, swatchHex` (03:39–40) | order kept on all 114 variants | ✅ Met | audit K04 46/46; asserted since V2-02 (`validate-db.js:488–490`) |
| R17 | `attributes` on one variant ⇒ on all, same keys (03:48) | 42 products with variants: all structured, one attribute each (Colour 27, Finish 10, Shelves 3, Size 2) | ✅ Met | audit A01, A02; `validate-db.js:258–261`; `variantUtils.js:22–27` |
| R18 | `swatchHex` optional, only for a colour attribute (03:48) | on the 27 Colour and 10 Finish products; `isColorAttribute` (`/colou?r\|shade\|finish/`) makes Finish a swatch row | ✅ Met | audit A03, A07 37/37; `variantUtils.js:51–52`; browser: variants/café chair swatches |
| R19 | No variants → `[]`, never `null` (03:48) | 26, 27, 28, 36 | ✅ Met | audit K02 |
| R20 | `price` = lowest variant price (cards, quick add) (03:49) | 46/46; the card and quick add show and charge `price` | ✅ Met | audit M01, M02 (`getProductMinPrice`, `buildCartItem`); `validate-db.js:281` |
| R21 | `comparePrice` 0 without a sale, never below `price` (03:49) | 30 × 0, 16 above price; shown only where above the chosen option's price | ✅ Met | audit M03; `PriceBlock.js:33–36`; `getCartSavings` |
| R22 | `stock` = Σ variant stock (03:50) | 42/42 | ✅ Met | audit S01; `validate-db.js:283` |
| R23 | `lowStockThreshold` 3–8 (03:50) | 8 below ₹3,000, 6 from ₹3,000, 5 from ₹9,000 | ✅ Met | audit S02; `ProductDetails.js:477–478` |
| R24 | `rating`/`totalReviews` 0; Prompt 05 updates them (03:51) | 0 at `6616837`; Prompt 05 set 8 of the 46; they equal the approved reviews | ↪ Superseded by Prompt 05 (V2-04 owns them) | diff `4dd5cf2 → d807ce4`; audit: no drift |
| R25 | Relations reference existing, active products, never the product itself (03:52) | 46/46 | ✅ Met | audit R02, R04; `validate-db.js:295–304` |
| R26 | Tags lowercase; brand, tier, type and material (03:53) | 46/46 | ✅ Met | audit T01–T05 |
| R27 | Slugs unique, lowercase, hyphenated, ASCII, by `slugify`'s rule (03:54) | `slug === slugify(fold(name))`: the helper after folding accents, Prompt 03's recorded reading; the six "Café" names (37, 40, 43–46) differ from the raw helper only where it would drop "é" ("caf") | ✅ Met | audit N04 46/46; `helpers.js:150–159`; BUILD_LOG Prompt 03, "Slugs" |
| R28 | Product SKUs unique and uppercase (03:54) | and every variant SKU = product SKU + "-" + code | ✅ Met | audit N05, N06, G12 |

### 4.3 Category tree (03:56–89)

| # | Requirement (Prompt 03) | Current state | Status | Evidence |
|---|---|---|---|---|
| R29 | Six departments in the menu: `showInMainMenu: true`, `menuOrder` 1–6 (03:58) | ids 1–6 | ✅ Met | audit CT07, CT19, CT22; browser: menu/header six departments in order |
| R30 | Every other category `false` / `0` (03:58) | 37 of 37 | ✅ Met | audit CT07, CT19 |
| R31 | `sortOrder` from 1 within each parent (03:58) | every parent | ✅ Met | audit CT06, CT18 |
| R32 | Tier labels Essentials and Premium (03:58) | groups 10, 15, 20, 24 | ✅ Met | audit CT03 |
| R33 | "non-premium" never in the data (03:58) | none in `db.json` | ✅ Met | audit G15; `validate-db.js:135` |
| R34 | Departments 1–4 and children here; 5, 6 and two plastic groups in Prompt 04 (03:58) | as planned: Prompt 04 added 30–49, with `plastic-dining-sets` (48) and `plastic-sofas` (49) under 1 | ✅ Met | `6616837` categories; BUILD_LOG Prompt 04 |
| R35 | 1 Plastic Furniture, `plastic-furniture`, menu 1 (03:61) | as specified | ✅ Met | audit CT03–CT07 |
| R36 | Plastic Essentials (`plastic-essentials`): Chairs with Arms, Chairs without Arms, Centre Tables, Shoe Racks with their slugs (03:62–66) | ids 10–14, `sortOrder` 1–4 | ✅ Met | audit CT03–CT06 |
| R37 | Plastic Premium (`plastic-premium`): three leaves with their slugs (03:67–70) | ids 15–18 | ✅ Met | same |
| R38 | Prompt 04 adds Dining Sets and Sofas (03:71) | 48 and 49 under 1, `sortOrder` 3, 4 | ✅ Met | `validate-db.js:103–104` (TREE) |
| R39 | 2 Office Chairs and its Essentials group with high-back, low-back and waiting leaves (03:72–76) | ids 2, 20–23 | ✅ Met | audit CT03–CT07 |
| R40 | Office Chairs Premium with its three leaves (03:77–80) | ids 24–27 | ✅ Met | same |
| R41 | 3 Café & Restaurant Chairs, `cafe-restaurant-chairs`, menu 3, flat (03:81) | 10 products on id 3 | ✅ Met | audit CT03–CT07, G01 |
| R42 | 4 Outdoor Furniture, `outdoor-furniture`, menu 4, flat (03:82) | 2 products on id 4 | ✅ Met | same |
| R43 | 5 Home Furniture, `home-furniture`, menu 5 (03:83) | as specified | ✅ Met | audit CT03–CT07 |
| R44 | 6 Office Tables & Desks, `office-tables-desks`, menu 6 (03:84) | as specified | ✅ Met | same |
| R45 | Departments get ids 1–6 (03:87) | yes | ✅ Met | audit CT02 |
| R46 | 5 and 6 created now: active, named, a description, a placeholder image, no children yet (03:87) | so at `6616837`; Prompt 04 gave them children as planned | ✅ Met | `6616837`: no category with `parentId` 5 or 6 |
| R47 | Plastic subtree ids 10–19 (03:87) | 10–18 (19 free) | ✅ Met | audit CT20, CT21 |
| R48 | Office Chairs subtree ids 20–29 (03:87) | 20–27 (28, 29 free) | ✅ Met | same |
| R49 | Prompt 04 uses 30+ (03:87) | 30–49 | ✅ Met | categories |
| R50 | Category description: one refined sentence in the brand voice (03:87) | 23/23 one sentence ending in a full stop | ✅ Met | audit CT10; `Products.js:873` (listing intro) |
| R51 | …and true to the department | Plastic Furniture: "Light, weather-ready plastic chairs, tables and storage that clean in a moment and stack away neatly." (the tables say "Indoor and covered outdoor areas", the racks "keep out of direct sun", tables and racks do not stack); Office Tables & Desks: "…keep a desk orderly and a day productive." Prompt 29 judged both, proposed replacements and recorded that category copy is the client's | ↪ Superseded by Prompt 29 (left for the client) | BUILD_LOG Prompt 29, "Admin-managed copy in `db.json`"; `DESIGN_SYSTEM.md` §39.9 |
| R52 | Category image a placeholder (03:87), `1600x1000` (03:129) | 23/23; departments labelled with their name, children with their slug words (Prompt 03's choice: repeated names stay distinct) | ✅ Met | audit CT14, CT15 |
| R53 | Essentials groups convey "dependable everyday value" (03:89) | 10 "Dependable everyday value in sturdy, easy-care plastic…"; 20 "Dependable everyday value for the workday…" | ✅ Met | audit CT12 |
| R54 | Premium groups convey "heavier build, finer finish" (03:89) | 15 and 24 "A heavier build and a finer finish…"; the Premium leaves echo it ("heavier frame", "finer finish", "heavy-gauge") | ✅ Met | audit CT13 |
| R55 | Never "cheap", "basic" or "non-premium" (03:89) | none | ✅ Met | audit CT11, G15 |

### 4.4 Products: the coverage checklist (03:91–118)

| # | Requirement (Prompt 03) | Current state | Status | Evidence |
|---|---|---|---|---|
| R56 | Neutral, descriptive placeholder names (form + type); no invented model numbers (03:93) | every name is a suggested placeholder; no letter-and-digit model token | ✅ Met | audit N02, N03 |
| R57 | Names, prices and specifications are placeholders, listed for confirmation (03:93) | listed | ✅ Met | BUILD_LOG Prompt 03, "Needs client confirmation"; `00_INDEX.md` §6 |
| R58 | Counts exact (03:93) | 15 lines | ✅ Met | audit G01 15/15 |
| R59 | Essentials armchairs: 3, the suggested names, Colour 3–4, one price (03:97) | 1 (4 colours), 2 (3), 3 (3) | ✅ Met | audit G01, N03, V01, A06 |
| R60 | Essentials chairs: 3, Colour (03:98) | 4 (4), 5 (3), 6 (3) | ✅ Met | same |
| R61 | Square centre table, Colour (2) (03:99) | 7 | ✅ Met | same |
| R62 | Round centre table, Colour (2) (03:100) | 8 | ✅ Met | same |
| R63 | Shoe racks: 3 × exactly 4 shelf variants, per-variant price, SKU, stock, price rising (03:101) | 9, 10, 11: "2 shelves"…"5 shelves"; ₹1,249→2,249, ₹1,599→2,849, ₹1,899→3,449; SKUs -2S…-5S | ✅ Met | audit V01; `validate-db.js:110`; browser: variants/shoe-rack ×4 |
| R64 | Premium armchairs: 3, Colour (03:102) | 12, 13, 14 | ✅ Met | audit G01, N03, V01 |
| R65 | Premium chairs: 2, Colour (03:103) | 15, 16 | ✅ Met | same |
| R66 | Premium round centre table, Colour (2) (03:104) | 17 | ✅ Met | same |
| R67 | Premium square centre table, Colour (2) (03:105) | 18 | ✅ Met | same |
| R68 | Lobby Set: Size Small/Large, per-variant price, SKU, stock (03:106) | 19: Small ₹22,999 (18), Large ₹38,999 (4) | ✅ Met | audit V01; browser: variants/lobby set |
| R69 | Jhula (Garden Swing): Size Small/Large (03:107) | 20: ₹11,999 / ₹21,999 | ✅ Met | audit V01 |
| R70 | Office Essentials high-back: 3, Colour (2–3) (03:108) | 21 (3), 22 (2), 23 (3) | ✅ Met | audit G01, N03, V01 |
| R71 | Office Essentials low-back: 2, Colour (03:109) | 24 (3), 25 (2) | ✅ Met | same |
| R72 | Office Essentials waiting: 3, none or Colour (03:110) | 26–28 `[]` | ✅ Met | same |
| R73 | Office Premium high-back: 3, Colour (03:111) | 29 (2), 30 (3), 31 (2) | ✅ Met | same |
| R74 | Office Premium low-back: 2, Colour (03:112) | 32 (2), 33 (3) | ✅ Met | same |
| R75 | Office Premium waiting: 3, none or Colour (03:113) | 34, 35 Colour (2); 36 `[]` | ✅ Met | same |
| R76 | Café chairs: 10, Colour or Finish (2–3) (03:114) | 37–46, Finish, 2–3 each | ✅ Met | same |
| R77 | 11 + 7 + 2 + 8 + 8 + 10 = 46 (03:116) | 46; departments 18 / 16 / 10 / 2 | ✅ Met | audit G02, G04 |
| R78 | The table in the build-log entry with final names and ids (03:116) | present | ✅ Met | BUILD_LOG lines 226–249 |
| R79 | The counts asserted in `validate-db.js` (03:116) | `COVERAGE` | ✅ Met | `validate-db.js:57–73, 318–330` |
| R80 | "Lobby Set" and "Jhula (Garden Swing)" used and listed for confirmation (03:118) | yes | ✅ Met | BUILD_LOG line 329; `00_INDEX.md` §6 |

### 4.5 Brand and design requirements (03:120–132)

| # | Requirement (Prompt 03) | Current state | Status | Evidence |
|---|---|---|---|---|
| R81 | Names stand alone, no tier prefix needed, ≤ 48 characters (03:124) | longest 39 (31); the two premium tables carry "Premium" because the spec suggested those names | ✅ Met | audit N01–N03 |
| R82 | `brand: "Nilkamal"` only where plausible (plastic) (03:125) | 1–18 | ✅ Met | audit B01 |
| R83 | Otherwise `""`, and the mapping flagged (03:125) | 19–46 `""`; flagged | ✅ Met | audit B01; BUILD_LOG "Brand mapping" |
| R84 | No other manufacturer invented (03:125) | Nilkamal only | ✅ Met | audit B01 |
| R85 | Office, café and outdoor `""` (03:125) | yes | ✅ Met | audit B01 |
| R86 | INR placeholders, realistic for India (03:126) | ₹699–₹38,999 | ✅ Met | R88–R97 |
| R87 | Premium above Essentials within a type (03:126) | 6 pairs (armchairs, chairs, centre tables, high-back, low-back, waiting) | ✅ Met | audit G05 6/6 |
| R88 | Essentials plastic chairs ₹650–₹1,300 (03:126) | ₹699–₹1,149 | ✅ Met | audit M07 |
| R89 | Premium plastic chairs ₹1,400–₹2,900 | ₹1,599–₹2,499 | ✅ Met | audit M07 |
| R90 | Centre tables ₹900–₹2,600 | ₹1,199–₹2,499 | ✅ Met | audit M07 |
| R91 | Shoe racks ₹1,200–₹3,600 across shelf counts | ₹1,249–₹3,449 | ✅ Met | audit M07 |
| R92 | Essentials office chairs ₹3,500–₹8,500 | ₹3,799–₹6,999 | ✅ Met | audit M07 |
| R93 | Premium office chairs ₹9,000–₹22,000 | ₹10,499–₹19,999 | ✅ Met | audit M07 |
| R94 | Waiting chairs ₹4,500–₹16,000 | ₹4,999–₹12,999 | ✅ Met | audit M07 |
| R95 | Café chairs ₹1,800–₹6,500 | ₹1,999–₹4,999 | ✅ Met | audit M07 |
| R96 | Lobby Set ₹18,000–₹45,000 | ₹22,999 / ₹38,999 | ✅ Met | audit M07 |
| R97 | Jhula ₹9,000–₹26,000 | ₹11,999 / ₹21,999 | ✅ Met | audit M07 |
| R98 | Round numbers ending in 49/99/00 (03:126) | every price, compare-at and variant price | ✅ Met | audit M06 46/46 |
| R99 | `comparePrice` on roughly a third, 10–20% above; the rest 0 (03:126) | 16 of 46 (34.8%), 12.5–16.7% above | ✅ Met | audit G06, M04 16/16 |
| R100 | `costPrice` ≈ 60–70% of price (03:126) | 60.7–69.9% | ✅ Met | audit M05 46/46 |
| R101 | All prices flagged (03:126) | yes | ✅ Met | BUILD_LOG Prompt 03 |
| R102 | `shortDescription` ≤ 110 (03:127) | 72–92 | ✅ Met | audit D01 |
| R103 | `description`: 2–3 short paragraphs, `\n\n` (03:127) | 2 prose paragraphs each (the app's parser) | ✅ Met | audit D03; `helpers.test.js:25–37` |
| R104 | Ends with the Specifications paragraph (no specifications field) (03:127) | 46/46 | ✅ Met | audit D02 |
| R105 | Exact format: "Specifications:", `Key: Value` pairs separated by `; ` (03:127) | 46/46 | ✅ Met | audit D02, D05 |
| R106 | 5–7 pairs (03:127) | 6 or 7, as rows on the product page | ✅ Met | audit D04; browser: product/* 46/46 |
| R107 | Realistic and hedged ("approx.") (03:127) | every value in cm or kg carries "approx." | ✅ Met | audit D06 |
| R108 | Never certification or warranty claims (03:127) | none | ✅ Met | audit D07 |
| R109 | Brand voice: refined, warm, no hype (03:127) | no "!" and no hype word of §39.2 ("look its best" in 36 is an idiom) | ✅ Met | audit D08 |
| R110 | Specific: the copy true to the record's own data (03:127, "specific"; guardrail 4) | **Found:** 8 Round Plastic Centre Table: "on a veranda or lawn" (short and meta description) and "a veranda, a lawn or a compact living room", while its Use pair says "Indoor and covered outdoor areas". 19 Lobby Set: "for verandas and lawns" and "veranda, lobby or lawn", while its Use says "Covered outdoor areas and lobbies" and its own prose "finished to sit outdoors under cover". 17 Premium Round Plastic Centre Table: "It sits lower and broader than our everyday tables", but it stands 44 cm against the everyday round table's 42 cm. **Repaired:** "lawn" → "covered terrace" in 8's and 19's short description and first paragraph (meta descriptions follow); 17: "It is broader than our everyday tables" (70 cm against 60 cm) | ✅ Met: repaired by V2-02 (was a gap, §6.2) | before: audit Z03 (8, 17, 19), browser `before/visual/*-details.txt`; after: audit Z03 46/46, browser `after/visual/*-details.txt` |
| R111 | Dimensions and weight realistic per type (03:128) | chairs 43–60 × 49–57 × 76–96 cm, 2.4–6.5 kg; office chairs 57–68 wide, 94–135 high, 9–20 kg; waiting seating 110–220 cm long, 16–30 kg; tables 60–70 cm; racks 50–78 × 30–33 × 96 cm; Lobby Set 150 × 70 × 80 cm, 38 kg and Jhula 190 × 110 × 195 cm, 32 kg (the Large: Prompt 03's recorded convention) | ✅ Met | audit K03; data |
| R112 | (V2 deep check) Specification sizes and weights agree with `dimensions` and `weight` | "Overall size", "Height" and "Seat height" agree (Prompt 34's check passes). **Found:** the three shoe racks print "Width: approx. 50 / 78 / 62 cm" directly above "Dimensions (L × W × H) 50 × 30 / 78 × 32 / 62 × 33 × 96 cm": the width reads 50 in one row and 30 in the next. Prompt 34's check reads only "Overall size" and "Height", so they slipped through. **Repaired:** "Width × depth: approx. 50 × 30 / 78 × 32 / 62 × 33 cm", the fields' first two figures, in Prompt 04's racks' own wording; the validator now reads "Width × depth" and rejects a bare "Width", "Length" or "Depth" | ✅ Met: repaired by V2-02 (was a gap, §6.1) | before: audit Z02 (9, 10, 11), browser `before/spec-covered-plastic-shoe-rack.json`, `before/visual/covered-plastic-shoe-rack-specs.png`; after: audit Z01, Z02 46/46, browser `after/visual/covered-plastic-shoe-rack-specs.png`; `validate-db.js:628–656` |
| R113 | Three images per product (03:129) | 46/46 | ✅ Met | audit I01 |
| R114 | External placeholders falling back to `PLACEHOLDER_IMG` through `onImageError` (03:129) | every data image has `onError={onImageError}` | ✅ Met | `helpers.js:6–15`; `DESIGN_SYSTEM.md` §11 |
| R115 | `placehold.co/1200x1500/<bg>/<fg>` in the design-system tones, 4:5 (03:129) | 138/138 | ✅ Met | audit I02; browser: width/* (ratio 0.80) |
| R116 | Second and third "Detail" / "In+situ" (03:129) | yes | ✅ Met | audit I03 |
| R117 | Category images `1600x1000`, same tones (03:129) | 23/23 | ✅ Met | audit CT14 |
| R118 | Never the reference site's images (03:129) | none | ✅ Met | audit I04 |
| R119 | `featured` on 8–10 across all four departments (03:130) | 9: 1, 11, 12 (Plastic), 19, 20 (Outdoor), 21, 31 (Office), 37, 39 (Café) | ✅ Met | audit G09 |
| R120 | `trending` on 6–8 (03:130) | 7: 4, 7, 9, 27, 30, 38, 40 | ✅ Met | audit G10 |
| R121 | `hot` on 3–4 (03:130) | 4: 14, 18, 33, 45 | ✅ Met | audit G11 |
| R122 | `relatedProductIds`: 3–5 ids (03:131) | 4 on every product | ✅ Met | audit R01 46/46; ≥ 3 asserted since V2-02 (`validate-db.js:537`) |
| R123 | …within the same department (03:131) | 44 of 46. Outdoor holds two products, so 19 and 20 cannot name three of their own: each lists the other first, then 3, 14 and 8, outdoor-suited plastic pieces (Prompt 03's recorded deviation). Listing only the other piece would let `getRelated` fill the rail with office chairs (empty brands match) | ✅ Met (44 of 46; the outdoor pair as far as the data allows) | audit R03; BUILD_LOG line 261; `api.js` `getRelated`; asserted since V2-02, the exception included (`validate-db.js:532–539`) |
| R124 | `frequentlyBoughtTogetherIds` only for natural bundles, 1–2 ids, `[]` elsewhere (03:131) | plastic chairs → a centre table of their tier; tables → two chairs; office high-back → a waiting chair (+ a desk, Prompt 04); waiting seating → a high- or low-back chair; low-back → the matching high-back (24 → 21, 32 → 30) and a desk; shoe racks, outdoor and café `[]` | ✅ Met | audit R04; list in §5 |
| R125 | Dates within the last six months, ISO (03:132) | categories 2026-04-10 → 2026-10-06; products created 2026-04-18 → 2026-09-10, updated ≤ 2026-10-06: within six months before the build (2026-10-07) | ✅ Met | audit CT16, CT17, DT1, DT2 |

### 4.6 Functional guardrails (03:134–142)

| # | Guardrail | Current state | Status | Evidence |
|---|---|---|---|---|
| R126 | 1. Content only; key-set comparison against the boilerplate's first record; the validator asserts it | yes | ✅ Met | audit K01, CT01; `validate-db.js:145, 210` |
| R127 | 1. No new collections or fields; `api.js` unchanged | the 18 collections in the boilerplate's order; `api.js` SHA-256 `c32e6138…` (Prompt 34's) | ✅ Met | `91f7b51` vs `HEAD`; `sha256sum src/services/api.js` |
| R128 | 2. Placeholder tones from `DESIGN_SYSTEM.md` | yes | ✅ Met | R115, R117 |
| R129 | 3. Admin untouched; Products and Categories open every new record (edit dialog, image preview, variant table) | both open and save; the owner's follow-up keeps `attributes`/`swatchHex` on save | ✅ Met | browser: admin/* (17 checks); `704888b` |
| R130 | 4. Names and copy in the A & S Urbanseat voice; no "non-premium" | the voice holds (R109); the three claims their own data contradicted are corrected (R110) | ✅ Met: repaired by V2-02 (was partial, R110) | R109, R110 |
| R131 | 5. Image `?text=` labels meaningful (names reused as `alt`) | each product image's text is its name (+ "Detail", "In situ"); a category image's `alt` is its name | ✅ Met | audit I03; `DESIGN_SYSTEM.md` §39.6 |
| R132 | 6. `rating`/`totalReviews` 0 until Prompt 05 | (R24) | ↪ Superseded by Prompt 05 | R24 |
| R133 | 6. No fake stock: 4–60 per variant | in-stock variants 9–47 (113 of 118 units of sale), the deliberately low 4, 4, 5; products without variants 26–40 | ✅ Met | audit S03 46/46 |
| R134 | 6. 2–3 deliberately low-stock variants (≤ threshold) | 3: 11 "5 shelves" 4/8, 19 "Large" 4/5, 30 "Tan" 5/5 | ✅ Met | audit G07; browser: "Only 4 left" on both |
| R135 | 6. 1–2 out-of-stock variants | 2: 10 "5 shelves", 38 "Antique Brass" | ✅ Met | audit G08; browser: variants/sold-out option disabled |
| R136 | 7. Test before done | Prompt 03 recorded the validator, build, tests and Chromium; V2-02 re-runs them (§1, §11) | ✅ Met | BUILD_LOG lines 313–324 |

### 4.7 What stays broken until Prompt 05 (03:144–146)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R137 | Orders, returns, reviews, wishlist and the deals config keep old references until Prompt 05 | all reseeded by Prompt 05 | ↪ Superseded by Prompt 05 (resolved) | BUILD_LOG Prompt 05; full mode ✓ |
| R138 | The validator runs `--catalogue` now and full mode after Prompt 05 | both pass | ✅ Met | §1 |
| R139 | Document it | "Dangling references left for Prompt 05" | ✅ Met | BUILD_LOG lines 298–300 |

### 4.8 Implementation notes and the validator (03:148–154)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R140 | 1. Read the index, build log, design system, `db.json` and the consuming code | the entry reflects them (variant rules, `slugify`, the parser's format) | ✅ Met | BUILD_LOG Prompt 03 |
| R141 | 2. A throwaway generator; 2-space JSON like the file | 2-space, no trailing newline; `JSON.stringify(JSON.parse(file), null, 2)` reproduces it byte for byte | ✅ Met | round-trip check (312,895 bytes) |
| R142 | 3. Node, no dependencies, exit 1 on failure | yes | ✅ Met | `validate-db.js:24–31, 708–713` |
| R143 | 3. Unique ids, slugs, SKUs | yes | ✅ Met | `validate-db.js:140–141, 199–203` |
| R144 | 3. Category `parentId` references exist | yes | ✅ Met | `validate-db.js:152` |
| R145 | 3. `categoryId` → an active leaf or flat department | yes | ✅ Met | `validate-db.js:229–231` |
| R146 | 3. The variant rules | yes (key set, not order) | ✅ Met | `validate-db.js:253–279` |
| R147 | 3. `price` = min variant price | yes | ✅ Met | `validate-db.js:281` |
| R148 | 3. `stock` = Σ variant stock | yes | ✅ Met | `validate-db.js:283` |
| R149 | 3. Relation ids exist | yes | ✅ Met | `validate-db.js:295–304` |
| R150 | 3. Key-set equality per collection | categories, products (reviews, coupons, shipping methods, banners and wishlist added by Prompt 05) | ✅ Met | `validate-db.js:145, 210, 428–437` |
| R151 | 3. The coverage counts (46 across the slugs, 3 shoe racks × 4 shelf variants) | yes | ✅ Met | `validate-db.js:57–73, 318–340` |
| R152 | 3. Full mode: references, order money, wallet ledger | yes (and Prompts 05, 34) | ✅ Met | `validate-db.js:353–410` |
| R153 | 3. (V2) Every machine-checkable Prompt 03 rule asserted in catalogue mode | **Found, not asserted:** department names; the Prompt 03 subtree's names, parents and `sortOrder` (`TREE` covers Prompt 04 only) and its id ranges; one-sentence category descriptions; the Essentials and Premium hints; "cheap"/"basic"; the `1600x1000` category image; category dates beyond ISO; variant key order; the specifications by the app's parser; hedging; certification or warranty words; the price bands; Premium above Essentials; 49/99/00; compare-at 10–20% and its share; `costPrice` 60–70% (only 0 < cost < price); in-stock variants ≥ 4; exactly 2–3 low and 1–2 sold-out in the 46 (only ≥ 2 and ≥ 1, catalogue-wide); the flag counts and departments; related ≥ 3 and within the department; tier, type and material tags; the image texts; the brand by department; the date window; electronics/fashion words in the catalogue (the scan covers supporting data only). Prompt 34's "Overall size"/"Height" check runs in full mode only and does not read "Width" **Repaired:** each is now asserted in catalogue mode (§8); Prompt 34's check moved into catalogue mode unchanged and extended; the specifications read by the app's own `parseSpecifications`. Nothing removed or loosened. Self-test: 41 seeded faults, all reported | ✅ Met: repaired by V2-02 (was a gap, §6.3, §8) | before: `validate-db.js` read in full; after: `validate-db.js:127–183, 199–212, 276–319, 469–656`; the baseline seed now fails on the three shoe racks only; self-test §8 |
| R154 | 4. Keep JSON Server running while editing | a process note; V2-02 ran it on a scratch copy | ✅ Met | §1 |
| R155 | 5. Demo accounts untouched | `users` and `admins` unchanged by `6616837` | ✅ Met | per-collection comparison |

### 4.9 Acceptance criteria (03:156–164)

| # | Criterion | Current state | Status | Evidence |
|---|---|---|---|---|
| R156 | The tree with correct `parentId`, `slug`, `showInMainMenu`, `menuOrder`, `sortOrder`, descriptions and placeholder images | yes | ✅ Met | audit CT01–CT22 |
| R157 | Exactly 46 active products per the checklist; shoe racks 4 shelf variants; Lobby Set and Jhula Small/Large | yes | ✅ Met | audit G01–G04, V01 |
| R158 | Every record's exact key set; `--catalogue` passes | yes | ✅ Met | audit K01, CT01; §1 |
| R159 | No "non-premium", electronics/fashion copy or reference-site images | none | ✅ Met | audit G15, X01, I04 |
| R160 | `dealsConfig` id arrays `[]` | (R10) | ↪ Superseded by Prompt 05 | R10 |
| R161 | Storefront (JSON Server): six departments in the header; `plastic-furniture` lists every Plastic product; each product page by slug with variant selection and add to cart; search "chair" | all | ✅ Met | browser: menu/* (4), listing/* 23/23 (plastic-furniture 21 of 21), product/* 46/46, variants/* (10), cart/drawer lines, search/chair (42) |
| R162 | Admin → Categories and Products open and edit the new records | yes | ✅ Met | browser: admin/* |

### 4.10 Test and QA (03:166–174)

| # | Step | Result (V2-02 baseline pass) | Status | Evidence |
|---|---|---|---|---|
| R163 | 1. `/`, `/products`, `office-chairs-premium`, `plastic-shoe-racks`, a shoe rack (price, SKU, stock change), a café chair (swatches), the Lobby Set (sizes), add each to cart, the drawer, search "waiting" | all as specified: 8 and 3 pieces; ₹1,899 → ₹3,449, `PLE-SHR-03-2S` → `-5S`, "In stock" → "Only 4 left"; three Finish swatches in their hex; Small ₹22,999 / Large ₹38,999 "Only 4 left"; the drawer's three lines; "waiting" 6 results | ✅ Met | browser: listing/*, variants/*, cart/drawer lines, search/waiting |
| R164 | 2. 360, 768, 1024, 1440: long names wrap, images keep 4:5 | no horizontal overflow, the `h1` fits, image ratio 0.80 | ✅ Met | browser: width/* 16/16 |
| R165 | 3. Variant tiles by keyboard | ArrowLeft and End move and choose | ✅ Met | browser: variants/keyboard |
| R166 | 4. Build passes; tests exit 0 | yes | ✅ Met | §1 |
| R167 | 5. Nothing relies on a JSON Server-only shape | data only | ✅ Met | `git show --stat 6616837`; `QA_CHECKLIST.md` D |
| R168 | 6. Admin: Categories tree; Products filters by the new categories; edit and save without change leaves the record unchanged | 43 rows; "Shoe Racks" → 3 rows; 10 products and 5 categories saved unchanged: identical apart from `updatedAt`, which `api.js`'s mock stamps on every save | ✅ Met | browser: admin/*; `api.js` `admin.updateProduct`, `updateCategory` |
| R169 | 7. The build-log entry: the coverage table with ids and names, id ranges, image URL pattern, price bands, brand mapping, dangling references, "Needs client confirmation" | all present; two figures are off: "15 of 46 products have a `comparePrice`" (its own table lists 16) and "variants hold 9–48 units" (9–47). **Repaired:** the correct figures are recorded in the V2-02 entry; Prompt 03's entry stays as written (V2-01's precedent) | ✅ Met: repaired by V2-02 (was partial, §6.4) | BUILD_LOG lines 226–333; audit G06; the V2-02 entry |

### 4.11 Per-record deep checks of the V2-02 prompt not already rows above

| # | Check | Current state | Status | Evidence |
|---|---|---|---|---|
| R170 | One hex per colour name across the catalogue | e.g. White `#f4f2ee`, Coffee Brown `#6b4a33`, Walnut `#5c3d2e` everywhere | ✅ Met | audit G14 |
| R171 | A variant's name equals its attribute value (cart and orders print the name, the selector the value) | 114/114 | ✅ Met | audit A04 |
| R172 | `metaTitle` "<name> \| A & S Urbanseat" and `metaDescription` ≤ 160 (the page's title and description since Prompt 32) | 46/46; 104–124 characters | ✅ Met | audit X03, X04; `ProductDetails.js:503–517` |

**Totals, counted from the tables.** 172 requirements.
- **As found:** ✅ Met 160 · ↪ Superseded 7 (R3, R10, R24, R51, R132, R137, R160) · ❌ Gap 3 (R110, R112, R153) · ⚠ Partial 2 (R130, R169).
- **Now:** ✅ Met 165 (R110, R112, R130, R153 and R169 repaired by V2-02) · ↪ Superseded 7 · ❌ 0 · ⚠ 0.

## 5. Audit-script summary (baseline)

`node audit-v2-02.mjs db.json`: **3,054 checks, 8 failures** (23 categories in scope, 46 products). A first run flagged two more that are not defects, and the rules were narrowed: "look its best" (36) is an idiom, not §39.2's superlative; the Jhula's Use pair names gardens, so "lawn" is true there.

| Rule | Pass | Fail |
|---|---|---|
| CT01–CT17 per category (keys; tree name, slug, parent, `sortOrder`, menu; parent exists; active; one sentence; no cheap/basic; tier hints; image pattern and text; dates) | 23 each (CT12, CT13: 2) | 0 |
| CT18–CT22 tree-wide (`sortOrder` 1..n everywhere; only departments in the menu; id ranges; gaps 7–9, 19, 28, 29; department order) | 5 | 0 |
| K01–K04 keys, `variants` array, dimensions, variant key order | 184 | 0 |
| A01–A07 attributes, swatches, names = values, ids v1…vn, one price per colour, every colour a swatch | 304 | 0 |
| V01 variants as the line specifies | 46 | 0 |
| M01–M07 price = min, card/quick-add price, compare ≥ price, compare 10–20%, cost 60–70%, 49/99/00, band | 292 | 0 |
| S01–S03 stock sum, threshold 3–8, 4–60 unless low or sold out | 138 | 0 |
| D01–D08 short description, "Specifications: ", 2–3 paragraphs and 5–7 rows (app parser), `; ` pairs, "approx.", no certification/warranty, voice | 368 | 0 |
| Z01 sizes and weights against the fields ("Overall size", "Height", "Seat height", "Weight") | 46 | 0 |
| **Z02 no bare "Width"/"Length"/"Depth" beside the L × W × H row** | 43 | **3** (9, 10, 11) |
| **Z03 copy makes no claim its own specs or fields contradict** | 43 | **3** (8, 17, 19) |
| N01–N06 name, model numbers, suggested name, slug, SKUs | 276 | 0 |
| B01 brand by department | 46 | 0 |
| I01–I04 three images, pattern, texts, no reference site | 184 | 0 |
| T01–T05 tags lowercase, brand, tier, type, material | 230 | 0 |
| R01, R02, R04 related 3–5, exist and active, FBT 0–2 | 138 | 0 |
| **R03 related within the department** | 44 | **2** (19, 20: R123) |
| DT1, DT2 dates | 92 | 0 |
| X01–X04 no electronics/fashion, active, meta title, meta description | 184 | 0 |
| G01–G15 aggregates (coverage 15/15, 46 active, ids 1–46, 18/16/10/2, Premium > Essentials 6/6, compare 16/46, low 3, sold out 2, featured 9 in 4 departments, trending 7, hot 4, SKUs and slugs unique, one hex per colour, no "non-premium") | 34 | 0 |

Failures: `[8] Z03 copy says "lawn"; Use: Indoor and covered outdoor areas` · `[9] Z02 Width: approx. 50 cm vs W=30` · `[10] Z02 Width: approx. 78 cm vs W=32` · `[11] Z02 Width: approx. 62 cm vs W=33` · `[17] Z03 says lower than Round Plastic Centre Table but 44 cm ≥ 42 cm` · `[19] Z03 copy says "lawn"; Use: Covered outdoor areas and lobbies` · `[19] R03 cross-department 3,14,8 (department holds 2)` · `[20] R03 cross-department 3,14,8 (department holds 2)`.

Bundles (`frequentlyBoughtTogetherIds`, R124): 1, 2, 3 → 8 · 4, 5, 6 → 7 · 7 → 1, 2 · 8 → 1, 3 · 12, 13, 14 → 17 · 15, 16 → 18 · 17 → 12, 14 · 18 → 12, 15 · 21, 22, 23 → 27, 77 · 24 → 21, 79 · 25 → 79 · 26 → 21 · 27 → 21, 24 · 28 → 22 · 29, 30, 31 → 35, 76 · 32 → 30, 76 · 33 → 78 · 34 → 30 · 35 → 29, 32 · 36 → 29 · the rest `[]`.

Report-only output (not Prompt 03 rules; §9): the product page's related rail (`getRelated`, limit 10) takes pieces from another department on 28 of the 46 pages; six orders and two reviews are dated before their product's `createdAt`; ratings agree with the approved reviews.

**After the repair** (same script, same 3,054 checks): **0 failures.** R03 now encodes the Outdoor exception the way the validator does (a department with fewer than four products lists its own products first), so the recorded deviation of 19 and 20 passes as designed; run on the baseline seed with that rule, the audit fails on exactly the six gap items above (8, 9, 10, 11, 17, 19).


## 6. Gaps found and repairs

Every data repair was made by one script (`repair-v2-02.cjs`, session scratchpad): each edit an exact replacement that must match once, values changed in place on the parsed objects (key sets and key order untouched), the file written back as 2-space JSON without a trailing newline. `JSON.stringify(JSON.parse(db.json), null, 2)` reproduced the seed byte for byte before the run, so the diff is exactly the ten field values below (§7). `updatedAt` is not moved: Prompt 34's seed corrections did not move it either, and the six-month rule (R125) keeps it at or before the build.

### 6.1 R112: the shoe racks' "Width" read against the table's own W

- **Found.** The specifications table prints the parsed pairs, then "Dimensions (L × W × H)" from the fields (Prompt 17). On the three shoe racks a bare "Width: approx. 62 cm" sat four rows above "62 × 33 × 96 cm": the width was 62 in one row and 33 in the other. Prompt 34's check reads only "Overall size" and "Height", so the rows slipped through.
- **Repair** (descriptions of 9, 10, 11):

  | Product | Before | After |
  |---|---|---|
  | 9 Slim Plastic Shoe Rack | Width: approx. 50 cm | Width × depth: approx. 50 × 30 cm |
  | 10 Wide Plastic Shoe Rack | Width: approx. 78 cm | Width × depth: approx. 78 × 32 cm |
  | 11 Covered Plastic Shoe Rack | Width: approx. 62 cm | Width × depth: approx. 62 × 33 cm |

  The figures are the fields' first two, in the table's order; "Width × depth" is the wording Prompt 04's racks (71, 72) already use. The pairs stay seven; the "Height" pair (each shelf count) and the 5-shelf fields (Prompt 03's recorded convention) stay.
- **Tests.** Two pinned the old row and now expect the corrected one, as the scope allows for a data fix that changes a pinned value: `src/pages/ProductDetails/productSpecs.test.js:22` (the row keys: "Width" → "Width × depth") and `src/pages/ProductDetails/ProductDetails.test.js:809` (the rendered row: `["Width", "approx. 62 cm"]` → `["Width × depth", "approx. 62 × 33 cm"]`). Nothing else in either test changed.
- **Re-verified.** Audit Z01/Z02 46/46. The product page shows "Width × depth approx. 62 × 33 cm" above "Dimensions (L × W × H) 62 × 33 × 96 cm" (`before/visual/covered-plastic-shoe-rack-specs.png` → `after/visual/…`; the slim and wide racks likewise). The tightened validator rejects the baseline seed on exactly these three.

### 6.2 R110 (and R130): three claims the records' own data contradicted

| Product | Field | Before | After |
|---|---|---|---|
| 8 Round Plastic Centre Table | `shortDescription` | "…fits easily between chairs on a veranda or lawn." | "…fits easily between chairs on a veranda or a covered terrace." (95 characters) |
| 8 | `description`, paragraph 1 | "…between chairs on a veranda, a lawn or a compact living room." | "…between chairs on a veranda, a covered terrace or a compact living room." |
| 8 | `metaDescription` | the old short description + " Shop online at A & S Urbanseat." | the new one + the same suffix (127 characters) |
| 19 Lobby Set | `shortDescription` | "An outdoor seating set for verandas and lawns, in a small and a large configuration." | "An outdoor seating set for verandas and covered terraces, in a small and a large configuration." (95) |
| 19 | `description`, paragraph 1 | "A complete seating group for the veranda, lobby or lawn: …" | "A complete seating group for the veranda, lobby or covered terrace: …" |
| 19 | `metaDescription` | follows the short description | (127) |
| 17 Premium Round Plastic Centre Table | `description`, paragraph 2 | "It sits lower and broader than our everyday tables, with room for a tray and a vase." | "It is broader than our everyday tables, with room for a tray and a vase." |

- **Why the copy, not the fields.** The fields are what the admin edits and the table prints; Prompt 34 made copy agree with them. 8's and 19's own Use pairs say "Indoor and covered outdoor areas" and "Covered outdoor areas and lobbies", and 19's own prose says "finished to sit outdoors under cover"; "covered terrace" is the specs' own meaning. The Jhula (20), whose Use names gardens, keeps "lawn". 17 stands 44 cm against the everyday round table's 42 cm, but 70 cm against 60 cm across: "broader" is true, "lower" is not.
- **Why this is not a §39.9 rewrite.** §39.9 keeps suggested wording out of `db.json`. These edits correct facts the records contradict, as Prompt 34's size corrections did; no voice change and no other copy. Prompt 29's open proposals (the Plastic Furniture and Office Tables & Desks descriptions, straight apostrophes) stay with the client (R51).
- **Snapshots.** None of 8, 17, 19 is in a wishlist row; orders keep names, images and SKUs, not descriptions. Full mode passes.
- **Re-verified.** Audit Z03 46/46; the product pages' "About this piece" read the new sentences (`after/visual/*-details.txt`).

### 6.3 R153: the validator

Every machine-checkable rule of Prompt 03 is now asserted in catalogue mode (which full mode also runs): §8.

### 6.4 R169: the Prompt 03 entry's figures

The V2-02 build-log entry records the correct figures; Prompt 03's entry stays as written. 16 of the 46 products carry a compare-at price, not 15 (its own table lists 16: 2, 5, 7, 11, 12, 18, 19, 21, 25, 27, 29, 33, 35, 37, 40, 46); in-stock variants hold 9–47 units, not 9–48.

### 6.5 Left as they are, on purpose

- **Plastic Furniture's "weather-ready … stack away neatly" and Office Tables & Desks' "…a day productive"** (R51): Prompt 29 judged both and left them to the client (§39.9).
- **Straight apostrophes** in product copy: Prompt 29's open item ("typography only, for a later content pass").
- **The Outdoor pair's cross-department relations** (R123): the department holds two products; the validator now encodes the exception.
- **The Lobby Set's and Jhula's dimensions and weight**, which describe the Large (Prompt 03's recorded convention; O1).
- **Product dates against older orders and reviews**: V2-04's (F2).

## 7. Identity stability (before → after)

`compare-identity.cjs` on the snapshots the audit wrote at the baseline (`identity-before.json`, seed SHA-256 `3fc7f8f3…`) and after the repair (`identity-after.json`, seed `887637ee…`):

```
IDENTICAL collection list and order (18 collections)
IDENTICAL record counts per collection (banners 3, users 3, admins 1, categories 43, products 84, cart 0, orders 11, returns 2, payments 9, refunds 3, shipping_methods 4, coupons 5, reviews 26, wishlist 3, leads 4, settings object, walletTransactions 3, dealsConfig object)
IDENTICAL categories: id, slug, parentId, key order (43 records)
IDENTICAL products: id (84 records)
IDENTICAL products: slug (84 records)
IDENTICAL products: sku (84 records)
IDENTICAL products: categoryId (84 records)
IDENTICAL products: keys (84 records)
IDENTICAL products: dims (84 records)
IDENTICAL products: variants (84 records, 199 variants (id, SKU, key order, attribute keys))
IDENTICAL products: rating (84 records)
IDENTICAL products: totalReviews (84 records)
IDENTICAL banners, users, admins, cart, orders, returns, payments, refunds, shipping_methods, coupons, reviews, wishlist, leads, settings, walletTransactions, dealsConfig (SHA-256 of each collection, 16 lines)
IDENTICAL products 47–84 (SHA-256)
IDENTICAL categories outside 1–6, 10–29 (SHA-256)

30 comparisons, 0 changed
```

Every field that differs between the two seeds (a field-by-field walk of all 18 collections): `products[8].shortDescription`, `products[8].description`, `products[8].metaDescription`, `products[9].description`, `products[10].description`, `products[11].description`, `products[17].description`, `products[19].shortDescription`, `products[19].description`, `products[19].metaDescription`. **10 fields; no id, slug, SKU, variant id, category placement, key, key order, rating or collection changed.** `git diff --stat db.json`: 10 insertions, 10 deletions.

## 8. Validator assertions added

All in `scripts/validate-db.js`, in the part both modes run; marked "V2-02". Nothing removed or loosened.

- **The app's own functions** (`:199–212`): `parseSpecifications` and `slugify` read from `src/utils/helpers.js` and run as the storefront runs them; the script fails if either cannot be read.
- **Categories** (`:276–319`): the six department names; the Prompt 03 subtree (`TREE_03`: id, name, slug, parent, `sortOrder`, active for 10–18 and 20–27); ids 10–19 under Plastic Furniture, 20–29 under Office Chairs; every description one sentence ending in a full stop; no "cheap" or "basic"; every image a `1600x1000` placeholder in the tones (or a Cloudinary photograph); `createdAt` ≤ `updatedAt` ≤ now; the Essentials groups say "dependable everyday value", the Premium groups "heavier build" and "finer finish"; the 23 Prompt 03 categories created within the six months before the build (2026-04-07 → 2026-10-07).
- **Every product** (`:469–543`): no electronics or fashion words in the catalogue; variant key order; a variant's name equals its attribute value; a variant's SKU is the product's plus a code; colour or finish options share one price; the slug is `slugify()` of the folded name; the product page's parser reads 2–3 paragraphs and 5–7 specification rows; centimetres and kilograms carry "approx."; no certification or warranty words; no "!"; names without a tier prefix or a model number; prices ending 49/99/00; a compare-at price 10–20% above (whole-number arithmetic); cost 60–70% of the price; stock 0–60 on a product without variants; placeholder images labelled with the name, "… Detail", "… In situ"; `metaTitle` set and `metaDescription` set and ≤ 160 characters; at least 3 related ids, all in the department (a department of fewer than four products lists its own first); the tier tag under an Essentials or Premium group; no date in the future.
- **The 46** (`:545–589`): each line's price band (the Lobby Set and the Jhula by product); each line's variants (attribute and number of options); the type tag; a material tag the specifications use; Nilkamal on plastic, no brand on office, café and outdoor; all active; created within the window; exactly 46; Premium above Essentials in six pairs; compare-at prices on 25–40% (16 of 46); 2–3 low-stock and 1–2 sold-out variants; featured 8–10 across the four departments, trending 6–8, hot 3–4.
- **Sizes** (`:591–656`): Prompt 34's "Overall size"/"Height" check, moved unchanged out of the full-mode block so `--catalogue` runs it too (full mode still does); "Width × depth" equals L × W; a bare "Width", "Length" or "Depth" fails; "Seat height" below the overall height; a "Weight" pair (it replaces the field's row) equals the field; the script's reading of the pairs equals the product page's.
- **Summary:** a "Prompt 03 set (V2-02)" row (46 products: compare-at 16, low 3 / sold out 2, featured 9 / trending 7 / hot 4).
- **Scope.** Catalogue-wide where all 84 products already pass (Prompt 04's included); the checklist's own rules (bands, lines, counts, brand by department, type and material tags, the window) for the 46. V2-03 can widen those to Prompt 04's records (F3).
- **Self-test** (`selftest.cjs`, scratchpad): 41 faults seeded into a scratch copy, at least one per new assertion plus Prompt 34's moved check → **52 problems, exit 1, every fault reported**. A compare-at price exactly 10% above passes; a badly encoded image label is reported, not a crash. On the baseline seed the validator fails on exactly the three shoe racks; on the repaired seed it passes in both modes.
- **Lint:** `eslint` (node, ES2022, `no-undef`, `no-unused-vars`, `no-redeclare`) finds nothing new; one pre-existing `no-shadow` warning in Prompt 05's coupon code.

## 9. Findings for V2-03, V2-04 and V2-05

| # | Finding | Owner |
|---|---|---|
| F1 | `getRelated` (`api.js`) tops up the curated ids with the same category, then any product with the **same brand or a shared tag**. Every unbranded product matches every other (`"" === ""`), and the tier tags "essentials"/"premium" are shared across departments, so on 28 of the 46 pages the 10-piece "You may also like" rail shows pieces from another department: Essentials office chairs show plastic Essentials chairs (1–6), Premium office chairs show Premium plastic chairs (12–17), the outdoor pair show office chairs (21–25), café chairs show a plastic chair. The curated ids are within the department (asserted). A fix (skip empty brands; prefer the same department) is in `api.js`, a protected file | V2-05 / owner |
| F2 | Orders and reviews dated before their product's `createdAt`: ORD-20250310-0001 (2026-01-15) → 29 (created 2026-08-05); ORD-20250318-0002 (2026-02-01) → 33 (2026-08-03); ORD-20260310-0003 (2026-03-10) → 40 (2026-06-11); ORD-20260315-0004 (2026-03-15) → 6 (2026-06-06); ORD-MMYJ01ED-ZR26 (2026-03-20) → 20 (2026-07-17); ORD-MQDVIQCV-30A9 (2026-06-14) → 9 (2026-09-05); reviews 2 (2026-06-24, product 9) and 3 (2026-02-20, product 33). Prompt 05 recorded keeping the order timestamps. Prompt 03's window (2026-04-07 → 2026-10-07) leaves only product 9 movable from the catalogue side; the rest need the order side | V2-04 |
| F3 | 22 Prompt 04 products carry no material tag (47–50, 58–63, 66–68, 71, 72, 76–81), which Prompt 03's tag rule asks for and V2-03 inherits; V2-02 asserts it for the 46 only. V2-03 can also extend the checklist assertions (bands, counts, window) to Prompt 04's lines | V2-03 |
| F4 | The mattresses' "Sizes: Single 36 × 78, … King 72 × 78 in" (58, 59) are nominal sizes without "approx."; the hedging assertion covers cm and kg only | V2-03 |
| F5 | The home Featured rail in JSON Server mode takes the first 8 featured products by id (`getFeatured`: `slice(0, 8)`), all Prompt 03's (1, 11, 12, 19, 20, 21, 31, 37); Prompt 04's five featured pieces (47, 55, 68, 74, 76) and 39 never appear there | V2-03 / V2-05 |
| F6 | The V2-02 prompt says Prompts 29 and 32 edited catalogue copy and data; neither did (`git log --full-history -- db.json`: Prompts 03, 04, 05, 34 only). Prompt 29 proposed copy; Prompt 32 reads `metaTitle`/`metaDescription` | V2-05 (sign-off wording) |
| F7 | An admin save stamps `updatedAt` (`api.js`'s mock, by design), so "edit and save without change" leaves a record identical **apart from `updatedAt`**, and `git diff db.json` stays empty only when JSON Server runs on a scratch copy (`JSON_SERVER_DB`), as every V2 browser pass does | V2-05 (check wording) |

## 10. Observations (no change)

- **O1. The Lobby Set and the Jhula** describe the Large in their dimension and weight fields (Prompt 03's recorded convention). With Small chosen the table still shows 150 × 70 × 80 cm and 38 kg (Lobby Set) or 190 × 110 × 195 cm and 32 kg (Jhula); the specifications list each size's contents but not its measurements. Prompt 04's sized products give every option's size in the paragraph. The client's real per-size measurements would settle it (§12).
- **O2. The V2-02 grep** (`laptop|phone|headphone|t-shirt|sneaker|electronics|fashion`) matches nothing in the 46 or the in-scope categories. Across the catalogue it matches three Prompt 04 records' furniture copy ("a laptop in bed" on the folding bed table and its category, "the phone" on a bedside table) and "sarees" on the iron alna: legitimate, V2-03's. The validator's catalogue scan leaves out "laptop" and "phone" for that reason.
- **O3. Search** "chair" returns 42 results today (Prompt 03 recorded 41 on the listing; Prompt 15 changed the search and Prompt 04 added pieces); "waiting" returns the 6 waiting pieces.
- **O4. Child category images** are labelled with slug words (Prompt 03's choice); only the departments' images are shown (mega-menu, home tiles), with the category name as `alt`.
- **O5.** The validator runs `parseSpecifications` and `slugify` from `helpers.js`'s source; changing how either is declared makes it fail loudly with a pointer to `appFunction()`.

## 11. Gate (after the repairs)

| Check | Result |
|---|---|
| `node scripts/validate-db.js --catalogue` | `✓ all checks passed` (43 categories, 84 products, 199 variants; Prompt 03 set: 46, compare-at 16, low 3 / sold out 2, featured 9 / trending 7 / hot 4) |
| `node scripts/validate-db.js` (full) | `✓ all checks passed` |
| The tightened validator on the baseline seed | fails, on exactly the three shoe racks (exit 1) |
| Validator self-test | 41 seeded faults, all reported (52 problems, exit 1) |
| Audit script | 3,054 checks, 0 failures (6 on the baseline seed) |
| `CI=true npm test -- --passWithNoTests` | **86 suites, 1,429 tests, exit 0** (93 s), no console warning; the same as at the start |
| `npm run build` (`.env.production`) and `CI=true npm run build` | "Compiled successfully." main JS 399.62 kB, CSS 34.97 kB gzip (Prompt 34's figures); only the dependency notices of `DESIGN_SYSTEM.md` §43.6 |
| Build in JSON Server mode | 399.59 / 34.97 kB; every one of its 35 files byte-identical to the baseline build (no app code changed) |
| Browser, JSON Server mode, scratch `db.json` | **after: 120 of 120** (before: 120 of 120): the six departments in order and two flyouts; 23 listings each equal to the data (`plastic-furniture` 21 of 21, `office-chairs-premium` 8, `plastic-shoe-racks` 3); all 46 product pages with their specifications tables; the shoe rack's options (price, SKU, stock), arrow keys, the café chair's swatches, a sold-out option, the Lobby Set's sizes; three lines in the cart drawer; search "chair" 42, "waiting" 6; 360/768/1024/1440 without overflow and with 4:5 images; the admin's categories tree (43), its "Shoe Racks" filter (3), and edit-save without change on products 1, 8, 9, 10, 11, 17, 19, 20, 26, 37 and categories 1, 4, 11, 14, 24, each record identical apart from the `updatedAt` the mock stamps; console clean |
| Development server (`npm start`, mock mode) | 18 loads (light and dark; home, two listings, the six repaired product pages): 0 console errors or warnings |
| ESLint, the two edited tests | 17 findings before and after (pre-existing testing-library rules) |
| Scope of the change | `db.json` (10 field values), `scripts/validate-db.js`, the two tests, this report, `prompts/BUILD_LOG.md`. `src/services/api.js` SHA-256 `c32e6138…` (unchanged); no admin, `public/` or other `src/` file. The repository's `db.json` was never written by the app (SHA-256 `887637ee…` after both browser passes) |

## 12. Needs client confirmation (these ranges)

- **All 46 product names** (placeholders; "Square/Round Plastic Centre Table" are the only names from the client's site).
- **"Lobby Set"** (our reading of "Looby set") and **"Jhula (Garden Swing)"** ("Julna"), what their Small and Large contain, and their real measurements and weights per size (the fields hold the Large's: O1).
- **Prices, compare-at prices, cost prices and stock levels** (bands in R88–R97; 16 compare-at prices; the deliberately low and sold-out options).
- **Specifications, dimensions, weights, colours and finishes**, including the shoe racks' "Width × depth" figures and where the plastic tables and the Lobby Set may stand (the copy now says covered terraces, as their specifications do).
- **Brand attribution:** Nilkamal on all 18 plastic pieces; office, café and outdoor pieces unbranded.
- **Category copy** and the tier names Essentials and Premium, including Prompt 29's proposals for Plastic Furniture ("weather-ready" and stacking unconfirmed) and Office Tables & Desks.
- **Straight apostrophes** in product copy (Prompt 29).
- **Merchandising:** the featured, trending and hot flags; the related pieces, including the Outdoor pair's plastic picks (3, 14, 8); the bundles.
