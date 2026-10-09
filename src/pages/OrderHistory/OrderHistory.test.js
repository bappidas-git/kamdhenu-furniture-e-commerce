import React from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Swal from "sweetalert2";
import { useReducedMotion } from "framer-motion";
import apiService from "../../services/api";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { STOREFRONT_CONFIG } from "../../theme/tokens";
import db from "../../../db.json";
import OrderHistory, {
  deriveOrderStatus,
  getStatusInfo,
  isCancellable,
  isReturnEligible,
  isReviewable,
  RETURN_WINDOW_DAYS,
  ORDERS_PER_PAGE,
  FILTER_OPTIONS,
} from "./OrderHistory";

// /orders (prompts/DESIGN_SYSTEM.md §34) against the real AuthProvider: the
// session is restored from storage as in the app. Only the network,
// SweetAlert and the theme are stubbed. The account is the seeded customer
// with orders of every kind (db.json users[2], mail4bappidas@gmail.com) and
// the API answers with that customer's seeded orders and reviews.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    auth: { login: jest.fn(), logout: jest.fn() },
    orders: { getByUserId: jest.fn(), cancel: jest.fn() },
    reviews: { getMine: jest.fn(), submit: jest.fn() },
  },
  getErrorMessage: (error) => error?.message,
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn() } }));
jest.mock("../../context/ThemeContext", () => ({ useTheme: jest.fn() }));
jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(),
}));

const { password: _password, ...USER } = db.users[2];
const clone = (value) => JSON.parse(JSON.stringify(value));
const seededOrders = () => clone(db.orders.filter((order) => order.userId === USER.id));
const seededReviews = () => clone(db.reviews.filter((review) => review.userId === USER.id));
const seeded = (number) => seededOrders().find((order) => order.orderNumber === number);

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();

// The seeded orders by what they are (see Prompt 05's build log).
const PROCESSING = "ORD-MQDUWC74-RUVY"; // UPI, paid, unfulfilled: cancellable
const PROCESSING_CREDIT = "ORD-MQCGV6OM-Z965"; // UPI, paid, ₹1,000 store credit: cancellable
const SHIPPED = "ORD-MQA9I6E7-0IR2"; // COD, shipped, tracking link
const DELIVERED = "ORD-MQB0JHUB-9KL6"; // delivered in June: window closed; reviewed (approved)
const DELIVERED_CREDIT = "ORD-MQDVIQCV-30A9"; // delivered, ₹1,000 store credit; one review pending
const CANCELLED = "ORD-MMYJ01ED-ZR26"; // COD, cancelled
const REFUNDED = "ORD-MQC1HWSZ-CAN8"; // delivered then refunded to store credit

// ---------------------------------------------------------------------------
// The rules as they were at HEAD (Prompt 23's merge), copied verbatim: the
// page's must give the same answers.
// ---------------------------------------------------------------------------
const reference = (() => {
  const RETURN_WINDOW = 7;
  const derive = (order) => {
    if (order.paymentStatus || order.fulfillmentStatus || order.shippingStatus) {
      if (order.fulfillmentStatus === "returned") return "returned";
      if (
        order.fulfillmentStatus === "cancelled" ||
        order.paymentStatus === "failed" ||
        order.paymentStatus === "refunded"
      ) {
        return "cancelled";
      }
      if (order.shippingStatus === "delivered") return "delivered";
      if (order.shippingStatus === "shipped") return "shipped";
      return "processing";
    }
    return order.status || "processing";
  };
  const returnEligible = (order) => {
    if (derive(order) !== "delivered") return false;
    const deliveredOn = order.deliveredAt || order.updatedAt;
    if (!deliveredOn) return false;
    const daysSinceDelivery = (Date.now() - new Date(deliveredOn).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceDelivery <= RETURN_WINDOW;
  };
  return {
    derive,
    returnEligible,
    cancellable: (order) => derive(order) === "processing",
    reviewable: (order) => derive(order) === "delivered",
  };
})();

const SYNTHETIC = [
  { id: 101, fulfillmentStatus: "returned", paymentStatus: "partially_refunded", shippingStatus: "delivered" },
  { id: 102, fulfillmentStatus: "unfulfilled", paymentStatus: "failed", shippingStatus: "pending" },
  { id: 103, fulfillmentStatus: "fulfilled", paymentStatus: "paid", shippingStatus: "delivered", deliveredAt: daysAgo(6.9) },
  { id: 104, fulfillmentStatus: "fulfilled", paymentStatus: "paid", shippingStatus: "delivered", deliveredAt: daysAgo(7.1) },
  { id: 105, fulfillmentStatus: "fulfilled", paymentStatus: "paid", shippingStatus: "delivered", updatedAt: daysAgo(1) },
  { id: 106, fulfillmentStatus: "fulfilled", paymentStatus: "paid", shippingStatus: "delivered" },
  { id: 107, fulfillmentStatus: "cancelled", paymentStatus: "voided", shippingStatus: "recalled" },
  { id: 108, paymentStatus: "pending" },
  { id: 109, shippingStatus: "shipped" },
  { id: 110, status: "completed" },
  { id: 111, status: "refunded" },
  { id: 112, status: "pending" },
  { id: 113, status: "returned" },
  { id: 114 },
  { id: 115, status: "something-new" },
];

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
const signIn = (user = USER) => {
  sessionStorage.setItem("user", JSON.stringify(user));
  sessionStorage.setItem("token", "mock-token-3");
};

// Where the router is, the auth dialog's state, and the dialog's own sign-in
// (the dialog itself is the header's; here only its effect on the session).
const Harness = () => {
  const location = useLocation();
  const { authModalOpen, authModalTab, closeAuthModal, login } = useAuth();
  return (
    <div>
      <span data-testid="location">{location.pathname + location.search}</span>
      <span data-testid="dialog">{authModalOpen ? authModalTab : "closed"}</span>
      <button
        type="button"
        onClick={async () => {
          await login({ email: USER.email, password: "Bappi@12345" });
          closeAuthModal();
        }}
      >
        Dialog sign-in
      </button>
    </div>
  );
};

const renderPage = ({ user = USER } = {}) => {
  if (user) signIn(user);
  return render(
    <MemoryRouter initialEntries={["/orders"]}>
      <AuthProvider>
        <main>
          <Routes>
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/support" element={<p>Support page</p>} />
            <Route path="/products" element={<p>Products page</p>} />
          </Routes>
        </main>
        <Harness />
      </AuthProvider>
    </MemoryRouter>
  );
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

const card = (number) => screen.getByRole("article", { name: `Order ${number}` });
const findCard = (number) => screen.findByRole("article", { name: `Order ${number}` });
const cardHeadings = () =>
  screen.queryAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
const section = () => screen.getByRole("region", { name: "Orders" });
const statusLine = () => screen.getByRole("status");
const chip = (name) =>
  within(screen.getByRole("group", { name: "Filter by status" })).getByRole("button", { name });
const location = () => screen.getByTestId("location").textContent;
const loaded = () => findCard(DELIVERED_CREDIT);

// Open a card's panel (the test then reads the card with within()).
const openTracking = (number) =>
  fireEvent.click(within(card(number)).getByRole("button", { name: `Track order ${number}` }));
const openDetails = (number) =>
  fireEvent.click(within(card(number)).getByRole("button", { name: `Details of order ${number}` }));
// The element a disclosure's aria-controls names: the panel's slot, a
// presentational wrapper with no role to query.
// eslint-disable-next-line testing-library/no-node-access
const controlled = (button) => document.getElementById(button.getAttribute("aria-controls"));

let writeText;
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  useTheme.mockReturnValue({ isDarkMode: false });
  useReducedMotion.mockReturnValue(false);
  apiService.orders.getByUserId.mockImplementation(() => Promise.resolve(seededOrders()));
  apiService.reviews.getMine.mockImplementation(() => Promise.resolve(seededReviews()));
  apiService.reviews.submit.mockImplementation((review) => Promise.resolve({ id: 99, ...review }));
  apiService.auth.login.mockResolvedValue(USER);
  Swal.fire.mockResolvedValue({ isConfirmed: false, isDismissed: true });
  window.scrollTo = jest.fn();
  writeText = jest.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

afterEach(() => {
  jest.useRealTimers();
  document.body.style.overflow = "";
});

// ── The rules (unchanged) ───────────────────────────────────────────────────────

describe("the rules", () => {
  test("derivation and eligibility give HEAD's answers for every seeded order and the edge cases", () => {
    const orders = [...clone(db.orders), ...SYNTHETIC];
    orders.forEach((order) => {
      expect([order.id, deriveOrderStatus(order)]).toEqual([order.id, reference.derive(order)]);
      expect([order.id, isCancellable(order)]).toEqual([order.id, reference.cancellable(order)]);
      expect([order.id, isReviewable(order)]).toEqual([order.id, reference.reviewable(order)]);
      expect([order.id, isReturnEligible(order)]).toEqual([order.id, reference.returnEligible(order)]);
    });
  });

  test("spot-check: seven seeded orders of five kinds", () => {
    const label = (number) => getStatusInfo(deriveOrderStatus(seeded(number))).label;
    expect(label(PROCESSING)).toBe("Processing");
    expect(label(SHIPPED)).toBe("Shipped");
    expect(label(DELIVERED)).toBe("Delivered");
    expect(label(CANCELLED)).toBe("Cancelled");
    expect(label(REFUNDED)).toBe("Cancelled");
    expect(isCancellable(seeded(PROCESSING))).toBe(true);
    expect(isCancellable(seeded(PROCESSING_CREDIT))).toBe(true);
    expect(isCancellable(seeded(SHIPPED))).toBe(false);
    expect(isReviewable(seeded(DELIVERED))).toBe(true);
    expect(isReviewable(seeded(REFUNDED))).toBe(false);
    // Delivered in June 2026: the 7-day window has closed.
    expect(isReturnEligible(seeded(DELIVERED))).toBe(false);
  });

  test("the return window matches the trust badges' (STOREFRONT_CONFIG.returnsWindowDays)", () => {
    expect(RETURN_WINDOW_DAYS).toBe(7);
    expect(RETURN_WINDOW_DAYS).toBe(STOREFRONT_CONFIG.returnsWindowDays);
  });

  test("five orders a page; the chips add Returned", () => {
    expect(ORDERS_PER_PAGE).toBe(5);
    expect(FILTER_OPTIONS).toEqual(["All", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"]);
  });
});

// ── Guests ───────────────────────────────────────────────────────────────────

describe("guests", () => {
  test("a guest stays on /orders and sees the sign-in panel in the shell, with no request", async () => {
    renderPage({ user: null });
    expect(await screen.findByRole("heading", { level: 2, name: "Sign in to see your orders." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("My account");
    expect(screen.queryByRole("navigation", { name: "Account" })).not.toBeInTheDocument();
    expect(location()).toBe("/orders");
    expect(apiService.orders.getByUserId).not.toHaveBeenCalled();
    expect(apiService.reviews.getMine).not.toHaveBeenCalled();
  });

  test("Sign in and Create account open the auth dialog on their tabs", async () => {
    renderPage({ user: null });
    fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));
    expect(screen.getByTestId("dialog")).toHaveTextContent("login");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByTestId("dialog")).toHaveTextContent("signup");
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveAttribute("aria-haspopup", "dialog");
  });

  test("signing in from the panel loads the orders in place and focus moves to the greeting", async () => {
    renderPage({ user: null });
    fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));
    fireEvent.click(screen.getByRole("button", { name: "Dialog sign-in" }));
    await loaded();
    expect(apiService.orders.getByUserId).toHaveBeenCalledWith(USER.id);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
  });
});

// ── The page ─────────────────────────────────────────────────────────────────

describe("the page", () => {
  test("inside the account shell: the greeting, Orders current in the nav, the Orders region", async () => {
    renderPage();
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Hello, Bappi ?\.$/);
    const nav = screen.getByRole("navigation", { name: "Account" });
    expect(within(nav).getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");
    expect(within(section()).getByRole("heading", { level: 2, name: "Orders" })).toBeInTheDocument();
  });

  test("reads the orders and the reviews once each, in one go, for the signed-in customer", async () => {
    renderPage();
    await loaded();
    expect(apiService.orders.getByUserId).toHaveBeenCalledTimes(1);
    expect(apiService.orders.getByUserId).toHaveBeenCalledWith(USER.id);
    expect(apiService.reviews.getMine).toHaveBeenCalledTimes(1);
    expect(apiService.reviews.getMine).toHaveBeenCalledWith(USER.id);
  });

  test("three skeleton cards while loading, in a busy region; then the cards", async () => {
    const orders = deferred();
    apiService.orders.getByUserId.mockReturnValueOnce(orders.promise);
    const { container } = renderPage();
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const results = container.querySelector('[aria-busy="true"]');
    expect(results).toBeInTheDocument();
    expect(within(results).getByText("Loading your orders")).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access
    const skeletonList = results.querySelector('ul[aria-hidden="true"]');
    expect(within(skeletonList).getAllByRole("listitem", { hidden: true })).toHaveLength(3);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();

    await act(async () => orders.resolve(seededOrders()));
    expect(screen.getAllByRole("article")).toHaveLength(5);
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
  });

  test("newest first, five a page, with the count", async () => {
    renderPage();
    await loaded();
    expect(cardHeadings()).toEqual([
      `Order ${DELIVERED_CREDIT}`,
      `Order ${PROCESSING}`,
      `Order ${PROCESSING_CREDIT}`,
      `Order ${REFUNDED}`,
      `Order ${DELIVERED}`,
    ]);
    expect(screen.getByText("7 orders")).toBeInTheDocument();
  });

  test("the Laravel shapes { data } and { orders } still read", async () => {
    apiService.orders.getByUserId.mockImplementationOnce(() => Promise.resolve({ data: seededOrders() }));
    const { unmount } = renderPage();
    await loaded();
    expect(screen.getAllByRole("article")).toHaveLength(5);
    unmount();

    sessionStorage.clear();
    apiService.orders.getByUserId.mockImplementationOnce(() => Promise.resolve({ orders: seededOrders() }));
    renderPage();
    await loaded();
    expect(screen.getAllByRole("article")).toHaveLength(5);
  });
});

// ── The card ─────────────────────────────────────────────────────────────────

describe("the order card", () => {
  test("the number with its copy button, the date, the badge, the thumbnails and the total", async () => {
    renderPage();
    const order = within(await findCard(PROCESSING));
    expect(order.getByRole("heading", { level: 3 })).toHaveTextContent(`Order ${PROCESSING}`);
    expect(order.getByRole("button", { name: `Copy order number ${PROCESSING}` })).toBeInTheDocument();
    expect(order.getByText(/Placed on/)).toHaveTextContent("Placed on June 14, 2026");
    expect(order.getByText("Processing")).toHaveClass("sf-badge", "sf-badge--ink");
    const thumbs = order.getByRole("list", { name: "Items in this order" });
    expect(within(thumbs).getByRole("img", { name: "Queen Size Bed - Walnut" })).toBeInTheDocument();
    expect(within(thumbs).getByRole("img", { name: "Carlton Mattress - Queen" })).toBeInTheDocument();
    expect(order.getByText("₹56,638.00")).toBeInTheDocument();
  });

  test("calm badges: ink, slate, green; quiet sand for cancelled and returned, never red", async () => {
    apiService.orders.getByUserId.mockImplementationOnce(() =>
      Promise.resolve([
        ...seededOrders(),
        { ...seeded(DELIVERED), id: 201, orderNumber: "ORD-RETURNED-1", fulfillmentStatus: "returned", createdAt: "2026-01-01T00:00:00.000Z" },
      ])
    );
    renderPage();
    await loaded();
    fireEvent.click(chip("Shipped"));
    expect(within(card(SHIPPED)).getByText("Shipped")).toHaveClass("sf-badge--info");
    fireEvent.click(chip("Delivered"));
    expect(within(card(DELIVERED)).getByText("Delivered")).toHaveClass("sf-badge--success");
    fireEvent.click(chip("Cancelled"));
    const cancelled = within(card(CANCELLED)).getByText("Cancelled");
    expect(cancelled).toHaveClass("sf-badge--sand", "badgeQuiet");
    expect(cancelled).not.toHaveClass("sf-badge--error");
    fireEvent.click(chip("Returned"));
    expect(within(card("ORD-RETURNED-1")).getByText("Returned")).toHaveClass("sf-badge--sand", "badgeQuiet");
  });

  test("more than three items: three thumbnails and '+N more'", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      productId: 60 + i,
      name: `Piece ${i + 1}`,
      image: "",
      price: 1000,
      quantity: 1,
    }));
    apiService.orders.getByUserId.mockImplementationOnce(() =>
      Promise.resolve([{ ...seeded(PROCESSING), items }])
    );
    renderPage();
    const order = within(await findCard(PROCESSING));
    const thumbs = order.getByRole("list", { name: "Items in this order" });
    expect(within(thumbs).getAllByRole("img")).toHaveLength(3);
    expect(within(thumbs).getByText("+2 more")).toBeInTheDocument();
  });

  test("actions: Track and Details always; Cancel only while processing; Return only in the window", async () => {
    renderPage();
    await loaded();
    const processing = within(card(PROCESSING));
    expect(processing.getByRole("button", { name: `Cancel order ${PROCESSING}` })).toHaveAttribute("aria-haspopup", "dialog");
    expect(processing.queryByRole("link", { name: /Return or exchange/ })).not.toBeInTheDocument();

    const delivered = within(card(DELIVERED));
    expect(delivered.getByRole("button", { name: `Track order ${DELIVERED}` })).toBeInTheDocument();
    expect(delivered.getByRole("button", { name: `Details of order ${DELIVERED}` })).toBeInTheDocument();
    expect(delivered.queryByRole("button", { name: /Cancel order/ })).not.toBeInTheDocument();
    expect(delivered.queryByRole("link", { name: /Return or exchange/ })).not.toBeInTheDocument();
  });

  test("Return or exchange: to Support with the order number and the returns category", async () => {
    apiService.orders.getByUserId.mockImplementationOnce(() =>
      Promise.resolve([{ ...seeded(DELIVERED), deliveredAt: daysAgo(2) }])
    );
    renderPage();
    const order = within(await findCard(DELIVERED));
    const link = order.getByRole("link", { name: `Return or exchange order ${DELIVERED}` });
    expect(link).toHaveAttribute("href", `/support?order=${DELIVERED}&category=returns`);
    fireEvent.click(link);
    expect(location()).toBe(`/support?order=${DELIVERED}&category=returns`);
    expect(screen.getByText("Support page")).toBeInTheDocument();
  });
});

// ── Copy ─────────────────────────────────────────────────────────────────────

describe("copying a number", () => {
  test("copies, shows the check for 2 seconds and says so in the status line", async () => {
    renderPage();
    const order = within(await findCard(PROCESSING));
    jest.useFakeTimers();
    const copy = order.getByRole("button", { name: `Copy order number ${PROCESSING}` });
    fireEvent.click(copy);
    await waitFor(() => expect(copy).toHaveAttribute("data-copied", "true"));
    expect(writeText).toHaveBeenCalledWith(PROCESSING);
    expect(statusLine()).toHaveTextContent("Order number copied.");
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(copy).not.toHaveAttribute("data-copied");
  });

  test("a failed copy says so, with no check", async () => {
    writeText.mockImplementation(() => Promise.reject(new Error("Denied")));
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    renderPage();
    const order = within(await findCard(PROCESSING));
    const copy = order.getByRole("button", { name: `Copy order number ${PROCESSING}` });
    fireEvent.click(copy);
    await waitFor(() => expect(statusLine()).toHaveTextContent("Couldn't copy the order number."));
    expect(copy).not.toHaveAttribute("data-copied");
    error.mockRestore();
  });
});

// ── Track ────────────────────────────────────────────────────────────────────

describe("the tracking panel", () => {
  test("Track toggles a panel it controls; one tracking panel at a time", async () => {
    renderPage();
    await loaded();
    fireEvent.click(chip("All"));
    const track = within(card(PROCESSING)).getByRole("button", { name: `Track order ${PROCESSING}` });
    expect(track).toHaveAttribute("aria-expanded", "false");
    // The panel's slot is in the page while closed too.
    expect(controlled(track)).toBeInTheDocument();

    fireEvent.click(track);
    expect(track).toHaveAttribute("aria-expanded", "true");
    const panel = controlled(track);
    expect(within(panel).getByRole("heading", { level: 4, name: "Tracking" })).toBeInTheDocument();

    openTracking(DELIVERED);
    expect(track).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(within(panel).queryByRole("heading", { name: "Tracking" })).not.toBeInTheDocument());
  });

  test("processing: Placed done, Processing current, the rest not yet; no tracking number yet", async () => {
    renderPage();
    await loaded();
    openTracking(PROCESSING);
    const order = within(card(PROCESSING));
    const steps = within(order.getByRole("list", { name: "Delivery progress" })).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual([
      "Placed, doneJun 14, 2026",
      "Processing",
      "Shipped, not yet",
      "Delivered, not yet",
    ]);
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    expect(steps.map((step) => step.getAttribute("data-state"))).toEqual(["done", "current", "todo", "todo"]);
    expect(order.getByText("Not yet available")).toBeInTheDocument();
  });

  test("shipped: the number with its copy button, the carrier link in a new tab", async () => {
    renderPage();
    await loaded();
    fireEvent.click(chip("Shipped"));
    openTracking(SHIPPED);
    const order = within(card(SHIPPED));
    const steps = within(order.getByRole("list", { name: "Delivery progress" })).getAllByRole("listitem");
    expect(steps.map((step) => step.getAttribute("data-state"))).toEqual(["done", "done", "current", "todo"]);
    expect(order.getByText("TEST63452634532563242346")).toBeInTheDocument();
    expect(order.getByRole("button", { name: "Copy tracking number" })).toBeInTheDocument();
    const carrier = order.getByRole("link", { name: "Open carrier page (opens in a new tab)" });
    expect(carrier).toHaveAttribute("href", seeded(SHIPPED).trackingUrl);
    expect(carrier).toHaveAttribute("target", "_blank");
    expect(carrier).toHaveAttribute("rel", "noopener noreferrer");
    expect(order.getAllByRole("term").map((term) => term.textContent)).toEqual([
      "Tracking number",
      "Carrier",
      "Status",
    ]);
    expect(order.getAllByRole("definition")[2]).toHaveTextContent("Shipped");
  });

  test("delivered: every step reached, with the delivery date", async () => {
    renderPage();
    await loaded();
    openTracking(DELIVERED_CREDIT);
    const order = within(card(DELIVERED_CREDIT));
    const steps = within(order.getByRole("list", { name: "Delivery progress" })).getAllByRole("listitem");
    expect(steps.map((step) => step.getAttribute("data-state"))).toEqual(["done", "done", "done", "current"]);
    expect(steps[3]).toHaveTextContent("DeliveredJun 20, 2026");
  });

  test("cancelled: one sentence instead of the line; refunded: what the refund did", async () => {
    renderPage();
    await loaded();
    fireEvent.click(chip("Cancelled"));
    openTracking(CANCELLED);
    let order = within(card(CANCELLED));
    expect(order.queryByRole("list", { name: "Delivery progress" })).not.toBeInTheDocument();
    // The seeded order records when it was cancelled.
    expect(order.getByText("This order was cancelled on June 12, 2026.")).toBeInTheDocument();
    expect(order.getByText("Not available")).toBeInTheDocument();

    openTracking(REFUNDED);

    order = within(card(REFUNDED));
    expect(order.getByText("The payment for this order was refunded.")).toBeInTheDocument();
    expect(order.getByText("Refunded ₹4,302.00 to your store credit")).toBeInTheDocument();
  });

  test("the refund line's other states, as before", async () => {
    const base = seeded(CANCELLED);
    apiService.orders.getByUserId.mockImplementationOnce(() =>
      Promise.resolve([
        { ...base, id: 301, orderNumber: "ORD-R-1", refundStatus: "processing", createdAt: "2026-03-03T00:00:00.000Z" },
        { ...base, id: 302, orderNumber: "ORD-R-2", refundStatus: "failed", createdAt: "2026-03-02T00:00:00.000Z" },
        { ...base, id: 303, orderNumber: "ORD-R-3", refundStatus: "completed", refundMethod: null, refundedAmount: 0, cancelledAt: "2026-03-05T10:00:00.000Z", createdAt: "2026-03-01T00:00:00.000Z" },
      ])
    );
    renderPage();
    await findCard("ORD-R-1");
    openTracking("ORD-R-1");
    expect(within(card("ORD-R-1")).getByText("Refund in progress — typically 5–7 business days")).toBeInTheDocument();
    openTracking("ORD-R-2");
    expect(within(card("ORD-R-2")).getByText("Refund delayed — our team is on it")).toBeInTheDocument();
    openTracking("ORD-R-3");
    const third = within(card("ORD-R-3"));
    expect(third.getByText("Refunded to your original payment")).toBeInTheDocument();
    expect(third.getByText("This order was cancelled on March 5, 2026.")).toBeInTheDocument();
  });

  test("no carrier link for an address that is not a web URL", async () => {
    apiService.orders.getByUserId.mockImplementationOnce(() =>
      Promise.resolve([{ ...seeded(SHIPPED), trackingUrl: ["javascript", "alert(1)"].join(":") }])
    );
    renderPage();
    await findCard(SHIPPED);
    openTracking(SHIPPED);
    const order = within(card(SHIPPED));
    expect(order.queryByRole("link", { name: /Open carrier page/ })).not.toBeInTheDocument();
  });
});

// ── Details ──────────────────────────────────────────────────────────────────

describe("the details panel", () => {
  test("Details controls its panel: items, address, payment and the summary", async () => {
    renderPage();
    await loaded();
    const details = within(card(PROCESSING)).getByRole("button", { name: `Details of order ${PROCESSING}` });
    expect(details).toHaveAttribute("aria-expanded", "false");
    openDetails(PROCESSING);
    const order = within(card(PROCESSING));
    expect(details).toHaveAttribute("aria-expanded", "true");
    const panel = within(controlled(details));
    expect(panel.getByRole("heading", { level: 4, name: "Items" })).toBeInTheDocument();
    expect(panel.getByText("Queen Size Bed - Walnut")).toBeInTheDocument();
    expect(panel.getAllByText("Qty: 1")).toHaveLength(2);
    expect(panel.getByRole("heading", { level: 4, name: "Delivery address" })).toBeInTheDocument();
    expect(panel.getByText("Bappi Das")).toBeInTheDocument();
    expect(panel.getByText("Phone: +919707112233")).toBeInTheDocument();
    expect(panel.getByText("UPI")).toBeInTheDocument();
    expect(panel.getByText("Status: Paid")).toBeInTheDocument();
    // No review control on an order that has not been delivered.
    expect(order.queryByRole("button", { name: /Rate & review|Edit review/ })).not.toBeInTheDocument();
    // No store credit on this order: no store-credit rows.
    expect(panel.queryByText("Store credit")).not.toBeInTheDocument();
  });

  test("the summary adds Store credit and Amount paid when store credit was used", async () => {
    renderPage();
    await loaded();
    openDetails(DELIVERED_CREDIT);
    const order = within(card(DELIVERED_CREDIT));
    const terms = order.getAllByRole("term").map((dt) => dt.textContent);
    const values = order.getAllByRole("definition").map((dd) => dd.textContent);
    expect(terms).toEqual(["Subtotal", "Shipping", "Tax", "Total", "Store credit", "Amount paid"]);
    expect(values).toEqual(["₹7,898.00", "₹499.00", "₹1,422.00", "₹9,819.00", "−₹1,000.00", "₹8,819.00"]);

    // Free delivery reads "Free"; no discount, no discount row.
    openDetails(PROCESSING_CREDIT);
    const free = within(card(PROCESSING_CREDIT));
    expect(free.getAllByRole("definition")[1]).toHaveTextContent("Free");
  });

  test("Amount due while cash on delivery is still to be collected; no paid row once voided", async () => {
    const base = { ...seeded(PROCESSING_CREDIT), paymentMethod: "cod", paymentStatus: "pending" };
    apiService.orders.getByUserId.mockImplementationOnce(() =>
      Promise.resolve([
        { ...base, id: 401, orderNumber: "ORD-COD-1", createdAt: "2026-06-02T00:00:00.000Z" },
        { ...base, id: 402, orderNumber: "ORD-COD-2", paymentStatus: "voided", fulfillmentStatus: "cancelled", createdAt: "2026-06-01T00:00:00.000Z" },
      ])
    );
    renderPage();
    await findCard("ORD-COD-1");
    openDetails("ORD-COD-1");
    const due = within(card("ORD-COD-1"));
    expect(due.getByText("Amount due")).toBeInTheDocument();
    expect(due.queryByText("Amount paid")).not.toBeInTheDocument();
    expect(due.getByText("Cash on delivery")).toBeInTheDocument();
    openDetails("ORD-COD-2");
    const voided = within(card("ORD-COD-2"));
    expect(voided.getByText("Store credit")).toBeInTheDocument();
    expect(voided.queryByText(/Amount (paid|due)/)).not.toBeInTheDocument();
  });

  test("the review control on a delivered order: the chip for a review, Rate for a piece without one", async () => {
    renderPage();
    await loaded();
    openDetails(DELIVERED_CREDIT);
    const order = within(card(DELIVERED_CREDIT));
    expect(order.getByRole("button", { name: "Rate & review 4-Seater Plastic Dining Set - Marble Beige" })).toHaveAttribute("aria-haspopup", "dialog");
    expect(order.getByText("Review pending approval")).toHaveClass("sf-badge--info");
    expect(order.getByRole("button", { name: "Edit review Slim Plastic Shoe Rack - 4 shelves" })).toBeInTheDocument();

    openDetails(DELIVERED);

    const approved = within(card(DELIVERED));
    expect(approved.getByText("Review published")).toHaveClass("sf-badge--success");
  });
});

// ── Reviewing ────────────────────────────────────────────────────────────────

describe("reviewing a piece", () => {
  test("submits the old payload, refreshes the reviews, shows Pending and the toast; focus returns", async () => {
    renderPage();
    await loaded();
    openDetails(DELIVERED_CREDIT);
    const order = within(card(DELIVERED_CREDIT));
    const rate = order.getByRole("button", { name: "Rate & review 4-Seater Plastic Dining Set - Marble Beige" });
    rate.focus();
    fireEvent.click(rate);

    const dialog = within(screen.getByRole("dialog", { name: "Write a review" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription("4-Seater Plastic Dining Set - Marble Beige");
    fireEvent.click(dialog.getByRole("radio", { name: "5 stars" }));
    fireEvent.change(dialog.getByLabelText("Title (optional)"), { target: { value: " Seats four " } });
    fireEvent.change(dialog.getByLabelText("Review (optional)"), { target: { value: "Easy to clean." } });

    apiService.reviews.getMine.mockImplementationOnce(() =>
      Promise.resolve([...seededReviews(), { id: 99, productId: 82, userId: USER.id, rating: 5, status: "pending" }])
    );
    fireEvent.click(dialog.getByRole("button", { name: "Submit review" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(apiService.reviews.submit).toHaveBeenCalledWith({
      productId: 82,
      userId: USER.id,
      userName: "Bappi D.",
      rating: 5,
      title: "Seats four",
      body: "Easy to clean.",
      orderId: 11,
      orderNumber: DELIVERED_CREDIT,
      isVerifiedPurchase: true,
    });
    expect(apiService.reviews.getMine).toHaveBeenCalledTimes(2);
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: "success",
        title: "Review submitted",
        text: "Thanks! Your review will appear on the product page once it's approved.",
        toast: true,
      })
    );
    const edit = order.getByRole("button", { name: "Edit review 4-Seater Plastic Dining Set - Marble Beige" });
    expect(order.getAllByText("Review pending approval")).toHaveLength(2);
    expect(edit).toHaveFocus();
  });

  test("editing opens the review prefilled, and the toast says it was updated", async () => {
    renderPage();
    await loaded();
    openDetails(DELIVERED_CREDIT);
    const order = within(card(DELIVERED_CREDIT));
    fireEvent.click(order.getByRole("button", { name: "Edit review Slim Plastic Shoe Rack - 4 shelves" }));
    const mine = seededReviews().find((review) => review.productId === 9);
    const dialog = within(screen.getByRole("dialog", { name: "Edit your review" }));
    expect(dialog.getByRole("radio", { name: `${mine.rating} stars` })).toHaveAttribute("aria-checked", "true");
    expect(dialog.getByLabelText("Title (optional)")).toHaveValue(mine.title);
    fireEvent.click(dialog.getByRole("button", { name: "Update review" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(apiService.reviews.submit).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 9, rating: mine.rating, title: mine.title, orderId: 11 })
    );
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: "Review updated" }));
  });
});

// ── Cancelling ───────────────────────────────────────────────────────────────

describe("cancelling an order", () => {
  const confirmOptions = () => Swal.fire.mock.calls[0][0];

  test("the confirm: the danger primitive, no hex, the refund sentence; Keep order changes nothing", async () => {
    renderPage();
    await loaded();
    const cancel = within(card(PROCESSING)).getByRole("button", { name: `Cancel order ${PROCESSING}` });
    cancel.focus();
    fireEvent.click(cancel);
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    const options = confirmOptions();
    expect(options).toMatchObject({
      title: "Cancel this order?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Cancel order",
      cancelButtonText: "Keep order",
      focusCancel: true,
      customClass: { confirmButton: "sf-btn sf-btn--danger" },
      returnFocus: false,
    });
    expect(options).not.toHaveProperty("confirmButtonColor");
    expect(options.html).toBe(
      `Order <strong>${PROCESSING}</strong> will be cancelled. A full refund of ₹56,638.00 will be initiated to your original payment method.`
    );
    expect(apiService.orders.cancel).not.toHaveBeenCalled();
    expect(cancel).toHaveFocus();
  });

  test("store credit: the external part to the payment method, the credit back to the account", async () => {
    renderPage();
    await loaded();
    fireEvent.click(within(card(PROCESSING_CREDIT)).getByRole("button", { name: `Cancel order ${PROCESSING_CREDIT}` }));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    expect(confirmOptions().html).toBe(
      `Order <strong>${PROCESSING_CREDIT}</strong> will be cancelled. A full refund of ₹37,939.00 will be initiated to your original payment method. The ₹1,000.00 of store credit you used will be returned to your account.`
    );
  });

  test("nothing collected: nothing to refund (cash on delivery)", async () => {
    apiService.orders.getByUserId.mockImplementationOnce(() =>
      Promise.resolve([{ ...seeded(PROCESSING), paymentMethod: "cod", paymentStatus: "pending" }])
    );
    renderPage();
    await findCard(PROCESSING);
    fireEvent.click(within(card(PROCESSING)).getByRole("button", { name: `Cancel order ${PROCESSING}` }));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    expect(confirmOptions().html).toBe(
      `Order <strong>${PROCESSING}</strong> will be cancelled. No payment has been collected, so there's nothing to refund.`
    );
  });

  test("the order number is escaped in the confirm's HTML", async () => {
    apiService.orders.getByUserId.mockImplementationOnce(() =>
      Promise.resolve([{ ...seeded(PROCESSING), orderNumber: "<img src=x onerror=alert(1)>" }])
    );
    renderPage();
    await findCard("<img src=x onerror=alert(1)>");
    fireEvent.click(screen.getByRole("button", { name: /^Cancel order / }));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    expect(confirmOptions().html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(confirmOptions().html).not.toContain("<img");
  });

  test("confirmed: one cancel request, the merged order, the status line and focus on its heading", async () => {
    const request = deferred();
    apiService.orders.cancel.mockReturnValueOnce(request.promise);
    Swal.fire.mockResolvedValueOnce({ isConfirmed: true });
    renderPage();
    await loaded();
    const order = within(card(PROCESSING));
    const cancel = order.getByRole("button", { name: `Cancel order ${PROCESSING}` });
    fireEvent.click(cancel);

    // Busy while it runs; every Cancel order is unavailable meanwhile.
    await waitFor(() => expect(cancel).toHaveTextContent("Cancelling…"));
    expect(cancel).toHaveAttribute("aria-disabled", "true");
    expect(cancel).toHaveFocus();
    const other = within(card(PROCESSING_CREDIT)).getByRole("button", { name: `Cancel order ${PROCESSING_CREDIT}` });
    expect(other).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(other);
    expect(Swal.fire).toHaveBeenCalledTimes(1);

    await act(async () =>
      request.resolve({ ...seeded(PROCESSING), fulfillmentStatus: "cancelled", refundStatus: "processing", cancelledAt: "2026-10-09T08:00:00.000Z" })
    );
    expect(apiService.orders.cancel).toHaveBeenCalledTimes(1);
    expect(apiService.orders.cancel).toHaveBeenCalledWith(10);
    expect(order.getByText("Cancelled")).toHaveClass("sf-badge--sand");
    expect(order.queryByRole("button", { name: /Cancel order/ })).not.toBeInTheDocument();
    expect(statusLine()).toHaveTextContent(`Order ${PROCESSING} has been cancelled.`);
    await waitFor(() => expect(order.getByRole("heading", { level: 3 })).toHaveFocus());
    expect(other).not.toHaveAttribute("aria-disabled");
  });

  test("a cancelled order that leaves the filtered list hands focus to the section", async () => {
    Swal.fire.mockResolvedValueOnce({ isConfirmed: true });
    apiService.orders.cancel.mockResolvedValueOnce({ ...seeded(PROCESSING), fulfillmentStatus: "cancelled" });
    renderPage();
    await loaded();
    fireEvent.click(chip("Processing"));
    fireEvent.click(within(card(PROCESSING)).getByRole("button", { name: `Cancel order ${PROCESSING}` }));
    await waitFor(() => expect(section()).toHaveFocus());
    expect(cardHeadings()).toEqual([`Order ${PROCESSING_CREDIT}`]);
  });

  test("a failed cancel shows the old error and leaves the order cancellable", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    Swal.fire.mockResolvedValueOnce({ isConfirmed: true });
    apiService.orders.cancel.mockRejectedValueOnce(new Error("Network Error"));
    renderPage();
    await loaded();
    fireEvent.click(within(card(PROCESSING)).getByRole("button", { name: `Cancel order ${PROCESSING}` }));
    await waitFor(() =>
      expect(Swal.fire).toHaveBeenLastCalledWith({
        icon: "error",
        title: "Couldn't cancel order",
        text: "Something went wrong while cancelling. Please try again.",
      })
    );
    const cancel = within(card(PROCESSING)).getByRole("button", { name: `Cancel order ${PROCESSING}` });
    await waitFor(() => expect(cancel).not.toHaveAttribute("aria-disabled"));
    expect(within(card(PROCESSING)).getByText("Processing")).toBeInTheDocument();
    error.mockRestore();
  });
});

// ── Toolbar ──────────────────────────────────────────────────────────────────

describe("the toolbar", () => {
  test("a labelled search field narrows by order number, ignoring case; Clear search refocuses it", async () => {
    renderPage();
    await loaded();
    const search = screen.getByLabelText("Search by order number");
    expect(search).toHaveAttribute("type", "search");
    fireEvent.change(search, { target: { value: "9kl6" } });
    expect(cardHeadings()).toEqual([`Order ${DELIVERED}`]);
    expect(screen.getByText("1 of 7 orders")).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "Mqb0JHUB" } });
    expect(cardHeadings()).toEqual([`Order ${DELIVERED}`]);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
    expect(screen.getAllByRole("article")).toHaveLength(5);
  });

  test("status chips are pressed toggles: one at a time, a second press returns to All", async () => {
    renderPage();
    await loaded();
    expect(chip("All")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(chip("Processing"));
    expect(chip("Processing")).toHaveAttribute("aria-pressed", "true");
    expect(chip("All")).toHaveAttribute("aria-pressed", "false");
    expect(cardHeadings()).toEqual([`Order ${PROCESSING}`, `Order ${PROCESSING_CREDIT}`]);
    expect(screen.getByText("2 of 7 orders")).toBeInTheDocument();
    fireEvent.click(chip("Processing"));
    expect(chip("All")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(chip("All"));
    expect(chip("All")).toHaveAttribute("aria-pressed", "true");
  });

  test("the chips compare the derived label: a refunded delivery is under Cancelled, not Delivered", async () => {
    renderPage();
    await loaded();
    fireEvent.click(chip("Delivered"));
    expect(cardHeadings()).toEqual([`Order ${DELIVERED_CREDIT}`, `Order ${DELIVERED}`]);
    fireEvent.click(chip("Cancelled"));
    expect(cardHeadings()).toEqual([`Order ${REFUNDED}`, `Order ${CANCELLED}`]);
  });

  test("no match: the line, and 'Show all orders' clears both and moves focus to the first order", async () => {
    renderPage();
    await loaded();
    fireEvent.click(chip("Returned"));
    expect(screen.getByRole("heading", { level: 3, name: "No orders match." })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search by order number"), { target: { value: "zzz" } });
    fireEvent.click(screen.getByRole("button", { name: "Show all orders" }));
    expect(screen.getByLabelText("Search by order number")).toHaveValue("");
    expect(chip("All")).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 3, name: `Order ${DELIVERED_CREDIT}` })).toHaveFocus()
    );
  });

  test("Refresh reads again; it is unavailable while reading", async () => {
    renderPage();
    await loaded();
    const refresh = screen.getByRole("button", { name: "Refresh orders" });
    const again = deferred();
    apiService.orders.getByUserId.mockReturnValueOnce(again.promise);
    fireEvent.click(refresh);
    expect(refresh).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(refresh);
    expect(apiService.orders.getByUserId).toHaveBeenCalledTimes(2);
    await act(async () => again.resolve(seededOrders()));
    expect(refresh).not.toHaveAttribute("aria-disabled");
    expect(screen.getAllByRole("article")).toHaveLength(5);
  });
});

// ── Pagination ───────────────────────────────────────────────────────────────

describe("pagination", () => {
  test("hairline numbers with aria-current; a page change moves focus to its first order", async () => {
    renderPage();
    await loaded();
    const nav = within(screen.getByRole("navigation", { name: "Pagination" }));
    expect(nav.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(nav.getByText("Page 1 of 2")).toBeInTheDocument();

    fireEvent.click(nav.getByRole("button", { name: "Next page" }));
    expect(cardHeadings()).toEqual([`Order ${SHIPPED}`, `Order ${CANCELLED}`]);
    expect(nav.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("button", { name: "Next page" })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("heading", { level: 3, name: `Order ${SHIPPED}` })).toHaveFocus());

    fireEvent.click(nav.getByRole("button", { name: "Page 1" }));
    expect(cardHeadings()).toHaveLength(5);
  });

  test("a new filter goes back to page 1; no pagination for one page", async () => {
    renderPage();
    await loaded();
    // A search that still spans two pages: only the reset brings page 1 back
    // (the clamp alone would leave page 2 in range).
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.change(screen.getByLabelText("Search by order number"), { target: { value: "ord-" } });
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    expect(cardHeadings()).toHaveLength(5);
    fireEvent.change(screen.getByLabelText("Search by order number"), { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(chip("Shipped"));
    expect(cardHeadings()).toEqual([`Order ${SHIPPED}`]);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
  });
});

// ── Error and empty ──────────────────────────────────────────────────────────

describe("error and empty states", () => {
  test("a failed read is an error panel, never 'No orders yet.'; Try again keeps focus useful", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    apiService.orders.getByUserId.mockImplementationOnce(() => Promise.reject(new Error("Network Error")));
    renderPage();
    expect(await screen.findByRole("heading", { level: 3, name: "We couldn't load your orders." })).toBeInTheDocument();
    expect(screen.queryByText("No orders yet.")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Search by order number")).not.toBeInTheDocument();

    // A second failure: focus goes to the new Try again.
    const second = deferred();
    apiService.orders.getByUserId.mockReturnValueOnce(second.promise);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(section()).toHaveFocus();
    await act(async () => second.reject(new Error("Network Error")));
    expect(screen.getByRole("button", { name: "Try again" })).toHaveFocus();

    // A success: the orders, focus left on the section.
    const third = deferred();
    apiService.orders.getByUserId.mockReturnValueOnce(third.promise);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await act(async () => third.resolve(seededOrders()));
    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(section()).toHaveFocus();
    error.mockRestore();
  });

  test("no orders: 'No orders yet.' and Browse furniture, without the toolbar", async () => {
    apiService.orders.getByUserId.mockImplementationOnce(() => Promise.resolve([]));
    renderPage();
    expect(await screen.findByRole("heading", { level: 3, name: "No orders yet." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse furniture" })).toHaveAttribute("href", "/products");
    expect(screen.queryByLabelText("Search by order number")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
  });

  test("a failed reviews read still shows the orders (the old catch)", async () => {
    apiService.reviews.getMine.mockImplementationOnce(() => Promise.reject(new Error("Network Error")));
    renderPage();
    await loaded();
    openDetails(DELIVERED_CREDIT);
    const order = within(card(DELIVERED_CREDIT));
    expect(order.queryByText("Review pending approval")).not.toBeInTheDocument();
    expect(order.getByRole("button", { name: "Rate & review Slim Plastic Shoe Rack - 4 shelves" })).toBeInTheDocument();
  });
});
