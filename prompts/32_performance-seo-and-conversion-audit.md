# Performance, SEO and conversion audit

**Prompt 32 of 34**

## Depends on

Prompts 01–31.

## Context

A & S Urbanseat's storefront (Create React App 5 with react-scripts 5, React 18, CSS Modules, MUI 5 for a few shell controls, framer-motion) has been redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. Data flows through the dual-mode `src/services/api.js` (JSON Server branch; Laravel branch returning `{ success, data, meta }`) and `db.json`. CRA has no server rendering, so SEO work is limited to what a single-page app can do. The admin panel must not change.

## Objective

Audit every storefront surface for perceived and measured performance, SEO and sharing basics, and conversion/trust practice; fix what the audit finds within CRA's limits: image loading discipline, font loading, code splitting of non-critical storefront routes, per-page titles and descriptions, structured data for products, semantic heading order, and the conversion checklist (one primary action per screen, price/availability/delivery/returns next to the buy action, trust cues at decision points, low-friction forms, persistent search and cart, sticky mobile add-to-cart, 44px targets, skeletons, honest urgency, considered states).

## Scope — files and areas to touch

- New: `src/hooks/usePageMeta.js` (`usePageMeta({ title, description })` sets `document.title` as `"<title> | A & S Urbanseat"` and updates/creates `<meta name="description">`, plus `og:title`/`og:description`/`og:url` on route change; cleans up on unmount back to the defaults from `src/utils/constants.js`), applied to every storefront page: home (brand tagline), listing (category name or search), product (`metaTitle`/`metaDescription` from the product data with fallbacks to name/short description), checkout, confirmation, orders, profile, wishlist, offers, help, support, about, policies, 404.
- Product page: inject JSON-LD `Product` structured data (name, image, description, sku, brand, offers with price/currency "INR"/availability from stock, aggregateRating only when `totalReviews > 0`) via a `<script type="application/ld+json">` managed by the hook or a small component; remove it on unmount.
- `src/App.js`: code-split non-critical storefront routes with `React.lazy` + `Suspense` (a `.sf-skeleton` page fallback): policies, help, support, about, special offers, order confirmation, order history, profile, wishlist, checkout, 404. Keep home, listing and product pages eager. Do not lazy-load admin routes (the admin must stay exactly as it is, including its loading behaviour).
- `public/index.html`: a `<link rel="preload" as="image">` for the hero media only if its URL is stable (it lives in `src/content/homeContent.js`; preloading a URL in HTML duplicates it: acceptable if documented, otherwise skip); font `preconnect`s verified; `robots.txt` reviewed (allow all; no sitemap possible statically: note it).
- Any component/page needing image or state fixes found by the audit (`loading`, `decoding`, `fetchpriority`, `width/height`, `aspect-ratio`, `PLACEHOLDER_IMG` + `onImageError` instead of remote fallbacks).
- `package.json`: no new dependencies; removing unused ones (`canvas-confetti`) is allowed only if a grep proves no import and the lockfile is regenerated with `npm install` (document; optional).

Do not touch: logic, `api.js`, `db.json`, admin files.

## Brand and design requirements

Audit scope and targets:

- **Lighthouse** (mobile preset, throttled, production build served with `npx serve -s build` and the JSON Server running): home, listing, product, checkout. Targets: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95. Record before/after.
- **Core Web Vitals**: LCP = hero image on home, gallery image on product (eager + `fetchpriority="high"`); CLS < 0.05 (all images reserved; fonts `swap` with size-adjusted fallbacks if a visible shift occurs: add `size-adjust` `@font-face` fallbacks only if measurable); INP: no handler > 200ms (listing filters are client-side over 84 products: fine; verify search scoring debounce).
- **Images**: every `<img>` has `width`/`height` or a reserved ratio, `alt`, `decoding="async"`, `loading="lazy"` below the fold and eager + priority for the LCP element; no remote `placehold.co` fallback URLs remain in code (data placeholders are fine); `onImageError` everywhere an image comes from data.
- **Fonts**: one Google Fonts stylesheet, `display=swap`, ≤ 6 files, preconnects; no duplicate loads (Prompt 01 removed the CSS `@import`); the admin still gets Inter.
- **Bundle**: `npm run build` size report; code splitting applied; no accidental import of admin pages into storefront chunks beyond the shared `App.js` route table (admin pages stay eager as today).
- **Network**: home page initial requests ≤ ~12 (JSON Server calls: categories, featured, trending, products for brands, settings, shipping, plus reviews lazily); consolidate duplicate fetches (the hero and home both fetched categories before; verify none remain).
- **SEO**: unique titles/descriptions per route; one `h1`; canonical-like `og:url` from `window.location` (domain placeholder flagged); product JSON-LD validates in Google's Rich Results test (paste the markup); `lang="en-IN"`; meaningful link text ("View all furniture" not "click here").
- **Conversion checklist** (walk every surface and record pass/fail with evidence):
  1. One clear primary action per screen; consistent CTA hierarchy and wording.
  2. Price, savings, availability, delivery and returns next to the buy action (product page, cart drawer, checkout review).
  3. Trust cues at decision points from real data (product buy box, cart drawer, checkout summary).
  4. Low-friction forms (labels, autocomplete, inputmode, inline validation, recovery, preserved input).
  5. Persistent search and cart access (header), sticky mobile add-to-cart, 44px targets.
  6. Perceived performance: skeletons everywhere data loads, reserved image space, lazy below the fold, prioritised hero.
  7. Honest urgency only (countdown from config, stock from data).
  8. Empty/loading/error/success states on every surface.
  9. SEO/sharing basics as above.
  Fix failures in place (presentation only).

## Functional guardrails

1. **Preserve functionality and the data/API contract**: lazy routes change nothing functionally (verify deep links and the back button); the meta hook is additive; JSON-LD is additive; no API or data change.
2. **Tokens only**: any new styles via tokens/primitives.
3. **Admin untouched**: admin routes stay eager; `usePageMeta` is never called in admin pages; the admin's `document.title` remains the static one from `index.html` (unchanged behaviour).
4. **Brand consistency**: no visual regressions while fixing (compare screenshots).
5. **Responsive and accessible**: no regressions; Suspense fallbacks have `aria-busy`.
6. **No fabricated trust signals**: JSON-LD `aggregateRating` only with real reviews; no fake `review` entries.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–31), `prompts/DESIGN_SYSTEM.md`; grep `src` for `<img`, `placehold.co`, `loading=`, `fetchpriority`, `document.title`.
2. Build and serve: `npm run build && npx serve -s build -l 5000` with `npm run server` running; run Lighthouse in Chrome DevTools (mobile) or `npx lighthouse http://localhost:5000 --preset=... --output=json` if available; save reports outside the repo and summarise numbers in the build log.
3. Keep the lazy-route fallback minimal (header stays mounted; only `main` content shows a skeleton).

## Acceptance criteria

- [ ] Lighthouse targets met on the four pages (before/after table in the build log); CLS and LCP elements verified.
- [ ] Per-page titles/descriptions and product JSON-LD in place; code splitting applied to the listed routes; admin eager.
- [ ] Image discipline and font loading verified; no remote fallback URLs in code.
- [ ] Conversion checklist recorded with every failure fixed.
- [ ] `npm run build` passes with no new warnings; bundle report recorded.

## Test and QA

1. Production build served locally plus JSON Server; walk every route (titles change, deep links work, back/forward works, lazy chunks load with the skeleton); product JSON-LD validated.
2. Widths 360, 768, 1024, 1440 (no regressions).
3. Keyboard/screen reader spot checks on Suspense fallbacks.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (no data code touched).
6. Admin regression: `/admin` loads as before (same chunking, same behaviour).
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 32 — Performance, SEO and conversion audit`: Lighthouse before/after, bundle sizes, the conversion checklist results, the preload/sitemap/domain notes, deviations, client confirmations (production domain for `og:url`, sitemap hosting).
