# A & S Urbanseat Storefront — Build Log

Each build prompt (`prompts/01_*.md` … `prompts/34_*.md`) runs in a fresh session and ends by appending an entry here: what changed, decisions taken, new tokens/components/content modules, deviations from the prompt, and anything that needs client confirmation. Read this file before starting any prompt.

---

## Prompt 01 — Brand design system and theme tokens

**Date:** 2026-10-07. **Result:** the storefront's token layer is the A & S Urbanseat system: warm paper, ink, logo navy, caramel accent, Playfair Display + Inter, sharp radii, hairlines, slow motion. Full reference: `prompts/DESIGN_SYSTEM.md`.

### What changed

| File | Change |
|---|---|
| `src/theme/storefront-tokens.css` | Rewritten. All 77 pre-existing `--sf-*` names still defined (legacy ones as aliases), plus the new palette, type, spacing, container, motion, z-index and always-dark tokens. Light on `:root`, dark on `body.dark`; colour-reading aliases/composites in a shared `:root, body.dark` block so they re-resolve in dark mode; reduced-motion block collapses durations to `0.01ms`, stagger to 0, reveal distance to 0. |
| `src/theme/colors.js` | `LIGHT`/`DARK` mirror the CSS (primary = ink with navy hover, secondary = navy, new `accent`, `divider`, `action`, semantic colours, `contrastText`). `gradient.*` and `bodyBackground` kept as flat colours. New `BASELINE_BODY` export (admin baseline, see deviations). |
| `src/theme/tokens.js` | `TOKENS` mirrors the new radius and spacing values and adds `container`, `type` (families, sizes, weights, leading, tracking, measure) and `motion` (framer-ready eases and durations in seconds, plus `durationMs`, `revealDistance`, `stagger`). `STOREFRONT_CONFIG`, `TRUST_BADGE_CATALOG` and `resolveTrustBadgeDetail` untouched. |
| `src/context/ThemeContext.js` | One `buildStorefrontTheme(mode)` (memoised) replaces the two inline `createTheme` calls: palette from `colors.js`, typography from `TOKENS` (h1–h4 Playfair on the display scale, body1 16/1.6, button sans 500 with no transform, overline = eyebrow), `shape.borderRadius` 2. Gradient buttons, hover lifts, glass drawers/app bars and neon shadows removed; kept `MuiPaper` `backgroundImage: none` (now in both modes) and the icon-button touch override; added the `MuiCssBaseline` body pin. `isDarkMode`, `toggleTheme`, `useTheme`, `useThemeContext`, body classes, the inline body background and `localStorage["theme"]` unchanged. |
| `src/index.css` | Removed the duplicate Inter `@import`; kept the `body` rule, `.swal2-container`, `* { box-sizing }`, `html { scroll-behavior }`; added `body:not(.admin-area) { font-family: var(--sf-font-sans); color: var(--sf-color-text); }`. |
| `src/App.css` | Deleted the legacy `:root` variables and the unused utilities and keyframes (zero references, re-confirmed by grep). `.App` / `.main-content` backgrounds (incl. their `body.light`/`body.dark` variants) now `var(--sf-color-bg)`. Appended scoped storefront scrollbar rules after the existing scrollbar block. All 27 scrollbar / SweetAlert / `body.admin-area` rules byte-identical and in the same order (script-verified). |
| `public/index.html` | Only the font links: one Google Fonts stylesheet (Inter 300–700, Playfair Display 400/500/400 italic, `display=swap`) with both preconnects; Material Icons link removed (no `material-icons` usage anywhere). |
| `src/utils/helpers.js` | `PLACEHOLDER_IMG` recoloured to sand `#f1ebe1` / muted `#686158`, label "Image coming soon". |
| `src/utils/constants.js` | Added `LOGO_URLS` (exact URLs). Nothing else changed. |
| New `src/components/ui/BrandLogo.js` + `.module.css` + `BrandLogo.test.js` | The logo component and its unit tests (6). |
| New `scripts/check-contrast.js` | Reusable WCAG checker: reads the token CSS, resolves both modes, composites translucent layers, checks 51 pairings and verifies `colors.js` / `tokens.js` still match the CSS. Run `node scripts/check-contrast.js` (add `--markdown` for the table). |
| New `prompts/DESIGN_SYSTEM.md` | The reference. |
| 6 storefront CSS modules (`ProductCard`, `ProductGallery`, `FrequentlyBoughtTogether`, `ReviewsSection`, `SocialProof`, `Products`) | One line each: `color: #fff` → `color: var(--sf-color-primary-contrast)` on solid token fills (see deviations). |

### Decisions

- **Palette from the logo** (sampled values in DESIGN_SYSTEM §2): ink `#1c1a17` (lettering `#1c1c1c` warmed), navy `#0b1f3f` (chair `#051a3f`, a touch calmer for large surfaces), caramel `#ddb185` (wordmark, exact), paper `#faf7f2`, surface white, sand `#f1ebe1`, stone `#d9d0c3` (ΔL\* 13.5 from paper), text tones `#1c1a17` / `#4d463e` / `#686158`. Light accent `#ae773d` (caramel deepened to clear 3 : 1), accent-text `#8a5d2e`. Dark mode: navy-ink `#0a1426`, lighter navy surface `#111d34`, translucent off-white sand/stone (6 %/14 %), warm off-white text `#f3eee6`, the raw caramel as accent, `#e8c9a2` accent-text. Semantic: success `#2f6b46`, warning `#975f05`, error (brick) `#a2382b`, info (slate) `#3c5a80`; sale and discount = accent-text (discount chose accent-text over success); star gold `#b08309`. Every pairing passes AA (DESIGN_SYSTEM §14).
- **"Primary = ink" remap:** `--sf-color-primary` is the ink (primary buttons ink + paper, hover navy), `--sf-color-secondary` navy, `--sf-color-accent` caramel. Every existing consumer of `primary` now renders ink (light) / warm off-white (dark); the flat `--sf-gradient-primary*` keep old consumers working.
- **Type:** Playfair Display (transitional/Didone serif with ball terminals like the logo's "A&S"; true italic; variable) + Inter (already loaded, the admin's font, zero `CssBaseline` risk). Display 400 / 400 italic / 500; storefront sans 400/500/600 (`--sf-font-bold` → 600). Fluid display scale 56–88 / 40–56 / 28–36 / 22–26px, display line-height 1.04–1.1, tracking −0.015em, eyebrow 12px / 0.16em, body 16/1.6, measure 66ch.
- **Radius philosophy:** editorial = sharp (2 / 4 / 8 / 12 / pill); depth from hairlines, not shadows; four soft navy-tinted shadows (black in dark mode).
- **Motion:** `ease-out` `cubic-bezier(0.22, 1, 0.36, 1)`, `ease-in-out` `cubic-bezier(0.65, 0, 0.35, 1)`, 160 / 320 / 640 / 900ms, 20px reveal, 90ms stagger; `--sf-transition*` are compositions.
- **New tokens:** brand constants (`--sf-brand-ink/navy/caramel/paper`); `--sf-color-primary-hover`, `-secondary-contrast`, `-accent-text`, `-accent-soft`, `-accent-contrast`, `-focus`, `-focus-halo`, `-sand`, `-stone`, `-error`, `-error-bg`, `-sale`; always-dark `--sf-color-surface-dark`, `-on-dark`, `-on-dark-muted`, `-on-dark-border`, `-on-dark-accent`, `--sf-color-scrim`, `--sf-gradient-scrim`; `--sf-hairline`; `--sf-space-20/24/32`, `--sf-section-y`, `--sf-gutter`; `--sf-container`, `-wide`, `-narrow`, `--sf-measure`; `--sf-font-display`, `--sf-font-sans`, `--sf-text-display-xl/lg/md/sm`, `--sf-text-2xs`, `--sf-text-eyebrow`, `--sf-leading-display/heading/body/relaxed`, `--sf-tracking-display/eyebrow/button`; `--sf-ease-out/in-out`, `--sf-duration-fast`, `--sf-duration`, `--sf-duration-slow`, `--sf-duration-reveal`, `--sf-reveal-distance`, `--sf-stagger`; `--sf-z-header` 50, `--sf-z-megamenu` 55.
- **New components and constants:** `BrandLogo` (`variant` auto/light/white, `onDark`, `height`, `priority`, `className`; explicit width/height from 1286 × 426, `decoding="async"`, lazy unless `priority`); `LOGO_URLS`. Not used by any page yet (Prompts 07/08/20/27 adopt it); the admin does not import it.

### Deviations from the prompt, and why

1. **Light accent is not the raw logo caramel.** No caramel in the logo reaches 3 : 1 on a warm paper (wordmark 1.84, darkest shell stop 2.6), so the italic accent word, icons and the focus ring could not pass. Light `--sf-color-accent` keeps the logo hue at `#ae773d` (3.57 : 1); the exact `#ddb185` is the dark-mode accent and `--sf-brand-caramel` (decorative rules, accent on navy).
2. **Focus ring = 2px solid accent + the 45 % accent halo.** The halo alone measures ≈ 1.7 : 1 on paper (fails WCAG 1.4.11); the solid ring gives ≥ 3 : 1 on paper, sand, surface, navy and photo scrims.
3. **Sampling vs expectations:** lettering `#1c1c1c` (expected ≈ `#181818`), white logo pure `#ffffff` (expected `#f8f8f8`). Text on navy uses the brand paper `#faf7f2` rather than pure white (warmer, less glare; the white logo stays the brightest element; 15.33 : 1).
4. **Inter 300 stays loaded** (the brief named 400–700): SweetAlert styles its validation message at `font-weight: 300`, and Admin → Returns uses `inputValidator`. Dropping 300 would change that admin dialog; it is the same variable file, so it costs nothing.
5. **`CssBaseline` coupling is real for colour and line-height, not only font.** Admin page titles (e.g. `Typography h5 "Dashboard"`) set no colour and inherit `<body>`'s, which `CssBaseline` computes from the storefront theme; body1's line-height also reaches admin text. So `buildStorefrontTheme` pins `MuiCssBaseline`'s `body` rule to its pre-rebrand output (MUI's default body1 in Inter + `BASELINE_BODY` `#1a202c` / `#f5f7fa`), and the storefront body takes its colour from `--sf-color-text` via the `body:not(.admin-area)` rule in `index.css` (the prompt only asked for the font-family there). Verified: without the pin, 20 of 24 admin screenshots change. **Prompt 06 must keep this override** when it rewrites the storefront MUI component overrides.
6. **Six one-line component fixes** (allowed by implementation note 10). In dark mode the primary and semantic tokens are light, so `color: #fff` on `--sf-color-primary`, `--sf-gradient-primary`, `--sf-color-danger` or `--sf-color-success` fills became unreadable (FrequentlyBoughtTogether "This item" label and ReviewsSection avatar went to ≈ 1.1 : 1; the four discount/social-proof badges were already below AA in dark mode). Each now uses `var(--sf-color-primary-contrast)`: paper in light (visually unchanged), navy-ink in dark (≥ 8 : 1).
7. **App.css:** the four `body.light .glass-effect / .neon-glow / .card-hover:hover / .loading-spinner` rules were deleted with their base utilities, since they are part of (b). The admin-inherited rules (d) are untouched. Purple therefore still appears in App.css, but only inside the shared scrollbar and SweetAlert rules the admin inherits. The storefront's scrollbars are now overridden by the new scoped rules; **the storefront SweetAlert keeps the legacy purple until Prompt 06** appends its theme.
8. **`ThemeContext` refactor:** a single memoised builder instead of two duplicated themes rebuilt on every render; behaviour and API unchanged.
9. **Display serif not applied to existing component headings.** There is no global heading rule, to avoid restyling components outside their prompts. It is live in the MUI theme (h1–h4) and lands with Prompt 06's primitives. The page-level line-height stays 1.5; primitives set `--sf-leading-body` (1.6).
10. **Accent-italic refinement:** display-sm is 22–26px, so it is not always "large text". The accent colour applies from display-md up; display-sm `<em>` uses accent-text.
11. **Hero scrim:** `--sf-color-scrim` is 0.70 (the top of the brief's 55–70 % range) and `--sf-gradient-scrim` starts at 0.72 in the text corner. That is the minimum for on-dark text to keep 5.77 : 1 and the caramel 3.14 : 1 over a pure-white photograph. Small text on photos must use full `--sf-color-on-dark`.
12. **Extras:** `--sf-container` alias (Prompts 21/26 reference it), `--sf-stagger` (Prompts 10/30 use 90ms), `scripts/check-contrast.js` committed (Prompts 06/31 reuse "the Prompt 01 script"; the logo-sampling script stays outside the repo), `BrandLogo` unit tests (the repo had none; `CI=true npm test -- --passWithNoTests` now runs 6 tests, exit 0), `BrandLogo` renders outside `ThemeContextProvider` via the `body.dark` class (so an error fallback can use it). `colors.js` gained keys (top-level shape kept); `secondary.light/dark` are now derived by MUI.

### Verification

- `node scripts/check-contrast.js`: 51 pairings, all pass in both modes; mirror check passes.
- **Admin parity:** 24 screenshots (login, dashboard, welcome toast, products, orders, settings, coupons, the Add Product dialog and a SweetAlert delete confirm, cancelled; 1440px and 390px; light and dark), before vs after. 23 are byte-identical. The dark dialog differs by ≤ 1 channel value on 27 edge pixels, the same anti-aliasing noise two baseline runs show (12–18 px). The harness is sensitive: removing the baseline pin makes 20 of 24 differ.
- `npm run build`: "Compiled successfully", no warnings, same as the baseline build (+0.6 kB JS, +0.1 kB CSS gzip). `CI=true npm test -- --passWithNoTests`: exit 0.
- **Storefront** (JSON Server mode; `/`, `/products`, a product page, cart drawer, search and auth modals, 1440px and 390px, both modes): token-driven surfaces show paper/ink/caramel (light) and navy-ink/off-white/caramel (dark); nothing unreadable; console shows only the pre-existing duplicate-key warning. No horizontal overflow at 360/768/1024/1440 (production build). Fluid display sizes measured in range (56/68/76/88px for xl at 360/768/1024/1440). Keyboard focus on the PDP variant chips shows the caramel ring in both modes.
- **Fonts:** one stylesheet; 3–5 `woff2` files per page measured (ceiling 6).
- No data code touched (diff limited to theme, styles, constants, helpers, the new component, docs and the script), so nothing depends on a JSON Server-only shape.

### Still carrying hardcoded colours (for their owning prompts)

Literal counts from a grep of hex/rgb values (approximate):
- **02:** `public/index.html` pre-paint gradient and purple loading screen. The pre-paint gradient also paints under the admin's fixed drawer in full-page captures; this is pre-existing.
- **06:** shared SweetAlert/scrollbar rules in `App.css` (49), `WishlistContext.js` confirm colour (1).
- **07:** `Header.module.css` (80).
- **08:** `Footer.module.css` (53) + `Footer.js` (10), `Newsletter.module.css` (15).
- **09:** `SidebarMenu` (75), `BottomNav` (17), `BottomDrawer` (8).
- **10:** `HeroSection` (37 + 18 in JS).
- **11:** `Home.module.css` (101), `FeaturedProducts` (31).
- **12:** `CTASection` (8).
- **14:** `Products.module.css` leftovers (4: orange focus glow, red tint, white toggle knob, a shadow), `Products.js` (11), `Breadcrumb` (6).
- **15:** `SearchModal` (114 + 5).
- **16:** `AddToCartBar` shadow, `VariantSelector` swatch ring, `variantUtils` (1 each).
- **18:** `CartDrawer` (122).
- **19:** `SpecialOffers` (178 + 2).
- **20:** `AuthModal` (69 + 5).
- **21–23:** `Profile` (260 + 8).
- **24:** `OrderHistory` (280 + 1), `ReviewModal` (34).
- **25:** `Wishlist` (106).
- **26:** `Checkout` (168 + 1).
- **27:** `OrderConfirmation` (141).
- **28:** `AboutUs` (37), `HelpCenter` (43 + 6), `Support` (45 + 1), the four policy pages (17–32 each), `FAQ` (14), `ErrorBoundary.js` (25).
- **Unowned:** `src/index.js` pre-React error overlay (2).

### Pre-existing issues noticed (not changed)

- React "two children with the same key" warning from `Home`'s `ScrollRow` (Prompt 11 rewrites it).
- Dev server only: at 360px the header's action buttons extend past the viewport (clipped by `body { overflow-x: hidden }`). Production builds, base and new, don't show it. Prompt 07 rebuilds the header.
- Jest prints "did not exit one second after the test run": the open handle is `babel-preset-react-app`'s deprecation-warning timer; exit code is 0.
- Mobile sticky Add-to-Cart bar (390px): a long compare-at price overlaps the "Buy Now" button. This happens identically before and after this prompt; Prompt 16 owns `AddToCartBar`.

### Needs client confirmation

- The light-mode UI accent is a deepened caramel (`#ae773d`) because the logo's `#ddb185` cannot meet AA on light backgrounds; the exact caramel is used in dark mode and for decorative rules.
- The UI navy `#0b1f3f` is slightly calmer than the logo's `#051a3f`.
- Playfair Display as the display face: if the client has (or licenses) the logo's own serif, it can replace Playfair through `--sf-font-display` alone.
- Text on navy is warm off-white `#faf7f2` rather than the logo's pure white.

---

## Prompt 02 — Brand identity wiring

**Date:** 2026-10-07. **Result:** the app identifies as A & S Urbanseat in constants, env files, document metadata, icons, the web manifest, the loading screen and the pre-paint theme script. Proposed brand lines live in `src/content/brandContent.js`, pending approval.

### What changed

| File | Change |
|---|---|
| `src/utils/constants.js` | `APP_NAME` fallback `A & S Urbanseat`; `APP_TAGLINE` `Trusted Comfort for Every Home` (printed inside the logo: never render it beside `<BrandLogo />`); `APP_DESCRIPTION`; `SUPPORT_EMAIL` / `SUPPORT_PHONE` / `SUPPORT_ADDRESS` / `SUPPORT_HOURS` from the reference site; `SOCIAL_LINKS` WhatsApp only; `POLICY_LAST_UPDATED` `October 7, 2026`. `DEFAULT_CURRENCY` verified INR (unchanged). `FAQ_ITEMS`, `WHY_CHOOSE_US`, `TRUST_BADGES`, `ROUTES`, enums, `FREE_SHIPPING_THRESHOLD`, `ANIMATION_VARIANTS` untouched. |
| `.env`, `.env.example`, `.env.production` | `REACT_APP_NAME=A & S Urbanseat`; every other key unchanged (`.env` keeps mock mode on `http://localhost:3001`). |
| `src/theme/tokens.js` | `STOREFRONT_CONFIG.trustBadges` = `["securePayment", "cod", "easyReturns", "genuine"]`; `returnsWindowDays: 7` kept and commented as a placeholder. `TRUST_BADGE_CATALOG` untouched. |
| New `src/content/brandContent.js` | `BRAND_PROMISE`, `HERO_HEADLINES`, `HERO_SUPPORT_LINES`, `NEWSLETTER_LINE`, `ABOUT_INTRO`, `ASSURANCE_ITEMS` (named exports + default object). Not imported anywhere yet. |
| `public/index.html` | `lang="en-IN"`; new title, description, furniture-only keywords, author; two `theme-color` tags; OG (`site_name`, `locale en_IN`, placeholder `og:url`, light logo as `og:image` 1286 × 426 + alt) and Twitter tags (now `name=` rather than `property=`); icon links only to existing files; Cloudinary preconnect; brand loading screen; solid pre-paint background. Google Fonts block and the `react-loaded` / `MutationObserver` / 10 s timeout script unchanged. |
| `public/manifest.json` | Rewritten: name, short name, description, two icons, `start_url`, `display`, colours. |

### Decisions

- **Icons** (`file public/*.png`): `favicon-16x16.png` 16 × 16, `favicon-32x32.png` 32 × 32, `apple-touch-icon.png` 180 × 180, `android-chrome-192x192.png` 192 × 192, `android-chrome-512x512.png` 512 × 512, all RGBA PNG; `favicon.ico` linked with `sizes="any"`. Links to the missing `favicon.svg` / `logo192.png` / `logo512.png` removed. No image files added. All six served with the right content type, manifest 200 (checked against a production build).
- **Loading screen:** paper `#faf7f2` + light logo in light mode, dark base `#0a1426` + white logo in dark mode, keyed on `body.dark` so it always agrees with the pre-paint script. Logo `width: min(60vw, 320px)`, `alt="A & S Urbanseat"`, explicit 1286 × 426 dimensions; one 2 px caramel hairline (`#ae773d` light, `#ddb185` dark) that grows and retracts over 2.4 s; static under `prefers-reduced-motion` (and the fade transition is dropped). Spinner stack, "MY STORE"/"LOADING" text, radial glows and the body gradient animation removed. Fade-out class and 10 s safety timeout kept. The container has `role="status"` with an accessible name.
- **Script order:** the theme-detection IIFE moved from the end of `<body>` to its start (before the loading-screen markup), so `body.dark` exists before the splash is parsed. A two-line script after the logo sets its `src` from `data-src-light` / `data-src-white`, so only the matching variant downloads. Detection logic, the `theme` key and the class names are the same; `localStorage` access is now wrapped in `try` (private-mode safety).
- **Pre-paint background:** `document.body.style.backgroundColor` = `#faf7f2` / `#0a1426` (same as `colors.js` `LIGHT/DARK.background.default` and what `ThemeContext` writes). **Accepted side effect:** the old gradient written through the `background` shorthand also set a purple/grey `background-image` that showed under the admin's overscroll area; it is gone, and `body.admin-area` rules still win for the admin's own background.
- **Trust badges:** `securePayment`, `cod`, `easyReturns`, `genuine` as specified. `freeShipping` dropped from the config too (the brief's list excludes it; the free-delivery promise now comes from `ASSURANCE_ITEMS` with a live threshold). `warranty` and `support` omitted until confirmed.
- **`helpers.js` untouched:** `formatCurrency` already formats INR / `en-IN`. `formatDate` and `formatNumber` keep their locale because nine admin pages import `formatDate`; if the storefront wants `en-IN` dates, Prompt 29 adds a storefront-only helper.
- **Admin coupling (pre-existing, no admin file edited):** `src/components/AdminLayout/AdminLayout.js:337` and `src/pages/Admin/AdminLogin.js:138` use `process.env.REACT_APP_NAME` as the admin logo's `alt`; it now reads "A & S Urbanseat" (alt text only, no visual change). `src/pages/Admin/AdminOrders.js:367` has a `"My E-Commerce Store"` fallback for the printed invoice when `settings.store.name` is missing; left alone (admin, and `db.json` settings normally supply the name).
- `og:url` / `twitter:url` use the reserved placeholder `https://urbanseat.example/` rather than guessing a real domain.

### Proposed brand lines (all need client confirmation)

- `APP_TAGLINE`: "Trusted Comfort for Every Home" (from the logo artwork; adopted).
- `APP_DESCRIPTION` / meta description / manifest: "Furniture and seating for homes, offices, cafés and outdoor spaces, from our own workshop and the makers we trust." (constant variant: "…, made to be lived with.")
- `BRAND_PROMISE`: "Furniture made to be lived with, from our own workshop and the makers we trust."
- `HERO_HEADLINES`: "Seating for the way you *live*." / "Comfort, *quietly* made." / "Rooms that feel *finished*."
- `HERO_SUPPORT_LINES`: "Chairs, sofas and tables for homes, offices, cafés and the open air." / "Made in our own workshop, alongside brands we trust, and built for everyday use." / "Considered furniture for every room you live, work and gather in."
- `NEWSLETTER_LINE`: "New pieces, care notes and the occasional offer. A few letters a month, nothing more."
- `ABOUT_INTRO`: "A & S Urbanseat makes and selects furniture for the places people spend their days: homes, offices, cafés and outdoor spaces. Much of what we sell comes from our own workshop; the rest comes from makers we know well, such as Nilkamal, Carlton and Winsome. We put quality first, keep the customer at the centre and build trust one piece at a time."
- `ASSURANCE_ITEMS` (detail templates filled from live data, hidden when the value is missing): Free delivery — "Free delivery above {threshold}"; Easy returns — "{days}-day returns on eligible pieces"; Secure payment — "Encrypted checkout for cards, UPI and net banking"; Cash on delivery — "Pay when your furniture arrives" (only when `settings.payment.codEnabled`).

### Needs client confirmation (placeholders)

- **Email:** `info@kamdhenufurniture.com` (from the old site; different brand and domain).
- **Address:** only "Assam, India"; street address and PIN code missing. Not invented.
- **Hours:** "Monday – Saturday: 9:00 AM – 7:00 PM IST, Sunday closed" (from the site).
- **Phone / WhatsApp:** call `+91 84729 18653`, WhatsApp `+91 84729 19541`; `+91 98765 43210` on the site is a template placeholder and is not used.
- **Social:** no Facebook/Instagram/YouTube/X profiles on the site; only WhatsApp set. Note: `Footer.js` maps only Facebook/Twitter/Instagram/YouTube, so WhatsApp has no footer icon yet (Prompt 08).
- **Returns window:** `returnsWindowDays: 7` is a placeholder.
- **Warranty and 24/7 support** badges omitted. The reference site's "20+ years" and "20+ years warranty" statements are not used anywhere as facts.
- **Production domain** for `og:url` / `twitter:url`.
- Brand-carried names (Nilkamal, Carlton, Winsome) in `ABOUT_INTRO`: confirm they may be named.

### Colour literals in static files (Prompt 34: verify against `DESIGN_SYSTEM.md`)

- `public/index.html`: `#faf7f2` (paper: `theme-color`, splash, pre-paint), `#0a1426` (dark base: dark `theme-color`, splash, pre-paint), `#ae773d` (light accent: hairline), `#ddb185` (dark accent: hairline).
- `public/manifest.json`: `theme_color` `#faf7f2`, `background_color` `#faf7f2`.

### Remaining stale identity copy outside this prompt's scope

- `src/pages/Admin/AdminOrders.js:367` — `"My E-Commerce Store"` invoice fallback (admin; not to be changed).
- `src/components/Footer/Footer.js` — generic "one-stop destination…" blurb, "Free Shipping*" and "24/7 Support" badges (Prompt 08).
- `src/pages/Support/Support.js:99–100` — hardcoded "Mon-Sat, 9am-8pm IST" (contradicts `SUPPORT_HOURS`) and "Live Chat / Available 24/7" (Prompt 28).
- `src/pages/AboutUs/AboutUs.js:40` — generic founding-mission paragraph (Prompt 28, use `ABOUT_INTRO`).
- No other occurrence of "My Store", "MY STORE", "mystore.com", "Your Online Shopping Destination" or "Quality products, great prices" in `src` or `public`.

### Verification

- `npm run build`: "Compiled successfully", no warnings. `CI=true npm test -- --passWithNoTests`: 6 passed, exit 0. `manifest.json` parses.
- Splash checked in Chromium on a production build with the JS bundle blocked: light → `urbanseat-logo.png` on `rgb(250,247,242)`, dark → `urbanseat-logo-white.png` on `rgb(10,20,38)`; `body` `background-image: none`; logo 216 px wide at 360, 320 px at 768/1024/1440, centred. With the bundle allowed, the loader is hidden once React mounts. Title and `lang="en-IN"` confirmed. Footer shows the new contact values.
- `git diff` contains no file under `src/pages/Admin` or `src/components/AdminLayout`.

---

## Prompt 03 — Catalogue data I

**Date:** 2026-10-07. **Files:** `db.json` (`categories`, `products`, the three `dealsConfig` id arrays), new `scripts/validate-db.js`. No file under `src/`, `public/`, `server.js` or `package.json` changed, and no other `db.json` collection changed (checked by comparing every top-level key against `HEAD`).

### What was done

- `categories`: the 16 boilerplate records replaced by 23: departments 1–6 (5 and 6 have no children yet), the Plastic subtree (10–18) and the Office Chairs subtree (20–27).
- `products`: the 19 boilerplate records replaced by 46 active products, ids 1–46.
- `dealsConfig.featuredCouponIds`, `dealOfTheDayIds`, `featuredProductIds` set to `[]` (automatic mode). All other `dealsConfig` fields unchanged.
- Data built with a throwaway generator script kept outside the repo. Output is 2-space JSON with no trailing newline, the same as before.
- Key sets: every category has the 12 keys of the boilerplate's first category, in the same order. Every product has the 30 keys of the boilerplate's first product, in the same order. The boilerplate's own products 2–20 were missing `frequentlyBoughtTogetherIds` / `relatedProductIds`; every new record has both. Variant keys are `id, name, price, stock, sku, attributes` plus `swatchHex` on Colour/Finish variants only.

### Id ranges

| Range | Use |
|---|---|
| Categories 1–6 | Departments, `menuOrder` 1–6 |
| Categories 10–18 | Plastic subtree (19 free) |
| Categories 20–27 | Office Chairs subtree (28–29 free) |
| Categories 30+ | Prompt 04 (Home Furniture, Office Tables & Desks, Plastic Dining Sets and Sofas) |
| Products 1–46 | This prompt; Prompt 04 continues at 47 |

### Category tree

```
1  Plastic Furniture        plastic-furniture                 menu 1
   10 Essentials            plastic-essentials                sort 1
      11 Chairs with Arms   plastic-essentials-armchairs      sort 1
      12 Chairs without Arms plastic-essentials-chairs        sort 2
      13 Centre Tables      plastic-essentials-centre-tables  sort 3
      14 Shoe Racks         plastic-shoe-racks                sort 4
   15 Premium               plastic-premium                   sort 2
      16 Chairs with Arms   plastic-premium-armchairs         sort 1
      17 Chairs without Arms plastic-premium-chairs           sort 2
      18 Centre Tables      plastic-premium-centre-tables     sort 3
2  Office Chairs            office-chairs                     menu 2
   20 Essentials            office-chairs-essentials          sort 1
      21 High-Back Chairs   office-essentials-high-back       sort 1
      22 Low-Back Chairs    office-essentials-low-back        sort 2
      23 Waiting Chairs     office-essentials-waiting         sort 3
   24 Premium               office-chairs-premium             sort 2
      25 High-Back Chairs   office-premium-high-back          sort 1
      26 Low-Back Chairs    office-premium-low-back           sort 2
      27 Waiting Chairs     office-premium-waiting            sort 3
3  Café & Restaurant Chairs cafe-restaurant-chairs            menu 3 (flat)
4  Outdoor Furniture        outdoor-furniture                 menu 4 (flat)
5  Home Furniture           home-furniture                    menu 5 (no children yet)
6  Office Tables & Desks    office-tables-desks               menu 6 (no children yet)
```

All categories are active. Only departments are in the main menu; children use `showInMainMenu: false, menuOrder: 0`. Essentials descriptions say "dependable everyday value" and Premium descriptions say "a heavier build and a finer finish". Category dates: created `2026-04-10`, updated `2026-10-06`.

### Proof of coverage (46)

| Client line | Category (id) | Count | Products (id, name, variants, placeholder price) |
|---|---|---|---|
| Essentials plastic · chair with arms | `plastic-essentials-armchairs` (11) | 3 | 1 Classic Plastic Armchair (White, Marble Beige, Coffee Brown, Brick Red) ₹899 · 2 Ribbed-Back Plastic Armchair (White, Marble Beige, Iron Black) ₹999, was ₹1,149 · 3 Slat-Back Plastic Armchair (White, Teak, Olive Green) ₹1,149 |
| Essentials plastic · chair without arms | `plastic-essentials-chairs` (12) | 3 | 4 Classic Plastic Chair (4 colours) ₹699 · 5 Ribbed-Back Plastic Chair (3 colours) ₹749, was ₹849 · 6 Stackable Plastic Chair (White, Pearl Grey, Brick Red) ₹799 |
| Essentials plastic · centre table, square | `plastic-essentials-centre-tables` (13) | 1 | 7 Square Plastic Centre Table (White, Coffee Brown) ₹1,249, was ₹1,449 |
| Essentials plastic · centre table, round | `plastic-essentials-centre-tables` (13) | 1 | 8 Round Plastic Centre Table (White, Coffee Brown) ₹1,199 |
| Essentials plastic · shoe rack 2/3/4/5 shelves | `plastic-shoe-racks` (14) | 3 × 4 variants | 9 Slim Plastic Shoe Rack ₹1,249 / 1,599 / 1,899 / 2,249 · 10 Wide Plastic Shoe Rack ₹1,599 / 1,999 / 2,449 / 2,849 · 11 Covered Plastic Shoe Rack ₹1,899 / 2,349 / 2,899 / 3,449, was ₹2,199 (`attributes.Shelves` "2 shelves" … "5 shelves") |
| Premium plastic · chair with arms | `plastic-premium-armchairs` (16) | 3 | 12 Cushioned Plastic Armchair ₹2,499, was ₹2,899 · 13 High-Back Plastic Armchair ₹1,999 · 14 Woven-Texture Plastic Armchair (Natural Cane, Coffee Brown, White) ₹2,249 |
| Premium plastic · chair without arms | `plastic-premium-chairs` (17) | 2 | 15 High-Back Plastic Chair ₹1,599 · 16 Cushioned Plastic Chair ₹1,899 |
| Premium plastic · centre table, round | `plastic-premium-centre-tables` (18) | 1 | 17 Premium Round Plastic Centre Table (White, Coffee Brown) ₹2,299 |
| Premium plastic · centre table, square | `plastic-premium-centre-tables` (18) | 1 | 18 Premium Square Plastic Centre Table (White, Coffee Brown) ₹2,499, was ₹2,849 |
| Outdoor · Lobby set small/large | `outdoor-furniture` (4) | 1 × 2 | 19 Lobby Set: Small ₹22,999, Large ₹38,999; was ₹26,499 (`attributes.Size`) |
| Outdoor · Jhula small/large | `outdoor-furniture` (4) | 1 × 2 | 20 Jhula (Garden Swing): Small ₹11,999, Large ₹21,999 |
| Office Essentials · high-back | `office-essentials-high-back` (21) | 3 | 21 Mesh High-Back Office Chair (Black, Grey, Navy Blue) ₹5,999, was ₹6,999 · 22 Fabric High-Back Office Chair (Black, Grey) ₹5,499 · 23 Leatherette High-Back Office Chair (Black, Brown, Tan) ₹6,999 |
| Office Essentials · low-back | `office-essentials-low-back` (22) | 2 | 24 Mesh Low-Back Office Chair ₹4,299 · 25 Fabric Low-Back Office Chair ₹3,799, was ₹4,399 |
| Office Essentials · waiting | `office-essentials-waiting` (23) | 3 | 26 2-Seater Waiting Chair ₹4,999 · 27 3-Seater Waiting Chair ₹6,499, was ₹7,499 · 28 4-Seater Waiting Chair ₹7,999 (all `variants: []`) |
| Office Premium · high-back | `office-premium-high-back` (25) | 3 | 29 Executive Mesh High-Back Chair ₹13,999, was ₹15,999 · 30 Executive Leatherette High-Back Chair ₹16,499 · 31 Ergonomic High-Back Chair with Headrest ₹19,999 |
| Office Premium · low-back | `office-premium-low-back` (26) | 2 | 32 Executive Leatherette Low-Back Chair ₹10,499 · 33 Ergonomic Mesh Low-Back Chair ₹11,999, was ₹13,499 |
| Office Premium · waiting | `office-premium-waiting` (27) | 3 | 34 Cushioned 2-Seater Waiting Bench (Black, Tan) ₹9,499 · 35 Cushioned 3-Seater Waiting Bench (Black, Tan) ₹12,999, was ₹14,999 · 36 Steel 3-Seater Waiting Chair (`[]`) ₹10,999 |
| Café / restaurant chairs | `cafe-restaurant-chairs` (3) | 10 | 37 Bentwood-Style Café Chair ₹3,499, was ₹3,999 · 38 Metal Bistro Chair ₹2,499 · 39 Upholstered Restaurant Chair ₹4,999 · 40 Cane-Look Café Chair ₹3,999, was ₹4,599 · 41 Stackable Restaurant Chair ₹2,199 · 42 Cross-Back Dining Chair ₹4,499 · 43 Tub Café Chair ₹3,299 · 44 Slatted Wood Café Chair ₹3,799 · 45 Wire Café Chair ₹2,799 · 46 Shell Café Chair ₹1,999, was ₹2,299 (all `attributes.Finish` with `swatchHex`, 2–3 each) |

Total 11 + 7 + 2 + 8 + 8 + 10 = 46. Departments: Plastic 18, Office Chairs 16, Café 10, Outdoor 2.

### Content conventions

- **Images:** `https://placehold.co/1200x1500/f1ebe1/686158?text=<Name>`, then the same with `+Detail` and `+In+situ` appended. Spaces become `+` and other characters are URL-encoded. Categories use `1600x1000` with the department name, or for children their slug words (e.g. `Plastic+Essentials+Armchairs`), so labels stay distinct where names repeat. No reference-site images are used.
- **Slugs:** the `slugify` rule from `helpers.js` applied after removing accents, so "Café" gives `cafe` rather than `caf`. The validator checks `slug === slugify(fold(name))`.
- **SKUs:** `<RANGE>-<TYPE>-<NN>` for products (`PLE` Essentials plastic, `PPR` Premium plastic, `OUT`, `OFE`, `OFP`, `CAF`), plus `-<CODE>` per variant (`-WHT`, `-2S`, `-LG` …).
- **Descriptions:** two paragraphs in the brand voice, then `Specifications: Key: Value; Key: Value; …` with 5–7 pairs, every value hedged with "approx." where it is a measurement. No values contain `;`. No certifications or warranty claims.
- **Shoe racks:** `dimensions` and `weight` describe the 5-shelf version. The specifications paragraph gives each shelf count's height. **Lobby Set / Jhula:** `dimensions` and `weight` describe the Large version, and the specifications paragraph describes both sizes.
- **Price bands used (all placeholders):** Essentials plastic chairs ₹699–₹1,149; Premium plastic chairs ₹1,599–₹2,499; centre tables ₹1,199–₹2,499; shoe racks ₹1,249–₹3,449; Essentials office ₹3,799–₹6,999; Premium office ₹10,499–₹19,999; waiting ₹4,999–₹12,999; café ₹1,999–₹4,999; Lobby Set ₹22,999–₹38,999; Jhula ₹11,999–₹21,999. 15 of 46 products have a `comparePrice` 10–20% above price; the rest have `0`. `costPrice` is about 60–70% of price.
- **Stock:** variants hold 9–48 units, except three deliberately low variants (Covered Shoe Rack 5 shelves: 4, threshold 8; Lobby Set Large: 4, threshold 5; Executive Leatherette High-Back Tan: 5, threshold 5) and two that are out of stock (Wide Shoe Rack 5 shelves; Metal Bistro Chair Antique Brass). `lowStockThreshold` is 8 below ₹3,000, 6 from ₹3,000 and 5 from ₹9,000.
- **Flags:** featured 1, 11, 12, 19, 20, 21, 31, 37, 39 (all four departments). Trending 4, 7, 9, 27, 30, 38, 40. Hot 14, 18, 33, 45.
- **Relations:** `relatedProductIds` lists 4 ids, ordered same category, then same tier, then same department. **Deviation:** Outdoor has only two products, so 19 and 20 each list the other plus three outdoor-suited plastic pieces (3 Slat-Back Plastic Armchair, 14 Woven-Texture Plastic Armchair, 8 Round Plastic Centre Table). Frequently bought together:
  - Plastic chairs → a centre table of the same tier; centre tables → two armchairs/chairs.
  - Office high-back chairs → a waiting chair of the same tier; waiting chairs → a high- or low-back chair.
  - Café, shoe racks and outdoor products have `[]`.
- **Ratings:** `rating: 0, totalReviews: 0` on every product until Prompt 05.
- **Dates:** created between 2026-04-18 and 2026-09-10; `updatedAt` is never earlier than `createdAt` and never later than 2026-10-06.

### Brand mapping

`brand: "Nilkamal"` is set on all 18 plastic products (1–18), because the reference site's plastic-sofa page says "Deal with Nilkamal" and its plastic-chair page says "all brands". Office, café and outdoor products use `""`, so the card hides the brand. No other manufacturer is named. The tag `nilkamal` is on the plastic products only.

### `scripts/validate-db.js`

Dependency-free; exits 1 on failure. Usage: `node scripts/validate-db.js --catalogue` (now) and `node scripts/validate-db.js` (full mode, from Prompt 05). It checks:

- **Wording:** no "non-premium" anywhere in the file.
- **Categories:** key set and order; unique ids and slugs; parents exist and have no cycles; `sortOrder` is 1..n within each parent; the six departments keep their fixed id, slug and menu order; only departments appear in the menu.
- **Products, identity and copy:** key set and order; unique ids, slugs and SKUs (product and variant); slug follows the slugify rule; name ≤ 48 characters; short description ≤ 110 characters; description ends with a parseable 5–7 pair Specifications paragraph.
- **Products, catalogue rules:**
  - `categoryId` points to an active category with no active children.
  - Exactly 3 images, all on the placeholder pattern.
  - `comparePrice` and `costPrice` are valid; `lowStockThreshold` is 3–8.
  - Variant rules hold: same attribute keys on every variant, `swatchHex` only with a colour or finish attribute, `price` = lowest variant price, `stock` = sum of variant stock.
  - Tags are lowercase and include the brand.
  - Relations point to products that exist and are active, never to the product itself.
  - Dates are valid.
- **Coverage:** the `COVERAGE` table gives exact counts per slug, and the total must equal the sum. `VARIANT_RULES` requires 4 shelf variants, priced in rising order, on every shoe rack, and Small/Large on outdoor products. At least 2 low-stock and 1 out-of-stock variant must exist.
- **Full mode:**
  - References from orders, returns, reviews, wishlist and `dealsConfig` resolve.
  - Order money math: item subtotal = price × quantity; order subtotal = sum of items; total = subtotal − discount + shipping + tax (the `Checkout.js` formula); `amountPayable` = total − `storeCreditUsed`.
  - Ratings agree with approved reviews.
  - The wallet ledger runs as a consistent balance per user and ends at `users[].storeCredit`.

  **Prompt 04** appends its rows to `COVERAGE`. **Prompt 05** adds payment and coupon invariants.

Self-test: a copy with seeded faults (wrong price, dangling relation, extra key, mixed attributes, bad parent, an uppercase "Non-Premium" tag) produced 10 failures and exit 1.

### Dangling references left for Prompt 05 (expected)

`orders[].items`, `returns[].items`, `reviews[].productId` and `wishlist[].productId` still describe the boilerplate's electronics products. Their ids 1–20 now resolve to different furniture records, so ids alone no longer show these as broken, and variant ids may not match. Order history still renders because orders store item snapshots. In full mode the validator now fails only on ratings (products 1, 2 and 5 have old approved reviews while `totalReviews` is 0). Prompt 05 reseeds all of these. `banners` still link to `/products?category=electronics` and similar slugs (Prompt 05 owns banners).

### Admin fix: variant attributes kept on save (follow-up, requested by the owner)

- **Problem:** `AdminProducts.js` rebuilt each variant from only `id, name, price, stock, sku`, both when opening the edit dialog and when saving. Saving any product with structured variants therefore dropped `attributes` and `swatchHex`, and the storefront fell back to flat tiles. The boilerplate behaved the same way.
- **Fix:** both places now spread the original variant first (`...v`) and then override the editable fields. Fields the form does not edit stay on the variant, in their original key order.
- **Verified in Chromium:** with servers freshly restarted, saving products 1 (Colour), 9 (Shelves), 26 (no variants) and 37 (Finish) without edits left each `db.json` record identical apart from `updatedAt`.
- **Limitation:** the form still cannot edit `attributes`. Renaming a variant in the admin leaves its attribute value (for example `Colour: "White"`) unchanged. A row added in the admin has no `attributes`, so that product's selector falls back to flat tiles, as before.

### Admin observation (pre-existing, not changed)

- In the admin's category and parent dropdowns, the names "Essentials", "Premium", "Chairs with Arms" and so on appear twice. The slug column tells them apart in the table; the dropdowns show names only.

### Verification

- `node scripts/validate-db.js --catalogue`: all checks pass (23 categories, 46 products, 114 variants, 9 featured / 7 trending / 4 hot, 3 low / 2 out of stock).
- `CI=true npm run build` compiled; `CI=true npm test -- --passWithNoTests` exit 0.
- Chromium against JSON Server and `npm start`:
  - **Header and listings:** the header lists the six departments in order. `?category=plastic-furniture` shows 18 products (parent includes its children); `office-chairs-premium` 8, `plastic-shoe-racks` 3, `cafe-restaurant-chairs` 10.
  - **Covered Shoe Rack:** switching shelves changes the price (₹1,899 → ₹3,449), the SKU (`PLE-SHR-03-2S` … `-5S`) and the stock line ("Only 4 left in this option" on 5 shelves). Arrow keys move the selection.
  - **Metal Bistro Chair and Lobby Set:** Antique Brass shows as sold out and disabled. Lobby Set Large shows ₹38,999 and "Only 4 left".
  - **Cart:** all three products added to the cart with the correct variant name and price.
  - **Search:** `?q=waiting` returns the 6 waiting products; "chair" returns 41.
  - **Layout:** no horizontal overflow on product or listing pages at 360, 768 or 1024 px.
  - **Admin:** the Categories and Products lists render, and the edit dialog opens. No page errors.

### Needs client confirmation (placeholders)

- **All 46 product names.** The client's site lists no model names for these ranges. "Square/Round Plastic Centre Table" are the only names taken from the site.
- **"Lobby Set"** (our reading of "Looby set") and **"Jhula (Garden Swing)"** (our reading of "Julna"). Neither appears on the client's site.
- **All prices, compare-at prices, cost prices and stock levels.**
- **All specifications, dimensions, weights, colours and finishes**, including what the Lobby Set's Small and Large configurations contain.
- **Brand attribution:** Nilkamal on every plastic product. Office, café and outdoor products have no brand.
- **Category copy** (descriptions), and the tier labels "Essentials" and "Premium" as the shopper-facing names.

---

## Prompt 04 — Catalogue data II

**Date:** 2026-10-07. **Files:** `db.json` (`categories`, `products`), `scripts/validate-db.js`. No file under `src/`, `public/`, `server.js` or `package.json` changed. No other `db.json` collection changed, which was checked by comparing every top-level key against `HEAD`. Every Prompt 03 record is byte-identical except the `frequentlyBoughtTogetherIds` of the office chairs listed under Relations.

### What was done

- `categories`: 20 records appended (ids 30–49). Departments 1–6 are unchanged in id, slug and menu order, and every new record uses `showInMainMenu: false, menuOrder: 0`. Total: 43 categories.
- `products`: 38 records appended (ids 47–84). Total: 84 active products. Key sets and key order are the same as Prompt 03: 30 product keys, and variant keys `id, name, price, stock, sku, attributes`, plus `swatchHex` on Colour/Finish variants only. All new products have `rating: 0, totalReviews: 0`.
- Generated with a throwaway script kept outside the repo. It appends records and never renumbers existing ones. Output is 2-space JSON with no trailing newline, as before.

### Category tree (added)

```
1  Plastic Furniture                         (existing)
   48 Dining Sets           plastic-dining-sets       sort 3
   49 Sofas                 plastic-sofas             sort 4
5  Home Furniture                            (existing, menu 5)
   30 Living Room           living-room               sort 1
      31 Sofas              sofas                     sort 1
      32 Sofa-cum-Beds      sofa-cum-beds             sort 2
      33 Centre Tables & Showcases  centre-tables-showcases  sort 3
   34 Bedroom               bedroom                   sort 2
      35 Beds               beds                      sort 1
      36 Mattresses         mattresses                sort 2
      37 Dressing Tables & Mirrors  dressing-tables-mirrors  sort 3
      38 Bedside & Bed Tables       bedside-bed-tables       sort 4
      39 Almirahs           almirahs                  sort 5
      40 Alna Clothes Stands alna-clothes-stands      sort 6
   41 Dining Room           dining-room               sort 3
      42 Dining Sets        dining-sets               sort 1
   43 Storage               storage                   sort 4
      44 Racks              racks                     sort 1
6  Office Tables & Desks                     (existing, menu 6)
   45 Office Tables         office-tables             sort 1
   46 Computer Tables       computer-tables           sort 2
   47 Reading Tables        reading-tables            sort 3
```

Category images use `https://placehold.co/1600x1000/f1ebe1/686158?text=<Slug+Words>`, and dates match Prompt 03 (created 2026-04-10, updated 2026-10-06). `orderCategoriesHierarchically` lists each department followed by its children in this order. `getMainMenuCategories` still returns exactly the six departments.

**Tree shaping decision:** each leaf holds at least two products, so no listing page shows a single product on its own. The reference site lists only one centre table and one showcase, so they share the leaf "Centre Tables & Showcases". It lists two bedside tables and one bed table, which share "Bedside & Bed Tables". **Deviation:** the prompt's tree and checklist give `plastic-sofas` a leaf of its own with one product, because the site lists a single Nilkamal plastic sofa. The tree and the 38-product count were kept as specified. `plastic-sofas` is the only leaf with one product, and the validator's `SINGLE_PRODUCT_LEAVES` allows it by name. If the client wants no single-product leaves, the alternatives are a second plastic sofa model or a shared "Dining Sets & Sofas" leaf.

### Proof of coverage (38)

| Site range → model | Category (id) | Product (id) | brand | Variants and placeholder price |
|---|---|---|---|---|
| Sofa → Wooden | `sofas` (31) | 47 Wooden Sofa Set | A & S Urbanseat | Colour: Sand Beige, Slate Grey, Maroon · ₹32,999, was ₹37,999 |
| Sofa → L-Shaped | `sofas` (31) | 48 L-Shaped Sofa | A & S Urbanseat | Colour: Slate Grey, Sand Beige, Teal Blue · ₹44,999 |
| Sofa → 5 Seater | `sofas` (31) | 49 5-Seater Sofa Set | A & S Urbanseat | Colour ×3 · ₹38,999, was ₹44,999 |
| Sofa → 7 Seater | `sofas` (31) | 50 7-Seater Sofa Set | A & S Urbanseat | Colour ×3 · ₹58,999 |
| Sofa Cum Bed → Steel | `sofa-cum-beds` (32) | 51 Steel Sofa-cum-Bed | "" | Colour ×3 · ₹15,999 |
| Sofa Cum Bed → Wooden | `sofa-cum-beds` (32) | 52 Wooden Sofa-cum-Bed | A & S Urbanseat | Colour ×2 · ₹28,999, was ₹32,999 |
| Center Table → Wooden | `centre-tables-showcases` (33) | 53 Wooden Centre Table | A & S Urbanseat | Finish: Walnut, Natural Oak · ₹7,999 |
| Showcase → Wooden | `centre-tables-showcases` (33) | 54 Wooden Showcase | A & S Urbanseat | Finish: Walnut, Teak · ₹18,999 |
| Bed → King | `beds` (35) | 55 King Size Bed | A & S Urbanseat | Finish: Walnut, Wenge · ₹34,999, was ₹39,999 |
| Bed → Queen | `beds` (35) | 56 Queen Size Bed | A & S Urbanseat | Finish: Walnut, Natural Oak · ₹27,999 |
| Bed → Single | `beds` (35) | 57 Single Bed | A & S Urbanseat | Finish: Walnut, Natural Oak · ₹13,999, was ₹15,999 |
| Mattress → Carlton | `mattresses` (36) | 58 Carlton Mattress | Carlton | Size: Single ₹8,999 / Double ₹14,999 / Queen ₹19,999 / King ₹23,999 |
| Mattress → Nilkamal | `mattresses` (36) | 59 Nilkamal Mattress | Nilkamal | Size: Single ₹5,599 / Double ₹9,499 / Queen ₹12,499 / King ₹14,999 |
| Dressing → Plain | `dressing-tables-mirrors` (37) | 60 Plain Dressing Table | A & S Urbanseat | Finish: Walnut, Frosty White · ₹7,499 |
| Dressing → Big Size | `dressing-tables-mirrors` (37) | 61 Large Dressing Table | A & S Urbanseat | Finish: Walnut, Wenge · ₹15,999, was ₹17,999 |
| Dressing → Standing Mirror | `dressing-tables-mirrors` (37) | 62 Standing Mirror | A & S Urbanseat | Finish: Walnut, Natural Oak · ₹5,499 |
| Dressing → Wall Mirror | `dressing-tables-mirrors` (37) | 63 Wall Mirror | A & S Urbanseat | Finish: Walnut, Frosty White · ₹2,799 |
| Bed Set Table → Wooden | `bedside-bed-tables` (38) | 64 Wooden Bedside Table | A & S Urbanseat | Finish ×2 · ₹4,499 |
| Bed Set Table → Particle Board | `bedside-bed-tables` (38) | 65 Particle-Board Bedside Table | "" | Finish ×2 · ₹2,499, was ₹2,899 |
| Bed Table → Folding | `bedside-bed-tables` (38) | 66 Folding Bed Table | "" | Colour: Natural Oak, Matte Black · ₹1,899 |
| Almari → Two Doors | `almirahs` (39) | 67 Two-Door Almirah | A & S Urbanseat | Finish: Walnut, Wenge · ₹12,999 |
| Almari → 3 Doors | `almirahs` (39) | 68 Three-Door Almirah | A & S Urbanseat | Finish: Walnut, Wenge (out of stock) · ₹21,999, was ₹24,999 |
| Alna → Iron | `alna-clothes-stands` (40) | 69 Iron Alna (Clothes Stand) | "" | `[]` · ₹1,699 |
| Alna → Wooden | `alna-clothes-stands` (40) | 70 Wooden Alna (Clothes Stand) | A & S Urbanseat | `[]` · ₹4,299 |
| Rack → Steel | `racks` (44) | 71 Steel Storage Rack | "" | Shelves: 3 ₹3,199 / 4 ₹3,799 / 5 ₹4,499 |
| Rack → Wooden | `racks` (44) | 72 Wooden Storage Rack | A & S Urbanseat | Shelves: 3 ₹5,499 / 4 ₹6,999 / 5 ₹8,499 (out of stock) |
| Dining → 4 Sitter | `dining-sets` (42) | 73 4-Seater Dining Set | A & S Urbanseat | Finish: Walnut, Natural Oak · ₹21,999 |
| Dining → 6 Sitter | `dining-sets` (42) | 74 6-Seater Dining Set | A & S Urbanseat | Finish: Walnut, Teak · ₹34,999, was ₹39,999 |
| Dining → Marble | `dining-sets` (42) | 75 Marble-Top Dining Set | A & S Urbanseat | Finish: Walnut, Wenge · ₹54,999 |
| Office Table → Company Made (Winsome) | `office-tables` (45) | 76 Winsome Office Table | Winsome | Size: 120 × 60 cm ₹12,999 / 150 × 75 cm ₹16,999 |
| Office Table → Local Made | `office-tables` (45) | 77 Workshop Office Table | A & S Urbanseat | Size: ₹8,999 / ₹11,999 |
| Computer Table → Company Made (Winsome) | `computer-tables` (46) | 78 Winsome Computer Table | Winsome | Size: 90 × 60 cm ₹8,499 / 120 × 60 cm ₹10,999; was ₹9,499 |
| Computer Table → Local Made | `computer-tables` (46) | 79 Workshop Computer Table | A & S Urbanseat | Size: ₹5,999 / ₹7,499 |
| Reading Table → Company Made (Winsome) | `reading-tables` (47) | 80 Winsome Reading Table | Winsome | Size: 75 × 50 cm ₹5,999 / 90 × 60 cm ₹7,499 |
| Reading Table → Local Made | `reading-tables` (47) | 81 Workshop Reading Table | A & S Urbanseat | Size: ₹4,199 / ₹5,299; was ₹4,799 |
| Plastic Dining → 4 Seater | `plastic-dining-sets` (48) | 82 4-Seater Plastic Dining Set | Nilkamal | Colour: Marble Beige, Coffee Brown, White · ₹5,999 |
| Plastic Dining → 6 Seater | `plastic-dining-sets` (48) | 83 6-Seater Plastic Dining Set | Nilkamal | Colour ×2 · ₹9,999, was ₹10,999 |
| Plastic Sofa → Nilkamal | `plastic-sofas` (49) | 84 Nilkamal Plastic Sofa Set | Nilkamal | Colour: Coffee Brown, Marble Beige, Pearl Grey · ₹12,999, was ₹14,999 |

Total: 4 + 2 + 2 + 3 + 2 + 4 + 3 + 2 + 2 + 2 + 3 + 2 + 2 + 2 + 2 + 1 = 38. Departments after this prompt: Plastic 21, Office Chairs 16, Café 10, Outdoor 2, Home 29, Office Tables & Desks 6, for 84 in total.

### Content conventions (in addition to Prompt 03's)

- **SKUs:** `LIV-` living room, `BED-` bedroom, `DIN-` dining, `STO-` storage, `OFT-` office tables, `PLD-` plastic dining, `PLS-` plastic sofa. Variant suffixes: colour/finish codes (`-WAL`, `-BGE` …), `-SGL/-DBL/-QN/-KG` for mattresses, `-3S/-4S/-5S` for racks, and `-75/-90/-120/-150` (width in cm) for table sizes.
- **Images:** `https://placehold.co/1200x1500/f1ebe1/686158?text=<Name>`, with `+Detail` and `+In+situ` versions, the same as Prompt 03.
- **Specifications:** every description ends with a 5–7 pair `Specifications:` paragraph covering material, finish, size, seating or sleeping capacity, weight capacity where it applies, and care. Measurements are marked "approx.". Mattress copy describes construction and feel ("medium-firm", "medium") only, with no orthopaedic, medical or health claims. Product copy makes no warranty or "years in business" claims.
- **Workshop wording:** "made in our own workshop" appears only where the site marks the item as own manufacturing or Local Made: 47 Wooden Sofa Set, 77, 79 and 81. The site's "Company Made" and "Local Made" labels are expressed through `brand` and the copy, and are not used as product names.
- **Local terms:** "Almirah" (wardrobe) is glossed in the short descriptions, and "Alna" carries "(Clothes Stand)" in the name.
- **Sized products:** `dimensions` and `weight` describe the largest option (King mattress, 5-shelf rack, larger table). The specifications paragraph covers every option.
- **Stock and thresholds:** variants hold 6–22 units. Deliberately low: 7-Seater Sofa Slate Grey 3, Carlton King 4, Marble-Top Walnut 2. Out of stock: Three-Door Almirah Wenge, Wooden Rack 5 shelves. `lowStockThreshold` follows Prompt 03's rule: 8 below ₹3,000, 6 from ₹3,000, 5 from ₹9,000.
- **Flags:** featured 47, 55, 68, 74, 76, a mix of home and office pieces. Trending 48, 59, 78, 84. Hot 51, 75.
- **Dates:** created 2026-05-06 to 2026-08-29, updated no later than 2026-10-02.

### Prices used (all placeholders)

Sofas ₹32,999–₹58,999; sofa-cum-beds ₹15,999–₹28,999; centre table ₹7,999 and showcase ₹18,999; beds ₹13,999–₹34,999; mattresses ₹5,599–₹23,999 by size; dressing tables ₹7,499–₹15,999; mirrors ₹2,799–₹5,499; bedside and bed tables ₹1,899–₹4,499; almirahs ₹12,999–₹21,999; alna ₹1,699–₹4,299; racks ₹3,199–₹8,499; dining sets ₹21,999–₹54,999 (marble highest); office, computer and reading tables ₹4,199–₹16,999, with Winsome priced above the workshop pieces of the same type; plastic dining sets ₹5,999–₹9,999; plastic sofa ₹12,999. 13 of the 38 have a `comparePrice` 10–20% above price. `costPrice` is about 65–70% of price.

### Relations

- `relatedProductIds`: 4 ids within the same room or department, ordered same leaf first. Plastic dining sets and the plastic sofa list each other, then plastic chairs, armchairs and centre tables from Prompt 03.
- `frequentlyBoughtTogetherIds`, natural bundles only:
  - Each sofa set → Wooden Centre Table; the centre table → two sofa sets.
  - Each bed → a mattress plus a bedside table; each mattress → two beds; each bedside table → a bed.
  - Office, computer and reading tables → an office chair (29/31, 21/22, 33, 24, 25).
  - Plastic sofa → Premium Round Plastic Centre Table (17).
  - Dining sets, the showcase, dressing tables, mirrors, almirahs, alna, racks, sofa-cum-beds and plastic dining sets have `[]`.
- **Prompt 03 products extended (chair → table):** 21, 22, 23 → +77 Workshop Office Table; 24, 25 → +79 Workshop Computer Table; 29, 30, 31, 32 → +76 Winsome Office Table; 33 → +78 Winsome Computer Table. None has more than 2 ids.

### Brand mapping

There are now four distinct non-empty brands, which Prompt 12's "Brands we carry" strip will show:

- `A & S Urbanseat`: the own-manufacturing pieces.
- `Nilkamal`: Prompt 03's plastic products, plus the Nilkamal mattress, the plastic dining sets and the plastic sofa.
- `Carlton`: the Carlton mattress.
- `Winsome`: the three Winsome tables.

Unbranded items (`""`) are the steel sofa-cum-bed, the particle-board bedside table, the folding bed table, the iron alna and the steel rack. Each brand is also a lowercase tag, for example `a & s urbanseat`.

### `scripts/validate-db.js` (extended)

- `COVERAGE` has 16 new rows. The expected total is now 84.
- `TREE` asserts the parent and `sortOrder` of every Prompt 04 category.
- `BRANDS` limits `product.brand` to the four brands or `""`.
- A new leaf check requires 2+ products on every active leaf. `SINGLE_PRODUCT_LEAVES` exempts only `plastic-sofas`.
- `VARIANT_RULES` gained rules for:
  - mattresses: Single/Double/Queen/King, rising prices
  - racks: 3/4/5 shelves, rising prices
  - office, computer and reading tables: their two sizes, rising prices
- The summary now lists the distinct brands.
- Self-test: a copy with seeded faults (renamed mattress size, a foreign brand, a product moved to the wrong leaf, a category re-parented) produced 9 failures and exit 1.

### Verification

- `node scripts/validate-db.js --catalogue`: all checks pass. Totals: 43 categories, 84 products, 199 variants, 14 featured / 11 trending / 6 hot, 6 low-stock / 4 out-of-stock variants.
- `CI=true npm run build` compiled. `CI=true npm test -- --passWithNoTests` exited 0.
- Chromium (Playwright) against JSON Server and `npm start`:
  - **Listings:** `/products` shows "1–12 of 84" with pagination. `home-furniture` shows 29, `bedroom` 16 (bedroom pieces only), `living-room` 8, `office-tables-desks` 6, `plastic-furniture` 21. Every new leaf's deep link shows its expected count.
  - **Search:** `?search=almirah` returns 2 and `?search=table` returns 30.
  - **Product pages:**
    - Carlton Mattress: the price changes with the size, ₹8,999 → ₹14,999 → ₹19,999 → ₹23,999.
    - Wooden Storage Rack: ₹5,499 → ₹6,999, and 5 shelves shows "sold out" and is disabled.
    - Winsome Office Table: ₹12,999 → ₹16,999.
    - L-Shaped Sofa: the colour swatches keep the same price.
  - **Cart:** the Nilkamal Mattress was added and appears in the cart drawer.
  - **Keyboard:** the variant tiles can be reached with Tab and chosen with Enter.
  - **Layout:** no horizontal overflow on `?category=home-furniture` at 360, 768, 1024 or 1440 px, and the filter sidebar lists the new categories.
  - **Admin:** after login, Categories shows the full tree, including Living Room, Alna Clothes Stands, Reading Tables and `plastic-sofas`. Products opens the edit dialog for the Carlton Mattress, showing category Mattresses and the King variant.
  - No page errors. `db.json` was byte-identical after the run.
- **Observation (not changed, `src/` out of scope):** ArrowRight inside a variant radiogroup did not move the selection in this run, although Tab and Enter work. Prompt 03's log reports arrow keys working, so Prompt 16 should re-check the roving-focus behaviour of `VariantSelector`.

### Needs client confirmation (placeholders)

- **All 38 product names.** They are our wording of the site's range and model labels. In particular: "Large Dressing Table" for "Big Size", and "Workshop …" for the site's "Local Made" tables.
- **All prices, compare-at prices, cost prices and stock levels.**
- **All specifications, dimensions, weights, configurations, colours and finishes.** Examples: 3+1+1 for the wooden sofa, the contents of each dining set, mattress thickness and feel, and table sizes. The site lists none of these.
- **Own-manufacturing attribution:** `brand: "A & S Urbanseat"` is set on the workshop-made pieces, and the copy says "made in our own workshop" on 47, 77, 79 and 81. The site marks only the wooden sofa and the Local Made tables as own manufacturing. Beds, almirahs, dressing tables, dining sets and the other `A & S Urbanseat` items were attributed by us and need confirming.
- **Nilkamal attribution on the plastic dining sets (82, 83).** The site names Nilkamal only for the plastic sofa and the mattress.
- **Unbranded items:** the steel sofa-cum-bed, particle-board bedside table, folding bed table, iron alna and steel rack. Confirm whether any of these carry a brand.
- **`plastic-sofas` with a single product:** the client can keep it, add a model, or merge the leaf (see the tree shaping decision).
- **Category copy** for the 20 new categories.

---

## Prompt 05 — Supporting data and integrity

**Date:** 2026-10-07. **Result:** every supporting collection now describes A & S Urbanseat and points only at real catalogue records. Order money follows the checkout's rules, and payments, refunds, returns and the store-credit ledger agree with the orders. Ratings come only from seeded approved reviews. `node scripts/validate-db.js` (full mode) passes.

### What changed per collection

| Collection | Change |
|---|---|
| `settings` | Every key kept. `store`: A & S Urbanseat, tagline, email/phone/address from `constants.js` (placeholders), INR / ₹ / Asia/Kolkata, `logo`/`favicon` null, `taxRate` 18, `taxIncluded` false. `payment`: COD on, fee 0, min 0, max ₹50,000; gateways still disabled. `shipping`: `defaultWeight` 8 kg, `defaultDimensions` 65 × 60 × 75 cm (a chair carton). `notifications`: both emails → `info@kamdhenufurniture.com`. `seo`: title and description copied from `public/index.html`. `social`: WhatsApp `https://wa.me/918472919541`, others "". |
| `shipping_methods` | Same four ids. Standard Delivery: Shiprocket, ₹499 flat, free above ₹9,999, 7–10 days, active. Express Delivery: ₹999, never free, 3–5 days, active. Same Day Delivery: inactive (service not confirmed; ₹1,499 kept only so the admin form has a value). Free Shipping: inactive. |
| `src/utils/constants.js` | `FREE_SHIPPING_THRESHOLD = 9999` (was 999), and the comment updated. No other code change. |
| `coupons` | Same five ids. `WELCOME500` fixed ₹500, min ₹5,000, 14/500 used, until 2027-03-31. `FLAT10` 10%, max ₹2,000, min ₹2,000, 37 used, no limit, until 2027-06-30. `FESTIVE25` (replaces SUMMER25) 25%, max ₹3,000: inactive, expired 2025-11-15, 150/150 used. `NEWHOME20` 20% on the first order, max ₹3,000, min ₹3,000, until 2027-03-31. `WORKSPACE15` 15%, max ₹4,000, described as "15% off orders above ₹15,000, up to ₹4,000" (the coupon schema has no category restriction), 6/100 used, until 2027-06-30. |
| `dealsConfig` | Hero "This week" / "Offers on pieces we love" / "A short list of chairs, tables and sofas at a lower price for now, plus codes you can use at checkout." Timer on, `endAt: ""`, `endOfDay`. Coupons [1 WELCOME500, 2 FLAT10]. Deal of the day [47, 21, 12]. Grid [19, 29, 40, 55, 74, 78, 81, 84] (discounted products from all six departments). |
| `banners` | Three records, same keys: Plastic furniture / Office chairs / Home furniture, linking to `/products?category=<department slug>`. `gradient` = `linear-gradient(#0b1f3f, #0b1f3f)` (flat navy `--sf-color-surface-dark`, still a string). |
| `orders` | All 11 records keep their ids, numbers, users, statuses, addresses, coupons, payment methods, timestamps, extra fields and `statusHistory` shape. Items are new snapshots (`"Product - Variant"` as `Checkout.js` builds it, with the hyphen it uses; first image; variant SKU). Money is recomputed with the checkout's rules (see below). |
| `payments` / `refunds` / `returns` / `walletTransactions` | Recomputed from the orders (tables below). Return reasons are rewritten for the new products. Refund reasons on order 8 now name the Wall Mirror. |
| `users` | Only `storeCredit`: user 3 → ₹2,302 (ledger balance); users 1 and 2 stay 0. |
| `reviews` | 26 records (21 approved, 3 pending, 2 rejected) with the original 12-key shape, on 17 products across all six departments (table below). |
| `products` | Only `rating` / `totalReviews`: 15 products have approved reviews, 69 show 0 / 0. |
| `wishlist` | User 3's three rows → L-Shaped Sofa (48), Ergonomic High-Back Chair with Headrest (31), Bentwood-Style Café Chair (37), with full snapshots. |
| `leads` | Unchanged. Order numbers did not change, so `ORD-20250310-0001` and `ORD-MQC1HWSZ-CAN8` still resolve. |
| `admins`, `cart` (`[]`), categories and product content | Untouched. |

### Money rules applied (read from `src/pages/Checkout/Checkout.js`)

- `subtotal` = Σ item subtotals. `discountAmount` = `couponDiscountFor` (fixed value, or `round(subtotal × %)`, capped by `maxDiscount` and by the subtotal). `taxAmount` = `round((subtotal − discount) × 18 / 100)`. `total` = subtotal − discount + shipping + tax. `amountPayable` = total − `storeCreditUsed`.
- **Deviation from the prompt text:** the checkout makes shipping free when the **pre-discount** `subtotal ≥ freeAbove` (not `subtotal − discount`). The seed follows the code. Order 8 used Express (it paid ₹199 before, the old Express rate); all others are Standard.
- **Return refund rule:** the two old records disagreed with each other (`refundAmount` 8,999 = items only, but ₹10,439 = items + tax was booked). `reflectReturnRefund` books `refundAmount − deductionAmount`, so the seed uses **returned item subtotals + their proportional share of the order's tax** (no shipping). Both returns cover the whole order, so return 1 books exactly the order total.

### Cascade (before → after)

| Order | Items (after) | Total before → after | Payable before → after |
|---|---|---|---|
| 1 ORD-20250310-0001 | Executive Mesh High-Back Chair - Black ×1 | ₹10,439 → ₹16,519 | — |
| 2 ORD-20250318-0002 | Winsome Office Table - 150 × 75 cm ×1 + Ergonomic Mesh Low-Back Chair - Black ×1 | ₹85,257 → ₹33,628 | — |
| 3 ORD-20260310-0003 | Cane-Look Café Chair - Natural Cane ×2 | ₹19,818 → ₹9,937 | — |
| 4 ORD-20260315-0004 | Stackable Plastic Chair - White ×4 | ₹2,874 → ₹3,893 | — |
| 5 ORD-MMYJ01ED-ZR26 | Jhula (Garden Swing) - Small ×1 | ₹17,699 → ₹14,159 | — |
| 6 ORD-MQA9I6E7-0IR2 | Leatherette High-Back Office Chair - Tan ×1 | ₹17,699 → ₹8,758 | — |
| 7 ORD-MQB0JHUB-9KL6 | Wooden Bedside Table - Walnut ×2 | ₹10,029 → ₹10,527 | — |
| 8 ORD-MQC1HWSZ-CAN8 | Wall Mirror - Walnut ×1 | ₹4,918 → ₹4,302 | — |
| 9 ORD-MQCGV6OM-Z965 | Wooden Sofa Set - Sand Beige ×1 | ₹76,699 → ₹38,939 | ₹75,699 → ₹37,939 |
| 10 ORD-MQDUWC74-RUVY | Queen Size Bed - Walnut ×1 + Carlton Mattress - Queen ×1 | ₹94,398 → ₹56,638 | ₹94,398 → ₹56,638 |
| 11 ORD-MQDVIQCV-30A9 | 4-Seater Plastic Dining Set - Marble Beige ×1 + Slim Plastic Shoe Rack - 4 shelves ×1 | ₹10,619 → ₹9,819 | ₹9,619 → ₹8,819 |

| Payment | Order | Amount before → after | Refunded before → after | Status |
|---|---|---|---|---|
| 1 | ORD-20250310-0001 | ₹10,439 → ₹16,519 | ₹10,439 → ₹16,519 | refunded |
| 2 | ORD-20250318-0002 | ₹85,257 → ₹33,628 | — | captured |
| 3 | ORD-20260310-0003 | ₹19,818 → ₹9,937 | ₹19,818 → ₹9,937 | refunded |
| 4 | ORD-MQA9I6E7-0IR2 | ₹17,699 → ₹8,758 | ₹0 → ₹0 | captured |
| 5 | ORD-MQB0JHUB-9KL6 | ₹10,029 → ₹10,527 | ₹0 → ₹0 | pending |
| 6 | ORD-MQC1HWSZ-CAN8 | ₹4,918 → ₹4,302 | ₹4,918 → ₹4,302 | refunded |
| 7 | ORD-MQCGV6OM-Z965 | ₹75,699 → ₹37,939 | — | captured |
| 8 | ORD-MQDUWC74-RUVY | ₹94,398 → ₹56,638 | — | captured |
| 9 | ORD-MQDVIQCV-30A9 | ₹9,619 → ₹8,819 | — | captured |

| Wallet tx | Type | Order | Amount before → after | Balance after: before → after |
|---|---|---|---|---|
| 1 | credit | ORD-MQC1HWSZ-CAN8 | ₹4,918 → ₹4,302 | ₹4,918 → ₹4,302 |
| 2 | debit | ORD-MQCGV6OM-Z965 | ₹1,000 → ₹1,000 | ₹3,918 → ₹3,302 |
| 3 | debit | ORD-MQDVIQCV-30A9 | ₹1,000 → ₹1,000 | ₹2,918 → ₹2,302 |

| Product | Approved ratings | rating / totalReviews | Pending / rejected |
|---|---|---|---|
| 2 Ribbed-Back Plastic Armchair | 4, 4 | 4 / 2 | 0 / 0 |
| 6 Stackable Plastic Chair | — | 0 / 0 | 0 / 1 |
| 9 Slim Plastic Shoe Rack | — | 0 / 0 | 1 / 0 |
| 11 Covered Plastic Shoe Rack | 4 | 4 / 1 | 0 / 0 |
| 12 Cushioned Plastic Armchair | 4 | 4 / 1 | 1 / 0 |
| 19 Lobby Set | 4 | 4 / 1 | 0 / 0 |
| 21 Mesh High-Back Office Chair | 4, 5 | 4.5 / 2 | 0 / 0 |
| 33 Ergonomic Mesh Low-Back Chair | 4 | 4 / 1 | 0 / 0 |
| 37 Bentwood-Style Café Chair | 5, 4 | 4.5 / 2 | 0 / 0 |
| 46 Shell Café Chair | 3 | 3 / 1 | 0 / 0 |
| 47 Wooden Sofa Set | 5, 4, 5 | 4.7 / 3 | 1 / 0 |
| 55 King Size Bed | 5 | 5 / 1 | 0 / 0 |
| 58 Carlton Mattress | 4, 5 | 4.5 / 2 | 0 / 1 |
| 64 Wooden Bedside Table | 5 | 5 / 1 | 0 / 0 |
| 74 6-Seater Dining Set | 4 | 4 / 1 | 0 / 0 |
| 76 Winsome Office Table | 5 | 5 / 1 | 0 / 0 |
| 81 Workshop Reading Table | 5 | 5 / 1 | 0 / 0 |

Returns: RET-20260120-0001 (order 1, approved, processed) `refundAmount` ₹8,999 → ₹16,519 (= ₹13,999 + ₹2,520 tax = refund 1 = payment 1 refund). RET-20260612-0002 (order 6, requested) ₹14,999 → ₹8,259 (₹6,999 + ₹1,260 tax). Processing it would book ₹8,259 onto payment 4 (₹8,758) → `partially_refunded` (₹499 shipping is not refunded), by `reflectReturnRefund`. Timeline notes that quote amounts are updated: order 1 "₹16,519 refunded", order 3 "Refund issued (₹9,937)", order 8 "₹4,302 via store credit…", return 1 "Refund processed (₹16,519)".

### Review → rating mapping

Verified purchases follow the orders: user 3 reviewed product 64 (order 7, delivered; approved) and product 9 (order 11, delivered; **pending**, so `/orders` shows the "Review pending approval" chip). User 1 reviewed 33 and 76 (order 2; approved) and 6 (order 4; **rejected**). Product 82 on user 3's delivered order 11 is deliberately left unreviewed, so the "Rate" action stays visible. All other reviews have `userId: null`, `isVerifiedPurchase: false`, and are dated after the product's `createdAt`. Helpful counts are 0–11. The empty state shows on every product not listed above (for example the L-Shaped Sofa: "No written reviews yet. Be the first to share your experience.").

### `scripts/validate-db.js` (full mode extended)

New checks (all in full mode; `--catalogue` unchanged):
- key sets for reviews, coupons, shipping methods, banners and wishlist; `cart` is `[]`; no electronics or fashion words left in supporting data;
- settings (store name, numeric tax rate, COD limits min ≤ max);
- an active Standard Delivery whose `freeAbove` equals `FREE_SHIPPING_THRESHOLD`, read from `constants.js` with a regex;
- coupons: unique uppercase codes, sane values, `usedCount ≤ usageLimit`; an active coupon must be unexpired, not exhausted, and a fixed value below its minimum; one inactive, expired, exhausted coupon must remain;
- orders: user exists; item name, image and SKU match the product/variant; discount matches the coupon rule; shipping matches a method; tax matches `taxRate`; ₹ amounts quoted in refund timeline entries match a booked refund;
- payments: one per order, `amount` = the order's payable, `storeCreditApplied` = `storeCreditUsed`, `refundAmount` = Σ `refunds[]`, "refunded" means fully refunded;
- returns: snapshots match the order items, and `refundAmount` = items + proportional tax;
- refunds: return refunds = return payable; payment refunds appear in that payment's `refunds[]`; store-credit refunds = the order's `refundedAmount` with a matching wallet credit. Wallet debits equal the order's `storeCreditUsed`;
- reviews: status, rating 1–5, title ≤ 60 characters, `helpfulCount` 0–12, user exists, `isVerifiedPurchase` ⇔ the user ordered the product, verified review dated after the order, past dates; at least one product without reviews;
- wishlist snapshots equal the live product; deals coupons active, deal products discounted; banner links are active categories; lead order numbers resolve.

Self-test: a copy with 12 seeded faults (tax off by one, payment amount, ledger amount, verified flag, long title, wishlist price, exhausted active coupon, undiscounted deal, return amount, electronics banner link, rating, stale timeline amount) produced 19 failures and exit 1.

### Verification

- `node scripts/validate-db.js` → ✓ (full); `--catalogue` → ✓. A script compared old and new `db.json`: the top-level key order is the same; record key sets are the same in orders, payments, refunds, returns, wallet, wishlist, coupons, shipping methods, banners and leads; `settings`/`dealsConfig` shapes are the same; products changed only in `rating`/`totalReviews`, users only in user 3's `storeCredit`; admins, categories, cart and leads are byte-identical.
- `npm run build` → Compiled successfully. `CI=true npm test -- --passWithNoTests` → 6 passed, exit 0.
- Browser QA (Chromium) on a mock-mode build against JSON Server, reading a **scratch copy** of `db.json` (the repo file was never written by the app):
  - `/orders` as user 3: 7 orders with the new totals. An expanded order shows "Queen Size Bed - Walnut" and "Carlton Mattress - Queen". Cancel appears only on the two unfulfilled (processing) orders. Users 1 and 2 load their orders. No console errors.
  - `/profile` → Store Credit: ₹2,302.00, with three ledger rows (+₹4,302, −₹1,000, −₹1,000) and running balances matching the ledger.
  - `/wishlist`: the three new items. `/products/wooden-sofa-set`: approved reviews shown, the pending one hidden, 4.7. `/products/l-shaped-sofa`: honest empty state; the delivery panel shows "₹499.00 · free above ₹9,999.00", Express ₹999, "COD up to ₹50,000", "18% GST".
  - `/special-offers`: WELCOME500 and FLAT10 shown, with a countdown.
  - Checkout: 1 × Wooden Bedside Table → shipping ₹499, tax ₹810, total ₹5,808, and WELCOME500 rejected ("Minimum order amount is ₹5000"). 6 × → subtotal ₹26,994, WELCOME500 −₹500, shipping FREE, tax ₹4,769, total ₹31,263. No order placed.
  - Header: "Free delivery on orders over ₹9,999.00".
  - Widths 360 / 768 / 1024 / 1440: `/orders` and the product page render without errors.
  - Admin Dashboard, Orders, Returns, Payments (totals ₹1,45,782 captured, ₹30,758 refunded; refund history per row), Coupons, Reviews, Shipping, Special Offers, Settings, Users and Leads: all open with no console errors.
- **Not exercised in the UI:** approving a review and processing a return refund in the admin. These were checked by reading `reflectReturnRefund` / `appendPaymentRefund` / `performCancel` instead: they read `refundAmount`, `deductionAmount`, `amountPayable`, `storeCreditUsed` and the ledger, and all of these are consistent in the new data. Opening each admin dialog record by record was not done; the module list pages were.

### Stale content left outside this prompt's scope

- `leads` 3 and 4 still mention a "FitPulse Smartwatch" and "AirStride Running Shoes" in their subject and message. The scope allows only `orderNumber` changes there. Prompt 34 or the client should reword or remove them.
- `src/components/CartDrawer/CartDrawer.js` hardcodes `FLAT_SHIPPING = 99`, so the drawer shows ₹99 shipping below the threshold, while checkout charges ₹499. Code change forbidden here; **Prompt 18** should read the Standard method's `flatRate` (or a shared constant).
- Order dates (Jan–Jun 2026) are earlier than some products' `createdAt` (Apr–Sep 2026). Timestamps were kept as instructed.
- Order 7's payment is `pending` while the order says `paid` (pre-existing; statuses kept).

### Needs client confirmation (placeholders)

- **Tax:** 18% GST, exclusive (`taxIncluded: false`), applied to every product.
- **COD:** no fee, no minimum, max ₹50,000. Many sofa, bed and dining orders exceed this, so COD is hidden for them.
- **Shipping:** Standard ₹499 / 7–10 days, Express ₹999 / 3–5 days, free Standard above **₹9,999** (`FREE_SHIPPING_THRESHOLD`). Same-day disabled. Carrier Shiprocket. Default parcel 8 kg, 65 × 60 × 75 cm.
- **Coupons:** codes WELCOME500, FLAT10, FESTIVE25, NEWHOME20, WORKSPACE15, with their values, minimums, caps, limits and expiry dates.
- **Store contact:** `info@kamdhenufurniture.com`, `+91 84729 18653`, "Assam, India", WhatsApp `+91 84729 19541` (same as Prompt 02).
- **Special-offers selection and hero copy.**

### Remove or replace before launch

- **All 26 seeded reviews** (demo content) and therefore every `rating`/`totalReviews` value derived from them.
- **The 11 demo orders** and their payments, refunds, returns and wallet transactions; user 3's ₹2,302 store credit.
- **Coupon `usedCount` values** (illustrative).
- **Placeholder product images and prices** (Prompts 03–04).
- **Demo accounts:** `user@example.com` / `password123`, `jane@example.com` / `password123`, `mail4bappidas@gmail.com` / `Bappi@12345`, admin `admin@store.com` / `admin123`.
- **The four demo leads.**

---

## Prompt 06 — Global UI primitives

**Date:** 2026-10-07. **Result:** later prompts now build from one set of storefront primitives: the `.sf-*` stylesheet, matching MUI overrides, a storefront SweetAlert2 theme, framer-motion that honours the OS reduced-motion setting, and `Reveal` / `SectionHeading` / `renderAccent`. All of it is scoped away from the admin, and the admin screenshots match the baseline. Reference: `prompts/DESIGN_SYSTEM.md` §16 "Primitives".

### What changed

| File | Change |
|---|---|
| New `src/theme/storefront-base.css` | The primitives (inventory below). 136 rules, 750 lines (629 without comments and blank lines). Every selector is prefixed `:where(body:not(.admin-area))` and there are no colour literals; both checked by parsing the file with PostCSS. |
| `src/index.css` | `@import "./theme/storefront-base.css";` right after the tokens import, plus the header comment. Nothing else. |
| `src/context/ThemeContext.js` | Only the `components` block: a mode-independent `storefrontComponents` object (values are `var(--sf-*)`) spread after the untouched `MuiCssBaseline` pin and `MuiPaper` reset. The existing small-IconButton touch override is kept, reshaped so it can be spread. `useTheme`, `useThemeContext`, persistence, body classes, palette and typography are unchanged. |
| `src/App.css` | 16 new rules appended after the last existing rule, all scoped `body.light:not(.admin-area)` / `body.dark:not(.admin-area)`. The original file is a byte-identical prefix of the new one (checked with `cmp`). |
| `src/App.js` | `MotionConfig` import; `<MotionConfig reducedMotion="user">` wraps `<div className="App">` inside `DealsConfigProvider`. Admin routes are not wrapped. |
| New `src/components/ui/Reveal.js`, `SectionHeading.js` + `.module.css`, `renderAccent.js`, `index.js` | The React primitives and the barrel. |
| New `src/components/ui/Reveal.test.js`, `SectionHeading.test.js`, `renderAccent.test.js` | 16 tests: 5 Reveal, 6 SectionHeading, 5 renderAccent. The suite now runs 22 tests. |
| `scripts/check-contrast.js` | 6 component-level pairs added (DESIGN_SYSTEM §16.8). All 57 checked pairings pass in both modes (plus 5 informational rows); mirror check passes. |
| `prompts/DESIGN_SYSTEM.md` | New §16 "Primitives" appended. Earlier sections are untouched. |

### Class inventory (`storefront-base.css`)

- **Layout:**
  - `.sf-container` (+ `--wide`, `--narrow`)
  - `.sf-section`, `.sf-section--tight`
  - `.sf-grid`, with `--cols`, `--cols-tablet`, `--cols-mobile`, `--gap`
- **Type:**
  - `.sf-eyebrow` (+ `--accent`, `--rule`)
  - `.sf-display-xl/lg/md/sm`, with the accent `<em>`
  - `.sf-prose`, `.sf-muted`, `.sf-price`, `.sf-compare`, `.sf-sale`
- **Buttons:**
  - `.sf-btn` with variants `--primary`, `--ghost`, `--paper`, `--paper-ghost`, `--link`
  - sizes `--sm`, `--lg`, plus `--block` and `--icon`
  - `.sf-btn__icon` slot
  - restyle hook: the `--sf-btn-*` custom properties
- **Fields:**
  - `.sf-field`, `.sf-field__label`, `.sf-field__hint`, `.sf-field__error`
  - `.sf-input`, `.sf-select`, `.sf-textarea`
  - `.sf-check`, `.sf-radio`, `.sf-switch`
- **Badges, chips, counts:**
  - `.sf-badge` (+ `--ink`, `--paper`, `--sand`, `--accent`, `--success`, `--warning`, `--error`, `--info`)
  - `.sf-chip` (+ `--selected`, `[aria-pressed]`, `[aria-checked]`)
  - `.sf-count`
- **Surfaces:**
  - `.sf-card` (+ `--hairline`), `.sf-panel` (+ `--hairline`)
  - `.sf-hairline`, `.sf-divider--dot`
- **Tabs:** `.sf-tabs`, `.sf-tab`, `.sf-tabpanel`.
- **Skeletons:** `.sf-skeleton` (+ `--text`, `--image`, `--circle`).
- **Accessibility:** `.sf-visually-hidden`, `.sf-skip-link`, `.sf-focus`.

### MUI components overridden (storefront theme only)

- `MuiButtonBase`: ripple off; a focus ring on `.Mui-focusVisible`.
- `MuiButton`: matches `.sf-btn`.
  - Contained primary = ink, navy on hover.
  - Outlined primary = ghost.
  - Text = link.
  - Small 36px / large 52px.
  - Focus ring repeated here because `disableElevation` clears box-shadow.
  - Hover is reset on touch screens.
- `MuiIconButton`:
  - 44px (medium), ink when no `color` is set, sand hover.
  - The touch-size override for small buttons is kept.
- `MuiBadge`: ink disc with paper 10px digits.
- `MuiAvatar`: sand background, ink serif initials, hairline.
- `MuiPopover` / `MuiMenu`: surface, hairline, `--sf-shadow-sm`, radius sm.
- `MuiMenuItem`:
  - 44px at every breakpoint, sans 14px, sand hover.
  - Keyboard focus = sand + inset ring; selected = accent-soft.
- `MuiDivider`: the stone token (`--sf-color-border`).
- `MuiDrawer`: solid surface, `--sf-shadow-lg`, navy overlay backdrop.
- `MuiOutlinedInput` / `MuiTextField`:
  - Border-strong boundary, radius sm.
  - Focus = 1px accent border + ring; error border.
  - Label turns accent-text when focused.
- `MuiChip`: 32px pill; default = sand (filled) or hairline (outlined); primary = ink.
- `MuiSkeleton`: sand; the `wave` animation by default, switched off under reduced motion.
- `MuiTabs` / `MuiTab`: hairline strip, 1px ink indicator, eyebrow-style 44px tabs.
- `MuiTooltip`: ink, paper text, radius md.
- `MuiAppBar`: left at its default, as asked.

`ThemeContext.js` has no colour literals, gradients, blurs or hover lifts (checked by grep).

### SweetAlert2 approach

Everything goes through SweetAlert's CSS variables, set from the tokens on `.swal2-popup` (and `--swal2-backdrop` on `.swal2-container`).

- **Popup:**
  - Surface background, ink text, hairline border, radius md, `--sf-shadow-lg`.
  - Title in Playfair 22px; body in sans 15px secondary.
  - Icons at 75%.
  - Navy overlay backdrop.
- **Buttons:** 44px; the confirm is ink (navy on hover, white in dark mode); the cancel is a ghost with a `primary-soft` hover; focus uses the token ring.
- **Toasts:** surface, hairline, `--sf-shadow-md`, radius md, 14px sans text, a 2px accent timer bar.
- **Reduced motion:** the show/hide, toast and icon animations are off.

**Per-call colours still win.** SweetAlert sets a `confirmButtonColor` inline on the button. The ink text and navy hover apply only to confirms without one (`:not([style*="--swal2-confirm-button-background-color"])`). So the destructive red confirms keep SweetAlert's white text and darkening hover in both modes. In dark mode that matters: the ink-mode text would otherwise be navy-ink on red, 3.70 : 1.

### `MotionConfig` placement

`src/App.js`: `DealsConfigProvider` → `MotionConfig reducedMotion="user"` → `div.App`.

I recorded the header top bar on every frame, which animates `y: -30 → 0` and fades in:

| Build | Reduced motion | Distinct transforms | Distinct opacities |
|---|---|---|---|
| Baseline | on | 17 (it slid) | 16 |
| After | on | 2 (initial frame, then in place) | 14 (it still faded) |
| After | off | 14 (it slid as before) | 15 |

### New `ui/` exports

`src/components/ui/index.js` exports `BrandLogo`, `Reveal` (+ `staggerDelay`), `SectionHeading` and `renderAccent` (+ `stripAccent`). Props are documented in DESIGN_SYSTEM §16.4.

- `Reveal`: `as`, `delay` (seconds), `distance` (default `TOKENS.motion.revealDistance`), `once` (default `true`), `className`, `onInView`. Other props pass through and the ref is forwarded. With reduced motion it starts without a transform.
- `SectionHeading`: `eyebrow`, `title` (with `*accent*`), `intro`, `align` (`"left"` | `"center"`), `action` (an element, or `{ label, to | href }` rendered as `.sf-btn--link`), `as` (default `"h2"`), `id`, `className`.
- `renderAccent(text)` returns text with the accent wrapped in `<em>` (non-strings pass through). `stripAccent(text)` returns the plain sentence.

### Decisions

- **`:where()` around the scope.** Each selector starts `:where(body:not(.admin-area))` rather than a bare `body:not(.admin-area)`. The admin scoping is identical, but a primitive weighs one class. With the bare prefix (specificity 0,2,1) no CSS Module class (0,1,0) could adjust a primitive without `!important`. Later prompts do exactly that: Prompt 08 restyles `.sf-input` for the dark footer, Prompt 20 makes inputs 48px. CRA's PostCSS keeps `:where()` as written (checked in the built CSS).
- **Variants as custom properties.** Buttons use `--sf-btn-*` and badges `--sf-badge-*`. A component can restyle one instance by setting them on its own module class.
- **Hover only on hover-capable pointers** (`@media (hover: hover)`), so a tap never leaves a sticky hover.
- **Small targets on touch screens.** `.sf-btn--sm` grows to 44px under `pointer: coarse`. Fields use 16px text there, so iOS does not zoom.
- **Focus rings** pair a transparent 2px outline with the box-shadow ring, so Windows contrast themes still draw an outline. Links and tabs use a solid outline, because a box-shadow would wrap across lines or be clipped by a scrolling strip.
- **The field error mark is a CSS-drawn circled "!"** with `content: "!" / ""`, so screen readers skip it. The error text itself carries the meaning.

### Deviations from the prompt, and why

1. **Select chevron:** two 1.5px `currentColor` strokes (hard-stop `linear-gradient`s), not an SVG data URI. A data-URI SVG cannot inherit `currentColor` from the page: it renders black and disappears on dark surfaces. Its colour would have to be a literal, which conflicts with guardrail 2. The strokes follow `color` (ink; muted when disabled). Forced-colours mode restores the native arrow.
2. **"Paper" backgrounds:** inputs, popups, toasts, menus and drawers use `--sf-color-surface`. I read the brief's "paper" as MUI's `background.paper`, which DESIGN_SYSTEM §1 maps to "card, drawer, menu, input background → `--sf-color-surface`". Only `.sf-btn--paper` and `.sf-badge--paper` use the fixed `--sf-brand-paper`.
3. **File length:** 750 lines against the "≤ 700" target. That is 629 lines of rules; the rest is comments and the hover, coarse-pointer and forced-colours guards.
4. **Small additions beyond the brief, each to save later prompts a one-off:**
   - Utility classes: `.sf-eyebrow--accent` and `--rule`; `.sf-btn--icon`; `.sf-panel--hairline`.
   - Custom-property hooks: `--cols-tablet`, `--gap` and `--sf-card-padding`; `--ratio` and `--size` on skeletons.
   - Chips selected by `aria-pressed` / `aria-checked`; a checkbox `:indeterminate` dash.
   - The forced-colours block; `color-scheme: dark` on fields in dark mode.
   - `Reveal`'s `onInView` callback (Prompt 12 asks for it), and the `staggerDelay` and `stripAccent` helpers.
   - SweetAlert: backdrop, icon size and reduced motion. MUI: ripple off on the storefront theme, drawer backdrop.
5. **`scripts/check-contrast.js`** is not in the prompt's file list. DESIGN_SYSTEM §15 requires component pairs to be added there, and guardrail 5 asks for the check, so I added six pairs.

### Verification

- **Build and tests.** `npm run build` compiles with no warnings, the same as the baseline build. Sizes are +1.63 kB JS and +4.07 kB CSS (gzip). `CI=true npm test -- --passWithNoTests` passes 22 tests with exit 0. The worker-exit notice is the existing Babel deprecation timer that Prompt 01 recorded; it also appears for the plain `renderAccent` test. `node scripts/check-contrast.js` passes.
- **Kitchen sink.** A throwaway page with every primitive, the MUI controls and SweetAlert triggers ran in a temporary route on a mock-mode build. It was never in the repo: the file lived in the scratchpad and `App.js` was restored byte for byte. Results, at 360, 768, 1024 and 1440px in both modes:
  - No horizontal overflow. Buttons, inputs, selects, tabs, check rows, MUI buttons and IconButtons measure 44px; chips 32px.
  - `.sf-btn--sm` is 36px on desktop and 44px on touch emulation.
  - `.sf-grid` collapses 4 → 2 → 1 (with `--cols-mobile: 1`) and 3 → 2. The container caps at 1280px.
  - `:focus-visible` shows the ring on 13 control types in both modes, including the skip link, which appears top-left when focused.
  - Hover states match the spec: primary → navy, ghost → ink tint, paper → caramel, link → accent underline, chip → ink border, IconButton → sand.
  - Hovering a focused field keeps the accent border; hovering an invalid one keeps the error border.
  - Computed SweetAlert styles:
    - Light: confirm `#1c1a17` with `#faf7f2` text; cancel transparent with ink text; popup white; radius 4px; hairline `#d9d0c3`; Playfair 22px title.
    - Dark: confirm `#f3eee6` with `#0a1426` text; popup `#111d34`; translucent hairline.
    - A per-call `#d32f2f` keeps white text.
  - Under reduced motion: `Reveal` has no transform, the skeleton shimmer is off, the SweetAlert popup has no animation and closes in 5ms.
- **Storefront flows** (JSON Server on a scratch copy of `db.json`; light and dark; 1440 and 390px):
  - Toasts: add to cart, add to wishlist, sign-in as the demo user.
  - Confirms, each cancelled: wishlist "Clear all", order cancel on `/orders`.
  - The header account menu and its badges.
  - No new console errors.
- **Admin parity.** Before/after, I took 36 screenshots: login, dashboard with welcome toast, dashboard, Products, the Add Product dialog, Coupons, a SweetAlert delete confirm (cancelled), Orders and Settings, at 1440 and 390px in light and dark.
  - 30 are byte-identical to the baseline.
  - The other 6 differ only in regions that also differed between two baseline runs, or that depend on load timing:
    - The notification-bell badge: 24 px of anti-aliasing.
    - The dashboard behind the welcome toast. Its Iconify stat icons load from the network, so they were or were not drawn when the toast appeared.
  - Inside the welcome toast itself, 0–7 px differ, all on the rounded corners where it blends with that content.
  - The settled dashboard is byte-identical in all four combinations.
  - Re-run on the final build, after the last two fixes (`after-b`): 33 of 36 are byte-identical to baseline run B and 29 to run A. The rest fall in the same two regions: the bell badge and the toast load timing.

### Interim effects on surfaces owned by later prompts

- **Old header (Prompt 07 rebuilds it).** Its CSS Module sets most MUI colours with `!important`, so it mostly looks the same. The new overrides show through where it sets nothing:
  - The cart and wishlist count discs are now ink. On the old dark bar in light mode the disc blends in, but the paper digits stay readable; in dark mode the disc is off-white.
  - Hovering its white icons shows a sand square behind them.
  - Menu rows are 44px.
  - The avatar initial is in the serif.
  - Clicks no longer ripple, and keyboard focus shows the ring.
- **Auth modal (Prompt 20), pre-existing.** Its overlay sits at `z-index: 9999` with a blur, above SweetAlert (2000). The sign-in toast is therefore under the closing modal for about a second, the same before and after. Prompt 20 should move the modal to `--sf-z-modal` (1100).
- **Hard-coded confirm colours.** The hex `confirmButtonColor` values in `OrderHistory.js` (`#d32f2f`), `Profile.js` (`#ef4444` ×2) and `WishlistContext.js` (`#d32f2f`) are still there for their prompts. `#ef4444` with white text is about 3.8 : 1 (pre-existing). Switching to the error token read via `getComputedStyle`, or to `customClass`, fixes it.

### Notes for later prompts

- Compose primitives with your module class: ``className={`sf-btn sf-btn--primary ${styles.cta}`}``. A module class (later in the bundle, same weight) wins without `!important`.
- **On navy or photography:**
  - Use `.sf-btn--paper` / `--paper-ghost` and `.sf-badge--paper`.
  - Give `<em>` `--sf-color-on-dark-accent`. Display headings inherit colour, but `.sf-eyebrow` and `SectionHeading`'s intro use the paper-surface tokens.
  - `SectionHeading` is designed for paper and sand sections.
- **Prompt 31:** add `<a className="sf-skip-link" href="#main-content">Skip to content</a>` as the first child of `.App`, and the matching `id` on `<main>`. The skip link sits at `--sf-z-modal`, above the header.
- **Prompts 12 and 14:** `Reveal`'s `onInView` can start the lazy review fetch. `staggerDelay(i)` gives the 90ms stagger, capped at 8 items.
- **Prompt 30:** the reveal recipe lives in `Reveal`. The skeleton shimmer duration is `2.5 × --sf-duration-slow`. SweetAlert's reduced-motion handling is in the `App.css` storefront block.

### Needs client confirmation

Nothing new on content. Two design choices they may want to see:

- Paper buttons turn caramel on hover (on navy).
- Account avatars use serif initials.

---

## Prompt 07 — Header and mega-menu

**Date:** 2026-10-07. **Result:** the boilerplate's marketplace header (amber cart-icon wordmark, fake search bar, "All Categories" dropdown, flat link row) is replaced by an editorial header: a slim utility strip, a centred `BrandLogo` with quiet actions, and a department row whose links open one mega-menu panel built from the admin-managed category tree. It is sticky, compacts on scroll without moving the page, and publishes `--sf-header-height` for every sticky offset that follows. Reference: `prompts/DESIGN_SYSTEM.md` §17.

### What changed

| File | Change |
|---|---|
| `src/components/Header/Header.js` | Rewritten. Kept: `categories.getAll()` on mount and on window `focus`, the five contexts (`isDarkMode`/`toggleTheme`, auth incl. the modal state, cart count and drawer, wishlist count, deals `enabled`), account handling (menu when signed in, `openAuthModal("login")` for guests, Sign out → `logout()` + `navigate("/")`), the mounts of `CartDrawer`, `SidebarMenu`, `AuthModal` (still only here) and `SearchModal`, `FREE_SHIPPING_THRESHOLD` via `formatCurrency`, `SUPPORT_PHONE`. Removed: the spacer div, the "All Categories" dropdown, `useMediaQuery` layout switching (now CSS), the entrance animation. |
| `src/components/Header/Header.module.css` | Rewritten: tokens only (was ~80 hex values and a system font stack). |
| New `src/components/Header/MegaMenu.js` + `.module.css` | The department row (`nav aria-label="Primary"`) and the single flyout panel, with all open/close behaviour. Re-exports `groupCategoryTree`. |
| New `src/components/Header/groupCategoryTree.js` | Pure helper: `categories` → departments (`getMainMenuCategories`) → groups (direct children) → links (descendants, depth-first, `orderCategoriesHierarchically` order). Inactive categories skipped; parent cycles cannot loop. For Prompt 09's sidebar too. |
| New `src/components/Header/useHeaderHeight.js` | Writes `--sf-header-height` on `<html>` (ResizeObserver, plus every frame while the header slides) and returns a ref with the value. |
| New `src/content/navigationContent.js` | `DEPARTMENT_FEATURES` (per-slug `eyebrow` / `line` / `ctaLabel` overrides; eyebrows set for the six departments) and `getDepartmentFeature()`. Never supplies images. |
| New `groupCategoryTree.test.js` (5), `MegaMenu.test.js` (6) | Grouping rules; ARIA, canonical links, click toggle, flat department, Enter/Escape focus, deals gating, active department. |
| `src/theme/storefront-tokens.css` | One addition: `--sf-header-height: 0px` (default until the header mounts). |
| `prompts/DESIGN_SYSTEM.md` | §6 row for `--sf-header-height`; new §17 "Header and the `--sf-header-height` contract". |

No other file changed: no page, context, service, `src/utils/categories.js`, `db.json` or admin file.

### Layouts (what lives where; Prompt 09 needs this)

- **≥ 1024px:** utility strip (32px: free-delivery line · phone `tel:` · Help `/help` · Track order `/orders` · 32px theme toggle) / main row (88px: "Search" trigger · logo 48px · Sign in/Account, Wishlist, Cart; eyebrow labels under the icons from 1280px) / department row (48px: departments · dot · Offers when deals are enabled · Our Story).
- **768–1023px:** one 64px row: hamburger · logo 40px · search, theme toggle, account, cart. No wishlist (sidebar and bottom nav), no department row (sidebar accordion).
- **< 768px:** one 60px row: hamburger · logo 28px · search, cart. Account, wishlist and the theme toggle live in the sidebar and the bottom nav.
- Counts: `.sf-count` ink disc, "99+" above 99, hidden at 0; the buttons carry `aria-label` "Cart, 3 items" / "Wishlist, 1 item" / "…, empty".
- `SidebarMenu` now receives `onOpenAuth={(tab) => openAuthModal(tab === "signup" ? "signup" : "login")}`: called with no argument it opens Sign in as before; Prompt 09 can call `onOpenAuth("signup")` for "Create account".
- `BottomNav` is hidden only from 769px (its own `min-width: 769px` rule), so at exactly 768px the tablet header and the bottom nav both appear; Prompt 09 may align it to the 768px token breakpoint.

### Sticky vs fixed, and the spacer

- **Sticky** (`position: sticky; top: 0`, `--sf-z-header`), so the header holds its own place in the flow and the spacer is gone. Checked on all 16 storefront routes at 360/768/1024/1440, before vs after (gap from the header's bottom edge to the first text in `<main>`): identical at 1024 and 1440 on every route. At 360/768 the gap is 4px smaller only because the old 60px spacer sat under a 56px header; the content's position on screen is unchanged at 360 and 4px lower at 768 (the tablet row is 64px). No page CSS compensated for the old header (the negative margins found are breadcrumb hit areas).
- **Compaction** (past 80px; never hidden): transforms only. The header slides up by `--hdr-compact-shift` (56px at ≥ 1024px), so the utility strip leaves the viewport and is then `visibility: hidden` (out of the tab order), the main row shows 64px with its content re-centred, the logo scales to 36px, and `--sf-shadow-sm` appears; all over `--sf-duration-slow`. Below 1024px compaction only adds the shadow. The header's box never changes size: the first element of the page stayed at exactly 168/168/168px (before/mid/after) and a `PerformanceObserver` recorded no layout shift while compacting or expanding.

### The `--sf-header-height` contract (Prompts 08–34)

- `--sf-header-height` on `<html>` is the **visible** header height: 60 (< 768) · 64 (768–1023) · 212 → 156 compact (1024–1279, department row on two lines) · 168 → 112 compact (≥ 1280). It is updated before paint on resize and on every frame of the slide, and defaults to `0px` (`storefront-tokens.css`) until the header mounts.
- Sticky elements: `top: calc(var(--sf-header-height) + 24px)`. Anchor targets: `scroll-margin-top: calc(var(--sf-header-height) + 16px)`. JS offsets: `parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sf-header-height"))`. Never hardcode a header height again.
- Still hardcoded today, for their owners (none overlaps more than before):
  - `Products.module.css` `.sidebar` `top: 152px`, `max-height: calc(100vh - 172px)` (Prompt 14): 40px of extra gap under the compact header.
  - `Checkout.module.css` `.sidebar` `top: 152px` / `116px` at ≤ 1024px (Prompt 26): extra gap only.
  - `Profile.module.css` `.sidebar` `top: 5rem` (Prompt 21): 32px under the compact header (60px under the old one).
  - `ProductDetails.module.css` `.gallerySection` `top: 24px` (Prompt 16): 88px under the compact header (116px under the old one).
- Page content must stay below `--sf-z-header` (50); drawers and modals (≥ 1000) stay above it.

### Mega-menu behaviour

- **Pointer:** a mouse resting 120ms on a department opens its panel (passing over one does not); leaving the row and panel closes it after 200ms. Touch and pen never hover-open. A click toggles; a click right after a hover-open keeps the panel open, the next click closes it. Ctrl/Cmd/Shift/middle click still opens the department's listing in a new tab.
- **Keyboard:** Tab moves along the row, and keyboard focus on a department previews its panel. Enter, Space or ArrowDown open it on purpose and move focus to its first link. Tab and Shift+Tab walk the panel; Tab past its last link continues to the next row item; Shift+Tab from its first link returns to the department. Enter or Space on a department whose panel is open on purpose closes it. Escape closes from anywhere and returns focus to the department link when focus was in the menu. ArrowLeft/Right move along the row, ArrowUp/Down inside the panel.
- **Also closes on** a click outside (`ClickAwayListener`), focus moving to a control outside the menu, any route change (pathname **or** query, so `?category=` changes on `/products` close it too), a viewport below 1024px, or the open department leaving the menu after a refetch.
- **ARIA:** department links carry `aria-expanded`, `aria-controls` (`sf-megamenu-<slug>`), `aria-haspopup="true"` and `aria-current` ("page" on the department's own listing, "true" when the current category is below it; Offers/Our Story get "page" on their routes). The panel is `role="region"` with `aria-label="<Department> menu"`; each group's list is labelled by its heading link; the feature image link is `aria-hidden` with `tabindex="-1"` (the "Shop all" link is its accessible equivalent). Chromium's accessibility tree shows `hasPopup=menu`, `expanded=false/true` and `controls` when open, which is what screen readers announce as expandable. NVDA and VoiceOver were not available in this environment.
- **Panel content (real data):** Plastic Furniture → Essentials (4) · Premium (3) · Dining Sets · Sofas; Office Chairs → Essentials · Premium (3 each); Home Furniture → Living Room (3) · Bedroom (6) · Dining Room · Storage; Office Tables & Desks → three single-link columns; Café & Restaurant Chairs and Outdoor Furniture → serif introduction (name, description, "Shop all"). Every department, group and leaf is reachable with a canonical `?category=<slug>` link; every panel ends with "View all departments" → `/products`.
- **Motion:** opacity 0 → 1 and y −8 → 0 over 320ms (`--sf-ease-out`), exit 160ms; none under reduced motion (verified: first frame at opacity 1, no transform; compaction instant).

### Deviations from the prompt, and why

1. **Department row type below 1440px.** At the specified 13px/0.12em the seeded labels measure 1,125px of text (measured in Chromium), which only fits from ~1440px. Below that the row tightens (12px with 0.1em tracking; 0.08em below 1280px) and, if it still runs out of room, wraps into balanced centred lines rather than hiding departments behind a scroll or a "More" menu. With the six seeded departments it fits one line from 1280px and takes two lines at 1024–1279px (header 212px at rest, 156px compact). Needs client confirmation (below).
2. **Compaction by transform, not by animating heights to 0.** Animating the strip's and row's heights moved the rows inside the header every frame, which Chrome's Layout Instability API reports as layout shift (~0.003 per compaction) even though the page did not move. Sliding the header gives the same picture with zero layout shift; the strip still ends hidden (`visibility`) so its links leave the tab order.
3. **Focus opens a preview; it does not pull Tab into the panel.** The prompt asks for opening on focus and toggling on click/Enter/Space. Taken literally, Tab would walk every open panel (about 50 links) before reaching the page. So focus previews, Enter/Space/ArrowDown enter the panel, and Tab continues along the row. This matches the prompt's QA script (Tab along the row, Enter opens, move through, Escape closes). Likewise a click right after a hover keeps the panel open instead of toggling it shut under the pointer.
4. **Flat departments** show their description and "Shop all" once, in a serif introduction; their feature column is the image alone (the prompt's layout would print the description and the link twice).
5. **Account menu wording:** "My profile", "My orders", "My wishlist", "Sign out"; guest variant "Sign in" / "Create account" (the labels Prompts 09, 20, 21 and 29 use); icons dropped from the rows. Targets and actions unchanged. The signed-in summary is a non-focusable list item (`muiSkipListHighlight`), so the menu now focuses "My profile" on open (the old greeting div took the focus slot with `tabindex=0`).
6. **Utility links:** "Help" → `/help` as specified (previously "Help Center" → `/support`). The phone link's `href` is normalised to `tel:+918472918653`; the visible number is unchanged.
7. **`useHeaderHeight` returns a ref**, not state: the value changes every frame while the header slides, and state would re-render the header and the drawers and modals it mounts each time.
8. **Additions:** `groupCategoryTree` as its own module (with tests), `MegaMenu.test.js`, the `--sf-header-height` default token, DESIGN_SYSTEM §17.

### Verification

- `npm run build`: "Compiled successfully", no warnings. Gzip sizes against the Prompt 06 baseline: JS 395.26 → 397.67 kB (+2.41), CSS 54.85 → 55.94 kB (+1.09).
- `CI=true npm test -- --passWithNoTests`: 33 tests pass (22 before + 11 new), exit 0, no console output.
- `node scripts/check-contrast.js`: passes. No new pairs: the header uses ink, secondary and muted text, accent and border-strong underlines and the focus ring on the page surface (and sand on hover), all already checked.
- Literal grep: `Header.module.css` and `MegaMenu.module.css` have no hex/rgb/hsl, no font-family literal, no gradient; z-index only `--sf-z-header` / `--sf-z-megamenu`. No colour literal in the header JS.
- **Browser QA** (Playwright + Chromium against JSON Server on a scratch copy of `db.json`; dev server, then a mock-mode production build): 120 scripted checks, 0 failures, no console errors at 360/768/1024/1280/1440 in both modes. Covered: hover timing (closed at 50ms, open after 120ms, a 40ms pass does not switch), leave grace, click toggles without navigating, click-away; the full keyboard model above; leaf links navigate with canonical slugs and close the panel (also on `/products` → `/products?category=…`); active department underline and `aria-current` (incl. the legacy `?category=3` link); compaction (none at 60px of scroll, compact at 140px: box 168, visible 112, variable 112px, strip hidden, logo 36px, shadow only then), no content movement and no layout shift; header pinned while scrolling 2,400px; expands at the top; theme toggle (body class, white logo, label flip, dark surface); search trigger, cart drawer, sidebar and search at 768/360; live cart and wishlist counts with their labels; guest Sign in → auth modal → signed in (avatar initial, "Account") → menu items and focus → My orders → Sign out → home as a guest; deals off/on hides/shows Offers after a focus refetch; admin edits (hide Café & Restaurant Chairs, move Office Tables & Desks first) appear after a window `focus` and revert; panels fit within 1024×768, 1280×800 and 1440×900 and scroll inside at 1024×600; no horizontal overflow at any width; the logo keeps its 145×48 / 121×40 / 85×28 box even when the image is blocked.
- **Admin parity:** 16 screenshots (login, Categories, Products, Settings; 1440 and 390; light and dark) before vs after: 15 byte-identical, 1 differs by 24px inside a remote placeholder thumbnail, the same region that differs between two baseline runs. Nothing the admin imports changed.
- `db.json` unchanged; `node scripts/validate-db.js --catalogue` passes.

### Notes for later prompts

- **08 (footer):** mirror the header's labels ("Help", "Track order", "Our Story"); the footer needs no header offset.
- **09 (mobile nav):** see "Layouts" for what the header shows below 1024px; reuse `groupCategoryTree` (from `Header/groupCategoryTree.js` or `Header/MegaMenu.js`); `onOpenAuth("signup")` works; keep the bottom nav above content and below the header's overlays.
- **14, 16, 21, 26:** replace the hardcoded sticky offsets listed above with the contract. **17:** use it for `scroll-margin-top`.
- **15 (search):** the header opens its one `SearchModal` instance from the desktop "Search" trigger and the icon below 1024px.
- **30 (motion):** slide 640ms `--sf-ease-out`; panel 320ms in / 160ms out; hover delays 120/200ms are intent timers, not motion.
- **31 (a11y):** put the skip link before the header; the header's first focusable element is the phone link (≥ 1024px) or the hamburger.

### Needs client confirmation

- The six feature-panel eyebrows in `src/content/navigationContent.js` ("Light and weather-ready", "For the workday", "For cafés and dining rooms", "For verandas and lawns", "For every room at home", "For work and study").
- Department photography: the panel crops each department's `image` to 4:5, so the photos uploaded in Admin → Categories should survive a portrait crop (today's landscape placeholders lose the edges of their text).
- With the current department names the department row takes two lines on 1024–1279px screens (deviation 1). Shorter names in the admin would keep it on one line.

---

## Prompt 08 — Footer, newsletter, trust bar and payment marks

**Date:** 2026-10-07. **Result:** the boilerplate's slate-and-purple footer (its own gradient newsletter form, a generic blurb, "Free Shipping\*" and "24/7 Support" badges, coloured payment logos) is replaced by a navy editorial footer that looks the same in both modes: a newsletter band carrying the revived `Newsletter` (now the site's only sign-up form), a white-logo brand column with WhatsApp, Shop / Help / Contact columns with the live departments, a trust bar that only states what the data backs, one-colour payment marks, and a quiet bottom bar. Reference: `prompts/DESIGN_SYSTEM.md` §18.

### What changed

| File | Change |
|---|---|
| `src/components/Footer/Footer.js` | Rewritten. `footer aria-label="Footer"`; `Reveal` band with `<Newsletter />`; brand column (`BrandLogo variant="white" height={40}` linking home, `BRAND_PROMISE`, social icons for non-empty `SOCIAL_LINKS`, WhatsApp added with its glyph); Shop / Help / Contact columns (`h2` headings, disclosure buttons below 768px); trust bar; "We accept" marks; bottom bar. Reads `categories.getAll`, `settings.get` and `shipping.getMethods` once each (`useFooterData`, failures become empty data). The inline newsletter form, its uncleared 4s timer, `useTheme` / `data-theme` theming and the inline brand-colour SVG fills are gone. |
| `src/components/Footer/Footer.module.css` | Rewritten: tokens only (was 51 hex/rgb lines, gradients and a system font stack). |
| `src/components/Newsletter/Newsletter.js` + `.module.css` | Revived as the single newsletter form (was an orphan with a purple gradient): eyebrow `h2`, serif `NEWSLETTER_LINE`, labelled `.sf-input` styled for navy, `.sf-btn--paper`; validation, success and failure states (below); `apiService.leads.createNewsletter(email)` as before. Tokens only (was 15 literals). |
| `src/theme/storefront-tokens.css` | Three always-dark tokens: `--sf-color-on-dark-soft` (paper 8%, field fill), `--sf-color-on-dark-border-strong` (paper 40%, 3.53 : 1 boundary), `--sf-color-on-dark-error` (`#ec9483`, 7.12 : 1). |
| `src/utils/constants.js` | `TRUST_BADGES` deleted (see below). Nothing else. |
| `scripts/check-contrast.js` | Four footer pairs (DESIGN_SYSTEM §18.6). |
| New `Footer.test.js` (11), `Newsletter.test.js` (6) | Links and targets, deals gating, departments, social, trust-bar gating before/after data and on failure, payment marks, the phone disclosure; validation, trimming, single submit, success reset, failure, timers cleared on unmount. |
| `prompts/DESIGN_SYSTEM.md` | §1 lookup row, §3.3 rows for the three tokens, new §18 "Footer and newsletter". |

No page, context, service, `db.json`, header, bottom nav, sidebar, CTA or admin file changed.

### Layout

- **Desktop (≥ 1024px):** newsletter band (intro left; form in columns 7–12, or 9–12 from 1280px, in line with Contact), rule, 12-column grid brand 4 / Shop 2 / Help 2 / Contact 4, trust bar between rules (marks on the right at 1440, on a second line below that), bottom bar.
- **Tablet (768–1023px):** band stacked; two columns in DOM order (Brand, Shop / Help, Contact).
- **Phone (< 768px):** stacked; Shop, Help and Contact are `<h2><button aria-expanded aria-controls>` rows between hairlines, collapsed by default, Enter/Space toggle, 44px link rows; a plus/minus swaps without animating.
- **Shop:** All furniture `/products`, New arrivals `?sort=newest`, Best sellers `?sort=popular`, one Offers `/special-offers` (only when `useDealsConfig()` is enabled and has loaded), then the departments from `getMainMenuCategories` with the header's canonical `/products?category=<slug>`. **Help:** My account `/profile`, Track order `/orders`, Help centre `/help`, Returns & refunds `/refund`, Contact `/support`, Our story `/about`. **Contact** (`<address>`): `SUPPORT_ADDRESS`, `mailto:`, `tel:+918472918653` (named "Call +91 84729 18653", as in the header), "Message us on WhatsApp" when set, `SUPPORT_HOURS`. **Bottom:** `© {year} A & S Urbanseat`, Terms, Privacy, Cookies, "Prices in INR".
- Every old link target is still there: the two deals links became one Offers link, and the two `/help` links ("Shipping Info", "FAQs") became "Help centre".

### Newsletter behaviour

- Empty or malformed address: "Enter your email address." / "Enter a valid email address, like name@example.com." under the field (`role="alert"`, linked by `aria-describedby`), field `aria-invalid="true"`, no request; typing clears it.
- Valid: the trimmed address is posted once (repeat submits are ignored while sending; the button is `aria-disabled`, never `disabled`, so keyboard focus stays on it), then the field clears and "You're on the list." appears in a `role="status"` region that is always in the DOM. It resets after 6s; the timer is cleared on unmount, and a request settling after unmount changes nothing.
- Request failure: "We couldn't add you just now. Please try again." (`role="alert"`), the typed address stays, the field is not marked invalid.
- Field: visible label "Email address", placeholder `name@example.com`, `type="email"`, `inputMode="email"`, `autoComplete="email"`, `required` (with `noValidate`). The button's two labels share one grid cell, so its width never changes while sending.

### Trust-bar data rules

Items appear in this order and only when backed, with nothing shown for an item until its read settles. The rules are the product page's (`resolveTrustBadgeDetail`).

| Item | Shown when |
|---|---|
| Secure payment | always (store-attested) |
| Cash on Delivery | `resolveTrustBadgeDetail("cod", { settings })` is not null (`settings.payment.codEnabled`); the COD payment mark follows the same rule |
| Easy returns · 7 days | `resolveTrustBadgeDetail("easyReturns")` is not null; N from `STOREFRONT_CONFIG.returnsWindowDays` (hidden at 0) |
| Free delivery · Above ₹9,999 | `resolveTrustBadgeDetail("freeShipping", { shipping })` is not null (lowest positive `freeAbove` of the active methods; hidden when none) |

"24/7 Support" and the "Free Shipping\*" asterisk are gone. A failed read shows only the first and third items.

### `TRUST_BADGES` decision

Deleted from `constants.js`. A grep found no import before or after this prompt, and its strings were the kind of claims this redesign removes ("24/7 Support", "Best Price Guarantee"). The footer's list is code plus `resolveTrustBadgeDetail`, so it cannot drift from the product page. `WHY_CHOOSE_US` and `FAQ_ITEMS` are untouched for Prompts 12 and 28.

### Deviations from the prompt, and why

1. **"Free delivery · Above ₹9,999"** rather than "Free delivery above ₹X": the detail is `resolveTrustBadgeDetail`'s own string, so the footer and the product page can never disagree on the threshold, and it matches "Easy returns · 7 days". Screen readers hear "Free delivery, Above ₹9,999" (the dot is `aria-hidden`; a visually hidden comma separates the parts).
2. **Three new always-dark tokens.** The prompt named only the 8% fill. A field also needs a 3 : 1 boundary on navy (the 16% hairline is 1.4 : 1) and an error tone that works on navy in light mode (the light brick `--sf-color-error` measures 2.45 there).
3. **Bottom clearance is padding, 96px + safe area**, not the old 70px margin. The bottom nav measures 60–79px (75–79px at 600–768px, depending on the route), so 70px left it over the bottom bar; and a margin shows a paper strip under the navy whenever the nav hides on scroll. The bottom bar's own bottom padding drops to 8px there.
4. **Offers also waits for the deals config to load**, so a disabled deals page never flashes a link (the default config is "enabled").
5. **The band has no rule on its top edge.** It is bounded by the navy edge and a rule below. Tried both: on paper pages, a rule on the edge reads as a seam. (`.main-content`'s 80px paper padding also separates the footer from Home's closing CTA.)
6. **Newsletter split:** four columns are too narrow for the field at 1024px (the placeholder truncated), so the form takes columns 7–12 at 1024–1279px and 9–12 from 1280px. The band is top-aligned, so a message under the field never moves the field (bottom alignment pushed it up 28px).
7. **Small additions:** the footer logo links home; new-tab links say "(opens in a new tab)"; the social list is labelled "Social media" and the trust list "Our promises" (as on the product page); the payment-mark list is labelled by its visible "We accept"; forced-colours fixes (the white logo keeps a navy ground, icons follow `CanvasText`, marks inherit the forced text colour); the success reset is 6s (4–5s before).

### Verification

- `npm run build`: "Compiled successfully", no warnings. Gzip against the Prompt 07 baseline: JS 397.67 → 399.13 kB (+1.46), CSS 55.94 → 56.24 kB (+0.30).
- `CI=true npm test -- --passWithNoTests`: 50 tests (33 + 17 new), exit 0. Mutation check: each of four seeded faults (COD always claimed, Offers ignoring `loading`, the timer not cleared, a request failure marking the field invalid) failed at least one test.
- `node scripts/check-contrast.js`: passes (field text 12.35, placeholder 7.18, boundary 3.53, error 7.12). `node scripts/validate-db.js`: passes; `db.json` unchanged.
- Literal grep: no hex/rgb/hsl, gradient or font-name literal in either CSS module (only `var(--sf-font-*)` and `inherit`); no colour literal or `Arial` in the JS.
- **Browser QA** (Playwright + Chromium; JSON Server on a scratch copy of `db.json`; dev server and a mock-mode production build): 27 scripted checks plus interaction and geometry scripts, all passing on the production build:
  - **Structure:** contentinfo "Footer"; `h2`s Newsletter, Shop, Help, Contact; one form on the page (named "Newsletter"); labelled email field; six departments with canonical links; white logo 40px tall; marks 28px, their text in Inter; navy `rgb(11, 31, 63)`.
  - **Links:** 19 of the 20 internal footer links land on their own route. The 20th, `/profile`, sends a guest to `/` because `Profile.js` redirects guests (the same before this prompt; signed in, it lands on `/profile`). Both external links use `noopener noreferrer`.
  - **Deals:** turning the master switch off in Admin → Special Offers removes Offers after a window focus; turning it back on restores it (and it was left on).
  - **Newsletter (JSON Server mode):** empty and malformed submits error without a request. A valid one posted `{ type: "newsletter", email: "footer-qa@example.com", status: "subscribed", … }`, and the scratch `db.json` gained the row; the repo `db.json` was never written, so there is no demo row to remove. Focus stayed on the button, success cleared after 6s, and a forced 500 kept the address.
  - **Keyboard:** Tab runs field → Subscribe → logo → WhatsApp → Shop → departments → Help → Contact links → Terms, Privacy, Cookies, each with a visible ring. On phones the disclosures toggle with Enter and Space, and link and legal rows are 44px.
  - **Widths and themes:** no horizontal overflow at 320/360/768/1024/1440. The footer is pixel-identical in light and dark mode at every width.
  - **Motion:** the band rises 20px → 0 and fades in; under reduced motion it only fades.
  - **BottomNav:** with the nav shown at the very bottom of `/help`, `/wishlist` and `/`, the bottom bar clears it by 15.6–35px at 360/390/414/600/768. At 769px there is no nav.
  - **Forced colours:** checked in both light and dark contrast schemes.
- **Admin parity:** 24 screenshots (login, dashboard, Products, Leads, Special Offers, Settings; 1440 and 390; light and dark). 23 are identical to a second baseline run. The last, the light dashboard at 1440, differs in 38 pixels by at most 1/255, and the two baseline runs also differ from each other in that screenshot. No admin file, or anything the admin imports, changed.

### Pre-existing issues noticed (not changed)

- Guests following "My account" (footer or bottom nav) are silently sent to `/` by `Profile.js:140`. Prompt 21 could open the sign-in modal instead.
- The bottom nav is 75px on `/help` but 79px on `/` and `/wishlist` at 600–768px (Prompt 09).
- The header and the footer each fetch `/categories` on mount (two requests).

### Notes for later prompts

- **09:** the footer reserves 96px + safe area at ≤ 768px (DESIGN_SYSTEM §18.5).
- **12:** the closing CTA sits above the newsletter band; `.main-content` adds 80px of paper below the page, so a navy CTA and the navy footer are already separated.
- **29:** footer labels and the newsletter messages (`MESSAGES` in `Newsletter.js`) are in the voice pass.
- **31:** forced colours are handled in the footer; the header's auto logo still disappears on a contrast theme whose canvas matches it.

### Needs client confirmation

- **Social profiles:** only WhatsApp (`https://wa.me/918472919541`) is set. Facebook, Instagram, YouTube and X appear automatically once their URLs are added to `SOCIAL_LINKS`.
- **Contact:** address "Assam, India" (street and PIN missing), email `info@kamdhenufurniture.com` (old domain), phone `+91 84729 18653`, WhatsApp `+91 84729 19541`, hours "Monday – Saturday: 9:00 AM – 7:00 PM IST, Sunday closed".
- **Payment methods actually accepted:** the marks show Visa, Mastercard and UPI (the checkout's card and UPI options) and COD while it is enabled in settings. RuPay, net banking and wallets are offered at checkout without a mark. Confirm the real list and the gateway; "Secure payment" rests on it (Razorpay and Stripe are disabled in settings today).
- **Promises:** the 7-day returns window and the ₹9,999 free-delivery threshold (placeholders) now appear in the footer too.
- **Copy:** `NEWSLETTER_LINE`, "You're on the list.", "Prices in INR", and whether the Laravel side sends a confirmation or double opt-in (the storefront only records the lead).

---

## Prompt 09 — Mobile navigation

**Date:** 2026-10-07. **Result:** phones and tablets now get the same editorial calm as the desktop header:

- `SidebarMenu` is a paper panel with the department accordion (the same grouping as the mega-menu), an account block, Discover, Account and Settings.
- `BottomNav` is a quiet five-item bar that slides away on scroll but never under an open overlay.
- `BottomDrawer`, an orphan until now, is the shared, accessible bottom sheet.

All three are built on a new focus-trap helper. Every old link target and behaviour is kept, and the two broken `?filter=` links are gone. Reference: `prompts/DESIGN_SYSTEM.md` §19.

### What changed

| File | Change |
|---|---|
| `src/components/SidebarMenu/SidebarMenu.js` + `.module.css` | Rewritten; props `open`, `onClose`, `onOpenAuth` unchanged. Layout and behaviour in DESIGN_SYSTEM §19.2. Removed: the keyword→icon mapping (16 category glyphs), the 13 `--sm-*` colours and their gradients, the cart-icon wordmark, the spring, the "HOT" badge, the lazy "Shop by Category" toggle, and the broken `/products?filter=trending` and `?filter=best-sellers` links. 75 colour literals → 0. |
| `src/components/BottomNav/BottomNav.js` + `.module.css` | Rewritten. Changes: Shop replaces Categories; a guest's Account opens the sign-in dialog; items are real `<Link>`s (they were buttons calling `navigate`); `aria-current` is `"page"` or `"true"`; the wishlist count is a `.sf-count`; z-index is `--sf-z-bottomnav` (was 1200); the blur, shadow and indigo are gone. Behaviour: the overlay guard, and focus returns to Search when its overlay closes. 17 literals → 0. |
| `src/components/BottomDrawer/BottomDrawer.js` + `.module.css` | Rewritten as the shared sheet. It now has dialog semantics, Escape, focus in and back out, the scroll lock and a body portal. Props: kept `open`, `onClose`, `title`, `children`; added `ariaLabel`, `initialFocusRef`, `maxHeight` (default `80vh`), `footer`, `className`. 8 literals → 0. No page uses it yet (Prompt 14). |
| New `src/components/ui/useFocusTrap.js` | `useFocusTrap` (default), `useBodyScrollLock`, `useBodyScrollLocked`, `getFocusableElements`. |
| `src/components/ui/index.js` | Also exports the four helpers and `BottomDrawer`. |
| `src/theme/storefront-tokens.css` | `--sf-z-bottomnav: 58`. |
| New tests | `useFocusTrap.test.js` (8), `BottomDrawer.test.js` (8), `SidebarMenu.test.js` (14; one renders the real `db.json` tree), `BottomNav.test.js` (14). |
| `prompts/DESIGN_SYSTEM.md` | Updated: §9 z-index row, §16.4 barrel note, §18.5 nav height. New: §19 "Mobile navigation and overlays". |

No change to `Header/*` (read only), `SearchModal`, `CartDrawer`, `AuthModal`, pages, contexts, `api.js`, `src/utils/categories.js`, `db.json` or any admin file.

### Decisions

- **Search instance:** BottomNav keeps its own `SearchModal` instance. Routing it through the header's instance would need an `onOpenSearch` prop or lifted state through `Header.js`, which this prompt only reads. Keeping two is cheap:
  - the modal caches the catalogue at module level, so both instances share one fetch;
  - a closed instance renders nothing and makes no request;
  - the two can never be open together, because each overlay covers the other's trigger.

  When the bar's overlay closes, focus returns to its Search button.
- **`groupCategoryTree`:** reused from `Header/groupCategoryTree.js` (Prompt 07 already extracted it), so `src/utils/categories.js` is unchanged. A test renders the sidebar from the seeded `db.json` categories and checks that each department's links equal the helper's output, in order. The tree checked: Plastic Furniture → Essentials, Premium, Dining Sets, Sofas; Home Furniture → its four rooms, with Bedroom's six leaves.
- **The focus-trap helper** lives in `src/components/ui/`, where Prompt 18 looks for it, and is exported from the barrel. It moves focus in (`initialFocusRef`, the first focusable element, or the container), cycles Tab and Shift+Tab, handles Escape for the topmost trap only, and returns focus to the opener unless another layer has taken it. It does not forcibly pull focus back, so portalled popovers and SweetAlert dialogs opened from a layer keep working. `useBodyScrollLock` sets the same inline `overflow: hidden` the other overlays already set.
- **Overlay guard:** BottomNav watches the body lock with a `MutationObserver` (`useBodyScrollLocked`), not only from its scroll handler. While any overlay holds the lock, the bar is shown, ignores scrolling and is `inert`. An overlay that opens while the bar is hidden brings it back, so it is in place when the overlay closes. The acceptance line "hidden while overlays are open" is read as *beneath every overlay and inert*, not slid away: the design requirement and implementation note 3 both say the bar never hides while a sheet or drawer is open.
- **`--sf-z-bottomnav: 58`** (the value DESIGN_SYSTEM suggested): above page content and the header (they never overlap), below the sticky bar (60), drawers (1000) and modals (1100).
- **Breakpoint:** the bar shows under `@media (max-width: 768px)`, the footer reserve's own query, and is gone from 769px. At exactly 768px the tablet header and the bar both show, as the prompt specifies (≤ 768px).
- **Sidebar data:** the categories are read each time the menu opens ("fetched when the panel opens, cached in state"). The cached list renders at once, the read refreshes it, so admin edits appear as they do in the header, and a failed refresh keeps the cached list. The first read shows a skeleton; a failed first read offers "Try again".
- **Initial focus:** the sidebar's close button, the same as the sheet (the prompt fixes this for the sheet; the old sidebar focused its panel).
- **Labels** follow the header's account menu: "My account", "My orders", "My wishlist", "Sign out". Guests see "Track order" (the header and footer label) for `/orders`. `/profile` appears only when signed in, because `Profile.js` sends guests home.

### Deviations from the prompt, and why

1. **An "Account" section** (My orders or Track order, My wishlist, Sign out) is not in the prompt's section list. It keeps the old sidebar's `/orders`, `/wishlist` and Logout (guardrail 1). The header also doesn't offer them below 1024px: it has no wishlist at 768–1023px and no account action below 768px.
2. **"Cookies"** sits beside Terms and Privacy in the legal row, as in the footer's bottom bar.
3. **Current-location cues** (not asked for):
   - Opening the menu on a listing expands that listing's department.
   - `aria-current` marks the current category link, the department holding it and the current page's link.
4. **`BottomDrawer` additions:** `footer` and `className` props, for Prompt 14's "Show N results" row; and a portal on `<body>`.
5. **Exit motion:** the prompt specifies the entrances. The sidebar and the sheet leave over `--sf-duration` with `--sf-ease-in-out`, so closing feels quicker than the 640ms entrance.
6. **Shop glyph:** a chair (`ChairOutlined`) rather than the old grid.
7. **The bar is `inert` under overlays.** It is covered by the backdrop anyway; this also takes it out of the tab order and the accessibility tree.
8. **Indentation:** an expanded department's content is indented 16px, so its eyebrow groups never read as the menu's own section titles once the department name has scrolled away.

### Verification

- `npm run build`: "Compiled successfully", no warnings. Gzip against the baseline: JS 399.13 → 395.07 kB (−4.06), CSS 56.24 → 55.46 kB (−0.78). The old sidebar's icon set and CSS are gone.
- `CI=true npm test -- --passWithNoTests`: 94 tests (50 + 44 new), exit 0, no React warnings.
- `node scripts/check-contrast.js`: passes. No new pairs: the three surfaces only use page-surface pairings already in §14 (ink, secondary and muted text, accent and focus ring, the border-strong boundary, primary and ghost buttons, the count disc, the switch).
- `node scripts/validate-db.js`: passes; `db.json` unchanged.
- Literal grep on the three CSS modules: no hex/rgb/hsl, gradient, blur or font-name literal (`font-family` is only `var(--sf-font-*)` or `inherit`); z-index only from tokens.
- **Browser QA.** Setup: Playwright and Chromium; JSON Server on a scratch copy of `db.json`, still byte-identical to the repo's afterwards; mock-mode production builds. The sheet was tested on a temporary `/qa-bottom-drawer` route that existed only in a scratch build; `App.js` was restored byte for byte (SHA-256 checked) and the demo file deleted. Results:
  - 117 scripted checks pass at 320, 360, 768, 1024 and 1440px, in both modes and under reduced motion.
  - 18 more checks at 768/769px pass, along with a CDP accessibility-tree check.
  - **Sidebar:**
    - It is an `aria-modal` dialog named "Menu", 316.8px wide at 360px (88vw), on paper (navy-ink in dark mode) with a hairline edge and square corners, at z 1000.
    - The logo is light, or white in dark mode, at 28px; the close button is 44px and takes focus on open.
    - The page is locked and the bar is inert while it is open.
    - Six departments appear in menu order, in serif 20px on 48px rows; the two flat ones are links.
    - Plastic Furniture shows Essentials / Premium / Dining Sets / Sofas as 12px uppercase eyebrows, 7 leaves at 15px on 48px rows, and "Shop all"; Home Furniture shows Living Room 3 / Bedroom 6 / Dining Room 1 / Storage 1. Only one department is open at a time.
    - Every category link is the canonical `?category=<slug>`.
    - Focus: Shift+Tab from the close button wraps to "Cookies"; 80 Tabs never leave the dialog; the 2px caramel ring shows; Enter toggles a department.
    - Escape and the backdrop close it, focus returns to the hamburger (`aria-expanded` follows) and the lock is released.
    - A leaf navigates and closes the menu. Re-opening on that listing expands its department and marks the leaf `aria-current="page"`.
    - Discover links are valid and no `filter=` link remains. Best sellers lands sorted by popularity.
    - "Create account" opens the sign-up tab and "Sign in" the login tab; signing in through it at 360 and 768 works. Signed in, the menu shows the name, email and My account / My orders / Sign out. Sign out logs out, goes home and shows the toast.
    - The Dark mode switch flips the theme and its `aria-checked`.
    - No horizontal overflow at 320, 360 or 768 with the menu open.
  - **BottomNav:**
    - Five items in order; 44px+ targets; 11px uppercase labels that fit at 320px; 24px glyphs. Paper, hairline, no blur or shadow, z 58, 57px tall.
    - The current item is ink with a 2px caramel mark. `aria-current` is right on `/`, `/products`, `/products/:slug` (`true`), `/wishlist`, `/profile` and `/orders` (`true`).
    - Every item works at 360 and 768: a guest's Account opens sign-in; signed in, it goes to `/profile`. Search opens the overlay, the bar turns inert under it, and focus comes back to Search afterwards.
    - It slides away on scroll down and returns on scroll up. Opening the cart drawer while it is hidden brings it back, inert; it does not hide while the drawer is open; it stays put and reachable after.
    - Hidden from 769px; no hamburger at 1024 or 1440 (the desktop header).
  - **Sheet (light and dark):**
    - An `aria-modal` dialog in a body portal: 8px top corners, `max-height` 80vh (592px at 740), serif title, paper (navy-ink in dark mode) surface.
    - Focus goes to the close button, or to `initialFocusRef`; Tab cycles, including the footer.
    - Escape and the backdrop close it, focus returns to the trigger and the lock is released.
    - The `ariaLabel`/`maxHeight` variant works.
  - **Reduced motion:** the menu and the sheet fade with no transform on any sampled frame, and the bar's transition collapses to 0.01ms.
  - **Accessibility tree** (Chromium, through CDP):
    - the dialog "Menu" is modal;
    - department buttons report `expanded` false or true, and the open panel is a group named by its department;
    - the switch "Dark mode" reports `checked`;
    - the bottom nav is absent while the menu is open.

    CDP exposes no `aria-current` property, so the DOM checks above cover that. VoiceOver and NVDA were not available here (as in Prompt 07).
  - **Dev server:** no console errors or warnings through the menu, search and nav flows.
- **Two bugs found in browser QA and fixed, each now covered by a test** (reverting either fix fails exactly its test):
  - In Chromium, a tapped nav link keeps focus, and the "keep the bar while it has focus" rule then stopped the bar from ever hiding. Only `:focus-visible` counts now.
  - Focus did not return to Search, because the search field was still focused inside the dialog during its exit animation. Focus is now restored when it is on `<body>` or inside the closing dialog.
- **Admin parity:** 24 screenshots (login, dashboard, Categories, Products, Settings, Special Offers; 1440 and 390px; light and dark), 24/24 byte-identical to the baseline (two baseline runs were identical too). Nothing the admin imports changed.

### Pre-existing issues noticed (not changed)

- `Footer.module.css` still describes the bar as "60–79px tall"; it is now 57px. DESIGN_SYSTEM §18.5 is updated.
- `AddToCartBar` (1300 on mobile), the Products filter sheet (1300) and the Profile toast (1300) carry z-index values picked to beat the old 1200 bar. They still sit above the new bar (58); their owners can move to tokens (§19.5).
- `AuthModal` does not take focus when it opens. After "Sign in" from the menu, focus waits on the hamburger behind the modal. Prompt 20 adds focus management, and its focus return will land on the hamburger.
- An unnamed `<nav>` is exposed on `/products` (the listing page's, Prompt 14).

### Notes for later prompts

- **14:** `BottomDrawer` gives the filter sheet its dialog semantics, Escape, focus on the close button, focus back to the trigger and the scroll lock. Its `footer` slot holds "Clear all" and "Show N results".
- **15:** the bar's Search button is `aria-haspopup="dialog"`. If the overlay starts returning focus to its opener itself, the bar's restore becomes a no-op.
- **16:** `AddToCartBar` can drop its mobile `z-index: 1300` for `--sf-z-stickybar`.
- **18, 20:** reuse `useFocusTrap` and `useBodyScrollLock`, and set the lock while open: BottomNav keys off it.
- **30:** sidebar in 640ms `--sf-ease-out`, out 320ms `--sf-ease-in-out`; sheet in 320ms `--sf-ease-out`, out 320ms `--sf-ease-in-out`; bar 320ms `--sf-ease-out`; plus/minus swaps without animation.
- **31:** forced colours are handled for the plus/minus glyph, the switch and the bar's current mark; the bar is `inert` under overlays.

### Needs client confirmation

- The guest line "Sign in for faster checkout and order tracking." (the copy given in the prompt).
- The chair glyph for "Shop" in the bottom nav.
- Menu wording: the section names Shop / Discover / Account / Settings, "Track order" for guests, and "Help & support".

---

## Prompt 10 — Home hero and assurance strip

**Date:** 2026-10-07. **Result:** the home page opens on a full-bleed editorial hero: one photograph (or, later, a muted film), the brand eyebrow, the serif headline with its italic caramel accent, one support line and two paper CTAs over a navy scrim. Under it sits a slim assurance strip that states only what the store's data or stated policy backs. Copy and media come from the new `src/content/homeContent.js`. Reference: `prompts/DESIGN_SYSTEM.md` §20.

### What changed

| File | Change |
|---|---|
| `src/components/HeroSection/HeroSection.js` + `.module.css` | Rewritten (417 → 261 lines of JS). Hero from `HERO`: image/video media, scrim, `h1` via `renderAccent`, paper CTAs, mount entrance, parallax, reduced-motion handling, optional film control, the font wait (§20.4). Tokens only: Prompt 01 counted 37 colour literals in the old CSS and 18 in the JS; none remain. |
| New `src/content/homeContent.js` | The home page's content/config module; `HERO` (shape below). Prompts 11 and 12 add their entries here. |
| New `src/components/storefront/AssuranceStrip.js` + `.module.css` | The strip (§20.5). |
| New `src/components/storefront/trustIcons.js` | The trust-cue outline drawings, moved out of `TrustBadges.js` (verified byte-identical) so the strip reuses them. `TrustBadges.js` now imports them; nothing else in it changed. |
| `src/pages/Home/Home.js` | One import, and the old `<section className={styles.heroSection}><HeroSection /></section>` replaced by `<HeroSection />` `<AssuranceStrip />`. The rest of the page is untouched (Prompt 11). |
| `src/content/brandContent.js` | Comment only: how the strip prints the delivery item. |
| `scripts/check-contrast.js` | One pair (the ghost CTA's border on the scrim) and two informational rows (§20.6). |
| New tests | `HeroSection.test.js` (16), `AssuranceStrip.test.js` (10), `TrustBadges.test.js` (2). |
| `prompts/DESIGN_SYSTEM.md` | A note under §3.3 (scrim) and a new §20. |

No change to `src/services/*`, `db.json`, `src/theme/tokens.js`, `Header/*`, the footer, the other home sections, or any admin file.

### Removed, and the `banners` collection

- **The banner carousel:** three hardcoded gradient banners ("Flash Sale / Up to 70% Off on Electronics", "New Arrivals / Discover Latest Fashion Trends", "Ethnic Collection"). It auto-rotated every 5s and had arrows, dots, decorative circles and a "Limited Time Offer" label.
- **The two promo cards:** "Deal of the Day / Up to 50% Off / Top picks at unbeatable prices" and "Just Launched / New Arrivals / Fresh styles added every day". Both were invented offers, and the first linked to the invalid `?sort=discount`.
- **The category quick-link bar:** an electronics/clothing icon map in seven hardcoded colours, with its own `categories.getAll()` read. Category discovery moves to Prompt 11's "Shop by Space".
- **`banners` stays as unused data.** The collection stays in `db.json` (Prompt 05's three brand records) and `apiService.banners.getAll` stays exported and untouched, but nothing calls it now. No admin screen manages banners, so nothing the client edits is lost.

### The content module: `HERO`

```js
export const HERO = {
  eyebrow: "A & S Urbanseat",                 // optional
  headline: HERO_HEADLINES[0],                // imported from brandContent.js
  support: HERO_SUPPORT_LINES[0],
  primaryCta: { label: "Shop the collection", to: "/products" },
  secondaryCta: { label: "Our story", to: "/about" }, // optional (null hides it)
  media: {
    image: { src: HERO_IMAGE, alt: "Placeholder for the hero photograph", width: 2400, height: 1350 },
    // optional on image: srcSet, sizes (for real photography)
    video: { src: null, poster: HERO_IMAGE },  // src null → image only
    focalPoint: "50% 60%",                     // object-position
  },
};
```

- `HERO_IMAGE` is `https://placehold.co/2400x1350/f1ebe1/686158?text=Hero+photograph` (the placeholder tones).
- Replacing the photograph means changing that one constant, plus its alt text; it is also the film's poster.

### Decisions

- **The scrim is built from `--sf-color-scrim` around the copy block, not the whole hero.** DESIGN_SYSTEM §3.3 requires text to sit on at least `--sf-color-scrim`. A 640px column with a display-xl headline does not fit inside the bottom-left 35% of `--sf-gradient-scrim` on a wide hero: at 1440 × 900 the column's top-right corner falls where that gradient has faded to about 0.43 (paper text about 2.5 : 1 over a white photograph).
  - So `.copy::before` holds full strength behind the copy, 8px clear of it, and out to the bottom and left edges.
  - It fades out above the copy (a `mask-image` ramp) and, from 1024px, to its right (the background ramp), each eased with a colour hint.
  - Below 1024px the copy is about as wide as the hero, so the scrim runs edge to edge and only fades upward.
- **The copy waits up to 1s for its fonts.** The copy is bottom-aligned, so a font swap that changes a line box moved every line above it (0.001–0.018 CLS measured).
  - The copy and its scrim are laid out but hidden until Playfair (400, italic) and Inter (400, 500) report loaded, for at most 1s. Then the lines enter and the scrim fades in.
  - Later visits don't wait, and the media never waits, so LCP is unaffected.
  - A side effect: the headline no longer visibly swaps faces.
- **Parallax uses the window's `scrollY`** over the hero's measured bottom edge. `useScroll({ target })` measures against `<html>` and logs a dev warning unless `<html>` is positioned, and the admin shares `<html>`.
- **The strip's loading state** lays the full list out invisibly under one `.sf-skeleton` line, so the strip is already at its loaded height (measured equal at every width). The reads use `Promise.allSettled`; a failed read only drops the items that depend on it.
- **A Pause/Play control for the film.** A looping background film is moving content, and WCAG 2.2.2 asks for a way to pause it. It is a 44px paper button, bottom right (top right on phones), present only when `video.src` is set.
- **Shared trust icons.** The strip uses the product page's drawings from `trustIcons.js`, so the set is not copied a third time (the footer still has its own four).

### Deviations from the prompt, and why

1. **Scrim from `--sf-color-scrim`, not `--sf-color-overlay`.** The overlay is the mode-aware drawer backdrop. As a scrim over a white photograph it gives paper text 4.15 : 1 in light mode (fails 4.5) and 7.32 : 1 in dark. `--sf-color-scrim` is the always-dark photography token (5.77 : 1 in both modes), and the design system names it for text over photography. The construction is the copy-anchored one under Decisions.
2. **The eyebrow uses full `--sf-color-on-dark`, not paper at 80%.** On the scrim over a white photograph, paper at 80% measures 4.37 : 1, below 4.5 for 12px text. DESIGN_SYSTEM §3.3 and §5.6 put small text on photography at full strength. The eyebrow still reads as secondary through its 12px uppercase tracking.
3. **The hero is 72vh at 1024–1279px**, not 86vh. The header is 212px tall there (its department row wraps), and 86vh put both CTAs below the fold of any screen shorter than about 1000px. At 1024 × 768 they now end at 700px.
4. **Free delivery's detail is "Above ₹9,999".** That is `resolveTrustBadgeDetail("freeShipping")`'s own string, reused as asked. The brand template "Free delivery above {threshold}" would have repeated the label, and the shared string keeps the strip, footer and product page on one amount. The other three details are the `ASSURANCE_ITEMS` lines, with `{days}` filled.
5. **Box reservation is by explicit height, not `aspect-ratio`.** The hero's height comes from CSS, and the media layer is absolutely positioned inside it. An `aspect-ratio` on a box sized by its container would do nothing; measured CLS is 0 and the box is identical before and after the image.
6. **On a read error, only the dependent items drop.** A failed settings read hides only COD; a failed shipping read hides only free delivery. With both failing, only the static items remain, as specified.
7. **Tablets (768–1023px)** get the full-width copy (headline capped at 640px) and the edge-to-edge scrim. The 640px bottom-left column starts at 1024px, where it leaves room for the scrim to fade.
8. **Additions:**
   - the font wait;
   - the film control;
   - the optional `srcSet`/`sizes` passthrough for real photography;
   - `trustIcons.js` (which touches `TrustBadges.js`, owned by Prompt 16, with no visual change: 4/4 element screenshots identical) and its two tests.

### Verification

- **Build and tests.**
  - `npm run build`: "Compiled successfully", no warnings.
  - Gzip against the Prompt 09 baseline: JS 395.07 → 398.38 kB (+3.31, mostly framer's scroll tracking for the parallax); CSS 55.46 → 55.04 kB (−0.42).
  - `CI=true npm test -- --passWithNoTests`: 122 tests (94 + 28), exit 0, no React warnings.
  - Mutation check: six seeded faults each failed at least one test. The faults were: COD always shown; the label-repeating delivery template; rendering after the first read; autoplay under reduced motion; no `fetchpriority`; the entrance under reduced motion.
  - `node scripts/check-contrast.js` and `node scripts/validate-db.js` pass; `db.json` is unchanged.
  - Literal grep of every new or changed source: no hex, `rgb()`, `hsl()` or `font-family` literal. The minifier writes `transparent`/`black` as `#0000`/`#000` in the built CSS. Autoprefixer adds `-webkit-mask-image`.
- **Browser QA.** Setup: Playwright and Chromium; JSON Server on a scratch copy of `db.json` (the repo file was never written); the dev server, then mock-mode production builds.
  - **Layout** (320, 360, 390, 768, 1024, 1280, 1440 and 1920px; light and dark):
    - one `h1`; the headline takes 3 lines at 320–390px and 2 from 768px;
    - the CTAs stack full width below 768px and sit in a row above;
    - no horizontal overflow; no console warnings or errors in production;
    - the strip is one 56px row from 1024px and 2 × 2 below (115px at 768px, 160–175px on phones, where details wrap).
  - **CTAs:** both are in the first view at 360 × 740, 390 × 844, 1024 × 768, 1280 × 800, 1440 × 900 and 1920 × 1080. They lead to `/products` and `/about`.
  - **Contrast, worst case:** the photograph was replaced by pure white, and the lightest pixel behind each text box was measured at seven widths in both modes. Eyebrow, headline, support line and ghost CTA measure 5.78 : 1; the caramel accent 3.15 : 1.
  - **LCP** is the hero `<img>`:
    - with a high-entropy 2400 × 1350 JPEG, 840ms; with the placeholder SVG, 668ms;
    - its request starts before first contentful paint (700ms vs 736ms).
  - **CLS** for the hero and strip is 0 at 360 and 1440px, with and without reduced motion.
    - With fonts delayed 3s (beyond the 1s wait): 0.002–0.018.
    - At 1024 × 768 the page shifts 0.034 when Inter arrives, because the header grows from 168 to 212px. The baseline build shows the same value: pre-existing, from the header.
  - **Slow network** (400ms latency, 500 kbps, photograph held back): the hero box is 774px tall at y 168 before and after the image arrives.
  - **Motion:**
    - the media settles from scale 1.04 within about 0.5s; the copy lines rise in sequence and are at rest by 0.8s;
    - parallax: 10.6px of shift at 200px of scroll and 21.1px at 400px, up to 49.7px (6% of the 828px media) once the hero has scrolled out;
    - under reduced motion no transform appears at any sample and the parallax stays at none.
  - **Film:** `video.src` was set temporarily to a local test MP4, then back to `null`. The film was VP9, because Playwright's Chromium has no H.264 decoder; with H.264 the error path removed the film and kept the photograph.
    - It autoplays muted, looping and inline, with the photograph as the poster.
    - Pause/Play (44px) works with Enter and Space, and its label follows.
    - Under reduced motion it does not autoplay; the poster shows and Play is offered.
    - A 404 removes the film and keeps the photograph.
  - **Strip data:** done through JSON Server on the scratch copy, then restored to the repo's values.
    - `codEnabled: false` → Cash on delivery disappears.
    - `freeAbove: null` → Free delivery disappears.
    - Restored → four items. The footer trust bar agrees on "Above ₹9,999".
  - **Laravel shape:** a non-mock production build against a stub API wrapping every response in `{ success, data, meta }` shows the same four items.
  - **Keyboard and accessibility tree:**
    - after the header's 49 stops, focus goes "Shop the collection" → "Our story" (caramel ring on the scrim), then to the next section; the strip adds no stops;
    - CDP accessibility tree: heading level 1 "Seating for the way you live." (no stray space around the `<em>`), a region of the same name, list "Our assurances" with four list items, and the image "Placeholder for the hero photograph".
- **Admin parity:** 24 screenshots (login, dashboard, Categories, Products, Settings, Special Offers; 1440 and 390px; light and dark), 24/24 byte-identical to the baseline. Two baseline runs were also identical.

### Pre-existing issues noticed (not changed)

- **Header font swap:** at 1024–1279px the header grows from 168 to 212px when Inter arrives (CLS 0.034 on first visits). This is the header's department row (Prompt 07) plus font loading (Prompt 32).
- **Page fade:** `Home.js` fades the whole page in (`motion.div`, opacity 0 → 1 over 0.4s) inside `AnimatePresence`. The hero's first frames are therefore partly transparent (Prompts 11 and 30).
- **Legacy background:** below the strip, `.homePage` still paints the legacy `#f5f7fa` / `#0b0f1a` background, and `.heroSection` in `Home.module.css` is now unused (Prompt 11).
- **Duplicate reads:** the strip and the footer each read settings and shipping methods, and the header and the footer each read categories (Prompt 32).
- **Footer icons:** the footer keeps its own copy of four trust icons; it could import `trustIcons.js`.

### Notes for later prompts

- **11:**
  - add `SPACES`/`STORY`/… to `homeContent.js` after `HERO`; titles go through `renderAccent`/`SectionHeading`;
  - the strip ends with a hairline, so the next section needs no top rule;
  - `--sf-gradient-scrim` still suits photo tiles whose caption fits its bottom-left 35%;
  - delete the unused `.heroSection` rule.
- **12:** `PROMISE_STEPS` can reuse the strip's resolution rules (`resolveTrustBadgeDetail`).
- **30:** the hero motion values are in DESIGN_SYSTEM §20.3; `will-change` is set on the hero media only, and only while motion is allowed.
- **31:** the film control is the only focusable element added besides the CTAs, and only when a film is set.
- **32:**
  - preload candidate: `HERO_IMAGE`, a single constant, already `fetchpriority="high"`;
  - size-adjusted fallback faces would remove the swap shift beyond the 1s font wait and the header's;
  - consolidate the duplicate reads.

### Needs client confirmation

- **Hero copy:**
  - headline "Seating for the way you *live*." (`HERO_HEADLINES[0]`; two alternatives in `brandContent.js`);
  - support line "Chairs, sofas and tables for homes, offices, cafés and the open air.";
  - eyebrow "A & S Urbanseat";
  - CTAs "Shop the collection" (`/products`) and "Our story" (`/about`).
- **Hero photograph** (2400 × 1350): on desktop the bottom-left ~45% × 60% sits under the navy scrim, so the subject reads best right of centre (`focalPoint` adjusts the crop). Also: whether a short film is wanted.
- **Assurance items** (all placeholders, from data or policy):
  - "Free delivery · Above ₹9,999";
  - "Easy returns · 7-day returns on eligible pieces";
  - "Secure payment · Encrypted checkout for cards, UPI and net banking" (the gateway and methods are to be confirmed);
  - "Cash on delivery · Pay when your furniture arrives". COD is capped at ₹50,000 in settings: should the strip say so?
- **Delivery wording:** the strip prints "Above ₹9,999", the footer's wording, rather than the template "Free delivery above {threshold}".

---

## Prompt 11 — Home storytelling and discovery

**Date:** 2026-10-07. **Result:** the middle of the home page is now curated, image-led discovery with generous whitespace. The order is:

1. Shop by space: four category tiles.
2. Story block 1: an editorial image and text block.
3. Featured Collections: the revived `FeaturedProducts`.
4. Complete the space: an anchor piece with its curated companions, on the page's one sand band.
5. Story block 2: mirrored.
6. Trending.
7. Recently viewed.

Every section is driven by catalogue data or `homeContent.js`, and is hidden when its data is missing. The boilerplate's flash deals, midnight countdown and "Up to 50% off on top brands" banner are gone. All three rails run on one new component, `ProductRail`. Reference: `prompts/DESIGN_SYSTEM.md` §21.

### What changed

| File | Change |
|---|---|
| `src/pages/Home/Home.js` | Rewritten (607 → 505 lines). Removed: the private `ProductCard`, `StarRating`, `CountdownTimer`, `SectionHeader` and `ScrollRow`; Flash Deals; the promo banner; Shop by Category (replaced by Shop by space); the page-level opacity fade; `useTheme`. New page-private sections: `ShopBySpace`, `StoryBlock`, `CompleteTheSpace` and its loader, and the interim `WhyChooseUs`. Data is one `Promise.all` (categories, `getFeatured(8)`, `getTrending(8)`, each `.catch(() => [])`), then the curation once featured has resolved. |
| `src/pages/Home/Home.module.css` | Rewritten (895 → 413 lines): tokens only. Prompt 01 counted 101 colour literals here; none remain. The legacy `.homePage` background and its `.dark` variant are gone (the page inherits `--sf-color-bg` from `.main-content`), and so is the unused `.heroSection`. |
| `src/components/FeaturedProducts/FeaturedProducts.js` + `.module.css` | Revived as the Featured Collections section: `SectionHeading` over `ProductRail`. Props `products`, `title`, `eyebrow`, `viewAllLink`, `onAddToCart`, `onToggleWishlist`, `isInWishlist`, plus `viewAllLabel`, `railLabel`, `loading`, `headingId` and `className`. Defaults come from `HOME_SECTIONS.featured`. The private card, its contexts and `useNavigate` are gone; the 31 literals are down to 0. |
| New `src/components/storefront/ProductRail.js` + `.module.css` | The site's one product rail (DESIGN_SYSTEM §21.6). |
| `src/components/storefront/index.js` | Also exports `ProductRail`. |
| `src/content/homeContent.js` | `HOME_SECTIONS`, `SPACES`, `STORY` and `COMPLETE_THE_SPACE` added after `HERO`. |
| New tests | `ProductRail.test.js` (11), `FeaturedProducts.test.js` (6), `Home.test.js` (20). |
| `prompts/DESIGN_SYSTEM.md` | New §21. |

No change to `HeroSection`, `AssuranceStrip`, `ProductCard` / `PriceBlock` / `StarRating`, `RelatedProducts`, contexts, `api.js`, `db.json` or any admin file. The only API calls are `categories.getAll`, `products.getFeatured`, `getTrending`, `getBySlug`, `getFrequentlyBoughtTogether` and `getRelated`.

### Content module additions (`homeContent.js`)

- **`SPACES`** (all copy proposed). Each tile shows its category's own admin-managed `image`.

  | Space | Category slug | Line |
  |---|---|---|
  | Home | `home-furniture` | "Sofas, beds, dining and storage." |
  | Office | `office-chairs` | "Task, executive and waiting chairs." |
  | Café & Restaurant | `cafe-restaurant-chairs` | "Hard-wearing chairs for busy service." |
  | Outdoor | `outdoor-furniture` | "For verandas, lawns and terraces." |

  Each line describes what its listing actually holds. For example, Office → `office-chairs` holds no desks, so the line names only chairs.
- **`STORY`** (proposed copy; 1200 × 1500 placeholders in the neutral tones; the alt text describes the photograph to come):
  - `STORY[0]`, "At home" / "Built for the *everyday*.": "Sofas to sink into after work, beds for long nights and dining tables that seat the whole family. We choose each piece for the way it is used day to day, not only for how it looks on the day it arrives." CTA "Shop home furniture" → `/products?category=home-furniture`.
  - `STORY[1]`, "Our workshop" / "Made by people we *know*.": "Some of our pieces are made in our own workshop; the rest come from makers we know well. Either way, we choose each one to hold up to everyday use." CTA "Read our story" → `/about`.
  - The copy makes no claim about years, warranties or counts.
- **`COMPLETE_THE_SPACE`:** `anchorProductSlug: "ergonomic-high-back-chair-with-headrest"`, eyebrow "Complete the space", title "Pieces that belong *together*.", intro "One piece we like, and the pieces we would set beside it.", "Pairs well with", "View", "Add all to cart" / "Add the available pieces", "{count} pieces, {total}". The copy describes a curation, not a co-purchase statistic, since the bundle ids are a merchandising choice.
- **`HOME_SECTIONS`** (not asked for: it keeps every heading in the module):
  - Spaces: eyebrow "Shop by space", title "Furniture for every *room*.".
  - Featured: "Featured", "Pieces we *recommend*.", View all → `/products`.
  - Trending: "Trending", "What people are *choosing*.", View all → `/products?sort=popular`.
  - Recently viewed: eyebrow "Recently viewed".
  - The carousels' names: "Featured pieces", "Trending pieces", "Recently viewed pieces".

### Rail implementation decision

- **One new `ProductRail`.** I did not extend `RelatedProducts`' scroller: Prompt 17 owns that component, and its text already asks for it to become "a thin wrapper" around `ProductRail` once this exists. `RelatedProducts` is untouched, so the product page keeps its own scroller until then.
- **API:**
  - `products`, and the name: `label` or `labelledBy`.
  - `loading` (skeleton cards) and `skeletonCount`.
  - `compact` (more, smaller cards).
  - The card handlers (`onAddToCart`, `onToggleWishlist`, `showAddToCart`) and `isInWishlist`.
  - `previousLabel` / `nextLabel` (default "Previous pieces" / "Next pieces") and `className`.
- **Behaviour:**
  - Snap scrolling, with 4 / 3.2 / 2.2 cards per view (6 / 4.3 / 2.6 compact). Below 1024px the track runs to the screen edges.
  - Hairline square buttons that scroll one page of whole cards, and a decorative hairline progress line.
  - A `role="group"` with `aria-roledescription="carousel"` around a real list.
  - `aria-disabled` at the ends, so focus is never dropped. No extra tab stop: the arrow keys scroll the track while a card has focus.
  - 8px of focus room inside the scroller, so focus rings are not clipped.
  - The progress line is written straight to the DOM, so scrolling never re-renders the cards.

### Decisions

- **Anchor choice:** an office set (Ergonomic High-Back Chair with Headrest + Cushioned 3-Seater Waiting Bench + Winsome Office Table, ₹45,997 in all). The alternatives failed:
  - King Size Bed: `buildCartItem` takes the cheapest variant, so "Add all" would add its Carlton mattress in **Single** size.
  - Sofa sets: only one curated companion each.
  - The fallback anchor: the first featured product with bundle ids, the Classic Plastic Armchair, whose single curated table is topped up with three related chairs.
- **Companion rule:** "FBT, falling back to related" is read as: use the curated `frequentlyBoughtTogetherIds`, and only when they give fewer than two, top up from `getRelated` (de-duplicated, up to four).
  - A curated pair is never diluted with alternatives. Otherwise the default set would gain two more office chairs, and "Add all" would add them too.
- **Add all:**
  - Sold-out pieces (`stock === 0`, the card's own rule) are left out, and the label then says so.
  - A total line ("3 pieces, ₹45,997.00", from the same `buildCartItem` prices) is shown beside the button and is the button's description, so nobody adds ₹46k blind.
- **Complete the space layout:**
  - From 768px the anchor's image is on the left (sticky), with its details over the 2 × 2 of companions on the right. With the seeded pair the right column ends 90px below the 804px image at 1440 (134px at 1024, 374px at 768, where the sticky image keeps the anchor in view while the companions scroll past).
  - The image is a pointer convenience (`tabIndex={-1}`, `aria-hidden`, as in the mega-menu); "View <name>" is the accessible link.
  - A hairline frame over the image's edge stops a sand photograph (and every placeholder) from dissolving into the sand band.
- **All sections use `.sf-container--wide`**, the left edge of the header, hero and strip (the strip already does). Mixing in the 1280 container would have shifted every other section's left edge by 80px at 1440.
- **Hairlines** are full width (like the strip's) and sit between neighbouring sections; the sand band and the section after it have none.
- **Recently viewed:**
  - Read in `useState`'s initialiser, so it is in the first render rather than one effect later. The parsing function is unchanged.
  - Rendered only when the parsed value is a non-empty array.
  - Its heading is an `h2` set as an eyebrow, so the heading order stays h1 → h2.
- **Page fade removed:** `Home` no longer fades the whole page from opacity 0 (Prompt 10 flagged it for 11 and 30), so the hero (the LCP image) paints at full opacity. The other pages keep their own fades until Prompt 30.
- **"Why choose us" kept, as an interim.** The prompt leaves it to Prompt 12 ("turns this into the explainer"), so it stays, moved after Recently viewed (into Prompt 12's half) and restyled with tokens, so `Home.module.css` has no literals. Its copy is unchanged, and it carries unbacked claims (see Notes for Prompt 12).
- **Space tile names:** alt = the category name, as asked. Visually hidden commas separate it from the label and the line: Chromium reads "Office Chairs , Office , Task, executive and waiting chairs."

### Deviations from the prompt, and why

1. **Space label size:** 22px (`--sf-text-display-sm`) on phones and 28px from 768px. Phone tiles are ~157px wide, and "Restaurant" at 28px would nearly touch the edges.
2. **Phone tile scrim:** it fades over 40px rather than 64px, with 12px padding. On the small two-column tiles the full fade covered most of the photograph.
3. **The rail skeleton is the target card box** (4:5 image + three lines, the box Prompt 13's `ProductCardSkeleton` will have), not today's card (1:1 image, bordered body, full-width button). Normal loads measure CLS 0, because the rails are below the fold when their data arrives. But a visitor already looking at a rail while a slow API answers sees it grow when the cards replace the skeletons: 106px at 1440 and 179px at 360 (today's card body, with its full-width button, is much taller), CLS 0.07–0.10 with a 1.5s API delay. Prompt 13's card and a skeleton matched to it remove this.
4. **`HOME_SECTIONS`** and the copy keys inside `COMPLETE_THE_SPACE` go beyond the three constants the prompt names.
5. **The Featured "View all" uses `/products`** as specified. `?sort=newest` and `?sort=rating` are valid but unused here.

### Verification

- **Build and tests:**
  - `npm run build`: "Compiled successfully", no warnings. Gzip against the Prompt 10 baseline: JS 398.38 → 400.30 kB (+1.92: the orphaned `FeaturedProducts` and `ProductRail` are now in the bundle); CSS 55.04 → 54.11 kB (−0.93).
  - `CI=true npm test -- --passWithNoTests`: 159 tests (122 + 37 new), exit 0, no React warnings.
  - **Mutation check:** 12 seeded faults, each failed at least one test, and the files were restored byte for byte. The faults: add all opening the drawer per item; add all never opening it; broken tiles for missing categories; related always topping up; the section shown with one companion; sold-out pieces added; trending linking to `?sort=trending`; another recently-viewed key; previous never disabled; a fixed 300px scroll; smooth scrolling under reduced motion; the rail rendering while empty.
- **Static checks:**
  - `node scripts/check-contrast.js` passes (no new pairs: DESIGN_SYSTEM §21.7). `node scripts/validate-db.js` passes.
  - `db.json` is byte-identical: SHA-256 before and after. QA ran on a scratch copy through `JSON_SERVER_DB`.
  - Literal grep of the three CSS modules and three JS files: no hex, `rgb()`, `hsl()` or font-name literal. The scrim's alpha mask uses `transparent` / `black`, as the hero's does.
- **Browser QA:** Playwright and Chromium against JSON Server on the scratch copy, on the dev server and on a mock-mode production build. 43 scripted checks pass on both:
  - **Order and content:** the heading order; four tiles linking to the four slugs, each listing keeping its category (29 / 16 / 10 / 2 products); tiles, story images and the anchor all measure 4:5.
  - **Motion and focus:** tile hover `scale(1.03)`; the tile focus ring is the caramel `--sf-shadow-focus`.
  - **Links:** story CTAs; the View all targets.
  - **Rails:**
    - Both carousels are named groups of 8, and Previous starts disabled.
    - Next scrolls exactly one page, so the 5th card leads the view; at the end Next is disabled.
    - The progress line runs from 0–610 to 614–1224 of 1224px; Previous returns to the start.
    - Enter and Space work on the buttons, arrow keys scroll while a card has focus, and a focused off-screen card scrolls into view.
  - **Cards:** a featured card links to its slug; its quick add adds one line, and a companion's quick add merges into its existing line.
  - **Complete the space:** the anchor and the curated pair; the "View" link's name; the sand band; "3 pieces, ₹45,997.00". Add all put the chair (Black), the bench (Black) and the table (120 × 60 cm) in the cart, and the drawer opened exactly once (counted through the body scroll lock).
  - **Recently viewed:** after visiting the Wooden Sofa Set and the King Size Bed it lists them latest first; it is absent without history.
  - **Console:** no warnings or errors.
- **Click-through (re-check on the pushed head):** real mouse clicks at 1440 and 360px, on a fresh mock-mode production build, 34 checks passing:
  - each tile lands on its filtered listing (29 / 16 / 10 / 2 products);
  - the story CTAs land on `/products?category=home-furniture` and `/about`;
  - a featured card and a trending card open their product pages; the two View all links open `/products` (84 products) and the listing sorted by popularity;
  - the anchor's View link and its image open the anchor; a companion's quick add and "Add all to cart" fill the cart (the drawer open after "Add all");
  - recently viewed lists the pages just visited, latest first, and its card opens its product;
  - no console warnings or errors.
- **Tab walk:** from the hero's CTAs, Tab runs tiles → story CTA → Featured (View all, the cards, Previous, Next) → the anchor's View link → the companions → "Add all to cart" → story CTA → Trending → the footer. All 86 stops in the home sections were visible once the page's smooth scroll settled (inside the viewport and inside the rail's scroller) at 1440 and 360, and each had a focus style. Each rail costs 35 stops with today's card (4 per card).
- **Widths and themes:** 360, 768, 1024 and 1440px, light and dark: no horizontal overflow; tokens flip in dark mode (the placeholders stay light, as accepted).
- **Empty trending:** every `trending` flag turned off through JSON Server's API on the scratch copy hides the section, with nothing in the console. Restored, the scratch data parses equal to the repo's `db.json`.
- **CLS** (production build, `layout-shift` observer, load plus a slow scroll):
  - 0 at 1440 and 360, and 0 under reduced motion.
  - 0 while looking at Shop by space during a 1.5s API delay.
  - Rails viewed during that delay: deviation 3.
- **Laravel shape:** a non-mock production build against a stub answering `{ success, data, meta }` on the Laravel routes renders the same four tiles, 8 + 8 cards, the anchor, its pair and the total, with a clean console. Its requests were `/categories`, `/products/featured?limit=8`, `/products/trending?limit=8`, `/products/slug/ergonomic-high-back-chair-with-headrest` and `/products`.
- **Accessibility tree** (Chromium, CDP):
  - The regions are named by their `h2`s, in order.
  - The carousels are groups with the "carousel" role description and named buttons, Previous "disabled" (aria-disabled) at the start.
  - The anchor is a level-3 heading, with "View Ergonomic High-Back Chair with Headrest" and "Add all to cart".
  - Screen readers (NVDA, VoiceOver) were not available in this environment.
- **Admin parity:** 24 screenshots (login, dashboard, Products, Categories, Special Offers, Settings; 1440 and 390px; light and dark), comparing a mock-mode build of `HEAD` with this one.
  - 22 are byte-identical.
  - 2 differ by at most 1/255 on 24 and 4 pixels inside the remote product thumbnails. Two baseline runs differ from each other in the same places.
  - No admin file, and nothing the admin imports, changed.

### Pre-existing issues noticed (not changed)

- **Cart drawer** (`CartDrawer.js:213`): `hasDiscount = item.comparePrice && …` is `0` when a line has no compare price, so React prints a stray "0" beside the price. This is visible after "Add all". Prompt 18.
- **`ProductCard` in the rails:** the 1:1 image, bordered body and full-width button; its body also moves a few pixels as fonts and images settle. Prompt 13.
- **Production builds:** `npm run build` reads `.env.production`, which points at the placeholder Cloudways API. A mock-mode production build therefore needs `REACT_APP_USE_MOCK_API=true REACT_APP_API_URL=http://localhost:3001` on the command line. A first QA run here hit the placeholder API by mistake, and every home section hid itself rather than showing broken content.
- **Duplicate reads:** the header and the footer each read categories (as Prompt 10 noted). "Complete the space" adds one full-catalogue read (`products.getAll`, inside `getFrequentlyBoughtTogether`), plus a second only when the fallback reaches `getRelated`. Prompt 32.

### Notes for later prompts

- **12:**
  - **Remove the interim `WhyChooseUs`:** the component, its `.why*` rules, the `@iconify/react` import and the `WHY_CHOOSE_US` / `APP_NAME` imports in `Home.js`.
  - **`WHY_CHOOSE_US` claims to correct:** "Same-day and express delivery" (Same Day is inactive in `shipping_methods`), "256-bit SSL encryption", "full refund guarantee" and "24/7 Support". `AboutUs.js` also renders it until Prompt 28.
  - **Section rhythm:** add `styles.section` to your sections to get the hairline between neighbours.
  - **Sand conflict:** your brief puts the review carousel on sand, but the page's one sand band (DESIGN_SYSTEM §13) is Complete the space. Either keep the reviews on paper between hairlines, or move the band and note it.
- **13:**
  - `ProductRail` renders its own skeleton (`.skeletonText` + `sf-skeleton--image`). When `ProductCardSkeleton` exists, swap it into `ProductRail`'s loading branch, and give its text block the height of the new card's body, so a rail does not grow when its cards arrive (deviation 3: 106px at 1440, 179px at 360 today).
  - On the sand band, borderless cards with sand image slots will merge into the band; give their media a visible edge there.
  - Today's card has four tab stops (image link, heart, name link, Add to Cart), so each 8-card rail costs a keyboard user 35 stops. Your brief's structure (one link for image and name, then the two buttons) brings that down to 27.
- **17:** `RelatedProducts` can become `SectionHeading` + `<ProductRail products={items} label="Related pieces" {...handlers} />`, keeping its null-when-empty rule.
- **30 (motion):**
  - Tile and anchor images scale 1.03 over `--sf-duration-slow` on hover (pointer only, not under reduced motion).
  - `Reveal` is on the tiles (staggered), both story halves (text +90ms) and each rail section.
  - Rail buttons scroll smoothly, instantly under reduced motion.
  - The home page has no page-level fade.
- **31:** the rails' 8px focus room and edge bleed; the tile names (alt + label + line); the number of tab stops per rail (see 13). `ProductRail` is not tested with NVDA or VoiceOver yet. When measuring focus visibility, let the smooth page scroll (`html { scroll-behavior: smooth }`) settle first.
- **32:**
  - Home's reads: three in parallel, then `getBySlug` and one full catalogue read (two with the fallback).
  - Candidates: a shared catalogue cache, or starting the curation through `Reveal`'s `onInView`.
  - Story and tile images are lazy and have reserved boxes.

### Needs client confirmation

- **Spaces:** the mapping (Home → Home Furniture, Office → Office Chairs, Café & Restaurant → Café & Restaurant Chairs, Outdoor → Outdoor Furniture) and the four lines. An "Office" tile could instead go to Office Tables & Desks, or there could be a fifth tile.
- **Story copy:** both blocks, including "Some of our pieces are made in our own workshop; the rest come from makers we know well". Also the CTAs "Shop home furniture" and "Read our story".
- **Photography:** a living-room photograph and a workshop photograph (4:5, 1200 × 1500 or larger), and portrait-friendly category photos for the tiles. The tiles crop each category image to 4:5, and their bottom ~35% sits under the scrim.
- **Complete the space:**
  - The anchor (Ergonomic High-Back Chair with Headrest) and its curated pair (Cushioned 3-Seater Waiting Bench, Winsome Office Table).
  - The copy: "Pieces that belong *together*.", "One piece we like, and the pieces we would set beside it.", "Pairs well with".
  - If the client prefers a bedroom set, the bed's mattress needs a size-free pairing (see Decisions).
- **Trending:** "What people are *choosing*." describes the admin-curated `trending` flag. If that flag does not reflect real popularity, a neutral title such as "Pieces to *look at*" may be safer.
- **Headings:** "Furniture for every *room*.", "Pieces we *recommend*.", and the carousel names "Featured pieces" / "Trending pieces" / "Recently viewed pieces".

---

## Prompt 12 — Home social proof, explainer and closing CTA

**Date:** 2026-10-08. **Result:** the home page now closes with honest social proof and a clear ending. After Recently viewed come a "Brands we carry" strip built from the catalogue's own `brand` values, an "As featured in" slot that stays empty (there is no data source for it), a carousel of approved customer reviews of the featured pieces, a three-step "Our promise" explainer whose numbers come only from the shipping methods, the store settings and the returns policy, a slow ribbon of brand phrases, and a navy closing CTA directly above the footer's newsletter band. The interim "Why choose us" grid and its unbacked claims are gone. Reference: `prompts/DESIGN_SYSTEM.md` §22.

### What changed

| File | Change |
|---|---|
| `src/pages/Home/Home.js` | Sections 8–13 (brands strip, press slot, `CustomerReviews`, `PromiseSteps`, marquee, closing CTA) and their three lazy reads. Removed: the interim `WhyChooseUs` component and the `@iconify/react`, `APP_NAME` and `WHY_CHOOSE_US` imports. Prompt 10/11 sections untouched. |
| `src/pages/Home/Home.module.css` | The `.why*` rules removed; the promise-step rules and `section.closing` added. Tokens only. |
| New `src/pages/Home/homeData.js` | The data rules: `collectBrands`, `selectReviews`, `loadFeaturedReviews`, `formatDeliveryDays`, `promiseValues`, `resolvePromiseBody`, `promiseBodyLayout`, `loadPromiseData`. |
| New `src/hooks/useNearViewport.js` | The lazy-read trigger (callback ref + `near`), IntersectionObserver with a one-viewport `rootMargin`. |
| New `src/components/storefront/BrandStrip.js` + `.module.css` | `BrandStrip` and the shared `WordmarkStrip` row. |
| New `src/components/storefront/PressStrip.js` | The "As featured in" slot: `null` unless handed named items. |
| New `src/components/storefront/ReviewCarousel.js` + `.module.css` | The review carousel (also exports `clampQuote`, `QUOTE_MAX_LENGTH`). |
| New `src/components/ui/Marquee.js` + `.module.css` | The decorative phrase ribbon. |
| `src/components/CTASection/CTASection.js` + `.module.css` | Revived (it was an orphan pink-gradient "Discover Amazing Deals" banner with 8 colour literals): props `eyebrow`, `title` (`*accent*`), `line`, `primary`, `secondary`, `tone="paper"|"sand"|"navy"`, `as`, `headingId`, `className`. Tokens only. |
| `src/components/storefront/index.js`, `src/components/ui/index.js` | Export `ReviewCarousel`, `BrandStrip`, `PressStrip`; `Marquee`. |
| `src/content/homeContent.js` | `HOME_SECTIONS.brands/reviews/press/promise`, `PROMISE_STEPS`, `MARQUEE_PHRASES`, `CLOSING_CTA` (copy below). |
| `scripts/check-contrast.js` | Three review-slide pairs and two informational rows (DESIGN_SYSTEM §22.9). |
| New tests | `homeData.test.js` (35), `BrandStrip.test.js` (10, incl. `PressStrip`), `ReviewCarousel.test.js` (13), `Marquee.test.js` (8), `CTASection.test.js` (9). `Home.test.js` 20 → 36: new API mocks, a controllable IntersectionObserver, the heading order without the interim grid, and 16 closing-half tests. |
| `prompts/DESIGN_SYSTEM.md` | New §22; §16.4 (barrel) and §21.1 (rhythm) point to it. |

No change to `SocialProof.js` (read only), `Footer`, `Newsletter`, `ProductCard`, Prompt 10/11 sections, `api.js`, `db.json` (SHA-256 identical) or any admin file. API functions used: `products.getAll`, `products.getReviews`, `shipping.getMethods`, `settings.get` (plus the page's existing reads).

### Content added to `homeContent.js` (all proposed copy)

- **Headings:** brands eyebrow "Brands we carry"; reviews "From our customers" / "Comfort, *in their words*." (carousel name "Customer reviews"); press "As featured in" (not shown); promise "Our promise" / "How it *works*.".
- **`PROMISE_STEPS`** (images 1200 × 1500 placeholders in the neutral tones):
  1. `payment`: "Order" / "Pay the way that suits you" / "Check out securely online with cards, UPI or net banking." + (COD on) "Or choose cash on delivery and pay when your furniture arrives."
  2. `delivery`: "Delivery" / "Brought to your door" / "Standard delivery brings your order to your door in {days} business days." + "Orders {threshold} ship free."; fallback "We bring your order to your door."
  3. `returns`: "After delivery" / "Time to settle in" / "Eligible pieces can be returned within {returns} days of delivery." + "If anything is not right, talk to us."
  With the seeded data: "…in 7–10 business days. Orders above ₹9,999 ship free." and "…within 7 days of delivery." ("within 7 days of delivery" is the refund policy page's own wording.)
- **`MARQUEE_PHRASES`:** "Made for living", "Chosen with care", "Comfort that lasts", "For every room", "At home, at work, outdoors".
- **`CLOSING_CTA`:** "When you're ready" / "Find the piece that *fits*." / "Browse the full collection, or talk to us about the space you are furnishing." / "Shop the collection" → `/products`, "Talk to us" → `/support`.

### Data rules

- **Brands we carry:** one `products.getAll()` read, `collectBrands`: distinct non-empty `brand` values of the active products (case, spacing and punctuation ignored, so "A&S Urbanseat" and "A & S Urbanseat" are one), alphabetical, the store's own brand (`APP_NAME`) last and styled the same. Seeded: Carlton · Nilkamal · Winsome · A & S Urbanseat. Text only; no logos, no "trusted by". A failed read hides the strip.
- **Review-sourcing rule:** `products.getReviews(id)` for the featured products already loaded (the page's `getFeatured(8)`: at most 8 distinct active products, in parallel, each `.catch(() => [])`), flattened; approved only (the endpoint's filter, and any review carrying another `status` is dropped again); at least 40 characters of text; reviews naming another product or repeating an id skipped; newest first by `createdAt`; at most 10; each carries its product's `{ id, name, slug }` for the link. Seeded result: 7 reviews from 5 featured products (none verified, so "Verified purchase" does not show on the home page with today's data; tests cover it). **Zero reviews (or every read failing) hides the whole section**, as the prompt suggested: an empty review block adds nothing. The component keeps its honest empty state ("No customer reviews yet.", muted eyebrow) for other pages.
- **Our promise:** live values only, per step (`dataKey`): COD sentence only while `settings.payment.codEnabled` (`resolveTrustBadgeDetail("cod")`); `{days}` from the active method named "Standard…" (`estimatedDays` "7-10" → "7–10"; empty, "0" or text gives nothing); `{threshold}` is `resolveTrustBadgeDetail("freeShipping")` in sentence case ("above ₹9,999", the strip's, footer's and product page's amount); `{returns}` is `STOREFRONT_CONFIG.returnsWindowDays` only when it is > 0. A sentence whose value is missing is left out (never a guess); a step with nothing backed shows its plain `fallback`.

### The hidden press slot

`PressStrip` renders nothing unless it is handed at least one item with a name. `Home.js` hands it `[]`, with a comment pointing to `00_INDEX.md` §5 item 7: there is no press or client collection or settings field in `db.json`, and the schema must not be extended. No names are hardcoded anywhere. Checked with a temporary, uncommitted build passing two dummy names: the row renders under the brands strip, sharing its rule.

### Lazy reads

Each closing-half read starts when its own section comes within one viewport height (`useNearViewport`): the catalogue for the brands, the reviews (after the featured list has resolved), and settings + shipping methods for the promise. None of them is in the initial network (verified: 0 review reads and only Complete the space's catalogue read at load; then 1 catalogue read, 8 approved-review reads, settings and shipping on approach). While pending, each section holds its final height: the brands strip reserves the names' lines (two on phones), the reviews section shows skeleton slides tuned per width, each promise body is laid out invisibly (fillers for the values, `aria-hidden`) under two skeleton lines.

### Marquee decision

Included, between the promise steps and the closing CTA, as the brief's order puts it: a 48px hairline ribbon in eyebrow type, phrases only (no claims, numbers or offers), one pass through the phrases every 60s at any width. It pauses on hover (pointer devices) and while its control has focus, and it has a Pause/Play control, because WCAG 2.2.2 asks for a way to pause moving content that runs longer than five seconds (hover and focus alone leave touch users without one). Under reduced motion there is no track and no control; the phrases show as a still, centred list. The track is `aria-hidden`; screen readers get the phrases once, as a plain list.

### `WHY_CHOOSE_US` status

Removed from Home (component, `.why*` rules, imports). **Kept in `src/utils/constants.js`:** `src/pages/AboutUs/AboutUs.js` still imports and renders it (grep: lines 6 and 47). Prompt 28 should delete it when About stops using it; its claims ("Same-day and express delivery", "256-bit SSL encryption", "full refund guarantee", "24/7 Support") are not backed by the data.

### Decisions

- **Page order:** brands → (press) → reviews → promise → marquee → CTA, as in the brief's design list. The brands strip is a slim pause after Recently viewed.
- **Strip hairlines:** the strips draw their own top and bottom rules and are not page `.section`s, so no rule doubles; two strips in a row share one (`.strip + .strip`).
- **Closing CTA as a contained navy panel** (inside `.sf-container--wide`, radius sm), with `--sf-section-y` of paper above it and no bottom padding (`section.closing`; the element in the selector outweighs CTASection's own padding whatever the stylesheet order). The marquee's bottom rule then never sits on the navy edge, and the navy panel and the navy footer are separated by `.main-content`'s 80px (70px up to 768px). A full-bleed band would have left a paper stripe between two navy blocks. Navy uses the always-dark tokens, so it is identical in dark mode (on the navy-ink page it reads as a slightly lighter panel).
- **Promise step order** is chronological (Order → Delivery → After delivery), and the bodies are sentence lists, so a missing value drops one sentence instead of the whole body.
- **Review slides** quote the review `body` only (no `title`), show the date with the shared `formatDate(…, "short")` ("Sep 25, 2026"; en-US until Prompt 29), and use the product page's success tone for "Verified purchase".
- **Dots** mark every slide in view (`aria-current="true"` on each), so clicking the last dot shows slides 5–7 lit rather than lighting an unexpected dot.
- **The hidden marquee list keeps the phrases' casing** (`text-transform: none`): Chromium passes `text-transform` on to the accessibility tree (it exposed "MADE FOR LIVING"); visible eyebrows keep the site convention.

### Deviations from the prompt, and why

1. **The reviews section is paper, not a sand section.** DESIGN_SYSTEM §13 and Prompt 11's brief allow one sand section per page, and it is Complete the space (a Prompt 11 section this prompt must not touch). The sand moved onto the slides: each review is a sand panel on the paper section, with its stars in ink as §4 asks on sand (the gold star measures 2.91 : 1 there).
2. **The brands' catalogue read is lazy too**, not added to the initial `Promise.all`: it is the heaviest read on the page, and implementation note 2's reason (keep the initial network light) applies to it as much as to the reviews. It still runs once, cached in state, with `.catch(() => [])`.
3. **The marquee has a Pause/Play control** in addition to pausing on hover and focus (WCAG 2.2.2; see "Marquee decision").
4. **Dots are 24px-wide, 44px-tall targets**, not 44 × 44: ten 44px dots plus the two buttons do not fit a 328px row. 24px wide meets WCAG 2.5.8 (24 × 24), the exception documented like the 32px chips (§16.8).
5. **`{threshold}` reads "above ₹9,999"** (the resolver's string in sentence case) rather than a bare amount, so every surface prints the same amount from the same function.
6. **The step image lift** (−4px) is kept as briefed, although §8 rules out lifts on cards: it moves the image, not the step, under `(hover: hover)` and only without reduced motion. The steps carry no links, so it is a hover cue (it also answers `:focus-within` should a link ever be added).
7. **Additions:** `useNearViewport`, `homeData.js`, `WordmarkStrip`, `promiseBodyLayout`, the step `fallback` and `requires` keys, `HOME_SECTIONS` keys for the new headings, forced-colours rules (dots, CTA panel edge), and the component barrel exports.

### Verification

- `npm run build`: "Compiled successfully", no warnings. Gzip against the Prompt 11 baseline: JS 400.30 → 406.25 kB (+5.95), CSS 54.11 → 56.40 kB (+2.29).
- `CI=true npm test -- --passWithNoTests`: 250 tests (159 + 91), exit 0, no React warnings.
- **Mutation check:** 18 seeded faults, each caught by at least one test (files restored byte for byte), and a no-op control that survived: short reviews kept; unapproved reviews kept; own brand not last; oldest reviews first; more than eight review reads; COD always mentioned; threshold guessed; "0" days accepted; empty reviews shown; reviews read eagerly; catalogue read eagerly; press names hardcoded; verified on a truthy non-`true`; next never disabled; dots ignoring the scroll; marquee track exposed to assistive technology; ink button on navy; empty brands strip rendered.
- `node scripts/check-contrast.js` passes (3 new pairs, 2 info rows); `node scripts/validate-db.js` passes; `db.json` SHA-256 unchanged.
- Literal grep of every touched source: no hex, `rgb()`, `hsl()`, gradient or font-name literal (the only gradient in `Home.module.css` is Prompt 11's scrim mask; the placeholder URLs use the two permitted tones).
- **Browser QA** (Playwright + Chromium; JSON Server on a scratch copy of `db.json`; mock-mode production builds): 109 scripted checks pass, covering 360/768/1024/1440px in both modes: no horizontal overflow; the four brand names; 1/2/3 review slides in view of 7; promise steps stacked / three columns; 4:5 step images; the navy panel (`rgb(11, 31, 63)` in both modes) ≥ 420px from 1024px; the CTA last, 80/70px above the footer; marquee 48px; brands strip 56px from 768px; no console errors; the network laziness above; a keyboard walk through the closing half (19 stops: 7 product links, 7 dots, previous, next, the marquee control, the two CTA links; every stop shows its ring and scrolls into view; buttons 44px; dots 24 × 44); the CDP accessibility tree (carousel group with its role description, 7 slide groups "Review N of 7", 7 dot buttons, previous disabled at the start, the brands region, no press region, the marquee list exposed once in its own casing, the closing region, the promise list of 3); reduced motion (still marquee list, no control, no step lift); hover (step image `translateY(-4px)`).
- **Carousel and marquee interactions:** next → slides 4–6, next → 5–7 (next disabled), dot 2 → 2–4, previous → 1–3 (previous disabled), Enter on dot 7 → 5–7; the marquee runs (120s at 1440px: two copies per half), pauses on hover and while its control is focused (transform frozen), and the control pauses it until pressed again.
- **Data follows the admin and settings** (scratch copy, restored afterwards): approving the pending "Bought four for the balcony" review and un-approving "Good set for our hotel lobby" in Admin → Reviews swaps them in the carousel after a reload; `codEnabled: false` removes the cash-on-delivery sentence (and restoring brings it back); `freeAbove: null` on Standard drops only the threshold sentence and keeps "7–10 business days".
- **Laravel shape:** a non-mock production build against a stub answering `{ success, data, meta }` on `/products`, `/products/{id}/reviews`, `/settings`, `/shipping/methods` (and the page's other routes) shows the same brands, 7 slides, promise copy and CTA, with a clean console.
- **Layout shift:** 0 while scrolling the whole page at 360 and 1440px and under reduced motion. Pending vs loaded heights: brands strip and promise steps identical at 360/768/1024/1440px; reviews within 4–31px. With every API call delayed 1.5s and a fast scroll, 0.007–0.015 in some runs, all from the rail cards above growing as their images load (pre-existing, below).
- **Admin parity:** 28 screenshots (login, dashboard, Products, Reviews, Settings, Special Offers, Shipping; 1440 and 390px; light and dark) of the Prompt 11 build (two runs) and this one: all 28 identical to at least one baseline run (the two baseline runs differ from each other on 7, from load timing). No admin file, and nothing the admin imports, changed.
- Screen readers (NVDA, VoiceOver) were not available in this environment.

### Pre-existing issues noticed (not changed)

- **Rail cards grow as their images load.** Featured, Complete the space and Trending each grow 33–39px when their `ProductCard` images arrive (measured identically on the Prompt 11 build). With a slow API and a fast scroll this now shows as a small shift of the closing half, which follows Trending (CLS 0.007–0.015 at a 1.5s delay). Prompt 13's card with a reserved image box removes it.
- **Duplicate reads:** settings and shipping methods are read by the assurance strip, the footer and now (lazily) the promise steps; the full catalogue by Complete the space and (lazily) the brands strip. Prompt 32.
- **Uppercase accessible names:** Chromium passes `text-transform: uppercase` into the accessibility tree, so every `.sf-eyebrow` (and the header's department row) is exposed in capitals. Prompt 31 may decide whether that matters for the eyebrow convention.
- `formatDate` stays en-US ("Sep 25, 2026") because the admin shares it (Prompt 29 may add `formatDateIN`).

### Notes for later prompts

- **13:** the review carousel does not use `ProductCard`; reserving the card's 4:5 image box also removes the rail growth above.
- **17:** `SocialProof` and `ReviewsSection` are untouched. `clampQuote` (ReviewCarousel) and the success-tone verified mark can be shared; the product page keeps showing the review titles the home slides leave out.
- **28:** delete `WHY_CHOOSE_US` once About stops rendering it. The CTA's "Talk to us" goes to `/support`; the returns step says "within 7 days of delivery", as `/refund` does today.
- **29:** all new section copy is in `homeContent.js`; the component microcopy defaults are in `ReviewCarousel` (previous/next, "Review N of M", "Verified purchase", empty and error lines), `Marquee` (pause/play) and `PressStrip`'s consumer label.
- **30:** marquee one pass per 60s, linear, paused on hover/focus/control, none under reduced motion; step image lift 4px over `--sf-duration-slow`; `Reveal` per step 90ms apart and on the reviews container.
- **31:** the dots' 24px width (WCAG 2.5.8) and `aria-current` on each slide in view; the marquee control; the closing half adds 19 tab stops with today's 7 reviews.
- **32:** the closing half reads lazily (§22.2); candidates are a shared catalogue cache and shared settings/shipping reads.

### Needs client confirmation

- **Promise copy:** the three eyebrows, titles and sentences above (including "business days", "cards, UPI or net banking" and the unqualified cash-on-delivery line, which does not mention the ₹50,000 COD cap, as the strip does not).
- **Closing CTA copy:** "When you're ready" / "Find the piece that *fits*." / "Browse the full collection, or talk to us about the space you are furnishing." / "Shop the collection", "Talk to us".
- **Reviews copy:** "From our customers" / "Comfort, *in their words*."
- **Marquee:** whether to keep it, and the five phrases.
- **Brand names shown:** Carlton, Nilkamal and Winsome appear on the home page as brands carried (as in the catalogue data); confirm they may be named.
- **Press / client logos:** whether any exist, and where their names, logos and permissions would come from (they need a data source before the slot can show anything).
- **Photography:** three 4:5 photographs (1200 × 1500 or larger) for the promise steps: ordering, delivery, a furnished room.

---

## Prompt 13 — Product card

**Date:** 2026-10-08. **Result:** the storefront's one product card is now image-forward and quiet. It shows a 4:5 photograph with no border, shadow or fill at rest, a brand eyebrow, the name in the display serif, the rating row only when there are real reviews, and a quiet sans price. It has data-only chips and a 36px wishlist disc. On pointer devices a hover scales the photograph, crossfades to the second one, draws a hairline and slides up an "Add to cart" bar; touch devices get a persistent "+" disc. Props, the `buildCartItem` payload, slug links and the honesty rules are unchanged, and every consumer renders the new card without changes. `PriceBlock` and `StarRating` were redesigned with it, and `ProductCardSkeleton` is exported for pages to show while loading. Reference: `prompts/DESIGN_SYSTEM.md` §23.

### What changed

| File | Change |
|---|---|
| `src/components/storefront/ProductCard.js` + `.module.css` | Rewritten (DESIGN_SYSTEM §23.1). One `article` (`aria-labelledby` the name) holds one `Link` around the image frame, brand and name, plus a sibling overlay with the chips, the heart and the quick add. The second photograph, the "Added" state and the skeleton are new. Tokens only. |
| `src/components/storefront/PriceBlock.js` + `.module.css` | Same props and defaults. Quiet sans figures (sm 15/13px, md 18/15px, lg 24/16px), a visually hidden "Was" before the struck price. The saving is opt-in as before (`showSavings`, default on lg) and now reads "Save 12%" (sm/md) or "Save ₹400.00" (lg); the inline "12% off" is gone. |
| `src/components/storefront/StarRating.js` + `.module.css` | Same props and label. Inline SVG stars instead of the font's "★", each filled by its exact share of the rating; forced-colours rule. |
| `src/components/storefront/index.js` | Also exports `ProductCardSkeleton`. |
| `src/components/storefront/ProductRail.js` + `.module.css` | Follow-up requested after the PR went up: the loading branch renders `ProductCardSkeleton` in each `aria-hidden` list item, and the rail's own `.skeletonText` rule is gone (see "Follow-up" below). Nothing else in the rail changed. |
| `scripts/check-contrast.js` | 11 card pairs and 3 informational rows; a `"--token@alpha"` layer syntax; the `PAIRS_DARK_ONLY` list its header already mentioned. |
| New tests | `ProductCard.test.js` (22), `PriceBlock.test.js` (5), `StarRating.test.js` (5). |
| Updated tests | `Home.test.js`, `FeaturedProducts.test.js`, `ProductRail.test.js`: the new labels ("Save to wishlist", "Add <name> to cart"), and one link per card instead of two. `ProductRail.test.js` also checks that each loading slot is `ProductCardSkeleton`. |
| `prompts/DESIGN_SYSTEM.md` | New §23; §21.6 (the rail's loading state). |

Nothing else changed. In particular the pages and components that render the card (`Home`, `FeaturedProducts`, `RelatedProducts`, `ProductDetails`), `helpers.js`, contexts, `api.js`, `db.json` (SHA-256 unchanged) and the admin are untouched; `ProductRail` changed only in its loading branch. `Products`, `SpecialOffers`, `Wishlist` and `SearchModal` still render their own private cards until Prompts 14, 19, 25 and 15 adopt this one.

### The card

- **Layout:** the 4:5 frame (sand while loading); 12px below it the brand eyebrow (omitted when empty), the name (two lines at most, CSS clamp), the rating row (`totalReviews > 0` only) and `PriceBlock size="sm" showSavings={false}`. The `img` has alt = name, `width="1200" height="1500"`, `loading="lazy"`, `decoding="async"` and `onImageError`.
- **Chips** come from data alone: "Sold out" (`stock === 0`), "Sale" (`getProductMinPrice().discount > 0`, i.e. a real compare-at price; it replaces "12% OFF"), "New" (`hot`). They show in that priority, two at most, stacked top-left. Each is a 10px `.sf-badge` in brand paper on brand ink in both modes.
- **Wishlist:** a 36px hairline disc top-right with a 44px target, `aria-pressed`, "Save to wishlist" / "Remove from wishlist", and a caramel fill when saved.
- **Quick add:** `buildCartItem(product)` exactly as before. It reads "Added" for 1.2s (the disc shows a check). The cart toast and drawer still come from the page's handler and `CartContext`; the card adds no toast and no live region, and its accessible name stays "Add <name> to cart". A sold-out card disables it with "Sold out".
- **Focus:** link, heart and quick add each show a ring (§23.1). Tab order per card: link, heart, quick add.

### `ProductCardSkeleton`

`import { ProductCardSkeleton } from "../../components/storefront";` renders `<ProductCardSkeleton className? />`. It is `aria-hidden` and draws the 4:5 image block plus three bars (brand, name, price) in the line boxes of a card with a brand and a two-line name. Measured in Chromium, its height equals that card's at 360, 768, 1024 and 1440px (272.41px at 360). A card with a rating row is 20px taller.

### Hover and touch behaviour decisions

- **The touch layout is the base CSS;** `(hover: hover)` upgrades it to the bar. A browser without the hover media feature keeps a working "+" button rather than a bar that never appears.
- **One button, two presentations.** The quick add is a single `<button>` restyled by the media query. That keeps three tab stops per card (an eight-card rail drops from 35 stops to 27 including View all, previous and next) and one `aria-label` ("Add <name> to cart", as briefed for touch) in both modes.
- **The bar is revealed by a custom property** (`--qa`): on card hover, and on keyboard focus inside the card, so keyboard users always see the control they are on. Under `@supports selector(:has(:focus-visible))`, focus left behind by a mouse click (on the heart or the bar) no longer keeps the bar up once the pointer leaves. Without `:has`, `:focus-within` still applies.
- **The second photograph is mounted on the first mouse or pen hover,** not on render: "preload nothing" taken literally. No extra image request happens on touch devices or for cards never hovered. Once mounted it is a lazy `img` (`aria-hidden`, empty alt) that fades in only after its `onLoad`; a failed load removes it.
- **Hover effects live under `(hover: hover)`,** so a tap never leaves a sticky hover. The scale is also under `(prefers-reduced-motion: no-preference)`. Under reduced motion the bar appears by opacity instead of sliding.

### Decisions

- **The brand sits inside the link,** between the image and the name, so the DOM order matches the visual stack. The link is named by the name only (`aria-labelledby`) and described by the brand (`aria-describedby`), so it is never announced as "Name Brand Name". The article is named by the name.
- **Controls over photography use the page tone** (paper, or navy-ink in dark mode) with text-tone glyphs, so the caramel heart and focus ring contrast with their own fill in both modes. Chips are a fixed ink-and-paper pairing, the hero's rule for labels on photography (a light chip would vanish on a light photograph in dark mode).
- **The bar's hover inverts it** to the primary pairing (ink with paper text; off-white with navy-ink in dark mode): a colour-only hover, like `.sf-btn--primary`.
- **`PriceBlock` sizes:** sm is the briefed 15px; lg follows Prompt 16's brief ("sans 24px medium; compare struck muted; 'Save ₹X' in accent-text; tax note muted 12px"), so Prompt 16 can use it as is. The product page therefore already shows its price at 24px/500 with "Save ₹400.00" instead of 36px/600 with "12% off" and "You save ₹400.00". Home's "Complete the space" anchor (md) is 18px.
- **`StarRating` fills each star by its exact share.** The old version drew any fraction as a half star, so 4.1 and 4.9 both looked like 4.5. `SocialProof`, `ReviewsSection` and the home review slides now show SVG stars with exact fills; their sizes and colours are unchanged.

### Deviations from the prompt, and why

1. **The fills over the photograph are 93%, not 90% (heart) / 92% (bar).** At 90%, the saved (caramel) heart measures 2.85 : 1 on its fill over a black photograph; at 92%, the bar's caramel focus ring measures 2.99 : 1. 93% is the least that keeps both at 3 : 1 over any photograph in both modes (`check-contrast.js`, §23.5). This follows the design system's own precedent of tuning the hero scrim to its worst case. The difference is not visible.
2. **The discs' focus ring is the caramel ring inside a 2px page-tone ring,** not `--sf-shadow-focus`. In dark mode the caramel ring measures 1.96 : 1 over a white photograph; the navy-ink outer ring measures 18.41 : 1 there, and in light mode the caramel ring carries it (3.81 : 1). The link keeps `--sf-shadow-focus` (it sits on the page). The bar uses a 2px inset caramel outline, because its fill covers an inset box-shadow.
3. **The card's stars are ink, not the gold `--sf-color-star`.** A card can sit on sand (home "Complete the space"), where gold measures 2.91 : 1 (§4: "On sand, show stars in ink"). The card cannot know its background, and ink passes everywhere (16.25 on paper, 14.64 on sand). The card sets `--sf-color-star` on its rating row only; the product page keeps gold.
4. **An always-on page-tone keyline (1px, inset) over the image edge.** On Home's sand band the borderless sand placeholders dissolved into the band, leaving floating chips and hearts (screenshot-confirmed). The brief forbids touching the pages and asks that consumers render without changes, so the fix lives in the card: the line is the page colour, invisible on the page and visible on any other tone (1.11 : 1 on sand, enough to read as an edge with the placeholders). Prompt 11's handoff note asked for exactly this ("give their media a visible edge there").
5. **The brand eyebrow is inside the card link** (the brief says the link wraps "only the image and name"), because it sits between them in the vertical stack. It is the link's description, not part of its name; the buttons stay outside.
6. **"Added" is visual only.** The accessible name stays "Add <name> to cart": the cart toast already announces the add, and a name change on a focused button would announce it twice.
7. **`ProductRail` now renders `ProductCardSkeleton` while loading,** although the rail is outside this prompt's file list. The PR first left it alone; the repository owner then asked for it. The rail's own skeleton had a 72px text block against the card's 104.25px body, so a rail grew when its cards replaced the skeletons (measurements under "Follow-up").
8. **Tests and the contrast script** changed beyond the four listed files: three test files for the renamed labels, and `check-contrast.js` (DESIGN_SYSTEM §15 requires new pairs there).

### Verification

- **Build:** `npm run build` prints "Compiled successfully" with no warnings. Gzip against the Prompt 12 head built here: JS 411.31 → 412.34 kB (+1.02), CSS 56.40 → 57.28 kB (+0.88). The minified CSS keeps the `(hover: hover)`, reduced-motion and `@supports selector(:has())` rules intact (checked in the built file).
- **Tests:** `CI=true npm test -- --passWithNoTests` runs 282 tests in 26 suites (250 + 32 new), exit 0, with no React warnings.
- **Mutation check:** 19 seeded faults, each caught by the new tests; files restored byte for byte. The faults: chip priority; the two-chip cap; the rating honesty gate; the wishlist label; `aria-pressed`; a second photograph on touch; the 1.2s "Added"; sold-out not disabling; a different cart payload; Sale from any compare price; JS truncation at 48; the brand description; the link's name; savings on by default below lg; the "Was" label; lg stating the share; "Save 0%"; half-star rounding; no clamp.
- **Static checks:** `node scripts/check-contrast.js` passes (11 new pairs, 3 info rows); `db.json` SHA-256 unchanged (QA ran on a scratch copy through `JSON_SERVER_DB`). A literal grep of the six component files finds no hex, `rgb()`, `hsl()`, gradient or font-name literal.
- **Browser QA, dev server** (Playwright + Chromium, JSON Server on the scratch copy): 40 scripted checks pass. They cover:
  - the featured rail's 8 cards: 4:5 frames, names of at most two lines, the image attributes, one link per card, no border or shadow, rating rows matching `totalReviews`;
  - hover: scale `matrix(1.03…)`, hairline, bar up, the second photograph lazy, hidden and faded in after load; none mounted before a hover;
  - quick add: "Added", then back after 1.2s; the drawer opened by the page; line `11-v1`; a product-page add of the same variant merging into one line with quantity 2;
  - the heart: `aria-pressed` false → true, caramel fill; after a click and the pointer leaving, the bar goes down;
  - keyboard: link → heart → quick add, a ring at every stop, the bar up while focus is inside;
  - touch at 360: the 44px "+" disc at the image's bottom-right, a 36px heart with a 44px target, the check after a tap, no second photograph;
  - reduced motion: the bar by opacity only, no scale;
  - "Sold out", "Sale" and "New" from data, checked by setting stock to 0 on the scratch copy: sold out + sale + new shows "Sold out, Sale"; the image at 60%; a disabled "Sold out" button;
  - chips matching the data on 10 related cards;
  - a clean console.
- **Production build** (mock mode, 17 checks):
  - **CLS** with every placeholder image held back 1.5s while scrolling the home page: 0.0895 → 0 at 1440px and 0.1169 → 0 at 360px against the Prompt 12 build. The reserved 4:5 box removes the rail growth Prompts 11 and 12 recorded.
  - **Widths** 360, 768, 1024 and 1440px on `/` (18 cards) and a product page (10): no horizontal overflow; every frame 4:5; every name at most two lines; chips clear of the heart.
  - **Keyboard:** 26 stops through the featured rail after View all (8 × 3 + previous + next), each scrolled into view.
  - **Other pages:** `/products`, `/special-offers`, `/wishlist`, a category listing and the search overlay render with clean consoles.
- **Signed in** (`user@example.com`): the heart adds and removes a wishlist row through the API. A quick add plus a product-page add of the same variant shows one drawer line, "Cushioned Plastic Armchair · Marble Beige", ×2 (₹4,998.00) with the "Cart Updated" toast (screenshot).
- **Other surfaces of `PriceBlock` and `StarRating`,** checked by screenshot in both modes: the product page's price ("₹2,499.00 ~~₹2,899.00~~ Save ₹400.00" and the tax note), `SocialProof` and the reviews summary with SVG stars, Home's review slides (ink stars on sand), and the "Complete the space" anchor price.
- **Accessibility tree** (Playwright aria snapshot / CDP): `article "Covered Plastic Shoe Rack"` › `link "Covered Plastic Shoe Rack"` (description "NILKAMAL") with `img "Covered Plastic Shoe Rack"` inside, then `text "Sale"`, `button "Save to wishlist"`, `button "Add Covered Plastic Shoe Rack to cart"`, `img "Rated 4.0 out of 5, 1 review"` and `text "₹1,899.00 Was ₹2,199.00"`. Screen readers (NVDA, VoiceOver) were not available in this environment.
- **Forced colours** (Chromium emulation): the chips are outlined; the focused bar is outlined and legible; filled and empty stars stay distinct.
- **Admin parity:** 20 screenshots (login, dashboard, Products, Reviews, Special Offers; 1440 and 390px; light and dark), baseline build against this one: all 20 pixel-identical. No admin file, and nothing the admin imports, changed.
- **Laravel shape:** no data code changed. The card receives its products from the pages and makes no calls, so there is no JSON Server-only path to test.

### Follow-up: `ProductCardSkeleton` in `ProductRail`

The repository owner asked for this after the PR went up.

- **Change:** `ProductRail`'s loading branch renders `<ProductCardSkeleton />` in each `aria-hidden` list item: `skeletonCount` of them, 4 by default and 6 when compact. Its `.skeletonText` rule is removed.
- **Test:** `ProductRail.test.js` now compares each loading slot's markup with `ProductCardSkeleton`'s. With the old skeleton restored the test fails; the file was then restored byte for byte.
- **Measured** with Playwright against JSON Server on the scratch copy. The featured and trending reads were held until the loading rail had been measured, then released. Both the dev server and the mock-mode production build gave the same figures:

  | Rail height, loading → loaded (px) | 360px | 768px | 1024px | 1440px |
  |---|---|---|---|---|
  | Every card with a brand, a two-line name, no rating and no compare-at price (before → after) | +32.25 → **0** | +32.25 → **0** | +32.25 → **0** | +32.25 → **0** |
  | Featured, the catalogue as seeded | +68.50 → +36.25 | +52.25 → +20.00 | +52.25 → +20.00 | +29.75 → −2.50 |
  | Trending, the catalogue as seeded | +48.50 → +16.25 | +32.25 → 0 | +32.25 → 0 | +9.75 → −22.50 |

  What remains with real data comes from the content itself:
  - a rating row (+20px);
  - a compare-at price that wraps under the price on phones (+16.25px);
  - names that all fit on one line at 1440px (−22.5px), against the skeleton's two-line box.

  Across the eight rail-and-width cases the total movement drops from 325.5px to 117.5px. Trending at 1440px is the one case that moves more than before (−22.5 against +9.75).
- **Checks:** 282 tests pass; `npm run build` compiles with no warnings (−18 B JS, −19 B CSS gzip); `check-contrast.js` passes; `db.json` is unchanged.

### Pre-existing issues noticed (not changed)

- **Cart drawer** (Prompt 18): it is not a `role="dialog"`; it still uses the old styling and purple accents.
- **`RelatedProducts`' scroller** has no focus room, so the card link's focus ring is clipped at the scroller's top and left edges. The old card had no link focus style at all. Prompt 17's move to `ProductRail` (8px of focus room) fixes it.
- **Uppercase accessible text:** Chromium passes `text-transform: uppercase` into the accessibility tree, so the brand description is exposed as "NILKAMAL". This is the eyebrow convention Prompt 12 flagged for Prompt 31.
- **The product page's gallery badge** ("−13%", red) is Prompt 16's.

### Notes for later prompts

- **14 (listing):** render `<ProductCard … />` with `onAddToCart={(item) => addToCart(item)}`; the card builds the cart item. Use `ProductCardSkeleton` for the loading grid. The card has no `layout="list"` variant: for the list view, render a page-local row reusing `PriceBlock` and `StarRating` (as your brief allows), or add the prop in your prompt. "Only N left" is not on the card.
- **15 (search):** omit `onAddToCart` (and `onToggleWishlist` if you like); the card then shows only its link and chips.
- **16 (product page):** `PriceBlock size="lg"` already renders your brief's line: 24px/500 price, struck muted compare, "Save ₹X" in accent-text, 12px muted tax note. `StarRating` is SVG; pass `size={14}` for the quiet row.
- **17:** wrapping `ProductRail` gives the related rail focus room, and its loading state already matches the card (`ProductCardSkeleton`).
- **18 (cart drawer):** `PriceBlock size="sm"` draws unit price + struck compare; savings stay off unless `showSavings`.
- **19 (offers):** the card's "Sale" chip is the only discount mark on it; render "You save ₹X" under the card as briefed. `PriceBlock` with `showSavings` would say "Save 12%" at sm.
- **25 (wishlist):** pass `{ ...item, id: item.productId, images: [item.image] }`. Snapshots carry `hot` and `stock`, so "New" and "Sold out" work; with one image there is no crossfade.
- **30 (motion):** the card's motion is a 1.03 scale over `--sf-duration-slow`, the alternate fade over `--sf-duration-slow`, the hairline and bar over `--sf-duration`, and the name underline over `--sf-duration-fast`. Under reduced motion there is no scale and no slide.
- **31 (a11y):**
  - The bar's visible "Add to cart" differs from its accessible name "Add <name> to cart" (as briefed); weigh WCAG 2.5.3 (an alternative is "Add to cart, <name>").
  - The heart combines `aria-pressed` with a changing label (as briefed); the APG prefers a constant label for toggle buttons.
  - Screen readers still to test.
- **32 (performance):** the second photograph loads only on hover; card images are lazy with reserved boxes, with no `srcset` yet (single 1200 × 1500 URLs).

### Needs client confirmation

None expected. Two visible choices the client may want to see:

- "New" is driven by the admin's existing "Hot" flag, as the brief says.
- The card's stars are ink rather than gold, so they read on every background.

---

## Prompt 14 — Product listing page

**Date:** 2026-10-08. **Result:** `/products` is now an editorial listing. It has generous air above a breadcrumb that walks every ancestor of the selected category, a serif title with the category's description, and a quiet hairline filter rail (a bottom sheet below 1024px). A restrained toolbar sits above removable applied-filter chips, three-column storefront `ProductCard`s (two on tablets and phones) or list rows, and hairline pagination. The URL scheme, the category rules (a parent includes its children, a legacy id is rewritten to the slug), every facet, sort and pagination rule, and the one catalogue read are the page's own logic, kept as they were. A script confirmed 28 of its blocks byte-identical. `Breadcrumb` is revived as the shared trail. Reference: `prompts/DESIGN_SYSTEM.md` §24.

### What changed

| File | Change |
|---|---|
| `src/pages/Products/Products.js` | Restructured. Kept byte-identical: `SORT_OPTIONS`, `SORT_ALIASES`, `normalizeSort`, `PRICE_RANGES`, the rating/discount/per-page options, the URL reads, the filter state, `fetchCatalog`, the URL→state effect (canonical slugs, legacy-id rewrite), `syncUrlParams`, `resetToFirstPage`, `availableBrands`, `categoryCounts`, `orderedCategories`, `filteredProducts`, the pagination maths, `hasActiveFilters` / `hasAnyConstraint`, `clearAllFilters`, the price, sort, page, per-page, rating, discount, stock and brand handlers, `paginationRange` and the results-text variants. Changed on purpose: the page clamp, the category toggle and the scroll offset (see deviations); the old sheet effect (now `BottomDrawer`); the private card and its handlers (now `ProductCard`); the breadcrumb builder (now the ancestor trail). New: the header (title, intro, trail), the category outline, the applied-filter chips, the toolbar, list rows, the states, pagination markup, and the loading placeholders that keep the layout still. |
| `src/pages/Products/Products.module.css` | Rewritten, tokens only. Its 37 local aliases (among them `--accent: var(--sf-color-primary)`), the 2 hex + 3 rgba values, the orange focus glow and the `top: 152px / 116px` sticky offsets are gone. |
| New `src/pages/Products/ProductListRow.js` + `.module.css` | The list view's row (and `ProductListRowSkeleton`). |
| `src/components/Breadcrumb/Breadcrumb.js` + `.module.css` | Revived: `items: [{ label, link? }]` after an automatic Home, `nav aria-label="Breadcrumb"` › `ol`, `aria-current="page"` on the last item, CSS-drawn "›" kept out of the accessibility tree, token styles, 44px hit areas. The `useTheme` dark class and 6 colour literals are gone. |
| New tests | `Products.test.js` (26), `Breadcrumb.test.js` (5). |
| `prompts/DESIGN_SYSTEM.md` | New §24 "Product listing and `Breadcrumb`". |

Nothing else changed: no admin file, context, `api.js`, `src/utils/*`, `db.json` (SHA-256 unchanged), `ProductCard` / `PriceBlock` / `StarRating` or `BottomDrawer`.

### Decisions

- **List view: a page-local `ProductListRow`, not a `layout="list"` prop.** Prompt 13 added no list layout, and this prompt lists `ProductCard` under "do not touch", so the card and its 22 tests stay as they are. The row reuses `PriceBlock` and `StarRating` and the card's helpers (`buildCartItem`, `productPath`, `getProductMinPrice`, `onImageError`, `PLACEHOLDER_IMG`). It keeps the card's rules: data-only chips (two at most), stars only with reviews, quick add with "Added" for 1.2s, disabled "Sold out", and the heart's `aria-pressed` and labels. Layout: a 4:5 thumbnail 160px wide; the brand eyebrow and the 20px serif name in one link (the thumbnail repeats it outside the tab order); a two-line summary; `PriceBlock size="md"` with its saving; the stock line; ghost "Add to cart" and the wishlist disc.
- **Mobile sheet: `BottomDrawer` (Prompt 09).** It provides everything the old sheet did: `role="dialog"`, `aria-modal`, Escape, focus to its Close button, focus back to the opener, and the body scroll lock. It also adds a portal, a focus trap and token motion. Its footer holds "Clear all" (ghost, disabled with nothing to clear, as before) and "Show N results" (primary). `maxHeight="85vh"` is kept from the old sheet, and its `z-index: 1300` is retired. Two additions on the page side: the Filters button focuses itself on click, so Safari (which does not focus clicked buttons) gets focus back too; and the sheet closes if the window grows to the rail's 1024px.
- **Category outline.** The outline is nested lists, so the hierarchy is announced, and leaf names repeat across tiers ("Chairs with Arms" in Essentials and in Premium). Departments have a plus/minus disclosure. A selection arriving from elsewhere (mega-menu, breadcrumb, link, back/forward) opens exactly its departments. A change made on the page (a box, a chip, "Clear all") only ever opens more, so a department never folds under the pointer. This runs in a layout effect, so the loaded outline paints open.
- **Titles.** None: "All furniture" with `APP_DESCRIPTION` as the intro (a Prompt 02 line already pending approval). One category: its name and `description`. Several: "Sofas and Beds", or "Sofas, Beds and 2 more", with no intro. `search`: "Results for “query”". The trail is Home › Furniture (`/products`) › each ancestor (linked) › the page; "Home › All furniture" with no category.
- **Applied filters** as chips named "Remove <label>": the search, each category, the price ("₹1,000 – ₹5,000", "Under ₹500", "Above ₹5,000", built from the same bounds the filter reads), the rating, the discount, in stock, and each brand. Below 1024px a "Clear all" link follows two or more; the rail has its own.
- **Reveal** on the first six cards only (`staggerDelay`); the rest render at once.
- **Layout stability on a cold load** (the title and description need the category tree):
  - The title, the trail and the intro are skeletons in the line boxes the text will take. The intro keeps two lines' room from 768px and three on phones, and on phones the trail keeps two lines' room.
  - A deep-linked category's chip is held by a skeleton pill.
  - The results region is keyed (loading vs results), so cards replace the skeletons rather than the skeletons' region moving.
  - From 1024px the layout is at least `100vh - 48px` tall, so the rail (whose `max-height` grows as the header compacts) never sets the row height mid-scroll.

### Deviations from the prompt, and why

1. **The page clamp now waits for the catalogue (a pre-existing bug fixed).** The clamp ran while the product list was still empty, where every page past the first is out of range. So `/products?category=home-furniture&sort=price-low&page=2`, one of this prompt's deep links, landed on page 1 with `page` dropped from the URL. The baseline does the same ("Showing 1–12 of 29"). One guard (`if (loading || fetchError) return;`) fixes it: it now shows "13–24 of 29" with `page=2` kept, and an out-of-range page is still clamped once loaded.
2. **`handleCategoryToggle` computes the next selection from the render's state instead of inside a state updater.** The old updater called `syncUrlParams` (a navigation) as a side effect. React can run updaters during render, and the new tests surfaced "Cannot update a component (`MemoryRouter`) while rendering a different component". Behaviour is unchanged.
3. **Quick price ranges are toggle chips.** They carry `aria-pressed`, and pressing the range in force clears the price, as a second click on a rating does; before, a second click re-applied it. A pressed state that cannot be un-pressed would mislead screen readers.
4. **Price fields** are `type="text" inputMode="numeric"`, keeping digits and a point (so "₹5,000" becomes 5000); they were `type="number"`. "Go" is now "Apply price", and Enter also applies (a `form`). Typing still filters live and Apply still sanitises, swaps inverted bounds and syncs the URL, as before.
5. **Row gaps** are 40px (from 768px) and 32px (phones). The brief's 24px / 16px are the column gaps: cards carry text under the image, and 24px rows ran captions into the next row's photographs.
6. **List thumbnails are 112px below 480px** (160px from 480px). At 360px a 160px thumbnail leaves the name about 150px.
7. **The grid/list switch shows on phones too.** The old page hid it at ≤ 480px, where the toolbar had no room; the switch now sits beside the results line. The per-page select and "Page X of Y" stay hidden on phones, as before.
8. **The Filters button shows from 768px to 1023px too.** The brief moves the rail into the sheet below 1024px; the old sheet only existed at ≤ 768px.
9. **A search chip (new)** removes only `search` and keeps the other params. Before, only "Clear All Filters" removed a search.
10. **"Only N left"** uses the product page's rule: `0 < stock <= (Number(lowStockThreshold) || 5)`, replacing the magic `<= 5`. The card does not render it (Prompt 13), so the page adds a 12px warning-toned line under a card, and the row shows it in its own text. No seeded product is low at product level (stock is the sum of variants); the tests cover the rule.
11. **Landmarks:** the rail and the results are `section`s ("Filters" region, "Results" region). An `aside` inside the app's `main` is flagged by axe, and the old page nested a second `main`.
12. **Unknown category tokens** get no chip and no title; all products show, as before. The rail's "Clear all" still clears them.
13. **Copy:** "We couldn't load the catalogue." / "Please check your connection and try again." / "Try again"; "Nothing here yet." with one line per case (search quoted, filters, empty catalogue) / "Clear all filters"; "Show N results"; "Apply price". The sort labels are unchanged (Prompt 29).
14. **The phone toolbar is compact.** The select gets every pixel the row can spare (no icon in the Filters button below 480px, and a tighter chevron), so all sort labels fit from 375px. At 360px only "Avg. Customer Rating" ends in an ellipsis.
15. **The page-change scroll** lands the results' top at `--sf-header-height` + 16px. It is smooth by default and `"instant"` under reduced motion: `"auto"` would inherit the root's `scroll-behavior: smooth`.

### Verification

- **Build:** `npm run build` prints "Compiled successfully" with no warnings. Gzip against the Prompt 13 head built here: JS 407.25 → 409.08 kB (+1.83), CSS 57.26 → 57.77 kB (+0.51).
- **Tests:** `CI=true npm test -- --passWithNoTests` runs 313 tests in 28 suites (282 + 31 new), exit 0, with no React warnings.
  - `Products.test.js` (26) covers:
    - the four deep links, the all-furniture header and the several-categories title;
    - the outline's open rules;
    - every facet against counts computed from `db.json`, and that the session-only facets stay out of the URL;
    - Clear all keeping `per_page`;
    - sort writes and the `popular` alias;
    - pagination (numbers, ends, `aria-current`, per page, scroll) and the clamp;
    - list rows, card wiring and the low-stock rule;
    - loading, error with retry, and empty;
    - the sheet (focus, count, Escape, focus return).
  - `Breadcrumb.test.js` (5).
- **Mutation check:** 14 seeded faults, each caught; files restored byte for byte. The faults:
  - the clamp running while loading;
  - no legacy-id rewrite;
  - low stock back to `<= 5`;
  - quick ranges that never clear;
  - a rating that never clears;
  - departments folding on page changes;
  - Clear all dropping `per_page`;
  - sort aliases ignored;
  - a parent excluding its children;
  - quick add bypassing the card's cart item;
  - the price chip's label;
  - the results line not live;
  - the breadcrumb's `aria-current`;
  - the current crumb rendered as a link.
- **Static:** a literal grep of the six changed style and script files finds no hex, `rgb()`, `hsl()` or font name (`font-family` is only `var(--sf-font-*)`), and no `placehold.co`. `z-index` comes only from `--sf-z-sticky` (the row's chip layer uses a local `1` inside an isolated box). `node scripts/check-contrast.js` passes; there are no new pairs (§24). `node scripts/validate-db.js` passes.
- **Browser QA** used Playwright and Chromium against JSON Server on a scratch copy of `db.json`, with mock-mode production builds of the baseline and of this branch.
  - **Layout** (92 checks at 360, 768, 1024 and 1440px, both modes):
    - no horizontal overflow and one `h1`;
    - grid columns 2 / 2 / 3 / 3 with 16px / 24px gutters;
    - the rail sticky at exactly header + 24px (192px at 1440, 236px at 1024) from 1024px, and the sheet below;
    - the toolbar sticky at the header's 60px on phones only;
    - 4:5 images;
    - every control at least 44px tall (the chips and breadcrumb links through their hit areas);
    - **axe-core 4.7: no violations in `<main>`**;
    - a clean console.
    - Measured: rail 232px at 1024px and 325px at 1440px; cards 156 / 341 / 217 / 317px.
  - **Flows** (56 checks):
    - every facet against data-computed counts, including Enter applying the price and chips removing their filter;
    - every sort order against the data;
    - per page 24; Next to page 2 with `aria-current` and the results landing at header + 16px;
    - 160px list thumbnails;
    - quick add reaching the header's cart ("Cart, 1 item") and the wishlist toggling;
    - the rail's focus ring;
    - phones: the toolbar sticking under the header, the sheet as a dialog with focus on Close, Tab trapped (40 presses), the live "Show 16 results", Escape and focus back to Filters, the scroll lock released, and the sheet closing at 1100px;
    - the error panel and Try again recovering.
  - **Deep links:**
    - `?category=plastic-essentials-armchairs`: "Chairs with Arms", 3 products, trail Home › Furniture › Plastic Furniture › Essentials › Chairs with Arms.
    - `?category=home-furniture&sort=price-low&page=2`: 13–24 of 29, URL kept.
    - `?search=chair`: "Results for “chair”", 42 products.
    - `?category=1`: rewritten to `?category=plastic-furniture`, 21 products.
  - **CLS** (cold load of every category deep link with the API held 600ms):

    | Width | Result |
    |---|---|
    | 768px, 1440px | 43 / 43 at 0 |
    | 360px | 35 / 43 at 0; the other 8 measure 0.029 |
    | 390px | 36 / 43 at 0 |
    | 1024px | 0.034 on every page, the header's (see below) |

    - The 8 at 360px are titles that wrap to two lines on a phone, which nothing knows before the tree loads.
    - Baseline for comparison: 0.0115 on every listing at 1440px, and 0.139 at 1024px.
    - `/products` and searches: 0.0004, a web-font swap of the title.
    - Scrolling whole pages: 0.
  - **Motion:** sampled per frame. The first six cards rise 20px over 0.9s and the seventh never moves. Under reduced motion there is no transform and the page-change scroll is instant.
- **Admin parity:** 20 screenshots (login, dashboard, Products, Categories, Settings; 1440 and 390px; light and dark), baseline build against this one: **20 / 20 pixel-identical**.
- **Laravel shape:** the data path is untouched (`products.getAll()` + `categories.getAll()` through `api.js`), so there is no JSON Server-only reliance.

### Pre-existing issues noticed (not changed)

- **Header (Prompt 07):** from 1024px to 1279px the department row wraps to two lines only when the header's own categories read lands. That moves `<main>` down 44px on every page at those widths (CLS 0.034; the home page measures the same). Reserving the two-line row before the read would fix it (Prompt 32).
- **Cart drawer (Prompt 18):** it does not close on Escape.
- **`getDeviceType`** in `helpers.js` now has no caller (the listing was its only user). It is left for Prompt 32's dead-code pass.
- **Web fonts:** the swap moves the listing title about 7px on a cold load (CLS 0.0004). Size-adjusted fallbacks would remove it (Prompt 32).
- **`PRICE_RANGES` are the boilerplate's.** "Under ₹500" matches no seeded product (the cheapest is ₹699), and "Above ₹5,000" covers 45 of 84. They are kept as specified; furniture-sized ranges are a merchandising choice.
- **The URL→state effect** re-applies the URL's price to the fields whenever the categories change. It only matters for a price typed in the frame right after the catalogue arrives.

### Notes for later prompts

- **15 (search):** "View all results" lands on `/products?search=…`, titled "Results for “query”", with the query as a removable chip.
- **16 (product page):** `import Breadcrumb from "../../components/Breadcrumb/Breadcrumb"`. Pass `items` after Home, for example ``[{ label: category.name, link: `/products?category=${categoryParam(category)}` }, { label: product.name }]``. For the full ancestor trail, `categoryTrail` (10 lines, in `Products.js`) can move to a shared module; `src/utils/categories.js` changes are additive-only.
- **28:** content pages pass `items={[{ label: "About us" }]}`.
- **29:** the listing's copy sits at the top of `Products.js` (`ALL_FURNITURE`, `FURNITURE_CRUMB`) and in its states. `SORT_OPTIONS` labels are unchanged ("Avg. Customer Rating" is the one that ellipsises at 360px).
- **30:** Reveal runs on the first six cards; the sheet's motion is `BottomDrawer`'s; the page-change scroll is smooth (instant under reduced motion).
- **31:** the list row's quick add is named "Add to cart, <name>" (label-in-name), unlike the card's "Add <name> to cart". The outline's repeated leaf names rely on the nested lists for context. NVDA and VoiceOver were not available here.
- **32:** see the header CLS, the font swap and `getDeviceType` above.

### Needs client confirmation

None expected. Visible choices the client may want to see:

- The "All furniture" introduction reuses `APP_DESCRIPTION` (already pending from Prompt 02).
- The empty and error lines.
- The quick price ranges (boilerplate values; see above).

---

## Prompt 15 — Search overlay

**Date:** 2026-10-08. **Result:** the boilerplate's search modal (an 820px panel on an 85% black, blurred veil, an indigo focus glow, a private card with yellow stars, "Trending Searches" for laptops and sarees) is now a calm full-screen search overlay on paper: the logo and "Close search" in a slim top bar, a large serif field on a caramel underline, "Recent" and data-derived "Popular" columns before typing, the live department chips, a polite result count and storefront `ProductCard`s, with honest loading, nothing-matched and unavailable states. Scoring, chip matching, the shared catalogue cache, the recent-searches rules and every navigation target are the boilerplate's, moved unchanged. Reference: `prompts/DESIGN_SYSTEM.md` §25.

### What changed

| File | Change |
|---|---|
| `src/components/SearchModal/SearchModal.js` | Rewritten (markup, states, focus and motion). Props `open`, `onClose` unchanged. The local `StarRating`, `FALLBACK_IMAGE`, `Icon` set, `TRENDING_SEARCHES` and the `useTheme`/`data-theme` theming are gone; cards are the storefront `ProductCard` without quick add or wishlist. |
| `src/components/SearchModal/SearchModal.module.css` | Rewritten, tokens only: 70 hex + 44 rgba values → 0 (the JS carried 5 more, also gone). 859 → 527 lines. |
| New `src/components/SearchModal/searchData.js` | The data rules, moved out of the component: `loadSearchData` and its module cache, `getRecentSearches`, `saveRecentSearch`, `clearRecentSearches`, `buildCategoryMap`, `buildCategoryNav`, `resolveCategory`, `matchesCategoryChip`, `scoreProduct` and the four constants, **byte-identical** to `HEAD` apart from `export` (script-checked). Added: `searchProducts` (the component's old `runSearch` pipeline as a pure function, same steps), `removeRecentSearch`, `getPopularSuggestions`, `getDepartments`, `departmentPath`, `POPULAR_COUNT`, `peekSearchData`, `clearSearchDataCache` (tests). |
| `src/components/SearchModal/index.js` | Deleted (decision below). |
| `src/theme/storefront-tokens.css` | One addition: `--sf-z-search: 1400` (decision below). |
| New tests | `searchData.test.js` (20), `SearchModal.test.js` (31). |
| `prompts/DESIGN_SYSTEM.md` | §9 z-index rows, §19.1 stacking row, new §25 "Search overlay". |

Nothing else changed: `Header.js` and `BottomNav.js` (read only), `ProductCard`, `api.js`, `db.json` (SHA-256 unchanged), `src/utils/*`, contexts and the admin are untouched. The overlay still reads only `products.getAll()` + `categories.getAll()` (no `products.search`), so both API branches behave the same.

### Before and after: the same results

- `searchProducts` was run over `db.json` against the `HEAD` implementation (its functions extracted from the old file, its `runSearch` pipeline replayed) for 30 queries × the 7 department chips: **210 cases, byte-identical** (ids, order and category names).
- The prompt's three: "chair" 42 (first twelve: 4, 5, 6, 15, 16, 27, 30, 38, 40, 33, 45, 21), "almirah" 2 (67, 68), "nilkamal" 22 (59, 84, 4, 7, 9, 14, 18, 1, 2, 3, 5, 6, …), the same before and after, in the browser on both API shapes too.

### Decisions

- **The popular-chips rule.** "Popular" lists the names of the first six active products with the admin's `trending` flag, in catalogue order (seeded: Classic Plastic Chair, Square Plastic Centre Table, Slim Plastic Shoe Rack, 3-Seater Waiting Chair, Executive Leatherette High-Back Chair, Metal Bistro Chair); a chip runs a search for its name. With no trending product, the column shows the departments (`getMainMenuCategories`, the header's six in menu order), titled "Departments", each linking to `/products?category=<slug>`. No demo terms and no counts anywhere.
- **z-index: `--sf-z-search` (1400), added.** `--sf-z-modal` (1100) covers the header (50), mega-menu (55), bottom nav (58), sticky bar token (60) and every drawer and sheet (1000) in the map. In the code, though, two layers still carry legacy literals above it: the product page's mobile `AddToCartBar` (1300, Prompt 16) and the cart drawer (1200/1300, Prompt 18). On a product page at 360px, "Buy Now" and "Add to Cart" drew on top of the open overlay at 1100 (browser-confirmed, `elementFromPoint`), and with the cart drawer open (it has no focus trap yet) Shift+Tab can reach the header's Search and open the overlay under it. At 1400 the overlay covers both (checked); it stays below SweetAlert (2000). Once Prompts 16 and 18 move those layers to their tokens, `--sf-z-search` could return to `--sf-z-modal`'s value.
- **`index.js` deleted.** Both consumers (`Header.js`, `BottomNav.js`) import `SearchModal/SearchModal` directly and may only be read here, and `BottomNav.test.js` mocks that path; no other component folder has a per-folder `index.js` (the barrels are `ui/` and `storefront/`).
- **Two instances kept** (Prompt 09's decision). The module cache serves both; an instance opening after the other has loaded starts from the cache in a layout effect, so it shows no skeleton frame (tested).
- **The data rules in `searchData.js`** (as Prompt 12's `homeData.js`): "move, do not rewrite", in a module that can be tested apart and diffed against `HEAD`. The moved comments are kept verbatim too, including the boilerplate's "Women's Ethnic Wear" example.
- **Department chips appear with a query.** They scope a search, so the suggestions view (Recent / Popular) stays two calm columns; a department pressed before clearing the field is still pressed when typing resumes, and the overlay resets to "All" on close, as before. A second press on the department in force returns to "All" (a pressed toggle that cannot be released would mislead screen readers; Prompt 14's chips do the same).
- **No skeleton flicker.** The view keeps the last settled results (or the last "nothing matched") while the next keystroke's 300ms debounce runs; skeletons show only when nothing has settled yet (first search, catalogue still loading). The count line describes the results on screen. The old modal flashed "No products found" while the catalogue was still loading; it now shows skeletons.
- **The count is the total**, "42 results for “chair”", as before and as "View all 42 results" says, not the twelve shown; " in <Department>" is added while a department is pressed, and to "Nothing matched" too.
- **One live region**, always in the DOM (`role="status"`, `aria-live="polite"`, `aria-atomic`): the count, or the state's serif line as an `h2`, so a screen reader hears "Nothing matched “zzz”." or "Search is unavailable right now." as well as counts. The results list is named by the count.
- **Focus:** `useFocusTrap` + `useBodyScrollLock` (§19.1): the field takes focus as the trap opens (instead of the old 120ms timer), Tab stays inside, Escape closes, focus returns to the opener. A suggestion, Clear all, Try again and a removed recent's neighbour keep focus in place, as each of those controls gives way.
- **Links, not buttons.** Results, "View all" and the department chips are router links, so a modified click opens a new tab and leaves the overlay open (it still remembers the query); a plain click closes it. Enter still submits to `/products?search=<term>`.
- **Recent chips** are one pill holding two controls, the term and a 32px × (44px tall targets); removing one focuses the next ×, or the field when none are left.
- **Hardening:** stored recent values that are not text no longer reach React (an object in the old store would have crashed the modal); the overlay closes on a route change underneath (back/forward), as the sidebar does.

### Deviations from the prompt, and why

1. **`BrandLogo` at 28px, not 24px:** the design system's minimum rendered height is 28px (§10).
2. **The field steps down to display-sm below 480px.** At display-md (28px on a 360px phone) the placeholder needs 413px of a 328px field and was cut at "…rooms, b"; at display-sm (22px) it measures 324px and fits from 360px. Display-md from 480px.
3. **The underline is `--sf-color-border-strong`, 2px accent on focus**, rather than a stone hairline that turns accent: stone is decorative (1.43 : 1) and the field needs a 3 : 1 boundary (WCAG 1.4.11); the 2px focus state also changes more than colour.
4. **"Overlay click closes" has no target.** A full-screen surface has no backdrop (the old phone layout had none either), so nothing on the paper closes it; Escape, "Close search", navigation and a route change do. A stray click can never discard a query.
5. **Department chips only with a query**, and a second press releases a department (both above).
6. **`--sf-z-search` (1400) instead of `--sf-z-modal`** (above).
7. **Additions:** the scoped count and "Nothing matched … in <Department>", the supporting line "Please check your connection and try again." (the listing's wording) under the unavailable title, the close-on-route-change rule, the new-tab behaviour of result links.

### Verification

- **Build:** `npm run build` → "Compiled successfully", no warnings. Mock-mode production builds of `HEAD` and of this branch, gzip: JS 414.23 → 415.03 kB (+0.80), CSS 57.77 → 56.81 kB (−0.96).
- **Tests:** `CI=true npm test -- --passWithNoTests` → 364 tests in 30 suites (313 + 51), exit 0, no React or act warnings.
- **Mutation check:** 27 seeded faults, each caught by at least one test, files restored byte for byte (SHA-256). They covered the popular rule (source, count, label), case-insensitive de-duplication, the twelve-card cap, sort order and the trending boost, focus after removing a recent, ArrowUp only from the first result, closing on plain clicks (results, View all, departments; also on the page already open, where no route change happens) but not on modified ones, the second press releasing a department, the error state, the live region, reduced motion, skeleton flicker, closing on route change, the reset on close, the shared cache, the View all target, the scoped count, remembering the query, retry, Escape and the no-results hint. The first pass caught 21 of 25: one test was weak (the case variant was also the ninth entry, which the cap dropped anyway), two close paths were masked by the route-change close, a modified-click test checked a dialog still in its exit animation, and one mutation was itself a syntax error. Tests were added or tightened, and all six reruns were caught.
- **Static:** `node scripts/check-contrast.js` passes (no new pairs, §25.7); `node scripts/validate-db.js` passes; `db.json` SHA-256 unchanged (QA ran on a scratch copy through `JSON_SERVER_DB`). A grep of the overlay's CSS and JS finds no hex, `rgb()`, `hsl()`, gradient or font-name literal; `font-family` is only `var(--sf-font-*)`; z-index only `--sf-z-search` and a local `1` for the hairline inside the overlay; system colours only in the forced-colours block.
- **Browser QA** (Playwright + Chromium, JSON Server on the scratch copy; 191 scripted checks, all passing on the dev server and on a mock-mode production build, console clean):
  - **At 360, 768, 1024 and 1440px, light and dark:** the overlay fills the viewport at z 1400 on paper (`rgb(250, 247, 242)`) or navy-ink (`rgb(10, 20, 38)`) with no blur; `elementFromPoint` at the corners, centre and bottom bar always lands in it; the page is locked; no horizontal overflow; every control ≥ 44px tall (chips through their hit areas); the placeholder fits the field; focus starts in the field. The suggestions view shows the stored recents and six popular names. "chair" shows three cards per row from 1024px and two below, twelve cards, "42 results for “chair”" and "View all 42 results" → `/products?search=chair`. "zzz" shows "Nothing matched “zzz”." and six department links. Escape closes, focus is back on the header's Search, and the page unlocks. Up to 768px, the overlay opened from the bottom bar returns focus to its Search button.
  - **Keyboard (1440):** Enter on the trigger opens it; ArrowDown → first result (with a visible ring), ArrowUp → field; Tab runs clear → 7 chips → 12 cards → View all → close → field, every stop inside the dialog with a visible focus style; Shift+Tab from the field → close; Escape → trigger.
  - **Flows:** a result opens its product page and closes the overlay, remembering the query; a recent chip runs its search; a department chip scopes the count ("… in Office Chairs", pressed); "View all" lands on the listing titled "Results for “chair”"; Enter lands on `/products?search=sofa`; Recent lists newest first; × forgets one and moves focus to the next ×; Clear all forgets them all; a popular chip searches its product, which comes first.
  - **Unavailable:** with `/products` aborted, and separately with JSON Server stopped (at 1024 and 360px), the serif line shows; after the server restarts, "Try again" recovers, with focus back in the field.
  - **Loading:** with the catalogue held, the hairline runs, six skeleton cards sit in an `aria-busy` region and the department row shows pills; when it arrives, the field, count line and first card are exactly where they were.
  - **Motion:** the overlay fades in; results stagger (later cards behind earlier ones mid-entrance) and all settle visible. Under reduced motion the overlay is opaque on its first frame, results have no transform, and the hairline is a still, full-width 2px caramel line while busy.
  - **Layering:** at 360px on a product page the overlay covers the sticky Add-to-Cart bar (legacy 1300); at 1440px, opened over an open cart drawer (legacy 1200/1300), it covers that too.
  - **Accessibility tree** (Playwright ARIA snapshot and CDP): dialog "Product search" (modal); a `search` landmark with searchbox "Search products"; group "Filter by department" with the pressed chip; `status` (live polite, atomic) holding "2 results for “almirah”" or the level-2 heading "Nothing matched “zzz”."; list "2 results for “almirah”" of articles named by product; regions "Recent" and "Popular"; "Close search" last. The bottom bar's instance, opened after scrolling, fills the viewport (it renders beside the inert, transformed bar, not inside it). NVDA and VoiceOver were not available here.
- **Laravel shape:** a non-mock production build against a stub wrapping every answer in `{ success, data, meta }`: the same six popular names and the same counts and order for chair, almirah, nilkamal, office, sofa and zzz, from the overlay's one `GET /products` and one `GET /categories` (the stub's log). The page's other 404s were the footer's and deals context's Laravel-only routes (`/shipping/methods`, `/deals/config`), which JSON Server behind the stub does not have.
- **Admin parity:** 12 screenshots (login, dashboard, Products; 1440 and 390px; light and dark), baseline build against this one: 9 byte-identical; the other 3 differ by at most 1/255 on 15–496 pixels, in regions where two runs of the baseline build also differ from each other (the 1440 dashboard's hash equals one a baseline run produced). No admin file, and nothing the admin imports besides the one new token, changed.

### Pre-existing issues noticed (not changed)

- **The overlay and the listing counted some searches differently** (fixed by the follow-up below, at the owner's request). The overlay's scoring also matches category names and slugs; the listing's `?search=` filter (`Products.js`) did not. For "office" the overlay found 20 and "View all 20 results" landed on a listing of 14 (the six waiting chairs and benches sit under `office-…-waiting` categories); "table" 33 vs 30, "café" 10 vs 7.
- **Legacy z-index literals above the modal layer:** `AddToCartBar` 1300 on phones (Prompt 16) and `CartDrawer` 1200/1300 (Prompt 18), plus the Profile toast 1300 (Prompt 21). The search overlay now sits above them; the auth modal (9999 until Prompt 20) does not need to.
- **The cart drawer has no focus trap** (Prompt 18): Shift+Tab leaves it for the header behind.
- **`aria-modal` alone:** Chromium still exposes the header behind an open overlay in its accessibility tree, as for the sidebar and sheets (the shared contract relies on `aria-modal`). Prompt 31 may add `inert` to the page behind every overlay.
- **framer-motion's dev-only notice** "You have Reduced Motion enabled on your device…" appears on any page with reduced motion on (the home page logs it without the overlay ever opening); production builds are silent.

### Notes for later prompts

- **16 / 18:** with `AddToCartBar` on `--sf-z-stickybar` and the cart drawer on `--sf-z-overlay` (and its focus trap), `--sf-z-search` could drop to `--sf-z-modal`'s value; keep the search above both either way.
- **20:** the auth modal belongs at `--sf-z-modal`, below the search overlay (no flow opens one over the other).
- **29:** the overlay's copy sits in `SearchModal.js`: the placeholder, "Recent" / "Popular" / "Departments", "Clear all", the count line, "Nothing matched “q”.", "Try a room, a material or a department.", "Search is unavailable right now.", "Please check your connection and try again.", "Try again", "View all N results", the field label "Search products" and the chip group "Filter by department".
- **30:** overlay fade `--sf-duration` (out with `--sf-ease-in-out`); results 8px rise and fade over `--sf-duration`, 40ms apart for eight; the hairline is the loading screen's 2.4s loop; all off under reduced motion.
- **31:** one live region per overlay (`role="status"`); the chips' hit areas; the field's focus indicator is its 2px caramel underline (plus a transparent outline for forced colours); the pressed department uses `Highlight` in forced colours.
- **32:** the overlay reads the full catalogue once per session (shared by both instances), lazily, on first open; the listing and "Complete the space" read it separately (a shared cache is still a candidate).

### Needs client confirmation

None expected. Visible choices the client may want to see: "Popular" follows the admin's `trending` flag (the seeded six are listed above), and the copy listed under "29".

### Follow-up: the listing's search matches the overlay

The repository owner asked for this after the PR went up. The overlay's "View all N results" now always lands on N products.

- **Change:** `searchData.js` exports `matchesSearch(product, query, categoryMap)`: a product matches when the overlay's `scoreProduct` gives it any positive score (the query in its name, tags, category name or slug, brand or short description; a blank query matches everything, as before). `Products.js` filters `?search=` with it (and `buildCategoryMap(categories)`) in place of its own name, description, brand, `category` string and tag test. That test was a subset of the overlay's rule, so every product it found is still found. Sorting, the other facets and the URL are unchanged; "Relevance" still keeps catalogue order rather than the overlay's ranking. The page imports the helper from the overlay's folder, as `SidebarMenu` imports `Header/groupCategoryTree`.
- **Measured** over `db.json` for 258 queries (every word of the product names, tags, brands, category names and slugs, plus the 30 above): the listing now selects exactly the overlay's "All" results for all 258; before, 50 differed. Mostly these are plural or category words: "chairs" 5 vs 42, "tables" 1 vs 20, "sofas" 0 vs 5, "beds" 3 vs 9, "mirrors" 0 vs 4, and the leaf categories' slugs (`cafe-restaurant-chairs` 0 vs 10). In the browser (mock-mode production build), "office", "table", "café", "chair", "chairs", "almirah", "nilkamal", "sofa", "sofas", "tables", "mirrors" and "zzz" each show the same count in the overlay and on the listing that "View all" (or Enter) opens: "office" is now 20 and 20.
- **Tests:** `searchData.test.js` +3 (a category match, a blank query, set equality with the overlay over ten seeded queries); `Products.test.js` +1 (`?search=office` lists the overlay's 20, the 2-Seater Waiting Chair among them). 368 tests pass. Three seeded faults (the old inline filter back, the category ignored, the query untrimmed) each failed a test; files restored byte for byte.
- **Checks:** `npm run build` compiles with no warnings (JS −95 B gzip); ESLint is clean on the changed sources; `db.json` is unchanged.

---

## Prompt 16 — Product details primary

**Date:** 2026-10-08. **Result:** the product page's first screen is now an editorial buy page. Under the shared breadcrumb (the category's full trail), a 4:5 gallery with a hairline frame fills seven columns and sticks under the header from 1024px. Beside it, the buy box reads: eyebrow, serif title, a quiet ratings row, the price, the summary, chips and swatches, quantity and stock, ink and ghost actions with a hairline heart, the SKU, outline-icon promises and a hairline list of delivery facts. On phones a 64px paper bar keeps Add to cart in reach, now on the token scale. The page's derived values and cart wiring are byte-identical (script-checked), the variant data and `variantUtils` are untouched, and every claim on the surface comes from data. Reference: `prompts/DESIGN_SYSTEM.md` §26.

### What changed

| File | Change |
|---|---|
| `src/pages/ProductDetails/ProductDetails.js` | The first screen rebuilt (skeleton, not-found, shared `Breadcrumb` with the full trail, 12-column grid, buy box, actions, `AddToCartBar` mount). Kept byte-identical, spliced from `HEAD` by a script and compared afterwards: `fetchReviews`, `fetchAov`, the load effects, the derived values with the quantity clamp and the reviews blend, and the cart wiring (`handleAddToCart`, `handleAddClick`, `handleBuyNow`, `scrollToReviews`), plus the tabs, bundle and related JSX (Prompt 17's). `fetchProduct` changed only in its category part (below). New: `loadCategoryTrail`, the store-data `Promise.allSettled`, `handleVariantChange` and the variant announcement. The no-op `styles.dark` class and its `useTheme` import are gone. |
| `src/pages/ProductDetails/ProductDetails.module.css` | Rewritten for the first screen, tokens only. The tabs rules are kept (Prompt 17's) apart from their `scroll-margin-top` (now the header contract). |
| `src/components/storefront/ProductGallery.js` + module | Rewritten (DESIGN_SYSTEM §26.3); new `ProductGallerySkeleton` export. |
| `VariantSelector.js` + module | Restyled (eyebrows, 40px `.sf-chip`s, 28px swatches with a 2px ink ring) and the ARIA radio-group keyboard pattern added. Selection logic, availability rules and the stock note unchanged. |
| `QuantityStepper.js` + module | A 44px hairline pill; the control is a named `group` (new `label` prop, default "Quantity"). |
| `SocialProof.js` + module | One quiet row: 14px stars, "4.6 · 12 reviews" as a link-styled button, "No reviews yet". |
| `TrustBadges.js` + module | A 2 × 2 of eyebrow labels with 20px outline icons. Dynamic badges are shown only when the data backs them; new `loading` prop. |
| `DeliveryReturnsInfo.js` + module | A serif "Delivery & returns" `h2` over a hairline facts list; new `loading` and `title` props; `null` when there is nothing to say. |
| `AddToCartBar.js` + module | The 64px paper bar, `--sf-z-stickybar` instead of `z-index: 1300`, a `detail` prop (the chosen variant), the keyboard safeguards; `comparePrice` and `onBuyNow` removed. |
| `src/components/storefront/index.js` | Also exports `ProductGallerySkeleton`. |
| New tests | `ProductDetails.test.js` (19), `ProductGallery.test.js` (13), `VariantSelector.test.js` (9), `QuantityStepper.test.js` (4), `SocialProof.test.js` (5), `DeliveryReturnsInfo.test.js` (4), `AddToCartBar.test.js` (6); `TrustBadges.test.js` +3. |
| `prompts/DESIGN_SYSTEM.md` | New §26; §9 (sticky bar and search rows), §19.5, §24.1 and §25.1 updated. |
| `STOREFRONT_UX_GUIDELINES.md` | "No reviews yet"; the trust-badge rule; the CTA copy casing. |

Nothing else changed: `PriceBlock`, `StarRating`, `ProductCard`, `ReviewsSection`, `FrequentlyBoughtTogether`, `RelatedProducts`, `Breadcrumb`, `variantUtils`, contexts, `api.js`, `src/utils/*`, the tokens, `db.json` (SHA-256 unchanged) and every admin file are untouched.

### The sticky-bar z-index token

`AddToCartBar` uses **`--sf-z-stickybar` (60)**, the token Prompt 01 defined and Prompt 09 reserved for it, replacing the old mobile `z-index: 1300` (set to beat the old 1200 bottom nav). It sits above `--sf-z-bottomnav` (58), which it covers while shown, as before. It sits below every drawer, sheet and modal (≥ 1000) and below the search overlay (1400). Checked with `elementFromPoint` at 360px: the bar over the bottom nav, and the opened cart drawer over the bar. No token was added. The search overlay's 1400 now only needs to beat the cart drawer's legacy 1200/1300 (Prompt 18).

### The gallery fit decision

- **Frame:** `object-fit: cover` (the placeholders and portrait photographs fill the 4:5 frame); `fit="contain"` is available for photography that must be shown whole, with sand around it.
- **Desktop size:** the frame fills its seven columns (702 × 878px at 1440). I tried capping its height so the whole photograph fits the viewport while it sticks, with fixed allowances (192px, 160px), centring and no cap, at 1440 × 900, 1366 × 768, 1280 × 800 and 1920 × 1080. Every cap left a hole between the photograph and the buy box (110–220px) on laptop screens, so the spec's seven columns won. The cost: on screens shorter than about 1000px the photograph's lower part sits below the fold at load. While it sticks, its lower edge can be cut by the viewport. With the seeded data the sticky phase is short, because the buy box is only about 150px taller than the gallery at 1440. Measured: the gallery sticks at exactly `--sf-header-height` + 24px (136px at 1440, 180px at 1024).
- **One column:** the frame is capped at `max(280px, 75vh × 4/5)` and centred, so a portrait tablet (768 × 1024: 614 × 768) is not all photograph. Phones are unaffected (328 × 410 at 360).

### Decisions

- **Breadcrumb: the full trail.** The leaf alone ("Chairs with Arms") is ambiguous: the leaf names repeat in Essentials and Premium. The page reads each ancestor through the existing `categories.getById`: 0–2 extra small reads per product with the seeded tree, cycle-safe, at most six levels. A failed read falls back to the leaf (or Home › product). The trail's box is reserved (two lines on phones, one from 768px), with a skeleton while it loads. **Below 768px the product's own crumb is visually hidden** (it stays in the accessibility tree with `aria-current`), since the `h1` names it again directly below. Before that change, the Ergonomic High-Back Chair's trail took three lines at 360px (CLS 0.024). After it, all 84 products fit their box at 320, 360, 768 and 1024px, and that case measures 0.
- **A new product never shows the previous one's category.** `fetchProduct` now resets `category` and the trail (before, navigating from a categorised product to an uncategorised one kept the stale category) and records whether the leaf read failed, so the trail cannot wait forever.
- **Honest promises.** `TrustBadges` used to show "Cash on Delivery" even with COD switched off (only its "Available" sub-label hid). Now a dynamic badge shows only when `resolveTrustBadgeDetail` backs it, the rule the footer and the assurance strip already follow. Until the settings and shipping reads settle (`Promise.allSettled`), dynamic badges and the delivery facts are skeletons. Every badge keeps two lines' room, so the grid does not move when one drops. The tax note likewise waits for the settings (a no-break space holds its line); before, it said "Inclusive of all taxes" until the settings arrived, then flipped.
- **Keyboard.** Prompt 04 observed that ArrowRight did not move a variant radiogroup. There was no handler; Tab and Enter only worked because each option was its own tab stop. The selector now follows the ARIA radio-group pattern: one tab stop (the chosen option), and the arrow keys, Home and End move the choice, skipping sold-out options. The gallery's thumbnails are a tablist with one tab stop and arrow/Home/End navigation. The frame keeps its Left/Right arrows, and is a tab stop only when there is more than one image.
- **Zoom for a mouse only, and a swipe for touch.** The old gallery zoomed on any pointer's enter, so a tap on a phone left the image zoomed at 2× until another tap. Zoom now listens to mouse pointers only. A horizontal swipe on touch and pen steps through the images (`touch-action: pan-y pinch-zoom`), with the thumbnails as the single-pointer alternative.
- **Stepper focus.** The old pill hid its overflow, which clipped the buttons' focus ring; it no longer does.
- **Action layout by container query.** The buy box is a size container. Below 26rem (416px), Add to cart takes its own row and Buy now and the heart share the next; from 26rem, the three share one row. That is phones up to about 448px, and the 980–1279px desktop range, where the five columns are narrow. Chromium 105+, Safari 16+ and Firefox 110+ support it; older browsers keep the stacked rows. The minified CSS keeps the `@container` rule and the `html:has()` rule intact (checked in the built file).
- **A status announcement** (visually hidden, polite) says what a shopper chose when they change the variant: "5 shelves, ₹3,449.00, Only 4 left". It stays empty on load and on every new product.
- **Sticky bar keyboard safeguards.** While the bar is shown, `html` gets `scroll-padding-bottom` (64px + inset + 16px), so focused content stops above the bar instead of under it. If keyboard focus lands on something the bar covers where it rests (the fixed bottom nav), the bar steps aside until focus moves on. Both checked in Chromium at 360px.
- **Labels:** "Add to cart", "Buy now", "Added" with a check icon (the old "Added to Cart ✓"), "Out of stock", and "Save to wishlist" / "Remove from wishlist" (the card's wording; it was "Add to wishlist"). The stock line drops "— order soon!".

### Deviations from the prompt, and why

1. **No desktop height cap on the gallery**, and a 75vh cap in one column ("The gallery fit decision").
2. **The phone trail ends at the category** (the product's crumb is visually hidden below 768px) to keep within two lines (Decisions).
3. **The sticky bar has no Buy now and no compare price.** The brief lists thumbnail, name, price and a compact Add to cart. At 360px the old bar's compare price overlapped Buy now (noted by Prompt 01). The bar adds the chosen variant after the price ("₹3,449.00 · 5 shelves"), so the shopper sees what it will add. Buy now stays in the buy box.
4. **`TrustBadges` hides unbacked dynamic badges** and the page holds the promises and the tax note until the store data settles (a behaviour change on purpose: "trust badges only from config/settings/shipping").
5. **Additions:** the radio-group and tablist keyboard patterns, the swipe, the variant announcement, the bar's two keyboard safeguards, the `loading`/`title`/`label`/`detail` props, `ProductGallerySkeleton`, and the category reset in `fetchProduct`.
6. **Swatch boundary in `--sf-color-border-strong`** (3.54 : 1), not the stone hairline (1.43 : 1). A white swatch on paper measures 1.03 : 1 without it (WCAG 1.4.11). It is still a 1px line.
7. **The title is not clamped.** Seeded names (48 characters at most) take one or two lines at display-md. Clamping an `h1` would hide text from sighted users only.
8. **`DeliveryReturnsInfo` renders nothing** when it has nothing to say (it used to render an empty titled panel), and its heading is an `h2` (it was an `h3` with no `h2` above it).

### Verification

- **Byte-identical blocks:** a script extracted `fetchReviews`/`fetchAov` (36 lines), the load effects (11), the derived values and cart wiring (90) and the tabs/bundle/related JSX (124) from `HEAD` and found each verbatim in the new file.
- **Build:** `npm run build` → "Compiled successfully", no warnings. Mock-mode production builds of `HEAD` and this branch, gzip: JS 414.94 → 417.23 kB (+2.29), CSS 56.81 → 57.42 kB (+0.61).
- **Tests:** `CI=true npm test -- --passWithNoTests` → 431 tests in 37 suites (368 + 63), exit 0, with no console output. The page test no longer silences `console.error`: a first draft did, and hid act() warnings from reads settling after its assertions; every test now waits for the page's reads to settle.
- **Mutation check:** 30 seeded faults, each caught, files restored byte for byte (SHA-256):
  - cart line id; Buy now opening the drawer; recently viewed keeping 21; no quantity clamp;
  - the tax note before settings; a trail without ancestors; low stock read as in stock; an announcement without a pick; an eyebrow ignoring the category; store data never ready;
  - first image lazy; zoom on touch; Sale at 0; all thumbnails tabbable; swipe always forward;
  - arrows landing on sold-out options; roving tab stops on swatches and on chips;
  - an unbacked badge shown; a pending badge labelled; a hyphenated window; an inactive method shown;
  - the bar's `aria-hidden` inverted; the bar never yielding; the bar tabbable while hidden; the observer's margin;
  - "0.0" with no reviews; always plural; the stepper not live; the stepper ignoring max.

  The first pass caught 27. Two patterns did not apply (the files hold `\u` escapes). One fault was missed: the swatches' tab stops were untested, so the colour test now asserts them. All three were then caught.
- **Static:** `node scripts/check-contrast.js` passes; there are no new pairs (DESIGN_SYSTEM §26.9). `node scripts/validate-db.js` passes. `db.json` SHA-256 is unchanged; QA ran on a scratch copy through `JSON_SERVER_DB`. A grep of the 16 touched style and script files finds no hex, `rgb()`, `hsl()` or font-name literal. The only z-index literals are a local 1/2/3 inside the isolated gallery frame; the bar uses its token. The only gradients are the hard-stop strike lines (the technique the old file and the select chevron already use).
- **Browser QA:** Playwright and Chromium, JSON Server on the scratch copy. 83 scripted checks pass on the dev server and on a mock-mode production build:
  - **Variants:** every variant of the six test products updates the price, SKU and stock status as the data says (Covered Shoe Rack ₹1,899 → ₹3,449 and "Only 4 left"; the armchair's four swatches; Lobby Set Large "Only 4 left"; Carlton King ₹23,999 and "Only 4 left"). The sold-out Antique Brass swatch and the Wide Shoe Rack's 5 shelves are disabled. The alna has no selector and its own SKU.
  - **Keyboard:** Tab reaches the frame (with the ring), then the selected thumbnail. Arrows and Home move the images. Tab then reaches the reviews jump, then the chosen variant; ArrowRight moves and chooses; Tab leaves the group.
  - **Zoom and crossfade:** zoom is `matrix(2, …)` at the cursor and resets when the pointer leaves. A tap at 390px never zooms. The crossfade runs over 0.32s, and 0.01ms under reduced motion.
  - **Cart and checkout:** Add to cart opens the drawer with line `19-v2` at ₹38,999 ×1, and the header reads "Cart, 1 item". Buy now lands on `/checkout` with Small ×2 in the cart. The heart toggles `aria-pressed`, and the header's wishlist count follows.
  - **Sticky gallery:** at header + 24px, at 1440 and 1024.
  - **Sticky bar at 360px:**
    - It shows on load, is 64px tall at z 60, covers the bottom nav, and sets the 80px scroll padding.
    - It hides with `aria-hidden` and `tabindex="-1"` (and no padding) while the buy box is in view, and returns past it.
    - It mirrors the chosen option and adds it; the opened drawer covers it.
    - Keyboard focus in the bottom nav sends it away, and it returns.
  - **Admin data:** an Express rate and window changed through JSON Server (₹1,099, 2–4 days) shows on the page, and COD switched off removes both the promise and the fact. Both were restored.
  - **Routing:** `/products/11` → `/products/covered-plastic-shoe-rack`; recently viewed is written. An unknown slug shows the not-found state, and its link opens the listing.
  - **Overflow and consoles:** no horizontal overflow on eight products at 320, 360, 768, 1024 and 1440px in both modes; clean consoles.
- **Layout shift** (production build, a `layout-shift` observer, the API held 600ms and every image 1.5s, four products):
  - 0 at 360, 768 and 1440px, with and without reduced motion.
  - 0.0336 at 1024px on every product: the header's department row wrapping when its categories load. This is the figure Prompts 10 and 14 recorded on every page, not this surface.
  - The page skeleton's gallery lands exactly where the loaded gallery does (measured equal at 360 and 1440).
- **Accessibility tree** (Playwright ARIA snapshots):
  - the trail as a navigation list ending in the product;
  - group "Covered Plastic Shoe Rack, image 1 of 3" with the shown image named, and tablist "Product images" with three tabs;
  - the eyebrow paragraph and the `h1`;
  - button "Rated 4.0 out of 5, 2 reviews";
  - the price with "Was" and "Save ₹300.00", and the tax note;
  - radiogroup "Shelves" with the checked radio;
  - group "Quantity" (decrease disabled at 1);
  - the stock paragraph and the three actions;
  - list "Our promises";
  - `h2` "Delivery & returns" over its list.

  After choosing 5 shelves, the status reads "5 shelves, ₹3,449.00, Only 4 left". The shown bar exposes its text and button; hidden, it is absent from the tree. NVDA and VoiceOver were not available here.
- **Forced colours** (Chromium emulation): the swatches keep their colours, and the chosen one has a `Highlight` ring; the active thumbnail has a `Highlight` border; the buttons are outlined. The sold-out strikes were lost at first (the browser drops gradient backgrounds there); they are now kept in `CanvasText` (`forced-color-adjust: none` on the strike only).
- **Laravel shape:** a non-mock production build against a stub answering `{ success, data, meta }` shows the same trails, prices, ratings row, promises, five delivery facts and tax line for three products, and redirects `/products/11`. Its log shows only existing routes (`/products/slug/{slug}`, `/products/{id}`, `/products/{id}/reviews`, `/products`, `/categories/{id}`, `/settings`, `/shipping/methods`) and no 404.
- **Admin parity:** 20 screenshots (login, dashboard, Products, Shipping, Settings; 1440 and 390px; light and dark) of the `HEAD` build and this one. 19 are pixel-identical. The 20th differs in 8 pixels by 1/255, inside a remote product thumbnail on the dark Products list (the image-decode noise earlier prompts recorded). Nothing the admin imports changed.

### Pre-existing issues noticed (not changed)

- **The reviews blend counts each review twice.** `totalRatingsCount = product.totalReviews + reviews.length`, but `totalReviews` is already the count of approved reviews: the backend docs (file 03 §8) and Prompt 05's seed both say so. So the ratings row says "2 reviews" for the Covered Shoe Rack's one review, "4" for the Carlton Mattress's two and "6" for the Wooden Sofa Set's three. The old page showed the same counts ("2 Ratings & Reviews"), and "Based on N ratings" in the reviews tab uses the same figure. The average is unaffected while the aggregate matches the reviews. The prompt asks for the blend byte-identical, so it is unchanged. **It needs a decision:** Prompt 17 owns the reviews summary, and a two-line fix is to count the fetched reviews once they have loaded (and the aggregate only until then).
- **Stock is stated twice when low.** The selector's "Only 4 left in this option" and the purchase row's "Only 4 left" repeat each other. The brief keeps both.
- **The page-level fade** (`motion.div`, opacity 0 → 1 over 0.3s) delays the first paint of the gallery's eager image, the page's LCP (Prompts 30 and 32).
- **A legacy-id link loads the product twice** (and its reviews, AOV and category reads), once by id and once after the canonical redirect. Fixed in the follow-up below.
- **No `scroll-padding-top` site-wide.** Tabbing backwards can leave focused elements under the sticky header (Prompt 31).
- **The description tab's specification table** shows weight and dimensions without units ("6.8", "62 × 33 × 98") (Prompt 17).

### Notes for later prompts

- **17:** the page container is now `.sf-container--wide`, so the tabs, bundle and related rail are inside it. `.tabsSection` keeps its rules, except that `scroll-margin-top` is now `calc(var(--sf-header-height) + 16px)`. The ratings row's button calls `scrollToReviews` (it sets the Reviews tab and scrolls); keep it working if anchored sections replace the tabs. See the reviews-blend decision above.
- **18:** the bar is at `--sf-z-stickybar`. Once the cart drawer is on its token too, `--sf-z-search` can drop to `--sf-z-modal`'s value.
- **29:** the copy is in:
  - `ProductDetails.js`: the not-found line, "Loading the product", the stock texts, the action labels and the tax notes;
  - `SocialProof`: "No reviews yet", "N reviews";
  - `DeliveryReturnsInfo`: the heading and the fact sentences;
  - `AddToCartBar`: "Add to cart", "Added", "Out of stock";
  - `VariantSelector`: "Select Option", the stock notes and the hints.

  The trust labels are `TRUST_BADGE_CATALOG`'s.
- **30:** motion values are in DESIGN_SYSTEM §26.8; the page fade is listed above.
- **31:** see the hidden product crumb on phones, the swatch boundary, the bar's scroll padding and focus yield, and the radio-group and tablist patterns. Screen readers are still to test.
- **32:** the first photograph is eager with `fetchpriority="high"`, the others lazy. The thumbnails reuse the full-size URLs (no `srcset` yet). The trail adds 0–2 category reads per product.

### Needs client confirmation

None expected. Visible choices the client may want to see:

- Buy now lives only in the buy box; the phone bar offers Add to cart, with the chosen option beside the price.
- On phones the trail ends at the category.
- The not-found line: "It may have been renamed, or it is no longer in our catalogue."
- "Save to wishlist" as the heart's label, as on the cards.

### Follow-up: a legacy link loads once

The repository owner asked for this after the PR went up. A legacy numeric URL (`/products/11`) now loads the product once.

- **Cause:** the canonical redirect (`navigate("/products/<slug>", { replace: true })`) changes `slug`, so `fetchProduct` (a `useCallback` on `slug`) changes and the load effect ran again. That second load showed the skeleton again, read the product by slug and repeated the reviews, AOV and category reads. The page stays mounted across the redirect (the route is not keyed), so a ref can tell the two URL changes apart.
- **Change** (`ProductDetails.js` only):
  - `fetchProduct` records the slug it redirects to (`redirectingTo`). The load effect skips that one URL change: no load and no `scrollTo`. The ref is cleared on every run, so a later visit to the same slug loads as usual.
  - Each load is numbered (`latestLoad`). A load that is no longer the latest applies nothing when it settles: no product, no not-found, no redirect, no category, and it does not end the newer load's skeleton.
  - Skipping the reload needs the second rule. A legacy read that settled after the shopper had moved on already sent them back to the old product (measured below). Without the reload, it could also leave the URL on the old product and the page on the new one. Such a read is now discarded. The rule also closes the same race between any two products. Before, a late failed read replaced a loaded product with "We couldn't find that piece.", and a late category read could put the previous product's category in the eyebrow and trail.
  - Direct slug URLs, the slug ↔ id fallbacks, not-found, recently viewed and the redirect itself are unchanged.
- **Tests:** `ProductDetails.test.js` 19 → 25. The legacy test now asserts:
  - one product read and no read by slug;
  - one reviews read and one each of the two AOV reads;
  - one scroll.

  New tests:
  - the next two products load after a redirect, the second being the redirect's own slug;
  - a legacy read that settles late, arriving or failing, changes nothing;
  - a superseded read leaves the newer load's skeleton in place;
  - the previous product's category read, arriving or failing late, is ignored.

  All seven new or changed tests fail on the old page code; the other 18 pass. Nine seeded faults were all caught, and the file was restored byte for byte. The faults were: each of the five `latestLoad` guards and the effect's skip removed, the redirect target not recorded, the ref never cleared, and every load treated as the latest.
- **Measured** in Chromium against JSON Server (scratch copy), mock-mode production builds before and after:

  | `/products/11` | Before | After | Direct slug URL |
  |---|---|---|---|
  | Skeleton shown | 2 | **1** | 1 |
  | API reads | 19 | **13** | 13 |
  | Product reads | 2 | **1** | 1 |
  | Reviews / category reads | 2 / 6 | **1 / 3** | 1 / 3 |

  With `/products/11` held and the shopper moved on to `/products/lobby-set`, the late answer now changes nothing. Before, it redirected them to the shoe rack. No console errors. The app-level `ScrollToTop` still scrolls once more on the redirect's pathname change; the page's own scroll runs once.
- **Checks:** 437 tests pass (`CI=true npm test -- --passWithNoTests`, exit 0, no console output). `npm run build` compiles with no warnings (JS +50 B gzip). ESLint finds nothing in `ProductDetails.js`; the test file's testing-library findings are the same 14 as before (the pattern most of the repo's tests follow). `db.json` is unchanged.

---

## Prompt 17 — Product details secondary

**Date:** 2026-10-08. **Result:** below the product page's first screen, the two tabs (Description / Reviews) are gone. Their place is taken by anchored sections under a sticky "On this page" nav (Details · Specifications · Reviews):

- an editorial details block: the description's prose beside a hairline specifications table, parsed from the description's own "Specifications:" paragraph and completed by the catalogue's fields, with units;
- an honest reviews section: a 48px serif average, ink-on-sand rating bars and hairline-separated review articles, or "No reviews yet" with a line on where reviews come from;
- the curated set, now "Complete the set." on a sand panel, ticking pieces in and out;
- the related rail, now the site's one `ProductRail`.

Reviews still come only from `products.getReviews` (approved), with no form and no sorting. The set still adds exactly the ticked pieces through the page's `addToCart`, and the related pieces still come from `getRelated`. The reviews blend no longer counts every review twice. Reference: `prompts/DESIGN_SYSTEM.md` §27.

### What changed

| File | Change |
|---|---|
| `src/pages/ProductDetails/ProductDetails.js` | **Lower half rebuilt:** the in-page nav, the details and specifications sections, the reviews mount, the set and related mounts, `Reveal` per section. `activeTab`, `tabsRef` and the tab markup are gone, with no dead code left. `scrollToReviews` now jumps to the reviews section and focuses it. **Data:** the reviews live in one state keyed by product (`{ productId, status, list }`), replacing `reviews` / `reviewsLoading` / `reviewsError`. The blend counts the loaded reviews once (see Decisions). Reviews, related and set reads that settle after the shopper has moved on are dropped (`latestLoad`, as Prompt 16's loads do), and a new product starts without the previous one's set and related pieces. |
| `src/pages/ProductDetails/ProductDetails.module.css` | The tab rules are replaced by the lower half: the nav, section rhythm and anchor offsets, the details grid, the prose, the hairline table and the tag pills. The first screen's rules are unchanged. |
| New `src/pages/ProductDetails/productSpecs.js` | `buildSpecRows`, `formatWeight`, `formatDimensions`: the table's rows, their order, units and de-duplication. Page-local, pure. |
| `src/utils/helpers.js` | **One addition:** `parseSpecifications(description)` → `{ body, specs }`. No existing export changed. |
| `src/components/storefront/ReviewsSection.js` + module | Rewritten: an editorial section (forwarded ref, `id`, `eyebrow`, `title`, `className` props added; the data props unchanged). |
| `src/components/storefront/FrequentlyBoughtTogether.js` + module | Rewritten as "Complete the set": the same props plus `eyebrow`, `title`, `className`. |
| `src/components/storefront/RelatedProducts.js` | A thin wrapper: `SectionHeading` over `ProductRail`. `RelatedProducts.module.css` is deleted, because the wrapper needs no styles of its own. |
| `src/components/storefront/ProductRail.js` | One comment line (it now is wrapped). |
| `scripts/check-contrast.js` | Two pairs and two informational rows (DESIGN_SYSTEM §27.8). |
| New tests | `helpers.test.js` (15), `productSpecs.test.js` (23), `ReviewsSection.test.js` (12), `FrequentlyBoughtTogether.test.js` (11), `RelatedProducts.test.js` (4). `ProductDetails.test.js` 25 → 43 (two tests updated for the new structure and the corrected count). |
| `prompts/DESIGN_SYSTEM.md` | New §27; the §9 `--sf-z-sticky` row and §26's opening line updated. |
| `STOREFRONT_UX_GUIDELINES.md` | Two sentences: the PDP counts each approved review once; the curated set's shopper-facing name and rules. |

Not touched: the first screen, `ProductCard`, `ReviewModal`, `api.js`, `db.json` (SHA-256 unchanged), the tokens and every admin file.

### Tabs or anchors: anchors

The recommended design was taken: anchored sections under a sticky in-page nav.

- **Why anchors.** Everything stays on the page. Nothing hides behind a control, the reviews no longer appear only after a click, and a shopper scrolling past the buy box reads the description, the table and the reviews in turn.
- **The nav:** `nav aria-label="On this page"`, a list of plain links ("Reviews (N)" carries the count). It sticks under the header (`top: var(--sf-header-height)`, `--sf-z-sticky`) while those three sections pass, then leaves with them.
- **A plain click:** it scrolls the section in under the header and the nav (smooth, instant under reduced motion) and moves focus to the section (`tabIndex={-1}`, no ring), so the next Tab continues from there. It adds no history entry and no hash.
- **A modified click** (a new tab or window) is left to the browser.
- **The ratings row** in the buy box (`scrollToReviews`) makes the same jump.
- **Scroll offset:** the targets' `scroll-margin-top` is the header, the nav's 48px and 16px. A padded section subtracts its own padding, so its first line lands 16px under the nav.
- **No scrollspy.** Details and Specifications sit side by side from 980px, so "the section in view" is ambiguous there. A highlight that picked one of them would contradict the link just clicked, so the links carry no current state.

### The parser helper

`parseSpecifications(description)` in `src/utils/helpers.js`:

- It reads only the last paragraph (paragraphs split on blank lines), and only when that paragraph starts with "Specifications:" (case-insensitive).
- Pairs split on "; " first, then each on its first ": ", so a value can hold a colon ("Sizes: Single: 36 × 78 in" gives the key `Sizes`).
- A fragment with no "Key: " continues the value before it. CRLF line endings, extra blank lines, stray semicolons and spacing are tolerated.
- Without the paragraph, or when it holds no pair, the whole description is the body and `specs` is `[]`.
- Checked by hand in Node first (the implementation note's cases), then by its 15 tests. Every one of the 84 seeded descriptions gives two paragraphs of prose and 5–7 pairs.

### The specifications table

The rows, in order:

1. The parsed pairs, in their own order.
2. Brand, when set.
3. SKU, the chosen variant's, following the selector.
4. Weight: "6.8 kg".
5. Dimensions: "62 × 33 × 98 cm", headed "Dimensions (L × W × H)". A partial record reads "L 57 × H 80 cm".
6. Category: the leaf's name.
7. Tags: sand pills, trimmed and de-duplicated, not links.

- **Units** follow the admin's fields: "Weight (kg)" and "Length / Width / Height (cm)".
- **Left out:** a field row that is empty (the admin saves a blank weight as 0), and a field row whose name a parsed pair already has (case- and spacing-insensitive). For example, the two mattresses, the three Winsome tables and the Nilkamal plastic sofa name their brand in the copy, so they show one Brand row, the copy's.
- **Markup:** a `<table>` named by its `h2` (`aria-labelledby`), with `<th scope="row">`. The layout is fixed at 40 / 60: in the automatic layout the label column grew on phones and pushed "cm" onto a second line.

### Decisions

- **The reviews blend counts each review once (the decision Prompt 16 handed over).**
  - **The bug:** the page added the product's `totalReviews` to the number of fetched reviews. The aggregate is worked out from those same approved reviews (backend docs, file 03 §8), and the seed agrees (the validator checks it). So every count was doubled:

    | Product | Before | After |
    |---|---|---|
    | Covered Shoe Rack | "2 reviews" | 1 |
    | Carlton Mattress | 4 | 2 |
    | Wooden Sofa Set | "Based on 6 ratings" | 3 |

  - **Now:** once the approved reviews have loaded, they are the count and the average. Until then, or if the read fails, the stored aggregate stands in. The ratings row, the nav's "Reviews (N)" and the summary use the same figures.
  - **Under moderation:** the count follows the visible reviews. Approving the Wooden Sofa Set's pending review in Admin → Reviews gives "Based on 4 ratings" and a 4.5 average on the page, although the mock leaves the stored aggregate at 3. The old blend would have shown 7.
  - The blend still lives in the page (guardrail 1). Guardrail 6 rules out invented totals.
- **Late reads are dropped.**
  - A reviews, related or set read started for an earlier product applies nothing when it settles.
  - Before this, a slow read could show product A's reviews on product B, or B's anchor with A's companions; "Add N to cart" would then have added A's companions.
  - A new product also starts without the previous product's set and rail. The set is keyed by product, so its ticks reset.
- **Reviews layout:** from 980px, the heading, summary and bars sit in columns 1–5 and the articles in 7–12, the same 5 | 6 offset 1 grid as the details. The prompt's "summary row" is that block's figure, stars and basis on one line.
- **Rating bars** are a list of five `role="img"` rows named "5 stars: 2 reviews" (singular forms where due). They are drawn as sand tracks with ink fills and show only once the reviews have loaded.
- **The set shows what it will add.** "Add N to cart" hands `buildCartItem(p)` to the cart, the rule kept as specified, and that takes each piece's cheapest option. Each piece now names that option under its name ("This piece · Walnut", "Single"), so nothing is added unseen.
- **The set's other rules:**
  - The anchor is a ticked, disabled box, drawn at full strength: it is always in.
  - The total is a polite, atomic live region.
  - A sold-out piece (product `stock` 0, the card's rule, as on the home page) cannot be chosen and is left out of the total and of the add. The cart would otherwise accept a quantity of 1 at zero stock (`clampQty`).
- **Heading order:** `h1` → `h2` "Delivery & returns" → "About this piece" → "Specifications" → "What customers say." (→ `h3` review titles) → "Complete the set." → "You may also like.". The details' two `h2`s are styled as eyebrows.

### Deviations from the prompt, and why

1. **The blend changed** (above): it no longer double-counts. It stays in the page.
2. **The anchor offset includes the nav:** `scroll-margin-top` is `--sf-header-height` + 48px + 16px, not `--sf-header-height` + 16px, because the nav is sticky and would otherwise cover the first line of a target.
3. **"Complete the *set*."** carries the accent and a period, as every serif heading on the site does (guardrail 4: one italic accent). The brief wrote "Complete the set".
4. **Review copy:**
   - The old empty line "No written reviews yet. Be the first to share your experience." invited an action this page does not offer. "No reviews yet" and the prompt's note replace it.
   - The error reads "Reviews could not be loaded just now." with "Try again" (the site's wording since Prompts 12, 14 and 15), not "Sorry, we couldn't load reviews right now." with "Retry".
   - The helpful line reads "N people found this helpful".
   - Photo alt text no longer claims "from a verified buyer" on reviews that are not verified.
5. **No avatar** on review cards. The brief's card lists none, and the gradient avatar goes with it (guardrail 2).
6. **The set's additions:** the option line, the sold-out rule and the live total (Decisions).
7. **`RelatedProducts.module.css` deleted:** the wrapper composes `SectionHeading` and `ProductRail` and needs no styles.
8. **Additions:** the page-local `productSpecs.js`; tests for the helper, the rows and all three components; two contrast pairs; DESIGN_SYSTEM §27.

### Verification

- **Build:** `npm run build` prints "Compiled successfully" with no warnings. Against `HEAD`, both built in mock mode, gzip: JS 417.26 → 418.96 kB (+1.70), CSS 57.42 → 57.97 kB (+0.55).
- **Tests:** `CI=true npm test -- --passWithNoTests` runs 520 tests in 42 suites (437 + 83), exit 0, with no React or act warnings.
- **Mutation check:** 31 seeded faults, each caught by at least one test; the files were restored byte for byte (SHA-256). The faults covered:
  - the blend: added together, or ignoring the aggregate while loading;
  - late reads: reviews, and the set or related, applied; the previous set kept;
  - jumps: no focus move, reduced motion ignored, modified clicks hijacked;
  - a Details link without a body; the SKU row ignoring the variant; the set's read limit;
  - the parser: splitting on the last ": ", reading the first paragraph, dropping continuations, keeping an unparsed paragraph out of the prose;
  - the rows: case-sensitive de-duplication, a missing unit, a hint on partial records;
  - the reviews: verified on a truthy flag, an average with no ratings, the empty line while loading, focus dropped on retry, wrong bar counts, the summary stars exposed;
  - the set: unset companions unticked, sold-out pieces added, the ticks ignored, an invented discount, the anchor's photograph linked, the total not live;
  - the related section rendering while empty.
- **Static:**
  - A grep of the eight touched style and script files finds no hex, `rgb()`, `hsl()`, gradient, font-name literal or `!important`; the only z-index is `--sf-z-sticky`.
  - ESLint is clean on the changed sources. `node scripts/check-contrast.js` passes. `node scripts/validate-db.js` passes.
  - `db.json` SHA-256 is unchanged. All QA ran on a scratch copy through `JSON_SERVER_DB`.
- **Browser QA:** Playwright and Chromium. Every interaction run below scripts the same 25 checks:
  - the nav's three links and no tablist;
  - the nav sticking at the header's height on `--sf-z-sticky`;
  - each jump landing 16px under the nav, moving focus to its section and adding no hash;
  - the ratings-row jump;
  - "Complete the set": unticking the mattress → "Total for 2 pieces ₹39,498.00" → "Add 2 to cart" puts exactly King Size Bed · Walnut and Wooden Bedside Table · Walnut in the cart;
  - the related rail scrolling on Next;
  - no horizontal overflow and no page errors.

  Results, all passing:

  | Build | Widths, modes | Checks |
  |---|---|---|
  | Dev server | 360, 768, 1024, 1440 light; 1440 dark; 1440 under reduced motion | 150 |
  | Mock-mode production | 360, 768, 1024, 1440 light; 360 dark; 768 dark under reduced motion | 150 |
  | Non-mock production (Laravel stub) | 1440 light | 25 |

  - **Screenshots** in both modes at 360 and 1440 (also 768 and 1024 for layout): the details two-column from 980px and stacked below, the table, the rating bars, the set's tiles (rows on phones), the rail bleeding to the edge on phones.
  - **Reviews states** (light and dark):
    - reviewed with three reviews: the Wooden Sofa Set;
    - a verified purchase: the Wooden Bedside Table's "✓ Verified purchase";
    - unreviewed: the L-Shaped Sofa, "No reviews yet" and the note;
    - loading: the request held;
    - failed: the request aborted.
  - **Error with the server really stopped:** JSON Server was killed mid-session. The reviews then say "Reviews could not be loaded just now." beside the stored summary, and "Try again" keeps focus on the section. After a restart, "Try again" brings the three reviews back.
  - **A description without the paragraph:** the alna's description was cut to two paragraphs through JSON Server on the scratch copy, then restored. The page shows both paragraphs as prose and a table of the field rows only.
  - **Admin → Reviews moderation:** approving the pending review in the admin UI shows it on the page (4 reviews, "Based on 4 ratings"). It was put back to pending afterwards.
  - **Narrow screens:** at 320, 360 and 390px on four products there is no overflow, and the nav's three links fit from 320px.
  - **axe-core 4.7 on `<main>`:** one minor best-practice result, `image-redundant-alt`, on the related rail's brandless "Steel Sofa-cum-Bed" `ProductCard` (pre-existing, below).
  - **Keyboard:** 38 stops from the nav to the footer, every one with a visible ring. The lower half adds the 3 nav links, a photograph link and a checkbox per companion, "Add N to cart", then the rail.
  - **ARIA snapshot** (Playwright):
    - navigation "On this page";
    - regions "About this piece", "Specifications" (a table of row headers), "What customers say." (list "Ratings by star" of five images, then a list of articles with `h3` titles), "Complete the set." (named checkboxes, the anchor `[checked] [disabled]`) and "You may also like." (group "Related pieces").

    NVDA and VoiceOver were not available here.
- **Laravel shape:** a non-mock production build against a stub answering `{ success, data, meta }`. It passes the same 25 checks, and the reviews' error and loading states behave the same. The stub logged only existing routes (`/products/slug/{slug}`, `/products/{id}/reviews`, `/products`, `/categories/{id}`, `/categories`, `/settings`, `/shipping/methods`, `/deals/config`) and no unknown route.
- **Admin parity:** 16 screenshots (Dashboard, Products, Reviews, Settings; 1440 and 390px; light and dark) of the `HEAD` build and this one, remote images held.
  - 15 are identical to a baseline run.
  - The 16th, the light Dashboard at 390px, differs by at most 1/255 on 14 anti-aliased pixels.
  - No admin file changed. The admin imports `helpers.js`, which only gained an export.

### Pre-existing issues noticed (not changed)

- **`ProductCard` (Prompt 13):** a brandless card's image alt repeats its link text (axe `image-redundant-alt`, best practice). Prompt 31.
- **A failed product read reads as "not found":** with the server stopped, reloading a product page shows "We couldn't find that piece." (Prompt 16's state for any read error), although the piece exists.
- **The set adds each piece's cheapest option** (the rule kept). The King Size Bed's curated mattress goes in as a Single, now visible in the set. A size-matched pairing, or an anchor that follows the chosen variant, is a merchandising and code decision (Prompt 11 noted the same).
- **Copy against fields:** "Overall size" in the copy and the dimensions fields disagree slightly for products 2, 3, 5 and 6 (Slat-Back Plastic Armchair: copy 57 × 54 × 80 cm, fields 58 × 55 × 82 cm). Both show in the table, because the brief de-duplicates by name. For the client or Prompt 34; `db.json` is not this prompt's.
- **Mock aggregates:** mock mode does not recompute a product's `rating` / `totalReviews` on moderation (the backend should, file 03 §8). The product page now follows the visible reviews; listing cards still show the stored aggregate.
- **Header compaction:** from the top of a page at 1024px and up, the header is at rest when a jump starts and compacts during it, so the target lands up to 56px lower than intended (never under the nav). Jumps made further down land exactly.
- **Smooth scrolling:** `html { scroll-behavior: smooth }` (`index.css`) is not switched off under reduced motion site-wide. The page's own jumps pass `"instant"` explicitly. Prompts 30 and 31.
- **Two catalogue reads:** `getRelated` and `getFrequentlyBoughtTogether` each read the whole catalogue (`products.getAll`), so every product page makes two full reads. Prompt 32.

### Notes for later prompts

- **29 (copy):**
  - `ProductDetails.js`: "On this page", "Details", "Specifications", "Reviews", "About this piece".
  - `ReviewsSection`: the eyebrow and title, "Based on N ratings", "No reviews yet", the moderation note, "Verified purchase", "Anonymous", "N people found this helpful", "Reviews could not be loaded just now.", "Try again", "Loading reviews", "Ratings by star", "Customer photos", "Customer upload i of n".
  - `FrequentlyBoughtTogether`: "Curated by us", "Complete the *set*.", "This piece", "Sold out", "Total for N pieces", "Add N to cart".
  - `RelatedProducts`: "Related", "You may also *like*.", "Related pieces".
- **30 (motion):** `Reveal` on each section (the table 90ms after the description); the nav links' colour and underline over `--sf-duration`; the jumps smooth, instant under reduced motion.
- **31 (a11y):**
  - The nav is links, and jumps move focus to the section (`tabIndex -1`, no ring).
  - Bars are named images; the set's total is a polite live region.
  - A site-wide `scroll-padding-top` would add to these `scroll-margin-top`s (and to every `--sf-header-height + 16px` anchor in §17.2): adjust one or the other.
  - Screen readers are still to test.
- **32 (performance):** the two catalogue reads above; the review photos are lazy and the set's thumbnails lazy with a reserved 4:5 box.
- **34:** the copy-against-fields sizes above, and the moderation note's claim (below).

### Needs client confirmation

None expected. Visible choices the client may want to see:

- **Section copy:** "About this piece", "What customers *say*.", "Curated by us" / "Complete the *set*.", "You may also *like*.".
- **The empty-state note:** "Reviews come from verified orders and are published after moderation." That is true of the storefront's own path (Order History, delivered pieces, moderation). Admin → Reviews can also author reviews that are tied to no order; if the store uses that, the line should change.
- **The set's cheapest option:** each piece is added in its cheapest option, now named in the set (above).

---

## Prompt 18 — Cart drawer

**Date:** 2026-10-08. **Result:** the cart is now a paper side panel on the right with a hairline edge. It holds a serif "Your cart" with the number of pieces, a free-delivery line over a 2px sand track that reads the live shipping methods, hairline-separated lines with a 4:5 thumbnail, the option, `PriceBlock`, a 36px stepper, the line total and a text "Remove", one quiet row of promises, and a footer that stays at the bottom with the subtotal, what delivery costs, "Taxes calculated at checkout", Checkout and "Continue shopping". It is a real modal dialog now: named, focus in and back out, Tab kept inside, Escape. All cart changes still go through `useCart`; the drawer computes no shipping charge, tax or discount. Reference: `prompts/DESIGN_SYSTEM.md` §28.

### What changed

| File | Change |
|---|---|
| `src/components/CartDrawer/CartDrawer.js` | Rewritten (408 → 605 lines, with the header comment). Kept: the props `open` / `onClose`; `useCart`'s `cartItems`, `updateQuantity`, `removeFromCart`, `getCartTotal`, `getCartItemCount`; the body scroll lock and the backdrop close; the stepper's rules; `productPath`, `PLACEHOLDER_IMG` and `onImageError`; `/checkout`. New: the dialog semantics with `useFocusTrap` and `useBodyScrollLock` (Prompt 09's helpers), the live delivery data, the promises, the focus hand-off after a removal, the close on route change, the portal. Removed: `FLAT_SHIPPING = 99`, the `FREE_SHIPPING_THRESHOLD` import, `useTheme` / `isDarkMode` (the tokens flip by themselves), `truncateText` (CSS clamps the name), the spring, the duplicate "View Cart" button, the icon-only trash and the stray "0" Prompt 11 reported. |
| `src/components/CartDrawer/CartDrawer.module.css` | Rewritten, tokens only: 73 hex and 45 `rgba()` values → 0 (Prompt 01 counted 122), no blur, no gradient; z-index only `--sf-z-overlay`. |
| New `src/components/CartDrawer/cartDelivery.js` | The delivery rules: `activeMethods`, `methodRate`, `freeDeliveryThreshold`, `deliveryEstimate`. Pure. |
| New tests | `CartDrawer.test.js` (32, against the real `CartProvider`; only the network, auth and toasts are stubbed), `cartDelivery.test.js` (13). |
| `prompts/DESIGN_SYSTEM.md` | New §28; the §9 `--sf-z-overlay` and `--sf-z-search` rows, §19.1, §19.5 and §25.1 no longer describe the drawer's old 1200/1300. |

Nothing else changed: `CartContext.js`, `Header.js`, `Checkout.js`, `src/utils/constants.js` (`FREE_SHIPPING_THRESHOLD` stays for the header's utility line), `tokens.js`, `api.js`, `db.json` (SHA-256 unchanged) and every admin file are untouched.

### The live-threshold rule, and `FLAT_SHIPPING`

- **Before:** the drawer worked from the constant `FREE_SHIPPING_THRESHOLD` (₹9,999) and a local `FLAT_SHIPPING = 99` ("mirrors db.json Standard flatRate"). Prompt 05 changed that rate to ₹499, so below the threshold the drawer said ₹99 while checkout charged ₹499. Both are gone from the drawer.
- **Now** (`cartDelivery.js`), read when the drawer first opens (`shipping.getMethods()` and `settings.get()`, kept for the session, a failed read tried again on the next opening), inactive methods dropped as checkout drops them:
  - **threshold** = the lowest positive `freeAbove`. That is `resolveTrustBadgeDetail("freeShipping")`'s rule, the one the footer, the home strip and the product page print. The resolver decides whether a threshold exists; it returns display text ("Above ₹9,999"), so the amount is read by the same rule beside it, and `cartDelivery.test.js` checks that the two agree on the seeded methods and seven edge cases.
  - **rate** = the flat rate of the method carrying that threshold; with no threshold, the lowest rate. An unknown rate is never borrowed from another method.
  - A method free at any amount (`rateType: "free"`, or a ₹0 rate, which checkout charges as nothing) makes delivery **free outright**: the Delivery row says "Free" and no progress is drawn (there is nothing to unlock). Not in the brief; the seeded "Free Shipping" method is inactive today, but an admin could switch it on.
  - Free means `subtotal >= threshold` on the pre-discount subtotal: checkout's rule (`freeAbove && subtotal >= freeAbove`), inclusive.
- **Seeded result:** "Add ₹X more for free delivery" and "₹499.00 · free above ₹9,999.00" below ₹9,999; "Free delivery unlocked" and "Free" at or above it. With Standard's `freeAbove` cleared in Admin → Shipping, the indicator disappears and the row reads "₹499.00" (checked in the browser, then restored). No threshold is ever invented, and nothing is drawn before the methods have been read.

### Decisions

- **Focus-trap helper:** reused `src/components/ui/useFocusTrap.js` (Prompt 09) with `initialFocusRef` on the close button; no new helper. The hook records `document.activeElement` when `open` turns true and gives focus back to it, so a card's quick add, the product page's Add to cart and the header's cart button all get it back.
- **Stepper:** its own 36px pill (`QuantityStepper` is 44px or 32px). Each button has a 44px target through `::after`. The buttons are named "Decrease quantity" / "Increase quantity" inside a group named "Quantity, <name>, <option>", so lines are told apart. Unavailable buttons use `aria-disabled`, not `disabled`, so a keyboard user who reaches the stock limit keeps focus on "+".
- **The "+" rule** is the brief's ("`stock` is a number and `quantity >= stock`"). The old code also required `stock > 0`, so on a line saved at zero stock "+" stayed enabled, and the context let the quantity grow without limit (`clampQty` ignores a stock of 0). That line now cannot grow. `−` is unavailable at 1, as before.
- **Remove** is a text button at the top right of the line, beside the name: "Remove" plus a visually hidden "<name>, <option>". The bottom row cannot hold the stepper, Remove and a line total at 360px, which would leave a 232px details column. The name takes the rest of the head row (two lines hold every seeded name at 360px; the longest is 39 characters).
- **After a removal**, focus moves to the next line's Remove (the previous line's for the last one). When the cart is empty, focus moves to the empty message, so a screen reader reads "Your cart is empty.". A line that is folding away is `inert`.
- **Links:** the name is a router link (the old name and thumbnail were an `h4` and a `div` with click handlers, out of reach for the keyboard). The thumbnail repeats the link for the pointer only. Links go to `productPath(line)`, which is `/products/<id>` because cart lines carry no slug (below), and the product page redirects that to the slug. A plain click closes the drawer as it navigates; a modified click leaves it open; a route change underneath closes it, as the sidebar and search do.
- **Promises** wait for the settings read, so "Cash on Delivery" never pops in between the other two; after a failed read only "Secure payment" and "Easy returns · 7 days" show. The labels are the footer's.
- **Formatting:** every amount in the drawer uses `formatCurrency` ("₹499.00 · free above ₹9,999.00"), like `PriceBlock`, the subtotal and the product page's delivery facts. The footer's and home strip's "Above ₹9,999" comes from the resolver's own string.
- **Portal on `<body>`** (as `BottomDrawer`), and **`--sf-z-overlay`** for the backdrop and the panel.
- **The empty state** links to `/products` ("Browse furniture", the brief's better target; it was `/`).

### Deviations from the prompt, and why

1. **The threshold amount is read beside the resolver, not parsed from it** (above). The resolver still decides whether there is one.
2. **Free outright** when an active method is free at any amount (above).
3. **The fill is scaled, not resized:** `transform: scaleX(share)` from the left over `--sf-duration-slow`. The design system animates only transform and opacity. The drawn width equals `min(100, subtotal / threshold × 100)%`.
4. **The free-delivery block unfolds when it arrives late.** On the first opening the methods usually arrive while the panel slides in, so the block expands from no height (fading only under reduced motion) instead of pushing the lines down in one jump. When the methods are already known it is drawn at once. It folds away when the cart empties.
5. **A skeleton in the Delivery row** while the methods are read (with "Loading" for screen readers), so the row never flips from a guess to the real value.
6. **The dialog's description is the count** ("3 items").
7. **"Remove" at the top right** rather than in the bottom row (360px fit, above).
8. **Lines clip their content** (so the fold reaches 0) and reach 8px into the gutters, where the focus rings and hit areas at their edges fit. Checked by screenshot at 360px in both modes.
9. **"1 day"** in the singular, if the returns window is ever 1.
10. **Additions:** `cartDelivery.js`; the close on route change; the portal; `inert` on folding lines; the focus hand-off after a removal.

### Verification

- **Build:** `npm run build` prints "Compiled successfully" with no warnings. Gzip against `HEAD` built the same way: JS 413.8 → 414.9 kB (+1.1), CSS 57.97 → 57.09 kB (−0.88). Mock-mode builds: JS 418.96 → 420.16 kB, CSS 57.97 → 57.09 kB.
- **Tests:** `CI=true npm test -- --passWithNoTests` runs 565 tests in 44 suites (520 + 45), exit 0, no console output. framer-motion's `height: "auto"` measurement calls `window.scrollTo` (it restores the window's own offset), which jsdom lacks, so the drawer test stubs it like `Products.test.js`.
- **Mutation check:** 34 seeded faults, each caught by at least one test; both files restored byte for byte (SHA-256). The faults: the highest threshold; free methods ignored (twice); the lowest rate instead of the carrier's; inactive methods kept; free and unlocked strictly above the threshold; a read on every opening; no new read after a failure; progress before the read; a ₹99 fallback; the line not live; COD always; returns at 0 days; the old stock rule; "+" ignoring the stock; "−" not unavailable at 1; the figure not live; focus not handed to the next or the previous line; the empty message not focused; folding lines left in the tab order; modified clicks closing; route changes ignored; Escape ignored; the page not locked; the line total as the unit price; the subtotal from unit prices; lines counted instead of pieces; "1 items"; the empty state browsing home; the thumbnail in the tab order; a description while empty; the duplicate View Cart. The first pass missed two, both weak tests rather than faults: `fireEvent.click` does not move focus as a real click does, and the modified-click test asserted during the closing animation. Both were tightened and both faults are now caught.
- **Static:** a grep of the four sources finds no hex, `rgb()`, `hsl()`, gradient or font-name literal (`font-family` is only `var(--sf-font-*)`); z-index only `--sf-z-overlay`. ESLint is clean on the sources; the test file has 3 `testing-library/no-node-access` findings (the aria-hidden backdrop and the `inert` wrapper, which have no role to query), fewer than the comparable suites (6–17). `node scripts/check-contrast.js` passes (no new pairs, §28.6); `node scripts/validate-db.js` passes; `db.json` SHA-256 unchanged (QA ran on a scratch copy through `JSON_SERVER_DB`).
- **Browser QA** (Playwright + Chromium; JSON Server on the scratch copy; mock-mode production build): 110 scripted checks pass.
  - **Opening:** a card's quick add (by keyboard) opens it with focus on "Close cart"; Escape closes and focus returns to that quick add. The product page's Add to cart opens it with the merged line. **Buy now never shows it:** a `MutationObserver` that was confirmed running (it saw the drawer when Add to cart opened it) counted 0, and the page landed on `/checkout`.
  - **Quantities:** the Covered Shoe Rack's 5-shelf option (stock 4) goes up to 4; "+" is then unavailable, titled "No more stock available", and an extra press changes nothing; the context stored 4.
  - **Threshold:** "Add ₹1,253.00 more for free delivery" at ₹8,746, the fill at 0.875; one "+" animates the fill to full over the next frames (0.88 → 1.00); the line turns "Free delivery unlocked" in the success tone; the 2px track; the Delivery row as above, read with a comma where the dot is.
  - **Keyboard and links:** Tab runs close → name → Remove → − → + per line → Checkout → Continue shopping, then wraps; focus never left; the page is locked. "Continue shopping" closes on the same page; a name link lands on the product (`/products/4` → `/products/classic-plastic-chair`) and closes; Checkout lands on `/checkout` and closes; Remove hands focus on, the empty message takes it, "Browse furniture" lands on `/products`.
  - **Widths and modes** (360, 768, 1024, 1440; light and dark): the panel is 360 / 440 / 440 / 440px wide, flush right, its footer at the viewport's bottom; no horizontal overflow; close 44 × 44, stepper 36 with 44px hit areas, Remove reachable 12px above and below its text, Checkout 52px; z-index 1000 and on top; paper `rgb(250, 247, 242)` / navy-ink `rgb(10, 20, 38)`; the bottom nav `inert` beneath (up to 768px); clean consoles.
  - **Motion:** the panel slides in from x 1413 to 1000; a removed line folds 159 → 1px. Under reduced motion the panel never moves (transform `none` on every frame) and fades in, and a removed line keeps its 161px while it fades.
  - **Admin round trip** (6 checks): with Standard's "Free Shipping Above" cleared in Admin → Shipping, the indicator is gone and Delivery reads "₹499.00"; with ₹9,999 restored, both return. The scratch copy was then put back to equal the repo's `db.json` in every collection.
  - **Accessibility tree** (Playwright ARIA snapshot): dialog "Your cart" › heading level 2, "3 items", "Close cart", the free-delivery line, list "Your cart" of items (link, "Remove …", option, price with "Was …", group "Quantity, …" with "Decrease quantity" [disabled] at 1, "Line total …"), list "Our promises", the Subtotal and Delivery terms and definitions, "Taxes calculated at checkout", link "Checkout", "Continue shopping". The thumbnails are absent. NVDA and VoiceOver were not available here.
  - **Focus rings:** screenshots at 360px of the close button, the name, Remove (at the line's right edge) and the stepper, in both modes: every ring complete.
- **Laravel shape:** a non-mock production build against a stub answering `{ success, data, meta }` (7 checks): opening the drawer requested `/shipping/methods` and `/settings` once each and nothing on reopening; the same line, Delivery row, promises (with COD) and unlock.
- **Admin parity:** 20 screenshots (login, dashboard, Products, Shipping, Settings; 1440 and 390px; light and dark) of `HEAD` and of this build: 20 / 20 byte-identical (two baseline runs were identical too). No admin file, and nothing the admin imports, changed.

### Pre-existing issues noticed (not changed)

- **The add toast covers the drawer's footer on phones.** `CartContext`'s "Added to Cart" toast (SweetAlert, bottom-end, 2s) sits over Checkout at 360px right after an add opens the drawer, as it did over the old drawer. The drawer itself now confirms the add; Prompts 29/30 could move toasts to the top on phones, or skip the add toast when the drawer opens.
- **Cart lines carry no slug.** `normalizeCartItem` keeps a fixed set of fields and drops `buildCartItem`'s `slug`, so the drawer links to `/products/<id>` and the product page redirects to the slug. Keeping `slug` in the context would link straight to the canonical URL (`CartContext.js` was out of scope).
- **COD and its cap.** The drawer shows "Cash on Delivery" whenever COD is enabled, as the footer and the product page do. Checkout offers it only up to ₹50,000 payable, so most sofa, bed and dining carts see the promise but not the option. A client decision (Prompt 10 asked the same of the home strip).
- **Tax-inclusive prices.** The product page says "Prices inclusive of all taxes" when `settings.store.taxIncluded` is true, but checkout always adds GST on top. Not visible with today's `taxIncluded: false` (Prompt 26).
- **Admin → Shipping's edit** saves the form fields with a PUT, so saving a method drops its `createdAt` (seen on the scratch copy). Admin untouched.
- **The header's utility line** still reads `FREE_SHIPPING_THRESHOLD` (the brief keeps it there). If the admin changes the threshold, that line goes stale while the drawer, footer, home strip and product page follow the data.
- **`--sf-z-search` (1400)** was raised to beat the old drawer; with the drawer and the sticky bar on tokens, `--sf-z-modal` would now do. Left as is; it is harmless.

### Notes for later prompts

- **20 (auth modal):** the drawer's dialog wiring (`useFocusTrap` with `initialFocusRef`, `useBodyScrollLock`, a portal, the overlay tokens) is the pattern to copy.
- **26 (checkout):** the drawer mirrors `shippingCost`'s free-above rule and leaves the charge to checkout; if checkout's rule changes (rates, `rateType`), update `cartDelivery.js` too. See the tax-inclusive note above.
- **29 (copy):** the drawer's strings are in `CartDrawer.js`: "Your cart", "N item(s)", "Close cart", "Add ₹X more for free delivery", "Free delivery unlocked", "Remove", "Decrease quantity" / "Increase quantity", "Quantity, …", "No more stock available", "Line total", "Our promises" and its three labels, "Subtotal", "Delivery", "Calculated at checkout", "Free", "free above ₹Y", "Taxes calculated at checkout", "Checkout", "Continue shopping", "Your cart is empty.", "Pieces you add will wait here until you are ready to check out.", "Browse furniture".
- **30 (motion):** values in §28.5.
- **31 (a11y):** the dialog is described by the count; the stepper uses `aria-disabled`; folding lines are `inert`; the empty message takes focus after the last removal. Screen readers are still to test.
- **32 (performance):** the drawer adds one settings and one shipping read on its first opening; the footer and the home strip read the same data (a shared cache is a candidate).

### Needs client confirmation

- **Free delivery:** the ₹9,999 threshold and the ₹499 Standard rate (Prompt 05's placeholders) now drive the cart's "Add ₹X more for free delivery" and "₹499.00 · free above ₹9,999.00".
- **COD in the cart** while orders above ₹50,000 cannot use it (above).
- **Copy:** "Pieces you add will wait here until you are ready to check out." (new), and "Easy returns · 7 days" (the placeholder window).

---

## Prompt 19 — Special Offers

**Date:** 2026-10-08. **Result:** `/special-offers` is now a calm editorial page on paper. It opens with the admin's tag, title and subtitle in a serif header with the countdown as one hairline row (only when the config runs a timer). The coupons are hairline tickets with a notched stub, the terms, the code as an ink pill and a "Copy code" button. The deal of the day and the grid use the storefront `ProductCard`, with "You save ₹X" under each deal card, and the grid is filtered by a row of `.sf-chip` toggles. It has honest states for every case, including a new "Try again" panel when the read fails. Every selection, countdown and copy rule is the boilerplate's, moved unchanged (verified byte for byte), and Admin → Special Offers still controls all of it. Reference: `prompts/DESIGN_SYSTEM.md` §29.

### What changed

| File | Change |
|---|---|
| `src/pages/SpecialOffers/SpecialOffers.js` | Rewritten (746 → 853 lines, with the header comment). Kept byte for byte (a script compared them with `HEAD`): the `useDealsConfig()` read and `enabled`, the `featuredCoupons`, `discountedProducts`, `dealOfTheDay`, `gridProducts`, `dealCategories` and `filteredProducts` memos, the fallback-to-"all" effect, `handleToggleWishlist`, and the `showCountdown` / `timerEnded` expressions (now inside `OfferCountdown`, reading the same `config.timer`). The fetch effect is the same apart from two `setFetchError` lines and an `attempt` dependency (the new retry). `handleAddToCart` now takes the card's `buildCartItem(product)`, so the call is still `addToCart(buildCartItem(product), 1)`. `handleCopyCode` keeps `copyToClipboard` and the 2s state (see deviations). Removed: the private `ProductCard`, `StarRating` and `CategoryTabs`, `useTheme` / `isDarkMode` and `.dark` (the tokens flip by themselves), `useNavigate` (links instead of click handlers), `categoryMap`, `truncateText`, `onImageError`, the `placehold.co` fallbacks, the spinner, the emoji, the page fade and the second timer beside "Deal of the Day". New: the hero, `OfferCountdown`, the tickets, `CategoryChips`, the skeletons and states, the error panel with retry. |
| `src/pages/SpecialOffers/SpecialOffers.module.css` | Rewritten (1,228 → 781 lines), tokens only: 142 hex, 36 `rgba()` and 21 gradients → 0. No z-index and no font names (`font-family` only through `var(--sf-font-*)`). The JS lost its 8 HTML entities (stars, emoji, arrows) and its 2 `placehold.co` URLs (the card handles fallbacks). |
| New `src/pages/SpecialOffers/offersData.js` | The page's rules, moved unchanged from `SpecialOffers.js` (byte for byte, `export` added): `rupees`, `formatExpiry`, `couponHeadline`, `isCouponValid`, `pickByIds`, `pad`, `computeCountdown`, `useDealsCountdown`. New: `timeLeftLabel` (the timer's accessible name) and `chipContexts` (repeated chip names). |
| New tests | `offersData.test.js` (14) and `SpecialOffers.test.js` (33), the page against the real `DealsConfigProvider` with only the network, cart and wishlist stubbed. |
| `scripts/check-contrast.js` | Two ticket pairs and one informational row (§29.8). |
| `prompts/DESIGN_SYSTEM.md` | New §29 "Special offers". |

Nothing else changed: `src/utils/dealsConfig.js`, `DealsConfigContext.js`, the deals gating in `Header` / `MegaMenu` / `SidebarMenu` / `Footer`, `ProductCard` / `PriceBlock` / `StarRating`, `api.js`, `helpers.js`, `db.json` (SHA-256 unchanged) and every admin file are untouched.

### The page

- **Hero:** `config.hero.tag` as the eyebrow (with the caramel rule), `config.hero.title` as the `h1` in the display serif at display-xl (plain: admin text cannot carry an accent word), `config.hero.subtitle` at 17px. Rendered as given; the old "Special Offers & Deals" fallback stays for an empty title. Paper, no gradient.
- **Countdown:** one row between hairlines, "Offers end in" beside three Playfair figures (28px, lining, tabular) over eyebrow units, colons muted; on phones the clock wraps under the label. The ended note ("This round of offers has ended. Prices shown are current.") takes the row when a fixed end has passed with `onExpiry: "hide"`; with the timer off there is no row.
- **Tickets** ("Codes to use at *checkout*."): one column, two from 768px. Surface, hairline, a stub with the value (serif 32px) over an "off" eyebrow, a hairline with a notch at each end, then the description, "Min order ₹X" / "No minimum order" (· "Up to ₹Y off"), "Expires d MMM yyyy" / "No expiry", the code as an ink `.sf-chip--selected` pill (uppercase tracked sans) and a ghost "Copy code" that turns "Copied" in the success tone. No codes: "No codes right now.".
- **Deal of the day:** three storefront cards (one column below 640px, where the 4:5 photograph takes the full width) and "You save ₹X" under each from the old math (`originalPrice − sellingPrice`), in the discount tone.
- **All offers** ("{n} pieces on *offer*."): the chip row over the grid (three columns from 1024px, two below), `AnimatePresence mode="popLayout"` kept.

### The timer's `aria` approach

- The row is `role="timer"`. Its accessible name is `timeLeftLabel(parts)`: "Offers end in 5 hours and 12 minutes", "Offers end in 12 minutes", "Offers end in less than a minute". It is built from hours and minutes only, so the string, and with it the DOM attribute (React writes it only when it changes), changes at most once a minute while the figures tick every second. A test runs the clock for 125 seconds: the seconds change 125 times, the name twice.
- The visible label, the figures and the units are `aria-hidden`, so a screen reader reaches one node and hears one sentence, never "zero three colon five three…".
- `role="timer"` is `aria-live="off"` by definition: nothing is announced on its own (no chatter); the summary is read when the user reaches the row.
- The once-a-second tick lives in `OfferCountdown`, so it re-renders only that row (the old page re-rendered every card every second).

### Decisions

- **Rules in a module.** The four rule functions and the coupon helpers moved to `offersData.js` unchanged, next to the page, so they are tested on their own (the `homeData.js` / `searchData.js` / `cartDelivery.js` pattern).
- **Chips:** one row that scrolls sideways at every width (no scrollbar, no fades): to the screen's edges on phones, inside the content edges from 768px. `scrollIntoView` runs on the pressed chip only, never on load. On pointer screens from 768px, while the row overflows, the product rail's two hairline buttons ("Previous categories" / "Next categories") page it; they appear at 1024px with the seeded grid and not at 1440px, where the row fits.
- **Repeated category names** (the automatic grid has seven pairs, such as "High-Back Chairs" under Essentials and under Premium) name their parent: "High-Back Chairs · Essentials". Display only.
- **Filter status:** a visually hidden polite status says what the grid shows ("Showing 1 piece in Beds."), since a chip press changes the grid silently otherwise.
- **Copy feedback:** the button keeps its name ("Copy coupon code X") and changes its text; a visually hidden polite status says "Code X copied.". The button is at least 8.5rem wide, so the change moves nothing.
- **Skeleton counts** follow the admin's selection (two tickets, three deal cards, eight grid cards for the seed), so the loaded page lands where the skeletons were.
- **No page fade and no hero entrance:** the `h1` is the page's largest paint. Tickets and deal cards reveal as they scroll in; the grid reveals once.
- **Copy:** "Codes to use at *checkout*." (eyebrow "Coupons", intro "Copy a code here, then enter it at checkout."), "Deal of the *day*." (eyebrow "Today"), "{n} pieces on *offer*." (eyebrow "All offers"), "Offers end in", "This round of offers has ended. Prices shown are current.", "No codes right now.", "No offers at the moment." / "The full collection is open as usual." / "Browse all furniture", "Nothing on offer right now." / "No pieces are reduced just now[, but the codes above still apply at checkout].", "We couldn't load the offers." / "Please check your connection and try again." / "Try again".

### Deviations from the prompt, and why

1. **`offersData.js`** is a new file beside the page (the scope names the page's two files). The prompt's "move … unchanged" is honoured literally; the move makes the rules testable.
2. **The copy timer restarts.** The old `setTimeout` was never cleared, so copying a second code within two seconds could clear its "Copied" early, and a timer could fire after the page had gone. Each copy now restarts the two seconds, and the timer is cleared on unmount. The two seconds and `copyToClipboard` are unchanged.
3. **A failed copy is said** (new). `copyToClipboard` returns false on an insecure page or a denied permission; the old page then did nothing. The button now reads "Couldn't copy" for two seconds, the status says "Couldn't copy. The code is X.", and the code is left selected for copying by hand (`user-select: all` also makes one click select it).
4. **The row buttons** on pointer screens: the prompt describes a scrollable row and no fades. Without buttons a mouse user at 1024px could reach the hidden chips only by Tab or a sideways wheel, so the old buttons stay, restyled as the rail's.
5. **Two-column tickets from 768px** and a three-column deal of the day from 640px: the prompt names the mobile and desktop columns; these are the in-between choices.
6. **The data read still starts alongside the config read** (the context's default config is enabled), as before: an enabled page loads in one round trip, and when the config says "off" that read is dropped. The old comment ("only when the page is actually enabled") described the intent; the tests now pin the actual behaviour.
7. **The second timer is gone:** the old "Deal of the Day" title repeated the countdown; one countdown, in the hero, keeps the page calm.
8. **The page no longer scrolls itself on load.** The old tab bar called `scrollIntoView` on mount, which scrolled the window down to it on every visit (measured on the baseline build: to 1729px at 360px wide and 785px at 1440px; the new page stays at 0). A press is now the only trigger.
9. **Focus after "Try again"** (new, with the error state): it moves to the codes section when the read succeeds and back to the button when it fails again, so it is never dropped with the panel.

### Verification

- **Build:** `npm run build` prints "Compiled successfully" with no warnings (default build: JS 415.66 kB, CSS 56.24 kB gzip). Mock-mode production builds against `HEAD` built the same way: JS 420.17 → 420.93 kB (+0.76), CSS 57.09 → 56.24 kB (−0.85).
- **Tests:** `CI=true npm test -- --passWithNoTests` runs 612 tests in 46 suites (565 + 47), exit 0, no React warnings (twice in a row). One earlier full run, right after the mutation run, failed `BottomNav.test.js` › "focus comes back to Search" once; it passed 5 / 5 alone and in both later full runs (see "Pre-existing issues").
- **Byte-identical logic:** a script extracted 18 blocks from `HEAD`'s `SpecialOffers.js` (the eight moved functions, the six memos, the fallback effect, `handleToggleWishlist`, the config read, the countdown flags) and found each identical in the new files; the fetch effect is identical apart from the two `setFetchError` lines and the `attempt` dependency.
- **Mutation check:** after a passing control run, 41 seeded faults, each caught by named tests (none by a compile error); both files restored byte for byte (SHA-256). The faults: coupon expiry, exhaustion (`>=` → `>`) and activity ignored; the admin's order lost; "hide" never ending; a one-minute tick; seconds in the timer's name; every chip naming its parent; "%" dropped; paise in the minimum; featured coupons skipping validity; the discount sort reversed; four deals of the day; the admin's grid ignored; chips for every category; chips not filtering; no fallback to All; one second of "Copied"; the copy timer not restarted; no selection on a failed copy; the cart call without quantity 1; the saving reversed; the figures exposed to assistive technology; no ended note; a timer shown while switched off; chips without `aria-pressed`; no `scrollIntoView`; a failed read shown as empty; "Try again" not reading again; focus lost after it; the switched-off page showing offers; the copy status not a live region; repeated chip names not told apart; the timer without its role; no config skeleton; the title fallback lost; the empty line ignoring the codes; the filter status not updated; skeletons ignoring the admin's counts; "Up to" on fixed coupons; "No expiry" lost.
- **Static:** a grep of the three sources finds no hex, `rgb()`, `hsl()`, gradient, font name, `placehold.co`, z-index, emoji or HTML entity, and none of "unbeatable", "don't miss", "hurry", "selling fast", "limited time". ESLint is clean on the sources; the test file has 6 testing-library findings (two `closest()` checks for `aria-busy`, which has no role, and four `act()` wrappers that flush the clipboard promise under exact fake-timer control), within the comparable suites' 3–17. `node scripts/check-contrast.js` passes (two new pairs, one info row); `node scripts/validate-db.js` passes; `db.json` SHA-256 unchanged (QA ran on a scratch copy through `JSON_SERVER_DB`, compared equal to the repo's in every collection afterwards).
- **Browser QA** (Playwright + Chromium; JSON Server on the scratch copy; dev server and mock-mode production build): 54 scripted checks pass on the final mock-mode production build (40 interaction checks and the 14-check admin round trip; both also ran on the dev server while the page was built), plus the ten states below.
  - **Copy and checkout:** "Copy coupon code WELCOME500" puts "WELCOME500" on the clipboard, reads "Copied" in `#2f6b46` (`#7fbf95` in dark mode, the success token) for 2s with the status line; a quick add of the Wooden Sofa Set from the deal of the day opens the cart drawer with it; at `/checkout` the pasted code applies: "✓ WELCOME500 applied (-₹500.00)".
  - **Chips** (360px, touch): pressing "Sofas" scrolls the row (0 → 817px) until the chip is fully in view, filters the grid to the Nilkamal Plastic Sofa Set, says "Showing 1 piece in Sofas.", and the window does not jump. Back to All, entering cards rise (transforms sampled per frame); under reduced motion every sampled transform is `none` and the scroll is instant.
  - **Keyboard** (1024px): 40 Tab stops from the codes section (two copy buttons, three deal cards × 3, nine chips, the two row buttons, the grid cards): every stop shows a ring and is scrolled into view below the header; Enter presses a chip and Space leaves it pressed; Enter copies. Screenshots: the rings on a copy button and a pressed chip are complete (the row's padding keeps them).
  - **Row buttons:** at 1024px "Previous" starts unavailable, one "Next" reaches the end, "Previous" returns; 44 × 44px; none at 1440px (the row fits) or on touch.
  - **States** (request interception, the DB untouched): config loading, data loading, failed read, nothing on offer (with and without codes), switched off (no `a[href="/special-offers"]` anywhere), and the timer with no end date, a future end ("77 hours and 6 minutes" three days out), a past end with "hide" (the note), a past end with "endOfDay" (end of today) and the timer off.
  - **Admin round trip** (14 checks, the real Admin → Special Offers on the scratch DB): the master switch off shows "No offers at the moment." and removes every Offers link from the header, sidebar and footer, and on brings them back; "Ends at" two days out counts to it ("50 hours and 59 minutes"); a past end with "Hide the timer" shows the note; the timer switch off removes the row; an empty end date counts to the end of today; removing FLAT10 from Featured Coupons leaves WELCOME500 alone; moving the armchair up reorders the deal of the day. The config was then restored exactly.
  - **Widths and modes** (360, 768, 1024, 1440; light and dark; production build): no horizontal overflow, clean consoles; the tickets, the countdown and the grid as designed (screenshots); the card's "+" disc on touch.
  - **CLS** (cold load, the config delayed 400ms and the data 900ms): with web fonts blocked 0 at 360, 768 and 1440px, so the skeletons hold the loaded layout exactly. With fonts: 0.0013 / 0.0024 / 0.0004 at 360 / 768 / 1440px, all from Playfair's italic arriving late (the accent word "checkout" moves 7px); at 1024px both builds record the header's 0.0349 (Prompt 14's note), plus 0.0009 here.
- **Laravel shape:** a non-mock production build against a stub answering `{ success, data, meta }`: the same hero, timer, codes (WELCOME500, FLAT10), deal of the day, eight-card grid and chips, the copy button working, no console errors. The stub saw `/products` and `/coupons` once, `/categories` three times (the page, the header and the footer) and `/deals/config` twice (the provider's first read and its refetch when the window took focus), all unwrapped by `extractData`.
- **Admin parity:** 20 screenshots (login, dashboard, Special Offers, Coupons, Products; 1440 and 390px; light and dark) of the baseline build and this one: 20 / 20 pixel-identical. No admin file, and nothing the admin imports, changed.

### Pre-existing issues noticed (not changed)

- **`DEFAULT_DEALS_HERO`** in `src/utils/dealsConfig.js` (a file every prompt leaves alone) still says "Limited Time" / "Discover unbeatable prices on top products. New deals drop daily — don't miss out!". `normalizeDealsConfig` uses it when the API returns a config without a `hero` (an older `db.json`, a Laravel record never saved), and the page renders admin text as given. The seeded config is calm; Prompt 29 or the client should reword the defaults, or the admin should always save a hero.
- **Expiry dates read a day late in India.** The seeded coupons expire at `23:59:59Z`, which is 05:29 IST the next morning, so an Indian browser shows "Expires 1 Apr 2027" for WELCOME500 (UTC shows 31 Mar). The instant is the one checkout enforces; coupons saved through Admin → Coupons (a local `datetime-local`) do not have this. A data note for Prompt 34.
- **A failed coupon read looks like "no codes".** `coupons.getActive` returns `[]` on any error (`api.js`), so the page cannot tell a failure from an empty list; products or categories failing still shows the error panel.
- **Help Center** links "Deals & Offers" to `/special-offers` whatever the master switch says (Prompt 28's page); with the page off, it lands on "No offers at the moment.".
- **`BottomNav.test.js` › "focus comes back to Search"** asserts focus synchronously right after `inert` lifts, while the bar restores focus a tick later; under heavy load (right after the mutation run) it failed once. Not changed (Prompt 09/15's test).
- **Web fonts:** the italic face arriving late moves the accent words (CLS 0.0004–0.0024 here); size-adjusted fallbacks are Prompt 32's.
- **The header's "Offers" link can show before the deals config has loaded.** `MegaMenu` shows it when the categories are ready and `enabled` is true, and the context's default config is enabled until the read lands; the footer waits for the read. With the page switched off and a slow config read, the link shows briefly (seen with the config held back 6s). Prompt 07's gating, left alone as briefed.

### Notes for later prompts

- **29 (copy):** the page's strings are in `SpecialOffers.js` (listed under "Decisions"). The hero copy is the admin's (`dealsConfig.hero`), not the code's.
- **30 (motion):** values in §29.7: the ticket and deal-card reveals, the grid's popLayout (8px rise over `--sf-duration`, 40ms stagger for eight, exits over `--sf-duration-fast`), smooth chip scrolling, opacity-only under reduced motion.
- **31 (a11y):** (1) The copy buttons' visible "Copy code" is not a contiguous part of their name "Copy coupon code X" (as briefed; weigh WCAG 2.5.3, e.g. "Copy code X"). (2) The figures change every second: auto-updating content under WCAG 2.2.2 that runs in parallel with the page. The prompt asked for HH : MM : SS; a pause control, or minutes only, would meet 2.2.2 outright. Assistive technology is not affected (see the timer's approach). (3) Lists with `list-style: none` lose their semantics in Safari site-wide. (4) Screen readers (NVDA, VoiceOver) were not available here.
- **32 (performance):** the page reads the whole catalogue to pick its offers (unchanged); the data read starts alongside the config read; the countdown's tick re-renders only its row.
- **34 (QA):** the IST expiry dates above.

### Needs client confirmation

- **Hero copy** in the admin-managed deals config (Prompt 05's seed, rendered as given): "This week" / "Offers on pieces we love" / "A short list of chairs, tables and sofas at a lower price for now, plus codes you can use at checkout.".
- **The page's own copy:** "This round of offers has ended. Prices shown are current.", "No offers at the moment." / "The full collection is open as usual.", "Nothing on offer right now.", "No codes right now.", and the section titles.
- **The ticking seconds:** the countdown shows HH : MM : SS as briefed; minutes only would be calmer (and settle WCAG 2.2.2).
- **The default hero copy** in `dealsConfig.js` (above), shown only if a config ever arrives without a hero.

---

## Prompt 20 — Auth modal

**Date:** 2026-10-08. **Result:** the boilerplate's indigo sign-in modal (a blurred black veil at `z-index: 9999`, a segmented pill switcher, icon-prefixed grey inputs, an indigo button that lifted on hover, disabled "Soon" Google and Facebook buttons, a full-height phone sheet) is now a calm paper dialog: the logo, a serif "Welcome back" / "Create your account" with one line on what an account is for, two eyebrow tabs on a hairline with a sliding 1px ink underline, labelled 48px fields with the right autocomplete and inputmode, a quiet four-segment strength meter, messages on their semantic tints just above an ink button, and a bottom sheet up to 640px. It is a real modal dialog now: named and described, focus in (the first field) and back out (to the opener), Tab kept inside, a keyboard tablist, errors marked on the fields and announced. Every flow, rule, message and timer is the boilerplate's; the request code is unchanged (checked byte for byte). Reference: `prompts/DESIGN_SYSTEM.md` §30.

### What changed

| File | Change |
|---|---|
| `src/components/AuthModal/AuthModal.js` | Rewritten (858 → 1,116 lines, with the header comment). Kept byte for byte (a script compared them with `HEAD`): `validateLogin`, `validateSignup`, `handleLoginChange`, `handleSignupChange`, `handleForgotPassword`, the `defaultTab` sync effect, the `login({ email, password, remember })` and `register({ …, phone: "+91…", confirmPassword })` calls, their failure branches and fallback messages, what the two timers do, the terms checkbox handler and the strength score with its thresholds and labels (its return values lost their colours). The delays are the named constants `CLOSE_AFTER_SIGN_IN_MS` (1500) and `SWITCH_AFTER_SIGN_UP_MS` (1800). Removed: the 11 inline SVG icons (Google and Facebook in brand colours among them), the social row and its divider, `useTheme` / `isDarkMode` and the `.light` / `.dark` classes (the tokens flip by themselves), the `isMobile` resize listener (CSS switches to the sheet), the springs and the horizontal tab slide, the hand-rolled scroll lock and Escape listener. New: the portal at `--sf-z-modal`, `useFocusTrap` + `useBodyScrollLock`, the tablist, visible labels with hints, `aria-invalid` / `aria-describedby`, the live regions, the Show / Hide text buttons, focus to the first field that needs attention, the busy state, the close on a route change. |
| `src/components/AuthModal/AuthModal.module.css` | Rewritten (762 → 390 lines), tokens only: 44 hex and 25 `rgba()` lines and the 31 `--auth-*` aliases per mode → 0 (the JS lost its 5 SVG brand colours); no blur, gradient or font name; z-index only `--sf-z-modal` (and a local `1` for the close button inside the dialog). |
| New `src/components/AuthModal/AuthModal.test.js` | 35 tests against the real `AuthProvider` (only the network and the toasts are stubbed). |
| `scripts/check-contrast.js` | Three pairs: the error, success and info lines on their tints over the page tone (DESIGN_SYSTEM §30.8). |
| `prompts/DESIGN_SYSTEM.md` | New §30 "Auth modal"; the §9 `--sf-z-modal` row and the §19.1 / §19.5 notes now include the dialog. |

Nothing else changed: `AuthContext.js` (login, register, the toasts and the storage policy), `authStorage.js`, `Header.js` and every other opener, `api.js`, `db.json` (SHA-256 unchanged; QA ran on a scratch copy through `JSON_SERVER_DB`) and every admin file are untouched.

### Decisions

- **Dialog wiring is the cart drawer's** (Prompt 18's note): a portal on `<body>`, `useFocusTrap` with `initialFocusRef` (the active form's first field) and `onEscape`, `useBodyScrollLock`, the overlay token, and the close on a route change underneath (back, forward), as the sidebar, search and cart do. The layer moved from `z-index: 9999` to `--sf-z-modal` (1100), as Prompts 06 and 15 asked: below the search overlay and SweetAlert. A side effect, intended: AuthContext's toasts ("Welcome John Doe", "Login Failed") now show above the dialog; under the old 9999 overlay they were hidden behind it.
- **The dialog is the page tone** (`--sf-color-bg`, like the drawers and sheets), so the fields (`--sf-color-surface`) stand slightly forward of it in both modes.
- **Named by its heading, described by its line.** `aria-label="Authentication"` became `aria-labelledby` the heading ("Welcome back" / "Create your account") and `aria-describedby` the line under it, so a screen reader hears what the dialog is for before the first field.
- **The subtitle.** `brandContent.js` has no line about accounts, so the prompt's own line is used for Sign in: "Sign in to track orders and save your wishlist across devices."; Create account gets its twin, "Create an account to track orders and save your wishlist across devices." (a "Sign in…" line under "Create your account" would contradict the heading). Both name only what an account really does here: `/orders` needs one, and the wishlist is mirrored to the account (`WishlistContext`), which the wishlist page's guest banner already says.
- **Labels and copy.** Tabs and buttons "Sign in" / "Create account" (the labels the header, sidebar and bottom bar use since Prompts 07 and 09); fields "Email address", "Password", "First name", "Last name", "Mobile number (optional)", "Confirm password"; the two success lines lost their exclamation marks: "Welcome back. Signing you in…" and "Account created. Taking you to sign in…" (were "Welcome back! Signing you in..." / "Account created! Redirecting to login..."). The validation messages, the fallbacks and the forgot-password note are unchanged, word for word. The "John" / "Doe" / "9876543210" placeholders are gone; the email fields show `name@example.com` (the newsletter's).
- **Messages sit above the button**, in two live slots that are always in the DOM (`role="alert"` for the request's error, `role="status"` for the info or success line). On a phone the error from a long sign-up form then appears where the finger is, instead of at the top of a scrolled sheet, and the slots are announced reliably because they exist before their text arrives.
- **A failed submit moves focus to the first field with a message** (form order), which then reads its message through `aria-describedby`. When that field already had focus (Enter pressed in it, or a click in Safari, where buttons do not take focus), the move would be silent, so the dialog's visually hidden status line says the message instead; it clears after 5 seconds, so a fixed error is not left behind in it. Inline errors themselves are not live regions: seven alerts at once would be noise.
- **Busy, not disabled.** While the request runs and while the success line waits for its timer, the button is `aria-disabled` (with `data-busy`: full ink, a `progress` cursor) rather than `disabled`, so keyboard focus stays on it; further submits are ignored. The old button became `disabled` only during the request and enabled again during the 1.5s success wait, when a second press sent a second login.
- **Opening shows the tab asked for, every time.** The old dialog synced the tab only when `defaultTab` changed, so a tab switched inside the dialog survived to the next opening ("Sign in" in the header could open on Create account). The tab is now reset on opening, together with the messages (as before) and the password visibility (new: a password left on "Show" no longer reopens in plain text). A new `defaultTab` while open still switches the form.
- **Focus after a switch made from inside a form** ("Create an account" / "Sign in" under the button) goes to the other form's first field; after an account is created, to the password on Sign in, the one field left to fill. Switching with the tabs keeps focus on the tab (the APG pattern).
- **Focus back to an inert opener.** The bottom bar's Account button (the guest sign-in on phones) is inert while any overlay holds the scroll lock, so `useFocusTrap`'s return could not focus it and focus fell to `<body>`. The dialog keeps the opener and retries for a few frames until the bar lets go, unless focus has gone elsewhere on purpose. `useFocusTrap` itself is unchanged.
- **Tabs:** two equal halves on the `.sf-tabs` hairline, automatic activation (arrows select; the panels are cheap), and the old sliding indicator kept as the 1px ink underline, which slides with a transform. The forms cross-fade (`mode="wait"`); the panel fading out is `inert`.
- **Bottom sheet motion is the dialog's** fade and 8px rise (as briefed), not the shared sheet's 100% slide; the CSS alone switches the layout at 640px, so the `isMobile` resize listener is gone.
- **The tab panels both have ids, but only the active one is rendered**; the inactive tab's `aria-controls` points at a panel that is not in the DOM, which ARIA and axe accept for an unselected tab.

### Deviations from the prompt, and why

1. **Logo at 56px, not 36px.** DESIGN_SYSTEM §10 (Prompt 01) sets 56px as the auth modal's minimum, and at 36px the wordmark and the tagline in the artwork blur into a smudge; at 56px both are legible and the logo matches the header's weight. The dialog is 20px taller. Same precedent as Prompt 15 (its logo followed §10's minimum over the prompt's figure).
2. **Show / Hide has no `aria-pressed`.** The brief asks for a text button "Show"/"Hide" with `aria-pressed`; the three cannot all hold. A toggle button must keep its label when pressed (WAI-ARIA APG), so either the visible text stays "Show" (against the brief) or the name stays "Show password" while the button reads "Hide", which fails WCAG 2.5.3 Label in Name (Level A) for voice-control users. The button's name follows its text instead ("Show password" / "Hide password"), with `aria-controls` on the field, and the dialog's status line says "Password shown." / "Password hidden." (the GOV.UK password-input pattern). It is focusable, as briefed.
3. **A second subtitle** for Create account (above).
4. **Additions:** the close on a route change, the inert-opener retry, the status line (validation fallback and Show / Hide), opening on the asked-for tab, hiding passwords on reopening, the busy state during the success wait, hints ("At least 6 characters.", "10 digits, without +91 or 0."), "(optional)" on the phone, `required` on the required fields, `autocapitalize` / `autocorrect` / `spellcheck` on the email and password fields, and "Opens in a new tab" on the terms links (a hidden description, so the checkbox's own name stays the sentence).
5. **No field got `inputmode="numeric"`:** there is no code or PIN field; the phone takes `tel` (with `type="tel"`, `tel-national`).
6. **Files beyond the two in scope:** the test file, three contrast pairs in `scripts/check-contrast.js` (§15 asks for them) and DESIGN_SYSTEM §30.

### Verification

- **Build:** `npm run build` prints "Compiled successfully" with no warnings (also the mock-mode and Laravel-mode builds). Gzip against `HEAD` built the same way: JS 415.66 → 415.63 kB, CSS 56.24 → 55.13 kB (−1.11); mock-mode builds JS 420.93 → 420.88 kB, CSS 56.24 → 55.13 kB.
- **Tests:** `CI=true npm test -- --passWithNoTests` runs 647 tests in 47 suites (612 + 35), exit 0, no React or act warnings; five sequential full runs passed. The first full run, right after the mutation run, failed one test (its output was not kept); with two full runs started at once, the one failure is `SpecialOffers.test.js` › "a second failure keeps focus on Try again" (see "Pre-existing issues"), which renders no part of the dialog.
- **Mutation check:** 59 faults seeded into `AuthModal.js` one at a time, each against the new suite, the file restored byte for byte after every run (SHA-256 checked). The first pass caught 58; the miss (the strength score's 10-character point moved to 8) was a weak test, whose cases jumped from 7 to 10 characters; 8- and 9-character cases were added and it is caught now. The faults covered: `remember` dropped; the `+91` prefix dropped and the spaces kept; both delays; the email not filled in; a validation message, the phone rule, the password minimum and the terms rule; a strength threshold, label and the meter's score; the focus trap off, the wrong first field, Escape ignored, the page not locked; the tablist (arrows, `aria-selected`, roving tabindex, `aria-controls`); `aria-invalid` and the error description dropped; the alert and status roles dropped; the support link and the forgot-password text changed; a second submit allowed, the busy state and its label lost; Show / Hide not revealing, not announced, left on after reopening; the tab not reset on opening, the `defaultTab` sync removed; the route-change close, the inert-opener retry, the focus after a form switch and after sign-up removed; errors kept across tabs; the focused-field announcement and its clearing removed; focus not sent to the first field with a message, the field order wrong; `inputmode`, `tel-national`, the new-tab links and their note; the overlay and the close button not closing; the 36px logo; the values cleared on a failure; the success copy with an exclamation mark; the sign-up form kept after the switch; Remember me not wired; the dialog unnamed or not modal; the subtitle and the phone hint changed.
- **The logic that had to stay:** a script cut `validateLogin`, `validateSignup`, `handleLoginChange`, `handleSignupChange`, `handleForgotPassword` and the `defaultTab` effect out of `HEAD` and of the new file (identical), and found eleven more snippets unchanged in both (the `login` and `register` calls with their payloads, both failure branches and both `catch` blocks with their fallback messages, what each timer does, the terms handler, the strength score), plus the two delays and the four strength labels.
- **Static:** a grep of the two sources finds no hex, `rgb()`, `hsl()`, gradient or font name (`font-family` only through `var(--sf-font-sans)`); z-index only `--sf-z-modal` (and a local `1`); system colours only in the forced-colours block; no exclamation mark in any string. ESLint (the project's config) is clean on the component and on the test file. `node scripts/check-contrast.js` passes (three new pairs, all ≥ 5.40 : 1); `node scripts/validate-db.js` passes; `db.json` SHA-256 unchanged.
- **Browser QA** (Playwright + Chromium; JSON Server on a scratch copy of `db.json`; mock-mode production build): 176 scripted checks pass, console clean.
  - **At 360, 768, 1024 and 1440px, light and dark** (opened from the bottom bar's Account up to 768px, the header's account button above): named "Welcome back"; the page tone (`rgb(250, 247, 242)` / `rgb(10, 20, 38)`); z 1100 and on top at its centre; the overlay `rgba(11, 31, 63, 0.6)` / `rgba(3, 8, 18, 0.7)` with no blur; the light or white logo at 56px; focus in Email address; the page locked; no horizontal overflow; fields 48px, every other control ≥ 44px; at 360 a full-width sheet flush with the bottom, 8px top corners, the overlay showing above it; from 768 a centred 480px dialog with 4px corners and a hairline; the bottom bar `inert` beneath (≤ 768); Escape closes, the page unlocks and focus is back on the opener, the bottom bar's Account included (the inert-opener retry).
  - **Openers:** the wishlist banner's "Log In" (focus back on it), checkout step 0's "Log In / Sign Up" and "Login to Continue" (focus back), the sidebar's "Create account" (the sign-up tab, focus in First name, focus back on the hamburger) and "Sign in".
  - **Flows:** empty sign-in (message, focus on Email address), a malformed email, a wrong password (the alert, values kept); "Forgot password?" → the info line → "Contact support" lands on `/support` and closes; signing in closes the dialog 1.5s after the success line (measured); without Remember me `user` and `token` are in `sessionStorage` only, a reload keeps the session and a new tab is signed out; with it they are in `localStorage` and a new tab is signed in; empty sign-up (six messages, focus on First name); a taken email (the alert); a new account: the switch 1.8s later with the email filled in and focus on Password, the row stored with `phone: "+919876543210"`, and the new account signs in.
  - **Keyboard:** 14 Tabs never leave the dialog and every stop shows its focus style; the order is Email address → Password → Show password → Remember me → Forgot password? → Sign in → Create an account → Close → the Sign in tab → Email address; Shift+Tab from Close wraps to the last control; ArrowRight / ArrowLeft move and select the tabs; screenshots of the rings on the tab, Show and Close.
  - **Motion:** the dialog rises from 8px and fades in; under reduced motion no frame has a transform and it still fades.
  - **Accessibility tree** (Playwright ARIA snapshot): dialog "Welcome back" › Close, heading level 2, the line, tablist "Sign in or create an account" (tab "Sign in" selected, tab "Create account"), tabpanel "Sign in" with textbox "Email address", textbox "Password", button "Show password", checkbox "Remember me", button "Forgot password?", the alert and status slots, button "Sign in", "New here?" with button "Create an account", and the status line. NVDA and VoiceOver were not available here.
- **axe-core 4.7** (from `node_modules`, run on the open dialog in Chromium): 0 violations in 20 states (light and dark, 360 and 1440px; Sign in, its errors, the info line, Create account with the meter, its errors). It left the subtitle and the info line for manual contrast review (`elmPartiallyObscuring`: it could not resolve their backgrounds, though nothing is stacked above them); both pairs are measured by the contrast script (secondary text on the page tone, 8.69 / 10.90; info on its tint, 5.95 / 6.49).
- **Laravel shape:** a non-mock production build against a stub answering `{ success, data }` (and Laravel's 401 / 422 bodies), proxying the rest of the catalogue: 9 checks pass, no page errors. Laravel's "These credentials do not match our records." and "The email has already been taken." reach the alert line; Remember me puts `laravel-token-1` in `localStorage`, without it the token is in `sessionStorage`; the user stored has no password. The stub saw `remember: false` / `true` on `/auth/login`, `phone: "+919123456789"` and `password_confirmation` on `/auth/register` (`api.js`'s mapping, unchanged), and the bearer token on `/auth/logout`.
- **Admin parity:** 20 screenshots (login, dashboard, Products, Users, Settings; 1440 and 390px; light and dark), twice, against two runs of the baseline build (the scratch database reset to the repository's first). 18 and 19 of 20 are byte-identical. The rest differ by at most 1/255 on a few dozen anti-aliased pixels: the light dashboard at 1440 on the rounded corners of its stat cards (a further check: one run of this build is pixel-identical to the baseline while two runs of this build differ from each other on those pixels), and the dark Products list on 6 thumbnail-edge pixels (the two baseline runs differ from each other there by 16). No admin file, and nothing the admin imports, changed: the dialog is mounted only by the storefront header.

### Pre-existing issues noticed (not changed)

- **The toasts repeat the dialog's error, and cover the sheet's button on phones.** AuthContext fires "Login Failed" / "Registration Failed" toasts (bottom-end, 3s) with the same text as the dialog's alert line; now that the dialog sits below SweetAlert they are visible, and at 360px the toast covers the sheet's submit button until it fades. AuthContext is out of scope here; Prompts 29/30 could drop the failure toasts while the dialog shows the message, or move toasts to the top on phones (Prompt 18 noted the same over the cart drawer).
- **Openers that vanish when you sign in.** The wishlist page's guest banner, checkout step 0's "Log In / Sign Up" prompt and the orders page's "Log In" disappear once you are signed in, so when the dialog closes there is nothing to give focus back to and it lands on `<body>`. The page owners (Prompts 24–26) or Prompt 31 could move focus to the page's next step.
- **Their labels** still say "Log In" / "Log In / Sign Up" (and AuthContext's toast titles "Login Failed", "Login Error"; `api.js`'s "Please log in instead."), against "Sign in" everywhere else (Prompt 29).
- **A load-sensitive test elsewhere:** `SpecialOffers.test.js` › "a second failure keeps focus on Try again" (Prompt 19) waits the default 1s for focus to land on the new "Try again" after a second failed read; with two full test runs at once it timed out (focus still on `<body>`). Sequential runs pass. Not changed here; its owner (or Prompt 34) should make the wait deterministic.
- **Phone formats differ in the data:** seeded users read `+91 9876543210`; accounts created through the dialog store `+919876543210` (the boilerplate's prefix, unchanged).

### Notes for later prompts

- **21 (account):** `Profile.js` still sends guests to `/` (Prompt 08's note); it could open this dialog with `openAuthModal("login")` instead, as the bottom bar does.
- **24–26:** their sign-in prompts open the dialog through `openAuthModal("login")`; see "Openers that vanish" above for focus after signing in.
- **29 (copy):** the dialog's strings are in `AuthModal.js` (`COPY`, the field labels and hints, "Remember me", "Forgot password?", "New here? Create an account", "Already have an account? Sign in", "Close", "Sign in or create an account", "Show" / "Hide", "Password shown." / "Password hidden." (and "Password confirmation …"), "Password strength:", "At least 6 characters.", "10 digits, without +91 or 0.", "Opens in a new tab", the two success lines). The validation messages and the fallbacks are the boilerplate's and still end without a full stop; the toasts are AuthContext's.
- **30 (motion):** values in §30.7.
- **31 (a11y):** the Show / Hide decision (deviation 2); the status line; `inert` on the page behind every overlay is still open (Prompt 15's note); NVDA and VoiceOver were not available here.
- **34 (QA):** the accounts created during QA exist only in the scratch copy of `db.json`; the repository's file was never written.

### Needs client confirmation

- **The two subtitle lines** (above).
- **Social sign-in:** the disabled Google and Facebook buttons are gone. If social sign-in is planned, it needs a backend flow first (OAuth on the Laravel side); the buttons come back as working controls then, not as promises.
- **Password reset:** still none; "Forgot password?" says so and links to `/support`. Confirm that support can reset a password by hand, and whether a self-service reset is planned for the Laravel API.
- **"Remember me"** keeps the session after the browser closes (`localStorage`); without it the session ends with the tab. A hint such as "Stay signed in on this device" could make that explicit.
- **The phone hint** "10 digits, without +91 or 0." The number is stored on the account; nothing here claims what it is used for.
