import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Swal from "sweetalert2";
import apiService from "../services/api";
import { TOKENS } from "../theme/tokens";
import { AuthProvider } from "./AuthContext";
import { CartProvider, useCart, useCartActions } from "./CartContext";

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

// isCartReady (Prompt 34): checkout waits for it before it says the cart is
// empty, so a cart saved on another device is never reported as empty while
// the account's read is still on its way.
describe("isCartReady", () => {
  test("a signed-in cart is ready once the account's saved cart has been read", async () => {
    let finishRead;
    apiService.cart.getCart.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRead = resolve;
        })
    );
    renderCart();
    await waitFor(() => expect(apiService.cart.getCart).toHaveBeenCalled());
    expect(latest.isCartReady).toBe(false);

    await act(async () => finishRead([row(7, 2, 1)]));
    expect(latest.isCartReady).toBe(true);
    expect(screen.getByTestId("lines")).toHaveTextContent("2-v1×1");
  });

  test("a failed read counts as read: the device's lines are the cart", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    apiService.cart.getCart.mockImplementationOnce(() => Promise.reject(new Error("Network Error")));
    renderCart({ device: [line(4, 1)] });
    await waitFor(() => expect(latest.isCartReady).toBe(true));
    expect(screen.getByTestId("lines")).toHaveTextContent("4-v1×1");
    console.error.mockRestore();
  });

  test("a guest's cart is the device's, so it is ready at once", () => {
    render(
      <AuthProvider>
        <CartProvider>
          <Probe />
        </CartProvider>
      </AuthProvider>
    );
    expect(latest.isCartReady).toBe(true);
    expect(apiService.cart.getCart).not.toHaveBeenCalled();
  });
});

// ── The toasts and the two contexts (the follow-up to Prompt 32) ───────────────
// An add that opens the drawer holds its toast until the drawer has painted and
// slid in: SweetAlert's classes on <html> restyled the whole page inside the
// drawer's first frame. And the actions live in a context of their own, so a
// component that only adds to the cart does not re-render when it changes.
describe("toasts and the actions' own context", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const renderGuestCart = (extra = null) =>
    render(
      <AuthProvider>
        <CartProvider>
          <Probe />
          {extra}
        </CartProvider>
      </AuthProvider>
    );
  const toastTitles = () => Swal.fire.mock.calls.map(([options]) => options.title);

  test("an add that opens the drawer shows its toast after the drawer's first frame and entrance", () => {
    jest.useFakeTimers();
    renderGuestCart();
    act(() => {
      latest.addToCart(line(2, 1));
    });
    expect(screen.getByTestId("lines")).toHaveTextContent("2-v1×1");
    expect(latest.isCartOpen).toBe(true);
    expect(Swal.fire).not.toHaveBeenCalled();

    // The first frame (requestAnimationFrame), then all but the last moment
    // of the entrance: still held.
    act(() => {
      jest.advanceTimersByTime(16 + TOKENS.motion.durationMs.base - 1);
    });
    expect(Swal.fire).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(Swal.fire).toHaveBeenCalledTimes(1);
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        toast: true,
        icon: "success",
        title: "Added to cart",
        text: "Piece 2 is in your cart.",
      })
    );
  });

  test("a second add of the same line says Cart updated, held the same way", () => {
    jest.useFakeTimers();
    renderGuestCart();
    act(() => {
      latest.addToCart(line(2, 1));
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      latest.addToCart(line(2, 1));
    });
    expect(screen.getByTestId("lines")).toHaveTextContent("2-v1×2");
    expect(toastTitles()).toEqual(["Added to cart"]);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(toastTitles()).toEqual(["Added to cart", "Cart updated"]);
  });

  test("an add that leaves the drawer closed (Buy now) shows its toast at once", () => {
    renderGuestCart();
    act(() => {
      latest.addToCart(line(2, 1), 1, { openDrawer: false });
    });
    expect(latest.isCartOpen).toBe(false);
    expect(toastTitles()).toEqual(["Added to cart"]);
  });

  test("a cart toast fired while one is held replaces it, as it would a shown one", () => {
    jest.useFakeTimers();
    renderGuestCart();
    act(() => {
      latest.addToCart(line(2, 1));
    });
    act(() => {
      latest.removeFromCart("2-v1");
    });
    expect(toastTitles()).toEqual(["Removed from cart"]);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(toastTitles()).toEqual(["Removed from cart"]);
  });

  test("the actions never change: a component that reads only them does not re-render with the cart", () => {
    let probeCalls = 0;
    const seen = [];
    const ActionsProbe = () => {
      probeCalls += 1;
      seen.push(useCartActions());
      return null;
    };
    renderGuestCart(<ActionsProbe />);
    const callsBefore = probeCalls;

    act(() => {
      latest.addToCart(line(2, 1));
    });
    act(() => {
      latest.updateQuantity("2-v1", 3);
    });
    act(() => {
      latest.setIsCartOpen(false);
    });
    expect(screen.getByTestId("lines")).toHaveTextContent("2-v1×3");
    expect(probeCalls).toBe(callsBefore);
    expect(new Set(seen).size).toBe(1);
    expect(Object.keys(seen[0]).sort()).toEqual([
      "addToCart",
      "clearCart",
      "removeFromCart",
      "setIsCartOpen",
      "toggleCart",
      "updateQuantity",
    ]);
    // useCart still has the whole cart, the actions included.
    expect(latest.addToCart).toBe(seen[0].addToCart);
    expect(latest.getCartItemCount()).toBe(3);
    expect(latest.getCartTotal()).toBe(2997);
  });

  test("both hooks need the provider", () => {
    const Lost = ({ hook }) => {
      hook();
      return null;
    };
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Lost hook={useCartActions} />)).toThrow("useCartActions must be used within a CartProvider");
    expect(() => render(<Lost hook={useCart} />)).toThrow("useCart must be used within a CartProvider");
    console.error.mockRestore();
  });
});
