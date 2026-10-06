# Admin logo swap (the only admin change in the whole project)

**Prompt 33 of 34**

## Depends on

Prompt 01 (`LOGO_URLS` in `src/utils/constants.js`). Nothing else; this prompt is deliberately tiny and runs late so no other prompt is tempted to touch the admin.

## Context

A & S Urbanseat's storefront has been redesigned over the previous 32 prompts without touching the admin panel (`src/pages/Admin/*`, `src/components/AdminLayout/*`, `src/theme/adminTheme.js`). The admin currently shows a placeholder image where its logo belongs. This prompt replaces that placeholder with the A & S Urbanseat logo and changes nothing else. Logo assets: light `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo.png` (for light backgrounds), white `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo-white.png` (for dark backgrounds). Both are 1286 × 426 px (ratio ≈ 3.02:1) and are exported as `LOGO_URLS.light` / `LOGO_URLS.white` from `src/utils/constants.js`.

## Objective

Swap the two admin logo placeholders for the brand logo, choosing the variant by the admin's current colour mode, with no other change to the admin's markup, styling, behaviour or dependencies.

## Scope — files and areas to touch (exact)

1. `src/components/AdminLayout/AdminLayout.js`
   - Line 39 today: `const LOGO = "https://placehold.co/160x40/4f46e5/ffffff?text=LOGO";`
   - Lines 335–339 today render `<img src={LOGO} alt={process.env.REACT_APP_NAME || "Admin Panel"} style={{ height: 32, width: "auto" }} />` inside the sidebar `Box` (padding 16px, flex-centred, drawer width 260px). The sidebar surface is `background.paper` from `adminTheme.js`: `#ffffff` in light mode, `#111927` in dark mode. `mode` (`"light" | "dark"`) is already in scope on line 133 (`const { mode, toggleTheme } = useThemeContext();`).
   - Change: import `LOGO_URLS` from `../../utils/constants`, delete the `LOGO` constant, and render `src={mode === "dark" ? LOGO_URLS.white : LOGO_URLS.light}`. Keep `alt`, keep `style={{ height: 32, width: "auto" }}`, keep the surrounding `Box` and `Divider`. Add `width={97}` and `height={32}` attributes (32 × 3.02 ≈ 97) so the sidebar never shifts while the image loads; the inline style still governs the rendered size.
2. `src/pages/Admin/AdminLogin.js`
   - Line 21 today: `const LOGO = "https://placehold.co/210x70/4f46e5/ffffff?text=LOGO";`
   - Lines 136–140 render `<img src={LOGO} alt={process.env.REACT_APP_NAME || "Admin"} style={{ height: 56, width: "auto" }} />` inside the login `Paper` (max-width 420px, `background.paper` = `#ffffff` light / `#111927` dark). `isDarkMode` is in scope on line 27.
   - Change: import `LOGO_URLS`, delete the `LOGO` constant, render `src={isDarkMode ? LOGO_URLS.white : LOGO_URLS.light}`, add `width={169}` and `height={56}` attributes, keep everything else including the "Admin Console" wordmark and subtitle.

Do not touch: anything else in those two files (no `sx` changes, no spacing changes, no `BrandLogo` import, no `onError` handler, no new CSS), any other admin page, `src/theme/adminTheme.js`, `src/hooks/useAdminBodyClass.js`, `src/context/*`, `src/App.css`, storefront files.

## Brand and design requirements

- Light mode: the light (colour) logo on the white sidebar and white login card. Dark mode: the white logo on `#111927`. Never the light logo on a dark surface.
- Rendered heights stay exactly 32px (sidebar) and 56px (login). The logo's proportions make it about 97px and 169px wide respectively, well within the 228px sidebar inner width and the login card.
- No other visual change: the admin palette (indigo), typography (Inter), radii and spacing remain exactly as before.

## Functional guardrails

1. **Preserve functionality.** No logic changes; the admin login, session, navigation, theme toggle and every module behave as before. No change to `src/services/api.js` or `db.json`.
2. **Tokens.** Not applicable; the admin keeps its own theme. The only new reference is `LOGO_URLS` from constants.
3. **Admin untouched beyond the logo.** `git diff --stat` for the two files must show only the import line, the removed `LOGO` constant and the `<img>` lines. No other admin file appears in the diff.
4. **Brand consistency.** The correct logo variant per surface.
5. **Accessible.** `alt` text unchanged (it resolves to `A & S Urbanseat` through `REACT_APP_NAME`); explicit width/height prevent layout shift.
6. **No fabricated signals.** Not applicable.
7. **Test before done.** See below.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` and `prompts/DESIGN_SYSTEM.md` (logo usage rules). Open the two admin files and confirm the line numbers above still match (earlier prompts did not touch these files, but verify).
2. Make the four small edits (two imports, two `<img>` changes, two constant removals).
3. Both PNGs have transparent backgrounds, so the white logo is invisible on a white surface; confirm the variant switch by toggling the theme in the admin AppBar.

## Acceptance criteria

- [ ] Sidebar logo and login logo show the A & S Urbanseat light logo in light mode and the white logo in dark mode, at 32px and 56px heights, with no layout shift.
- [ ] `git diff` touches only `AdminLayout.js` and `AdminLogin.js`, and only the logo-related lines.
- [ ] Admin login, dashboard, products, orders, settings, dialogs, SweetAlert confirms and the theme toggle work exactly as before.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: `/admin` (login `admin@store.com` / `admin123`), toggle light/dark on the login page and inside the dashboard; check the sidebar logo on desktop and in the temporary mobile drawer (hamburger at < 900px).
2. Widths 360, 768, 1024, 1440: the sidebar/drawer and the login card lay out as before.
3. Keyboard: tab order on the login form unchanged.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. Storefront regression: open `/` once to confirm nothing changed there (this prompt touched no storefront file).
6. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 33 — Admin logo swap`: the exact lines changed and confirmation that the diff contains nothing else.
