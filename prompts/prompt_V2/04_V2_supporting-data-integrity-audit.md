# V2-04 — Supporting data and referential integrity: max-effort audit and repair

**Prompt V2-04 of 5 · re-verifies original Prompt 05 (commit `d807ce4`) · run at MAX effort in a fresh session**

## Why this prompt exists

The original Prompt 05 (`prompts/05_supporting-data-and-integrity.md`) ran at medium effort. It reseeded settings, shipping, coupons, deals, banners, orders, payments, refunds, returns, the wallet ledger, reviews and the wishlist, and made the money math and ratings consistent. This is the most error-prone of the four prompts, because one wrong total cascades into payments, refunds, the wallet and the admin dashboard. **Re-seeding is forbidden.** Audit every requirement and every cascade at max effort, recompute independently, and repair the gaps in place.

## Depends on

V2-01, V2-02, V2-03. Read their reports in `prompts/prompt_V2/reports/` and their build-log entries first: any catalogue price, variant or name they corrected may have changed an order snapshot, a wishlist snapshot, a deal or a rating that you must now reconcile.

## Context

Storefront reads: `settings` (`store.*`, `payment.cod*`, `store.taxRate/taxIncluded`, `social.*`, `seo.*`), `shipping_methods` (active only; `freeAbove` drives the free-delivery badge and cart progress), `coupons` (`getActive`, `validate`), `reviews` (approved only on product pages; all of a user's own via `reviews.getMine`), `dealsConfig`, `wishlist`, `orders`, `returns`, `walletTransactions` (source of truth for `users[].storeCredit`), `payments`, `refunds`. Money rules live in `src/pages/Checkout/Checkout.js`; cascades in `src/services/api.js` (`orders.cancel`, `performCancel`, `reflectReturnRefund`, `writeWalletTransaction`, `computeWalletBalance`); deals in `src/utils/dealsConfig.js`; order states and review eligibility in `src/pages/OrderHistory/OrderHistory.js`. Prompts 19, 23, 24, 26, 27 and 34 built on and in places corrected this data. Their recorded decisions win. Demo accounts: `user@example.com` / `password123`, `jane@example.com` / `password123`, `mail4bappidas@gmail.com` / `Bappi@12345`, admin `admin@store.com` / `admin123`.

## Objective

Every requirement of `prompts/05_supporting-data-and-integrity.md` is met with evidence, superseded by a cited later decision, or repaired now. Every number in every supporting collection has been **recomputed independently from the checkout and cascade code**, not from the existing data, and matches. The full-mode validator enforces every machine-checkable rule.

## Scope — files you may change

- `db.json` → `settings`, `shipping_methods`, `coupons`, `reviews`, `dealsConfig`, `wishlist`, `orders`, `returns`, `payments`, `refunds`, `walletTransactions`, `banners`, `leads` (only `orderNumber` references), `users` (only `storeCredit`), `products` (only `rating` and `totalReviews`). Values only, never key sets, ids, `orderNumber`s or record counts unless Prompt 05 required a different count.
- `src/utils/constants.js`: only `FREE_SHIPPING_THRESHOLD`.
- `scripts/validate-db.js`: add assertions, never loosen.
- A Jest test only if a justified data fix changes a value it pins.
- `prompts/BUILD_LOG.md`, `prompts/prompt_V2/reports/V2-04_REPORT.md`.

**Frozen:** `admins`, `cart` (stays `[]`), `users` beyond `storeCredit`, demo credentials, catalogue content (V2-02/03 own it), `src/**` beyond the one constant and a justified test, `public/**`, the admin, `api.js`.

## Method (mandatory, in this order)

1. **Read** `prompts/00_INDEX.md`, `prompts/05_supporting-data-and-integrity.md` in full, the `## Prompt 05` build-log entry (including its cascade table), the V2-01…03 reports, and grep the rest of `BUILD_LOG.md` for later changes to these collections (`settings`, `shipping`, `coupon`, `dealsConfig`, `review`, `wishlist`, `orders`, `payments`, `refunds`, `returns`, `wallet`, `storeCredit`, `FREE_SHIPPING_THRESHOLD`, `banners`, `leads`). List each with its prompt number.
2. **See what the medium session did:** `git show --stat d807ce4`, read the diff, then `git log --oneline -- db.json` for later touches.
3. **Read the money and cascade code** listed in Context end to end, and write down the exact formulas (rounding, coupon caps, free-shipping comparison `≥` vs `>`, tax base, store-credit application, refund proration) **as the code implements them**. Where Prompt 05's text and the code disagree, the code is the contract. Record the discrepancy.
4. **Write an independent recomputation script** that rebuilds, from the item snapshots, coupons, shipping methods and settings, every order's `subtotal`, `discountAmount`, `shippingAmount`, `taxAmount`, `total`, `amountPayable`; every payment amount and refund; every return's `refundAmount`; the wallet ledger's running balance; each user's `storeCredit`; each product's `rating`/`totalReviews` from approved reviews. It prints **stored vs recomputed** for every row. Paste the table in the report.
5. **Build the requirement matrix** in `prompts/prompt_V2/reports/V2-04_REPORT.md` **before any edit**: every collection bullet, rule, cascade, guardrail, acceptance criterion and QA step of Prompt 05, numbered (expect **100 or more** rows), with status and evidence.
6. **Repair** by script (2-space JSON, key order kept), re-run the recomputation until every row matches, update the matrix.
7. **Gate, browser checks, log.**

## Deep checks medium effort commonly skips

**Settings and shipping**
- Every `settings` key present versus `90402a2`. Values: store name, tagline, email, phone, address equal to `src/utils/constants.js`; `currency: "INR"`, `currencySymbol: "₹"`, `timezone: "Asia/Kolkata"`, `taxRate: 18`, `taxIncluded: false`, COD `true`/0/0/50000, `defaultWeight: 8` and chair-carton dimensions, notification emails = support email, `seo.metaTitle`/`metaDescription` equal to `public/index.html` **as it is now** (after Prompt 32 and V2-01), `social.whatsapp` set and others `""`.
- Four shipping methods with original ids: Standard (Shiprocket, ₹499, `freeAbove: 9999`, "7-10", active), Express (₹999, `freeAbove: null`, "3-5", active), Same Day and Free Shipping inactive. `FREE_SHIPPING_THRESHOLD === 9999 ===` Standard `freeAbove`, and every UI surface that shows the threshold reads the live value (cart progress, header/assurance line, checkout).

**Coupons and deals**
- Five coupons, original ids: `WELCOME500`, `FLAT10`, `FESTIVE25` (inactive, expired **and** exhausted), `NEWHOME20`, `WORKSPACE15` (or `OFFICE15`) with an honest description ("15% off orders above ₹15,000", no category claim since the schema has no category restriction). Values, caps and minimums as specified; active expiries in 2027 at the end of an Indian day (the Prompt 34 rule); `usedCount` modest and `< usageLimit` for active codes.
- `dealsConfig`: `enabled`, hero copy in brand voice (no "unbeatable" or "don't miss out"), timer `enabled: true`, `endAt: ""`, `onExpiry: "endOfDay"`; `featuredCouponIds` = two **active** coupons; `dealOfTheDayIds` = three active products **with `comparePrice > price`**; `featuredProductIds` = 6–8 discounted active products across departments. Re-check after any V2-02/03 price fix.
- `banners`: three records, brand copy, department links that resolve, `gradient` a string equal to the flat navy token.

**Orders and the cascade (recompute every one of the 11)**
- Each `items[]` entry is a faithful snapshot of a **current** product and variant: `productId`/`variantId` exist; `name` = "Product – Variant" exactly as the checkout builds it; `image` = that product's first image **today**; `sku` = the variant SKU; `price` = variant price; `subtotal` = price × quantity. If V2-02/03 changed a price or name, decide (and record) whether historic orders keep their snapshot price, which is the realistic choice, or follow the catalogue. Either way the order's own math must hold.
- `subtotal`, `discountAmount` (fixed or percentage capped by `maxDiscount`, 0 without coupon, and the coupon's `minOrder` satisfied), `shippingAmount` (flat rate, or 0 when `subtotal − discount ≥ freeAbove`, using the code's comparison), `taxAmount` = round((subtotal − discount) × 18 / 100) with the code's rounding, `total`, `amountPayable = total − storeCreditUsed`, all equal the recomputation.
- Order `status` agrees with `statusHistory` and with returns (a full return leaves the order "returned"); `paymentStatus` agrees with payments (no pending payment on a paid order); timestamps are monotonic (`createdAt` ≤ each history entry ≤ `updatedAt`); `statusHistory[].note` amounts match the recomputed money (`grep -n "₹"` in notes).
- `payments[]`: amount = linked order's `amountPayable` (or `total`), refund amounts consistent; `refunds[]` match payment or return refunds; `returns[]` item snapshots from the linked order, `refundAmount` = Σ returned subtotals + proportional tax per the rule the data uses, `deductionAmount` kept.
- **Wallet:** three rows, running balance consistent (`balanceAfter` of row n = `balanceBefore` of row n+1, sign by `type`), final balance = `users[2].storeCredit` (`mail4bappidas@gmail.com`); other users 0. `computeWalletBalance` run in Node on the data yields the same number.

**Reviews, ratings, wishlist, leads**
- 20–26 reviews with the original key set; 3–4 `pending`, 1–2 `rejected`; ratings 3–5; titles ≤ 60 chars; bodies 1–3 natural sentences, not marketing; `helpfulCount` 0–12; review date after the related order date; `isVerifiedPurchase: true` **only** when that user has an order containing that product; 14–18 distinct products across **all six** departments; several products with zero reviews.
- `rating` = mean of approved ratings rounded to one decimal and `totalReviews` = count of approved, for all 84 products (0/0 elsewhere).
- Wishlist: user 3's three rows point at existing active products, with **every** snapshot field equal to the product today (`slug`, `name`, `image`, `brand`, `price`, `comparePrice`, `rating`, `totalReviews`, `shortDescription`, `variants`, `stock`, `trending`, `hot`).
- Leads: four records; every `orderNumber` resolves to an order.

**Validator**
- Full mode asserts all of the above that is machine-checkable, including review verified-purchase truth, wishlist snapshot equality, deal-of-the-day discount, and `seo` ↔ `index.html` equality. Add what is missing.

## Functional guardrails

1. Content only: key sets unchanged, no new collection, `api.js` untouched; the only code value is `FREE_SHIPPING_THRESHOLD`.
2. `banners.gradient` from `DESIGN_SYSTEM.md`.
3. Admin → Orders, Returns, Payments, Coupons, Reviews, Shipping, Special Offers, Settings, Users and Dashboard open every record and dialog without errors. Test one refund cascade on a scratch copy of `db.json` (or by reading the cascade code) and restore the file.
4. Brand voice in hero copy, coupon descriptions and shipping names.
5. Not applicable.
6. No fabricated trust signals: ratings only from seeded reviews; modest `helpfulCount` and `usedCount`.
7. Green gate before done.

## Gate (must all pass at the end)

- `node scripts/validate-db.js` (full) → `✓ all checks passed`; the recomputation script shows **zero** mismatches
- `CI=true npm test -- --passWithNoTests` → exits 0
- `npm run build` → passes, no new warnings
- JSON Server mode, as `mail4bappidas@gmail.com`: `/orders` (expand, track, return/exchange dialog), wallet tab balance = ledger = profile, `/wishlist` (three items, move to cart), a reviewed product page (rating and count match), a product with no reviews (honest empty state), `/special-offers` (coupons, products, live countdown, copy a code), checkout to Review with COD + store credit + `WELCOME500` (free-delivery line at ₹9,999). If you place an order to test, restore `db.json` from git and say so. As `user@example.com` and `jane@example.com`: `/orders` renders. Widths 360/768/1024/1440; console clean; full admin regression including Dashboard stats.

## Acceptance criteria

- [ ] `V2-04_REPORT.md` holds the full numbered matrix, the code-derived formulas, the stored-vs-recomputed tables (orders, payments, refunds, returns, wallet, ratings, wishlist), every gap and fix; zero `❌` / `⚠` rows remain.
- [ ] Zero recomputation mismatches; full-mode validator extended and passing.
- [ ] Demo accounts all log in and behave as before.
- [ ] Gate green; build-log entry appended.

## Build-log entry

Append `## Prompt V2-04 — Supporting data and integrity (max-effort re-verification of Prompt 05)`: requirement count and totals, the formulas as implemented, the before/after cascade table, the review/rating mapping, gaps and fixes per collection, validator assertions added, superseded decisions honoured, findings for V2-05, gate results, the refreshed "Needs client confirmation" list (tax rate, COD limits, shipping rates and windows, threshold, coupon codes, store contact) and "Remove or replace before launch" (demo reviews, orders, images, prices, accounts). Commit: `Re-verify supporting data and integrity at max effort (Prompt V2-04)`.
