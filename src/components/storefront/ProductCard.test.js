import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { buildCartItem, PLACEHOLDER_IMG } from "../../utils/helpers";
import ProductCard, { ProductCardSkeleton } from "./ProductCard";

// jsdom has no PointerEvent: give fireEvent one that carries pointerType.
beforeAll(() => {
  window.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerType = init.pointerType || "mouse";
    }
  };
});
afterAll(() => {
  delete window.PointerEvent;
});

const product = (extra = {}) => ({
  id: 7,
  slug: "teak-lounge-chair",
  name: "Teak Lounge Chair",
  brand: "A & S Urbanseat",
  price: 12000,
  comparePrice: 0,
  stock: 6,
  rating: 4.5,
  totalReviews: 0,
  hot: false,
  images: ["/img/7-front.jpg", "/img/7-side.jpg"],
  variants: [
    { id: "v1", name: "Walnut", price: 12000, stock: 3 },
    { id: "v2", name: "Natural", price: 10800, stock: 3 },
  ],
  ...extra,
});

const renderCard = (props = {}) =>
  render(
    <MemoryRouter>
      <ProductCard product={product()} {...props} />
    </MemoryRouter>
  );

const chipsOf = (container) =>
  [...container.querySelectorAll(".sf-badge")].map((chip) => chip.textContent);

test("is an article named by the product, with one link around its image and name", () => {
  renderCard();
  const card = screen.getByRole("article", { name: "Teak Lounge Chair" });
  const links = within(card).getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAccessibleName("Teak Lounge Chair");
  expect(links[0]).toHaveAccessibleDescription("A & S Urbanseat");
  expect(links[0]).toHaveAttribute("href", "/products/teak-lounge-chair");
  // The buttons are not inside the link.
  expect(within(links[0]).queryByRole("button")).not.toBeInTheDocument();

  const image = within(links[0]).getByRole("img", { name: "Teak Lounge Chair" });
  expect(image).toHaveAttribute("src", "/img/7-front.jpg");
  expect(image).toHaveAttribute("width", "1200");
  expect(image).toHaveAttribute("height", "1500");
  expect(image).toHaveAttribute("loading", "lazy");
});

test("links by id without a slug, and falls back to the placeholder image", () => {
  render(
    <MemoryRouter>
      <ProductCard product={product({ slug: "", images: [], image: "" })} />
    </MemoryRouter>
  );
  expect(screen.getByRole("link")).toHaveAttribute("href", "/products/7");
  expect(screen.getByRole("img", { name: "Teak Lounge Chair" })).toHaveAttribute("src", PLACEHOLDER_IMG);
});

test("shows the full name (CSS clamps it); only a very long name is cut in the markup", () => {
  const name = "Solid Sheesham Wood Six-Seater Dining Set with Cushioned Chairs";
  const { rerender } = render(
    <MemoryRouter>
      <ProductCard product={product({ name })} />
    </MemoryRouter>
  );
  expect(screen.getByRole("article", { name })).toBeInTheDocument();

  const long = "x".repeat(140);
  rerender(
    <MemoryRouter>
      <ProductCard product={product({ name: long })} />
    </MemoryRouter>
  );
  expect(screen.getByRole("article")).toHaveAccessibleName(`${"x".repeat(100)}...`);
  expect(screen.getByRole("img")).toHaveAttribute("alt", long);
});

test("omits the brand eyebrow when there is no brand", () => {
  renderCard({ product: product({ brand: "  " }) });
  const link = screen.getByRole("link");
  expect(link).not.toHaveAttribute("aria-describedby");
  expect(screen.queryByText(/urbanseat/i)).not.toBeInTheDocument();
});

test("shows stars and the count only when there are real reviews", () => {
  const { rerender } = renderCard();
  expect(screen.queryByRole("img", { name: /^Rated/ })).not.toBeInTheDocument();
  expect(screen.queryByText("(0)")).not.toBeInTheDocument();

  rerender(
    <MemoryRouter>
      <ProductCard product={product({ totalReviews: 12 })} />
    </MemoryRouter>
  );
  expect(screen.getByRole("img", { name: "Rated 4.5 out of 5, 12 reviews" })).toBeInTheDocument();
  expect(screen.getByText("(12)")).toHaveAttribute("aria-hidden", "true");

  rerender(
    <MemoryRouter>
      <ProductCard product={product({ totalReviews: 1, rating: 5 })} />
    </MemoryRouter>
  );
  expect(screen.getByRole("img", { name: "Rated 5.0 out of 5, 1 review" })).toBeInTheDocument();
});

test("prices the cheapest variant, with the compare-at price struck only when it is higher", () => {
  const { rerender } = renderCard();
  expect(screen.getByText("₹10,800.00")).toBeInTheDocument();
  expect(screen.queryByText(/Was/)).not.toBeInTheDocument();

  rerender(
    <MemoryRouter>
      <ProductCard product={product({ comparePrice: 12000 })} />
    </MemoryRouter>
  );
  expect(screen.getByText("Was")).toHaveClass("sf-visually-hidden");
  expect(screen.getByText("₹12,000.00")).toBeInTheDocument();
  // The card never shows a saving line.
  expect(screen.queryByText(/Save/)).not.toBeInTheDocument();
});

describe("chips come from data alone, two at most", () => {
  test.each([
    ["no chip by default", {}, []],
    ["Sale from a real compare-at price", { comparePrice: 12000 }, ["Sale"]],
    ["no Sale when compare-at is not higher", { comparePrice: 10800 }, []],
    ["New from the hot flag", { hot: true }, ["New"]],
    ["Sold out from stock 0", { stock: 0 }, ["Sold out"]],
    ["Sale and New", { comparePrice: 12000, hot: true }, ["Sale", "New"]],
    ["Sold out first, then Sale; New is dropped", { stock: 0, comparePrice: 12000, hot: true }, ["Sold out", "Sale"]],
    ["Sold out and New", { stock: 0, hot: true }, ["Sold out", "New"]],
  ])("%s", (_, extra, expected) => {
    const { container } = renderCard({ product: product(extra) });
    expect(chipsOf(container)).toEqual(expected);
  });
});

test("the wishlist toggle is a pressed button with Save / Remove labels", () => {
  const onToggleWishlist = jest.fn();
  const item = product();
  const { rerender } = render(
    <MemoryRouter>
      <ProductCard product={item} onToggleWishlist={onToggleWishlist} />
    </MemoryRouter>
  );
  const save = screen.getByRole("button", { name: `Save ${item.name} to wishlist` });
  expect(save).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(save);
  expect(onToggleWishlist).toHaveBeenCalledWith(item);

  rerender(
    <MemoryRouter>
      <ProductCard product={item} onToggleWishlist={onToggleWishlist} isWishlisted />
    </MemoryRouter>
  );
  expect(screen.getByRole("button", { name: `Remove ${item.name} from wishlist` })).toHaveAttribute("aria-pressed", "true");
});

test("hides the heart and the quick add when their handlers are omitted", () => {
  const { rerender } = renderCard();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();

  rerender(
    <MemoryRouter>
      <ProductCard product={product()} onAddToCart={jest.fn()} showAddToCart={false} />
    </MemoryRouter>
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("quick add sends the built cart item and says Added for 1.2s", () => {
  jest.useFakeTimers();
  try {
    const onAddToCart = jest.fn();
    const item = product();
    render(
      <MemoryRouter>
        <ProductCard product={item} onAddToCart={onAddToCart} />
      </MemoryRouter>
    );
    const add = screen.getByRole("button", { name: "Add Teak Lounge Chair to cart" });
    expect(add).toHaveTextContent("Add to cart");
    fireEvent.click(add);
    // The cheapest variant, exactly as the product page would add it.
    expect(onAddToCart).toHaveBeenCalledWith(buildCartItem(item));
    expect(onAddToCart.mock.calls[0][0]).toMatchObject({ id: "7-v2", variantId: "v2", price: 10800 });
    expect(add).toHaveTextContent("Added");
    // An opacity swap: "Added" and the touch disc's check fade in (no pop).
    expect(within(add).getByText("Added")).toHaveClass("sf-fade-in");
    // eslint-disable-next-line testing-library/no-node-access -- the check is decorative (aria-hidden): no role to query
    expect(add.querySelector("svg.sf-fade-in")).not.toBeNull();

    act(() => jest.advanceTimersByTime(1100));
    expect(add).toHaveTextContent("Added");
    act(() => jest.advanceTimersByTime(150));
    expect(add).toHaveTextContent("Add to cart");
    // The accessible name stays put (the cart toast announces the add).
    expect(add).toHaveAccessibleName("Add Teak Lounge Chair to cart");
  } finally {
    jest.useRealTimers();
  }
});

test("a sold-out card disables the quick add and labels it Sold out", () => {
  const onAddToCart = jest.fn();
  renderCard({ product: product({ stock: 0 }), onAddToCart });
  const button = screen.getByRole("button", { name: "Sold out" });
  expect(button).toBeDisabled();
  expect(button).toHaveTextContent("Sold out");
  fireEvent.click(button);
  expect(onAddToCart).not.toHaveBeenCalled();
});

test("mounts the second photograph on the first mouse hover, lazy and hidden, shown once loaded", () => {
  const { container } = renderCard();
  const card = screen.getByRole("article");
  expect(container.querySelectorAll("img")).toHaveLength(1);

  fireEvent.pointerEnter(card, { pointerType: "touch" });
  expect(container.querySelectorAll("img")).toHaveLength(1);

  fireEvent.pointerEnter(card, { pointerType: "mouse" });
  const imgs = container.querySelectorAll("img");
  expect(imgs).toHaveLength(2);
  const second = imgs[1];
  expect(second).toHaveAttribute("src", "/img/7-side.jpg");
  expect(second).toHaveAttribute("alt", "");
  expect(second).toHaveAttribute("aria-hidden", "true");
  expect(second).toHaveAttribute("loading", "lazy");
  const before = second.className;
  fireEvent.load(second);
  expect(second.className).not.toBe(before);
  expect(second.className.split(" ").length).toBeGreaterThan(before.split(" ").filter(Boolean).length);
});

test("drops a second photograph that fails to load, and needs a different one", () => {
  const { container } = renderCard();
  fireEvent.pointerEnter(screen.getByRole("article"), { pointerType: "mouse" });
  fireEvent.error(container.querySelectorAll("img")[1]);
  expect(container.querySelectorAll("img")).toHaveLength(1);

  const { container: same } = renderCard({ product: product({ images: ["/img/a.jpg", "/img/a.jpg"] }) });
  fireEvent.pointerEnter(within(same).getByRole("article"), { pointerType: "mouse" });
  expect(same.querySelectorAll("img")).toHaveLength(1);
});

test("renders nothing without a product", () => {
  const { container } = render(
    <MemoryRouter>
      <ProductCard product={null} />
    </MemoryRouter>
  );
  expect(container).toBeEmptyDOMElement();
});

test("the skeleton is the card's box, hidden from assistive technology", () => {
  const { container } = render(<ProductCardSkeleton className="extra" />);
  const root = container.firstChild;
  expect(root).toHaveAttribute("aria-hidden", "true");
  expect(root).toHaveClass("extra");
  expect(root.querySelector(".sf-skeleton--image")).toBeInTheDocument();
  expect(root.querySelectorAll(".sf-skeleton")).toHaveLength(4);
});
