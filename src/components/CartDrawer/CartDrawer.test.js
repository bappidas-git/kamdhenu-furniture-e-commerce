import React from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import { CartProvider, useCart } from "../../context/CartContext";
import { STOREFRONT_CONFIG } from "../../theme/tokens";
import db from "../../../db.json";
import CartDrawer from "./CartDrawer";

// The drawer runs against the real CartProvider (guest cart in localStorage),
// so every change goes through the context's own updateQuantity,
// removeFromCart and addToCart. Only the network, auth and toasts are stubbed.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    shipping: { getMethods: jest.fn() },
    settings: { get: jest.fn() },
    cart: { getCart: jest.fn(), addToCart: jest.fn(), removeFromCart: jest.fn() },
  },
}));
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn(() => Promise.resolve({})) } }));

const SEEDED_METHODS = db.shipping_methods.filter((method) => method.isActive);
const SETTINGS = db.settings;

const line = (overrides) => ({
  productId: 12,
  variantId: "v1",
  variantName: "Marble Beige",
  name: "Cushioned Plastic Armchair",
  image: "https://placehold.co/1200x1500/f1ebe1/686158?text=Armchair",
  price: 2499,
  comparePrice: 2899,
  currency: "INR",
  quantity: 1,
  stock: 38,
  ...overrides,
});

const ARMCHAIR = line({ id: "12-v1", quantity: 2 });
const RACK = line({
  id: "9-v1",
  productId: 9,
  variantName: "2 shelves",
  name: "Slim Plastic Shoe Rack",
  price: 1249,
  comparePrice: 0,
  stock: 10,
});
const CHAIR = line({
  id: "4-v1",
  productId: 4,
  variantName: "White",
  name: "Classic Plastic Chair",
  price: 699,
  comparePrice: 0,
  stock: 46,
});

const seedCart = (lines) => localStorage.setItem("cart", JSON.stringify(lines));

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
};

// Mounted the way Header mounts it: open={isCartOpen}, onClose closes it.
const Host = ({ quickAdd }) => {
  const { isCartOpen, setIsCartOpen, addToCart } = useCart();
  return (
    <>
      <button type="button" onClick={() => setIsCartOpen(true)}>
        Open cart
      </button>
      <button type="button" onClick={() => addToCart(quickAdd)}>
        Quick add
      </button>
      <button type="button" onClick={() => addToCart(quickAdd, 1, { openDrawer: false })}>
        Buy now
      </button>
      <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};

// Stands in for the browser's back/forward: a route change the drawer did
// not make.
const RouteChanger = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/about")}>
      Change route
    </button>
  );
};

const renderDrawer = ({ lines = [ARMCHAIR, RACK], initialEntries = ["/products"], quickAdd = CHAIR } = {}) => {
  seedCart(lines);
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CartProvider>
        <Host quickAdd={quickAdd} />
        <RouteChanger />
        <LocationProbe />
      </CartProvider>
    </MemoryRouter>
  );
};

const openDrawer = async () => {
  const opener = screen.getByRole("button", { name: "Open cart" });
  opener.focus();
  fireEvent.click(opener);
  const dialog = await screen.findByRole("dialog", { name: "Your cart" });
  return { dialog, opener };
};

// The store reads settle in a later microtask; wait for the trust row.
const waitForStore = (dialog) => within(dialog).findByRole("list", { name: "Our promises" });

const pressEscape = () => fireEvent.keyDown(screen.getByRole("dialog", { name: "Your cart" }), { key: "Escape" });
const dialogGone = () => waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
const currentLocation = () => screen.getByTestId("location").textContent;
// The footer's <dl>: Subtotal, then Delivery.
const subtotalValue = (dialog) => within(dialog).getAllByRole("definition")[0];
const deliveryValue = (dialog) => within(dialog).getAllByRole("definition")[1];
const lineItems = (dialog) =>
  within(within(dialog).getByRole("list", { name: "Your cart" })).getAllByRole("listitem");

let returnsWindow;

beforeEach(() => {
  // framer-motion restores the window's scroll offset after measuring a
  // height: "auto" animation; jsdom has no window.scrollTo.
  window.scrollTo = jest.fn();
  localStorage.clear();
  returnsWindow = STOREFRONT_CONFIG.returnsWindowDays;
  apiService.shipping.getMethods.mockReset();
  apiService.settings.get.mockReset();
  apiService.shipping.getMethods.mockResolvedValue(SEEDED_METHODS);
  apiService.settings.get.mockResolvedValue(SETTINGS);
});

afterEach(() => {
  STOREFRONT_CONFIG.returnsWindowDays = returnsWindow;
  document.body.style.overflow = "";
});

describe("dialog behaviour", () => {
  test("a modal dialog named by its title and described by the count; focus starts on Close; the page is locked", async () => {
    const { container } = renderDrawer();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const { dialog } = await openDrawer();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("heading", { level: 2, name: "Your cart" })).toBeInTheDocument();
    expect(dialog).toHaveAccessibleDescription("3 items");
    expect(within(dialog).getByRole("button", { name: "Close cart" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    // Rendered in a portal on <body>, outside the app's root.
    expect(container).not.toContainElement(dialog);
    expect(document.body).toContainElement(dialog);
    await waitForStore(dialog);
  });

  test("Escape closes it, unlocks the page and returns focus to the opener", async () => {
    renderDrawer();
    const { dialog, opener } = await openDrawer();
    await waitForStore(dialog);
    pressEscape();
    await dialogGone();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  test("Tab and Shift+Tab stay inside", async () => {
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    const close = within(dialog).getByRole("button", { name: "Close cart" });
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    const last = within(dialog).getByRole("button", { name: "Continue shopping" });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(close).toHaveFocus();
  });

  test("the backdrop and the close button close it", async () => {
    renderDrawer();
    let { dialog } = await openDrawer();
    await waitForStore(dialog);
    fireEvent.click(document.body.querySelector(".backdrop"));
    await dialogGone();

    ({ dialog } = await openDrawer());
    fireEvent.click(within(dialog).getByRole("button", { name: "Close cart" }));
    await dialogGone();
  });

  test("addToCart opens it from anywhere, with focus inside; Buy now's openDrawer: false does not", async () => {
    renderDrawer({ lines: [] });
    fireEvent.click(screen.getByRole("button", { name: "Buy now" }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem("cart"))).toHaveLength(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const quickAdd = screen.getByRole("button", { name: "Quick add" });
    quickAdd.focus();
    fireEvent.click(quickAdd);
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    expect(within(dialog).getByRole("button", { name: "Close cart" })).toHaveFocus();
    // Buy now's line plus the quick add merged into one line of two.
    expect(lineItems(dialog)).toHaveLength(1);
    expect(within(dialog).getByRole("group", { name: "Quantity, Classic Plastic Chair, White" })).toHaveTextContent("2");
    await waitForStore(dialog);

    pressEscape();
    await dialogGone();
    expect(quickAdd).toHaveFocus();
  });

  test("a route change underneath (back, forward) closes it", async () => {
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    fireEvent.click(screen.getByRole("button", { name: "Change route" }));
    await dialogGone();
    expect(currentLocation()).toBe("/about");
  });

  test("a product link closes it as it navigates", async () => {
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    fireEvent.click(within(dialog).getByRole("link", { name: "Slim Plastic Shoe Rack" }), { button: 0 });
    await dialogGone();
    expect(currentLocation()).toBe("/products/9");
  });
});

describe("free delivery", () => {
  test("below the threshold: what is left to add, a polite live line, and the delivery terms", async () => {
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    // 2 × 2,499 + 1,249 = 6,247; 9,999 − 6,247 = 3,752.
    const progress = within(dialog).getByText(/more for free delivery/);
    expect(progress).toHaveTextContent("Add ₹3,752.00 more for free delivery");
    expect(progress).toHaveAttribute("aria-live", "polite");
    expect(deliveryValue(dialog)).toHaveTextContent("₹499.00 · , free above ₹9,999.00");
    expect(within(deliveryValue(dialog)).getByText("·")).toHaveAttribute("aria-hidden", "true");
    expect(within(dialog).getByText("Taxes calculated at checkout")).toBeInTheDocument();
    expect(subtotalValue(dialog)).toHaveTextContent("₹6,247.00");
  });

  test("crossing the threshold unlocks it in the same live line; dropping back shows the gap again", async () => {
    renderDrawer({ lines: [line({ id: "12-v1", quantity: 3 }), RACK] });
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    // 3 × 2,499 + 1,249 = 8,746.
    const live = within(dialog).getByText(/more for free delivery/);
    expect(live).toHaveTextContent("Add ₹1,253.00 more for free delivery");

    const group = within(dialog).getByRole("group", { name: "Quantity, Cushioned Plastic Armchair, Marble Beige" });
    fireEvent.click(within(group).getByRole("button", { name: "Increase quantity" }));
    // 4 × 2,499 + 1,249 = 11,245.
    expect(live).toHaveTextContent("Free delivery unlocked");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(deliveryValue(dialog)).toHaveTextContent(/^Free$/);

    fireEvent.click(within(group).getByRole("button", { name: "Decrease quantity" }));
    expect(live).toHaveTextContent("Add ₹1,253.00 more for free delivery");
  });

  test("exactly at the threshold counts, as at checkout", async () => {
    renderDrawer({ lines: [line({ id: "1-x", productId: 1, variantName: null, price: 9999, comparePrice: 0 })] });
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    expect(within(dialog).getByText("Free delivery unlocked")).toBeInTheDocument();
    expect(deliveryValue(dialog)).toHaveTextContent(/^Free$/);
  });

  test("nothing is drawn until the shipping methods have been read", async () => {
    let resolveMethods;
    apiService.shipping.getMethods.mockReturnValue(
      new Promise((resolve) => {
        resolveMethods = resolve;
      })
    );
    renderDrawer();
    const { dialog } = await openDrawer();
    expect(within(dialog).queryByText(/free delivery/i)).not.toBeInTheDocument();
    expect(deliveryValue(dialog)).toHaveAttribute("aria-busy", "true");
    expect(within(dialog).queryByRole("list", { name: "Our promises" })).not.toBeInTheDocument();

    await act(async () => resolveMethods(SEEDED_METHODS));
    expect(within(dialog).getByText(/more for free delivery/)).toBeInTheDocument();
    expect(deliveryValue(dialog)).not.toHaveAttribute("aria-busy");
  });

  test("no method with a threshold: no progress at all, and the lowest rate", async () => {
    apiService.shipping.getMethods.mockResolvedValue(
      SEEDED_METHODS.map((method) => ({ ...method, freeAbove: null }))
    );
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    expect(within(dialog).queryByText(/free delivery/i)).not.toBeInTheDocument();
    expect(deliveryValue(dialog)).toHaveTextContent(/^₹499\.00$/);
  });

  test("a method that is free at any amount: delivery is free and there is nothing to unlock", async () => {
    apiService.shipping.getMethods.mockResolvedValue([
      ...SEEDED_METHODS,
      { ...db.shipping_methods.find((method) => method.rateType === "free"), isActive: true },
    ]);
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    expect(within(dialog).queryByText(/free delivery/i)).not.toBeInTheDocument();
    expect(deliveryValue(dialog)).toHaveTextContent(/^Free$/);
  });

  test("a failed read: no progress, delivery calculated at checkout, and a new read on the next opening", async () => {
    apiService.shipping.getMethods.mockRejectedValueOnce(new Error("offline"));
    renderDrawer();
    let { dialog } = await openDrawer();
    await waitForStore(dialog);
    expect(within(dialog).queryByText(/free delivery/i)).not.toBeInTheDocument();
    expect(deliveryValue(dialog)).toHaveTextContent("Calculated at checkout");

    pressEscape();
    await dialogGone();
    ({ dialog } = await openDrawer());
    expect(await within(dialog).findByText(/more for free delivery/)).toBeInTheDocument();
    expect(apiService.shipping.getMethods).toHaveBeenCalledTimes(2);
  });

  test("the store is read once, when the drawer first opens", async () => {
    renderDrawer();
    expect(apiService.shipping.getMethods).not.toHaveBeenCalled();
    expect(apiService.settings.get).not.toHaveBeenCalled();
    let { dialog } = await openDrawer();
    await waitForStore(dialog);
    pressEscape();
    await dialogGone();
    ({ dialog } = await openDrawer());
    await waitForStore(dialog);
    expect(within(dialog).getByText(/more for free delivery/)).toBeInTheDocument();
    expect(apiService.shipping.getMethods).toHaveBeenCalledTimes(1);
    expect(apiService.settings.get).toHaveBeenCalledTimes(1);
  });

  test("inactive methods are ignored, as at checkout", async () => {
    apiService.shipping.getMethods.mockResolvedValue([
      { ...SEEDED_METHODS[0], freeAbove: 4999, isActive: false },
      ...SEEDED_METHODS,
    ]);
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    expect(within(dialog).getByText(/more for free delivery/)).toHaveTextContent("Add ₹3,752.00");
  });
});

describe("promises", () => {
  const labels = (dialog) =>
    within(within(dialog).getByRole("list", { name: "Our promises" }))
      .getAllByRole("listitem")
      .map((item) => item.textContent);

  test("secure payment, cash on delivery while enabled, and the returns window", async () => {
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    expect(labels(dialog)).toEqual([
      "Secure payment",
      "Cash on Delivery",
      `Easy returns · , ${STOREFRONT_CONFIG.returnsWindowDays} days`,
    ]);
  });

  test("a one-day window reads “1 day”", async () => {
    STOREFRONT_CONFIG.returnsWindowDays = 1;
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    expect(labels(dialog)).toContain("Easy returns · , 1 day");
  });

  test("no cash on delivery while it is switched off; no returns line at 0 days", async () => {
    apiService.settings.get.mockResolvedValue({ ...SETTINGS, payment: { ...SETTINGS.payment, codEnabled: false } });
    STOREFRONT_CONFIG.returnsWindowDays = 0;
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    expect(labels(dialog)).toEqual(["Secure payment"]);
  });

  test("a failed settings read never claims cash on delivery", async () => {
    apiService.settings.get.mockRejectedValue(new Error("offline"));
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    expect(labels(dialog)).toEqual([
      "Secure payment",
      `Easy returns · , ${STOREFRONT_CONFIG.returnsWindowDays} days`,
    ]);
  });
});

describe("lines", () => {
  test("each line: product links, option, unit price with the struck compare-at price, quantity and total", async () => {
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    const [armchair, rack] = lineItems(dialog);

    const name = within(armchair).getByRole("link", { name: "Cushioned Plastic Armchair" });
    expect(name).toHaveAttribute("href", "/products/12");
    // The thumbnail repeats the name link for the pointer only.
    const [thumbLink] = within(armchair).getAllByRole("link", { hidden: true });
    expect(thumbLink).toHaveAttribute("href", "/products/12");
    expect(thumbLink).toHaveAttribute("tabindex", "-1");
    expect(thumbLink).toHaveAttribute("aria-hidden", "true");
    const thumb = within(thumbLink).getByRole("img", { hidden: true });
    expect(thumb).toHaveAttribute("loading", "lazy");
    expect(thumb).toHaveAttribute("alt", "");
    expect(within(armchair).getByText("Marble Beige")).toBeInTheDocument();
    expect(within(armchair).getByText("₹2,499.00")).toBeInTheDocument();
    expect(within(armchair).getByText("₹2,899.00")).toHaveTextContent("Was ₹2,899.00");
    expect(within(armchair).getByText("₹4,998.00")).toHaveTextContent("Line total ₹4,998.00");

    // No compare-at price: nothing struck, and no stray "0".
    expect(within(rack).queryByText(/Was/)).not.toBeInTheDocument();
    expect(rack.textContent).not.toMatch(/(^|[^\d,.])0(?![\d,.])/);
  });

  test("the stepper: − is unavailable at 1, + stops at the stock the line knows of, focus stays put", async () => {
    renderDrawer({ lines: [line({ id: "12-v1", quantity: 1, stock: 2 })] });
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    const group = within(dialog).getByRole("group", { name: "Quantity, Cushioned Plastic Armchair, Marble Beige" });
    const decrease = within(group).getByRole("button", { name: "Decrease quantity" });
    const increase = within(group).getByRole("button", { name: "Increase quantity" });
    const value = within(group).getByText("1");
    expect(value).toHaveAttribute("aria-live", "polite");
    expect(decrease).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(decrease);
    expect(value).toHaveTextContent("1");

    increase.focus();
    fireEvent.click(increase);
    expect(value).toHaveTextContent("2");
    expect(increase).toHaveAttribute("aria-disabled", "true");
    expect(increase).toHaveAttribute("title", "No more stock available");
    expect(increase).toHaveFocus();
    fireEvent.click(increase);
    expect(value).toHaveTextContent("2");
    expect(decrease).not.toHaveAttribute("aria-disabled");
    expect(dialog).toHaveAccessibleDescription("2 items");
    expect(subtotalValue(dialog)).toHaveTextContent("₹4,998.00");
  });

  test("a line whose stock is 0 cannot grow", async () => {
    renderDrawer({ lines: [line({ id: "12-v1", stock: 0 })] });
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    const increase = within(dialog).getByRole("button", { name: "Increase quantity" });
    expect(increase).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(increase);
    expect(within(dialog).getByRole("group", { name: /^Quantity/ })).toHaveTextContent("1");
  });

  test("a line without a known stock can always grow", async () => {
    renderDrawer({ lines: [line({ id: "12-v1", stock: undefined })] });
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    const increase = within(dialog).getByRole("button", { name: "Increase quantity" });
    expect(increase).not.toHaveAttribute("aria-disabled");
    fireEvent.click(increase);
    expect(within(dialog).getByRole("group", { name: /^Quantity/ })).toHaveTextContent("2");
  });

  test("Remove is a text button named after its line; focus moves to the next line's Remove", async () => {
    renderDrawer({ lines: [ARMCHAIR, RACK, CHAIR] });
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    const remove = within(dialog).getByRole("button", { name: "Remove Cushioned Plastic Armchair, Marble Beige" });
    expect(remove).toHaveTextContent(/^Remove/);
    // A real click focuses the button it lands on.
    remove.focus();
    fireEvent.click(remove);
    expect(within(dialog).getByRole("button", { name: "Remove Slim Plastic Shoe Rack, 2 shelves" })).toHaveFocus();
    await waitFor(() => expect(lineItems(dialog)).toHaveLength(2));
    expect(JSON.parse(localStorage.getItem("cart")).map((item) => item.id)).toEqual(["9-v1", "4-v1"]);

    // The last line hands focus back to the one before it.
    const removeLast = within(dialog).getByRole("button", { name: "Remove Classic Plastic Chair, White" });
    removeLast.focus();
    fireEvent.click(removeLast);
    expect(within(dialog).getByRole("button", { name: "Remove Slim Plastic Shoe Rack, 2 shelves" })).toHaveFocus();
  });

  test("a removed line leaves the tab order while it folds away", async () => {
    renderDrawer({ lines: [ARMCHAIR, RACK] });
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    const armchairLine = lineItems(dialog)[0];
    expect(armchairLine.firstElementChild).not.toHaveAttribute("inert");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove Cushioned Plastic Armchair, Marble Beige" }));
    expect(armchairLine).toBeInTheDocument();
    expect(armchairLine.firstElementChild).toHaveAttribute("inert", "");
    await waitFor(() => expect(armchairLine).not.toBeInTheDocument());
  });

  test("removing the last line shows the empty state and reads it out", async () => {
    renderDrawer({ lines: [RACK] });
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove Slim Plastic Shoe Rack, 2 shelves" }));
    const message = await within(dialog).findByText("Your cart is empty.");
    await waitFor(() => expect(message).toHaveFocus());
    expect(within(dialog).queryByRole("link", { name: "Checkout" })).not.toBeInTheDocument();
    expect(dialog).not.toHaveAttribute("aria-describedby");
    // The free-delivery block folds away with the last line.
    await waitFor(() => expect(within(dialog).queryByText(/free delivery/i)).not.toBeInTheDocument());
  });
});

describe("footer and navigation", () => {
  test("one Checkout link (no duplicate View Cart) and Continue shopping", async () => {
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    expect(within(dialog).queryByText(/view cart/i)).not.toBeInTheDocument();
    const checkout = within(dialog).getByRole("link", { name: "Checkout" });
    expect(checkout).toHaveAttribute("href", "/checkout");
    expect(checkout).toHaveClass("sf-btn", "sf-btn--primary", "sf-btn--lg", "sf-btn--block");

    fireEvent.click(within(dialog).getByRole("button", { name: "Continue shopping" }));
    await dialogGone();
    expect(currentLocation()).toBe("/products");
  });

  test("Checkout closes the drawer as it navigates", async () => {
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    fireEvent.click(within(dialog).getByRole("link", { name: "Checkout" }), { button: 0 });
    await dialogGone();
    expect(currentLocation()).toBe("/checkout");
  });

  test("a modified click (new tab) leaves the drawer open", async () => {
    renderDrawer();
    const { dialog } = await openDrawer();
    await waitForStore(dialog);
    // The browser would open a new tab; jsdom cannot, so the click's default
    // is cancelled after the app has handled it.
    const stopNavigation = (event) => event.preventDefault();
    window.addEventListener("click", stopNavigation);
    try {
      fireEvent.click(within(dialog).getByRole("link", { name: "Cushioned Plastic Armchair" }), {
        button: 0,
        ctrlKey: true,
      });
      // Longer than the exit animation: a closing drawer would be gone by now.
      await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
    } finally {
      window.removeEventListener("click", stopNavigation);
    }
    expect(screen.getByRole("dialog", { name: "Your cart" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(currentLocation()).toBe("/products");
  });

  test("the empty state: the message, a line and Browse furniture to the listing", async () => {
    renderDrawer({ lines: [], initialEntries: ["/"] });
    const { dialog } = await openDrawer();
    expect(within(dialog).getByText("Your cart is empty.")).toBeInTheDocument();
    expect(dialog).not.toHaveAttribute("aria-describedby");
    const browse = within(dialog).getByRole("link", { name: "Browse furniture" });
    expect(browse).toHaveAttribute("href", "/products");
    expect(within(dialog).queryByText("Subtotal")).not.toBeInTheDocument();
    fireEvent.click(browse, { button: 0 });
    await dialogGone();
    expect(currentLocation()).toBe("/products");
  });

  test("one piece reads “1 item”", async () => {
    renderDrawer({ lines: [RACK] });
    const { dialog } = await openDrawer();
    expect(dialog).toHaveAccessibleDescription("1 item");
    await waitForStore(dialog);
  });
});
