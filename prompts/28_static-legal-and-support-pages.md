# Static, legal and support pages, 404 and error boundary

**Prompt 28 of 34**

## Depends on

Prompts 01–08 (tokens, brand content, primitives, breadcrumb from 14), 24 (support deep-link params from order history).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. The admin panel must not change.

## Objective

Restyle and rewrite the content pages in the A & S Urbanseat voice: About (Our story), Help centre (with the revived `FAQ` component), Support (contact form), Privacy, Terms, Cookies and Refund policies (structured drafts flagged for the client's legal review), add a branded 404 page for unknown routes, and restyle the crash fallback (`ErrorBoundary`), removing every fabricated statistic and claim.

## Scope — files and areas to touch

- `src/pages/AboutUs/*`, `src/pages/HelpCenter/*`, `src/pages/Support/*`, `src/pages/PrivacyPolicy/*`, `src/pages/TermsOfService/*`, `src/pages/CookiePolicy/*`, `src/pages/RefundPolicy/*` (JS + CSS modules).
- `src/components/FAQ/FAQ.js` + `.module.css`: orphan today; revive (accessible accordion over `FAQ_ITEMS`, optional `items`/`query` props) and use it in Help centre (replace Help's private accordion).
- `src/utils/constants.js`: `FAQ_ITEMS` (rewrite honestly for furniture, no invented windows beyond live-data-free facts: delivery windows and COD caps must reference the policy pages rather than numbers, or take numbers from the same placeholders Prompt 05 seeded and say "see Delivery & returns"), `WHY_CHOOSE_US` (delete if `AboutUs` no longer uses it after this prompt; otherwise rewrite honestly), `POLICY_LAST_UPDATED` (already set by Prompt 02).
- New: `src/pages/NotFound/NotFound.js` + module, and in `src/App.js` replace `<Route path="*" element={<Navigate to="/" replace />} />` with the `NotFound` page (keeps the storefront shell). Record this as a behaviour change (previously a silent redirect).
- `src/components/ErrorBoundary/ErrorBoundary.js`: restyle the fallback with tokens via inline `style={{ color: "var(--sf-color-text)" }}`-style references (inline styles can reference CSS custom properties); keep `isDarkTheme()` reading `localStorage["theme"]`, `role="alert"`, "Reload" and "Go home" actions, and the error details; note that this boundary also wraps the admin, so the fallback must look neutral (paper/ink) and must not import storefront CSS modules.
- `src/content/legalContent.js` (new): the structured policy drafts as data (sections with headings and paragraphs) so the four policy pages render from one module and the client can review one file.

Do not touch: `Footer`, `Header`, `api.js`, `db.json`, admin.

## What exists today (preserve the routes and the working behaviours; read each page)

- About: hero with `APP_TAGLINE` eyebrow, invented stats ("50K+ Happy Customers", "10K+ Products", "500+ Brands", "99.9% Uptime": **remove**), generic story, `WHY_CHOOSE_US` grid, CTA banner.
- Help centre: search over `FAQ_ITEMS`, six hardcoded topic tiles (Orders & Shipping → `/orders`, Returns & Refunds → `/refund`, Payments → `/support`, Account → `/profile`, Deals → `/special-offers`, Privacy → `/privacy`), accordion (good a11y, has the only `prefers-reduced-motion` rule among pages), contact banner with hardcoded hours (use `SUPPORT_HOURS`).
- Support: info column (email, phone, hardcoded hours, **"Live Chat / Available 24/7" claim with no chat: remove**), form (Full Name*, Email* prefilled from `user.email`, Phone optional `isValidPhone`, Order Number, Category select (general, order, shipping, returns, product, payment, account, other), Subject*, Message* ≥ 20 chars) → `apiService.leads.createContact(formData)` → success card + "Send another"; submit error. Add: prefill `orderNumber` and `category` from `?order=` and `?category=` query params (Prompt 24 sends `?order=<orderNumber>&category=returns`); labels, autocomplete (`name`, `email`, `tel`), inline errors.
- Privacy / Terms / Cookies / Refund: hardcoded sections; Terms says prices "include applicable taxes" (contradicts `settings.store.taxIncluded: false`) and names "courts of Mumbai, Maharashtra" (the business is in Assam); Refund lists "Intimate wear, swimwear…" (generic retail) and refund timelines per method; Cookies has a div-grid table.
- `ErrorBoundary`: inline purple palette, Inter font literal.

## Brand and design requirements

- **Shared page frame** for content pages: breadcrumb (shared component), `--sf-container-narrow` (720px) prose column with `.sf-prose`, eyebrow + `h1` serif (display-lg), intro line, hairline, sections as `h2` serif (display-sm) with sans body 17px/1.7; "Last reviewed: {POLICY_LAST_UPDATED}" muted on policy pages; a quiet "Questions? Contact us" hairline block at the end (`/support`, `mailto:`).
- **About / Our story** (`/about`): eyebrow "Our story", `h1` from `brandContent.js` (`ABOUT_INTRO` as the intro), two alternating image/text blocks (placeholders, 4:5) telling the facts the client's site states and nothing more (furniture for homes and offices; own workshop for wooden pieces; plastic furniture and mattresses from makers such as Nilkamal, Carlton and Winsome; based in Assam) — all flagged for confirmation; a "What we care about" trio from the site's own value statements rewritten in the brand voice (Quality first / Customer focused / Trust & reliability) without numbers; no stats, no "since 20 years" unless confirmed (list it); closing ghost CTA "Browse the collection".
- **Help centre** (`/help`): `h1` "How can we help?"; search `.sf-input` with a visible label; six topic tiles as hairline cards (same targets; the Privacy tile → `/privacy`); `FAQ` component with the query; contact block with `SUPPORT_HOURS`, email, phone, WhatsApp when set.
- **Support** (`/support`): two columns (5/7): facts (email, phone, WhatsApp, hours, address — all from constants) and the form (`.sf-field`s, labels, autocomplete/inputmode, inline errors, textarea with a counter, category `.sf-select`, primary "Send message", success `.sf-panel` with `role="status"` and focus moved to it, failure `role="alert"`). Response-time promises ("within 24 hours") only if the client confirms; until then "We reply during working hours." (flag).
- **Policies**: render from `legalContent.js`; drafts rewritten for a furniture business in India, structured and hedged: Privacy (data collected: account, orders, addresses, contact leads, cookies; use; sharing with delivery and payment partners; security; retention; rights; contact), Terms (acceptance; accounts; orders and pricing in INR **exclusive of taxes shown at checkout** to match store settings; payment methods actually offered; delivery; returns per the refund policy; intellectual property; liability; governing law "the courts of Assam, India" **flagged**), Cookies (what, the four types as a real `<table>`, managing), Refund & returns (window from `STOREFRONT_CONFIG.returnsWindowDays`, how to start a return — through the Support form with the order number, since the order page routes there; eligibility suited to furniture: unused, original packaging, assembled items, custom-made items not returnable **flagged**; refund method and timelines marked as placeholders). Every policy page carries a muted "Draft for legal review" line until the client approves (flag in the index).
- **404** (`NotFound`): `h1` serif "This page has moved or never existed.", one line, primary "Back to home", ghost "Browse furniture", the search trigger if cheap (link to `/products`); sets nothing else; keep the storefront shell.
- **ErrorBoundary**: neutral card: paper/ink via CSS variables with safe fallbacks (`var(--sf-color-bg, #fff)` — the fallback literal is permitted here only because this UI must render even if the token stylesheet failed; document it), serif via `var(--sf-font-display, serif)`, "Something went wrong." / line / Reload / Go home / details.
- **Motion**: `Reveal` on sections; FAQ height animation with the existing reduced-motion rule.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: routes unchanged except the added `*` page; the support form keeps `apiService.leads.createContact(formData)` and its fields; help search behaviour kept; no new endpoints.
2. **Tokens only**: zero literals in all touched modules (the boundary's fallbacks excepted and documented).
3. **Admin untouched** (the boundary restyle is the one shared surface; keep it neutral).
4. **Brand consistency**: prose frame, serif headings, hairlines, no gradients, no emoji topic icons (use outline icons or none).
5. **Responsive and accessible**: single `h1` per page; FAQ accordion semantics kept; form labels; tables for tabular policy data; 44px targets; breadcrumbs.
6. **No fabricated trust signals**: no stats, no "24/7", no live chat, no response-time promises, no "since 20 years" unless confirmed; policies marked as drafts.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–27), `prompts/DESIGN_SYSTEM.md`; then each page, `FAQ.js`, `ErrorBoundary.js`, `src/utils/constants.js`, `src/content/brandContent.js`, `App.js`.
2. Keep each page small: the content lives in `legalContent.js`/`brandContent.js`/constants; pages are layout.
3. For the 404, keep `<Navigate>` imported only if still used elsewhere; remove dead imports.
4. Test the support deep link: `/support?order=ORD-20250310-0001&category=returns`.

## Acceptance criteria

- [ ] Seven content pages, the FAQ component, the 404 page and the error fallback match the design and voice; all fabricated claims removed; policies render from `legalContent.js` with the draft note.
- [ ] Support form works with prefill from query params and inline validation; help search works.
- [ ] Zero literals (except the boundary's documented fallbacks); both modes verified.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: every route (`/about`, `/help`, `/support`, `/privacy`, `/terms`, `/cookies`, `/refund`, `/nonsense`), submit the support form (check `db.json` `leads`, then note or remove the row), throw a test error in a component locally to see the boundary (revert).
2. Widths 360, 768, 1024, 1440.
3. Keyboard/screen reader: accordion, form, tables, breadcrumbs.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (`leads.createContact` has both branches).
6. Admin regression: force an error in an admin page locally to confirm the neutral fallback renders (revert).
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 28 — Static, legal and support pages`: what changed, the 404 behaviour change, the boundary fallbacks, deviations, and the full "Needs client confirmation" list (every policy section, governing law, response times, about-page facts, "20+ years").
