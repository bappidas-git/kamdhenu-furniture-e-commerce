# Header and mega-menu navigation

**Prompt 7 of 34**

## Depends on

Prompts 01 (tokens, `BrandLogo`), 02 (brand constants), 03–05 (the real category tree and data), 06 (UI primitives, storefront MUI overrides, SweetAlert theme).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. The storefront is a Create React App using CSS Modules, MUI 5 and framer-motion, with data through the dual-mode `src/services/api.js` (JSON Server branch; Laravel branch returning `{ success, data, meta }`) and `db.json`. The design system lives in `prompts/DESIGN_SYSTEM.md`; refer to tokens by role and look up their real names there. Logos: light `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo.png` (light backgrounds), white `https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo-white.png` (dark backgrounds); render them through `src/components/ui/BrandLogo.js`. The admin panel must not change.

## Objective

Replace the boilerplate's dense marketplace header (amber cart-icon wordmark, fake search bar, "All Categories" dropdown and a flat category link row) with a refined editorial header: a slim utility strip, a main row with a prominent centred logo and quiet utility actions, and a department row whose entries open structured mega-menu flyouts that group links under section headings with an editorial feature panel. It stays entirely driven by the admin-managed category data (`showInMainMenu`, `menuOrder`, `parentId`) and the canonical `/products?category=<slug>` URL scheme, and it keeps mounting the cart drawer, sidebar, auth modal and search modal exactly as today.

## Scope — files and areas to touch

- `src/components/Header/Header.js` and `Header.module.css` (full rewrite of markup and styles; keep the data flow listed under "Preserve").
- New: `src/components/Header/MegaMenu.js` + `MegaMenu.module.css` (the flyout panels), and `src/components/Header/useHeaderHeight.js` (ResizeObserver that writes `--sf-header-height` on `document.documentElement` and returns it) if you prefer a hook to inline logic.
- `src/content/navigationContent.js` (new, one clearly named module): optional per-department editorial panel overrides `{ [departmentSlug]: { eyebrow, line, ctaLabel } }`. Images for the panels come from the department's own `image` field in the category record (admin-manageable), never from this module.

Do not touch: `src/components/CartDrawer/*` (Prompt 18), `src/components/SidebarMenu/*`, `src/components/BottomNav/*`, `src/components/BottomDrawer/*` (Prompt 09), `src/components/AuthModal/*` (Prompt 20), `src/components/SearchModal/*` (Prompt 15), `src/utils/categories.js`, `src/context/*`, `src/services/*`, `db.json`, the admin.

## What the current header does (preserve every behaviour)

Read `src/components/Header/Header.js` (523 lines) first. It:

- Fetches categories with `apiService.categories.getAll()` on mount and again on `window` `focus` so admin changes appear without reload; builds the main menu with `getMainMenuCategories(categories)` and the full ordered tree with `orderCategoriesHierarchically(categories)` from `src/utils/categories.js`; links with `/products?category=${categoryParam(cat)}`.
- Closes open menus on `location.pathname` change.
- Reads `useTheme()` (`isDarkMode`, `toggleTheme`), `useAuth()` (`user`, `isAuthenticated`, `logout`, `authModalOpen`, `authModalTab`, `openAuthModal`, `closeAuthModal`), `useCart()` (`getCartItemCount`, `isCartOpen`, `setIsCartOpen`), `useWishlist()` (`getWishlistCount`), `useDealsConfig()` (`enabled` → shows/hides the "Today's Deals" link).
- Account control: when authenticated opens an MUI `Menu` (My Profile `/profile`, My Orders `/orders`, My Wishlist `/wishlist`, Logout → `logout()` then `navigate("/")`); when a guest, `openAuthModal("login")`; the menu's guest variant offers Login / Register (`openAuthModal("signup")`).
- Mounts `<CartDrawer open={isCartOpen} onClose=…/>`, `<SidebarMenu open onClose onOpenAuth/>`, `<AuthModal open={authModalOpen} onClose={closeAuthModal} defaultTab={authModalTab}/>`, `<SearchModal open onClose/>`. The auth modal is rendered **only here** (other pages call `openAuthModal`), so it must keep being mounted by the header.
- Renders a spacer `div` whose inline height (60 / 104 / 140 px) offsets the fixed header; pages rely on it (`.main-content` has no top padding).
- Shows a free-delivery line from `FREE_SHIPPING_THRESHOLD` (Prompt 05 keeps that constant equal to the Standard method's `freeAbove`) and the support phone from `SUPPORT_PHONE`.

## Brand and design requirements

### Structure (desktop ≥ 1024px)

1. **Utility strip** (32px, paper surface, hairline below, sans 12px, muted): left — the free-delivery line from `FREE_SHIPPING_THRESHOLD` via `formatCurrency` (hide the line if the constant is falsy); right — `tel:` link with the phone, "Help" → `/help`, "Track order" → `/orders`, and the theme toggle as a 32px icon button with `aria-label="Switch to dark mode"` / `"…light mode"`.
2. **Main row** (88px at rest, 64px compact): CSS grid `1fr auto 1fr`. Left: a search trigger button (magnifier icon + the word "Search", hairline underline on hover) that opens `SearchModal`. Centre: `<BrandLogo priority height={48} />` (28px on mobile, 36px compact) linking to `/`; in dark mode `BrandLogo` picks the white variant automatically. Right: account (avatar initial in a 32px hairline circle, or a person icon with the label "Sign in"), wishlist (heart with count), cart (bag with count); labels in the eyebrow style under the icons at ≥ 1280px, icon-only below. Counts render as a small ink disc with paper digits, max 99, hidden at 0.
3. **Department row** (48px, hairline below): centred links, sans 13px, uppercase, 0.12em tracking, 44px tall hit areas, for each category from `getMainMenuCategories(categories)` in order, then a divider dot, then "Offers" → `/special-offers` when `dealsEnabled`, and "Our Story" → `/about`. The active department (current `?category=` matches the department or one of its descendants, via `getCategoryScopeIds`) carries a 1px accent underline.
4. **Mega-menu flyout** (one component instance; opens for the hovered/focused/pressed department): a full-width panel anchored under the department row, paper surface, hairline top/bottom, soft shadow, `max-height: 70vh`, 48px vertical padding, inner `--sf-container-wide`. Layout: a column per second-level child of the department (heading = child name as an eyebrow, followed by its own children as links; a child with no children renders as a single link), max 4 columns, overflow wraps to a second row; flat departments (no children, e.g. Café & Restaurant Chairs, Outdoor Furniture) show the department description and a "Shop all" link. The last column is the **editorial feature panel**: the department's `image` (4:5, `object-fit: cover`, `loading="lazy"`, `onImageError` fallback, alt = department name), the department `description`, and a "Shop all <Department>" text link; `navigationContent.js` may override eyebrow/line/CTA label per slug. Each panel also ends with a "View all departments" link to `/products`.
5. **Behaviour**: open on hover after 120ms (desktop pointer), on focus of the link (keyboard) and on click/Enter/Space (toggles); close on mouse leave after 200ms, on `Escape` (focus returns to the department link), on click-away (`ClickAwayListener` is already imported) and on route change (existing effect). Only one panel open at a time; opening animates opacity 0→1 and translateY −8→0 over `--sf-duration` with `--sf-ease-out` (framer-motion `AnimatePresence`), none under reduced motion. Panels are rendered in the DOM only while open. `aria-expanded`, `aria-controls` and `aria-haspopup="true"` on the department links; the panel is `role="region"` with `aria-label="<Department> menu"`.
6. **Scroll behaviour**: the header is `position: sticky; top: 0` (not fixed) so the spacer can go; if you keep it fixed, measure the real height with a `ResizeObserver` and write `--sf-header-height` for the spacer. Past 80px of scroll add a `compact` class: utility strip collapses (height 0, overflow hidden), logo shrinks to 36px, transitions use `--sf-duration-slow`. Never hide the header on scroll down.
7. **Surfaces**: paper background in light mode; dark base in dark mode with translucent hairlines; the header never uses a gradient or a shadow at rest (a soft shadow appears only in the compact state).

### Tablet (768–1023px)

Utility strip hidden; main row: hamburger (left, opens `SidebarMenu`), centred logo 40px, right: search icon, theme toggle icon, account, cart (wishlist moves into the sidebar; the bottom nav from Prompt 09 also carries it). No department row; the mega-menu is replaced by the sidebar's accordion (Prompt 09).

### Mobile (< 768px)

Main row 60px: hamburger, centred logo 28px, search icon and cart. Account, wishlist and theme toggle live in the sidebar and the bottom nav (Prompt 09). The header keeps mounting all four overlays.

### Copy

Labels: "Search", "Sign in", "Account", "Wishlist", "Cart", "Offers", "Our Story", "Shop all", "View all departments", "Help", "Track order". No exclamation marks, no "Hello, Sign in".

## Functional guardrails

1. **Preserve functionality and the data/API contract.** Keep every hook, API call, navigation target, overlay mount and the focus-refetch exactly as listed under "Preserve". Categories still come only from `apiService.categories.getAll()`; links only from `categoryParam`; no hardcoded department list, no new endpoint, no change to `src/utils/categories.js`. The deals link still obeys `useDealsConfig().enabled`.
2. **Tokens only.** `Header.module.css` currently holds ~80 hardcoded colours and a system font stack; after this prompt it contains no hex/rgb literals and no font-family literal (use `var(--sf-font-sans)`); z-index from `--sf-z-header` / `--sf-z-megamenu`.
3. **Admin untouched.** The header is mounted only inside the storefront route (`App.js`), so nothing here reaches `/admin`; do not add global CSS.
4. **Brand consistency.** The correct logo per background; no cart-icon wordmark; no gradients; hairlines not borders.
5. **Responsive and accessible.** Keyboard operability of the whole mega-menu as specified; visible focus ring token; 44px targets; `nav` landmark with `aria-label="Primary"`; the search trigger is a `button`; counts have `aria-label` ("Cart, 3 items").
6. **No fabricated signals.** The free-delivery line shows only the real constant; no "trusted by" or promo copy in the header.
7. **Test before done.** See below.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (Prompts 01–06), `prompts/DESIGN_SYSTEM.md`. Inspect `Header.js`, `Header.module.css`, `src/utils/categories.js`, `src/context/DealsConfigContext.js`, and how `App.css` `.main-content` relates to the spacer.
2. Build the department→children→grandchildren structure from the flat `categories` array with `orderCategoriesHierarchically` (it returns `depthOf(id)`), or a small local grouping by `parentId`; keep `isActive` filtering as `categories.getAll()` already does.
3. Replace `useMediaQuery` breakpoints with the token breakpoints (768 / 1024) via CSS where possible; keep `useMediaQuery` for the conditional rendering of overlays if needed.
4. The MUI account `Menu` keeps its items; style it through the Prompt 06 theme overrides plus `PaperProps.className`.
5. If you move from `fixed` to `sticky`, delete the spacer and verify every page's top spacing at all widths (pages assume the spacer exists; search for `headerSpacer` and for any page CSS compensating with negative margins).
6. Use `BrandLogo` `priority` so the header logo is not lazy-loaded.
7. Test the flyout with the real data: Plastic Furniture (Essentials/Premium/Dining Sets/Sofas columns), Home Furniture (Living Room/Bedroom/Dining Room/Storage), Café & Restaurant Chairs and Outdoor Furniture (flat).

## Acceptance criteria

- [ ] Desktop header: utility strip, centred logo, quiet actions, department row with flyouts as specified; tablet and mobile variants as specified; the compact state on scroll.
- [ ] Every department, group and leaf category from the admin data is reachable through the flyouts with canonical `?category=<slug>` links; toggling `showInMainMenu` or reordering in the admin changes the header after a tab focus without reload.
- [ ] Cart and wishlist counts update live; account menu, login/register entry points, deals link visibility, theme toggle, search trigger and all four overlays work as before.
- [ ] Keyboard: Tab reaches every control; Enter/Space opens a flyout; Escape closes and restores focus; arrow keys optional.
- [ ] No hex/rgb or font-family literals in `Header.module.css` / `MegaMenu.module.css`; correct logo variant in both modes.
- [ ] No layout shift when the header compacts or the logo loads; no page lost its top offset.
- [ ] `npm run build` passes with no new warnings; no console errors.

## Test and QA

1. JSON Server mode: hover/click each department; open a leaf link and confirm the listing filters correctly and the active department underline shows; add to cart from a product page and watch the count; log in (`user@example.com` / `password123`) and use the account menu; log out; toggle dark mode; open search; open the mobile sidebar at 360px.
2. Widths 360, 768, 1024, 1280, 1440: verify the three layouts, no horizontal scroll, flyout fits within the viewport (`max-height` scrolls if needed).
3. Keyboard and screen reader: navigate the department row with Tab, open a flyout with Enter, move through its links, close with Escape; VoiceOver/NVDA announces the department links as expandable.
4. In the admin, set a department's `showInMainMenu` off and back on; the header follows after refocus (restore the data afterwards).
5. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
6. Nothing relies on a JSON Server-only response shape (categories come through `apiService.categories.getAll`, which already normalises both branches).
7. Admin regression: `/admin` unchanged.
8. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 07 — Header and mega-menu`: what changed, the sticky-vs-fixed decision and spacer handling, the `--sf-header-height` contract other prompts must use for sticky offsets, new components (`MegaMenu`, `navigationContent.js`), deviations, and anything needing client confirmation.
