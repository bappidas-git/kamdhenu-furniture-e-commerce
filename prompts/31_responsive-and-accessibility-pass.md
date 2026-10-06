# Responsive and accessibility pass

**Prompt 31 of 34**

## Depends on

Prompts 01–30.

## Context

A & S Urbanseat's storefront (Create React App, CSS Modules, MUI 5 for a few shell controls, framer-motion) has been redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. Data flows through the dual-mode `src/services/api.js` and `db.json`. The admin panel must not change.

## Objective

Audit every storefront surface on mobile, tablet and desktop and against WCAG 2.2 AA, then fix what fails: layout at 320–1920px, touch targets, semantic HTML and landmarks, heading order, keyboard operability and focus management, visible focus, colour contrast in both modes, alt text, form labelling, live regions and reduced motion. Add the skip link. Leave a written audit with evidence.

## Scope — files and areas to touch

- Any storefront component or page CSS/markup needed to fix findings (`src/components/**`, `src/pages/**`, non-admin), `src/App.js` (add the skip link `<a className="sf-skip-link" href="#main-content">Skip to content</a>` as the first child of `.App`, and `id="main-content"` with `tabIndex={-1}` on `<main>`), `src/theme/storefront-tokens.css` / `storefront-base.css` (token or primitive fixes only, documented).

Do not touch: logic, data, `api.js`, `db.json`, admin files.

## Brand and design requirements

Audit checklist. Run it per route: `/`, `/products` (plus a category and a search), `/products/:slug` (a variant product), the cart drawer, the search overlay, the auth modal, the sidebar menu, the mega-menu, `/checkout` (all steps, logged in with store credit), `/order-confirmation/:orderNumber`, `/orders` (expanded card, tracking, review modal), `/profile` (all tabs), `/wishlist` (guest and logged in), `/special-offers`, `/help`, `/support`, `/about`, the four policies and `/nonexistent`.

1. **Responsive**: 320, 360, 390, 768, 1024, 1280, 1440, 1920px widths; no horizontal scroll; no clipped text; images keep ratios; sticky elements (header, listing rail, checkout summary, product gallery, account rail, sticky add-to-cart bar, bottom nav) never overlap content or each other; safe-area insets on iOS; landscape phone sanity (667×375).
2. **Touch targets**: every interactive element ≥ 44×44px (inline text links inside prose excepted), spacing ≥ 8px between adjacent targets.
3. **Semantics**: one `h1` per page, logical `h2`/`h3` order, landmarks (`header`, `nav` with labels, `main`, `aside` where used, `footer`), lists for lists, tables for tabular data, buttons for actions and links for navigation (no clickable `div`s), `fieldset/legend` for radio groups.
4. **Keyboard**: full operability of header, mega-menu (open/close/Escape/focus return), sidebar, cart drawer, search overlay, auth modal, review modal, bottom sheet (focus traps, Escape, return focus), variant chips, galleries, tabs/in-page nav, accordions, pagination, forms; no keyboard traps; logical tab order; the skip link works.
5. **Focus visibility**: the focus ring token visible on every control in both modes (including on navy/sand surfaces and on image overlays).
6. **Contrast**: run the Prompt 01 script on component-level pairs found in the audit (muted text on sand, eyebrow on images with scrim, badges, links in prose, placeholder text, disabled states — disabled may fail, note it); fix tokens or usage. Both modes.
7. **Images**: meaningful `alt` (product name; decorative `alt=""` + `aria-hidden`), `width/height` or `aspect-ratio` reserved, lazy below the fold.
8. **Forms**: visible labels, `autocomplete`, `inputmode`, `aria-invalid`, `aria-describedby` for errors/hints, errors announced (`role="alert"`), focus to the first invalid field, values preserved.
9. **Live regions**: cart/wishlist toasts (SweetAlert provides `role`), result counts, copy feedback, stepper values, progress text.
10. **Reduced motion**: already handled by Prompt 30; verify once more here.
11. **Screen readers**: VoiceOver (Safari) and NVDA/JAWS or Chrome's screen reader where available: product page flow (title → price → variants → add), checkout step flow, cart drawer, mega-menu.
12. **Automated**: axe DevTools (or `@axe-core/cli` run against the dev server) on every route with zero serious/critical issues; Lighthouse Accessibility ≥ 95 on home, listing, product, checkout.
13. **Dark mode**: repeat contrast and focus checks.
14. **Print**: the invoice prints cleanly (Prompt 27).

## Functional guardrails

1. **Preserve functionality and the data/API contract**: fixes are markup/CSS/ARIA/focus only; no logic, data or API change; no route change beyond the skip-link target.
2. **Tokens only**: fixes use tokens; if a token value must change (for example a muted colour failing contrast on sand), change it in `storefront-tokens.css` and `DESIGN_SYSTEM.md` and re-check every consumer.
3. **Admin untouched**: the skip link lives inside `.App` (storefront only); `main-content` id is the storefront `main`.
4. **Brand consistency**: fixes must not reintroduce heavy borders or loud focus styles; the focus ring token is the one style.
5. **Responsive and accessible**: this prompt is the audit; every finding is fixed or explicitly deferred with a reason in the build log (deferrals should be rare and never about keyboard access or contrast).
6. **No fabricated trust signals**: if you find any residual claim, remove it and log it.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–30), `prompts/DESIGN_SYSTEM.md`.
2. Record findings in a table (route → width/mode → issue → WCAG criterion → fix → status) in a scratch file; fix in batches by surface; re-run axe after each batch.
3. Keep the full table in the build log (or, if long, in `prompts/QA_RESPONSIVE_A11Y.md`, referenced from the build log and the index).
4. Chrome device emulation is acceptable for widths; test at least once on a real phone if available (note if not).

## Acceptance criteria

- [ ] Audit table complete for every route and overlay at all widths and both modes; every finding fixed or justified.
- [ ] Skip link, landmarks, heading order, focus management, contrast, alt text, form semantics verified; axe zero serious/critical; Lighthouse a11y ≥ 95 on the four key pages.
- [ ] No horizontal scroll at any width; sticky elements never overlap.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. The checklist above, in JSON Server mode.
2. Widths 320–1920 as listed.
3. Keyboard and screen reader passes as listed.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (no data code touched).
6. Admin regression quick check (the admin's own accessibility is out of scope and unchanged).
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 31 — Responsive and accessibility pass`: the audit table or its location, token changes, deferred items with reasons, deviations, client confirmations (none expected).
