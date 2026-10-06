# Order confirmation and invoice

**Prompt 27 of 34**

## Depends on

Prompts 01 (tokens, `BrandLogo`), 02 (brand constants), 06, 26 (checkout navigates here), 05 (seeded orders).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. Logos: light `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo.png` (light backgrounds), white `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo-white.png` (dark backgrounds), via `BrandLogo`. The admin panel must not change.

## Objective

Restyle `/order-confirmation/:orderNumber` into a calm, reassuring confirmation with the same data, and replace the placeholder "Download Invoice" alert with a real print-ready invoice view (same order data, light logo on paper, print stylesheet), without changing how the order is loaded.

## Scope — files and areas to touch

- `src/pages/OrderConfirmation/OrderConfirmation.js` + `OrderConfirmation.module.css` (rewrite markup/styles; keep the load logic and derived values).
- New: `src/pages/OrderConfirmation/Invoice.js` + `Invoice.module.css` (a printable invoice section rendered on the same page, hidden until "Print invoice" is used, or always rendered below a hairline with `@media print` hiding everything else; your call, document it).

Do not touch: `api.js`, `OrderContext.js`, `db.json`, admin (`AdminOrders.js` has its own invoice HTML; leave it).

## What exists today (preserve; read `OrderConfirmation.js`, 485 lines)

- `useParams().orderNumber` → `apiService.orders.getByOrderNumber(orderNumber)`; `data = response?.data || response?.order || response`; states: loading, `fetchError` ("Couldn't Load Your Order" + Try Again + View Order History), not found ("may have been placed in a different session" + Go to Home + View Order History). No ownership guard (anyone with the number can view; keep as is and note it under open questions).
- Renders: success block (animated check, `h1 "Order Confirmed!"`, subtext by `isPaymentPending` (COD vs paid)); order-number banner with copy (`navigator.clipboard`) and "Placed on {formatDate}"; delivery banner: **estimated delivery = `createdAt + 5 days` hardcoded** (the order does not store the shipping method; replace the hardcoded number with an honest line: if `shippingStatus === "delivered"` show the delivered date; otherwise show "We'll email tracking details when your order ships" — no invented date; flag that persisting the chosen method would allow a real estimate); order summary (items with name/variant/qty/line total, Subtotal, Discount, Shipping, Tax, Total, Store credit, Amount paid when `storeCreditUsed > 0`); shipping address (`normalizeOrderAddress`); payment method card (method badge + `paymentStatusInfo` pill: paid / failed / refunded / partially_refunded / pending with COD wording); actions: "Track Order" → `/orders`, "Continue Shopping" → `/`, "Download Invoice" → `alert(...)` placeholder (replace).
- Field fallbacks `taxAmount ?? tax`, etc. keep. No confetti anywhere (`canvas-confetti` is unused; do not add it).

## Brand and design requirements

- **Success block**: paper, centred, `--sf-container-narrow`: a thin ink circle with a check drawn by a single stroke animation over `--sf-duration-slow` (static under reduced motion), eyebrow "Order confirmed", `h1` serif "Thank you, {firstName}." (from the shipping address first name; fallback "Thank you."), one sans line by payment state ("Your order is placed. Pay when it arrives." for COD / "Your payment was received and your order is being prepared."), the order number in a hairline chip with a copy button (`aria-label`, live "Copied"), "Placed on {date}" muted.
- **Facts row** (hairline-bounded, three columns → stacked on mobile): Delivery (the honest line above), Payment (method label + status pill as a `.sf-badge`), Help ("Questions? Contact us" → `/support`).
- **Summary card** (`.sf-card--hairline`): items as hairline rows (56px 4:5 thumb with fallback, name serif 15px, variant muted, qty, line total), totals block with serif Total, store-credit rows when present; shipping address block; actions: "Track order" primary → `/orders`, "Print invoice" ghost (opens the print dialog via `window.print()` after revealing the invoice), "Continue shopping" link → `/products`.
- **Invoice** (`Invoice.js`): a plain, print-first document: light logo (`BrandLogo variant="light"`, printed on paper regardless of theme), store name/address/email/phone from `constants.js` (`APP_NAME`, `SUPPORT_ADDRESS`, `SUPPORT_EMAIL`, `SUPPORT_PHONE`), "Invoice" title, order number, date, bill-to/ship-to from the order (`normalizeOrderAddress`), items table (`<table>`: item, variant, qty, unit price, line total), totals (subtotal, discount with code, shipping, tax with the rate from `settings.store.taxRate` if you fetch settings, else "Tax" only, total, store credit, amount paid), payment method/status, a muted note "This is a system-generated invoice" — do not print GSTIN or legal registration numbers (unknown; flag). `@media print`: hide header/footer/bottom nav/other sections (`body:not(.admin-area)` scoped rules in the module or in `storefront-base.css`), A4 margins, black text, no backgrounds.
- **States**: loading (skeleton of the success block + card), error panel + retry + "Order history", not-found panel; all in serif headings and calm copy.
- **Dark mode**: page follows tokens; the invoice forces paper/ink in print.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: same fetch and response normalisation, same derived values and fallbacks, same navigation targets; the invoice reads only the already-loaded order (plus optional `settings.get()`); no new endpoints.
2. **Tokens only**: zero literals (105 hex + 36 rgba + 8 gradients today); the print stylesheet may use `#000`/`#fff` equivalents through tokens that resolve to ink/paper (prefer tokens; if a pure black is required for print, document it as the only exception).
3. **Admin untouched.**
4. **Brand consistency**: light logo on the invoice, serif thank-you, hairlines, no gradients, no confetti.
5. **Responsive and accessible**: `h1`; copy button live feedback; table semantics in the invoice; print output readable in black and white.
6. **No fabricated trust signals**: no invented delivery date; no "your order is being packed right now" unless the status says so.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–26), `prompts/DESIGN_SYSTEM.md`; then `OrderConfirmation.js` fully, `src/utils/helpers.js` (`normalizeOrderAddress`, `formatDate`, `formatCurrency`), `src/utils/constants.js`, the seeded orders.
2. Test with a seeded order number (e.g. `ORD-MQB0JHUB-9KL6`, delivered, coupon) and with one placed through checkout (then restore `db.json`).
3. Print preview in Chrome: the invoice alone, one page for a short order.

## Acceptance criteria

- [ ] Confirmation matches the design with the same data; honest delivery line; copy works; actions work; invoice prints correctly with the light logo and the order data; placeholder alert gone.
- [ ] Zero colour literals; both modes verified; print preview clean.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: a COD order, a paid order, a store-credit order (seeded or placed then restored), a refunded order, an unknown order number (not found), a stopped server (error).
2. Widths 360, 768, 1024, 1440; print preview A4.
3. Keyboard/screen reader: copy feedback, table headers.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (`orders.getByOrderNumber` has both branches).
6. Admin regression quick check (the admin invoice unaffected).
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 27 — Order confirmation and invoice`: what changed, the invoice approach, the delivery-line decision, deviations, client confirmations (invoice legal details: GSTIN, registered address; whether the shipping method should be stored on orders).
