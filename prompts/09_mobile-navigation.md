# Mobile navigation — sidebar menu, bottom nav and bottom sheet

**Prompt 9 of 34**

## Depends on

Prompts 01, 02, 03–05 (category tree), 06 (primitives), 07 (header: mounts `SidebarMenu`, defines `--sf-header-height`, decides which actions live in the header at < 1024px).

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India. This Create React App storefront (CSS Modules, MUI icons, framer-motion; data through the dual-mode `src/services/api.js` and `db.json`) is being redesigned into a premium editorial boutique on the token system in `prompts/DESIGN_SYSTEM.md`. Logos via `BrandLogo` (light logo on light surfaces, white logo on dark). The admin panel must not change.

## Objective

Restyle and restructure the three mobile navigation shells so phones and tablets get the same editorial calm as desktop: the slide-in `SidebarMenu` (department accordion mirroring the mega-menu, account, settings), the fixed `BottomNav`, and the generic `BottomDrawer` sheet (revived as the shared bottom-sheet primitive). Every link and behaviour is preserved and data-driven.

## Scope — files and areas to touch

- `src/components/SidebarMenu/SidebarMenu.js` + `SidebarMenu.module.css` (rewrite; keep the props `open`, `onClose`, `onOpenAuth`).
- `src/components/BottomNav/BottomNav.js` + `BottomNav.module.css` (rewrite).
- `src/components/BottomDrawer/BottomDrawer.js` + `BottomDrawer.module.css` (currently an orphan: make it the accessible, reusable bottom sheet that Prompt 14's mobile filter sheet and any later mobile sheet can use; keep props `open`, `onClose`, `title`, `children`, add `ariaLabel`, `initialFocusRef`, `maxHeight`).
- `src/components/SearchModal/SearchModal.js`: read-only (Prompt 15), but note it is mounted twice today (Header and BottomNav); keep BottomNav's instance or route BottomNav's search action through the Header's instance via a small shared callback (your call; document it).

Do not touch: `Header/*` beyond reading, `CartDrawer/*`, `AuthModal/*`, pages, `api.js`, `db.json`, admin.

## What exists today (read before rewriting)

- `SidebarMenu.js` (618 lines): `role="dialog" aria-modal` panel from the left (332px, spring), backdrop, Escape, body scroll lock, focus into panel; hero block (logged-in user card → `/profile`, or guest "Sign in" → `onClose(); onOpenAuth()`); "Discover" quick links (`/products?filter=trending` and `/products?filter=best-sellers` are **broken**: the listing has no `filter` param; `/products?sort=newest` works; deals links gated by `useDealsConfig().enabled`); "Shop" accordion lazily fetching `apiService.categories.getAll()` on first expand, top level = `parentId == null` (plus orphans), single-open parent, nested descendants indented, "Shop all {name}" and "View all products" → `/products`; keyword→MUI-icon mapping for categories (electronics-era); "My Account" (`/orders`, `/wishlist`, `/profile`, Logout → `logout()` + `navigate("/")` when `user`); "Settings" (Help & Support `/support`, theme `role="switch"` → `toggleTheme`); footer (`/terms`, `/privacy`, `© year APP_NAME`); 13 local `--sm-*` colour aliases with gradients; cart-icon + `APP_NAME` wordmark.
- `BottomNav.js` (112 lines): fixed, `z-index 1200`, hidden ≥ 769px, hides on scroll down past 80px and shows on scroll up; items Home `/`, Categories `/products`, Search (opens its own `SearchModal` instance), Wishlist `/wishlist` (count badge, "99+"), Account `/profile`; `aria-current`; no cart entry; indigo accents.
- `BottomDrawer.js` (31 lines): backdrop + spring sheet, `×` close; no role, no Escape, no scroll lock, no focus management.

## Brand and design requirements

### SidebarMenu (< 1024px; also usable on desktop if the header exposes it)

- Panel: paper surface (dark base in dark mode), width `min(360px, 88vw)`, no rounded corner, hairline right edge, slides in with `--sf-duration-slow` and `--sf-ease-out` (no spring), backdrop = overlay token; `role="dialog" aria-modal="true" aria-label="Menu"`, focus trap (Tab cycles inside; implement with a small focus-trap helper or `inert` on the rest of the page), Escape closes, focus returns to the hamburger, body scroll lock as today.
- Header row: `<BrandLogo height={28} />` (auto variant) and a 44px close button.
- Account block: logged-in → avatar initial in a hairline circle, name, email, "My account" link; guest → serif line "Sign in for faster checkout and order tracking." + `.sf-btn--primary --block` "Sign in" (→ `onClose(); onOpenAuth()`), ghost "Create account" (→ `onOpenAuth("signup")` if the prop supports it; otherwise the same callback).
- Shop: an accordion built from `apiService.categories.getAll()` (fetched when the panel opens, cached in state) with the **same grouping as the mega-menu**: department rows (from `getMainMenuCategories`) expand (one at a time, `aria-expanded`, `aria-controls`) to show their second-level groups as eyebrow headings with their leaf links beneath, and a "Shop all <Department>" link; flat departments (Café & Restaurant Chairs, Outdoor Furniture) navigate directly. Remove the keyword→icon mapping entirely (no icons per category; the serif department names are the design). Links use `categoryParam` and `/products?category=<slug>`.
- Discover: replace the broken quick links with valid ones: "New arrivals" `/products?sort=newest`, "Best sellers" `/products?sort=popular`, "Offers" `/special-offers` (only when `enabled`), "Our story" `/about`.
- Settings: Help & support `/support`, theme toggle (`role="switch"`, `aria-checked`, label "Dark mode"), and the footer legal links + copyright with `APP_NAME`.
- Typography: department rows in the display serif at 20px, group headings as eyebrows, leaf links sans 15px; hairlines between blocks; generous 16–20px vertical rhythm; 48px row heights.
- Remove every gradient and the `--sm-*` palette; map to `--sf-*` tokens.

### BottomNav (≤ 768px)

- Five items: Home `/`, Shop `/products`, Search (opens the search modal), Wishlist `/wishlist` (count via `useWishlist().getWishlistCount`), Account `/profile` (or opens the auth modal for guests via `useAuth().openAuthModal("login")` — today it navigates to `/profile`, which redirects guests home; opening the modal is the better UX; keep `/profile` for logged-in users). Cart stays in the header (always visible) so the bar does not duplicate it.
- Surface: paper with a top hairline, no blur, icons as 24px outline glyphs, labels 11px eyebrow-style, active = ink with a 2px top accent indicator; `aria-current="page"`; safe-area padding; hides on scroll down as today (transform only) but **never while a sheet or drawer is open**.
- `z-index` from the token scale (define `--sf-z-bottomnav` in `storefront-tokens.css` if Prompt 01 did not; it must sit below drawers/modals and above page content).
- Count badge via `.sf-count`.

### BottomDrawer (shared bottom sheet)

- `role="dialog" aria-modal aria-label={ariaLabel || title}`, Escape closes, focus moves to `initialFocusRef` or the close button, focus returns on close, body scroll lock, drag handle (visual only), `maxHeight` default `80vh`, paper surface with top radius `--sf-radius-lg` (the one place a larger radius is acceptable), hairline header with the title in the display serif, 44px close button. Motion: slide up `--sf-duration` with `--sf-ease-out`; opacity only under reduced motion. Export it from `src/components/ui/index.js` too.

## Functional guardrails

1. **Preserve functionality and the data/API contract**: all navigation targets listed are kept; categories only via `apiService.categories.getAll()`; deals gating via `useDealsConfig`; theme via `useTheme().toggleTheme`; logout via `useAuth().logout()` then `navigate("/")`; auth via the `onOpenAuth` prop; no new endpoints.
2. **Tokens only**: the three CSS modules end with zero hex/rgb literals and no font-family literal.
3. **Admin untouched**: nothing here is mounted in `/admin`.
4. **Brand consistency**: no gradients, no cart-icon wordmark, serif department names, hairlines.
5. **Responsive and accessible**: dialog semantics, focus trap, Escape, `aria-expanded` accordions, 44–48px targets, `aria-current`, reduced motion through `MotionConfig` (Prompt 06) plus CSS.
6. **No fabricated trust signals**: no "HOT" badges on links, no promo copy in the menu.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (01–08; Prompt 07's notes on which header actions exist at < 1024px), `prompts/DESIGN_SYSTEM.md`; then the three components, `src/utils/categories.js`, `src/components/Header/MegaMenu.js` (reuse its grouping helper if Prompt 07 exported one; otherwise extract a shared `groupCategoryTree(categories)` into `src/utils/categories.js` — allowed as a pure addition that changes no existing export).
2. The search action from BottomNav: simplest is to keep its own `SearchModal` instance (the modal caches catalogue data at module level, so two instances cost one fetch); if you share the header's, pass an `onOpenSearch` prop from `App.js` level state. Document the choice.
3. Scroll-hide logic: keep the passive scroll listener; add a guard that checks `document.body.style.overflow === "hidden"` (set by drawers) to stay visible while any overlay is open.
4. Test the accordion with the real tree (Plastic Furniture → Essentials/Premium/Dining Sets/Sofas → leaves; Home Furniture → rooms → leaves).

## Acceptance criteria

- [ ] SidebarMenu, BottomNav and BottomDrawer match the specifications; all links valid (no `?filter=` links remain); department accordion mirrors the mega-menu groups.
- [ ] Focus trap, Escape and focus return work in SidebarMenu and BottomDrawer; BottomNav `aria-current` correct and hidden while overlays are open.
- [ ] Zero colour/font literals; dark mode verified.
- [ ] `npm run build` passes with no new warnings.

## Test and QA

1. JSON Server mode at 360px and 768px: open the sidebar, expand departments, navigate to a leaf, sign in via the sidebar, log out; use every bottom-nav item; open and close a `BottomDrawer` (wire a temporary demo or test through Prompt 14 later; at minimum render it once in a scratch route locally and remove it).
2. Widths 360, 768, 1024 (sidebar still works if the header shows a hamburger at tablet), 1440 (bottom nav hidden).
3. Keyboard and screen reader (VoiceOver on iOS Safari if available, otherwise desktop screen reader with a narrow viewport): dialog announced, accordion states, current page.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. No JSON Server-only reliance.
6. Admin regression quick check.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 09 — Mobile navigation`: what changed, the search-instance decision, the `--sf-z-bottomnav` token if added, the `groupCategoryTree` helper if extracted, deviations, client confirmations.
