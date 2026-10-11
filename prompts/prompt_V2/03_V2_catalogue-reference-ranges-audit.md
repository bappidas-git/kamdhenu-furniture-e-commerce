# V2-03 — Catalogue data II (reference-site ranges): max-effort audit and repair

**Prompt V2-03 of 5 · re-verifies original Prompt 04 (commit `4dd5cf2`) · run at MAX effort in a fresh session**

## Why this prompt exists

The original Prompt 04 (`prompts/04_catalogue-data-reference-site-ranges.md`) ran at medium effort. It added the Home Furniture and Office Tables & Desks subtrees, the two extra Plastic groups, 38 products, cross-catalogue relations and the validator's coverage checks. **Re-seeding is forbidden** because later prompts, orders, reviews, wishlists, deals and tests depend on these ids, slugs and SKUs. Audit every requirement of Prompt 04 at max effort and repair the gaps in place.

## Depends on

V2-02 (read `prompts/prompt_V2/reports/V2-01_REPORT.md`, `V2-02_REPORT.md` and their build-log entries first; reuse V2-02's audit script and extend it).

## Context

Same storefront, data flow and consuming code as V2-02 (`categories.js`, `helpers.js`, `variantUtils.js`, `VariantSelector.js`, `CartContext.js`, the specifications parser, `Products.js` filters, `api.js` products block). The client's existing site `https://kamdhenufurniture.in/` is the source of **facts only** (ranges, model names, materials, brands), never of layout, copy or images. Its inventory as of 2026-10-06 is reproduced verbatim in Prompt 04 under "What the reference site lists". All the rules from Prompt 03 apply to these products too (exact key shapes, specifications format, price/stock/variant rules, placeholder images, relations).

## Objective

Every requirement, table row, count, rule and guardrail of `prompts/04_catalogue-data-reference-site-ranges.md` is met with evidence, superseded by a cited later decision, or repaired now. Every range the reference site lists exists, and every leaf holds at least two products. The 38 products meet every Prompt 03 content rule, cross-catalogue relations are complete and sensible, and the validator enforces it all.

## Scope — files you may change

- `db.json` → `categories` (ids 30+ and the two extra Plastic groups) and `products` (the 38 Prompt 04 products), plus **only** `relatedProductIds` / `frequentlyBoughtTogetherIds` on Prompt 03 products where a cross-department bundle is required (e.g. office chair ↔ office table). Content fields only, as in V2-02.
- `scripts/validate-db.js`: add missing assertions, never loosen.
- A Jest test only if a justified data fix changes a value it pins.
- `prompts/BUILD_LOG.md`, `prompts/prompt_V2/reports/V2-03_REPORT.md`.

**Frozen:** every `id`, `slug`, `sku`, variant `id`, key set and order, collection list, departments 1–6 (id, slug, menu order), `rating`/`totalReviews` and all non-catalogue collections (V2-04), `src/**` except a justified test, `public/**`, the admin, `api.js`.

## Method (mandatory, in this order)

1. **Read** `prompts/00_INDEX.md`, `prompts/04_catalogue-data-reference-site-ranges.md` and `prompts/03_catalogue-data-client-ranges.md` (its content rules apply), the `## Prompt 04` and `## Prompt 05` build-log entries, the V2-02 report, and grep the rest of `BUILD_LOG.md` for later catalogue decisions (Prompts 07, 11, 12, 14, 15, 17, 29, 32, 34 are likely: mega-menu shaping, "Brands we carry", search synonyms, copy pass, SEO, final QA). List them by prompt number.
2. **See what the medium session did:** `git show --stat 4dd5cf2` and read the diff; then `git log --oneline -- db.json`.
3. **Optionally re-check the reference site** (`https://kamdhenufurniture.in/` and its `/product/` and category pages) if the network allows. If the site now lists a range or model that Prompt 04's inventory does not, **do not add it**. Record it in the report under "Reference site changed since 2026-10-06" for the client. If the site is unreachable, audit against the verbatim inventory in Prompt 04.
4. **Build the requirement matrix** in `prompts/prompt_V2/reports/V2-03_REPORT.md` **before any edit**: every inventory line, tree node, table row (all 38 products individually), price band, rule, guardrail, acceptance criterion, Test-and-QA step and build-log obligation, numbered (expect **100 or more** rows), each with status and evidence.
5. **Repair** by script, keep 2-space JSON and key order, re-run the audit, update the matrix.
6. **Gate, browser checks, log.**

## Deep checks medium effort commonly skips

**Inventory → catalogue coverage (one row per site model)**
- Every model in Prompt 04's verbatim inventory maps to exactly one product: Sofa ×4, Sofa-cum-Bed ×2, Centre Table, Showcase, Bed ×3, Mattress ×2, Dressing ×4, Bed Set Table ×2, Folding Bed Table, Almari ×2, Alna ×2, Rack ×2, Dining ×3, Office Table ×2, Computer Table ×2, Reading Table ×2, Plastic Dining ×2, Plastic Sofa ×1 = **38**. Product names match the table unless a later prompt recorded a rename. No café, waiting, lobby, swing or shoe-rack product was added here.

**Tree**
- The Home Furniture subtree (Living Room → Sofas, Sofa-cum-Beds, Centre Tables & Showcases; Bedroom → Beds, Mattresses, Dressing Tables & Mirrors, Bedside & Bed Tables, Almirahs, Alna Clothes Stands; Dining Room → Dining Sets; Storage → Racks), Office Tables & Desks → Office/Computer/Reading Tables, Plastic → `plastic-dining-sets` (sortOrder 3) and `plastic-sofas` (sortOrder 4), all with exact slugs, ids from 30 upward, `showInMainMenu: false`, `menuOrder: 0`, contiguous `sortOrder` within each parent.
- **Every leaf holds ≥ 2 active products.** Check `plastic-sofas` (one Nilkamal Plastic Sofa Set per the table) explicitly against this rule and against what Prompt 04's build log decided. If it is a singleton leaf with no recorded decision, that is a gap: fix it **without inventing a product the site does not list** (e.g. a recorded decision to keep it, or a tree-shaping change that does not alter existing slugs used by URLs), and get it into the report. The same applies to any other singleton leaf.
- Departments 5 and 6 unchanged in id, slug and menu order. `getMainMenuCategories` returns six departments; `orderCategoriesHierarchically` returns departments followed by their children in order (run it in Node against `db.json` and paste the output).

**The 38 products (all Prompt 03 content rules, plus)**
- Brand mapping exact: Wooden/L-Shaped/5-/7-Seater sofas, Wooden Sofa-cum-Bed, centre table, showcase, beds, dressing tables and mirrors, Wooden bedside, almirahs, Wooden Alna, Wooden Rack, dining sets and the workshop tables → `A & S Urbanseat`; Steel Sofa-cum-Bed, Particle-Board bedside, Folding Bed Table, Iron Alna, Steel Rack → `""`; mattresses → `Carlton` / `Nilkamal`; Winsome tables → `Winsome`; plastic dining sets and plastic sofa → `Nilkamal`. Distinct non-empty brands across the **whole** catalogue are exactly `A & S Urbanseat`, `Nilkamal`, `Carlton`, `Winsome`.
- Variants as specified: fabric colour 2–3 on sofas; finish ×2 on wood pieces; mattresses `attributes.Size` Single/Double/Queen/King with per-variant price, SKU and stock (price rises with size); racks `attributes.Shelves` 3/4/5 with rising price; office/computer/reading tables Size ×2; Alna `[]`; beds' optional storage attribute only as a plain attribute with its own price.
- Prices inside each band from Prompt 04 (marble dining highest of the dining sets; Winsome above workshop for the same table type).
- "Made in our own workshop" appears **only** on items the site marks Own Manufacturing / Local Made, and the claim is flagged; the site's labels "Company Made" / "Local Made" never appear verbatim; local terms (Almirah, Alna, Jhula) carry a plain-English gloss.
- Mattress copy makes **no** orthopaedic or medical claims (`grep -niE "orthop|spine|medical|doctor|therapeutic|back pain"`).
- Specifications paragraph 5–7 pairs (material, finish, size, seating/sleeping capacity, weight capacity, care), hedged, parsed correctly by the product page's parser, consistent with `dimensions`/`weight`.
- Flags among the 38: `featured` 4–6 (so the home page mixes home and office), `trending` 3–4, `hot` 1–2, unless a later prompt recorded otherwise.
- Relations: `relatedProductIds` within the room/department; `frequentlyBoughtTogetherIds` only natural bundles (bed ↔ mattress yes; dining set ↔ centre table no; office table ↔ office chair yes, **in both directions**, i.e. the Prompt 03 office chairs point back at office tables). Every relation id exists and is active, never self, no duplicates.
- Stock realistic, with a few low-stock and out-of-stock variants; names ≤ 48 chars.

**Validator**
- Totals 84 active products; per-slug counts for every Prompt 04 leaf; the brand allow-list; the ≥ 2-products-per-leaf rule; mattress size and rack shelf variant shapes. Add whatever is missing.

## Functional guardrails

1. Content only; identity fields and shapes frozen; `api.js` untouched.
2. Placeholder tones from `DESIGN_SYSTEM.md`.
3. Admin → Products and Categories open every record; edit-save-without-change leaves `db.json` identical.
4. Brand voice with local terms glossed.
5. Names ≤ 48 chars.
6. No fabricated trust signals (no warranty or "20+ years" claims in product copy; no medical claims).
7. Green gate before done.

## Gate (must all pass at the end)

- `node scripts/validate-db.js --catalogue` and full mode → `✓ all checks passed`
- `CI=true npm test -- --passWithNoTests` → exits 0
- `npm run build` → passes, no new warnings
- JSON Server mode: `/products` (84, pagination), a deep link to **every** new leaf, `/products?category=home-furniture` (all home pieces), `/products?category=bedroom` (bedroom only), a sofa, a mattress (size changes price), a rack (shelves), a Winsome table, add to cart + drawer, search "almirah", "alna", "table", "mattress"; mega-menu flyouts show the new subtrees; "Brands we carry" strip shows exactly the four brands; widths 360/768/1024/1440 with the longer filter list; keyboard on category filters and variant tiles; console clean; Admin regression.

## Acceptance criteria

- [ ] `V2-03_REPORT.md` holds the full numbered matrix (all 38 products individually), the inventory-coverage table with final ids, every gap and fix; zero `❌` / `⚠` rows remain.
- [ ] Every leaf has ≥ 2 active products or a cited recorded decision; brands exactly the four allowed values plus `""`.
- [ ] Cross-department bundles exist in both directions.
- [ ] Identity-stability proof (ids/slugs/SKUs/key order before vs after) pasted in the report.
- [ ] Gate green; build-log entry appended.

## Build-log entry

Append `## Prompt V2-03 — Catalogue data II (max-effort re-verification of Prompt 04)`: requirement count and totals, the coverage table with ids, gaps and fixes (record ids), validator assertions added, superseded decisions honoured, reference-site differences (if checked), stability proof, findings for V2-04/V2-05, gate results, and the refreshed "Needs client confirmation" list (names, prices, specs, own-manufacturing attribution, Nilkamal attribution on plastic dining sets). Commit: `Re-verify catalogue data II at max effort (Prompt V2-03)`.
