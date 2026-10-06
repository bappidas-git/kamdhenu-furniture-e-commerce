# Product details — primary (gallery, buy box, trust, delivery, sticky bar)

**Prompt 16 of 34**

## Depends on

Prompts 01–07, 13 (card, `PriceBlock`, `StarRating`), 14 (`Breadcrumb` component).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. The product page is already fully tokenised and assembled from `src/components/storefront/*`; this prompt redesigns its first screen. The admin panel must not change.

## Objective

Redesign the product page's primary surface: an editorial gallery with zoom, a title/price block with honest social proof, variant selectors, quantity, Add to Cart and Buy Now, trust badges, delivery and returns facts, and the mobile sticky add-to-cart bar, with variant logic, stock derivation, cart wiring and slug routing untouched.

## Scope — files and areas to touch

- `src/pages/ProductDetails/ProductDetails.js` + `ProductDetails.module.css`: the skeleton, not-found state, breadcrumb (switch to the shared `Breadcrumb`), `.mainLayout` (gallery + info column), purchase row, action buttons, trust badges and delivery block, and the `AddToCartBar` mount. Leave the tabs section, reviews, FBT and related mounts for Prompt 17 (restyle only their container spacing if needed).
- `src/components/storefront/ProductGallery.js` + module, `VariantSelector.js` + module, `QuantityStepper.js` + module, `TrustBadges.js` + module, `DeliveryReturnsInfo.js` + module, `AddToCartBar.js` + module, `SocialProof.js` + module (its PDP usage; Prompt 12 did not change it).
- `src/components/storefront/variantUtils.js`: read-only.

Do not touch: `ReviewsSection`, `FrequentlyBoughtTogether`, `RelatedProducts` (Prompt 17), `ProductCard`/`PriceBlock`/`StarRating` (Prompt 13), `CartContext`, `api.js`, `db.json`, admin.

## What exists today (preserve; read `ProductDetails.js`, 605 lines, and each component)

- Load by slug with legacy numeric-id fallback and canonical redirect (`navigate(/products/${data.slug}, { replace: true })`); `selectedVariant = variants[0]`; recently-viewed write to `localStorage["recentlyViewed"]` (max 20); `categories.getById`; `products.getReviews`; AOV gated by `STOREFRONT_CONFIG.aov`; `settings.get()` and `shipping.getMethods()`.
- Derived values (keep byte-identical): `currentPrice`, `comparePrice`, `discount`, `currentSku`, `currentStock`, `hasStockInfo`, `isOutOfStock`, `lowStockThreshold = Number(product.lowStockThreshold) || 5`, `isLowStock`, `STOCK_UNKNOWN_MAX = 10`, `maxQuantity`, the quantity clamp effect, the reviews blend `displayAvg`/`totalRatingsCount`.
- Cart wiring: cart line `{ id: variant ? `${product.id}-${variant.id}` : String(product.id), productId, slug, variantId, variantName, name, image, price, comparePrice, currency: "INR", stock }`; `addToCart(cartItem, quantity, options)`; "Added to Cart ✓" for 1.4s; Buy Now → `addToCart(..., { openDrawer: false })` then `navigate("/checkout")`; wishlist toggle with `aria-pressed`; `scrollToReviews`.
- `AddToCartBar`: `IntersectionObserver` on `buyBoxRef`, shows when the buy box leaves the viewport, mobile only (≤ 768px, `z-index` 1300 override), `aria-hidden` when hidden, `tabIndex` toggling.
- `ProductGallery`: thumbs `role="tablist"`, main `role="group" tabIndex=0` with ArrowLeft/Right, hover zoom (scale 2 at the cursor), `-N%` badge, thumbs below on mobile.
- `VariantSelector`: structured attributes → one `radiogroup` per attribute (colour swatches when the attribute matches `/colou?r|shade|finish/i`, `swatchHex`), flat → "Select Option" tiles; availability states (sold out, muted-in-combo with snap-to-best-variant on click), "Only N left in this option" using `lowStockThreshold`.
- `TrustBadges`: ids from `STOREFRONT_CONFIG.trustBadges`, sub-labels from `resolveTrustBadgeDetail`; `DeliveryReturnsInfo`: live methods with rate/free-above/estimated days, COD + max order, returns window, tax note.

## Brand and design requirements

- **Layout**: `--sf-container-wide`; breadcrumb (shared component) above; 12-col grid: gallery 7 columns (sticky at `top: calc(var(--sf-header-height) + 24px)` on ≥ 1024px), info 5 columns with 48px left padding; single column below 980px (keep that breakpoint) with the gallery first.
- **Gallery**: main image 4:5 (`aspect-ratio` reserved, `object-fit: cover` for the placeholders; keep `contain` as an option via a prop if photos later need it), hairline frame, no badge overlay except a quiet "Sale" eyebrow chip; thumbnails as a vertical hairline strip on desktop (56px squares), a horizontal strip on mobile; zoom on hover stays (desktop only), plus a click-to-open lightbox is **not** required (do not add). First image `loading="eager"` + `fetchpriority="high"`, others lazy; `width`/`height` attributes; keyboard arrows kept.
- **Info column** order: eyebrow row (brand, or category name when brand is empty) · `h1` in the display serif (display-md, 2–3 lines max) · `SocialProof` restyled as a quiet row (stars 14px, "4.6 · 12 reviews" link that scrolls to reviews; "No reviews yet" when 0, never "0.0") · `PriceBlock size="lg"` (current price serif? no: sans 24px medium ink; compare struck muted; "Save ₹X" in accent-text; tax note muted 12px) · short description (sans 16px secondary, measure 52ch) · hairline · `VariantSelector` (attribute name as eyebrow, chips as `.sf-chip`s 40px, colour swatches 28px circles with hairline and a 2px ink ring when selected, sold-out strike kept, the selected meta line kept) · purchase row: `QuantityStepper` (hairline pill, 44px) + stock status text (`In stock` / `Only N left` / `Out of stock`, from the derived values only) · actions: `Add to cart` (`.sf-btn--primary --lg --block` on mobile, 56px tall desktop, "Added ✓" state kept), `Buy now` (`.sf-btn--ghost --lg`), wishlist as a 48px hairline circle with `aria-pressed` · SKU line muted 12px · hairline · `TrustBadges` as a 2×2 of eyebrow-style items with outline icons (no tinted chips) · `DeliveryReturnsInfo` as a hairline-bounded facts list (each method: name, window, cost or "Free above ₹X"; COD line; returns line; tax line) with a small serif heading "Delivery & returns".
- **Sticky bar** (`AddToCartBar`, ≤ 768px): paper, top hairline, 64px: thumbnail 40px, name (one line, serif 15px), price, and a compact `Add to cart` primary button (44px); keep the observer and the `aria-hidden`/`tabIndex` rules; `z-index` via the token scale above the bottom nav (coordinate with Prompt 09's `--sf-z-bottomnav`; replace the hardcoded 1300 with a token).
- **Skeleton**: mirror the layout (gallery 4:5 block, title lines, price, chips, buttons) with `.sf-skeleton`.
- **Not found**: serif "We couldn't find that piece." + "Browse all furniture" link (keep the 404-ish state; no hard navigation).
- **Motion**: gallery crossfade between images `--sf-duration`; "Added ✓" micro-feedback; no lifts.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: every load, derive, cart, wishlist, navigation and observer behaviour listed above stays; the variant data shapes and `variantUtils` are untouched; `STOREFRONT_CONFIG` reads stay; no new endpoints; `metaTitle`/`metaDescription` are not rendered here (Prompt 32 adds `document.title`).
2. **Tokens only**: the page and these components are already tokenised; keep them at zero literals (remove the `#fff` chip texts in favour of the paper token and the hardcoded `z-index: 1300`).
3. **Admin untouched.**
4. **Brand consistency**: serif title, sans prices, hairlines, chips, no tinted badge chips, no gradients (the current CTA uses `--sf-gradient-primary`; switch to the ink primary button).
5. **Responsive and accessible**: `h1`; gallery tablist/group semantics kept; radiogroups kept; stepper `aria-live` kept; sticky bar hidden from AT when hidden; 44–56px targets; contrast verified.
6. **No fabricated trust signals**: stock and low-stock messages only from the derived values; trust badges only from config/settings/shipping; no "N viewing", no countdown.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–15), `prompts/DESIGN_SYSTEM.md`; then `ProductDetails.js` fully, each component in scope, `STOREFRONT_UX_GUIDELINES.md` at the repo root (the principles these components enforce), `src/theme/tokens.js`.
2. Keep the derived-value block and the cart wiring as they are (move JSX around them, do not rewrite them).
3. Test with: a shoe rack (shelf variants with price changes), a plastic armchair (colour swatches), the Lobby Set (size), a mattress (size), a product without variants (an alna), an out-of-stock variant and a low-stock variant (seeded by Prompts 03/04).
4. Coordinate the sticky-bar `z-index` with the bottom nav: the bar must sit above the bottom nav and below drawers/modals.

## Acceptance criteria

- [ ] Primary surface matches the layout; gallery, variants, stepper, actions, trust, delivery and sticky bar restyled; shared breadcrumb in use.
- [ ] All derived values and behaviours unchanged (variant switch updates price/SKU/stock; quantity clamps; Buy now goes to checkout with the line in the cart; wishlist toggles; recently viewed written; legacy id redirects).
- [ ] Zero colour literals and no hardcoded z-index; both modes verified; no layout shift on image load.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: the six test products above; add to cart from the buy box and the sticky bar; Buy now; wishlist; keyboard through the gallery and the variant radiogroups; check the delivery facts against Admin → Shipping values.
2. Widths 360, 768, 1024, 1440.
3. Screen reader: title, price, variant groups, stock status, sticky bar hidden/visible.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (`getBySlug` has both branches in `api.js`).
6. Admin regression quick check.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 16 — Product details primary`: what changed, the sticky-bar z-index token, gallery fit decision, deviations, client confirmations (none expected).
