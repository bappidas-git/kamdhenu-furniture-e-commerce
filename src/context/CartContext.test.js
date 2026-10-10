import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../services/api";
import { AuthProvider } from "./AuthContext";
import { CartProvider, useCart } from "./CartContext";

// CartContext's mirror of a signed-in cart to the account (the duplicate-read
// follow-up, Prompt 32): the account's cart is read once on a page load, and
// written only when the cart differs from what the server holds. Before, every
// signed-in page load read it a second time and rewrote it line by line.
jest.mock("../services/api", () => ({
  __esModule: true,
  default: {
    auth: { login: jest.fn(), logout: jest.fn() },
    cart: { getCart: jest.fn(), addToCart: jest.fn(), removeFromCart: jest.fn() },
  },
  getErrorMessage: (error) => error?.message,
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn(() => Promise.resolve({})) } }));

const CUSTOMER = { id: 1, email: "user@example.com", firstName: "John", lastName: "Doe" };

// A line as the device keeps it, and as the account's server row holds it.
const line = (productId, quantity, extra = {}) => ({
  id: `${productId}-v1`,
  productId,
  variantId: "v1",
  variantName: "White",
  name: `Piece ${productId}`,
  image: "",
  price: 999,
  comparePrice: 0,
  currency: "INR",
  quantity,
  stock: 30,
  ...extra,
});
const row = (rowId, productId, quantity) => {
  const { id: _lineId, ...fields } = line(productId, quantity);
  return { id: rowId, userId: CUSTOMER.id, ...fields };
};

let latest;
const Probe = () => {
  latest = useCart();
  return <p data-testid="lines">{latest.cartItems.map((item) => `${item.id}×${item.quantity}`).join(" ")}</p>;
};

const renderCart = ({ device = [] } = {}) => {
  sessionStorage.setItem("user", JSON.stringify(CUSTOMER));
  sessionStorage.setItem("token", "mock-token-1-1");
  localStorage.setItem("cart", JSON.stringify(device));
  return render(
    <AuthProvider>
      <CartProvider>
        <Probe />
      </CartProvider>
    </AuthProvider>
  );
};

// The account's cart has been read and merged (the device's lines can show
// before it: the merge must not be raced).
const accountCartLoaded = async () => {
  await waitFor(() => expect(apiService.cart.getCart).toHaveBeenCalled());
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

// Past the mirror's 600ms debounce, and the writes it queues.
const pastTheDebounce = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 900));
  });

let serverRows;
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  serverRows = [];
  let nextId = 100;
  apiService.cart.getCart.mockImplementation(() => Promise.resolve(serverRows.map((r) => ({ ...r }))));
  apiService.cart.removeFromCart.mockImplementation((id) => {
    serverRows = serverRows.filter((r) => r.id !== id);
    return Promise.resolve({});
  });
  apiService.cart.addToCart.mockImplementation((item) => {
    const saved = { ...item, id: (nextId += 1) };
    serverRows.push(saved);
    return Promise.resolve(saved);
  });
});

test("a page load whose device cart is what the account holds: one read, nothing written", async () => {
  serverRows = [row(7, 2, 2), row(8, 4, 1)];
  renderCart({ device: [line(4, 1), line(2, 2)] });
  await waitFor(() => expect(screen.getByTestId("lines")).toHaveTextContent("4-v1×1 2-v1×2"));
  await accountCartLoaded();
  await pastTheDebounce();
  expect(apiService.cart.getCart).toHaveBeenCalledTimes(1);
  expect(apiService.cart.removeFromCart).not.toHaveBeenCalled();
  expect(apiService.cart.addToCart).not.toHaveBeenCalled();
});

test("a device line the account does not have yet (the sign-in merge) is written, once", async () => {
  serverRows = [row(7, 2, 2)];
  renderCart({ device: [line(4, 1)] });
  await waitFor(() => expect(screen.getByTestId("lines")).toHaveTextContent("4-v1×1 2-v1×2"));
  await accountCartLoaded();
  await pastTheDebounce();
  // The load, then the replace's own read of the rows it rewrites.
  expect(apiService.cart.getCart).toHaveBeenCalledTimes(2);
  expect(apiService.cart.removeFromCart).toHaveBeenCalledWith(7);
  expect(apiService.cart.addToCart).toHaveBeenCalledTimes(2);
  expect(serverRows.map((r) => `${r.productId}×${r.quantity}`).sort()).toEqual(["2×2", "4×1"]);

  // Nothing changes after that: nothing more is written.
  await pastTheDebounce();
  expect(apiService.cart.addToCart).toHaveBeenCalledTimes(2);
});

test("a change is written; a change undone within the debounce writes nothing", async () => {
  serverRows = [row(7, 2, 2)];
  renderCart({ device: [line(2, 2)] });
  await waitFor(() => expect(screen.getByTestId("lines")).toHaveTextContent("2-v1×2"));
  await accountCartLoaded();
  await pastTheDebounce();
  expect(apiService.cart.addToCart).not.toHaveBeenCalled();

  act(() => latest.updateQuantity("2-v1", 3));
  act(() => latest.updateQuantity("2-v1", 2));
  await pastTheDebounce();
  expect(apiService.cart.addToCart).not.toHaveBeenCalled();

  act(() => latest.updateQuantity("2-v1", 3));
  await pastTheDebounce();
  expect(apiService.cart.removeFromCart).toHaveBeenCalledWith(7);
  expect(apiService.cart.addToCart).toHaveBeenCalledTimes(1);
  expect(apiService.cart.addToCart).toHaveBeenCalledWith(expect.objectContaining({ productId: 2, quantity: 3 }));
});

test("the same line held twice on the server is tidied into one", async () => {
  serverRows = [row(7, 2, 2), row(9, 2, 1)];
  renderCart({ device: [line(2, 2)] });
  await waitFor(() => expect(screen.getByTestId("lines")).toHaveTextContent("2-v1×2"));
  await accountCartLoaded();
  await pastTheDebounce();
  expect(serverRows.map((r) => `${r.productId}×${r.quantity}`)).toEqual(["2×2"]);
});

test("a guest's cart is never written to an account", async () => {
  localStorage.setItem("cart", JSON.stringify([line(2, 1)]));
  render(
    <AuthProvider>
      <CartProvider>
        <Probe />
      </CartProvider>
    </AuthProvider>
  );
  await waitFor(() => expect(screen.getByTestId("lines")).toHaveTextContent("2-v1×1"));
  await pastTheDebounce();
  expect(apiService.cart.getCart).not.toHaveBeenCalled();
  expect(apiService.cart.addToCart).not.toHaveBeenCalled();
});
