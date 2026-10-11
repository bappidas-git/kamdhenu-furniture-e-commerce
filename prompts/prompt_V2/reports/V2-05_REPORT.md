V2 baseline: 0b9153e490c87c0713c8c802f67185266da424a2 · V2-05 start: 4b6127a (V2-04 merged)

# V2-05 report: full regression and sign-off after the V2 re-verification

**Date:** 2026-10-11. **Re-runs:** Prompt 34's final QA (`prompts/34_final-qa-and-parity.md`, executed in `prompts/QA_CHECKLIST.md`) against the repository after V2-01…V2-04, as the V2-05 prompt's checklist A–F, with extra depth on every surface the V2 changes reach. **Start:** `git rev-parse HEAD` = `4b6127a`; `db.json` SHA-256 `a15d361a…` (V2-04's seed); `src/services/api.js` SHA-256 `c32e6138…`.

**Status: complete. Every checklist row passes, all 26 findings handed forward are closed, zero known issues.**
- **Impact map** (§2): V2 changed no bundled source. Every app-visible difference since the V2 baseline is 70 `db.json` values (no id, slug, SKU, key or record count) and two `index.html` insertions; each was traced to its consumers and exercised.
- **Findings** (§3): 26 rows from the four reports. 15 end `Fixed`: 10 in this pass (`5d7e3cf`) and 5 earlier in V2 (`eb62f33`, V2-03; `a3e3d74`, V2-04); 11 end `Not a defect`, each with its reason. Four rows close both ways: the part that was a defect is fixed, the rest is kept by a documented rule or decision (N8, N9, N15, N16).
- **Defects found and fixed by this pass** (§4): five, each with regression tests that fail before the fix: the home Featured rail never reached Prompt 04's pieces; a product switched off in the admin stayed on the listing, search, offers page, home rails and its own page; an unbranded piece's related rail was filled with every other unbranded piece; the browser's colour ignored the site's light/dark switch; with site data blocked the storefront showed only the crash screen. 27 tests added (3 new suites), none removed; one test file's expectations updated where Prompt 04's spec proves them wrong (§4.3).
- **Checklist** (§5): A–F pass. Browser: **668 of 668** checks pass on the final build (before the fixes: 650 of 660: the five defects of §4, a harness fault in C1.1, and F3, which then counted the admin coupon form's documented, pre-existing expiry rewrite in the same row as the rule; it is now a noted row of its own).
- **Gate** (§6): validator ✓ in both modes; Jest **89 suites, 1,456 tests** (86 and 1,429 at the start), exit 0, no console output; `CI=true npm run build` "Compiled successfully." with zero warnings, main JS **400.28 kB** (+0.66 kB), CSS 34.97 kB (unchanged); `api.js`, the admin, and the ids, slugs and SKUs unchanged across all of V2.

---

## 1. How this was checked

- **Read in full:** `prompts/00_INDEX.md`; `prompts/prompt_V2/00_README.md`; the four V2 reports and their build-log entries; `prompts/34_final-qa-and-parity.md`; `prompts/QA_CHECKLIST.md`; `prompts/QA_RESPONSIVE_A11Y.md`; `DESIGN_SYSTEM.md` §43 (and §12, §39.9, which findings name); the backend contract files `01_DATABASE_SCHEMA.md` and `02_API_ENDPOINTS.md` where a fix depends on them.
- **Environment:** `npm ci` (Node 22.22.0, npm 10.9.4). JSON Server (`server.js`) on :3001 against a **scratch copy** of `db.json` (`JSON_SERVER_DB`), reset from the committed seed before every suite that writes; the repository's `db.json` was never written (SHA-256 `a15d361a…` at the start, after every suite and at the end). The development server (`npm start`, :3000) for the console sweep. Production builds in JSON Server mode (`REACT_APP_API_URL=http://localhost:3001 REACT_APP_USE_MOCK_API=true CI=true npm run build`) served with `serve -s` on :5000: the start-of-pass build (`4b6127a`, the "before" run) and the final build (the "after" run).
- **Browser checks:** Playwright 1.56.1 driving Chromium 141 (headless shell; full Chromium in new headless mode for the blocked-storage profile and Lighthouse), axe-core 4.10.3, Lighthouse 12.8.2. Twenty-one suites in the session scratchpad (not committed), each recording `{ id, ok, detail }` rows; expectations are read from the data at run time or computed with the app's own modules (loaded through `babel-preset-react-app`, as Jest does). Suite names are the checklist rows: `C1-catalogue` … `C13-static` (with `C2b-quantity`), `B-brand`, `E-responsive-a11y` (with `E2b-keyboard`), `F-admin`, `A6-console`, and two for this pass's defects, `X-defects` and `S-storage-blocked`.
- **Static checks:** `git diff`/`git log` against the V2 baseline and `90402a2`; a field-by-field walk of `db.json` from the V2 baseline to `HEAD` (§2.2); an identity dump of every id, slug, SKU, variant, order line and key order (§5, D); the grep gates of Prompt 34 §B and §D.
- **Order of work:** the before run on the start-of-pass build; the fixes, each with its regression tests run first against the unfixed code (they failed, §4) and then against the fix; the whole gate; the after run on the final build; E and the keyboard sweep on both builds after their harness fixes; Lighthouse on both builds; the gate again on the exact tree committed (its JSON Server-mode build is byte-identical to the one the browser suites tested).

## 2. Impact map

### 2.1 What V2 changed

`git diff --stat 0b9153e..4b6127a` (the V2 baseline to the merge of V2-04): 11 files, +4,606 / −97.

| File | Changed by | What | Bundled? |
|---|---|---|---|
| `public/index.html` | V2-01 | `media="(prefers-color-scheme: light)"` on the paper `theme-color`; `<noscript><style>#loading-screen{display:none}</style></noscript>` | the HTML shell only (no JS or CSS bundle) |
| `db.json` | V2-02 (10 paths), V2-03 (34), V2-04 (26) | 70 field values; no id, slug, SKU, key, key order, record count or collection (§5, D) | data |
| `scripts/validate-db.js` | V2-02, V2-03, V2-04 | catalogue and full-mode assertions (+867 lines, tightened only) | dev tool |
| `src/pages/ProductDetails/productSpecs.test.js`, `ProductDetails.test.js` | V2-02 | the shoe rack's "Width × depth" row (1 line each) | tests |
| `src/pages/SpecialOffers/SpecialOffers.test.js` | V2-04 | WELCOME500's description (1 line) | tests |
| `prompts/BUILD_LOG.md`, `prompts/prompt_V2/reports/*` | all four | entries and reports | docs |

**No bundled source changed:** `git diff --stat 0b9153e..4b6127a -- src ':(exclude)src/**/*.test.js'` is empty, and `package.json`, `package-lock.json`, `server.js`, `.env*` and `src/services/api.js` are untouched. V2-01 and V2-04 each found every file of the production bundles byte-identical to their starting build's. So every app-visible difference is data read through `apiService.*`, or the two `index.html` insertions. The regression concentrated on the surfaces that read those 70 paths and re-ran the whole checklist for everything else.

### 2.2 The 70 `db.json` paths and every consumer

A field-by-field walk of `git show 0b9153e:db.json` against `HEAD` lists exactly 70 changed paths (V2-02's 10 + V2-03's 34 + V2-04's 26, as their reports state).

| Records (paths) | V2 | Consumers in `src/` (non-test) | Checked by |
|---|---|---|---|
| `banners[1–3].gradient` (3) | V2-04 | none: `apiService.banners.getAll` has no caller (Prompt 10), and the admin has no banners page | D (grep), validator |
| `settings.seo.metaTitle` (1) | V2-04 | none: the storefront takes its titles from `usePageMeta` / `DEFAULT_PAGE_TITLE` (Prompt 32); Admin → Settings does not show `seo` | B3 (equals `index.html`'s title and `DEFAULT_PAGE_TITLE`), F (settings saved unchanged) |
| `categories[34, 47].description` (2) | V2-03 | the listing's introduction and the page description (`Products.js` → `usePageMeta`); not the mega-menu (it reads a department's description; 34 and 47 are not departments) | C1 (`/products?category=bedroom`, `reading-tables`), E (SEO description) |
| `products[8, 19].shortDescription` (2) | V2-02 | product page lede, list-view row (`ProductListRow.js`), search scoring (`searchData.js`), page description fallback, JSON-LD fallback (`productStructuredData.js`); wishlist snapshots carry it, but no seeded row is 8 or 19 | C1 (search), C2, E |
| `products[8, 19].metaDescription` (2) | V2-02 | the product page's `<meta name="description">`, JSON-LD last fallback | E (per-page descriptions) |
| `products[8, 9, 10, 11, 17, 19, 52, 56, 58, 59, 60, 62, 63, 65, 69, 72, 76, 78, 80].description` (19) | V2-02, V2-03 | product page prose and the specifications table (`parseSpecifications` → `productSpecs.js` `buildSpecRows`), JSON-LD description, Admin → Products edit dialog | C2 (every one of the 19 pages: prose, 5–7 parsed rows, field rows), F |
| `products[48–50, 60–63, 66–68, 76–81].tags` (16) | V2-03 | the search overlay and the listing's `?search=` (tags by substring), the related rail's tag top-up (`api.js` `getRelated`), the product page's Tags row, Admin → Products | C1 (search "wood", "fabric", "almirah"…), C2 (Tags row, related rails), E (the long tag "pre-laminated engineered wood" at 360px) |
| `products[54, 69].relatedProductIds` (2) | V2-03 | the product page's related rail, curated ids first | C2 (54 and 69: the rail opens with 53, 47, 50, 49 / 70, 67, 68, 62) |
| `products[25].frequentlyBoughtTogetherIds` (1) | V2-03 | product 25's "Complete the set" (`getFrequentlyBoughtTogether`); the home "Complete the space" anchors on 31, not 25 | C2 (25 shows 80, 81; 80 and 81 show 25) |
| `orders[5].paymentStatus`, `orders[5].statusHistory[2]` (2) | V2-04 | My orders (user 3: the card, Track, Details' payment row "Voided"), the order confirmation ("Order cancelled", "Not charged") and invoice, Admin → Orders, the dashboard's pending count | C8, C7, F |
| `orders[7, 8, 11].updatedAt` (3) | V2-04 | the return window and the delivered line read `deliveredAt \|\| updatedAt`; 7 and 11 carry `deliveredAt`, 8 is refunded, so nothing shown changes; Admin → Orders | C8, F |
| `returns[1].status` (1) | V2-04 | Admin → Returns (chip, the dialog's actions: none further), the dashboard's pending returns; My orders has no return view | F |
| `coupons[1].description` (1) | V2-04 | the offers page's coupon ticket, Admin → Coupons; checkout shows the code | C11, F |
| `reviews[2, 3, 4].createdAt/updatedAt` (6) | V2-04 | product pages 9 (review 2 pending: hidden), 33 and 76 (the date shown), the home carousel (newest first; 76 is featured), My orders' review chips, Admin → Reviews | C2, C3, C8, F |
| `reviews[6, 10, 11, 17]` title/body (6) | V2-04 | product pages 47, 21, 58 (`ReviewsSection`), the home carousel (21 is in the Featured rail), Admin → Reviews | C2, C3, F |
| `wishlist[1–3].addedAt` (3) | V2-04 | `/wishlist` for user 3: "Recently added" order; the sign-in merge reads `createdAt \|\| addedAt` | C5 |

### 2.3 The two `index.html` insertions

| Insertion | Consumers | Checked by |
|---|---|---|
| `media="(prefers-color-scheme: light)"` on the paper `theme-color` | the browser's own colour on every page, storefront and admin | B3 (the resolved `theme-color` per scheme), `X-defects` X4, `src/publicIndex.test.js` (new) |
| `<noscript><style>` hiding `#loading-screen` | only when scripting is off | A7 (JavaScript off), `src/publicIndex.test.js` (new) |

### 2.4 Data-coupled tests

Ten suites import `db.json` directly (SidebarMenu, CartDrawer, cartDelivery, searchData, SearchModal, FrequentlyBoughtTogether, helpers, OrderHistory, SpecialOffers, offersData); with the Home, ProductDetails and Products suites, which read it through their fixtures, they pass on the seed, so the seed and the tests agree (A4).

### 2.5 What this pass changed

| Files | Why |
|---|---|
| `src/pages/Home/homeData.js`, `Home.js` | D1, the Featured rail's mix (`mixFeatured`, `FEATURED_POOL`, `FEATURED_COUNT`); D2, inactive pieces out of both rails; D3, the "Complete the space" top-up |
| `src/utils/helpers.js` | `isProductActive` (D2), `relatedLookup` (D3) |
| `src/pages/Products/Products.js`, `src/components/SearchModal/searchData.js`, `src/pages/SpecialOffers/SpecialOffers.js`, `src/pages/ProductDetails/ProductDetails.js` | D2 (and D3 on the product page) |
| `src/components/StorefrontRoot/BrowserThemeColor.js` (new), `src/App.js` | D4 |
| `src/utils/storageFallback.js` (new), `src/index.js` | D5 |
| `src/components/Footer/Footer.js`, `src/components/CartDrawer/CartDrawer.js`, `src/pages/Checkout/Checkout.js` | N4, the trust-cue labels from `TRUST_BADGE_CATALOG` |
| `scripts/validate-db.js` | one rule, tightened only: at most 24 active featured products (§4.4) |
| 13 test files (3 new) | §4.3 |
| `prompts/DESIGN_SYSTEM.md` | N5 (§12's row), §43.5's rule list, §43.7 (what V2-05 changed) |
| `prompts/00_INDEX.md` | N19 (§6's coupon line), the status line, the V2 prompts, the open questions |
| `prompts/QA_CHECKLIST.md`, `prompts/BUILD_LOG.md`, this report, `V2_SIGN_OFF.md` | the status documents |

Nothing in `src/pages/Admin/*`, `src/components/AdminLayout/*`, `src/theme/adminTheme.js`, `src/services/api.js` or `src/context/AdminContext.js`; no `db.json` change.

## 3. Findings handed forward, all closed

Every finding the four reports addressed to V2-05 (or to V2-03, V2-04 and V2-05 together) is a row. "Fixed" names the commit; `5d7e3cf` is this pass's fix commit, "Fix the defects and findings the V2-05 regression closes".

| # | From | Finding | Closed |
|---|---|---|---|
| N1 | V2-01 F1 | The browser's theme colour follows the device setting, not the site's light/dark switch | **Fixed (`5d7e3cf`).** D4: `BrowserThemeColor` (§4). Prompt 02's two media-query tags stay for the loading screen and the admin. Proof: `BrowserThemeColor.test.js`; `X-defects` X4 (three checks, both device/site combinations and the admin) |
| N2 | V2-01 F2 | With site storage blocked, the storefront renders only the crash screen | **Fixed (`5d7e3cf`).** D5: `installStorageFallback` (§4). V2-01 judged a fix to need `api.js` and `authStorage.js`; neither changed: a storage that throws is replaced, for the visit, before React renders. Proof: `storageFallback.test.js`, `App.test.js`; `S-storage-blocked` with a real Chromium profile that blocks all site data (before: the crash screen; after: 10 of 10, the admin included) |
| N3 | V2-01 F3 | The admin invoice falls back to "My E-Commerce Store" when `settings.store.name` is missing | **Not a defect.** The fallback cannot show while the seed validates: the validator requires `settings.store.name` = "A & S Urbanseat", and Admin → Settings saves it. The file is the admin's (no change without the owner); listed for the owner in `00_INDEX.md` §6 |
| N4 | V2-01 F4 | Trust-cue labels typed inline in the footer, cart drawer and checkout instead of read from `TRUST_BADGE_CATALOG` | **Fixed (`5d7e3cf`).** The three rows build their items from the catalogue's icon and label (§39.9). Proof: `Footer.test.js` and `CartDrawer.test.js` rename the catalogue's labels and see the rows follow (both fail before the change); the strings shown are unchanged |
| N5 | V2-01 F5 | `DESIGN_SYSTEM.md` §12's row names only the dark tag's `media` | **Fixed (`5d7e3cf`).** The row names both queries, why (the first match wins), and that `BrowserThemeColor` sets the tags while a storefront page is shown |
| N6 | V2-01 F6 | Check F's expectation "Prompt 33's logo lines only" omits two owner-approved admin changes | **Not a defect** (a documentation expectation). F compares against all three owner-approved changes: `git log 90402a2..HEAD` on the admin's files is `704888b` (Prompt 03's variant spread), `44ddfd9` (Prompt 33's logos) and `e198f0a` (the logout confirm's `flushSync` and its test), nothing else, unchanged since the V2 baseline (§5, F1) |
| N7 | V2-01 F7 | No Jest test guards V2-01's two `index.html` repairs | **Fixed (`5d7e3cf`).** `src/publicIndex.test.js` parses `public/index.html`: each `theme-color` tag names its scheme with the `colors.js` grounds, and the `<noscript>` style hides the splash |
| N8 | V2-02 F1 | `getRelated` tops the curated ids up with the same brand or a shared tag: every unbranded product matches every other (`"" === ""`); the tier tags "essentials"/"premium" cross departments | **Fixed (`5d7e3cf`), the empty brand:** D3, `relatedLookup` passes an unbranded piece without a brand (the product page and the home "Complete the space" read), `api.js` unchanged. **Not a defect, the shared tags:** "curated → same category → tags/brand" is Prompt 17's rule for the rail (`17_product-details-secondary.md`:30, `DESIGN_SYSTEM.md` §27.6), and the tier tags are the merchant's own; preferring the department would change that rule inside `api.js` (protected), so it is an owner question (`00_INDEX.md` §6). Proof: `X-defects` X2 (six unbranded pieces: no rail piece is there only for "no brand"), `ProductDetails.test.js`, `helpers.test.js` |
| N9 | V2-02 F2 | Orders and reviews dated before their product's `createdAt` | **Fixed (`a3e3d74`, V2-04), the reviews:** reviews 2 and 3 (and 4, N16) re-dated (V2-04 R163). **Not a defect, the orders:** kept on purpose (V2-04 §8.1: order numbers encode their dates, and Prompt 05 kept the timestamps); the client's choice is N26 |
| N10 | V2-02 F3 | 22 Prompt 04 products carry no material tag | **Fixed (`eb62f33`, V2-03).** V2-03 R164: the 16 that named no material gained one ("fabric sofa", "engineered wood", "wooden", …); V2-02 had matched exact one-word tags, and the rest already named their material in a longer tag. The validator asserts it; C1's "wood" and "fabric" searches find them |
| N11 | V2-02 F4 | The mattresses' inch sizes lack "approx." | **Fixed (`eb62f33`, V2-03).** V2-03 R140: "Sizes: approx. Single 36 × 78, …"; C2 renders it on 58 and 59 |
| N12 | V2-02 F5 | The home Featured rail in JSON Server mode takes the first 8 featured products by id: Prompt 04's five never appear | **Fixed (`5d7e3cf`).** D1, `mixFeatured`. Proof: `homeData.test.js`, `Home.test.js`; `C3-home` C3.1 and `X-defects` X1 (8 pieces in all 6 departments; before: 4 of 6) |
| N13 | V2-02 F6 | The V2-02 prompt says Prompts 29 and 32 edited catalogue copy and data; neither did | **Not a defect** (a wording point). `git log --full-history -- db.json` shows Prompts 03, 04, 05 and 34, then V2-02, V2-03 and V2-04; `V2_SIGN_OFF.md` states that history and no other |
| N14 | V2-02 F7 | An admin save stamps `updatedAt` (the mock, by design), so "edit and save without change" leaves `updatedAt` changed | **Not a defect.** F3 is worded and run that way: on a scratch copy, every saved record equals the seed apart from `updatedAt`, and the repository's `db.json` is never written (§5, F3) |
| N15 | V2-03 F1 | `getRelated`, wider: the A & S Urbanseat brand pulls home pieces into the workshop tables' rails; "living room" pulls plastic pieces into the sofas'; the empty brand pulls office and café chairs into unbranded pieces' | **Fixed (`5d7e3cf`), the empty brand** (as N8). **Not a defect, a real shared brand or tag:** Prompt 17's rule, as N8; owner question in `00_INDEX.md` §6 |
| N16 | V2-03 F2 | Orders and a review dated before their product exists (Prompt 04's products) | **Fixed (`a3e3d74`, V2-04), review 4** (re-dated, R163). **Not a defect, the orders:** kept on purpose (V2-04 §8.1), as N9 |
| N17 | V2-03 F3 | Two seeded reviews state health effects (11, 17) | **Fixed (`a3e3d74`, V2-04).** R97: re-worded (with 6 and 10); the validator refuses health claims; C2 and C3 read the new text where shown |
| N18 | V2-03 F4 | The home Featured rail never shows Prompt 04's featured pieces, so it does not mix home and office pieces | **Fixed (`5d7e3cf`).** As N12 |
| N19 | V2-04 F1 | `00_INDEX.md` §6 says WELCOME500 and NEWHOME20 both promise "first order" | **Fixed (`5d7e3cf`).** §6 now says only NEWHOME20 does (WELCOME500 is "₹500 off orders above ₹5,000" since V2-04) |
| N20 | V2-04 F2 | Admin → Leads logs a development-only React warning (`hover` reaching the DOM through `motion.tr`) | **Not a defect of the storefront.** In `AdminLeads.js`, unchanged since the first commit (the admin changes only with the owner); development only, production builds are silent (A6 counts it as its one admin notice). Listed for the owner in `00_INDEX.md` §6 |
| N21 | V2-04 F3 | The mock stamps `updatedAt` before appending the event, so a live admin action leaves an event a few ms after `updatedAt` | **Not a defect.** The order of two writes inside `api.js`'s JSON Server mock (protected; the Laravel API owns its timestamps). The validator's strictness applies to the committed seed, which no suite writes. Listed for the owner |
| N22 | V2-04 F4 | The offers page shows any product the admin picks as a deal of the day, discounted or not | **Not a defect.** Prompt 19's rule: the admin's picks, in the admin's order; a pick without a discount shows no saving line (`SpecialOffers.test.js` pins it), so nothing is invented. The seed keeps every pick discounted and the validator asserts it. Whether the admin should be able to pick an undiscounted piece is an owner question (`00_INDEX.md` §6) |
| N23 | V2-04 F5 | "Review not approved" cannot be shown on `/orders` with the seed | **Not a defect.** Demonstrated in this pass: on a scratch copy, review 2 rejected in Admin → Reviews, and ORD-MQDVIQCV-30A9's shoe rack shows the chip (`C8-orders` C8.8); the seed restored |
| N24 | V2-04 F6 | A storefront order stores `sku: ""` (no cart line carries a SKU) | **Not a defect.** The contract allows it: `01_DATABASE_SCHEMA.md`, `orders.items[]`: "`sku` string, may be `""`". The admin's order view and invoice show an empty SKU for such orders; carrying the variant SKU through the cart is an owner question (`00_INDEX.md` §6) |
| N25 | V2-04 F7 | Admin → Returns builds its actions from `status` alone | **Not a defect of the storefront.** An admin file; the seed has no return whose status disagrees with its refund (V2-04 R151) and the validator forbids one. Listed for the owner |
| N26 | V2-04 F8 | Orders dated before their products stay | **Not a defect.** Kept on purpose (V2-04 §8.1); for the client: keep the demo data as is, or move the products' `createdAt` before 2026-01-15 (`00_INDEX.md` §6) |

## 4. Defects found and fixed by this pass

### 4.1 The defects

| # | Defect (how it was found) | Cause | Fix | Regression tests (fail before, pass after) | Browser proof (before → after) |
|---|---|---|---|---|---|
| D1 | The home Featured rail showed eight pieces from four departments: never the home or office-table pieces Prompt 04 featured "so the home page mixes home and office pieces" (N12, N18; `C3-home` C3.1) | `Home.js` asked `getFeatured(8)`; JSON Server's mock returns the first N featured products by id, all Prompt 03's | `mixFeatured` (`homeData.js`): read up to 24 featured products (`FEATURED_POOL`), show 8 (`FEATURED_COUNT`), one department at a time in menu order, each department's pieces in the API's order; pieces outside the menu follow; inactive ones are left out. The API call and its contract are unchanged (`limit` is a documented parameter) | `homeData.test.js` (4: the rail's ids, each department's order and the limit, inactive pieces, departments outside the menu); `Home.test.js` (the call reads the pool; the cards are the mix, the first six one per department) | C3.1 fail → pass; X1 "4 of 6 departments" → "6 of 6": Classic Plastic Armchair, Mesh High-Back Office Chair, Bentwood-Style Café Chair, Lobby Set, Wooden Sofa Set, Winsome Office Table, Covered Plastic Shoe Rack, Ergonomic High-Back Chair with Headrest |
| D2 | A product switched off in Admin → Products stayed on the listing (and was counted in its facets), its `?search=`, the search overlay, the offers page (deal of the day and grid, while the saved selection named it) and the home rails, and its page still opened with Add to cart (this pass's own finding: `X-defects` X3) | JSON Server serves every row, and these reads did not filter. `02_API_ENDPOINTS.md` §B: "the storefront filters `isActive` client-side"; `01_DATABASE_SCHEMA.md`: "inactive hidden in related/FBT/storefront". Only the related and bundle reads (`api.js`) already filtered | `isProductActive` (`helpers.js`) on each read: `Products.js`, `searchData.js` (`loadSearchData`), `SpecialOffers.js`, `mixFeatured` (Featured); the Trending rail through `Home.js`'s own product filter, which the rail had skipped; the product page treats an inactive product as not found ("We couldn’t find that piece.") | `Products.test.js` (not listed, counted or found), `searchData.test.js` (not searchable), `SpecialOffers.test.js` (an inactive pick is left out of both sections), `Home.test.js` (out of both rails), `ProductDetails.test.js` (not found by slug or id; no related read), `helpers.test.js` | X3 "listing, listing search, search overlay, offers page, product page" → "hidden everywhere" |
| D3 | An unbranded piece's "You may also like" rail was topped up with every other unbranded piece: office chairs and the outdoor sets beside a bedside table (N8, N15; `X-defects` X2) | `getRelated`'s third tier matches `p.brand === product.brand`, and `"" === ""` | `relatedLookup` (`helpers.js`): an unbranded piece is passed without a brand, on the product page and in the home "Complete the space" top-up; a branded piece is passed as it is. Curated ids, the category and shared tags work as before (`api.js` unchanged) | `helpers.test.js` (2), `ProductDetails.test.js` (the read for an unbranded piece has no brand, keeps its ids and tags; a branded piece is passed as is) | X2: particle-board bedside table, folding bed table, lobby set, jhula, steel rack and iron alna: "Lobby Set, Jhula, Mesh High-Back Office Chair, …" unexplained → none |
| D4 | The browser's colour followed the device, not the site's switch: a shopper in dark mode on a light device saw a paper bar over the navy page (N1; X4) | `index.html`'s two tags choose by `prefers-color-scheme` only, and nothing updated them | `BrowserThemeColor` (`src/components/StorefrontRoot/`), mounted in `App.js` beside `StorefrontRoot`: while a storefront page is shown, both tags take the ground of the mode in use (`colors.js`); on unmount they get `index.html`'s values back, so the admin keeps its device-based colour | `BrowserThemeColor.test.js` (2: follows the mode and the switch, media untouched; restores on unmount), `publicIndex.test.js` (2, N7) | X4 device light/site dark "#faf7f2 → #faf7f2" → "#0a1426 → #faf7f2"; device dark/site light "#0a1426 → #0a1426" → "#faf7f2 → #0a1426"; admin tags unchanged (pass both runs) |
| D5 | With all site data blocked (a browser setting), every page showed only "Something went wrong." (N2; `S-storage-blocked`) | Any use of `localStorage`/`sessionStorage` throws `SecurityError`; `ThemeContext`'s first render reads it, and `AdminProvider` (mounted around every route) reads `sessionStorage` on mount | `installStorageFallback` (`src/utils/storageFallback.js`), called by `src/index.js` before React renders: a storage that cannot be read is replaced for the page by one kept in memory (the Storage interface over a `Map`). The visit works and nothing is kept after it, which is what blocking site data asks for; an ordinary visit is untouched. No admin file, `api.js` or `authStorage.js` changed | `storageFallback.test.js` (6), `App.test.js` (with both storages throwing, the storefront renders on memory storage; without the fallback the same render shows the crash screen) | S2 "Something went wrong." → the home page (both storages replaced, 8 featured cards); S3–S10 unreachable → pass: theme switch and bar colour, listing, add to cart (the drawer; the cart in memory), sign-in (session and token in memory) and My orders (3 of 3), checkout with the piece, a reload keeping nothing, the admin's sign-in and dashboard, a clean console |

### 4.2 Proof that the tests guard the fixes

Each fix's tests were run against the code without it (consumers reverted to `HEAD`, the new helpers kept so the imports resolve): **10 failures** in `Home`, `ProductDetails`, `Products`, `SpecialOffers` and `searchData`, every one a V2-05 test (the featured mix, the inactive product on each surface, the related read, and the two Home tests whose expectations follow the new rail); with the trust-label change reverted, the two label tests fail; without the storage fallback, the blocked-storage render shows the crash screen. With the fixes, all pass.

### 4.3 Tests

27 tests added (1,429 → 1,456), none removed; three new suites (86 → 89):

| File | Tests added |
|---|---|
| `src/pages/Home/homeData.test.js` | `mixFeatured`: one piece per department in menu order before any second; each department's own order and the limit; inactive pieces left out, the API's order without categories; pieces outside the menu follow |
| `src/pages/Home/Home.test.js` | the Featured rail takes one piece per department before any second; a product switched off is left out of both rails |
| `src/pages/Products/Products.test.js` | a product switched off is not listed, counted or found |
| `src/components/SearchModal/searchData.test.js` | a product switched off is not searchable |
| `src/pages/SpecialOffers/SpecialOffers.test.js` | a pick switched off is not on offer, in the deal of the day or the grid |
| `src/pages/ProductDetails/ProductDetails.test.js` | a product switched off is not found, by slug or by id; an unbranded piece's related read is not matched on "no brand" (and one assertion in an existing test: a branded piece is looked up as it is) |
| `src/utils/helpers.test.js` | `isProductActive`; `relatedLookup` for an unbranded and a branded piece |
| `src/components/Footer/Footer.test.js`, `src/components/CartDrawer/CartDrawer.test.js` | the promise rows carry the trust-badge catalogue's labels |
| `src/components/StorefrontRoot/BrowserThemeColor.test.js` (new) | both tags follow the mode and the switch; `index.html`'s values come back on unmount |
| `src/publicIndex.test.js` (new) | each `theme-color` tag names its scheme; without JavaScript the splash is hidden |
| `src/utils/storageFallback.test.js` (new) | the memory storage behaves like the browser's; storages that throw are replaced; readable ones are left; only the one that throws is replaced; a property that cannot be redefined is left without throwing |
| `src/App.test.js` | with site data blocked the storefront renders, on storage kept in memory |

**Expectations updated** (only where the spec proves them wrong), all in `Home.test.js`: the rail is the department mix, not the first eight by id (Prompt 04: featured "so the home page mixes home and office pieces"); `getFeatured` is asked for the pool (24), not 8; the review carousel, which reads the rail's products' reviews, holds 10 reviews (7 before) and marks one verified purchase, John's review of the Winsome Office Table, now in the rail (the old line "none of the seeded verified reviews belongs to these products" described the old rail).

**Lint:** the changed source files report nothing; each changed test file keeps exactly the testing-library findings it had at `HEAD` (none added); the new test files report nothing.

### 4.4 The validator, tightened

One rule: **at most 24 active featured products** (the home rail's read, `FEATURED_POOL`), so every department with a featured piece can reach the rail. The seed has 14 (Plastic Furniture 3, Office Chairs 2, Café & Restaurant Chairs 2, Outdoor Furniture 2, Home Furniture 4, Office Tables & Desks 1). A scratch copy with 25 flagged is refused ("featured: 25 active products in all; the home rail reads at most 24"). Nothing loosened.

## 5. The checklist, with evidence

Browser results per suite: before (start-of-pass build `4b6127a`) → after (final build). Every row's checks are listed in the suite files; the summaries below name what each proves.

| Suite | Before | After |
|---|---|---|
| `C1-catalogue` | 90/91 (C1.1: the harness read `innerText`, which carries CSS's uppercase; the departments were in order, as its own detail shows; fixed in the harness) | 91/91 |
| `C2-product` | 304/304 | 304/304 |
| `C2b-quantity` (added in this pass: C2's clamp branch had found no low-stock option) | 7/7 | 7/7 |
| `C3-home` | 12/13 (C3.1, D1) | 13/13 |
| `C4-cart` | 16/16 | 16/16 |
| `C5-wishlist` | 10/10 | 10/10 |
| `C6-checkout` | 26/26 | 26/26 |
| `C7-confirmation` | 12/12 | 12/12 |
| `C8-orders` | 20/20 | 20/20 |
| `C9-auth` | 8/8 | 8/8 |
| `C10-account` | 7/7 | 7/7 |
| `C11-offers` | 13/13 | 13/13 |
| `C12-admin-edits` | 4/4 | 4/4 |
| `C13-static` | 16/16 | 16/16 |
| `B-brand` | 31/31 | 31/31 |
| `E-responsive-a11y` (re-run on both builds after a harness fix: axe now waits for the scroll back to the top to settle, E2) | 39/39 | 39/39 |
| `E2b-keyboard` (added in this pass: QA_RESPONSIVE_A11Y.md's Tab sweep as a spot check) | 16/16 | 16/16 |
| `F-admin` | 15/16 (F3 as one row; split into the rule and the noted admin issue, below) | 17/17 |
| `A6-console` | 2/2 | 2/2 |
| `X-defects` | 1/6 (X1–X4: D1–D4) | 6/6 |
| `S-storage-blocked` | 1 of 3 recorded (S2: the crash screen; the run could not go on) | 10/10 |
| **Total** | **650 of 660** | **668 of 668** |

### A. Environment and gate

| # | Item | Result | Evidence |
|---|---|---|---|
| A1 | `npm ci`; `npm run server` + `npm start` | Pass | `npm ci` installs from the lock file (the two dependency notices of `DESIGN_SYSTEM.md` §43.6 only). JSON Server on :3001 (on a scratch copy of the seed), CRA on :3000, both answering through the whole pass |
| A2 | `node scripts/validate-db.js --catalogue` and full mode | Pass | `✓ all checks passed`, both modes, at the start and at the end (with V2-05's rule, §4.4) |
| A3 | `CI=true npm test -- --passWithNoTests` | Pass | Start: 86 suites, 1,429 tests. End: **89 suites, 1,456 tests**, exit 0, no `Warning:`, `console.error` or `console.warn` in the output |
| A4 | `npm run build` with zero warnings | Pass | `CI=true npm run build` (Laravel mode, `.env.production`): "Compiled successfully."; CI mode fails on any warning. Main JS 400.28 kB (start 399.62 kB, +0.66 kB), CSS 34.97 kB (unchanged); the checkout chunk +0.03 kB, the orders chunk −0.01 kB, the other 18 files unchanged: +0.68 kB gzip in all. JSON Server mode: "Compiled successfully." Only the two documented dependency notices print before compiling. Rebuilt from the exact tree committed, the 24 JavaScript and CSS files of both builds are byte-identical to the ones measured and browser-tested |
| A5 | ESLint on the changed files | Pass | §4.3 |
| A6 | Console: zero errors and warnings on every route in development | Pass (noted) | `A6-console` on the development server (the working tree, every fix included): 66 loads per sweep (the guest routes, two signed-in customers' routes, the sidebar, search and cart overlays at 390px, and the admin's routes), light without reduced motion and dark with it. **No unexplained error or warning.** The explained lines, all documented, none from a storefront route's own code: framer-motion's development-only reduced-motion notice (53 times in the dark sweep; Prompt 34, index §5.30); the deliberate unknown product URL's 404 lines (4 per sweep; same); Admin → Leads' `hover` warning (1 per sweep; V2-04 F2, N20). No placeholder image failed to load. Production builds: every browser suite asserts a clean console. |
| A7 | JavaScript off | Pass | `B-brand` A7: the splash is hidden and "You need to enable JavaScript to run this app." shows (V2-01's `<noscript>` rule; now also pinned by `publicIndex.test.js`) |

### B. Brand consistency (light and dark)

| # | Item | Result | Evidence |
|---|---|---|---|
| B1 | Logo variant per background | Pass | `B-brand` B1, light and dark: header at rest and compact, mobile header, sidebar, footer (white on navy), auth modal, invoice in print (the light artwork on paper), loading screen, 404, admin login and admin sidebar: the light artwork on every light surface and the white one on every dark surface, every time |
| B2 | Grep gates: colour literals, font-family literals, gradients outside the allowed files; "non-premium", "My Store", "mystore" | Pass | Prompt 34's greps on the final tree: the files with colour literals, gradients and font-family literals are the same sets as at the V2 baseline and at the start, with the same hit counts per file (every hit a documented exception, §43.4, or a comment); the new files carry none (`BrowserThemeColor` reads `colors.js`). `grep -rniE "non-premium\|non premium\|my store\|mystore" src public db.json`: no match |
| B3 | V2-changed brand lines, contact facts, meta tags and `theme-color` | Pass | `B-brand` B3: `settings.seo.metaTitle` (V2-04) and `metaDescription` equal `index.html`'s title and description; the footer's contact facts equal `settings.store`; `index.html`'s two `theme-color` tags each name their scheme and resolve to the paper (light) and navy (dark); with the site's switch, both follow the mode (D4, X4) |

### C. Feature parity, API-driven

| # | Area | Result | Evidence |
|---|---|---|---|
| C1 | Catalogue | Pass, 91/91 | `C1-catalogue`. The header's departments in `menuOrder` (Plastic Furniture · Office Chairs · Café & Restaurant Chairs · Outdoor Furniture · Home Furniture · Office Tables & Desks), every subcategory in the four flyouts checked (11, 8, 15 and 3 links), and the sidebar in the same order. **Every one of the 43 department, group and leaf deep links** lists exactly its pieces under the category's `h1` (a parent includes its descendants; no leaf is empty); `/products` lists all 84 over two pages of 48. Seven legacy `?category=<id>` links (1, 2, 5, 6, 31, 47, 49) rewrite to their slugs. Search, in the overlay and on the listing (`?search=`), finds exactly what the data holds: "almirah" 2, "alna" 2, "jhula" 1, "mattress" 5, "waiting" 6, "Nilkamal" 22, "Winsome" 3, "wood" 32, "fabric" 6, "chair" 42, "table" 33, "sofa" 7. All 84 product pages open by slug with the name as the `h1`; six numeric ids (8, 11, 25, 54, 69, 80) redirect to their slugs; an unknown slug shows "We couldn’t find that piece." Console clean (bar that deliberate 404). |
| C2 | Product page | Pass, 304/304 and 7/7 | `C2-product`: 37 products, at least one per department and every product a V2 prompt changed (1, 8–11, 17, 19–21, 25, 33, 37, 47–50, 52, 54, 56, 58–63, 65–69, 72, 76–81). On each: the `h1` and price; every option sets the price, SKU and stock line ("Only N left" at or under the product's threshold, a sold-out option a disabled radio); the specifications table is the parsed pairs (5–7) then the field rows, exactly as `buildSpecRows` makes them, and the prose matches the description; − is disabled at 1; approved reviews only, with the data's average and count (pending and rejected hidden, the honest empty state otherwise); the related rail and the bundle hold only existing, active products (54 and 69 open with their curated pieces; 25's set shows 80 and 81). Add to cart opens the drawer with the line (11, 58, 80); the wishlist heart toggles; Buy now goes to `/checkout`. `C2b-quantity`: each of the six low-stock options in the seed clamps the quantity at its stock (11, 19, 30, 50, 58, 75: 4, 4, 5, 3, 4, 2), + disabled there. Console clean. |
| C3 | Home page | Pass, 13/13 | `C3-home`. The Featured rail: eight active featured pieces from **all six departments** (Classic Plastic Armchair, Mesh High-Back Office Chair, Bentwood-Style Café Chair, Lobby Set, Wooden Sofa Set, Winsome Office Table, Covered Plastic Shoe Rack, Ergonomic High-Back Chair with Headrest; four departments before the fix, D1). The Trending rail: eight flagged, active pieces. "Brands we carry": exactly Carlton · Nilkamal · Winsome · A & S Urbanseat. The assurance strip reads "Above ₹9,999" from Admin → Shipping and follows an edit to ₹4,999, with the header's line. The review carousel: the 10 newest approved reviews of the rail's pieces, V2-04's re-worded reviews (6, 10, 11) in their new text. "Complete the space": its anchor and bundle with the live total. The "Shop by space" tiles link to real departments; "Recently viewed" lists the pieces just visited. Console clean. |
| C4 | Cart | Pass, 16/16 | `C4-cart`. The drawer opens on add; + updates the subtotal (₹8,998.00) and the indicator; removal. Free delivery from Admin → Shipping: "Add ₹5,500.00 more" (₹9,999 − ₹4,499), free at ₹11,797 (the threshold inclusive), and free once Standard's `freeAbove` is set to ₹4,999. Persisted on reload, guest and signed in. Merged on sign-in (the device's line and the account's) and mirrored to the account; cleared on sign-out, the account's cart kept for the next sign-in. **Stale cart:** lines saved in `localStorage` before V2 (the baseline's snapshot shape, a legacy-shaped line with string price and quantity, and a product that no longer exists) load in the drawer (4 pieces, ₹10,297.00) and render at checkout, with a clean console. |
| C5 | Wishlist | Pass, 10/10 | `C5-wishlist`. User 3's three seeded rows equal their products (48, 31, 37; V2-04 re-dated them) and `/wishlist` shows them most recently added first (Bentwood-Style Café Chair → Ergonomic High-Back Chair with Headrest → L-Shaped Sofa) at live prices. A guest's device list (2) with the sign-in banner; on sign-in only the guest-only row is uploaded (account 48, 31, 37, 47; no duplicate); remove (device and account); move to cart (the line in the drawer, gone from the list); clear all (the confirm opens on "Keep wishlist"; device and account emptied). Console clean. |
| C6 | Checkout | Pass, 26/26 | `C6-checkout`. A guest is asked to sign in. All four steps (Cart, Delivery, Payment, Review) with a saved and a new address (its PIN checked: "Enter a 6-digit PIN"). Delivery: Express ₹999; a ₹9,999 cart ships free (the threshold inclusive). Coupons: an unknown code and FESTIVE25 refused ("Invalid coupon code"), an expired one ("Coupon has expired"), WORKSPACE15 under its ₹15,000 minimum ("Minimum order amount is ₹15000", the mock's wording); FLAT10 and WELCOME500 applied, each summary equal to V2-04's formulas (₹3,196 − ₹320 + ₹499 + ₹518 tax = ₹3,893; ₹8,998 − ₹500 + ₹499 + ₹1,530 = ₹10,527); WELCOME500 removed once the subtotal fell under ₹5,000. Cash on Delivery: refused over the ₹50,000 cap; "Currently unavailable", and not promised, when Admin → Settings turns it off. Store credit in full (order E, ₹1,442) and in part (order A: ₹860 of credit, ₹9,667 by UPI). Three orders placed (B by COD with FLAT10, E, A); in the scratch `db.json`: each order's money and payment (B ₹3,893 pending, E ₹1,442 and A ₹9,667 captured), orders +3, payments +3, `usedCount` +1 for WELCOME500 and FLAT10, the wallet debits ₹1,442 then ₹860 to a balance of ₹0 = `users[2].storeCredit`. |
| C7 | Order confirmation and invoice | Pass, 12/12 | `C7-confirmation`. The three orders' confirmations show their numbers and totals (B: ₹3,196.00 · −₹320.00 FLAT10 · ₹499.00 · ₹518.00 tax · ₹3,893.00; E: ₹799.00 · ₹499.00 · ₹144.00 · ₹1,442.00, all store credit, ₹0.00 paid; A: ₹8,998.00 · −₹500.00 WELCOME500 · ₹499.00 · ₹1,530.00 · ₹10,527.00 · −₹860.00 store credit). Print invoice calls `print()` once; the invoice carries the store's facts and fits one A4 page. The seeded ORD-MMYJ01ED-ZR26 (V2-04's voided payment) reads "Order cancelled" and was not charged; ORD-20250310-0001 reads returned. An unknown number shows "We couldn’t find this order." with the way back. Console clean. |
| C8 | Orders | Pass, 20/20 | `C8-orders`. Every order of every demo user renders with its items, totals and status (John 3; Jane 1 and C6's; Bappi 7 and C6's two); the filters match the data (processing 4, shipped 1, delivered 2, cancelled 2, returned 0); search by number; order 5 (V2-04) reads Cancelled with its payment Voided; Track shows the progress and the tracking number. Cancel C6's order A: the confirm names the refund (₹9,667.00) and the ₹860.00 of credit going back, focus on "Keep order"; in `db.json` the order is cancelled, its refund processing, its payment `refund_pending`, the credit returned; the card reads Cancelled, and Admin → Orders and → Payments show Cancelled and Refund Pending. Return or exchange opens `/support?order=…&category=returns` prefilled. A review submitted is stored pending and hidden; approved in Admin → Reviews, it shows on the product page. **V2-04 F5:** review 2 rejected in Admin → Reviews, ORD-MQDVIQCV-30A9's shoe rack shows "Review not approved". A guest sees the signed-out panel. Console clean. |
| C9 | Auth | Pass, 8/8 | `C9-auth`. A wrong password: the sheet's alert ("Check your email address and password, then try again."), the sheet stays open, no toast (360px). Sign-in keeps the session in this tab (`sessionStorage`); Remember me survives a browser restart ("Hello, Jane."). Register creates the account (11 keys, the phone stored as +919876501234, no password on the page); a taken email is refused ("An account with this email already exists. Sign in instead."). Sign out clears the session ("Signed out", "See you again soon."). Guests see the signed-out panels on `/orders`, `/profile`, the wallet and the addresses. Console clean. |
| C10 | Account | Pass, 7/7 | `C10-account`. Profile: an invalid phone shows the field message; a valid save is stored (Janet, 9123456780). Addresses: add two and make the second the default (the first loses it), edit (Jorhat), delete through the confirm (focus on "Keep address"; one default remains). Change password: the checklist while typing, then "Password updated." Wallet: balance = ledger = profile = ₹2,302 (3 rows). Console clean. |
| C11 | Special offers | Pass, 13/13 | `C11-offers`. The featured coupons in the admin's order with their descriptions (WELCOME500 with V2-04's line, FLAT10); the deal of the day shows the admin's three picks with their real savings; the grid shows the admin's eight. Copy code puts WELCOME500 on the clipboard, and it applies at checkout (−₹500.00). The countdown in every mode: to the end of today, ticking; a future end (3 hours); a past end set to hide (the round has ended); a past end set to end of day; the timer off. Switched off in the admin: no page, no header or footer link, no help card; switched back on: 2 links. Console clean. |
| C12 | Admin edits reach the storefront | Pass, 4/4 | `C12-admin-edits`. Admin → Settings (tax 12%, COD off) reaches the product page and the footer; Admin → Shipping (Express ₹1,099) reaches the product page's delivery panel; the deals hero edited in the admin appears on the open offers page after a refocus, its accent rendered. C3 and C4 cover Admin → Shipping's threshold on the strip, the header and the drawer. Each edit put back. |
| C13 | Static pages, 404, error boundary, newsletter, support | Pass, 16/16 | `C13-static`. About, Help, Support, Privacy, Terms, Cookies and Returns & refunds: their own titles (all distinct), one `h1` and a description. An unknown URL: the branded 404 with two ways back and `noindex`. A page chunk that fails to load: "We couldn’t load this page." with Try again, inside the shell; a render error: the crash screen on the page tone in light (`rgb(250, 247, 242)`) and dark (`rgb(10, 20, 38)`). Newsletter: a bad address refused, a good one stored as a newsletter lead; the support form moves focus to the first empty field, then sends a contact lead. Console clean; the demo leads went with the restore. |

**Data restored:** every suite that writes (C4–C13, E, F, X, S, and Lighthouse's signed-in checkout) ran against the scratch copy, reset from the committed seed before and after; the orders placed in C6, the cancel cascade and the review in C8, the leads in C13 and the admin edits in C11–C12 and F lived only there. The repository's `db.json` was never written: SHA-256 `a15d361a…` at the start, after every suite and at the end.

### D. Contract

| # | Item | Result | Evidence |
|---|---|---|---|
| D1 | No JSON Server-only shape reliance outside `api.js` | Pass | `grep` on the final tree: no `data[0]`, no `.data.data`, no `fetch(` and no `axios` import outside `src/services/api.js` (two comments mention axios); `IS_MOCK_API` is read outside the services layer only by checkout's `gatewayConfigured`, as Prompt 34 recorded |
| D2 | `api.js` unchanged | Pass | SHA-256 `c32e6138…`; `git diff 0b9153e -- src/services/api.js` is empty, and `git diff 90402a2 -- src/services/api.js` is byte-identical to the same diff at the V2 baseline (166 lines: Prompt 32's two owner-approved follow-ups) |
| D3 | `db.json` key sets, ids, slugs and SKUs unchanged across all of V2 | Pass | The validator's key checks pass. An identity dump (every collection's record count and key order, every category's slug, parent and menu fields, every product's slug, SKU, category and state, every variant's id, SKU, keys and attribute names, every order's lines with product, variant and SKU, and every return, refund, payment, coupon, user, review, wishlist, lead and wallet id), from `git show 0b9153e:db.json` and from the final seed: **626 lines each, identical** (`diff` empty; SHA-256 `5f7115b9…` both). V2-05 did not change `db.json` |

The D3 dump, as run (`identity-dump.cjs` in the scratchpad, Appendix):

```
$ git show 0b9153e:db.json > db-baseline.json
$ node identity-dump.cjs db-baseline.json > identity-baseline.txt
$ node identity-dump.cjs db.json > identity-final.txt          # the final seed (SHA-256 a15d361a…)
$ wc -l identity-baseline.txt identity-final.txt
   626 identity-baseline.txt
   626 identity-final.txt
$ sha256sum identity-baseline.txt identity-final.txt | cut -c1-16
5f7115b9c143e08c
5f7115b9c143e08c
$ diff identity-baseline.txt identity-final.txt && echo "IDENTICAL: diff is empty"
IDENTICAL: diff is empty
```

### E. Responsive, accessibility, performance, SEO

| # | Item | Result | Evidence |
|---|---|---|---|
| E1 | 360, 768, 1,024 and 1,440px on home, listing, product, cart drawer, checkout, orders and wallet | Pass | `E-responsive-a11y` E1: ten pages (home; the Home Furniture and Reading Tables listings; the Winsome Office Table and Lobby Set pages; checkout with a cart; My orders; the wallet; the wishlist; offers) and the cart drawer at 360, 768, 1,024 and 1,440px, light and dark: no horizontal overflow and exactly one `h1` on every page. The longest V2-changed rows wrap inside the specifications table at 360px (the three Winsome tables' and the L-shaped sofa's tags, right edge at 344px of 360). |
| E2 | Keyboard and screen-reader spot checks; contrast | Pass | axe-core 4.10.3 (WCAG 2.0, 2.1 and 2.2 A and AA, and best practice) on the same pages at 360 and 1,440px in both modes: **no violation of any impact**. Keyboard: the skip link comes first and focuses `<main>`; arrow keys move the size choice and the price follows (Double, ₹14,999.00); the cart drawer takes focus, Escape closes it and focus returns to the opener. Screen-reader structure: a banner, one `main`, the contentinfo, and named navigation (Primary, Breadcrumb, On this page, Quick links). Tab sweep (`E2b-keyboard`, `QA_RESPONSIVE_A11Y.md`'s method as a spot check): the first 40 Tab stops of home, the listing, a product page, checkout, My orders, the wallet and the wishlist at 390 and 1,440px, 539 stops in all, each measured once the page has stopped scrolling: focus never falls to `<body>` mid-page (checkout and the wallet at 390px have 31 stops; the next Tab leaves the page and the one after returns to the skip link), no stop is hidden under the sticky header or another layer, and every stop changes style on focus (the element, its parent or its first child). Harness note: the first after run caught axe's `target-size` on three listing cards' wishlist buttons (and two on the wishlist page, dark) at 1,440px. axe had run while the page was still smooth-scrolling back to the top, so the buttons were passing under the sticky header ("36px by 6.1px" visible). The start-of-pass build does the same; with the scroll settled neither shows a violation, so the suite now waits for the scroll (a harness fix, like C1.1's). Contrast: `node scripts/check-contrast.js` passes (every pairing meets its minimum; `colors.js` and `tokens.js` mirror `storefront-tokens.css`). |
| E3 | Prompt 32's performance and SEO targets; build size | Pass (noted) | Per-page SEO (`E-responsive-a11y` E5): the eight V2-changed product pages take their title from `metaTitle` and their description from `metaDescription`, with Product JSON-LD; the Bedroom and Reading Tables listings take V2-03's category copy as their description. Build size: +0.68 kB gzip in all (main JS 400.28 kB, +0.66 kB; CSS unchanged), within "a few KB". Lighthouse (table below): Accessibility, Best Practices and SEO 100 on every run; CLS 0 on every run; Performance medians 62–76 on the final build (59–78 at the start of the pass): Prompt 32's 85 is not met, as Prompt 34 recorded (an owner decision, index §6). |

**Lighthouse** (Lighthouse 12.8.2, default mobile configuration: simulated throttling, 4× CPU; every run in a fresh Chromium profile, so every load is cold; the start-of-pass and final builds interleaved; 3 runs each, medians; Performance per run in brackets):

| Page | Build | Performance | A11y | BP | SEO | FCP | LCP | TBT | CLS | Requests | API calls | Transfer |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Home `/` | `4b6127a` | 59 (59 / 59 / 61) | 100 | 100 | 100 | 1.50 s | 6.80 s | 633 ms | 0 | 27 | 8 | 722 KB |
|  | final | 62 (63 / 60 / 62) | 100 | 100 | 100 | 1.49 s | 6.70 s | 534 ms | 0 | 28 | 8 | 725 KB |
| Listing `/products` | `4b6127a` | 66 (66 / 64 / 67) | 100 | 100 | 100 | 1.48 s | 6.16 s | 467 ms | 0 | 26 | 5 | 699 KB |
|  | final | 64 (64 / 64 / 65) | 100 | 100 | 100 | 1.47 s | 6.25 s | 498 ms | 0 | 26 | 5 | 700 KB |
| Product (covered shoe rack) | `4b6127a` | 66 (66 / 67 / 66) | 100 | 100 | 100 | 1.48 s | 6.37 s | 434 ms | 0 | 26 | 10 | 713 KB |
|  | final | 65 (66 / 65 / 65) | 100 | 100 | 100 | 1.48 s | 6.31 s | 459 ms | 0 | 26 | 10 | 714 KB |
| Checkout (signed in, two lines) | `4b6127a` | 78 (74 / 78 / 78) | 100 | 100 | 100 | 2.42 s | 3.80 s | 373 ms | 0 | 20 | 6 | 666 KB |
|  | final | 76 (77 / 76 / 65) | 100 | 100 | 100 | 2.47 s | 4.08 s | 355 ms | 0 | 20 | 6 | 666 KB |

Performance on home, the listing and the product page stays where Prompt 34 left it (59–64 then, 62–65 here), as do the other categories (Accessibility, Best Practices and SEO 100, CLS 0, every run); the two builds' medians differ by at most 3 points, within the run-to-run spread. The home page's requests differ only in the Featured rail's images, its new pieces (the Wooden Sofa Set and the Winsome Office Table in place of the Cushioned Plastic Armchair and the Jhula); in these runs one more of them fell within Chromium's lazy-loading distance (28 requests against 27, +3 KB). The final checkout's 65 is one slow run (LCP 5.33 s); its other two score 77 and 76. This checkout run is signed in through a remember-me session with two lines on the device, so its requests and API calls are not comparable with Prompt 34's account-cart run.

### F. Admin parity

| # | Item | Result | Evidence |
|---|---|---|---|
| F1 | The admin's diff against `90402a2` | Pass | `git diff 90402a2 --stat -- src/pages/Admin src/components/AdminLayout src/theme/adminTheme.js`: 4 files, +133 / −6, the three owner-approved commits (`704888b`, `44ddfd9`, `e198f0a`; N6) and nothing else, identical at the V2 baseline. This pass changed no admin file, nor `AdminContext.js` |
| F2 | Every admin module opens every record touched by V2 | Pass | `F-admin` F2 (production build): the dashboard computes (₹2,07,119; 11 orders, 4 pending; 84 products; 3 users; 1 pending return); the 31 V2-changed products open with their values and save; categories 34 and 47 with V2-03's descriptions; WELCOME500 with V2-04's description; orders 5, 7, 8 and 11 with their state and timeline; return 1 refunded with no further step, and return 2; the payments of orders 7, 8 and 11 with their refund history; reviews 2, 3, 4, 6, 10, 11 and 17 with their current text; users 1–3; Shipping's four methods (Standard free above ₹9,999); Special Offers and Settings open with the seed's values and save (F3); Leads (4) and the categories tree (43). Refunds have no admin page of their own: they show in the payments' refund history. Console clean. |
| F3 | Edit and save without change | Pass (noted) | Every record F2 saved without a change (31 products, 2 categories, the settings, the deals config) equals the seed apart from the `updatedAt` the mock stamps (N14). One documented exception, pre-existing in an admin file: the coupon form rewrites `expiresAt` on save (`T18:29:59.000Z` → `T18:29:00.000Z` in this UTC browser; in India it also shifts by the offset; `00_INDEX.md` §6, Prompt 34). The repository's `db.json` was never written (JSON Server on a scratch copy; SHA-256 `a15d361a…`). |

## 6. Gate

| Check | Result |
|---|---|
| `node scripts/validate-db.js --catalogue` | `✓ all checks passed` |
| `node scripts/validate-db.js` (full) | `✓ all checks passed` |
| The new rule on a scratch copy with 25 featured | refused (§4.4) |
| `CI=true npm test -- --passWithNoTests` | **89 suites, 1,456 tests**, exit 0, no console output (start: 86, 1,429) |
| `CI=true npm run build` (Laravel mode) | "Compiled successfully.", zero warnings; main JS 400.28 kB gzip (+0.66 kB), CSS 34.97 kB (±0) |
| `CI=true npm run build` (JSON Server mode) | "Compiled successfully."; from the exact tree committed, its 24 JavaScript and CSS files are byte-identical to the build the browser suites tested |
| `node scripts/check-contrast.js` | every pairing meets its minimum; `colors.js` and `tokens.js` match `storefront-tokens.css` |
| ESLint, changed files | no new finding (§4.3) |
| Browser, final build | **668 of 668** (§5) |
| Development console | no unexplained error or warning in 132 loads (light, and dark with reduced motion); only the documented notices (framer-motion's reduced-motion notice, the deliberate unknown URL's 404, Admin → Leads' `hover` warning) |
| `db.json` | unchanged, SHA-256 `a15d361a…` |
| `src/services/api.js` | unchanged, SHA-256 `c32e6138…` |

## 7. Documents updated

- `prompts/QA_CHECKLIST.md`: `## V2 re-run (after Prompts V2-01…V2-04)`, every row of §5 with its evidence; the original results are kept.
- `prompts/00_INDEX.md`: the status line (complete with zero known issues, Prompts 02–05 re-verified at max effort by V2-01…V2-05), the effort note, `prompts/prompt_V2/` with one line per V2 prompt, §5's test counts, §6 (N19's coupon line; the owner questions this pass found or closed) and §7.
- `prompts/BUILD_LOG.md`: `## Prompt V2-05 — Full regression and sign-off`.
- `prompts/DESIGN_SYSTEM.md`: §12's `theme-color` row (N5), §43.5's rule list and §43.7 (what V2-05 changed).
- `prompts/prompt_V2/reports/V2_SIGN_OFF.md`: written, since every row passed.

## 8. Observations (no change)

- **O1. Saved snapshots of a product switched off later.** The wishlist, the cart and the home page's "Recently viewed" keep the snapshot the shopper's device saved (`01_DATABASE_SCHEMA.md` §14: the wishlist stores a flat snapshot per row; Prompt 11: Recently viewed keeps `localStorage`'s parsing exactly). After D2 the snapshot's link opens "We couldn’t find that piece."; checkout does not re-read the catalogue, and the Laravel API re-validates every line when the order is created (`03_BUSINESS_LOGIC_AND_CASCADES.md` §2). Whether the storefront should mark such pieces "No longer available" is an owner question (`00_INDEX.md` §6).
- **O2. The admin coupon form's expiry.** Saving a coupon without change rewrites `expiresAt` (in this UTC browser `T18:29:59.000Z` becomes `T18:29:00.000Z`: the field drops the seconds; in India it also shifts by the offset). Pre-existing, in an admin file, already on the owner list (`00_INDEX.md` §6, Prompt 34); recorded by `F-admin` as a noted row, the seed restored.
- **O3. Lighthouse Performance.** As Prompt 34 recorded, Prompt 32's ≥ 85 is not met on cold mobile runs; the owner decision stands (`00_INDEX.md` §6). Accessibility, Best Practices and SEO stay at 100 and CLS at 0 (E3).
- **O4. Development-only notices.** framer-motion's reduced-motion notice and the deliberate unknown product URL's 404 lines (Prompt 34, index §5.30), and Admin → Leads' `hover` warning (N20).

## Appendix: scratch scripts (session scratchpad, not committed)

`qa/lib.cjs` (browser, recorder and data helpers), `qa/appmods.cjs` (the storefront's modules in Node through `babel-preset-react-app`), `qa/restore-db.sh` (scratch seed reset and JSON Server restart), the suites (`qa/c1-catalogue.cjs` … `qa/c13-static.cjs`, `qa/c2b-quantity.cjs`, `qa/b-brand.cjs`, `qa/e-responsive-a11y.cjs`, `qa/e2b-keyboard.cjs`, `qa/f-admin.cjs`, `qa/a6-console.cjs`, `qa/x-defects.cjs`, `qa/s-storage-blocked.cjs`), `qa/run-all.sh` and `qa/run-post.sh` (the runs), `qa/summarise.cjs` (before/after totals), `qa/lh.mjs` (Lighthouse), `impact/walk.cjs` (the 70 paths), `impact/identity-dump.cjs` (D3).
