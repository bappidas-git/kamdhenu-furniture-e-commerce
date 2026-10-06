# Brand identity wiring

**Prompt 2 of 34**

## Depends on

Prompt 01 (design system and tokens). You will use its palette values (from `prompts/DESIGN_SYSTEM.md`) for `theme_color`, the pre-paint background and the loading screen.

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India (INR, `en-IN`). This Create React App storefront (dual-mode `src/services/api.js`: JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json` for mock data) is being redesigned into a premium, editorial, warm-minimalist boutique. The admin panel must not change. Logo assets: light `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo.png` (light backgrounds), white `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo-white.png` (dark backgrounds). Both are already exposed as `LOGO_URLS` in `src/utils/constants.js` and rendered by `src/components/ui/BrandLogo.js` (Prompt 01).

## Objective

Make the application identify as A & S Urbanseat everywhere identity is defined in code or static files: app name, tagline and brand lines, contact details, social links, currency and locale, document title and meta tags, Open Graph/Twitter cards, favicon and app-icon links, the web manifest, the pre-React loading screen and the pre-paint theme script. Propose the tagline and key brand lines for the client's approval, grounded in how the business describes itself on its existing site.

## Scope — files and areas to touch

- `src/utils/constants.js`: `APP_NAME` fallback, `APP_TAGLINE`, `APP_DESCRIPTION`, `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `SUPPORT_ADDRESS`, `SUPPORT_HOURS`, `SOCIAL_LINKS`, `POLICY_LAST_UPDATED`, `DEFAULT_CURRENCY` (verify it is INR). Leave `FAQ_ITEMS`, `WHY_CHOOSE_US`, `TRUST_BADGES`, `ROUTES`, status enums, `FREE_SHIPPING_THRESHOLD` and `ANIMATION_VARIANTS` for the prompts that own those surfaces (28, 12, 08, 05 and 30 respectively).
- `.env`, `.env.example`, `.env.production`: `REACT_APP_NAME=A & S Urbanseat` (keep every other key as it is; `.env` must keep `REACT_APP_USE_MOCK_API=true` and `REACT_APP_API_URL=http://localhost:3001`).
- `src/utils/helpers.js`: read-only. `formatCurrency` already formats INR with `en-IN`; keep it. Do **not** change `formatDate` or `formatNumber`: nine admin pages import `formatDate` from this file, so changing its locale would change the admin. If the storefront wants `en-IN` dates later, Prompt 29 may add a storefront-only helper; record this decision in the build log.
- `src/theme/tokens.js` → `STOREFRONT_CONFIG`: set `trustBadges` to the badges the business can honestly show (`securePayment`, `cod`, `easyReturns`, `genuine`; omit `warranty` and `support` until confirmed, see "Needs client confirmation"), keep `returnsWindowDays: 7` as a placeholder and flag it. `TRUST_BADGE_CATALOG` labels stay as they are (Prompt 29 revises microcopy).
- `public/index.html`: `<html lang="en-IN">`, `<title>`, `meta description`, `meta keywords` (furniture terms, no electronics/fashion), `meta author`, `theme-color`, Open Graph and Twitter tags (title, description, `og:url` placeholder domain flagged, `og:image` = the light logo URL with `og:image:width=1286` and `og:image:height=426`), the icon `<link>`s, the `apple-touch-icon`, the manifest link, the loading screen markup and styles, and the pre-paint theme script's background colours. Keep the Google Fonts links Prompt 01 wrote and the `react-loaded` / `MutationObserver` mechanics intact.
- `public/manifest.json`: `name`, `short_name`, `description`, `icons`, `start_url`, `display`, `theme_color`, `background_color`.
- New: `src/content/brandContent.js`: the approved-pending brand lines (see below) as named exports so later prompts (hero, about, newsletter, footer, auth modal) import them instead of hardcoding copy.

Do not touch: `db.json` (Prompts 03–05 own `settings.store`, `settings.social` and all seed data), `src/services/*`, `src/pages/*`, `src/components/*` other than reading them, `src/theme/storefront-tokens.css`, `src/theme/colors.js`, `src/pages/Admin/*`, `src/components/AdminLayout/*`.

## Brand and design requirements

### Name, tagline and brand lines

- `APP_NAME` fallback: `A & S Urbanseat` (with spaces around the ampersand, exactly as the logo). `REACT_APP_NAME` in all three env files: the same.
- `APP_TAGLINE`: `Trusted Comfort for Every Home`. This is the line printed inside the logo artwork, so it is the client's own tagline; adopt it, and never render it as text directly beside the logo (it is already in the image).
- Brand lines to propose in `brandContent.js` (export names in parentheses), each one short, warm, refined, no hype, grounded in the existing site's self-description ("crafting quality furniture for homes and offices since 20+ years", own manufacturing, "Quality First", "Customer Focused", "Trust & Reliability", brands carried: Nilkamal, Carlton, Winsome):
  - `BRAND_PROMISE` (one sentence for the About page and the footer): e.g. "Furniture made to be lived with, from our own workshop and the makers we trust."
  - `HERO_HEADLINES` (3 candidates, each with one accent word marked for italics using `*word*`): e.g. "Seating for the way you *live*.", "Comfort, *quietly* made.", "Rooms that feel *finished*."
  - `HERO_SUPPORT_LINES` (3 candidates, ≤ 14 words).
  - `NEWSLETTER_LINE`, `ABOUT_INTRO` (2–3 sentences), `ASSURANCE_ITEMS` (label + one-line detail for delivery, returns, secure payment, COD; detail text must defer to live data where a number is involved, so write them as templates that later prompts fill from `settings` and `shipping_methods`, for example `"Free delivery above {threshold}"`).
  - Write a short header comment in the module: "Proposed brand copy, pending client approval. Replace values here, never inline copy in components."
- List every proposed line in the build log under "Needs client confirmation".

### Contact details and social links (facts from the client's existing site, kamdhenufurniture.in, verified on 2026-10-06)

- Phone (call link on the site): `+91 84729 18653`. WhatsApp: `+91 84729 19541` (`https://wa.me/918472919541`). The number `+91 98765 43210` that also appears on that site is a template placeholder; do not use it.
- Email on the site: `info@kamdhenufurniture.com`. Use it as the placeholder `SUPPORT_EMAIL` and flag it (the storefront is A & S Urbanseat and the domain differs from the site's `.in`).
- Address on the site: only "Assam, India". Set `SUPPORT_ADDRESS` to `Assam, India` and flag that the street address and PIN code are missing. Do not invent a street.
- Hours on the site: `Monday – Saturday: 9:00 AM – 7:00 PM IST, Sunday closed`.
- Social: the site lists no Facebook, Instagram, YouTube or X profiles. Set `SOCIAL_LINKS` to `WHATSAPP: "https://wa.me/918472919541"` and every other key to `""` (the footer hides empty entries). Flag.
- `POLICY_LAST_UPDATED`: today's date in the build session, formatted the same way as the existing value.

### `public/index.html`

- Title: `A & S Urbanseat | Furniture & Seating for Home, Office, Café and Outdoor` (Prompt 32 adds per-page titles).
- Description (≤ 160 chars) in the brand voice; keywords limited to furniture and seating terms.
- `theme-color`: the paper surface token value from `DESIGN_SYSTEM.md`; add a second `theme-color` with `media="(prefers-color-scheme: dark)"` using the dark base.
- Icons: the files that actually exist in `public/` are `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`. Verify with `ls public` and `file public/*.png` (record pixel sizes), then link: `<link rel="icon" href="%PUBLIC_URL%/favicon.ico" sizes="any">`, the 16 and 32 PNGs with `sizes`, `<link rel="apple-touch-icon" href="%PUBLIC_URL%/apple-touch-icon.png">`, and the manifest. Remove the links to `favicon.svg`, `logo192.png` and `logo512.png`, which do not exist. Do not generate new icon files.
- Loading screen: replace the purple gradient loader with a brand-correct one: paper background with the light logo centred (or the dark base with the white logo if you choose a dark splash; be consistent with the pre-paint theme script so light mode shows the light logo on paper and dark mode the white logo on the dark base), a single 2px caramel progress hairline that animates slowly, no spinner stack, no "MY STORE" text, no gradient animation on `body`. Under `prefers-reduced-motion` the hairline does not animate. Keep the fade-out and the 10s safety timeout.
- Pre-paint script: keep the theme detection, the `theme` localStorage key and the `body.dark` / `body.light` class names; set `document.body.style.backgroundColor` (not the `background` shorthand) to the solid paper or dark-base colour (the same values `src/theme/colors.js` `LIGHT.background.default` / `DARK.background.default` now hold). Today the script writes a gradient through the shorthand, which also leaks a purple `background-image` under the admin's overscroll area; the solid colour removes that leak, and the admin's own `body.admin-area` background rules keep winning. Record this as an accepted side effect.
- Remove the inline `body { background: linear-gradient(...) }` and the `gradientShift` keyframes.

### `public/manifest.json`

`name: "A & S Urbanseat"`, `short_name: "Urbanseat"`, `description` (one sentence), `start_url: "."`, `display: "standalone"`, `theme_color` and `background_color` from the palette, `icons` for the 192 and 512 android-chrome files with their true `sizes` and `type: "image/png"` (add `"purpose": "any"`).

## Functional guardrails

1. **Preserve functionality and the data/API contract.** No change to `src/services/api.js`, `db.json`, routing or component logic. `formatCurrency` keeps its signature and output format.
2. **Reuse the theme token system.** The only colour values you write are in `index.html` and `manifest.json` (static files cannot read CSS variables): copy them from `DESIGN_SYSTEM.md` and note each in the build log so Prompt 34 can verify they still match.
3. **Do not modify the admin panel.** Changing `REACT_APP_NAME` changes `APP_NAME`; grep `src/pages/Admin` and `src/components/AdminLayout` for `APP_NAME` before you change anything. If the admin renders it (for example in a title or sidebar wordmark), that is a pre-existing coupling: keep the admin markup untouched (it will show the new name, which is the brand's name, not a styling change) and record it in the build log. Do not edit any admin file.
4. **Brand consistency.** Every occurrence of "My Store", "MY STORE", "My E-Commerce Store", "mystore.com", "Your Online Shopping Destination" and "Quality products, great prices" in the files in scope is replaced. Grep the whole `src` and `public` trees and list in the build log any occurrences in files outside your scope (they belong to later prompts).
5. **Responsive and accessible.** The loading screen logo has `alt="A & S Urbanseat"`, the splash contrast passes AA, `lang` is set.
6. **No fabricated trust signals.** Do not add claims (warranty years, customer counts, "since 20 years") to constants or brand lines unless they are quoted from the site and flagged for confirmation. The "20+ years" and "20+ years warranty" statements on the reference site are listed as "Needs client confirmation", not used as facts.
7. **Test before done.** See below.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (Prompt 01's entry) and `prompts/DESIGN_SYSTEM.md`. Inspect every file in scope before editing.
2. `APP_NAME` is read from `process.env.REACT_APP_NAME` at build time; after editing `.env` restart `npm start`.
3. Consumers to check after the change (read-only, do not restyle them here): `src/components/Header/Header.js` (logo text, `SUPPORT_PHONE`), `src/components/Footer/Footer.js` (`SOCIAL_LINKS`, support details), `src/pages/HelpCenter/HelpCenter.js`, `src/pages/Support/Support.js`, the four policy pages (`POLICY_LAST_UPDATED`), `src/pages/OrderConfirmation/OrderConfirmation.js` (invoice header).
4. The app currently has no per-page `<title>` management library (no react-helmet). Do not add one; Prompt 32 handles per-page titles with `document.title`.
5. Validate `manifest.json` with a JSON linter and load it in Chrome DevTools → Application → Manifest to confirm icons resolve.
6. Do not add any image files to `public/`.

## Acceptance criteria

- [ ] `APP_NAME` resolves to `A & S Urbanseat` in all three env files and as the code fallback; `APP_TAGLINE` is `Trusted Comfort for Every Home`.
- [ ] `src/content/brandContent.js` exists with the exports listed, each line listed in the build log for approval.
- [ ] Contact, hours and social values match the reference-site facts above, with the flagged placeholders recorded.
- [ ] `index.html`: new title/meta/OG/Twitter, `lang="en-IN"`, two `theme-color` tags, icon links only to files that exist, brand loading screen with the correct logo per mode, solid pre-paint backgrounds, no purple.
- [ ] `manifest.json`: all fields above, icons resolve in DevTools.
- [ ] `STOREFRONT_CONFIG.trustBadges` lists only badges the business can honestly show; `returnsWindowDays` flagged.
- [ ] Admin untouched (no file under `src/pages/Admin` or `src/components/AdminLayout` in the diff).
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: hard-reload `/` with the network throttled (DevTools "Slow 3G") to see the loading screen in light and dark mode; verify the right logo variant, no layout shift when React mounts, and that the loader disappears when the app renders.
2. Check the browser tab: title and favicon (clear the favicon cache or use an incognito window). Check `view-source` for the meta tags.
3. Widths 360, 768, 1024, 1440: the loading screen logo scales (max-width 60vw, max 320px) and stays centred.
4. Keyboard/screen reader: not applicable beyond `lang` and the logo `alt`.
5. Visit `/support`, `/help`, `/orders` (log in as `user@example.com` / `password123`) and the footer to see the new contact values render.
6. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0 (there are no tests).
7. Admin regression: `/admin` login and dashboard still render identically.
8. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 02 — Brand identity wiring`: what changed, decisions, the full list of proposed brand lines, placeholders used (email, address, hours, social, returns window, warranty omitted), remaining "My Store" occurrences outside your scope with file paths, and the colour literals written into `index.html` and `manifest.json`.
