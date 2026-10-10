import React, { Profiler, useEffect, useRef, useState } from "react";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Swal from "sweetalert2";
import { useReducedMotion } from "framer-motion";
import apiService from "../../services/api";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { WishlistProvider, useWishlist } from "../../context/WishlistContext";
import { CartProvider, useCart } from "../../context/CartContext";
import {
  buildCartItem,
  getDefaultCartVariant,
  getProductMinPrice,
  productPath,
} from "../../utils/helpers";
import db from "../../../db.json";
import Wishlist, { SORT_OPTIONS, REMOVE_DELAY_MS, describeStock, toCardProduct } from "./Wishlist";

// /wishlist (prompts/DESIGN_SYSTEM.md §35) against the real AuthProvider,
// WishlistProvider and CartProvider: the session is restored from storage,
// guests keep their list in localStorage and a sign-in merges it into the
// account, as in the app. Only the network, SweetAlert and useReducedMotion
// are stubbed. The account with saved pieces is the seeded customer
// (db.json users[2]: L-Shaped Sofa, Ergonomic High-Back Chair, Bentwood-Style
// Café Chair); jane@example.com (users[1]) has none.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    auth: { login: jest.fn(), logout: jest.fn() },
    wishlist: { get: jest.fn(), add: jest.fn(), remove: jest.fn() },
    cart: { getCart: jest.fn(), addToCart: jest.fn(), removeFromCart: jest.fn() },
  },
  getErrorMessage: (error) => error?.message,
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn() } }));
jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(),
}));

const clone = (value) => JSON.parse(JSON.stringify(value));
const withoutPassword = ({ password: _password, ...user }) => user;
const SHOPPER = withoutPassword(db.users[2]);
const JANE = withoutPassword(db.users[1]);
const product = (id) => clone(db.products.find((p) => p.id === id));
const accountRows = (userId) => clone(db.wishlist.filter((row) => row.userId === userId));

const BENTWOOD = "Bentwood-Style Café Chair"; // row 3, product 37, added last
const ERGONOMIC = "Ergonomic High-Back Chair with Headrest"; // row 2, product 31
const SOFA = "L-Shaped Sofa"; // row 1, product 48, added first

// WishlistContext's buildWishlistItem, copied: the snapshot a heart saves.
let localIds = 0;
const savedRow = (p, addedAt) => ({
  id: `local-test-${(localIds += 1)}`,
  productId: p.id,
  slug: p.slug || null,
  name: p.name,
  image: p.images?.[0] || p.image,
  brand: p.brand,
  category: p.category,
  price: p.price,
  comparePrice: p.comparePrice,
  rating: p.rating,
  totalReviews: p.totalReviews,
  shortDescription: p.shortDescription,
  variants: p.variants,
  stock: p.stock,
  trending: p.trending,
  hot: p.hot,
  addedAt: addedAt || new Date().toISOString(),
});

// ---------------------------------------------------------------------------
// The old page's rules (HEAD before this prompt), copied verbatim: the new
// page must give the same answers.
// ---------------------------------------------------------------------------
const reference = {
  sorted: (wishlistItems, sortBy) => {
    const items = [...wishlistItems];
    switch (sortBy) {
      case "dateAsc":
        return items.sort((a, b) => new Date(a.addedAt || 0) - new Date(b.addedAt || 0));
      case "dateDesc":
        return items.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
      case "priceLow":
        return items.sort(
          (a, b) => getProductMinPrice(a).sellingPrice - getProductMinPrice(b).sellingPrice
        );
      case "priceHigh":
        return items.sort(
          (a, b) => getProductMinPrice(b).sellingPrice - getProductMinPrice(a).sellingPrice
        );
      case "ratingHigh":
        return items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:
        return items;
    }
  },
  inStock: (item) => {
    const defaultVariant = getDefaultCartVariant(item);
    const stockValue = defaultVariant ? defaultVariant.stock : item.stock;
    return stockValue == null || stockValue === "" || Number(stockValue) > 0;
  },
  // The line "Add to Cart" and "Move to Cart" added.
  cartLine: (item) => buildCartItem({ ...item, id: item.productId }),
};

// Rows whose stock is read differently by a careless rule: the default
// (cheapest) variant sold out while others are not, stock as text, no stock
// known, a negative count, and a row that carries its own images.
const edgeRows = () => {
  const rack = savedRow(product(10));
  rack.variants[0].stock = 0;
  const stackable = savedRow(product(26));
  stackable.stock = "0";
  const alna = savedRow(product(69));
  alna.stock = "";
  const unknownVariant = savedRow(product(58));
  delete unknownVariant.variants[0].stock;
  unknownVariant.stock = 0;
  const negative = savedRow(product(70));
  negative.stock = -2;
  const textStock = savedRow(product(70));
  textStock.stock = "12";
  const noImage = savedRow(product(4));
  delete noImage.image;
  const withImages = { ...savedRow(product(37)), images: ["a.jpg", "b.jpg"] };
  const emptyImages = { ...savedRow(product(37)), images: [] };
  return [rack, stackable, alna, unknownVariant, negative, textStock, noImage, withImages, emptyImages];
};

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

// The real cart drawer and auth dialog fade out over --sf-duration with focus
// still inside them; the fakes stay on screen as long after closing, so the
// page has to wait for them to leave before it moves focus.
const EXIT_MS = 320;
const useLingering = (open) => {
  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (open) {
      setShown(true);
      return undefined;
    }
    const timer = setTimeout(() => setShown(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);
  return open || shown;
};

// The cart drawer, reduced to what the page meets: a modal dialog that takes
// focus while the cart is open (the real one is the header's).
const FakeCartDrawer = ({ onClose }) => {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current.focus();
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label="Cart">
      <button ref={closeRef} type="button" onClick={onClose}>
        Close cart
      </button>
    </div>
  );
};

// The auth dialog, reduced the same way: a modal dialog that takes focus,
// signs in, and closes 1.5s after a sign-in, as the real one does
// (AuthModal's CLOSE_AFTER_SIGN_IN_MS).
const CLOSE_AFTER_SIGN_IN_MS = 1500;
const FakeAuthDialog = () => {
  const { closeAuthModal, login } = useAuth();
  const signInRef = useRef(null);
  useEffect(() => {
    signInRef.current.focus();
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome back">
      <button
        ref={signInRef}
        type="button"
        onClick={async () => {
          await login({ email: "shopper@example.com", password: "password123" });
          setTimeout(closeAuthModal, CLOSE_AFTER_SIGN_IN_MS);
        }}
      >
        Dialog sign-in
      </button>
    </div>
  );
};

// Where the router is, the auth dialog (the header's), the wishlist's rows
// (their ids: local ones until the account has them), the cart's lines and
// its drawer.
const Harness = () => {
  const location = useLocation();
  const { authModalOpen, authModalTab } = useAuth();
  const { wishlistItems, isLoading } = useWishlist();
  const { cartItems, isCartOpen, setIsCartOpen } = useCart();
  const drawerShown = useLingering(isCartOpen);
  const dialogShown = useLingering(authModalOpen);
  return (
    <div>
      <span data-testid="location">{location.pathname}</span>
      <span data-testid="saved">
        {isLoading ? "loading" : wishlistItems.map((row) => row.id).join(" ")}
      </span>
      <span data-testid="dialog">{authModalOpen ? authModalTab : "closed"}</span>
      <span data-testid="cart">
        {cartItems.map((line) => `${line.id}×${line.quantity}`).join(" ")}
      </span>
      {drawerShown && <FakeCartDrawer onClose={() => setIsCartOpen(false)} />}
      {dialogShown && <FakeAuthDialog />}
    </div>
  );
};

const signIn = (user) => {
  sessionStorage.setItem("user", JSON.stringify(user));
  sessionStorage.setItem("token", `mock-token-${user.id}`);
};

const renderPage = ({ user = null, deviceRows = null, path = "/wishlist" } = {}) => {
  if (user) signIn(user);
  if (deviceRows) localStorage.setItem("wishlist", JSON.stringify(deviceRows));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <main>
              <Routes>
                <Route
                  path="/wishlist"
                  element={
                    <Profiler id="wishlist" onRender={recordCommit}>
                      <Wishlist />
                    </Profiler>
                  }
                />
                <Route
                  path="/products"
                  element={
                    <p>
                      Products page <Link to="/wishlist">Your wishlist</Link>
                    </p>
                  }
                />
                <Route path="/products/:slug" element={<p>Product page</p>} />
              </Routes>
            </main>
            <Harness />
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

// What the page showed in each of its commits, read as the commit lands
// (React's Profiler calls onRender in the commit, once the DOM has changed):
// a state shown for one commit and taken back inside act() still shows here.
const LIST_SELECTOR = 'ul[aria-label="Saved pieces"]';
const NO_COUNT = "\u00a0";
// The session restore's commit: nothing drawn.
const BLANK = { list: false, skeleton: false, empty: false, banner: false, nav: false, count: null };
const pageCommits = [];
/* eslint-disable testing-library/no-node-access -- reading the DOM as each commit lands */
function recordCommit() {
  const main = document.querySelector("main");
  if (!main) return;
  const count = main.querySelector(".count");
  pageCommits.push({
    list: Boolean(main.querySelector(LIST_SELECTOR)),
    skeleton: main.textContent.includes("Loading your wishlist"),
    empty: main.textContent.includes("Nothing saved yet."),
    banner: main.textContent.includes("Saved on this device."),
    nav: Boolean(main.querySelector('nav[aria-label="Account"]')),
    count: count ? count.textContent : null,
  });
}
/* eslint-enable testing-library/no-node-access */

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const list = () => screen.getByRole("list", { name: "Saved pieces" });
const findList = () => screen.findByRole("list", { name: "Saved pieces" });
// The list on screen, and the effects of the render that showed it run.
// findBy* can resolve before them: that render happened outside act(), so
// React's scheduler runs its effects in a later task (setTimeout(0) in
// jsdom), and an empty act() does not flush them. The contexts mirror their
// lists into refs in those effects (clearWishlist reads the ref), a gap no
// person can click into. One task later they have run (timers are FIFO).
// The scheduler keeps the real setTimeout it found at import, so the wait is
// a real task as well (taken at import too), also under fake timers.
const realSetTimeout = setTimeout;
const loaded = async () => {
  const shown = await findList();
  await act(async () => {
    await new Promise((resolve) => realSetTimeout(resolve, 0));
  });
  return shown;
};
const pieceItem = (name) =>
  within(list())
    .getAllByRole("listitem")
    .find((item) => within(item).queryByRole("article", { name }));
// The names on screen, in order (each piece's Remove names its piece).
const shownNames = () =>
  within(list())
    .getAllByRole("button", { name: /^Remove .* from wishlist$/ })
    .map((button) => button.getAttribute("aria-label").slice("Remove ".length, -" from wishlist".length));
const removeButton = (name) => screen.getByRole("button", { name: `Remove ${name} from wishlist` });
const moveButton = (name) => screen.getByRole("button", { name: `Move to cart, ${name}` });
const quickAdd = (name) => screen.getByRole("button", { name: `Add ${name} to cart` });
const toasts = (title) => Swal.fire.mock.calls.filter(([options]) => options?.title === title);
// Waits that span the 300ms dim or a 320ms fade-out get room under load.
const SLOW = { timeout: 3000 };
// Lets the contexts' resolved API calls finish inside act(), which then waits
// a task of its own, so whatever they changed has rendered.
const settle = () =>
  act(async () => {
    await Promise.resolve();
  });

// CRA resets every mock before each test (resetMocks): implementations here.
// console.error fails a test (an act() warning, a crash) unless it expects one.
let consoleError;
let confirmClear;
beforeEach(() => {
  pageCommits.length = 0;
  sessionStorage.clear();
  localStorage.clear();
  useReducedMotion.mockReturnValue(false);
  apiService.auth.login.mockResolvedValue(SHOPPER);
  apiService.auth.logout.mockResolvedValue(undefined);
  apiService.wishlist.get.mockImplementation((userId) => Promise.resolve(accountRows(userId)));
  let nextId = 100;
  apiService.wishlist.add.mockImplementation((row) => Promise.resolve({ ...row, id: (nextId += 1) }));
  apiService.wishlist.remove.mockResolvedValue({});
  apiService.cart.getCart.mockResolvedValue([]);
  apiService.cart.addToCart.mockImplementation((line) => Promise.resolve(line));
  apiService.cart.removeFromCart.mockResolvedValue({});
  confirmClear = false;
  Swal.fire.mockImplementation((options) =>
    Promise.resolve(
      options?.title === "Clear your wishlist?"
        ? { isConfirmed: confirmClear, isDismissed: !confirmClear }
        : { isConfirmed: false, isDismissed: true }
    )
  );
  jest.spyOn(window, "scrollTo").mockImplementation(() => {});
  consoleError = jest.spyOn(console, "error");
});

afterEach(() => {
  jest.useRealTimers();
  const calls = consoleError.mock.calls;
  consoleError.mockRestore();
  window.scrollTo.mockRestore();
  expect(calls).toEqual([]);
});

// ── The rules (unchanged) ─────────────────────────────────────────────────────

describe("the rules", () => {
  test("the sort options are the old ones, and a piece dims for 300ms before it leaves", () => {
    expect(SORT_OPTIONS).toEqual([
      { value: "dateDesc", label: "Recently added" },
      { value: "dateAsc", label: "Oldest first" },
      { value: "priceLow", label: "Price: low to high" },
      { value: "priceHigh", label: "Price: high to low" },
      { value: "ratingHigh", label: "Highest rated" },
    ]);
    expect(REMOVE_DELAY_MS).toBe(300);
  });

  test("the card's quick add builds the old Add to Cart line for every product and edge row it can add", () => {
    const rows = [...db.products.map((p) => savedRow(product(p.id))), ...edgeRows()];
    // A row out of stock shows a disabled "Sold out" quick add: it builds no line.
    const addable = rows.filter((row) => reference.inStock(row));
    expect(addable.length).toBeGreaterThan(db.products.length);
    addable.forEach((row) => {
      const line = buildCartItem(toCardProduct(row));
      expect([row.productId, line]).toEqual([row.productId, reference.cartLine(row)]);
      const variant = getDefaultCartVariant(row);
      expect(line.id).toBe(variant ? `${row.productId}-${variant.id}` : String(row.productId));
    });
  });

  test("the stock rule is the old one; the card's Sold out follows it, and unknown stock says nothing", () => {
    const rows = [...db.products.map((p) => savedRow(product(p.id))), ...edgeRows()];
    rows.forEach((row) => {
      const { inStock, label } = describeStock(row);
      expect([row.productId, inStock]).toEqual([row.productId, reference.inStock(row)]);
      expect([row.productId, toCardProduct(row).stock === 0]).toEqual([row.productId, !inStock]);
      const defaultVariant = getDefaultCartVariant(row);
      const value = defaultVariant ? defaultVariant.stock : row.stock;
      const known = !(value == null || value === "");
      expect(label).toBe(known ? (inStock ? "In stock" : "Sold out") : null);
    });
    const [rack, stackable, alna, unknownVariant, negative, textStock] = edgeRows();
    expect(describeStock(rack)).toMatchObject({ inStock: false, label: "Sold out" });
    expect(describeStock(stackable)).toMatchObject({ inStock: false, label: "Sold out" });
    expect(describeStock(alna)).toMatchObject({ inStock: true, label: null });
    expect(describeStock(unknownVariant)).toMatchObject({ inStock: true, label: null });
    expect(toCardProduct(unknownVariant).stock).not.toBe(0);
    expect(describeStock(negative)).toMatchObject({ inStock: false, label: "Sold out" });
    expect(describeStock(textStock)).toMatchObject({ inStock: true, label: "In stock" });
  });

  test("the card's product: the product id under id, the photograph under images", () => {
    const row = savedRow(product(37));
    const card = toCardProduct(row);
    expect(card.id).toBe(37);
    expect(card.images).toEqual([row.image]);
    expect(productPath(card)).toBe(productPath(row));
    expect(productPath(card)).toBe("/products/bentwood-style-cafe-chair");
    const [, , , , , , noImage, withImages, emptyImages] = edgeRows();
    expect(toCardProduct(noImage).images).toEqual([]);
    expect(toCardProduct(withImages).images).toEqual(["a.jpg", "b.jpg"]);
    expect(toCardProduct(emptyImages).images).toEqual([emptyImages.image]);
  });
});

// ── Guests ─────────────────────────────────────────────────────────────────────

describe("guests", () => {
  const guestRows = () => [
    savedRow(product(37), "2026-10-01T10:00:00.000Z"),
    savedRow(product(10), "2026-10-02T10:00:00.000Z"),
    savedRow(product(55), "2026-10-03T10:00:00.000Z"),
  ];

  test("the device's pieces under the header, the banner above them, no account rail and no request", async () => {
    renderPage({ deviceRows: guestRows() });
    await loaded();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your wishlist");
    expect(screen.getByText("3 pieces")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Account" })).not.toBeInTheDocument();
    expect(screen.getByText("Saved on this device.")).toBeInTheDocument();
    expect(screen.getByText("Sign in to keep your wishlist across devices.")).toBeInTheDocument();
    expect(shownNames()).toEqual(["King Size Bed", "Wide Plastic Shoe Rack", BENTWOOD]);
    expect(apiService.wishlist.get).not.toHaveBeenCalled();
  });

  test("a reload: nothing drawn until the session restore settles, then the banner and the pieces together", async () => {
    renderPage({ deviceRows: guestRows() });
    await loaded();
    // So the banner never arrives above a toolbar already drawn, pushing it down.
    const [restoring, ...drawn] = pageCommits;
    expect(restoring).toEqual(BLANK);
    expect(drawn.length).toBeGreaterThan(0);
    drawn.forEach((commit) =>
      expect(commit).toEqual({ list: true, skeleton: false, empty: false, banner: true, nav: false, count: "3 pieces" })
    );
  });

  test("the banner's Sign in opens the auth dialog on its Sign in tab", async () => {
    renderPage({ deviceRows: guestRows() });
    const signInButton = await screen.findByRole("button", { name: "Sign in" });
    expect(signInButton).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(signInButton);
    expect(screen.getByTestId("dialog")).toHaveTextContent("login");
  });

  test("nothing saved: the banner, then the empty state with Browse furniture; no toolbar", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Nothing saved yet." })
    ).toBeInTheDocument();
    expect(screen.getByText("Saved on this device.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse furniture" })).toHaveAttribute("href", "/products");
    expect(screen.queryByLabelText("Sort by")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear all saved pieces" })).not.toBeInTheDocument();
    expect(screen.queryByText("0 pieces")).not.toBeInTheDocument();
  });

  test("signing in from the banner uploads the device's pieces to the account, and focus moves to the h1", async () => {
    apiService.auth.login.mockResolvedValue(JANE);
    const rows = [savedRow(product(4), "2026-10-01T10:00:00.000Z"), savedRow(product(9), "2026-10-02T10:00:00.000Z")];
    renderPage({ deviceRows: rows });
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    const dialogSignIn = screen.getByRole("button", { name: "Dialog sign-in" });
    expect(dialogSignIn).toHaveFocus();
    fireEvent.click(dialogSignIn);

    // The merge has rendered: the rows carry the account's ids (it settles
    // after the cart's own sign-in read).
    await waitFor(() => expect(screen.getByTestId("saved")).toHaveTextContent(/^101 102$/));
    expect(screen.getByRole("navigation", { name: "Account" })).toBeInTheDocument();
    expect(apiService.wishlist.add).toHaveBeenCalledTimes(2);
    expect(apiService.wishlist.get).toHaveBeenCalledWith(JANE.id);
    const uploaded = apiService.wishlist.add.mock.calls.map(([row]) => [row.productId, row.userId]);
    expect(uploaded).toEqual([
      [4, JANE.id],
      [9, JANE.id],
    ]);
    apiService.wishlist.add.mock.calls.forEach(([row]) => expect(row).not.toHaveProperty("id"));
    // Not while the dialog is still on screen (it stays 1.5s after a sign-in).
    expect(screen.getByRole("dialog", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveFocus();
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus(), SLOW);
    expect(screen.queryByRole("dialog", { name: "Welcome back" })).not.toBeInTheDocument();
    expect(screen.queryByText("Saved on this device.")).not.toBeInTheDocument();
    expect(shownNames()).toEqual(["Slim Plastic Shoe Rack", "Classic Plastic Chair"]);
    expect(screen.getByText("2 pieces")).toBeInTheDocument();
  });
});

// ── Signed in ──────────────────────────────────────────────────────────────────

describe("signed in", () => {
  test("in the account shell: Wishlist current in the nav, no banner, the account's pieces newest first", async () => {
    renderPage({ user: SHOPPER });
    await loaded();
    const nav = screen.getByRole("navigation", { name: "Account" });
    expect(within(nav).getByRole("link", { name: "Wishlist" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your wishlist");
    expect(screen.queryByText("Saved on this device.")).not.toBeInTheDocument();
    expect(apiService.wishlist.get).toHaveBeenCalledTimes(1);
    expect(apiService.wishlist.get).toHaveBeenCalledWith(SHOPPER.id);
    expect(shownNames()).toEqual([BENTWOOD, ERGONOMIC, SOFA]);
    expect(screen.getByText("3 pieces")).toBeInTheDocument();
  });

  test("a reload with a session: the skeleton until the account's list has merged, never the device's list or an empty state", async () => {
    const read = deferred();
    apiService.wishlist.get.mockReturnValueOnce(read.promise);
    renderPage({ user: SHOPPER, deviceRows: [savedRow(product(4))] });
    expect(screen.getByText("Loading your wishlist")).toBeInTheDocument();
    await settle();
    expect(screen.getByText("Loading your wishlist")).toBeInTheDocument();
    // The session restore's commit draws nothing (so the account rail never
    // arrives beside a page already drawn, pushing it aside); every commit
    // after it, the rail and the skeleton only.
    const [restoring, ...waiting] = pageCommits;
    expect(restoring).toEqual(BLANK);
    expect(waiting.length).toBeGreaterThan(0);
    waiting.forEach((commit) =>
      expect(commit).toEqual({ list: false, skeleton: true, empty: false, banner: false, nav: true, count: NO_COUNT })
    );

    await act(async () => {
      read.resolve(accountRows(SHOPPER.id));
    });
    await loaded();
    // The account's three, plus the device's own piece, uploaded.
    expect(shownNames()).toEqual(expect.arrayContaining([BENTWOOD, ERGONOMIC, SOFA, "Classic Plastic Chair"]));
    expect(screen.queryByText("Loading your wishlist")).not.toBeInTheDocument();
    // In no commit: the device's own list or its count, an empty state, the guest banner.
    const drawn = pageCommits.slice(1);
    expect(drawn.some((commit) => commit.empty || commit.banner || !commit.nav)).toBe(false);
    expect(new Set(drawn.map((commit) => commit.count))).toEqual(new Set([NO_COUNT, "4 pieces"]));
    expect(pageCommits.find((commit) => commit.list)).toMatchObject({ skeleton: false, count: "4 pieces" });
  });

  test("arriving from another page with the account's list loaded: the pieces at once, no skeleton frame", async () => {
    renderPage({ user: SHOPPER, path: "/products" });
    // The account's list has loaded (on the products page), and its effects have run.
    await waitFor(() => expect(screen.getByTestId("saved")).toHaveTextContent(/^1 2 3$/));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(pageCommits).toEqual([]);
    fireEvent.click(screen.getByRole("link", { name: "Your wishlist" }));
    expect(list()).toBeInTheDocument();
    await settle();
    // From its first commit on: the pieces and their count, never the skeleton.
    expect(pageCommits.length).toBeGreaterThan(0);
    pageCommits.forEach((commit) =>
      expect(commit).toEqual({ list: true, skeleton: false, empty: false, banner: false, nav: true, count: "3 pieces" })
    );
    expect(apiService.wishlist.get).toHaveBeenCalledTimes(1);
  });

  test("while the list loads: skeleton pieces in a busy region, the toolbar with Clear all unavailable", async () => {
    const read = deferred();
    apiService.wishlist.get.mockReturnValueOnce(read.promise);
    // The device has its own copy (as after an earlier visit): a clear would
    // have something to clear, and race the merge.
    renderPage({ user: SHOPPER, deviceRows: [savedRow(product(4)), savedRow(product(9))] });
    const loading = screen.getByText("Loading your wishlist");
    // eslint-disable-next-line testing-library/no-node-access -- the busy wrapper has no role
    expect(loading.closest('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByText(/\d+ pieces?$/)).not.toBeInTheDocument();
    const clearAll = screen.getByRole("button", { name: "Clear all saved pieces" });
    expect(clearAll).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(clearAll);
    expect(toasts("Clear your wishlist?")).toHaveLength(0);
    expect(screen.getByText("Your wishlist")).toBeInTheDocument();
    await act(async () => {
      read.resolve(accountRows(SHOPPER.id));
    });
    await loaded();
    expect(screen.getByRole("button", { name: "Clear all saved pieces" })).not.toHaveAttribute("aria-disabled");
  });

  test("Laravel's rows (the product nested) render the same pieces", async () => {
    apiService.wishlist.get.mockImplementation(() =>
      Promise.resolve(
        accountRows(SHOPPER.id).map((row) => ({
          id: row.id,
          productId: row.productId,
          product: product(row.productId),
          createdAt: row.addedAt,
        }))
      )
    );
    renderPage({ user: SHOPPER });
    await loaded();
    expect(shownNames()).toEqual([BENTWOOD, ERGONOMIC, SOFA]);
  });
});

// ── The pieces ─────────────────────────────────────────────────────────────────

describe("the pieces", () => {
  // The timed tests switch to fake timers before the page renders: a timer
  // set on the real clock (the cart's 600ms mirror to the API) and cleared
  // on the fake one draws a warning and still fires, possibly in a later test.
  test("each piece is the storefront card (a link, no heart) with the stock line and the two actions", async () => {
    renderPage({ user: SHOPPER });
    await loaded();
    const item = pieceItem(BENTWOOD);
    const card = within(item).getByRole("article", { name: BENTWOOD });
    expect(within(card).getByRole("link", { name: BENTWOOD })).toHaveAttribute(
      "href",
      "/products/bentwood-style-cafe-chair"
    );
    expect(within(card).getByText("Sale")).toBeInTheDocument();
    expect(within(card).getByRole("img", { name: BENTWOOD })).toBeInTheDocument();
    expect(within(card).getByRole("img", { name: "Rated 4.5 out of 5, 2 reviews" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Save .+ to wishlist$/ })).not.toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /^Remove .+ from wishlist$/ })).not.toBeInTheDocument();
    expect(within(item).getByText("In stock")).toBeInTheDocument();
    expect(within(item).getByRole("button", { name: `Add ${BENTWOOD} to cart` })).toBeEnabled();
    expect(within(item).getByRole("button", { name: `Move to cart, ${BENTWOOD}` })).toBeEnabled();
    expect(within(item).getByRole("button", { name: `Remove ${BENTWOOD} from wishlist` })).toHaveTextContent(
      "Remove"
    );
    // Every piece, in order: card link, quick add, Move to cart, Remove.
    expect(within(list()).getAllByRole("link")).toHaveLength(3);
  });

  test("the card's quick add puts the default variant in the cart (line productId-variantId) and keeps the piece", async () => {
    renderPage({ user: SHOPPER });
    await loaded();
    fireEvent.click(quickAdd(BENTWOOD));
    expect(screen.getByTestId("cart")).toHaveTextContent("37-v1×1");
    expect(screen.getByRole("dialog", { name: "Cart" })).toBeInTheDocument();
    expect(screen.getByText("3 pieces")).toBeInTheDocument();
    expect(toasts("Added to cart")).toHaveLength(1);
  });

  test("Move to cart adds the same line as the quick add, then the piece leaves without a Removed toast", async () => {
    renderPage({ user: SHOPPER });
    await loaded();
    fireEvent.click(quickAdd(BENTWOOD));
    fireEvent.click(screen.getByRole("button", { name: "Close cart" }));
    fireEvent.click(moveButton(BENTWOOD));
    // Merged into the quick add's line: the two build the same line.
    expect(screen.getByTestId("cart")).toHaveTextContent("37-v1×2");
    await screen.findByText("2 pieces", {}, SLOW);
    expect(apiService.wishlist.remove).toHaveBeenCalledWith(3);
    await settle();
    expect(toasts("Removed from wishlist")).toHaveLength(0);
    await waitFor(() => expect(shownNames()).toEqual([ERGONOMIC, SOFA]), SLOW);
  });

  test("Move to cart: the piece dims for 300ms (its actions unavailable), then leaves", async () => {
    jest.useFakeTimers();
    renderPage({ user: SHOPPER });
    await loaded();
    fireEvent.click(moveButton(BENTWOOD));
    expect(screen.getByTestId("cart")).toHaveTextContent("37-v1×1");
    expect(moveButton(BENTWOOD)).toHaveAttribute("aria-disabled", "true");
    expect(removeButton(BENTWOOD)).toHaveAttribute("aria-disabled", "true");
    expect(removeButton(ERGONOMIC)).not.toHaveAttribute("aria-disabled");

    act(() => {
      jest.advanceTimersByTime(REMOVE_DELAY_MS - 1);
    });
    expect(screen.getByText("3 pieces")).toBeInTheDocument();
    expect(apiService.wishlist.remove).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByText("2 pieces")).toBeInTheDocument();
    expect(apiService.wishlist.remove).toHaveBeenCalledTimes(1);
    await settle();
    expect(toasts("Removed from wishlist")).toHaveLength(0);
  });

  test("a second press while a piece dims does nothing (one line in the cart, one removal)", async () => {
    jest.useFakeTimers();
    renderPage({ user: SHOPPER });
    await loaded();
    fireEvent.click(moveButton(BENTWOOD));
    fireEvent.click(moveButton(BENTWOOD));
    fireEvent.click(removeButton(BENTWOOD));
    expect(screen.getByTestId("cart")).toHaveTextContent("37-v1×1");
    act(() => {
      jest.advanceTimersByTime(REMOVE_DELAY_MS);
    });
    await settle();
    expect(screen.getByText("2 pieces")).toBeInTheDocument();
    expect(apiService.wishlist.remove).toHaveBeenCalledTimes(1);
    expect(toasts("Added to cart")).toHaveLength(1);
    expect(toasts("Removed from wishlist")).toHaveLength(0);
  });

  test("Remove pressed twice on one piece: one removal and one Removed toast", async () => {
    jest.useFakeTimers();
    renderPage({ user: SHOPPER });
    await loaded();
    fireEvent.click(removeButton(BENTWOOD));
    fireEvent.click(removeButton(BENTWOOD));
    act(() => {
      jest.advanceTimersByTime(REMOVE_DELAY_MS);
    });
    await settle();
    expect(apiService.wishlist.remove).toHaveBeenCalledTimes(1);
    expect(toasts("Removed from wishlist")).toHaveLength(1);
  });

  test("Remove: the piece leaves after 300ms with the Removed toast, and focus moves to the next piece's Remove", async () => {
    renderPage({ user: SHOPPER });
    await loaded();
    const remove = removeButton(BENTWOOD);
    remove.focus();
    fireEvent.click(remove);
    await waitFor(() => expect(removeButton(ERGONOMIC)).toHaveFocus(), SLOW);
    expect(screen.getByText("2 pieces")).toBeInTheDocument();
    expect(apiService.wishlist.remove).toHaveBeenCalledWith(3);
    await waitFor(() => expect(toasts("Removed from wishlist")).toHaveLength(1), SLOW);
    await waitFor(() => expect(shownNames()).toEqual([ERGONOMIC, SOFA]), SLOW);
  });

  test("Remove on a middle piece: focus moves to the next piece, not the one before", async () => {
    renderPage({ user: SHOPPER });
    await loaded();
    const remove = removeButton(ERGONOMIC);
    remove.focus();
    fireEvent.click(remove);
    await waitFor(() => expect(removeButton(SOFA)).toHaveFocus(), SLOW);
  });

  test("the piece fading out is inert, and focus never lands on it", async () => {
    renderPage({ user: SHOPPER });
    await loaded();
    const remove = removeButton(BENTWOOD);
    remove.focus();
    fireEvent.click(remove);
    await waitFor(() => expect(removeButton(ERGONOMIC)).toHaveFocus(), SLOW);
    // Still in the page while it fades: inert, out of the tab order.
    // eslint-disable-next-line testing-library/no-node-access -- the piece is a role-less wrapper
    const fading = remove.closest("li");
    expect(fading).toHaveAttribute("inert");
    expect(fading).toHaveAttribute("data-exiting");
  });

  test("two removals pressed together: focus goes past both, to the piece that stays", async () => {
    jest.useFakeTimers();
    renderPage({ user: SHOPPER });
    await loaded();
    removeButton(ERGONOMIC).focus();
    fireEvent.click(removeButton(ERGONOMIC));
    removeButton(BENTWOOD).focus();
    fireEvent.click(removeButton(BENTWOOD));
    // Both removals; act() then renders them and runs the effects, which ask
    // for the next animation frame to move focus.
    act(() => {
      jest.advanceTimersByTime(REMOVE_DELAY_MS);
    });
    expect(screen.getByText("1 piece")).toBeInTheDocument();
    // That frame (the clock is fake: requestAnimationFrame too).
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(removeButton(SOFA)).toHaveFocus();
  });

  test("a neighbour about to leave (dimming) is passed over as well", async () => {
    jest.useFakeTimers();
    renderPage({ user: SHOPPER });
    await loaded();
    removeButton(BENTWOOD).focus();
    fireEvent.click(removeButton(BENTWOOD));
    act(() => {
      jest.advanceTimersByTime(150);
    });
    fireEvent.click(removeButton(ERGONOMIC));
    // Bentwood leaves (Ergonomic is still dimming), then the focus frame.
    act(() => {
      jest.advanceTimersByTime(150);
    });
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(screen.getByText("2 pieces")).toBeInTheDocument();
    expect(removeButton(SOFA)).toHaveFocus();
  });

  test("Remove on the last piece on screen: focus moves to the piece before it", async () => {
    renderPage({ user: SHOPPER });
    await loaded();
    const remove = removeButton(SOFA);
    remove.focus();
    fireEvent.click(remove);
    await waitFor(() => expect(removeButton(ERGONOMIC)).toHaveFocus(), SLOW);
  });

  test("Remove on the only piece: the empty state, with focus on its line", async () => {
    renderPage({ deviceRows: [savedRow(product(37))] });
    await loaded();
    expect(screen.getByText("1 piece")).toBeInTheDocument();
    const remove = removeButton(BENTWOOD);
    remove.focus();
    fireEvent.click(remove);
    const empty = await screen.findByRole("heading", { level: 2, name: "Nothing saved yet." });
    await waitFor(() => expect(empty).toHaveFocus(), SLOW);
    expect(JSON.parse(localStorage.getItem("wishlist"))).toEqual([]);
  });

  test("Move to cart: focus waits in the cart drawer however long it is open, then lands on the next piece's Move to cart", async () => {
    jest.useFakeTimers();
    renderPage({ user: SHOPPER });
    await loaded();
    const move = moveButton(BENTWOOD);
    move.focus();
    fireEvent.click(move);
    const close = screen.getByRole("button", { name: "Close cart" });
    expect(close).toHaveFocus();
    act(() => {
      jest.advanceTimersByTime(REMOVE_DELAY_MS);
    });
    expect(screen.getByText("2 pieces")).toBeInTheDocument();
    // A while in the drawer: the page never pulls focus out of a dialog, and
    // it does not give up on the move either.
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(close).toHaveFocus();
    fireEvent.click(close);
    // Fading out, focus still inside: the page waits for it to leave.
    act(() => {
      jest.advanceTimersByTime(EXIT_MS - 100);
    });
    expect(close).toHaveFocus();
    // It leaves (rendered as act() returns), then the page's next frame.
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.queryByRole("dialog", { name: "Cart" })).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(moveButton(ERGONOMIC)).toHaveFocus();
  });

  test("focus is left alone when it has gone somewhere on purpose", async () => {
    renderPage({ user: SHOPPER });
    await loaded();
    fireEvent.click(removeButton(BENTWOOD));
    const sort = screen.getByLabelText("Sort by");
    sort.focus();
    await screen.findByText("2 pieces", {}, SLOW);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    expect(sort).toHaveFocus();
  });

  test("sold out (the default variant sold out): Sold out on the card, Move to cart unavailable, Remove still there", async () => {
    const [rack, , alna] = edgeRows();
    const seat = savedRow(product(26));
    renderPage({ deviceRows: [rack, alna, seat] });
    await loaded();

    const rackItem = pieceItem("Wide Plastic Shoe Rack");
    expect(within(rackItem).getByText("Sold out", { selector: "span.sf-badge" })).toBeInTheDocument();
    expect(within(rackItem).getByRole("button", { name: "Sold out" })).toBeDisabled();
    expect(within(rackItem).getByRole("button", { name: "Move to cart, Wide Plastic Shoe Rack" })).toBeDisabled();
    expect(within(rackItem).getByRole("button", { name: "Remove Wide Plastic Shoe Rack from wishlist" })).toBeEnabled();
    expect(within(rackItem).getByText("Sold out", { selector: "p" })).toBeInTheDocument();

    // Unknown stock: as before, it can be added; nothing is claimed about it.
    const alnaItem = pieceItem("Iron Alna (Clothes Stand)");
    expect(within(alnaItem).queryByText(/stock/i)).not.toBeInTheDocument();
    expect(within(alnaItem).getByRole("button", { name: "Move to cart, Iron Alna (Clothes Stand)" })).toBeEnabled();
    expect(within(alnaItem).getByRole("button", { name: "Add Iron Alna (Clothes Stand) to cart" })).toBeEnabled();

    const seatItem = pieceItem("2-Seater Waiting Chair");
    expect(within(seatItem).getByText("In stock")).toBeInTheDocument();
    fireEvent.click(within(seatItem).getByRole("button", { name: "Move to cart, 2-Seater Waiting Chair" }));
    // A product without variants: CartContext's line key for no variant.
    expect(screen.getByTestId("cart")).toHaveTextContent("26-default×1");
  });
});

// ── The toolbar ────────────────────────────────────────────────────────────────

describe("the toolbar", () => {
  const sortRows = () => {
    // A snapshot whose own price is stale: the price sorts read the cheapest
    // variant (getProductMinPrice), as before.
    const mattress = { ...savedRow(product(58), "2026-10-02T10:00:00.000Z"), price: 99999 };
    return [
      savedRow(product(55), "2026-10-03T10:00:00.000Z"),
      savedRow(product(37), "2026-10-01T10:00:00.000Z"),
      savedRow(product(10), "2026-10-05T10:00:00.000Z"),
      mattress,
      savedRow(product(26), "2026-10-04T10:00:00.000Z"),
    ];
  };

  test("the labelled sort orders the pieces exactly as the old getSortedItems did, for every option", async () => {
    const rows = sortRows();
    renderPage({ deviceRows: rows });
    await loaded();
    const sort = screen.getByLabelText("Sort by");
    expect(sort).toHaveValue("dateDesc");
    expect(within(sort).getAllByRole("option").map((option) => option.textContent)).toEqual(
      SORT_OPTIONS.map((option) => option.label)
    );
    SORT_OPTIONS.forEach(({ value }) => {
      fireEvent.change(sort, { target: { value } });
      expect([value, shownNames()]).toEqual([value, reference.sorted(rows, value).map((row) => row.name)]);
    });
  });

  test("Clear all opens the context's confirm; Keep leaves every piece", async () => {
    renderPage({ user: SHOPPER });
    await loaded();
    const clearAll = screen.getByRole("button", { name: "Clear all saved pieces" });
    expect(clearAll).toHaveTextContent("Clear all");
    expect(clearAll).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(clearAll);
    await waitFor(() => expect(toasts("Clear your wishlist?")).toHaveLength(1));
    expect(toasts("Clear your wishlist?")[0][0]).toMatchObject({ text: "3 saved pieces will be removed from your wishlist." });
    await settle();
    expect(screen.getByText("3 pieces")).toBeInTheDocument();
    expect(apiService.wishlist.remove).not.toHaveBeenCalled();
  });

  test("Clear all, confirmed: every row removed from the account, the empty state, focus on its line", async () => {
    confirmClear = true;
    renderPage({ user: SHOPPER });
    await loaded();
    const clearAll = screen.getByRole("button", { name: "Clear all saved pieces" });
    clearAll.focus();
    fireEvent.click(clearAll);
    const empty = await screen.findByRole("heading", { level: 2, name: "Nothing saved yet." });
    await waitFor(() => expect(empty).toHaveFocus(), SLOW);
    await waitFor(() => expect(toasts("Wishlist cleared")).toHaveLength(1));
    expect(apiService.wishlist.remove.mock.calls.map(([id]) => id).sort()).toEqual([1, 2, 3]);
    expect(screen.queryByLabelText("Sort by")).not.toBeInTheDocument();
  });
});
