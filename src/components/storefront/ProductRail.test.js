import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useReducedMotion } from "framer-motion";
import { buildCartItem } from "../../utils/helpers";
import { ProductCardSkeleton } from "./ProductCard";
import ProductRail from "./ProductRail";

jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(() => false),
}));

const product = (id, extra = {}) => ({
  id,
  slug: `piece-${id}`,
  name: `Piece ${id}`,
  price: 1000 * id,
  comparePrice: 0,
  stock: 5,
  images: [`/img/${id}.jpg`],
  variants: [],
  ...extra,
});
const PRODUCTS = [1, 2, 3, 4, 5, 6].map((id) => product(id));

const renderRail = (props = {}) =>
  render(
    <MemoryRouter>
      <ProductRail products={PRODUCTS} label="Featured pieces" {...props} />
    </MemoryRouter>
  );

// jsdom lays nothing out: report the track as 800px wide with 1200px of
// cards (cards 200px wide), and record scrollBy calls.
const layOut = ({ scrollWidth = 1200, clientWidth = 800 } = {}) => {
  const ul = (el) => el.tagName === "UL";
  jest.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function get() {
    return ul(this) ? scrollWidth : 0;
  });
  jest.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function get() {
    return ul(this) ? clientWidth : 0;
  });
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function rect() {
    return { width: this.tagName === "LI" ? 200 : 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
  });
  const scrollBy = jest.fn();
  HTMLElement.prototype.scrollBy = scrollBy;
  return scrollBy;
};

afterEach(() => {
  jest.restoreAllMocks();
  delete HTMLElement.prototype.scrollBy;
  useReducedMotion.mockReturnValue(false);
});

test("is a named carousel group that keeps its cards in a list", () => {
  renderRail();
  const rail = screen.getByRole("group", { name: "Featured pieces" });
  expect(rail).toHaveAttribute("aria-roledescription", "carousel");
  const items = within(rail).getAllByRole("listitem");
  expect(items).toHaveLength(6);
  expect(within(items[0]).getAllByRole("link")[0]).toHaveAttribute("href", "/products/piece-1");
});

test("can be named by a visible heading instead", () => {
  render(
    <MemoryRouter>
      <h2 id="rail-title">Trending</h2>
      <ProductRail products={PRODUCTS} labelledBy="rail-title" />
    </MemoryRouter>
  );
  expect(screen.getByRole("group", { name: "Trending" })).toHaveAttribute("aria-labelledby", "rail-title");
});

test("renders nothing without products once loaded", () => {
  const { container } = renderRail({ products: [] });
  expect(container).toBeEmptyDOMElement();
});

test("holds skeleton cards while loading, hidden from assistive technology", () => {
  const { container } = renderRail({ products: [], loading: true });
  const rail = screen.getByRole("group", { name: "Featured pieces" });
  expect(rail).toHaveAttribute("aria-busy", "true");
  const skeletons = container.querySelectorAll('li[aria-hidden="true"]');
  expect(skeletons).toHaveLength(4);
  // Each is ProductCardSkeleton, so the rail keeps its height when cards arrive.
  const { container: card } = render(<ProductCardSkeleton />);
  skeletons.forEach((li) => expect(li.innerHTML).toBe(card.innerHTML));
  expect(within(rail).queryAllByRole("link")).toHaveLength(0);
  // An empty placeholder holds the controls' row; no button exists yet.
  expect(within(rail).queryByRole("button")).not.toBeInTheDocument();
  expect(rail.lastElementChild).toHaveAttribute("aria-hidden", "true");
  expect(rail.lastElementChild).toBeEmptyDOMElement();
});

test("a compact rail holds six skeletons, or the count asked for", () => {
  const { container, rerender } = renderRail({ products: [], loading: true, compact: true });
  expect(container.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(6);
  rerender(
    <MemoryRouter>
      <ProductRail products={[]} loading skeletonCount={3} label="Featured pieces" />
    </MemoryRouter>
  );
  expect(container.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(3);
});

test("shows no controls when every card fits", () => {
  layOut({ scrollWidth: 800, clientWidth: 800 });
  renderRail();
  expect(screen.queryByRole("button", { name: "Next pieces" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Previous pieces" })).not.toBeInTheDocument();
});

test("offers labelled previous and next buttons that control the track", () => {
  layOut();
  renderRail();
  const previous = screen.getByRole("button", { name: "Previous pieces" });
  const next = screen.getByRole("button", { name: "Next pieces" });
  const track = screen.getByRole("list");
  expect(previous).toHaveAttribute("aria-controls", track.id);
  expect(next).toHaveAttribute("aria-controls", track.id);
  // At the start: previous stays focusable but is marked unavailable.
  expect(previous).toHaveAttribute("aria-disabled", "true");
  expect(next).not.toHaveAttribute("aria-disabled");
});

test("next scrolls by the whole cards in view, smoothly", () => {
  const scrollBy = layOut();
  renderRail();
  fireEvent.click(screen.getByRole("button", { name: "Next pieces" }));
  // 800px of track, 200px cards: four cards per page.
  expect(scrollBy).toHaveBeenCalledWith({ left: 800, behavior: "smooth" });
});

test("scrolls without smoothing under reduced motion", () => {
  useReducedMotion.mockReturnValue(true);
  const scrollBy = layOut();
  renderRail();
  fireEvent.click(screen.getByRole("button", { name: "Next pieces" }));
  expect(scrollBy).toHaveBeenCalledWith({ left: 800, behavior: "auto" });
});

test("follows the scroll position: the ends disable their button", () => {
  const scrollBy = layOut();
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  renderRail();
  const track = screen.getByRole("list");
  const previous = screen.getByRole("button", { name: "Previous pieces" });
  const next = screen.getByRole("button", { name: "Next pieces" });

  act(() => {
    // The end: 1200 − 800. (jsdom keeps no scroll offset, so set it here.)
    Object.defineProperty(track, "scrollLeft", { configurable: true, value: 400 });
    fireEvent.scroll(track);
  });
  expect(next).toHaveAttribute("aria-disabled", "true");
  expect(previous).not.toHaveAttribute("aria-disabled");

  // A disabled button does nothing; the other one scrolls back.
  fireEvent.click(next);
  expect(scrollBy).not.toHaveBeenCalled();
  fireEvent.click(previous);
  expect(scrollBy).toHaveBeenCalledWith({ left: -800, behavior: "smooth" });
});

test("hands each card the built cart item and its wishlist state", () => {
  const onAddToCart = jest.fn();
  const onToggleWishlist = jest.fn();
  const isInWishlist = jest.fn((id) => id === 2);
  renderRail({ onAddToCart, onToggleWishlist, isInWishlist });
  const items = screen.getAllByRole("listitem");

  fireEvent.click(within(items[0]).getByRole("button", { name: "Add Piece 1 to cart" }));
  expect(onAddToCart).toHaveBeenCalledWith(buildCartItem(PRODUCTS[0]));

  expect(within(items[1]).getByRole("button", { name: "Remove Piece 2 from wishlist" })).toBeInTheDocument();
  fireEvent.click(within(items[0]).getByRole("button", { name: "Save Piece 1 to wishlist" }));
  expect(onToggleWishlist).toHaveBeenCalledWith(PRODUCTS[0]);
});
