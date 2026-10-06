# Copy and microcopy pass

**Prompt 29 of 34**

## Depends on

Prompts 01–28 (every surface exists in its final structure).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront has been redesigned over the previous prompts into a premium, editorial, warm-minimalist boutique (tokens in `prompts/DESIGN_SYSTEM.md`, brand lines in `src/content/brandContent.js`, page content in `src/content/homeContent.js` and `src/content/legalContent.js`). Data flows through the dual-mode `src/services/api.js` and `db.json`. The admin panel must not change.

## Objective

Bring every user-facing string on the storefront into one voice: refined, warm, aspirational, short, no hype. Audit and rewrite empty states, button labels, toasts, validation and error messages, hints, section eyebrows, meta titles and descriptions (the defaults; Prompt 32 wires per-page titles), and write a short voice guide so later edits stay consistent. Change words only, never logic.

## Scope — files and areas to touch

- Strings in: `src/pages/**` (non-admin), `src/components/**` (non-admin), `src/content/*.js`, `src/utils/constants.js` (`FAQ_ITEMS`, labels), `src/theme/tokens.js` (`TRUST_BADGE_CATALOG` labels only), `src/context/AuthContext.js`, `src/context/CartContext.js`, `src/context/WishlistContext.js`, `src/context/OrderContext.js` (toast and confirm texts only: `title`/`text` fields of `Swal.fire` calls; nothing else in the contexts), `public/index.html` (title/description defaults), `public/manifest.json` (description).
- `prompts/DESIGN_SYSTEM.md`: append a "Voice and microcopy" section (rules, glossary, CTA labels, state patterns).

Do not touch: `src/services/api.js` (its error messages such as "Invalid coupon code" are acceptable and shared with the admin), `src/utils/dealsConfig.js` defaults (admin-managed copy; propose changes to the client instead), admin files, `db.json` (admin-managed copy lives there; propose rewordings under "Needs client confirmation"), any logic, any class name, any `aria-*` value that is not plain text.

## Brand and design requirements

Voice rules (write them into the guide):

- Sentence case everywhere (headings, buttons, labels); no exclamation marks; no "Oops", "Yay", "Awesome", "Hurry", "Don't miss out", "Unbeatable", "Best"; no emoji.
- Short sentences, concrete nouns: "Add to cart", "Place order", "Save address", "Sign in", "Create account", "Continue", "Back", "Browse furniture", "Track order", "Remove", "Move to cart", "Copy code", "Apply", "Clear all".
- Empty states: a serif line that says what is missing + one sentence of help + one action ("Nothing saved yet." / "Pieces you save will wait here." / "Browse furniture").
- Errors: say what happened and what to do, never blame ("We couldn't load your orders. Check your connection and try again."); validation: specific ("Enter a 10-digit mobile number"), placed inline.
- Success: brief and certain ("Added to cart", "Address saved", "You're on the list").
- Money: always through `formatCurrency` (`₹1,299.00`); windows as "7–10 business days"; dates through the shared helper (see the note on `formatDate`).
- Names: "A & S Urbanseat" with spaces; "Essentials" / "Premium"; "Cash on Delivery"; "Store credit"; "Wishlist"; "Café & Restaurant Chairs"; never "non-premium".
- Honesty: no numbers that are not from data or confirmed policy; keep the "Draft for legal review" notes.
- Accessibility copy: `aria-label`s are full phrases ("Remove Classic Plastic Chair from cart"), live-region messages are short.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: words only; no change to any identifier, condition, payload, route, storage key or API call; `Swal.fire` options other than `title`/`text`/`confirmButtonText`/`cancelButtonText` untouched.
2. **Tokens**: not applicable (no styling changes; if a longer label breaks a layout, fix the label, not the CSS, unless trivial).
3. **Admin untouched**: contexts' admin paths (`AdminContext.js`) are out of scope; `api.js` untouched.
4. **Brand consistency**: one voice everywhere, per the rules.
5. **Accessible**: every `aria-label` and `alt` reads as a full phrase; headings remain meaningful when read in isolation.
6. **No fabricated trust signals**: remove any residual claim found during the audit; list it.
7. **Test before done**.

## Implementation notes

Audit method:

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–28), `prompts/DESIGN_SYSTEM.md`.
2. Extract every string: run a script over `src/` (non-admin) that lists JSX text nodes and string literals passed to `title`, `text`, `placeholder`, `aria-label`, `alt`, `label`; put the inventory in a scratch file outside the repo; review it surface by surface in the running app (JSON Server mode) so context is visible.
3. Rewrite in place; keep the inventory as a before/after table and paste it (or its summary with counts) into the build log.
4. Dates: `formatDate` is shared with the admin and uses `en-US`. If you want `en-IN` on the storefront, add `formatDateIN` to `src/utils/helpers.js` (pure addition) and switch storefront call sites only; document it. Do not change `formatDate`.
5. `db.json` admin-managed strings (`dealsConfig.hero`, `settings.store.tagline`, coupon descriptions, shipping method names/descriptions, category descriptions, product copy) are content the client controls; review them for voice and list suggested edits under "Needs client confirmation" rather than editing seed data again, unless an obvious error exists (typo, "non-premium") which you may fix directly, noting it.

## Acceptance criteria

- [ ] Inventory produced; every surface reviewed; rewrites applied; build log holds the before/after summary and the proposed `db.json` wording changes.
- [ ] No exclamation marks, hype words or emoji remain in storefront copy (grep for `!`, the banned words and common emoji ranges).
- [ ] Voice guide appended to `DESIGN_SYSTEM.md`.
- [ ] `npm run build` passes with no new warnings; no logic diff (review `git diff` to confirm only string changes, plus the optional `formatDateIN` helper).

## Test and QA

1. JSON Server mode: walk every route and every state you can trigger (empty cart, guest wishlist, failed login, invalid coupon, address errors, order cancel confirm, review submit toast, newsletter success/error, 404).
2. Widths 360 and 1440: long labels wrap acceptably.
3. Screen reader: spot-check ten `aria-label`s and the live regions.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (no data code touched).
6. Admin regression: toasts in the admin unchanged (they come from `AdminContext`/admin pages, which you did not touch).
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 29 — Copy and microcopy pass`: counts of strings changed per surface, notable rewrites, the `formatDateIN` decision, removed claims, deviations, and "Needs client confirmation" (proposed admin-managed copy, tagline/brand lines final approval).
