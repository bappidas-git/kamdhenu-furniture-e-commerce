import React from "react";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { buildCartItem } from "../../utils/helpers";
import RelatedProducts from "./RelatedProducts";

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

const product = (id) => ({
  id,
  slug: `piece-${id}`,
  name: `Piece ${id}`,
  brand: "Nilkamal",
  price: 1000 * id,
  comparePrice: 0,
  stock: 5,
  images: [`/img/${id}.jpg`],
  variants: [],
});
const PRODUCTS = [1, 2, 3, 4, 5].map(product);

// This dom-testing-library computes "You may also *like*." as "You may also
// like ." (a space after the <em>); browsers do not.
const accentName = (text) => (name) => name.replace(/ (?=[.,!?])/g, "") === text;

const renderRelated = (props = {}) =>
  render(
    <MemoryRouter>
      <RelatedProducts products={PRODUCTS} {...props} />
    </MemoryRouter>
  );

test("renders nothing without related products", () => {
  const { container } = renderRelated({ products: [] });
  expect(container).toBeEmptyDOMElement();
});

test("a section headed 'You may also like.' over the shared product rail", () => {
  renderRelated();
  const section = screen.getByRole("region", { name: accentName("You may also like.") });
  expect(within(section).getByText("Related")).toHaveClass("sf-eyebrow");
  expect(within(section).getByRole("heading", { level: 2 }).querySelector("em")).toHaveTextContent("like");

  const rail = within(section).getByRole("group", { name: "Related pieces" });
  expect(rail).toHaveAttribute("aria-roledescription", "carousel");
  expect(within(rail).getAllByRole("listitem")).toHaveLength(5);
  expect(within(rail).getByRole("article", { name: "Piece 3" })).toBeInTheDocument();
});

test("the cards add through the page's handler and toggle the wishlist", () => {
  const onAddToCart = jest.fn();
  const onToggleWishlist = jest.fn();
  renderRelated({ onAddToCart, onToggleWishlist, isInWishlist: (id) => id === 2 });

  fireEvent.click(screen.getByRole("button", { name: "Add Piece 1 to cart" }));
  expect(onAddToCart).toHaveBeenCalledWith(buildCartItem(PRODUCTS[0]));

  const saved = within(screen.getByRole("article", { name: "Piece 2" })).getByRole("button", {
    name: "Remove Piece 2 from wishlist",
  });
  expect(saved).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(within(screen.getByRole("article", { name: "Piece 1" })).getByRole("button", { name: "Save Piece 1 to wishlist" }));
  expect(onToggleWishlist).toHaveBeenCalledWith(PRODUCTS[0]);
});

test("the copy can be set by the caller", () => {
  renderRelated({ eyebrow: "More", title: "Similar *pieces*.", railLabel: "Similar pieces" });
  expect(screen.getByRole("region", { name: accentName("Similar pieces.") })).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Similar pieces" })).toBeInTheDocument();
});
