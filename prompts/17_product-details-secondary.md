# Product details — secondary (description, specifications, reviews, bundle, related)

**Prompt 17 of 34**

## Depends on

Prompts 01–07, 13, 16 (primary surface; the page's data and the review blend already in place), 03–05 (the parseable `Specifications:` paragraph and seeded reviews).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. The admin panel must not change.

## Objective

Redesign the lower half of the product page: description and specifications as calm editorial sections (with a specification table parsed from the data), the reviews section with its honest summary and empty state, the curated "Frequently bought together" bundle and the related-products rail, keeping purchase-gated, moderated reviews and the AOV data rules intact.

## Scope — files and areas to touch

- `src/pages/ProductDetails/ProductDetails.js` + module: the tabs section (`tabsRef`, Description / Reviews tabs), the description tab's specifications table, the reviews tab, and the FBT/related mounts.
- `src/components/storefront/ReviewsSection.js` + module, `FrequentlyBoughtTogether.js` + module, `RelatedProducts.js` + module.
- `src/utils/helpers.js`: add one pure helper `parseSpecifications(description)` → `{ body: string, specs: Array<{ key, value }> }` that splits the trailing `Specifications: Key: Value; Key: Value` paragraph defined by Prompts 03/04 (regex on the last paragraph starting with `Specifications:`; tolerant of missing paragraph → `specs: []`). Pure addition; no existing export changes.

Do not touch: the primary surface (Prompt 16), `ProductCard` (13), `ReviewModal` (Prompt 24, it lives in order history), `api.js`, `db.json`, admin.

## What exists today (preserve)

- Tabs: `role="tablist" aria-label="Product information"`, two `role="tab"` buttons "Description" / "Reviews (N)", `aria-selected`; no `tabpanel`, no `aria-controls`, no arrow keys (fix all three). Description tab: `product.description` + a "Specifications" table derived from `brand`, `sku`, `weight`, `dimensions` (L × W × H), `category.name`, `tags`. Reviews tab: `<ReviewsSection reviews displayAvg totalRatingsCount loading error onRetry />`.
- `ReviewsSection`: summary (avg `toFixed(1)`, `StarRating`, "Based on N ratings" or "No ratings yet"), 5→1 distribution bars of the written reviews, states ("Loading reviews…", error + Retry, empty "No written reviews yet. Be the first to share your experience."), cards (`userName`, "✓ Verified Purchase" when `isVerifiedPurchase`, short date, rating, title, body, `photos[]` thumbs lazy, `helpfulCount`). No sorting. No write form on the product page: reviews are written from Order History for delivered items (purchase gating) and moderated by the admin; the API returns approved reviews only. Keep all of that.
- `FrequentlyBoughtTogether`: anchor + companions from `products.getFrequentlyBoughtTogether` (curated ids only), checkboxes (unset = checked), total = sum of `getProductMinPrice().sellingPrice`, "Add N to cart" adds each chosen item via `onAddToCart(buildCartItem(p))`, no bundle discount, renders `null` without companions.
- `RelatedProducts`: `products.getRelated(product, maxRelated)` (curated → same category → tags/brand), snap-scroll rail of `ProductCard`s, `null` when empty.

## Brand and design requirements

- **Structure** (below the primary grid, `--sf-container-wide`, `--sf-section-y` rhythm, hairlines between):
  1. **Details** as a two-column editorial block instead of a crammed tab: left (5 cols) eyebrow "About this piece" + the description body paragraphs in sans 16px/1.7 (measure 60ch, paragraphs split on blank lines; `parseSpecifications().body`); right (6 cols, offset 1) eyebrow "Specifications" + a hairline table (`<table>` with `<th scope="row">`) listing, in order: the parsed `specs` pairs, then the schema-derived rows the page already shows (Brand when non-empty, SKU (current variant's), Weight, Dimensions L × W × H in cm, Category, Tags as muted chips) without duplicating a key already parsed (case-insensitive key match). Keep the tab semantics if you keep tabs; the recommended design is **anchored sections with a sticky in-page nav** ("Details · Specifications · Reviews") replacing the two-tab control: a `nav aria-label="On this page"` of hairline links that scroll with `scroll-margin-top: calc(var(--sf-header-height) + 16px)`; the "N reviews" link in the primary surface (`scrollToReviews`) targets the reviews section. If you keep tabs instead, add `tabpanel`, `aria-controls`, `aria-labelledby` and Left/Right/Home/End arrow handling. Document the choice.
  2. **Reviews**: eyebrow "Reviews", serif heading "What customers *say*."; summary row: big serif average (48px) + stars + "Based on N ratings" (hide the average entirely when `totalRatingsCount` is 0 and show "No reviews yet" + the honest note "Reviews come from verified orders and are published after moderation."); distribution bars in sand with ink fill (no star colour fill), each with `aria-label="5 stars: N reviews"`; review cards as hairline-separated `article`s: name, verified mark (eyebrow, success token), date, stars 14px, title (serif 18px), body, photos (72px, lazy, `alt`), helpful count muted. Keep loading/error/empty states; restyle. No sort control (none exists; do not invent one).
  3. **Frequently bought together** (only when companions exist): sand panel; anchor + companion tiles with 4:5 thumbs, names (serif 16px), prices, native checkboxes as `.sf-check` (unset = checked kept), the running total in sans 20px, "Add N to cart" primary; no "customers also bought" wording (it is a curated bundle): heading "Complete the set" with eyebrow "Curated by us".
  4. **You may also like** (`RelatedProducts`): rail of `ProductCard`s with `SectionHeading` (eyebrow "Related", title "You may also *like*."), hairline prev/next buttons, snap scroll; reuse Prompt 11's `ProductRail` if it exists, else keep this component's scroller restyled (one rail implementation across the site is the goal: if `ProductRail` exists, make `RelatedProducts` a thin wrapper around it).
- **Motion**: `Reveal` on each section; nothing else.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: reviews come only from `products.getReviews` (approved), the blend stays in the page, no write form here, FBT only from curated ids, related only from `getRelated`, cart adds via the existing callbacks; `parseSpecifications` is a pure helper; no schema change (specs live inside `description`).
2. **Tokens only**: zero literals (replace the `#fff` avatar text and the `--sf-gradient-primary` avatar/CTA uses with tokens and the ink primary).
3. **Admin untouched.**
4. **Brand consistency**: editorial two-column details, hairline table, serif headings with one italic accent, sand bundle panel.
5. **Responsive and accessible**: table semantics; in-page nav or proper tabs with keyboard support; `article` reviews; images alt; 44px controls; heading order h1 → h2 sections → h3 review titles.
6. **No fabricated trust signals**: no sorting by "most helpful" with fake counts, no "N% recommend", no invented review totals; empty state honest.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–16), `prompts/DESIGN_SYSTEM.md`; then `ProductDetails.js` (tabs block and below), the three components, `src/utils/helpers.js`, and two seeded products' `description` strings to validate the parser.
2. Write `parseSpecifications` tests by hand in the console (a description with and without the paragraph; a `Key: Value` containing a colon in the value such as "Size: 180 × 90 cm" should still split correctly: split on `; ` first, then on the first `: `).
3. If adopting anchored sections, keep `activeTab` state removed cleanly (no dead code) and keep `scrollToReviews` working.

## Acceptance criteria

- [ ] Details, specifications table (parsed + derived rows, no duplicates), reviews, bundle and related rail match the design; in-page nav or accessible tabs.
- [ ] Reviews honest states verified with a reviewed product, an unreviewed product, and the error state (stop the server); bundle add adds exactly the checked items; related rail scrolls.
- [ ] Zero colour literals; both modes verified.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: a reviewed product (see Prompt 05's build-log mapping), an unreviewed product, a product with a bundle, a product whose description lacks the specifications paragraph (temporarily edit one in `db.json`, restore it).
2. Widths 360, 768, 1024, 1440.
3. Keyboard/screen reader: in-page nav or tabs, table headers, review articles.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance.
6. Admin regression quick check (Admin → Reviews moderation still flows to the product page after approval).
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 17 — Product details secondary`: what changed, tabs-vs-anchors decision, the parser helper, deviations, client confirmations (none expected).
