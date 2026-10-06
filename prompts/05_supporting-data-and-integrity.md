# Supporting data and referential integrity

**Prompt 5 of 34**

## Depends on

Prompts 02 (brand constants and contact facts), 03 and 04 (the 84-product catalogue and `scripts/validate-db.js`).

## Context

A & S Urbanseat's storefront (Create React App; dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json` as the mock database) now carries the brand's catalogue, but every other collection still describes the boilerplate's electronics store and references products that no longer exist. The storefront reads: `settings` (`apiService.settings.get`: `store.*`, `payment.codEnabled/codFee/codMinOrder/codMaxOrder`, `store.taxRate/taxIncluded`, `social.*`, `seo.*`), `shipping_methods` (`apiService.shipping.getMethods`, active only; `freeAbove` drives the free-shipping badge and cart progress), `coupons` (`coupons.getActive`, `coupons.validate`), `reviews` (approved only on product pages; all of a user's own via `reviews.getMine`), `dealsConfig` (`deals.getConfig`), `wishlist`, `orders`, `returns`, `walletTransactions` (store-credit ledger, the source of truth for `users[].storeCredit`), `payments` and `refunds` (admin finance). The admin manages all of it and must keep working.

## Objective

Reseed every supporting collection as A & S Urbanseat content with the exact existing field shapes, restore referential integrity after the catalogue swap (orders, returns, reviews, wishlist, deals config, payments, refunds, wallet ledger), keep the demo accounts working, make ratings agree with seeded reviews, and finish with a passing full-mode validator run.

## Scope — files and areas to touch

- `db.json` → `settings`, `shipping_methods`, `coupons`, `reviews`, `dealsConfig`, `wishlist`, `orders`, `returns`, `payments`, `refunds`, `walletTransactions`, `banners`, `leads` (only `orderNumber` references if an order number changes; keep the four records), `users` (only the `storeCredit` cache and nothing else), `products` (only `rating` and `totalReviews`).
- `src/utils/constants.js`: only `FREE_SHIPPING_THRESHOLD`, which must equal the Standard method's `freeAbove` (the header banner and the cart drawer read it today). No other code change.
- `scripts/validate-db.js`: enable full mode.

Do not touch: `admins`, `cart` (stays `[]`), `users` beyond `storeCredit`, product/category content, anything under `src/` except the one constant, `public/`.

## Brand and design requirements

Content to seed, collection by collection:

### `settings` (keep every key; change values only)

- `store`: `name: "A & S Urbanseat"`, `tagline: "Trusted Comfort for Every Home"`, `email`, `phone`, `address` as set in `src/utils/constants.js` by Prompt 02 (`info@kamdhenufurniture.com`, `+91 84729 18653`, `Assam, India`, all flagged placeholders), `currency: "INR"`, `currencySymbol: "₹"`, `timezone: "Asia/Kolkata"`, `logo: null`, `favicon: null` (the storefront uses `LOGO_URLS`; the admin settings form still shows these fields), `taxRate: 18`, `taxIncluded: false` (GST on furniture is commonly 18%; flag).
- `payment`: `codEnabled: true`, `codFee: 0`, `codMinOrder: 0`, `codMaxOrder: 50000` (placeholder; furniture orders often exceed it, flag), gateways disabled as now.
- `shipping`: unchanged except `defaultWeight: 8` and `defaultDimensions` suited to a chair carton (flag).
- `notifications`: emails → the support email placeholder.
- `seo`: `metaTitle` and `metaDescription` matching Prompt 02's `index.html` values.
- `social`: `whatsapp: "https://wa.me/918472919541"`, others `""`.

### `shipping_methods` (keep four records and ids; change values)

1. `Standard Delivery` — `carrier: "Shiprocket"`, `description: "Delivered in 7–10 business days"`, `rateType: "flat"`, `flatRate: 499`, `freeAbove: 9999`, `estimatedDays: "7-10"`, `isActive: true`.
2. `Express Delivery` — `flatRate: 999`, `freeAbove: null`, `estimatedDays: "3-5"`, `isActive: true`.
3. `Same Day Delivery` — keep the record, `isActive: false` (the business has not confirmed a same-day service).
4. `Free Shipping` — keep, `isActive: false`.

Set `FREE_SHIPPING_THRESHOLD = 9999` in `constants.js` to match. Flag every rate, window and the threshold for confirmation.

### `coupons` (keep five records and ids; brand the codes; keep the mix of fixed/percentage/expired/exhausted so the admin and checkout flows stay testable)

`WELCOME500` (fixed ₹500, min ₹5,000), `FLAT10` (10%, max ₹2,000, min ₹2,000), `FESTIVE25` (inactive, expired, exhausted — replaces SUMMER25), `NEWHOME20` (20% first order, max ₹3,000), `OFFICE15` → rename to `WORKSPACE15` only if you keep its description honest: coupons have no category restriction in this schema, so describe it as "15% off orders above ₹15,000", not "off office furniture". Dates: expiries in 2027 for active codes. Flag the codes and values.

### `dealsConfig`

`enabled: true`; `hero.tag: "This week"`, `hero.title` and `hero.subtitle` in the brand voice (no "unbeatable", no "don't miss out"); `timer`: `enabled: true`, `endAt: ""`, `onExpiry: "endOfDay"` (the admin controls this); `featuredCouponIds`: two active coupon ids; `dealOfTheDayIds`: three products that have a `comparePrice`; `featuredProductIds`: six to eight discounted products across departments; `updatedAt` now.

### `banners` (keep three records and keys)

Reseed with brand copy and department links (`/products?category=plastic-furniture` etc.) and set `gradient` to the flat navy value from `DESIGN_SYSTEM.md` (the field must stay a string). The redesigned hero (Prompt 10) does not render this collection; it stays consistent so nothing points at electronics.

### `orders`, `payments`, `refunds`, `returns`, `walletTransactions`, `users.storeCredit`

Keep all 11 orders with their `id`, `orderNumber`, `userId`, statuses, addresses, `couponCode`, `paymentMethod`, timestamps and `statusHistory` shape. Replace each `items[]` entry with a snapshot of a real new product/variant (`productId`, `variantId`, `name` "Product – Variant" as the checkout builds it, `image` = that product's first image, `sku` = the variant SKU, `price`, `quantity`, `subtotal`). Then recompute money with the same rules the checkout uses (read `src/pages/Checkout/Checkout.js` to confirm): `subtotal` = Σ `item.subtotal`; `discountAmount` per the order's coupon (fixed or percentage capped by `maxDiscount`, 0 when no coupon); `shippingAmount` = the chosen method's `flatRate` or 0 when `subtotal − discountAmount ≥ freeAbove`; `taxAmount` = round((subtotal − discountAmount) × `taxRate` / 100); `total` = subtotal − discountAmount + shippingAmount + taxAmount. Preserve any store-credit fields an order carries (`storeCreditUsed`, `amountPayable`, `storeCreditReturned`, `pendingRefund`, `refundStatus`, `cancelReason`, `cancelledAt`, `recall`) and recompute `amountPayable = total − storeCreditUsed` where present. Then cascade:

- `payments[]`: `amount` = the linked order's `amountPayable` (or `total`), `refundAmount`/`refunds[].amount` scaled to the new amount where a refund was booked, statuses unchanged.
- `refunds[]`: `amount` = the matching payment refund or return refund.
- `returns[]`: `items[]` snapshots from the linked order, `refundAmount` = Σ returned item subtotals (+ proportional tax as the current data does; read the two records and keep their rule), `deductionAmount` as is.
- `walletTransactions[]`: keep the three rows and their `type`, order links and timestamps; set `amount`, `balanceBefore`, `balanceAfter` so the ledger is a consistent running balance; set `users[2].storeCredit` (the `mail4bappidas@gmail.com` demo account) equal to the ledger's final balance. The other two users stay at `0`.
- `statusHistory[].note` strings that quote an amount ("₹10,439 refunded") must be updated to the new amounts.

### `reviews` (replace the eight records with 20–26, keep the key set)

- Only `status: "approved"` reviews count toward `rating`/`totalReviews`; include 3–4 `pending` and 1–2 `rejected` rows so the admin moderation queue and the order-history "your review" states stay demonstrable.
- `isVerifiedPurchase: true` only when the `userId` has an order containing that `productId` (use the reseeded orders); the others `false` with `userId: null` is allowed by the current data (two seed rows have `userId: null`).
- Ratings 3–5, titles ≤ 60 characters, bodies 1–3 sentences in a natural customer voice (not marketing), `helpfulCount` 0–12, dates after the order date.
- Cover 14–18 distinct products across all departments; several products must keep `totalReviews: 0` (the honest empty state must remain visible somewhere).
- Then set each product's `rating` = mean of its approved ratings rounded to one decimal and `totalReviews` = count of approved reviews; `0`/`0` elsewhere.
- Seeded reviews are demo content: list them under "Remove or replace before launch".

### `wishlist` (user 3's three rows)

Point at three new products with correct snapshots (`slug`, `name`, `image`, `brand`, `price`, `comparePrice`, `rating`, `totalReviews`, `shortDescription`, `variants`, `stock`, `trending`, `hot`).

### `leads`

Keep the four records; only update `orderNumber` if it no longer matches an order (it should still match `ORD-20250310-0001`).

## Functional guardrails

1. **Data/API contract**: content only; key sets unchanged in every collection; no new collection; `src/services/api.js` untouched. The one code change is the `FREE_SHIPPING_THRESHOLD` constant value.
2. **Tokens**: not applicable (the `banners.gradient` string takes its value from `DESIGN_SYSTEM.md`).
3. **Admin untouched**: Admin → Orders, Returns, Payments, Coupons, Reviews, Shipping, Special Offers, Settings and Users must open every record and every dialog without errors; a refund flow on a reseeded order must still cascade (test one in a scratch copy of `db.json` and restore the file afterwards, or verify by reading the cascade code in `api.js`).
4. **Brand voice** in hero copy, coupon descriptions and shipping names; no "non-premium".
5. **Responsive/accessible**: not applicable.
6. **No fabricated trust signals**: ratings derive from seeded reviews only; no inflated `helpfulCount`; the coupon `usedCount` values stay modest and below `usageLimit` for active codes.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (Prompts 02–04), `prompts/DESIGN_SYSTEM.md`, then `db.json` in full, `src/pages/Checkout/Checkout.js` (money math and payload), `src/pages/OrderHistory/OrderHistory.js` (status derivation, review eligibility), the `orders.cancel`, `performCancel`, `reflectReturnRefund`, `writeWalletTransaction` and `computeWalletBalance` sections of `src/services/api.js`, and `src/utils/dealsConfig.js`.
2. Do the cascade with a script; print a before/after table of order totals, payment amounts and the wallet ledger, and paste it into the build log.
3. Enable full mode in `scripts/validate-db.js`: orders/returns/reviews/wishlist/deals references exist; order money math holds; payment amounts match orders; wallet ledger is a consistent running balance equal to `users[].storeCredit`; `rating`/`totalReviews` match approved reviews; active coupon invariants; `FREE_SHIPPING_THRESHOLD` equals the Standard method's `freeAbove` (read the constant from the file with a regex).
4. Demo accounts remain: `user@example.com` / `password123`, `jane@example.com` / `password123`, `mail4bappidas@gmail.com` / `Bappi@12345`, admin `admin@store.com` / `admin123`.

## Acceptance criteria

- [ ] Every collection reseeded as listed, with identical key sets; `node scripts/validate-db.js` (full mode) passes.
- [ ] Logged in as each demo user, `/orders` renders every order with new product names and images; cancel is offered only where the existing rules allow; the `mail4bappidas@gmail.com` wallet shows the ledger and the same balance as the profile.
- [ ] Product pages show seeded reviews and matching rating/count; products without reviews show the honest empty state.
- [ ] `/special-offers` shows the configured coupons and products with a live countdown.
- [ ] Checkout in JSON Server mode: shipping methods, COD and coupon `WELCOME500` behave with the new values; the free-shipping line appears at the new threshold.
- [ ] Admin modules open every reseeded record; the dashboard stats compute.

## Test and QA

1. JSON Server mode, as `mail4bappidas@gmail.com`: `/orders` (expand an order, tracking, return/exchange dialog), `/profile` wallet tab (balance equals ledger), `/wishlist` (three items, move to cart), a reviewed product page, `/special-offers` (copy a code), checkout to the Review step with COD and store credit applied (do not place an order; or place one and then restore `db.json` from git if you want to test the whole flow, documenting that you did).
2. Widths 360, 768, 1024, 1440: order cards and review lists with the new names.
3. Keyboard: not applicable beyond existing flows.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. Admin: Orders (open an order with a refund), Returns, Payments (refund history), Coupons, Reviews (approve a pending one, then revert), Special Offers, Settings (save without changes), Users.
6. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 05 — Supporting data and integrity`: what changed per collection, the cascade table, the review/rating mapping, placeholders ("Needs client confirmation": tax rate, COD limits, shipping rates and windows, free-shipping threshold, coupon codes, store contact), and "Remove or replace before launch" (demo reviews, demo orders, placeholder images, placeholder prices, demo accounts).
