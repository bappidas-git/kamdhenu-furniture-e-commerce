# A & S Urbanseat Storefront — Build Prompt Index

**Status:** Build complete — zero known issues (2026-10-11). All 34 prompts have run (prompts generated 2026-10-06), and Prompts 02–05 were re-verified at max effort by `prompts/prompt_V2/` (V2-01…V2-05): V2-01 to V2-04 re-checked them requirement by requirement and repaired what fell short, and V2-05 re-ran the full regression, closed every finding and signed off (`prompts/prompt_V2/reports/V2_SIGN_OFF.md`). Every prompt's output now meets the max-effort standard. `BUILD_LOG.md` records each prompt, and `QA_CHECKLIST.md` is the final pass with its evidence (its "V2 re-run" section is the latest). Decisions still open for the client or the owner are in sections 6 and 7. Before any further change, read this file, `BUILD_LOG.md` and `DESIGN_SYSTEM.md` (§43 is the maintainer checklist).

**Effort:** Prompts 01 and 06–34 ran at max effort. Prompts 02–05 first ran at medium effort; V2-01 (Prompt 02), V2-02 (03), V2-03 (04) and V2-04 (05) re-verified them at max effort, and V2-05 re-ran the whole QA after those repairs. No prompt's output rests on medium-effort work alone.

**How to run a prompt:** open a fresh session on the repository, run `npm ci` if `node_modules` is missing, start `npm run server` (JSON Server on :3001 reading `db.json`) and `npm start` (CRA on :3000; `.env` selects mock mode), paste the prompt file's content, and let the session finish with its build-log entry. The repository started with no unit tests and ends the build with 89 Jest suites (1,456 tests, after V2-05); `CI=true npm test -- --passWithNoTests` must exit 0 and `npm run build` must pass after every change.

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
| 31 | `31_responsive-and-accessibility-pass.md` | Responsive + WCAG AA audit and fixes, skip link (audit: `QA_RESPONSIVE_A11Y.md`) | 01–30 |
| 32 | `32_performance-seo-and-conversion-audit.md` | Lighthouse, images, fonts, code splitting, `usePageMeta`, JSON-LD, conversion checklist | 01–31 |
| 33 | `33_admin-logo-swap.md` | Replace the two admin logo placeholders; nothing else | 01 |
| 34 | `34_final-qa-and-parity.md` | Full walkthrough, parity, admin diff, `QA_CHECKLIST.md`, zero known issues | 01–33 |

Sequencing rules honoured: design system first; brand identity and catalogue data before any surface; primitives and shell before pages; polish → admin logo → final QA last; every storefront surface has exactly one owner (section 3).

### 1.1 V2 re-verification (`prompts/prompt_V2/`, run after Prompt 34)

Prompts 02–05 ran at medium effort; these five re-verified them at max effort, in order. Each writes its report in `prompts/prompt_V2/reports/` and a build-log entry.

| # | File | Objective (one line) | Report |
|---|---|---|---|
| V2-01 | `prompt_V2/01_V2_brand-identity-wiring-audit.md` | Re-verify Prompt 02 (brand identity wiring) requirement by requirement; repair the gaps | `V2-01_REPORT.md` |
| V2-02 | `prompt_V2/02_V2_catalogue-client-ranges-audit.md` | Re-verify Prompt 03 (the category tree and the 46 client-range products) | `V2-02_REPORT.md` |
| V2-03 | `prompt_V2/03_V2_catalogue-reference-ranges-audit.md` | Re-verify Prompt 04 (the 38 reference-site products, relations and coverage) | `V2-03_REPORT.md` |
| V2-04 | `prompt_V2/04_V2_supporting-data-integrity-audit.md` | Re-verify Prompt 05 (settings, coupons, reviews, orders and their cascades, the validator's full mode) | `V2-04_REPORT.md` |
| V2-05 | `prompt_V2/05_V2_full-regression-and-sign-off.md` | Re-run the final QA after V2-01…V2-04, fix every defect, close every finding, sign off | `V2-05_REPORT.md`, `V2_SIGN_OFF.md` |

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
| Responsive and accessibility audit | `prompts/QA_RESPONSIVE_A11Y.md` (method, findings, before and after) | 31 | |
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
11. **404 page.** `*` redirected silently to `/`; Prompt 28 added the branded 404 page (behaviour change, done).
12. **Cart drawer.** The duplicate "View Cart" button (both buttons went to `/checkout`) is dropped; the free-delivery indicator reads live shipping methods instead of the constant + a stale local `FLAT_SHIPPING = 99`.
13. **Auth modal.** Disabled "Soon" Google/Facebook buttons are removed (no flow exists); the "Forgot password" info banner stays (no reset flow exists).
14. **Dates.** `formatDate` is shared with nine admin pages and stays `en-US`; currency is `en-IN`. Done: Prompt 29 added the storefront-only `formatDateIN` (Indian date order), and every storefront date uses it.
15. **Pre-paint background.** `index.html` wrote a purple gradient through the `background` shorthand (leaking a `background-image` under the admin's overscroll); Prompt 02 switches to a solid `backgroundColor` matching `colors.js`.
16. **ErrorBoundary** wraps the admin too; Prompt 28 restyled it neutrally with CSS-variable inline styles and documented fallbacks. Prompt 34: a failure before React renders shows the same screen, from the tokens (`bootError.js`), instead of the boilerplate's red monospace text.
17. **CssBaseline coupling.** The storefront MUI theme feeds the global baseline the admin body inherits; Prompt 01 recommends Inter as the UI sans and requires admin screenshot parity.
18. **Order confirmation** has no ownership guard (anyone with the number can view); unchanged, noted. Orders do not store the chosen shipping method, so the page can no longer show an invented "+5 days" estimate; it shows an honest line. Storing the method on orders is a backend/schema question for later.
19. **Returns.** No storefront return form exists (`apiService.returns.create` is unused); "Return or exchange" keeps routing to Support, now with `?order=&category=returns` prefill.
20. **Material Icons stylesheet** (unused) and the duplicate Inter `@import` are removed in Prompt 01.
21. **Dead code left as is unless a prompt says otherwise.** Final state: `canvas-confetti` removed (Prompt 32); `APP_DESCRIPTION` (the listing's introduction) and `RETURN_REASONS` (Admin → Returns) are used; still unused: `getImageUrl`, `validateForm`, `isPasswordStrong` (`helpers.js`), `useSound` + `src/assets/click-sound-1.wav` (section 7); `settings.payment.codFee` is never applied (unchanged).
22. **Broken deep links fixed by their prompts:** `/products?filter=trending|best-sellers` (sidebar), `/products?sort=sale|featured|trending|discount` (home/hero); valid sorts are `relevance, price-low, price-high, newest, rating, popularity` (`popular` alias).
23. **Two `SearchModal` instances** (Header + BottomNav): Prompt 09 kept both (only one can be open; routing the bottom bar through the header's would need lifted state in `Header.js`).
24. **Admin theme toggle** flips the storefront mode too (shared `theme` key); pre-existing and unchanged.
25. **Placeholder images** stay on `placehold.co` URLs in neutral tones (the boilerplate's approach) with the inline `PLACEHOLDER_IMG` fallback; real photography replaces them through the admin with no code change.
26. **Node/tests.** `node_modules` is absent (`npm ci` per session). No tests existed at the start; the build ended with 86 Jest suites and 1,429 tests, and V2-05 brought them to 89 and 1,456.
27. **Contract (Prompt 34).** No storefront code relies on a JSON Server-only shape (`data[0]`, `.data.data`) or calls `axios`/`fetch` outside `api.js`. `IS_MOCK_API` is read outside the services layer in one place, checkout's gateway note (Prompt 26), so the demo never claims a payment gateway. `api.js` is byte-identical to `origin/main`; since the first commit it carries Prompt 32's two owner-approved follow-ups (failed wallet, coupon and deals reads rethrow; one shared catalogue read), with both branches intact.
28. **Admin since the first commit (Prompt 34).** Three owner-approved changes, nothing else: Prompt 03's variant spread in `AdminProducts.js`, Prompt 33's logo lines, and Prompt 33's logout-confirm fix (`flushSync`) with its test. Screenshots and computed styles of every admin page are identical outside the logo's box.
29. **Repeat reads kept on purpose (Prompt 34).** Checkout and the offers page read the settings, shipping methods or categories again when their chunk arrives (after the shell's reads, Prompt 32): checkout prices an order from its own read, never from an earlier answer.
30. **Console notices that are not defects (Prompt 34).** In development with reduced motion on, framer-motion 10.18 logs "You have Reduced Motion enabled on your device…" once per page load (production builds are silent; it comes with honouring the setting through `MotionConfig`). An unknown product URL logs the browser's 404 line and `api.js`'s own `console.error`; the page shows its not-found state. The build prints two dependency notices before compiling (Browserslist's caniuse-lite data, `babel-preset-react-app`'s plugin note); clearing them changes the package files (section 6).
31. **V2-05's fixes (2026-10-11; `DESIGN_SYSTEM.md` §43.7).** The home Featured rail mixes the departments (eight of up to 24 featured pieces, one department at a time); a product switched off in the admin leaves the listing, search, offers page, home rails and its own page, as `02_API_ENDPOINTS.md` §B expects of the storefront; an unbranded piece's related rail is no longer topped up with every other unbranded piece; the browser's colour follows the storefront's light/dark switch; with site data blocked the storefront runs on storage kept in memory for the visit; the footer's, drawer's and checkout's trust cues take their labels from `TRUST_BADGE_CATALOG`. No API call, schema, route or price rule changed; `api.js` and the admin are untouched.

---

## 6. Needs client confirmation

Consolidated by Prompt 34 from every build-log entry (01–34), and refreshed by V2-05 from the V2 reports: decisions for the client or the owner, not defects. The prompts that raised each item are in brackets (V2-0N for the V2 prompts); their build-log entries and reports carry the detail.

**Brand and design**

- The colour adaptations: a deepened caramel (`#ae773d`) for light-mode UI text, where the logo's `#ddb185` cannot meet AA; a calmer UI navy (`#0b1f3f`); warm off-white on navy. Playfair Display as the display face (the logo's own serif can replace it through `--sf-font-display` alone) [01].
- The tagline ("Trusted Comfort for Every Home", from the logo; "Trusted comfort for every home" in running text) and every proposed brand line: hero headlines and support line, brand promise, About intro, story and values, promise steps, closing CTA, marquee phrases, section headings, menu eyebrows and labels, newsletter line, and the page copy of the help, support, offers, account, 404 and crash screens [02, 07–12, 19–24, 28, 29].
- Visible choices offered for review: paper buttons turning caramel on hover, serif initials on avatars, ink stars, "New" driven by the admin's Hot flag, Buy now only in the buy box, the chair glyph in the bottom bar [06, 09, 13, 16].

**Catalogue**

- Every product name, description, specification, dimension, weight, configuration, colour, finish, price, compare-at and cost price, and stock level (placeholders) [03, 04].
- "Lobby Set" and "Jhula (Garden Swing)": our reading of "Looby set" and "Julna", with their Small/Large contents and real measurements per size (the dimension and weight fields hold the Large's) [03, V2-02].
- The reference site, re-checked on 2026-10-11, added or removed no range or model since 2026-10-06; its wording differences are in `V2-03_REPORT.md` §4. Among them: its model pages call both alnas a "storage cabinet" (our gloss is "clothes stand"), and its local tables "locally made" (our "made in our own workshop" stays flagged) [V2-03].
- Facts V2-03 added to the specifications: 52's "Sleeping capacity: 2"; the weight capacities of 72 (approx. 25 kg per shelf) and the Winsome tables 76, 78 and 80; the mattresses' nominal sizes, now "approx."; the finish "Walnut wood-grain or Frosty White laminate" on 60, 63 and 65. Copy no data backs: 82 "the table is folded into a corner", 58 "arrives roll-free" [V2-03].
- Some demo orders are dated before the products they contain (orders 1–5, January to March 2026, come before every product's `createdAt`; the order numbers encode their dates): keep the demo data as is, or date the products before 2026-01-15 [V2-04].
- Brand attributions: Nilkamal on the plastic pieces (the reference site names it only for the plastic sofa and the mattress), Carlton and Winsome, the unbranded items, and "A & S Urbanseat" on workshop pieces; whether these brand names may be shown (home page, About) [02, 03, 04, 12, 28].
- "Made in our own workshop": used on the four pieces the reference site marks as own manufacturing (47, 77, 79, 81), in the home story, About and the meta description. "20+ years", "since 20+ years" and warranty claims: not used anywhere until confirmed [02, 04, 11, 28].
- Category copy, the tier names Essentials and Premium, the single-product Plastic Sofas leaf, and department names short enough for one row at 1024–1279px [03, 04, 07].
- Admin-managed copy proposed for `db.json` (changed through the admin): shipping method names, the Plastic Furniture and Office Tables & Desks descriptions, `settings.seo.metaTitle`, the store tagline's casing, straight apostrophes in descriptions [29].
- Whether the admin's Trending flag reflects real popularity ("Pieces of the *moment*.", the search overlay's "Popular") [11, 15, 29].
- The listing's quick price ranges are the boilerplate's values: "Under ₹500" matches no product [14, 34].

**Commerce rules (placeholders in settings and data)**

- Delivery: Standard ₹499 / 7–10 days and Express ₹999 / 3–5 days, free Standard above ₹9,999, same-day off, Shiprocket, the parcel defaults, delivery within India. The header, cart, footer, assurance strip, product page and checkout all read these from Admin → Shipping [05, 08, 10, 18, 34].
- Returns: the 7-day window (`STOREFRONT_CONFIG.returnsWindowDays`), eligibility, collection or drop-off, exchanges, and refund timing ("typically 5–7 business days"); returns are handled through Support (no self-service form) [02, 05, 24, 28].
- Cash on Delivery: no fee, no minimum, a ₹50,000 cap; whether the assurance strip, the promise steps and the cart should mention the cap [05, 10, 12, 18, 26].
- GST at 18%, shown on top of tax-exclusive prices as "Tax (18% GST)" [05, 26, 27].
- Coupons: the five codes, values, minimums, caps, limits and expiry dates. NEWHOME20 says "first order" (WELCOME500 no longer does: "₹500 off orders above ₹5,000", V2-04), which neither the mock nor the coupon logic checks: the Laravel API enforces it, or the description drops it [05, 29, V2-04].
- Payment: which methods the store takes and through which gateway (Razorpay and Stripe are both off, so the card form stays a placeholder and no gateway note shows), the brand names in the method descriptions, the bank list, the payment marks [08, 26].
- Store credit: whether it expires ("It never expires" is held back), the facts' wording, the name "Store credit" [21, 23].
- Special offers: the selection and the hero copy in the deals config; the countdown's ticking seconds (minutes only would be calmer); the deals hero title "Offers on pieces we *love*." (typed with the asterisks, it now renders the accent, Prompt 34); `DEFAULT_DEALS_HERO`'s "Limited Time … don't miss out!" in `dealsConfig.js`, shown only for a saved config without a hero (the file is protected; Prompt 29 proposed replacement copy) [05, 19, 29, 34].

**Accounts and orders**

- Sign-in sheet: the two subtitle lines; social sign-in (needs an OAuth flow on the Laravel side first); password reset (none: "Forgot password?" points to Support; can Support reset by hand, is self-service planned?); a "Stay signed in on this device" hint for Remember me; the phone hint [20].
- Account: the guest panel and greeting; how a customer changes their email; the phone format (the data holds "98765 43210", "+91 9876543210" and "+919876543210"): what the Laravel API expects, and whether the storefront should normalise it [21, 22].
- Addresses and password: "Postal code" with the "6-digit PIN" hint (enforce six digits?); "Currently shipping within India only"; the intro and empty lines; the locked-default hint; the password checklist and how strict to be (it should match the Laravel API's rules) [22].
- Orders: the cancel confirm's wording and "Amount due"; whether orders should store the chosen shipping method (a real delivery estimate); whether order confirmation and its invoice should require the signed-in owner; that the store emails tracking details, as the delivery line says; that returns created in the admin (such as RET-20260612-0002) do not appear on My orders, which has no return view [24, 27, 34].
- The invoice's legal details: GSTIN, PAN, registered name and address, invoice number series, HSN/SAC codes, place of supply and the CGST/SGST/IGST split (none is known; it is titled "Invoice", not "Tax invoice") [27].

**Content, legal and launch**

- Contact details: the email (on the old site's domain), phone, WhatsApp, hours, and the street address with PIN (missing); social profiles (only WhatsApp is set). The storefront reads them from `src/utils/constants.js`, not from Admin → Settings: which is the source of truth [02, 05, 08, 28, 34].
- Every policy, section by section (each marked "Draft for legal review"; set `draft: false` per document once approved): governing law (Assam proposed), the grievance officer, retention periods, the minimum age, assembly and collection charges, refund times, and no analytics or advertising tools before launch [28].
- A reply-time promise (none is made) [28].
- The production domain (`og:url`, `SITE_URL_PLACEHOLDER`), a sitemap generated from the catalogue and served from that domain, per-page link previews (need prerendering or server rendering), and shipping and returns as structured data [02, 32].
- Real photography (hero, spaces, story blocks, promise steps, portrait-safe category photos, products, About) and whether press or client logos exist (the slot shows nothing without a data source) [07, 10–12, 28].
- Checks that need the public URL or tools this build did not have: Google's Rich Results Test, and screen-reader walk-throughs with NVDA and VoiceOver [31, 32, 34].
- The sharing image (`og:image`) is the light logo on a transparent background; a preview that draws transparency dark shows ink lettering on dark, and `summary_large_image` crops towards 2 : 1. A flattened paper version (with the production domain) would read better [V2-01].

**Owner decisions (technical)**

- Lighthouse Performance ≥ 85 (Prompt 32's target) is not met: cold mobile runs score 59–64 (medians, Prompt 34); Accessibility, Best Practices and SEO score 100 and CLS is 0. The main bundle's download and evaluation set the floor; closing the gap needs prerendering or server rendering, or a storefront first paint without MUI and framer-motion. Splitting out the admin (ruled out by the brief) reached only 51–55 [32, 34].
- The cart drawer's opening (252ms at 4× CPU): making the page inert once the drawer has slid in would bring it to about 170ms, a change to the overlay contract [32].
- App.css's universal `::-webkit-scrollbar` rule (inherited by the admin, never edited): scoped away from `html`, a restyle of `html` would no longer reach every element; the page's own scrollbar would then be the browser's default on desktop [32].
- Dependencies: the package files were left as they were. `npm ci` reports 104 audit advisories (14 low, 45 moderate, 41 high, 4 critical), mostly in Create React App 5's build tooling (CRA is no longer maintained); the build prints Browserslist's caniuse-lite notice and `babel-preset-react-app`'s plugin notice [34].
- Pre-existing admin issues found during QA (the admin changes only with the owner): the coupon form's expiry field shifts by the UTC offset on save, and drops the seconds (`T18:29:59.000Z` comes back `T18:29:00.000Z` from a save without change); Add Product's category select has no accessible name; saving a shipping method drops its `createdAt`; duplicate category names are accepted; in JSON Server mode "Mark as paid" does not update the order's payment record (`api.js` mock); Admin → Leads logs a development-only React warning (`hover` reaching the DOM through `motion.tr`); Admin → Returns builds its actions from the return's status alone (the seed and the validator keep status and refund in step); the printed invoice falls back to "My E-Commerce Store" when `settings.store.name` is empty (the validator requires it) [34, V2-01, V2-04, V2-05].
- The related rail ("You may also like", Prompt 17's rule inside `api.js`: curated, then the same category, then a shared tag or brand): shared tags such as the tiers "essentials" and "premium", "living room", or the A & S Urbanseat brand bring other departments' pieces into the top-up. Preferring the same department would change that rule in `api.js`. Since V2-05 an unbranded piece no longer matches every other unbranded piece [V2-02, V2-03, V2-05].
- The offers page shows whatever the admin picks as a deal of the day, as picked; a pick without a discount shows no saving line. Whether the admin should be able to pick an undiscounted piece (the seed's picks are all discounted, and the validator checks it) [V2-04].
- Orders placed on the storefront store `sku: ""` (no cart line carries a SKU; the contract allows it), so the admin's order view and invoice show no SKU for them. Carrying the variant SKU through the cart would fill it [V2-04].
- A product switched off after a shopper saved, carted or viewed it stays in their wishlist, cart or home "Recently viewed" rail as the snapshot their device saved (its link opens "We couldn’t find that piece."); the Laravel API re-validates every line when the order is placed. Whether those pieces should say "No longer available" [V2-05].
- JSON Server mode only (`api.js` mock): changing the password stores nothing, and coupon refusals print amounts without digit grouping ("Minimum order amount is ₹15000"; checkout shows the API's own message by design); a live admin action stamps `updatedAt` a few milliseconds before the event it appends, so validate a scratch copy only after restoring it. In production the Laravel API's rules and messages apply [22, 26, 34, V2-04].

## 7. Remove or replace before launch

Consolidated by Prompt 34.

- **Demo data in `db.json`:** all 26 seeded reviews and the ratings derived from them; the 11 demo orders with their payments, refunds, returns and wallet ledger rows (user 3's ₹2,302 store credit); coupon `usedCount` values; the four demo leads (furniture enquiries since Prompt 34, still demo).
- **Demo accounts and their plaintext passwords in `db.json`:** `user@example.com`, `jane@example.com`, `mail4bappidas@gmail.com`, admin `admin@store.com`.
- **Placeholder images:** the `placehold.co` URLs on products, categories, the hero, spaces, story blocks, promise steps and About, and the inline "Image coming soon" fallback as any product's only image.
- **Placeholder catalogue and settings values:** prices, stock, specifications and model names; tax, COD, shipping and coupon settings (section 6).
- **Placeholder contact details** (address, email, hours, social links in `constants.js` and Admin → Settings) and **every "Draft for legal review" policy** (`draft: true`, the 22 `// CONFIRM:` comments, `POLICY_LAST_UPDATED`).
- **Placeholder constants:** `STOREFRONT_CONFIG.returnsWindowDays` (7) and `FREE_SHIPPING_THRESHOLD` (₹9,999, the seed's reference only); `SITE_URL_PLACEHOLDER` and `index.html`'s `og:url`/`twitter:url` (`https://urbanseat.example/`); a `Sitemap:` line in `robots.txt` once a sitemap exists.
- **`.env.production`:** the API URL (a Cloudways placeholder) and the `REACT_APP_*` values (`REACT_APP_ENABLE_ANALYTICS=true` has no analytics code behind it).
- **The checkout card form**, a visual placeholder (never validated or sent) until a gateway is connected.
- **Dead code:** `getImageUrl`, `validateForm` and `isPasswordStrong` (`src/utils/helpers.js`), `useSound` and `src/assets/click-sound-1.wav`. `scripts/validate-db.js` and `scripts/check-contrast.js` may stay as dev tools.
