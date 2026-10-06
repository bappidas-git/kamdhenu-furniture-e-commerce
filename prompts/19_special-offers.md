# Special Offers / Today's Deals

**Prompt 19 of 34**

## Depends on

Prompts 01–07, 13 (product card), 05 (deals config, coupons).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. The Special Offers page is fully admin-managed through the `dealsConfig` record (`src/utils/dealsConfig.js`, `DealsConfigContext`). The admin panel must not change.

## Objective

Restyle `/special-offers` into a calm, editorial offers page: the admin-managed hero copy and countdown, featured coupons as refined "tickets", Deal of the Day and the deals grid as storefront product cards, with every selection rule, countdown rule and copy-code behaviour intact and no fake urgency.

## Scope — files and areas to touch

- `src/pages/SpecialOffers/SpecialOffers.js` + `SpecialOffers.module.css` (rewrite markup/styles; keep the logic listed under "Preserve"; replace the page's private `ProductCard`, `StarRating`, `CategoryTabs` with the storefront `ProductCard`, `StarRating` and `.sf-chip`-based tabs).

Do not touch: `src/utils/dealsConfig.js`, `src/context/DealsConfigContext.js`, `Header`/`SidebarMenu`/`Footer` deals gating, `api.js`, `db.json`, admin.

## What exists today (preserve; read `SpecialOffers.js`, 746 lines)

- `useDealsConfig()` → `{ config, loading }`; `enabled = config.enabled !== false`; loading → spinner page; `!enabled` → "No Deals Right Now" state with `h1` → `/products`.
- Data when enabled: `Promise.all([products.getAll(), categories.getAll(), coupons.getActive()])`, any failure → `[]` for all three (no error UI: add one).
- Rules: `isCouponValid` (active, not expired, not exhausted); `pickByIds` preserves the admin's order; `featuredCoupons` = admin ids or every valid coupon; `discountedProducts` sorted by `getProductMaxDiscount` desc; `dealOfTheDay` = `config.dealOfTheDayIds` or top 3; `gridProducts` = `config.featuredProductIds` or all discounted; `dealCategories` from the grid's `categoryId`s; `filteredProducts` by `activeTab`; tab fallback to "all".
- Countdown: `useDealsCountdown(config.timer)` → `resolveCountdownTarget` + `diffToParts`, ticking each second; `showCountdown` / `timerEnded` (ended note when `onExpiry: "hide"` and past).
- Sections: hero (tag, `h1` title, subtitle, "Deals end in" HH:MM:SS or ended note); Active Coupons (`couponHeadline` "20%" / "₹500" + "OFF", description, "Min order ₹X"/"No minimum order", "Up to ₹Y off", "Expires d MMM yyyy"/"No expiry", `<code>` + "Copy Code"/"Copied!" via `copyToClipboard`, 2s state; empty copy); Deal of the Day (3 cards with `-N%`, sale/original, "You save ₹X" = `originalPrice − sellingPrice`, Add to Cart); Deals by Category (category tabs with scroll buttons and `scrollIntoView`, product grid, `AnimatePresence popLayout`); skeletons; empty state → `/products`.
- `handleAddToCart` → `addToCart(buildCartItem(product), 1)`; wishlist via `toggleWishlist`/`isInWishlist`.
- Known defect: the private star rating always renders "(0)" when there are no reviews (hollow social proof) — fixed by using the storefront card.

## Brand and design requirements

- **Hero**: no gradient. A paper (or sand) editorial header: eyebrow = `config.hero.tag`, `h1` = `config.hero.title` in the display serif (accent italic is not possible from admin text, so plain serif), subtitle sans 17px, then the countdown as a quiet hairline row: label "Offers end in" + three serif numerals (HH : MM : SS, tabular-nums, 28px) with eyebrow unit labels, or the ended note in muted text when `timerEnded`; hide the row entirely when `!showCountdown`. Never add a countdown that the config did not enable.
- **Coupons** ("Codes to use at checkout", `SectionHeading`): tickets in a 2-column grid (1 on mobile): left stub with the headline value (serif 32px) and "off" eyebrow, a vertical hairline with notch, right: description, min-order/up-to lines muted, expiry muted, the code in a monospace-free `.sf-chip--selected` style (uppercase tracked sans), and "Copy code" ghost button → "Copied" (success token, `aria-live`); honest empty state copy "No codes right now." (drop "check back soon for fresh codes!").
- **Deal of the day** (only when non-empty): three large `ProductCard`s (3 columns desktop, 1 column mobile with a wider 4:5 image) with a "You save ₹X" line rendered by the page under each card (from the same math as today) — do not fork the card.
- **All offers** (`gridProducts`): `SectionHeading` with the count ("12 pieces on offer"), category tabs as a scrollable row of `.sf-chip`s (`aria-pressed`, keyboard scroll, no gradient fades; keep `scrollIntoView` for the active chip), the grid of storefront `ProductCard`s (3 columns desktop, 2 mobile), `AnimatePresence popLayout` kept (opacity only under reduced motion).
- **States**: config loading → skeleton of the hero + 4 ticket skeletons; disabled → serif "No offers at the moment." + browse link; fetch error (new) → `.sf-panel` with retry; empty → serif "Nothing on offer right now." + browse link.
- **Copy**: no "unbeatable", "don't miss out", "hurry"; the admin's hero text is rendered as given (Prompt 05 seeded calm copy; Prompt 29 may suggest wording to the client).

## Functional guardrails

1. **Preserve functionality and the data/API contract**: every rule and call above (config consumption, selection rules, countdown, coupon validity, copy-to-clipboard, cart/wishlist wiring) stays; no new endpoints; the three palettes and private components are removed.
2. **Tokens only**: zero colour literals (142 hex + 36 rgba + 21 gradients today), no `placehold.co` URLs (the card handles fallbacks).
3. **Admin untouched**: Admin → Special Offers continues to control everything; verify by toggling the master switch, the timer and the featured lists.
4. **Brand consistency**: no gradient hero, no emoji, serif numerals, hairline tickets, cards consistent with the listing.
5. **Responsive and accessible**: `h1`; countdown has `role="timer"` with an `aria-label` summarising the remaining time updated at most once per minute (not every second) to avoid chatter; chips `aria-pressed`; copy buttons `aria-label="Copy coupon code X"` + live feedback; 44px targets.
6. **No fabricated trust signals**: countdown only from config; discounts only from `comparePrice`; no "(0)" ratings; no "selling fast".
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–18), `prompts/DESIGN_SYSTEM.md`; then `SpecialOffers.js` fully, `src/utils/dealsConfig.js`, `DealsConfigContext.js`, `ProductCard.js`, `src/pages/Admin/AdminSpecialOffers.js` (read-only, to understand what the admin controls).
2. Move the rule functions (`isCouponValid`, `pickByIds`, `useDealsCountdown`, `computeCountdown`) unchanged; restyle around them.
3. Test the three timer modes: `endAt` empty (end of day), a future `endAt`, a past `endAt` with `onExpiry: "hide"` (set in Admin → Special Offers, then restore).

## Acceptance criteria

- [ ] Page matches the design; coupons, deal of the day, grid and tabs driven by the config and data exactly as before; new error state.
- [ ] Countdown behaviours verified for the three modes; disabling the page hides it and the nav entries.
- [ ] Zero colour literals; storefront cards everywhere; both modes verified.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: `/special-offers`; copy a code and apply it at checkout; add a deal to cart; switch tabs; toggle settings in Admin → Special Offers (master switch, timer, featured ids) and reload; restore the config afterwards.
2. Widths 360, 768, 1024, 1440.
3. Keyboard/screen reader: chips, copy buttons, timer label.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (`deals.getConfig`, `coupons.getActive` normalise both branches).
6. Admin regression: Admin → Special Offers and Coupons unchanged.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 19 — Special Offers`: what changed, the timer `aria` approach, deviations, client confirmations (hero copy wording).
