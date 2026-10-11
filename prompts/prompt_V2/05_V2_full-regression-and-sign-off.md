# V2-05 — Full regression and sign-off after the V2 re-verification

**Prompt V2-05 of 5 · run at MAX effort in a fresh session · last V2 prompt**

## Why this prompt exists

V2-01 to V2-04 re-verified and repaired the work of the original Prompts 02–05 at max effort. Those fixes touched identity files and seed data that Prompts 06–34 read: the header, mega-menu, footer, home page, product cards, listing, search, product page, cart, special offers, account, wallet, orders, wishlist, checkout, invoice, static pages, SEO and the admin's views of the same data. This prompt proves the **whole application** still works perfectly after those fixes. It closes every finding the V2 prompts handed forward and leaves the project at "zero known issues", with nothing resting on medium-effort work.

## Depends on

V2-01, V2-02, V2-03, V2-04 (all four reports in `prompts/prompt_V2/reports/` and their build-log entries).

## Context

A & S Urbanseat storefront (Create React App; dual-mode `src/services/api.js`; `db.json`; tokens in `prompts/DESIGN_SYSTEM.md`). Original final QA: `prompts/34_final-qa-and-parity.md` and its executed checklist `prompts/QA_CHECKLIST.md` (plus `prompts/QA_RESPONSIVE_A11Y.md`). The admin is untouched except for Prompt 33's logo lines.

## Objective

Re-execute the final QA (Prompt 34's checklist, sections A–D and everything after them) against the post-V2 repository, with extra depth on every surface the V2 fixes could reach. Fix every defect found and close every V2 finding. Update the project's status documents so they record that Prompts 02–05 are now verified at max effort.

## Scope — files you may change

- Any storefront file needed to fix a defect found in this pass (presentation/UX fixes; a logic fix must keep the API contract and be documented).
- `db.json` content and `scripts/validate-db.js` (tighten only) if a defect is in data.
- Jest tests: add regression tests for defects you fix; update a test only when the spec proves its expectation wrong.
- `prompts/QA_CHECKLIST.md` (append a "V2 re-run" section; do not delete the original results), `prompts/00_INDEX.md` (status line + an effort note), `prompts/BUILD_LOG.md`, `prompts/prompt_V2/reports/V2-05_REPORT.md`, `prompts/prompt_V2/reports/V2_SIGN_OFF.md`.

Do not touch: `src/pages/Admin/*`, `src/components/AdminLayout/*`, `src/theme/adminTheme.js`, `src/services/api.js` (`git diff 90402a2 -- src/services/api.js` must stay as it was before V2 began), `db.json` key sets, ids, slugs, SKUs.

## Method (mandatory, in this order)

1. **Read** `prompts/00_INDEX.md`, `prompts/prompt_V2/00_README.md`, all four V2 reports, the V2 build-log entries, `prompts/34_final-qa-and-parity.md`, `prompts/QA_CHECKLIST.md`, `prompts/QA_RESPONSIVE_A11Y.md`, and `DESIGN_SYSTEM.md` §43 (maintainer checklist).
2. **Collect the change surface:** `git diff --stat <V2 baseline>..HEAD` (the hash at the top of `V2-01_REPORT.md`) and list every file and every `db.json` record the V2 prompts changed. For each, grep `src/` for its consumers (e.g. a renamed product → cards, search, cart, wishlist, orders, invoice, SEO titles; a changed threshold → cart progress, assurance strip, checkout; a changed brand line → hero, about, footer, newsletter, auth modal). Write this impact map into `V2-05_REPORT.md`.
3. **Collect open findings:** every "finding for V2-05" from the four reports becomes a numbered row in the report. Each row ends up `Fixed (commit)` or `Not a defect (reason)`. None stays open.
4. **Execute the QA checklist** (below) and record each result with evidence.
5. **Fix, re-test the affected rows, re-run the whole gate.**
6. **Update the status documents and sign off.**

## QA checklist to execute (record pass/fail + evidence for each)

### A. Environment and gate
- `npm ci`; `npm run server` + `npm start`; `node scripts/validate-db.js --catalogue` and full mode pass; `CI=true npm test -- --passWithNoTests` exits 0 (suite and test counts recorded, ≥ 86 suites); `npm run build` passes with **zero** warnings; console has zero errors and zero warnings on every route in development (network-blocked `placehold.co` images noted as environmental only).

### B. Brand consistency (light and dark)
- Correct logo variant per background on header (rest and compact), mobile header, sidebar, footer, auth modal, invoice, loading screen, 404, admin sidebar and admin login.
- Grep gates from Prompt 34 §B: no stray colour literals, font-family literals or gradients outside the allowed files; no "non-premium", "My Store", "mystore" in `src`, `public`, `db.json`.
- Every V2-changed brand line, contact fact, meta tag and `theme-color` renders where it should, and matches `settings` in `db.json`.

### C. Feature parity, API-driven (both demo customers and the admin), with every V2-touched record exercised
1. Catalogue: mega-menu and sidebar follow `showInMainMenu`/`menuOrder`; every department and **every leaf** deep link lists the right products (parent includes descendants; no empty leaf); legacy `?category=<id>` rewrites; search by name, tag and brand (incl. "almirah", "alna", "jhula", "mattress", "waiting", "Nilkamal", "Winsome"); product pages by slug, numeric id redirects.
2. Product page: for at least one product per department, plus every product V2 changed, variants change price/SKU/stock; specifications table renders 5–7 rows; quantity clamps; add to cart; buy now; wishlist; approved reviews and rating agree with data; bundle and related rails show only existing active products.
3. Home page: featured collections mix departments; trending/new rails; "Brands we carry" shows exactly the four brands; assurance strip reads live thresholds.
4. Cart: drawer, quantities, removal, free-delivery indicator at ₹9,999 from Admin → Shipping, merge on login, cleared on logout, persisted on reload. **Stale-cart check:** a cart saved in `localStorage` before V2 (simulate with an old item snapshot) still loads without errors.
5. Wishlist: guest list, sync on login, remove/move/clear; user 3's seeded rows match the products.
6. Checkout: all four steps; saved and new addresses; shipping methods and costs; coupon valid, invalid, expired (`FESTIVE25`), and min-order auto-removal; store credit partial and full; COD rules (limit ₹50,000); totals equal the formulas V2-04 documented; place an order, check order, payment, coupon `usedCount` and wallet debit in `db.json`, then **restore `db.json` from git** and say so.
7. Order confirmation and invoice: data, totals, print preview.
8. Orders: every seeded order for every demo user renders with correct items and totals; filter, search, track, details; cancel cascade (then restore); return/exchange → support prefilled; review submit → pending → approve in admin → visible on the product page (then restore).
9. Auth: login, remember-me, register (duplicate rejected), logout, guest handling.
10. Account: profile save, address CRUD, change password, wallet balance = ledger = profile.
11. Special offers: admin toggle, timer modes, featured coupons and products, deal of the day shows real discounts, copy code, apply at checkout.
12. Admin edits to deals, settings and shipping show on the storefront after refocus/reload.
13. Static pages, 404, error boundary, newsletter and support form (leads created, then cleaned up or noted).

### D. Contract
- No JSON Server-only shape reliance in storefront code (`response.data[0]`, `.data.data`, direct `axios`/`fetch` outside `api.js`, `IS_MOCK_API` outside `api.js`).
- `api.js` unchanged; `db.json` key sets unchanged (validator); ids/slugs/SKUs unchanged across all of V2 (diff a dump from the V2 baseline commit against HEAD and paste the result).

### E. Responsive, accessibility, performance, SEO
- Widths 360, 768, 1024, 1440 on home, listing, product, cart drawer, checkout, orders, wallet: no overflow, long V2-changed names wrap.
- Keyboard and screen-reader spot checks from `QA_RESPONSIVE_A11Y.md` on the same pages; contrast script passes.
- Prompt 32's performance and SEO targets still hold (per-page titles and descriptions use the current product and category names; build size not regressed by more than a few KB, with the numbers recorded).

### F. Admin parity
- `git diff 90402a2 -- src/pages/Admin src/components/AdminLayout src/theme/adminTheme.js` = Prompt 33's logo lines only. Every admin module opens every record touched by V2 (products, categories, orders, returns, payments, refunds, coupons, reviews, shipping, special offers, settings, users, dashboard) without errors; edit-save-without-change leaves `db.json` identical.

## Status documents to update

- `prompts/QA_CHECKLIST.md`: append `## V2 re-run (after Prompts V2-01…V2-04)` with every row above and its evidence.
- `prompts/00_INDEX.md`: update the **Status** line to say the build is complete with zero known issues **and** that Prompts 02–05 were re-verified at max effort by `prompts/prompt_V2/` (V2-01…V2-05), so every prompt's output now meets the max-effort standard. Add `prompts/prompt_V2/` to the index with one line per V2 prompt. Update the open-questions sections with anything newly resolved or found (e.g. reference-site changes from V2-03, client-confirmation items).
- `prompts/prompt_V2/reports/V2_SIGN_OFF.md`: one page with a table of original Prompts 01–34, the effort each originally ran at (02–05 medium, all others max), the V2 prompt that re-verified 02–05, the requirement totals and gap counts from each V2 report, the final gate numbers, and the statement "No prompt output rests on medium-effort work alone." Include it only if every row above passed.

## Acceptance criteria

- [ ] `V2-05_REPORT.md` contains the impact map, the findings table (all closed) and the full checklist with evidence.
- [ ] Every checklist row passes; every defect found is fixed and covered by a regression test where testable.
- [ ] Gate green: validator (both modes), Jest (≥ 86 suites, counts recorded), build with zero warnings, clean console.
- [ ] Admin parity and API contract proven; ids/slugs/SKUs unchanged across V2.
- [ ] `QA_CHECKLIST.md`, `00_INDEX.md` and `V2_SIGN_OFF.md` updated as above.

## Build-log entry

Append `## Prompt V2-05 — Full regression and sign-off`: the impact map summary, findings closed, defects found and fixed (file paths, tests added), gate numbers, documents updated, and the final statement of status. Commit: `Run the full regression after the V2 re-verification and sign off (Prompt V2-05)`.
