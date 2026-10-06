# A & S Urbanseat Storefront — Build Prompt Index

**Status:** prompts generated 2026-10-06; build not started. Each prompt (`01_*.md` … `34_*.md`) runs in a fresh session, in order. Before any prompt, read this file, `BUILD_LOG.md` and (after Prompt 01) `DESIGN_SYSTEM.md`.

**How to run a prompt:** open a fresh session on the repository, run `npm ci` if `node_modules` is missing, start `npm run server` (JSON Server on :3001 reading `db.json`) and `npm start` (CRA on :3000; `.env` selects mock mode), paste the prompt file's content, and let the session finish with its build-log entry. There are no unit tests in the repository; `CI=true npm test -- --passWithNoTests` must still exit 0 and `npm run build` must pass after every prompt.

---

## 1. Prompt list (run in order)

| # | File | Objective (one line) | Depends on |
|---|---|---|---|
| 01 | `01_design-system-and-tokens.md` | Sample the logos, finalise palette/type/spacing/motion tokens in `storefront-tokens.css`, `colors.js`, `tokens.js`, `ThemeContext`; load fonts; `BrandLogo`; write `DESIGN_SYSTEM.md` | — |
| 02 | `02_brand-identity-wiring.md` | `APP_NAME`/tagline/contact/social constants, `brandContent.js` lines for approval, env name, `index.html` meta/icons/loading screen, `manifest.json`, trust-badge config | 01 |
| 03 | `03_catalogue-data-client-ranges.md` | Category tree + the 46 client-specified products (content only, exact shapes) + `scripts/validate-db.js` | 01, 02 |
| 04 | `04_catalogue-data-reference-site-ranges.md` | The 38 products from the reference site's other ranges, relations, coverage checklist | 03 |
| 05 | `05_supporting-data-and-integrity.md` | Settings, shipping, coupons, deals config, banners, reviews + ratings, wishlist, orders/payments/refunds/returns/wallet cascade, validator full mode | 02–04 |
| 06 | `06_global-ui-primitives.md` | `storefront-base.css` primitives, storefront MUI overrides, SweetAlert theme, `MotionConfig`, `Reveal`/`SectionHeading`/`renderAccent` | 01–05 |
| 07 | `07_header-and-mega-menu.md` | Utility strip, centred-logo header, department row with mega-menu flyouts, compact scroll state, `--sf-header-height` | 01–06 |
| 08 | `08_footer-newsletter-and-trust-bar.md` | Dark footer with white logo, single newsletter (revived `Newsletter`), honest trust bar, payment marks | 01–07 |
| 09 | `09_mobile-navigation.md` | `SidebarMenu` accordion, `BottomNav`, `BottomDrawer` sheet primitive, focus trap helper | 01–07 |
| 10 | `10_home-hero-and-assurance-strip.md` | Cinematic image/video hero from `homeContent.js`, data-backed assurance strip | 01–07 |
| 11 | `11_home-storytelling-and-discovery.md` | Shop by Space tiles, editorial story blocks, Featured Collections (revived `FeaturedProducts`), Complete the Space, Trending, Recently viewed, `ProductRail` | 01–10 |
| 12 | `12_home-social-proof-explainer-and-closing-cta.md` | Brands-we-carry strip, review carousel from approved reviews, hidden press slot, Our promise steps, optional marquee, closing CTA (revived `CTASection`) | 01–11 |
| 13 | `13_product-card.md` | The signature `ProductCard` + `PriceBlock` + `StarRating` (+ skeleton) | 01–06 |
| 14 | `14_product-listing-page.md` | Listing header, filter rail/sheet, toolbar, grid/list, pagination, revived `Breadcrumb` | 01–13 |
| 15 | `15_search.md` | Full-screen search overlay with data-derived popular chips and card results | 01–14 |
| 16 | `16_product-details-primary.md` | Gallery, title/price, variants, quantity, CTAs, trust, delivery, sticky bar | 01–14 |
| 17 | `17_product-details-secondary.md` | Details/specifications (parsed), reviews, bundle, related rail | 01–16 |
| 18 | `18_cart-drawer.md` | Premium cart drawer with live free-delivery progress and trust cues | 01–13 |
| 19 | `19_special-offers.md` | Admin-managed offers page: hero, countdown, coupon tickets, deals grid | 01–13 |
| 20 | `20_auth-modal.md` | Login/sign-up dialog with labels, autocomplete, focus management | 01–07 |
| 21 | `21_account-shell-and-profile.md` | `AccountLayout`/`AccountNav`, `?tab=` deep links, Profile section | 01–20 |
| 22 | `22_addresses-and-change-password.md` | Address cards/form and password form | 21 |
| 23 | `23_store-credit-wallet.md` | Balance card and ledger | 21 |
| 24 | `24_order-history.md` | Order cards, tracking, details, cancel/return/review, `ReviewModal` | 21 |
| 25 | `25_wishlist-page.md` | Wishlist with product cards and guest banner | 13, 21 |
| 26 | `26_checkout.md` | Stepper, forms, methods, payment, review, summary, failure alert (math untouched) | 18, 20, 22, 23 |
| 27 | `27_order-confirmation-and-invoice.md` | Confirmation with honest delivery line and a printable invoice | 26 |
| 28 | `28_static-legal-and-support-pages.md` | About, Help (revived `FAQ`), Support, policies from `legalContent.js`, 404 page, `ErrorBoundary` | 01–08, 24 |
| 29 | `29_copy-and-microcopy-pass.md` | One voice across all strings; voice guide | 01–28 |
| 30 | `30_motion-and-micro-interactions.md` | Motion audit and refinement, reduced-motion safety | 01–29 |
| 31 | `31_responsive-and-accessibility-pass.md` | Responsive + WCAG AA audit and fixes, skip link | 01–30 |
| 32 | `32_performance-seo-and-conversion-audit.md` | Lighthouse, images, fonts, code splitting, `usePageMeta`, JSON-LD, conversion checklist | 01–31 |
| 33 | `33_admin-logo-swap.md` | Replace the two admin logo placeholders; nothing else | 01 |
| 34 | `34_final-qa-and-parity.md` | Full walkthrough, parity, admin diff, `QA_CHECKLIST.md`, zero known issues | 01–33 |

Sequencing rules honoured: design system first; brand identity and catalogue data before any surface; primitives and shell before pages; polish → admin logo → final QA last; every storefront surface has exactly one owner (section 3).

---

## 2. Repo map (as analysed on 2026-10-06)

**Stack:** Create React App 5 (`react-scripts` 5.0.1), React 18, react-router 6, CSS Modules per component, MUI 5 (used only by `Header`, `BottomNav` icons, `CssBaseline` and the admin), `@iconify/react` (About/Home icons), framer-motion 10, SweetAlert2 (toasts fired from contexts), axios. `json-server` via `server.js` (safe non-cascading DELETE). No tests. `node_modules` absent in a fresh checkout (`npm ci`).

**Routing (`src/App.js`):** providers `ErrorBoundary > ThemeContextProvider > AuthProvider > AdminProvider > WishlistProvider > CartProvider > OrderProvider > Router`; admin routes `/admin` (login) and `/admin/*` under `AdminLayout` (own MUI theme `src/theme/adminTheme.js`, `body.admin-area` via `useAdminBodyClass`); storefront `/*` under `DealsConfigProvider` → `.App` → `Header`, `main.main-content` (`AnimatePresence`), `Footer`, `BottomNav`. No `/cart`, `/login` or 404 route today (`*` redirects home; Prompt 28 adds `NotFound`).

| Route | Page | Key components | API functions (`apiService.*`) | `db.json` collections |
|---|---|---|---|---|
| `/` | `pages/Home` | `HeroSection` → `AssuranceStrip`, Shop by Space, story blocks, `FeaturedProducts`, Complete the Space, `ProductRail`, `BrandStrip`, `ReviewCarousel`, promise steps, `CTASection` | `categories.getAll`, `products.getFeatured/getTrending/getAll/getBySlug/getFrequentlyBoughtTogether/getRelated/getReviews`, `settings.get`, `shipping.getMethods` | categories, products, reviews, settings, shipping_methods |
| `/products` | `pages/Products` | `Breadcrumb`, filter rail / `BottomDrawer`, `ProductCard` | `products.getAll`, `categories.getAll` (client-side filter/sort/paginate) | products, categories |
| `/products/:slug` | `pages/ProductDetails` | `ProductGallery`, `SocialProof`, `PriceBlock`, `VariantSelector`, `QuantityStepper`, `TrustBadges`, `DeliveryReturnsInfo`, `AddToCartBar`, `ReviewsSection`, `FrequentlyBoughtTogether`, `RelatedProducts` | `products.getBySlug/getById/getReviews/getRelated/getFrequentlyBoughtTogether`, `categories.getById`, `settings.get`, `shipping.getMethods` | products, categories, reviews, settings, shipping_methods |
| cart (drawer) | `components/CartDrawer` | — | `shipping.getMethods`, `settings.get` (display only); mutations via `CartContext` (`cart.getCart/addToCart/removeFromCart` for logged-in sync) | cart, shipping_methods, settings |
| search (overlay) | `components/SearchModal` | `ProductCard` | `products.getAll`, `categories.getAll` (in-memory scoring) | products, categories |
| auth (modal) | `components/AuthModal` | — | via `AuthContext`: `auth.login/register` | users |
| `/checkout` | `pages/Checkout` | stepper, forms, summary | `shipping.getMethods`, `settings.get`, `wallet.getBalance`, `coupons.validate`, `orders.create` (via `OrderContext`) | shipping_methods, settings, walletTransactions, coupons, orders, payments |
| `/order-confirmation/:orderNumber` | `pages/OrderConfirmation` (+ `Invoice`) | — | `orders.getByOrderNumber` | orders |
| `/orders` | `pages/OrderHistory` | `AccountLayout`, `ReviewModal` | `orders.getByUserId/cancel`, `reviews.getMine/submit` | orders, reviews, payments, refunds, coupons, walletTransactions (cascade) |
| `/profile` (+ `?tab=`) | `pages/Profile` | `AccountLayout` | `auth.updateUser/changePassword`, `wallet.getBalance/getTransactions` | users, walletTransactions |
| `/wishlist` | `pages/Wishlist` | `AccountLayout`, `ProductCard` | via `WishlistContext`: `wishlist.get/add/remove` | wishlist |
| `/special-offers` | `pages/SpecialOffers` | `ProductCard` | `deals.getConfig` (context), `products.getAll`, `categories.getAll`, `coupons.getActive` | dealsConfig, products, coupons |
| `/help`, `/support`, `/about`, `/privacy`, `/terms`, `/cookies`, `/refund`, `*` | the static pages, `NotFound` | `FAQ`, `Breadcrumb` | `leads.createContact` (support) | leads |
| footer | `components/Footer` | `Newsletter` | `leads.createNewsletter`, `categories.getAll`, `settings.get`, `shipping.getMethods` | leads, categories |

**Contexts (`src/context`):** `ThemeContext` (persisted light/dark: `localStorage["theme"]`, `body.light`/`body.dark`, storefront MUI theme from `colors.js`; also used by the admin for mode); `AuthContext` (user, `authStorage` session/persistent storage, global auth-modal state, Swal toasts); `CartContext` (local cart `localStorage["cart"]`, merge + debounced mirror to the API for logged-in users, line key `productId-variantId`); `WishlistContext` (`localStorage["wishlist"]`, login merge, optimistic API rows); `OrderContext` (`createOrder` builds `orderNumber` and statuses); `DealsConfigContext` (normalised deals config, refetch on focus); `AdminContext` (admin session, untouched).

**Utils:** `constants.js` (brand, routes, enums, contact, social, FAQ, `FREE_SHIPPING_THRESHOLD`), `helpers.js` (`PLACEHOLDER_IMG` + `onImageError` fallback system, `formatCurrency` en-IN, `getProductMinPrice`, `buildCartItem`, `productPath`, `normalizeOrderAddress`, `formatDate` en-US shared with the admin), `categories.js` (canonical `/products?category=<slug>`, parent-includes-children, main-menu rules), `dealsConfig.js` (countdown rules), `authStorage.js`.

**Theme:** `src/theme/storefront-tokens.css` (`--sf-*`, light on `:root`, dark on `body.dark`, imported by `index.css`), `tokens.js` (JS mirror + `STOREFRONT_CONFIG`, `TRUST_BADGE_CATALOG`, `resolveTrustBadgeDetail`), `colors.js` (MUI palette), `adminTheme.js` (admin only, never touched). Today only `src/components/storefront/*`, `Products.module.css` and `ProductDetails.module.css` use tokens; every other module carries raw hex (≈2,300 literals, five competing palettes) and is migrated by its owning prompt.

**Data model (`db.json`, exact key sets to preserve):** `banners`, `users` (with `addresses[]`, `storeCredit` cache), `admins`, `categories` (`parentId` tree, `showInMainMenu`, `menuOrder`, `sortOrder`, `image`), `products` (`variants[]` with optional `attributes`/`swatchHex`, `tags`, `featured/trending/hot`, `rating/totalReviews`, `relatedProductIds`, `frequentlyBoughtTogetherIds`, `metaTitle/metaDescription`; **no specifications field**), `cart`, `orders` (items snapshots, three status fields, `statusHistory`, optional store-credit/refund fields), `returns`, `payments`, `refunds`, `shipping_methods` (`flatRate`, `freeAbove`, `estimatedDays`), `coupons`, `reviews` (`status` moderation, `isVerifiedPurchase`), `wishlist` (product snapshots), `leads` (contact + newsletter), `settings` (store/shipping/payment/notifications/seo/social), `walletTransactions` (ledger = source of truth), `dealsConfig` (singleton). The admin-managed menu is `categories.showInMainMenu`/`menuOrder` (there is no separate `menu` collection).

**API contract (`src/services/api.js`, untouched by every prompt):** namespaces `auth, products, categories, banners, cart, orders, wallet, reviews, returns, coupons, wishlist, shipping, settings, deals, leads, admin`; JSON Server branch gated by `IS_MOCK_API`, Laravel branch unwrapped by `extractData` (`{ success, data, meta }`); mock-only side effects (payment record, coupon `usedCount`, wallet debit, cancel cascade) mirror what Laravel does server-side. Storefront code must only call `apiService.*`.

**Static assets:** `public/` has `favicon.ico` (16/32/48), `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180), `android-chrome-192x192.png`, `android-chrome-512x512.png`, `index.html` (links non-existent `favicon.svg`, `logo192.png`, `logo512.png`: fixed by Prompt 02), `manifest.json` (`icons: []`: fixed by Prompt 02), `robots.txt`. Logos are remote (Cloudinary) and wired as `LOGO_URLS` by Prompt 01.

**Admin coupling the storefront must respect (from the audit):** the admin inherits `<CssBaseline />` body styles from the storefront MUI theme (keep Inter as the UI sans or verify pixel parity), the Inter font load (`adminTheme.js` hardcodes it), `index.css` (`.swal2-container z-index`, `* { box-sizing }`, `html { scroll-behavior }`), `App.css` base scrollbar structure and the `body.light`/`body.dark` SweetAlert variables (admin overrides win only by source order: never edit, reorder or re-scope existing rules; add storefront rules after them scoped `body:not(.admin-area)`), `document.body.style.backgroundColor` written by `ThemeContext`, the `theme` localStorage key, `ErrorBoundary` (wraps the admin too), `REACT_APP_NAME` (admin logo `alt`), `formatDate`/`formatCurrency` helpers (shared). Admin pages import nothing from `src/components` (non-admin), `tokens.js`, `colors.js` or `--sf-*`.

---

## 3. Coverage table (every storefront route, page and component → one owning prompt)

| Surface | File(s) | Owner | Notes |
|---|---|---|---|
| Home `/` — hero + assurance strip | `pages/Home` (top), `components/HeroSection`, `storefront/AssuranceStrip` (new) | 10 | banner carousel, promo cards, icon bar removed |
| Home — storytelling and discovery | `pages/Home` (middle), `components/FeaturedProducts` (revived), `storefront/ProductRail` (new) | 11 | flash deals, promo banner removed |
| Home — social proof, explainer, closing CTA | `pages/Home` (bottom), `components/CTASection` (revived), `storefront/ReviewCarousel`, `storefront/BrandStrip`, `ui/Marquee` (new) | 12 | "Why choose us" grid replaced |
| Listing `/products` | `pages/Products`, `components/Breadcrumb` (revived) | 14 | |
| Search overlay | `components/SearchModal` (+ `index.js`) | 15 | mounted by Header and BottomNav |
| Product `/products/:slug` — primary | `pages/ProductDetails` (top), `storefront/ProductGallery`, `VariantSelector`, `QuantityStepper`, `TrustBadges`, `DeliveryReturnsInfo`, `AddToCartBar`, `SocialProof`, `variantUtils` (read-only) | 16 | |
| Product — secondary | `pages/ProductDetails` (bottom), `storefront/ReviewsSection`, `FrequentlyBoughtTogether`, `RelatedProducts` | 17 | `parseSpecifications` helper |
| Product card | `storefront/ProductCard`, `PriceBlock`, `StarRating`, `storefront/index.js` | 13 | |
| Cart drawer | `components/CartDrawer` | 18 | no `/cart` page exists |
| Special offers `/special-offers` | `pages/SpecialOffers` | 19 | |
| Auth modal | `components/AuthModal` | 20 | no `/login` route exists |
| Account shell + Profile tab `/profile` | `pages/Profile` (shell + profile), `account/AccountLayout`, `account/AccountNav` (new) | 21 | |
| Addresses + Change password tabs | `pages/Profile` (two sections) | 22 | |
| Store-credit wallet tab | `pages/Profile` (wallet section) | 23 | |
| Orders `/orders` | `pages/OrderHistory`, `components/ReviewModal` | 24 | |
| Wishlist `/wishlist` | `pages/Wishlist` | 25 | |
| Checkout `/checkout` | `pages/Checkout` | 26 | |
| Confirmation `/order-confirmation/:orderNumber` | `pages/OrderConfirmation`, `OrderConfirmation/Invoice` (new) | 27 | |
| About, Help, Support, Privacy, Terms, Cookies, Refund, 404 | `pages/AboutUs`, `HelpCenter`, `Support`, `PrivacyPolicy`, `TermsOfService`, `CookiePolicy`, `RefundPolicy`, `pages/NotFound` (new), `components/FAQ` (revived), `components/ErrorBoundary` | 28 | `*` route changes from redirect to 404 page |
| Header + mega-menu | `components/Header` (+ `MegaMenu`, `useHeaderHeight`), `content/navigationContent.js` | 07 | |
| Footer + newsletter | `components/Footer`, `components/Newsletter` (revived) | 08 | |
| Mobile nav | `components/SidebarMenu`, `BottomNav`, `BottomDrawer` (revived) | 09 | |
| Scroll restoration | `components/ScrollToTop` | 30 | |
| Primitives | `theme/storefront-base.css`, `ui/Reveal`, `ui/SectionHeading`, `ui/renderAccent`, `ui/index.js`, storefront MUI overrides, storefront SweetAlert theme, `MotionConfig` | 06 | |
| Tokens and brand assets | `theme/storefront-tokens.css`, `theme/colors.js`, `theme/tokens.js` (`TOKENS`), `ThemeContext` palette/typography, `index.css`, `App.css`, `ui/BrandLogo`, `LOGO_URLS`, `PLACEHOLDER_IMG` | 01 | |
| Brand identity | `utils/constants.js` (brand/contact/social), `.env*`, `public/index.html` (meta, icons, loader), `public/manifest.json`, `content/brandContent.js`, `STOREFRONT_CONFIG` | 02 | |
| Data | `db.json` categories/products | 03, 04 | content only |
| Data | `db.json` all other collections, `FREE_SHIPPING_THRESHOLD`, `scripts/validate-db.js` | 05 | content only |
| Cross-cutting passes | copy (29), motion (30), responsive/a11y (31, adds the skip link in `App.js`), performance/SEO/conversion (32, adds `hooks/usePageMeta.js`, lazy routes in `App.js`) | 29–32 | fix in place, no new surfaces |
| Admin | `components/AdminLayout/AdminLayout.js`, `pages/Admin/AdminLogin.js` (logo lines only) | 33 | the only admin change |
| Final QA | `prompts/QA_CHECKLIST.md` | 34 | |

Contexts (`Auth`, `Cart`, `Wishlist`, `Order`, `DealsConfig`, `Admin`) keep their logic in every prompt; only their toast wording may change (Prompt 29). `src/services/api.js`, `src/utils/categories.js` (additive helper allowed in 09), `src/utils/dealsConfig.js`, `src/utils/authStorage.js`, `src/theme/adminTheme.js`, `src/hooks/useAdminBodyClass.js`, `server.js`, `package.json` dependencies are never changed.

---

## 4. Shared guardrails (restated in every prompt, tailored to its surface)

1. **Preserve functionality and the data/API contract.** Everything stays API-driven through the dual-mode `api.js` and `db.json`. Never break cart, checkout or money math, auth, wishlist sync, store credit, coupons, review gating and moderation, deals config, slug routing or category navigation. Changes are visual and UX only: do not alter API call signatures, response handling, the `{ success, data, meta }` Laravel-branch contract or the `db.json` schema; add no endpoints or collections. Only the data prompts (03–05) add or replace seed content, using the existing field shapes.
2. **Reuse and extend the theme token system** (`storefront-tokens.css`, `colors.js`, `tokens.js`, `ThemeContext`, plus `storefront-base.css` and `DESIGN_SYSTEM.md` from Prompts 01/06). Colours, type, spacing, radii, shadows and motion are tokens consumed everywhere; no hardcoded hex values or font names in components.
3. **Do not modify the admin panel** (`src/pages/Admin/*`, `src/components/AdminLayout/*`) except in Prompt 33 (logo only). Storefront changes to shared tokens, global styles or shared components must not change how the admin looks or behaves (scope global rules with `body:not(.admin-area)`; never edit the rules the admin inherits).
4. **Brand consistency and minimalism** on every surface, with the correct logo per background; the layout is a clear departure from the stock storefront, not a recolour.
5. **Responsive and accessible**: mobile, tablet, desktop; semantic HTML, keyboard, visible focus, contrast, alt text, reduced motion.
6. **No fabricated trust signals**: ratings, reviews and social proof only from data with honest empty states; no invented press, awards, client names, statistics or urgency.
7. **Test before done**: verify the surface, then confirm no regressions in existing flows or in the admin; `npm run build` passes; append the build-log entry.

---

## 5. Open questions and deviations (decisions taken while writing the prompts)

1. **Tier labels.** "Non-premium" never appears; shopper-facing tiers are Essentials and Premium (data validator asserts it).
2. **Category tree shape.** Three levels (department → group → leaf). The reference site's other ranges are grouped under two departments, Home Furniture (Living Room, Bedroom, Dining Room, Storage) and Office Tables & Desks, plus Plastic Dining Sets and Plastic Sofas under Plastic Furniture, instead of ~20 top-level departments; singleton ranges are paired into shared leaves so no listing shows a lonely product. Café & Restaurant Chairs and Outdoor Furniture are flat.
3. **No specifications field.** Products have no `specifications`; Prompts 03/04 end each description with a parseable `Specifications: Key: Value; …` paragraph that Prompt 17 renders as a table. Schema untouched.
4. **Admin-managed menu.** There is no `menu` collection; the menu is `categories.showInMainMenu`/`menuOrder`, which the mega-menu and sidebar follow.
5. **`banners` collection.** The redesigned hero reads the content module, so `banners` is reseeded with brand copy but no longer rendered; `apiService.banners.getAll` stays exported and untouched.
6. **Removed fabricated content.** Flash deals with a midnight-reset countdown, "Deal of the day 50% off" promo cards, "Up to 50% off on top brands" banner, invented About stats (50K+ customers…), "Live chat 24/7", "24/7 support", "Best price guarantee", demo trending searches, hollow "(0)" ratings.
7. **Press / "As featured in".** No data source exists and the schema cannot be extended; the slot renders nothing until a source exists. "Brands we carry" is derived from `product.brand`.
8. **Home review carousel.** No storefront endpoint lists all approved reviews; the carousel aggregates `products.getReviews` for the featured products (≤ 8 calls, lazy).
9. **Reference site facts are thin.** kamdhenufurniture.in lists ranges and one-line descriptions only: no model names, specs, colours, sizes or prices (its template even labels plastic chairs "Premium Wood"); its `+91 98765 43210` is a template placeholder; its email is on `.com` while the site is `.in`; no street address, no social profiles. All names, prices and specs are placeholders (section 6).
10. **"Lobby set" and "Jhula".** Our reading of the client's "Looby set" and "Julna"; not on the site; unverified.
11. **404 page.** `*` currently redirects silently to `/`; Prompt 28 introduces a branded 404 page (behaviour change).
12. **Cart drawer.** The duplicate "View Cart" button (both buttons went to `/checkout`) is dropped; the free-delivery indicator reads live shipping methods instead of the constant + a stale local `FLAT_SHIPPING = 99`.
13. **Auth modal.** Disabled "Soon" Google/Facebook buttons are removed (no flow exists); the "Forgot password" info banner stays (no reset flow exists).
14. **Dates.** `formatDate` is shared with nine admin pages and stays `en-US`; currency is already `en-IN`. Prompt 29 may add a storefront-only `formatDateIN` helper.
15. **Pre-paint background.** `index.html` wrote a purple gradient through the `background` shorthand (leaking a `background-image` under the admin's overscroll); Prompt 02 switches to a solid `backgroundColor` matching `colors.js`.
16. **ErrorBoundary** wraps the admin too; Prompt 28 restyles it neutrally with CSS-variable inline styles and documented fallbacks.
17. **CssBaseline coupling.** The storefront MUI theme feeds the global baseline the admin body inherits; Prompt 01 recommends Inter as the UI sans and requires admin screenshot parity.
18. **Order confirmation** has no ownership guard (anyone with the number can view); unchanged, noted. Orders do not store the chosen shipping method, so the page can no longer show an invented "+5 days" estimate; it shows an honest line. Storing the method on orders is a backend/schema question for later.
19. **Returns.** No storefront return form exists (`apiService.returns.create` is unused); "Return or exchange" keeps routing to Support, now with `?order=&category=returns` prefill.
20. **Material Icons stylesheet** (unused) and the duplicate Inter `@import` are removed in Prompt 01.
21. **Dead code left as is unless a prompt says otherwise:** `getImageUrl`, `useSound` + `src/assets/click-sound-1.wav`, `APP_DESCRIPTION`, `RETURN_REASONS`, `validateForm`, `isPasswordStrong`, `canvas-confetti` dependency (Prompt 32 may remove it), `settings.payment.codFee` (never applied; unchanged).
22. **Broken deep links fixed by their prompts:** `/products?filter=trending|best-sellers` (sidebar), `/products?sort=sale|featured|trending|discount` (home/hero); valid sorts are `relevance, price-low, price-high, newest, rating, popularity` (`popular` alias).
23. **Two `SearchModal` instances** (Header + BottomNav) exist today; Prompt 09 decides whether to consolidate.
24. **Admin theme toggle** flips the storefront mode too (shared `theme` key); pre-existing and unchanged.
25. **Placeholder images** stay on `placehold.co` URLs in neutral tones (the boilerplate's approach) with the inline `PLACEHOLDER_IMG` fallback; real photography replaces them through the admin with no code change.
26. **Node/tests.** `node_modules` is absent (`npm ci` per session); no tests exist.

---

## 6. Needs client confirmation

- Tagline adoption ("Trusted Comfort for Every Home", from the logo) and every proposed brand line (hero headlines/support lines, brand promise, newsletter line, about intro, promise steps, closing CTA) — Prompt 02/10/12.
- All product names, descriptions, specifications, materials, colours, sizes, shelf counts, dimensions, weights, stock levels and prices (INR placeholders) — Prompts 03/04.
- Manufacturer brand attributions: Nilkamal on plastic chairs/dining/sofa, Carlton and Nilkamal mattresses, Winsome tables, "A & S Urbanseat" on workshop-made wooden pieces (own manufacturing) — Prompts 03/04.
- "Lobby set" and "Jhula (Garden Swing)" names and their Small/Large sizing — Prompt 03.
- Contact details: email `info@kamdhenufurniture.com`, phone `+91 84729 18653`, WhatsApp `+91 84729 19541`, street address and PIN (missing), hours Mon–Sat 9–7 — Prompt 02/05.
- Social profiles (none found) — Prompt 02/08.
- Delivery: methods, rates (₹499 / ₹999), windows (7–10 / 3–5 days), free-delivery threshold (₹9,999), service area — Prompt 05.
- Returns window (7 days) and furniture-specific eligibility; refund timelines — Prompts 02/05/28.
- COD cap (₹50,000), COD fee (0), GST rate (18%, tax-exclusive display) — Prompt 05/26.
- Coupon codes and values — Prompt 05.
- Warranty claims ("20+ years" on the reference site), "since 20+ years", "own manufacturing" statements — excluded until confirmed (Prompts 02/04/28).
- Payment methods actually offered (card/UPI/net banking/wallet/COD) and gateway; bank list — Prompt 26.
- Legal: governing law (Assam proposed), GSTIN/registered address for the invoice, all policy texts (drafts) — Prompts 27/28.
- Support response-time promise, store-credit expiry — Prompts 23/28.
- Real photography for hero, spaces, stories, promise steps, categories and products; whether press/client logos exist — Prompts 10–12.
- Production domain for `og:url` and sitemap hosting — Prompts 02/32.
- Hero copy wording in the admin-managed deals config — Prompt 05/19.

## 7. Remove or replace before launch

- Demo reviews (all seeded reviews), demo orders, payments, refunds, returns and wallet ledger rows, demo leads created during QA.
- Demo accounts and their plaintext passwords in `db.json` (`user@example.com`, `jane@example.com`, `mail4bappidas@gmail.com`, admin `admin@store.com`).
- Placeholder images (`placehold.co` URLs on products, categories, hero, stories, steps) and the inline "Image coming soon" fallback as the only image on any product.
- Placeholder prices, stock levels, specifications and model names.
- Placeholder contact details, address, hours, social links; the "Draft for legal review" policy texts.
- `.env.production` API URL (currently a Cloudways placeholder) and `REACT_APP_*` values.
- `scripts/validate-db.js` may stay as a dev tool; `src/assets/click-sound-1.wav` and other dead code if not cleaned earlier.
