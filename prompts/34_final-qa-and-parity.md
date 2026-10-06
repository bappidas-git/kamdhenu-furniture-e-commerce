# Final QA and parity

**Prompt 34 of 34**

## Depends on

Prompts 01–33 (everything).

## Context

A & S Urbanseat's storefront (Create React App; dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`; tokens in `prompts/DESIGN_SYSTEM.md`) has been redesigned into a premium, editorial, warm-minimalist boutique across 33 prompts, with the admin panel untouched except for its logo. This is the last session: it leaves zero known issues.

## Objective

Run a complete storefront walkthrough and parity check: brand consistency on every surface in light and dark mode, every existing feature working API-driven, no reliance on JSON Server-only shapes, performance targets held, a clean console, the data validator passing, the admin pixel-identical apart from the logo, and a written QA checklist. Fix every issue found, re-run, and finish with zero open items.

## Scope — files and areas to touch

- Any storefront file needed to fix a defect found in this pass (presentation/UX fixes only; if a defect requires a logic change, the fix must keep the API contract and be documented).
- New: `prompts/QA_CHECKLIST.md` (the executed checklist with results and evidence).
- `prompts/00_INDEX.md`: update the "Status" line and the open-questions list with anything resolved or newly found.
- `prompts/BUILD_LOG.md`: final entry.

Do not touch: `src/pages/Admin/*`, `src/components/AdminLayout/*`, `src/theme/adminTheme.js` (Prompt 33 already changed the logo lines; nothing else may change), `db.json` schema.

## Brand and design requirements

The checklist to execute (write results into `prompts/QA_CHECKLIST.md`):

### A. Environment

- `npm ci`; `npm run server` + `npm start` (JSON Server mode); `node scripts/validate-db.js` passes in full mode; `npm run build` passes with zero warnings; `CI=true npm test -- --passWithNoTests` exits 0.
- Console: zero errors and zero warnings on every route in development (React key warnings, act warnings, failed image loads from `placehold.co` count only if they are errors; note network-blocked placeholders as environmental).

### B. Brand consistency (light and dark)

- Correct logo variant per background on: header (rest and compact), mobile header, sidebar, footer, auth modal, invoice, loading screen, 404, admin sidebar and admin login.
- Grep: no hex/rgb colour literals outside `src/theme/storefront-tokens.css`, `src/theme/colors.js`, `src/theme/adminTheme.js`, admin files, `public/index.html`, `public/manifest.json`, the two `PLACEHOLDER_IMG` values, the ErrorBoundary fallbacks, and data; list and fix any other hit. No font-family literals outside the token files, `index.css` body rule, `adminTheme.js` and the boundary fallback. No gradients outside the hero scrim and the skeleton shimmer tokens. No "non-premium", "My Store", "mystore" anywhere in `src`, `public`, `db.json`.
- Typography scale, spacing rhythm, hairlines and radii consistent across pages (compare screenshots side by side).

### C. Feature parity, API-driven (JSON Server mode, both demo customer accounts and the admin)

1. Catalogue: departments in the mega-menu and sidebar follow the admin's `showInMainMenu`/`menuOrder`; listing filters by parent and leaf; legacy `?category=<id>` rewrites; search finds by name/tag/brand; product pages open by slug and redirect numeric ids.
2. Product page: variants change price/SKU/stock; quantity clamps; add to cart; buy now → checkout; wishlist toggle; reviews (approved only) and ratings agree with the data; bundle and related rails.
3. Cart: drawer opens on add; quantities and removal; free-delivery indicator follows Admin → Shipping; merge on login; cleared on logout; persisted on reload.
4. Wishlist: guest device list; sync on login (guest-only rows uploaded); remove/move/clear.
5. Checkout: all four steps; saved and new addresses; shipping methods and costs; coupon valid/invalid/expired/min-order auto-removal; store credit partial and full; COD availability rules; order placed → confirmation with correct totals; `db.json` shows the order, payment, coupon `usedCount` and wallet debit; then restore `db.json` from git and document.
6. Order confirmation and invoice: data, print.
7. Orders: list, filter, search, track, details, cancel (cascade visible in Admin → Orders/Payments; then restore), return/exchange → support with prefilled order, review submit → pending → approve in admin → visible on the product page (then restore).
8. Auth: login (session), remember-me (persistent across browser restart), register (duplicate email rejected), logout, guest handling on orders/profile/wishlist/checkout.
9. Account: profile save, addresses CRUD, change password, wallet balance equals the ledger.
10. Special offers: admin toggle hides page and nav entries; timer modes; featured lists; copy code; apply at checkout.
11. Deals config, settings and shipping edits in the admin appear on the storefront after a tab refocus/reload.
12. Static pages, 404, error boundary, newsletter (lead created), support form (lead created), then clean up or note demo leads.

### D. Contract and both branches

- Grep storefront code for JSON Server-only shape reliance: `response.data[0]`, `.data.data`, direct `axios`/`fetch` calls outside `api.js`, `IS_MOCK_API` usage outside `api.js`; every data access must go through `apiService.*` (both branches exist in `api.js`). Record findings and fix.
- Confirm `api.js` and `db.json` key sets are unchanged versus `main` except seed content (`git diff main -- src/services/api.js` must be empty; the validator's key-set check covers `db.json`).

### E. Light/dark, responsive, accessibility, motion, performance

- Every route in both modes at 360, 768, 1024, 1440; reduced motion on/off; axe zero serious/critical; Lighthouse on home/listing/product/checkout meets Prompt 32's targets (re-run and record).

### F. Admin untouched

- `git diff --stat main -- src/pages/Admin src/components/AdminLayout src/theme/adminTheme.js src/hooks/useAdminBodyClass.js` shows only `AdminLayout.js` and `AdminLogin.js` logo lines.
- Screenshot comparison against the Prompt 01 "before" set: login, dashboard, products, categories, orders (+ dialog), returns, payments, users, shipping, coupons, special offers, reviews, leads, settings; light and dark; SweetAlert confirm; scrollbars; the theme toggle. Identical except the logo.
- Functional walkthrough: create/edit/delete a category and a product (then restore), update order status, process a return, moderate a review, edit settings and deals config (then restore).

### G. Documentation

- `prompts/DESIGN_SYSTEM.md` reflects the final tokens and primitives; `prompts/00_INDEX.md` open questions updated; `prompts/BUILD_LOG.md` complete; "Needs client confirmation" and "Remove or replace before launch" lists consolidated in the index.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: fixes must not alter `api.js`, the schema, routes or business logic; restore `db.json` after destructive tests.
2. **Tokens only**: fixes through tokens/primitives.
3. **Admin untouched**: verified by diff and screenshots.
4. **Brand consistency**: verified per section B.
5. **Responsive and accessible**: verified per section E.
6. **No fabricated trust signals**: grep for residual claims (`24/7`, `since 20`, `% off` in static copy, `customers`, `happy`, `guarantee`, `best price`, `trusted by`); fix and log.
7. **Zero known issues**: every finding is fixed in this session; nothing is deferred. If a finding needs a client decision (not a fix), it goes to "Needs client confirmation", not to a defect list.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (all entries), `prompts/DESIGN_SYSTEM.md`, and the audit tables from Prompts 30–32.
2. Execute the checklist in order A → G, fixing as you go; after fixes, re-run A, D and F in full.
3. Keep evidence: screenshot folder outside the repo (reference it by name in the checklist), Lighthouse numbers, grep outputs.

## Acceptance criteria

- [ ] `prompts/QA_CHECKLIST.md` exists with every item marked pass and evidence noted.
- [ ] Zero console errors/warnings; validator and build pass; no literal-colour or branding leftovers; both branches of the contract intact.
- [ ] Every feature in section C verified working; admin identical except the logo.
- [ ] Index and build log finalised; zero open defects.

## Test and QA

Sections A–G above are the test plan. When everything passes, append the final entry to `prompts/BUILD_LOG.md` under `## Prompt 34 — Final QA and parity`: what was fixed in this session, the final grep/diff/validator/Lighthouse results, the restored data note, and the consolidated "Needs client confirmation" and "Remove or replace before launch" lists, then set the Status line in `prompts/00_INDEX.md` to "Build complete — zero known issues (date)".
