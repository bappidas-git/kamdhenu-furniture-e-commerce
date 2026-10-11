V2 baseline: 0b9153e490c87c0713c8c802f67185266da424a2 · V2-04 start: 75071f0 (V2-03 merged)

# V2-04 report: supporting data and referential integrity (max-effort re-verification of Prompt 05)

**Date:** 2026-10-11. **Re-verifies:** Prompt 05 (`prompts/05_supporting-data-and-integrity.md`, commit `d807ce4`). **Scope:** `db.json` → `settings`, `shipping_methods`, `coupons`, `reviews`, `dealsConfig`, `wishlist`, `orders`, `returns`, `payments`, `refunds`, `walletTransactions`, `banners`, `leads` (order numbers only), `users` (`storeCredit` only), `products` (`rating`/`totalReviews` only); `src/utils/constants.js` (`FREE_SHIPPING_THRESHOLD` only); `scripts/validate-db.js`. **Start:** `git rev-parse HEAD` = `75071f0`; `db.json` SHA-256 `d689a95f…` (V2-03's seed).

**Status: complete, no row left as a gap or partial.**
- **As found** (matrix committed before any edit, `8c7460e`): 165 requirements; 147 met, 4 superseded by recorded later decisions, 9 gaps (R29, R43, R59, R97, R150, R151, R153, R162, R163) and 5 partial (R111, R115, R121, R164 inherit a gap; R126 is part of R162).
- **After V2-04's repairs** (§9): 161 met (14 of them repaired here), 4 superseded, 0 gaps, 0 partial. 26 paths in `db.json` changed (25 values and one timeline entry, §11); no id, order number, key, key order, record count or collection.
- **Every number recomputes:** before and after, every stored figure equals its independent recomputation and the app's own expressions (order money, payments, refunds, returns, the wallet ledger, the store-credit caches, the snapshots, the 84 ratings). After the repairs the recomputation reports **0 mismatches** in every category (§6).
- **Gate green** (§14). Findings handed to V2-05 in §12.

---

## 1. How this was checked

- **Read in full:** `prompts/00_INDEX.md`; `prompts/05_supporting-data-and-integrity.md`; the `## Prompt 05` build-log entry and its cascade tables; the V2 README; the V2-01, V2-02 and V2-03 reports and entries (their findings for V2-04: V2-02 F2, V2-03 F2 and F3); the V2-04 prompt. Every later build-log entry (06–34) was searched for `settings`, `shipping`, `coupon`, `dealsConfig`, `review`, `wishlist`, `orders`, `payments`, `refunds`, `returns`, `wallet`, `storeCredit`, `FREE_SHIPPING_THRESHOLD`, `banners` and `leads`, and the matching passages were read (§3). `DESIGN_SYSTEM.md` §12 (values for files that cannot read tokens).
- **History:** `git show --stat d807ce4` and its diff; `git log -- db.json` (only `d807ce4`, `7cbe35d` (Prompt 34), `2c1ea8d` (V2-02) and `eb62f33` (V2-03) touched it after Prompt 04); a collection-by-collection, field-by-field walk of `90402a2 → 4dd5cf2 → d807ce4 → 7cbe35d → 2c1ea8d → eb62f33 → HEAD` (§2).
- **The money and cascade code, read end to end** (§4): `src/pages/Checkout/Checkout.js` (`couponDiscountFor`, the order math, the COD rule, the coupon's removal, `placeOrder`'s payload); `src/context/CartContext.js` (`getCartTotal`), `src/utils/helpers.js` (`buildCartItem`, `getDefaultCartVariant`, `getProductMaxDiscount`) and the product page's cart line; `src/context/OrderContext.js` (`createOrder`, `generateOrderNumber`); `src/services/api.js` (`orders.create`, `createPaymentForOrder`, `redeemCouponByCode`/`restoreCouponByCode`, `coupons.validate`/`getActive`, `orders.cancel` → `performCancel`, `voidPaymentForOrder`, `markPaymentRefundPending`, `initiateOrderRefund`/`completeOrderRefund`, `issueRefund`, `updateReturn` → `reflectReturnRefund`, `appendPaymentRefund`, `createRefundRecord`/`finalizeRefundRecord`, `readWalletBalance`/`computeWalletBalance`/`writeWalletTransaction`, `getDashboardStats`, `reviews.submit`, `products.getReviews`, `deals.getConfig`); `src/utils/dealsConfig.js`; `src/pages/SpecialOffers/offersData.js` and the page's selection memos; `src/context/WishlistContext.js` (`buildWishlistItem`); `src/pages/OrderHistory/OrderHistory.js` (`deriveOrderStatus`, `isReviewable`, `isCancellable`, `isReturnEligible`, `closedNote`, `paidRowLabel`); the admin's Orders, Returns, Payments, Reviews and Settings pages (the actions they write).
- **Recomputation script** (`recompute.cjs` with `codeparts.cjs`, session scratchpad; listed in Appendix A so it can be rebuilt): rebuilds every order line from today's catalogue, then every order's subtotal, discount, delivery, tax, total and payable, every payment amount and refund, every return's refund, the refunds ledger, the wallet's running balance, each user's `storeCredit`, each product's rating and count, and each wishlist snapshot. Each figure is computed twice: by an independent re-implementation and by **the app's own expressions, lifted verbatim from the source with the Babel parser** (`couponDiscountFor` and the order-math declarations of `Checkout.js`, `placeOrder`'s item mapper, `createPaymentForOrder`, `appendPaymentRefund`, `readWalletBalance`, `isFullReturnOfOrder`, `buildWishlistItem`, `deriveOrderStatus`, `isCouponValid`, `getProductMaxDiscount`). It never derives anything from a stored total. It also checks states, timelines and dates against the catalogue. Output in §6.
- **Browser** (Playwright 1.56.1, Chromium 141): a production build in JSON Server mode (`REACT_APP_API_URL=http://localhost:3001 REACT_APP_USE_MOCK_API=true CI=true BUILD_PATH=<scratch> npm run build`: "Compiled successfully.") served on :5001; JSON Server (`server.js`) on a **scratch copy** of `db.json` (`JSON_SERVER_DB`), reset and restarted from the repository's file before every mutating check, so the seed is only ever read (SHA-256 `d689a95f…` before and after). Every expectation is read from the scratch database at run time. **69 of 69 before the repairs, 78 of 78 after** (§7; the nine added checks look at the repaired records). A development-server sweep (26 loads, storefront signed in and admin) covers the console in development builds.
- **Gate at the start:** `node scripts/validate-db.js` ✓ (full) and `--catalogue` ✓; `CI=true npm test -- --passWithNoTests` **86 suites, 1,429 tests, exit 0**, no console warning.

## 2. What the medium session did (`d807ce4`), and what changed since

`git show --stat d807ce4`: `db.json` (1,185 lines changed), `prompts/BUILD_LOG.md` (147), `scripts/validate-db.js` (221), `src/utils/constants.js` (7: the constant and its comment); 1,105 insertions and 455 deletions in all. Nothing under `public/`, no other `src/` file.

| Collection | `d807ce4` | Later |
|---|---|---|
| `settings` | every value reseeded, the 42 key paths kept in order | — |
| `shipping_methods` | four methods re-valued, ids kept | — |
| `coupons` | five re-valued, ids kept; SUMMER25 → FESTIVE25; OFFICE15 → WORKSPACE15 | Prompt 34 (`7cbe35d`): `expiresAt` 23:59:59Z → 18:29:59Z (the end of an Indian day) |
| `dealsConfig` | hero, timer, coupon and product picks | — |
| `banners` | three brand records | — |
| `orders` | 11 kept; items replaced; money recomputed | Prompt 34: order 1 `fulfilled`/`shipped` → `returned`/`delivered`, `deliveredAt` and a "Marked delivered" entry |
| `payments` / `refunds` / `returns` / `walletTransactions` | amounts recomputed | Prompt 34: payment 5 `pending` → `captured` with `cod_MQB0JHUB` |
| `reviews` | 8 → 26 | — |
| `wishlist` | three new snapshots | — |
| `leads` | unchanged | Prompt 34: leads 3 and 4 rewritten (smartwatch, running shoes → almirah, wall mirror) |
| `users` | user 3's `storeCredit` 2,918 → 2,302 | — |
| `products` | `rating`/`totalReviews` | V2-02, V2-03: copy, tags and relations only; no price, variant, rating or count |

V2-02 and V2-03 left every supporting collection byte-identical (their reports' SHA-256 lines; confirmed: HEAD equals `eb62f33`). Key sets: every collection's records carry the keys and order they had at `d807ce4`, except order 1's `deliveredAt` (Prompt 34, a key orders 7, 8 and 11 carry). The 18 collections keep the boilerplate's order.

## 3. Later decisions that touch these collections

| Prompt | What it decided | Effect here |
|---|---|---|
| 08 | Footer trust bar: COD from `settings.payment.codEnabled`, free delivery from the lowest positive active `freeAbove` | reads the seed; R39 |
| 10 | The hero reads `homeContent.js`; `banners` stays as unused data | R60 |
| 12 | Home review carousel: approved reviews of the featured products, newest first | reads `reviews`; R93 |
| 17 | The product page counts the visible (approved) reviews once | R102, R135 |
| 18 | The cart drawer reads the live methods (threshold = lowest positive `freeAbove`; free when the pre-discount subtotal ≥ it); `FLAT_SHIPPING = 99` removed | R39 |
| 19 | Offers page selection rules moved unchanged to `offersData.js`; noted coupon expiries a day late in India | R48, R53 |
| 23 | Wallet: the balance is the API's (`readWalletBalance` in mock mode), the ledger is shown, never summed | R85–R87, R157 |
| 24 | Order cards, review chips only on delivered orders, "Return or exchange" = a Support link | R93, R139 |
| 26 | Checkout's math kept verbatim; the coupon refusal message (owner-approved) | §4 |
| 27 | Invoice tax label from `settings.store.taxRate` | R25 |
| 29 | Admin-managed `db.json` copy left to the client: shipping names in sentence case, the coupons' "first order", `seo.metaTitle` to match `index.html`, the tagline's casing, the deals title's accent | R29, R43, R46, R116 |
| 32 | `settings.seo` is not read by the storefront; `DEFAULT_PAGE_TITLE` equals `index.html`'s title | R29 |
| 34 | Seed fixes 11–15: order 1 returned, payment 5 captured, coupon expiries at 18:29:59Z, leads 3 and 4; `FREE_SHIPPING_THRESHOLD`'s comment; new validator checks | R10, R48, R62, R79 |
| V2-01 | O7: `settings.seo.metaTitle` still Title Case | R29 |
| V2-02, V2-03 | F2: orders and reviews dated before their product; F3: health effects in reviews 11 and 17 | R163, R97 |

## 4. The money and cascade code, as implemented

Where Prompt 05's text and the code differ, the code is the contract (D-rows).

| # | Rule | As the code implements it | Where |
|---|---|---|---|
| F1 | Order line | `{ productId, variantId, name: name + (variantName ? " - " + variantName : ""), image, sku: item.sku \|\| "", price, quantity, subtotal: price × quantity }`; the cart line's `image` is the product's first image, `price` the chosen variant's (quick add: the cheapest) | `Checkout.js:610–616`; `ProductDetails.js:536–557`; `helpers.js:89–108` |
| F2 | Subtotal | Σ price × quantity of the cart lines (`getCartTotal`) | `CartContext.js:446–450` |
| F3 | Coupon accepted (mock) | an active record with that code; `expiresAt` not passed; `usageLimit` unset or `usedCount < usageLimit`; `subtotal ≥ minOrderAmount` (pre-discount). `perUserLimit` and "first order" are not checked. Checkout drops a coupon once `subtotal < minOrderAmount` | `api.js:1408–1421`; `Checkout.js:540–548` |
| F4 | Discount | `raw = percentage ? Math.round(subtotal × value / 100) : value`; `discount = max(0, min(raw, maxDiscount \|\| ∞, subtotal))` | `Checkout.js:76–84` |
| F5 | Delivery | `rateType === "free" \|\| (freeAbove && subtotal ≥ freeAbove) ? 0 : flatRate`: the **pre-discount** subtotal, **inclusive**; a `freeAbove` of null or 0 never frees a flat method | `Checkout.js:497–499` |
| F6 | Tax | `Math.round(max(0, subtotal − discount) × (taxRate / 100))`, `taxRate = settings.store.taxRate ?? 18`; no tax on delivery; `taxIncluded` is not read | `Checkout.js:500–501` |
| F7 | Total | subtotal − discount + delivery + tax | `Checkout.js:502` |
| F8 | Store credit | `maxApplicableCredit = min(balance, total)`; `applied = min(max(0, round(amount)), maxApplicableCredit)`; `amountPayable = max(0, total − applied)`; fully covered → `paymentMethod "store_credit"`, `paid` | `Checkout.js:508–513, 629–630` |
| F9 | Payment status at checkout | fully covered → `paid`; COD → `pending`; any other method → `paid` | `Checkout.js:630` |
| F10 | COD offered | `codEnabled !== false && amountPayable > 0 && amountPayable ≥ codMinOrder && (codMaxOrder == null \|\| amountPayable ≤ codMaxOrder)`; `codFee` is never charged | `Checkout.js:517–522` |
| F11 | Order record (mock) | `orderNumber = "ORD-" + Date.now().toString(36).toUpperCase() + "-" + 4 random`; `statusHistory: [{ at, by: "Customer", action: "Order placed" }]`; then one payment (`amount` = payable, or the total when credit covers it; `captured` when paid, else `pending`; `cod`, `razorpay` or `store_credit`; COD has no `transactionId`), the coupon's `usedCount + 1`, and a wallet debit of `storeCreditUsed` ("Applied to order …") | `OrderContext.js:51–100`; `api.js:1160–1195, 292–321, 334–349` |
| F12 | Wallet | `balance = max(0, round(Σ credits − Σ debits))` of the user's rows (`readWalletBalance`, which `computeWalletBalance` wraps); a debit is capped at the balance (none at 0); each row stores `balanceBefore`/`balanceAfter`; `users[].storeCredit` is set to `balanceAfter` | `api.js:402–468` |
| F13 | Customer cancel | allowed while processing; paid (or partly refunded) with a payable → a refund is **initiated** for `amountPayable − refundedAmount` (order `refundStatus: processing`, `pendingRefund`, payment `refund_pending`, an `order_cancellation` record `pending`); not collected → `voidPayment` (order `paymentStatus: "voided"`, "Payment voided" / "No captured payment to refund", payment `voided`); store credit used → a wallet credit of what was debited, `storeCreditReturned: true`; the coupon restored; stock returned | `api.js:1237–1260, 614–736` |
| F14 | Order refund (admin) | initiate (`processing`, payment `refund_pending`, an `order_refund` record `pending`, "Refund initiated" / "₹X via M — settlement pending") → complete (books `min(amount \|\| remaining, remaining)` on the payment, order `paymentStatus` refunded or partially, `refundedAmount += amount`, record `completed`; store credit → a wallet credit "Refund for order …", without a refund link) | `api.js:1891–1968` |
| F15 | Payment refund (admin) | `amount ≤ remaining`; booked on the payment; order `paymentStatus` mirrored with "Refund issued (₹X)"; a `payment_refund` record `completed` | `api.js:2165–2195` |
| F16 | Return refund (admin) | approve → received → process: return `status: "refunded"`, `refundStatus: "processed"`, "Refund processed (₹payable)"; then `payable = max(0, refundAmount − deductionAmount)` is booked on the order's payment (`refunded` once the running total covers the amount, else `partially_refunded`), the order turns `returned` with "Return refund processed (RET-…)" / "₹payable refunded", a `return_refund` record `completed`; a full return of a coupon order restores the coupon; store credit → a wallet credit. **`refundAmount` itself is typed in by the admin**: no code computes it | `AdminReturns.js:134–147, 214–242`; `api.js:2067–2092, 186–260` |
| F17 | Ratings | no code computes them in mock mode (moderation leaves the stored aggregate); the product page counts the approved reviews it shows. The seed's rule (Prompt 05): mean of approved ratings, `Math.round(avg × 10) / 10`; count of approved | `ReviewsSection.js`; Prompt 17 |
| F18 | Deals | coupons: `isCouponValid` (active, `expiresAt > now`, not exhausted) ∩ the admin's ids in order; deal of the day and grid: `pickByIds(products, ids)` in order (**no discount check in code**), else the top 3 / all by `getProductMaxDiscount` (`round((compare − price) / compare × 100)` when compare > price > 0); countdown: end of today when `endAt` is "" | `offersData.js:29–40`; `SpecialOffers.js:552–577`; `dealsConfig.js:101–125` |
| F19 | Order status shown | returned > cancelled (fulfilment cancelled, or payment failed/refunded) > delivered > shipped > processing; reviewable only when delivered; cancellable only when processing; "Return or exchange" while delivered within 7 days of `deliveredAt \|\| updatedAt` | `OrderHistory.js:84–125` |
| F20 | Threshold shown | the lowest positive `freeAbove` of the active methods, never the constant | `cartDelivery.js:48–95`; `tokens.js` `resolveTrustBadgeDetail` |

| # | Prompt 05's text | The code | Consequence |
|---|---|---|---|
| D1 | "0 when `subtotal − discountAmount ≥ freeAbove`" (05:61) | the pre-discount subtotal | Prompt 05 followed the code and recorded it; the ₹9,999 check in §7 depends on it (₹9,999 − ₹500 still ships free) |
| D2 | "\"Product – Variant\"" (en dash) | `" - "` (hyphen) | the seed follows the code (R67) |
| D3 | "`sku` = the variant SKU" | `item.sku \|\| ""`, and no cart line carries `sku` | storefront-placed orders store `""` (Prompt 34's C5 orders); the seed keeps the variant SKU as Prompt 05 asked (observation O1) |
| D4 | "`dealOfTheDayIds`: three products that have a `comparePrice`" | the page shows any picked product, discounted or not | only the data (and the validator) keeps the picks discounted (R54) |
| D5 | "`returns[].refundAmount` = … (+ proportional tax as the current data does)" | the admin enters it; the cascade books `refundAmount − deductionAmount` | the seed's rule is data, not code; the validator holds it |
| D6 | (not stated) | a cancel voids an uncollected payment; processing a return refund sets the return `refunded` | order 5 and return 1 contradict this (R150, R151) |
| D7 | "timestamps" kept | the mock stamps `updatedAt` before it reads the record and appends the event, so a live admin action leaves the event a few ms after `updatedAt` | the seed shows that skew on orders 7, 8 and 11 (R153) |

## 5. Requirement matrix

Status: `✅ Met` · `✅ Met: repaired by V2-04 (was gap / partial)` · `↪ Superseded by Prompt NN` (a recorded later decision, cited) · `❌ Gap` · `⚠ Partial`. "05:N" is a line of `prompts/05_supporting-data-and-integrity.md`. §6 is the recomputation, §7 the browser checks; `validate-db.js:N` lines are at the start of V2-04. The matrix as found, before any repair, is commit `8c7460e`. Rows 145–165 are the V2-04 prompt's deep checks not already covered above.

### 5.1 Depends on, context, objective and scope (05:5–23)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R1 | Depends on Prompts 02 (brand constants, contact facts), 03 and 04 (84 products, validator) (05:7) | all three present and re-verified by V2-01…03 | ✅ Met | V2-01…03 reports; `constants.js:153–156`; validator ✓ both modes |
| R2 | The storefront reads `settings`, `shipping_methods` (active only), `coupons`, `reviews` (approved on product pages; `getMine`), `dealsConfig`, `wishlist`, `orders`, `returns`, `walletTransactions`, `payments`, `refunds` (05:11) | each read traced to its `api.js` method and consumer (§4) | ✅ Met | `api.js:963, 1160–1290, 1393, 1408, 1510`; §4 |
| R3 | Reseed every supporting collection as A & S Urbanseat content (05:15) | no boilerplate catalogue word in any supporting collection | ✅ Met | `validate-db.js:1008–1011` ✓; recomputation §6 |
| R4 | …with the exact existing field shapes (05:15) | every record keeps its key set and order; reviews use the 12 keys common to all eight originals (two originals also carried `photos`, two `source: "admin"`; no code needs either) | ✅ Met | key walk `90402a2`/`d807ce4`/HEAD (§2); `grep source\|photos` in `src` (only `ReviewsSection` reads `photos`, optionally) |
| R5 | Restore referential integrity: orders, returns, reviews, wishlist, deals config, payments, refunds, wallet ledger (05:15) | every reference resolves; every amount recomputes | ✅ Met | validator ✓; recomputation money 0 / cascade 0 / snapshot 0 / ratings 0 (§6) |
| R6 | Keep the demo accounts working (05:15) | the three customers and the admin sign in | ✅ Met | browser: sign-in ×3, admin login (§7) |
| R7 | Ratings agree with the seeded reviews (05:15) | 84 of 84 products | ✅ Met | recomputation §6 (ratings: 0 mismatches) |
| R8 | Finish with a passing full-mode validator run (05:15) | passes | ✅ Met | `node scripts/validate-db.js` → ✓ all checks passed |
| R9 | Scope: `settings`, `shipping_methods`, `coupons`, `reviews`, `dealsConfig`, `wishlist`, `orders`, `returns`, `payments`, `refunds`, `walletTransactions`, `banners` (05:19) | `d807ce4` changed only these, plus the two fields below | ✅ Met | `git show --stat d807ce4`; collection diff §2 |
| R10 | `leads`: only `orderNumber` references, if an order number changes; keep the four records (05:19, 05:84) | four records; order numbers unchanged and resolving; leads 3 and 4's subject, message and notes rewritten by Prompt 34 (they still asked about a smartwatch and running shoes) | ↪ Superseded by Prompt 34 (fix 14) | BUILD_LOG Prompt 34 'What was fixed' 11–15; `7cbe35d` diff |
| R11 | `users`: only the `storeCredit` cache (05:19) | users minus `storeCredit` byte-identical to `90402a2`; only user 3's cache changed (₹2,918 → ₹2,302) | ✅ Met | SHA-256 of `users` without `storeCredit` |
| R12 | `products`: only `rating` and `totalReviews` (05:19) | `d807ce4` changed nothing else in products | ✅ Met | V2-02 R24, V2-03 R116 field walks |
| R13 | `constants.js`: only `FREE_SHIPPING_THRESHOLD`, equal to Standard's `freeAbove` (05:20) | `9999`; its comment rewritten by Prompt 34 (the storefront reads the live methods) | ✅ Met | `constants.js:130–136` |
| R14 | `validate-db.js`: enable full mode (05:21) | full mode is the default run | ✅ Met | `validate-db.js:922` |
| R15 | Do not touch `admins` (05:23) | byte-identical to `90402a2` | ✅ Met | SHA-256 equal |
| R16 | `cart` stays `[]` (05:23) | `[]` | ✅ Met | `validate-db.js:1007` |
| R17 | `users` beyond `storeCredit`, product/category content untouched (05:23) | as R11, R12 | ✅ Met | R11, R12 |
| R18 | Nothing under `src/` except the one constant; `public/` untouched (05:23) | `d807ce4` touched `constants.js` only | ✅ Met | `git show --stat d807ce4` |

### 5.2 `settings` (05:29–36)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R19 | Keep every key; change values only (05:29) | the 42 key paths of `90402a2`, in order | ✅ Met | key-path walk (§2) |
| R20 | `store.name` "A & S Urbanseat" (05:31) | equal | ✅ Met | `db.json` settings; `constants.js:4` |
| R21 | `store.tagline` "Trusted Comfort for Every Home" (05:31) | equal to `APP_TAGLINE` (the casing is a client question, Prompt 29) | ✅ Met | `constants.js:7` |
| R22 | `store.email`, `phone`, `address` as in `constants.js` (05:31) | `info@kamdhenufurniture.com`, `+91 84729 18653`, `Assam, India` | ✅ Met | `constants.js:153–155` |
| R23 | `currency` INR, `currencySymbol` ₹, `timezone` Asia/Kolkata (05:31) | equal | ✅ Met | settings |
| R24 | `logo` and `favicon` null (05:31) | null | ✅ Met | settings |
| R25 | `taxRate` 18, `taxIncluded` false (05:31) | 18, false (checkout defaults to 18 too) | ✅ Met | settings; `Checkout.js:500` |
| R26 | `payment`: COD on, fee 0, min 0, max 50,000; gateways disabled (05:32) | true / 0 / 0 / 50000; Razorpay and Stripe off, keys empty | ✅ Met | settings; COD rule `Checkout.js:517–522` |
| R27 | `shipping`: unchanged except `defaultWeight` 8 and chair-carton `defaultDimensions` (05:33) | 8 kg; 65 × 60 × 75 cm; Shiprocket fields as before | ✅ Met | settings |
| R28 | `notifications`: emails → the support email (05:34) | both `info@kamdhenufurniture.com` | ✅ Met | settings |
| R29 | `seo.metaTitle` matching `index.html` (05:35; V2-04: as `index.html` is now) | "A & S Urbanseat | Furniture and seating for home, office, café and outdoor", equal to `index.html`'s title and `DEFAULT_PAGE_TITLE` | ✅ Met: repaired by V2-04 (was gap) | §9.1; `validate-db.js` V2-04 (settings.seo); as found: `public/index.html:6`; `constants.js` `DEFAULT_PAGE_TITLE`; V2-01 O7 |
| R30 | `seo.metaDescription` matching `index.html` (05:35) | equal (114 characters) | ✅ Met | `public/index.html:9` |
| R31 | `social.whatsapp` set, the others "" (05:36) | `https://wa.me/918472919541` = `SOCIAL_LINKS.WHATSAPP`; facebook, instagram, twitter, youtube "" | ✅ Met | `constants.js:141–147` |

### 5.3 `shipping_methods` and the threshold (05:38–45)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R32 | Keep four records and ids (05:38) | ids 1–4 | ✅ Met | shipping_methods |
| R33 | Standard Delivery: Shiprocket, "Delivered in 7–10 business days", flat ₹499, `freeAbove` 9999, "7-10", active (05:40) | exactly | ✅ Met | shipping_methods[0] |
| R34 | Express Delivery: ₹999, `freeAbove` null, "3-5", active (05:41) | exactly | ✅ Met | shipping_methods[1] |
| R35 | Same Day Delivery kept, inactive (05:42) | inactive (₹1,499 kept for the admin form) | ✅ Met | shipping_methods[2] |
| R36 | Free Shipping kept, inactive (05:43) | inactive | ✅ Met | shipping_methods[3] |
| R37 | `FREE_SHIPPING_THRESHOLD = 9999` (05:45) | 9999 = Standard `freeAbove` | ✅ Met | `constants.js:136`; `validate-db.js:1019–1026` |
| R38 | Flag every rate, window and the threshold (05:45) | listed for the client | ✅ Met | BUILD_LOG Prompt 05; `00_INDEX.md` §6 |
| R39 | V2-04: every surface that shows the threshold reads the live value | header line, cart drawer, footer, assurance strip, product page, promise steps and checkout all read the active methods; the constant feeds only the validator | ✅ Met | `Header.js:258` (`freeDeliveryLine`), `cartDelivery.js:54`, `Footer.js:245`, `AssuranceStrip.js:53`, `DeliveryReturnsInfo.js:62–65`, `Checkout.js:1253–1255`; browser header/checkout |

### 5.4 `coupons` (05:47–49)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R40 | Keep five records and ids (05:47) | ids 1–5 | ✅ Met | coupons |
| R41 | Brand the codes; keep the fixed / percentage / expired / exhausted mix (05:47) | 1 fixed, 4 percentage; FESTIVE25 expired and exhausted | ✅ Met | coupons; `validate-db.js:1047–1048` |
| R42 | WELCOME500: fixed ₹500, min ₹5,000 (05:49) | 500 / 5,000, cap 500, 14 of 500 used, 1 per customer, active | ✅ Met | coupons[0] |
| R43 | WELCOME500's description honest (05:49 by analogy with WORKSPACE15; guardrail 4) | "₹500 off orders above ₹5,000" (Prompt 29's wording); the seeded uses no longer contradict it; NEWHOME20 keeps Prompt 05's "first order" | ✅ Met: repaired by V2-04 (was gap) | §9.2; `SpecialOffers.test.js:296`; `validate-db.js` V2-04 (first order); as found: `api.js:1408–1421`; recomputation §6 (orders 2 and 7, coupon bit) |
| R44 | FLAT10: 10%, max ₹2,000, min ₹2,000 (05:49) | exactly; 37 used, no limit | ✅ Met | coupons[1] |
| R45 | FESTIVE25: inactive, expired, exhausted (replaces SUMMER25) (05:49) | inactive, expired 15 Nov 2025 (18:29:59Z), 150 of 150 | ✅ Met | coupons[2] |
| R46 | NEWHOME20: 20% on the first order, max ₹3,000 (05:49) | 20%, cap 3,000, min 3,000, 9 used; "first order" as specified (unenforced in the mock: a client question, `00_INDEX.md` §6); no seeded order uses it | ✅ Met | coupons[3] |
| R47 | WORKSPACE15 (or OFFICE15) described honestly: "15% off orders above ₹15,000" (05:49) | "15% off orders above ₹15,000, up to ₹4,000"; no category claim | ✅ Met | coupons[4] |
| R48 | Active expiries in 2027 (05:49), at the end of an Indian day (Prompt 34) | 31 Mar / 30 Jun 2027 at 18:29:59Z (23:59:59 IST) | ↪ Superseded by Prompt 34 (fix 15: 23:59:59Z → 18:29:59Z) | coupons; `validate-db.js:1211–1217` |
| R49 | Flag the codes and values (05:49) | listed for the client | ✅ Met | BUILD_LOG Prompt 05; `00_INDEX.md` §6 |

### 5.5 `dealsConfig` (05:51–53)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R50 | `enabled: true` (05:53) | true | ✅ Met | dealsConfig |
| R51 | `hero.tag` "This week"; title and subtitle in the brand voice, no "unbeatable" / "don't miss out" (05:53) | "This week" / "Offers on pieces we love" / "A short list of chairs, tables and sofas at a lower price for now, plus codes you can use at checkout." (true of the selection: chairs, tables, sofas) | ✅ Met | dealsConfig.hero; browser offers/hero |
| R52 | `timer`: enabled, `endAt` "", `onExpiry` endOfDay (05:53) | exactly; the countdown runs to the end of today | ✅ Met | dealsConfig.timer; `dealsConfig.js:101–112`; browser offers/countdown-live |
| R53 | `featuredCouponIds`: two active coupons (05:53) | [1, 2]: WELCOME500, FLAT10 (active, unexpired, not exhausted: `isCouponValid`) | ✅ Met | `offersData.js:29`; browser offers/coupons |
| R54 | `dealOfTheDayIds`: three products with a `comparePrice` (05:53; V2-04: active, compare-at above the price) | [47, 21, 12]: 13–14% off, active | ✅ Met | §6.9 deals table; browser offers/products |
| R55 | `featuredProductIds`: six to eight discounted products across departments (05:53) | [19, 29, 40, 55, 74, 78, 81, 84]: 8, all discounted (11–13%), all six departments | ✅ Met | §6.9 deals table |
| R56 | `updatedAt` now (05:53) | 2026-10-07T09:00Z (Prompt 05's run) | ✅ Met | dealsConfig |

### 5.6 `banners` (05:55–57)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R57 | Keep three records and keys (05:55) | three, six keys each | ✅ Met | `validate-db.js:1001` |
| R58 | Brand copy and department links that resolve (05:57) | Plastic furniture / Office chairs / Home furniture → `/products?category=<department slug>`, all active departments | ✅ Met | `validate-db.js:1181–1185` |
| R59 | `gradient` = the flat navy value from `DESIGN_SYSTEM.md`, a string (05:57; V2-04: "a string equal to the flat navy token") | `#0b1f3f` on all three, the literal §12 gives (`--sf-brand-navy`) | ✅ Met: repaired by V2-04 (was gap) | §9.3; `validate-db.js` V2-04 (banners); as found: `DESIGN_SYSTEM.md` §12 ("Copy these literally"); `storefront-tokens.css:82` |
| R60 | Not rendered by the redesigned hero; nothing points at electronics (05:57) | no caller of `apiService.banners.getAll` (Prompt 10) | ✅ Met | `grep banners.getAll src`; `00_INDEX.md` §5 item 5 |

### 5.7 `orders` (05:61)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R61 | Keep all 11 orders with `id`, `orderNumber`, `userId` (05:61) | unchanged since the boilerplate | ✅ Met | order walk `90402a2` → HEAD |
| R62 | Keep statuses (05:61) | kept, except order 1, which Prompt 34 moved to returned / delivered (it had been returned in full) | ↪ Superseded by Prompt 34 (fix 11) | BUILD_LOG Prompt 34; `validate-db.js:1193–1202` |
| R63 | Keep addresses, `couponCode`, `paymentMethod` (05:61) | unchanged | ✅ Met | order walk |
| R64 | Keep timestamps (05:61) | unchanged (Prompt 34 added order 1's `deliveredAt` and a "Marked delivered" entry) | ✅ Met | order walk; BUILD_LOG Prompt 34 'Decisions' |
| R65 | Keep the `statusHistory` shape (05:61) | `{ at, by, action, note? }` everywhere | ✅ Met | order walk |
| R66 | Items: a real product and variant (05:61) | 14 lines, every `productId`/`variantId` exists | ✅ Met | §6 items table |
| R67 | `name` "Product – Variant" as the checkout builds it (05:61) | the checkout writes `${name} - ${variantName}` (hyphen, not the prompt's en dash); 14 of 14 equal | ✅ Met | `Checkout.js:612`; §6 items table (the checkout's own mapper) |
| R68 | `image` = that product's first image (05:61; V2-04: today) | 14 of 14 | ✅ Met | §6 items table |
| R69 | `sku` = the variant SKU (05:61) | 14 of 14 (a storefront-placed order stores `""`: cart lines carry no `sku`, §4 D3) | ✅ Met | §6 items table |
| R70 | `price`, `quantity`, `subtotal` (05:61; V2-04: price = variant price, decide on historic prices) | price = the variant's price today on all 14 (no catalogue price changed after Prompt 05); subtotal = price × quantity | ✅ Met | §6 items table; V2-02 and V2-03 changed no price |
| R71 | `subtotal` = Σ item subtotals (05:61) | 11 of 11 | ✅ Met | §6 orders table |
| R72 | `discountAmount` per the coupon (fixed, or percentage capped by `maxDiscount`; 0 without) (05:61) | 11 of 11 by the independent formula and by `couponDiscountFor` itself | ✅ Met | `Checkout.js:76–84`; §6 |
| R73 | `shippingAmount`: the method's rate, or 0 when free, by the code's comparison (05:61) | 11 of 11 with the recorded methods (Express on order 8, Standard elsewhere); the code frees delivery when the pre-discount subtotal ≥ `freeAbove` (inclusive), Prompt 05's recorded deviation | ✅ Met | `Checkout.js:497–499`; §6 |
| R74 | `taxAmount` = round((subtotal − discount) × 18 / 100) (05:61) | 11 of 11 (`Math.round`, half up) | ✅ Met | `Checkout.js:500–501`; §6 |
| R75 | `total` = subtotal − discount + shipping + tax (05:61) | 11 of 11 | ✅ Met | `Checkout.js:502`; §6 |
| R76 | Preserve `storeCreditUsed`, `amountPayable`, `storeCreditReturned`, `pendingRefund`, `refundStatus`, `cancelReason`, `cancelledAt`, `recall` where present (05:61) | kept on orders 5, 8, 9, 10, 11 | ✅ Met | order walk |
| R77 | `amountPayable` = total − `storeCreditUsed` where present (05:61) | 3 of 3 (orders 9–11) | ✅ Met | §6 |

### 5.8 Payments, refunds, returns, wallet (05:63–67)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R78 | `payments[].amount` = the order's `amountPayable` (or `total`) (05:63) | 9 of 9; equals what `createPaymentForOrder` would post | ✅ Met | `api.js:292–321`; §6 payments |
| R79 | `refundAmount` / `refunds[].amount` scaled where a refund was booked; statuses unchanged (05:63) | payments 1, 3, 6 fully refunded, the others 0; payment 5 moved from pending to captured by Prompt 34 | ↪ Superseded by Prompt 34 (fix 12, payment 5) | §6 payments; BUILD_LOG Prompt 34 |
| R80 | `refunds[].amount` = the matching payment or return refund (05:64) | 3 of 3 | ✅ Met | §6 refunds |
| R81 | `returns[].items` snapshots from the linked order (05:65) | 2 of 2 | ✅ Met | §6 returns |
| R82 | `returns[].refundAmount` = Σ returned subtotals + proportional tax, the rule the data uses (05:65) | 16,519 and 8,259 (shipping not refunded) | ✅ Met | §6 returns |
| R83 | `deductionAmount` as is (05:65) | 0, 0 | ✅ Met | returns |
| R84 | Wallet: keep the three rows, their `type`, order links and timestamps (05:66) | unchanged | ✅ Met | walletTransactions |
| R85 | Wallet: `amount`, `balanceBefore`, `balanceAfter` a consistent running balance (05:66) | 0 → 4,302 → 3,302 → 2,302 | ✅ Met | §6 wallet |
| R86 | `users[2].storeCredit` = the ledger's final balance (05:66) | ₹2,302 | ✅ Met | §6 users |
| R87 | The other two users stay 0 (05:66) | 0, 0 | ✅ Met | §6 users |
| R88 | `statusHistory[].note` amounts updated (05:67) | ₹16,519 (order 1, return 1), ₹9,937 (order 3), ₹4,302 ×2 (order 8): each equals the recomputed figure | ✅ Met | §6 states table |

### 5.9 `reviews` and ratings (05:69–76)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R89 | Replace the eight records with 20–26 (05:69) | 26 | ✅ Met | reviews |
| R90 | Keep the key set (05:69) | the 12 keys every original carried, in order (R4) | ✅ Met | `validate-db.js:998` |
| R91 | Only approved reviews count toward `rating`/`totalReviews` (05:71) | yes | ✅ Met | §6 ratings |
| R92 | 3–4 pending, 1–2 rejected (05:71) | 3 pending (2, 9, 21), 2 rejected (5, 18) | ✅ Met | reviews |
| R93 | …so the moderation queue and the order-history "your review" states stay demonstrable (05:71) | the queue holds 3; on `/orders` user 3 sees "Review published" (ORD-MQB0JHUB-9KL6), "Review pending approval" and "Write a review" (ORD-MQDVIQCV-30A9); the boilerplate showed only the Write action (no review sat on a delivered line). "Review not approved" has no delivered line to sit on (O4) | ✅ Met | browser orders/review-chips, orders/write-review |
| R94 | `isVerifiedPurchase: true` only when the user has an order with that product (05:72) | 5 verified, each owned; 21 with `userId: null` and false | ✅ Met | `validate-db.js:1145–1155` |
| R95 | Ratings 3–5 (05:73) | 3, 4, 5 only | ✅ Met | reviews |
| R96 | Titles ≤ 60 characters (05:73) | longest 38 | ✅ Met | reviews |
| R97 | Bodies 1–3 sentences in a natural customer voice, not marketing (05:73) | reviews 6, 10, 11, 17 re-worded: no health effect, no unconfirmed service, nothing the product data does not back; all 26 are 1–2 plain sentences | ✅ Met: repaired by V2-04 (was gap) | §9.4; `validate-db.js` V2-04 (health, service, sentences); browser repairs/review-*; as found: reviews 6, 10, 11, 17; `legalContent.js:327–328`; product 21's description |
| R98 | `helpfulCount` 0–12 (05:73) | 0–11 | ✅ Met | `validate-db.js:1151` |
| R99 | Dates after the order date (05:73) | each verified review follows an order of its product | ✅ Met | `validate-db.js:1155` |
| R100 | 14–18 distinct products across all departments (05:74) | 17 products; all six departments (approved reviews too) | ✅ Met | reviews |
| R101 | Several products keep `totalReviews: 0` (05:74) | 69 of 84 | ✅ Met | browser pdp/empty-state |
| R102 | `rating` = mean of approved, one decimal; `totalReviews` = count; 0/0 elsewhere (05:75) | 84 of 84 | ✅ Met | §6 ratings |
| R103 | Seeded reviews listed under "Remove or replace before launch" (05:76) | listed | ✅ Met | BUILD_LOG Prompt 05; `00_INDEX.md` §7 |

### 5.10 `wishlist` and `leads` (05:78–84)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R104 | User 3's three rows point at three new products (05:80) | 48, 31, 37: active | ✅ Met | §6 wishlist |
| R105 | Correct snapshots: `slug`, `name`, `image`, `brand`, `price`, `comparePrice`, `rating`, `totalReviews`, `shortDescription`, `variants`, `stock`, `trending`, `hot` (05:80) | 14 fields each equal `buildWishlistItem(product)` today | ✅ Met | `WishlistContext.js:44`; §6 wishlist |
| R106 | Leads: keep the four; `orderNumber` still matches (05:84) | ORD-20250310-0001 and ORD-MQC1HWSZ-CAN8 resolve | ✅ Met | `validate-db.js:1186–1188` |

### 5.11 Functional guardrails (05:86–94)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R107 | 1. Content only; key sets unchanged in every collection (05:88) | unchanged, apart from Prompt 34's `deliveredAt` on order 1 (a key orders 7, 8 and 11 carry) | ✅ Met | key walk (§2); BUILD_LOG Prompt 34 |
| R108 | 1. No new collection (05:88) | 18 collections in the boilerplate's order | ✅ Met | `Object.keys(db)` |
| R109 | 1. `api.js` untouched (05:88) | untouched by Prompt 05; later owner-approved follow-ups (Prompt 32) recorded; SHA-256 `c32e6138…` | ✅ Met | `git show --stat d807ce4`; `00_INDEX.md` §5 item 27 |
| R110 | 1. The one code change is `FREE_SHIPPING_THRESHOLD` (05:88) | yes | ✅ Met | `git show --stat d807ce4` |
| R111 | 2. `banners.gradient` takes its value from `DESIGN_SYSTEM.md` (05:89) | `#0b1f3f` (R59) | ✅ Met: repaired by V2-04 (was partial) | R59; as found: R59 |
| R112 | 3. Admin → Orders, Returns, Payments, Coupons, Reviews, Shipping, Special Offers, Settings, Users open every record and dialog without errors (05:90) | 11 order, 2 return, 9 payment, 5 coupon, 4 shipping and 3 user dialogs open; 26 reviews, 4 leads; Settings and Special Offers load; console clean | ✅ Met | browser admin/* (§7) |
| R113 | 3. A refund flow on a reseeded order still cascades (05:90) | processing RET-20260612-0002 through the admin books ₹8,259 onto payment 4 (`partially_refunded`), returns order 6, writes a `return_refund` record; a customer cancel of ORD-MQCGV6OM-Z965 opens a ₹37,939 refund and returns ₹1,000 of credit; scratch copy, restored | ✅ Met | browser cascade/*, cancel/* (§7) |
| R114 | 4. Brand voice in hero copy (05:91) | calm, factual | ✅ Met | R51 |
| R115 | 4. Brand voice in coupon descriptions (05:91) | WELCOME500 re-worded (R43); the others were honest | ✅ Met: repaired by V2-04 (was partial) | R43; as found: R43 |
| R116 | 4. Brand voice in shipping names; no "non-premium" (05:91) | the spec's four names (Prompt 29's lower-case proposal is the client's call); no "non-premium" anywhere | ✅ Met | shipping_methods; `00_INDEX.md` §6 |
| R117 | 5. Responsive/accessible: not applicable (05:92) | — | ✅ Met | n/a |
| R118 | 6. Ratings only from seeded reviews (05:93) | yes | ✅ Met | R102 |
| R119 | 6. No inflated `helpfulCount` (05:93) | 0–11, 87 in all over 26 reviews | ✅ Met | reviews |
| R120 | 6. Coupon `usedCount` modest and below `usageLimit` for active codes (05:93) | 14/500, 37/—, 9/—, 6/100; each at least the seeded orders that used it | ✅ Met | coupons; §6 |
| R121 | 6. No fabricated trust signals in the seeded reviews (05:93) | no seeded review states a health effect or an unconfirmed service (R97) | ✅ Met: repaired by V2-04 (was partial) | R97; as found: R97 |
| R122 | 7. Test before done (05:94) | Prompt 05's verification section | ✅ Met | BUILD_LOG Prompt 05 |

### 5.12 Implementation notes and the validator (05:96–101)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R123 | 1. Read the listed files (05:98) | cited in Prompt 05's entry | ✅ Met | BUILD_LOG Prompt 05 |
| R124 | 2. Do the cascade with a script; before/after table in the build log (05:99) | four tables | ✅ Met | BUILD_LOG lines 538–575 |
| R125 | 3. Full mode: orders/returns/reviews/wishlist/deals references exist (05:100) | yes | ✅ Met | `validate-db.js:924–953` |
| R126 | 3. Order money math holds (05:100) | delivery is now matched against the active methods only; the coupon's minimum, validity and per-customer limit and the item price are checked | ✅ Met: repaired by V2-04 (was partial) | §10; `validate-db.js` V2-04 (orders); as found: `validate-db.js:1076` |
| R127 | 3. Payment amounts match orders (05:100) | yes | ✅ Met | `validate-db.js:1089–1101` |
| R128 | 3. Wallet ledger a running balance equal to `users[].storeCredit` (05:100) | yes | ✅ Met | `validate-db.js:963–979` |
| R129 | 3. `rating`/`totalReviews` match approved reviews (05:100) | yes | ✅ Met | `validate-db.js:955–961` |
| R130 | 3. Active coupon invariants (05:100) | yes | ✅ Met | `validate-db.js:1032–1048` |
| R131 | 3. `FREE_SHIPPING_THRESHOLD` = Standard `freeAbove`, read with a regex (05:100) | yes | ✅ Met | `validate-db.js:1019–1026` |
| R132 | 4. Demo accounts remain (05:101) | the four credentials unchanged | ✅ Met | users, admins |

### 5.13 Acceptance criteria (05:103–110)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R133 | Every collection reseeded as listed, identical key sets; full mode passes (05:105) | yes (the gaps above are content and consistency, not shape) | ✅ Met | R4, R107; validator ✓ |
| R134 | `/orders` per demo user with new names and images; cancel only where allowed; the wallet shows the ledger and the profile's balance (05:106) | user 3: 7 orders, names, images, summary figures, 2 cancel buttons on the 2 processing orders; users 1 and 2 load theirs; wallet ₹2,302.00 with 3 rows = checkout's "Available balance" | ✅ Met | browser orders/*, wallet/*, checkout/available-credit |
| R135 | Product pages show seeded reviews and matching rating/count; the honest empty state elsewhere (05:107) | Wooden Sofa Set 4.7 / 3 (pending hidden); Mesh High-Back Chair and Carlton Mattress 4.5 / 2; L-Shaped Sofa "No reviews yet." | ✅ Met | browser pdp/* |
| R136 | `/special-offers` shows the coupons and products with a live countdown (05:108) | WELCOME500, FLAT10; 3 + 8 products; the seconds tick | ✅ Met | browser offers/* |
| R137 | Checkout: methods, COD and WELCOME500 with the new values; the free-delivery line at the new threshold (05:109) | a ₹9,999 cart: Standard "Free" (the threshold is inclusive), Express ₹999, WELCOME500 −₹500, tax ₹1,710, total ₹11,209, ₹2,302 credit, ₹8,907 payable by COD | ✅ Met | browser checkout/* |
| R138 | Admin modules open every reseeded record; the dashboard stats compute (05:110) | R112; dashboard: ₹2,07,119, 11 orders, 84 products, 3 users, 5 pending orders, 1 pending return, 4 active coupons | ✅ Met | browser admin/dashboard |

### 5.14 Test and QA (05:112–119)

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R139 | 1. As `mail4bappidas@gmail.com`: `/orders` (expand, tracking, return/exchange), wallet, `/wishlist` (move to cart), a reviewed product page, `/special-offers` (copy a code), checkout to Review with COD and store credit (05:114) | all walked; "Return or exchange" is the Support link since Prompt 24 (no return form, `00_INDEX.md` §5 item 19): with a delivery moved to two days ago on the scratch copy it opens `/support?order=ORD-MQB0JHUB-9KL6&category=returns` prefilled | ✅ Met | browser (§7) |
| R140 | 2. Widths 360, 768, 1024, 1440: order cards and review lists (05:115) | no horizontal overflow at any width | ✅ Met | browser width/* |
| R141 | 3. Keyboard: not applicable beyond existing flows (05:116) | — | ✅ Met | n/a |
| R142 | 4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0 (05:117) | baseline: 86 suites, 1,429 tests, exit 0 | ✅ Met | §1 gate at the start |
| R143 | 5. Admin: an order with a refund, Returns, Payments (refund history), Coupons, Reviews (approve, then revert), Special Offers, Settings (save without change), Users (05:118) | all done on the scratch copy; the settings save leaves `settings` identical | ✅ Met | browser admin/*, moderation/*, admin/settings-save-unchanged |
| R144 | 6. Build-log entry: changes per collection, cascade table, review/rating mapping, "Needs client confirmation", "Remove or replace before launch" (05:119) | all present | ✅ Met | BUILD_LOG lines 507–652 |

### 5.15 Deep checks of the V2-04 prompt not already rows above

| # | Requirement | Current state | Status | Evidence |
|---|---|---|---|---|
| R145 | Settings: every key present versus `90402a2` | see R19 | ✅ Met | R19 |
| R146 | Coupons: values, caps, minimums as specified; `usedCount` modest and below `usageLimit` | see R42–R47, R120 | ✅ Met | R42–R47 |
| R147 | Deals re-checked after any V2-02/03 price fix | no price changed; the 11 picks keep their discounts | ✅ Met | V2-02, V2-03 field walks; R54, R55 |
| R148 | Each order item a faithful snapshot of a current product and variant; decide on historic prices | decision: historic orders keep their snapshot prices (the realistic rule); today every snapshot also equals the catalogue | ✅ Met | R66–R70 |
| R149 | The coupon's `minOrder` satisfied | orders 2, 4, 7: 28,998 ≥ 5,000; 3,196 ≥ 2,000; 8,998 ≥ 5,000 | ✅ Met | §6 |
| R150 | Order status agrees with `statusHistory` and with returns | order 5's payment `voided`, with the "Payment voided" / "No captured payment to refund" event `orders.cancel` writes, at the cancellation's instant; every order now agrees with its timeline, its returns and the cancel cascade | ✅ Met: repaired by V2-04 (was gap) | §9.5; recomputation §6.7 (status 0); browser repairs/order5-*; as found: `api.js:614–676, 1237–1260`; §6 states table |
| R151 | A return's status agrees with its own timeline (the same rule, applied to returns) | return 1 `refunded`; Admin → Returns shows its refund outcome and offers no further step | ✅ Met: repaired by V2-04 (was gap) | §9.6; browser repairs/return-refunded; as found: `AdminReturns.js:134–147, 214–242, 550–553`; boilerplate state kept by Prompt 05 |
| R152 | `paymentStatus` agrees with payments (no pending payment on a paid order) | paid ↔ captured ×6, refunded ↔ refunded ×3; orders 4 and 5 (cash on delivery) have no payment record (the boilerplate's; counts are frozen) | ✅ Met | §6 states table |
| R153 | Timestamps monotonic: `createdAt` ≤ each history entry ≤ `updatedAt` | 11 of 11: orders 7, 8 and 11's `updatedAt` = their last event | ✅ Met: repaired by V2-04 (was gap) | §9.7; recomputation §6.7; `validate-db.js` V2-04 (timeline); as found: §6 states table; `api.js:1829–1847, 1925–1960` |
| R154 | `statusHistory[].note` amounts match the recomputed money | see R88 | ✅ Met | R88 |
| R155 | `refunds[]` match payment or return refunds | see R80 | ✅ Met | R80 |
| R156 | `returns[]`: snapshots, refund rule, deduction | see R81–R83 | ✅ Met | R81–R83 |
| R157 | Wallet: three rows, chain consistent, final = `users[2].storeCredit`, others 0; `computeWalletBalance` run in Node gives the same | `readWalletBalance` (the function `computeWalletBalance` wraps), lifted from `api.js` and run on the data: 0 / 0 / 2,302 | ✅ Met | §6 users |
| R158 | Reviews: verified truth; date after the related order | see R94, R99 | ✅ Met | R94, R99 |
| R159 | Ratings for all 84 products | see R102 | ✅ Met | R102 |
| R160 | Wishlist: existing active products, every snapshot field equal | see R104, R105 | ✅ Met | R104, R105 |
| R161 | Leads: four; every `orderNumber` resolves | see R106 | ✅ Met | R106 |
| R162 | Validator full mode asserts everything machine-checkable: verified-purchase truth, wishlist equality, deal-of-the-day discount, `seo` ↔ `index.html`, … | every machine-checkable rule asserted (§10); 69 seeded faults all reported; the as-found seed fails with 20 problems, the repaired seed passes | ✅ Met: repaired by V2-04 (was gap) | §10; as found: `validate-db.js:922–1219` |
| R163 | V2-02 F2 / V2-03 F2: orders and reviews dated before their product's `createdAt` | reviews 2, 3, 4 and the three wishlist rows follow their product; the 7 orders stay, by recorded decision (their numbers encode their timestamps) | ✅ Met: repaired by V2-04 (was gap) | §9.8; recomputation §6.8 (dates 0, orders listed); as found: §6 dates table |
| R164 | V2-03 F3: health effects in seeded reviews 11 and 17 | reviews 11 and 17 re-worded (R97) | ✅ Met: repaired by V2-04 (was partial) | R97; as found: R97 |
| R165 | Demo accounts all log in and behave as before | see R6, R132 | ✅ Met | browser |

## 6. Stored vs recomputed

Output of `node recompute.cjs` on the repaired seed (`a15d361a…`). "→" separates the stored value from the recomputed one; "\|" separates the independent re-implementation from the app's own expression. **Before the repairs** (commit `8c7460e`, §6 there) every stored figure already equalled its recomputation; that run flagged 11 rows, none a figure: orders 2 and 7 (a "first order" coupon on a later order, R43), the states and timelines of orders 5, 7, 8 and 11 (R150, R153) and five dates (reviews 2, 3, 4 and wishlist rows 1, 2, R163). Now: 0.

### 6.1 Orders: money (stored → recomputed: independent | code)

| Order | Items rebuilt from the catalogue | Subtotal | Coupon → discount | Delivery → shipping | Tax (18%) | Total | Store credit (ledger) | Payable | |
|---|---|---|---|---|---|---|---|---|---|
| 1 ORD-20250310-0001 | Executive Mesh High-Back Chair - Black ×1 @ ₹13,999 | ₹13,999 → ₹13,999 \| ₹13,999 | none: ₹0 → ₹0 | ₹0 | Standard (₹499, free ≥ ₹9,999): ₹0 → ₹0 \| ₹0 | ₹2,520 → ₹2,520 \| ₹2,520 | ₹16,519 → ₹16,519 \| ₹16,519 | — (₹0) | — → ₹16,519 \| ₹16,519 | ✅ |
| 2 ORD-20250318-0002 | Winsome Office Table - 150 × 75 cm ×1 @ ₹16,999; Ergonomic Mesh Low-Back Chair - Black ×1 @ ₹11,999 | ₹28,998 → ₹28,998 \| ₹28,998 | WELCOME500 (₹500, min ₹5,000): ₹500 → ₹500 | ₹500 | Standard (₹499, free ≥ ₹9,999): ₹0 → ₹0 \| ₹0 | ₹5,130 → ₹5,130 \| ₹5,130 | ₹33,628 → ₹33,628 \| ₹33,628 | — (₹0) | — → ₹33,628 \| ₹33,628 | ✅ |
| 3 ORD-20260310-0003 | Cane-Look Café Chair - Natural Cane ×2 @ ₹3,999 | ₹7,998 → ₹7,998 \| ₹7,998 | none: ₹0 → ₹0 | ₹0 | Standard (₹499, free ≥ ₹9,999): ₹499 → ₹499 \| ₹499 | ₹1,440 → ₹1,440 \| ₹1,440 | ₹9,937 → ₹9,937 \| ₹9,937 | — (₹0) | — → ₹9,937 \| ₹9,937 | ✅ |
| 4 ORD-20260315-0004 | Stackable Plastic Chair - White ×4 @ ₹799 | ₹3,196 → ₹3,196 \| ₹3,196 | FLAT10 (10%, cap ₹2,000, min ₹2,000): ₹320 → ₹320 | ₹320 | Standard (₹499, free ≥ ₹9,999): ₹499 → ₹499 \| ₹499 | ₹518 → ₹518 \| ₹518 | ₹3,893 → ₹3,893 \| ₹3,893 | — (₹0) | — → ₹3,893 \| ₹3,893 | ✅ |
| 5 ORD-MMYJ01ED-ZR26 | Jhula (Garden Swing) - Small ×1 @ ₹11,999 | ₹11,999 → ₹11,999 \| ₹11,999 | none: ₹0 → ₹0 | ₹0 | Standard (₹499, free ≥ ₹9,999): ₹0 → ₹0 \| ₹0 | ₹2,160 → ₹2,160 \| ₹2,160 | ₹14,159 → ₹14,159 \| ₹14,159 | — (₹0) | — → ₹14,159 \| ₹14,159 | ✅ |
| 6 ORD-MQA9I6E7-0IR2 | Leatherette High-Back Office Chair - Tan ×1 @ ₹6,999 | ₹6,999 → ₹6,999 \| ₹6,999 | none: ₹0 → ₹0 | ₹0 | Standard (₹499, free ≥ ₹9,999): ₹499 → ₹499 \| ₹499 | ₹1,260 → ₹1,260 \| ₹1,260 | ₹8,758 → ₹8,758 \| ₹8,758 | — (₹0) | — → ₹8,758 \| ₹8,758 | ✅ |
| 7 ORD-MQB0JHUB-9KL6 | Wooden Bedside Table - Walnut ×2 @ ₹4,499 | ₹8,998 → ₹8,998 \| ₹8,998 | WELCOME500 (₹500, min ₹5,000): ₹500 → ₹500 | ₹500 | Standard (₹499, free ≥ ₹9,999): ₹499 → ₹499 \| ₹499 | ₹1,530 → ₹1,530 \| ₹1,530 | ₹10,527 → ₹10,527 \| ₹10,527 | — (₹0) | — → ₹10,527 \| ₹10,527 | ✅ |
| 8 ORD-MQC1HWSZ-CAN8 | Wall Mirror - Walnut ×1 @ ₹2,799 | ₹2,799 → ₹2,799 \| ₹2,799 | none: ₹0 → ₹0 | ₹0 | Express (₹999, free ≥ never): ₹999 → ₹999 \| ₹999 | ₹504 → ₹504 \| ₹504 | ₹4,302 → ₹4,302 \| ₹4,302 | — (₹0) | — → ₹4,302 \| ₹4,302 | ✅ |
| 9 ORD-MQCGV6OM-Z965 | Wooden Sofa Set - Sand Beige ×1 @ ₹32,999 | ₹32,999 → ₹32,999 \| ₹32,999 | none: ₹0 → ₹0 | ₹0 | Standard (₹499, free ≥ ₹9,999): ₹0 → ₹0 \| ₹0 | ₹5,940 → ₹5,940 \| ₹5,940 | ₹38,939 → ₹38,939 \| ₹38,939 | ₹1,000 (₹1,000) | ₹37,939 → ₹37,939 \| ₹37,939 | ✅ |
| 10 ORD-MQDUWC74-RUVY | Queen Size Bed - Walnut ×1 @ ₹27,999; Carlton Mattress - Queen ×1 @ ₹19,999 | ₹47,998 → ₹47,998 \| ₹47,998 | none: ₹0 → ₹0 | ₹0 | Standard (₹499, free ≥ ₹9,999): ₹0 → ₹0 \| ₹0 | ₹8,640 → ₹8,640 \| ₹8,640 | ₹56,638 → ₹56,638 \| ₹56,638 | ₹0 (₹0) | ₹56,638 → ₹56,638 \| ₹56,638 | ✅ |
| 11 ORD-MQDVIQCV-30A9 | 4-Seater Plastic Dining Set - Marble Beige ×1 @ ₹5,999; Slim Plastic Shoe Rack - 4 shelves ×1 @ ₹1,899 | ₹7,898 → ₹7,898 \| ₹7,898 | none: ₹0 → ₹0 | ₹0 | Standard (₹499, free ≥ ₹9,999): ₹499 → ₹499 \| ₹499 | ₹1,422 → ₹1,422 \| ₹1,422 | ₹9,819 → ₹9,819 \| ₹9,819 | ₹1,000 (₹1,000) | ₹8,819 → ₹8,819 \| ₹8,819 | ✅ |

### 6.2 Order items against today's catalogue (name · image · SKU · price · subtotal)

| Order · line | Stored name | Rebuilt by checkout's mapper | image | SKU (stored / variant) | price (stored / variant) | subtotal | |
|---|---|---|---|---|---|---|---|
| 1 · 0 | Executive Mesh High-Back Chair - Black | Executive Mesh High-Back Chair - Black | first image ✓ | OFP-HBK-01-BLK / OFP-HBK-01-BLK | ₹13,999 / ₹13,999 | ₹13,999 = ₹13,999 | ✅ |
| 2 · 0 | Winsome Office Table - 150 × 75 cm | Winsome Office Table - 150 × 75 cm | first image ✓ | OFT-OFF-01-150 / OFT-OFF-01-150 | ₹16,999 / ₹16,999 | ₹16,999 = ₹16,999 | ✅ |
| 2 · 1 | Ergonomic Mesh Low-Back Chair - Black | Ergonomic Mesh Low-Back Chair - Black | first image ✓ | OFP-LBK-02-BLK / OFP-LBK-02-BLK | ₹11,999 / ₹11,999 | ₹11,999 = ₹11,999 | ✅ |
| 3 · 0 | Cane-Look Café Chair - Natural Cane | Cane-Look Café Chair - Natural Cane | first image ✓ | CAF-CHR-04-CNE / CAF-CHR-04-CNE | ₹3,999 / ₹3,999 | ₹7,998 = ₹7,998 | ✅ |
| 4 · 0 | Stackable Plastic Chair - White | Stackable Plastic Chair - White | first image ✓ | PLE-CHR-03-WHT / PLE-CHR-03-WHT | ₹799 / ₹799 | ₹3,196 = ₹3,196 | ✅ |
| 5 · 0 | Jhula (Garden Swing) - Small | Jhula (Garden Swing) - Small | first image ✓ | OUT-JHL-01-SM / OUT-JHL-01-SM | ₹11,999 / ₹11,999 | ₹11,999 = ₹11,999 | ✅ |
| 6 · 0 | Leatherette High-Back Office Chair - Tan | Leatherette High-Back Office Chair - Tan | first image ✓ | OFE-HBK-03-TAN / OFE-HBK-03-TAN | ₹6,999 / ₹6,999 | ₹6,999 = ₹6,999 | ✅ |
| 7 · 0 | Wooden Bedside Table - Walnut | Wooden Bedside Table - Walnut | first image ✓ | BED-BST-01-WAL / BED-BST-01-WAL | ₹4,499 / ₹4,499 | ₹8,998 = ₹8,998 | ✅ |
| 8 · 0 | Wall Mirror - Walnut | Wall Mirror - Walnut | first image ✓ | BED-MIR-02-WAL / BED-MIR-02-WAL | ₹2,799 / ₹2,799 | ₹2,799 = ₹2,799 | ✅ |
| 9 · 0 | Wooden Sofa Set - Sand Beige | Wooden Sofa Set - Sand Beige | first image ✓ | LIV-SOF-01-BGE / LIV-SOF-01-BGE | ₹32,999 / ₹32,999 | ₹32,999 = ₹32,999 | ✅ |
| 10 · 0 | Queen Size Bed - Walnut | Queen Size Bed - Walnut | first image ✓ | BED-BED-02-WAL / BED-BED-02-WAL | ₹27,999 / ₹27,999 | ₹27,999 = ₹27,999 | ✅ |
| 10 · 1 | Carlton Mattress - Queen | Carlton Mattress - Queen | first image ✓ | BED-MAT-01-QN / BED-MAT-01-QN | ₹19,999 / ₹19,999 | ₹19,999 = ₹19,999 | ✅ |
| 11 · 0 | 4-Seater Plastic Dining Set - Marble Beige | 4-Seater Plastic Dining Set - Marble Beige | first image ✓ | PLD-DIN-01-BGE / PLD-DIN-01-BGE | ₹5,999 / ₹5,999 | ₹5,999 = ₹5,999 | ✅ |
| 11 · 1 | Slim Plastic Shoe Rack - 4 shelves | Slim Plastic Shoe Rack - 4 shelves | first image ✓ | PLE-SHR-01-4S / PLE-SHR-01-4S | ₹1,899 / ₹1,899 | ₹1,899 = ₹1,899 | ✅ |

### 6.3 Payments (amount by `createPaymentForOrder`; refunds by the cascade that booked them)

| Payment | Order | Amount stored → recomputed \| code | Status stored → expected | storeCreditApplied | Refunded stored → recomputed | refunds[] | |
|---|---|---|---|---|---|---|---|
| 1 | 1 ORD-20250310-0001 | ₹16,519 → ₹16,519 \| ₹16,519 | refunded → refunded | — | ₹16,519 → ₹16,519 (return RET-20260120-0001 ₹16,519) | ₹16,519 | ✅ |
| 2 | 2 ORD-20250318-0002 | ₹33,628 → ₹33,628 \| ₹33,628 | captured → captured | — | — → ₹0 | [] | ✅ |
| 3 | 3 ORD-20260310-0003 | ₹9,937 → ₹9,937 \| ₹9,937 | refunded → refunded | — | ₹9,937 → ₹9,937 (full refund ₹9,937) | ₹9,937 | ✅ |
| 4 | 6 ORD-MQA9I6E7-0IR2 | ₹8,758 → ₹8,758 \| ₹8,758 | captured → captured | — | ₹0 → ₹0 | [] | ✅ |
| 5 | 7 ORD-MQB0JHUB-9KL6 | ₹10,527 → ₹10,527 \| ₹10,527 | captured → captured | — | ₹0 → ₹0 | [] | ✅ |
| 6 | 8 ORD-MQC1HWSZ-CAN8 | ₹4,302 → ₹4,302 \| ₹4,302 | refunded → refunded | — | ₹4,302 → ₹4,302 (full refund ₹4,302) | ₹4,302 | ✅ |
| 7 | 9 ORD-MQCGV6OM-Z965 | ₹37,939 → ₹37,939 \| ₹37,939 | captured → captured | ₹1,000 | — → ₹0 | [] | ✅ |
| 8 | 10 ORD-MQDUWC74-RUVY | ₹56,638 → ₹56,638 \| ₹56,638 | captured → captured | ₹0 | — → ₹0 | [] | ✅ |
| 9 | 11 ORD-MQDVIQCV-30A9 | ₹8,819 → ₹8,819 \| ₹8,819 | captured → captured | ₹1,000 | — → ₹0 | [] | ✅ |

Orders without a payment record (the boilerplate's, kept: record counts are frozen): 4 ORD-20260315-0004 (cod, pending); 5 ORD-MMYJ01ED-ZR26 (cod, voided).

### 6.4 Returns (`refundAmount` = returned item subtotals + their share of the order's tax; payable = refundAmount − deduction)

| Return | Order | Items (from the order) | Item subtotals | Tax share | refundAmount stored → recomputed | Deduction | Payable | What processing books | |
|---|---|---|---|---|---|---|---|---|---|
| 1 RET-20260120-0001 (refunded, refund processed) | 1 ORD-20250310-0001 | Executive Mesh High-Back Chair - Black ×1 ✓ | ₹13,999 | ₹2,520 | ₹16,519 → ₹16,519 | ₹0 | ₹16,519 | ₹16,519 onto payment 1 (₹16,519) → refunded, full return | ✅ |
| 2 RET-20260612-0002 (requested, refund pending) | 6 ORD-MQA9I6E7-0IR2 | Leatherette High-Back Office Chair - Tan ×1 ✓ | ₹6,999 | ₹1,260 | ₹8,259 → ₹8,259 | ₹0 | ₹8,259 | ₹8,259 onto payment 4 (₹8,758) → partially_refunded, full return | ✅ |

### 6.5 Refunds ledger

| Refund | Type · method | Order | Source | Amount stored → recomputed | Status | |
|---|---|---|---|---|---|---|
| 1 REF-20260122-7K2A | return_refund · original_payment | 1 ORD-20250310-0001 | return RET-20260120-0001 payable | ₹16,519 → ₹16,519 | completed | ✅ |
| 2 REF-20260613-9QM4 | order_refund · original_payment | 3 ORD-20260310-0003 | payment 3's booked refund | ₹9,937 → ₹9,937 | completed | ✅ |
| 3 REF-20260613-JQ3L | order_refund · store_credit | 8 ORD-MQC1HWSZ-CAN8 | order refund settled on payment 6 (= order refundedAmount) | ₹4,302 → ₹4,302 | completed | ✅ |

### 6.6 Store-credit ledger (rebuilt from the cascade, oldest first)

| Tx | User | Type | Source | Amount stored → recomputed | Before stored → recomputed | After stored → recomputed | |
|---|---|---|---|---|---|---|---|
| 1 | 3 | credit | refund REF-20260613-JQ3L | ₹4,302 → ₹4,302 | ₹0 → ₹0 | ₹4,302 → ₹4,302 | ✅ |
| 2 | 3 | debit | order ORD-MQCGV6OM-Z965 storeCreditUsed | ₹1,000 → ₹1,000 | ₹4,302 → ₹4,302 | ₹3,302 → ₹3,302 | ✅ |
| 3 | 3 | debit | order ORD-MQDVIQCV-30A9 storeCreditUsed | ₹1,000 → ₹1,000 | ₹3,302 → ₹3,302 | ₹2,302 → ₹2,302 | ✅ |

| User | storeCredit stored | Ledger (recomputed) | `readWalletBalance` (api.js, run on the data) | |
|---|---|---|---|---|
| 1 user@example.com | ₹0 | ₹0 | ₹0 | ✅ |
| 2 jane@example.com | ₹0 | ₹0 | ₹0 | ✅ |
| 3 mail4bappidas@gmail.com | ₹2,302 | ₹2,302 | ₹2,302 | ✅ |

### 6.7 Order states and timelines

| Order | payment · fulfilment · shipping | Displayed (`deriveOrderStatus`) | Payment record | Timeline order (createdAt ≤ events ≤ updatedAt) | ₹ in notes = recomputed | |
|---|---|---|---|---|---|---|
| 1 ORD-20250310-0001 | refunded · returned · delivered | returned | 1 refunded ✓ | ✓ | ₹16,519 ✓ | ✅ |
| 2 ORD-20250318-0002 | paid · fulfilled · shipped | shipped | 2 captured ✓ | ✓ | none | ✅ |
| 3 ORD-20260310-0003 | refunded · unfulfilled · pending | cancelled | 3 refunded ✓ | ✓ | ₹9,937 ✓ | ✅ |
| 4 ORD-20260315-0004 | pending · fulfilled · shipped | shipped | none ✓ | ✓ | none | ✅ |
| 5 ORD-MMYJ01ED-ZR26 | voided · cancelled · pending | cancelled | none ✓ | ✓ | none | ✅ |
| 6 ORD-MQA9I6E7-0IR2 | paid · fulfilled · shipped | shipped | 4 captured ✓ | ✓ | none | ✅ |
| 7 ORD-MQB0JHUB-9KL6 | paid · fulfilled · delivered | delivered | 5 captured ✓ | ✓ | none | ✅ |
| 8 ORD-MQC1HWSZ-CAN8 | refunded · fulfilled · delivered | cancelled | 6 refunded ✓ | ✓ | ₹4,302, ₹4,302 ✓ | ✅ |
| 9 ORD-MQCGV6OM-Z965 | paid · unfulfilled · pending | processing | 7 captured ✓ | ✓ | none | ✅ |
| 10 ORD-MQDUWC74-RUVY | paid · unfulfilled · pending | processing | 8 captured ✓ | ✓ | none | ✅ |
| 11 ORD-MQDVIQCV-30A9 | paid · fulfilled · delivered | delivered | 9 captured ✓ | ✓ | none | ✅ |

Other timelines: return 1 ✓ · return 2 ✓ · payment 1 ✓ · payment 2 ✓ · payment 3 ✓ · payment 4 ✓ · payment 5 ✓ · payment 6 ✓ · payment 7 ✓ · payment 8 ✓ · payment 9 ✓ · refund 1 ✓ · refund 2 ✓ · refund 3 ✓.

### 6.8 Dates against the catalogue record (`createdAt` of the product)

| Record | Its date | Product · created | |
|---|---|---|---|
| order 1 ORD-20250310-0001 | 2026-01-15 | 29 Executive Mesh High-Back Chair · 2026-08-05 | ↪ kept (frozen number / Prompt 05) |
| order 2 ORD-20250318-0002 | 2026-02-01 | 76 Winsome Office Table · 2026-07-09 | ↪ kept (frozen number / Prompt 05) |
| order 2 ORD-20250318-0002 | 2026-02-01 | 33 Ergonomic Mesh Low-Back Chair · 2026-08-03 | ↪ kept (frozen number / Prompt 05) |
| order 3 ORD-20260310-0003 | 2026-03-10 (the number encodes it) | 40 Cane-Look Café Chair · 2026-06-11 | ↪ kept (frozen number / Prompt 05) |
| order 4 ORD-20260315-0004 | 2026-03-15 (the number encodes it) | 6 Stackable Plastic Chair · 2026-06-06 | ↪ kept (frozen number / Prompt 05) |
| order 5 ORD-MMYJ01ED-ZR26 | 2026-03-20 (the number encodes it) | 20 Jhula (Garden Swing) · 2026-07-17 | ↪ kept (frozen number / Prompt 05) |
| order 8 ORD-MQC1HWSZ-CAN8 | 2026-06-13 (the number encodes it) | 63 Wall Mirror · 2026-08-19 | ↪ kept (frozen number / Prompt 05) |
| order 11 ORD-MQDVIQCV-30A9 | 2026-06-14 (the number encodes it) | 82 4-Seater Plastic Dining Set · 2026-07-11 | ↪ kept (frozen number / Prompt 05) |
| order 11 ORD-MQDVIQCV-30A9 | 2026-06-14 (the number encodes it) | 9 Slim Plastic Shoe Rack · 2026-09-05 | ↪ kept (frozen number / Prompt 05) |

Reviews and wishlist rows dated before their product: 0. Orders dated before a product they contain (documented exceptions, not counted): 9 (order 1 → 29, order 2 → 76, order 2 → 33, order 3 → 40, order 4 → 6, order 5 → 20, order 8 → 63, order 11 → 82, order 11 → 9).

### 6.9 Deals config (the offers page's own rules: `isCouponValid`, `getProductMaxDiscount`)

| Slot | Record | Active | Price → compare-at | Discount | Department | |
|---|---|---|---|---|---|---|
| coupon | WELCOME500: ₹500 off orders above ₹5,000 | yes, expires 2027-03-31, 14/500 used | — | ₹500 | — | ✅ |
| coupon | FLAT10: 10% off orders above ₹2,000, up to ₹2,000 | yes, expires 2027-06-30, 37/∞ used | — | 10% | — | ✅ |
| deal of the day | 47 Wooden Sofa Set | yes | ₹32,999 → ₹37,999 | 13% | Home Furniture | ✅ |
| deal of the day | 21 Mesh High-Back Office Chair | yes | ₹5,999 → ₹6,999 | 14% | Office Chairs | ✅ |
| deal of the day | 12 Cushioned Plastic Armchair | yes | ₹2,499 → ₹2,899 | 14% | Plastic Furniture | ✅ |
| grid | 19 Lobby Set | yes | ₹22,999 → ₹26,499 | 13% | Outdoor Furniture | ✅ |
| grid | 29 Executive Mesh High-Back Chair | yes | ₹13,999 → ₹15,999 | 13% | Office Chairs | ✅ |
| grid | 40 Cane-Look Café Chair | yes | ₹3,999 → ₹4,599 | 13% | Café & Restaurant Chairs | ✅ |
| grid | 55 King Size Bed | yes | ₹34,999 → ₹39,999 | 13% | Home Furniture | ✅ |
| grid | 74 6-Seater Dining Set | yes | ₹34,999 → ₹39,999 | 13% | Home Furniture | ✅ |
| grid | 78 Winsome Computer Table | yes | ₹8,499 → ₹9,499 | 11% | Office Tables & Desks | ✅ |
| grid | 81 Workshop Reading Table | yes | ₹4,199 → ₹4,799 | 13% | Office Tables & Desks | ✅ |
| grid | 84 Nilkamal Plastic Sofa Set | yes | ₹12,999 → ₹14,999 | 13% | Plastic Furniture | ✅ |

Grid departments: 6 (Outdoor Furniture, Office Chairs, Café & Restaurant Chairs, Home Furniture, Office Tables & Desks, Plastic Furniture).

### 6.10 Ratings (approved reviews only; mean rounded to one decimal)

| Product | Approved ratings | rating stored → recomputed | totalReviews stored → recomputed | pending / rejected | |
|---|---|---|---|---|---|
| 2 Ribbed-Back Plastic Armchair | 4, 4 | 4 → 4 | 2 → 2 | 0 / 0 | ✅ |
| 6 Stackable Plastic Chair | — | 0 → 0 | 0 → 0 | 0 / 1 | ✅ |
| 9 Slim Plastic Shoe Rack | — | 0 → 0 | 0 → 0 | 1 / 0 | ✅ |
| 11 Covered Plastic Shoe Rack | 4 | 4 → 4 | 1 → 1 | 0 / 0 | ✅ |
| 12 Cushioned Plastic Armchair | 4 | 4 → 4 | 1 → 1 | 1 / 0 | ✅ |
| 19 Lobby Set | 4 | 4 → 4 | 1 → 1 | 0 / 0 | ✅ |
| 21 Mesh High-Back Office Chair | 4, 5 | 4.5 → 4.5 | 2 → 2 | 0 / 0 | ✅ |
| 33 Ergonomic Mesh Low-Back Chair | 4 | 4 → 4 | 1 → 1 | 0 / 0 | ✅ |
| 37 Bentwood-Style Café Chair | 5, 4 | 4.5 → 4.5 | 2 → 2 | 0 / 0 | ✅ |
| 46 Shell Café Chair | 3 | 3 → 3 | 1 → 1 | 0 / 0 | ✅ |
| 47 Wooden Sofa Set | 5, 4, 5 | 4.7 → 4.7 | 3 → 3 | 1 / 0 | ✅ |
| 55 King Size Bed | 5 | 5 → 5 | 1 → 1 | 0 / 0 | ✅ |
| 58 Carlton Mattress | 4, 5 | 4.5 → 4.5 | 2 → 2 | 0 / 1 | ✅ |
| 64 Wooden Bedside Table | 5 | 5 → 5 | 1 → 1 | 0 / 0 | ✅ |
| 74 6-Seater Dining Set | 4 | 4 → 4 | 1 → 1 | 0 / 0 | ✅ |
| 76 Winsome Office Table | 5 | 5 → 5 | 1 → 1 | 0 / 0 | ✅ |
| 81 Workshop Reading Table | 5 | 5 → 5 | 1 → 1 | 0 / 0 | ✅ |
| the other 67 products | — | 0 → 0 | 0 → 0 | 0 / 0 | ✅ |

### 6.11 Wishlist snapshots (`buildWishlistItem` from WishlistContext.js applied to today's product)

| Row | User | Product | Fields compared | Differences | |
|---|---|---|---|---|---|
| 1 | 3 | 48 L-Shaped Sofa | 14: productId, slug, name, image, brand, price, comparePrice, rating, totalReviews, shortDescription, variants, stock, trending, hot | none | ✅ |
| 2 | 3 | 31 Ergonomic High-Back Chair with Headrest | 14: productId, slug, name, image, brand, price, comparePrice, rating, totalReviews, shortDescription, variants, stock, trending, hot | none | ✅ |
| 3 | 3 | 37 Bentwood-Style Café Chair | 14: productId, slug, name, image, brand, price, comparePrice, rating, totalReviews, shortDescription, variants, stock, trending, hot | none | ✅ |

### 6.12 Summary

- money: 0 mismatch(es)
- cascade: 0 mismatch(es)
- status: 0 mismatch(es)
- dates: 0 mismatch(es)
- snapshot: 0 mismatch(es)
- ratings: 0 mismatch(es)
- **total: 0**

## 7. Browser checks

**78 of 78** after the repairs (69 of 69 before them, commit `8c7460e`; the nine `repairs/*` checks were added for the repaired records). Production build in JSON Server mode on :5001, JSON Server on a scratch copy of `db.json` reset before every mutating check; expectations read from the data at run time; the seed was never written.

| Check | | Detail |
|---|---|---|
| orders/user3-count | ✅ | 7 cards, 7 orders |
| orders/user3-numbers | ✅ | Order ORD-MQDVIQCV-30A9 · Order ORD-MQDUWC74-RUVY · Order ORD-MQCGV6OM-Z965 · Order ORD-MQC1HWSZ-CAN8 · Order ORD-MQB0JHUB-9KL6 · Order ORD-MQA9I6E7-0IR2 · Order ORD-MMYJ01ED-ZR26 |
| orders/user3-totals | ✅ | ORD-MQDVIQCV-30A9 ₹9,819.00, ORD-MQDUWC74-RUVY ₹56,638.00, ORD-MQCGV6OM-Z965 ₹38,939.00, ORD-MQC1HWSZ-CAN8 ₹4,302.00, ORD-MQB0JHUB-9KL6 ₹10,527.00 |
| orders/cancel-only-processing | ✅ | 2 cancel buttons, 2 processing orders on page 1 |
| orders/details-items | ✅ | Queen Size Bed - Walnut + Carlton Mattress - Queen |
| orders/details-images | ✅ | https://placehold.co/1200x1500/f1ebe1/686158?text=Queen+Size+Bed \| https://placehold.co/1200x1500/f1ebe1/686158?text=Carlton+Mattress \| https://placehold.co/1200x1500/f1ebe1/6861 |
| orders/details-summary | ✅ | ₹47,998.00 / ₹8,640.00 / ₹56,638.00 |
| orders/track-refund-line | ✅ | Order ORD-MQC1HWSZ-CAN8 Placed on 13 June 2026 CANCELLED TOTAL ₹4,302.00 Track order ORD-MQC1HWSZ-CAN8 Details of order ORD-MQC1HWSZ-CAN8 TRACKING The payment for this order was re |
| orders/review-chips | ✅ | {"ORD-MQB0JHUB-9KL6":{"published":true,"pending":false},"ORD-MQDVIQCV-30A9":{"published":false,"pending":true}} :: 64: approved, 9: pending |
| orders/write-review | ✅ | the unreviewed line keeps its Write a review |
| orders/return-window-seed | ✅ | no seeded delivery within 7 days |
| orders/return-link | ✅ | /support?order=ORD-MQB0JHUB-9KL6&category=returns |
| orders/return-support-prefill | ✅ | ORD-MQB0JHUB-9KL6 |
| wallet/balance | ✅ | ₹2,302.00 |
| wallet/ledger-rows | ✅ | credit 4302 → 4302; debit 1000 → 3302; debit 1000 → 2302 |
| wallet/balance-equals-ledger | ✅ | 2302 = 2302 |
| wishlist/three | ✅ | L-Shaped Sofa, Ergonomic High-Back Chair with Headrest, Bentwood-Style Café Chair |
| wishlist/order-recent-first | ✅ |  |
| wishlist/move-to-cart | ✅ | Your cart 1 piece Add ₹6,500.00 more for free delivery Bentwood-Style Café Chair Remove Bentwood-Style Café Chair, Walnut from cart Walnut ₹3,499.00 Was ₹3,999. |
| pdp/rating | ✅ | 4.7, 3 ratings |
| pdp/approved-shown | ✅ | Our living room finally feels finished \| Good build, cushions need a week \| Worth the wait |
| pdp/unapproved-hidden | ✅ | Happy so far |
| pdp/mesh-high-back-office-chair | ✅ | 2 approved, rating 4.5 |
| pdp/carlton-mattress | ✅ | 2 approved, rating 4.5 |
| pdp/empty-state | ✅ | No reviews yet. |
| offers/coupons | ✅ | WELCOME500: ₹500 off orders above ₹5,000 \| FLAT10: 10% off orders above ₹2,000, up to ₹2,000 |
| offers/products | ✅ | 3 deals of the day, 8 in the grid |
| offers/hero | ✅ | Offers on pieces we love |
| offers/countdown-live | ✅ | Offers end in 05 HOURS : 13 MINUTES : 09 SECONDS → Offers end in 05 HOURS : 13 MINUTES : 07 SECONDS |
| offers/copy-code | ✅ | WELCOME500 |
| header/free-delivery-line | ✅ | Free delivery on orders above ₹9,999.00 +91 84729 18653 Help Track order Search B ACCOUNT 3 WISHLIST CART PLASTIC FURNITUREOFFICE CHAIRSCAFÉ & RESTAURANT CHAIRS |
| checkout/coupon | ✅ | Order summary 6-Seater Plastic Dining Set , Marble Beige · Qty 1 , ₹9,999.00 Subtotal ₹9,999.00 Discount (WELCOME500) − minus ₹500.00 Delivery Free Tax (18% GST) ₹1,710.00 Total ₹1 |
| checkout/methods | ✅ | Delivery method Standard Delivery , 7–10 business days , Free , Free above ₹9,999.00 Express Delivery , 3–5 business days , ₹999.00 Back Continue |
| checkout/available-credit | ✅ | available ₹2,302.00 |
| checkout/review-summary | ✅ | Subtotal ₹9,999.00 \| Discount (WELCOME500) − minus ₹500.00 \| Delivery Free \| Tax (18% GST) ₹1,710.00 \| Total ₹11,209.00 \| Store credit − minus ₹2,302.00 \| Amount payable ₹8,9 |
| checkout/review-cod | ✅ | payable ₹8,907.00 |
| width/360 | ✅ | orders cards 5, overflow-free true/true |
| width/768 | ✅ | orders cards 5, overflow-free true/true |
| width/1024 | ✅ | orders cards 5, overflow-free true/true |
| width/1440 | ✅ | orders cards 5, overflow-free true/true |
| orders/user@example.com | ✅ | ORD-20250310-0001 ₹16,519.00, ORD-20250318-0002 ₹33,628.00, ORD-20260315-0004 ₹3,893.00 |
| orders/jane@example.com | ✅ | ORD-20260310-0003 ₹9,937.00 |
| admin/dashboard | ✅ | revenue ₹2,07,119, orders 11, pending 4, returns 1, coupons 4 :: Dashboard Welcome back! Here's your store overview. Total Revenue ₹2,07,119 All time Total Orders 11 4 pending Tota |
| admin/dashboard-pending | ✅ | pending orders 4 |
| admin/orders-dialogs | ✅ | 11 rows (expected 11), 11 dialogs opened |
| admin/returns-dialogs | ✅ | 2 rows (expected 2), 2 dialogs opened |
| admin/payments-dialogs | ✅ | 9 rows (expected 9), 9 dialogs opened |
| admin/coupons-dialogs | ✅ | 5 rows (expected 5), 5 dialogs opened |
| admin/shipping-dialogs | ✅ | 4 rows (expected 4), 4 dialogs opened |
| admin/users-dialogs | ✅ | 3 rows (expected 3), 3 dialogs opened |
| admin/reviews-list | ✅ | 26 rows on the first page |
| admin/special-offers | ✅ | Special Offers Page Control the storefront "Today's Deals" page — visibility, timer, coupons and featured products. View Live Page Save Changes Deals page is visible Shoppers can o |
| admin/settings | ✅ | first field: A & S Urbanseat |
| admin/leads | ✅ | 4 leads |
| repairs/return-refunded | ✅ | refunded: row "RET-20260120-0001 ORD-20250310-0001 1 item(s) Defective ₹16,519 Refunded 20 Jan 2026, 10:0", 0 further actions |
| repairs/order5-voided | ✅ | row "ORD-MMYJ01ED-ZR26 Bappi Das Howly 1 ₹14,159 Voided Cancelled 20 Mar 2026, 06:36 am " |
| repairs/order5-my-orders | ✅ | PAYMENT Cash on Delivery Status: Voided SUMMARY Subtotal ₹11,999.00 Delivery Fre |
| repairs/order5-confirmation | ✅ | ORDER CANCELLED Thank you, Bappi. This order was cancelled on 12 June 2026. ORDER NUMBER ORD-MMYJ01ED-ZR26 Placed on 20 March 2026 DELIVERY This order was not s |
| repairs/wishlist-order | ✅ | Bentwood-Style Café Chair → Ergonomic High-Back Chair with Headrest → L-Shaped Sofa |
| repairs/review-6 | ✅ | Wooden Sofa Set: "Our living room finally feels finished" |
| repairs/review-10 | ✅ | Mesh High-Back Office Chair: "Good chair for home office" |
| repairs/review-11 | ✅ | Mesh High-Back Office Chair: "Comfortable through long workdays" |
| repairs/review-17 | ✅ | Carlton Mattress: "A big step up from our old mattress" |
| cascade/return-worksheet | ✅ | Process Refund Deduction (₹) Deduction (₹) Restocking / shipping fee Refund Method Original Payment Method Refund Method Restock returned items to inventory Pay |
| cascade/return-status | ✅ | refunded / processed |
| cascade/return-payment | ✅ | payment 4: partially_refunded, refunded 8259 of 8758 |
| cascade/return-order | ✅ | ORD-MQA9I6E7-0IR2: partially_refunded · returned; "Return refund processed (RET-20260612-0002)" / "₹8,259 refunded" |
| cascade/return-ledger | ✅ | REF-20261011-NRA9 8259 |
| admin/payment-refund-history | ✅ | Payment Details Refunded Transaction ID pay_RZP123456789 Order ORD-20250310-0001 Amount ₹16,519 Currency INR Method Upi Gateway Razorpay Date 15 Jan 2026, 10:31 am Gateway Order ID |
| moderation/approve | ✅ | Happy so far: approved; page counts 4 |
| moderation/revert | ✅ | restored from the seed |
| admin/settings-save-unchanged | ✅ | ["store","shipping","payment","notifications","seo","social"] |
| cancel/sentence | ✅ | ! Cancel this order? Order ORD-MQCGV6OM-Z965 will be cancelled. We’ll start a full refund of ₹37,939.00 to your original payment method. The ₹1,000.00 of store credit you used will |
| cancel/order | ✅ | cancelled, refund processing 37939 |
| cancel/payment | ✅ | refund_pending |
| cancel/wallet | ✅ | +1000 → 3302 |
| cancel/refund-record | ✅ | order_cancellation pending |
| console/clean | ✅ |  |

## 8. Gaps found and how each was closed

| # | Gap (as found) | Repair | Proof |
|---|---|---|---|
| R29 | `settings.seo.metaTitle` was the old Title Case title | `index.html`'s title (§9.1) | validator V2-04; §11 |
| R43 | WELCOME500 promised "your first order": not in Prompt 05's line, enforced nowhere, contradicted by both seeded uses | "₹500 off orders above ₹5,000" (§9.2) | validator V2-04 (and its fault "first order"); browser offers/coupons |
| R59 (R111) | `banners[].gradient` wrapped the navy in `linear-gradient(…)` | `#0b1f3f` (§9.3) | validator V2-04 |
| R97 (R121, R164) | Health effects (reviews 11, 17), an unconfirmed set-up service (6), armrests the product does not list (10) | four statements re-worded (§9.4) | validator V2-04 (health, service); browser repairs/review-6, -10, -11, -17 |
| R150 | Order 5 cancelled with its payment still `pending` | `voided` + the event the cancel writes (§9.5) | recomputation (status 0); browser repairs/order5-*; dashboard "Pending orders" 5 → 4 |
| R151 | Return 1 `approved` though refunded; the admin offered to receive it again | `refunded` (§9.6) | browser repairs/return-refunded (0 further actions) |
| R153 | Orders 7, 8, 11: an event after `updatedAt` | `updatedAt` = the last event (§9.7) | recomputation; validator V2-04 |
| R163 | Reviews 2, 3, 4 and wishlist rows 1, 2 before their product | re-dated (§9.8); orders kept by decision (§8.1) | recomputation (dates 0); validator V2-04 |
| R162 (R126) | The validator missed most machine-checkable rules | V2-04 assertions (§10) | 69 seeded faults, 69 reported |

### 8.1 Kept on purpose: orders dated before their products

Orders 5–11's numbers are `Date.now()` in base 36 and decode to their `createdAt` to the millisecond; orders 3 and 4's numbers carry their dates. Order numbers are frozen, and Prompt 05 kept the timestamps on purpose ("Keep all 11 orders with their … timestamps", 05:61). Product `createdAt` belongs to the catalogue, inside Prompts 03 and 04's six-month window (V2-02, V2-03): every product is dated after 2026-04-07, so orders 1–5 (January to March 2026) could not reference any product at all, and re-pointing orders at other products would re-seed them. Neither date is shown anywhere: the storefront uses a product's `createdAt` only to sort "Newest", and no admin page prints it. The validator now asserts the number ↔ `createdAt` binding, which is why these timestamps cannot move. The demo orders are removed before launch (§16). The 9 order lines (7 orders) stay listed in the recomputation as documented exceptions.

### 8.2 Kept on purpose: everything else that looks odd

Observations (no change), with the reason each stays:
- **O1.** A storefront-placed order stores `sku: ""`: no cart line carries a SKU (`Checkout.js:612`). The seed keeps the variant SKU, as Prompt 05 asked (05:61).
- **O2.** John's verified reviews 3, 4 (approved) and 5 (rejected) belong to his orders 2 and 4, which are still `shipped`. Prompt 05's rule is ownership, and it holds; the storefront itself only lets a customer review a delivered line. Marking those orders delivered would change statuses Prompt 05 kept (and add `deliveredAt`).
- **O3.** Orders 4 and 5 (cash on delivery) have no payment record; the mock would have written a `pending` one at checkout. Record counts are frozen.
- **O4.** "Review not approved" has no delivered line to sit on: user 3's three delivered lines carry the published, pending and unwritten states the tests pin (`OrderHistory.test.js:661–668`). It can be shown on a scratch copy by rejecting review 2 in the admin (§12, F5).
- **O5.** Refund 2 is typed `order_refund` though order 3's timeline follows the payment-refund path (which writes `payment_refund`); wallet row 1 links refund 3 although `completeOrderRefund` passes no link. Labels and links only; every amount agrees.
- **O6.** Payment 6 (cash on delivery, refunded) has no `transactionId`: the mock's "Mark as paid" does not touch the payment (Prompt 34), so that is what the code leaves.
- **O7.** The client's open questions stay open: the shipping names' casing, the deals title's accent, the tagline's casing, NEWHOME20's "first order" (Prompt 29; `00_INDEX.md` §6).
- **O8.** Reviews keep the 12-key shape; the boilerplate's optional `photos` (two rows) and `source: "admin"` (two rows) are absent, and adding a field is outside V2's rules. `ReviewsSection` reads `photos` only when present; nothing reads `source`.

## 9. The repairs

One script made every data change (`repair.cjs`, scratchpad): exact, once-only replacements on the parsed seed, each asserting the value it replaces and that the record's key order is unchanged, written back as 2-space JSON without a trailing newline (the file's own format, verified by round-trip before writing). It was dry-run on a copy first; the repository file came out byte-identical to the dry run. `updatedAt` of a re-worded record was not moved (V2-02/V2-03's rule).

### 9.1 R29: the SEO title

| Field | Before | After |
|---|---|---|
| `settings.seo.metaTitle` | A & S Urbanseat \| Furniture & Seating for Home, Office, Café and Outdoor | A & S Urbanseat \| Furniture and seating for home, office, café and outdoor |

The value is read from `public/index.html`'s `<title>` (Prompt 29's sentence case) and equals `DEFAULT_PAGE_TITLE` (Prompt 32); `metaDescription` already matched. Prompt 29 proposed exactly this change for the admin-managed copy. The storefront does not read `settings.seo` (Prompt 32); Admin → Settings does not show it.

### 9.2 R43: WELCOME500

| Field | Before | After |
|---|---|---|
| `coupons[1].description` | ₹500 off your first order above ₹5,000 | ₹500 off orders above ₹5,000 |

Prompt 05's line is "WELCOME500 (fixed ₹500, min ₹5,000)". Nothing checks "first order" (`coupons.validate` checks active, expiry, usage limit and the minimum; `perUserLimit` 1 is per customer, not first order), and both seeded uses contradicted it: ORD-20250318-0002 was John's second order, ORD-MQB0JHUB-9KL6 Bappi's third. The wording is the one Prompt 29 proposed. `SpecialOffers.test.js:296` pinned the old line and was updated with it (the only test change). NEWHOME20 keeps "first order": Prompt 05 specifies it, and no seeded order uses it; whether the Laravel API enforces it stays the client's question.

### 9.3 R59: the banner colour

`banners[1–3].gradient`: `linear-gradient(#0b1f3f, #0b1f3f)` → `#0b1f3f`, the value `DESIGN_SYSTEM.md` §12 lists for this field ("Copy these literally"), equal to `--sf-brand-navy` in `storefront-tokens.css`. The field stays a string. Nothing renders `banners` today (Prompt 10); the boilerplate applied it through the `background` shorthand, which takes a colour as readily as a gradient.

### 9.4 R97: four review statements

| Review | Product | Before | After |
|---|---|---|---|
| 6 (5★) | Wooden Sofa Set | "…Delivery took nine days and the team set it up for us." | "…Delivery took nine days, within the time we were quoted." |
| 10 (4★) | Mesh High-Back Office Chair | "…The armrests are a bit hard for long calls." | "…The seat foam is a little firm for long calls." |
| 11 (5★) | Mesh High-Back Office Chair | "Back pain is better" / "I sit eight or nine hours a day and this has been much easier on my lower back than my old chair." | "Comfortable through long workdays" / "I sit eight or nine hours a day. The high back and the tilt make those days far more comfortable than my old chair did." |
| 17 (5★) | Carlton Mattress | "Sleeping much better" / "Replaced a ten-year-old mattress with this one. My shoulder aches have eased within two weeks." | "A big step up from our old mattress" / "Replaced a ten-year-old mattress with this one. It feels even from edge to edge and has kept its shape so far." |

Why: seeded reviews are our demo content, so they may not claim a health effect (V2-03 F3; the catalogue's own no-medical-claim rule), a service the store has not confirmed (assembly on delivery is a `CONFIRM` in `legalContent.js:327`), or a part the product's data never lists (product 21 lists a foam seat, a high back, a tilt and a gas lift; no armrests). Each new sentence rests on the product's data or the delivery terms (Standard 7–10 business days). Ratings, dates, names, statuses and helpful counts are unchanged, so every rating and count stays as it was; each body is still two sentences. No test pinned these texts; the home carousel's tests key on dates and status (`homeData.test.js:77–83`), which did not change.

### 9.5 R150: order 5's payment

ORD-MMYJ01ED-ZR26 was cancelled by the customer while its cash-on-delivery payment was uncollected. Both cancel paths void such a payment: `orders.cancel` passes `voidPayment: true`, and `performCancel` writes `paymentStatus: "voided"` with "Payment voided" / "No captured payment to refund" (`api.js:1237–1260, 669–672`). Now: `paymentStatus` `pending` → `voided`, and the event appended at the cancellation's instant (2026-06-12T01:46:10.397Z, by Customer). On screen: My orders reads "Status: Voided" and the order confirmation "Not charged" (it already did, from the cancelled state); Admin → Orders shows "Voided"; the dashboard's "Pending orders" falls from 5 to 4 (`api.js:1627` counts pending payments). No payment record exists for this order (O3), so none changed.

### 9.6 R151: return 1's status

RET-20260120-0001's refund is `processed` and its timeline ends "Refund processed (₹16,519)", but its status was `approved`. Admin → Returns builds its actions from the status alone, so the dialog offered "Schedule Pickup" and "Mark as Received", the path to processing the same ₹16,519 a second time (`AdminReturns.js:550–562`). Processing a refund writes `status: "refunded"` with `refundStatus: "processed"` (`AdminReturns.js:214–242`). Now `refunded`: the dialog shows the refund outcome (Refunded ₹16,519, restocked, original payment method, the return tracking) and no further step (browser repairs/return-refunded). The dashboard's pending-returns count is unchanged (it already excluded a processed refund).

### 9.7 R153: three timelines

| Order | `updatedAt` before | Last event | `updatedAt` after |
|---|---|---|---|
| 7 ORD-MQB0JHUB-9KL6 | 14:49:17.688Z | "Payment marked as paid" 14:49:17.716Z | 14:49:17.716Z |
| 8 ORD-MQC1HWSZ-CAN8 | 12:57:28.282Z | "Refund completed" 12:57:28.351Z | 12:57:28.351Z |
| 11 ORD-MQDVIQCV-30A9 | 06:24:29.131Z | "Marked delivered" 06:24:29.157Z | 06:24:29.157Z |

The mock stamps `updatedAt` before it reads the order and appends the event (`api.js:1829–1847, 1925–1960`), which left these 26–69 ms inversions. `refundCompletedAt` (order 8) and `deliveredAt` (orders 7, 11) keep their values and stay inside the timeline.

### 9.8 R163: dates against the catalogue

| Record | Product (created) | Before | After |
|---|---|---|---|
| review 2 (pending, user 3) | 9 Slim Plastic Shoe Rack (2026-09-05) | 2026-06-24 | 2026-09-27 (order delivered 2026-06-20) |
| review 3 (approved, user 1) | 33 Ergonomic Mesh Low-Back Chair (2026-08-03) | 2026-02-20 / 21 | 2026-08-20 / 21 (order placed 2026-02-01) |
| review 4 (approved, user 1) | 76 Winsome Office Table (2026-07-09) | 2026-02-21 / 22 | 2026-08-21 / 22 (order placed 2026-02-01) |
| wishlist 1, 2, 3 (user 3) | 48 (2026-07-02), 31 (2026-07-25), 37 (2026-04-30) | 2026-06-14 13:57:44 / :57 / :59 | 2026-08-14, same times |

Each review keeps its time of day and its one-day moderation gap, stays after its order and after its account, and its product page shows it alone (no order on a page changes). The wishlist rows move together by 61 days so "Recently added" keeps its order and spacing (Bentwood → Ergonomic → L-Shaped, browser repairs/wishlist-order).

## 10. Validator assertions added (full mode, marked V2-04)

`scripts/validate-db.js` gains a V2-04 block after Prompt 34's checks, a header note and a summary row; nothing existing changed or loosened. The money rules are the checkout's and the cascade's as `src` implements them (§4).

- **Record counts:** banners 3, users 3, admins 1, orders 11, returns 2, payments 9, refunds 3, shipping methods 4, coupons 5, wishlist 3, leads 4, wallet rows 3.
- **Settings:** the boilerplate's 42 key paths in order; tagline, email, phone and address equal `constants.js`; INR, ₹, Asia/Kolkata, logo and favicon null, tax 18% exclusive; COD on / 0 / 0 / 50,000, gateways off; 8 kg and a positive carton; notification emails = `SUPPORT_EMAIL`; `seo.metaTitle` and `metaDescription` equal to `public/index.html`; WhatsApp = `SOCIAL_LINKS.WHATSAPP`, the other socials "".
- **Shipping:** ids 1–4 with their names; Standard (Shiprocket, flat ₹499, free above ₹9,999, "7-10", the description, active); Express (₹999, never free, "3-5", active); Same Day and Free Shipping inactive.
- **Coupons:** ids 1–5 and the five codes; WELCOME500, FLAT10, FESTIVE25 (inactive, expired, exhausted), NEWHOME20 and WORKSPACE15's values; WORKSPACE15 without a category claim; active codes expiring in 2027 with `usedCount` ≤ 50; `usedCount` at least the seeded orders that used the code; a "first order" description only where every seeded use was the customer's first order.
- **Orders:** item price = the variant's price; delivery charged by an **active** method at the order's subtotal (the old check also accepted the inactive Free Shipping, so any ₹0 passed); the coupon's minimum, its validity on the order's date and its per-customer limit; store credit ≤ the total and matched by a wallet debit; `createdAt` ≤ each event, in sequence, ≤ `updatedAt` ≤ now; `deliveredAt` inside the timeline and not after "Marked delivered"; `cancelledAt` = the cancellation's event; each event's state (cancelled, delivered, shipped, a processed return → returned, a booked refund → refunded, "Payment voided" → voided) and no cancelled order with a pending payment; `paymentStatus` ↔ the payment's status; every ₹ amount anywhere in the timeline is a refund, a return payable or the credit used (the old check read refund entries only); an `ORD-<base 36>-…` number decodes to `createdAt`.
- **Payments:** captured, pending or voided means nothing refunded; partially refunded means 0 < refunded < amount; created after the order, refunds within the record's dates.
- **Returns:** status = the one its last timeline action leaves; `refundStatus` processed ⇔ status refunded; timeline order; not before the order; payable ≤ the payment.
- **Refunds:** `initiatedAt` = `createdAt` ≤ `settledAt` ≤ `updatedAt`; a completed refund is settled.
- **Wallet:** a debit names its order ("Applied to order …"); a credit links a store-credit refund or a cancellation; no row before its order.
- **Reviews:** 20–26 reviews; 3–4 pending and 1–2 rejected; 14–18 products covering all six departments; ratings 3–5 (the old check allowed 1–5); 1–3 sentences without "!"; no health effect; no set-up or installation claim; dated after the product existed.
- **Wishlist:** every row user 3's (`mail4bappidas@gmail.com`), on an active product, saved after the product and the account existed.
- **Deals config:** enabled with a hero; no urgency wording; the timer `{ true, "", "endOfDay" }`; two featured coupons that `isCouponValid` accepts; three deals of the day, active, compare-at above the price (the old check accepted any compare-at); 6–8 grid pieces, active and discounted, spanning every department that has a discounted piece; `updatedAt` in the past.
- **Banners:** links to active departments; `gradient` = `--sf-brand-navy` from `storefront-tokens.css` (§12's literal).

**Self-test** (`selftest.cjs`, scratchpad): 69 faults seeded one at a time into copies of the repaired seed (one per new rule family, from the SEO title to the lead count): **69 of 69 reported** (125 problems in all), each run exit 1 with the expected message. The repaired seed passes; the as-found seed fails with exactly the audit's gaps (20 problems: the SEO title, WELCOME500 ×2, order 5, orders 7, 8, 11, return 1 ×2, reviews 2, 3, 4 (dates), 6 (service), 11, 17 (health), wishlist 1, 2, banners ×3). Catalogue mode is unchanged and passes. ESLint (node, ES2022; `no-undef`, `no-unused-vars`, `no-redeclare`, `no-shadow`): the same single pre-existing `no-shadow` note in Prompt 05's coupon code before and after.

## 11. Identity stability (before → after)

A field-by-field walk of the as-found seed (`d689a95f…`) against the repaired one (`a15d361a…`) finds **26 changed paths**: the 25 values of §9 and the one timeline entry on order 5. Compared and identical:
- the 18 collections, their order and every record count;
- every record's id and key order in all 18 collections; the settings' 42 key paths; the deals config;
- the order, return and refund numbers;
- every money field: orders (subtotal, discount, delivery, tax, total, credit, payable, refunded), payments (amounts, refunds), refunds, returns, wallet rows, users' `storeCredit`;
- every product's rating and count; every review's product, user, rating, status, verified flag and helpful count;
- SHA-256 of `admins`, `users`, `categories`, `products`, `cart`, `payments`, `refunds`, `walletTransactions`, `leads` and `shipping_methods`.

`git diff --stat`: `db.json` 31 insertions, 25 deletions; `scripts/validate-db.js` +249; `SpecialOffers.test.js` 1 line.

## 12. Findings for V2-05

| # | Finding | Where | Owner |
|---|---|---|---|
| F1 | `00_INDEX.md` §6's coupon line says WELCOME500 and NEWHOME20 both promise "first order"; since V2-04 only NEWHOME20 does. §7's "user 3's ₹2,302 store credit" is unchanged | `00_INDEX.md` lines 206, 241 | V2-05 (index update) |
| F2 | Admin → Leads logs a development-only React warning (`hover` passed through `motion.tr` to the DOM) whenever leads exist; the same on the as-found seed; production builds are silent | `AdminLeads.js:438–444` (unchanged since the first commit) | owner (admin file) |
| F3 | The mock stamps `updatedAt` before appending the event, so any live admin action leaves an event a few ms after `updatedAt`; the validator is strict on the seed, so validate a scratch copy only after restoring it | `api.js:1829–1847, 1925–1960` | owner (`api.js`) |
| F4 | The offers page shows any product the admin picks as a deal of the day, discounted or not: the code never checks; only the seed (and now the validator) keeps the picks discounted | `SpecialOffers.js:568–571` | owner |
| F5 | "Review not approved" is not demonstrable on `/orders` with the seed (O4): on a scratch copy, reject review 2 in Admin → Reviews and ORD-MQDVIQCV-30A9's shoe rack shows the chip | `OrderHistory.js:56–60` | V2-05 (regression walk) |
| F6 | A storefront order stores `sku: ""` because no cart line carries a SKU (O1); the admin's order view and invoice show an empty SKU for every real order | `Checkout.js:612`; `ProductDetails.js:542–556`; `helpers.js:89–108` | owner |
| F7 | Admin → Returns builds its actions from `status` alone: a return whose refund is processed but whose status says otherwise would again offer Receive and Process (the seed no longer has one; the validator now forbids it) | `AdminReturns.js:545–562` | owner (admin file) |
| F8 | Orders dated before their products stay (§8.1); if the client keeps the demo data, either move the products' `createdAt` before 2026-01-15 (outside Prompts 03 and 04's window) or accept it | `db.json` | client / owner |

## 13. Observations (no change)

O1–O8 in §8.2. Also: the dashboard's "Pending orders" counts an unfulfilled order whose payment was refunded (ORD-20260310-0003), by its own rule (`api.js:1627`); a refund issued from the payment does not cancel fulfilment (`issueRefund`), so the seed's order 3 is what the code leaves.

## 14. Gate (after the repairs)

- `node scripts/validate-db.js` (full) → `✓ all checks passed`; `--catalogue` → `✓ all checks passed`.
- The recomputation (`node recompute.cjs`) → **0 mismatches** in money, cascade, states and timelines, dates, snapshots and ratings; the 9 order lines dated before their product are listed as §8.1's exceptions.
- `CI=true npm test -- --passWithNoTests` → **86 suites, 1,429 tests, exit 0**, no console warning (one test line updated, §9.2).
- `npm run build` and `CI=true npm run build` → "Compiled successfully.", main JS 399.62 kB, CSS 34.97 kB gzip (V2-01…03's figures), only the two documented dependency notices. In JSON Server mode all **35 build files are byte-identical** to the baseline's (only a test changed under `src/`).
- **Browser** (Playwright, production build in JSON Server mode, scratch `db.json` reset before every mutating check): **78 of 78** (§7): `/orders` as `mail4bappidas@gmail.com` (7 orders, totals, details with names, images and the summary, tracking with the refund line, review chips and Write a review, cancel only on the two processing orders, "Return or exchange" opening Support prefilled once a delivery is within 7 days); the wallet (₹2,302.00 = the ledger's last balance = checkout's "Available balance"); `/wishlist` (three pieces in their order, Move to cart); the Wooden Sofa Set (4.7 / 3, the pending review hidden), the Mesh High-Back Chair and the Carlton Mattress (4.5 / 2, the re-worded reviews), the L-Shaped Sofa ("No reviews yet."); `/special-offers` (WELCOME500 and FLAT10 with their terms, 3 + 8 pieces, the countdown ticking, Copy code); the header's "Free delivery on orders above ₹9,999.00"; checkout to Review with a ₹9,999 cart (free Standard delivery at the threshold, WELCOME500 −₹500, tax ₹1,710, total ₹11,209, ₹2,302 credit, ₹8,907 by COD); `user@example.com` and `jane@example.com` load their orders; 360 / 768 / 1024 / 1440 px without overflow; the admin dashboard (₹2,07,119, 11 orders, 84 products, 3 users, 4 pending orders, 1 pending return, 4 active coupons) and every order, return, payment, coupon, shipping-method and user dialog; reviews, special offers, settings and leads; the return-refund cascade (RET-20260612-0002 → payment 4 `partially_refunded` ₹8,259, order 6 returned, a `return_refund` record) and a customer cancel of ORD-MQCGV6OM-Z965 (₹37,939 refund opened, ₹1,000 credit back, ₹3,302 balance), approving a pending review (then restored), saving Settings without change (identical); the repaired records on screen; a clean console. `db.json` was never written (SHA-256 `a15d361a…` before and after).
- **Development server:** 26 loads (13 storefront routes signed in, 11 admin routes and the two sign-in pages): the only console line is F2's pre-existing warning on Admin → Leads.
- **Diff:** `db.json` (26 paths), `scripts/validate-db.js`, `src/pages/SpecialOffers/SpecialOffers.test.js` (1 line), this report and the build-log entry. No `src/services/api.js` (SHA-256 `c32e6138…`), `src/utils/constants.js` (`FREE_SHIPPING_THRESHOLD` stays 9999), admin, `public/` or other `src/` file.

## 15. Needs client confirmation (refreshed)

- **Tax:** GST at 18%, added on top of tax-exclusive prices (`taxIncluded: false`; checkout never reads that flag), on every product.
- **Cash on Delivery:** no fee, no minimum, a ₹50,000 cap on the amount collected (many sofa, bed and dining orders exceed it, so COD hides for them).
- **Delivery:** Standard ₹499 / 7–10 business days, Express ₹999 / 3–5, free Standard delivery from ₹9,999 (inclusive, on the subtotal before any coupon), same-day off, carrier Shiprocket, the parcel defaults (8 kg, 65 × 60 × 75 cm). `FREE_SHIPPING_THRESHOLD` is only the seed's reference; every surface reads Admin → Shipping.
- **Coupons:** the codes WELCOME500 ("₹500 off orders above ₹5,000", one per customer), FLAT10, FESTIVE25 (expired), NEWHOME20 ("20% off your first order, up to ₹3,000": nothing in the mock checks "first order"; the Laravel API enforces it, or the line drops it) and WORKSPACE15, with their values, minimums, caps, limits and expiry dates.
- **Store contact:** `info@kamdhenufurniture.com` (the old brand's domain), `+91 84729 18653`, WhatsApp `+91 84729 19541`, "Assam, India" with no street or PIN; which is the source of truth, `constants.js` or Admin → Settings.
- **Special offers:** the selection, the hero copy, the countdown to the end of each day.
- **Admin-managed copy** proposed by Prompt 29 and still open: the shipping names' casing, the tagline's casing, the deals title's accent.
- **Seeded review wording** (demo content), including V2-04's four re-worded statements.

## 16. Remove or replace before launch

- **Demo reviews:** all 26 and every `rating`/`totalReviews` derived from them.
- **Demo orders:** the 11 orders with their 9 payments, 3 refunds, 2 returns and 3 wallet rows; user 3's ₹2,302 store credit; the orders dated before their products (§8.1).
- **Coupon `usedCount` values** (illustrative) and the four demo leads.
- **Demo accounts and their plaintext passwords:** `user@example.com` / `password123`, `jane@example.com` / `password123`, `mail4bappidas@gmail.com` / `Bappi@12345`, admin `admin@store.com` / `admin123`.
- **Placeholder images** (`placehold.co`) and **placeholder prices, stock and specifications** (Prompts 03–04).
- **Placeholder settings values:** tax, COD, delivery and coupon settings (§15); `FREE_SHIPPING_THRESHOLD` (the seed's reference only).

## Appendix A. The recomputation script

Two files, run with Node 22 from any directory (`REPO` defaults to the checkout): `node recompute.cjs [db.json] [--md out.md]`; exit 1 on any mismatch. `codeparts.cjs` lifts the app's own expressions out of the source with `@babel/parser` (from the repository's `node_modules`), so the second opinion is the code itself.

```js
// codeparts.cjs
// Pull the app's own money and cascade expressions out of the source with the
// Babel parser, so the recomputation can run the code's formulas verbatim next
// to an independent re-implementation. Nothing here edits the repository.
const fs = require("fs");
const path = require("path");
const REPO = process.env.REPO || "/home/user/kamdhenu-furniture-e-commerce";
const parser = require(path.join(REPO, "node_modules/@babel/parser"));

const read = (rel) => fs.readFileSync(path.join(REPO, rel), "utf8");
const parse = (src) => parser.parse(src, { sourceType: "module", plugins: ["jsx"] });

// Walk every node (no @babel/traverse needed).
const walk = (node, fn, parent = null) => {
  if (!node || typeof node.type !== "string") return;
  fn(node, parent);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && walk(c, fn, node));
    else if (v && typeof v.type === "string") walk(v, fn, node);
  }
};

// Source of the first `const <name> = …;` declaration anywhere in the file.
const declSource = (src, ast, name) => {
  let found = null;
  walk(ast, (n) => {
    if (found || n.type !== "VariableDeclaration") return;
    if (n.declarations.some((d) => (d.id.type === "Identifier" && d.id.name === name)
      || (d.id.type === "ObjectPattern" && d.id.properties.some((p) => p.value && p.value.name === name)))) {
      found = src.slice(n.start, n.end);
    }
  });
  if (!found) throw new Error(`declaration ${name} not found`);
  return found;
};

// ---- Checkout.js: couponDiscountFor + the order-math block + the item map ----
const checkoutSrc = read("src/pages/Checkout/Checkout.js");
const checkoutAst = parse(checkoutSrc);
const couponDiscountForSrc = declSource(checkoutSrc, checkoutAst, "couponDiscountFor");
const MATH_NAMES = ["subtotal", "couponDiscount", "shippingCost", "taxRatePct", "taxAmount", "total",
  "maxApplicableCredit", "storeCreditApplied", "amountPayable", "fullyCovered"];
const mathDecls = MATH_NAMES.map((n) => declSource(checkoutSrc, checkoutAst, n));
const codDecls = ["paymentCfg", "codEnabled", "codMinOrder", "codMaxOrder", "codAvailable"].map((n) => declSource(checkoutSrc, checkoutAst, n));
// eslint-disable-next-line no-new-func
const checkoutMath = new Function(
  "getCartTotal", "couponApplied", "selectedShipping", "storeSettings", "walletBalance", "applyStoreCredit", "creditAmount",
  `${couponDiscountForSrc}\n${mathDecls.join("\n")}\n${codDecls.join("\n")}\n` +
  `return { subtotal, couponDiscount, shippingCost, taxRatePct, taxAmount, total, maxApplicableCredit, storeCreditApplied, amountPayable, fullyCovered, codAvailable };`
);
// The placeOrder items mapper: `cartItems.map((item) => ({ … }))`.
let itemMapSrc = null;
walk(checkoutAst, (n) => {
  if (itemMapSrc || n.type !== "ObjectProperty" || n.key.name !== "items") return;
  const v = n.value;
  if (v.type === "CallExpression" && v.callee.type === "MemberExpression" && v.callee.object.name === "cartItems" && v.callee.property.name === "map") {
    itemMapSrc = checkoutSrc.slice(v.arguments[0].start, v.arguments[0].end);
  }
});
if (!itemMapSrc) throw new Error("placeOrder items mapper not found");
// eslint-disable-next-line no-eval
const checkoutItem = eval(`(${itemMapSrc})`);
// The order payload's paymentStatus rule.
let payStatusSrc = null;
walk(checkoutAst, (n) => {
  if (payStatusSrc || n.type !== "ObjectProperty" || n.key.name !== "paymentStatus") return;
  payStatusSrc = checkoutSrc.slice(n.value.start, n.value.end);
});
// eslint-disable-next-line no-new-func
const checkoutPaymentStatus = new Function("fullyCovered", "paymentMethod", `return ${payStatusSrc};`);

// ---- api.js: wallet balance, payment record, refund booking ----
const apiSrc = read("src/services/api.js");
const apiAst = parse(apiSrc);
const readWalletBalanceSrc = declSource(apiSrc, apiAst, "readWalletBalance");
const createPaymentForOrderSrc = declSource(apiSrc, apiAst, "createPaymentForOrder");
const appendPaymentRefundSrc = declSource(apiSrc, apiAst, "appendPaymentRefund");
const isFullReturnOfOrderSrc = declSource(apiSrc, apiAst, "isFullReturnOfOrder");

// readWalletBalance against the seed (a stub `api` answering like JSON Server).
const walletBalanceByCode = async (db, userId) => {
  const api = { get: async (url, { params }) => ({ data: db.walletTransactions.filter((t) => String(t.userId) === String(params.userId)) }) };
  // eslint-disable-next-line no-new-func
  const fn = new Function("api", `${readWalletBalanceSrc}\nreturn readWalletBalance;`)(api);
  return fn(userId);
};
// createPaymentForOrder: capture what the code would POST for an order.
const paymentPayloadByCode = async (order) => {
  let posted = null;
  const api = { post: async (url, body) => { posted = body; return { data: body }; } };
  // eslint-disable-next-line no-new-func
  const fn = new Function("api", "console", `${createPaymentForOrderSrc}\nreturn createPaymentForOrder;`)(api, console);
  await fn(order);
  return posted;
};
// appendPaymentRefund: the status/total a refund booking produces.
const appendRefundByCode = async (payment, amount, reason) => {
  let patched = null;
  const api = { patch: async (url, body) => { patched = { ...payment, ...body }; return { data: patched }; } };
  // eslint-disable-next-line no-new-func
  const fn = new Function("api", "currentAdminName", `${appendPaymentRefundSrc}\nreturn appendPaymentRefund;`)(api, () => "Admin User");
  return fn(payment, amount, reason);
};
// eslint-disable-next-line no-new-func
const isFullReturnOfOrder = new Function(`${isFullReturnOfOrderSrc}\nreturn isFullReturnOfOrder;`)();

// ---- WishlistContext.js: the snapshot builder ----
const wishSrc = read("src/context/WishlistContext.js");
const wishAst = parse(wishSrc);
// eslint-disable-next-line no-new-func
const buildWishlistItem = new Function(`${declSource(wishSrc, wishAst, "buildWishlistItem")}\nreturn buildWishlistItem;`)();

// ---- OrderHistory.js: status derivation and review gating ----
const ohSrc = read("src/pages/OrderHistory/OrderHistory.js");
const ohAst = parse(ohSrc);
// eslint-disable-next-line no-new-func
const orderRules = new Function(
  `const RETURN_WINDOW_DAYS = 7;\n${declSource(ohSrc, ohAst, "deriveOrderStatus")}\n${declSource(ohSrc, ohAst, "isReviewable")}\n${declSource(ohSrc, ohAst, "isCancellable")}\n${declSource(ohSrc, ohAst, "isReturnEligible")}\nreturn { deriveOrderStatus, isReviewable, isCancellable, isReturnEligible };`
)();

// ---- offersData.js / helpers.js: deals rules ----
const offersSrc = read("src/pages/SpecialOffers/offersData.js");
const offersAst = parse(offersSrc);
// eslint-disable-next-line no-new-func
const isCouponValid = new Function(`${declSource(offersSrc, offersAst, "isCouponValid")}\nreturn isCouponValid;`)();
const helpersSrc = read("src/utils/helpers.js");
const helpersAst = parse(helpersSrc);
// eslint-disable-next-line no-new-func
const getProductMaxDiscount = new Function(`${declSource(helpersSrc, helpersAst, "getProductMaxDiscount")}\nreturn getProductMaxDiscount;`)();

module.exports = {
  checkoutMath, checkoutItem, checkoutPaymentStatus, walletBalanceByCode, paymentPayloadByCode, appendRefundByCode,
  isFullReturnOfOrder, buildWishlistItem, orderRules, isCouponValid, getProductMaxDiscount,
  sources: { couponDiscountForSrc, mathDecls, itemMapSrc, payStatusSrc },
};
```

```js
// recompute.cjs
#!/usr/bin/env node
// V2-04 independent recomputation of every supporting-data number.
//
// Each figure is rebuilt twice from the inputs only (item snapshots rebuilt
// from today's catalogue, the order's recorded coupon / delivery method /
// store-credit choice, the shipping methods and the settings):
//   (a) by an independent re-implementation written here, and
//   (b) by the app's own expressions, lifted verbatim from Checkout.js,
//       api.js, WishlistContext.js and OrderHistory.js (codeparts.cjs),
// and both are printed next to the stored value. Stored totals are never used
// to derive anything. Usage: node recompute.cjs [path/to/db.json] [--md out.md]
const fs = require("fs");
const path = require("path");
const code = require("./codeparts.cjs");

const REPO = process.env.REPO || "/home/user/kamdhenu-furniture-e-commerce";
const args = process.argv.slice(2);
const dbFile = args.find((a) => !a.startsWith("--") && a.endsWith(".json")) || path.join(REPO, "db.json");
const mdOut = args.includes("--md") ? args[args.indexOf("--md") + 1] : null;
const db = JSON.parse(fs.readFileSync(dbFile, "utf8"));

const out = [];
const say = (s = "") => out.push(s);
const inr = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);
const fails = { money: [], cascade: [], status: [], dates: [], snapshot: [], ratings: [] };
const flag = (cat, ok, msg) => { if (!ok) fails[cat].push(msg); return ok ? "✅" : "❌"; };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const products = new Map(db.products.map((p) => [p.id, p]));
const methods = new Map(db.shipping_methods.map((m) => [m.id, m]));
const couponByCode = new Map(db.coupons.map((c) => [c.code, c]));
const settings = db.settings;
const TAX = settings.store.taxRate;

// Recorded choices the data cannot derive (Prompt 05's build log): the
// delivery method per order. Orders do not store it; Order 8 used Express,
// every other order Standard.
const METHOD_BY_ORDER = { 8: 2 };
const methodFor = (o) => methods.get(METHOD_BY_ORDER[o.id] || 1);

// ---------------------------------------------------------------- (a) independent formulas
const ind = {
  // A cart line exactly as the product page builds it, plus the variant SKU
  // Prompt 05 asked the seed to keep (cart lines carry no sku: see report).
  cartLine(item) {
    const p = products.get(item.productId);
    const v = (p.variants || []).find((x) => x.id === item.variantId) || null;
    return {
      productId: p.id, variantId: v ? v.id : null, name: p.name, variantName: v ? v.name : null,
      image: (p.images && p.images[0]) || p.image || "", sku: v ? v.sku : p.sku,
      price: v ? Number(v.price) : Number(p.price), quantity: item.quantity,
    };
  },
  line(cl) {
    return {
      productId: cl.productId, variantId: cl.variantId,
      name: cl.variantName ? cl.name + " - " + cl.variantName : cl.name,
      image: cl.image, sku: cl.sku, price: cl.price, quantity: cl.quantity, subtotal: cl.price * cl.quantity,
    };
  },
  discount(c, sub) {
    if (!c) return 0;
    const raw = c.type === "percentage" ? Math.round((sub * c.value) / 100) : c.value;
    const cap = c.maxDiscount ? c.maxDiscount : Infinity;
    return Math.max(0, Math.min(raw, cap, sub));
  },
  shipping(m, sub) {
    if (m.rateType === "free") return 0;
    if (m.freeAbove && sub >= m.freeAbove) return 0; // pre-discount subtotal, inclusive
    return m.flatRate;
  },
  tax(sub, disc) { return Math.round((Math.max(0, sub - disc) * TAX) / 100); },
};

// ---------------------------------------------------------------- orders: money
const R = {}; // recomputed figures per order id
say("## Orders: money (stored → recomputed: independent | code)");
say("");
say("| Order | Items rebuilt from the catalogue | Subtotal | Coupon → discount | Delivery → shipping | Tax (18%) | Total | Store credit (ledger) | Payable | |");
say("|---|---|---|---|---|---|---|---|---|---|");
for (const o of db.orders) {
  const lines = o.items.map((it) => ind.line(ind.cartLine(it)));
  const sub = lines.reduce((a, l) => a + l.subtotal, 0);
  const coupon = o.couponCode ? couponByCode.get(o.couponCode) : null;
  const disc = ind.discount(coupon, sub);
  const m = methodFor(o);
  const ship = ind.shipping(m, sub);
  const tax = ind.tax(sub, disc);
  const total = sub - disc + ship + tax;
  const debits = db.walletTransactions.filter((t) => t.type === "debit" && t.orderId === o.id);
  const ledgerDebit = debits.reduce((a, t) => a + t.amount, 0);
  const credit = o.storeCreditUsed != null ? o.storeCreditUsed : 0;
  const payable = Math.max(0, total - credit);
  // (b) the checkout's own lines with the same inputs. The wallet balance is
  // what the ledger held before this order's debit (or 0 without credit).
  const balBefore = debits.length ? debits[0].balanceBefore : 0;
  const c = code.checkoutMath(() => lines.reduce((a, l) => a + l.price * l.quantity, 0), coupon, m, settings, balBefore, credit > 0, credit);
  const codeLines = o.items.map((it) => code.checkoutItem(ind.cartLine(it)));
  R[o.id] = { lines, codeLines, sub, disc, ship, tax, total, credit, payable, coupon, method: m, c, ledgerDebit };
  const ok = [
    o.subtotal === sub && c.subtotal === sub,
    o.discountAmount === disc && c.couponDiscount === disc,
    o.shippingAmount === ship && c.shippingCost === ship,
    o.taxAmount === tax && c.taxAmount === tax,
    o.total === total && c.total === total,
    (o.amountPayable === undefined || (o.amountPayable === payable && c.amountPayable === payable)),
    credit === ledgerDebit && c.storeCreditApplied === credit,
    !coupon || sub >= coupon.minOrderAmount,
  ];
  // The coupon as checkout and coupons.validate would have taken it on the
  // order's date: it existed, had not expired, met its minimum; the customer
  // stayed within perUserLimit; a "first order" description matches a first order.
  if (coupon) {
    const usedBefore = db.orders.filter((x) => x.userId === o.userId && x.couponCode === coupon.code && x.createdAt <= o.createdAt).length;
    const firstOrder = !db.orders.some((x) => x.userId === o.userId && x.createdAt < o.createdAt);
    ok.push(coupon.createdAt <= o.createdAt && (!coupon.expiresAt || coupon.expiresAt > o.createdAt));
    ok.push(!coupon.perUserLimit || usedBefore <= coupon.perUserLimit);
    ok.push(!/first order/i.test(coupon.description) || firstOrder);
  }
  const mark = flag("money", ok.every(Boolean), `order ${o.id} money: ${ok.map((x) => (x ? 1 : 0)).join("")}`);
  const itemsTxt = lines.map((l) => `${l.name} ×${l.quantity} @ ${inr(l.price)}`).join("; ");
  const couponTxt = coupon
    ? `${coupon.code} (${coupon.type === "percentage" ? coupon.value + "%, cap " + inr(coupon.maxDiscount) : inr(coupon.value)}, min ${inr(coupon.minOrderAmount)}): ${inr(o.discountAmount)} → ${inr(disc)} | ${inr(c.couponDiscount)}`
    : `none: ${inr(o.discountAmount)} → ${inr(disc)} | ${inr(c.couponDiscount)}`;
  say(`| ${o.id} ${o.orderNumber} | ${itemsTxt} | ${inr(o.subtotal)} → ${inr(sub)} \\| ${inr(c.subtotal)} | ${couponTxt} | ${m.name.replace(" Delivery", "")} (${inr(m.flatRate)}, free ≥ ${m.freeAbove ? inr(m.freeAbove) : "never"}): ${inr(o.shippingAmount)} → ${inr(ship)} \\| ${inr(c.shippingCost)} | ${inr(o.taxAmount)} → ${inr(tax)} \\| ${inr(c.taxAmount)} | ${inr(o.total)} → ${inr(total)} \\| ${inr(c.total)} | ${o.storeCreditUsed != null ? inr(o.storeCreditUsed) : "—"} (${inr(ledgerDebit)}) | ${o.amountPayable != null ? inr(o.amountPayable) : "—"} → ${inr(payable)} \\| ${inr(c.amountPayable)} | ${mark} |`);
}
say("");

// ---------------------------------------------------------------- orders: item snapshots
say("## Order items against today's catalogue (name · image · SKU · price · subtotal)");
say("");
say("| Order · line | Stored name | Rebuilt by checkout's mapper | image | SKU (stored / variant) | price (stored / variant) | subtotal | |");
say("|---|---|---|---|---|---|---|---|");
for (const o of db.orders) {
  o.items.forEach((it, i) => {
    const r = R[o.id].lines[i];
    const cl = R[o.id].codeLines[i];
    const ok = [it.productId === r.productId, it.variantId === r.variantId, it.name === r.name && cl.name === r.name,
      it.image === r.image, it.sku === r.sku, it.price === r.price, it.quantity === r.quantity, it.subtotal === r.subtotal && cl.subtotal === r.subtotal];
    const mark = flag("snapshot", ok.every(Boolean), `order ${o.id} item ${i}: ${ok.map((x) => (x ? 1 : 0)).join("")}`);
    say(`| ${o.id} · ${i} | ${it.name} | ${cl.name} | ${it.image === r.image ? "first image ✓" : "✗ " + it.image} | ${it.sku} / ${r.sku} | ${inr(it.price)} / ${inr(r.price)} | ${inr(it.subtotal)} = ${inr(r.subtotal)} | ${mark} |`);
  });
}
say("");

// ---------------------------------------------------------------- payments
const paymentFor = (orderId) => db.payments.find((p) => p.orderId === orderId);
const returnsFor = (orderId) => db.returns.filter((r) => r.orderId === orderId);
const RR = {}; // recomputed return payables
for (const r of db.returns) {
  const o = db.orders.find((x) => x.id === r.orderId);
  const ro = R[o.id];
  const sub = r.items.reduce((a, it) => {
    const li = ro.lines.find((l) => l.productId === it.productId && l.variantId === it.variantId);
    return a + li.price * it.quantity;
  }, 0);
  const share = Math.round(ro.tax * (sub / ro.sub));
  const refundAmount = sub + share;
  RR[r.id] = { sub, share, refundAmount, payable: Math.max(0, refundAmount - (r.deductionAmount || 0)) };
}
say("## Payments (amount by `createPaymentForOrder`; refunds by the cascade that booked them)");
say("");
say("| Payment | Order | Amount stored → recomputed \\| code | Status stored → expected | storeCreditApplied | Refunded stored → recomputed | refunds[] | |");
say("|---|---|---|---|---|---|---|---|");
const PAY = {};
(async () => {
  for (const p of db.payments) {
    const o = db.orders.find((x) => x.id === p.orderId);
    const ro = R[o.id];
    // what the code posts for this order (recomputed money, recorded method)
    const posted = await code.paymentPayloadByCode({ ...o, total: ro.total, amountPayable: o.amountPayable != null ? ro.payable : undefined, storeCreditUsed: ro.credit });
    const amountInd = (ro.credit > 0 && ro.payable <= 0) ? ro.total : (o.amountPayable != null ? ro.payable : ro.total);
    // refunds: a return refund books that return's payable; an order or
    // payment refund on a fully refunded payment books the whole payment.
    let expectedRefund = 0;
    const why = [];
    for (const r of returnsFor(o.id).filter((x) => x.refundStatus === "processed")) { expectedRefund += RR[r.id].payable; why.push(`return ${r.returnNumber} ${inr(RR[r.id].payable)}`); }
    if (["refunded"].includes(o.paymentStatus) && expectedRefund === 0) { expectedRefund = amountInd; why.push(`full refund ${inr(amountInd)}`); }
    // the status the code would produce from that booking
    let expectedStatus;
    if (expectedRefund > 0) {
      const booked = await code.appendRefundByCode({ ...p, amount: amountInd, refundAmount: 0, refunds: [] }, expectedRefund, "check");
      expectedStatus = booked.status;
    } else expectedStatus = posted.status === "pending" && o.paymentStatus === "paid" ? "captured" : posted.status;
    const refunded = (p.refunds || []).reduce((a, x) => a + x.amount, 0);
    PAY[p.id] = { amount: amountInd, refund: expectedRefund };
    const ok = [p.amount === amountInd && posted.amount === amountInd, p.status === expectedStatus,
      (p.storeCreditApplied === undefined || p.storeCreditApplied === ro.credit),
      (p.refundAmount === undefined ? expectedRefund === 0 : p.refundAmount === expectedRefund), refunded === expectedRefund];
    const mark = flag("cascade", ok.every(Boolean), `payment ${p.id}: ${ok.map((x) => (x ? 1 : 0)).join("")}`);
    say(`| ${p.id} | ${o.id} ${o.orderNumber} | ${inr(p.amount)} → ${inr(amountInd)} \\| ${inr(posted.amount)} | ${p.status} → ${expectedStatus} | ${p.storeCreditApplied === undefined ? "—" : inr(p.storeCreditApplied)} | ${p.refundAmount === undefined ? "—" : inr(p.refundAmount)} → ${inr(expectedRefund)}${why.length ? " (" + why.join(", ") + ")" : ""} | ${(p.refunds || []).map((x) => inr(x.amount)).join(", ") || "[]"} | ${mark} |`);
  }
  const unpaid = db.orders.filter((o) => !paymentFor(o.id));
  say("");
  say(`Orders without a payment record (the boilerplate's, kept: record counts are frozen): ${unpaid.map((o) => `${o.id} ${o.orderNumber} (${o.paymentMethod}, ${o.paymentStatus})`).join("; ")}.`);
  say("");

  // ---------------------------------------------------------------- returns
  say("## Returns (`refundAmount` = returned item subtotals + their share of the order's tax; payable = refundAmount − deduction)");
  say("");
  say("| Return | Order | Items (from the order) | Item subtotals | Tax share | refundAmount stored → recomputed | Deduction | Payable | What processing books | |");
  say("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of db.returns) {
    const o = db.orders.find((x) => x.id === r.orderId);
    const ro = R[o.id];
    const snapOk = r.items.every((it) => {
      const li = ro.lines.find((l) => l.productId === it.productId && l.variantId === it.variantId);
      return li && it.name === li.name && it.sku === li.sku && it.price === li.price && it.quantity <= li.quantity && it.subtotal === li.price * it.quantity;
    });
    const p = paymentFor(o.id);
    let books = "—";
    if (p) {
      const prior = r.refundStatus === "processed" ? 0 : (p.refundAmount || 0);
      const b = await code.appendRefundByCode({ ...p, amount: PAY[p.id].amount, refundAmount: prior, refunds: [] }, RR[r.id].payable, "check");
      books = `${inr(RR[r.id].payable)} onto payment ${p.id} (${inr(PAY[p.id].amount)}) → ${b.status}${code.isFullReturnOfOrder(o, r) ? ", full return" : ", partial"}`;
    }
    const ok = [snapOk, r.refundAmount === RR[r.id].refundAmount];
    const mark = flag("cascade", ok.every(Boolean), `return ${r.id}: ${ok.map((x) => (x ? 1 : 0)).join("")}`);
    say(`| ${r.id} ${r.returnNumber} (${r.status}, refund ${r.refundStatus}) | ${o.id} ${o.orderNumber} | ${r.items.map((it) => `${it.name} ×${it.quantity}`).join("; ")} ${snapOk ? "✓" : "✗"} | ${inr(RR[r.id].sub)} | ${inr(RR[r.id].share)} | ${inr(r.refundAmount)} → ${inr(RR[r.id].refundAmount)} | ${inr(r.deductionAmount)} | ${inr(RR[r.id].payable)} | ${books} | ${mark} |`);
  }
  say("");

  // ---------------------------------------------------------------- refunds ledger
  say("## Refunds ledger");
  say("");
  say("| Refund | Type · method | Order | Source | Amount stored → recomputed | Status | |");
  say("|---|---|---|---|---|---|---|");
  const RF = {};
  for (const f of db.refunds) {
    const o = db.orders.find((x) => x.id === f.orderId);
    let expected; let src;
    if (f.returnId != null) { expected = RR[f.returnId].payable; src = `return ${f.returnNumber} payable`; }
    else if (f.paymentId != null) { expected = PAY[f.paymentId].refund; src = `payment ${f.paymentId}'s booked refund`; }
    else { expected = PAY[paymentFor(o.id).id].refund; src = `order refund settled on payment ${paymentFor(o.id).id} (= order refundedAmount)`; }
    RF[f.id] = expected;
    const ok = [f.amount === expected, f.method !== "store_credit" || o.refundedAmount === expected];
    const mark = flag("cascade", ok.every(Boolean), `refund ${f.id}: ${ok.map((x) => (x ? 1 : 0)).join("")}`);
    say(`| ${f.id} ${f.refundNumber} | ${f.type} · ${f.method} | ${o.id} ${o.orderNumber} | ${src} | ${inr(f.amount)} → ${inr(expected)} | ${f.status} | ${mark} |`);
  }
  say("");

  // ---------------------------------------------------------------- wallet
  say("## Store-credit ledger (rebuilt from the cascade, oldest first)");
  say("");
  say("| Tx | User | Type | Source | Amount stored → recomputed | Before stored → recomputed | After stored → recomputed | |");
  say("|---|---|---|---|---|---|---|---|");
  const running = {};
  const txs = db.walletTransactions.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id - b.id));
  for (const t of txs) {
    const before = running[t.userId] || 0;
    let requested; let src;
    if (t.type === "credit" && t.refundId != null) { requested = RF[t.refundId]; src = `refund ${t.refundNumber}`; }
    else if (t.type === "credit") { requested = R[t.orderId] ? R[t.orderId].credit : t.amount; src = "credit returned on cancel"; }
    else { requested = R[t.orderId].credit; src = `order ${t.orderNumber} storeCreditUsed`; }
    const applied = t.type === "debit" ? Math.min(requested, before) : requested; // writeWalletTransaction caps debits
    const after = t.type === "credit" ? before + applied : before - applied;
    running[t.userId] = after;
    const ok = [t.amount === applied, t.balanceBefore === before, t.balanceAfter === after];
    const mark = flag("cascade", ok.every(Boolean), `wallet ${t.id}: ${ok.map((x) => (x ? 1 : 0)).join("")}`);
    say(`| ${t.id} | ${t.userId} | ${t.type} | ${src} | ${inr(t.amount)} → ${inr(applied)} | ${inr(t.balanceBefore)} → ${inr(before)} | ${inr(t.balanceAfter)} → ${inr(after)} | ${mark} |`);
  }
  say("");
  say("| User | storeCredit stored | Ledger (recomputed) | `readWalletBalance` (api.js, run on the data) | |");
  say("|---|---|---|---|---|");
  for (const u of db.users) {
    const byCode = await code.walletBalanceByCode(db, u.id);
    const rec = running[u.id] || 0;
    const ok = u.storeCredit === rec && byCode === rec;
    const mark = flag("cascade", ok, `user ${u.id} storeCredit`);
    say(`| ${u.id} ${u.email} | ${inr(u.storeCredit)} | ${inr(rec)} | ${inr(byCode)} | ${mark} |`);
  }
  say("");

  // ---------------------------------------------------------------- statuses and timestamps
  say("## Order states and timelines");
  say("");
  say("| Order | payment · fulfilment · shipping | Displayed (`deriveOrderStatus`) | Payment record | Timeline order (createdAt ≤ events ≤ updatedAt) | ₹ in notes = recomputed | |");
  say("|---|---|---|---|---|---|---|");
  const payMap = { paid: ["captured"], pending: ["pending"], refunded: ["refunded"], partially_refunded: ["partially_refunded"], voided: ["voided"] };
  for (const o of db.orders) {
    const p = paymentFor(o.id);
    const payOk = !p || (payMap[o.paymentStatus] || []).includes(p.status);
    const ats = (o.statusHistory || []).map((h) => h.at);
    const seq = [o.createdAt, ...ats];
    let mono = seq.every((t, i) => i === 0 || t >= seq[i - 1]);
    const upd = ats.every((t) => t <= o.updatedAt) && o.createdAt <= o.updatedAt;
    const del = !o.deliveredAt || (o.deliveredAt >= o.createdAt && o.deliveredAt <= o.updatedAt);
    // amounts quoted in the timeline
    const quotes = (o.statusHistory || []).flatMap((h) => (`${h.action} ${h.note || ""}`.match(/₹[\d,]+/g) || []).map((q) => Number(q.slice(1).replace(/,/g, ""))));
    const allowed = new Set([...returnsFor(o.id).map((r) => RR[r.id].payable), ...db.refunds.filter((f) => f.orderId === o.id).map((f) => RF[f.id]), R[o.id].credit]);
    const quoteOk = quotes.every((q) => allowed.has(q));
    // event ⇒ state
    const has = (re) => (o.statusHistory || []).some((h) => re.test(h.action));
    const stateOk = [
      !has(/^Order cancelled/) || o.fulfillmentStatus === "cancelled",
      !has(/^Marked delivered/) || o.shippingStatus === "delivered",
      !has(/^Fulfilled & shipped/) || ["fulfilled", "returned", "cancelled"].includes(o.fulfillmentStatus),
      !has(/^Return refund processed/) || o.fulfillmentStatus === "returned",
      !(has(/^Refund (issued|completed)/) || has(/^Return refund processed/)) || ["refunded", "partially_refunded"].includes(o.paymentStatus),
      !(o.fulfillmentStatus === "cancelled" && o.paymentStatus === "pending"), // performCancel voids an uncollected payment
    ];
    const ok = payOk && mono && upd && del && quoteOk && stateOk.every(Boolean);
    const mark = flag("status", ok, `order ${o.id} state/timeline: pay ${+payOk} mono ${+mono} upd ${+upd} del ${+del} quote ${+quoteOk} state ${stateOk.map((x) => +x).join("")}`);
    say(`| ${o.id} ${o.orderNumber} | ${o.paymentStatus} · ${o.fulfillmentStatus} · ${o.shippingStatus} | ${code.orderRules.deriveOrderStatus(o)} | ${p ? `${p.id} ${p.status}` : "none"} ${payOk ? "✓" : "✗"} | ${mono && upd && del ? "✓" : `✗ (${!mono ? "events out of order; " : ""}${!upd ? `last event ${ats[ats.length - 1]} after updatedAt ${o.updatedAt}; ` : ""}${!del ? "deliveredAt outside; " : ""})`} | ${quotes.length ? quotes.map(inr).join(", ") + (quoteOk ? " ✓" : " ✗") : "none"} | ${mark} |`);
  }
  say("");
  // returns, payments, refunds, wallet timelines
  const timeChecks = [];
  for (const r of db.returns) {
    const ats = (r.statusHistory || []).map((h) => h.at);
    const ok = ats.every((t, i) => (i === 0 ? t >= r.createdAt : t >= ats[i - 1])) && ats.every((t) => t <= r.updatedAt);
    const o = db.orders.find((x) => x.id === r.orderId);
    const afterOrder = r.createdAt >= o.createdAt;
    timeChecks.push([`return ${r.id}`, ok && afterOrder]);
  }
  for (const p of db.payments) {
    const o = db.orders.find((x) => x.id === p.orderId);
    const ok = p.createdAt <= p.updatedAt && p.createdAt >= o.createdAt && (p.refunds || []).every((x) => x.at <= p.updatedAt && x.at >= p.createdAt);
    timeChecks.push([`payment ${p.id}`, ok]);
  }
  for (const f of db.refunds) {
    const ok = f.createdAt === f.initiatedAt && (!f.settledAt || f.settledAt >= f.initiatedAt) && f.updatedAt >= f.createdAt;
    timeChecks.push([`refund ${f.id}`, ok]);
  }
  timeChecks.forEach(([w, ok]) => flag("status", ok, `${w} timestamps`));
  say(`Other timelines: ${timeChecks.map(([w, ok]) => `${w} ${ok ? "✓" : "✗"}`).join(" · ")}.`);
  say("");

  // ---------------------------------------------------------------- dates against the catalogue (V2-02/V2-03 F2)
  say("## Dates against the catalogue record (`createdAt` of the product)");
  say("");
  say("| Record | Its date | Product · created | |");
  say("|---|---|---|---|");
  // Orders are listed, not counted: their numbers encode their creation time
  // (ORD-<Date.now() in base 36>-…, or the date in ORD-YYYYMMDD-…), order
  // numbers are frozen, and Prompt 05 kept the timestamps; product createdAt
  // belongs to the catalogue's six-month window (Prompts 03/04, V2-02/03).
  const exempt = [];
  for (const o of db.orders) {
    const m = /^ORD-([0-9A-Z]{8})-/.exec(o.orderNumber);
    const bound = m && !/^\d{8}$/.test(m[1]) ? new Date(parseInt(m[1], 36)).toISOString() === o.createdAt : o.orderNumber.slice(4, 12) === o.createdAt.slice(0, 10).replace(/-/g, "");
    for (const it of o.items) {
      const p = products.get(it.productId);
      if (o.createdAt < p.createdAt) {
        exempt.push(`order ${o.id} → ${p.id}`);
        say(`| order ${o.id} ${o.orderNumber} | ${o.createdAt.slice(0, 10)}${bound ? " (the number encodes it)" : ""} | ${p.id} ${p.name} · ${p.createdAt.slice(0, 10)} | ↪ kept (frozen number / Prompt 05) |`);
      }
    }
  }
  for (const r of db.reviews) {
    const p = products.get(r.productId);
    const ok = r.createdAt >= p.createdAt;
    if (!ok) say(`| review ${r.id} | ${r.createdAt.slice(0, 10)} | ${p.id} ${p.name} · ${p.createdAt.slice(0, 10)} | ${flag("dates", ok, `review ${r.id} before product ${p.id}`)} |`);
  }
  for (const w of db.wishlist) {
    const p = products.get(w.productId);
    const ok = w.addedAt >= p.createdAt;
    if (!ok) say(`| wishlist ${w.id} | ${w.addedAt.slice(0, 10)} | ${p.id} ${p.name} · ${p.createdAt.slice(0, 10)} | ${flag("dates", ok, `wishlist ${w.id} before product ${p.id}`)} |`);
  }
  say("");
  say(`Reviews and wishlist rows dated before their product: ${fails.dates.length}. Orders dated before a product they contain (documented exceptions, not counted): ${exempt.length} (${exempt.join(", ") || "none"}).`);
  say("");

  // ---------------------------------------------------------------- deals
  say("## Deals config (the offers page's own rules: `isCouponValid`, `getProductMaxDiscount`)");
  say("");
  say("| Slot | Record | Active | Price → compare-at | Discount | Department | |");
  say("|---|---|---|---|---|---|---|");
  const cats = new Map(db.categories.map((c) => [c.id, c]));
  const deptName = (catId) => { let c = cats.get(catId); while (c && c.parentId != null) c = cats.get(c.parentId); return c ? c.name : "—"; };
  for (const id of db.dealsConfig.featuredCouponIds) {
    const c = db.coupons.find((x) => x.id === id);
    const ok = code.isCouponValid(c);
    say(`| coupon | ${c.code}: ${c.description} | ${c.isActive ? "yes" : "no"}, expires ${c.expiresAt.slice(0, 10)}, ${c.usedCount}/${c.usageLimit ?? "∞"} used | — | ${c.type === "percentage" ? c.value + "%" : inr(c.value)} | — | ${flag("snapshot", ok, `featured coupon ${id}`)} |`);
  }
  const depts = new Set();
  for (const [slot, ids] of [["deal of the day", db.dealsConfig.dealOfTheDayIds], ["grid", db.dealsConfig.featuredProductIds]]) {
    for (const id of ids) {
      const p = products.get(id);
      const d = code.getProductMaxDiscount(p);
      if (slot === "grid") depts.add(deptName(p.categoryId));
      say(`| ${slot} | ${p.id} ${p.name} | ${p.isActive ? "yes" : "no"} | ${inr(p.price)} → ${inr(p.comparePrice)} | ${d}% | ${deptName(p.categoryId)} | ${flag("snapshot", p.isActive && d > 0, `deal ${id}`)} |`);
    }
  }
  say("");
  say(`Grid departments: ${depts.size} (${[...depts].join(", ")}).`);
  say("");

  // ---------------------------------------------------------------- ratings
  say("## Ratings (approved reviews only; mean rounded to one decimal)");
  say("");
  say("| Product | Approved ratings | rating stored → recomputed | totalReviews stored → recomputed | pending / rejected | |");
  say("|---|---|---|---|---|---|");
  let zeroRows = 0;
  for (const p of db.products) {
    const mine = db.reviews.filter((r) => r.productId === p.id);
    const appr = mine.filter((r) => r.status === "approved").map((r) => r.rating);
    const avg = appr.length ? Math.round((appr.reduce((a, b) => a + b, 0) / appr.length) * 10) / 10 : 0;
    const ok = p.rating === avg && p.totalReviews === appr.length;
    const mark = flag("ratings", ok, `product ${p.id} rating`);
    if (!mine.length && ok) { zeroRows += 1; continue; }
    say(`| ${p.id} ${p.name} | ${appr.join(", ") || "—"} | ${p.rating} → ${avg} | ${p.totalReviews} → ${appr.length} | ${mine.filter((r) => r.status === "pending").length} / ${mine.filter((r) => r.status === "rejected").length} | ${mark} |`);
  }
  say(`| the other ${zeroRows} products | — | 0 → 0 | 0 → 0 | 0 / 0 | ✅ |`);
  say("");

  // ---------------------------------------------------------------- wishlist
  say("## Wishlist snapshots (`buildWishlistItem` from WishlistContext.js applied to today's product)");
  say("");
  say("| Row | User | Product | Fields compared | Differences | |");
  say("|---|---|---|---|---|---|");
  for (const w of db.wishlist) {
    const p = products.get(w.productId);
    const snap = code.buildWishlistItem(p);
    const keys = Object.keys(snap).filter((k) => k !== "addedAt" && snap[k] !== undefined);
    const diff = keys.filter((k) => !eq(w[k], snap[k]));
    const ok = !diff.length && p.isActive;
    const mark = flag("snapshot", ok, `wishlist ${w.id}: ${diff.join(",")}`);
    say(`| ${w.id} | ${w.userId} | ${p.id} ${p.name}${p.isActive ? "" : " (inactive)"} | ${keys.length}: ${keys.join(", ")} | ${diff.join(", ") || "none"} | ${mark} |`);
  }
  say("");

  // ---------------------------------------------------------------- summary
  const total = Object.values(fails).reduce((a, l) => a + l.length, 0);
  say("## Summary");
  say("");
  Object.entries(fails).forEach(([k, l]) => say(`- ${k}: ${l.length} mismatch(es)${l.length ? " — " + l.join("; ") : ""}`));
  say(`- **total: ${total}**`);
  const text = out.join("\n");
  if (mdOut) fs.writeFileSync(mdOut, text);
  console.log(text);
  process.exit(total ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
```

## Appendix B. The repair script

`node repair.cjs [path/to/db.json]`: refuses to run unless every value it replaces is the one it expects; prints each change.

```js
// repair.cjs
// V2-04 repairs: exact, once-only value changes on the parsed seed, each
// asserting the value it replaces, written back as 2-space JSON without a
// trailing newline (the file's own format). No id, order number, key, key
// order, record count or collection changes; `updatedAt` of a re-worded
// record is not moved. Usage: node repair.cjs [path/to/db.json]
const fs = require("fs");
const path = require("path");
const REPO = "/home/user/kamdhenu-furniture-e-commerce";
const file = process.argv[2] || path.join(REPO, "db.json");
const raw = fs.readFileSync(file, "utf8");
const db = JSON.parse(raw);
if (JSON.stringify(db, null, 2) !== raw) throw new Error("db.json does not round-trip; refusing to write");
const log = [];
const set = (where, obj, key, from, to) => {
  if (JSON.stringify(obj[key]) !== JSON.stringify(from)) throw new Error(`${where}.${key}: expected ${JSON.stringify(from)}, found ${JSON.stringify(obj[key])}`);
  const keysBefore = Object.keys(obj).join();
  obj[key] = to;
  if (Object.keys(obj).join() !== keysBefore) throw new Error(`${where}: key order changed`);
  log.push(`${where}.${key}: ${JSON.stringify(from)} → ${JSON.stringify(to)}`);
};
const byId = (coll, id) => {
  const r = db[coll].find((x) => x.id === id);
  if (!r) throw new Error(`${coll} ${id} missing`);
  return r;
};

// R29: settings.seo.metaTitle = index.html's <title> (Prompt 29), = DEFAULT_PAGE_TITLE (Prompt 32)
const html = fs.readFileSync(path.join(REPO, "public/index.html"), "utf8");
const title = html.match(/<title>([^<]*)<\/title>/)[1].replace(/&amp;/g, "&");
const constTitle = fs.readFileSync(path.join(REPO, "src/utils/constants.js"), "utf8").match(/DEFAULT_PAGE_TITLE =\s*"([^"]+)"/)[1];
if (title !== constTitle) throw new Error("index.html title and DEFAULT_PAGE_TITLE differ");
const desc = html.match(/name="description"\s+content="([^"]*)"/)[1].replace(/&amp;/g, "&");
if (db.settings.seo.metaDescription !== desc) throw new Error("metaDescription differs from index.html");
set("settings.seo", db.settings.seo, "metaTitle", "A & S Urbanseat | Furniture & Seating for Home, Office, Café and Outdoor", title);

// R43: WELCOME500 without the unenforced "first order" (Prompt 29's wording)
set("coupons[1 WELCOME500]", byId("coupons", 1), "description", "₹500 off your first order above ₹5,000", "₹500 off orders above ₹5,000");

// R59: banners[].gradient = the literal DESIGN_SYSTEM.md §12 gives (--sf-brand-navy)
const navy = fs.readFileSync(path.join(REPO, "src/theme/storefront-tokens.css"), "utf8").match(/--sf-brand-navy:\s*(#[0-9a-fA-F]{6})/)[1];
for (const b of db.banners) set(`banners[${b.id}]`, b, "gradient", "linear-gradient(#0b1f3f, #0b1f3f)", navy);

// R97: four review statements (no health effect, no unconfirmed service,
// nothing the product data does not back); ratings, dates, names, counts kept
set("reviews[6]", byId("reviews", 6), "body",
  "The cushions are firm in a good way and the wood has a nice even polish. Delivery took nine days and the team set it up for us.",
  "The cushions are firm in a good way and the wood has a nice even polish. Delivery took nine days, within the time we were quoted.");
set("reviews[10]", byId("reviews", 10), "body",
  "Easy to assemble and the height adjustment works well. The armrests are a bit hard for long calls.",
  "Easy to assemble and the height adjustment works well. The seat foam is a little firm for long calls.");
set("reviews[11]", byId("reviews", 11), "title", "Back pain is better", "Comfortable through long workdays");
set("reviews[11]", byId("reviews", 11), "body",
  "I sit eight or nine hours a day and this has been much easier on my lower back than my old chair.",
  "I sit eight or nine hours a day. The high back and the tilt make those days far more comfortable than my old chair did.");
set("reviews[17]", byId("reviews", 17), "title", "Sleeping much better", "A big step up from our old mattress");
set("reviews[17]", byId("reviews", 17), "body",
  "Replaced a ten-year-old mattress with this one. My shoulder aches have eased within two weeks.",
  "Replaced a ten-year-old mattress with this one. It feels even from edge to edge and has kept its shape so far.");

// R150: order 5, cancelled by the customer while cash on delivery was
// uncollected: orders.cancel → performCancel({ voidPayment: true })
const o5 = byId("orders", 5);
set("orders[5]", o5, "paymentStatus", "pending", "voided");
const cancelIdx = o5.statusHistory.findIndex((h) => h.action === "Order cancelled");
if (cancelIdx !== o5.statusHistory.length - 1) throw new Error("order 5: the cancellation is not the last event");
const cancel = o5.statusHistory[cancelIdx];
if (cancel.at !== o5.cancelledAt || cancel.by !== "Customer") throw new Error("order 5: unexpected cancel event");
const before5 = JSON.stringify(o5.statusHistory);
o5.statusHistory.push({ at: cancel.at, by: "Customer", action: "Payment voided", note: "No captured payment to refund" });
log.push(`orders[5].statusHistory: ${JSON.parse(before5).length} → ${o5.statusHistory.length} entries (+ "Payment voided" / "No captured payment to refund", by Customer, at ${cancel.at})`);

// R151: return 1 is refunded (its refund is processed; the admin writes "refunded")
const r1 = byId("returns", 1);
if (r1.refundStatus !== "processed" || !/^Refund processed/.test(r1.statusHistory[r1.statusHistory.length - 1].action)) throw new Error("return 1 is not processed");
set("returns[1]", r1, "status", "approved", "refunded");

// R153: updatedAt of orders 7, 8, 11 = their last event
for (const [id, from] of [[7, "2026-06-12T14:49:17.688Z"], [8, "2026-06-13T12:57:28.282Z"], [11, "2026-06-20T06:24:29.131Z"]]) {
  const o = byId("orders", id);
  const last = o.statusHistory[o.statusHistory.length - 1].at;
  if (!(last > from)) throw new Error(`order ${id}: last event not after updatedAt`);
  set(`orders[${id}]`, o, "updatedAt", from, last);
}

// R163: reviews 2, 3, 4 after their product's createdAt (and their order);
// wishlist rows moved together by +61 days (order and spacing kept)
const redate = [
  [2, ["2026-06-24T08:40:00.000Z", "2026-06-24T08:40:00.000Z"], ["2026-09-27T08:40:00.000Z", "2026-09-27T08:40:00.000Z"]],
  [3, ["2026-02-20T11:00:00.000Z", "2026-02-21T08:00:00.000Z"], ["2026-08-20T11:00:00.000Z", "2026-08-21T08:00:00.000Z"]],
  [4, ["2026-02-21T15:30:00.000Z", "2026-02-22T08:00:00.000Z"], ["2026-08-21T15:30:00.000Z", "2026-08-22T08:00:00.000Z"]],
];
for (const [id, [c0, u0], [c1, u1]] of redate) {
  const r = byId("reviews", id);
  const p = byId("products", r.productId);
  if (!(c1 > p.createdAt)) throw new Error(`review ${id}: still before product ${p.id}`);
  set(`reviews[${id}]`, r, "createdAt", c0, c1);
  set(`reviews[${id}]`, r, "updatedAt", u0, u1);
}
const DAY = 86400000;
for (const w of db.wishlist) {
  const to = new Date(Date.parse(w.addedAt) + 61 * DAY).toISOString();
  const p = byId("products", w.productId);
  if (!(to > p.createdAt)) throw new Error(`wishlist ${w.id}: still before product ${p.id}`);
  set(`wishlist[${w.id}]`, w, "addedAt", w.addedAt, to);
}

fs.writeFileSync(file, JSON.stringify(db, null, 2));
console.log(log.join("\n"));
console.log(`\n${log.length} changes written to ${file}`);
```
