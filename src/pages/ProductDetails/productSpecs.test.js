import db from "../../../db.json";
import { parseSpecifications } from "../../utils/helpers";
import { buildSpecRows, formatDimensions, formatWeight } from "./productSpecs";

const product = (slug) => db.products.find((p) => p.slug === slug);
const categoryOf = (p) => db.categories.find((c) => c.id === p.categoryId);
const rowsFor = (slug, sku) => {
  const p = product(slug);
  return buildSpecRows({
    specs: parseSpecifications(p.description).specs,
    product: p,
    sku: sku ?? p.variants?.[0]?.sku ?? p.sku,
    category: categoryOf(p),
  });
};

test("the parsed pairs come first, in their order, then the catalogue's fields", () => {
  const rows = rowsFor("covered-plastic-shoe-rack");
  expect(rows.map((row) => row.key)).toEqual([
    "Material",
    "Shelves",
    "Width",
    "Height",
    "Pairs per shelf",
    "Assembly",
    "Care",
    "Brand",
    "SKU",
    "Weight",
    "Dimensions",
    "Category",
    "Tags",
  ]);
  const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
  expect(byKey.Brand.value).toBe("Nilkamal");
  expect(byKey.SKU.value).toBe("PLE-SHR-03-2S");
  expect(byKey.Weight.value).toBe("6.8 kg");
  expect(byKey.Dimensions).toEqual({ key: "Dimensions", value: "62 × 33 × 98 cm", hint: "L × W × H" });
  expect(byKey.Category.value).toBe("Shoe Racks");
  expect(byKey.Tags.tags).toEqual(product("covered-plastic-shoe-rack").tags);
});

test("a field row whose name a parsed pair already has is left out, ignoring case", () => {
  // The Carlton mattress's own paragraph names its brand.
  const rows = rowsFor("carlton-mattress");
  expect(rows.filter((row) => row.key.toLowerCase() === "brand")).toEqual([
    { key: "Brand", value: "Carlton" },
  ]);
  expect(rows.findIndex((row) => row.key === "Brand")).toBe(0);

  const custom = buildSpecRows({
    specs: [
      { key: "WEIGHT", value: "about 7 kg" },
      { key: "dimensions", value: "60 × 30 × 90 cm" },
      { key: "Sku", value: "From the copy" },
    ],
    product: { brand: "Nilkamal", weight: 6.8, dimensions: { length: 62, width: 33, height: 98 } },
    sku: "PLE-SHR-03-2S",
  });
  expect(custom.map((row) => row.key)).toEqual(["WEIGHT", "dimensions", "Sku", "Brand"]);
});

test("the SKU row is the one it is handed (the chosen variant's)", () => {
  const rows = rowsFor("covered-plastic-shoe-rack", "PLE-SHR-03-5S");
  expect(rows.find((row) => row.key === "SKU").value).toBe("PLE-SHR-03-5S");
});

test("empty fields leave no row: brand, weight 0, missing dimensions, category, tags", () => {
  const rows = buildSpecRows({
    specs: [],
    product: { brand: "  ", weight: 0, dimensions: null, tags: [] },
    sku: "",
    category: null,
  });
  expect(rows).toEqual([]);
});

test("without the paragraph, only the field rows show", () => {
  const p = product("iron-alna-clothes-stand");
  const rows = buildSpecRows({
    specs: parseSpecifications("An alna for the bedroom.").specs,
    product: p,
    sku: p.sku,
    category: categoryOf(p),
  });
  expect(rows.map((row) => row.key)).toEqual(["SKU", "Weight", "Dimensions", "Category", "Tags"]);
});

test("every seeded product gets its parsed pairs and its SKU, and no name twice", () => {
  db.products.forEach((p) => {
    const specs = parseSpecifications(p.description).specs;
    const rows = buildSpecRows({ specs, product: p, sku: p.sku, category: categoryOf(p) });
    expect(rows.slice(0, specs.length)).toEqual(specs);
    const names = rows.map((row) => row.key.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("sku");
  });
});

test("tags are trimmed and repeated tags shown once", () => {
  const rows = buildSpecRows({ product: { tags: [" bed ", "Bed", "", null, "wooden"] } });
  expect(rows).toEqual([{ key: "Tags", tags: ["bed", "wooden"] }]);
});

test.each([
  [3.2, "3.2 kg"],
  [92, "92 kg"],
  [1250, "1,250 kg"],
  ["4.5", "4.5 kg"],
  [0, ""],
  ["", ""],
  [null, ""],
  [-2, ""],
  ["heavy", ""],
])("formatWeight(%p) is %p", (weight, expected) => {
  expect(formatWeight(weight)).toBe(expected);
});

test.each([
  [{ length: 57, width: 54, height: 80 }, "57 × 54 × 80 cm"],
  [{ length: 62.5, width: 33, height: 98 }, "62.5 × 33 × 98 cm"],
  [{ length: 57, width: 0, height: 80 }, "L 57 × H 80 cm"],
  [{ length: 0, width: 0, height: 0 }, ""],
  [null, ""],
  ["120 x 60 cm", "120 x 60 cm"],
])("formatDimensions(%p) is %p", (dimensions, expected) => {
  expect(formatDimensions(dimensions)).toBe(expected);
});

test("only a whole L × W × H record spells out the order", () => {
  const partial = buildSpecRows({ product: { dimensions: { length: 57, height: 80 } } });
  expect(partial).toEqual([{ key: "Dimensions", value: "L 57 × H 80 cm" }]);
  const text = buildSpecRows({ product: { dimensions: "120 x 60 cm" } });
  expect(text).toEqual([{ key: "Dimensions", value: "120 x 60 cm" }]);
});
