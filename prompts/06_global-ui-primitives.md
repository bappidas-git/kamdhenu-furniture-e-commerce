# Global UI primitives

**Prompt 6 of 34**

## Depends on

Prompts 01 (tokens, `BrandLogo`), 02 (brand constants), 03–05 (real data to test against).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules per component, MUI 5 for a few shell controls, framer-motion 10, SweetAlert2 toasts fired from the contexts) is being redesigned into a premium, editorial, warm-minimalist boutique on top of the token system documented in `prompts/DESIGN_SYSTEM.md`. Data flows through the dual-mode `src/services/api.js` (JSON Server branch; Laravel branch returning `{ success, data, meta }`) and `db.json`. The admin panel must not change.

## Objective

Give every later prompt one consistent set of primitives to compose from: a storefront base stylesheet (buttons, inputs, selects, checkboxes/radios, badges and chips, cards and panels, tabs, hairlines, eyebrows, sections and containers, skeletons, visually-hidden and skip-link utilities), the storefront MUI component overrides (for the few MUI controls the shell uses), the SweetAlert2 theme for the storefront, a global reduced-motion configuration for framer-motion, and three small React primitives (`Reveal`, `SectionHeading`, `renderAccent`). All of it scoped away from the admin.

## Scope — files and areas to touch

- New: `src/theme/storefront-base.css`, imported in `src/index.css` right after `storefront-tokens.css`. Every rule inside it is scoped under `body:not(.admin-area)` (write the file with a nesting-free structure: prefix each selector).
- `src/context/ThemeContext.js`: only the `components` overrides of the two storefront MUI themes (Prompt 01 already set palette/typography/shape and removed gradients/lifts). Keep `useTheme`, `useThemeContext`, persistence and body classes untouched.
- `src/App.css`: append the storefront SweetAlert2 theme as new rules scoped `body.light:not(.admin-area) .swal2-popup`, `body.dark:not(.admin-area) .swal2-popup`, `…:not(.admin-area) .swal2-html-container`, `…:not(.admin-area) .swal2-popup.swal2-toast`, placed **after** the existing SweetAlert block. Do not edit, move or delete any existing rule (the admin inherits several of them and wins only by source order).
- `src/App.js`: wrap the storefront route's content (the `<div className="App">` subtree) in framer-motion's `<MotionConfig reducedMotion="user">` so every storefront framer animation honours the OS preference; do not wrap the admin routes.
- New: `src/components/ui/Reveal.js` (scroll-reveal wrapper: `as`, `delay`, `distance`, `once=true`, `className`; uses `motion` + `useReducedMotion`, `whileInView` with `viewport={{ once, margin: "-10% 0px" }}`, the reveal recipe from `DESIGN_SYSTEM.md`), `src/components/ui/SectionHeading.js` (+ module: `eyebrow`, `title` with `*accent*` support, `intro`, `align="left"|"center"`, `action` link slot, heading level prop `as="h2"`), `src/components/ui/renderAccent.js` (`*word*` → `<em>`; if Prompt 10 has not run yet this is the canonical place for it), and `src/components/ui/index.js` barrel (`BrandLogo`, `Reveal`, `SectionHeading`, `renderAccent`).
- `src/components/ErrorBoundary/ErrorBoundary.js`: read-only here (Prompt 28 owns it).

Do not touch: any page or component beyond the files above, `src/theme/adminTheme.js`, admin files, `db.json`, `api.js`, the `body.admin-area` rules in `App.css`.

## Brand and design requirements

### `storefront-base.css` (class names, all prefixed `sf-`)

- **Buttons** `.sf-btn` (44px min height, sans 14px medium, letter-spacing 0.02em, radius `--sf-radius-sm`, padding 0 20px, transitions on background/colour/border with `--sf-duration` and `--sf-ease-out`, `:focus-visible` ring token, `:disabled` 50% opacity + `cursor: not-allowed`): variants `--primary` (ink background, paper text; hover: navy), `--ghost` (hairline border ink, transparent; hover: ink background 6% tint), `--paper` (paper background ink text, for use on dark scrims/navy), `--paper-ghost` (hairline paper), `--link` (no background, accent underline on hover, inline), sizes `--sm` (36px) and `--lg` (52px), `--block` (full width), and an `.sf-btn__icon` slot. Never a gradient, never a translateY lift; the press state scales to 0.99.
- **Inputs** `.sf-field` (label above, sans 13px medium, ink), `.sf-input`/`.sf-select`/`.sf-textarea` (44px, hairline border `--sf-color-border-strong`, radius sm, paper background, 15px text, focus: accent 1px border + focus ring; `[aria-invalid="true"]` error border + `.sf-field__error` text in the error token with a leading icon; `.sf-field__hint` muted), `.sf-select` with a custom chevron (inline SVG data URI in the ink colour is allowed as it is a glyph, not a colour literal: document it), `.sf-check`/`.sf-radio` (20px, hairline, accent when checked, 44px tap area via label padding), `.sf-switch` (pill, ink when on).
- **Badges and chips** `.sf-badge` (eyebrow text 10–11px, uppercase, tracked; variants `--ink`, `--paper`, `--sand`, `--accent`, `--success`, `--warning`, `--error`, `--info`), `.sf-chip` (32px, hairline, pill, selectable `--selected` ink on paper), `.sf-count` (small ink disc with paper digits for cart/wishlist counts).
- **Cards and panels** `.sf-card` (surface, no border, radius sm, optional `--hairline`), `.sf-panel` (sand background, no shadow), `.sf-hairline` (1px rule), `.sf-divider--dot` (· separator).
- **Tabs** `.sf-tabs` (hairline underline strip; `.sf-tab` 44px, eyebrow style; `[aria-selected="true"]` 1px ink underline; roving focus is the consumer's job), `.sf-tabpanel`.
- **Typography helpers** `.sf-eyebrow`, `.sf-display-xl/lg/md/sm`, `.sf-prose` (measure token, serif headings inside, hairline-separated sections, links accent-underlined), `.sf-muted`, `.sf-price`, `.sf-compare` (struck), `.sf-sale`.
- **Layout** `.sf-container` (`--sf-container-max`, `--sf-gutter`), `.sf-container--wide`, `.sf-container--narrow`, `.sf-section` (padding `--sf-section-y` vertical), `.sf-section--tight` (half), `.sf-grid` with `--cols` custom property (`repeat(var(--cols, 4), minmax(0, 1fr))`, 2 at ≤ 768px, 1 at ≤ 480px when `--cols-mobile: 1`).
- **Skeletons** `.sf-skeleton` (sand base, slow 1.6s shimmer using a token gradient from surface to sand, disabled under reduced motion), `.sf-skeleton--text`, `--image` (uses `aspect-ratio`), `--circle`.
- **Accessibility utilities** `.sf-visually-hidden`, `.sf-skip-link` (hidden until focused, ink on paper, top-left), `.sf-focus` (ring).
- **State colours**: only through tokens; no hex in this file.
- Dark mode works automatically through the token swap; verify every primitive on `body.dark`.

### Storefront MUI overrides (`ThemeContext.js`)

Only the components the storefront shell uses: `MuiButton` (match `.sf-btn`), `MuiIconButton` (44px hit area, ink colour, hover sand background, keep the existing touch-size override), `MuiBadge` (ink disc, paper text, 10px), `MuiAvatar` (sand background, ink initials, hairline), `MuiMenu`/`MuiPopover` (paper, hairline border, soft shadow, radius sm, no backdrop blur), `MuiMenuItem` (44px, sans 14px, hover sand), `MuiDivider` (hairline token), `MuiDrawer` (paper, no blur, no translucent background), `MuiAppBar` (not used by the storefront; leave default), `MuiTextField`/`MuiOutlinedInput` (hairline, radius sm, accent focus), `MuiChip`, `MuiSkeleton` (sand), `MuiTabs`/`MuiTab` (match `.sf-tabs`), `MuiTooltip` (ink). Remove every leftover `backdropFilter`, gradient and `transform` hover.

### SweetAlert2 (storefront only)

Popup: paper surface, ink text, radius `--sf-radius-md`, hairline border, soft shadow; title in the display serif at 22px; body in sans 15px secondary; confirm button = ink/paper, cancel = ghost; focus ring = token; toast (bottom-end, used by cart/wishlist/auth) = paper with hairline and a 2px accent timer bar, no icon colour clash (keep SweetAlert's icon colours but set `--swal2-icon-*` where the API allows, otherwise leave). Dark mode: dark surface with translucent hairline. Everything via SweetAlert's CSS variables (`--swal2-background`, `--swal2-color`, `--swal2-border-radius`, `--swal2-confirm-button-background-color`, `--swal2-cancel-button-background-color`, `--swal2-action-button-focus-box-shadow`, `--swal2-timer-progress-bar-background`, `--swal2-toast-*`), so a per-call `confirmButtonColor` still wins. The destructive confirms in `OrderHistory.js`, `Profile.js` and `WishlistContext.js` pass hex literals; leave them for their prompts (they will switch to the error token value read from `getComputedStyle`, or to SweetAlert's `customClass`).

### React primitives

- `Reveal`: default `distance = var(--sf-reveal-distance)` resolved via `TOKENS.motion` from `src/theme/tokens.js` (the JS mirror) and duration `--sf-duration-reveal`; honours `useReducedMotion()` (renders without transform, opacity only) and `MotionConfig`.
- `SectionHeading`: eyebrow (sans uppercase tracked muted), title (`display-lg`, serif, `*accent*` italic), intro (sans 17px secondary, measure 56ch), optional action (`.sf-btn--link`) aligned right on desktop; `align="center"` centres everything with a 640px measure.
- Document each primitive's props in `DESIGN_SYSTEM.md` under a new "Primitives" section (append; do not rewrite earlier sections).

## Functional guardrails

1. **Preserve functionality and the data/API contract**: no page logic changes; the `MotionConfig` wrapper changes no behaviour except honouring reduced motion. `ThemeContext`'s API unchanged.
2. **Tokens only**: `storefront-base.css` and the overrides contain no hex/rgb literals (the select chevron SVG uses `currentColor`).
3. **Admin untouched**: every new global rule is scoped `body:not(.admin-area)`; new SweetAlert rules are additive and placed after the existing block; take the same before/after admin screenshots as Prompt 01 (login, dashboard, products, a dialog, a SweetAlert confirm, light and dark) and compare.
4. **Brand consistency**: primitives embody the editorial system (hairlines, sharp radii, serif display, ink primary, caramel accent).
5. **Responsive and accessible**: 44px controls, visible focus everywhere, `.sf-skip-link` and `.sf-visually-hidden` provided, contrast of every variant verified in both modes with the Prompt 01 script.
6. **No fabricated trust signals**: not applicable.
7. **Test before done**: build a throwaway "kitchen sink" page locally (do not commit it; or put it under `prompts/examples/` as a static HTML? No: keep it out of the repo) to eyeball every primitive in light and dark mode.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (Prompts 01–05), `prompts/DESIGN_SYSTEM.md`. Inspect `src/index.css`, `src/App.css`, `src/context/ThemeContext.js`, `src/theme/tokens.js`, and grep which MUI components the storefront actually renders (`grep -rn "@mui/material" src/components src/pages --include=*.js | grep -v Admin`): today that is `Header.js` (IconButton, Badge, Avatar, Menu, MenuItem, Typography, Divider, ClickAwayListener, useMediaQuery) and `BottomNav.js` icons; pages use no MUI.
2. Keep the file lean (target ≤ 700 lines); prefer custom properties over duplicated rules for variants.
3. `MotionConfig` import: `import { MotionConfig } from "framer-motion"`; place it inside `DealsConfigProvider` around `<div className="App">`.
4. For `.sf-skip-link`, Prompt 31 adds the actual link to `App.js`; you only provide the style.

## Acceptance criteria

- [ ] `storefront-base.css` exists, imported after the tokens, fully scoped, with every primitive listed; zero colour literals.
- [ ] Storefront MUI overrides match the primitives; no gradient/blur/lift remains in `ThemeContext.js`.
- [ ] Storefront SweetAlert theme applied (test a cart toast and the wishlist "Clear all" confirm) and the admin's SweetAlert unchanged (test a delete confirm in Admin → Coupons without confirming).
- [ ] `MotionConfig reducedMotion="user"` wraps the storefront only; with the OS/DevTools preference on, framer animations collapse to opacity.
- [ ] `Reveal`, `SectionHeading`, `renderAccent`, barrel exported and documented in `DESIGN_SYSTEM.md`.
- [ ] Admin screenshots identical; `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: trigger toasts (add to cart, add to wishlist, login), confirms (wishlist clear, order cancel on `/orders` with `mail4bappidas@gmail.com` / `Bappi@12345`, cancel the dialog), the header account menu and badge; verify light and dark.
2. Widths 360, 768, 1024, 1440: `.sf-grid`, `.sf-container`, buttons and inputs at each width.
3. Keyboard: focus rings on `.sf-btn`, inputs, chips, tabs; `prefers-reduced-motion` emulation.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (no data code touched).
6. Admin regression: screenshots compared.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 06 — Global UI primitives`: the class inventory, the MUI components overridden, the SweetAlert approach, the `MotionConfig` placement, new `ui/` exports, deviations, and anything for client confirmation.
