import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../context/WishlistContext";
import { stripAccent } from "../../components/ui";
import {
  CLOSING_CTA,
  COMPLETE_THE_SPACE,
  HOME_SECTIONS,
  MARQUEE_PHRASES,
  PROMISE_STEPS,
  SPACES,
  STORY,
} from "../../content/homeContent";
import { buildCartItem } from "../../utils/helpers";
import db from "../../../db.json";
import Home from "./Home";

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    categories: { getAll: jest.fn() },
    products: {
      getAll: jest.fn(),
      getFeatured: jest.fn(),
      getTrending: jest.fn(),
      getBySlug: jest.fn(),
      getFrequentlyBoughtTogether: jest.fn(),
      getRelated: jest.fn(),
      getReviews: jest.fn(),
    },
    settings: { get: jest.fn() },
    shipping: { getMethods: jest.fn() },
  },
}));
jest.mock("../../hooks/useCart", () => ({ useCart: jest.fn() }));
jest.mock("../../context/WishlistContext", () => ({ useWishlist: jest.fn() }));
// The hero and the strip have their own tests (Prompt 10).
jest.mock("../../components/HeroSection/HeroSection", () => ({
  __esModule: true,
  default: () => require("react").createElement("h1", null, "Hero"),
}));
jest.mock("../../components/storefront/AssuranceStrip", () => ({
  __esModule: true,
  default: () => null,
}));

// jsdom has no IntersectionObserver (Reveal and the lazy reads use one). By
// default every observed element is reported in view at once; a test can
// switch that off and bring the elements into view itself.
let autoIntersect = true;
const observers = new Set();
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.targets = new Set();
    observers.add(this);
  }
  observe(target) {
    this.targets.add(target);
    if (autoIntersect) this.callback([{ isIntersecting: true, target }], this);
  }
  unobserve(target) {
    this.targets.delete(target);
  }
  disconnect() {
    this.targets.clear();
    observers.delete(this);
  }
}
const intersectAll = () =>
  [...observers].forEach((observer) =>
    observer.callback(
      [...observer.targets].map((target) => ({ isIntersecting: true, target })),
      observer
    )
  );
beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver;
});
afterAll(() => {
  delete window.IntersectionObserver;
});
afterEach(() => {
  autoIntersect = true;
  observers.clear();
});

// ── The seeded catalogue ─────────────────────────────────────────────────────

const product = (id) => db.products.find((p) => p.id === id);
const productsFor = (ids = []) => ids.map(product).filter(Boolean);
const CATEGORIES = db.categories.filter((c) => c.isActive !== false);
const FEATURED = db.products.filter((p) => p.featured).slice(0, 8);
const TRENDING = db.products.filter((p) => p.trending).slice(0, 8);
const ANCHOR = db.products.find((p) => p.slug === COMPLETE_THE_SPACE.anchorProductSlug);

const deferred = () => {
  const handle = {};
  handle.promise = new Promise((resolve) => {
    handle.resolve = resolve;
  });
  return handle;
};

const SETTINGS = db.settings;
const SHIPPING = db.shipping_methods.filter((m) => m.isActive);
const approvedReviewsFor = (id) =>
  db.reviews.filter((r) => String(r.productId) === String(id) && r.status === "approved");

// Each read answers from the seed unless a test overrides it. `bundle` and
// `related` replace what the two curation calls return; `reviewsFor(id)`
// what a product's reviews read returns.
const serve = ({
  categories = CATEGORIES,
  featured = FEATURED,
  trending = TRENDING,
  anchor = ANCHOR,
  bundle,
  related,
  catalogue = db.products,
  reviewsFor = approvedReviewsFor,
  settings = SETTINGS,
  shipping = SHIPPING,
} = {}) => {
  const answer = (value) =>
    value && typeof value.then === "function" ? value : value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  apiService.categories.getAll.mockImplementation(() => answer(categories));
  apiService.products.getFeatured.mockImplementation(() => answer(featured));
  apiService.products.getTrending.mockImplementation(() => answer(trending));
  apiService.products.getBySlug.mockImplementation(() => answer(anchor));
  apiService.products.getFrequentlyBoughtTogether.mockImplementation((p) =>
    answer(bundle ?? productsFor(p.frequentlyBoughtTogetherIds))
  );
  apiService.products.getRelated.mockImplementation((p) =>
    answer(related ?? productsFor(p.relatedProductIds))
  );
  apiService.products.getAll.mockImplementation(() => answer(catalogue));
  apiService.products.getReviews.mockImplementation((id) => answer(reviewsFor(id)));
  apiService.settings.get.mockImplementation(() => answer(settings));
  apiService.shipping.getMethods.mockImplementation(() => answer(shipping));
};

let addToCart;
let setIsCartOpen;
let toggleWishlist;
beforeEach(() => {
  addToCart = jest.fn(() => Promise.resolve());
  setIsCartOpen = jest.fn();
  toggleWishlist = jest.fn();
  useCart.mockReturnValue({ addToCart, setIsCartOpen });
  useWishlist.mockReturnValue({ toggleWishlist, isInWishlist: (id) => id === FEATURED[1].id });
  localStorage.clear();
});

// This dom-testing-library names "Pieces we *recommend*." as
// "Pieces we recommend ." (a space after the <em>); browsers do not.
const named = (text) => (name) => name.replace(/ (?=[.,!?])/g, "") === stripAccent(text);

// Let every pending read (and the state updates after it) settle.
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const renderHome = async () => {
  const utils = render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
  await flush();
  await flush();
  return utils;
};

const section = (title) => screen.getByRole("region", { name: named(title) });
const querySection = (title) => screen.queryByRole("region", { name: named(title) });
const completeTheSpace = () => querySection(COMPLETE_THE_SPACE.title);

// ── Order and data sources ───────────────────────────────────────────────────

test("renders every section in order after the hero, ending with the closing CTA", async () => {
  serve();
  await renderHome();
  const headings = screen.getAllByRole("heading").filter((h) => ["H1", "H2"].includes(h.tagName));
  expect(headings.map((h) => `${h.tagName} ${h.textContent}`)).toEqual([
    "H1 Hero",
    `H2 ${stripAccent(HOME_SECTIONS.spaces.title)}`,
    `H2 ${stripAccent(STORY[0].title)}`,
    `H2 ${stripAccent(HOME_SECTIONS.featured.title)}`,
    `H2 ${stripAccent(COMPLETE_THE_SPACE.title)}`,
    `H2 ${stripAccent(STORY[1].title)}`,
    `H2 ${stripAccent(HOME_SECTIONS.trending.title)}`,
    `H2 ${HOME_SECTIONS.brands.eyebrow}`,
    `H2 ${stripAccent(HOME_SECTIONS.reviews.title)}`,
    `H2 ${stripAccent(HOME_SECTIONS.promise.title)}`,
    `H2 ${stripAccent(CLOSING_CTA.title)}`,
  ]);
});

test("reads each source once: categories, featured, trending, then the anchor", async () => {
  serve();
  await renderHome();
  expect(apiService.categories.getAll).toHaveBeenCalledTimes(1);
  expect(apiService.products.getFeatured).toHaveBeenCalledWith(8);
  expect(apiService.products.getTrending).toHaveBeenCalledWith(8);
  expect(apiService.products.getBySlug).toHaveBeenCalledWith(COMPLETE_THE_SPACE.anchorProductSlug);
  expect(apiService.products.getFrequentlyBoughtTogether).toHaveBeenCalledWith(ANCHOR, 4);
  // The curated pair is enough: related products are not needed.
  expect(apiService.products.getRelated).not.toHaveBeenCalled();
});

test("carries no flash deals, countdown or promotional banner", async () => {
  serve();
  const { container } = await renderHome();
  expect(container).not.toHaveTextContent(/flash deals|grab them|limited time|top brands|50%|hrs/i);
  container.querySelectorAll("a[href]").forEach((a) => {
    expect(a.getAttribute("href")).not.toMatch(/sort=(sale|featured|trending|discount)/);
  });
});

// ── Shop by space ────────────────────────────────────────────────────────────

test("each space is one link to its category listing, with the category image", async () => {
  serve();
  await renderHome();
  const tiles = within(section(HOME_SECTIONS.spaces.title)).getAllByRole("link");
  expect(tiles.map((a) => a.getAttribute("href"))).toEqual(
    SPACES.map((s) => `/products?category=${s.categorySlug}`)
  );
  tiles.forEach((tile, index) => {
    const category = CATEGORIES.find((c) => c.slug === SPACES[index].categorySlug);
    const image = within(tile).getByRole("img");
    expect(image).toHaveAttribute("alt", category.name);
    expect(image).toHaveAttribute("src", category.image);
    expect(image).toHaveAttribute("loading", "lazy");
    expect(tile).toHaveTextContent(SPACES[index].label);
    expect(tile).toHaveTextContent(SPACES[index].line);
    // Hidden commas pace the name: category, space, line.
    const name = `${category.name}, ${SPACES[index].label}, ${SPACES[index].line}`;
    expect(within(section(HOME_SECTIONS.spaces.title)).getByRole("link", { name: named(name) })).toBe(tile);
  });
});

test("skips a space whose category is missing, and hides the section with none", async () => {
  serve({ categories: CATEGORIES.filter((c) => c.slug !== "office-chairs") });
  const { unmount } = await renderHome();
  const links = within(section(HOME_SECTIONS.spaces.title)).getAllByRole("link");
  expect(links.map((a) => a.getAttribute("href"))).toEqual([
    "/products?category=home-furniture",
    "/products?category=cafe-restaurant-chairs",
    "/products?category=outdoor-furniture",
  ]);
  unmount();

  serve({ categories: [] });
  await renderHome();
  expect(querySection(HOME_SECTIONS.spaces.title)).not.toBeInTheDocument();
});

// ── Story blocks ─────────────────────────────────────────────────────────────

test("story blocks carry their copy, image and call to action", async () => {
  serve();
  await renderHome();
  STORY.forEach((story) => {
    const block = section(story.title);
    expect(within(block).getByRole("heading", { level: 2 }).querySelector("em")).toBeInTheDocument();
    expect(block).toHaveTextContent(story.body);
    expect(within(block).getByRole("img")).toHaveAttribute("alt", story.image.alt);
    expect(within(block).getByRole("link", { name: story.cta.label })).toHaveAttribute(
      "href",
      story.cta.to
    );
  });
});

// ── Featured and Trending rails ──────────────────────────────────────────────

test("featured and trending rails list their products and link to valid listings", async () => {
  serve();
  await renderHome();
  const featured = section(HOME_SECTIONS.featured.title);
  expect(within(featured).getByRole("link", { name: "View all" })).toHaveAttribute("href", "/products");
  const featuredRail = within(featured).getByRole("group", { name: HOME_SECTIONS.featured.railLabel });
  expect(within(featuredRail).getAllByRole("listitem")).toHaveLength(FEATURED.length);

  const trending = section(HOME_SECTIONS.trending.title);
  expect(within(trending).getByRole("link", { name: "View all" })).toHaveAttribute(
    "href",
    "/products?sort=popular"
  );
  const trendingRail = within(trending).getByRole("group", { name: HOME_SECTIONS.trending.railLabel });
  expect(within(trendingRail).getAllByRole("listitem")).toHaveLength(TRENDING.length);
});

test("rails show skeletons while loading and disappear when empty", async () => {
  const featured = deferred();
  const trending = deferred();
  serve({ featured: featured.promise, trending: trending.promise });
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
  expect(screen.getByRole("group", { name: HOME_SECTIONS.featured.railLabel })).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("group", { name: HOME_SECTIONS.trending.railLabel })).toHaveAttribute("aria-busy", "true");

  await act(async () => {
    featured.resolve([]);
    trending.resolve([]);
  });
  await flush();
  expect(querySection(HOME_SECTIONS.featured.title)).not.toBeInTheDocument();
  expect(querySection(HOME_SECTIONS.trending.title)).not.toBeInTheDocument();
});

test("a card's quick add sends the built cart item, quantity 1; the heart toggles", async () => {
  serve();
  await renderHome();
  const rail = screen.getByRole("group", { name: HOME_SECTIONS.featured.railLabel });
  const [first, second] = within(rail).getAllByRole("listitem");
  fireEvent.click(within(first).getByRole("button", { name: "Add to Cart" }));
  expect(addToCart).toHaveBeenCalledWith(buildCartItem(FEATURED[0]), 1);

  expect(within(second).getByRole("button", { name: "Remove from wishlist" })).toBeInTheDocument();
  fireEvent.click(within(first).getByRole("button", { name: "Add to wishlist" }));
  expect(toggleWishlist).toHaveBeenCalledWith(FEATURED[0]);
});

// ── Complete the space ───────────────────────────────────────────────────────

test("shows the anchor large with its curated companions and the set's total", async () => {
  serve();
  await renderHome();
  const band = completeTheSpace();
  const companions = productsFor(ANCHOR.frequentlyBoughtTogetherIds);
  expect(within(band).getByRole("heading", { level: 3, name: ANCHOR.name })).toBeInTheDocument();
  expect(band).toHaveTextContent(ANCHOR.shortDescription);
  expect(within(band).getByRole("link", { name: `View ${ANCHOR.name}` })).toHaveAttribute(
    "href",
    `/products/${ANCHOR.slug}`
  );
  const cards = within(band).getAllByRole("listitem");
  expect(cards).toHaveLength(companions.length);
  companions.forEach((companion, index) => {
    expect(within(cards[index]).getAllByRole("link", { name: companion.name })[0]).toHaveAttribute(
      "href",
      `/products/${companion.slug}`
    );
  });
  const total = [ANCHOR, ...companions].reduce((sum, p) => sum + buildCartItem(p).price, 0);
  expect(total).toBe(45997);
  expect(within(band).getByText("3 pieces, ₹45,997.00")).toBeInTheDocument();
});

test("add all adds each piece without the drawer, then opens the drawer once", async () => {
  serve();
  await renderHome();
  const companions = productsFor(ANCHOR.frequentlyBoughtTogetherIds);
  fireEvent.click(within(completeTheSpace()).getByRole("button", { name: COMPLETE_THE_SPACE.addAllLabel }));
  await waitFor(() => expect(setIsCartOpen).toHaveBeenCalledTimes(1));
  expect(addToCart.mock.calls).toEqual(
    [ANCHOR, ...companions].map((p) => [buildCartItem(p), 1, { openDrawer: false }])
  );
  expect(setIsCartOpen).toHaveBeenCalledWith(true);
  expect(setIsCartOpen.mock.invocationCallOrder[0]).toBeGreaterThan(
    Math.max(...addToCart.mock.invocationCallOrder)
  );
});

test("leaves sold-out pieces out of add all", async () => {
  const [bench, table] = productsFor(ANCHOR.frequentlyBoughtTogetherIds);
  serve({ bundle: [{ ...bench, stock: 0 }, table] });
  await renderHome();
  const band = completeTheSpace();
  expect(within(band).getByText("2 pieces, ₹32,998.00")).toBeInTheDocument();
  fireEvent.click(within(band).getByRole("button", { name: COMPLETE_THE_SPACE.addAvailableLabel }));
  await waitFor(() => expect(setIsCartOpen).toHaveBeenCalledTimes(1));
  expect(addToCart.mock.calls.map(([item]) => item.productId)).toEqual([ANCHOR.id, table.id]);
});

test("without the anchor's slug, the first featured product with a bundle anchors", async () => {
  serve({ anchor: new Error("404") });
  await renderHome();
  // Classic Plastic Armchair: one curated piece, topped up with related ones.
  const fallback = FEATURED.find((p) => p.frequentlyBoughtTogetherIds.length > 0);
  expect(apiService.products.getFrequentlyBoughtTogether).toHaveBeenCalledWith(fallback, 4);
  expect(apiService.products.getRelated).toHaveBeenCalledWith(fallback, 4);
  const band = completeTheSpace();
  expect(within(band).getByRole("heading", { level: 3, name: fallback.name })).toBeInTheDocument();
  const expected = [
    ...productsFor(fallback.frequentlyBoughtTogetherIds),
    ...productsFor(fallback.relatedProductIds),
  ].slice(0, 4);
  const cards = within(band).getAllByRole("listitem");
  expect(cards.map((li) => within(li).getAllByRole("link")[1].textContent)).toEqual(
    expected.map((p) => p.name)
  );
});

test("is hidden with fewer than two companions", async () => {
  serve({ bundle: productsFor([35]), related: [] });
  await renderHome();
  expect(apiService.products.getRelated).toHaveBeenCalled();
  expect(completeTheSpace()).not.toBeInTheDocument();
});

test("is hidden without an anchor", async () => {
  serve({
    anchor: null, // the slug matches nothing

    featured: FEATURED.map((p) => ({ ...p, frequentlyBoughtTogetherIds: [] })),
  });
  await renderHome();
  expect(apiService.products.getFrequentlyBoughtTogether).not.toHaveBeenCalled();
  expect(completeTheSpace()).not.toBeInTheDocument();
});

test("an inactive anchor is not shown", async () => {
  serve({ anchor: { ...ANCHOR, isActive: false }, featured: [] });
  await renderHome();
  expect(completeTheSpace()).not.toBeInTheDocument();
});

// ── Recently viewed ──────────────────────────────────────────────────────────

const snapshot = (p) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  brand: p.brand,
  image: p.images[0],
  images: p.images,
  price: p.price,
  comparePrice: p.comparePrice,
  variants: p.variants,
  rating: p.rating,
  totalReviews: p.totalReviews,
  viewedAt: "2026-10-07T10:00:00.000Z",
});

test("recently viewed lists what the product page stored, under an h2", async () => {
  localStorage.setItem("recentlyViewed", JSON.stringify([snapshot(product(55)), snapshot(product(47))]));
  serve();
  await renderHome();
  const heading = screen.getByRole("heading", { level: 2, name: HOME_SECTIONS.recentlyViewed.eyebrow });
  expect(heading).toHaveClass("sf-eyebrow");
  const rail = screen.getByRole("group", { name: HOME_SECTIONS.recentlyViewed.railLabel });
  const items = within(rail).getAllByRole("listitem");
  expect(items.map((li) => within(li).getAllByRole("link")[0].getAttribute("href"))).toEqual([
    "/products/king-size-bed",
    "/products/wooden-sofa-set",
  ]);
});

test.each([
  ["nothing stored", null],
  ["an empty list", "[]"],
  ["unreadable data", "{not json"],
])("recently viewed stays hidden with %s", async (_, stored) => {
  if (stored !== null) localStorage.setItem("recentlyViewed", stored);
  serve();
  await renderHome();
  expect(screen.queryByRole("heading", { name: HOME_SECTIONS.recentlyViewed.eyebrow })).not.toBeInTheDocument();
});

// ── The closing half (Prompt 12) ─────────────────────────────────────────────

const LAZY_READS = () => [
  apiService.products.getAll,
  apiService.products.getReviews,
  apiService.settings.get,
  apiService.shipping.getMethods,
];

test("reads the closing half lazily, each section once it comes near", async () => {
  autoIntersect = false;
  serve();
  await renderHome();
  LAZY_READS().forEach((read) => expect(read).not.toHaveBeenCalled());
  // Until then the lazy sections hold their place.
  expect(screen.getByRole("region", { name: HOME_SECTIONS.brands.eyebrow })).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("group", { name: HOME_SECTIONS.reviews.carouselLabel })).toHaveAttribute("aria-busy", "true");

  await act(async () => intersectAll());
  await flush();
  expect(apiService.products.getAll).toHaveBeenCalledTimes(1);
  expect(apiService.products.getReviews).toHaveBeenCalledTimes(FEATURED.length);
  expect(apiService.settings.get).toHaveBeenCalledTimes(1);
  expect(apiService.shipping.getMethods).toHaveBeenCalledTimes(1);
});

test("the brands strip lists the catalogue's brand names as text, the store's own last", async () => {
  serve();
  await renderHome();
  const strip = screen.getByRole("region", { name: HOME_SECTIONS.brands.eyebrow });
  expect(within(strip).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    "Carlton",
    "Nilkamal",
    "Winsome",
    "A & S Urbanseat",
  ]);
  expect(within(strip).queryByRole("img")).not.toBeInTheDocument();
});

test("the brands strip is hidden when the catalogue cannot be read", async () => {
  serve({ catalogue: new Error("500") });
  await renderHome();
  expect(screen.queryByRole("region", { name: HOME_SECTIONS.brands.eyebrow })).not.toBeInTheDocument();
});

test("reviews come from the featured products' approved reviews, newest first", async () => {
  serve();
  await renderHome();
  expect(apiService.products.getReviews.mock.calls.map(([id]) => id)).toEqual(FEATURED.map((p) => p.id));
  const reviewsSection = section(HOME_SECTIONS.reviews.title);
  const carousel = within(reviewsSection).getByRole("group", { name: HOME_SECTIONS.reviews.carouselLabel });
  const slides = carousel.querySelectorAll('[aria-roledescription="slide"]');
  const expected = FEATURED.flatMap((p) => approvedReviewsFor(p.id)).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
  expect(slides).toHaveLength(expected.length);
  expect(expected).toHaveLength(7);
  expect(slides[0]).toHaveTextContent(expected[0].body);
  expect(slides[0]).toHaveTextContent(expected[0].userName);
  const shoeRack = product(expected[0].productId);
  expect(within(slides[0]).getByRole("link", { name: shoeRack.name })).toHaveAttribute(
    "href",
    `/products/${shoeRack.slug}`
  );
  // None of the seeded verified reviews belongs to these products.
  expect(carousel).not.toHaveTextContent("Verified purchase");
});

test("pending and rejected reviews never appear", async () => {
  // Answer with every seeded review, whatever its status.
  serve({ reviewsFor: (id) => db.reviews.filter((r) => r.productId === id) });
  await renderHome();
  const carousel = screen.getByRole("group", { name: HOME_SECTIONS.reviews.carouselLabel });
  db.reviews
    .filter((r) => r.status !== "approved")
    .forEach((r) => expect(carousel).not.toHaveTextContent(r.body));
  // Product 12's pending review is the only non-approved one among them.
  expect(db.reviews.find((r) => r.productId === 12 && r.status === "pending")).toBeTruthy();
});

test("with no approved reviews the section is hidden, not shown empty", async () => {
  serve({ reviewsFor: () => [] });
  await renderHome();
  expect(querySection(HOME_SECTIONS.reviews.title)).not.toBeInTheDocument();
  expect(screen.queryByText("No customer reviews yet.")).not.toBeInTheDocument();
});

test("failed review reads also hide the section", async () => {
  serve({ reviewsFor: () => new Error("500") });
  await renderHome();
  expect(querySection(HOME_SECTIONS.reviews.title)).not.toBeInTheDocument();
});

test("reviews wait for the featured list", async () => {
  const featured = deferred();
  serve({ featured: featured.promise });
  await renderHome();
  expect(apiService.products.getReviews).not.toHaveBeenCalled();
  await act(async () => featured.resolve(FEATURED));
  await flush();
  expect(apiService.products.getReviews).toHaveBeenCalledTimes(FEATURED.length);
});

test("the press slot renders nothing: there is no data source for it", async () => {
  serve();
  const { container } = await renderHome();
  expect(screen.queryByText(HOME_SECTIONS.press.eyebrow)).not.toBeInTheDocument();
  expect(container).not.toHaveTextContent(/as featured in|as seen in|trusted by/i);
});

test("the promise steps quote live delivery, payment and returns data", async () => {
  serve();
  await renderHome();
  const promise = section(HOME_SECTIONS.promise.title);
  const steps = within(promise).getAllByRole("listitem");
  expect(steps).toHaveLength(PROMISE_STEPS.length);
  steps.forEach((step, index) => {
    expect(within(step).getByRole("heading", { level: 3, name: PROMISE_STEPS[index].title })).toBeInTheDocument();
    expect(within(step).getByRole("img")).toHaveAttribute("alt", PROMISE_STEPS[index].image.alt);
    expect(within(step).getByRole("img")).toHaveAttribute("loading", "lazy");
    expect(step).toHaveTextContent(`0${index + 1}`);
  });
  expect(promise).toHaveTextContent("Or choose cash on delivery and pay when your furniture arrives.");
  expect(promise).toHaveTextContent("in 7–10 business days. Orders above ₹9,999 ship free.");
  expect(promise).toHaveTextContent("returned within 7 days of delivery");
});

test("the payment step mentions cash on delivery only while it is enabled", async () => {
  serve({ settings: { ...SETTINGS, payment: { ...SETTINGS.payment, codEnabled: false } } });
  await renderHome();
  const promise = section(HOME_SECTIONS.promise.title);
  expect(promise).toHaveTextContent("Check out securely online with cards, UPI or net banking.");
  expect(promise).not.toHaveTextContent(/cash/i);
});

test("the promise steps never guess a number when the data is missing", async () => {
  serve({ settings: new Error("500"), shipping: new Error("500") });
  await renderHome();
  const promise = section(HOME_SECTIONS.promise.title);
  expect(promise).not.toHaveTextContent(/₹|business days|cash/i);
  expect(promise).toHaveTextContent(PROMISE_STEPS.find((s) => s.dataKey === "delivery").fallback);
});

test("the marquee gives screen readers its phrases once", async () => {
  serve();
  await renderHome();
  const list = screen
    .getAllByRole("list")
    .find((ul) => within(ul).queryByText(MARQUEE_PHRASES[0], { exact: true }));
  expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(MARQUEE_PHRASES);
  expect(screen.getByRole("button", { name: "Pause the moving text" })).toBeInTheDocument();
});

test("the page ends with the navy closing CTA, without a form of its own", async () => {
  serve();
  const { container } = await renderHome();
  const closing = section(CLOSING_CTA.title);
  expect(within(closing).getByRole("link", { name: CLOSING_CTA.primary.label })).toHaveAttribute("href", "/products");
  expect(within(closing).getByRole("link", { name: CLOSING_CTA.secondary.label })).toHaveAttribute("href", "/support");
  expect(within(closing).getByRole("link", { name: CLOSING_CTA.primary.label })).toHaveClass("sf-btn--paper");
  expect(closing.querySelector("form, input")).toBeNull();
  const page = container.firstElementChild;
  expect(page.lastElementChild).toBe(closing);
});

test("the interim 'Why choose us' grid and its claims are gone", async () => {
  serve();
  const { container } = await renderHome();
  expect(screen.queryByRole("heading", { name: /why choose/i })).not.toBeInTheDocument();
  expect(container).not.toHaveTextContent(/24\/7|256-bit|full refund guarantee|same-day/i);
});

test("while the promise data loads, the steps hold their bodies' place without showing copy", async () => {
  const settings = deferred();
  serve({ settings: settings.promise });
  await renderHome();
  const promise = section(HOME_SECTIONS.promise.title);
  const list = within(promise).getByRole("list");
  expect(list).toHaveAttribute("aria-busy", "true");
  // Each body is a hidden layout copy under skeleton lines (fillers, no live
  // value); the only exposed paragraph is the numeral and eyebrow line.
  expect(promise).not.toHaveTextContent(/9,999|7–10/);
  list.querySelectorAll("li").forEach((li) => {
    expect(li.querySelector('p[aria-hidden="true"] .sf-skeleton')).not.toBeNull();
    expect(li.querySelectorAll("p:not([aria-hidden])")).toHaveLength(1);
  });
  await act(async () => settings.resolve(SETTINGS));
  await flush();
  expect(list).not.toHaveAttribute("aria-busy");
  expect(promise).toHaveTextContent("Check out securely online with cards, UPI or net banking.");
});
