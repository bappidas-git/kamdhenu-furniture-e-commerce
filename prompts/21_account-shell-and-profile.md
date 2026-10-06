# Account shell and My Profile

**Prompt 21 of 34**

## Depends on

Prompts 01–07, 20 (auth modal).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, framer-motion; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. The account area is one page, `/profile` (`src/pages/Profile/Profile.js`, 1229 lines), with local tabs; orders and wishlist are separate routes. The admin panel must not change.

## Objective

Create a shared account shell (an `AccountNav` used by `/profile`, and adopted by `/orders` and `/wishlist` in Prompts 24 and 25) and redesign the Profile tab (personal information form), keeping the auth guard, tab set, update logic and feedback behaviour. Prompts 22 and 23 redesign the other tabs in the same file.

## Scope — files and areas to touch

- New: `src/components/account/AccountNav.js` + module (props: `active` key; renders the account navigation: Profile `/profile`, Addresses `/profile?tab=addresses`, Orders `/orders`, Store credit `/profile?tab=wallet`, Wishlist `/wishlist`, Change password `/profile?tab=password`, Sign out; desktop: left rail with the user's initials/name/email; mobile: a horizontal scrollable chip row) and `src/components/account/AccountLayout.js` + module (page header `h1` + `AccountNav` + content slot).
- `src/pages/Profile/Profile.js` + `Profile.module.css`: the page shell (header, toast, sidebar, mobile tabs, layout grid) and the **Profile** section only (`renderActiveSection` for `profile`). Leave the `addresses`, `password` and `wallet` section bodies as they are for Prompts 22/23 (they may look unstyled until then; that is expected), but make them render inside the new shell.
- `src/pages/Profile/Profile.js`: add `?tab=` deep-linking (read with `useSearchParams` on mount and on change; write with `replace: true` when a tab is selected), so `AccountNav` links work from other pages. Default remains `profile`.

Do not touch: `OrderHistory.js` (Prompt 24), `Wishlist.js` (Prompt 25), `AuthContext.js`, `api.js`, `db.json`, admin.

## What exists today (preserve; read `Profile.js`)

- `TABS`: profile, addresses, orders (link `/orders`), wallet, wishlist (link `/wishlist`), password, logout; `activeTab` state only (not deep-linkable); link tabs `navigate`; logout → Swal confirm ("Log out?", `confirmButtonColor: "#ef4444"`) → `logout()` → `navigate("/")`.
- Auth guard: once `authLoading` is false and `!isAuthenticated` → `navigate("/")` silently (improve: open the auth modal and show a guest panel like `/orders` does, or keep the redirect; recommended: render a guest panel with "Sign in" → `openAuthModal("login")` instead of a silent redirect; document the choice).
- Page: `h1 "My Account"`, feedback toast (`role="status" aria-live="polite"`, auto-clear 4s, fixed bottom-right above the bottom nav), mobile tab chips (≤ 900px), `.layoutGrid 280px 1fr` with a sticky sidebar (initials avatar, name, email, nav buttons, red logout).
- Profile section: `h2 "Personal Information"`, avatar block ("Member since {formatDate(createdAt)}"), fields First Name*, Last Name*, Email (`readOnly`, hint "Email cannot be changed"), Phone (`tel`), "Save Changes" → `handleProfileSave`: first/last required, phone optional but `isValidPhone`; `updateUser({ firstName, lastName, phone })` (→ `apiService.auth.updateUser`); feedback via the toast.
- No `id/htmlFor`, no `autocomplete`, no `inputmode`; errors via toast (add inline errors too).

## Brand and design requirements

- **Shell** (`AccountLayout`): `--sf-container`; page header: eyebrow "Account", `h1` serif "Hello, {firstName}." (fallback "My account"); desktop grid 3/9: `AccountNav` rail (sticky at `top: calc(var(--sf-header-height) + 24px)`): initials in a 56px hairline circle, name (serif 18px), email (muted), hairline, nav links (sans 15px, 44px rows, active = ink with a 2px left accent bar, `aria-current="page"`), hairline, "Sign out" as a muted text button that triggers the same Swal confirm (use the error token via SweetAlert's `customClass` or `getComputedStyle` rather than a hex literal); mobile/tablet (≤ 900px): the rail becomes a scrollable chip row under the header (`.sf-chip`s, `aria-current`).
- **Profile section**: `.sf-card--hairline` panel: `h2` "Personal information" (serif display-sm), `.sf-field`s in a 2-column grid (1 column ≤ 600px): First name (`autocomplete="given-name"`), Last name (`family-name`), Email (read-only, hint kept, `autocomplete="email"`), Phone (`type="tel"`, `inputmode="tel"`, `autocomplete="tel"`, hint "10-digit mobile number"); inline errors (`aria-invalid`, `aria-describedby`); "Save changes" primary (disabled while saving, label "Saving…"); the toast remains for success/error (restyle with tokens: paper, hairline, 2px accent bar; `role="status"`); "Member since" line in muted under the heading.
- **Motion**: `Reveal` on the panel only; no sliding sections.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: `updateUser` payload, validation rules, toast behaviour, logout confirm + navigation, tab set; `?tab=` is additive; no new endpoints.
2. **Tokens only**: the shell and profile section styles contain zero colour literals (the file today has 186 hex + 74 rgba + 19 gradients; Prompts 22/23 finish the rest).
3. **Admin untouched.**
4. **Brand consistency**: serif greeting, hairline rail, ink accents; no gradient avatars/buttons.
5. **Responsive and accessible**: `h1` → `h2`; nav landmark `aria-label="Account"`; `aria-current`; labelled fields; live toast; 44px targets.
6. **No fabricated trust signals**: none applicable.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–20), `prompts/DESIGN_SYSTEM.md`; then `Profile.js` fully (note `TABS`, `handleTabClick`, the guard, `handleProfileSave`, the toast effect), `Profile.module.css`, `AuthContext.js` (`updateUser`), `src/utils/helpers.js` (`isValidPhone`, `getInitials`, `formatDate`).
2. Keep `renderActiveSection` as the switch; wrap it in `AccountLayout`. Prompts 22/23 will restyle their sections inside it.
3. `AccountNav` must not fetch anything; it reads `useAuth().user`.

## Acceptance criteria

- [ ] `AccountLayout`/`AccountNav` exist and wrap `/profile`; `?tab=` deep links work (`/profile?tab=wallet` opens the wallet tab); mobile chip row; sign-out confirm works.
- [ ] Profile form labelled, inline-validated, saves through `updateUser`, header name updates without reload; toast restyled.
- [ ] Zero colour literals in the touched styles; both modes verified.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode as `user@example.com` / `password123`: edit name and phone (invalid then valid); reload (session persists); navigate via the rail to orders/wishlist and back; deep-link `/profile?tab=password`; sign out; visit `/profile` as a guest.
2. Widths 360, 768, 900, 1024, 1440.
3. Keyboard/screen reader: nav landmark, `aria-current`, field labels, toast announcement.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance (`auth.updateUser` has both branches).
6. Admin regression quick check.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 21 — Account shell and My Profile`: what changed, the guest-handling decision, the `?tab=` contract, deviations, client confirmations (none expected).
