import React from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../context/WishlistContext";
import db from "../../../db.json";
import ProductDetails from "./ProductDetails";

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
});

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
};

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/products/:slug"
          element={
            <>
              <ProductDetails />
              <LocationProbe />
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

test("a legacy numeric id loads the product and redirects to the canonical slug", async () => {
  renderAt("/products/11");
  await waitFor(() => expect(currentPath()).toBe("/products/covered-plastic-shoe-rack"));
  expect(await loaded()).toHaveTextContent("Covered Plastic Shoe Rack");
  expect(apiService.products.getById).toHaveBeenCalledWith("11");
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
  expect(screen.getByText("No reviews yet")).toBeInTheDocument();
  expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  unmount();

  const rack = product("covered-plastic-shoe-rack");
  // The page's reviews blend: the product's aggregate plus the fetched reviews.
  const count = rack.totalReviews + approvedReviews(rack.id).length;
  renderAt("/products/covered-plastic-shoe-rack");
  await loaded();
  const jump = await screen.findByRole("button", {
    name: `Rated 4.0 out of 5, ${count} ${count === 1 ? "review" : "reviews"}`,
  });
  fireEvent.click(jump);
  expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  expect(screen.getByRole("tab", { name: /^Reviews/ })).toHaveAttribute("aria-selected", "true");
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
