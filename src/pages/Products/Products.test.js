import React from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../context/WishlistContext";
import { APP_DESCRIPTION } from "../../utils/constants";
import { buildCartItem, getProductMinPrice } from "../../utils/helpers";
import {
  buildCategoryMap,
  buildCategoryNav,
  searchProducts,
} from "../../components/SearchModal/searchData";
import db from "../../../db.json";
import Products from "./Products";

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    products: { getAll: jest.fn() },
    categories: { getAll: jest.fn() },
  },
}));
jest.mock("../../hooks/useCart", () => ({ useCart: jest.fn() }));
jest.mock("../../context/WishlistContext", () => ({ useWishlist: jest.fn() }));

// jsdom has no IntersectionObserver (Reveal uses one): report every observed
// element in view at once.
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe(target) {
    this.callback([{ isIntersecting: true, target }], this);
  }
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver;
  window.scrollTo = jest.fn();
});
afterAll(() => {
  delete window.IntersectionObserver;
});

// ── The seeded catalogue, served the way api.js serves it ──────────────────

const PRODUCTS = db.products;
const CATEGORIES = db.categories
  .filter((c) => c.isActive !== false)
  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
const bySlug = (slug) => CATEGORIES.find((c) => c.slug === slug);

let addToCart;
let toggleWishlist;
let wishlisted;

beforeEach(() => {
  apiService.products.getAll.mockResolvedValue(PRODUCTS);
  apiService.categories.getAll.mockResolvedValue(CATEGORIES);
  addToCart = jest.fn();
  toggleWishlist = jest.fn();
  wishlisted = new Set();
  useCart.mockReturnValue({ addToCart });
  useWishlist.mockReturnValue({ toggleWishlist, isInWishlist: (id) => wishlisted.has(id) });
});

afterEach(() => {
  jest.clearAllMocks();
  document.body.style.overflow = "";
});

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
};

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/products"
          element={
            <>
              <Products />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

const currentUrl = () => screen.getByTestId("location").textContent;
const params = () => new URLSearchParams(currentUrl().split("?")[1] || "");
const liveRegion = () => document.querySelector('[aria-live="polite"]');
const resultsText = () => liveRegion().textContent.replace(/\s+/g, " ").trim();
// Wait for the catalogue. State that the loaded render's effects set (the
// outline opening the active department, the URL re-applied to the fields)
// can land a little later in jsdom, so tests wait for it explicitly.
const waitForResults = () =>
  waitFor(() => expect(resultsText()).not.toBe("Loading pieces…"));
// The product and filter counts are visually hidden text after a comma; jsdom
// computes a space before it that browsers do not.
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const counted = (label, count, noun = "pieces") =>
  new RegExp(`^${escapeRegExp(label)}\\s?, ${count} ${noun}$`);
// The product an article (card or row) is named by.
const articleName = (article) =>
  document.getElementById(article.getAttribute("aria-labelledby")).textContent;
const rail = () => screen.getByRole("region", { name: "Filters" });
const results = () => screen.getByRole("region", { name: "Results" });
const chips = () => screen.queryByRole("list", { name: "Applied filters" });

// ── Deep links ───────────────────────────────────────────────────────────────

test("a leaf deep link names the category, walks its ancestors and lists its products", async () => {
  renderAt("/products?category=plastic-essentials-armchairs");
  expect(await screen.findByRole("heading", { level: 1, name: "Chairs with Arms" })).toBeInTheDocument();
  expect(screen.getByText(bySlug("plastic-essentials-armchairs").description)).toBeInTheDocument();

  const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
  expect(within(trail).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    "Home",
    "Furniture",
    "Plastic Furniture",
    "Essentials",
    "Chairs with Arms",
  ]);
  expect(within(trail).getByRole("link", { name: "Furniture" })).toHaveAttribute("href", "/products");
  expect(within(trail).getByRole("link", { name: "Plastic Furniture" })).toHaveAttribute(
    "href",
    "/products?category=plastic-furniture"
  );
  expect(within(trail).getByRole("link", { name: "Essentials" })).toHaveAttribute(
    "href",
    "/products?category=plastic-essentials"
  );
  expect(within(trail).getByText("Chairs with Arms")).toHaveAttribute("aria-current", "page");

  await waitForResults();
  expect(resultsText()).toBe("Showing 3 pieces");
  expect(screen.getAllByRole("article")).toHaveLength(3);
  expect(within(chips()).getByRole("button", { name: "Remove Chairs with Arms" })).toBeInTheDocument();
  expect(currentUrl()).toBe("/products?category=plastic-essentials-armchairs");
});

test("a department deep link with a sort and a page keeps all three", async () => {
  renderAt("/products?category=home-furniture&sort=price-low&page=2");
  await screen.findByRole("heading", { level: 1, name: "Home Furniture" });
  await waitForResults();
  expect(resultsText()).toBe("Showing 13–24 of 29 pieces");
  expect(params().get("page")).toBe("2");
  expect(params().get("sort")).toBe("price-low");
  expect(screen.getByRole("combobox", { name: "Sort" })).toHaveValue("price-low");
  expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");

  // Page 2 of the cheapest-first Home Furniture list (parent includes children).
  const scope = new Set(
    CATEGORIES.filter((c) => {
      let current = c;
      while (current) {
        if (current.slug === "home-furniture") return true;
        current = CATEGORIES.find((p) => p.id === current.parentId);
      }
      return false;
    }).map((c) => c.id)
  );
  const expected = PRODUCTS.filter((p) => scope.has(p.categoryId))
    .sort((a, b) => getProductMinPrice(a).sellingPrice - getProductMinPrice(b).sellingPrice)
    .slice(12, 24)
    .map((p) => p.name);
  expect(screen.getAllByRole("article").map(articleName)).toEqual(expected);
});

test("a search deep link titles the results and offers the query as a chip", async () => {
  renderAt("/products?search=chair");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Results for “chair”" })
  ).toBeInTheDocument();
  await waitForResults();
  expect(resultsText()).toBe("Showing 1–12 of 42 pieces");
  const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
  expect(within(trail).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    "Home",
    "Furniture",
    "Results for “chair”",
  ]);

  fireEvent.click(within(chips()).getByRole("button", { name: "Remove search “chair”" }));
  await waitFor(() => expect(currentUrl()).toBe("/products"));
  expect(screen.getByRole("heading", { level: 1, name: "All furniture" })).toBeInTheDocument();
});

test("a search lists exactly what the search overlay counts, category names included", async () => {
  const map = buildCategoryMap(CATEGORIES);
  const { groups } = buildCategoryNav(CATEGORIES);
  const overlay = searchProducts(PRODUCTS, map, groups, "office", "All");
  renderAt("/products?search=office");
  await waitForResults();
  // The overlay's 20: the waiting chairs and benches match through their
  // category's slug (office-essentials-waiting, office-premium-waiting), which
  // the old name, tag, brand and description filter missed (it found 14).
  expect(resultsText()).toBe(`Showing 1–12 of ${overlay.length} pieces`);
  const names = screen.getAllByRole("article").map(articleName);
  expect(names).toContain("2-Seater Waiting Chair");
  expect(names.every((name) => overlay.some((p) => p.name === name))).toBe(true);
});

test("a legacy numeric category link is rewritten to its slug", async () => {
  renderAt("/products?category=1");
  await screen.findByRole("heading", { level: 1, name: "Plastic Furniture" });
  await waitFor(() => expect(currentUrl()).toBe("/products?category=plastic-furniture"));
  await waitForResults();
  expect(resultsText()).toBe("Showing 1–12 of 21 pieces");
  expect(within(rail()).getByRole("checkbox", { name: counted("Plastic Furniture", 21) })).toBeChecked();
});

test("with no category the page is All furniture", async () => {
  renderAt("/products");
  expect(await screen.findByRole("heading", { level: 1, name: "All furniture" })).toBeInTheDocument();
  expect(screen.getByText(APP_DESCRIPTION)).toBeInTheDocument();
  const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
  expect(within(trail).queryByRole("link", { name: "Furniture" })).not.toBeInTheDocument();
  expect(within(trail).getByText("All furniture")).toHaveAttribute("aria-current", "page");
  await waitForResults();
  expect(resultsText()).toBe("Showing 1–12 of 84 pieces");
  expect(chips()).not.toBeInTheDocument();
});

test("several categories read as a list in the title", async () => {
  renderAt("/products?category=sofas,beds");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Sofas and Beds" })
  ).toBeInTheDocument();
  await waitForResults();
  expect(resultsText()).toBe("Showing 7 pieces");
});

// ── Category outline ─────────────────────────────────────────────────────────

test("the outline opens the active department only, and its toggle folds and unfolds", async () => {
  renderAt("/products?category=plastic-essentials-armchairs");
  await waitForResults();
  const plastic = within(rail()).getByRole("button", { name: "Plastic Furniture subcategories" });
  const office = within(rail()).getByRole("button", { name: "Office Chairs subcategories" });
  await waitFor(() => expect(plastic).toHaveAttribute("aria-expanded", "true"));
  expect(office).toHaveAttribute("aria-expanded", "false");
  expect(document.getElementById(office.getAttribute("aria-controls"))).not.toBeVisible();
  // Flat departments have no toggle.
  expect(
    within(rail()).queryByRole("button", { name: "Café & Restaurant Chairs subcategories" })
  ).not.toBeInTheDocument();

  // Nested lists carry the hierarchy: the ticked leaf sits in Essentials' list.
  const essentials = within(rail()).getByRole("checkbox", { name: counted("Essentials", 11) });
  expect(
    within(essentials.closest("li")).getByRole("checkbox", { name: counted("Chairs with Arms", 3) })
  ).toBeChecked();

  fireEvent.click(office);
  expect(office).toHaveAttribute("aria-expanded", "true");
  const officePanel = document.getElementById(office.getAttribute("aria-controls"));
  expect(officePanel).toBeVisible();
  // Office Essentials and Office Premium each hold "High-Back Chairs".
  expect(
    within(officePanel).getAllByRole("checkbox", { name: counted("High-Back Chairs", 3) })
  ).toHaveLength(2);
  fireEvent.click(office);
  expect(office).toHaveAttribute("aria-expanded", "false");
  expect(officePanel).not.toBeVisible();
});

test("ticking a category filters, resets the page and never folds the department away", async () => {
  renderAt("/products?category=plastic-essentials-armchairs&page=1");
  await waitForResults();
  const premium = await within(rail()).findByRole("checkbox", { name: counted("Premium", 7) });
  fireEvent.click(premium);
  await waitFor(() =>
    expect(params().get("category")).toBe("plastic-essentials-armchairs,plastic-premium")
  );
  expect(resultsText()).toBe("Showing 10 pieces");
  expect(screen.getByRole("heading", { level: 1, name: "Chairs with Arms and Premium" })).toBeInTheDocument();

  // Unticking everything in the department leaves it open under the pointer.
  fireEvent.click(
    within(rail())
      .getAllByRole("checkbox", { name: counted("Chairs with Arms", 3) })
      .find((box) => box.checked)
  );
  fireEvent.click(within(rail()).getByRole("checkbox", { name: counted("Premium", 7) }));
  await waitFor(() => expect(currentUrl()).toBe("/products"));
  expect(
    within(rail()).getByRole("button", { name: "Plastic Furniture subcategories" })
  ).toHaveAttribute("aria-expanded", "true");
});

test("a category chip removes that category", async () => {
  renderAt("/products?category=sofas,beds");
  await waitForResults();
  fireEvent.click(within(chips()).getByRole("button", { name: "Remove Beds" }));
  await waitFor(() => expect(params().get("category")).toBe("sofas"));
  expect(screen.getByRole("heading", { level: 1, name: "Sofas" })).toBeInTheDocument();
});

// ── Price ────────────────────────────────────────────────────────────────────

test("Min and Max apply with the button, swap when inverted, and show as a chip", async () => {
  renderAt("/products");
  await waitForResults();
  const min = within(rail()).getByLabelText("Min");
  const max = within(rail()).getByLabelText("Max");
  expect(min).toHaveAttribute("inputmode", "numeric");
  // Typed text keeps its digits (retried until the load's effects have run).
  await waitFor(() => {
    fireEvent.change(min, { target: { value: "₹5,000" } });
    expect(min).toHaveValue("5000");
  });
  fireEvent.change(max, { target: { value: "1000" } });
  fireEvent.click(within(rail()).getByRole("button", { name: "Apply price" }));
  await waitFor(() => expect(params().get("min_price")).toBe("1000"));
  expect(params().get("max_price")).toBe("5000");
  expect(min).toHaveValue("1000");
  expect(max).toHaveValue("5000");
  const inRange = PRODUCTS.filter((p) => {
    const price = getProductMinPrice(p).sellingPrice;
    return price >= 1000 && price <= 5000;
  }).length;
  expect(resultsText()).toBe(`Showing 1–12 of ${inRange} pieces`);
  expect(within(chips()).getByRole("button", { name: "Remove ₹1,000 – ₹5,000" })).toBeInTheDocument();
  // The matching quick range reads as pressed.
  expect(within(rail()).getByRole("button", { name: "₹1,000 – ₹5,000" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  fireEvent.click(within(chips()).getByRole("button", { name: "Remove ₹1,000 – ₹5,000" }));
  await waitFor(() => expect(currentUrl()).toBe("/products"));
  expect(min).toHaveValue("");
});

test("a quick range applies its bounds; pressing it again clears them", async () => {
  renderAt("/products");
  await waitForResults();
  const above = within(rail()).getByRole("button", { name: "Above ₹5,000" });
  fireEvent.click(above);
  await waitFor(() => expect(params().get("min_price")).toBe("5000"));
  expect(params().get("max_price")).toBeNull();
  expect(above).toHaveAttribute("aria-pressed", "true");
  expect(within(chips()).getByRole("button", { name: "Remove Above ₹5,000" })).toBeInTheDocument();
  const above5000 = PRODUCTS.filter((p) => getProductMinPrice(p).sellingPrice >= 5000).length;
  expect(resultsText()).toBe(`Showing 1–12 of ${above5000} pieces`);

  fireEvent.click(above);
  await waitFor(() => expect(params().get("min_price")).toBeNull());
  expect(above).toHaveAttribute("aria-pressed", "false");
});

test("Under ₹500 matches nothing in the seeded catalogue and says so", async () => {
  renderAt("/products");
  await waitForResults();
  fireEvent.click(within(rail()).getByRole("button", { name: "Under ₹500" }));
  await waitFor(() => expect(params().get("max_price")).toBe("500"));
  expect(resultsText()).toBe("No pieces to show");
  expect(screen.getByRole("heading", { level: 2, name: "No pieces to show." })).toBeInTheDocument();
  expect(within(chips()).getByRole("button", { name: "Remove Under ₹500" })).toBeInTheDocument();
});

// ── Rating, discount, stock, brand (session-only) ───────────────────────────

test("a rating filters, a second press clears it, and the URL only drops the page", async () => {
  renderAt("/products?page=2");
  await waitForResults();
  const four = within(rail()).getByRole("radio", { name: "4 stars & up" });
  fireEvent.click(four);
  await waitFor(() => expect(four).toBeChecked());
  const fourUp = PRODUCTS.filter((p) => (p.rating || 0) >= 4).length;
  expect(resultsText()).toBe(`Showing 1–12 of ${fourUp} pieces`);
  expect(currentUrl()).toBe("/products");
  expect(within(chips()).getByRole("button", { name: "Remove 4 stars & up" })).toBeInTheDocument();

  fireEvent.click(four);
  await waitFor(() => expect(four).not.toBeChecked());
  expect(resultsText()).toBe("Showing 1–12 of 84 pieces");
});

test("discount, in-stock and brand filters narrow the results and show as chips", async () => {
  renderAt("/products");
  await waitForResults();

  fireEvent.click(within(rail()).getByRole("radio", { name: "10% or more" }));
  const discounted = PRODUCTS.filter((p) => getProductMinPrice(p).discount >= 10).length;
  await waitFor(() => expect(resultsText()).toBe(`Showing 1–12 of ${discounted} pieces`));
  expect(within(chips()).getByRole("button", { name: "Remove 10% off or more" })).toBeInTheDocument();

  const inStock = within(rail()).getByRole("switch", { name: "In stock only" });
  fireEvent.click(inStock);
  expect(inStock).toBeChecked();
  expect(within(chips()).getByRole("button", { name: "Remove In stock only" })).toBeInTheDocument();

  fireEvent.click(within(rail()).getByRole("checkbox", { name: "Winsome" }));
  const winsomeOnSale = PRODUCTS.filter(
    (p) => p.brand === "Winsome" && getProductMinPrice(p).discount >= 10 && p.stock > 0
  ).length;
  await waitFor(() =>
    expect(resultsText()).toBe(`Showing ${winsomeOnSale} ${winsomeOnSale === 1 ? "piece" : "pieces"}`)
  );
  expect(within(chips()).getByRole("button", { name: "Remove Winsome" })).toBeInTheDocument();
  // Session-only facets stay out of the URL.
  expect(currentUrl()).toBe("/products");

  // The phone toolbar's Filters button counts them (the search would not count).
  expect(within(results()).getByRole("button", { name: counted("Filters", 3, "applied") })).toBeInTheDocument();
});

test("Clear all resets every filter and the sort, but keeps per_page", async () => {
  renderAt("/products?category=sofas&sort=price-high&per_page=24&min_price=100&search=sofa");
  await waitForResults();
  fireEvent.click(within(rail()).getByRole("checkbox", { name: "Nilkamal" }));
  fireEvent.click(within(rail()).getByRole("button", { name: "Clear all" }));
  await waitFor(() => expect(currentUrl()).toBe("/products?per_page=24"));
  expect(screen.getByRole("combobox", { name: "Sort" })).toHaveValue("relevance");
  expect(within(rail()).getByRole("checkbox", { name: "Nilkamal" })).not.toBeChecked();
  expect(chips()).not.toBeInTheDocument();
});

// ── Sort, per page, pagination, view ────────────────────────────────────────

test("sorting writes the URL; an alias deep link maps to its option", async () => {
  renderAt("/products?sort=popular");
  await waitForResults();
  const sort = screen.getByRole("combobox", { name: "Sort" });
  expect(sort).toHaveValue("popularity");
  fireEvent.change(sort, { target: { value: "price-high" } });
  await waitFor(() => expect(params().get("sort")).toBe("price-high"));
  const priciest = [...PRODUCTS].sort(
    (a, b) => getProductMinPrice(b).sellingPrice - getProductMinPrice(a).sellingPrice
  )[0];
  expect(articleName(screen.getAllByRole("article")[0])).toBe(priciest.name);
  fireEvent.change(sort, { target: { value: "relevance" } });
  await waitFor(() => expect(params().get("sort")).toBeNull());
});

test("pagination: numbers, Previous / Next, the current page, and per page", async () => {
  renderAt("/products");
  await waitForResults();
  const pagination = screen.getByRole("navigation", { name: "Pagination" });
  expect(within(pagination).getByRole("button", { name: "Previous page" })).toBeDisabled();
  expect(within(pagination).getByRole("button", { name: "Page 1" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  // 84 products, 12 a page: 1 2 3 … 7
  expect(within(pagination).getAllByRole("button", { name: /^Page \d+$/ }).map((b) => b.textContent)).toEqual([
    "1",
    "2",
    "3",
    "7",
  ]);

  fireEvent.click(within(pagination).getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(params().get("page")).toBe("2"));
  expect(resultsText()).toBe("Showing 13–24 of 84 pieces");
  expect(within(pagination).getByRole("button", { name: "Page 2" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  expect(window.scrollTo).toHaveBeenCalled();

  fireEvent.click(within(pagination).getByRole("button", { name: "Page 7" }));
  await waitFor(() => expect(params().get("page")).toBe("7"));
  expect(within(pagination).getByRole("button", { name: "Next page" })).toBeDisabled();

  fireEvent.change(within(pagination).getByRole("combobox", { name: "Per page" }), {
    target: { value: "24" },
  });
  await waitFor(() => expect(currentUrl()).toBe("/products?per_page=24"));
  expect(resultsText()).toBe("Showing 1–24 of 84 pieces");
  expect(screen.getAllByRole("article")).toHaveLength(24);
});

test("a page past the end is clamped to the last page once the catalogue has loaded", async () => {
  renderAt("/products?category=sofas&page=9");
  await waitForResults();
  await waitFor(() => expect(currentUrl()).toBe("/products?category=sofas"));
  expect(resultsText()).toBe("Showing 4 pieces");
});

test("the view switch is a pair of pressed buttons; list rows carry the card's rules", async () => {
  renderAt("/products?category=plastic-essentials-armchairs");
  await waitForResults();
  const grid = screen.getByRole("button", { name: "Grid view" });
  const list = screen.getByRole("button", { name: "List view" });
  expect(grid).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(list);
  expect(list).toHaveAttribute("aria-pressed", "true");
  expect(grid).toHaveAttribute("aria-pressed", "false");

  const rows = screen.getAllByRole("article");
  expect(rows).toHaveLength(3);
  const product = PRODUCTS.find((p) => p.name === "Ribbed-Back Plastic Armchair");
  const row = rows.find((r) => r.textContent.includes(product.name));
  expect(within(row).getByText(product.shortDescription)).toBeInTheDocument();
  expect(within(row).getByText("Sale")).toBeInTheDocument();
  expect(within(row).getByRole("img", { name: /^Rated .* out of 5, 2 reviews$/ })).toBeInTheDocument();
  expect(within(row).getByRole("link", { name: product.name })).toHaveAttribute(
    "href",
    `/products/${product.slug}`
  );

  fireEvent.click(within(row).getByRole("button", { name: `Add to cart, ${product.name}` }));
  expect(addToCart).toHaveBeenCalledWith(buildCartItem(product));
  fireEvent.click(within(row).getByRole("button", { name: `Save ${product.name} to wishlist` }));
  expect(toggleWishlist).toHaveBeenCalledWith(product);
});

// ── Cards ────────────────────────────────────────────────────────────────────

test("the grid is the storefront ProductCard, wired to the cart and the wishlist", async () => {
  wishlisted = new Set([PRODUCTS[0].id]);
  renderAt("/products");
  await waitForResults();
  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(12);
  const first = cards[0];
  expect(within(first).getByRole("button", { name: `Save ${PRODUCTS[0].name} to wishlist` })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  fireEvent.click(within(first).getByRole("button", { name: `Add to cart, ${PRODUCTS[0].name}` }));
  expect(addToCart).toHaveBeenCalledWith(buildCartItem(PRODUCTS[0]));
  fireEvent.click(within(cards[1]).getByRole("button", { name: `Save ${PRODUCTS[1].name} to wishlist` }));
  expect(toggleWishlist).toHaveBeenCalledWith(PRODUCTS[1]);
  // No placeholder service URL is introduced by the page.
  expect(document.body.innerHTML).not.toMatch(/placehold\.co\/400x300/);
});

test("“Only N left” follows each product's own low-stock threshold", async () => {
  const [a, b, c] = PRODUCTS;
  apiService.products.getAll.mockResolvedValue([
    { ...a, stock: 6, lowStockThreshold: 8 }, // low: 6 ≤ 8
    { ...b, stock: 6, lowStockThreshold: 5 }, // not low: 6 > 5
    { ...c, stock: 0, lowStockThreshold: 8 }, // sold out, not "Only 0 left"
  ]);
  renderAt("/products");
  await waitForResults();
  expect(screen.getAllByText(/^Only \d+ left$/).map((n) => n.textContent)).toEqual(["Only 6 left"]);
  const soldOut = screen.getAllByRole("article")[2];
  expect(within(soldOut).getByRole("button", { name: `Sold out, ${c.name}` })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "List view" }));
  expect(screen.getAllByText(/^Only \d+ left$/).map((n) => n.textContent)).toEqual(["Only 6 left"]);
});

// ── States ───────────────────────────────────────────────────────────────────

test("while loading: card skeletons for a page, a busy region and the live text", async () => {
  let resolve;
  apiService.products.getAll.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    })
  );
  renderAt("/products?per_page=24");
  expect(resultsText()).toBe("Loading pieces…");
  const body = liveRegion().closest("section").querySelector('[aria-busy="true"]');
  expect(body).not.toBeNull();
  expect(body.querySelectorAll("li")).toHaveLength(24);
  expect(screen.queryAllByRole("article")).toHaveLength(0);
  await act(async () => resolve(PRODUCTS));
  await waitForResults();
  expect(liveRegion()).toHaveAttribute("aria-atomic", "true");
  expect(document.querySelector('[aria-busy="true"]')).toBeNull();
});

test("a failed read shows the error panel, and Try again reloads", async () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  apiService.products.getAll.mockRejectedValueOnce(new Error("offline"));
  renderAt("/products?category=sofas");
  expect(
    await screen.findByRole("heading", { level: 2, name: "We couldn’t load the catalogue." })
  ).toBeInTheDocument();
  expect(resultsText()).toBe("Couldn’t load the catalogue");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(resultsText()).toBe("Showing 4 pieces"));
  expect(apiService.products.getAll).toHaveBeenCalledTimes(2);
  spy.mockRestore();
});

test("an empty search quotes the query and clears everything", async () => {
  renderAt("/products?search=zzzz&sort=newest");
  expect(await screen.findByRole("heading", { level: 2, name: "No pieces to show." })).toBeInTheDocument();
  expect(screen.getByText(/We couldn.t find anything matching “zzzz”/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));
  await waitFor(() => expect(currentUrl()).toBe("/products"));
  expect(resultsText()).toBe("Showing 1–12 of 84 pieces");
});

// ── The filter sheet ─────────────────────────────────────────────────────────

test("the Filters button opens the sheet: focus, live count, Escape and focus back", async () => {
  renderAt("/products?category=office-chairs");
  await waitForResults();
  const trigger = within(results()).getByRole("button", { name: counted("Filters", 1, "applied") });
  expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  fireEvent.click(trigger);
  const sheet = screen.getByRole("dialog", { name: "Filters" });
  expect(sheet).toHaveAttribute("aria-modal", "true");
  expect(within(sheet).getByRole("button", { name: "Close" })).toHaveFocus();
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(document.body.style.overflow).toBe("hidden");

  // The sheet holds the same filters; ticking one updates "Show N results".
  fireEvent.click(within(sheet).getByRole("checkbox", { name: counted("Premium", 8) }));
  await waitFor(() =>
    expect(within(sheet).getByRole("button", { name: "Show 16 results" })).toBeInTheDocument()
  );
  fireEvent.click(within(sheet).getByRole("switch", { name: "In stock only" }));
  expect(within(rail()).getByRole("switch", { name: "In stock only" })).toBeChecked();

  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
  expect(document.body.style.overflow).toBe("");
});

test("the sheet's Show N results closes it; Clear all is off with nothing to clear", async () => {
  renderAt("/products");
  await waitForResults();
  const trigger = within(results()).getByRole("button", { name: "Filters" });
  fireEvent.click(trigger);
  const sheet = screen.getByRole("dialog", { name: "Filters" });
  expect(within(sheet).getByRole("button", { name: "Clear all" })).toBeDisabled();
  fireEvent.click(within(sheet).getByRole("button", { name: "Show 84 results" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
});
