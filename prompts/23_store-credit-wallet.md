# Store-credit wallet

**Prompt 23 of 34**

## Depends on

Prompt 21 (account shell), Prompt 05 (consistent wallet ledger data).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. Store credit is a ledger (`walletTransactions`, the source of truth) read through `apiService.wallet.getBalance(userId)` and `apiService.wallet.getTransactions(userId)`; it is applied at checkout. The admin panel must not change.

## Objective

Redesign the Store Credit tab of `/profile` into a calm balance card and a clear ledger, keeping the data calls, the lazy load on tab open, and the balance/transaction semantics intact.

## Scope — files and areas to touch

- `src/pages/Profile/Profile.js` + `Profile.module.css`: the `wallet` section only (its render branch and the load effect's presentation).

Do not touch: other sections (Prompts 21/22), `Checkout.js` (Prompt 26 handles applying credit), `api.js`, `db.json`, admin.

## What exists today (preserve)

- Loaded when the tab opens: `Promise.all([wallet.getBalance(user.id), wallet.getTransactions(user.id)])` (transactions newest first from the API); spinner; empty "No store-credit transactions yet"; rows: ± badge by `type` (`credit`/`debit`), `reason` (fallback "Store credit added/used"), `formatDate(createdAt)`, `orderNumber` button → `navigate("/orders")`, ± amount, "Bal: ₹balanceAfter". Balance card with a gradient and the hint "Apply your store credit at checkout toward any order."
- Ledger row fields: `type, amount, reason, orderId, orderNumber, refundId, refundNumber, balanceBefore, balanceAfter, createdAt`.

## Brand and design requirements

- **Balance card**: navy surface (white logo mark optional, not required), eyebrow "Store credit", the balance in the display serif at display-md with `formatCurrency`, the hint line in muted off-white, and a quiet `.sf-btn--paper-ghost` "Shop now" → `/products`; no gradient; in dark mode it stays navy.
- **How it works** (one hairline-bounded line of three facts, honest and static): "Credit is added when a refund is issued to store credit", "Apply it at checkout on any order", "It never expires" — include the last only if the business confirms it; until then omit it and flag it. Keep it to two facts.
- **Ledger**: `h2` "Transactions" (serif display-sm); a hairline table on desktop (`<table>`: Date, Description (reason + order link + refund number when present), Amount, Balance) and stacked rows on mobile (`<ul>` with the same information, grid of label/value); credits in the success token with a leading "+", debits in ink with "−"; the order link `.sf-btn--link` → `/orders` (keep; optionally `/orders?order=<orderNumber>` if Prompt 24 adds that deep link later: do not add it here); dates via `formatDate`; amounts via `formatCurrency`; a page size is not needed (the ledger is short) but cap at 50 rows with a "Show more" button if longer.
- **States**: skeleton rows while loading; empty state (serif "No transactions yet." + the single fact line); error state (new): `.sf-panel` "We couldn't load your store credit." + retry re-running the same two calls.
- **Motion**: `Reveal` on the card; none on rows.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: same two API calls, same lazy-load trigger, same fields; no new endpoints; no client-side recomputation of the balance (the API's balance is the truth; do not sum rows to display a balance).
2. **Tokens only**: zero literals in the wallet styles (the gradient card goes).
3. **Admin untouched.**
4. **Brand consistency**: navy card, serif balance, hairline ledger.
5. **Responsive and accessible**: table semantics on desktop with `scope="col"` headers; list on mobile; amounts have `aria-label` ("Credit of ₹4,918"); 44px link targets.
6. **No fabricated trust signals**: no expiry claims unless confirmed; no "earn credit" promises.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–22), `prompts/DESIGN_SYSTEM.md`; then the wallet section in `Profile.js`, the `wallet` namespace in `api.js`, and the `walletTransactions` rows in `db.json`.
2. Test with `mail4bappidas@gmail.com` / `Bappi@12345` (seeded ledger and balance) and `user@example.com` (empty).
3. The balance shown here must equal what checkout offers (Prompt 26) — both read `wallet.getBalance`.

## Acceptance criteria

- [ ] Balance card, facts line, ledger (table/list), states match the design; data and triggers unchanged; the balance equals the seeded ledger's final `balanceAfter`.
- [ ] Zero colour literals; both modes verified.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: `/profile?tab=wallet` for both accounts; place a store-credit order via checkout as the seeded account (then restore `db.json` from git, documenting it) to see a debit row appear.
2. Widths 360, 768, 1024, 1440.
3. Keyboard/screen reader: table headers, link targets, amount labels.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (`wallet.*` normalise both branches).
6. Admin regression quick check (Admin → Users store credit value unchanged).
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 23 — Store-credit wallet`: what changed, deviations, client confirmations (credit expiry policy, wording).
