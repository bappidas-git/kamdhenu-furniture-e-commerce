# Search overlay

**Prompt 15 of 34**

## Depends on

Prompts 01–07, 09, 13 (product card), 14 (listing: the "View all results" target).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. The admin panel must not change.

## Objective

Turn the search modal into a calm full-screen search overlay with a large serif input, category chips, honest "popular" suggestions derived from data, recent searches, a results grid of storefront product cards, and considered empty/no-results/loading/error states, keeping its scoring, caching, recents and keyboard behaviour.

## Scope — files and areas to touch

- `src/components/SearchModal/SearchModal.js` + `SearchModal.module.css` (rewrite the markup and styles; keep the logic listed under "Preserve"). `SearchModal/index.js` is unused: delete it or make the consumers use it (your call; document it).

Do not touch: `Header.js` and `BottomNav.js` beyond reading how they mount it (`open`, `onClose`), `ProductCard`, `api.js`, `db.json`, admin.

## What exists today (preserve; read `SearchModal.js`, 694 lines)

- Props `open`, `onClose`. Mounted by `Header.js` and `BottomNav.js` (two instances; a module-level cache `searchDataCache`/`searchDataPromise` means one catalogue fetch).
- Data: on open, `apiService.products.getAll()` + `apiService.categories.getAll()` once; scoring in memory (`scoreProduct`: name exact 100 / starts-with 80 / word-start 60 / contains 40; tags 30/20/10; category or brand 15; description 5; trending +3, hot +2); `MAX_RESULTS = 12`; `DEBOUNCE_MS = 300`.
- Category chips built from the live tree ("All" + each active top-level category; a chip matches the category's slug and all descendants, plus name/slug substring and tag matches).
- Recent searches in `localStorage["recentSearches"]` (max 8, de-duplicated case-insensitively, "Clear all"); a product click saves the query and navigates to `productPath(product)`; "View all N results" → `/products?search=<term>`.
- `TRENDING_SEARCHES` is a hardcoded demo list (Laptop, Earbuds, Saree…): replace with data-derived suggestions (below).
- Behaviour: focus the input after open (120ms), Escape closes, body scroll lock, reset on close, overlay click closes, inner click stops propagation; `role="dialog" aria-modal aria-label="Product search"`; local `StarRating` and `FALLBACK_IMAGE` duplicates.

## Brand and design requirements

- **Overlay**: full-screen on all widths, paper surface (dark base in dark mode), no blur, no 85% black veil; a thin accent progress hairline at the top while searching; close button top-right (44px, `aria-label="Close search"`), `<BrandLogo height={24} />` top-left for orientation (optional).
- **Input**: serif display input (display-md size, no border, a 1px hairline underneath that turns accent on focus), placeholder "Search furniture, rooms, brands…", visible label as a visually-hidden `label` (`htmlFor`), `type="search"`, `autocomplete="off"`, `enterkeyhint="search"`; a clear button appears with text.
- **Below the input, before typing**: two quiet columns: "Recent" (from localStorage, each as a `.sf-chip` with a remove ×, plus "Clear all") and "Popular" — derived from data, not a demo list: the names of the first 6 `trending` products (`product.trending`) or, if none, the six department names; label it "Popular" only when it comes from trending products, otherwise "Departments". Clicking a chip runs the search (products) or navigates to the department (`/products?category=<slug>`).
- **Category chips**: the existing live chips restyled as `.sf-chip`s in a horizontally scrollable row with `aria-pressed`.
- **Results**: a 3-column grid on desktop (2 on tablet/mobile) of storefront `ProductCard`s (`onAddToCart` omitted to keep the overlay focused on navigation; wishlist omitted too, or included if space allows), result count in an `aria-live="polite"` line ("12 results for “chair”"), "View all N results" `.sf-btn--ghost` when more than `MAX_RESULTS` match. Replace the local star-rating and the private `FALLBACK_IMAGE` with the card's own handling.
- **States**: loading (skeleton grid + the top hairline), no results ("Nothing matched “q”." + "Try a room, a material or a department." + the department chips), error (if the catalogue fetch fails: serif "Search is unavailable right now." + retry button that re-runs the cached promise), empty input (recent/popular columns).
- **Keyboard**: Escape closes; `ArrowDown` from the input moves focus to the first result card, `ArrowUp` back; Tab order: input → clear → chips → results → view all → close; focus trap inside the overlay; focus returns to the trigger on close (the trigger passes `onClose`; store `document.activeElement` on open).
- **Motion**: overlay fades in `--sf-duration`; results stagger ≤ 8 items by 40ms; none under reduced motion.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: same props, same fetch/caching, same scoring and chip-matching functions (move, do not rewrite), same localStorage key and rules, same navigation targets. No new endpoints (the overlay keeps using `products.getAll` + `categories.getAll`, not `products.search`, to keep both branches identical).
2. **Tokens only**: zero colour literals in the module (70 hex + 44 rgba today).
3. **Admin untouched.**
4. **Brand consistency**: serif input, paper overlay, hairlines, product cards consistent with the listing.
5. **Responsive and accessible**: dialog semantics, labelled input, live result count, focus trap and return, 44px chips/buttons, `prefers-reduced-motion`.
6. **No fabricated trust signals**: "Popular" only from the `trending` flag; no "N people searched"; no demo terms.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–14), `prompts/DESIGN_SYSTEM.md`; then `SearchModal.js` fully, `Header.js`/`BottomNav.js` mounts, `ProductCard.js`, `src/utils/helpers.js`.
2. Keep two instances working (Header + BottomNav) or consolidate per Prompt 09's decision; the module-level cache must remain safe with one or two instances.
3. Because the overlay is full-screen, the `z-index` should be the modal token (`--sf-z-modal`) rather than 9999, but it must stay above the header, mega-menu, bottom nav and cart drawer; verify against the z-index map in `DESIGN_SYSTEM.md` (add `--sf-z-search` if needed and document it).

## Acceptance criteria

- [ ] Overlay matches the design; recent and data-derived popular chips; category chips; results grid of `ProductCard`s; all states; keyboard behaviour and focus management.
- [ ] Scoring, caching, recents, "View all", product navigation unchanged (compare results for "chair", "almirah", "nilkamal" before and after).
- [ ] Zero colour literals; both modes verified.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: open from the header and the bottom nav; type "chair", "office", "sofa", "zzz"; use chips; click a result; use recent searches; clear them; stop the server to see the error state and retry.
2. Widths 360, 768, 1024, 1440.
3. Keyboard/screen reader: open, type, arrow into results, Escape; announcement of the result count.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (`products.getAll`/`categories.getAll` normalise both branches).
6. Admin regression quick check.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 15 — Search overlay`: what changed, the popular-chips rule, z-index decision, `index.js` decision, deviations, client confirmations (none expected).
