import React, { useLayoutEffect } from "react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { computeAccessibleName } from "dom-accessibility-api";
import "@testing-library/jest-dom";
import Swal from "sweetalert2";
import apiService from "../../services/api";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { CartProvider } from "../../context/CartContext";
import { OrderProvider } from "../../context/OrderContext";
import { STOREFRONT_CONFIG } from "../../theme/tokens";
import { formatCurrency } from "../../utils/helpers";
import db from "../../../db.json";
import Checkout from "./Checkout";

// Checkout (prompts/DESIGN_SYSTEM.md §36) against the real AuthProvider,
// CartProvider and OrderProvider: the session and the cart are restored from
// storage as in the app, and every cart change and the order go through the
// contexts. Only the network, SweetAlert and the mock-mode flag are stubbed.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    auth: { login: jest.fn(), logout: jest.fn() },
    shipping: { getMethods: jest.fn() },
    settings: { get: jest.fn() },
    wallet: { getBalance: jest.fn() },
    coupons: { validate: jest.fn() },
    orders: { create: jest.fn(), getByUserId: jest.fn() },
    cart: { getCart: jest.fn(), addToCart: jest.fn(), removeFromCart: jest.fn() },
  },
  // Mirrors getErrorMessage in api.js (the real module pulls in axios's ESM
  // build, which this Jest setup does not transform): the reason from a
  // Laravel error response, else the first field error, else the message.
  getErrorMessage: (error) => {
    const data = error?.response?.data;
    if (data) {
      if (data.message) return data.message;
      if (data.errors) {
        const first = Object.values(data.errors)[0];
        return Array.isArray(first) ? first[0] : first;
      }
    }
    return error?.message || "An error occurred";
  },
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn(() => Promise.resolve({})) } }));
let mockIsMock = true;
jest.mock("../../services/baseURL", () => ({
  __esModule: true,
  default: "http://localhost:3001",
  get IS_MOCK_API() {
    return mockIsMock;
  },
}));

const clone = (value) => JSON.parse(JSON.stringify(value));
// jsdom's name computation puts a space before the visually hidden ", "
// separators ("Standard Delivery , 7–10 business days"); browsers do not.
const nameOf = (element) => computeAccessibleName(element).replace(/ ,/g, ",");
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const named = (text) => new RegExp(`^${escapeRegExp(text).replace(/, /g, " ?, ")}$`);
const { password: _password, ...SEEDED_USER } = db.users[2]; // mail4bappidas@gmail.com: an address and ₹2,302 of credit
const { password: _password2, ...NO_ADDRESS_USER } = db.users[1]; // jane@example.com: no saved address
const METHODS = db.shipping_methods; // two active, two inactive
const STANDARD = METHODS.find((method) => method.name === "Standard Delivery");
const EXPRESS = METHODS.find((method) => method.name === "Express Delivery");
const COUPONS = db.coupons;
const BALANCE = SEEDED_USER.storeCredit; // 2302

// A cart line as CartContext stores it.
const line = (productId, quantity = 1, overrides = {}) => {
  const product = db.products.find((p) => p.id === productId);
  const variant = product.variants[0];
  return {
    id: `${product.id}-${variant.id}`,
    productId: product.id,
    variantId: variant.id,
    variantName: variant.name,
    name: product.name,
    image: product.images[0],
    price: variant.price,
    comparePrice: product.comparePrice || 0,
    currency: "INR",
    quantity,
    stock: variant.stock,
    ...overrides,
  };
};
const BEDSIDE = (quantity = 1) => line(64, quantity); // ₹4,499
const CHAIR = (quantity = 1) => line(4, quantity); // ₹699
const SOFA = (quantity = 1) => line(47, quantity); // ₹32,999
const ARMCHAIR = (quantity = 1) => line(12, quantity); // ₹2,499
const RACK = (quantity = 1) => line(9, quantity); // ₹1,249

// The checkout's money rules, written out from the brief (tax on the
// discounted subtotal, free delivery from the pre-discount subtotal, store
// credit last).
const expected = ({ lines, coupon = null, method = STANDARD, taxRate = 18, credit = 0 }) => {
  const subtotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discount = 0;
  if (coupon) {
    const raw = coupon.type === "percentage" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
    discount = Math.max(0, Math.min(raw, coupon.maxDiscount || Infinity, subtotal));
  }
  const shipping = method.rateType === "free" || (method.freeAbove && subtotal >= method.freeAbove) ? 0 : method.flatRate;
  const tax = Math.round(Math.max(0, subtotal - discount) * (taxRate / 100));
  const total = subtotal - discount + shipping + tax;
  const storeCreditUsed = Math.min(credit, total);
  return { subtotal, discount, shipping, tax, total, storeCreditUsed, amountPayable: Math.max(0, total - storeCreditUsed) };
};

// The coupon endpoint's rules (api.js mock branch), with its messages.
const validateCoupon = async (code, amount) => {
  const coupon = COUPONS.find((c) => c.code === code && c.isActive);
  if (!coupon) throw new Error("Invalid coupon code");
  if (amount < coupon.minOrderAmount) throw new Error(`Minimum order amount is ₹${coupon.minOrderAmount}`);
  return clone(coupon);
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// The auth context, so a test can sign in without moving focus.
let auth = null;
const AuthProbe = () => {
  auth = useAuth();
  return <span data-testid="auth-modal">{auth.authModalOpen ? auth.authModalTab : "closed"}</span>;
};

const Confirmation = () => {
  const { orderNumber } = useParams();
  return <p>Confirmation for {orderNumber}</p>;
};

// What the page shows in the commit it first renders in (before any effect):
// a layout effect sees the DOM before the providers' passive effects.
let firstPaint = null;
const FirstPaint = () => {
  useLayoutEffect(() => {
    if (firstPaint === null) firstPaint = document.body.textContent;
  });
  return null;
};

const renderCheckout = async ({ cart = [BEDSIDE()], user = SEEDED_USER, settle = true, strict = false } = {}) => {
  localStorage.setItem("cart", JSON.stringify(cart));
  if (user) {
    sessionStorage.setItem("user", JSON.stringify(user));
    sessionStorage.setItem("token", `mock-token-${user.id}`);
  }
  // `strict` renders under React.StrictMode, as src/index.js does: in
  // development it runs a mount's effects twice.
  const Wrapper = strict ? React.StrictMode : React.Fragment;
  const view = render(
    <Wrapper>
      <MemoryRouter initialEntries={["/checkout"]}>
        <AuthProvider>
          <CartProvider>
            <OrderProvider>
              <Routes>
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation/:orderNumber" element={<Confirmation />} />
                <Route path="/products" element={<p>Products page</p>} />
                <Route path="/profile" element={<p>Profile page</p>} />
              </Routes>
              <AuthProbe />
              <FirstPaint />
            </OrderProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    </Wrapper>
  );
  // Let the reads the test did not hold settle inside act() (the session
  // restore, the cart, the wallet, the store reads), then, when asked, wait
  // until both store reads have drawn the promises.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  if (settle && cart.length) await screen.findByRole("list", { name: "Our promises" });
  return view;
};

const PRIMARY = /^(Continue|Sign in to continue|Place order( · .+)?|Processing…)$/;
const primary = () => screen.getByRole("button", { name: PRIMARY });
const stepHeading = (number) =>
  screen.findByRole("heading", { level: 2, name: new RegExp(`^Step ${number} of 4:`) });
const summary = () => screen.getByRole("region", { name: "Order summary" });
// A figure is the <dd> after its label's <dt> (the row's own pairing).
const summaryRow = (label) => {
  const term = within(summary()).getByText(label, { selector: "dt" });
  return term.nextElementSibling; // eslint-disable-line testing-library/no-node-access
};
const totalsText = (label) => summaryRow(label).textContent;

const goToShipping = async () => {
  fireEvent.click(primary());
  return stepHeading(2);
};
const goToPayment = async () => {
  await goToShipping();
  fireEvent.click(primary());
  return stepHeading(3);
};
const goToReview = async () => {
  await goToPayment();
  fireEvent.click(primary());
  return stepHeading(4);
};

let returnsWindow;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  firstPaint = null;
  auth = null;
  mockIsMock = true;
  window.scrollTo = jest.fn();
  returnsWindow = STOREFRONT_CONFIG.returnsWindowDays;
  jest.clearAllMocks();
  apiService.shipping.getMethods.mockResolvedValue(clone(METHODS));
  apiService.settings.get.mockResolvedValue(clone(db.settings));
  apiService.wallet.getBalance.mockResolvedValue(BALANCE);
  apiService.coupons.validate.mockImplementation(validateCoupon);
  apiService.orders.getByUserId.mockResolvedValue([]);
  apiService.orders.create.mockImplementation(async (order) => ({ ...order, id: 501 }));
  apiService.cart.getCart.mockResolvedValue([]);
  apiService.cart.addToCart.mockResolvedValue({});
  apiService.cart.removeFromCart.mockResolvedValue({});
  apiService.auth.login.mockResolvedValue(clone(SEEDED_USER));
});

afterEach(() => {
  STOREFRONT_CONFIG.returnsWindowDays = returnsWindow;
});

// ---------------------------------------------------------------------------
describe("the page frame", () => {
  test("the document is titled Checkout, with the default description (Prompt 32)", async () => {
    await renderCheckout();
    expect(document.title).toBe("Checkout | A & S Urbanseat");
    // Checkout stays indexable: no robots tag.
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull(); // eslint-disable-line testing-library/no-node-access
  });

  test("a breadcrumb, the serif h1 and a four-step stepper with the current step", async () => {
    await renderCheckout();
    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(trail).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(trail).getByText("Checkout")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 1, name: "Checkout" })).toBeInTheDocument();

    const stepper = screen.getByRole("list", { name: "Checkout progress" });
    const steps = within(stepper).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual(["1Cart", "2Delivery", "3Payment", "4Review"]);
    expect(steps[0]).toHaveAttribute("aria-current", "step");
    expect(steps.filter((step) => step.hasAttribute("aria-current"))).toHaveLength(1);
    expect(screen.getByText(/^Step 1 of 4/, { selector: "p" })).toHaveAttribute("aria-hidden", "true");
  });

  test("moving on marks the step done, moves aria-current and the compact line", async () => {
    await renderCheckout();
    await goToShipping();
    const steps = within(screen.getByRole("list", { name: "Checkout progress" })).getAllByRole("listitem");
    expect(steps[0]).toHaveTextContent("Cart, done");
    expect(steps[0]).not.toHaveAttribute("aria-current");
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    expect(screen.getByText(/^Step 2 of 4/, { selector: "p" })).toHaveTextContent("Step 2 of 4·Delivery");
  });

  test("a step change moves focus to the new step's heading, which says where the reader is", async () => {
    await renderCheckout();
    const heading = await goToShipping();
    expect(heading).toHaveAccessibleName("Step 2 of 4: Delivery details");
    await waitFor(() => expect(heading).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    const back = await stepHeading(1);
    await waitFor(() => expect(back).toHaveFocus());
    expect(back).toHaveAccessibleName("Step 1 of 4: Your cart");
  });

  test("arriving does not move focus, and every step change scrolls to the top (as before)", async () => {
    await renderCheckout();
    expect(document.body).toHaveFocus();
    const calls = window.scrollTo.mock.calls.length;
    await goToShipping();
    expect(window.scrollTo.mock.calls.length).toBeGreaterThan(calls);
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });
  });

  test("under reduced motion a step change scrolls to the top at once", async () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = jest.fn((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }));
    try {
      await renderCheckout();
      await goToShipping();
      expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });
    } finally {
      window.matchMedia = matchMedia;
    }
  });

  test("under StrictMode (development) arriving still moves nothing, and a step change still focuses its heading", async () => {
    await renderCheckout({ strict: true });
    expect(document.body).toHaveFocus();
    const heading = await goToShipping();
    await waitFor(() => expect(heading).toHaveFocus());
  });

  test("a reload never flashes the empty state: nothing is drawn while the session is restored", async () => {
    await renderCheckout();
    expect(firstPaint).not.toMatch(/Your cart is empty/);
    expect(screen.getByRole("heading", { level: 2, name: /Your cart$/ })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe("an empty cart", () => {
  test("says so in the serif and links to the catalogue", async () => {
    await renderCheckout({ cart: [] });
    expect(await screen.findByRole("heading", { level: 2, name: "Your cart is empty." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Checkout" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse furniture" })).toHaveAttribute("href", "/products");
    expect(screen.queryByRole("list", { name: "Checkout progress" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: PRIMARY })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe("step 1: the cart", () => {
  test("lists each line with its option, unit price, quantity and line total", async () => {
    await renderCheckout({ cart: [BEDSIDE(2), CHAIR()] });
    expect(screen.getByText("3 pieces")).toBeInTheDocument();
    const lines = within(screen.getByRole("list", { name: "Items in your cart" })).getAllByRole("listitem");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent("Wooden Bedside Table");
    expect(lines[0]).toHaveTextContent("Walnut");
    expect(lines[0]).toHaveTextContent("₹4,499.00 each");
    expect(within(lines[0]).getByRole("group", { name: "Quantity, Wooden Bedside Table, Walnut" })).toHaveTextContent("2");
    expect(lines[0]).toHaveTextContent("Line total ₹8,998.00");
    // The thumbnail is decorative (alt=""), so it has no role to query by.
    const image = lines[0].querySelector("img"); // eslint-disable-line testing-library/no-node-access
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("src", BEDSIDE().image);
  });

  test("a missing photograph falls back to the placeholder", async () => {
    await renderCheckout({ cart: [BEDSIDE(1)] });
    // Decorative (alt=""): no role to query by.
    const image = screen.getByRole("list", { name: "Items in your cart" }).querySelector("img"); // eslint-disable-line testing-library/no-node-access
    fireEvent.error(image);
    expect(image.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  });

  test("+ raises the quantity through the cart, and the summary follows", async () => {
    await renderCheckout({ cart: [BEDSIDE(1)] });
    const group = screen.getByRole("group", { name: "Quantity, Wooden Bedside Table, Walnut" });
    fireEvent.click(within(group).getByRole("button", { name: "Increase quantity" }));
    expect(group).toHaveTextContent("2");
    expect(totalsText("Subtotal")).toBe("₹8,998.00");
    expect(JSON.parse(localStorage.getItem("cart"))[0].quantity).toBe(2);
  });

  test("− lowers the quantity and is unavailable at 1; + is unavailable at the stock limit", async () => {
    await renderCheckout({ cart: [BEDSIDE(2), RACK(10)] }); // the rack's 2-shelf option holds 10
    const bedside = screen.getByRole("group", { name: "Quantity, Wooden Bedside Table, Walnut" });
    const decrease = within(bedside).getByRole("button", { name: "Decrease quantity" });
    fireEvent.click(decrease);
    expect(bedside).toHaveTextContent("1");
    expect(decrease).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(decrease);
    expect(bedside).toHaveTextContent("1");
    expect(screen.getAllByRole("listitem").some((item) => item.textContent.includes("Wooden Bedside Table"))).toBe(true);

    const rack = screen.getByRole("group", { name: "Quantity, Slim Plastic Shoe Rack, 2 shelves" });
    const increase = within(rack).getByRole("button", { name: "Increase quantity" });
    expect(increase).toHaveAttribute("aria-disabled", "true");
    expect(increase).toHaveAttribute("title", "No more stock available");
    fireEvent.click(increase);
    expect(rack).toHaveTextContent("10");
  });

  test("Remove takes the line out and hands focus to the next line's Remove", async () => {
    await renderCheckout({ cart: [BEDSIDE(1), CHAIR(1), ARMCHAIR(1)] });
    fireEvent.click(screen.getByRole("button", { name: "Remove Wooden Bedside Table, Walnut" }));
    expect(screen.queryByRole("button", { name: "Remove Wooden Bedside Table, Walnut" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Classic Plastic Chair, White" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Remove Cushioned Plastic Armchair, Marble Beige" }));
    expect(screen.getByRole("button", { name: "Remove Classic Plastic Chair, White" })).toHaveFocus();
    expect(JSON.parse(localStorage.getItem("cart")).map((item) => item.id)).toEqual(["4-v1"]);
  });

  test("removing the last line shows the empty state and focuses its heading", async () => {
    await renderCheckout({ cart: [CHAIR(1)] });
    fireEvent.click(screen.getByRole("button", { name: "Remove Classic Plastic Chair, White" }));
    expect(screen.getByRole("heading", { level: 2, name: "Your cart is empty." })).toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
describe("the coupon", () => {
  const field = () => screen.getByRole("textbox", { name: "Coupon code" });
  const apply = () => fireEvent.click(screen.getByRole("button", { name: "Apply" }));

  test("an empty code asks for one and marks the field", async () => {
    await renderCheckout();
    apply();
    expect(await screen.findByText("Enter a coupon code")).toBeInTheDocument();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAttribute("aria-describedby", "checkout-coupon-message");
    expect(apiService.coupons.validate).not.toHaveBeenCalled();
  });

  test("the code is typed in capitals; a refused code shows the API's message", async () => {
    await renderCheckout({ cart: [BEDSIDE(1)] });
    fireEvent.change(field(), { target: { value: "welcome500" } });
    expect(field()).toHaveValue("WELCOME500");
    apply();
    expect(await screen.findByText("Minimum order amount is ₹5000")).toBeInTheDocument();
    expect(apiService.coupons.validate).toHaveBeenCalledWith("WELCOME500", 4499);
    expect(field()).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(field(), { target: { value: "WELCOME50" } });
    expect(screen.queryByText("Minimum order amount is ₹5000")).not.toBeInTheDocument();
    expect(field()).not.toHaveAttribute("aria-invalid");
  });

  // An axios error as the Laravel API's refusals arrive: a 4xx whose body
  // carries the reason.
  const httpError = (status, data) =>
    Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } });

  test("a refusal from the Laravel API shows the server's reason, not axios' status line", async () => {
    mockIsMock = false;
    apiService.coupons.validate.mockRejectedValueOnce(
      httpError(422, { success: false, message: "This coupon needs an order of at least ₹5000." })
    );
    await renderCheckout({ cart: [BEDSIDE(1)] });
    fireEvent.change(field(), { target: { value: "WELCOME500" } });
    apply();
    expect(await screen.findByText("This coupon needs an order of at least ₹5000.")).toBeInTheDocument();
    expect(screen.queryByText(/Request failed with status code/)).not.toBeInTheDocument();
    expect(field()).toHaveAttribute("aria-invalid", "true");
  });

  test("a Laravel refusal with only field errors shows the first of them", async () => {
    mockIsMock = false;
    apiService.coupons.validate.mockRejectedValueOnce(httpError(422, { errors: { code: ["This coupon has expired."] } }));
    await renderCheckout({ cart: [BEDSIDE(1)] });
    fireEvent.change(field(), { target: { value: "FESTIVE25" } });
    apply();
    expect(await screen.findByText("This coupon has expired.")).toBeInTheDocument();
  });

  test("an unreachable server keeps the error's own message (there is no response to read)", async () => {
    apiService.coupons.validate.mockRejectedValueOnce(new Error("Network Error"));
    await renderCheckout({ cart: [BEDSIDE(1)] });
    fireEvent.change(field(), { target: { value: "WELCOME500" } });
    apply();
    expect(await screen.findByText("Network Error")).toBeInTheDocument();
  });

  test("a refusal with no message at all still says “We couldn’t apply this code”", async () => {
    apiService.coupons.validate.mockRejectedValueOnce(new Error(""));
    await renderCheckout({ cart: [BEDSIDE(1)] });
    fireEvent.change(field(), { target: { value: "WELCOME500" } });
    apply();
    expect(await screen.findByText("We couldn’t apply this code")).toBeInTheDocument();
  });

  test("Enter applies; the applied line shows the saving, the summary the discount, and focus follows", async () => {
    await renderCheckout({ cart: [BEDSIDE(6)] });
    fireEvent.change(field(), { target: { value: " WELCOME500 " } });
    // Enter in the field submits its form (no submit button pressed).
    fireEvent.submit(field().closest("form")); // eslint-disable-line testing-library/no-node-access
    const applied = await screen.findByText((_, node) => node?.tagName === "P" && /^WELCOME500 applied/.test(node.textContent));
    expect(apiService.coupons.validate).toHaveBeenCalledWith("WELCOME500", 26994);
    expect(applied).toHaveTextContent("WELCOME500 applied, saving −₹500.00");
    expect(applied).toHaveFocus();
    // Prompt 05's recorded figures for 6 × Wooden Bedside Table with WELCOME500.
    expect(totalsText("Subtotal")).toBe("₹26,994.00");
    expect(totalsText("Discount (WELCOME500)")).toBe("−minus ₹500.00");
    expect(totalsText("Delivery")).toBe("Free");
    expect(totalsText("Tax (18% GST)")).toBe("₹4,769.00");
    expect(totalsText("Total")).toBe("₹31,263.00");
  });

  test("a capped percentage coupon says so", async () => {
    await renderCheckout({ cart: [SOFA(1)] });
    fireEvent.change(field(), { target: { value: "FLAT10" } });
    apply();
    expect(await screen.findByText(/capped at ₹2,000\.00/)).toBeInTheDocument();
    expect(totalsText("Discount (FLAT10)")).toBe("−minus ₹2,000.00");
    expect(totalsText("Total")).toBe(formatCurrency(expected({ lines: [SOFA(1)], coupon: COUPONS[1] }).total));
  });

  test("a percentage coupon rounds to the nearest rupee (10% of ₹4,499 is ₹450)", async () => {
    await renderCheckout({ cart: [BEDSIDE(1)] });
    fireEvent.change(field(), { target: { value: "FLAT10" } });
    apply();
    await screen.findByRole("button", { name: "Remove coupon FLAT10" });
    const money = expected({ lines: [BEDSIDE(1)], coupon: COUPONS[1] });
    expect(money.discount).toBe(450);
    expect(totalsText("Discount (FLAT10)")).toBe("−minus ₹450.00");
    expect(totalsText("Tax (18% GST)")).toBe("₹729.00");
    expect(totalsText("Total")).toBe("₹5,277.00");
    expect(money.total).toBe(5277);
  });

  test("Remove takes the coupon off and brings focus back to the field", async () => {
    await renderCheckout({ cart: [BEDSIDE(6)] });
    fireEvent.change(field(), { target: { value: "WELCOME500" } });
    apply();
    fireEvent.click(await screen.findByRole("button", { name: "Remove coupon WELCOME500" }));
    expect(field()).toHaveFocus();
    expect(field()).toHaveValue("");
    expect(within(summary()).queryByText("Discount (WELCOME500)")).not.toBeInTheDocument();
  });

  test("a coupon whose minimum the cart drops below is removed, with a note (the field is not marked)", async () => {
    await renderCheckout({ cart: [BEDSIDE(2)] }); // ₹8,998
    fireEvent.change(field(), { target: { value: "WELCOME500" } });
    apply();
    await screen.findByRole("button", { name: "Remove coupon WELCOME500" });
    const group = screen.getByRole("group", { name: "Quantity, Wooden Bedside Table, Walnut" });
    fireEvent.click(within(group).getByRole("button", { name: "Decrease quantity" })); // ₹4,499
    expect(
      await screen.findByText("WELCOME500 was removed. It needs a minimum order of ₹5,000.00.")
    ).toBeInTheDocument();
    expect(field()).toHaveValue("");
    expect(field()).not.toHaveAttribute("aria-invalid");
    expect(within(summary()).queryByText(/^Discount/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe("a guest", () => {
  test("is asked to sign in: the primary action and the panel open the dialog; the page stays on the cart", async () => {
    await renderCheckout({ user: null });
    const button = primary();
    expect(button).toHaveTextContent("Sign in to continue");
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(button);
    expect(screen.getByTestId("auth-modal")).toHaveTextContent("login");
    expect(screen.getByRole("heading", { level: 2, name: /Your cart$/ })).toBeInTheDocument();

    act(() => auth.closeAuthModal());
    expect(screen.getByText("Sign in to check out.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByTestId("auth-modal")).toHaveTextContent("login");
    act(() => auth.closeAuthModal());
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByTestId("auth-modal")).toHaveTextContent("signup");
  });

  test("signing in from the panel hands focus to Continue once the panel has gone", async () => {
    await renderCheckout({ user: null });
    const signIn = screen.getByRole("button", { name: "Sign in" });
    signIn.focus();
    await act(async () => {
      await auth.login({ email: SEEDED_USER.email, password: "secret" });
    });
    expect(screen.queryByText("Sign in to check out.")).not.toBeInTheDocument();
    await waitFor(() => expect(primary()).toHaveFocus());
    expect(primary()).toHaveTextContent("Continue");
  });

  test("has no store credit to apply", async () => {
    await renderCheckout({ user: null });
    expect(apiService.wallet.getBalance).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("step 2: shipping", () => {
  test("saved addresses are radio cards, the default first and chosen; another option opens a new address", async () => {
    const user = clone(SEEDED_USER);
    user.addresses = [
      { ...user.addresses[0], id: 7, label: "Work", isDefault: false, addressLine1: "1 Office Road" },
      user.addresses[0],
    ];
    await renderCheckout({ user });
    await goToShipping();
    const group = screen.getByRole("group", { name: "Deliver to" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(nameOf(radios[0])).toBe("Home, Default, Bappi Das, Moutupuri, Barpeta, Near BH College, Howly, Assam 781316, phone +919707112233");
    expect(radios[0]).toBeChecked();
    expect(nameOf(radios[1])).toMatch(/^Work, Bappi Das, 1 Office Road/);
    expect(radios[2]).toHaveAccessibleName("A new address");
    expect(screen.queryByRole("group", { name: "New address" })).not.toBeInTheDocument();
    fireEvent.click(radios[2]);
    expect(radios[2]).toBeChecked();
    expect(screen.getByRole("group", { name: "New address" })).toBeInTheDocument();
  });

  test("the new-address form: visible labels, autocomplete, keypads, hints and the fixed country", async () => {
    await renderCheckout({ user: NO_ADDRESS_USER });
    await goToShipping();
    const form = screen.getByRole("group", { name: "Delivery address" });
    const expectField = (name, attrs) => {
      const input = within(form).getByLabelText(name);
      Object.entries(attrs).forEach(([key, value]) => expect(input).toHaveAttribute(key, value));
      return input;
    };
    expect(expectField("First name", { autocomplete: "given-name" })).toHaveValue("Jane");
    expect(expectField("Last name", { autocomplete: "family-name" })).toHaveValue("Smith");
    expectField("Phone number", { autocomplete: "tel", inputmode: "tel", type: "tel" });
    expectField("Address line 1", { autocomplete: "address-line1" });
    expectField("Address line 2 (optional)", { autocomplete: "address-line2" });
    expectField("City", { autocomplete: "address-level2" });
    expectField("State", { autocomplete: "address-level1" });
    expectField("Postal code", { autocomplete: "postal-code", inputmode: "numeric" });
    const country = expectField("Country", { autocomplete: "country-name" });
    expect(country).toHaveValue("India");
    expect(country).toHaveAttribute("readonly");
    expect(within(form).getByLabelText("Postal code")).toHaveAccessibleDescription("6-digit PIN");
  });

  test("Continue with gaps: a message per field, marked and described, and focus on the first", async () => {
    await renderCheckout({ user: NO_ADDRESS_USER });
    await goToShipping();
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "  " } });
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "" } });
    fireEvent.click(primary());
    const lastName = screen.getByLabelText("Last name");
    await waitFor(() => expect(lastName).toHaveFocus());
    expect(lastName).toHaveAttribute("aria-invalid", "true");
    expect(lastName).toHaveAccessibleDescription("Enter a last name");
    expect(screen.getByLabelText("Phone number")).toHaveAccessibleDescription("10-digit mobile number Enter a phone number");
    expect(screen.getByText("Enter the house or flat number and street")).toBeInTheDocument();
    expect(screen.getByText("Enter a city")).toBeInTheDocument();
    expect(screen.getByText("Enter a state")).toBeInTheDocument();
    expect(screen.getByText("Enter a 6-digit PIN")).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("heading", { level: 2, name: /^Step 2 of 4/ })).toBeInTheDocument();
  });

  test("typing clears that field's message, and the values stay when the step is left", async () => {
    await renderCheckout({ user: NO_ADDRESS_USER });
    await goToShipping();
    fireEvent.click(primary());
    await screen.findByText("Enter a city");
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Guwahati" } });
    expect(screen.queryByText("Enter a city")).not.toBeInTheDocument();
    expect(screen.getByText("Enter a state")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await stepHeading(1);
    await goToShipping();
    expect(screen.getByLabelText("City")).toHaveValue("Guwahati");
  });

  test("tightened: a phone isValidPhone refuses and a PIN that is not six digits are refused", async () => {
    await renderCheckout({ user: NO_ADDRESS_USER });
    await goToShipping();
    const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fill("Phone number", "12345");
    fill("Address line 1", "12 Lake Road");
    fill("City", "Guwahati");
    fill("State", "Assam");
    fill("Postal code", "7813");
    fireEvent.click(primary());
    expect(await screen.findByText("Enter a 10-digit mobile number")).toBeInTheDocument();
    expect(screen.getByText("Enter a 6-digit PIN")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Phone number")).toHaveFocus());

    fill("Phone number", "+91 98765 43210");
    fill("Postal code", "781 001");
    fireEvent.click(primary());
    expect(await stepHeading(3)).toBeInTheDocument();
  });

  test("a saved address that fails the checks says what it needs, and focus goes to it", async () => {
    const user = clone(SEEDED_USER);
    user.addresses[0].phone = "";
    user.addresses[0].postalCode = "78131";
    await renderCheckout({ user });
    await goToShipping();
    fireEvent.click(primary());
    const message = await screen.findByText(/This address needs a phone number and a 6-digit PIN\./);
    expect(message).toHaveTextContent("Choose “A new address” to enter it here, or update it in My addresses.");
    expect(within(message).getByRole("link", { name: "My addresses" })).toHaveAttribute("href", "/profile?tab=addresses");
    const chosen = screen.getAllByRole("radio", { checked: true }).find((radio) => radio.name === "savedAddress");
    await waitFor(() => expect(chosen).toHaveFocus());
    expect(chosen).toHaveAccessibleDescription(/This address needs/);
    expect(screen.getByRole("heading", { level: 2, name: /^Step 2 of 4/ })).toBeInTheDocument();
  });

  test("choosing “A new address” after a refused saved one starts the form clean", async () => {
    const user = clone(SEEDED_USER);
    user.addresses[0].phone = "";
    user.addresses[0].postalCode = "78131";
    await renderCheckout({ user });
    await goToShipping();
    fireEvent.click(primary());
    await screen.findByText(/This address needs a phone number and a 6-digit PIN\./);
    fireEvent.click(screen.getByRole("radio", { name: "A new address" }));
    const form = screen.getByRole("group", { name: "New address" });
    expect(within(form).queryByText(/^Enter /)).not.toBeInTheDocument();
    within(form).getAllByRole("textbox").forEach((field) => expect(field).not.toHaveAttribute("aria-invalid"));
  });

  test("delivery methods: the active ones only, the first chosen, windows, costs and the free-above note", async () => {
    await renderCheckout({ cart: [BEDSIDE(1)] });
    await goToShipping();
    const group = screen.getByRole("group", { name: "Delivery method" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(nameOf(radios[0])).toBe("Standard Delivery, 7–10 business days, ₹499.00, Free above ₹9,999.00");
    expect(nameOf(radios[1])).toBe("Express Delivery, 3–5 business days, ₹999.00");
    expect(radios[0]).toBeChecked();
    expect(within(group).queryByText("Same Day Delivery")).not.toBeInTheDocument();
    fireEvent.click(radios[1]);
    expect(totalsText("Delivery")).toBe("₹999.00");
  });

  test("Standard reads Free once the subtotal reaches its threshold", async () => {
    await renderCheckout({ cart: [BEDSIDE(3)] }); // ₹13,497
    await goToShipping();
    expect(nameOf(screen.getByRole("radio", { name: /^Standard Delivery/ }))).toBe(
      "Standard Delivery, 7–10 business days, Free, Free above ₹9,999.00"
    );
    expect(totalsText("Delivery")).toBe("Free");
  });

  test("while the methods load: a loading line and skeletons, and the summary waits", async () => {
    const held = deferred();
    apiService.shipping.getMethods.mockReturnValue(held.promise);
    await renderCheckout({ settle: false });
    await screen.findByRole("heading", { level: 2, name: /Your cart$/ });
    expect(within(summary()).getAllByText("Loading").length).toBeGreaterThan(0);
    expect(screen.queryByRole("list", { name: "Our promises" })).not.toBeInTheDocument();
    await goToShipping();
    expect(screen.getByText("Loading delivery options…")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Delivery method" })).toHaveAttribute("aria-busy", "true");
    await act(async () => held.resolve(clone(METHODS)));
    expect(screen.queryByText("Loading delivery options…")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Standard Delivery/ })).toBeChecked();
    expect(await screen.findByRole("list", { name: "Our promises" })).toBeInTheDocument();
  });

  test("Continue waits while the delivery methods are read (no “select a method” before they arrive)", async () => {
    const held = deferred();
    apiService.shipping.getMethods.mockReturnValue(held.promise);
    await renderCheckout({ settle: false });
    await screen.findByRole("heading", { level: 2, name: /Your cart$/ });
    await goToShipping();
    expect(primary()).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(primary());
    expect(screen.queryByText("Choose a delivery method")).not.toBeInTheDocument();
    const steps = within(screen.getByRole("list", { name: "Checkout progress" })).getAllByRole("listitem");
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    await act(async () => held.resolve(clone(METHODS)));
    expect(primary()).not.toHaveAttribute("aria-disabled");
    fireEvent.click(primary());
    expect(await stepHeading(3)).toBeInTheDocument();
  });

  test("no delivery method: an honest line, and Continue says what is missing and takes focus there", async () => {
    apiService.shipping.getMethods.mockRejectedValue(new Error("Network Error"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    await renderCheckout();
    await goToShipping();
    expect(screen.getByText("No delivery methods are available right now. Try again later.")).toBeInTheDocument();
    expect(totalsText("Delivery")).toBe("—Not chosen yet");
    fireEvent.click(primary());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Choose a delivery method");
    await waitFor(() => expect(alert).toHaveFocus());
    console.error.mockRestore();
  });
});

// ---------------------------------------------------------------------------
describe("step 3: payment", () => {
  test("the five options as radio rows, card chosen, each with one line", async () => {
    await renderCheckout();
    await goToPayment();
    const group = screen.getByRole("group", { name: "Payment method" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((radio) => radio.value)).toEqual(["card", "upi", "net_banking", "wallet", "cod"]);
    expect(radios[0]).toBeChecked();
    expect(nameOf(radios[0])).toBe("Credit or debit card, Visa, Mastercard, RuPay");
    expect(nameOf(radios[2])).toBe("Net banking, Pay from your bank account");
    expect(nameOf(radios[4])).toBe("Cash on Delivery, Available for orders up to ₹50,000.00");
  });

  test("COD shows its real condition when it is out of range, and is unavailable", async () => {
    await renderCheckout({ cart: [SOFA(2)] }); // payable above ₹50,000
    await goToPayment();
    const cod = screen.getByRole("radio", { name: /^Cash on Delivery/ });
    expect(cod).toBeDisabled();
    expect(nameOf(cod)).toBe("Cash on Delivery, Not available for this amount · Available for orders up to ₹50,000.00");
  });

  test("with no COD cap the copy leaves the cap out (it used to say “up to ₹0.00”)", async () => {
    apiService.settings.get.mockResolvedValue({ ...clone(db.settings), payment: { ...db.settings.payment, codMaxOrder: null } });
    await renderCheckout({ cart: [BEDSIDE(1)] });
    await goToPayment();
    const cod = screen.getByRole("radio", { name: /^Cash on Delivery/ });
    expect(nameOf(cod)).toBe("Cash on Delivery, Pay when your order arrives");
    fireEvent.click(cod);
    expect(screen.getByText("Pay with cash when your order is delivered.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/₹0\.00/);
  });

  test("a minimum without a cap reads “from”, and a switched-off COD reads “Currently unavailable”", async () => {
    apiService.settings.get.mockResolvedValue({
      ...clone(db.settings),
      payment: { ...db.settings.payment, codMinOrder: 10000, codMaxOrder: null },
    });
    const { unmount } = await renderCheckout({ cart: [BEDSIDE(1)] });
    await goToPayment();
    expect(nameOf(screen.getByRole("radio", { name: /^Cash on Delivery/ }))).toBe(
      "Cash on Delivery, Not available for this amount · Available for orders from ₹10,000.00"
    );
    unmount();
    localStorage.clear();
    apiService.settings.get.mockResolvedValue({ ...clone(db.settings), payment: { ...db.settings.payment, codEnabled: false } });
    await renderCheckout({ cart: [BEDSIDE(1)] });
    expect(within(screen.getByRole("list", { name: "Our promises" })).queryByText(/Cash on Delivery/)).not.toBeInTheDocument();
    await goToPayment();
    const cod = screen.getByRole("radio", { name: /^Cash on Delivery/ });
    expect(cod).toBeDisabled();
    expect(nameOf(cod)).toBe("Cash on Delivery, Currently unavailable");
  });

  test("the card, UPI and bank details: labelled fields with the right autocomplete and keypads", async () => {
    await renderCheckout();
    await goToPayment();
    expect(screen.getByLabelText("Card number")).toHaveAttribute("autocomplete", "cc-number");
    expect(screen.getByLabelText("Card number")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("Expiry date")).toHaveAttribute("autocomplete", "cc-exp");
    expect(screen.getByLabelText("Expiry date")).toHaveAccessibleDescription("MM/YY");
    expect(screen.getByLabelText("Security code")).toHaveAttribute("autocomplete", "cc-csc");
    expect(screen.getByLabelText("Security code")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("Name on card")).toHaveAttribute("autocomplete", "cc-name");
    fireEvent.click(screen.getByRole("radio", { name: /^UPI/ }));
    expect(screen.getByLabelText("UPI ID")).toHaveAccessibleDescription("For example, name@upi");
    fireEvent.click(screen.getByRole("radio", { name: /^Net banking/ }));
    expect(within(screen.getByLabelText("Bank")).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "State Bank of India",
      "HDFC Bank",
      "ICICI Bank",
      "Axis Bank",
      "Kotak Mahindra Bank",
      "Punjab National Bank",
    ]);
    fireEvent.click(screen.getByRole("radio", { name: /^Cash on Delivery/ }));
    expect(screen.getByText(/Pay with cash when your order is delivered\. Available for orders up to ₹50,000\.00\./)).toBeInTheDocument();
  });

  test("no gateway claim in mock mode; the note appears only with a configured gateway outside it", async () => {
    const { unmount } = await renderCheckout();
    await goToPayment();
    expect(screen.queryByText(/collected securely at the gateway/)).not.toBeInTheDocument();
    unmount();

    mockIsMock = false;
    apiService.settings.get.mockResolvedValue({ ...clone(db.settings), payment: { ...db.settings.payment, razorpayEnabled: true } });
    await renderCheckout();
    await goToPayment();
    expect(screen.getByText("Payment details are collected securely at the gateway.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /^Cash on Delivery/ }));
    expect(screen.queryByText(/collected securely at the gateway/)).not.toBeInTheDocument();
  });

  test("store credit: the balance, the switch, the amount (up to the order) and the rows", async () => {
    await renderCheckout({ cart: [BEDSIDE(1)] }); // total ₹5,808
    await goToPayment();
    expect(apiService.wallet.getBalance).toHaveBeenCalledWith(SEEDED_USER.id);
    expect(screen.getByRole("heading", { level: 3, name: "Store credit" })).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.tagName === "P" && node.textContent === "Available balance ₹2,302.00")).toBeInTheDocument();
    const toggle = screen.getByRole("switch", { name: "Apply to this order" });
    fireEvent.click(toggle);
    const amount = screen.getByLabelText("Amount to apply");
    expect(amount).toHaveValue(2302);
    expect(amount).toHaveAttribute("inputmode", "decimal");
    // Each figure is the <dd> after its label's <dt>.
    expect(screen.getByText("Store credit applied").nextElementSibling).toHaveTextContent("₹2,302.00"); // eslint-disable-line testing-library/no-node-access
    expect(screen.getByText("Remaining to pay").nextElementSibling).toHaveTextContent("₹3,506.00"); // eslint-disable-line testing-library/no-node-access
    expect(totalsText("Store credit")).toBe("−minus ₹2,302.00");
    expect(totalsText("Amount payable")).toBe("₹3,506.00");

    fireEvent.change(amount, { target: { value: "500" } });
    expect(totalsText("Amount payable")).toBe("₹5,308.00");
    fireEvent.click(screen.getByRole("button", { name: named("Use max, ₹2,302.00") }));
    expect(amount).toHaveValue(2302);
    fireEvent.change(amount, { target: { value: "99999" } });
    expect(amount).toHaveValue(2302); // clamped to what can be applied
    fireEvent.click(toggle);
    expect(screen.queryByLabelText("Amount to apply")).not.toBeInTheDocument();
    expect(within(summary()).queryByText("Store credit")).not.toBeInTheDocument();
  });

  test("credit that covers the order: the note, no payment options, and COD falls back to card", async () => {
    await renderCheckout({ cart: [CHAIR(1)] }); // total ₹1,324
    await goToPayment();
    fireEvent.click(screen.getByRole("radio", { name: /^Cash on Delivery/ }));
    fireEvent.click(screen.getByRole("switch", { name: "Apply to this order" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your store credit covers this order in full. There’s nothing more to pay."
    );
    expect(screen.queryByRole("group", { name: "Payment method" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Apply to this order" }));
    expect(screen.getByRole("radio", { name: /^Credit or debit card/ })).toBeChecked();
  });

  test("no store-credit panel without a balance", async () => {
    apiService.wallet.getBalance.mockResolvedValue(0);
    await renderCheckout();
    await goToPayment();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe("step 4: review", () => {
  test("the items, three blocks with Edit, and the facts beside Place order", async () => {
    const total = formatCurrency(expected({ lines: [BEDSIDE(2)] }).total); // ₹11,117.00
    await renderCheckout({ cart: [BEDSIDE(2)] });
    await goToReview();
    const items = within(screen.getByRole("list", { name: "Items in your order" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Wooden Bedside Table");
    expect(items[0]).toHaveTextContent("Qty 2 × ₹4,499.00");
    expect(items[0]).toHaveTextContent("Line total ₹8,998.00");

    const address = screen.getByRole("region", { name: "Deliver to" });
    expect(address).toHaveTextContent("Bappi Das");
    expect(address).toHaveTextContent("Howly, Assam 781316");
    expect(address).toHaveTextContent("+919707112233");
    const delivery = screen.getByRole("region", { name: "Delivery method" });
    expect(delivery).toHaveTextContent("Standard Delivery7–10 business days₹499.00");
    const payment = screen.getByRole("region", { name: "Payment" });
    expect(payment).toHaveTextContent("Credit or debit card");
    expect(payment).toHaveTextContent(`You will be charged ${total}.`);

    const facts = screen.getByRole("list", { name: "About this order" });
    expect(within(facts).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Delivery in 7–10 business days",
      "Returns within 7 days of delivery, on eligible pieces",
      "Secure payment",
    ]);
    // The facts' figure sits beside its label (a presentational pair).
    expect(screen.getByText("Amount payable", { selector: "span" }).nextElementSibling).toHaveTextContent(total); // eslint-disable-line testing-library/no-node-access
    expect(primary()).toHaveTextContent(`Place order · ${total}`);
  });

  test("the pieces' compare-at savings show under Amount payable; none, no line (Prompt 32)", async () => {
    const { unmount } = await renderCheckout({ cart: [ARMCHAIR(2), BEDSIDE(1)] });
    await goToReview();
    // The armchair: (₹2,899 − ₹2,499) × 2; the bedside table has no compare-at price.
    expect(screen.getByText("You save ₹800.00 on these pieces")).toBeInTheDocument();
    unmount();
    localStorage.clear();
    sessionStorage.clear();

    await renderCheckout({ cart: [BEDSIDE(1)] });
    await goToReview();
    expect(screen.queryByText(/You save/)).not.toBeInTheDocument();
  });

  test("Edit goes back to its step and focus lands on that step's heading", async () => {
    await renderCheckout();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: "Edit payment" }));
    const payment = await stepHeading(3);
    await waitFor(() => expect(payment).toHaveFocus());
    fireEvent.click(primary());
    await stepHeading(4);
    fireEvent.click(screen.getByRole("button", { name: "Edit delivery address" }));
    expect(await stepHeading(2)).toBeInTheDocument();
  });

  test("COD reads as cash on delivery, in the block and the facts", async () => {
    await renderCheckout();
    await goToPayment();
    fireEvent.click(screen.getByRole("radio", { name: /^Cash on Delivery/ }));
    fireEvent.click(primary());
    await stepHeading(4);
    expect(screen.getByRole("region", { name: "Payment" })).toHaveTextContent("Pay ₹5,808.00 by Cash on Delivery.");
    expect(screen.getByRole("list", { name: "About this order" })).toHaveTextContent("Pay by Cash on Delivery");
  });

  test("an order store credit covers: “Place order”, and the block says so", async () => {
    await renderCheckout({ cart: [CHAIR(1)] });
    await goToPayment();
    fireEvent.click(screen.getByRole("switch", { name: "Apply to this order" }));
    fireEvent.click(primary());
    await stepHeading(4);
    expect(primary()).toHaveTextContent(/^Place order$/);
    expect(screen.getByRole("region", { name: "Payment" })).toHaveTextContent("Store creditPaid in full with store credit (₹1,324.00).");
    expect(screen.getByRole("list", { name: "About this order" })).toHaveTextContent("Paid in full with store credit");
  });

  test("the returns fact follows the configured window (none at 0 days)", async () => {
    STOREFRONT_CONFIG.returnsWindowDays = 0;
    await renderCheckout();
    await goToReview();
    expect(screen.getByRole("list", { name: "About this order" })).not.toHaveTextContent(/returns/i);
    expect(screen.getByRole("list", { name: "Our promises" })).not.toHaveTextContent(/returns/i);
  });
});

// ---------------------------------------------------------------------------
describe("placing the order", () => {
  const ORDER_KEYS = [
    "amountPayable",
    "billingAddress",
    "couponCode",
    "createdAt",
    "discountAmount",
    "fulfillmentStatus",
    "items",
    "notes",
    "orderNumber",
    "paymentMethod",
    "paymentStatus",
    "shippingAddress",
    "shippingAmount",
    "shippingStatus",
    "shiprocketOrderId",
    "storeCreditUsed",
    "subtotal",
    "taxAmount",
    "total",
    "trackingNumber",
    "updatedAt",
    "userId",
  ];

  const itemFor = (item) => ({
    productId: item.productId,
    variantId: item.variantId,
    name: `${item.name} - ${item.variantName}`,
    image: item.image,
    sku: "",
    price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
  });

  test("a card order: the exact payload, the cart cleared quietly, then the confirmation", async () => {
    const lines = [BEDSIDE(1), CHAIR(2)];
    await renderCheckout({ cart: lines });
    await goToReview();
    fireEvent.click(primary());
    expect(await screen.findByText(/^Confirmation for ORD-/)).toBeInTheDocument();

    expect(apiService.orders.create).toHaveBeenCalledTimes(1);
    const order = apiService.orders.create.mock.calls[0][0];
    const money = expected({ lines });
    expect(Object.keys(order).sort()).toEqual(ORDER_KEYS);
    expect(order).toEqual({
      items: lines.map(itemFor),
      shippingAddress: SEEDED_USER.addresses[0],
      billingAddress: SEEDED_USER.addresses[0],
      subtotal: money.subtotal,
      discountAmount: 0,
      couponCode: null,
      shippingAmount: 499,
      taxAmount: money.tax,
      total: money.total,
      storeCreditUsed: 0,
      amountPayable: money.total,
      paymentMethod: "card",
      paymentStatus: "paid",
      fulfillmentStatus: "unfulfilled",
      shippingStatus: "pending",
      trackingNumber: null,
      notes: "",
      userId: SEEDED_USER.id,
      orderNumber: expect.stringMatching(/^ORD-/),
      shiprocketOrderId: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(screen.getByText(`Confirmation for ${order.orderNumber}`)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("cart"))).toEqual([]);
    expect(Swal.fire).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Cart Cleared" }));
  });

  test("COD: paymentMethod cod and paymentStatus pending; a new address goes out as typed", async () => {
    await renderCheckout({ user: NO_ADDRESS_USER, cart: [BEDSIDE(1)] });
    await goToShipping();
    const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fill("Phone number", "98765 43210");
    fill("Address line 1", "12 Lake Road");
    fill("City", "Guwahati");
    fill("State", "Assam");
    fill("Postal code", "781001");
    fireEvent.click(primary());
    await stepHeading(3);
    fireEvent.click(screen.getByRole("radio", { name: /^Cash on Delivery/ }));
    fireEvent.click(primary());
    await stepHeading(4);
    fireEvent.click(primary());
    await screen.findByText(/^Confirmation for/);
    const order = apiService.orders.create.mock.calls[0][0];
    expect(order.paymentMethod).toBe("cod");
    expect(order.paymentStatus).toBe("pending");
    expect(order.shippingAddress).toEqual({
      firstName: "Jane",
      lastName: "Smith",
      phone: "98765 43210",
      addressLine1: "12 Lake Road",
      addressLine2: "",
      city: "Guwahati",
      state: "Assam",
      postalCode: "781001",
      country: "India",
    });
    expect(order.billingAddress).toEqual(order.shippingAddress);
  });

  test("a coupon, Express and part store credit: every figure on the order", async () => {
    const lines = [BEDSIDE(2)];
    await renderCheckout({ cart: lines });
    fireEvent.change(screen.getByRole("textbox", { name: "Coupon code" }), { target: { value: "WELCOME500" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByRole("button", { name: "Remove coupon WELCOME500" });
    await goToShipping();
    fireEvent.click(screen.getByRole("radio", { name: /^Express Delivery/ }));
    fireEvent.click(primary());
    await stepHeading(3);
    fireEvent.click(screen.getByRole("switch", { name: "Apply to this order" }));
    fireEvent.change(screen.getByLabelText("Amount to apply"), { target: { value: "1000.4" } });
    fireEvent.click(primary());
    await stepHeading(4);
    fireEvent.click(primary());
    await screen.findByText(/^Confirmation for/);
    const order = apiService.orders.create.mock.calls[0][0];
    const money = expected({ lines, coupon: COUPONS[0], method: EXPRESS, credit: 1000 });
    expect(order).toMatchObject({
      subtotal: 8998,
      discountAmount: 500,
      couponCode: "WELCOME500",
      shippingAmount: 999,
      taxAmount: money.tax,
      total: money.total,
      storeCreditUsed: 1000,
      amountPayable: money.amountPayable,
      paymentMethod: "card",
      paymentStatus: "paid",
    });
  });

  test("store credit that covers the order: paymentMethod store_credit, paid", async () => {
    await renderCheckout({ cart: [CHAIR(1)] });
    await goToPayment();
    fireEvent.click(screen.getByRole("switch", { name: "Apply to this order" }));
    fireEvent.click(primary());
    await stepHeading(4);
    fireEvent.click(primary());
    await screen.findByText(/^Confirmation for/);
    const order = apiService.orders.create.mock.calls[0][0];
    expect(order).toMatchObject({ total: 1324, storeCreditUsed: 1324, amountPayable: 0, paymentMethod: "store_credit", paymentStatus: "paid" });
  });

  test("a double-click on Continue at Payment does not place the order before the review shows", async () => {
    await renderCheckout();
    await goToPayment();
    fireEvent.click(primary());
    // The second press of a double-click lands while the payment panel fades
    // out, on a button that already reads "Place order".
    expect(primary()).toHaveTextContent("Place order · ₹5,808.00");
    expect(screen.getByRole("heading", { level: 2, name: /^Step 3 of 4/ })).toBeInTheDocument();
    fireEvent.click(primary());
    await stepHeading(4);
    expect(apiService.orders.create).not.toHaveBeenCalled();
    fireEvent.click(primary());
    expect(await screen.findByText(/^Confirmation for/)).toBeInTheDocument();
    expect(apiService.orders.create).toHaveBeenCalledTimes(1);
  });

  test("while it is placed: “Processing…”, busy and unavailable, Back and Edit too; a second press sends nothing", async () => {
    const held = deferred();
    apiService.orders.create.mockReturnValue(held.promise);
    await renderCheckout();
    await goToReview();
    const button = primary();
    button.focus();
    fireEvent.click(button);
    expect(button).toHaveTextContent("Processing…");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveFocus();
    expect(screen.getByRole("button", { name: "Back" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Edit payment" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit payment" }));
    expect(apiService.orders.create).toHaveBeenCalledTimes(1);
    // Still on the review: the stepper (the outgoing panel would linger for its fade).
    const steps = within(screen.getByRole("list", { name: "Checkout progress" })).getAllByRole("listitem");
    expect(steps[3]).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("heading", { level: 2, name: /^Step 4 of 4/ })).toBeInTheDocument();
    await act(async () => held.resolve({ ...apiService.orders.create.mock.calls[0][0], id: 9 }));
    expect(await screen.findByText(/^Confirmation for/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe("an order that fails", () => {
  const MESSAGE = "We couldn’t place your order. Nothing has been charged. Try again in a moment.";
  // A click focuses its button in Chromium and Firefox (fireEvent's does not),
  // and the alert waits for focus to land (up to 500ms), so press as a mouse does.
  const pressPlaceOrder = () => {
    primary().focus();
    fireEvent.click(primary());
  };

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    console.error.mockRestore();
  });

  test("shows the alert, keeps the cart and the step, and the button comes back", async () => {
    apiService.orders.create.mockRejectedValueOnce(new Error("Network Error"));
    await renderCheckout();
    await goToReview();
    const alertSlot = screen.getByRole("alert");
    expect(alertSlot).toBeEmptyDOMElement();
    const button = primary();
    button.focus();
    fireEvent.click(button);
    await waitFor(() => expect(alertSlot).toHaveTextContent(MESSAGE));
    expect(button).toHaveTextContent("Place order · ₹5,808.00");
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).toHaveFocus();
    expect(screen.getByRole("heading", { level: 2, name: /^Step 4 of 4/ })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("cart"))).toHaveLength(1);
    expect(screen.queryByText(/^Confirmation for/)).not.toBeInTheDocument();
  });

  test("a new attempt clears it while it runs, and a success goes on to the confirmation", async () => {
    apiService.orders.create.mockRejectedValueOnce(new Error("Network Error"));
    await renderCheckout();
    await goToReview();
    pressPlaceOrder();
    await screen.findByText(MESSAGE);
    const held = deferred();
    apiService.orders.create.mockReturnValueOnce(held.promise);
    fireEvent.click(primary());
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
    await act(async () => held.resolve({ ...apiService.orders.create.mock.calls[1][0], id: 77 }));
    expect(await screen.findByText(/^Confirmation for/)).toBeInTheDocument();
  });

  test("leaving the step clears it", async () => {
    apiService.orders.create.mockRejectedValueOnce(new Error("Network Error"));
    await renderCheckout();
    await goToReview();
    pressPlaceOrder();
    await screen.findByText(MESSAGE);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await stepHeading(3);
    fireEvent.click(primary());
    await stepHeading(4);
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  test("OrderContext's own failure dialog still opens (unchanged), beside the page's alert", async () => {
    apiService.orders.create.mockRejectedValueOnce(new Error("Network Error"));
    await renderCheckout();
    await goToReview();
    pressPlaceOrder();
    await screen.findByText(MESSAGE);
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: "error", title: "We couldn’t place your order" }));
  });

  test("the alert waits for that dialog to close and hand focus back (it hides the page from assistive tech), so it is announced", async () => {
    apiService.orders.create.mockRejectedValueOnce(new Error("Network Error"));
    // SweetAlert2 marks its popup aria-modal, takes focus and sets aria-hidden
    // on the page; closing, it hands focus back on a short timer.
    const popup = document.createElement("div");
    popup.setAttribute("aria-modal", "true");
    popup.tabIndex = -1;
    Swal.fire.mockImplementationOnce(() => {
      document.body.appendChild(popup);
      popup.focus();
      return Promise.resolve({});
    });
    await renderCheckout();
    await goToReview();
    const alertSlot = screen.getByRole("alert");
    const button = primary();
    button.focus();
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveTextContent("Place order · ₹5,808.00"));
    await act(() => new Promise((resolve) => setTimeout(resolve, 120)));
    expect(alertSlot).toBeEmptyDOMElement();
    popup.remove(); // focus drops to the page
    expect(document.body).toHaveFocus();
    await act(() => new Promise((resolve) => setTimeout(resolve, 60)));
    expect(alertSlot).toBeEmptyDOMElement();
    button.focus();
    await waitFor(() => expect(alertSlot).toHaveTextContent(MESSAGE));
    expect(button).toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
describe("the order summary", () => {
  test("the first three lines and how many more, then the figures", async () => {
    await renderCheckout({ cart: [BEDSIDE(1), CHAIR(1), ARMCHAIR(1), RACK(1), SOFA(1)] });
    const lines = within(within(summary()).getByRole("list", { name: "Items" })).getAllByRole("listitem");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveTextContent("Wooden Bedside Table, Walnut · Qty 1, ₹4,499.00");
    expect(within(summary()).getByText("+2 more items")).toBeInTheDocument();
    const money = expected({ lines: [BEDSIDE(1), CHAIR(1), ARMCHAIR(1), RACK(1), SOFA(1)] });
    expect(totalsText("Subtotal")).toBe(formatCurrency(money.subtotal));
    expect(totalsText("Delivery")).toBe("Free");
    expect(totalsText("Tax (18% GST)")).toBe(formatCurrency(money.tax));
    expect(totalsText("Total")).toBe(formatCurrency(money.total));
  });

  test("“+1 more item” in the singular", async () => {
    await renderCheckout({ cart: [BEDSIDE(1), CHAIR(1), ARMCHAIR(1), RACK(1)] });
    expect(within(summary()).getByText("+1 more item")).toBeInTheDocument();
  });

  test("free delivery is measured on the subtotal before the discount", async () => {
    // ₹10,396 qualifies for Standard's free delivery (₹9,999); WELCOME500 takes it to ₹9,896.
    const cart = [BEDSIDE(2), CHAIR(2)];
    await renderCheckout({ cart });
    fireEvent.change(screen.getByRole("textbox", { name: "Coupon code" }), { target: { value: "WELCOME500" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByRole("button", { name: "Remove coupon WELCOME500" });
    const money = expected({ lines: cart, coupon: COUPONS[0] });
    expect(money.shipping).toBe(0);
    expect(totalsText("Subtotal")).toBe("₹10,396.00");
    expect(totalsText("Delivery")).toBe("Free");
    expect(totalsText("Total")).toBe(formatCurrency(money.total));
  });

  test("free delivery from the threshold itself, not only above it", async () => {
    const method = { ...clone(STANDARD), freeAbove: 4499 };
    apiService.shipping.getMethods.mockResolvedValue([method]);
    await renderCheckout({ cart: [BEDSIDE(1)] }); // exactly ₹4,499
    expect(totalsText("Delivery")).toBe("Free");
    expect(totalsText("Total")).toBe(formatCurrency(expected({ lines: [BEDSIDE(1)], method }).total));
  });

  test("Prompt 05's figures for one bedside table: ₹499 delivery, ₹810 tax, ₹5,808", async () => {
    await renderCheckout({ cart: [BEDSIDE(1)] });
    expect(totalsText("Delivery")).toBe("₹499.00");
    expect(totalsText("Tax (18% GST)")).toBe("₹810.00");
    expect(totalsText("Total")).toBe("₹5,808.00");
  });

  test("the tax rate waits for the settings, like the figures", async () => {
    const held = deferred();
    apiService.settings.get.mockReturnValue(held.promise);
    await renderCheckout({ cart: [BEDSIDE(1)], settle: false });
    await screen.findByRole("heading", { level: 2, name: /Your cart$/ });
    expect(within(summary()).getByText("Tax", { selector: "dt" })).toBeInTheDocument();
    expect(within(summary()).queryByText(/% GST/)).not.toBeInTheDocument();
    await act(async () => held.resolve({ ...clone(db.settings), store: { ...db.settings.store, taxRate: 12 } }));
    expect(totalsText("Tax (12% GST)")).toBe(formatCurrency(expected({ lines: [BEDSIDE(1)], taxRate: 12 }).tax));
  });

  test("the tax label and amount follow the store's rate", async () => {
    apiService.settings.get.mockResolvedValue({ ...clone(db.settings), store: { ...db.settings.store, taxRate: 12 } });
    await renderCheckout({ cart: [BEDSIDE(1)] });
    expect(totalsText("Tax (12% GST)")).toBe(formatCurrency(expected({ lines: [BEDSIDE(1)], taxRate: 12 }).tax));
  });

  test("the promises come only from the data: secure payment, COD while on, returns, delivery from the method", async () => {
    await renderCheckout({ cart: [BEDSIDE(1)] });
    const cues = () => within(screen.getByRole("list", { name: "Our promises" })).getAllByRole("listitem").map((item) => item.textContent);
    expect(cues()).toEqual([
      "Secure payment",
      "Cash on Delivery available",
      "Easy returns · 7 days",
      "Delivery ₹499.00 · free above ₹9,999.00",
    ]);
    await goToShipping();
    fireEvent.click(screen.getByRole("radio", { name: /^Express Delivery/ }));
    expect(cues()[3]).toBe("Delivery ₹999.00");
  });

  test("settings that cannot be read: no promise about COD, and tax at the default 18%", async () => {
    apiService.settings.get.mockRejectedValue(new Error("Network Error"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    await renderCheckout({ cart: [BEDSIDE(1)] });
    expect(screen.getByRole("list", { name: "Our promises" })).not.toHaveTextContent("Cash on Delivery");
    expect(totalsText("Tax (18% GST)")).toBe("₹810.00");
    expect(totalsText("Total")).toBe("₹5,808.00");
    console.error.mockRestore();
  });

  test("the disclosure: “Order summary, ₹X”, closed on the cart, open on the review, closed again on the way back", async () => {
    await renderCheckout({ cart: [BEDSIDE(1)] });
    const toggle = screen.getByRole("button", { name: named("Order summary, ₹5,808.00") });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "checkout-summary-body");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await goToShipping();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(primary());
    await stepHeading(3);
    fireEvent.click(primary());
    await stepHeading(4);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await stepHeading(3);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("the disclosure's figure is the amount payable once store credit applies", async () => {
    await renderCheckout({ cart: [BEDSIDE(1)] });
    await goToPayment();
    fireEvent.click(screen.getByRole("switch", { name: "Apply to this order" }));
    expect(screen.getByRole("button", { name: named("Order summary, ₹3,506.00") })).toBeInTheDocument();
  });
});
