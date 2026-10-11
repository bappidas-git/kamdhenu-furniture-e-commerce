# V2-02 — Catalogue data I (client ranges): max-effort audit and repair

**Prompt V2-02 of 5 · re-verifies original Prompt 03 (commit `6616837`) · run at MAX effort in a fresh session**

## Why this prompt exists

The original Prompt 03 (`prompts/03_catalogue-data-client-ranges.md`) ran at medium effort. It seeded the category tree, the 46 client-specified products and `scripts/validate-db.js`, and every later prompt reads that data. **Re-seeding is forbidden.** Carts, wishlists, orders, reviews, deals, tests and URLs depend on the existing ids, slugs and SKUs. Instead, audit every requirement of Prompt 03 against today's `db.json` and validator at max effort, and repair the gaps **in place** so every record is as correct as a max-effort run would have made it.

## Depends on

V2-01 (read `prompts/prompt_V2/reports/V2-01_REPORT.md` and its `BUILD_LOG.md` entry first).

## Context

Create React App storefront for A & S Urbanseat (furniture and seating, India, INR, `en-IN`). Data flows from `db.json` through the dual-mode `src/services/api.js`. Category navigation: `src/utils/categories.js` (`getMainMenuCategories`, `orderCategoriesHierarchically`, `getCategoryScopeIds`, canonical `/products?category=<slug>`). Product URLs `/products/<slug>`. Variant logic: `src/components/storefront/variantUtils.js`, `VariantSelector.js`, `src/context/CartContext.js`, `getProductMinPrice` in `src/utils/helpers.js`. Specifications are parsed by Prompt 17 from the description's final `Specifications:` paragraph. The catalogue now holds 84 products (46 from Prompt 03, 38 from Prompt 04). Prompt 05 later set `rating` / `totalReviews` from reviews, and Prompts 29, 32 and 34 edited some catalogue copy and data. Those later edits are recorded decisions, not gaps.

## Objective

Every requirement, rule, count and guardrail in `prompts/03_catalogue-data-client-ranges.md` that applies to the **46 client-range products, departments 1–6 and the Plastic and Office Chairs subtrees** is met with evidence, superseded by a cited later decision, or repaired now. `scripts/validate-db.js` enforces every machine-checkable rule of Prompt 03. Where it does not today, tighten it.

## Scope — files you may change

- `db.json` → `categories` (ids 1–6 and 10–29) and `products` (the 46 Prompt 03 products): **content fields only**. Allowed: names (≤ 48 chars), descriptions, `shortDescription`, specifications paragraph, prices/`comparePrice`/`costPrice` consistency, `stock` sums, `lowStockThreshold`, variant attributes/swatches, tags, flags, dimensions/weight, image URLs, relations, meta fields, dates.
- `scripts/validate-db.js`: add missing assertions (never remove or loosen one).
- If a data fix legitimately changes a value a Jest test pins, the test (with justification in the report).
- `prompts/BUILD_LOG.md`, `prompts/prompt_V2/reports/V2-02_REPORT.md`.

**Frozen, never change:** any `id`, `slug`, `sku`, variant `id`, `categoryId` placement of an existing product (unless it violates the coverage table, in which case report it first and move it only if no order, cart, review or test depends on the old placement), key sets and key order, collection list, `src/**` (except a test as above), `public/**`, the admin, `rating`/`totalReviews` (V2-04 owns them), all non-catalogue collections (V2-04 owns them).

## Method (mandatory, in this order)

1. **Read** `prompts/00_INDEX.md`, `prompts/03_catalogue-data-client-ranges.md` in full, the `## Prompt 03`, `## Prompt 04`, `## Prompt 05` entries of `BUILD_LOG.md`, then grep the rest of `BUILD_LOG.md` for every later change to catalogue data (`db.json`, `products`, `categories`, `Specifications`, `shortDescription`, `featured`, `trending`, `hot`, `relatedProductIds`, `comparePrice`, `validate-db`). Prompts 13, 14, 16, 17, 29, 32 and 34 are likely. List every later decision with its prompt number. Read `DESIGN_SYSTEM.md` "Image placeholder tones".
2. **See what the medium session did:** `git show --stat 6616837` and review its `scripts/validate-db.js` and the data it wrote; then `git log --oneline -- db.json scripts/validate-db.js` to see every later touch.
3. **Read the code that consumes the data** (`categories.js`, `helpers.js` incl. `slugify` and `getProductMinPrice`, `variantUtils.js`, `VariantSelector.js`, `CartContext.js`, the Prompt 17 specifications parser, `src/pages/Products/Products.js` filters, the `products.*` block of `api.js`) so every rule is checked against what the app actually does.
4. **Write an audit script** (keep it in `scripts/` only if you fold its checks into `validate-db.js`; otherwise run it from a scratch location) that prints, per product and per category, every rule result below. Paste the summary into the report.
5. **Build the requirement matrix** in `prompts/prompt_V2/reports/V2-02_REPORT.md` **before any edit**: every bullet, table row, rule, guardrail, acceptance criterion and Test-and-QA step of Prompt 03, numbered (expect **80 or more** rows), each with status `✅ Met` / `↪ Superseded by Prompt NN (cite)` / `❌ Gap` / `⚠ Partial` and evidence (record ids, script output, `file:line`).
6. **Repair** with a script (not by hand), writing `db.json` back with 2-space indentation and the original key order. Re-run the audit and update each row.
7. **Gate, browser checks, log.**

## Deep checks medium effort commonly skips (verify each, per record)

**Categories**
- Ids 1–6 are departments with `showInMainMenu: true` and `menuOrder` 1–6 in the specified order; all others `false` / `0`; `sortOrder` counts from 1 within each parent with no gaps or duplicates; Plastic subtree ids 10–19, Office Chairs 20–29; every `parentId` exists; slugs exactly as the tree specifies; descriptions are one refined sentence; Essentials descriptions say "dependable everyday value" in substance and Premium ones "heavier build, finer finish"; no "cheap", "basic" or "non-premium"; images are `1600x1000` placeholders in the design-system tones.

**Coverage (exact counts per slug)**
- 3 · 3 · 2 · 3 (each **exactly** 4 shelf variants "2 shelves"…"5 shelves", price rising with shelf count) · 3 · 2 · 2 · Lobby Set (Small/Large) + Jhula (Small/Large) in `outdoor-furniture` · 3 · 2 · 3 · 3 · 2 · 3 · 10 café chairs = **46**. Names match the suggested placeholders unless a later prompt recorded a rename.

**Every product**
- Key set and key order equal `PRODUCT_KEYS`; `variants` is `[]` never `null`.
- Attribute keys identical across all variants of a product; `swatchHex` only on colour attributes and a valid 7-char hex.
- `price` = min variant price; `comparePrice` is `0` or **≥ price** (and 10–20 % above when set; roughly a third of products have one); `costPrice` ≈ 60–70 % of price; prices inside the specified bands; Premium above Essentials within the same type; numbers end in 49/99/00.
- `stock` = Σ variant stock; variant stock 4–60 except 2–3 deliberately low-stock (≤ `lowStockThreshold`) and 1–2 out-of-stock variants **across the 46**; `lowStockThreshold` 3–8.
- `shortDescription` ≤ 110 chars; `description` = 2–3 brand-voice paragraphs separated by `\n\n` + final paragraph starting exactly `Specifications:` with **5–7** `Key: Value` pairs separated by `; `, values hedged ("approx."), no certification or warranty claims. **Parse it with the same function the product page uses** and confirm every product yields 5–7 rows.
- Specification sizes and weights agree with `dimensions` and `weight` fields (the validator's "Overall size"/"Height" check from Prompt 34 must pass; extend it if a product slips through).
- Names ≤ 48 chars, stand alone without a tier prefix; slugs unique, ASCII, equal to `slugify(name)` unless a later prompt recorded otherwise; SKUs unique and uppercase; variant SKUs unique.
- `brand` is `"Nilkamal"` only on plausible plastic ranges and `""` on office, café and outdoor products; no invented manufacturers.
- Three images, `https://placehold.co/1200x1500/<bg>/<fg>?text=…` with tones from `DESIGN_SYSTEM.md`, image 2 and 3 using "Detail" / "In+situ"; no reference-site image URLs.
- Tags lowercase and include brand (if any), tier, type and material.
- Flags across the 46: `featured` 8–10 spanning all four departments, `trending` 6–8, `hot` 3–4, unless later prompts recorded new counts.
- `relatedProductIds` 3–5 ids **within the same department**, all existing and active, never self, no duplicates; `frequentlyBoughtTogetherIds` 0–2 ids and only natural bundles.
- `createdAt` ≤ `updatedAt`, ISO strings, within the six months before the build date.
- No electronics/fashion copy anywhere in the catalogue (`grep -niE "laptop|phone|headphone|t-shirt|sneaker|electronics|fashion"`).

**Validator**
- Every machine-checkable rule above is asserted by `scripts/validate-db.js` (catalogue mode). Add any missing assertion. Run both `--catalogue` and full mode.

## Functional guardrails

1. Content only: key sets, key order, ids, slugs, SKUs and collections unchanged; `api.js` untouched.
2. Placeholder tones from `DESIGN_SYSTEM.md` only.
3. Admin → Categories and Products open and save every touched record unchanged.
4. Brand voice; no "non-premium".
5. Names are meaningful `alt` text.
6. No fabricated trust signals or inflated stock.
7. Green gate before done.

## Gate (must all pass at the end)

- `node scripts/validate-db.js --catalogue` and `node scripts/validate-db.js` → both `✓ all checks passed`
- `CI=true npm test -- --passWithNoTests` → exits 0
- `npm run build` → passes, no new warnings
- JSON Server mode browser checks: header and mega-menu show the six departments in order; `/products?category=plastic-furniture` includes every Plastic product; `/products?category=office-chairs-premium`, `/products?category=plastic-shoe-racks`; a shoe-rack page (shelf variants change price, SKU and stock), a café chair (swatches), Lobby Set (sizes), every product's specifications table renders; add to cart and open the drawer; search "chair" and "waiting"; widths 360/768/1024/1440; console clean; Admin → Categories tree and Products edit-save-without-change leaves the record identical (`git diff db.json` empty afterwards).

## Acceptance criteria

- [ ] `V2-02_REPORT.md` holds the complete numbered matrix, the audit-script summary, every gap and fix; zero `❌` / `⚠` rows remain.
- [ ] 46 Prompt 03 products and the specified tree satisfy every rule above, or the deviation is cited as a recorded later decision.
- [ ] `validate-db.js` enforces every machine-checkable Prompt 03 rule; both modes pass.
- [ ] No id, slug, SKU, key set or collection changed (prove it: a script comparing ids/slugs/SKUs/key orders before and after, output pasted in the report).
- [ ] Gate green; build-log entry appended.

## Build-log entry

Append `## Prompt V2-02 — Catalogue data I (max-effort re-verification of Prompt 03)`: requirement count and status totals, the gap list with record ids and fixes, validator assertions added, superseded decisions honoured, the before/after identity-stability proof, findings handed to V2-03/V2-04/V2-05, gate results, and the refreshed "Needs client confirmation" list for these ranges. Commit: `Re-verify catalogue data I at max effort (Prompt V2-02)`.
