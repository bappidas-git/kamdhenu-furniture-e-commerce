# V2-01 — Brand identity wiring: max-effort audit and repair

**Prompt V2-01 of 5 · re-verifies original Prompt 02 (commit `a1318e6`) · run at MAX effort in a fresh session**

## Why this prompt exists

The original Prompt 02 (`prompts/02_brand-identity-wiring.md`) ran at medium effort. Thirty-two later prompts were built on top of it, so it must **not** be re-run. This prompt holds that work to the max-effort standard. You audit every requirement of Prompt 02 against the repository as it is today, prove each one with evidence, and repair every real gap in place. Everything that works today keeps working.

## Depends on

The finished 34-prompt build (`prompts/00_INDEX.md` says "Build complete"). No earlier V2 prompt.

## Context

A & S Urbanseat is a Create React App storefront for furniture and seating in India (INR, `en-IN`), with a dual-mode `src/services/api.js` (JSON Server branch and a Laravel branch returning `{ success, data, meta }`) and `db.json` as mock data. Tokens live in `src/theme/storefront-tokens.css`, `src/theme/colors.js`, `src/theme/tokens.js` and are documented in `prompts/DESIGN_SYSTEM.md`. The admin panel was untouched except for its logo (Prompt 33). The repository has 86 Jest suites. `CI=true npm test -- --passWithNoTests` and `npm run build` must stay green. The pre-build boilerplate is commit `90402a2`.

## Objective

Every requirement, acceptance criterion and guardrail in `prompts/02_brand-identity-wiring.md` is either **met with evidence**, **superseded by a recorded later decision** (cited), or **repaired now**. When you finish, no part of the brand-identity layer rests on an unchecked medium-effort result.

## Scope — files you may change

Exactly Prompt 02's scope: `src/utils/constants.js` (only the keys Prompt 02 owns: `APP_NAME` fallback, `APP_TAGLINE`, `APP_DESCRIPTION`, `SUPPORT_*`, `SOCIAL_LINKS`, `POLICY_LAST_UPDATED`, `DEFAULT_CURRENCY`), `.env`, `.env.example`, `.env.production`, `src/theme/tokens.js` → `STOREFRONT_CONFIG` (`trustBadges`, `returnsWindowDays`), `public/index.html`, `public/manifest.json`, `src/content/brandContent.js`. Also `prompts/BUILD_LOG.md`, the new report file and, if a test pins a value you correct, that test.

Do not touch: `db.json`, `src/services/*`, the admin (`src/pages/Admin/*`, `src/components/AdminLayout/*`, `src/theme/adminTheme.js`), and any component's markup or styles. A defect you find outside the scope goes into the report as a finding for V2-05.

## Method (mandatory, in this order)

0. **Record the V2 baseline:** run `git rev-parse HEAD` before any change and write it at the top of the report as `V2 baseline: <hash>`. Later V2 prompts diff against it, and V2-05 uses it to prove that ids, slugs and SKUs did not change.
1. **Read** `prompts/00_INDEX.md`, `prompts/02_brand-identity-wiring.md` in full, the `## Prompt 02` entry of `prompts/BUILD_LOG.md`, then search the rest of `BUILD_LOG.md` and `DESIGN_SYSTEM.md` for every later change to the same files and values (grep for `index.html`, `manifest`, `brandContent`, `constants.js`, `STOREFRONT_CONFIG`, `trustBadges`, `SUPPORT_`, `SOCIAL_LINKS`, `theme-color`, `loading screen`, `APP_NAME`). Prompts 08, 12, 28, 29, 31, 32, 33 and 34 are the likely ones. List every later decision you find with its prompt number.
2. **See what the medium session actually did:** `git show --stat a1318e6` and read its diff.
3. **Build the requirement matrix.** Split Prompt 02 into atomic requirements: every bullet in Scope, every line under "Brand and design requirements", each of the 7 functional guardrails, every acceptance criterion, every Test-and-QA step and every item the build-log entry had to contain. Number them (R1, R2, …). Expect **60 or more**. For each, record: requirement · current state · status (`✅ Met` / `↪ Superseded by Prompt NN (cite)` / `❌ Gap` / `⚠ Partial`) · evidence (command output, `file:line`, or screenshot note). Write it to `prompts/prompt_V2/reports/V2-01_REPORT.md` **before editing anything**.
4. **Repair** every `❌` and `⚠` inside scope, smallest correct change, then re-verify that row and update the matrix with the fix and new evidence.
5. **Run the full gate** (below) and the regression checks; fix anything you caused.
6. **Log** the result (below).

## Deep checks medium effort commonly skips (verify each explicitly)

- **Boilerplate leftovers, whole repo:** `grep -rniE "my store|my e-commerce|mystore|your online shopping destination|quality products, great prices|non-premium|98765 ?43210|logo192|logo512|favicon\.svg"` across `src`, `public`, `db.json`, `.env*`, `server.js`. Every hit is fixed (if in scope) or reported with its path.
- **Env files:** `REACT_APP_NAME=A & S Urbanseat` in all three; `.env` still has `REACT_APP_USE_MOCK_API=true` and `REACT_APP_API_URL=http://localhost:3001`; no other key changed versus `90402a2` (`git diff 90402a2 -- .env .env.example .env.production`).
- **Contact facts exact:** phone `+91 84729 18653`, WhatsApp `https://wa.me/918472919541`, email `info@kamdhenufurniture.com`, address `Assam, India` with no invented street, hours `Monday – Saturday: 9:00 AM – 7:00 PM IST, Sunday closed`; empty social keys are really hidden in the rendered footer (check the DOM, not just the constant).
- **`index.html`:** `lang="en-IN"`; title as specified unless Prompt 32 superseded it; meta description **≤ 160 characters (count it)**; keywords furniture-only; OG and Twitter tags complete (`og:image` = light logo, `og:image:width` 1286, `og:image:height` 426, `og:url` placeholder flagged); **two** `theme-color` tags, light and `(prefers-color-scheme: dark)`, whose values **byte-match** the current tokens in `colors.js` / `storefront-tokens.css`; icon links point **only** at files that exist (`ls public`, `file public/*.png`, and check each declared `sizes` against the real pixel size); no purple, no gradient on `body`, no `gradientShift` keyframes.
- **Pre-paint script:** uses `document.body.style.backgroundColor` (not the `background` shorthand) with the solid light and dark base colours that equal `LIGHT.background.default` / `DARK.background.default` today; `theme` localStorage key and `body.dark` / `body.light` class names unchanged; the admin's `body.admin-area` background still wins.
- **Loading screen:** right logo per mode (light logo on paper, white logo on dark base, consistent with the pre-paint script), `alt="A & S Urbanseat"`, single 2px caramel hairline, no animation under `prefers-reduced-motion`, fade-out and the 10 s safety timeout intact, `react-loaded` / `MutationObserver` mechanics intact, logo max-width 60vw / 320px, splash contrast AA (`node scripts/check-contrast.js` or compute it).
- **`manifest.json`:** valid JSON; `name`, `short_name: "Urbanseat"`, `description`, `start_url: "."`, `display: "standalone"`, `theme_color`/`background_color` equal to the tokens; icons are the 192 and 512 android-chrome files with true `sizes`, `type: "image/png"`, `purpose: "any"`.
- **`brandContent.js`:** every export Prompt 02 lists exists (`BRAND_PROMISE`, `HERO_HEADLINES` ×3 with one `*accent*` word each, `HERO_SUPPORT_LINES` ×3 ≤ 14 words, `NEWSLETTER_LINE`, `ABOUT_INTRO`, `ASSURANCE_ITEMS` as `{threshold}`-style templates with no hard-coded numbers), the header comment is present, and no component duplicates these lines inline (grep the strings in `src/components` and `src/pages`). Copy revised by Prompt 29 counts as superseded, not as a gap.
- **No fabricated trust signals:** no "20+ years", warranty years or customer counts used as fact anywhere in constants or brand lines; `STOREFRONT_CONFIG.trustBadges` lists only `securePayment`, `cod`, `easyReturns`, `genuine` (unless a later prompt recorded otherwise); `returnsWindowDays` flagged.
- **`formatDate` / `formatNumber` untouched** in `src/utils/helpers.js` versus `90402a2`; `formatCurrency` signature and INR `en-IN` output unchanged.
- **Admin untouched:** `git diff 90402a2 -- src/pages/Admin src/components/AdminLayout src/theme/adminTheme.js` shows only Prompt 33's logo lines.
- **Build-log completeness:** the original Prompt 02 entry must contain the full list of proposed brand lines, the placeholders, the out-of-scope "My Store" hits and the colour literals. If anything is missing, add it in **your** V2-01 entry. Do not rewrite history.

## Functional guardrails

1. Data/API contract untouched: no change to `src/services/api.js`, `db.json`, routing or component logic.
2. Colour literals only in `index.html` and `manifest.json`, copied from the current tokens.
3. Admin untouched.
4. Brand consistency everywhere identity is defined.
5. Accessibility: `lang`, logo `alt`, AA splash contrast.
6. No fabricated trust signals.
7. Green gate before done.

## Gate (must all pass at the end)

- `node scripts/validate-db.js` → `✓ all checks passed`
- `CI=true npm test -- --passWithNoTests` → exits 0 (86+ suites; if you corrected a value a test pinned, update the test **only** when the spec proves the old value wrong, and say so in the report)
- `npm run build` → passes with no new warnings
- Browser check in JSON Server mode (light and dark, throttled "Slow 3G" reload): loading screen, tab title and favicon, `/`, `/support`, `/help`, footer contact block; widths 360, 768, 1024, 1440; console free of new errors; `/admin` login and dashboard unchanged.

## Acceptance criteria

- [ ] `prompts/prompt_V2/reports/V2-01_REPORT.md` contains the numbered matrix covering **every** requirement of Prompt 02, each row with status and evidence; zero rows left `❌` or `⚠`.
- [ ] Every later decision that changed a Prompt 02 value is cited by prompt number in the `↪ Superseded` rows.
- [ ] All deep checks above executed with their output summarised in the report.
- [ ] Gate green; no admin file, `api.js` or `db.json` in the diff.
- [ ] Build-log entry appended.

## Build-log entry

Append to `prompts/BUILD_LOG.md` under `## Prompt V2-01 — Brand identity wiring (max-effort re-verification of Prompt 02)`: the requirement count and status totals, every gap found and its fix (with file paths), the superseded decisions you honoured, any findings handed to V2-05, the gate results, and an updated "Needs client confirmation" list for identity items. Commit with a message like `Re-verify brand identity wiring at max effort (Prompt V2-01)`.
