# Catalogue data I — category tree and the client-specified ranges

**Prompt 3 of 34**

## Depends on

Prompt 01 (for the placeholder image tones in `prompts/DESIGN_SYSTEM.md`) and Prompt 02 (brand name). Prompt 04 adds the remaining ranges and Prompt 05 reseeds every collection that references products, so expect temporary dangling references after this prompt (see "What stays broken until Prompt 05").

## Context

A & S Urbanseat sells furniture and seating for homes, offices, cafés and restaurants, and outdoor spaces in India (INR, `en-IN`). The storefront is a Create React App whose data comes from `db.json` through the dual-mode `src/services/api.js` (JSON Server branch; Laravel branch returning `{ success, data, meta }`). The storefront reads products with `apiService.products.getAll / getById / getBySlug / getFeatured ({ featured: true }) / getTrending ({ trending: true }) / getByCategory / search (?q=) / getRelated / getFrequentlyBoughtTogether` and categories with `apiService.categories.getAll` (active only, sorted by `sortOrder`) and `getBySlug`. Category navigation is driven by `src/utils/categories.js`: `getMainMenuCategories` (categories with `showInMainMenu: true`, ordered by `menuOrder`), `orderCategoriesHierarchically` (walks `parentId` to any depth), `getCategoryScopeIds` (selecting a parent includes all descendants), and the canonical URL `/products?category=<slug>`. Product URLs are `/products/<slug>`. The admin panel manages all of this and must keep working.

## Objective

Replace the boilerplate's electronics/fashion catalogue with the A & S Urbanseat category tree and the ranges the client specified, as **content only**: every record keeps the exact field shape of the current `db.json`, no field is added, removed or renamed, ids/slugs follow the existing conventions, and the result passes a referential-integrity check you write. The second half of the catalogue (the ranges found on the client's existing website) is Prompt 04.

## Scope — files and areas to touch

- `db.json` → `categories` (replace all 16 records) and `products` (replace all 19 records). Also set `dealsConfig.featuredCouponIds`, `dealsConfig.dealOfTheDayIds` and `dealsConfig.featuredProductIds` to `[]` (the documented "automatic" mode) so the Special Offers page cannot point at removed products before Prompt 05 reseeds it.
- Optional dev tool (not application code): `scripts/validate-db.js`, a dependency-free Node script that checks `db.json` integrity (see Implementation notes). Prompts 04, 05 and 34 re-run it.

Do not touch: any file under `src/`, `public/`, `server.js`, `package.json`, and in `db.json` the collections `users`, `admins`, `orders`, `returns`, `payments`, `refunds`, `shipping_methods`, `coupons`, `reviews`, `wishlist`, `leads`, `settings`, `walletTransactions`, `banners`, `cart` (Prompt 05 owns them).

## Exact field shapes (copy from the current file, verify before writing)

Category:
```json
{ "id": 1, "name": "", "slug": "", "description": "", "image": "", "parentId": null,
  "isActive": true, "sortOrder": 1, "showInMainMenu": true, "menuOrder": 1,
  "createdAt": "2026-…Z", "updatedAt": "2026-…Z" }
```

Product (every key present on every product, in this order):
```json
{ "id": 1, "name": "", "slug": "", "sku": "", "shortDescription": "", "description": "",
  "categoryId": 0, "brand": "", "images": ["", "", ""], "price": 0, "comparePrice": 0,
  "costPrice": 0, "stock": 0, "lowStockThreshold": 5, "weight": 0,
  "dimensions": { "length": 0, "width": 0, "height": 0 },
  "variants": [ { "id": "v1", "name": "", "price": 0, "stock": 0, "sku": "",
                  "attributes": { "Colour": "" }, "swatchHex": "#000000" } ],
  "tags": [""], "featured": false, "trending": false, "hot": false, "isActive": true,
  "rating": 0, "totalReviews": 0, "metaTitle": "", "metaDescription": "",
  "createdAt": "…", "updatedAt": "…", "frequentlyBoughtTogetherIds": [], "relatedProductIds": [] }
```

Rules that follow from the code (read `src/utils/helpers.js`, `src/components/storefront/variantUtils.js`, `src/components/storefront/VariantSelector.js`, `src/context/CartContext.js` to confirm):

- `variants[].attributes` is optional per variant but when present on one variant of a product it must be present on all of them, with the same attribute keys, otherwise the selector cannot group them. `swatchHex` is optional and only meaningful for a colour attribute. A product with no variants uses `"variants": []` (not `null`).
- `price` must equal the lowest variant price when variants exist (cards show `getProductMinPrice`, quick-add uses the cheapest variant). `comparePrice` is the struck-through price; set it to `0` when there is no sale and never below `price`.
- `stock` is the product-level stock; with variants, make it the sum of variant stock. `lowStockThreshold` drives honest "only N left" messaging; keep it between 3 and 8.
- `rating` and `totalReviews` must agree with approved reviews. Prompt 05 seeds reviews, so in this prompt set `rating: 0` and `totalReviews: 0` on every product (the card hides social proof when the count is 0, which is the honest state). Prompt 05 updates them.
- `relatedProductIds` and `frequentlyBoughtTogetherIds` reference product ids that exist and are active; never the product itself.
- `tags` are lowercase, used by `getRelated` as a fallback and by search; include the manufacturer brand, the tier, the type and the material.
- Slugs are unique, lowercase, hyphenated, ASCII only, generated with the same rule as `slugify` in `helpers.js`; product `sku` values are unique and uppercase.

## Category tree to seed

Six departments are in the main menu (`showInMainMenu: true`, `menuOrder` 1–6). Everything else has `showInMainMenu: false`, `menuOrder: 0`. `sortOrder` counts from 1 within each parent. Shopper-facing tier labels are **Essentials** and **Premium**; the words "non-premium" must never appear anywhere in the data. Seed departments 1–4 and their children in this prompt; departments 5 and 6 and the two extra plastic groups are Prompt 04 (leave id gaps as described below).

```
1  Plastic Furniture            plastic-furniture              menu 1
   Essentials                   plastic-essentials
      Chairs with Arms          plastic-essentials-armchairs
      Chairs without Arms       plastic-essentials-chairs
      Centre Tables             plastic-essentials-centre-tables
      Shoe Racks                plastic-shoe-racks
   Premium                      plastic-premium
      Chairs with Arms          plastic-premium-armchairs
      Chairs without Arms       plastic-premium-chairs
      Centre Tables             plastic-premium-centre-tables
   (Prompt 04 adds: Dining Sets plastic-dining-sets, Sofas plastic-sofas)
2  Office Chairs                office-chairs                  menu 2
   Essentials                   office-chairs-essentials
      High-Back Chairs          office-essentials-high-back
      Low-Back Chairs           office-essentials-low-back
      Waiting Chairs            office-essentials-waiting
   Premium                      office-chairs-premium
      High-Back Chairs          office-premium-high-back
      Low-Back Chairs           office-premium-low-back
      Waiting Chairs            office-premium-waiting
3  Café & Restaurant Chairs     cafe-restaurant-chairs         menu 3   (flat: products sit directly here)
4  Outdoor Furniture            outdoor-furniture              menu 4   (flat: products sit directly here)
5  Home Furniture               home-furniture                 menu 5   (Prompt 04)
6  Office Tables & Desks        office-tables-desks            menu 6   (Prompt 04)
```

Id plan: give the six departments ids 1–6 now (create departments 5 and 6 as records in this prompt with `isActive: true`, their names/slugs above, a description and a placeholder image, but no children yet, so the menu order is stable). Then number the Plastic subtree 10–19, the Office Chairs subtree 20–29. Prompt 04 uses 30+ for the rest. Category `description` is one refined sentence in the brand voice (used by the listing header and the mega-menu). Category `image` is a placeholder (see Images).

Shopper-facing hint: the description of the Essentials groups must convey "dependable everyday value" and the Premium groups "heavier build, finer finish"; never "cheap", "basic" or "non-premium".

## Products to seed (46), with the proof-of-coverage checklist

Use neutral, descriptive placeholder names (form + type), never invented manufacturer model numbers. The client's existing website (kamdhenufurniture.in, checked 2026-10-06) lists no model names, specifications, colours, sizes or prices for these ranges; its plastic-chair page says only "Wide range of plastic chairs from all brands" and its office-chair page lists "High Back Office Chair" and "Low Back Office Chair". Every name, price and specification below is therefore a placeholder to list under "Needs client confirmation". Keep the counts exact.

| Client line | Shopper placement (category slug) | Required count | Suggested placeholder names | Variants |
|---|---|---|---|---|
| Non-premium plastic · chair with arms | `plastic-essentials-armchairs` | 3 models | Classic Plastic Armchair · Ribbed-Back Plastic Armchair · Slat-Back Plastic Armchair | Colour (3–4 per model, `attributes.Colour` + `swatchHex`), same price across colours |
| Non-premium plastic · chair without arms | `plastic-essentials-chairs` | 3 models | Classic Plastic Chair · Ribbed-Back Plastic Chair · Stackable Plastic Chair | Colour |
| Non-premium plastic · centre table, square | `plastic-essentials-centre-tables` | 1 | Square Plastic Centre Table (name used on the client's site) | Colour (2) |
| Non-premium plastic · centre table, round | `plastic-essentials-centre-tables` | 1 | Round Plastic Centre Table (name used on the client's site) | Colour (2) |
| Non-premium plastic · shoe rack, 2/3/4/5-shelf versions | `plastic-shoe-racks` | 3 models, each with exactly 4 shelf variants | Slim Plastic Shoe Rack · Wide Plastic Shoe Rack · Covered Plastic Shoe Rack | `attributes.Shelves`: "2 shelves", "3 shelves", "4 shelves", "5 shelves"; per-variant price, SKU and stock (price rises with shelf count) |
| Premium plastic · chair with arms | `plastic-premium-armchairs` | 3 models | Cushioned Plastic Armchair · High-Back Plastic Armchair · Woven-Texture Plastic Armchair | Colour |
| Premium plastic · chair without arms | `plastic-premium-chairs` | 2 models | High-Back Plastic Chair · Cushioned Plastic Chair | Colour |
| Premium plastic · centre table, round | `plastic-premium-centre-tables` | 1 | Premium Round Plastic Centre Table | Colour (2) |
| Premium plastic · centre table, square | `plastic-premium-centre-tables` | 1 | Premium Square Plastic Centre Table | Colour (2) |
| Outdoor · Lobby set, small and large | `outdoor-furniture` | 1 product, 2 size variants | Lobby Set | `attributes.Size`: "Small", "Large"; per-variant price, SKU, stock |
| Outdoor · Jhula (swing), small and large | `outdoor-furniture` | 1 product, 2 size variants | Jhula (Garden Swing) | `attributes.Size`: "Small", "Large" |
| Office chairs, non-premium · high-back | `office-essentials-high-back` | 3 models | Mesh High-Back Office Chair · Fabric High-Back Office Chair · Leatherette High-Back Office Chair | Colour (2–3) |
| Office chairs, non-premium · low-back | `office-essentials-low-back` | 2 models | Mesh Low-Back Office Chair · Fabric Low-Back Office Chair | Colour |
| Office chairs, non-premium · waiting chair | `office-essentials-waiting` | 3 models | 2-Seater Waiting Chair · 3-Seater Waiting Chair · 4-Seater Waiting Chair | none (`[]`) or Colour |
| Office chairs, premium · high-back | `office-premium-high-back` | 3 models | Executive Mesh High-Back Chair · Executive Leatherette High-Back Chair · Ergonomic High-Back Chair with Headrest | Colour |
| Office chairs, premium · low-back | `office-premium-low-back` | 2 models | Executive Leatherette Low-Back Chair · Ergonomic Mesh Low-Back Chair | Colour |
| Office chairs, premium · waiting chair | `office-premium-waiting` | 3 models | Cushioned 2-Seater Waiting Bench · Cushioned 3-Seater Waiting Bench · Steel 3-Seater Waiting Chair | none or Colour |
| Café / restaurant chairs | `cafe-restaurant-chairs` | 10 models | Bentwood-Style Café Chair · Metal Bistro Chair · Upholstered Restaurant Chair · Cane-Look Café Chair · Stackable Restaurant Chair · Cross-Back Dining Chair · Tub Café Chair · Slatted Wood Café Chair · Wire Café Chair · Shell Café Chair | Colour or Finish (2–3) |

Total: 11 + 7 + 2 + 8 + 8 + 10 = **46 products**. Reproduce this table in your build-log entry with the final names and ids per line, and assert the counts in `scripts/validate-db.js`.

Two names to confirm: "Lobby set" and "Jhula (swing)" are our reading of the client's "Looby set" and "Julna". Neither appears on the client's existing site, so they could not be verified. Use these names and list both under "Needs client confirmation".

## Brand and design requirements

Content rules for every seeded record:

- **Names** stand alone in the cart, wishlist and search (no tier prefix needed: the category carries the tier), ≤ 48 characters (cards truncate at 48).
- **Brand field**: the reference site names Nilkamal for plastic furniture ("Deal with Nilkamal" on its plastic-sofa page) and says "all brands available" for plastic chairs. Set `brand: "Nilkamal"` only where that attribution is plausible (plastic ranges), otherwise leave `brand: ""` (the card hides an empty brand) and flag the whole brand mapping for confirmation. Do not invent other manufacturers. For office, café and outdoor ranges use `""`.
- **Prices**: INR placeholders, realistic for the Indian market, Premium above Essentials within the same type. Indicative bands: Essentials plastic chairs ₹650–₹1,300; Premium plastic chairs ₹1,400–₹2,900; centre tables ₹900–₹2,600; shoe racks ₹1,200–₹3,600 across shelf counts; Essentials office chairs ₹3,500–₹8,500; Premium office chairs ₹9,000–₹22,000; waiting chairs ₹4,500–₹16,000; café chairs ₹1,800–₹6,500; Lobby Set ₹18,000–₹45,000; Jhula ₹9,000–₹26,000. Use round, plausible numbers (ending in 49/99/00). Give `comparePrice` to roughly a third of products (10–20% above price); the rest `0`. `costPrice` ≈ 60–70% of price. Flag all prices.
- **Descriptions**: `shortDescription` ≤ 110 characters; `description` 2–3 short paragraphs in the brand voice (refined, warm, specific, no hype), separated by blank lines (`\n\n`), ending with a machine-parseable specifications paragraph because the schema has no separate specifications field. Exact format of that last paragraph, which Prompt 17 parses into a table: it starts with `Specifications:` and lists `Key: Value` pairs separated by `; `, for example `Specifications: Material: Virgin polypropylene; Finish: Matte; Seat height: approx. 44 cm; Overall size: approx. 56 × 54 × 88 cm; Weight capacity: approx. 110 kg; Care: Wipe clean with a damp cloth`. Use 5–7 pairs per product, realistic and hedged ("approx."), never certification or warranty claims.
- **Dimensions and weight**: realistic centimetres and kilograms per type.
- **Images**: three per product. Use the boilerplate's existing placeholder approach (external placeholder URLs that fall back to `PLACEHOLDER_IMG` through `onImageError`), but in the brand's neutral tones: `https://placehold.co/1200x1500/<bg>/<fg>?text=<Name+with+plus+signs>` with `<bg>`/`<fg>` taken from the "Image placeholder tones" section of `DESIGN_SYSTEM.md` (portrait 4:5 so cards and galleries reserve the same ratio). The second and third image may use `?text=` with "Detail" and "In+situ". Category images: `1600x1000` landscape, same tones. Never link to the reference site's images.
- **Flags**: `featured: true` on 8–10 products across all four departments (these drive the home page's Featured Collections), `trending: true` on 6–8, `hot: true` on 3–4 (treated as "new" by the UI).
- **Relations**: `relatedProductIds` 3–5 ids within the same department; `frequentlyBoughtTogetherIds` only where a bundle makes sense (chair + centre table, high-back chair + waiting chair for an office) with 1–2 ids; leave `[]` elsewhere.
- **Dates**: `createdAt`/`updatedAt` within the last six months, ISO strings.

## Functional guardrails

1. **Preserve the data/API contract.** Content only. Run a key-set comparison: for every product and category the set and order of keys must equal the boilerplate's first record (the validator asserts it). No new collections, no new fields, no changes to `src/services/api.js`.
2. **Theme tokens**: not applicable, except that placeholder image tones come from `DESIGN_SYSTEM.md`.
3. **Admin untouched.** The admin's Products and Categories managers must open every new record (edit dialog, image preview, variant table) without errors.
4. **Brand consistency**: names and copy in the A & S Urbanseat voice; no "non-premium".
5. **Responsive/accessible**: not applicable to data, except that image `?text=` labels are meaningful because the storefront reuses product names as `alt` text.
6. **No fabricated trust signals**: `rating`/`totalReviews` are 0 until Prompt 05 seeds reviews; no fake stock claims (stock between 4 and 60 per variant, with 2–3 deliberately low-stock variants at or below `lowStockThreshold` and 1–2 out-of-stock variants to exercise the UI).
7. **Test before done.** See below.

## What stays broken until Prompt 05 (expected, document it)

`orders[].items`, `returns[].items`, `reviews[].productId`, `wishlist[].productId` and `dealsConfig` ids still reference old products until Prompt 05 reseeds them. Order history still renders because orders store item snapshots. Do not fix these here. The validator must therefore run in "catalogue-only" mode now (`node scripts/validate-db.js --catalogue`) and in full mode after Prompt 05.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md`, `prompts/DESIGN_SYSTEM.md`. Then read `db.json` in full (it is ~100 KB; use a script to print one record per collection), `src/utils/categories.js`, `src/utils/helpers.js`, `src/components/storefront/variantUtils.js`, `src/components/storefront/VariantSelector.js`, `src/pages/Products/Products.js` (filters read `brand`, price, rating, stock, tags) and the `products.*` block of `src/services/api.js`.
2. Generate the data with a throwaway script (outside the repo or deleted before commit) rather than by hand, so counts, ids, slugs and SKUs are consistent; write the final JSON with 2-space indentation like the current file.
3. `scripts/validate-db.js` (Node, no dependencies, exit code 1 on failure) must check: unique ids/slugs/SKUs; category `parentId` references exist; product `categoryId` references an active leaf or flat department; variant rules above; `price` = min variant price; `stock` = sum of variant stock; relation ids exist; key-set equality per collection against a reference key list; the coverage-table counts (46 products across the listed slugs, 3 shoe racks × 4 shelf variants, etc.); in full mode (Prompt 05 onward) also orders/returns/reviews/wishlist/dealsConfig references, order money math and wallet ledger consistency. Print a summary table.
4. Keep the JSON Server running while you edit; it reloads `db.json` on change (restart `npm run server` if it does not).
5. Demo accounts (`user@example.com` / `password123`, `jane@example.com` / `password123`, `mail4bappidas@gmail.com` / `Bappi@12345`, admin `admin@store.com` / `admin123`) are not touched.

## Acceptance criteria

- [ ] `categories` contains the tree above (departments 1–6, Plastic and Office Chairs subtrees) with correct `parentId`, `slug`, `showInMainMenu`, `menuOrder`, `sortOrder`, descriptions and placeholder images.
- [ ] `products` contains exactly 46 active products mapped to the checklist with the exact counts per line; shoe racks have 4 shelf variants each; Lobby Set and Jhula have Small/Large variants.
- [ ] Every record has the exact key set of the boilerplate's records; `scripts/validate-db.js --catalogue` passes.
- [ ] No "non-premium", no electronics/fashion copy, no reference-site images.
- [ ] `dealsConfig` id arrays are `[]`.
- [ ] Storefront in JSON Server mode: header menu shows the six departments; `/products?category=plastic-furniture` lists all Plastic products (parent includes children); each product page opens by slug with working variant selection and add to cart; search for "chair" returns results.
- [ ] Admin → Categories and Admin → Products open and edit the new records without errors.

## Test and QA

1. JSON Server mode: `/`, `/products`, `/products?category=office-chairs-premium`, `/products?category=plastic-shoe-racks`, a shoe-rack product page (switch shelf variants: price, SKU and stock change), a café chair page (colour swatches), the Lobby Set page (size variants), add each to cart, open the cart drawer, search "waiting".
2. Widths 360, 768, 1024, 1440: listing and product pages still lay out (long names wrap, placeholder images keep the 4:5 ratio).
3. Keyboard: variant tiles reachable and selectable with arrow keys/Enter as before.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. Nothing relies on a JSON Server-only response shape (you changed data only).
6. Admin: Categories tree renders with the new parents; Products list filters by the new categories; edit a product and save without changing anything; the record is unchanged.
7. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 03 — Catalogue data I`: the coverage table with final ids and names, the id ranges used, placeholder image URL pattern, price bands used, the brand mapping, the dangling references deliberately left for Prompt 05, and the "Needs client confirmation" list (all names, prices, specifications, brand attributions, Lobby Set and Jhula naming).
