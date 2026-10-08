import apiService from "../../services/api";
import { PROMISE_STEPS } from "../../content/homeContent";
import { STOREFRONT_CONFIG } from "../../theme/tokens";
import db from "../../../db.json";
import {
  MAX_REVIEWS,
  collectBrands,
  formatDeliveryDays,
  loadFeaturedReviews,
  loadPromiseData,
  promiseBodyLayout,
  promiseValues,
  resolvePromiseBody,
  selectReviews,
} from "./homeData";

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    products: { getReviews: jest.fn() },
    settings: { get: jest.fn() },
    shipping: { getMethods: jest.fn() },
  },
}));

const RETURNS_DAYS = STOREFRONT_CONFIG.returnsWindowDays;
afterEach(() => {
  STOREFRONT_CONFIG.returnsWindowDays = RETURNS_DAYS;
  jest.clearAllMocks();
});

// ── Brands we carry ──────────────────────────────────────────────────────────

describe("collectBrands", () => {
  test("lists the seeded catalogue's brands alphabetically, the store's own last", () => {
    expect(collectBrands(db.products, "A & S Urbanseat")).toEqual([
      "Carlton",
      "Nilkamal",
      "Winsome",
      "A & S Urbanseat",
    ]);
  });

  test("uses APP_NAME as the store's own brand by default", () => {
    expect(collectBrands(db.products).at(-1)).toBe("A & S Urbanseat");
  });

  test("skips empty and missing brands, inactive products and repeats in other spellings", () => {
    const products = [
      { id: 1, brand: "Winsome" },
      { id: 2, brand: "" },
      { id: 3, brand: "   " },
      { id: 4 },
      { id: 5, brand: null },
      { id: 6, brand: " nilkamal " },
      { id: 7, brand: "NILKAMAL" },
      { id: 8, brand: "Retired Brand", isActive: false },
      { id: 9, brand: "A&S Urbanseat" },
      null,
    ];
    expect(collectBrands(products, "A & S Urbanseat")).toEqual(["nilkamal", "Winsome", "A&S Urbanseat"]);
  });

  test("returns nothing for a non-list", () => {
    expect(collectBrands(undefined)).toEqual([]);
    expect(collectBrands({ data: [] })).toEqual([]);
  });
});

// ── Customer reviews ─────────────────────────────────────────────────────────

const product = (id) => db.products.find((p) => p.id === id);
const approvedFor = (id) =>
  db.reviews.filter((r) => r.productId === id && r.status === "approved");

describe("selectReviews", () => {
  test("keeps approved reviews with enough text, newest first, with their product", () => {
    const entries = [11, 21, 37].map((id) => ({ product: product(id), reviews: approvedFor(id) }));
    const selected = selectReviews(entries);
    expect(selected.map((r) => r.id)).toEqual([26, 11, 10, 15, 14]);
    expect(selected[0].product).toEqual({ id: 11, name: "Covered Plastic Shoe Rack", slug: "covered-plastic-shoe-rack" });
    expect(selected[0].body).toBe(db.reviews.find((r) => r.id === 26).body);
  });

  test("drops pending and rejected reviews, short texts, other products' reviews and repeats", () => {
    const base = { productId: 1, rating: 4, createdAt: "2026-09-01T00:00:00.000Z", userName: "A." };
    const long = "A comfortable chair that has held up well in daily use so far.";
    const reviews = [
      { ...base, id: 1, body: long, status: "approved" },
      { ...base, id: 2, body: long, status: "pending" },
      { ...base, id: 3, body: long, status: "rejected" },
      { ...base, id: 4, body: "Too short to quote here.", status: "approved" },
      { ...base, id: 5, body: `   ${"x".repeat(39)}   ` },
      { ...base, id: 6, body: long, productId: 2 },
      { ...base, id: 1, body: long, status: "approved" },
      { ...base, id: 7, body: long }, // no status field: the endpoint already filtered
      null,
    ];
    expect(selectReviews([{ product: { id: 1, name: "Chair", slug: "chair" }, reviews }]).map((r) => r.id)).toEqual([
      1, 7,
    ]);
  });

  test(`keeps at most ${MAX_REVIEWS}`, () => {
    const reviews = Array.from({ length: 14 }, (_, index) => ({
      id: index + 1,
      productId: 1,
      status: "approved",
      body: "Long enough to be quoted as a customer review on the page.",
      createdAt: `2026-0${(index % 9) + 1}-10T00:00:00.000Z`,
    }));
    const selected = selectReviews([{ product: { id: 1, name: "Chair" }, reviews }]);
    expect(selected).toHaveLength(MAX_REVIEWS);
    const times = selected.map((r) => Date.parse(r.createdAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});

describe("loadFeaturedReviews", () => {
  test("reads each distinct featured product once, at most eight, and tolerates failures", async () => {
    apiService.products.getReviews.mockImplementation((id) =>
      id === 21 ? Promise.reject(new Error("500")) : Promise.resolve(approvedFor(id))
    );
    const featured = db.products.filter((p) => p.featured); // 14 products
    const selected = await loadFeaturedReviews([featured[0], ...featured]);
    expect(apiService.products.getReviews.mock.calls.map(([id]) => id)).toEqual(
      featured.slice(0, 8).map((p) => p.id)
    );
    // 21's reviews failed to load; the rest are the seeded approved ones.
    expect(selected.map((r) => r.id)).toEqual([26, 15, 22, 14, 20]);
  });

  test("makes no call without products", async () => {
    await expect(loadFeaturedReviews([])).resolves.toEqual([]);
    await expect(loadFeaturedReviews(undefined)).resolves.toEqual([]);
    expect(apiService.products.getReviews).not.toHaveBeenCalled();
  });
});

// ── Our promise ──────────────────────────────────────────────────────────────

const SETTINGS = db.settings;
const SHIPPING = db.shipping_methods.filter((m) => m.isActive);
const step = (key) => PROMISE_STEPS.find((s) => s.dataKey === key);

describe("formatDeliveryDays", () => {
  test.each([
    ["7-10", "7–10"],
    ["3 - 5", "3–5"],
    ["7–10", "7–10"],
    ["5", "5"],
    [7, "7"],
  ])("%p → %p", (value, expected) => {
    expect(formatDeliveryDays(value)).toBe(expected);
  });

  test.each([null, undefined, "", "0", "0-0", "soon", "7 to 10"])("%p → null", (value) => {
    expect(formatDeliveryDays(value)).toBeNull();
  });
});

describe("promiseValues", () => {
  test("reads the seeded settings and shipping methods", () => {
    const data = { settings: SETTINGS, shipping: SHIPPING };
    expect(promiseValues("payment", data)).toEqual({ cod: true });
    expect(promiseValues("delivery", data)).toEqual({ days: "7–10", threshold: "above ₹9,999" });
    expect(promiseValues("returns", data)).toEqual({ returns: RETURNS_DAYS });
  });

  test("backs nothing without data", () => {
    expect(promiseValues("payment", null)).toEqual({ cod: false });
    expect(promiseValues("delivery", null)).toEqual({ days: null, threshold: null });
    expect(promiseValues("unknown", null)).toEqual({});
  });

  test("takes the days from the Standard method only", () => {
    const express = SHIPPING.filter((m) => !/standard/i.test(m.name));
    expect(promiseValues("delivery", { shipping: express })).toEqual({ days: null, threshold: null });
    const inactive = SHIPPING.map((m) => ({ ...m, isActive: false }));
    expect(promiseValues("delivery", { shipping: inactive }).days).toBeNull();
  });

  test("hides the returns window at 0", () => {
    STOREFRONT_CONFIG.returnsWindowDays = 0;
    expect(promiseValues("returns", null)).toEqual({ returns: null });
  });
});

describe("resolvePromiseBody", () => {
  const data = { settings: SETTINGS, shipping: SHIPPING };

  test("fills every step from the seeded data", () => {
    expect(resolvePromiseBody(step("payment"), data)).toBe(
      "Check out securely online with cards, UPI or net banking. Or choose cash on delivery and pay when your furniture arrives."
    );
    expect(resolvePromiseBody(step("delivery"), data)).toBe(
      "Standard delivery brings your order to your door in 7–10 business days. Orders above ₹9,999 ship free."
    );
    expect(resolvePromiseBody(step("returns"), data)).toBe(
      `Eligible pieces can be returned within ${RETURNS_DAYS} days of delivery. If anything is not right, talk to us.`
    );
  });

  test("mentions cash on delivery only while it is enabled", () => {
    const off = { ...data, settings: { ...SETTINGS, payment: { ...SETTINGS.payment, codEnabled: false } } };
    const body = resolvePromiseBody(step("payment"), off);
    expect(body).toBe("Check out securely online with cards, UPI or net banking.");
    expect(body).not.toMatch(/cash/i);
  });

  test("drops only the sentence whose number is missing, never guessing one", () => {
    const noFree = { ...data, shipping: SHIPPING.map((m) => ({ ...m, freeAbove: null })) };
    expect(resolvePromiseBody(step("delivery"), noFree)).toBe(
      "Standard delivery brings your order to your door in 7–10 business days."
    );
    const noDays = { ...data, shipping: SHIPPING.map((m) => ({ ...m, estimatedDays: "" })) };
    expect(resolvePromiseBody(step("delivery"), noDays)).toBe("Orders above ₹9,999 ship free.");
  });

  test("falls back to the step's plain line when no sentence is backed", () => {
    expect(resolvePromiseBody(step("delivery"), { settings: null, shipping: [] })).toBe(
      step("delivery").fallback
    );
  });

  test("leaves the returns window out at 0 days", () => {
    STOREFRONT_CONFIG.returnsWindowDays = 0;
    const body = resolvePromiseBody(step("returns"), data);
    expect(body).toBe("If anything is not right, talk to us.");
    expect(body).not.toMatch(/\d/);
  });

  test("a step only sees its own data, and a single template string works", () => {
    const borrowed = { dataKey: "returns", body: "Free above {threshold}.", fallback: "Plain." };
    expect(resolvePromiseBody(borrowed, data)).toBe("Plain.");
    expect(resolvePromiseBody({ dataKey: "returns", body: "Within {returns} days." }, data)).toBe(
      `Within ${RETURNS_DAYS} days.`
    );
    expect(resolvePromiseBody({ dataKey: "payment", body: [] }, data)).toBe("");
    expect(resolvePromiseBody(null, data)).toBe("");
  });

  test("no step quotes a number that is not a live value", () => {
    const quoted = PROMISE_STEPS.map((s) => resolvePromiseBody(s, data)).join(" ");
    const numbers = quoted.match(/\d[\d,–]*/g);
    expect(numbers).toEqual(["7–10", "9,999", String(RETURNS_DAYS)]);
  });
});

describe("promiseBodyLayout", () => {
  test("lays out every sentence with fillers, quoting no real value", () => {
    PROMISE_STEPS.forEach((s) => {
      const layout = promiseBodyLayout(s);
      expect(layout).not.toMatch(/[{}]/);
      expect(layout).not.toMatch(/9,999|7–10/);
      expect(layout.split(". ").length).toBe([].concat(s.body).length);
    });
    expect(promiseBodyLayout(step("payment"))).toMatch(/cash on delivery/);
    expect(promiseBodyLayout(null)).toBe("");
  });
});

describe("loadPromiseData", () => {
  test("reads settings and shipping methods once each", async () => {
    apiService.settings.get.mockResolvedValue(SETTINGS);
    apiService.shipping.getMethods.mockResolvedValue(SHIPPING);
    await expect(loadPromiseData()).resolves.toEqual({ settings: SETTINGS, shipping: SHIPPING });
    expect(apiService.settings.get).toHaveBeenCalledTimes(1);
    expect(apiService.shipping.getMethods).toHaveBeenCalledTimes(1);
  });

  test("counts a failed read as no data", async () => {
    apiService.settings.get.mockRejectedValue(new Error("500"));
    apiService.shipping.getMethods.mockResolvedValue({ unexpected: true });
    await expect(loadPromiseData()).resolves.toEqual({ settings: null, shipping: [] });
  });
});
