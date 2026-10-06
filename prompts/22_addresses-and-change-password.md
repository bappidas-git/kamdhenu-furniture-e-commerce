# My Addresses and Change Password

**Prompt 22 of 34**

## Depends on

Prompt 21 (account shell, `?tab=` deep links, inline-error pattern).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules; data through the dual-mode `src/services/api.js` with a JSON Server branch and a Laravel branch returning `{ success, data, meta }`; `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. Addresses are stored as an array on the user and saved whole through `useAuth().updateUser({ addresses })` → `apiService.auth.updateUser`; the password change goes through `apiService.auth.changePassword`. The admin panel must not change.

## Objective

Redesign the Addresses and Change Password sections of `/profile` inside the account shell: address cards and a low-friction address form, and a calm password form with the strength meter, keeping every rule (default-address exclusivity, first address default, delete confirm, validation, API calls).

## Scope — files and areas to touch

- `src/pages/Profile/Profile.js` + `Profile.module.css`: the `addresses` and `password` sections (`renderActiveSection` branches and their handlers' presentation). Logic handlers stay (`handleAddressSave`, `handleEditAddress`, `handleDeleteAddress`, `handleSetDefault`, `handlePasswordSubmit`, `getPasswordStrength`).

Do not touch: the wallet section (Prompt 23), `AccountNav`/`AccountLayout` beyond consuming them, `AuthContext.js`, `api.js`, `db.json`, admin.

## What exists today (preserve; read the two sections in `Profile.js`)

- Addresses: `h2` + "+ Add New Address"; form: label chips Home/Work/Other, First*, Last*, Phone* (`isValidPhone` required), Address Line 1*, Address Line 2, City*, State*, Postal Code*, Country read-only "India" (hint "Currently shipping within India only"), "Set as default address"; Cancel / Save / Update. `handleAddressSave`: required fields + phone validity; `id: addressForm.id || generateId()`; first address forced default; default exclusive; at least one default; `updateUser({ addresses })`. Edit normalises legacy `fullName`/`zipCode`; Delete → Swal confirm (`#ef4444`) → `updateUser`, promotes the next default; Set default → `updateUser`. Cards: label, "Default" badge, Set default / Edit / Delete, name, lines, "city, state postal", country, phone. Empty state.
- Password: Current*, New* (≥ 8), Confirm* (match) with show/hide; strength meter `getPasswordStrength` (inline hex colours `#ef4444 #f59e0b #3b82f6 #22c55e`); requirements checklist (≥ 8, upper, lower, number, special: display-only); `handlePasswordSubmit` → `apiService.auth.changePassword({ currentPassword, newPassword, confirmPassword })` (mock mode returns `{ success: true }` without persisting; note this in the UI? No: keep the success toast as the API reports success).
- No `id/htmlFor`, no `autocomplete`, errors via toast (add inline).

## Brand and design requirements

### Addresses

- Header row: `h2` "Addresses" (serif display-sm) + "Add address" `.sf-btn--ghost`.
- Cards: 2-column grid (1 on mobile) of `.sf-card--hairline` cards, 20px padding: label eyebrow (Home/Work/Other) + "Default" as an ink `.sf-badge`, name (sans 15px medium), lines (sans 14px secondary), phone (muted), hairline, actions as text buttons (`Set as default` when not default, `Edit`, `Delete` in the error-text token), 44px targets; the default card gets a 2px left accent bar.
- Form (`.sf-panel` sand): label chips as `.sf-chip`s with `role="radiogroup"` semantics (`aria-checked`); fields with visible labels and `autocomplete`: given-name, family-name, tel (`inputmode="tel"`), address-line1, address-line2, address-level2 (city), address-level1 (state), postal-code (`inputmode="numeric"`, hint "6-digit PIN"), country (read-only, hint kept); "Set as default" `.sf-check`; actions "Save address" primary / "Cancel" ghost; inline errors (`aria-invalid`, `aria-describedby`) in addition to the toast; input values preserved after a validation error; focus moves to the first invalid field.
- Delete confirm via SweetAlert with the storefront theme and the error token for the confirm button (no hex literal: use `customClass: { confirmButton: "sf-btn sf-btn--danger" }` and add that variant to `storefront-base.css` if missing, documented).
- Empty state: serif "No addresses yet." + "Add your first address" primary.

### Change password

- `h2` "Change password"; single-column form max-width 440px: Current password (`autocomplete="current-password"`), New password (`new-password`), Confirm (`new-password`), each with a "Show/Hide" text button (`aria-pressed`); strength meter as a 4-segment hairline bar using semantic tokens (error/warning/info/success) with the label ("Weak" … "Strong") and `aria-live="polite"`; requirements checklist with ✓ in the success token as each rule passes (`aria-live` off; purely visual plus text); inline errors; "Update password" primary with loading label.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: all handlers, rules and API calls unchanged (`updateUser({ addresses })` whole-array save; `changePassword` object); legacy field normalisation kept; Swal confirm kept.
2. **Tokens only**: the strength meter's inline hex colours become token classes; zero literals in the two sections' styles.
3. **Admin untouched.**
4. **Brand consistency**: hairline cards, sand form panel, serif section headings, no gradient badges.
5. **Responsive and accessible**: labels, autocomplete/inputmode, inline errors, focus to first error, radiogroup chips, 44px targets; 1-column at ≤ 600px.
6. **No fabricated trust signals**: none applicable; the "shipping within India only" hint stays (true for the current checkout).
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–21), `prompts/DESIGN_SYSTEM.md`; then the two sections and their handlers in `Profile.js`, `src/utils/helpers.js` (`isValidPhone`, `generateId`), the address shape in `db.json` (`users[].addresses[]`: `id, label, firstName, lastName, phone, addressLine1, addressLine2, city, state, postalCode, country, isDefault`).
2. The checkout (Prompt 26) reads these saved addresses; keep the shape exactly.
3. Test with `user@example.com` (one address) and `jane@example.com` (none).

## Acceptance criteria

- [ ] Address cards and form match the design; add/edit/delete/set-default behave exactly as before; first address becomes default; checkout still lists saved addresses.
- [ ] Password form labelled with autocomplete; strength meter tokenised; `changePassword` called with the same object; success/error feedback.
- [ ] Zero colour literals in these sections; both modes verified.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode: add two addresses, edit one, set default, delete the default (next becomes default), delete all; change password with mismatched, short and valid inputs; verify `db.json` `users[0].addresses` after saves (restore to the seeded state afterwards).
2. Widths 360, 600, 768, 1024, 1440.
3. Keyboard/screen reader: chips radiogroup, labels, error focus, show/hide buttons.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance.
6. Admin regression quick check (Admin → Users shows the edited addresses).
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 22 — Addresses and change password`: what changed, the danger-button variant if added, deviations, client confirmations (PIN hint wording, India-only shipping).
