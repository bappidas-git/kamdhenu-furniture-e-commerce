# Home storytelling and discovery sections

**Prompt 11 of 34**

## Depends on

Prompts 01–06, 10 (hero, `homeContent.js`), and it is best run after 13 (product card) if you reorder; as written it runs before 13 and uses the storefront `ProductCard` as it exists (Prompt 13 will restyle it in place without changing props).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. The admin panel must not change.

## Objective

Rebuild the middle of the home page as curated, image-forward discovery with generous whitespace: "Shop by Space" tiles, an alternating image/text editorial story, Featured Collections, a "Complete the Space" curation block, a trending rail and a quiet "Recently viewed" rail, each driven by catalogue data and the one content module, with the boilerplate's fabricated promo banner and perpetual flash-deal countdown removed.

## Scope — files and areas to touch

- `src/pages/Home/Home.js` + `Home.module.css`: everything between the assurance strip (Prompt 10) and the social-proof/explainer/closing sections (Prompt 12). Remove the page's private `ProductCard`, `StarRating`, `CountdownTimer`, `SectionHeader`, `ScrollRow` helpers in favour of `src/components/storefront/ProductCard`, `src/components/ui/SectionHeading`, `Reveal` and a new shared rail.
- `src/components/FeaturedProducts/FeaturedProducts.js` + `.module.css`: currently an orphan with its own private card; revive it as the **Featured Collections** rail component (props `products`, `title`, `eyebrow`, `viewAllLink`, `onAddToCart`, `onToggleWishlist`, `isInWishlist`) rendering the storefront `ProductCard`; delete its private card.
- New: `src/components/storefront/ProductRail.js` + module (horizontal snap rail with hairline-styled prev/next buttons, `aria-roledescription="carousel"`, keyboard scroll, used by Featured Collections, Trending and Recently viewed) — or extend `RelatedProducts`' scroller if you prefer one implementation; either way, one rail implementation.
- `src/content/homeContent.js`: add `SPACES` (4 entries: `{ key, label, line, categorySlug }` for Home → `home-furniture`, Office → `office-chairs`, Café & Restaurant → `cafe-restaurant-chairs`, Outdoor → `outdoor-furniture`), `STORY` (2–3 alternating blocks: `{ eyebrow, title (with *accent*), body, cta: { label, to }, image: { src, alt } }`), and `COMPLETE_THE_SPACE: { anchorProductSlug }` (which featured product anchors the curation; fallback: the first featured product with non-empty `frequentlyBoughtTogetherIds`).

Do not touch: `HeroSection`, `AssuranceStrip` (Prompt 10), the social proof/explainer/closing CTA (Prompt 12), `ProductCard` internals (Prompt 13), `api.js`, `db.json`, admin.

## What exists today (read before rewriting)

`Home.js` (607 lines) renders, after the hero: Flash Deals (derived from featured+trending with a discount, with a countdown to local midnight that resets daily: fabricated urgency, remove), Shop by Category (category cards with optional image and `productCount`), Featured Products (`products.getFeatured(8)`), a fully hardcoded promo banner ("Up to 50% Off on Top Brands … electronics, fashion": remove), Trending Now (`products.getTrending(8)`), Why Choose {APP_NAME} (`WHY_CHOOSE_US`: Prompt 12 turns this into the explainer), Recently Viewed (`localStorage["recentlyViewed"]`, written by `ProductDetails.js`). It fetches `Promise.all([categories.getAll(), products.getFeatured(8), products.getTrending(8)])`. Its "View All" links use `?sort=sale|featured|trending`, which the listing does not understand (falls back to relevance); the only valid sorts are `relevance, price-low, price-high, newest, rating, popularity` (`popular` is an alias). 81 hex literals, no tokens, no `h1` (Prompt 10 adds it in the hero).

## Brand and design requirements (section order after the assurance strip)

1. **Shop by Space** (`SectionHeading` eyebrow "Shop by space", title "Furniture for every *room*."): four large tiles (desktop 4 across, tablet 2×2, mobile a 2-column grid with 4:5 tiles), each the mapped category's `image` (from `apiService.categories.getAll()` resolved by `categorySlug`; `object-fit: cover`, lazy, `onImageError`, alt = category name) with a bottom scrim, the space label in the display serif (28px) and a one-line editorial `line`; the whole tile is one `Link` to `/products?category=<slug>`; hover: image scale 1.03 over `--sf-duration-slow`. If a mapped category is missing from the data, skip the tile (never render a broken link).
2. **Editorial story block 1** (from `STORY[0]`): 12-column grid, image 7 / text 5, text vertically centred with an eyebrow, a serif title with an italic accent, a 2–3 sentence body (measure 48ch) and a ghost CTA; image 4:5 placeholder with reserved ratio. `Reveal` on both halves.
3. **Featured Collections** (`FeaturedProducts` rail; eyebrow "Featured", title "Pieces we *recommend*.", "View all" → `/products`): `products.getFeatured(8)`; cards 4 across on desktop (rail scrolls when more), 2.2 visible on mobile with snap; skeleton cards while loading; section hidden when empty.
4. **Complete the Space**: anchor product (by `COMPLETE_THE_SPACE.anchorProductSlug` via `products.getBySlug`, fallback rule above) shown large (image 4:5, name in serif 32px, short description, price via `PriceBlock`, "View" link) beside a 2×2 of its companions from `products.getFrequentlyBoughtTogether(anchor, 4)` falling back to `products.getRelated(anchor, 4)`; each companion is a `ProductCard`; a quiet "Add all to cart" ghost button adds the anchor and companions one by one through `addToCart(buildCartItem(p), 1, { openDrawer: false })` and opens the drawer once at the end (`setIsCartOpen(true)`). Hidden when there is no anchor or fewer than 2 companions.
5. **Editorial story block 2** (`STORY[1]`, mirrored: text 5 / image 7).
6. **Trending** (`ProductRail`; eyebrow "Trending", title "What people are *choosing*.", "View all" → `/products?sort=popular`): `products.getTrending(8)`; hidden when empty. The label describes the admin-curated `trending` flag honestly; do not add view counts or "N sold".
7. **Recently viewed** (only when `localStorage["recentlyViewed"]` has items; keep the parsing exactly): eyebrow "Recently viewed", small rail, no heading hierarchy break.

Global rules: every section uses `.sf-section` rhythm and `.sf-container`/`--wide`; hairline dividers between sections instead of background bands (at most one sand-background section, use it for Complete the Space); no dense grids (max 4 columns); all section titles `h2`; "View all" links are `.sf-btn--link`; no countdowns, no "50% OFF" circles, no discount-sorted promos. Fix the "View all" links to valid targets: `/products`, `/products?sort=newest`, `/products?sort=popular`, `/products?sort=rating`.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: API calls limited to `categories.getAll`, `products.getFeatured`, `products.getTrending`, `products.getBySlug`, `products.getFrequentlyBoughtTogether`, `products.getRelated`; cart adds through `useCart().addToCart(buildCartItem(product), 1)`; wishlist through `useWishlist().toggleWishlist/isInWishlist`; recently-viewed parsing unchanged. No new endpoints; no schema changes.
2. **Tokens only**: `Home.module.css` and `FeaturedProducts.module.css` end with zero hex/rgb literals.
3. **Admin untouched.**
4. **Brand consistency and minimalism**: fewer, larger sections; serif titles with one italic accent; hairlines; placeholders in the neutral tones.
5. **Responsive and accessible**: tiles and cards keyboard reachable (they are links/buttons, not clickable divs); rails have `aria-roledescription="carousel"`, labelled prev/next buttons, and remain scrollable by keyboard; images have alt text and reserved ratios; heading order h1 (hero) → h2 sections.
6. **No fabricated trust signals**: no flash deals, countdowns, "top brands", invented discounts or demand claims.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–10), `prompts/DESIGN_SYSTEM.md`; then `Home.js`, `Home.module.css`, `FeaturedProducts.js`, `RelatedProducts.js` (existing scroller CSS), `ProductCard.js` (props), `src/utils/helpers.js` (`buildCartItem`, `productPath`), `src/context/CartContext.js` (`addToCart(product, qty, { openDrawer })`, `setIsCartOpen`).
2. Keep the data loading in one `useEffect` with `Promise.all` and per-call `.catch(() => [])` as today; add the anchor product load after featured resolves.
3. Remove the duplicate `categories.getAll()` the old hero made; Home fetches categories once and passes what Shop by Space needs.
4. Placeholder images for story blocks: `placehold.co` in the neutral tones (1200×1500), alt text describing the intended photograph honestly ("Placeholder for a living-room photograph").

## Acceptance criteria

- [ ] Sections render in the order above with real data; Shop by Space links filter the listing correctly; Complete the Space adds its items and opens the drawer once; rails scroll and snap; recently viewed appears after visiting products.
- [ ] Flash deals, countdown, promo banner, private card/star/countdown helpers removed; "View all" links valid.
- [ ] Zero colour literals; both modes verified; no layout shift (ratios reserved).
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: `/` end to end; click each space tile, story CTA, featured card, companion quick-add, trending card; visit two product pages and return to see Recently viewed; test with an empty `trending` set by temporarily editing `db.json` (restore it).
2. Widths 360, 768, 1024, 1440.
3. Keyboard: tab through tiles and rails; screen reader announces section headings and carousel controls.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance.
6. Admin regression quick check.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 11 — Home storytelling and discovery`: what changed, the content module additions, the rail implementation decision, deviations, client confirmations (story copy, space mapping).
