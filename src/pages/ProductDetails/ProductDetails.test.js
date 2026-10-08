import React from "react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useReducedMotion } from "framer-motion";
import apiService from "../../services/api";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../context/WishlistContext";
import { buildCartItem } from "../../utils/helpers";
import db from "../../../db.json";
import ProductDetails from "./ProductDetails";

jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(() => false),
}));

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    products: {
      getBySlug: jest.fn(),
      getById: jest.fn(),
      getReviews: jest.fn(),
      getRelated: jest.fn(),
      getFrequentlyBoughtTogether: jest.fn(),
    },
    categories: { getById: jest.fn() },
    settings: { get: jest.fn() },
    shipping: { getMethods: jest.fn() },
  },
}));
jest.mock("../../hooks/useCart", () => ({ useCart: jest.fn() }));
jest.mock("../../context/WishlistContext", () => ({ useWishlist: jest.fn() }));

// The sticky bar watches the buy box through an IntersectionObserver; tests
// move the buy box in and out of view by hand.
let observers = [];
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    observers.push(this);
  }
  observe(target) {
    this.target = target;
  }
  unobserve() {}
  disconnect() {
    observers = observers.filter((o) => o !== this);
  }
}
const setBuyBoxInView = (isIntersecting) =>
  act(() => {
    observers.forEach((o) => o.callback([{ isIntersecting, target: o.target }], o));
  });

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver;
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});
afterAll(() => {
  delete window.IntersectionObserver;
});

// ── The seeded data, served the way api.js serves it ───────────────────────
const PRODUCTS = db.products;
const product = (slug) => PRODUCTS.find((p) => p.slug === slug);
const categoryOf = (slug) =>
  db.categories.find((c) => String(c.id) === String(product(slug).categoryId));
const notFoundError = () => Object.assign(new Error("Not found"), { response: { status: 404 } });
const approvedReviews = (productId) =>
  db.reviews.filter((r) => String(r.productId) === String(productId) && r.status === "approved");
const ACTIVE_METHODS = db.shipping_methods.filter((m) => m.isActive);

let addToCart;
let toggleWishlist;
let wishlisted;

beforeEach(() => {
  observers = [];
  localStorage.clear();
  apiService.products.getBySlug.mockImplementation(async (slug) => product(slug));
  apiService.products.getById.mockImplementation(async (id) => {
    const found = PRODUCTS.find((p) => String(p.id) === String(id));
    if (!found) throw notFoundError();
    return found;
  });
  apiService.products.getReviews.mockImplementation(async (id) => approvedReviews(id));
  apiService.products.getRelated.mockResolvedValue([]);
  apiService.products.getFrequentlyBoughtTogether.mockResolvedValue([]);
  apiService.categories.getById.mockImplementation(async (id) => {
    const found = db.categories.find((c) => String(c.id) === String(id));
    if (!found) throw notFoundError();
    return found;
  });
  apiService.settings.get.mockResolvedValue(db.settings);
  apiService.shipping.getMethods.mockResolvedValue(ACTIVE_METHODS);
  addToCart = jest.fn();
  toggleWishlist = jest.fn();
  wishlisted = new Set();
  useCart.mockReturnValue({ addToCart });
  useWishlist.mockReturnValue({ toggleWishlist, isInWishlist: (id) => wishlisted.has(id) });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  useReducedMotion.mockReturnValue(false);
});

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
};

// A link elsewhere on the screen, so a test can move to another product while
// the page stays mounted (as the header's links do).
const GoTo = ({ to }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      Go to {to}
    </button>
  );
};

const renderAt = (path, { goTo } = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/products/:slug"
          element={
            <>
              <ProductDetails />
              <LocationProbe />
              {[].concat(goTo || []).map((to) => (
                <GoTo key={to} to={to} />
              ))}
            </>
          }
        />
        <Route path="/checkout" element={<LocationProbe />} />
        <Route path="/products" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

const title = () => screen.findByRole("heading", { level: 1 });
// The buy box (the info column), so the description tab's specification table
// and the sticky bar, which repeat some of its text, are left out.
const info = () => within(screen.getByRole("heading", { level: 1 }).parentElement);
const eyebrow = () => screen.getByRole("heading", { level: 1 }).parentElement.querySelector(".eyebrow");
const currentPath = () => screen.getByTestId("location").textContent;
const buyBox = () => screen.getByRole("button", { name: /^(Add to cart|Added|Out of stock)$/ }).parentElement;
const statusRegion = () =>
  Array.from(document.querySelectorAll('[role="status"]')).find((el) =>
    el.classList.contains("sf-visually-hidden")
  );
const trail = () =>
  within(screen.getByRole("navigation", { name: "Breadcrumb" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);
const waitForStoreData = () =>
  waitFor(() =>
    expect(screen.getByRole("list", { name: "Our promises" })).not.toHaveAttribute("aria-busy")
  );
// This dom-testing-library computes "What customers *say*." as "What
// customers say ." (a space after the <em>); browsers do not.
const accentName = (text) => (name) => name.replace(/ (?=[.,!?])/g, "") === text;
const reviewsRegion = () => screen.getByRole("region", { name: accentName("What customers say.") });
const pageNav = () => screen.getByRole("navigation", { name: "On this page" });
// The elements scrollIntoView was called on (the jump targets), in order.
const scrolledTo = () => Element.prototype.scrollIntoView.mock.instances;
// The product, then everything it starts: the category trail, the store data,
// the reviews and the AOV reads, so no update lands after a test has ended.
const flush = () => act(async () => {});
const loaded = async () => {
  const heading = await title();
  await waitFor(() => expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument());
  await waitForStoreData();
  await flush();
  return heading;
};

// ── Load, trail and the first screen ───────────────────────────────────────

test("renders the first screen for a slug: trail, eyebrow, title, price and gallery", async () => {
  renderAt("/products/covered-plastic-shoe-rack");
  expect(await loaded()).toHaveTextContent("Covered Plastic Shoe Rack");

  // The category's full trail, linked with canonical slugs, the product last.
  await waitFor(() =>
    expect(trail()).toEqual([
      "Home",
      "Plastic Furniture",
      "Essentials",
      "Shoe Racks",
      "Covered Plastic Shoe Rack",
    ])
  );
  const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
  expect(within(nav).getByRole("link", { name: "Plastic Furniture" })).toHaveAttribute(
    "href",
    "/products?category=plastic-furniture"
  );
  expect(within(nav).getByRole("link", { name: "Shoe Racks" })).toHaveAttribute(
    "href",
    "/products?category=plastic-shoe-racks"
  );
  expect(within(nav).getByText("Covered Plastic Shoe Rack")).toHaveAttribute("aria-current", "page");

  expect(eyebrow()).toHaveTextContent("Nilkamal");
  expect(info().getByText("₹1,899.00")).toBeInTheDocument();
  expect(info().getByText("Save ₹300.00")).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Covered Plastic Shoe Rack, image 1 of 3" })).toBeInTheDocument();
  expect(screen.getByText("Sale")).toBeInTheDocument();
  expect(info().getByText("SKU:")).toHaveTextContent("SKU: PLE-SHR-03-2S");
  expect(info().getByText("In stock")).toBeInTheDocument();
});

test("the eyebrow falls back to the category name, and a flat category's trail is one crumb", async () => {
  renderAt("/products/lobby-set");
  expect(await loaded()).toHaveTextContent("Lobby Set");
  await waitFor(() => expect(trail()).toEqual(["Home", "Outdoor Furniture", "Lobby Set"]));
  // brand "" → the category's name as the eyebrow.
  await waitFor(() => expect(eyebrow()).toHaveTextContent("Outdoor Furniture"));
});

test("a failed category read leaves Home › product, and the brand eyebrow stays", async () => {
  apiService.categories.getById.mockRejectedValue(notFoundError());
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  await waitFor(() => expect(trail()).toEqual(["Home", "Covered Plastic Shoe Rack"]));
  expect(eyebrow()).toHaveTextContent("Nilkamal");
});

test("a legacy numeric id loads the product once and redirects to the canonical slug", async () => {
  renderAt("/products/11");
  await waitFor(() => expect(currentPath()).toBe("/products/covered-plastic-shoe-rack"));
  expect(await loaded()).toHaveTextContent("Covered Plastic Shoe Rack");
  expect(apiService.products.getById).toHaveBeenCalledTimes(1);
  expect(apiService.products.getById).toHaveBeenCalledWith("11");
  // The redirect only renames the URL of the product on screen: nothing is
  // read again and the page does not jump.
  expect(apiService.products.getBySlug).not.toHaveBeenCalled();
  expect(apiService.products.getReviews).toHaveBeenCalledTimes(1);
  expect(apiService.products.getRelated).toHaveBeenCalledTimes(1);
  expect(apiService.products.getFrequentlyBoughtTogether).toHaveBeenCalledTimes(1);
  expect(window.scrollTo).toHaveBeenCalledTimes(1);
});

test("after a legacy redirect, the next products load as usual", async () => {
  renderAt("/products/11", {
    goTo: ["/products/lobby-set", "/products/covered-plastic-shoe-rack"],
  });
  expect(await loaded()).toHaveTextContent("Covered Plastic Shoe Rack");
  fireEvent.click(screen.getByRole("button", { name: "Go to /products/lobby-set" }));
  await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lobby Set"));
  await loaded();
  expect(currentPath()).toBe("/products/lobby-set");
  expect(apiService.products.getBySlug).toHaveBeenCalledTimes(1);
  expect(apiService.products.getBySlug).toHaveBeenCalledWith("lobby-set");

  // Back to the product the redirect landed on: a real load this time.
  fireEvent.click(screen.getByRole("button", { name: "Go to /products/covered-plastic-shoe-rack" }));
  await waitFor(() =>
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Covered Plastic Shoe Rack")
  );
  await loaded();
  expect(apiService.products.getBySlug).toHaveBeenLastCalledWith("covered-plastic-shoe-rack");
  expect(window.scrollTo).toHaveBeenCalledTimes(3);
});

test.each([
  ["arrives", (read) => read.resolve(product("covered-plastic-shoe-rack"))],
  ["fails", (read) => read.reject(notFoundError())],
])("a legacy read that %s after the shopper has moved on changes nothing", async (_, settle) => {
  const read = {};
  apiService.products.getById.mockImplementationOnce(
    () => new Promise((resolve, reject) => Object.assign(read, { resolve, reject }))
  );
  renderAt("/products/11", { goTo: "/products/lobby-set" });
  fireEvent.click(screen.getByRole("button", { name: "Go to /products/lobby-set" }));
  expect(await loaded()).toHaveTextContent("Lobby Set");

  await act(async () => settle(read));
  await flush();
  expect(currentPath()).toBe("/products/lobby-set");
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lobby Set");
  expect(apiService.products.getReviews).toHaveBeenCalledTimes(1);
});

test("a superseded read leaves the newer load's skeleton in place", async () => {
  const legacy = {};
  const next = {};
  apiService.products.getById.mockImplementationOnce(
    () => new Promise((resolve) => Object.assign(legacy, { resolve }))
  );
  apiService.products.getBySlug.mockImplementationOnce(
    () => new Promise((resolve) => Object.assign(next, { resolve }))
  );
  renderAt("/products/11", { goTo: "/products/lobby-set" });
  fireEvent.click(screen.getByRole("button", { name: "Go to /products/lobby-set" }));

  await act(async () => legacy.resolve(product("covered-plastic-shoe-rack")));
  expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  expect(screen.getByText("Loading the product")).toBeInTheDocument();

  await act(async () => next.resolve(product("lobby-set")));
  expect(await loaded()).toHaveTextContent("Lobby Set");
  expect(currentPath()).toBe("/products/lobby-set");
});

test.each([
  ["arrives", (leaf) => leaf.resolve(categoryOf("covered-plastic-shoe-rack"))],
  ["fails", (leaf) => leaf.reject(notFoundError())],
])("the previous product's category read, if it %s late, is ignored", async (_, settle) => {
  const leaf = {};
  apiService.categories.getById.mockImplementationOnce(
    () => new Promise((resolve, reject) => Object.assign(leaf, { resolve, reject }))
  );
  renderAt("/products/covered-plastic-shoe-rack", { goTo: "/products/lobby-set" });
  expect(await title()).toHaveTextContent("Covered Plastic Shoe Rack");
  fireEvent.click(screen.getByRole("button", { name: "Go to /products/lobby-set" }));
  await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lobby Set"));
  await loaded();
  expect(trail()).toEqual(["Home", "Outdoor Furniture", "Lobby Set"]);

  await act(async () => settle(leaf));
  await flush();
  expect(eyebrow()).toHaveTextContent("Outdoor Furniture");
  expect(trail()).toEqual(["Home", "Outdoor Furniture", "Lobby Set"]);
});

test("an unknown slug shows the not-found state with a way back to the shop", async () => {
  renderAt("/products/no-such-piece");
  expect(await title()).toHaveTextContent("We couldn't find that piece.");
  await flush();
  expect(screen.getByRole("link", { name: "Browse all furniture" })).toHaveAttribute("href", "/products");
  expect(currentPath()).toBe("/products/no-such-piece");
});

test("shows the page skeleton while the product loads", async () => {
  apiService.products.getBySlug.mockReturnValue(new Promise(() => {}));
  const { container } = renderAt("/products/covered-plastic-shoe-rack");
  expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  expect(container.querySelector(".frameSkeleton")).toBeInTheDocument();
  await flush();
});

test("records the product in recently viewed: newest first, once, at most 20", async () => {
  const older = Array.from({ length: 20 }, (_, i) => ({ id: 100 + i, slug: `old-${i}` }));
  older.splice(5, 0, { id: 11, slug: "covered-plastic-shoe-rack" });
  localStorage.setItem("recentlyViewed", JSON.stringify(older));
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  const viewed = JSON.parse(localStorage.getItem("recentlyViewed"));
  expect(viewed).toHaveLength(20);
  expect(viewed[0]).toMatchObject({ id: 11, slug: "covered-plastic-shoe-rack", price: 1899 });
  expect(viewed.filter((item) => item.id === 11)).toHaveLength(1);
});

// ── Variants, stock and quantity ───────────────────────────────────────────

test("choosing a variant updates the price, SKU, stock and Sale chip, and announces it", async () => {
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  await waitForStoreData();
  expect(statusRegion()).toHaveTextContent("");

  fireEvent.click(screen.getByRole("radio", { name: "5 shelves" }));

  expect(screen.getByRole("radio", { name: "5 shelves" })).toHaveAttribute("aria-checked", "true");
  expect(info().getByText("₹3,449.00")).toBeInTheDocument();
  // The compare price (₹2,199) is below this variant's price: no saving, no chip.
  expect(info().queryByText("Save ₹300.00")).not.toBeInTheDocument();
  expect(screen.queryByText("Sale")).not.toBeInTheDocument();
  expect(info().getByText("SKU:")).toHaveTextContent("SKU: PLE-SHR-03-5S");
  expect(info().getByText("Only 4 left")).toBeInTheDocument();
  expect(info().getByText("Only 4 left in this option")).toBeInTheDocument();
  expect(statusRegion()).toHaveTextContent("5 shelves, ₹3,449.00, Only 4 left");
});

test("the arrow keys move through a variant group", async () => {
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  const first = screen.getByRole("radio", { name: "2 shelves" });
  first.focus();
  fireEvent.keyDown(first, { key: "ArrowRight" });
  const second = screen.getByRole("radio", { name: "3 shelves" });
  expect(second).toHaveAttribute("aria-checked", "true");
  expect(second).toHaveFocus();
  expect(info().getByText("₹2,349.00")).toBeInTheDocument();
});

test("the quantity clamps to the chosen variant's stock", async () => {
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  fireEvent.click(screen.getByRole("radio", { name: "4 shelves" })); // 30 in stock
  const increase = screen.getByRole("button", { name: "Increase quantity" });
  for (let i = 0; i < 9; i += 1) fireEvent.click(increase);
  const quantity = within(screen.getByRole("group", { name: "Quantity" }));
  expect(quantity.getByText("10")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("radio", { name: "5 shelves" })); // 4 in stock
  expect(quantity.getByText("4")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
});

test("an out-of-stock selection disables the purchase and says so", async () => {
  const soldOut = { ...product("iron-alna-clothes-stand"), stock: 0 };
  apiService.products.getBySlug.mockResolvedValue(soldOut);
  renderAt("/products/iron-alna-clothes-stand");
  await loaded();
  expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  expect(screen.getAllByText("Out of stock").length).toBeGreaterThan(0);
  expect(within(buyBox()).getByRole("button", { name: "Out of stock" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Buy now" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
});

// ── Cart, checkout and wishlist ───────────────────────────────────────────

test("Add to cart sends the same cart line as before and reads Added for 1.4s", async () => {
  const rack = product("covered-plastic-shoe-rack");
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  fireEvent.click(screen.getByRole("radio", { name: "5 shelves" }));
  fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));

  jest.useFakeTimers();
  fireEvent.click(within(buyBox()).getByRole("button", { name: "Add to cart" }));
  expect(addToCart).toHaveBeenCalledTimes(1);
  expect(addToCart).toHaveBeenCalledWith(
    {
      id: "11-v4",
      productId: 11,
      slug: "covered-plastic-shoe-rack",
      variantId: "v4",
      variantName: "5 shelves",
      name: "Covered Plastic Shoe Rack",
      image: rack.images[0],
      price: 3449,
      comparePrice: 2199,
      currency: "INR",
      stock: 4,
    },
    2,
    undefined
  );
  expect(within(buyBox()).getByRole("button", { name: "Added" })).toBeInTheDocument();
  act(() => {
    jest.advanceTimersByTime(1400);
  });
  expect(within(buyBox()).getByRole("button", { name: "Add to cart" })).toBeInTheDocument();
});

test("a product without variants sends a product-level line", async () => {
  const alna = product("iron-alna-clothes-stand");
  renderAt("/products/iron-alna-clothes-stand");
  await loaded();
  fireEvent.click(within(buyBox()).getByRole("button", { name: "Add to cart" }));
  expect(addToCart).toHaveBeenCalledWith(
    expect.objectContaining({ id: String(alna.id), variantId: null, variantName: null, price: alna.price, stock: alna.stock }),
    1,
    undefined
  );
});

test("Buy now adds without opening the drawer, then goes to checkout", async () => {
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  fireEvent.click(screen.getByRole("button", { name: "Buy now" }));
  await waitFor(() => expect(currentPath()).toBe("/checkout"));
  expect(addToCart).toHaveBeenCalledWith(
    expect.objectContaining({ id: "11-v1", variantName: "2 shelves", price: 1899 }),
    1,
    { openDrawer: false }
  );
});

test("the wishlist heart is a pressed toggle", async () => {
  const { unmount } = renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  const heart = screen.getByRole("button", { name: "Save to wishlist" });
  expect(heart).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(heart);
  expect(toggleWishlist).toHaveBeenCalledWith(expect.objectContaining({ id: 11 }));
  unmount();

  wishlisted.add(11);
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  expect(screen.getByRole("button", { name: "Remove from wishlist" })).toHaveAttribute("aria-pressed", "true");
});

// ── Social proof, trust and delivery ───────────────────────────────────────

test("social proof: an honest empty state, else a jump to the reviews", async () => {
  const { unmount } = renderAt("/products/classic-plastic-armchair");
  await loaded();
  expect(info().getByText("No reviews yet")).toBeInTheDocument();
  expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  unmount();

  const rack = product("covered-plastic-shoe-rack");
  // The page's reviews blend: once loaded, the approved reviews are the count
  // (the aggregate is worked out from them, so they are not added to it).
  const count = approvedReviews(rack.id).length;
  expect(count).toBe(rack.totalReviews);
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  const jump = await screen.findByRole("button", {
    name: `Rated 4.0 out of 5, ${count} ${count === 1 ? "review" : "reviews"}`,
  });
  fireEvent.click(jump);
  expect(scrolledTo()).toEqual([reviewsRegion()]);
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  expect(reviewsRegion()).toHaveFocus();
});

test("promises and the tax line wait for the store data; COD only while enabled", async () => {
  let resolveSettings;
  apiService.settings.get.mockReturnValue(new Promise((r) => (resolveSettings = r)));
  renderAt("/products/covered-plastic-shoe-rack");
  await title();
  await waitFor(() => expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument());

  // Pending: the dynamic promises are skeletons, no tax treatment is stated.
  expect(screen.getByRole("list", { name: "Our promises" })).toHaveAttribute("aria-busy", "true");
  expect(screen.queryByText("Cash on Delivery")).not.toBeInTheDocument();
  expect(screen.queryByText(/calculated at checkout|Inclusive of all taxes/)).not.toBeInTheDocument();

  await act(async () => {
    resolveSettings({ ...db.settings, payment: { ...db.settings.payment, codEnabled: false } });
  });
  await waitForStoreData();
  const promises = within(screen.getByRole("list", { name: "Our promises" }));
  expect(promises.getByText("Secure Payment")).toBeInTheDocument();
  expect(promises.getByText("Easy Returns")).toBeInTheDocument();
  expect(promises.queryByText("Cash on Delivery")).not.toBeInTheDocument();
  expect(screen.queryByText(/^Cash on Delivery available/)).not.toBeInTheDocument();
  expect(screen.getByText("Exclusive of taxes — calculated at checkout")).toBeInTheDocument();
  await flush();
});

test("the delivery facts come from the live methods and settings", async () => {
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  await waitForStoreData();
  expect(screen.getByRole("heading", { level: 2, name: "Delivery & returns" })).toBeInTheDocument();
  expect(screen.getByText("Standard Delivery")).toBeInTheDocument();
  expect(screen.getByText("7–10 business days")).toBeInTheDocument();
  expect(screen.getByText("Free above ₹9,999.00")).toBeInTheDocument();
  expect(screen.getByText("Cash on Delivery available on orders up to ₹50,000.00")).toBeInTheDocument();
  expect(screen.getByText("Taxes calculated at checkout (18% GST)")).toBeInTheDocument();
  // Inactive methods never show.
  expect(screen.queryByText("Same Day Delivery")).not.toBeInTheDocument();
});

// ── The sticky bar ──────────────────────────────────────────────────────────

test("the sticky bar follows the buy box and adds the chosen variant", async () => {
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  const bar = () => document.querySelector(".bar");
  const barButton = () => within(bar()).getByRole("button", { hidden: true });
  // The bar starts watching the buy box once its effect has run.
  await waitFor(() => expect(observers).toHaveLength(1));
  expect(observers[0].target).toBe(buyBox());

  setBuyBoxInView(true);
  expect(bar()).toHaveAttribute("aria-hidden", "true");
  expect(barButton()).toHaveAttribute("tabindex", "-1");

  setBuyBoxInView(false);
  expect(bar()).toHaveAttribute("aria-hidden", "false");
  expect(barButton()).toHaveAttribute("tabindex", "0");
  expect(within(bar()).getByText("₹1,899.00")).toBeInTheDocument();
  expect(within(bar()).getByText("2 shelves")).toBeInTheDocument();

  fireEvent.click(barButton());
  expect(addToCart).toHaveBeenCalledWith(expect.objectContaining({ id: "11-v1" }), 1, undefined);
});

// ── Below the first screen (Prompt 17) ─────────────────────────────────────

const deferred = () => {
  const handle = {};
  handle.promise = new Promise((resolve, reject) => Object.assign(handle, { resolve, reject }));
  return handle;
};
const specTable = () => screen.getByRole("table", { name: "Specifications" });
const specRows = () =>
  within(specTable())
    .getAllByRole("row")
    .map((row) => [
      within(row).getByRole("rowheader").textContent,
      within(row).getByRole("cell").textContent,
    ]);
const setRegion = () => screen.getByRole("region", { name: accentName("Complete the set.") });

test("anchored sections under an in-page nav replace the tabs", async () => {
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  // (The gallery's thumbnails are a tablist of their own.)
  expect(screen.queryByRole("tablist", { name: "Product information" })).not.toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: /^(Description|Reviews)/ })).not.toBeInTheDocument();

  const links = within(pageNav()).getAllByRole("link");
  expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
    ["Details", "#product-details"],
    ["Specifications", "#product-specifications"],
    ["Reviews (1)", "#product-reviews"],
  ]);
  // Every target is a section named by its heading, ready to take focus.
  expect(screen.getByRole("region", { name: "About this piece" })).toHaveAttribute("id", "product-details");
  expect(screen.getByRole("region", { name: "Specifications" })).toHaveAttribute("id", "product-specifications");
  expect(reviewsRegion()).toHaveAttribute("id", "product-reviews");
  ["product-details", "product-specifications", "product-reviews"].forEach((id) =>
    expect(document.getElementById(id)).toHaveAttribute("tabindex", "-1")
  );
});

test("a nav link jumps to its section and focuses it; a modified click is the browser's", async () => {
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  const specs = within(pageNav()).getByRole("link", { name: "Specifications" });

  // fireEvent returns false when the default action was prevented.
  expect(fireEvent.click(specs)).toBe(false);
  const target = screen.getByRole("region", { name: "Specifications" });
  expect(scrolledTo()).toEqual([target]);
  expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ behavior: "smooth", block: "start" });
  expect(target).toHaveFocus();

  // A new-tab click keeps the link's own behaviour.
  specs.focus();
  expect(fireEvent.click(specs, { ctrlKey: true })).toBe(true);
  expect(fireEvent.click(specs, { metaKey: true })).toBe(true);
  expect(scrolledTo()).toHaveLength(1);
  expect(specs).toHaveFocus();
});

test("with reduced motion the jumps are instant", async () => {
  useReducedMotion.mockReturnValue(true);
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  fireEvent.click(within(pageNav()).getByRole("link", { name: /^Reviews/ }));
  expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ behavior: "instant", block: "start" });
  fireEvent.click(screen.getByRole("button", { name: /^Rated 4\.0 out of 5/ }));
  expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ behavior: "instant", block: "start" });
  expect(reviewsRegion()).toHaveFocus();
});

test("Details: the description's paragraphs, without its specifications paragraph", async () => {
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  const details = screen.getByRole("region", { name: "About this piece" });
  const paragraphs = within(details).getAllByText(/./, { selector: "p" });
  expect(paragraphs.map((p) => p.textContent)).toEqual(
    product("covered-plastic-shoe-rack").description.split("\n\n").slice(0, 2)
  );
  expect(details).not.toHaveTextContent("Specifications:");
});

test("Specifications: the parsed pairs, then the fields, in a table of row headers", async () => {
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  await waitFor(() => expect(specRows().map(([key]) => key)).toContain("Category"));
  expect(specRows()).toEqual([
    ["Material", "Polypropylene panels with a hinged front cover"],
    ["Shelves", "2, 3, 4 or 5"],
    ["Width", "approx. 62 cm"],
    ["Height", "approx. 42 / 60 / 78 / 96 cm (2 / 3 / 4 / 5 shelves)"],
    ["Pairs per shelf", "approx. 4"],
    ["Assembly", "Interlocking, no tools needed"],
    ["Care", "Wipe clean, keep out of direct sun"],
    ["Brand", "Nilkamal"],
    ["SKU", "PLE-SHR-03-2S"],
    ["Weight", "6.8 kg"],
    ["Dimensions (L × W × H)", "62 × 33 × 98 cm"],
    ["Category", "Shoe Racks"],
    ["Tags", product("covered-plastic-shoe-rack").tags.join("")],
  ]);
  within(specTable())
    .getAllByRole("rowheader")
    .forEach((th) => expect(th).toHaveAttribute("scope", "row"));
  const tags = within(within(specTable()).getAllByRole("row").pop()).getAllByRole("listitem");
  expect(tags.map((tag) => tag.textContent)).toEqual(product("covered-plastic-shoe-rack").tags);
  expect(within(specTable()).queryByRole("link")).not.toBeInTheDocument();

  // The SKU row is the chosen variant's.
  fireEvent.click(screen.getByRole("radio", { name: "5 shelves" }));
  expect(specRows()).toContainEqual(["SKU", "PLE-SHR-03-5S"]);
});

test("a name the description already gives is not repeated by the fields", async () => {
  renderAt("/products/carlton-mattress");
  await loaded();
  const brandRows = specRows().filter(([key]) => key.toLowerCase() === "brand");
  expect(brandRows).toEqual([["Brand", "Carlton"]]);
  expect(specRows()[0]).toEqual(["Brand", "Carlton"]);
});

test("a description without the paragraph is all prose; the table has the fields only", async () => {
  const rack = product("covered-plastic-shoe-rack");
  apiService.products.getBySlug.mockResolvedValue({
    ...rack,
    description: "A covered rack for the entrance.\n\nIt keeps dust off good shoes.",
  });
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  const details = screen.getByRole("region", { name: "About this piece" });
  expect(within(details).getAllByText(/./, { selector: "p" }).map((p) => p.textContent)).toEqual([
    "A covered rack for the entrance.",
    "It keeps dust off good shoes.",
  ]);
  await waitFor(() => expect(specRows().map(([key]) => key)).toContain("Category"));
  expect(specRows().map(([key]) => key)).toEqual([
    "Brand",
    "SKU",
    "Weight",
    "Dimensions (L × W × H)",
    "Category",
    "Tags",
  ]);
});

test("no description: no Details link or section; the table and the reviews stay", async () => {
  apiService.products.getBySlug.mockResolvedValue({ ...product("covered-plastic-shoe-rack"), description: "" });
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  expect(within(pageNav()).getAllByRole("link").map((link) => link.textContent)).toEqual([
    "Specifications",
    "Reviews (1)",
  ]);
  expect(screen.queryByRole("region", { name: "About this piece" })).not.toBeInTheDocument();
  expect(specTable()).toBeInTheDocument();
});

test("reviews: the approved ones, counted once, from a single read", async () => {
  const sofa = product("wooden-sofa-set");
  const approved = approvedReviews(sofa.id);
  expect(approved).toHaveLength(3);
  expect(sofa.totalReviews).toBe(3);
  renderAt("/products/wooden-sofa-set");
  await loaded();
  await waitFor(() => expect(within(reviewsRegion()).getAllByRole("article")).toHaveLength(3));

  expect(within(reviewsRegion()).getByText("Based on 3 ratings")).toBeInTheDocument();
  expect(within(reviewsRegion()).getByText("4.7")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Rated 4.7 out of 5, 3 reviews" })).toBeInTheDocument();
  expect(within(pageNav()).getByRole("link", { name: "Reviews (3)" })).toBeInTheDocument();
  expect(
    within(reviewsRegion())
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent)
  ).toEqual(approved.map((review) => review.title));
  expect(apiService.products.getReviews).toHaveBeenCalledTimes(1);
  expect(apiService.products.getReviews).toHaveBeenCalledWith(sofa.id);
});

test("reviews: the aggregate stands in until the reviews arrive", async () => {
  const read = deferred();
  apiService.products.getReviews.mockReturnValue(read.promise);
  renderAt("/products/wooden-sofa-set");
  await loaded();
  expect(within(reviewsRegion()).getByText("Loading reviews")).toBeInTheDocument();
  expect(within(reviewsRegion()).getByText("Based on 3 ratings")).toBeInTheDocument();
  expect(within(pageNav()).getByRole("link", { name: "Reviews (3)" })).toBeInTheDocument();

  await act(async () => read.resolve(approvedReviews(product("wooden-sofa-set").id)));
  expect(within(reviewsRegion()).getAllByRole("article")).toHaveLength(3);
  expect(within(reviewsRegion()).getByText("Based on 3 ratings")).toBeInTheDocument();
});

test("reviews: an unreviewed piece says so honestly", async () => {
  renderAt("/products/l-shaped-sofa");
  await loaded();
  const region = within(reviewsRegion());
  await waitFor(() => expect(region.getByText("No reviews yet")).toBeInTheDocument());
  expect(
    region.getByText("Reviews come from verified orders and are published after moderation.")
  ).toBeInTheDocument();
  expect(region.queryByRole("article")).not.toBeInTheDocument();
  expect(within(pageNav()).getByRole("link", { name: "Reviews" })).toBeInTheDocument();
});

test("reviews: a failed read says so, and Try again reads them again", async () => {
  apiService.products.getReviews.mockRejectedValueOnce(new Error("Network Error"));
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  renderAt("/products/wooden-sofa-set");
  await loaded();
  const region = within(reviewsRegion());
  await waitFor(() => expect(region.getByText("Reviews could not be loaded just now.")).toBeInTheDocument());
  // The store's aggregate still stands.
  expect(region.getByText("Based on 3 ratings")).toBeInTheDocument();
  expect(consoleError).toHaveBeenCalledWith("Error fetching reviews:", expect.any(Error));
  consoleError.mockRestore();

  fireEvent.click(region.getByRole("button", { name: "Try again" }));
  expect(reviewsRegion()).toHaveFocus();
  await waitFor(() => expect(region.getAllByRole("article")).toHaveLength(3));
  expect(apiService.products.getReviews).toHaveBeenCalledTimes(2);
});

test("a reviews read for the previous product, settling late, is dropped", async () => {
  const late = deferred();
  apiService.products.getReviews.mockImplementationOnce(() => late.promise);
  renderAt("/products/wooden-sofa-set", { goTo: "/products/covered-plastic-shoe-rack" });
  await loaded();
  fireEvent.click(screen.getByRole("button", { name: "Go to /products/covered-plastic-shoe-rack" }));
  await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Covered Plastic Shoe Rack"));
  await loaded();
  await waitFor(() => expect(within(reviewsRegion()).getAllByRole("article")).toHaveLength(1));

  await act(async () => late.resolve(approvedReviews(product("wooden-sofa-set").id)));
  expect(within(reviewsRegion()).getAllByRole("article")).toHaveLength(1);
  expect(within(reviewsRegion()).getByText("Based on 1 rating")).toBeInTheDocument();
});

test("the curated set: Add N to cart adds exactly the ticked pieces", async () => {
  const [bed, mattress, bedside] = ["king-size-bed", "carlton-mattress", "wooden-bedside-table"].map(product);
  apiService.products.getFrequentlyBoughtTogether.mockResolvedValue([mattress, bedside]);
  renderAt("/products/king-size-bed");
  await loaded();
  expect(apiService.products.getFrequentlyBoughtTogether).toHaveBeenCalledWith(
    expect.objectContaining({ id: bed.id }),
    2
  );
  const set = within(setRegion());
  fireEvent.click(set.getByRole("checkbox", { name: "Carlton Mattress" }));
  fireEvent.click(set.getByRole("button", { name: "Add 2 to cart" }));
  expect(addToCart.mock.calls).toEqual([[buildCartItem(bed)], [buildCartItem(bedside)]]);
});

test("no curated companions, no set; related pieces come from getRelated", async () => {
  const related = ["wide-plastic-shoe-rack", "slim-plastic-shoe-rack"].map(product);
  apiService.products.getRelated.mockResolvedValue(related);
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  expect(screen.queryByRole("region", { name: accentName("Complete the set.") })).not.toBeInTheDocument();
  expect(apiService.products.getRelated).toHaveBeenCalledWith(expect.objectContaining({ id: 11 }), 10);
  const rail = screen.getByRole("group", { name: "Related pieces" });
  expect(within(rail).getAllByRole("article")).toHaveLength(2);
  expect(screen.getByRole("region", { name: accentName("You may also like.") })).toBeInTheDocument();
  fireEvent.click(within(rail).getByRole("button", { name: "Add Wide Plastic Shoe Rack to cart" }));
  expect(addToCart).toHaveBeenCalledWith(buildCartItem(related[0]));
});

test("a set or related read for the previous product, settling late, is dropped", async () => {
  const lateSet = deferred();
  const lateRelated = deferred();
  apiService.products.getFrequentlyBoughtTogether.mockImplementationOnce(() => lateSet.promise);
  apiService.products.getRelated.mockImplementationOnce(() => lateRelated.promise);
  renderAt("/products/king-size-bed", { goTo: "/products/covered-plastic-shoe-rack" });
  await loaded();
  fireEvent.click(screen.getByRole("button", { name: "Go to /products/covered-plastic-shoe-rack" }));
  await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Covered Plastic Shoe Rack"));
  await loaded();

  await act(async () => {
    lateSet.resolve([product("carlton-mattress")]);
    lateRelated.resolve([product("queen-size-bed")]);
  });
  expect(screen.queryByRole("region", { name: accentName("Complete the set.") })).not.toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Related pieces" })).not.toBeInTheDocument();
});

test("moving to another product never shows the previous one's set", async () => {
  apiService.products.getFrequentlyBoughtTogether.mockImplementation(async (p) =>
    p.slug === "king-size-bed" ? [product("carlton-mattress")] : new Promise(() => {})
  );
  renderAt("/products/king-size-bed", { goTo: "/products/queen-size-bed" });
  await loaded();
  expect(setRegion()).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Go to /products/queen-size-bed" }));
  await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Queen Size Bed"));
  expect(screen.queryByRole("region", { name: accentName("Complete the set.") })).not.toBeInTheDocument();
  await flush();
});

test("headings run h1, then h2 sections, then h3 review titles", async () => {
  apiService.products.getFrequentlyBoughtTogether.mockResolvedValue([product("carlton-mattress")]);
  apiService.products.getRelated.mockResolvedValue([product("queen-size-bed")]);
  renderAt("/products/wooden-sofa-set");
  await loaded();
  await waitFor(() => expect(within(reviewsRegion()).getAllByRole("article")).toHaveLength(3));
  const headings = screen.getAllByRole("heading").map((h) => [Number(h.tagName[1]), h.textContent]);
  expect(headings).toEqual([
    [1, "Wooden Sofa Set"],
    [2, "Delivery & returns"],
    [2, "About this piece"],
    [2, "Specifications"],
    [2, "What customers say."],
    ...approvedReviews(product("wooden-sofa-set").id).map((r) => [3, r.title]),
    [2, "Complete the set."],
    [2, "You may also like."],
  ]);
});
