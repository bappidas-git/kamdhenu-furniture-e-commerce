# Responsive and accessibility audit (Prompt 31)

**Date:** 2026-10-10. **Standard:** WCAG 2.2 AA, plus the storefront's own rules: 44 × 44px touch targets 8px apart (inline links in running text excepted), no sideways scrolling, no clipped text, sticky layers never over focused content. **Scope:** every storefront route and overlay; the admin only as a regression check (it must not change). The rules this pass added for later prompts are in `DESIGN_SYSTEM.md` §41; the build-log entry is `BUILD_LOG.md`, "Prompt 31".

## 1. Method

**Builds.** Two production builds in JSON Server mode (`REACT_APP_USE_MOCK_API=true`, API on `:3001` with a scratch copy of `db.json`): the baseline from `main` at `f41b688` (Prompt 30 merged) and the finished branch. Every measurement below was taken on both, with the same scripts, in Chromium 141 (Playwright 1.56.1, headless).

**Routes (27 states).** `/`; `/products`, a category (`?category=plastic-furniture`), a search (`?search=chair`); two product pages (`covered-plastic-shoe-rack`: variants by option; `classic-plastic-armchair`: colour swatches); `/special-offers`; `/help`, `/support`, `/about`; the four policies; `/nonexistent`; `/wishlist` as a guest (two saved pieces) and signed in; `/checkout` as a guest and signed in with store credit; `/order-confirmation/:orderNumber`; `/orders` signed in and as a guest; `/profile` (details, addresses, password, store credit) and as a guest.

**Overlays (50 states).** The cart drawer, search (with results), the auth modal (sign-in, and sign-up with errors), the sidebar, the mega-menu, the filter sheet, the review modal, the account menu, and the four SweetAlert confirms (sign out, clear wishlist, delete address, cancel order), each at 360 (touch) and 1440px (sidebar and sheet at 768px too), light and dark; checkout's four steps (plus a new address with errors) at 360 and 1440px, light and dark.

**Viewports.** 320, 360, 390, 768, 1024, 1280, 1440, 1920 and 667 × 375 (a phone on its side). Touch widths are emulated with `hasTouch`, so `(pointer: coarse)` and `(hover: none)` apply.

**Checks.**

| Check | How |
|---|---|
| Overflow, clipped text, sticky overlap | 243 page states (27 × 9 viewports): `scrollWidth` against the viewport and the offending elements; every element whose text is cut (ellipsis, line clamp, clipped overflow); every fixed and sticky layer sampled at 25 / 50 / 80% scroll for overlaps (729 samples) |
| axe-core 4.7.0 (WCAG 2.0–2.2 A/AA rules) | 162 page states (27 × 360 light and dark, 768 light, 1024 dark, 1440 light and dark), every overlay state and checkout step |
| Structure | one `main`, one `h1`, heading order, landmarks and their names, image alternatives and reserved sizes, field labels / `autocomplete` / `inputmode` / `aria-describedby`, positive `tabindex`, unstyled lists |
| Touch targets | every pointer target at 360px touch: its box and its effective hit area (sampled with `elementFromPoint`, so overlapping or clipped areas count as lost), against 44 × 44 |
| Keyboard | Tab and Shift+Tab through 18 routes at 390 and 1440px, light (and 7 routes in dark): every stop's focus indicator (a style change on the element, its parent or child), `:focus-visible`, and whether a fixed or sticky layer hides it (`elementFromPoint` on a 3 × 3 grid); traps; overlays (focus on open, cycling, Escape, focus return); route changes; the skip link |
| Contrast | `node scripts/check-contrast.js` (the token pairs, in both modes); axe's `color-contrast` on every state |
| Text spacing (WCAG 1.4.12) | line height 1.5, paragraph spacing 2em, letter spacing 0.12em, word spacing 0.16em injected on 6 routes (home, listing, product, checkout, offers, help) at 360 and 1440px; text newly clipped and sideways overflow recorded |
| Landscape overlays | the auth modal, cart drawer, search and sidebar at 667 × 375: what scrolls, how much of it is in view, and where Tab ends |
| Links in text (1.4.1) | links inside running text on 9 routes: distinguishable without colour (underline) |
| Reduced motion | `reducedMotion: "reduce"` on 6 routes at 390 and 1440px: no running animation at rest, every transition 0.01ms |
| Print | the invoice printed to A4 PDF from the confirmation page in both modes, with the skip link focused |
| Lighthouse 12.2.1 | Accessibility category, mobile and desktop presets: home, listing, product, checkout (signed in, with a cart) |
| Admin regression | 7 admin screens (login, dashboard, products, orders, categories, settings, reviews) at 390 and 1440px on both builds, each once its web fonts had loaded: pixel diff, every element's box, the loaded fonts, no skip link, no `inert` |

**Not available here:** a screen reader. VoiceOver, NVDA and TalkBack cannot run in this environment; the accessibility tree was checked through axe, Playwright's ARIA snapshots and the structure probe instead. Before launch, walk these flows with VoiceOver (Safari, iOS) and NVDA (Firefox or Chrome, Windows): the skip link and a route change; the header and the mega-menu; a listing's filters and pagination; a product page (variants, gallery, add to cart); the cart drawer; checkout from cart to confirmation; the account pages.

## 2. Results, before and after

| Measure | Baseline | After |
|---|---|---|
| axe serious or critical violations (pages, overlays, checkout) | 0 | 0 |
| axe minor violations | 130 nodes (`image-redundant-alt`: card photographs whose alt repeated the link's name; 102 on pages, 28 in search) | 0 |
| Pages that scroll sideways | 1 (`/profile?tab=wallet` at 320px, 2px) | 0 |
| Clipped text | card names at 2 lines (24 states, 320–390px), a card brand (320px), the sticky bar's name (5) and chosen option (2) | the sticky bar's name at 320–360px only (kept: it repeats the page's `h1`) |
| Sticky layers overlapping each other | 0 of 729 samples | 0 |
| Pointer targets under 44 × 44 at 360px (pages) | 12 kinds, 156 instances | 0 (the review carousel's dots no longer take taps on touch screens) |
| Pointer targets under 44 × 44 (overlays, checkout at 360px) | 19 in overlays (cart 2, search 7, sidebar 1 at 360 and at 768px, filter sheet 4 at 360 and at 768px); 21 across checkout's steps (the header logo, the footer logo and "Terms", the "Edit" links) | 0 |
| Keyboard stops entirely hidden under a fixed or sticky layer | 12 (6 routes) | 0 of 4,059 stops, forwards and backwards (18 routes × 390, 1440px); 0 of 1,042 in dark mode (7 routes) |
| Keyboard stops partly under a layer, 500ms after the key | — | forwards 1 (the Terms page's contact links in running text, row 17); backwards 19 at 390px: the footer's Subscribe sits 4px under the header while the footer's scroll reveal finishes rising, and the guard's second look corrects it about 1s after the key (0 when each key waits 1.8s) |
| Keyboard stops with no visible indicator | 0 | 0 (light and dark) |
| Focus lost to `<body>` while tabbing | yes (the mega-menu, fast Tab while a panel leaves) | no |
| Skip link | none | first focusable element; Enter focuses `<main>` |
| Page behind an open drawer or dialog | reachable by the pointer and a virtual cursor | `inert` |
| Destructive confirms that open on the destructive button | 2 (clear wishlist, delete address) | 0 |
| Text newly clipped under WCAG 1.4.12 spacing (12 states) | 21 (20 card names, the sticky bar's option) | 1 (the sticky bar's name, kept) |
| Cart drawer at 667 × 375 | the lines' scrolling strip 17px tall | the whole panel scrolls (375 of 765px in view); Tab keeps the focused line in view |
| Lighthouse Accessibility (mobile / desktop) | not measured | home 100 / 100, listing 100 / 100, product 100 / 100, checkout 100 / 100 |
| `check-contrast.js` | every pair passes | every pair passes (no token changed) |
| Admin | — | 14 screens pixel-identical, every element's box identical (2,991 on the products list); no skip link; nothing `inert` |

## 3. Findings

WCAG references are to 2.2. "44px rule" is the storefront's touch-target rule (stricter than 2.5.8's 24px). Status: **Fixed**, **Pass** (checked, conforms; kept as is) or **Deferred** (with the owner).

| # | Route | Width / mode | Issue | WCAG | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | All | All | No way to skip the header and its menus | 2.4.1 | `SkipLink`: `<a class="sf-skip-link" href="#main-content">Skip to content</a>`, the first child of `.App`; `<main id="main-content" tabIndex={-1}>`; focuses `<main>` without writing a hash; no ring on `<main>` | Fixed |
| 2 | All (route changes) | All | After following a link in the header, footer or bottom bar, focus stayed on that link, or fell to `<body>` with the page that held it: the next Tab did not start at the new page, and a screen reader was not told the page had changed | 2.4.3 | On a new path (not a URL-correcting replace, not the first page) focus not inside `<main>` moves to the skip link, after any closing drawer has handed focus back; pages that focus their own heading keep doing so (`isFocusUnplaced`) | Fixed |
| 3 | `/products`, a category, `/support`, `/wishlist` | 1440 | Tab landed on controls the sticky header covered completely (sort, the grid / list toggle, the support form's fields, the wishlist's sort and "Clear all"): the browser does not scroll a control it considers in view | 2.4.11 | `useFocusNotObscured`: after a keyboard focus move, scrolls a control under a fixed or sticky layer into the free band, with 16px to spare; looks again once the header or a scroll reveal has finished moving | Fixed |
| 4 | Product page, `/wishlist` | 390 | Tab landed under the bottom bars: the bottom nav's "Home" under the sticky add-to-cart bar; "Move to cart" under the bottom nav | 2.4.11 | The guard (row 3); the sticky bar measures where the bottom nav will rest, not where it is mid-slide, before stepping aside | Fixed |
| 5 | Product page | 390, 1440 | Shift+Tab: a sticky rail at the end of its run (the section nav, the gallery) partly under the header | 2.4.11 (partial; 2.4.12 AAA) | The guard treats a sticky element's own layer as its own and scrolls a rail pushed under the header back out | Fixed |
| 6 | All with the header | 1024+ | Tabbing fast along the department row while a mega-menu panel faded out: focus entered the leaving panel and dropped to `<body>` when it unmounted | 2.4.3, 2.1.1 | The panel is `inert` while it exits | Fixed |
| 7 | Cart drawer, auth modal, filter sheet, review modal, search, sidebar | All | The page behind an open layer stayed reachable by a pointer (through gaps) and by a screen reader's virtual cursor (`aria-modal` alone is not honoured everywhere) | 4.1.2, 2.4.3 | `useFocusTrap` makes everything outside the layer `inert` while it is open (not the backdrop, not SweetAlert's toasts) and lifts it before focus returns | Fixed |
| 8 | Header (signed in) | All | The account button was named "BAccount": the avatar's initial was read into its name | 2.5.3, 4.1.2 | The avatar is `aria-hidden` | Fixed |
| 9 | Search, account nav (≤ 900px), offers, profile, listing filters and applied filters, orders, variant chips | 360 touch | Chips gave a 42px target (a −6px inset measured from inside the 1px border); variant chips 42px | 44px rule | The `.sf-chip` primitive carries a 44px-tall `::after` (centred on the padding box); the five per-page copies removed; wrapped rows 12px apart so areas never overlap | Fixed |
| 10 | Header, footer | ≤ 767 | The header logo link 28px tall; the footer logo 40px | 44px rule | A 44px-tall `::after` on each (the ring still hugs the logo) | Fixed |
| 11 | Footer, sidebar | 360 touch, 768 | "Terms" 35px (footer) and 38px (sidebar) across | 44px rule | A 44px-wide `::after` for a short label | Fixed |
| 12 | Product pages, listings | ≤ 767 | Wrapped breadcrumb lines 23.5px apart, so the 44px areas of links on two lines overlapped (effective 23px); 46 of 74 trails wrap at 360px, 63 at 320px | 44px rule, 2.5.8 | On phones and touch screens wrapped lines sit 44px apart; each link's area is ≥ 44 × 44; the listing and product page reserve one line plus 44px for the phone trail | Fixed |
| 13 | Profile (addresses), checkout (review) and every `.sf-btn--link` | 360 touch | A short text button ("Edit") 40px across | 44px rule | The primitive's `::after` is never less than 44px across | Fixed |
| 14 | Home (reviews) | 360 touch | The review's product link 18px tall; the dots 24px wide and side by side | 44px rule | The link carries a 44px `::after`; on touch screens the dots are position marks only (swipe and the 44px buttons move the carousel; the dots stay buttons for a keyboard and a screen reader) | Fixed |
| 15 | Cart drawer | 360 | A line's name link 19px tall (its two-line clamp clipped any hit area) | 44px rule | The clamp moved to a span inside; the link carries a 44px `::after` | Fixed |
| 16 | `/orders` | 390, 1440 | "Placed on" took clicks and covered the copy-order-number button's lower edge (the 44px button overhangs its text-high row) | 2.5.8, 2.4.11 (partial) | `.copy { position: relative; }` | Fixed |
| 17 | `/terms` and other policies | 390 | The contact links in running text sit close on wrapped lines | 2.5.8 (inline exception) | — | Pass |
| 18 | `/profile?tab=wallet` | 320 | A ledger order number (`.sf-btn`, `nowrap`) pushed the page 2px sideways | 1.4.10 | It breaks (`white-space: normal; overflow-wrap: anywhere`) | Fixed |
| 19 | Cart drawer | 667 × 375 | The header, the free-delivery line and the footer left the lines a 17px scrolling strip | 1.4.10 | At 500px tall or less the panel scrolls as a whole | Fixed |
| 20 | Home rails, offers, wishlist, related pieces | 320–390 | Card names cut at two lines (a 116px rail card needs four for the longest names, five with 1.4.12 spacing); a brand cut at 320px | 1.4.10, 1.4.12 | Phones show the brand and name in full; the two-line clamp stays from 768px | Fixed |
| 21 | Product pages | 320–390 | The sticky bar cut the chosen option to "2…" | 1.4.10 | Below 400px the bar drops its thumbnail, so the option fits | Fixed |
| 22 | Product pages | 320–360 | The sticky bar's name ends in an ellipsis | 1.4.10 | — (a one-line summary that repeats the page's `h1`, full text in the DOM) | Pass |
| 23 | Every product card | All | The photograph's alt repeated the link's name (axe `image-redundant-alt`) | 1.1.1 | `alt=""`, `aria-hidden` | Fixed |
| 24 | Every product card | All | The quick add was "Add <name> to cart" beside the visible "Add to cart" | 2.5.3 | "Add to cart, <name>" ("Sold out, <name>"), as the list row already was | Fixed |
| 25 | Cards, list rows, product page | All | The wishlist toggles changed their name with their state ("Save…" / "Remove…") while also carrying `aria-pressed`, so a screen reader heard "Remove …, pressed" | 4.1.2 | One name ("Save <name> to wishlist", "Save to wishlist"); the state is `aria-pressed` | Fixed |
| 26 | Grids, rails, cart, checkout, orders, wishlist, addresses, ledger, reviews, help topics, search, offers | All | `list-style: none` lists lose their list semantics in Safari (no "list, 12 items") | 1.3.1 | `role="list"` on 23 content lists, each with a lint note saying why | Fixed |
| 27 | `/wishlist`, `/profile?tab=addresses` | All | "Clear all" and "Delete" confirms opened on the destructive button (Enter cleared or deleted at once); "Clear all" used a hard-coded red | 3.3.4 (best practice) | `focusCancel: true`; the token-styled `sf-btn sf-btn--danger` | Fixed |
| 28 | `/special-offers` | All | The countdown ticks every second beside the page with no way to stop it | 2.2.2 | "Hide seconds" takes the ticking figure away (the clock then changes once a minute); "Show seconds" brings it back | Fixed |
| 29 | Cart drawer | All | The "Added to cart" toast sat over Checkout for its two seconds | 2.4.11, usability | While the cart is open a success toast is clipped out of sight (still announced, `role="alert"`); error toasts show | Fixed |
| 30 | All (Windows contrast themes) | All | A transparent logo PNG could vanish on the system canvas | 1.4.11, 1.1.1 | The logo keeps its own ground under `forced-colors: active` (paper behind the light logo, navy behind the white) | Fixed |
| 31 | Keyboard, all routes | 390 | Shift+Tab into the footer newsletter: the field rose 20px under the header with its scroll reveal after focus arrived | 2.4.11 (partial) | The guard's second look waits for the reveal to finish | Fixed |
| 32 | All | All | Every route has the same document title | 2.4.2 | — | Deferred to Prompt 32, which owns `usePageMeta` (per-page titles) |
| 33 | All | All | `public/index.html` has no `viewport-fit=cover`, so the `env(safe-area-inset-*)` paddings resolve to 0 | — | — (iOS then keeps the page clear of the notch and home indicator; nothing is covered). `index.html` is shared with the admin | Pass |
| 34 | Product cards; the header's and bottom bar's Wishlist and Cart | All | Lighthouse's experimental (unscored) label-in-name audit: the card link's name is the product (the brand is its description); "Wishlist, 3 pieces" beside a visible "3 Wishlist" | 2.5.3 | — (the label, the product's name or "Wishlist" / "Cart", starts each name; the count and the brand are not the label. Kept from Prompt 13: the brand as a description, so a listing does not say "Nilkamal" 24 times) | Pass |
| 35 | Eyebrows, headings that take focus | All | Uppercase eyebrows (CSS `text-transform`); headings focused on arrival show no ring | 2.4.7 | — (screen readers read the text as written; a focused heading is a reading position, not a control) | Pass |
| 36 | Forms (auth, checkout, addresses, password, support, newsletter) | All | — | 1.3.1, 1.3.5, 3.3.1 | — (every field has a label, the personal ones `autocomplete` and the right `inputmode`, per the structure probe on all 27 states; checkout's new address, submitted empty, marks its five required fields `aria-invalid` with hint and error in `aria-describedby` and moves focus to the first; the auth modal's sign-up, submitted empty, moves focus to its first invalid field) | Pass |
| 37 | Toasts and status messages | All | — | 4.1.3 | — (SweetAlert's toast is `role="alert"`, `aria-live="polite"`; the cart drawer's quantities and free-delivery line, the offers' copy and grid lines, the order cancel are live regions) | Pass |
| 38 | Hero, space tiles | All | Text on photographs | 1.4.3 | — (the scrim pairs in `check-contrast.js`: 5.77 : 1 for text, 3.14 : 1 for the caramel accent and the focus ring) | Pass |
| 39 | Invoice | Print | — | — | — (one A4 page in both modes; the skip link and the shell never print) | Pass |

## 4. Text spacing and landscape

**Text spacing.** With WCAG 1.4.12's spacing on 6 routes at 360 and 1440px, nothing scrolls sideways before or after. Before, 20 card names (home, listing, product page rails at 360px) and the sticky bar's chosen option lost their last words; after, only the sticky bar's one-line name is cut, and the product's name is the page's `h1` right above it.

**Landscape (667 × 375).** The auth modal scrolls its body (341 of 660px in view), search its results (310 of 350), the sidebar its list (315 of 1,289), and since this pass the cart drawer its whole panel (375 of 765). In each, Tab ends on a control in view. The bottom sheet and the review modal follow the same overlay contract (§19.1).

**Links in text.** Every link inside running text on the 9 routes checked is underlined at rest (1.4.1), before and after.

## 5. How to re-run

The audit scripts are not part of the repository (they drive a browser against two builds). To repeat the essentials by hand: build in JSON Server mode (`REACT_APP_USE_MOCK_API=true REACT_APP_API_URL=http://localhost:3001 npm run build`, never the default `.env.production`, which points at the live API), serve `build/` and run axe (browser extension or `@axe-core/cli`) on the routes in section 1 at 360 and 1440px in both modes; Tab and Shift+Tab through them at 390 and 1440px; check each touch target at 360px with the device toolbar's touch emulation; run Lighthouse's Accessibility category on home, listing, product and checkout; and `node scripts/check-contrast.js`.
