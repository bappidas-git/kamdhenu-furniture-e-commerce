# Auth modal (login and sign up)

**Prompt 20 of 34**

## Depends on

Prompts 01 (tokens, `BrandLogo`), 02 (brand lines), 06 (primitives, SweetAlert theme), 07 (header mounts the modal).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion; auth through `src/context/AuthContext.js` → `apiService.auth.login/register`, dual-mode `src/services/api.js`, `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. There is no `/login` route: the single global `AuthModal` is rendered by the header and opened from anywhere via `useAuth().openAuthModal("login" | "signup")`. The admin panel must not change.

## Objective

Restyle the auth modal into a calm, trustworthy dialog (the light logo on paper, serif headings, low-friction forms with visible labels and correct autocomplete), keeping the login/sign-up flows, "Remember me", validation rules, messages and timers exactly as they behave today.

## Scope — files and areas to touch

- `src/components/AuthModal/AuthModal.js` + `AuthModal.module.css` (rewrite markup/styles; keep props `open`, `onClose`, `defaultTab` and the logic listed under "Preserve").

Do not touch: `AuthContext.js` (toasts and storage policy live there), `authStorage.js`, `Header.js`, `api.js`, `db.json`, admin.

## What exists today (preserve; read `AuthModal.js`, 858 lines)

- Tabs Login / Sign Up with a sliding indicator; `defaultTab` sync; reset of messages on open; body scroll lock; Escape closes; `isMobile` (≤ 640px) renders a bottom-sheet variant.
- Login: email + password (show/hide), "Remember me" → passes `remember` to `login()` so `authStorage` writes `user`/`token` to `localStorage` instead of `sessionStorage`; "Forgot password?" shows an info banner "Password reset isn't available yet…" with a `/support` link (no reset flow exists; keep the honest banner); after success `setTimeout(1500)` closes the modal.
- Sign up: firstName, lastName, email, phone (optional; 10 digits), password (≥ 6), confirm, terms checkbox required; payload prefixes phone with `+91`; after success a message and `setTimeout(1800)` switches to login with the email prefilled; failure → `errors.general` banner (e.g. the email-taken message from `api.js`).
- Validation rules and messages (`validate` functions) kept verbatim; password strength meter (keep as a quiet hairline meter with the same thresholds).
- Social buttons (Google/Facebook) are **disabled placeholders labelled "Soon"**: remove them (no flow exists; a disabled promise is not a feature) and record it.
- `role="dialog" aria-modal aria-label="Authentication"`; labels with `htmlFor`; `autoComplete` values present (email, current-password, given-name, family-name, tel-national, new-password); gaps: no initial focus, no focus trap, errors not `aria-live`.
- Its own 31 `--auth-*` colour aliases (indigo) → replace with `--sf-*` tokens.

## Brand and design requirements

- **Dialog**: desktop: centred, width `min(480px, calc(100vw − 32px))`, paper surface, hairline border, soft shadow, radius `--sf-radius-md`, 40px padding; mobile (≤ 640px): bottom sheet (keep), top radius `--sf-radius-lg`, safe-area padding; backdrop = overlay token, no blur. Header: `<BrandLogo height={36} />` (auto variant) centred, then the serif heading ("Welcome back" / "Create your account", display-sm) and a one-line sans subtitle from `brandContent.js` if a suitable line exists (otherwise "Sign in to track orders and save your wishlist across devices."). Close button 44px top-right.
- **Tabs**: `.sf-tabs` with `role="tablist"`, two `role="tab"` buttons, `aria-selected`, `aria-controls`, Left/Right arrow keys; the sliding indicator becomes the 1px ink underline.
- **Forms**: `.sf-field` with visible labels; inputs 48px (`.sf-input`); `autocomplete` as today plus `inputmode="email"` / `"tel"` / `"numeric"` where relevant; show/hide password as a text button "Show"/"Hide" with `aria-pressed` (keep `tabIndex={-1}`? No: make it focusable, it is a real control); inline errors under fields (`aria-invalid`, `aria-describedby`, error token) and the general banner `role="alert"`; success and info banners `role="status"`; submit `.sf-btn--primary --lg --block` with the loading label ("Signing in…" / "Creating account…"); "Remember me" `.sf-check`; terms checkbox with links to `/terms` and `/privacy` (new tab kept); "Forgot password?" `.sf-btn--link` → the existing info banner.
- **Focus**: on open, move focus to the first field of the active tab; trap focus inside; restore to the opener on close. Preserve input values after a failed submit.
- **Motion**: fade + 8px rise over `--sf-duration`; tab panels crossfade (no horizontal slide); opacity only under reduced motion.
- **Copy**: calm, no exclamation marks; CTA labels "Sign in" and "Create account".

## Functional guardrails

1. **Preserve functionality and the data/API contract**: `login(credentials)` with `remember`, `register(userData)` payload and the `+91` prefix, validation rules and texts, the two timers, the forgot-password banner, tab sync, scroll lock, Escape; toasts remain in `AuthContext`; no new endpoints; no password-reset flow invented.
2. **Tokens only**: zero colour literals (44 hex + 25 rgba + the Google/Facebook SVG colours today).
3. **Admin untouched.**
4. **Brand consistency**: light logo on paper (white logo in dark mode automatically), serif headings, hairlines, ink primary, no social buttons.
5. **Responsive and accessible**: dialog semantics, tabs keyboard support, labels, live regions, focus trap/return, 44–48px targets, bottom sheet on small screens.
6. **No fabricated trust signals**: no "Join 10,000 customers"; the subtitle states only real benefits (order tracking, wishlist sync).
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–19), `prompts/DESIGN_SYSTEM.md`; then `AuthModal.js` fully, `AuthContext.js`, `authStorage.js`, `src/utils/helpers.js` (`isEmailValid`), `src/content/brandContent.js`.
2. Reuse the focus-trap helper from Prompts 09/18 (`src/components/ui/useFocusTrap.js` or equivalent).
3. Test accounts: `user@example.com` / `password123`; register a new throwaway user and delete it from `db.json` afterwards (or note it as demo data).

## Acceptance criteria

- [ ] Modal matches the design on desktop and as a bottom sheet; tabs accessible; forms labelled with correct autocomplete/inputmode; errors inline and announced; focus managed.
- [ ] Login (with and without Remember me: reload the page to verify session vs persistent storage), sign up (success → login tab with email prefilled; duplicate email → banner), forgot-password banner, Escape/close all behave as before; social buttons removed.
- [ ] Zero colour literals; both modes verified.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: open from the header account icon, from the wishlist guest banner, from checkout step 0 and from the mobile sidebar; run through both flows with invalid and valid data.
2. Widths 360 (sheet), 768, 1024, 1440.
3. Keyboard/screen reader: tablist, labels, error announcements, trap and return.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (`auth.login/register` have both branches).
6. Admin regression quick check (the admin has its own login page; unaffected).
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 20 — Auth modal`: what changed, the removal of the disabled social buttons, deviations, client confirmations (subtitle copy; whether social login is planned).
