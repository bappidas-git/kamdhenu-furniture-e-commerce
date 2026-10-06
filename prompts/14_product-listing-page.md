# Product listing page

**Prompt 14 of 34**

## Depends on

Prompts 01–07, 09 (`BottomDrawer` sheet primitive), 13 (product card).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion, react-router 6; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. The admin panel must not change.

## Objective

Redesign `/products` into an airy editorial listing: a category header with description, a quiet filter rail, a restrained toolbar, the storefront `ProductCard` grid (or list), refined pagination and a breadcrumb, while keeping the URL scheme, category resolution (parent includes children), client-side filtering/sorting/pagination and every facet exactly as they work today.

## Scope — files and areas to touch

- `src/pages/Products/Products.js` + `Products.module.css` (restructure and restyle; keep the logic blocks listed under "Preserve").
- `src/components/Breadcrumb/Breadcrumb.js` + `.module.css`: orphan today; revive as the shared breadcrumb (`items: [{ label, link? }]`, `nav aria-label="Breadcrumb"`, `aria-current="page"` on the last item, token styles) and use it here; Prompt 16 switches the product page to it and Prompt 28 the static pages.
- Mobile filter sheet: either keep the page's existing accessible sheet markup restyled, or replace it with `BottomDrawer` (Prompt 09) if it provides the same focus management; document the choice.

Do not touch: `ProductCard` (Prompt 13), `src/utils/categories.js`, `api.js`, `db.json`, admin.

## What exists today (preserve every behaviour; read `Products.js`, 1282 lines)

- Data: `fetchCatalog` → `Promise.all([products.getAll(), categories.getAll()])`; everything else client-side; retry on error.
- URL params read: `category` (comma-separated slugs or legacy ids, canonicalised to slugs and rewritten in place), `search`, `sort`, `page`, `per_page`, `min_price`, `max_price`; written via `syncUrlParams` with `replace: true`, omitting defaults (`sort=relevance`, `page=1`, `per_page=12`). Rating, discount, in-stock and brand facets are session-only (not in the URL).
- Facets: Categories (hierarchical checkboxes with depth indent and counts via `categoryCounts`, parent-includes-children through `resolveCategory` + `getCategoryScopeIds`), Price range (min/max + quick ranges `PRICE_RANGES`), Customer rating (4/3/2/1 & up, re-click clears), Discount (50/30/20/10% or more), Availability switch (`role="switch"`), Brand checkboxes from `availableBrands`, "Clear all" (keeps `per_page`).
- Sort: `SORT_OPTIONS` relevance, price-low, price-high, newest (`createdAt`), rating, popularity (`totalReviews`); aliases via `normalizeSort` (`popular` → popularity).
- Grid/list toggle; pagination with `PER_PAGE_OPTIONS` 12/24/48, `paginationRange` with ellipses, clamp, scroll-to-results with header offsets (`getDeviceType`); results text variants; skeletons (`SkeletonCard × perPage`), error panel with "Try Again", empty state with "Clear All Filters" when constrained.
- Card: the page renders its own `renderProductCard` (with a `placehold.co` fallback, no `onError`, "Only N left" at `stock <= 5`); replace it with the storefront `ProductCard` (`onAddToCart={(item) => addToCart(item)}` since the card already builds the cart item, `onToggleWishlist`, `isWishlisted`). The list view needs a horizontal card variant: add a `layout="list"` prop to `ProductCard` only if Prompt 13 did not; otherwise render a page-local list row that reuses `PriceBlock`/`StarRating` (document which).
- Mobile sheet: `role="dialog" aria-modal`, Escape, focus to close button, focus restore to the trigger, body scroll lock, "Show N results".
- Sticky sidebar offsets assume the old fixed header (`top: 152px` / `116px`); the new header defines `--sf-header-height` (Prompt 07): use it.

## Brand and design requirements

- **Page header**: breadcrumb (Home › Furniture › Department › Group › Leaf, every ancestor resolved from the category tree with links), then an `h1` in the display serif: the selected category's name (or "All furniture" when none; "Results for “query”" when `search` is set) with the category `description` beneath in sans 17px secondary (measure 60ch). No hero image here (the mega-menu and Shop by Space carry imagery); generous `--sf-section-y` padding above.
- **Layout**: desktop 12-col: filter rail 3 columns (sticky, `top: calc(var(--sf-header-height) + 24px)`, own scroll), results 9; tablet: rail collapses into the sheet; mobile: sheet. Grid: 3 columns on desktop (not 4: larger images), 2 on tablet and mobile, gap 24px/16px; list view: one column rows with a 4:5 thumbnail 160px wide.
- **Filter rail**: eyebrow group titles with hairline separators; category tree as a collapsible outline (departments expanded for the active department only), counts in muted; price inputs as `.sf-input` with visible labels "Min" / "Max", `inputmode="numeric"`, and the quick ranges as `.sf-chip`s; rating/discount radios as `.sf-radio` rows; availability `.sf-switch`; brand `.sf-check` rows; "Clear all" as `.sf-btn--link`. Applied filters also appear as removable chips above the grid ("Plastic Furniture ×", "Under ₹5,000 ×").
- **Toolbar**: results text (sans 14px muted), sort as a `.sf-select` with a visible "Sort" label, grid/list as two icon buttons (`aria-pressed`), the mobile "Filters" button with the active-count dot. Sticky toolbar under the header on mobile only.
- **Cards**: storefront `ProductCard`; entrance via `Reveal` stagger limited to the first 6 cards; skeleton grid uses `ProductCardSkeleton` if Prompt 13 exported it, else `.sf-skeleton` blocks.
- **Pagination**: hairline-separated numbers in sans 14px, current page ink with underline, prev/next as ghost buttons with `aria-label`, `aria-current="page"`; per-page select with a label; results scroll to the toolbar on page change (keep the offset logic, using `--sf-header-height`).
- **States**: skeletons (same grid), error panel (`.sf-panel`, serif title "We couldn't load the catalogue.", retry), empty state (serif title "Nothing here yet.", one line, "Clear all filters"), no-results-for-search variant quoting the query.
- **Dark mode**: through tokens; remove the page's local aliases that still point at stale values (the module currently maps `--accent` to `--sf-color-primary`; after Prompt 01 primary is ink: use the accent token where the old purple accent was meant as emphasis, ink where it was a button).

## Functional guardrails

1. **Preserve functionality and the data/API contract**: every URL param, facet rule, sort rule, pagination rule, scope resolution and retry path listed above stays; the canonical `?category=<slug>` scheme and legacy-id rewrite stay; cart/wishlist wiring through contexts; no new endpoints; `products.getAll()` remains the data source (no server-side filtering added).
2. **Tokens only**: zero colour literals in `Products.module.css` and `Breadcrumb.module.css` (the module currently has 2 hex + 3 rgba and a stale orange focus ring); no `placehold.co` URL in the page (the card handles fallbacks).
3. **Admin untouched.**
4. **Brand consistency**: serif page title, hairline rail, 3-column grid, restrained toolbar, no badges beyond the card's.
5. **Responsive and accessible**: `h1` present; facet groups as `fieldset/legend` (or headings with `role="group" aria-labelledby`); switch/radio/checkbox semantics kept; sheet dialog semantics kept; price inputs labelled; `aria-live="polite"` on the results text; 44px targets.
6. **No fabricated trust signals**: "Only N left" only when stock ≤ the product's `lowStockThreshold` (align with the product page rule; replace the magic 5), never a random number.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–13), `prompts/DESIGN_SYSTEM.md`; then `Products.js` fully (note `normalizeSort`, the URL→state effect, `syncUrlParams`, `filteredProducts`, `categoryCounts`, `paginationRange`, the sheet effect), `Products.module.css` aliases, `src/utils/categories.js`, `Breadcrumb.js`, `ProductCard.js`.
2. Build breadcrumb ancestors by walking `parentId` from the selected category; keep "Home › All furniture" when none.
3. Keep the business logic functions byte-identical where possible (move them, do not rewrite them); restyle around them.
4. Verify deep links: `/products?category=plastic-essentials-armchairs`, `/products?category=home-furniture&sort=price-low&page=2`, `/products?search=chair`, a legacy `/products?category=1` (rewrites to the slug).

## Acceptance criteria

- [ ] Listing matches the layout and states above; breadcrumb component in use; filter rail, chips, toolbar, grid/list, pagination work as before; storefront `ProductCard` used everywhere on the page.
- [ ] Every URL param and facet behaves exactly as before (test the four deep links); sticky offsets use `--sf-header-height`.
- [ ] Zero colour literals; both modes verified; no layout shift.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: browse each department from the mega-menu; apply every facet; sort every option; change per-page; paginate; toggle list view; open the mobile sheet at 360px and apply filters; quick-add to cart from a card; toggle wishlist; test the empty and error states (stop the JSON Server briefly for the error state).
2. Widths 360, 768, 1024, 1440.
3. Keyboard/screen reader: rail controls, sheet focus management, pagination `aria-current`, results live region.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance.
6. Admin regression quick check (Admin → Products unaffected).
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 14 — Product listing page`: what changed, the list-view card decision, the sheet decision, deviations, client confirmations (none expected).
