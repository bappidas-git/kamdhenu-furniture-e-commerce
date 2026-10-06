# Footer, newsletter, trust bar and payment marks

**Prompt 8 of 34**

## Depends on

Prompts 01 (tokens, `BrandLogo`), 02 (brand constants, `brandContent.js`), 05 (settings/shipping data), 06 (primitives), 07 (header, for the shared `--sf-header-height` contract and consistent nav labels).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique. Tokens are in `prompts/DESIGN_SYSTEM.md`. Logos: light `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo.png` (light backgrounds), white `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo-white.png` (dark backgrounds), rendered through `BrandLogo`. The admin panel must not change.

## Objective

Restyle the footer into a refined dark (navy) footer carrying the white logo, brand contact details and social links, a single newsletter capture (the revived `Newsletter` component), an honest trust bar and payment marks, with every link preserved and every value coming from constants or live data.

## Scope — files and areas to touch

- `src/components/Footer/Footer.js` + `Footer.module.css` (rewrite).
- `src/components/Newsletter/Newsletter.js` + `Newsletter.module.css` (currently an orphan; revive it as the single newsletter form, rendered inside the footer's top band; delete the footer's own inline newsletter form).
- `src/utils/constants.js`: `TRUST_BADGES` (currently an unused string list) — either delete it or repurpose it as the footer trust-bar source; the footer must render only honest items (see below). `WHY_CHOOSE_US`, `FAQ_ITEMS` stay for Prompts 12 and 28.

Do not touch: `Header/*`, `BottomNav/*`, `SidebarMenu/*` (Prompt 09), `CTASection/*` (Prompt 12), pages, `api.js`, `db.json`, admin.

## What exists today (read before rewriting)

`Footer.js` (361 lines): a gradient newsletter band (own form; `apiService.leads.createNewsletter(email)`; success/error copy; a 4s reset timer not cleared on unmount), four columns (brand `<h4>{APP_NAME}</h4>` + generic blurb + social icons from `SOCIAL_LINKS` for Facebook/Twitter/Instagram/YouTube only; Quick Links: Products `/products`, New Arrivals `/products?sort=newest`, Deals `/special-offers` and Special Offers `/special-offers` gated by `useDealsConfig().enabled`, Best Sellers `/products?sort=popular`; Customer Service: `/profile`, `/orders`, `/help`, `/refund`, `/help`; Contact: `SUPPORT_ADDRESS`, `mailto:SUPPORT_EMAIL`, `tel:` (spaces stripped), `SUPPORT_HOURS`), a trust/payment bar (inline SVG marks: VISA, Mastercard, UPI, COD; badges "Secure Payment", "Easy Returns", "Free Shipping*", "24/7 Support"), and a bottom bar (`© year APP_NAME`, links `/terms`, `/privacy`, `/cookies`). 43 hex + 10 hex in SVGs, system font stack, `data-theme` theming. `Newsletter.js` (55 lines, orphan): email state, `createNewsletter`, 5s success reset (cleared), `isEmailValid`.

## Brand and design requirements

- **Surface**: navy base token (`--sf-color-surface-dark`, see `DESIGN_SYSTEM.md`) with the white logo (`<BrandLogo variant="white" height={40} />`), off-white text, muted translucent secondary text, translucent hairlines. Same in dark mode (the footer is always dark). No gradients.
- **Top band — newsletter**: `Newsletter` component inside a hairline-bounded band: eyebrow "Newsletter", a short serif line from `NEWSLETTER_LINE` in `src/content/brandContent.js`, an email field (`.sf-input` styled for dark: paper 8% background, visible label "Email address" or an `aria-label` plus placeholder, `autocomplete="email"`, `inputmode="email"`, `type="email"`) and a `.sf-btn--paper` "Subscribe" button; inline validation (`aria-invalid`, error text `role="alert"`), success state `role="status"` ("You're on the list."), submission via `apiService.leads.createNewsletter(email)` exactly as today, input preserved on error, timers cleared on unmount. Only one newsletter form exists on the site after this prompt (Home's closing CTA in Prompt 12 sits above this band and does not duplicate the form).
- **Columns** (desktop 12-col grid: brand 4 / Shop 2 / Help 2 / Contact 4; tablet 2 columns; mobile stacked with collapsible headings as `details/summary` or buttons with `aria-expanded`): 
  - Brand: white logo, `BRAND_PROMISE` (one sentence), social icons rendered only for non-empty `SOCIAL_LINKS` entries **including WhatsApp** (add it to the list with an inline WhatsApp glyph; after Prompt 02 it is the only one set), each with `aria-label` and `rel="noopener noreferrer"`.
  - Shop: "All furniture" `/products`, "New arrivals" `/products?sort=newest`, "Best sellers" `/products?sort=popular`, "Offers" `/special-offers` (only when `useDealsConfig().enabled`; render a single Offers link, not the two duplicate deal links the current footer has), plus the six departments from `apiService.categories.getAll()` → `getMainMenuCategories` (fetch once; reuse the same canonical `/products?category=<slug>` links as the header).
  - Help: "My account" `/profile`, "Track order" `/orders`, "Help centre" `/help`, "Returns & refunds" `/refund`, "Contact" `/support`, "Our story" `/about`.
  - Contact: `SUPPORT_ADDRESS`, `mailto:` and `tel:` links, `SUPPORT_HOURS`, a WhatsApp link when set.
- **Trust bar** (hairline above and below, eyebrow-style items with outline icons): only items that are true: "Secure payment", "Cash on Delivery" (shown only when `settings.payment.codEnabled`), "Easy returns · N days" (from `STOREFRONT_CONFIG.returnsWindowDays`, hidden at 0), "Free delivery above ₹X" (min positive `freeAbove` from `apiService.shipping.getMethods()`, hidden when none). Drop "24/7 Support" (unverified) and the "Free Shipping*" asterisk. Fetch settings/shipping once; render nothing for an item until its data resolves (no flash of a wrong claim).
- **Payment marks**: keep the four inline SVG marks (VISA, Mastercard, UPI, COD) but render them monochrome in the off-white tone (brand logos may keep their shapes; `fill="currentColor"`), 28px tall, with an `aria-label` list "We accept". The three `fontFamily="Arial"` SVG texts become `font-family: inherit` or are replaced by paths.
- **Bottom bar**: `© {year} A & S Urbanseat`, "Terms", "Privacy", "Cookies", and a quiet "Prices in INR" note; theme toggle not here (header and sidebar own it).
- **Spacing**: `--sf-section-y` padding; mobile adds the existing bottom margin so the `BottomNav` (fixed, ≤ 768px) never covers the bottom bar.
- **Motion**: none beyond link hover underline (accent) and the `Reveal` on the top band.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: every existing link target stays (the two duplicate deals links collapse into one); newsletter submission keeps `apiService.leads.createNewsletter`; deals gating via `useDealsConfig`; categories via `apiService.categories.getAll` only.
2. **Tokens only**: `Footer.module.css` and `Newsletter.module.css` end with zero hex/rgb literals and no font-family literal (the current footer sets a system stack).
3. **Admin untouched**: the footer renders only inside the storefront route.
4. **Brand consistency**: white logo on navy, serif newsletter line, hairlines, no gradients, no "24/7".
5. **Responsive and accessible**: `footer` landmark with `aria-label="Footer"`; column headings as `h2` (visually eyebrow-styled); 44px link targets on mobile; form labels and live regions; social icons labelled; the collapsible mobile columns operable by keyboard.
6. **No fabricated trust signals**: trust items only from settings/shipping/config as listed; no "24/7", no "Best price guarantee", no customer counts.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–07), `prompts/DESIGN_SYSTEM.md`; then `Footer.js`, `Footer.module.css`, `Newsletter.js`, `src/content/brandContent.js`, `src/theme/tokens.js` (`resolveTrustBadgeDetail`, `STOREFRONT_CONFIG`), `src/context/DealsConfigContext.js`.
2. Reuse `resolveTrustBadgeDetail("freeShipping", { shipping })` and `("cod", { settings })` for the trust bar so the rule matches the product page and the hero strip.
3. Keep the footer's data fetches tiny and resilient (`.catch(() => [])`); never block rendering of links on them.
4. Delete `TRUST_BADGES` from `constants.js` if unused after your change (grep first), and note it.

## Acceptance criteria

- [ ] Footer matches the structure above in both modes; white logo; all links present and correct; departments from live categories.
- [ ] Single newsletter form (the `Newsletter` component) with validation, success/error states, `createNewsletter` call, timers cleared.
- [ ] Trust bar and payment marks render only truthful, data-backed items.
- [ ] Zero colour/font literals in the two CSS modules; `BottomNav` never overlaps the bottom bar on mobile.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: subscribe with an invalid and a valid email (check `db.json` `leads` gains a `newsletter` row, then remove it or leave it noted as demo data); click every footer link; disable deals in Admin → Special Offers and confirm the Offers link disappears (re-enable afterwards); toggle dark mode.
2. Widths 360, 768, 1024, 1440: grid collapses as specified; collapsible columns on mobile.
3. Keyboard/screen reader: landmark, headings, labels, live regions; tab through the newsletter form and the social icons.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (settings/shipping/categories go through `apiService`).
6. Admin regression quick check.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 08 — Footer, newsletter, trust bar and payment marks`: what changed, the trust-bar data rules, the `TRUST_BADGES` decision, deviations, client confirmations (social links, hours, address, payment methods actually accepted).
