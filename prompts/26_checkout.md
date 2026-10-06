# Checkout

**Prompt 26 of 34**

## Depends on

Prompts 01–07, 18 (cart drawer threshold rule), 20 (auth modal), 22 (saved-address shape), 23 (wallet), 05 (shipping, settings, coupons).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. Checkout is one page with four steps (Cart → Shipping → Payment → Review) and an order summary; money math, store-credit application, coupon validation and the order payload live in `src/pages/Checkout/Checkout.js` and must not change. The admin panel must not change.

## Objective

Restyle checkout into a calm, trustworthy flow: a clear stepper, low-friction forms with labels and autocomplete, visible price/delivery/returns facts next to the action, honest trust cues, considered states (including an order-failure message that the page lacks today), with every calculation, rule and payload byte-identical.

## Scope — files and areas to touch

- `src/pages/Checkout/Checkout.js` + `Checkout.module.css` (rewrite markup/styles; keep every function listed under "Preserve" unchanged in logic).

Do not touch: `OrderContext.js`, `CartContext.js`, `api.js`, `db.json`, admin.

## What exists today (preserve; read `Checkout.js`, 751 lines, in full)

- `STEPS = ["Cart", "Shipping", "Payment", "Review"]`, `step` 0–3; empty-cart state; breadcrumb; step indicator.
- Step 0 Cart: rows with qty ± (`updateQuantity`) and remove (`removeFromCart`); coupon block (`coupons.validate(code.trim(), subtotal)` → coupon or error message; applied chip shows the discount and "capped at ₹Y" when `capped`; Remove); guest prompt → `openAuthModal("login")`; `handleNext` at step 0 opens the modal for guests.
- Step 1 Shipping: saved-address radio cards from `user.addresses` + "Add new address" clearing the selection; new-address form (first/last/phone/line1/line2/city/state/postal/country "India" read-only); `validateAddress` (required/trim only: **no phone or PIN pattern; keep that behaviour unless you add validation that only tightens with the existing `isValidPhone` helper and a 6-digit PIN check — allowed, document**); shipping methods radio list (`shipping.getMethods()` filtered `isActive !== false`, first preselected, "FREE" or rate); `shippingError`.
- Step 2 Payment: store-credit panel when `walletBalance > 0` (checkbox "Apply", amount input, "Use max", rows) and `fullyCoveredNote`; `PAYMENT_OPTIONS` card / upi / net_banking / wallet / cod (COD disabled + hint when `!codAvailable`; the hint prints `up to ₹0.00` when `codMaxOrder` is null: fix the copy to omit the cap when null); card form (uncontrolled, unvalidated, never submitted: keep as a visual placeholder, clearly labelled; there is no gateway in mock mode), UPI id, net-banking bank select (six hardcoded banks), COD info.
- Step 3 Review: items, Deliver to / Shipping method / Payment blocks with Edit buttons, store-credit / COD / "You will be charged ₹X" copy.
- Nav buttons: Back; primary label rules ("Processing…", "Place Order" / "Place Order – ₹amountPayable", "Login to Continue", "Continue"); disabled rules.
- Summary sidebar: first 3 lines + "+N more", Subtotal, Discount (code), Shipping, "Tax (X% GST)", Total, Store credit, Amount payable; hardcoded emoji trust badges (replace with data-backed cues).
- Preserve exactly: `couponDiscountFor`, `subtotal`, `shippingCost`, `taxRatePct`/`taxAmount`, `total`, `maxApplicableCredit`/`storeCreditApplied`/`amountPayable`/`fullyCovered`, `codEnabled`/`codMinOrder`/`codMaxOrder`/`codAvailable`, the coupon auto-removal effect, COD→card fallback effect, credit clamp effect, prefill effect, scroll-to-top per step, the order payload (items with `name + " - variantName"`, addresses, amounts, `storeCreditUsed`, `amountPayable`, `paymentMethod` incl. `"store_credit"` when fully covered, `paymentStatus` rules, statuses), post-order `clearCart({ silent: true })` + `navigate(/order-confirmation/${orderNumber || id})`. Order failure currently only logs to console: add a visible `role="alert"` panel ("We couldn't place your order. Nothing has been charged. Please try again.") without changing the flow.
- Effects' data: `shipping.getMethods()`, `settings.get()`, `wallet.getBalance(user.id)`.

## Brand and design requirements

- **Page frame**: `--sf-container`; minimal header (breadcrumb Home › Checkout, `h1` serif "Checkout" — the page has no `h1` today); stepper as four hairline segments with numerals (serif) and labels (eyebrow), completed = ink, current = accent underline, `aria-current="step"`, labels visible on mobile as a compact "Step 2 of 4 · Shipping" line.
- **Layout**: desktop 7/5 columns (main / summary), summary sticky at `top: calc(var(--sf-header-height) + 24px)`; ≤ 900px single column with the summary collapsed into a `details`-style "Order summary · ₹X" toggle above the main column (open on the Review step).
- **Forms**: every field `.sf-field` with a visible label, `id/htmlFor`, `autocomplete` (`given-name`, `family-name`, `tel` + `inputmode="tel"`, `address-line1`, `address-line2`, `address-level2`, `address-level1`, `postal-code` + `inputmode="numeric"`, `country-name`; card fields `cc-number`/`cc-exp`/`cc-csc`/`cc-name` with `inputmode="numeric"` where numeric), inline errors with `aria-invalid`/`aria-describedby`, focus to the first invalid field on Continue, values preserved. Saved addresses as hairline radio cards (`.sf-radio` + label, default first, 44px). Shipping methods as hairline radio rows: name, window ("7–10 business days"), cost right-aligned ("Free" in success when free-above applies, else `formatCurrency`), and the free-above note muted.
- **Payment**: options as hairline radio rows with a one-line description; COD row shows its true condition ("Available for orders up to ₹X" only when `codMaxOrder` exists; "Not available for this amount" when disabled); the store-credit panel as a sand `.sf-panel` with the balance (serif), the apply switch/checkbox and amount field (`inputmode="decimal"`), "Use max" link; card/UPI/bank sub-forms as today, restyled, with a muted note "Payment details are collected securely at the gateway" only if a gateway is configured — in mock mode keep the fields but no claims; the six bank names stay (they are a select, not a claim).
- **Review step**: three hairline blocks with "Edit" text buttons; items list; a final facts line next to the Place order button: amount payable (serif 20px), delivery window from the selected method, returns window from `STOREFRONT_CONFIG.returnsWindowDays`, COD/secure-payment cue by selected method.
- **Trust cues** (summary bottom, eyebrow style, outline icons): "Secure payment", "Cash on Delivery available" (only when `codEnabled`), "Easy returns · N days" (from config), "Delivery ₹X · free above ₹Y" (from the selected/standard method). No emoji.
- **Buttons**: primary "Continue" / "Place order · ₹X" `.sf-btn--primary --lg`; Back `.sf-btn--link`; guest primary "Sign in to continue".
- **States**: empty cart (serif "Your cart is empty." + "Browse furniture"); loading shipping ("Loading delivery options…" skeleton rows); processing (button label + `aria-busy`); order failure alert (new).
- **Motion**: step panels crossfade `--sf-duration`; focus moves to the step heading on step change (announce progress); opacity only under reduced motion.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: all math, rules, effects, payload and navigation unchanged (copy the functions verbatim; diff them at the end to prove it); API calls unchanged; added validation only via existing helpers and documented; the failure alert is additive.
2. **Tokens only**: zero literals (164 hex + 4 rgba + 1 gradient today); no `placehold.co` URLs (use `PLACEHOLDER_IMG` + `onImageError`).
3. **Admin untouched.**
4. **Brand consistency**: hairline stepper and rows, serif amounts, calm copy, no emoji.
5. **Responsive and accessible**: `h1`; stepper `aria-current`; fieldsets/legends for radio groups; labels/autocomplete/inputmode; error focus; live alerts; 44px targets; sticky summary only on desktop.
6. **No fabricated trust signals**: cues only from settings/shipping/config; no "secured by X" badges unless configured; no fake timers ("complete within 10 minutes").
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–25), `prompts/DESIGN_SYSTEM.md`; then `Checkout.js` fully and `Checkout.module.css`, `OrderContext.js`, `api.js` `coupons.validate`, `orders.create` (mock side effects), `src/theme/tokens.js`.
2. Work in this order: extract the pure functions and effects into the top of the file untouched; rebuild the JSX per step; restyle; then diff the logic against `git show main:src/pages/Checkout/Checkout.js`.
3. Full test matrix in JSON Server mode as `mail4bappidas@gmail.com` (has store credit): prepaid card order; COD order; coupon `WELCOME500` above and below the minimum (auto-removal); partial and full store-credit orders (fully covered → `paymentMethod: "store_credit"`, `paymentStatus: "paid"`); guest at step 0 → modal. After each placed order inspect `db.json` (`orders`, `payments`, `coupons.usedCount`, `walletTransactions`) and then restore `db.json` from git (`git checkout -- db.json`), documenting it.

## Acceptance criteria

- [ ] Checkout matches the design; stepper, forms, methods, payment, review, summary and trust cues as specified; order-failure alert present.
- [ ] Money math, rules, payload and side effects identical (diff + the test matrix); COD hint copy fixed.
- [ ] Zero colour literals; both modes verified; sticky summary correct.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. The test matrix above, plus an invalid address submission (focus to the first error) and a stopped JSON Server at Place order (failure alert).
2. Widths 360, 768, 900, 1024, 1440.
3. Keyboard/screen reader: stepper announcements, radio groups, errors, alerts.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (`coupons.validate` and `orders.create` have both branches; do not read `response.data[0]` anywhere).
6. Admin regression: Admin → Orders/Payments/Coupons reflect the test orders before you restore the data.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 26 — Checkout`: what changed, the validation additions (if any), the failure alert, deviations, client confirmations (payment methods offered, COD limits, GST rate, bank list).
