# Product card — the signature component

**Prompt 13 of 34**

## Depends on

Prompts 01 (tokens), 03–05 (real catalogue with variants, sale prices, ratings), 06 (UI primitives and skeleton utilities).

## Context

A & S Urbanseat's storefront (Create React App, CSS Modules, data through the dual-mode `src/services/api.js` and `db.json`) is being redesigned into a premium editorial boutique. `src/components/storefront/ProductCard.js` is the one card rendered by every product surface (home collections, listing grid, related/frequently-bought carousels, search results where adopted, special offers), so its quality defines the storefront. Tokens are documented in `prompts/DESIGN_SYSTEM.md`; refer to them by role. The admin panel must not change.

## Objective

Redesign `ProductCard` (with its helpers `PriceBlock` and `StarRating`) into an image-forward, minimal, editorial card with a refined hover and a quick-add, keeping its props, its cart/wishlist wiring and its honesty rules intact.

## Scope — files and areas to touch

- `src/components/storefront/ProductCard.js` + `ProductCard.module.css`
- `src/components/storefront/PriceBlock.js` + `PriceBlock.module.css`
- `src/components/storefront/StarRating.js` + `StarRating.module.css`
- `src/components/storefront/index.js` only if you add a named export (for example `ProductCardSkeleton`).

Do not touch: the pages that render the card (their prompts adopt the new card as is), `src/utils/helpers.js` (`buildCartItem`, `productPath`, `getProductMinPrice`, `onImageError`, `PLACEHOLDER_IMG` are consumed, not changed), contexts, `api.js`, `db.json`, the admin.

## What exists today (keep the contract)

`ProductCard` (112 lines) props: `product` (required), `onAddToCart(cartItem)` (omit to hide the button), `onToggleWishlist(product)` (omit to hide the heart), `isWishlisted` (boolean), `showAddToCart` (default true). It computes `getProductMinPrice(product)` → `{ sellingPrice, originalPrice, discount }`, renders the first image (`product.images?.[0] || product.image || PLACEHOLDER_IMG`, `loading="lazy"`, `onError={onImageError}`) inside a `Link` to `productPath(product)`, a discount badge when `discount > 0`, the wishlist heart button, `brand`, the name truncated at 48 chars, `StarRating` + count **only when `totalReviews > 0`**, `PriceBlock size="sm" showSavings={false}`, and an "Add to Cart" button that calls `onAddToCart(buildCartItem(product))` (disabled and labelled "Out of Stock" when `product.stock === 0`). `PriceBlock` props: `price`, `comparePrice`, `size`, `showSavings`; `StarRating` props: `rating`, `size` (and read the file for the rest). Keep every prop name and default; the pages depend on them.

## Brand and design requirements

- **Layout**: no card border or shadow at rest; image slot with `aspect-ratio: 4 / 5` (the catalogue's placeholders are 1200×1500), sand background while loading, `object-fit: cover`; body below with 12px top spacing; the whole card is a vertical stack: eyebrow (brand, sans 11px uppercase tracked, muted; omitted when brand is empty), name (display serif, 18px, ink, 2-line clamp, no truncation to "…" by JS; keep `truncateText` only as a fallback for very long names), rating row (tiny stars 12px + count in muted, only when `totalReviews > 0`), price row (`PriceBlock`: current price sans 15px medium ink; compare price struck muted; savings as a short "Save 12%" in accent-text when `showSavings`, but the card passes `showSavings={false}` as today).
- **Badges**: "Sale" as a small eyebrow chip (paper on ink, 10px tracked) at the image's top-left when `discount > 0` (replace "12% OFF"); "New" when `product.hot` is true; "Sold out" when `stock === 0` (image at 60% opacity). Never more than two chips.
- **Wishlist**: 36px hairline circle button top-right over the image, paper background at 90%, heart outline; filled with accent when `isWishlisted`; `aria-pressed`, `aria-label` "Save to wishlist" / "Remove from wishlist".
- **Hover (pointer devices)**: image scales 1.03 over `--sf-duration-slow` with `--sf-ease-out`; if `product.images[1]` exists, crossfade to it (second `img`, lazy, `aria-hidden`); a hairline appears around the image; the quick-add bar ("Add to cart", ink on paper at 92% opacity, 44px) slides up from the image bottom. On touch devices (`@media (hover: none)`) the quick-add is a persistent 44px circular "+" button at the image's bottom-right with `aria-label="Add <name> to cart"`. Out of stock disables it with "Sold out".
- **Quick-add feedback**: on click, show "Added" for 1.2s inside the button (the cart toast and drawer behaviour come from the page's handler and `CartContext`; do not add another toast).
- **Focus**: `:focus-visible` ring token on the link and the buttons; the card link wraps only the image and name (not the buttons) to avoid nested interactive elements.
- **Skeleton**: export `ProductCardSkeleton` (same box: 4:5 image block + three lines) for pages to use while loading.
- **Dark mode**: sand/surface tokens swap automatically; verify chip contrast.
- **Motion safety**: all transitions use the tokens; none under reduced motion except opacity.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: same props, same `buildCartItem(product)` payload (so quick-adds merge with product-page adds by `productId-variantId`), same `productPath` links (slug URLs), same honesty rule for ratings, same out-of-stock rule. No API calls inside the card.
2. **Tokens only**: the three CSS modules are already tokenised; keep them that way (zero hex).
3. **Admin untouched.**
4. **Brand consistency**: no heavy borders, no gradients, no rounded "pill" cards (radius ≤ `--sf-radius-md`), serif names, quiet price.
5. **Responsive and accessible**: image `alt` = product name; `width`/`height` attributes derived from the 4:5 ratio (e.g. 1200/1500) so the browser reserves space even before CSS; 44px targets for the heart and quick-add; the name link text is the accessible name of the card.
6. **No fabricated trust signals**: no "bestseller", "N people viewing", or invented badges; "New" only from `hot`, "Sale" only from a real `comparePrice`.
7. **Test before done.**

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md`, `prompts/DESIGN_SYSTEM.md`; then the three components, `src/utils/helpers.js`, and every consumer (`grep -rn "ProductCard" src`) to confirm which props each passes.
2. Keep the markup light: one `article` root (`aria-labelledby` the name), the image `Link`, the chips, the two buttons, the body.
3. For the crossfade, preload nothing; the second image is lazy and only fades when loaded (`onLoad` sets a class).
4. Verify in the listing grid (Prompt 14 will restyle the grid, but the current one must not break), on the home page and in the related carousel.

## Acceptance criteria

- [ ] Card matches the layout, badges, hover, touch, focus and skeleton rules; props unchanged; consumers render without changes.
- [ ] Quick-add adds the cheapest variant exactly as before (verify in the cart drawer: same line merges with a product-page add of the same variant).
- [ ] Rating row hidden when `totalReviews` is 0; "Sale"/"New"/"Sold out" only from data.
- [ ] No hex literals; contrast of chips and muted text verified in both modes; no layout shift when images load.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: `/`, `/products`, a product page's related carousel, `/special-offers`; hover and click quick-add and the heart (guest and logged in); keyboard-tab through a grid of 8 cards.
2. Widths 360 (two columns), 768, 1024, 1440: the 4:5 images keep ratio; names clamp to two lines.
3. Screen reader: card announced by name; buttons have accessible names.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (the card receives data from pages).
6. Admin regression quick check.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 13 — Product card`: what changed, the `ProductCardSkeleton` export, hover/touch behaviour decisions, deviations, client confirmations (none expected).
