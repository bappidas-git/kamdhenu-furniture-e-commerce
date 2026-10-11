V2 baseline: 0b9153e490c87c0713c8c802f67185266da424a2

# V2-01 report: brand identity wiring (max-effort re-verification of Prompt 02)

**Date:** 2026-10-11. **Re-verifies:** Prompt 02 (`prompts/02_brand-identity-wiring.md`, commit `a1318e6`). **Baseline:** the hash above is `git rev-parse HEAD` before any V2 change, for V2-02 to V2-05 to diff against.

**Status: complete, no row left as a gap or partial.**
- **As found** (matrix committed before any edit, `8f6238a`): 125 requirements; 113 met, 9 superseded by a recorded later decision, 1 gap (R59) and 2 partial (R78, R108), all three in `public/index.html`.
- **After V2-01's two repairs** (§6): 116 met (3 of them repaired here), 9 superseded, 0 gaps, 0 partial.
- **Gate green** (§9). Seven findings handed to V2-05 (§7).

---

## 1. How this was checked

- **Read in full:** `prompts/00_INDEX.md`, `prompts/02_brand-identity-wiring.md`, the `## Prompt 02` entry of `prompts/BUILD_LOG.md`, the V2 README and this prompt. Then every later build-log entry and `DESIGN_SYSTEM.md` was searched for `index.html`, `manifest`, `brandContent`, `constants.js`, `STOREFRONT_CONFIG`, `trustBadges`, `SUPPORT_`, `SOCIAL_LINKS`, `theme-color`, `loading screen`, `APP_NAME`, and the matching entries were read (Prompts 05, 08, 10, 12, 14, 28, 29, 30, 31, 32, 33, 34; §3 below).
- **History:** `git show --stat a1318e6` and its full diff; `git log` of every in-scope file since `a1318e6`, and each later commit's diff to those files.
- **Static checks:** scripts run from the session scratchpad (not committed), described with each row: a jsdom parse of `public/index.html` compared with `colors.js` and `storefront-tokens.css`; a byte-level comparison of the contact constants with the spec's text; CRA's own `dotenv` 10 + `dotenv-expand` 5 on each env file; a load of `brandContent.js` with word, sentence and accent counts; extraction of `formatCurrency`, `formatDate` and `formatNumber` from `helpers.js` at `90402a2` and `HEAD`; WCAG contrast for the splash.
- **Browser checks** (Playwright 1.56, Chromium 141): a production build in JSON Server mode (`REACT_APP_API_URL=http://localhost:3001 REACT_APP_USE_MOCK_API=true CI=true npm run build`), served with `serve -s`: the baseline build on :5001 (the "before" pass, which the matrix's statuses rest on) and the repaired build on :5002 (the "after" pass, §9). JSON Server ran on a **scratch copy** of `db.json` (`JSON_SERVER_DB`), so the seed was never written (SHA-256 `3fc7f8f3…` before and after). Results are "browser: <check id>" in the evidence column.
- **Reference site:** `kamdhenufurniture.in` and `/contact/` re-read on 2026-10-11 (downloaded to the scratchpad and treated as data; only contact facts were extracted).
- **Gate at the baseline:** `node scripts/validate-db.js` ✓ (full and `--catalogue`); `CI=true npm test -- --passWithNoTests` **86 suites, 1,429 tests, exit 0**; the mock-mode build "Compiled successfully." (main JS 399.59 kB, CSS 34.97 kB gzip, as Prompt 34 recorded), with only the two dependency notices `DESIGN_SYSTEM.md` §43.6 documents.

## 2. What the medium session did (`a1318e6`)

`git show --stat a1318e6`: 9 files, +332 / −390.

| File | Change |
|---|---|
| `.env`, `.env.example`, `.env.production` | one line each: `REACT_APP_NAME=A & S Urbanseat` |
| `src/utils/constants.js` | `APP_NAME` fallback, `APP_TAGLINE`, `APP_DESCRIPTION`, `SOCIAL_LINKS`, `SUPPORT_EMAIL/PHONE/ADDRESS/HOURS`, `POLICY_LAST_UPDATED` ("October 7, 2026"); nothing else |
| `src/theme/tokens.js` | `STOREFRONT_CONFIG.trustBadges` and two comments; `TRUST_BADGE_CATALOG` untouched |
| `src/content/brandContent.js` (new) | the six exports and the header comment |
| `public/index.html` | lang, title, meta, theme-color ×2, OG/Twitter, icons, Cloudinary preconnect, the new splash, the pre-paint script moved to the top of `<body>` with `backgroundColor`, the gradient body and its keyframes removed |
| `public/manifest.json` | rewritten |
| `prompts/BUILD_LOG.md` | the Prompt 02 entry |

No admin file, `src/services/*`, `db.json`, page or component was in the diff.

## 3. Later decisions that changed Prompt 02's files or values

| Prompt | Commit | Change | Recorded in |
|---|---|---|---|
| 05 | `d807ce4` | `FREE_SHIPPING_THRESHOLD` 999 → 9999 (a key Prompt 02 left to 05). `db.json` `settings.store`, `social`, `notifications` and `seo` reseeded from Prompt 02's constants and `index.html` | BUILD_LOG Prompt 05, settings and constants rows |
| 08 | `ac20c08` | `TRUST_BADGES` deleted (left to 08). The footer renders `BRAND_PROMISE`, the non-empty `SOCIAL_LINKS` (a WhatsApp glyph added, closing Prompt 02's note) and the contact facts | BUILD_LOG Prompt 08, "What changed" and "`TRUST_BADGES` decision" |
| 10 | `ad2eebb` | `brandContent.js` comment only. The strip prints `resolveTrustBadgeDetail("freeShipping")` ("Above ₹9,999") in place of `ASSURANCE_ITEMS[delivery].detail`; the hero takes `HERO_HEADLINES[0]` and `HERO_SUPPORT_LINES[0]` | BUILD_LOG Prompt 10, deviation 4; DESIGN_SYSTEM §20 |
| 12, 14 | — | `APP_NAME` closes "Brands we carry" (12); `APP_DESCRIPTION` is the listing's "All furniture" intro (14) | BUILD_LOG Prompts 12 and 14 |
| 28 | `24be544` | `ABOUT_INTRO`: "Much of what we sell comes from our own workshop" → "Some of what we sell is made in our own workshop". Added `ABOUT_HEADLINE`, `ABOUT_STORY`, `ABOUT_VALUES`, `ABOUT_CLOSING`. `constants.js`: `FAQ_ITEMS` rewritten, `WHY_CHOOSE_US` deleted, `HELP_TOPICS` and `SUPPORT_CATEGORIES` added | BUILD_LOG Prompt 28, "What changed" and deviation 1 |
| 29 | `f9ca155` | Title, `og:title` and `twitter:title` in sentence case. `POLICY_LAST_UPDATED` "October 7, 2026" → "7 October 2026". `HERO_SUPPORT_LINES[1]` → "Some made in our own workshop, the rest from makers we trust." The COD assurance label → "Cash on Delivery". `TRUST_BADGE_CATALOG` labels, `RETURN_REASONS` labels; `formatDateIN` added (`formatDate` untouched). The manifest unchanged ("already read in voice") | BUILD_LOG Prompt 29: "Document metadata" and "Content modules" rows, "Dates", "Claims removed" 7, the notable-rewrites table |
| 30 | `427e90e` | `ANIMATION_VARIANTS` deleted (left to 30); the loading screen audited as conforming (row 52) | BUILD_LOG Prompt 30 |
| 31 | — | Nothing in these files (`index.html` unchanged); trust-claim sweep clean | BUILD_LOG Prompt 31 |
| 32 | `e253557`, `594ccd7` | `DEFAULT_PAGE_TITLE`, `DEFAULT_PAGE_DESCRIPTION`, `SITE_URL_PLACEHOLDER` added (equal to `index.html`'s tags; `usePageMeta.test.js` pins them). Per-page titles and a runtime `og:url` (`usePageMeta`). The splash logo through Cloudinary's resized WebP copies (`srcset`, the PNG kept as `src` and fallback). `src/index.js`: on the storefront the loader leaves when `#root` first has content. `formatCurrency` keeps one `Intl.NumberFormat` per currency ("the same output") | BUILD_LOG Prompt 32: "What changed", Decisions, the cart-drawer follow-up |
| 33 | `44ddfd9`, `e198f0a` | Admin logo lines (the `alt` still reads `REACT_APP_NAME`); the logout confirm's `flushSync` | BUILD_LOG Prompt 33 |
| 34 | `7cbe35d` | A comment on `FREE_SHIPPING_THRESHOLD`; `bootError.js` releases the loader before React renders; grep B5 "no branding leftovers" | BUILD_LOG Prompt 34; QA_CHECKLIST B1, B2, B5 |

`DESIGN_SYSTEM.md` §12 (values for static files), §39.9 (where copy lives) and §43.4 (exception register) describe the same values.

## 4. Requirement matrix

Status: `✅ Met` · `↪ Superseded by Prompt NN` (a recorded later decision, cited) · `❌ Gap` · `⚠ Partial`. Line numbers are at the baseline.

### 4.1 Scope: files and areas

| # | Requirement (Prompt 02) | Current state | Status | Evidence |
|---|---|---|---|---|
| R1 | `APP_NAME` fallback `A & S Urbanseat` | `process.env.REACT_APP_NAME \|\| "A & S Urbanseat"` | ✅ Met | `src/utils/constants.js:4`; byte check: MATCH |
| R2 | `APP_TAGLINE` `Trusted Comfort for Every Home` | as specified, with the "never beside the logo" comment | ✅ Met | `constants.js:5–7`; byte check: MATCH |
| R3 | `APP_DESCRIPTION` rewritten for the brand | "Furniture and seating for homes, offices, cafés and outdoor spaces, made to be lived with." (the listing's intro since Prompt 14) | ✅ Met | `constants.js:8–9`; `src/pages/Products/Products.js:104` |
| R4 | `SUPPORT_EMAIL` | `info@kamdhenufurniture.com` | ✅ Met | `constants.js:153`; byte check: MATCH |
| R5 | `SUPPORT_PHONE` | `+91 84729 18653` | ✅ Met | `constants.js:154`; byte check: MATCH |
| R6 | `SUPPORT_ADDRESS` | `Assam, India` | ✅ Met | `constants.js:155`; byte check: MATCH |
| R7 | `SUPPORT_HOURS` | `Monday – Saturday: 9:00 AM – 7:00 PM IST, Sunday closed`, with the spec's two U+2013 dashes | ✅ Met | `constants.js:156`; byte check: MATCH, code points U+2013 ×2 |
| R8 | `SOCIAL_LINKS` | WhatsApp `https://wa.me/918472919541`; Facebook, Twitter, Instagram, YouTube `""` | ✅ Met | `constants.js:141–147` |
| R9 | `POLICY_LAST_UPDATED`: the build day, in the existing format | "7 October 2026". Prompt 02 wrote "October 7, 2026" (the day of `a1318e6`, in the format of "June 1, 2026") | ↪ Superseded by Prompt 29 (Indian date order, "Static dates follow suit") | `constants.js:160`; `git show f9ca155 -- src/utils/constants.js`; browser: `/privacy` shows "Last reviewed: 7 October 2026" (8 of 8 loads) |
| R10 | `DEFAULT_CURRENCY` is INR | `CURRENCIES.INR` (₹, INR), unchanged since `90402a2` | ✅ Met | `constants.js:121–127` |
| R11 | Leave `FAQ_ITEMS`, `WHY_CHOOSE_US`, `TRUST_BADGES`, `ROUTES`, the enums, `FREE_SHIPPING_THRESHOLD`, `ANIMATION_VARIANTS` to their owners | `a1318e6` touched none of them; their owners did later (05, 08, 28, 30) | ✅ Met | `git show a1318e6 -- src/utils/constants.js` (two hunks, owned keys only); §3 |
| R12 | `.env`: `REACT_APP_NAME=A & S Urbanseat` | as specified | ✅ Met | `.env:22`; dotenv parse → `"A & S Urbanseat"` |
| R13 | `.env.example`: the same | as specified | ✅ Met | `.env.example:18`; dotenv parse → `"A & S Urbanseat"` |
| R14 | `.env.production`: the same | as specified | ✅ Met | `.env.production:21`; dotenv parse → `"A & S Urbanseat"` |
| R15 | Every other env key as it was | `git diff 90402a2 -- .env .env.example .env.production` shows only the three `REACT_APP_NAME` lines; no commit after `a1318e6` touched them | ✅ Met | the diff; `git log a1318e6^..HEAD -- .env*` lists `a1318e6` only |
| R16 | `.env` keeps `REACT_APP_USE_MOCK_API=true` and `REACT_APP_API_URL=http://localhost:3001` | both | ✅ Met | `.env:18–19` |
| R17 | `helpers.js` read-only for Prompt 02 | not in `a1318e6` | ✅ Met | `git show --stat a1318e6` |
| R18 | `formatCurrency` kept: INR, `en-IN`, same signature and output | signature `(amount, currency = "INR")`. The body caches one `Intl.NumberFormat` per currency (Prompt 32's recorded follow-up, "the same output"). Output identical to `90402a2`'s on 70 inputs × currencies | ✅ Met | `src/utils/helpers.js:19–34`; equivalence script 70/70; `helpers.test.js:148–152` pins "₹12,34,567.50" |
| R19 | `formatDate` not changed | byte-identical to `90402a2` | ✅ Met | extraction at `90402a2` and `HEAD`: identical |
| R20 | `formatNumber` not changed | byte-identical to `90402a2` | ✅ Met | the same extraction: identical |
| R21 | The `formatDate` decision recorded in the build log | recorded; Prompt 29 then added `formatDateIN` as foreseen. The spec's premise was wrong: no admin page imports `formatDate` from `helpers.js` (0 at `90402a2`; 8 define their own). Prompt 29 recorded that; the decision stands | ✅ Met | BUILD_LOG Prompt 02, Decisions; Prompt 29, "Dates"; `git grep formatDate 90402a2 -- src/pages/Admin` |
| R22 | `STOREFRONT_CONFIG.trustBadges` = `securePayment`, `cod`, `easyReturns`, `genuine` | exactly, in that order; `TrustBadges` reads it | ✅ Met | `src/theme/tokens.js:106`; `src/components/storefront/TrustBadges.js:43` |
| R23 | `warranty` and `support` left out until confirmed | out, with a comment | ✅ Met | `tokens.js:103–106` |
| R24 | `returnsWindowDays: 7` kept | 7 | ✅ Met | `tokens.js:111` |
| R25 | `returnsWindowDays` flagged as a placeholder | comment plus build log; `00_INDEX.md` §6 and §7 carry it | ✅ Met | `tokens.js:108–110`; BUILD_LOG Prompt 02, "Needs client confirmation" |
| R26 | `TRUST_BADGE_CATALOG` labels stay as they are (Prompt 29 revises them) | Prompt 02 left them; Prompt 29 revised them ("Genuine products", "Customer support", …) | ↪ Superseded by Prompt 29 (trust-badge labels, as the spec foresaw) | `git show a1318e6 -- src/theme/tokens.js` (catalogue untouched); `git show f9ca155 -- src/theme/tokens.js` |
| R27 | `index.html`: keep the Google Fonts links Prompt 01 wrote | byte-identical to `5555167` (Prompt 01) | ✅ Met | `diff` of the font block at `5555167` and `HEAD`: identical; `public/index.html:76–84` |
| R28 | `index.html`: keep the `react-loaded` / `MutationObserver` mechanics | the hide script is byte-identical to the boilerplate's | ✅ Met | `diff` of the block at `90402a2` and `HEAD`: identical; `index.html:272–311` |
| R29 | `manifest.json` fields rewritten | the eight fields (§4.5) | ✅ Met | `public/manifest.json:1–23` |
| R30 | New `src/content/brandContent.js` with named exports that later prompts import | exists; imported by `Footer.js:16`, `Newsletter.js:4`, `AssuranceStrip.js:3`, `homeContent.js:17`, `AboutUs.js:5–11` | ✅ Met | the imports |
| R31 | Prompt 02 left `db.json`, `src/services/*`, pages, components, `storefront-tokens.css`, `colors.js` and the admin alone | none of them in `a1318e6` | ✅ Met | `git show --stat a1318e6` |

### 4.2 Name, tagline and brand lines

| # | Requirement (Prompt 02) | Current state | Status | Evidence |
|---|---|---|---|---|
| R32 | The name is the same everywhere, with spaces around the ampersand: code fallback and all three env files | all four `A & S Urbanseat`; the build inlines it (bundle grep) | ✅ Met | R1, R12–R14; `grep -o 'A & S Urbanseat' build/static/js/main.*.js` |
| R33 | The tagline is the logo's own; never rendered as text beside the logo | only `Home.js:78` reads it, for the home page's document title in sentence case ("Trusted comfort for every home \| A & S Urbanseat"); no component prints it beside `BrandLogo` | ✅ Met | `grep -rn tagline src` (non-test): `Home.js`, comments, the admin's settings form; browser: `runtime/home-title` |
| R34 | `BRAND_PROMISE`: one sentence, for About and the footer | "Furniture made to be lived with, from our own workshop and the makers we trust." (1 sentence, 15 words); in the footer | ✅ Met | `brandContent.js:16–17`; `Footer.js:282` |
| R35 | `HERO_HEADLINES`: three candidates, one `*accent*` word each | "Seating for the way you \*live\*." / "Comfort, \*quietly\* made." / "Rooms that feel \*finished\*."; one single-word accent each | ✅ Met | `brandContent.js:20–24`; module check: 3 × 1 accent |
| R36 | `HERO_SUPPORT_LINES`: three candidates, 14 words or fewer | 12 / 12 / 11 words. `[1]` is Prompt 29's "Some made in our own workshop, the rest from makers we trust." (was "Made in our own workshop, alongside brands we trust, and built for everyday use.") | ↪ Superseded by Prompt 29 (the text of `[1]`, "Claims removed" 7); shape met | `brandContent.js:27–31`; module check word counts |
| R37 | `NEWSLETTER_LINE` | "New pieces, care notes and the occasional offer. A few letters a month, nothing more."; in the newsletter band | ✅ Met | `brandContent.js:34–35`; `Newsletter.js:127` |
| R38 | `ABOUT_INTRO`: 2–3 sentences | 3 sentences; "Some of what we sell is made in our own workshop" (was "Much of what we sell comes from our own workshop") | ↪ Superseded by Prompt 28 (deviation 1, the text); shape met | `brandContent.js:38–39`; module check: 3 sentences |
| R39 | `ASSURANCE_ITEMS`: label and one-line detail for delivery, returns, secure payment and COD | four items with `id`, `label`, `detail`; the COD label is "Cash on Delivery" (was "Cash on delivery") | ↪ Superseded by Prompt 29 (house style "Cash on Delivery"); shape met | `brandContent.js:125–146` |
| R40 | Assurance details defer to live data: templates filled from `settings` / `shipping_methods`, no hard-coded number | "Free delivery above {threshold}", "{days}-day returns on eligible pieces", and two lines without numbers; no digit in any label or detail. The strip fills `{days}` and hides an item without a value. For delivery it prints `resolveTrustBadgeDetail("freeShipping")` ("Above ₹9,999", the live lowest `freeAbove`) instead of the template | ↪ Superseded by Prompt 10 (deviation 4: the delivery detail); templates met | module check (`digits=false` ×4); `AssuranceStrip.js:36–60`; browser: home's strip "Above ₹9,999" |
| R41 | Lines short, warm, refined, no hype, grounded in the site's self-description | no "!", no hype words, no years, warranties or counts. "Customer" appears only in the site's own value "Customer focused" | ✅ Met | module trust-claim scan: only "customer" (×3, the value statement) |
| R42 | Header comment verbatim | "Proposed brand copy, pending client approval. Replace values here, never inline copy in components." | ✅ Met | `brandContent.js:1–2`; module check: verbatim |
| R43 | Every proposed line listed in the build log under "Needs client confirmation" | the Prompt 02 entry has "Proposed brand lines (all need client confirmation)"; `00_INDEX.md` §6 consolidates them; later changes were logged by 10, 28 and 29 | ✅ Met | BUILD_LOG lines 130–139; `00_INDEX.md` §6 "Brand and design" |

### 4.3 Contact details and social links

| # | Requirement (Prompt 02) | Current state | Status | Evidence |
|---|---|---|---|---|
| R44 | Phone `+91 84729 18653` | constant; `tel:+918472918653` in the header's utility strip (shown from 1024px), the footer and the contact facts | ✅ Met | R5; browser: 32 route loads, `tel:+918472918653` in the footer every time and in the header ("+91 84729 18653", visible at 1024 and 1440) |
| R45 | WhatsApp `https://wa.me/918472919541` | `SOCIAL_LINKS.WHATSAPP`; footer, `ContactFacts` | ✅ Met | R8; browser: `wa.me/918472919541` in every footer |
| R46 | `+91 98765 43210` (the site's template placeholder) not used | not the store's number anywhere. `9876543210` appears only as demo customer data in `db.json` and in test fixtures (observation O6) | ✅ Met | deep check 1 |
| R47 | Email `info@kamdhenufurniture.com`, flagged (old brand and domain) | constant and comment; BUILD_LOG Prompt 02 and `00_INDEX.md` §6 | ✅ Met | `constants.js:149–153` |
| R48 | Address only "Assam, India", flagged, no street invented | "Assam, India" in the constant, `settings.store.address` and the policies ("based in Assam, India"); no street or PIN anywhere | ✅ Met | `constants.js:155`; `db.json` `settings.store.address` |
| R49 | Hours `Monday – Saturday: 9:00 AM – 7:00 PM IST, Sunday closed` | constant; footer and `ContactFacts` | ✅ Met | R7; browser: in every footer; "Hours" fact on `/support` and `/help` |
| R50 | Social: WhatsApp only; Facebook, Instagram, YouTube, X `""`; flagged | as specified; flagged in the comment and build log | ✅ Met | R8; BUILD_LOG Prompt 02, "Social" |
| R51 | The footer hides empty entries (rendered DOM, not only the constant) | `Footer.js:260` filters blank URLs; the rendered "Social media" list holds one link (WhatsApp); no `facebook`, `instagram`, `youtube`, `twitter.com` or `x.com` link and no empty `href` anywhere on the page | ✅ Met | browser: `route * *` (32 loads: 4 routes × 2 modes × 4 widths) |
| R52 | The facts are the reference site's | re-read 2026-10-11: `/contact/` has `tel:+918472918653` ("+91 84729-18653"), `https://wa.me/918472919541`, `info@kamdhenufurniture.com`, "Assam, India" with no street or PIN, "Monday - Saturday: 9:00 AM - 7:00 PM, Sunday: Closed", no social profile; `+91 98765 43210` still shown | ✅ Met | extraction from the downloaded pages |

### 4.4 `public/index.html`

| # | Requirement (Prompt 02) | Current state | Status | Evidence |
|---|---|---|---|---|
| R53 | `<html lang="en-IN">` | `en-IN`; `usePageMeta.test.js:168` pins it | ✅ Met | `index.html:2`; browser: `served/lang` |
| R54 | Title "A & S Urbanseat \| Furniture & Seating for Home, Office, Café and Outdoor" | "A & S Urbanseat \| Furniture and seating for home, office, café and outdoor"; equals `DEFAULT_PAGE_TITLE`; storefront pages set their own | ↪ Superseded by Prompt 29 (sentence case, the "Document title" row) and Prompt 32 (`usePageMeta`, `DEFAULT_PAGE_TITLE`) | `index.html:6`; `constants.js:16–17`; browser: `served/title` |
| R55 | Meta description of 160 characters or fewer, in the brand voice | "Furniture and seating for homes, offices, cafés and outdoor spaces, from our own workshop and the makers we trust.": **114 characters** | ✅ Met | `index.html:7–10`; counted by code point (jsdom and the served page) |
| R56 | Keywords: furniture and seating terms only | 12 terms (furniture, seating, chairs, sofas, dining tables, office chairs, office furniture, café furniture, restaurant furniture, outdoor furniture, home furniture, India); no electronics, fashion, beauty or sport | ✅ Met | `index.html:11–14`; banned-term scan: none |
| R57 | Meta author | "A & S Urbanseat" | ✅ Met | `index.html:15` |
| R58 | `theme-color`: the paper token | `#faf7f2`, equal to `--sf-brand-paper` and `LIGHT.background.default` | ✅ Met | `index.html:19`; byte match against both sources |
| R59 | A second `theme-color` with `media="(prefers-color-scheme: dark)"` and the dark base, which dark mode uses | **Found:** present, `#0a1426` (byte match), but never used. The first tag had no `media`, so it always matched. The HTML standard returns the first `theme-color` in tree order whose `media` matches or is absent, and Blink's `Document::ThemeColor()` does the same, so dark mode got paper `#faf7f2`. **Repaired:** the paper tag carries `media="(prefers-color-scheme: light)"`, so dark mode now resolves `#0a1426`; a browser that ignores `media` still takes the first tag, paper, as before | ✅ Met: repaired by V2-01 (was a gap, §6) | before: `index.html:19–20`; WHATWG "obtain a page's theme color" steps; Chromium `third_party/blink/renderer/core/dom/document.cc` `Document::ThemeColor()`; browser `theme-color/dark` resolved `#faf7f2` (FAIL). After: `index.html:21–22`; browser `theme-color/light` → `#faf7f2`, `theme-color/dark` → `#0a1426`; dev server: 14 loads resolve the scheme's colour |
| R60 | Open Graph title, description, type, site name | `og:type` website, `og:site_name`, `og:locale` en_IN, `og:title` = the title (sentence case), `og:description` = the description | ↪ Superseded by Prompt 29 (`og:title` in sentence case); others met | `index.html:24–35`; jsdom: og:title == title, og:description == description |
| R61 | `og:url`: a placeholder domain, flagged | `https://urbanseat.example/`, with a comment; `SITE_URL_PLACEHOLDER` mirrors it; `00_INDEX.md` §6 and §7 | ✅ Met | `index.html:22–27`; `constants.js:20–23` |
| R62 | `og:image` = the light logo URL, `og:image:width` 1286, `og:image:height` 426 | equal to `LOGO_URLS.light`; 1286 / 426; plus `og:image:alt` | ✅ Met | `index.html:36–42`; jsdom: og:image == LOGO_URLS.light |
| R63 | Twitter tags | `twitter:card` summary_large_image, `url`, `title`, `description`, `image` (the light logo), `image:alt`, written with `name=` (0 with `property=`) | ✅ Met | `index.html:44–59` |
| R64 | Icons verified with `ls public` and `file public/*.png`, pixel sizes recorded | 16×16, 32×32, 180×180, 192×192, 512×512 RGBA; `favicon.ico` holds 16, 32 and 48; recorded in BUILD_LOG Prompt 02 | ✅ Met | `file public/*.png`; ICO directory parse; IHDR read |
| R65 | `<link rel="icon" href="%PUBLIC_URL%/favicon.ico" sizes="any">` | as specified | ✅ Met | `index.html:63`; browser: `/favicon.ico` 200 `image/x-icon` |
| R66 | The 16 and 32 PNGs, with `sizes` | `sizes` 32x32 and 16x16, `type="image/png"`, true to the files | ✅ Met | `index.html:64–65`; browser: both 200 `image/png` |
| R67 | `<link rel="apple-touch-icon" href="%PUBLIC_URL%/apple-touch-icon.png">` | with `sizes="180x180"` (true) | ✅ Met | `index.html:66`; browser: 200 `image/png` |
| R68 | The manifest link | `%PUBLIC_URL%/manifest.json` | ✅ Met | `index.html:71`; browser: 200 |
| R69 | Links to `favicon.svg`, `logo192.png`, `logo512.png` removed | none anywhere | ✅ Met | deep check 1 (no hit) |
| R70 | No icon or image file generated | `public/` holds the same 9 files as at `90402a2`; only `index.html`, `manifest.json` and `robots.txt` (Prompt 32's comment) changed | ✅ Met | `git ls-tree` at both; `git diff --stat 90402a2 -- public/` |
| R71 | Splash in light mode: paper with the light logo, centred | `#faf7f2` and `urbanseat-logo.png`, centred to the pixel at 360/768/1024/1440, with no saved theme and with a saved "light" over a dark device | ✅ Met | browser: `splash/os-light/*`, `splash/saved-light-os-dark/*` (8 of 8) |
| R72 | Splash in dark mode: the dark base with the white logo, keyed like the pre-paint script | `#0a1426` and `urbanseat-logo-white.png` whenever `body.dark` is set (device dark, or a saved "dark" over a light device); the light logo never on the dark base | ✅ Met | browser: `splash/os-dark/*`, `splash/saved-dark-os-light/*` (8 of 8) |
| R73 | The splash logo is the logo artwork (Prompt 02: the PNG through `data-src-*`) | Cloudinary's resized WebP copies through `srcset` (640w, 960w; about 13 KB against 141 KB), the PNG kept as `src` and as the fallback when a copy fails | ↪ Superseded by Prompt 32 (the logo's `srcset`) | `index.html:219–257`; browser: `currentSrc` `f_auto,q_auto,w_640` |
| R74 | One 2px caramel progress hairline that animates slowly | one bar in a 2px track; `#ae773d` light, `#ddb185` dark; grows and retracts over 2.4s | ✅ Met | `index.html:137–173`; browser: `bars: 1`, `trackHeight: 2px`, `loaderHairline 2.4s` |
| R75 | No spinner stack, no "MY STORE" text, no gradient animation on `body` | none | ✅ Met | jsdom: 0 "gradient", no `gradientShift`; deep check 1 |
| R76 | Under `prefers-reduced-motion` the hairline does not animate | `animation: none; transform: none` (a still, full-width line); the fade transition is dropped too | ✅ Met | `index.html:175–184`; browser: `reduced-motion/reduce` |
| R77 | Keep the fade-out | the `fade-out` class, its 0.6s opacity transition and the 600ms `display: none` are byte-identical to the boilerplate. As in the boilerplate, `body.react-loaded #loading-screen { display: none }` removes the splash in the frame `react-loaded` lands, so the fade never shows (observation O1) | ✅ Met | R28; browser: at `react-loaded` the splash is already `display: none` (normal and timeout paths) |
| R78 | Keep the 10s safety timeout (the loader can never stay up for good) | **Found:** intact (with the bundle blocked the splash is up at 9s and gone at 11s), but it needs JavaScript. With JavaScript off the splash (`position: fixed`, `z-index: 9999`) covered the `<noscript>` message for good, its logo was a broken-image icon (the `src` is set by script) and the hairline ran forever. **Repaired:** a `<noscript><style>` in `<head>` hides the splash when scripts cannot run; with scripts on it is inert, and the bundles are byte-identical | ✅ Met: repaired by V2-01 (was partial, §6) | before: `index.html:102–111, 193, 219–232, 309`; browser `safety-timeout/10s` PASS, `nojs/noscript-visible` FAIL (the element at the top left was `loading-screen`). After: `index.html:193–202`; browser `nojs/noscript-visible` PASS (splash `display: none`, the message shown), `safety-timeout/10s` PASS; screenshots `before/nojs-1440.png`, `after/nojs-1440.png` |
| R79 | Pre-paint script: same theme detection, `theme` key, `body.dark` / `body.light` | the same rule as `ThemeContext` (`saved === "dark" \|\| (!saved && prefers dark)`); the key and class names unchanged; `localStorage` wrapped in `try` (with storage blocked it still sets the class) | ✅ Met | `index.html:195–214`; `src/context/ThemeContext.js:447–468`; browser: `storage-blocked/pre-paint` |
| R80 | `document.body.style.backgroundColor`, not the `background` shorthand | `backgroundColor` only; no `style.background =` | ✅ Met | `index.html:212`; jsdom check |
| R81 | Solid colours equal to `LIGHT.background.default` / `DARK.background.default` | `#faf7f2` / `#0a1426`, byte match with `colors.js:43, 89` and the CSS; the body's computed `background-image` is `none` | ✅ Met | jsdom check; browser: `bodyInlineBg` and `bodyBgImage` in every splash row |
| R82 | The admin's `body.admin-area` background still wins; the side effect recorded | the admin body computes slate `rgb(248, 250, 252)` / `rgb(11, 18, 32)` (the `!important` rules), not the inline paper or navy-ink; side effect in BUILD_LOG Prompt 02, Decisions | ✅ Met | `src/App.css:85–91`; browser: `admin/*` (4 of 4) |
| R83 | The inline `body` gradient and the `gradientShift` keyframes removed; no purple | the only colour literals are `#faf7f2`, `#0a1426`, `#ae773d`, `#ddb185`; none of the boilerplate's purple or slate values | ✅ Met | jsdom: hex inventory; boilerplate-literal scan: none |

### 4.5 `public/manifest.json`

| # | Requirement (Prompt 02) | Current state | Status | Evidence |
|---|---|---|---|---|
| R84 | `name: "A & S Urbanseat"` | as specified | ✅ Met | `manifest.json:2`; CDP `Page.getAppManifest` |
| R85 | `short_name: "Urbanseat"` | as specified | ✅ Met | `manifest.json:3` |
| R86 | `description`, one sentence | the meta description | ✅ Met | `manifest.json:4` |
| R87 | `start_url: "."` | as specified | ✅ Met | `manifest.json:19` |
| R88 | `display: "standalone"` | as specified | ✅ Met | `manifest.json:20` |
| R89 | `theme_color` and `background_color` from the palette | `#faf7f2` / `#faf7f2`, as `DESIGN_SYSTEM.md` §12 lists | ✅ Met | `manifest.json:21–22` |
| R90 | Icons: the 192 and 512 android-chrome files, true `sizes`, `type: "image/png"`, `purpose: "any"` | both; served 200 `image/png` with IHDR 192×192 and 512×512 | ✅ Met | `manifest.json:5–18`; browser: `manifest/icon *` |
| R91 | Valid JSON; the icons resolve in DevTools | parses; Chromium's manifest parser reports no error and no installability error | ✅ Met | `JSON.parse`; browser: `manifest/cdp-parse` (`errors: []`), `Page.getInstallabilityErrors` → `[]` |

### 4.6 Functional guardrails

| # | Guardrail | Current state | Status | Evidence |
|---|---|---|---|---|
| R92 | 1. Data and API contract untouched; `formatCurrency` keeps its signature and output | `a1318e6` touched no service, `db.json`, route or component logic; R18 | ✅ Met | `git show --stat a1318e6`; R18 |
| R93 | 2. Colour literals only in `index.html` and `manifest.json`, copied from the design system, each noted in the build log | the four in `index.html` and two in the manifest are the ones logged, and still byte-match the tokens; none elsewhere in Prompt 02's diff | ✅ Met | BUILD_LOG lines 153–156; jsdom check; `git show a1318e6` |
| R94 | 3. Admin untouched; `APP_NAME` coupling grepped and recorded | no admin file in `a1318e6`. The admin uses the name only as logo `alt` (`AdminLayout.js:341`, `AdminLogin.js:138`), recorded by Prompt 02. Since `90402a2` the admin carries three owner-approved changes, none from Prompt 02 (§5, deep check 10) | ✅ Met | `git show --stat a1318e6`; `git diff --stat 90402a2 -- src/pages/Admin src/components/AdminLayout src/theme/adminTheme.js` |
| R95 | 4. Brand consistency: stale identity strings replaced in scope; whole-tree grep; out-of-scope hits listed | none left in scope. At `a1318e6`, `src` and `public` held only `AdminOrders.js:367`, which was listed | ✅ Met | deep check 1; `git grep … a1318e6 -- src public` |
| R96 | 5. Accessible: `lang`, logo `alt`, splash contrast AA | `en-IN`; `alt="A & S Urbanseat"`; `role="status"` named "Loading A & S Urbanseat". Contrast: lettering 15.95 : 1 and tagline 15.60 : 1 on paper, the white logo 18.41 : 1 on the dark base, hairline 3.57 : 1 / 9.38 : 1 (decorative, `aria-hidden`); the caramel wordmark (1.84 : 1) is a logotype, exempt under WCAG 1.4.3 | ✅ Met | R53; `index.html:217, 222, 233`; splash contrast script |
| R97 | 6. No fabricated trust signals; "20+ years" and the warranty claim listed for confirmation, not used | none in constants, tokens, brand lines or static files; the reference site still claims "20+ Years Warranty", "Since 20+ Years" and a "Happy Clients" counter (2026-10-11), none used | ✅ Met | claim grep over the scope files (only comments, the unconfigured `warranty` entry, CSS `100%`); BUILD_LOG Prompt 02 |
| R98 | 7. Test before done | §4.9 | ✅ Met | §4.9 |

### 4.7 Implementation notes

| # | Note (Prompt 02) | Current state | Status | Evidence |
|---|---|---|---|---|
| R99 | 1. Read the index, Prompt 01's entry and the design system; inspect files before editing | every colour Prompt 02 wrote is a design-system value, with its source named in comments | ✅ Met | `index.html:17–18, 86–89` |
| R100 | 2. `APP_NAME` comes from `process.env.REACT_APP_NAME` at build time | inlined in the bundle | ✅ Met | R32 |
| R101 | 3. Consumers show the new values (header phone, footer, Help, Support, the policy date, the invoice header) | `Header.js:270–274`, `Footer.js:325–357, 424`, `ContactFacts.js:34–70`, `PolicyPage.js:113`, `Invoice.js:101–104` | ✅ Met | browser: `route *`, `invoice/store-facts` |
| R102 | 4. No `react-helmet`; Prompt 32 handles per-page titles with `document.title` | none in `package.json`; `src/hooks/usePageMeta.js` | ✅ Met | `grep helmet package.json`: none |
| R103 | 5. Validate the manifest and load it in DevTools | R91 | ✅ Met | R91 |
| R104 | 6. No image file added to `public/` | R70 | ✅ Met | R70 |

### 4.8 Acceptance criteria

| # | Criterion | Current state | Status | Evidence |
|---|---|---|---|---|
| R105 | `APP_NAME` resolves to `A & S Urbanseat` in the three env files and the fallback; `APP_TAGLINE` as specified | yes | ✅ Met | R1, R2, R12–R14 |
| R106 | `brandContent.js` exists with the listed exports, each line in the build log | yes | ✅ Met | R30, R34–R43 |
| R107 | Contact, hours and social match the facts; placeholders recorded | yes | ✅ Met | R44–R52 |
| R108 | `index.html`: new title, meta, OG and Twitter; `lang`; two `theme-color` tags; icons only to existing files; brand splash with the right logo per mode; solid pre-paint backgrounds; no purple | all present. The dark `theme-color` never applied (R59) until V2-01's repair; it now does | ✅ Met: repaired by V2-01 (was partial, R59) | R53–R83 |
| R109 | `manifest.json`: every field; icons resolve | yes | ✅ Met | R84–R91 |
| R110 | `trustBadges` honest; `returnsWindowDays` flagged | yes | ✅ Met | R22–R25 |
| R111 | Admin untouched (no admin file in the diff) | yes | ✅ Met | R94 |
| R112 | `npm run build` passes with no new warnings | yes, at the baseline and after the repair | ✅ Met | §1; §9 |

### 4.9 Test and QA

| # | Step (Prompt 02) | Result (V2-01 run) | Status | Evidence |
|---|---|---|---|---|
| R113 | 1. Slow 3G reload in both modes: the right logo, no layout shift on mount, the loader leaves when the app renders | 390px, 2s latency, 50 KB/s, cache off: the splash with the right logo and ground (light and dark); the app painted at 13.4s and the splash left 7–9ms later, by the app, not the timer (scheduled at 5.6s, due at 15.6s); CLS **0** | ✅ Met | browser: `slow3g/light`, `slow3g/dark`; `slow3g-*-early.png` |
| R114 | 2. Tab title and favicon; the meta tags in the source | served title and every tag as in §4.4; favicon and icons 200 with the right types | ✅ Met | browser: `served/*` |
| R115 | 3. 360, 768, 1024, 1440: the logo scales (60vw, at most 320px) and stays centred | 216px at 360 (60vw), 320px from 768; centre equal to the viewport's | ✅ Met | browser: `splash/*` (16 of 16) |
| R116 | 4. `lang` and the logo `alt` | R53, R96 | ✅ Met | R53, R96 |
| R117 | 5. `/support`, `/help`, `/orders` (signed in as `user@example.com`) and the footer show the contact values | the four facts in the footer on every load; Email, Phone, Hours on `/support` and `/help`; signed in, `/orders` lists ORD-20260315-0004, ORD-20250318-0002 and ORD-20250310-0001 with the same footer; the invoice header carries the name, address, email and phone | ✅ Met | browser: `route *` (32), `orders/signed-in`, `invoice/store-facts` |
| R118 | 6. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0 | 86 suites, 1,429 tests, exit 0; build clean (baseline and after) | ✅ Met | §1; §9 |
| R119 | 7. `/admin` login and dashboard unchanged | both render at 1440 and 390 in both modes with no console error; slate background; logo `alt` "A & S Urbanseat"; title stays `index.html`'s. Before and after V2-01's repair, the eight captures are pixel-identical | ✅ Met | browser: `admin/*` (4 of 4, both passes); pixel comparison 8 of 8 identical (§9) |
| R120 | 8. The build-log entry under `## Prompt 02 — Brand identity wiring` | present | ✅ Met | BUILD_LOG line 104 |

### 4.10 What the Prompt 02 build-log entry had to contain

| # | Item | In the entry | Status | Evidence |
|---|---|---|---|---|
| R121 | What changed | the file table | ✅ Met | BUILD_LOG lines 108–117 |
| R122 | Decisions | icons, splash, script order, pre-paint, trust badges, helpers, admin coupling, `og:url` | ✅ Met | lines 119–128 |
| R123 | The full list of proposed brand lines | tagline, description, `BRAND_PROMISE`, the three headlines, the three support lines, `NEWSLETTER_LINE`, `ABOUT_INTRO`, the four assurance items: everything in the module at `a1318e6` | ✅ Met | lines 130–139 against `git show a1318e6:src/content/brandContent.js` |
| R124 | Placeholders: email, address, hours, social, returns window, warranty omitted | all six, plus the phone note, the domain and the brand names | ✅ Met | lines 141–151 |
| R125 | Stale "My Store" copy outside scope, with paths; the colour literals | both (`AdminOrders.js:367`, `Footer.js`, `Support.js:99–100`, `AboutUs.js:40`; the six literals) | ✅ Met | lines 153–164 |

**Totals, counted from the table.** 125 requirements.
- **As found:** ✅ Met 113 · ↪ Superseded 9 (R9, R26, R36, R38, R39, R40, R54, R60, R73) · ❌ Gap 1 (R59) · ⚠ Partial 2 (R78, R108).
- **Now:** ✅ Met 116 (R59, R78 and R108 repaired by V2-01) · ↪ Superseded 9 · ❌ 0 · ⚠ 0.

R18 and R21 cite later changes that leave them met.

## 5. Deep checks (as listed in the V2-01 prompt)

1. **Boilerplate leftovers, whole repo.** `grep -rniE "my store|my e-commerce|mystore|your online shopping destination|quality products, great prices|non-premium|98765 ?43210|logo192|logo512|favicon\.svg" src public db.json .env .env.example .env.production server.js`:
   - `src/pages/Admin/AdminOrders.js:367` `"My E-Commerce Store"`: the admin invoice's fallback when `settings.store.name` is missing (admin; finding F3).
   - `9876543210` in demo customer data, not the store's number: `db.json` `users[0].phone`, `users[0].addresses[0].phone`, `orders[0,1,3].billingAddress/shippingAddress.phone`, `leads[0].phone`. Also in test fixtures (`AuthModal`, `Profile`, `Support`, `Checkout` tests) and a `helpers.js:234` comment (observation O6).
   - Nothing else: no `logo192`, `logo512`, `favicon.svg`, "My Store", "non-premium".

   A wider sweep (`e-commerce`, "online shopping", "shop the best", "ultimate destination", the boilerplate address, `support@`, `1800 102`, the purple hex values) finds only the admin-inherited `App.css` purple (documented, §43.4), a `CONFIRM` comment in `legalContent.js`, a comment example in `Profile.js` and demo addresses in `db.json`.
2. **Env files.** `REACT_APP_NAME=A & S Urbanseat` in all three, parsed by CRA's `dotenv` 10.0.0 + `dotenv-expand` 5.1.0 to exactly `"A & S Urbanseat"`. `.env` keeps mock mode on `http://localhost:3001`. `git diff 90402a2 -- .env .env.example .env.production`: three `REACT_APP_NAME` lines and nothing else.
3. **Contact facts.** Byte comparison of the constants with the spec's backticked text: APP_TAGLINE, SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_ADDRESS, SUPPORT_HOURS (U+2013 ×2) all MATCH; APP_NAME fallback MATCH; WhatsApp URL as specified. **Rendered DOM** (32 loads of `/`, `/support`, `/help`, `/privacy`, light and dark, at 360/768/1024/1440; the phone-width Contact disclosure opened first): the footer `<address>` reads "Assam, India · info@kamdhenufurniture.com · +91 84729 18653 · Message us on WhatsApp (opens in a new tab) · Monday – Saturday: 9:00 AM – 7:00 PM IST, Sunday closed". It links `tel:+918472918653`, `mailto:info@kamdhenufurniture.com` and `https://wa.me/918472919541`. The "Social media" list holds exactly one link (WhatsApp); there is no link to Facebook, Instagram, YouTube or X, and no empty `href`.
4. **`index.html`.** `lang="en-IN"`. Title superseded (R54). Description **114 characters**. Keywords furniture-only. OG and Twitter complete; `og:image` the light logo at 1286 × 426; `og:url` placeholder flagged. Two `theme-color` tags whose values byte-match `colors.js` and `storefront-tokens.css`, **but the dark one was never selected** (R59; repaired, §6.1). Icon links only to existing files, each `sizes` true to the pixels (16, 32, 180; `favicon.ico` 16/32/48 with `sizes="any"`). No purple, no `body` gradient, no `gradientShift`.
5. **Pre-paint script.** `document.body.style.backgroundColor` with `#faf7f2` / `#0a1426` (= `LIGHT/DARK.background.default` today). The `theme` key and `body.dark`/`body.light` unchanged. The admin's `body.admin-area` background wins: computed `rgb(248, 250, 252)` / `rgb(11, 18, 32)` on login and dashboard.
6. **Loading screen.**
   - Logo per mode, consistent with the pre-paint script, in all four combinations of device and saved theme (16/16).
   - `alt="A & S Urbanseat"`; a single 2px caramel hairline.
   - No animation under reduced motion; fade-out code and the 10s timeout intact (9s up, 11s gone).
   - `react-loaded` / `MutationObserver` byte-identical to the boilerplate; logo `min(60vw, 320px)`.
   - Splash contrast AA (R96).
   - **Gap:** with JavaScript off the splash never left (R78; repaired, §6.2).
7. **`manifest.json`.** Valid JSON. `name`, `short_name` "Urbanseat", `description`, `start_url` ".", `display` "standalone", `theme_color`/`background_color` `#faf7f2` (= the paper token). Icons are the 192 and 512 files with true sizes, `image/png`, `purpose: "any"`. Chromium parses it with no error and reports no installability error.
8. **`brandContent.js`.**
   - Every export Prompt 02 lists exists, as a named export and in the default export.
   - Three headlines with one single-word `*accent*` each; three support lines of 12/12/11 words; `NEWSLETTER_LINE`; `ABOUT_INTRO` of 3 sentences; four `ASSURANCE_ITEMS` with `{threshold}`/`{days}` templates and no digit; the header comment verbatim.
   - **Inline duplicates:** each of the 33 brand strings (14+ characters) was searched in `src/components` and `src/pages`. No brand line (headline, support line, promise, newsletter line, About copy) is copied into a component; the two source hits are a doc comment in `renderAccent.js` and a comment in `AboutUs.js`.
   - The assurance *labels* "Secure payment" and "Cash on Delivery" are typed inline in the footer's trust bar, the cart's and checkout's promise rows (finding F4), and "Cash on Delivery" is also the payment method's name across order screens and the admin.
   - Copy revised by Prompts 28 and 29 is superseded, not a gap.
9. **No fabricated trust signals.** No "20+ years", warranty years or customer counts in constants, tokens, brand lines or static files. `trustBadges` is the four honest badges; `returnsWindowDays` is flagged.
10. **Helpers and admin.**
    - `formatDate` and `formatNumber` are byte-identical to `90402a2`. `formatCurrency` keeps its signature, and its output is identical on 70 inputs (the body caches its formatter, Prompt 32's recorded follow-up).
    - `git diff 90402a2 -- src/pages/Admin src/components/AdminLayout src/theme/adminTheme.js` shows four files:
      - `AdminLayout.js`: Prompt 33's logo lines, plus its `flushSync` logout follow-up;
      - `AdminLayout.test.js`: the follow-up's test;
      - `AdminLogin.js`: logo lines only;
      - `AdminProducts.js`: Prompt 03's variant spread.
    - That is the three owner-approved changes `00_INDEX.md` §5 item 28 records; none is Prompt 02's, and `adminTheme.js` is untouched. The V2-01 prompt expected "only Prompt 33's logo lines" (finding F6).
11. **Build-log completeness.** The Prompt 02 entry contains the full list of proposed brand lines (as at `a1318e6`), the placeholders, the out-of-scope stale copy with paths, and the colour literals. Not in it, and now recorded by V2-01:
    - the meta description's length (114);
    - the splash contrast ratios;
    - the throttled-load evidence (it blocked the bundle instead);
    - the `/support`, `/help` and `/orders` walk;
    - an admin render check (it recorded the diff only);
    - `POLICY_LAST_UPDATED` as a placeholder;
    - the splash's accessible name "Loading A & S Urbanseat" and the keywords as proposed copy.

## 6. Gaps found and repairs

Both repairs are in `public/index.html`, inside Prompt 02's scope. They are the only code change V2-01 makes. The production bundles (every JS, CSS and asset file) are byte-identical to the baseline build's; the built `index.html` differs by exactly the two insertions below.

### 6.1 R59 (and R108): the dark `theme-color` never applied

- **Found.** The paper tag came first and had no `media`, so it matched in every mode. The HTML standard picks the first `theme-color` in tree order whose `media` matches or is absent, and Blink's `Document::ThemeColor()` does the same, so the dark tag could never be chosen. In dark mode the browser's bar (Android Chrome, Safari's tab bar, an installed app's title bar) was paper above a navy-ink page.
- **Repair** (`public/index.html:17–22`): `media="(prefers-color-scheme: light)"` on the paper tag, plus two comment lines. The order is kept, so a browser that ignores `media` on `theme-color` still takes the paper, as before. The values are unchanged and still byte-match the tokens.
- **Not done:**
  - A third, media-less fallback tag: the spec and §12 ask for two, and in a browser that reads `media`, `prefers-color-scheme` always matches one of them.
  - Following the site's own light/dark switch: finding F1.
- **Re-verified:**
  - Production build: `theme-color/light` → `#faf7f2` and `theme-color/dark` → `#0a1426`, resolved by the standard's steps with Chromium's own media evaluation.
  - Development server: 14 loads resolve the scheme's colour.
  - `usePageMeta.test.js`, which parses `index.html`, passes unchanged.

### 6.2 R78: with JavaScript off, the splash never left

- **Found.** The splash's hand-off (`src/index.js`) and its 10s safety net are scripts. Without JavaScript the fixed, `z-index: 9999` splash covered the `<noscript>` message for good; its logo was a broken-image icon (Prompt 02 sets the `src` from script, so only one variant downloads) and the hairline ran forever. The boilerplate had the same hole, but showed text instead of a broken image.
- **Repair** (`public/index.html:193–202`): `<noscript><style>#loading-screen { display: none; }</style></noscript>` at the end of `<head>`, with a three-line comment. This is the one mechanism that applies exactly when scripts cannot run. With scripting on, the HTML parser reads `<noscript>` content as text and ignores it, so normal visits are untouched.
- **Not done:** styling the no-JavaScript page; the boilerplate's sentence stays as it was.
- **Re-verified:**
  - `nojs/noscript-visible` passes: the splash computes `display: none` and the message is the first thing on the page (`after/nojs-1440.png`).
  - With scripts on, all 16 splash rows, reduced motion, the 10s safety net and the Slow 3G loads pass as before.
  - 25 of 25 screenshots taken in both passes (splash in four theme combinations, reduced motion, footer, support, orders, admin login and dashboard) are pixel-identical.

### 6.3 Build-log completeness

The original entry has everything Prompt 02's step 8 asked for (R121–R125). The evidence it did not record is now in the V2-01 entry, without rewriting Prompt 02's entry:
- the description's length;
- the splash contrast ratios;
- a throttled load;
- the `/support`, `/help` and `/orders` walk;
- an admin render check;
- `POLICY_LAST_UPDATED` as a placeholder;
- the splash's accessible name and the keywords as copy for approval.

### 6.4 Tests

No Jest test pinned either value, so none changed. A regression test would be a new test file, which is outside V2-01's file scope; it is handed to V2-05 (F7).

## 7. Findings for V2-05

| # | Finding | Where | Why not fixed here |
|---|---|---|---|
| F1 | The browser's theme colour follows the device setting, not the site's own light/dark switch. A visitor who picks the other mode sees a bar that does not match the page. | `public/index.html` `theme-color` tags; `src/context/ThemeContext.js:456–468` writes the mode but not the tags | Following the switch means `ThemeContext` (Prompt 01's file) rewriting the two tags. Prompt 02 specified the media-query approach. Owner decision. |
| F2 | With site storage blocked (a browser set to block all site data), the storefront renders only the crash screen ("SecurityError: Access is denied for this document."). | first `src/context/ThemeContext.js:449` (`localStorage.getItem` in a `useState` initialiser, unguarded); also `CartContext`, `WishlistContext`, `AuthContext`, `src/utils/authStorage.js`, `src/services/api.js` | Pre-existing since the boilerplate. A full fix touches `api.js` and `authStorage.js`, which are protected. Prompt 02's own pre-paint script is guarded and works. |
| F3 | The admin invoice falls back to "My E-Commerce Store" if `settings.store.name` is missing. | `src/pages/Admin/AdminOrders.js:367` | Admin file, owner only; the seed supplies "A & S Urbanseat". Known since Prompt 02. |
| F4 | The trust-cue labels are typed inline in three promise rows instead of read from `TRUST_BADGE_CATALOG`, which §39.9 names as their home: "Secure payment" in `Footer.js:247`, `CartDrawer.js:325` and `Checkout.js:1640, 1835`; "Cash on Delivery" in `Footer.js:248` and `CartDrawer.js:329`. | those files | Outside V2-01's scope (component markup). The strings agree today and tests pin them; this is a drift risk only. |
| F5 | `DESIGN_SYSTEM.md` §12's first row reads "`<meta name="theme-color">` (light) / `media="(prefers-color-scheme: dark)"`". Since V2-01 the light tag carries `media="(prefers-color-scheme: light)"` (§6.1); the values are unchanged. The row could name both queries and why (the first match wins). | `prompts/DESIGN_SYSTEM.md` §12 | The design system is outside V2-01's file scope; a wording update only. |
| F6 | V2-05's check F expects the admin diff against `90402a2` to be "Prompt 33's logo lines only". It also holds Prompt 33's `flushSync` follow-up (with `AdminLayout.test.js`) and Prompt 03's `AdminProducts.js` variant spread, both owner-approved and recorded. | `00_INDEX.md` §5 item 28 | A documentation expectation, not a defect: V2-05 should compare against those three. |
| F7 | No Jest test guards V2-01's two repairs: the light `theme-color` tag's `media` (so the dark tag can be chosen) and the `<noscript>` style that hides the splash. A test that parses `public/index.html` (as `usePageMeta.test.js` does) could pin both. | a new test, for example `src/publicIndex.test.js` | V2-01's file scope allows only a test that pins a value it corrects, and none existed; V2-05's scope includes regression tests. |

## 8. Observations (no change)

- **O1. The fade-out never shows.** `body.react-loaded #loading-screen { display: none }` (from the boilerplate) hides the splash in the frame `react-loaded` is added, before the `fade-out` transition can run. Measured: `display: none` at that moment on both the normal and the timeout path. Prompt 32's recorded hand-off ("the loader leaves in the frame that paints the app's first render") depends on this. Recommendation: leave it.
- **O2. The safety net on slow links.** Inline scripts wait for the `<head>` stylesheets, so on Slow 3G the 10s timer starts about 5.6s in and fires about 15.6s in. The app painted at 13.4s (2.2s of margin). On a slower link the timer can remove the splash before the app paints, and the page is blank until React renders. That is the safety net working as designed; a longer timeout is an owner choice.
- **O3.** The splash `<img>` has no `src` in the markup (script sets it, so only one variant downloads). HTML requires `src`, so a validator flags it; there is no user impact.
- **O4. The sharing image.** `og:image` is the 1286 × 426 light logo, 80.8 % transparent. A preview surface that draws transparency dark shows the ink lettering on dark, and `summary_large_image` crops towards 2 : 1. A flattened paper image (for example a Cloudinary pad and background transformation of the same file) would read better. This is for the client, with the production domain.
- **O5.** Prompt 02's premise that "nine admin pages import `formatDate`" was inaccurate (R21). The admin imports `formatCurrency` (`AdminSpecialOffers.js`), whose output is unchanged.
- **O6.** The demo customers' phone (`+91 9876543210`, the reference site's template number) is demo data, removed before launch (`00_INDEX.md` §7); V2-04 owns the supporting data.
- **O7.** `db.json` `settings.seo.metaTitle` keeps the old Title Case title. Prompt 29 proposed the change through the admin, and Prompt 32 does not read `settings.seo`.

## 9. Gate (after the repairs)

| Check | Result |
|---|---|
| `node scripts/validate-db.js` | `✓ all checks passed`, in full mode and with `--catalogue`. `db.json` SHA-256 `3fc7f8f3…`, unchanged |
| `node scripts/check-contrast.js` | every pairing meets its minimum; the mirror check passes |
| `CI=true npm test -- --passWithNoTests` | **86 suites, 1,429 tests, exit 0** (91 s), no console warning; the same as at the baseline |
| `npm run build` (default: `.env.production`, Laravel mode) | "Compiled successfully." main JS 399.62 kB, CSS 34.97 kB gzip, Prompt 34's figures. `CI=true npm run build`, which fails on any warning, gives the same. Only the two dependency notices of DESIGN_SYSTEM §43.6 print |
| Build in JSON Server mode, baseline against repaired | 399.59 / 34.97 kB both. Every JS, CSS and asset file byte-identical; `index.html` differs by the two insertions of §6 |
| Browser, production build, JSON Server mode on a scratch `db.json` | **after: 78 of 78.** Before: 76 of 78, the two failures being the gaps. The checks: 16 splash rows (four theme combinations × 360/768/1024/1440); reduced motion; the 10s safety net; Slow 3G in both modes; the served tags, icons and manifest; theme-color in both modes; 32 route loads (`/`, `/support`, `/help`, `/privacy` × 2 modes × 4 widths: contact block, social list, overflow, console); signed-in `/orders` and an invoice; the admin login and dashboard (2 modes × 1440/390); JavaScript off; storage blocked |
| Development server (`npm start`, mock mode) | `/`, `/support`, `/help`, `/privacy`, `/about`, `/products`, `/admin` in both modes: **0 console errors or warnings** in 14 loads; per-page titles; the admin keeps `index.html`'s title |
| Pixel comparison, before and after | 25 of 25 screenshots identical, including the eight admin login and dashboard captures |
| Scope of the change | `public/index.html`, `prompts/BUILD_LOG.md`, this report. No admin file, `src/services/api.js` (SHA-256 `c32e6138…`, Prompt 34's) or `db.json` in the diff |

## 10. Needs client confirmation (identity)

The current values. The prompts that changed a line are in brackets.

- **Name and tagline:**
  - "A & S Urbanseat" everywhere: env files, fallback, title, manifest, footer "© {year}", invoice, legal text.
  - "Trusted Comfort for Every Home" as printed in the logo. In running text it is "Trusted comfort for every home" (the home page's title, [32]).
- **Brand lines** (`src/content/brandContent.js`):
  - `BRAND_PROMISE`: "Furniture made to be lived with, from our own workshop and the makers we trust." (footer).
  - `HERO_HEADLINES`: "Seating for the way you *live*." (on the hero) · "Comfort, *quietly* made." · "Rooms that feel *finished*.".
  - `HERO_SUPPORT_LINES`: "Chairs, sofas and tables for homes, offices, cafés and the open air." (on the hero) · "Some made in our own workshop, the rest from makers we trust." [29] · "Considered furniture for every room you live, work and gather in.".
  - `NEWSLETTER_LINE`: "New pieces, care notes and the occasional offer. A few letters a month, nothing more.".
  - `ABOUT_INTRO`: "A & S Urbanseat makes and selects furniture for the places people spend their days: homes, offices, cafés and outdoor spaces. Some of what we sell is made in our own workshop; the rest comes from makers we know well, such as Nilkamal, Carlton and Winsome. We put quality first, keep the customer at the centre and build trust one piece at a time." [28]
  - `ASSURANCE_ITEMS`: "Free delivery" / "Free delivery above {threshold}" (the strip shows "Above ₹9,999" [10]) · "Easy returns" / "{days}-day returns on eligible pieces" · "Secure payment" / "Encrypted checkout for cards, UPI and net banking" · "Cash on Delivery" [29] / "Pay when your furniture arrives".
  - About's headline, story, values and closing are Prompt 28's; see its entry.
- **Document and app copy:**
  - `APP_DESCRIPTION`: "Furniture and seating for homes, offices, cafés and outdoor spaces, made to be lived with." (the listing's intro [14]).
  - Meta description, the manifest `description` and `DEFAULT_PAGE_DESCRIPTION`: "Furniture and seating for homes, offices, cafés and outdoor spaces, from our own workshop and the makers we trust." (114 characters).
  - The title: "A & S Urbanseat | Furniture and seating for home, office, café and outdoor" [29].
  - The keywords: furniture, seating, chairs, sofas, dining tables, office chairs, office furniture, café furniture, restaurant furniture, outdoor furniture, home furniture, India.
  - The manifest `short_name` "Urbanseat".
  - The splash's accessible name "Loading A & S Urbanseat".
- **Contact facts**, re-read from `kamdhenufurniture.in/contact/` on 2026-10-11 and unchanged there:
  - phone `+91 84729 18653`; WhatsApp `+91 84729 19541` (`https://wa.me/918472919541`);
  - email `info@kamdhenufurniture.com` (the old brand's `.com` domain);
  - hours "Monday – Saturday: 9:00 AM – 7:00 PM IST, Sunday closed";
  - address "Assam, India" (the street and PIN are missing);
  - and which source is the truth: `constants.js` or Admin → Settings.
- **Social profiles:** none except WhatsApp. Facebook, Instagram, YouTube and X appear once their URLs are added to `SOCIAL_LINKS`.
- **Returns window:** `STOREFRONT_CONFIG.returnsWindowDays` 7, a placeholder.
- **Trust claims held back:** the `warranty` and `support` badges. The reference site still says "20+ Years Warranty", "Since 20+ Years" and shows a "Happy Clients" counter (2026-10-11); none is used until confirmed.
- **`POLICY_LAST_UPDATED`** "7 October 2026": the policies are drafts; set the real review date once they are approved.
- **Brand names** Nilkamal, Carlton and Winsome in `ABOUT_INTRO`: may they be named?
- **Production domain:** for `og:url`, `twitter:url` and `SITE_URL_PLACEHOLDER` (`https://urbanseat.example/` today).
- **The sharing image:** the transparent 1286 × 426 logo today (O4); a flattened paper image would read better in previews.
- **The browser's bar colour** now follows the device's light or dark setting (§6.1). Following the site's own switch instead is an owner decision (F1).
