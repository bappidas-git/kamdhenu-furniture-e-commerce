# Catalogue data II — the ranges from the client's existing website

**Prompt 4 of 34**

## Depends on

Prompt 03 (category tree, the first 46 products, `scripts/validate-db.js`). Prompt 05 reseeds the collections that reference products.

## Context

A & S Urbanseat is the new storefront for the same client and the same products as `https://kamdhenufurniture.in/`. That site is the source of facts (ranges, names, materials, brands), never of layout, design, images or copy. This Create React App storefront reads `db.json` through the dual-mode `src/services/api.js` (JSON Server branch; Laravel branch returning `{ success, data, meta }`). Category navigation walks `parentId` to any depth (`src/utils/categories.js`), parent categories include their descendants' products, and product URLs are `/products/<slug>`. The admin panel manages the same data and must keep working.

## Objective

Add every product range on the client's existing website that Prompt 03 did not already cover, each as its own category with the models the site lists, as **content only** (exact field shapes, no schema change), then finish cross-catalogue relations, run the validator, and record the proof of coverage.

## Scope — files and areas to touch

- `db.json` → `categories` (append the Home Furniture and Office Tables & Desks subtrees and the two extra Plastic groups) and `products` (append 38 products). Keep every record Prompt 03 wrote; only its `relatedProductIds` / `frequentlyBoughtTogetherIds` may be extended.
- `scripts/validate-db.js`: extend the checklist assertions to the ranges below.

Do not touch: anything under `src/`, `public/`, `server.js`, `package.json`, and the other `db.json` collections (`users`, `admins`, `orders`, `returns`, `payments`, `refunds`, `shipping_methods`, `coupons`, `reviews`, `wishlist`, `leads`, `settings`, `walletTransactions`, `banners`, `cart`).

## What the reference site lists (inventory taken 2026-10-06 from `/product/` and the category pages)

The site is a brochure: it lists range names and one-line descriptions only. It shows **no prices, no dimensions, no colours, no sizes and no model numbers** (its template even labels plastic chairs as "Premium Wood"). Brands named on the site: Nilkamal (plastic sofa "Deal with Nilkamal", mattress), Carlton (mattress), Winsome ("Company Made (Winsome)" computer, office and reading tables); other items are "Local Made" (the site says the business has its own manufacturing workshop). Ranges and models, verbatim:

- Sofa: Wooden Sofa ("Own Manufacturing"), L Sofa / L-Shaped Sofa, 5 Seater Sofa, 7 Seater Sofa
- Sofa Cum Bed: Steel Sofa cum Bed, Wooden Sofa Cum Bed
- Center Table: Wooden
- Showcase: Wooden
- Bed: King Size Bed, Queen Size Bed, Single Bed
- Mattress: Carlton, Nilkamal
- Dressing: Plain Dressing, Big Size, Standing Mirror, Wall Mirror
- Bed Set Table (bedside table): Wooden, Particle Board
- Almari (almirah / wardrobe): Two Doors, 3 Doors
- Bed Table: Folding Bed Table
- Alna (clothes stand): Iron Alna, Wooden Alna
- Rack: Steel Rack, Wooden Rack
- Dining: 4 Sitter, 6 Sitter, Marble Dining
- Office Table: Company Made (Winsome), Local Made
- Computer Table: Company Made (Winsome), Local Made
- Reading Table: Local Made, Company Made (Winsome)
- Plastic Dining: 6 Seater, 4 Seater
- Plastic Sofa: Nilkamal
- (Already covered by Prompt 03: Plastic Chair, Plastic Centre Table square/round, Office Chair high-back/low-back.)
- Not on the site, so nothing to seed: café/restaurant chairs, waiting chairs, outdoor lobby sets, swings, shoe racks (these came from the client's own list in Prompt 03).

No range lists more than ten models, so every model is seeded; nothing is deferred to the admin.

## Categories to add (ids from 30 upward; `showInMainMenu: false`, `menuOrder: 0` for everything below department level)

```
5  Home Furniture (exists, id 5, menu 5)          home-furniture
   Living Room                                    living-room
      Sofas                                       sofas
      Sofa-cum-Beds                               sofa-cum-beds
      Centre Tables & Showcases                   centre-tables-showcases
   Bedroom                                        bedroom
      Beds                                        beds
      Mattresses                                  mattresses
      Dressing Tables & Mirrors                   dressing-tables-mirrors
      Bedside & Bed Tables                        bedside-bed-tables
      Almirahs                                    almirahs
      Alna Clothes Stands                         alna-clothes-stands
   Dining Room                                    dining-room
      Dining Sets                                 dining-sets
   Storage                                        storage
      Racks                                       racks
6  Office Tables & Desks (exists, id 6, menu 6)   office-tables-desks
      Office Tables                               office-tables
      Computer Tables                             computer-tables
      Reading Tables                              reading-tables
1  Plastic Furniture (exists, id 1)
      Dining Sets                                 plastic-dining-sets   (sibling of Essentials/Premium, sortOrder 3)
      Sofas                                       plastic-sofas         (sortOrder 4)
```

Design of the tree: every leaf holds at least two products (singletons from the site are paired into a shared leaf: "Centre Tables & Showcases", "Bedside & Bed Tables"), so no listing page shows a lonely product. Record this shaping decision in the build log.

## Products to add (38) — proof-of-coverage checklist

Names are the site's facts rewritten in the A & S Urbanseat voice; keep the material and size facts, drop the site's labels "Company Made"/"Local Made" and express them through `brand` and the description ("made in our own workshop" only for items the site marks as own manufacturing / Local Made, and flag that claim for confirmation).

| Site range → model | Category slug | Product name | brand | Variants |
|---|---|---|---|---|
| Sofa → Wooden | `sofas` | Wooden Sofa Set | `A & S Urbanseat` (workshop-made, flag) | Fabric colour (2–3) |
| Sofa → L-Shaped | `sofas` | L-Shaped Sofa | `A & S Urbanseat` | Fabric colour |
| Sofa → 5 Seater | `sofas` | 5-Seater Sofa Set | `A & S Urbanseat` | Fabric colour |
| Sofa → 7 Seater | `sofas` | 7-Seater Sofa Set | `A & S Urbanseat` | Fabric colour |
| Sofa Cum Bed → Steel | `sofa-cum-beds` | Steel Sofa-cum-Bed | `""` | Fabric colour |
| Sofa Cum Bed → Wooden | `sofa-cum-beds` | Wooden Sofa-cum-Bed | `A & S Urbanseat` | Fabric colour |
| Center Table → Wooden | `centre-tables-showcases` | Wooden Centre Table | `A & S Urbanseat` | Finish (2) |
| Showcase → Wooden | `centre-tables-showcases` | Wooden Showcase | `A & S Urbanseat` | Finish (2) |
| Bed → King / Queen / Single | `beds` | King Size Bed · Queen Size Bed · Single Bed | `A & S Urbanseat` | Finish (2); optional "With storage / Without storage" only if you keep it as a plain attribute with its own price |
| Mattress → Carlton / Nilkamal | `mattresses` | Carlton Mattress · Nilkamal Mattress | `Carlton` / `Nilkamal` | `attributes.Size`: Single, Double, Queen, King with per-variant price/SKU/stock |
| Dressing → Plain / Big Size / Standing Mirror / Wall Mirror | `dressing-tables-mirrors` | Plain Dressing Table · Large Dressing Table · Standing Mirror · Wall Mirror | `A & S Urbanseat` | Finish (2) |
| Bed Set Table → Wooden / Particle Board | `bedside-bed-tables` | Wooden Bedside Table · Particle-Board Bedside Table | `A & S Urbanseat` / `""` | Finish |
| Bed Table → Folding | `bedside-bed-tables` | Folding Bed Table | `""` | Colour |
| Almari → Two Doors / 3 Doors | `almirahs` | Two-Door Almirah · Three-Door Almirah | `A & S Urbanseat` | Finish |
| Alna → Iron / Wooden | `alna-clothes-stands` | Iron Alna (Clothes Stand) · Wooden Alna (Clothes Stand) | `""` / `A & S Urbanseat` | none (`[]`) |
| Rack → Steel / Wooden | `racks` | Steel Storage Rack · Wooden Storage Rack | `""` / `A & S Urbanseat` | `attributes.Shelves` (3 / 4 / 5) with per-variant price |
| Dining → 4 Sitter / 6 Sitter / Marble | `dining-sets` | 4-Seater Dining Set · 6-Seater Dining Set · Marble-Top Dining Set | `A & S Urbanseat` | Finish |
| Office Table → Winsome / Local | `office-tables` | Winsome Office Table · Workshop Office Table | `Winsome` / `A & S Urbanseat` | Size (2) |
| Computer Table → Winsome / Local | `computer-tables` | Winsome Computer Table · Workshop Computer Table | `Winsome` / `A & S Urbanseat` | Size (2) |
| Reading Table → Winsome / Local | `reading-tables` | Winsome Reading Table · Workshop Reading Table | `Winsome` / `A & S Urbanseat` | Size (2) |
| Plastic Dining → 4 Seater / 6 Seater | `plastic-dining-sets` | 4-Seater Plastic Dining Set · 6-Seater Plastic Dining Set | `Nilkamal` (flag) | Colour |
| Plastic Sofa → Nilkamal | `plastic-sofas` | Nilkamal Plastic Sofa Set | `Nilkamal` | Colour |

Count: 4 + 2 + 2 + 3 + 2 + 4 + 3 + 2 + 2 + 2 + 3 + 2 + 2 + 2 + 2 + 1 = **38 products**. Reproduce this table with final ids in the build log; the validator asserts the per-slug counts.

## Brand and design requirements

Content rules are the same as Prompt 03, plus:

- Exact field shapes and key order as Prompt 03; `rating: 0`, `totalReviews: 0` (Prompt 05 seeds reviews).
- Prices (INR placeholders, flagged): sofas ₹18,000–₹65,000; sofa-cum-beds ₹14,000–₹35,000; centre table/showcase ₹6,000–₹22,000; beds ₹12,000–₹45,000; mattresses ₹5,500–₹25,000 by size; dressing tables ₹6,000–₹18,000, mirrors ₹2,500–₹7,000; bedside/bed tables ₹1,800–₹6,000; almirahs ₹9,000–₹25,000; alna ₹1,500–₹5,000; racks ₹3,000–₹9,000; dining sets ₹15,000–₹60,000 (marble highest); office/computer/reading tables ₹4,000–₹18,000 (Winsome above workshop); plastic dining sets ₹5,000–₹11,000; plastic sofa ₹9,000–₹16,000.
- Descriptions end with the `Specifications: Key: Value; Key: Value; …` paragraph in exactly the format Prompt 03 defines (5–7 pairs: material, finish, size, seating/sleeping capacity, weight capacity, care). Mattress descriptions must not claim orthopaedic or medical benefits.
- Images: same placeholder scheme and tones as Prompt 03.
- Flags: add `featured: true` to 4–6 of these (so the home page mixes home and office pieces), `trending` to 3–4, `hot` to 1–2.
- Relations: `relatedProductIds` within the room/department; `frequentlyBoughtTogetherIds` for natural bundles only (bed + mattress, dining set + centre table is not natural, so no; office table + office chair across departments is fine). Extend Prompt 03's products where a cross-department bundle now exists (office chair → office table).
- Brand mapping for the "Brands we carry" strip (Prompt 12 renders distinct `product.brand` values as text): after this prompt the distinct non-empty brands are `A & S Urbanseat`, `Nilkamal`, `Carlton`, `Winsome`. Flag the `A & S Urbanseat` attribution (own manufacturing) for confirmation.

## Functional guardrails

1. **Data/API contract**: content only; the validator's key-set check must pass for all 84 products and all categories.
2. **Tokens**: placeholder tones from `DESIGN_SYSTEM.md` only.
3. **Admin untouched**: Admin → Products and Categories must open every record.
4. **Brand voice**: names and copy in the A & S Urbanseat voice; keep local terms the client's customers use ("Almirah", "Alna", "Jhula") with a plain-English gloss in the name or description.
5. **Responsive/accessible**: names ≤ 48 characters.
6. **No fabricated trust signals**: no claims about warranty or "20+ years" in product copy; stock realistic with a few low-stock and out-of-stock variants.
7. **Test before done**.

## Implementation notes

1. Read `prompts/00_INDEX.md`, `prompts/BUILD_LOG.md` (Prompt 03's id plan and image pattern), `prompts/DESIGN_SYSTEM.md`, then `db.json` and `scripts/validate-db.js`.
2. Generate with a script; append, never renumber Prompt 03's ids. Product ids continue from the last id Prompt 03 used.
3. Re-run `node scripts/validate-db.js --catalogue`; it must pass with 84 products and all categories.
4. Check the mega-menu data shape visually: `getMainMenuCategories` → six departments; `orderCategoriesHierarchically` → departments followed by their children in order. The current header renders only the flat main menu and an "All Categories" dropdown; Prompt 07 builds the flyouts from this tree.

## Acceptance criteria

- [ ] All ranges above exist as categories with at least two products per leaf; the six departments are unchanged in id, slug and menu order.
- [ ] 84 active products in total; the 38 added match the checklist exactly; validator passes in catalogue mode.
- [ ] Brand values limited to `A & S Urbanseat`, `Nilkamal`, `Carlton`, `Winsome` and `""`.
- [ ] `/products?category=home-furniture` lists every home piece; `/products?category=bedroom` only bedroom pieces; mattress size variants change price.
- [ ] Admin → Categories shows the full tree; Admin → Products opens any new product.

## Test and QA

1. JSON Server mode: `/products` (all 84, pagination works), category deep links for each new leaf, product pages for a sofa, a mattress (size variants), a rack (shelf variants) and a Winsome table; add to cart and open the drawer; search "almirah" and "table".
2. Widths 360, 768, 1024, 1440: listing still lays out with the longer category list in the filter sidebar.
3. Keyboard: category filter list and variant tiles operable.
4. `npm run build` passes; `CI=true npm test -- --passWithNoTests` exits 0.
5. Admin regression as in Prompt 03.
6. Append your entry to `prompts/BUILD_LOG.md` under `## Prompt 04 — Catalogue data II`: the checklist with ids, the tree shaping decision, brand mapping, prices used, and "Needs client confirmation" (all names, prices, specs, the own-manufacturing attribution, the Nilkamal attribution on plastic dining sets).
