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
