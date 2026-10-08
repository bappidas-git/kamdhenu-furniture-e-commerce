import React from "react";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import db from "../../../db.json";
import { buildCartItem, formatCurrency } from "../../utils/helpers";
import FrequentlyBoughtTogether from "./FrequentlyBoughtTogether";

// jsdom has no IntersectionObserver (the panel's Reveal uses one).
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

const product = (slug) => db.products.find((p) => p.slug === slug);
const BED = product("king-size-bed"); // ₹34,999, its cheapest finish Walnut
const MATTRESS = product("carlton-mattress"); // ₹8,999 for the Single
const BEDSIDE = product("wooden-bedside-table"); // ₹4,499

// This dom-testing-library computes "Complete the *set*." as "Complete the
// set ." (a space after the <em>); browsers do not.
const accentName = (text) => (name) => name.replace(/ (?=[.,!?])/g, "") === text;
const panel = () => within(screen.getByRole("region", { name: accentName("Complete the set.") }));
const total = () => document.querySelector('[aria-live="polite"]').textContent;

const renderSet = (props = {}) => {
  const onAddToCart = jest.fn();
  const utils = render(
    <MemoryRouter>
      <FrequentlyBoughtTogether
        anchor={BED}
        companions={[MATTRESS, BEDSIDE]}
        onAddToCart={onAddToCart}
        {...props}
      />
    </MemoryRouter>
  );
  return { ...utils, onAddToCart };
};

test("renders nothing without companions or without an anchor", () => {
  const { container, rerender } = renderSet({ companions: [] });
  expect(container).toBeEmptyDOMElement();
  rerender(
    <MemoryRouter>
      <FrequentlyBoughtTogether anchor={null} companions={[MATTRESS]} />
    </MemoryRouter>
  );
  expect(container).toBeEmptyDOMElement();
});

test("a curated set, said as such: 'Curated by us', 'Complete the set.'", () => {
  renderSet();
  expect(panel().getByText("Curated by us")).toHaveClass("sf-eyebrow");
  expect(panel().getByRole("heading", { level: 2 }).querySelector("em")).toHaveTextContent("set");
  expect(screen.queryByText(/bought together|also bought|customers/i)).not.toBeInTheDocument();
});

test("the anchor is always in; companions start ticked", () => {
  renderSet();
  const anchor = panel().getByRole("checkbox", { name: "King Size Bed" });
  expect(anchor).toBeChecked();
  expect(anchor).toBeDisabled();
  expect(panel().getByRole("checkbox", { name: "Carlton Mattress" })).toBeChecked();
  expect(panel().getByRole("checkbox", { name: "Wooden Bedside Table" })).toBeChecked();
  expect(panel().getByText("This piece · Walnut")).toBeInTheDocument();
});

test("each piece names the option that would be added and its price", () => {
  renderSet();
  // buildCartItem adds a piece's cheapest option: the Carlton's Single.
  const mattress = panel().getByRole("checkbox", { name: "Carlton Mattress" });
  const detail = document.getElementById(mattress.getAttribute("aria-describedby"));
  expect(detail).toHaveTextContent(`Single${formatCurrency(8999)}`);
  expect(buildCartItem(MATTRESS).variantName).toBe("Single");
});

test("photographs: the anchor's is decoration, a companion's opens its page", () => {
  const { container } = renderSet();
  const images = container.querySelectorAll("img");
  expect(images[0]).toHaveAttribute("alt", "");
  expect(images[0].closest("a")).toBeNull();
  expect(panel().getByRole("link", { name: "Carlton Mattress" })).toHaveAttribute(
    "href",
    "/products/carlton-mattress"
  );
  images.forEach((img) => expect(img).toHaveAttribute("loading", "lazy"));
});

test("the total is the sum of the real prices; no bundle discount", () => {
  renderSet();
  expect(total()).toBe(`Total for 3 pieces${formatCurrency(34999 + 8999 + 4499)}`);
  expect(panel().getByRole("button", { name: "Add 3 to cart" })).toBeEnabled();
});

test("unticking a companion updates the total, the label and what is added", () => {
  const { onAddToCart } = renderSet();
  fireEvent.click(panel().getByRole("checkbox", { name: "Carlton Mattress" }));
  expect(total()).toBe(`Total for 2 pieces${formatCurrency(34999 + 4499)}`);

  fireEvent.click(panel().getByRole("button", { name: "Add 2 to cart" }));
  expect(onAddToCart.mock.calls).toEqual([[buildCartItem(BED)], [buildCartItem(BEDSIDE)]]);

  // Ticked again, it is back in.
  fireEvent.click(panel().getByRole("checkbox", { name: "Carlton Mattress" }));
  expect(panel().getByRole("button", { name: "Add 3 to cart" })).toBeInTheDocument();
});

test("companions that arrive after the first render start ticked", () => {
  const { rerender } = renderSet({ companions: [MATTRESS] });
  rerender(
    <MemoryRouter>
      <FrequentlyBoughtTogether anchor={BED} companions={[MATTRESS, BEDSIDE]} onAddToCart={jest.fn()} />
    </MemoryRouter>
  );
  expect(panel().getByRole("checkbox", { name: "Wooden Bedside Table" })).toBeChecked();
  expect(panel().getByRole("button", { name: "Add 3 to cart" })).toBeInTheDocument();
});

test("a sold-out piece cannot be chosen and is left out of the total and the add", () => {
  const soldOut = { ...BEDSIDE, stock: 0 };
  const { onAddToCart } = renderSet({ companions: [MATTRESS, soldOut] });
  const box = panel().getByRole("checkbox", { name: "Wooden Bedside Table" });
  expect(box).not.toBeChecked();
  expect(box).toBeDisabled();
  expect(document.getElementById(box.getAttribute("aria-describedby"))).toHaveTextContent("Sold out");
  expect(total()).toBe(`Total for 2 pieces${formatCurrency(34999 + 8999)}`);
  fireEvent.click(panel().getByRole("button", { name: "Add 2 to cart" }));
  expect(onAddToCart.mock.calls).toEqual([[buildCartItem(BED)], [buildCartItem(MATTRESS)]]);
});

test("with nothing left to add, the button is disabled", () => {
  renderSet({ anchor: { ...BED, stock: 0 }, companions: [MATTRESS] });
  expect(panel().getByRole("checkbox", { name: "King Size Bed" })).not.toBeChecked();
  fireEvent.click(panel().getByRole("checkbox", { name: "Carlton Mattress" }));
  expect(total()).toBe(`Total for 0 pieces${formatCurrency(0)}`);
  expect(panel().getByRole("button", { name: "Add to cart" })).toBeDisabled();
});

test("the total is announced politely as it changes", () => {
  renderSet();
  const live = document.querySelector('[aria-live="polite"]');
  expect(live).toHaveAttribute("aria-atomic", "true");
  expect(panel().getByText(/^Total for/).closest("[aria-live]")).toBe(live);
});
