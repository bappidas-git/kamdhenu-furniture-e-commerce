import apiService from "../../services/api";
import db from "../../../db.json";
import {
  MAX_RECENT_SEARCHES,
  POPULAR_COUNT,
  RECENT_SEARCHES_KEY,
  buildCategoryMap,
  buildCategoryNav,
  clearRecentSearches,
  clearSearchDataCache,
  departmentPath,
  getDepartments,
  getPopularSuggestions,
  getRecentSearches,
  loadSearchData,
  matchesCategoryChip,
  matchesSearch,
  peekSearchData,
  removeRecentSearch,
  resolveCategory,
  saveRecentSearch,
  scoreProduct,
  searchProducts,
} from "./searchData";

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    products: { getAll: jest.fn() },
    categories: { getAll: jest.fn() },
  },
}));

const category = (id, name, slug, parentId = null, extra = {}) => ({
  id,
  name,
  slug,
  parentId,
  isActive: true,
  sortOrder: 1,
  showInMainMenu: parentId === null,
  menuOrder: parentId === null ? id : 0,
  ...extra,
});

// A small tree: two departments with groups and leaves, one flat department,
// one inactive department.
const TREE = [
  category(1, "Plastic Furniture", "plastic-furniture", null, { sortOrder: 1 }),
  category(10, "Essentials", "plastic-essentials", 1),
  category(11, "Chairs with Arms", "plastic-essentials-armchairs", 10),
  category(2, "Office Chairs", "office-chairs", null, { sortOrder: 2 }),
  category(21, "Waiting Chairs", "office-essentials-waiting", 2),
  category(3, "Outdoor Furniture", "outdoor-furniture", null, { sortOrder: 3 }),
  category(4, "Retired", "retired", null, { sortOrder: 4, isActive: false }),
];

const product = (id, extra = {}) => ({
  id,
  name: `Product ${id}`,
  shortDescription: "",
  brand: "",
  tags: [],
  categoryId: 11,
  trending: false,
  hot: false,
  isActive: true,
  ...extra,
});

beforeEach(() => {
  clearSearchDataCache();
  localStorage.clear();
  jest.clearAllMocks();
});

// ── Scoring ──────────────────────────────────────────────────────────────────

describe("scoreProduct", () => {
  const map = buildCategoryMap(TREE);
  const score = (p, q) => scoreProduct(p, q, resolveCategory(p, map));

  test("name: exact 100, starts-with 80, word start 60, contains 40", () => {
    expect(score(product(1, { name: "Stool" }), "stool")).toBe(100);
    expect(score(product(1, { name: "Stool Set" }), "stool")).toBe(80);
    expect(score(product(1, { name: "Bar Stool" }), "stool")).toBe(60);
    expect(score(product(1, { name: "Barstool" }), "stool")).toBe(40);
  });

  test("tags: exact 30, starts-with 20, contains 10", () => {
    expect(score(product(1, { tags: ["teak"] }), "teak")).toBe(30);
    expect(score(product(1, { tags: ["teakwood"] }), "teak")).toBe(20);
    expect(score(product(1, { tags: ["solid-teak"] }), "teak")).toBe(10);
  });

  test("category name or slug 15, brand 15, short description 5", () => {
    expect(score(product(1, { categoryId: 21 }), "waiting")).toBe(15);
    expect(score(product(1, { categoryId: 21 }), "office-essentials")).toBe(15);
    expect(score(product(1, { brand: "Nilkamal" }), "nilkamal")).toBe(15);
    expect(score(product(1, { shortDescription: "Seats four" }), "four")).toBe(5);
  });

  test("trending +3 and hot +2 only lift a real match", () => {
    expect(score(product(1, { name: "Stool", trending: true, hot: true }), "stool")).toBe(105);
    expect(score(product(1, { name: "Stool", trending: true, hot: true }), "sofa")).toBe(0);
  });
});

// ── Category chips ──────────────────────────────────────────────────────────

describe("category chips", () => {
  test("one chip per active top-level category after All; each matches its descendants", () => {
    const { chips, groups } = buildCategoryNav(TREE);
    expect(chips).toEqual(["All", "Plastic Furniture", "Office Chairs", "Outdoor Furniture"]);
    expect(groups["Plastic Furniture"].sort()).toEqual(
      ["plastic-furniture", "plastic-essentials", "plastic-essentials-armchairs"].sort()
    );
  });

  test("a chip matches descendants, name or slug substrings and group tags", () => {
    const { groups } = buildCategoryNav(TREE);
    const map = buildCategoryMap(TREE);
    const match = (p, chip) => matchesCategoryChip(p, chip, resolveCategory(p, map), groups);
    expect(match(product(1, { categoryId: 11 }), "Plastic Furniture")).toBe(true);
    expect(match(product(1, { categoryId: 21 }), "Plastic Furniture")).toBe(false);
    expect(match(product(1, { categoryId: 21, tags: ["plastic-essentials"] }), "Plastic Furniture")).toBe(true);
    expect(match(product(1, { categoryId: 21 }), "All")).toBe(true);
  });

  test("the seeded tree gives All and the six departments in order", () => {
    const { chips } = buildCategoryNav(db.categories);
    expect(chips).toEqual([
      "All",
      "Plastic Furniture",
      "Office Chairs",
      "Café & Restaurant Chairs",
      "Outdoor Furniture",
      "Home Furniture",
      "Office Tables & Desks",
    ]);
  });
});

// ── The search pipeline ─────────────────────────────────────────────────────

describe("searchProducts", () => {
  const map = buildCategoryMap(TREE);
  const { groups } = buildCategoryNav(TREE);
  const ids = (list) => list.map((p) => p.id);

  test("keeps matches only, best first; equal scores keep catalogue order", () => {
    const catalogue = [
      product(1, { name: "Bar Stool" }),
      product(2, { name: "Sofa" }),
      product(3, { name: "Stool" }),
      product(4, { name: "Bar Stool" }),
    ];
    expect(ids(searchProducts(catalogue, map, groups, "stool", "All"))).toEqual([3, 1, 4]);
  });

  test("the chip narrows the matches; each result carries its category name", () => {
    const catalogue = [
      product(1, { name: "Bar Stool", categoryId: 11 }),
      product(2, { name: "Bar Stool", categoryId: 21 }),
    ];
    const scoped = searchProducts(catalogue, map, groups, "Stool", "Office Chairs");
    expect(ids(scoped)).toEqual([2]);
    expect(scoped[0]._catName).toBe("Waiting Chairs");
  });

  test("a blank query finds nothing", () => {
    expect(searchProducts([product(1)], map, groups, "   ", "All")).toEqual([]);
  });
});

// ── The listing's yes/no (matchesSearch) ────────────────────────────────────

describe("matchesSearch", () => {
  const map = buildCategoryMap(TREE);

  test("the query in the category's name or slug is a match, as in the scoring", () => {
    const bench = product(1, { name: "Cushioned Bench", categoryId: 21 });
    expect(matchesSearch(bench, "Waiting", map)).toBe(true);
    expect(matchesSearch(bench, "  office-essentials ", map)).toBe(true);
    expect(matchesSearch(bench, "bench", map)).toBe(true);
    expect(matchesSearch(bench, "sofa", map)).toBe(false);
  });

  test("a blank query matches everything", () => {
    expect(matchesSearch(product(1, { name: "" }), "   ", map)).toBe(true);
  });

  test("on the seeded catalogue it selects exactly what the overlay finds", () => {
    const categories = db.categories.filter((c) => c.isActive !== false);
    const seededMap = buildCategoryMap(categories);
    const { groups } = buildCategoryNav(categories);
    const ids = (list) => list.map((p) => p.id).sort((a, b) => a - b);
    ["office", "table", "café", "chair", "chairs", "almirah", "nilkamal", "sofa", "sofas", "zzz"].forEach((query) => {
      const overlay = ids(searchProducts(db.products, seededMap, groups, query, "All"));
      expect(ids(db.products.filter((p) => matchesSearch(p, query, seededMap)))).toEqual(overlay);
    });
  });
});

// ── Recent searches ─────────────────────────────────────────────────────────

describe("recent searches", () => {
  test("newest first, de-duplicated case-insensitively, at most eight", () => {
    "one two three four five six seven eight".split(" ").forEach(saveRecentSearch);
    expect(saveRecentSearch("ONE")).toEqual(["ONE", "eight", "seven", "six", "five", "four", "three", "two"]);
    expect(saveRecentSearch("nine")).toHaveLength(MAX_RECENT_SEARCHES);
    expect(JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY))[0]).toBe("nine");
  });

  test("a repeat in another case moves to the front rather than adding a second entry", () => {
    saveRecentSearch("chair");
    saveRecentSearch("sofa");
    expect(saveRecentSearch("CHAIR")).toEqual(["CHAIR", "sofa"]);
  });

  test("removing one keeps the rest; removing the last clears the key", () => {
    saveRecentSearch("chair");
    saveRecentSearch("sofa");
    expect(removeRecentSearch("SOFA")).toEqual(["chair"]);
    expect(removeRecentSearch("chair")).toEqual([]);
    expect(localStorage.getItem(RECENT_SEARCHES_KEY)).toBeNull();
  });

  test("clear all removes the key; unreadable storage reads as empty", () => {
    saveRecentSearch("chair");
    clearRecentSearches();
    expect(localStorage.getItem(RECENT_SEARCHES_KEY)).toBeNull();
    localStorage.setItem(RECENT_SEARCHES_KEY, "{not json");
    expect(getRecentSearches()).toEqual([]);
  });
});

// ── Suggestions ─────────────────────────────────────────────────────────────

describe("getPopularSuggestions", () => {
  test("the names of the first six active trending products, in catalogue order", () => {
    const catalogue = [1, 2, 3, 4, 5, 6, 7, 8].map((id) =>
      product(id, { trending: id !== 2, isActive: id !== 3 })
    );
    expect(getPopularSuggestions(catalogue, TREE)).toEqual({
      kind: "popular",
      items: [1, 4, 5, 6, 7, 8].map((id) => ({ key: String(id), label: `Product ${id}` })),
    });
    expect(POPULAR_COUNT).toBe(6);
  });

  test("the seeded catalogue: its first six trending products", () => {
    const expected = db.products.filter((p) => p.trending).slice(0, 6).map((p) => p.name);
    const popular = getPopularSuggestions(db.products, db.categories);
    expect(popular.kind).toBe("popular");
    expect(popular.items.map((item) => item.label)).toEqual(expected);
  });

  test("with nothing trending: the departments, in menu order, linking to their listings", () => {
    const popular = getPopularSuggestions([product(1)], TREE);
    expect(popular.kind).toBe("departments");
    expect(popular.items).toEqual([
      { key: "1", label: "Plastic Furniture", to: "/products?category=plastic-furniture" },
      { key: "2", label: "Office Chairs", to: "/products?category=office-chairs" },
      { key: "3", label: "Outdoor Furniture", to: "/products?category=outdoor-furniture" },
    ]);
  });

  test("departments are the admin's main menu; links use the canonical slug", () => {
    expect(getDepartments(db.categories).map((c) => c.slug)).toEqual([
      "plastic-furniture",
      "office-chairs",
      "cafe-restaurant-chairs",
      "outdoor-furniture",
      "home-furniture",
      "office-tables-desks",
    ]);
    expect(departmentPath({ id: 9, slug: "beds" })).toBe("/products?category=beds");
    expect(getDepartments(undefined)).toEqual([]);
  });
});

// ── The shared catalogue cache ──────────────────────────────────────────────

describe("loadSearchData", () => {
  test("reads products and categories once and shares the result", async () => {
    apiService.products.getAll.mockResolvedValue([product(1)]);
    apiService.categories.getAll.mockResolvedValue(TREE);
    expect(peekSearchData()).toBeNull();
    const [a, b] = await Promise.all([loadSearchData(), loadSearchData()]);
    expect(a).toBe(b);
    await loadSearchData();
    expect(apiService.products.getAll).toHaveBeenCalledTimes(1);
    expect(apiService.categories.getAll).toHaveBeenCalledTimes(1);
    expect(peekSearchData()).toEqual({ products: [product(1)], categories: TREE });
  });

  test("a failed read can be retried; non-array answers become empty lists", async () => {
    apiService.products.getAll.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(null);
    apiService.categories.getAll.mockResolvedValue(undefined);
    await expect(loadSearchData()).rejects.toThrow("offline");
    expect(peekSearchData()).toBeNull();
    await expect(loadSearchData()).resolves.toEqual({ products: [], categories: [] });
    expect(apiService.products.getAll).toHaveBeenCalledTimes(2);
  });
});
