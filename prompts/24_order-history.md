# Order history and order cards

**Prompt 24 of 34**

## Depends on

Prompts 21 (account shell), 05 (reseeded orders, reviews), 06 (SweetAlert theme).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. Order history (`/orders`) is the customer's hub for tracking, cancelling, returning and reviewing; the review flow is purchase-gated here (`ReviewModal`) and moderated in the admin. The admin panel must not change.

## Objective

Redesign `/orders` inside the account shell: refined order cards with an honest status, tracking panel, expandable details, and the cancel / return-exchange / review actions, plus the restyled `ReviewModal`, with every eligibility rule, API call and status derivation untouched.

## Scope — files and areas to touch

- `src/pages/OrderHistory/OrderHistory.js` + `OrderHistory.module.css` (rewrite markup/styles; keep logic).
- `src/components/ReviewModal/ReviewModal.js` + `ReviewModal.module.css` (restyle; keep props `open`, `onClose`, `product`, `existing`, `onSubmit`, `isDarkMode`).
- Mount `AccountLayout`/`AccountNav` (Prompt 21) with `active="orders"`.

Do not touch: `api.js` (cancel cascade lives there), `OrderContext.js`, `Support.js` beyond reading (Prompt 28), `db.json`, admin.

## What exists today (preserve; read `OrderHistory.js`, 857 lines)

- Auth: while `authLoading` show the loader; guest → "Sign In Required" panel with "Log In" → `openAuthModal("login")`; no redirect.
- Data: `Promise.all([orders.getByUserId(user.id), reviews.getMine(user.id).catch(() => [])])`; sort `createdAt` desc; error state with retry; `ORDERS_PER_PAGE = 5`.
- Status derivation `deriveOrderStatus` (returned / cancelled / delivered / shipped / processing from the three status fields, legacy `status`) and `STATUS_CONFIG` labels; filter tabs All / Processing / Shipped / Delivered / Cancelled compare the derived label (so "Returned" shows only under All: keep, or add a "Returned" tab: allowed, document); search by order number; pagination reset/clamp.
- Eligibility: `isReturnEligible` (delivered within `RETURN_WINDOW_DAYS = 7` of `deliveredAt || updatedAt`), `isCancellable` (derived `processing`), `isReviewable` (derived `delivered`), `reviewFor(productId)`.
- Actions: "Track Order" toggles the tracking panel (tracking number + copy, carrier link `trackingUrl`, status, refund row keyed on `refundStatus`: completed / processing / failed copy); "View Details"; "Return / Exchange" → `navigate("/support")` (no return form exists; `apiService.returns.create` is unused by the storefront; keep this navigation, optionally with `?order=<orderNumber>&category=returns` so Prompt 28's support form can prefill: do it and document it); "Cancel Order" → Swal confirm with refund sentence by `paymentStatus` → `apiService.orders.cancel(order.id)` → merge the returned order; error Swal.
- Details: items (image, name, variant, qty, line total, per-item review control with `REVIEW_STATUS` chip pending/approved/rejected and "Rate & Review"/"Edit Review" → `openReviewModal`), shipping address (`normalizeOrderAddress`), payment (method + status), order summary (Subtotal, Discount, Shipping, Tax, Total — add "Store credit" and "Amount paid" rows when `storeCreditUsed > 0`, mirroring the confirmation page).
- `ReviewModal`: star `radiogroup` (required), Title ≤ 80, Review ≤ 1000, edit note ("Editing resubmits your review for approval…"), Cancel / Submit / Update; `handleSubmitReview` → `apiService.reviews.submit({...})` → refresh `reviews.getMine` → Swal success toast.
- 203 hex + 77 rgba + 8 gradients; copy buttons without `aria-label`; collapsibles without `aria-expanded`.

## Brand and design requirements

- **Shell**: `AccountLayout` with `h1` from the shell; section eyebrow "Orders"; toolbar: search `.sf-input` with a visible label "Search by order number" (visually hidden label acceptable, `type="search"`), filter `.sf-chip`s (`aria-pressed`), refresh as a ghost icon button with `aria-label="Refresh orders"`.
- **Order card** (`.sf-card--hairline`, 24px padding, hairline-separated blocks): header row: order number (sans 14px medium, tracked) + copy button (`aria-label`), placed-on date (muted), status as an eyebrow `.sf-badge` (ink for processing, info for shipped, success for delivered, muted for cancelled/returned; never red for a normal cancel); body: thumbnails row (56px 4:5, fallback via `onImageError`, "+N more"), total in serif 20px; actions row as text/ghost buttons: "Track", "Details" (`aria-expanded` + `aria-controls`), "Return or exchange" (eligible only), "Cancel order" (eligible only, error-text token).
- **Tracking panel** (collapsible, sand): tracking number + copy, "Open carrier page" link (new tab, `rel`), status, refund row copy kept; a simple 4-step progress line (Placed → Processing → Shipped → Delivered) derived from the same status fields — only states the data implies; "Cancelled/Returned" collapses the line into a single note.
- **Details panel**: items as hairline rows with the review control (chip + button); address block; payment block; summary block with the store-credit rows.
- **Pagination**: as the listing (hairline numbers, `aria-current`).
- **States**: skeleton cards (3), error panel + retry, empty ("No orders yet." + "Browse furniture"), no-match ("No orders match." + clear), guest panel (serif "Sign in to see your orders." + primary "Sign in").
- **ReviewModal**: dialog with `aria-labelledby` the heading, paper surface, hairline, product row (44px thumb, name), star input as 32px targets with `aria-label`s, `.sf-field` title/body with counters ("0/80"), edit note in a `.sf-panel`, inline error for the missing rating, Escape closes, focus moves to the first star on open and returns on close, body scroll lock; submit primary / cancel ghost.
- **Motion**: panels expand with height auto over `--sf-duration` (opacity only under reduced motion).

## Functional guardrails

1. **Preserve functionality and the data/API contract**: derivation, eligibility, API calls, confirm texts (reworded only for voice without changing the facts), pagination constants, review submission payload; the support navigation may gain query params (additive); no returns API call added (document that returns are handled through support, as today).
2. **Tokens only**: zero literals; the Swal `confirmButtonColor: "#d32f2f"` becomes the danger `customClass` from Prompt 22 (add it to `storefront-base.css` if it does not exist yet).
3. **Admin untouched** (the cancel cascade in `api.js` remains the same code path the admin uses).
4. **Brand consistency**: hairline cards, serif totals, calm badges, no gradient titles/tabs.
5. **Responsive and accessible**: landmarks, `aria-expanded/controls` on collapsibles, labelled buttons, live region for copy feedback, dialog semantics in the review modal, 44px targets; mobile stacks actions full width.
6. **No fabricated trust signals**: the progress line never shows a step the data does not support; refund timing copy stays generic as today ("typically 5–7 business days") and is flagged for confirmation.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–23), `prompts/DESIGN_SYSTEM.md`; then `OrderHistory.js` fully, `ReviewModal.js`, `api.js` `orders.cancel` and `reviews.submit`, `src/utils/helpers.js` (`normalizeOrderAddress`, `formatDate`, `formatCurrency`), the seeded orders for `mail4bappidas@gmail.com` (which are cancellable/returnable/reviewable per Prompt 05's build log).
2. Move the rule functions unchanged; rebuild the JSX around them.
3. Test cancel on a processing order (confirm the cascade: Admin → Orders shows cancelled, payment voided or refund pending), then restore `db.json` from git and document it.

## Acceptance criteria

- [ ] Page inside the account shell with the design above; all actions and states work; review modal restyled and accessible; store-credit rows in the summary.
- [ ] Derivation/eligibility/API behaviour identical (spot-check three orders of different statuses).
- [ ] Zero colour literals; both modes verified.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode as `mail4bappidas@gmail.com` / `Bappi@12345`: filter, search, track, expand, review a delivered item (then see "Pending" chip; approve in Admin → Reviews; see "Approved"), cancel a processing order (then restore data); as a guest visit `/orders`.
2. Widths 360, 768, 1024, 1440.
3. Keyboard/screen reader: chips, collapsibles, modal.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance.
6. Admin regression: Admin → Orders/Reviews reflect the actions.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 24 — Order history`: what changed, the support deep-link params, the "Returned" tab decision, deviations, client confirmations (refund timing copy, return window of 7 days).
