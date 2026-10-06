# Cart drawer

**Prompt 18 of 34**

## Depends on

Prompts 01–07, 13 (`PriceBlock`), 05 (shipping data).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. The cart has no page of its own: the `CartDrawer` (opened from the header, the bottom nav never, and automatically by `addToCart`) is the cart, and Checkout step 0 is the full review. The admin panel must not change.

## Objective

Make the cart drawer a premium sticky side panel: a display-only free-delivery progress indicator that reads the live shipping rules, trust cues, refined line items with quantity control, subtotal and a clear checkout CTA, with all cart logic and money math untouched.

## Scope — files and areas to touch

- `src/components/CartDrawer/CartDrawer.js` + `CartDrawer.module.css` (rewrite; keep props `open`, `onClose`).

Do not touch: `src/context/CartContext.js` (all cart logic), `Header.js` (mounts it with `open={isCartOpen}`), `Checkout.js` (Prompt 26), `src/utils/constants.js` (`FREE_SHIPPING_THRESHOLD` stays for the header), `api.js`, `db.json`, admin.

## What exists today (preserve; read `CartDrawer.js`, 408 lines)

- From `useCart`: `cartItems`, `updateQuantity`, `removeFromCart`, `getCartTotal`, `getCartItemCount`; `useTheme().isDarkMode`.
- Body scroll lock while open; backdrop click closes; no `role="dialog"`, no Escape, no focus management (add all three).
- Free-shipping maths uses the constant `FREE_SHIPPING_THRESHOLD` and a local `FLAT_SHIPPING = 99` ("mirrors db.json Standard flatRate", which Prompt 05 changed to ₹499, so the local constant is already wrong): `shippingCost = cartTotal >= threshold ? 0 : flat`, `amountToFreeShipping`, `shippingProgress`; copy "Add ₹X more for free shipping" / "✓ You qualify for free shipping!".
- Line item: image (→ `productPath(item)`, `PLACEHOLDER_IMG` + `onImageError`), name truncated to 45 (→ product), `variantName` chip, unit price, struck `comparePrice` when higher, stepper (− disabled at 1; + disabled when `item.stock` is a number and `quantity >= stock`), line total, remove. Summary: Subtotal, "Estimated Shipping". CTAs: "View Cart" and "Checkout" both → `/checkout` (there is no `/cart` route). Empty state → `/`.
- Quantity changes go through `updateQuantity` (the context clamps to stock); toasts come from the context.

## Brand and design requirements

- **Panel**: right-side, width `min(440px, 100vw)`, paper surface (dark base in dark mode), hairline left edge, slides in `--sf-duration-slow`/`--sf-ease-out` (opacity only under reduced motion), backdrop = overlay token (no blur). `role="dialog" aria-modal="true" aria-labelledby` the title; focus moves to the close button on open, Escape closes, focus returns to the opener (store `document.activeElement` when `open` flips true), focus trap. Body scroll lock kept.
- **Header**: serif title "Your cart" (display-sm) + count ("3 items", muted), 44px close button.
- **Free-delivery progress** (display-only): read the active shipping methods once when the drawer first opens (`apiService.shipping.getMethods()`, cached in state, `.catch`), derive `threshold = min positive freeAbove` and `standardRate = flatRate of the method carrying that threshold` (or the lowest flat rate). Then: when `threshold` exists, a 2px sand track with an ink fill (`width = min(100, subtotal/threshold*100)%`, animated over `--sf-duration-slow`) and the line "Add ₹X more for free delivery" or "Free delivery unlocked" (success token, no emoji); when no method has a threshold, render nothing (do not invent one); until the fetch resolves, render nothing. Keep an `aria-live="polite"` on the line so screen readers hear the change.
- **Line items**: hairline-separated rows: 72×90 thumbnail (4:5, `object-fit: cover`, lazy, fallback), name (serif 15px, 2-line clamp, link), variant name (muted 12px), `PriceBlock size="sm"` (unit price + struck compare), stepper (hairline pill 36px, buttons `aria-label`, disabled rules kept, `aria-live` value), line total (sans 15px medium), remove as a text button "Remove" (44px tap area) instead of an icon-only trash; removing animates the row's height to 0 (`layout` + exit; opacity only under reduced motion).
- **Trust cues** (one quiet row under the items, eyebrow style, outline icons): "Secure payment", "Cash on Delivery" (only when `settings.payment.codEnabled`; fetch `apiService.settings.get()` alongside shipping, cached), "Easy returns · N days" (from `STOREFRONT_CONFIG.returnsWindowDays`, hidden at 0). Nothing else.
- **Footer** (sticky at the panel bottom, safe-area padding): Subtotal (serif 20px), "Delivery" line showing `standardRate` as "₹X · free above ₹Y" or "Free" when unlocked, or "Calculated at checkout" when shipping data is missing; note "Taxes calculated at checkout"; `Checkout` `.sf-btn--primary --lg --block` → `/checkout`; "Continue shopping" `.sf-btn--link` → `onClose()`. Drop the duplicate "View Cart" button (both went to `/checkout`); document it.
- **Empty state**: serif "Your cart is empty." + line + "Browse furniture" ghost button → `/products` (keep `/` acceptable; `/products` is the better target).
- **Mobile** (≤ 480px): full width, same structure; the footer stays visible above the keyboard-free area.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: all mutations through `useCart` (`updateQuantity`, `removeFromCart`); totals from `getCartTotal`; counts from `getCartItemCount`; navigation targets unchanged except the removed duplicate button; shipping/settings read-only through `apiService` (both branches already normalised); no new endpoints; the drawer never computes taxes or applies coupons (checkout does).
2. **Tokens only**: zero colour literals (77 hex + 45 rgba today), no gradients (the progress fill and the CTA are flat ink).
3. **Admin untouched.**
4. **Brand consistency**: serif title/subtotal, hairlines, paper panel, restrained copy without emoji.
5. **Responsive and accessible**: dialog semantics, focus trap and return, Escape, labelled controls, live regions, 44px targets, reduced motion.
6. **No fabricated trust signals**: threshold and rates only from live shipping methods; trust row only from settings/config; no "X people have this in their cart".
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–17), `prompts/DESIGN_SYSTEM.md`; then `CartDrawer.js`, `CartDrawer.module.css`, `src/context/CartContext.js` (the value shape and `addToCart` opening the drawer), `src/theme/tokens.js` (`resolveTrustBadgeDetail`), `Checkout.js` lines computing `shippingCost` (to mirror the same free-above rule for the display).
2. Reuse `resolveTrustBadgeDetail("freeShipping", { shipping })` for the threshold so the drawer, hero strip, footer and product page agree.
3. Focus trap: reuse the helper from Prompt 09 (`SidebarMenu`/`BottomDrawer`) if one was extracted into `src/components/ui/`; otherwise add `src/components/ui/useFocusTrap.js` and document it.

## Acceptance criteria

- [ ] Drawer matches the design; progress indicator reads live shipping rules and hides when none; trust row data-driven; line items, stepper, remove, subtotal, delivery line and CTA work; empty state.
- [ ] Dialog semantics, Escape, focus management; mobile full width.
- [ ] Zero colour literals; both modes verified; `addToCart` from any surface still opens it.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: add items from a card, a product page and Buy now (drawer must not flash); change quantities up to stock; remove; empty; cross the threshold and watch the progress; set the Standard method's `freeAbove` to `null` in Admin → Shipping and confirm the indicator disappears (restore it).
2. Widths 360, 768, 1024, 1440.
3. Keyboard/screen reader: open from the header, Escape, focus return; live region announcements.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance.
6. Admin regression quick check.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 18 — Cart drawer`: what changed, the live-threshold rule and the removal of the local `FLAT_SHIPPING` constant, the dropped duplicate button, the focus-trap helper, deviations, client confirmations (free-delivery threshold).
