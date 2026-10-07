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
