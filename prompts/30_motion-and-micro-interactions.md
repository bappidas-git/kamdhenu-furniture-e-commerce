# Motion and micro-interactions pass

**Prompt 30 of 34**

## Depends on

Prompts 01–29.

## Context

A & S Urbanseat's storefront (Create React App, CSS Modules, framer-motion 10) has been redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md` (motion tokens: `--sf-ease-out`, `--sf-ease-in-out`, `--sf-duration-fast/--sf-duration/--sf-duration-slow/--sf-duration-reveal`, `--sf-reveal-distance`; `MotionConfig reducedMotion="user"` wraps the storefront; the `Reveal` primitive implements the standard scroll reveal). Data flows through the dual-mode `src/services/api.js` and `db.json`. The admin panel must not change.

## Objective

Audit and refine motion across every storefront surface so it is slow, subtle and consistent: entrance reveals, hover and press feedback, drawer/modal/menu transitions, image crossfades, skeleton shimmer, page transitions and scroll behaviour, all built on the motion tokens and all safe under `prefers-reduced-motion`. Remove anything bouncy, springy, scaling or attention-seeking that earlier prompts left behind.

## Scope — files and areas to touch

- Every storefront component and page's framer-motion props and CSS transitions (`src/components/**` non-admin, `src/pages/**` non-admin), `src/components/ui/Reveal.js`, `src/components/ScrollToTop/ScrollToTop.js`, `src/index.css` (`html { scroll-behavior: smooth }` → scope to `body:not(.admin-area)`? The rule is on `html` and the admin inherits it today; leave it as is and instead make route changes scroll instantly, see below), `src/App.js` (`AnimatePresence mode="wait"` around routes), `src/theme/storefront-tokens.css` (motion tokens only if a value needs tuning; document), `src/utils/constants.js` (`ANIMATION_VARIANTS`: retune to the tokens or delete if unused).

Do not touch: logic, data, `api.js`, `db.json`, admin files, `adminTheme.js`.

## Brand and design requirements

The motion language, in specifics:

- **Easing**: only `--sf-ease-out` for entrances and `--sf-ease-in-out` for state changes; no `spring`, no `type: "spring"`, no bounce, no overshoot.
- **Durations**: hover/press 160ms; state changes 320ms; drawers, menus, modals 320–480ms; reveals 900ms; image crossfades 640ms; skeleton shimmer 1600ms; marquee 60s.
- **Entrance reveals**: `Reveal` only; opacity 0→1 with a 20px rise; stagger ≤ 90ms, cap staggered groups at 8 items (the rest appear at once); fire once; viewport margin −10%; hero text reveals on mount (not on scroll).
- **Hover**: image scale 1.03 (cards, tiles, story images) or a hairline/underline change; never `translateY` lifts on cards; buttons change colour only; press = scale 0.99 for 120ms.
- **Overlays**: cart drawer slides 100% → 0 with the backdrop fading; sidebar the same from the left; search overlay and auth modal fade + 8px rise; mega-menu fade + −8px; bottom sheet slides up; all with `--sf-duration`/`--sf-ease-out`; exits 240ms.
- **Parallax**: hero media only, ≤ 6%, transform-only, disabled under reduced motion.
- **Page transitions**: keep `AnimatePresence mode="wait"` but make each page's wrapper a 240ms opacity-only fade (no vertical movement, which fights scroll restoration); `ScrollToTop` must scroll instantly on route change (`window.scrollTo({ top: 0, behavior: "instant" })` with a fallback to `(0, 0)`) so the smooth `html` rule does not animate between pages; in-page anchor links keep smooth scrolling unless reduced motion.
- **Micro-feedback**: "Added" states in buttons (1.2–1.4s, opacity swap), quantity stepper value tick (`aria-live` already), copy buttons ("Copied" 2s), wishlist heart fill (160ms, no scale burst), cart count disc (a 320ms opacity change, no pop).
- **Skeletons**: `.sf-skeleton` shimmer only; no pulsing opacity on real content.
- **Reduced motion**: `MotionConfig` covers framer; CSS transitions/animations must also collapse: in `storefront-tokens.css` the durations already go to `0.01ms` and the reveal distance to 0 under the media query; verify every custom `@keyframes` is wrapped or disabled (`animation: none`) under reduced motion; marquee becomes static; parallax off; autoplay video off.
- **Performance**: animate only `opacity` and `transform`; no `box-shadow`/`height`/`width` transitions except the two collapsibles (tracking/details panels) which may animate `height: auto` via framer's layout animation; use `will-change` only on the hero media; verify no layout thrash with DevTools Performance on the home page (60fps on a mid-range laptop, no long tasks caused by animation).

## Functional guardrails

1. **Preserve functionality and the data/API contract**: motion only; no change to handlers, states, routes, data or markup semantics (changing a `motion.div` to a `motion.section` is fine; removing an element is not).
2. **Tokens only**: durations and easings via tokens (JS reads them from `TOKENS.motion` in `src/theme/tokens.js`; add a `motion` mirror there if Prompt 01 did not, documented).
3. **Admin untouched**: nothing in the admin uses the storefront motion; `html { scroll-behavior }` stays.
4. **Brand consistency**: one motion language as specified; no springs anywhere (grep `spring`, `bounce`, `whileHover={{ scale: 1.05` and similar).
5. **Responsive and accessible**: reduced motion verified on every surface; no motion traps focus; no auto-advancing content except the optional marquee (pausable).
6. **No fabricated trust signals**: no pulsing "live" indicators, no fake typing/loading theatre.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–29), `prompts/DESIGN_SYSTEM.md` (motion section). Grep `src` for `framer-motion` imports, `transition=`, `whileHover`, `whileTap`, `animate=`, `@keyframes`, `transition:` in CSS modules; build a table (surface → animation → conforms? → fix) and keep it for the build log.
2. Fix surface by surface, re-testing each in JSON Server mode with reduced motion on and off.
3. Measure: Chrome Performance recording of the home page scroll and of opening the cart drawer and the mega-menu.

## Acceptance criteria

- [ ] Audit table complete; every surface conforms to the motion language; no springs/lifts/pops remain; page transitions are opacity-only; route changes scroll instantly.
- [ ] Reduced motion collapses every animation (framer and CSS) on every surface.
- [ ] Performance recordings show transform/opacity-only animations and no long tasks from motion.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: home (reveals, parallax, rails, marquee), listing (card entrances), product page (gallery crossfade, added state), cart drawer, mega-menu, sidebar, search overlay, auth modal, checkout steps, order history collapsibles, special offers tabs; each with reduced motion on and off.
2. Widths 360, 768, 1024, 1440.
3. Keyboard: focus never lost during transitions (open/close overlays with the keyboard only).
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (no data code touched).
6. Admin regression quick check.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 30 — Motion and micro-interactions`: the audit table (or its summary), token tuning, `ANIMATION_VARIANTS` decision, deviations, client confirmations (none expected).
