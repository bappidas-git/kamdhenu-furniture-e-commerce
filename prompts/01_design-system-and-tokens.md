# Brand design system and theme tokens

**Prompt 1 of 34**

## Depends on

Nothing. This is the first prompt of the build. Every later prompt consumes the tokens and the `prompts/DESIGN_SYSTEM.md` reference you produce here, so precision matters more than speed.

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India (prices in INR, `en-IN`). We are redesigning this Create React App storefront (CRA, React 18, CSS Modules, MUI 5, framer-motion 10, SweetAlert2) into a premium, editorial, warm-minimalist boutique while keeping every feature API-driven through the dual-mode `src/services/api.js` (JSON Server branch and a Laravel branch that returns `{ success, data, meta }`) and `db.json`. The admin panel (`src/pages/Admin/*`, `src/components/AdminLayout/*`) must look and behave exactly as it does today.

Logo assets (use exactly these URLs):

- Light logo, for light backgrounds: `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo.png`
- White logo, for dark backgrounds: `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo-white.png`

## Objective

Replace the boilerplate's purple/blue "futuristic" theme with the A & S Urbanseat design system, expressed entirely as tokens in the files that already exist for that purpose:

1. An exact, restrained palette finalised by sampling the two logo assets, with light and dark surface sets that meet WCAG AA.
2. A typography pairing (editorial display face with a true italic + a highly legible UI sans) with a defined type scale, loaded performantly.
3. Spacing, radius, shadow, motion and z-index scales suited to an editorial, image-forward layout.
4. The two logos wired once as constants and a `BrandLogo` component that always picks the right variant for its background.
5. `prompts/DESIGN_SYSTEM.md`: the reference every later prompt reads for token names, values and usage rules.

This prompt does not redesign any page or component. It changes token values and the theme layer so the existing storefront immediately loses its purple/blue look and gains the brand's surfaces, type and accent, without breaking layout. Components still carrying hardcoded colours will be migrated by their own prompts.

## Brand brief (condensed)

- Identity: premium, soulful, editorial, warm-minimalist. A gallery or boutique feel, never flashy.
- Aesthetic: generous whitespace, large image-forward layouts, a restrained palette, thin hairline rules, understated luxury, calm and confident. No clutter, heavy borders, loud gradients, glassmorphism or neon.
- Palette: not prescribed. Sample the logos (steps below) and build the best-fitting system around them: warm neutral surfaces, a deep ink for text, one brand accent drawn from the logo, and semantic colours (success, warning, error, info, sale). It must sit naturally with the logo on light and dark surfaces.
- Typography: an editorial display serif with a true italic (accent words in headlines are set in italic) and a highly legible sans for UI and body text.
- Motion: subtle, slow, elegant. Gentle fades and reveals, soft hover lifts, refined easing. Honour `prefers-reduced-motion` always.
- Light and dark: `src/context/ThemeContext.js` already provides a persisted light/dark mode (`isDarkMode`, `toggleTheme`, `body.light` / `body.dark` classes, `localStorage` key `theme`). Both modes must be fully designed. Do not add or remove the mode.

## Scope — files and areas to touch

Read these first, then change only what is listed:

- `src/theme/storefront-tokens.css`: the CSS custom properties (`--sf-*`) consumed by storefront CSS Modules. Light values live in `:root`, dark values in `body.dark`. Keep **every existing token name defined** (components depend on them) and remap their values to the new system; add the new tokens listed below.
- `src/theme/colors.js`: `LIGHT` and `DARK` palettes consumed by the storefront MUI theme in `ThemeContext`. Keep the object shape (`primary`, `secondary`, `background`, `text`, `gradient`, `bodyBackground`); set `gradient.*` to flat brand colours (the keys must survive because `ThemeContext` reads them) and document that gradients are no longer used.
- `src/theme/tokens.js`: the JS mirror `TOKENS` (radius, space, breakpoints, tapTarget, containerMax). Update it to mirror the new CSS values and add `type`, `motion` and `container` mirrors. Leave `STOREFRONT_CONFIG`, `TRUST_BADGE_CATALOG` and `resolveTrustBadgeDetail` untouched (Prompt 02 owns that content config).
- `src/context/ThemeContext.js`: the storefront MUI `createTheme` calls. Note a coupling: `<CssBaseline />` in `src/App.js` sits inside this provider but outside the admin's own `ThemeProvider`s, so its global `body` rule (colour, font family, font size/line-height from `typography.body1`, background) is computed from **this** theme and also reaches the admin's `body`. The admin's MUI components set their own fonts and colours from `adminTheme.js`, so in practice nothing visible changes, but this is why the UI sans should stay Inter unless you verify the admin screenshots pixel for pixel after choosing another family. Do not move `CssBaseline`. Update `palette` (from `colors.js`), `typography` (new families, scale, weights, `button.textTransform: "none"`), and `shape.borderRadius`. Strip the boilerplate's gradient button backgrounds, hover `translateY` lifts, glass `backdropFilter` and neon shadows from the `components` overrides and leave neutral defaults; Prompt 06 will write the final component overrides. Keep `isDarkMode`, `toggleTheme`, `useTheme`, `useThemeContext`, the `body.dark`/`body.light` classes and the `localStorage` persistence exactly as they are. Note that `ThemeContext` also sets `document.body.style.backgroundColor` from `colors.js` `background.default`; the new paper and dark-surface values must be the ones you want behind the storefront.
- `src/index.css`: it `@import`s the same Inter stylesheet `public/index.html` already links (a duplicate request): remove the `@import` and keep the HTML `<link>` as the single loader. Keep the existing `body { font-family: "Inter", … }` rule untouched (the admin relies on it) and add `body:not(.admin-area) { font-family: var(--sf-font-sans); }` after it. Keep `.swal2-container { z-index: 2000 !important }`, `* { box-sizing }` and `html { scroll-behavior }` exactly as they are.
- `src/App.css`: (a) delete the legacy `:root` variables (`--primary-gradient`, `--secondary-gradient`, `--dark-bg`, `--light-bg`, `--glass-*`, `--neon-*`, `--text-primary`, `--text-secondary`); a repo grep confirms no CSS module or JS file reads them; (b) delete the unused utility classes and keyframes (`.glass-effect`, `.neon-glow`, `.gradient-text`, `.card-hover`, `.floating`, `.pulse-glow`, `.gradient-animation`, `.hover-scale`, `.loading-spinner`, `.page-transition-*`) after re-confirming with grep that no JS references them; (c) change the hardcoded `.App`, `body.light .App`, `body.dark .App`, `.main-content` backgrounds (`#f5f7fa`, `#0a0e27`) to `var(--sf-color-bg)`; (d) scrollbars and SweetAlert: the admin **inherits** the generic `::-webkit-scrollbar*` structure (8px width, 4px thumb radius), the `body.light` / `body.dark` SweetAlert variables (`--swal2-background`, `--swal2-color`, cancel-button colours, `body.light .swal2-html-container { color }`, toast radius) and wins over them only by source order with its own `body.admin-area*` rules, so **do not edit, re-scope, reorder or delete any existing `::-webkit-scrollbar*`, `body.light …`, `body.dark …` or `body.admin-area …` rule**. Add new storefront rules *after* the existing block, scoped `body:not(.admin-area)…` (for example `body:not(.admin-area)::-webkit-scrollbar-thumb { background: var(--sf-color-border-strong); }`), so the admin keeps the exact cascade it has today. Prompt 06 adds the storefront SweetAlert theme the same way. Keep `* { margin: 0; padding: 0 }` and `body { overflow-x: hidden }` as they are.
- `public/index.html`: only the Google Fonts `<link rel="preconnect">` and stylesheet `<link>` tags, and the `Material Icons` stylesheet link (verified unused: no `material-icons` class anywhere in `src`; remove it). Prompt 02 owns the rest of this file (title, meta, icons, loading screen, pre-paint theme script).
- `src/utils/helpers.js`: `PLACEHOLDER_IMG` is an inline SVG data URI (it cannot read CSS variables). Recolour its fill and text to the new neutral surface and muted text values and label it "Image coming soon". Record the two hex values in `DESIGN_SYSTEM.md` as the only permitted hex literals outside the token files.
- `src/utils/constants.js`: add `LOGO_URLS = { light: "<light url>", white: "<white url>" }` (exact URLs above). Change nothing else here; Prompt 02 rewrites the brand constants.
- New: `src/components/ui/BrandLogo.js` (+ `BrandLogo.module.css`). Props: `variant` (`"auto" | "light" | "white"`, default `"auto"`), `height` (px, default 40), `className`, `priority` (boolean, adds `fetchpriority="high"` and disables lazy loading for the header). In `auto` mode choose by the `onDark` prop or, when omitted, by `useTheme().isDarkMode` (dark mode → white logo). Always render `alt="A & S Urbanseat"`, explicit `width`/`height` derived from the asset ratio (both PNGs are 1286 × 426, ratio ≈ 3.02:1) so it never shifts layout, and `decoding="async"`. Keep the admin out of it: nothing in `src/pages/Admin/*` or `AdminLayout` imports it in this prompt.
- New: `prompts/DESIGN_SYSTEM.md`.

Do not touch: `src/pages/Admin/*`, `src/components/AdminLayout/*`, `src/theme/adminTheme.js`, `src/hooks/useAdminBodyClass.js`, `src/services/*`, `db.json`, `server.js`, any page or component other than the new `BrandLogo` (including `src/components/ErrorBoundary/ErrorBoundary.js`, which wraps the admin too and is owned by Prompt 28), the `body.admin-area` rules in `App.css`, and the `theme` localStorage key and its `"light"`/`"dark"` values (the admin toggle and the pre-paint script share them).

## Brand and design requirements

### 1. Sample the logos before choosing anything

Download both PNGs into a temporary folder outside the repository and sample their opaque pixels (Python with Pillow is fine; `PIL` is available in this environment, and so is ImageMagick `convert`). You should find, in the light logo: a near-black used for the "A&S" lettering and the tagline (expect roughly `#181818`), a deep navy used for the chair silhouette (expect roughly `#001838`–`#082050`), and a warm caramel/tan gradient used for the chair's inner shell and the "Urbanseat" wordmark (expect roughly `#c89058`–`#e0b080`, centred near `#d8b080`). The white logo is a single off-white (`#f8f8f8`) with faint tan edge pixels. Record the sampled values in `DESIGN_SYSTEM.md`. If your sampling disagrees with these expectations, trust the sampling and say so in the build log.

### 2. Palette rules

Build the palette from the sampled colours, then verify every text/background pairing with a contrast checker (write a small script; do not eyeball):

- **Ink** (body text, primary buttons): derived from the logo lettering, near-black with a hint of warmth or navy. Contrast with paper ≥ 12:1.
- **Navy** (deep brand surface: dark footer, dark-mode base, the hero scrim): derived from the chair silhouette. Text on navy uses an off-white (the white logo colour) and a lightened caramel; both must reach AA (4.5:1 for body, 3:1 for ≥ 24px display).
- **Caramel accent**: the logo's tan, used for hairline rules, eyebrows, the italic accent word in headlines (only at display sizes ≥ 24px where 3:1 is enough), hover underlines, focus rings, and selected states. Also define an **accent-text** shade (a darkened caramel, roughly 35–45% lightness) that passes 4.5:1 on paper for small text such as links and "Sale" prices. Never use the raw caramel for small text on white.
- **Warm neutrals**: paper (page background, very light warm off-white, not pure white), surface (cards/panels, may be pure white or the paper), sand (subtle panels, image placeholders, skeletons), stone (hairlines and borders, around 12–16% contrast against paper), and three text tones (ink, secondary, muted; muted must still pass 4.5:1 for small text, so no lighter than about `#6d665e`-class greys).
- **Semantic**: success (deep green), warning (amber-brown that still reads warm), error (brick/oxblood red, not neon), info (slate blue), **sale** (use accent-text, not a loud red), star (a warm gold that is distinct from the accent), discount (success or accent-text; pick one and document it).
- **Dark mode**: base = navy-ink (a blend near the logo navy, darkened), surface = a lighter navy, sand/stone = translucent off-white at 6%/14%, text = off-white with a warm cast, accent = the raw caramel (it passes on navy), accent-text = a lighter caramel. Re-run the contrast script for every dark pairing.
- Overlay/scrim tokens for the cart drawer, modals and the hero: navy at 55–70% alpha.
- No gradients anywhere in the new system except an optional, barely perceptible scrim on photography (navy → transparent). `--sf-gradient-primary` and `--sf-gradient-primary-hover` must remain defined (components reference them until migrated) but set them to flat `linear-gradient(<ink>, <ink>)` equivalents so nothing purple can render.

### 3. Typography rules

- Choose and justify a display serif with a true italic (for example Playfair Display, Fraunces, Cormorant Garamond or Libre Caslon; the logo's "A&S" is a high-contrast transitional/Didone serif, so a face in that family will sit naturally beside it) and a UI sans. Recommended default for the sans: **Inter** (already loaded, hardcoded by `adminTheme.js`, and the only choice with zero admin coupling through `CssBaseline`); another highly legible sans is acceptable only if you keep Inter loaded for the admin, scope the new family with `body:not(.admin-area)`, set it in the storefront MUI theme, and prove the admin is unchanged. Whatever you choose, the storefront must not *look* like the boilerplate: the serif display scale, the palette, the hairlines and the layout carry the difference. At most two families, at most six font files in total, each loaded with `font-display: swap` via a single Google Fonts stylesheet with `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com`. Remove the `Material Icons` stylesheet link only if a grep proves nothing uses the `material-icons` class; otherwise leave it.
- Display weights: regular + italic (+ one medium/semibold). Sans weights: 400, 500, 600 (700 only if the admin needs it, see guardrails).
- Type scale (define as tokens, fluid with `clamp()` for display sizes): display-xl (hero, ~56–88px), display-lg (section titles, ~40–56px), display-md (~28–36px), display-sm (~22–26px), then the existing `--sf-text-xs … --sf-text-3xl` for UI. Display line-height 1.02–1.1, letter-spacing −0.01em to −0.02em; eyebrow style: sans 11–12px, uppercase, letter-spacing 0.14–0.18em, muted colour. Body 16px/1.6, measure token `--sf-measure: 66ch`.
- Define how an accent word is set: `<em>` inside a display heading renders in the display italic, accent colour at display sizes, never underlined.

### 4. Spacing, radius, shadow, motion, layout

- Spacing: keep `--sf-space-1 … --sf-space-16` (4px base) and add `--sf-space-20 (80px)`, `--sf-space-24 (96px)`, `--sf-space-32 (128px)`, a fluid section rhythm `--sf-section-y: clamp(64px, 9vw, 128px)` and a gutter `--sf-gutter: clamp(16px, 4vw, 48px)`.
- Containers: `--sf-container-max` (content, 1280px stays), add `--sf-container-wide: 1440px` (editorial/full-bleed inner) and `--sf-container-narrow: 720px` (prose and forms).
- Radius: editorial = sharp. `--sf-radius-sm: 2px`, `md: 4px`, `lg: 8px`, `xl: 12px`, `pill: 999px`. Nothing larger.
- Hairlines: `--sf-hairline: 1px solid var(--sf-color-border)`.
- Shadows: four levels, warm-tinted and soft (`rgba(<navy>, 0.06–0.14)`), plus `--sf-shadow-focus` using the accent at 45% alpha; dark-mode shadows use black at higher alpha.
- Motion: `--sf-ease-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--sf-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`, durations `--sf-duration-fast: 160ms`, `--sf-duration: 320ms`, `--sf-duration-slow: 640ms`, `--sf-duration-reveal: 900ms`, `--sf-reveal-distance: 20px`. Keep the existing `--sf-transition*` tokens defined as compositions of these. Under `prefers-reduced-motion: reduce` all durations become `0.01ms` and the reveal distance `0`.
- z-index: keep the existing scale (`sticky 40`, `stickybar 60`, `overlay 1000`, `modal 1100`) and add `--sf-z-header: 50` and `--sf-z-megamenu: 55`.

### 5. Logo usage rules (write them into `DESIGN_SYSTEM.md`)

- Light logo on paper/surface/sand; white logo on navy, on dark-mode surfaces, on image scrims and on the dark footer. Never recolour the PNGs, never place the light logo on a dark surface.
- Minimum rendered height 28px (mobile header), 40–48px (desktop header), 56px (auth modal, invoice); clear space equal to the height of the "A" cap on all sides.
- The logo already carries the line "Trusted Comfort for Every Home". Do not repeat that line immediately beside the logo.

## Functional guardrails (restate and obey)

1. **Preserve functionality and the data/API contract.** This prompt touches no API code, no `db.json`, no routing and no component logic. `ThemeContext`'s public surface (`useTheme` → `{ isDarkMode, toggleTheme, theme }`, `useThemeContext` → `{ mode, toggleTheme }`) is unchanged.
2. **Reuse and extend the theme token system.** Every new value is a token in `storefront-tokens.css`, mirrored in `tokens.js` where JS needs it, and reflected in `colors.js` for MUI. The only hex literals allowed outside those three files after this prompt are the two inside `PLACEHOLDER_IMG`.
3. **Do not modify the admin panel.** The admin mounts its own MUI theme (`src/theme/adminTheme.js`, which hardcodes the `"Inter"` font family), sets `body.admin-area` via `useAdminBodyClass`, and relies on the `body.admin-area` overrides in `App.css` for its page background, scrollbars and SweetAlert. Therefore: keep the Inter family loaded in weights 400/500/600/700 whatever you choose for the storefront; scope every new global rule with `body:not(.admin-area)` or `.App`; never change `body.admin-area*` rules; do not change `document.body` handling in `ThemeContext` beyond the colour values; after your changes, open `/admin` (login `admin@store.com` / `admin123`) in light and dark mode and compare the dashboard, a table page and a dialog against screenshots you take before starting. They must be identical.
4. **Brand consistency and minimalism.** No gradients, glass, neon or purple remains in the token layer, `App.css`, `index.css` or `ThemeContext`.
5. **Responsive and accessible.** Fluid type must stay ≥ 16px for body and ≥ 44px tap targets are a token (`--sf-tap-target`). Focus ring token is visible on paper and navy. All contrast pairs documented with their ratio.
6. **No fabricated trust signals.** Not applicable to this prompt beyond: do not add marketing copy anywhere.
7. **Test before done.** See Test and QA.

## Implementation notes

1. Read `prompts/00_INDEX.md` (repo map, guardrails, open questions) and `prompts/BUILD_LOG.md` (empty at this point except its header). `prompts/DESIGN_SYSTEM.md` does not exist yet; you create it.
2. Inspect the files in scope. In particular read `storefront-tokens.css` end to end and note every token name; grep `src` for `var(--sf-` and for each `--sf-color-*` name to understand how it is consumed (for example `src/pages/Products/Products.module.css` maps local aliases such as `--accent` onto `--sf-color-primary`). This tells you what each remapped value will immediately affect.
3. If `node_modules` is missing run `npm ci` (a lockfile is present; Node 22 works with react-scripts 5). Run `npm run server` (JSON Server on :3001, uses `db.json`) and `npm start` (CRA on :3000, `.env` already selects mock mode) in two terminals.
4. Take "before" screenshots: home, product listing, a product page, the cart drawer, `/admin` dashboard and `/admin/products` in light and dark mode. You will compare the admin ones at the end.
5. Sampling: write the sampling script outside the repo (for example in the OS temp directory); never commit it or the downloaded PNGs.
6. Contrast: write a small script (WCAG relative-luminance formula) that checks every pairing listed in `DESIGN_SYSTEM.md` and paste its output table into the document.
7. Token migration order: `storefront-tokens.css` → `colors.js` → `ThemeContext.js` → `tokens.js` → `index.css` → `App.css` → `index.html` fonts → `helpers.js` placeholder → `constants.js` logo URLs → `BrandLogo` → `DESIGN_SYSTEM.md`.
8. What "primary" means now: `--sf-color-primary` is the **ink** (primary buttons are ink with paper text), `--sf-color-primary-contrast` is paper, `--sf-color-primary-soft` is a 6–8% ink tint, `--sf-color-accent` is the caramel, and `--sf-color-secondary` is the navy. Document this remap prominently because the boilerplate used `primary` for a purple.
9. `DESIGN_SYSTEM.md` structure: Purpose and how to look up a token → Sampled logo colours → Palette tables (role, token name, light value, dark value, contrast against its usual background) → Semantic and commerce tokens → Typography (families, files loaded, weights, scale tokens, usage, the accent-italic rule, eyebrow style) → Spacing, containers, radius, hairlines → Shadows → Motion (tokens, reduced-motion behaviour, the standard reveal recipe for framer-motion: `initial {opacity 0, y: reveal-distance}` → `animate {opacity 1, y 0}` with `--sf-duration-reveal` and `--sf-ease-out`, `viewport once`) → z-index → Logo usage rules and `BrandLogo` API → Image placeholder tones (the two `PLACEHOLDER_IMG` hex values and the recommended `placehold.co` background/foreground pair for seeded data, in the same tones) → Usage rules (no raw hex in components; buttons: ink primary, hairline ghost, text link with accent underline; inputs: hairline, 44px, accent focus ring; cards: no border by default, hairline on hover; sections: `--sf-section-y`) → Checklist for later prompts.
10. The storefront must still render after your changes (the old components will look plainer and warmer, which is expected). Fix any layout breakage caused by a changed value (for example a radius or shadow a component relied on) but do not start redesigning components.

## Acceptance criteria

- [ ] `storefront-tokens.css` defines every pre-existing `--sf-*` token name plus the new tokens listed above, in both `:root` and `body.dark`, with no purple, violet, pink or blue brand values left.
- [ ] `colors.js`, `tokens.js` and `ThemeContext.js` mirror the same values; the MUI theme uses the new families and no gradient, lift, glass or neon overrides.
- [ ] Fonts load from one Google Fonts stylesheet with `preconnect`, `display=swap`, ≤ 6 files; Inter 400/500/600/700 remains available to the admin.
- [ ] `App.css` and `index.css` contain no hardcoded storefront colours; all storefront global rules are scoped with `body:not(.admin-area)` or `.App`; `body.admin-area*` rules are unchanged (diff shows no change in those blocks).
- [ ] `LOGO_URLS` exists in `constants.js` with the exact URLs; `BrandLogo` renders the right variant in light and dark mode with explicit dimensions and alt text.
- [ ] `PLACEHOLDER_IMG` uses the new neutral tones and reads "Image coming soon".
- [ ] `prompts/DESIGN_SYSTEM.md` exists with sampled colours, full token tables, contrast ratios (all AA), typography, spacing, motion, logo rules, placeholder tones and usage rules.
- [ ] Admin screenshots before/after are identical in light and dark mode.
- [ ] `npm run build` succeeds with no new warnings; the storefront renders every route without console errors.

## Test and QA

1. JSON Server mode (`npm run server` + `npm start`): load `/`, `/products`, a product page, open the cart drawer, the auth modal and the search modal, toggle dark mode from the header. Nothing may be unreadable (check text on the hero, on cards, in the footer) and no purple/blue brand colour may remain in the token-driven areas. Components with their own hardcoded colours may still show old colours; list them in the build log.
2. Widths 360, 768, 1024 and 1440px: no horizontal scrollbar introduced, fluid display sizes within range.
3. Keyboard: tab through the header and a product card; the focus ring token is visible in both modes.
4. Run your contrast script and keep its output in `DESIGN_SYSTEM.md`.
5. Admin regression: `/admin` login, dashboard, products, orders, settings, a dialog and a SweetAlert confirm, light and dark. Compare with the "before" screenshots.
6. `npm run build` passes with no new errors or warnings. There are no unit tests in this repository (`CI=true npm test -- --passWithNoTests` must still exit 0).
7. Nothing in this prompt depends on a JSON Server-only response shape (you changed no data code; confirm with the diff).
8. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 01 — Brand design system and theme tokens`: what changed (file list), decisions (palette, families, weights, radius philosophy, the "primary = ink" remap), new tokens and components (`BrandLogo`, `LOGO_URLS`), deviations from this prompt and why, components still carrying hardcoded colours (for later prompts), and anything that needs client confirmation (for example if the sampled palette suggests a different accent than expected).
