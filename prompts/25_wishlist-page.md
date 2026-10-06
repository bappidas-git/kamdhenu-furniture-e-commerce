# Wishlist page

**Prompt 25 of 34**

## Depends on

Prompts 13 (product card), 21 (account shell), 20 (auth modal).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. The wishlist works for guests on the device (`localStorage["wishlist"]`) and is merged into the account on login by `WishlistContext` (guest-only rows are uploaded through `apiService.wishlist.add`). The admin panel must not change.

## Objective

Redesign `/wishlist` as a quiet saved-items page inside the account shell (with the guest banner when signed out), using the storefront product card plus the wishlist-specific actions, keeping sorting, move-to-cart, remove, clear and the device-to-account sync intact.

## Scope — files and areas to touch

- `src/pages/Wishlist/Wishlist.js` + `Wishlist.module.css` (rewrite markup/styles; keep logic).
- Mount `AccountLayout`/`AccountNav` with `active="wishlist"` for logged-in users; for guests render the page header with the guest banner and no account rail (the rail would show no identity).

Do not touch: `WishlistContext.js`, `CartContext.js`, `ProductCard` internals (Prompt 13), `api.js`, `db.json`, admin.

## What exists today (preserve; read `Wishlist.js`, 384 lines)

- `useWishlist()` → `wishlistItems, isLoading, removeFromWishlist, clearWishlist`; `useCart().addToCart`; `useAuth()` → `user, isLoading, openAuthModal`.
- Guest banner "Your wishlist is saved on this device. Log in to sync it across devices." + "Log In" → `openAuthModal("login")`.
- States: loading (8 skeletons), empty (`h1` + illustration + "Start Shopping" → `/products`), populated.
- Header: `h1 "My Wishlist (N items)"`, sort `<select id="wishlist-sort">` with label (`SORT_OPTIONS`: Recently Added, Oldest First, Price Low→High, Price High→Low, Highest Rated; `getSortedItems` by `addedAt`, `getProductMinPrice().sellingPrice`, `rating`), "Clear All" → `clearWishlist()` (Swal confirm in the context).
- Card: image (no `onError`), `-N%`, remove × (300ms dim via `removingId`), brand, name, stars when `rating > 0` with count, price, stock status via `getDefaultCartVariant` (unknown → "In Stock"), "Add to Cart" → `addToCart(buildCartItem({ ...item, id: item.productId }), 1)`, "Move to Cart" → add then `removeFromWishlist(productId, { silent: true })` after 300ms; both disabled when out of stock; card click → `productPath(item)`.
- Wishlist rows are product snapshots (`productId, slug, name, image, brand, price, comparePrice, rating, totalReviews, shortDescription, variants, stock, trending, hot, addedAt`), so `ProductCard` can render them if given `{ ...item, id: item.productId, images: [item.image] }`.

## Brand and design requirements

- **Header**: eyebrow "Saved", `h1` "Your wishlist" (serif) + count (muted), sort `.sf-select` with its label, "Clear all" `.sf-btn--link` (error-text token) with `aria-label`.
- **Guest banner** (`.sf-panel` sand, hairline): serif line "Saved on this device." + sans "Sign in to keep your wishlist across devices." + "Sign in" primary (opens the modal); nothing else.
- **Grid**: 3 columns desktop, 2 tablet/mobile, 24/16px gaps; each item = storefront `ProductCard` (wishlist heart hidden via omitting `onToggleWishlist`; `onAddToCart` provided so the card's quick-add adds the cheapest variant exactly as the page's "Add to cart" did) wrapped with a wishlist action row beneath: "Move to cart" ghost (adds then removes silently, keep the 300ms sequence) and "Remove" text button (`aria-label="Remove <name> from wishlist"`), both 44px; out-of-stock disables the add/move actions and the card shows "Sold out". Stock status text under the card from the same `getDefaultCartVariant` rule.
- **Motion**: `AnimatePresence popLayout` kept for removal (opacity only under reduced motion).
- **States**: skeleton grid (`ProductCardSkeleton`), empty (serif "Nothing saved yet." + "Browse furniture" primary → `/products`), and the guest banner above whichever state applies.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: sorting, add/move/remove/clear behaviours and their context calls, guest persistence and login merge (untouched in the context), navigation; the card's quick-add payload equals the page's previous `buildCartItem` payload (verify the line id `productId-variantId`).
2. **Tokens only**: zero literals (90 hex + 16 rgba + 7 gradients today); image fallbacks handled by the card.
3. **Admin untouched.**
4. **Brand consistency**: serif heading, hairline panel, cards consistent with the listing.
5. **Responsive and accessible**: `h1`; sort labelled; buttons labelled; 44px targets; keyboard reachable cards (the card is a link, not a clickable div).
6. **No fabricated trust signals**: no "N people saved this"; stock only from data.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–24), `prompts/DESIGN_SYSTEM.md`; then `Wishlist.js`, `WishlistContext.js` (shapes, `removeFromWishlist` options), `ProductCard.js`, `src/utils/helpers.js`.
2. Build the card product object once per row (`useMemo`) and pass it to `ProductCard`; keep `getSortedItems` unchanged.
3. Test the sync: as a guest save two items, log in as `jane@example.com` / `password123` (no server rows) and confirm both upload (check `db.json` `wishlist`), log out (list clears locally), log in again (restored). Remove the test rows from `db.json` afterwards or note them.

## Acceptance criteria

- [ ] Page matches the design in guest and logged-in states; sort, add, move, remove, clear work; sync verified.
- [ ] Zero colour literals; both modes verified.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: the sync scenario above plus out-of-stock handling (temporarily set a saved product's stock to 0 in `db.json`, reload, restore).
2. Widths 360, 768, 1024, 1440.
3. Keyboard/screen reader: cards, action buttons, sort.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (`wishlist.*` normalise both branches).
6. Admin regression quick check.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 25 — Wishlist page`: what changed, the card adoption, deviations, client confirmations (none expected).
