import React from "react";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { HOME_SECTIONS } from "../../content/homeContent";
import { buildCartItem } from "../../utils/helpers";
import FeaturedProducts from "./FeaturedProducts";

// jsdom has no IntersectionObserver (the section's Reveal uses one).
beforeAll(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterAll(() => {
  delete window.IntersectionObserver;
});

const PRODUCTS = [1, 2, 3].map((id) => ({
  id,
  slug: `featured-${id}`,
  name: `Featured ${id}`,
  price: 2000 * id,
  comparePrice: 0,
  stock: 4,
  images: [`/img/${id}.jpg`],
  variants: [],
}));

// This dom-testing-library computes "Pieces we *recommend*." as
// "Pieces we recommend ." (a space after the <em>); browsers do not.
const accentName = (text) => (name) => name.replace(/ (?=[.,!?])/g, "") === text;

const renderFeatured = (props = {}) =>
  render(
    <MemoryRouter>
      <FeaturedProducts products={PRODUCTS} {...props} />
    </MemoryRouter>
  );

test("defaults to the home page's Featured Collections copy", () => {
  renderFeatured();
  const copy = HOME_SECTIONS.featured;
  const section = screen.getByRole("region", { name: accentName("Pieces we recommend.") });
  const title = within(section).getByRole("heading", { level: 2 });
  expect(title).toHaveTextContent("Pieces we recommend.");
  expect(title.querySelector("em")).toHaveTextContent("recommend");
  expect(within(section).getByText(copy.eyebrow)).toBeInTheDocument();
  expect(within(section).getByRole("link", { name: copy.viewAll.label })).toHaveAttribute(
    "href",
    copy.viewAll.to
  );
  const rail = within(section).getByRole("group", { name: copy.railLabel });
  expect(rail).toHaveAttribute("aria-roledescription", "carousel");
  expect(within(rail).getAllByRole("listitem")).toHaveLength(3);
});

test("takes its copy, link and heading id from props", () => {
  renderFeatured({
    eyebrow: "New",
    title: "Just *arrived*.",
    viewAllLink: "/products?sort=newest",
    viewAllLabel: "See everything",
    railLabel: "New pieces",
    headingId: "new-title",
  });
  const section = screen.getByRole("region", { name: accentName("Just arrived.") });
  expect(section).toHaveAttribute("aria-labelledby", "new-title");
  expect(within(section).getByText("New")).toBeInTheDocument();
  expect(within(section).getByRole("link", { name: "See everything" })).toHaveAttribute(
    "href",
    "/products?sort=newest"
  );
  expect(within(section).getByRole("group", { name: "New pieces" })).toBeInTheDocument();
});

test("an empty link hides View all", () => {
  renderFeatured({ viewAllLink: "" });
  expect(screen.queryByRole("link", { name: "View all" })).not.toBeInTheDocument();
});

test("is hidden when there is nothing to feature", () => {
  const { container } = renderFeatured({ products: [] });
  expect(container).toBeEmptyDOMElement();
});

test("shows skeleton cards while the products load", () => {
  const { container } = renderFeatured({ products: [], loading: true });
  const rail = screen.getByRole("group", { name: HOME_SECTIONS.featured.railLabel });
  expect(rail).toHaveAttribute("aria-busy", "true");
  expect(container.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(4);
  expect(within(rail).queryAllByRole("link")).toHaveLength(0);
});

test("renders the storefront ProductCard wired to the page's handlers", () => {
  const onAddToCart = jest.fn();
  const onToggleWishlist = jest.fn();
  const isInWishlist = jest.fn((id) => id === 3);
  renderFeatured({ onAddToCart, onToggleWishlist, isInWishlist });
  const items = screen.getAllByRole("listitem");

  // One link per card (its image and name) leads to the product.
  within(items[0])
    .getAllByRole("link", { name: "Featured 1" })
    .forEach((link) => expect(link).toHaveAttribute("href", "/products/featured-1"));
  fireEvent.click(within(items[1]).getByRole("button", { name: "Add Featured 2 to cart" }));
  expect(onAddToCart).toHaveBeenCalledWith(buildCartItem(PRODUCTS[1]));
  fireEvent.click(within(items[0]).getByRole("button", { name: "Save to wishlist" }));
  expect(onToggleWishlist).toHaveBeenCalledWith(PRODUCTS[0]);
  expect(within(items[2]).getByRole("button", { name: "Remove from wishlist" })).toBeInTheDocument();
});
