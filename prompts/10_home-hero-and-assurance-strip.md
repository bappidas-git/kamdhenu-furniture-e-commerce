# Home hero and assurance strip

**Prompt 10 of 34**

## Depends on

Prompts 01 (tokens, motion tokens), 02 (`brandContent.js` hero lines and `ASSURANCE_ITEMS`), 05 (settings and shipping data), 06 (UI primitives: `Reveal`, buttons, `SectionHeading`), 07 (header height contract).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, MUI 5, framer-motion 10; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium, editorial, warm-minimalist boutique. Tokens and their names live in `prompts/DESIGN_SYSTEM.md`. The admin panel must not change.

## Objective

Replace the boilerplate's gradient banner carousel, promo cards and icon category bar with a cinematic, full-bleed editorial hero (image- or video-capable, placeholder media now, real photography later with no code change), followed by a slim assurance strip that shows only what the business actually offers, read from live data.

## Scope — files and areas to touch

- `src/components/HeroSection/HeroSection.js` and `HeroSection.module.css`: full rewrite.
- New: `src/content/homeContent.js` — the single content/config module for the home page's editorial slots. This prompt adds the `hero` entry; Prompts 11 and 12 add theirs. Shape for the hero:
  ```js
  export const HERO = {
    eyebrow: "A & S Urbanseat",                       // optional
    headline: "Seating for the way you *live*.",     // *word* marks the italic accent
    support: "…",                                     // ≤ 14 words
    primaryCta: { label: "Shop the collection", to: "/products" },
    secondaryCta: { label: "Our story", to: "/about" }, // optional
    media: {
      image: { src: "<placeholder url>", alt: "…", width: 2400, height: 1350 },
      video: { src: null, poster: "<placeholder url>" }, // src null → image only
      focalPoint: "50% 60%",                           // object-position
    },
  };
  ```
  Take `headline` / `support` from `HERO_HEADLINES[0]` / `HERO_SUPPORT_LINES[0]` in `src/content/brandContent.js` (import them; do not duplicate the strings).
- `src/pages/Home/Home.js`: only the lines that mount `HeroSection` and the new `AssuranceStrip` under it (Prompt 11 restructures the rest of the page).
- New: `src/components/storefront/AssuranceStrip.js` + `AssuranceStrip.module.css`.

Do not touch: other home sections (Prompt 11/12), `src/components/Header/*`, `src/services/*`, `db.json`, `src/theme/tokens.js` (`STOREFRONT_CONFIG`), the admin.

## What exists today (read before rewriting)

`HeroSection.js` (417 lines): fetches `apiService.banners.getAll()` and falls back to three hardcoded gradient banners ("Flash Sale / Up to 70% Off on Electronics" …), auto-rotates every 5s, renders arrow and dot navigation, two hardcoded promo cards ("Deal of the Day / Up to 50% Off", "New Arrivals") with invented offers, and a category quick-link bar with an icon map keyed to electronics/clothing slugs. None of this survives: the banner carousel is replaced by the editorial hero (the `banners` collection stays in `db.json` and `apiService.banners.getAll` stays exported and untouched, but is no longer called; record this in the build log), the promo cards go (fabricated urgency), and category discovery moves to Prompt 11's "Shop by Space" tiles.

## Brand and design requirements

### Hero

- Full-bleed section directly under the header, height `clamp(560px, 86vh, 920px)` on desktop, `72vh` (min 520px) on mobile; media fills it (`object-fit: cover`, `object-position` from `focalPoint`), with a navy scrim token from the bottom-left (`--sf-color-overlay`-based gradient allowed here only, as `DESIGN_SYSTEM.md` permits a scrim on photography).
- Media rules: `<img>` with explicit `width`/`height`, `loading="eager"`, `fetchpriority="high"`, `decoding="async"`, `onError={onImageError}`; the slot reserves its box with `aspect-ratio` so there is no layout shift. If `media.video.src` is set, render `<video autoPlay muted loop playsInline poster preload="metadata">` with the image as fallback; under `prefers-reduced-motion` do not autoplay (show the poster). Placeholder now: a `placehold.co` URL in the neutral tones from `DESIGN_SYSTEM.md` (2400×1350) and the same for the poster; alt text written now ("A quiet living room with an A & S Urbanseat sofa in warm light" style, but describing the placeholder honestly, e.g. "Placeholder for the hero photograph").
- Content block bottom-left on desktop (max-width 640px), bottom-aligned on mobile with 24px gutters: eyebrow (sans uppercase tracked, paper colour at 80%), headline in the display serif at `display-xl` with the `*accent*` word in italic (accent colour at display size only; verify 3:1 on the scrim), support line (sans 18px, paper), then one or two CTAs: primary = paper surface with ink text, secondary = ghost paper hairline; both 48px tall, 44px minimum on mobile.
- Motion: on mount, the media scales from 1.04 to 1 over `--sf-duration-reveal` and the text lines fade/rise in sequence (stagger 90ms) with `--sf-ease-out`; on scroll, a light parallax (media translateY up to 6% via `useScroll`/`useTransform` from framer-motion, transform only). All disabled under reduced motion (`useReducedMotion`).
- No carousel, no dots, no autoplay rotation, no decorative circles.

### Assurance strip

- A single hairline-bounded row directly under the hero (paper surface), 56px tall on desktop, wrapping to two rows on mobile; 3–4 items, each an outline icon (16px, reuse the icon set already used by `src/components/storefront/TrustBadges.js`) + label (sans 13px) + optional detail (muted 12px).
- Items come from `ASSURANCE_ITEMS` in `brandContent.js`, resolved against live data on mount:
  - Delivery: threshold = min positive `freeAbove` among `apiService.shipping.getMethods()` (same rule as `resolveTrustBadgeDetail("freeShipping")` in `src/theme/tokens.js`; reuse that function); hide the item when there is none.
  - Returns: `STOREFRONT_CONFIG.returnsWindowDays` (hide when 0).
  - Cash on Delivery: `settings.payment.codEnabled` from `apiService.settings.get()` (hide when false).
  - Secure payment: static policy text.
  - Never add warranty, "since 20 years", customer counts or anything not confirmed.
- Loading: render the strip with a skeleton line of the same height until the two fetches resolve, then fade in; on fetch error, show only the static items.

## Functional guardrails

1. **Preserve functionality and the data/API contract.** No change to `src/services/api.js`; data comes from `apiService.settings.get()` and `apiService.shipping.getMethods()` (both already exist and normalise both branches); no new endpoints; `banners` stays in `db.json`. Navigation only via react-router `Link`/`navigate`.
2. **Tokens only.** No hex/rgb literals in the new CSS (the old module had 37); the only gradient is the scrim built from the overlay token.
3. **Admin untouched.**
4. **Brand consistency and minimalism**: one headline, one support line, ≤ 2 CTAs; no badges, no offers, no countdowns in the hero.
5. **Responsive and accessible**: `h1` is the hero headline (the only `h1` on the home page); the `<em>` accent keeps reading order; CTAs are links; the strip is a `ul` with `aria-label="Our assurances"`; contrast verified on the scrim in both modes.
6. **No fabricated trust signals**: every strip item is backed by data or a stated policy; the hero makes no claims.
7. **Test before done.**

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md`, `prompts/DESIGN_SYSTEM.md` (motion recipe, scrim rule, placeholder tones), then `HeroSection.js`, `Home.js`, `src/theme/tokens.js` (`resolveTrustBadgeDetail`, `STOREFRONT_CONFIG`), `TrustBadges.js` (icon set), `brandContent.js`.
2. Parse `*word*` once with a tiny helper (`renderAccent(text)` → React fragments with `<em>`); put it in `src/components/ui/` so Prompt 11/12 reuse it (if Prompt 06 already created `SectionHeading` with this helper, reuse that instead).
3. Mount order in `Home.js`: `<HeroSection />` then `<AssuranceStrip />`; keep the rest of the page as is for now.
4. Measure LCP in DevTools; the hero image must be the LCP element and start loading before React paints (the `fetchpriority` attribute helps; Prompt 32 may add a preload link).

## Acceptance criteria

- [ ] Hero renders from `homeContent.js` with image placeholder, italic accent, support line, CTAs; replacing the media is a one-line change; video path works when a `src` is provided (test with any short MP4 URL locally, then set it back to `null`).
- [ ] Assurance strip shows only data-backed items; hides correctly when a value is missing (test by temporarily setting `codEnabled: false` in `db.json` and restoring it).
- [ ] Reveal and parallax behave and are disabled under reduced motion; no layout shift (CLS 0 for the hero).
- [ ] Old carousel, promo cards and category icon bar are gone; no hex literals; `h1` present once.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: `/` in light and dark mode; click both CTAs; throttle to Slow 3G and confirm the placeholder box reserves space; toggle `prefers-reduced-motion` in DevTools rendering panel.
2. Widths 360, 768, 1024, 1440: headline wraps within 4 lines at 360, CTAs stack on mobile, strip wraps to two rows.
3. Keyboard/screen reader: CTAs focusable in order; `h1` announced; strip items read as a list.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. Nothing relies on a JSON Server-only shape (settings and shipping go through `apiService`).
6. Admin regression quick check.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 10 — Home hero and assurance strip`: what changed, the removal of the banner carousel/promo cards (and that `banners` remains unused data), the content module shape, new components, deviations, and client confirmations (hero copy choice, assurance items).
