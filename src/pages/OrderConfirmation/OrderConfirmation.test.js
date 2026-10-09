import React from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import db from "../../../db.json";
import { APP_NAME, LOGO_URLS, SUPPORT_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE } from "../../utils/constants";
import { formatCurrency, formatDate, PLACEHOLDER_IMG } from "../../utils/helpers";
import OrderConfirmation, {
  deliveryFor,
  headlineFor,
  orderStage,
  paidRowLabel,
  paymentMethodLabel,
} from "./OrderConfirmation";
import { invoiceTaxLabel } from "./Invoice";

// /order-confirmation/:orderNumber (prompts/DESIGN_SYSTEM.md §37) and its
// invoice. Only the network is stubbed: orders.getByOrderNumber answers with
// the seeded orders as JSON Server does (the order, or undefined), and
// settings.get with the seeded settings (an 18% tax rate). Any other API call
// would throw, which is how these tests know the page makes no other read.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    orders: { getByOrderNumber: jest.fn() },
    settings: { get: jest.fn() },
  },
}));

// jsdom has no IntersectionObserver (Reveal uses one): everything is in view.
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe(target) {
    this.callback([{ isIntersecting: true, target }], this);
  }
  unobserve() {}
  disconnect() {}
}

const clone = (value) => JSON.parse(JSON.stringify(value));
const seeded = (number) => clone(db.orders.find((order) => order.orderNumber === number));

// The seeded orders by what they are (Prompt 05's build log).
const DELIVERED = "ORD-MQB0JHUB-9KL6"; // COD, paid, delivered June 12; WELCOME500
const DELIVERED_CREDIT = "ORD-MQDVIQCV-30A9"; // UPI, paid, ₹1,000 store credit, delivered
const PROCESSING = "ORD-MQDUWC74-RUVY"; // UPI, paid, unfulfilled
const PROCESSING_CREDIT = "ORD-MQCGV6OM-Z965"; // UPI, paid, ₹1,000 store credit, unfulfilled
const SHIPPED_COD = "ORD-20260315-0004"; // COD, pending, shipped, no tracking number; FLAT10
const SHIPPED_TRACKED = "ORD-MQA9I6E7-0IR2"; // COD, paid, shipped, a tracking number
const CANCELLED = "ORD-MMYJ01ED-ZR26"; // COD, pending, cancelled (cancelledAt recorded)
const REFUNDED_DELIVERED = "ORD-MQC1HWSZ-CAN8"; // COD, refunded to store credit after delivery
const REFUNDED_UNSHIPPED = "ORD-20260310-0003"; // card, refunded, never shipped
const FREE_SHIPPING = "ORD-20250318-0002"; // card, paid, shipped, free delivery; WELCOME500

// An order just placed with cash on delivery, as checkout writes it.
const JUST_PLACED_COD = {
  ...seeded(PROCESSING),
  orderNumber: "ORD-NEWCOD-0001",
  paymentMethod: "cod",
  paymentStatus: "pending",
};

// ---------------------------------------------------------------------------
// The load logic and the derived figures as they were at HEAD (Prompt 26's
// merge), copied verbatim: the page must give the same answers.
// ---------------------------------------------------------------------------
const reference = {
  normalise: (response) => response?.data || response?.order || response,
  figures: (order) => ({
    taxAmount: order.taxAmount ?? order.tax ?? 0,
    shippingAmount: order.shippingAmount ?? order.shipping ?? 0,
    discountAmount: order.discountAmount ?? 0,
    paid: order.amountPayable ?? Math.max(0, order.total - order.storeCreditUsed),
  }),
};

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
let orders;

const Location = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
};

const renderAt = (number = DELIVERED, { before = null } = {}) =>
  render(
    <MemoryRouter initialEntries={[`/order-confirmation/${number}`]}>
      {before}
      <Routes>
        <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
        <Route path="*" element={null} />
      </Routes>
      <Location />
    </MemoryRouter>
  );

// The loaded page's h1. The invoice reads the store's settings once the order
// is in; one macrotask inside act lets that read settle with the render.
const thankYou = async () => {
  const heading = await screen.findByRole("heading", { level: 1, name: /^Thank you/ });
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  return heading;
};
// jsdom's name computation puts a space between the <em> and the period
// ("Thank you, Bappi ."); browsers do not.
const THANKS_BAPPI = /^Thank you, Bappi ?\.$/;
const summary = () => screen.getByRole("region", { name: "Order summary" });

// A <dl>'s rows as { term: definition } text.
const rowsOf = (scope) => {
  const terms = within(scope).getAllByRole("term").map((term) => term.textContent);
  const values = within(scope).getAllByRole("definition").map((value) => value.textContent);
  return Object.fromEntries(terms.map((term, index) => [term, values[index]]));
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

// The invoice section the "Print invoice" button controls. While it is hidden
// its heading is hidden too, so jsdom computes no name to find it by.
// eslint-disable-next-line testing-library/no-node-access
const invoiceSection = (button) => document.getElementById(button.getAttribute("aria-controls"));

const openInvoice = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Print invoice" }));
  return screen.findByRole("region", { name: "Invoice" });
};

let writeText;
let logoComplete;

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver;
  // jsdom loads no images: each test decides whether the invoice's logo has.
  Object.defineProperty(window.HTMLImageElement.prototype, "complete", {
    configurable: true,
    get: () => logoComplete,
  });
});

afterAll(() => {
  delete window.IntersectionObserver;
  delete window.HTMLImageElement.prototype.complete;
});

// CRA resets every mock before each test (resetMocks): implementations here.
beforeEach(() => {
  orders = clone(db.orders).concat(JUST_PLACED_COD);
  apiService.orders.getByOrderNumber.mockImplementation(async (number) =>
    orders.find((order) => order.orderNumber === number)
  );
  apiService.settings.get.mockImplementation(async () => clone(db.settings));
  writeText = jest.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  window.print = jest.fn();
  logoComplete = true;
  document.body.className = "";
});

// ---------------------------------------------------------------------------
// The read and its states
// ---------------------------------------------------------------------------
describe("the read", () => {
  test("reads the order by the URL's number, once, and shows placeholders meanwhile", async () => {
    const pending = deferred();
    apiService.orders.getByOrderNumber.mockReturnValue(pending.promise);
    renderAt(DELIVERED);
    expect(apiService.orders.getByOrderNumber).toHaveBeenCalledTimes(1);
    expect(apiService.orders.getByOrderNumber).toHaveBeenCalledWith(DELIVERED);
    expect(screen.getByRole("heading", { level: 1, name: "Loading your order" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Order summary" })).not.toBeInTheDocument();
    await act(async () => pending.resolve(seeded(DELIVERED)));
    expect(await thankYou()).toBeInTheDocument();
  });

  test.each([
    ["the order itself (JSON Server)", (order) => order],
    ["{ data: order } (Laravel, unwrapped once more)", (order) => ({ data: order })],
    ["{ order }", (order) => ({ order })],
  ])("normalises the answer as before: %s", async (_label, shape) => {
    const order = seeded(DELIVERED);
    apiService.orders.getByOrderNumber.mockResolvedValue(shape(order));
    expect(reference.normalise(shape(order))).toEqual(order);
    renderAt(DELIVERED);
    expect(await thankYou()).toHaveAccessibleName(THANKS_BAPPI);
    expect(screen.getByText(DELIVERED, { selector: "span" })).toBeInTheDocument();
  });

  test.each([
    ["undefined (JSON Server, no match)", undefined],
    ["null", null],
  ])("no order (%s) is 'not found', with the old two ways on", async (_label, answer) => {
    apiService.orders.getByOrderNumber.mockResolvedValue(answer);
    renderAt("ORD-NOPE-0000");
    const heading = await screen.findByRole("heading", { level: 1, name: /We couldn.t find this order\./ });
    expect(heading).toHaveFocus();
    expect(screen.getByText("Order ORD-NOPE-0000 may have been placed in a different session.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Order history" })).toHaveAttribute("href", "/orders");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  test("a failed read offers a retry and never claims the order does not exist", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    apiService.orders.getByOrderNumber.mockRejectedValueOnce(new Error("Network Error"));
    renderAt(DELIVERED);
    const heading = await screen.findByRole("heading", { level: 1, name: /We couldn.t load your order\./ });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/Something went wrong while loading order ORD-MQB0JHUB-9KL6\./)).toBeInTheDocument();
    expect(screen.queryByText(/couldn.t find/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Order history" })).toHaveAttribute("href", "/orders");
    expect(error).toHaveBeenCalledWith("Failed to fetch order:", expect.any(Error));
    error.mockRestore();
  });

  test("Try again runs the same read; focus waits on the loading line, then the thank-you", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const second = deferred();
    apiService.orders.getByOrderNumber
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockReturnValueOnce(second.promise);
    renderAt(DELIVERED);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Loading your order" })).toHaveFocus());
    expect(apiService.orders.getByOrderNumber).toHaveBeenCalledTimes(2);
    expect(apiService.orders.getByOrderNumber).toHaveBeenLastCalledWith(DELIVERED);
    await act(async () => second.resolve(seeded(DELIVERED)));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: THANKS_BAPPI })).toHaveFocus());
    await thankYou();
    error.mockRestore();
  });

  test("a second failure puts focus on the new Try again", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    apiService.orders.getByOrderNumber.mockRejectedValue(new Error("Network Error"));
    renderAt(DELIVERED);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Try again" })).toHaveFocus());
    expect(apiService.orders.getByOrderNumber).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });

  test("on arrival focus moves to the thank-you, but never away from where the shopper put it", async () => {
    const { unmount } = renderAt(DELIVERED);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: THANKS_BAPPI })).toHaveFocus());
    unmount();

    const pending = deferred();
    apiService.orders.getByOrderNumber.mockReturnValue(pending.promise);
    renderAt(DELIVERED, { before: <button type="button">Elsewhere</button> });
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    elsewhere.focus();
    await act(async () => pending.resolve(seeded(DELIVERED)));
    await thankYou();
    expect(elsewhere).toHaveFocus();
  });

  test("makes no read but the order and the store's settings (for the invoice's tax label)", async () => {
    renderAt(DELIVERED);
    await thankYou();
    await waitFor(() => expect(apiService.settings.get).toHaveBeenCalledTimes(1));
    expect(apiService.orders.getByOrderNumber).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// The thank-you
// ---------------------------------------------------------------------------
describe("the thank-you", () => {
  test("thanks the shopper by the delivery address's first name, in the accent italic", async () => {
    renderAt(DELIVERED);
    const heading = await thankYou();
    expect(heading).toHaveAccessibleName(THANKS_BAPPI);
    expect(within(heading).getByText("Bappi").tagName).toBe("EM");
  });

  test.each([
    ["no first name (a legacy name only)", { name: "Legacy Shopper", addressLine1: "1 Road" }],
    ["a blank first name", { firstName: "  ", lastName: "Das" }],
    ["no delivery address", undefined],
  ])("says 'Thank you.' with %s", async (_label, shippingAddress) => {
    orders.push({ ...seeded(DELIVERED), orderNumber: "ORD-NONAME-0001", shippingAddress });
    renderAt("ORD-NONAME-0001");
    expect(await thankYou()).toHaveAccessibleName("Thank you.");
  });

  test.each([
    [JUST_PLACED_COD.orderNumber, "Order confirmed", "Your order is placed. Pay when it arrives.", true],
    [PROCESSING, "Order confirmed", "Your payment was received and your order is being prepared.", true],
    [SHIPPED_COD, "Order confirmed", "Your order is on its way. Pay when it arrives.", true],
    [SHIPPED_TRACKED, "Order confirmed", "Your order is on its way.", true],
    [DELIVERED, "Order confirmed", "Your order was delivered.", true],
    [CANCELLED, "Order cancelled", `This order was cancelled on ${formatDate("2026-06-12T01:46:10.397Z")}.`, false],
    [REFUNDED_DELIVERED, "Order refunded", "The payment for this order was refunded.", false],
    [REFUNDED_UNSHIPPED, "Order refunded", "The payment for this order was refunded.", false],
  ])("%s: '%s', then '%s' (the mark: %s)", async (number, eyebrow, line, mark) => {
    renderAt(number);
    await thankYou();
    expect(screen.getByText(eyebrow)).toBeInTheDocument();
    expect(screen.getByText(line)).toBeInTheDocument();
    // The mark is decorative (aria-hidden): no role to query it by.
    // eslint-disable-next-line testing-library/no-node-access
    expect(Boolean(document.querySelector("header svg circle"))).toBe(mark);
  });

  test("the check, once drawn, stays drawn (printing hides and re-shows it)", async () => {
    renderAt(DELIVERED);
    await thankYou();
    // The mark is decorative (aria-hidden): no role to query it by.
    // eslint-disable-next-line testing-library/no-node-access
    const stroke = document.querySelector("header svg path[pathLength]");
    expect(stroke).toHaveClass("markCheck");
    expect(stroke).not.toHaveClass("markDrawn");
    fireEvent.animationEnd(stroke);
    expect(stroke).toHaveClass("markCheck", "markDrawn");
  });

  test("the line under the thank-you says only what the status fields say", () => {
    const base = { paymentMethod: "upi", paymentStatus: "paid", fulfillmentStatus: "unfulfilled", shippingStatus: "pending" };
    const line = (fields) => headlineFor({ ...base, ...fields });
    expect(line({})).toBe("Your payment was received and your order is being prepared.");
    expect(line({ paymentMethod: "cod", paymentStatus: "pending" })).toBe("Your order is placed. Pay when it arrives.");
    expect(line({ paymentStatus: "pending" })).toBe("Your order is placed. Its payment is still pending.");
    expect(line({ paymentStatus: "partially_refunded" })).toBe("Your order is placed.");
    expect(line({ shippingStatus: "shipped" })).toBe("Your order is on its way.");
    expect(line({ shippingStatus: "delivered" })).toBe("Your order was delivered.");
    expect(line({ fulfillmentStatus: "cancelled" })).toBe("This order was cancelled.");
    expect(line({ fulfillmentStatus: "returned", shippingStatus: "delivered" })).toBe("This order was returned.");
    expect(line({ paymentStatus: "failed" })).toBe("The payment for this order didn't go through.");
    expect(line({ paymentStatus: "refunded", shippingStatus: "delivered" })).toBe("The payment for this order was refunded.");
    // Never "being prepared" once the order has moved on or closed.
    ["shipped", "delivered"].forEach((shippingStatus) => expect(line({ shippingStatus })).not.toMatch(/prepared/));
    expect(orderStage({ ...base, fulfillmentStatus: "returned", paymentStatus: "refunded" })).toBe("returned");
    expect(orderStage({ ...base, fulfillmentStatus: "cancelled", paymentStatus: "failed" })).toBe("cancelled");
  });

  test("shows the order number in its chip and the day it was placed", async () => {
    renderAt(DELIVERED);
    await thankYou();
    // The invoice (hidden until printed) repeats these; the thank-you is the
    // header (a banner here, outside the app's <main>).
    const hero = screen.getByRole("banner");
    expect(within(hero).getByText("Order number")).toBeInTheDocument();
    expect(within(hero).getByText(DELIVERED)).toBeInTheDocument();
    const placed = within(hero).getByText(formatDate("2026-06-12T14:19:48.371Z"), { selector: "time" });
    expect(placed).toHaveAttribute("dateTime", "2026-06-12T14:19:48.371Z");
  });
});

// ---------------------------------------------------------------------------
// Copying the order number
// ---------------------------------------------------------------------------
describe("copying the order number", () => {
  test("copies it, shows a check and 'Copied' in a live region, then settles back", async () => {
    renderAt(DELIVERED);
    await thankYou();
    const button = screen.getByRole("button", { name: `Copy order number ${DELIVERED}` });
    fireEvent.click(button);
    expect(await screen.findByText("Copied")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(DELIVERED);
    expect(screen.getAllByRole("status").map((region) => region.textContent)).toContain("Copied");
    expect(button).toHaveAttribute("data-copied", "true");
    await waitFor(() => expect(screen.queryByText("Copied")).not.toBeInTheDocument(), { timeout: 2500 });
    expect(button).not.toHaveAttribute("data-copied");
  });

  test("says so when the copy is refused (the old button always claimed success)", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    writeText.mockRejectedValue(new Error("Denied"));
    renderAt(DELIVERED);
    await thankYou();
    const button = screen.getByRole("button", { name: `Copy order number ${DELIVERED}` });
    fireEvent.click(button);
    expect(await screen.findByText("Couldn't copy")).toBeInTheDocument();
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
    expect(button).not.toHaveAttribute("data-copied");
    error.mockRestore();
  });

  test("a second copy is announced again", async () => {
    renderAt(DELIVERED);
    await thankYou();
    const button = screen.getByRole("button", { name: `Copy order number ${DELIVERED}` });
    fireEvent.click(button);
    const first = await screen.findByText("Copied");
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText("Copied")).not.toBe(first));
    expect(writeText).toHaveBeenCalledTimes(2);
  });

  test("an order without a number shows and copies the URL's", async () => {
    orders.push({ ...seeded(DELIVERED), orderNumber: undefined, id: 99 });
    apiService.orders.getByOrderNumber.mockImplementation(async () => orders[orders.length - 1]);
    renderAt("ORD-FROM-URL-0001");
    await thankYou();
    fireEvent.click(screen.getByRole("button", { name: "Copy order number ORD-FROM-URL-0001" }));
    await screen.findByText("Copied");
    expect(writeText).toHaveBeenCalledWith("ORD-FROM-URL-0001");
  });
});

// ---------------------------------------------------------------------------
// The facts: delivery, payment, help
// ---------------------------------------------------------------------------
describe("the facts", () => {
  test("a delivered order shows the day it arrived (deliveredAt, else updatedAt)", async () => {
    renderAt(DELIVERED);
    await thankYou();
    expect(screen.getByText(`Delivered on ${formatDate("2026-06-12T14:49:04.053Z")}.`)).toBeInTheDocument();
    const order = { shippingStatus: "delivered", updatedAt: "2026-07-01T10:00:00.000Z" };
    expect(deliveryFor(order)).toBe(`Delivered on ${formatDate("2026-07-01T10:00:00.000Z")}.`);
    expect(deliveryFor({ shippingStatus: "delivered" })).toBe("Delivered.");
  });

  test("an order being prepared gets the honest line, and no invented date", async () => {
    renderAt(JUST_PLACED_COD.orderNumber);
    await thankYou();
    expect(screen.getByText("We'll email tracking details when your order ships.")).toBeInTheDocument();
    expect(screen.queryByText(/estimated/i)).not.toBeInTheDocument();
    // The old page printed "placed + 5 days" (en-IN, with the weekday).
    const fiveDaysOn = new Date(JUST_PLACED_COD.createdAt);
    fiveDaysOn.setDate(fiveDaysOn.getDate() + 5);
    const oldEstimate = fiveDaysOn.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(screen.queryByText(oldEstimate, { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByText(formatDate(fiveDaysOn), { exact: false })).not.toBeInTheDocument();
  });

  test("a shipped order says so, with its tracking number when it has one", async () => {
    renderAt(SHIPPED_TRACKED);
    await thankYou();
    expect(screen.getByText("Your order has shipped.")).toBeInTheDocument();
    expect(screen.getByText("Tracking number TEST63452634532563242346")).toBeInTheDocument();
  });

  test("a closed order that never shipped says it was not shipped", async () => {
    renderAt(CANCELLED);
    await thankYou();
    expect(screen.getByText("This order was not shipped.")).toBeInTheDocument();
    expect(screen.queryByText(/We'll email tracking details/)).not.toBeInTheDocument();
    expect(deliveryFor(seeded(REFUNDED_UNSHIPPED))).toBe("This order was not shipped.");
  });

  test.each([
    ["cod", "Cash on delivery"],
    ["card", "Credit or debit card"],
    ["upi", "UPI"],
    ["net_banking", "Net banking"],
    ["wallet", "Wallet"],
    ["store_credit", "Store credit"],
    ["bank_transfer", "BANK TRANSFER"],
    [undefined, "Not recorded"],
  ])("payment method %s reads '%s'", (method, label) => {
    expect(paymentMethodLabel(method)).toBe(label);
  });

  test.each([
    ["paid", "upi", "pending", "Paid", "sf-badge--success"],
    ["failed", "card", "pending", "Failed", "sf-badge--error"],
    ["refunded", "upi", "delivered", "Refunded", "sf-badge--sand"],
    ["partially_refunded", "upi", "delivered", "Partially refunded", "sf-badge--sand"],
    ["voided", "cod", "pending", "Not charged", "sf-badge--sand"],
    ["pending", "cod", "pending", "Pay on delivery", "sf-badge--info"],
    ["pending", "card", "pending", "Pending", "sf-badge--warning"],
  ])("payment status %s (%s, %s) is the badge '%s'", async (paymentStatus, paymentMethod, shippingStatus, label, tone) => {
    orders.push({ ...seeded(PROCESSING), orderNumber: "ORD-BADGE-0001", paymentStatus, paymentMethod, shippingStatus });
    renderAt("ORD-BADGE-0001");
    await thankYou();
    const badge = screen.getByText(label, { selector: ".sf-badge" });
    expect(badge).toHaveClass("sf-badge", tone);
  });

  test("cash on delivery on a cancelled order is 'Not charged', never 'Pay on delivery'", async () => {
    renderAt(CANCELLED);
    await thankYou();
    expect(screen.getByText("Not charged", { selector: ".sf-badge" })).toBeInTheDocument();
    expect(screen.queryByText("Pay on delivery")).not.toBeInTheDocument();
  });

  test("help opens Support with the order number", async () => {
    renderAt(DELIVERED);
    await thankYou();
    expect(screen.getByText("Questions?", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", `/support?order=${DELIVERED}`);
  });
});

// ---------------------------------------------------------------------------
// The summary card
// ---------------------------------------------------------------------------
describe("the summary", () => {
  test("lists the items: name, quantity and line total (price × quantity)", async () => {
    renderAt(DELIVERED_CREDIT);
    await thankYou();
    const card = summary();
    expect(within(card).getByText("2 items")).toBeInTheDocument();
    expect(within(card).getByText("4-Seater Plastic Dining Set - Marble Beige")).toBeInTheDocument();
    expect(within(card).getByText("Slim Plastic Shoe Rack - 4 shelves")).toBeInTheDocument();
    expect(within(card).getAllByText("Qty: 1")).toHaveLength(2);
    // Each line total is named for screen readers ("Line total ₹5,999.00").
    expect(within(card).getAllByText("Line total")).toHaveLength(2);
    expect(within(card).getByText(formatCurrency(5999))).toBeInTheDocument();
    expect(within(card).getByText(formatCurrency(1899))).toBeInTheDocument();
  });

  test("one line reads '1 item'; a variant shows under the name; a missing photo falls back", async () => {
    orders.push({
      ...seeded(DELIVERED),
      orderNumber: "ORD-VARIANT-0001",
      items: [{ productName: "Legacy Chair", variantName: "Teak", image: "", price: 1200, quantity: 3 }],
    });
    renderAt("ORD-VARIANT-0001");
    await thankYou();
    const card = summary();
    expect(within(card).getByText("1 item")).toBeInTheDocument();
    expect(within(card).getByText("Legacy Chair")).toBeInTheDocument();
    expect(within(card).getByText("Teak")).toBeInTheDocument();
    expect(within(card).getByText("Qty: 3")).toBeInTheDocument();
    expect(within(card).getByText(formatCurrency(3600))).toBeInTheDocument();
    const [thumbnail] = within(card).getAllByAltText("");
    expect(thumbnail).toHaveAttribute("src", PLACEHOLDER_IMG);
    expect(thumbnail).toHaveAttribute("alt", "");
  });

  test("the price details: subtotal, the coupon's discount, shipping, tax and the total", async () => {
    renderAt(DELIVERED);
    await thankYou();
    expect(rowsOf(summary())).toEqual({
      Subtotal: formatCurrency(8998),
      "Discount (WELCOME500)": `−${formatCurrency(500)}`,
      Shipping: formatCurrency(499),
      Tax: formatCurrency(1530),
      Total: formatCurrency(10527),
    });
  });

  test("free delivery reads 'Free'; no discount, no discount row", async () => {
    const { unmount } = renderAt(FREE_SHIPPING);
    await thankYou();
    expect(rowsOf(summary()).Shipping).toBe("Free");
    unmount();
    renderAt(PROCESSING);
    await thankYou();
    expect(Object.keys(rowsOf(summary())).some((term) => term.startsWith("Discount"))).toBe(false);
  });

  test("older field names still count (tax, shipping)", async () => {
    const { taxAmount: _tax, shippingAmount: _shipping, ...legacy } = seeded(PROCESSING);
    orders.push({ ...legacy, orderNumber: "ORD-LEGACY-0001", tax: 99, shipping: 50 });
    renderAt("ORD-LEGACY-0001");
    await thankYou();
    const rows = rowsOf(summary());
    expect(rows.Tax).toBe(formatCurrency(99));
    expect(rows.Shipping).toBe(formatCurrency(50));
  });

  test("store credit: the credit, then 'Amount paid' (amountPayable)", async () => {
    renderAt(DELIVERED_CREDIT);
    await thankYou();
    const rows = rowsOf(summary());
    expect(rows["Store credit"]).toBe(`−${formatCurrency(1000)}`);
    expect(rows["Amount paid"]).toBe(formatCurrency(8819));
  });

  test("store credit on a payment still to collect reads 'Amount due'; voided or failed, no such row", async () => {
    orders.push(
      { ...seeded(PROCESSING_CREDIT), orderNumber: "ORD-DUE-0001", paymentMethod: "cod", paymentStatus: "pending" },
      { ...seeded(PROCESSING_CREDIT), orderNumber: "ORD-VOID-0001", paymentStatus: "voided", amountPayable: undefined }
    );
    const { unmount } = renderAt("ORD-DUE-0001");
    await thankYou();
    expect(rowsOf(summary())["Amount due"]).toBe(formatCurrency(37939));
    unmount();
    renderAt("ORD-VOID-0001");
    await thankYou();
    const rows = rowsOf(summary());
    expect(rows["Store credit"]).toBe(`−${formatCurrency(1000)}`);
    expect(rows["Amount paid"]).toBeUndefined();
    expect(paidRowLabel({ paymentStatus: "failed" })).toBeNull();
    expect(paidRowLabel({ paymentStatus: "partially_refunded" })).toBe("Amount paid");
  });

  test("without amountPayable the amount paid is the total less the credit, as before", async () => {
    orders.push({ ...seeded(DELIVERED_CREDIT), orderNumber: "ORD-NOPAYABLE-0001", amountPayable: undefined });
    renderAt("ORD-NOPAYABLE-0001");
    await thankYou();
    expect(rowsOf(summary())["Amount paid"]).toBe(formatCurrency(9819 - 1000));
  });

  test("the delivery address, or the old note when there is none", async () => {
    const { unmount } = renderAt(DELIVERED);
    await thankYou();
    const card = summary();
    expect(within(card).getByRole("heading", { name: "Delivery address" })).toBeInTheDocument();
    ["Bappi Das", "Moutupuri, Barpeta", "Near BH College", "Howly, Assam - 781316", "India", "Phone: +919707112233"].forEach(
      (line) => expect(within(card).getByText(line)).toBeInTheDocument()
    );
    unmount();
    orders.push({ ...seeded(DELIVERED), orderNumber: "ORD-NOADDRESS-0001", shippingAddress: null });
    renderAt("ORD-NOADDRESS-0001");
    await thankYou();
    expect(within(summary()).getByText("Shipping address not available")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// The actions and the invoice
// ---------------------------------------------------------------------------
describe("the actions", () => {
  test("Track order opens /orders; Continue shopping opens /products", async () => {
    renderAt(DELIVERED);
    await thankYou();
    expect(screen.getByRole("link", { name: "Track order" })).toHaveAttribute("href", "/orders");
    fireEvent.click(screen.getByRole("link", { name: "Continue shopping" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/products");
  });

  test("Print invoice reveals the invoice, then opens the print dialog; no alert anywhere", async () => {
    const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
    renderAt(DELIVERED);
    await thankYou();
    expect(screen.queryByRole("button", { name: /Download/ })).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Print invoice" });
    const hiddenInvoice = invoiceSection(button);
    expect(hiddenInvoice).toHaveAttribute("hidden");
    expect(hiddenInvoice).not.toBeVisible();
    expect(screen.queryByRole("region", { name: "Invoice" })).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(await screen.findByRole("region", { name: "Invoice" })).toBeVisible();
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Your invoice is below the order summary.")).toBeInTheDocument();
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  test("printing again prints again, without repeating the announcement", async () => {
    renderAt(DELIVERED);
    await thankYou();
    fireEvent.click(screen.getByRole("button", { name: "Print invoice" }));
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
    const note = await screen.findByText("Your invoice is below the order summary.");
    fireEvent.click(screen.getByRole("button", { name: "Print invoice" }));
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Your invoice is below the order summary.")).toBe(note);
  });

  test("the dialog waits for the invoice's logo to load", async () => {
    logoComplete = false;
    renderAt(DELIVERED);
    await thankYou();
    const invoice = await openInvoice();
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(window.print).not.toHaveBeenCalled();
    fireEvent.load(within(invoice).getByAltText("A & S Urbanseat"));
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
  });

  test("a logo that fails to load does not hold the dialog back", async () => {
    logoComplete = false;
    renderAt(DELIVERED);
    await thankYou();
    const invoice = await openInvoice();
    fireEvent.error(within(invoice).getByAltText("A & S Urbanseat"));
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
  });

  test("a logo that never settles holds the dialog back three seconds at most", async () => {
    logoComplete = false;
    renderAt(DELIVERED);
    await thankYou();
    jest.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Print invoice" }));
      act(() => {
        jest.advanceTimersByTime(2900);
      });
      expect(window.print).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(200);
      });
      act(() => {
        jest.advanceTimersByTime(50); // the animation frame
      });
      expect(window.print).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("the invoice", () => {
  test("is in the page from the start (so the browser's own Print prints it), hidden on screen", async () => {
    renderAt(DELIVERED);
    await thankYou();
    const invoice = invoiceSection(screen.getByRole("button", { name: "Print invoice" }));
    expect(invoice).toHaveAttribute("hidden");
    expect(within(invoice).getByText("This is a system-generated invoice.")).not.toBeVisible();
    expect(within(invoice).getByAltText("A & S Urbanseat")).toHaveAttribute("loading", "eager");
  });

  test("carries the light logo on paper whatever the theme, and the store's details", async () => {
    document.body.classList.add("dark");
    renderAt(DELIVERED);
    await thankYou();
    const invoice = await openInvoice();
    const logo = within(invoice).getByAltText("A & S Urbanseat");
    expect(logo).toHaveAttribute("src", LOGO_URLS.light);
    expect(logo).toHaveAttribute("height", "56");
    expect(logo).not.toHaveAttribute("fetchpriority");
    [APP_NAME, SUPPORT_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE].forEach((line) =>
      expect(within(invoice).getByText(line)).toBeInTheDocument()
    );
  });

  test("names the order: 'Invoice', its number and its date", async () => {
    renderAt(DELIVERED);
    await thankYou();
    const invoice = await openInvoice();
    expect(within(invoice).getByRole("heading", { level: 2, name: "Invoice" })).toBeInTheDocument();
    const rows = rowsOf(invoice);
    expect(rows["Order number"]).toBe(DELIVERED);
    expect(rows["Order date"]).toBe(formatDate("2026-06-12T14:19:48.371Z"));
  });

  test("bill to and ship to come from the order (billing falls back to delivery)", async () => {
    const { unmount } = renderAt(DELIVERED);
    await thankYou();
    const invoice = await openInvoice();
    expect(within(invoice).getByRole("heading", { name: "Bill to" })).toBeInTheDocument();
    expect(within(invoice).getByRole("heading", { name: "Ship to" })).toBeInTheDocument();
    expect(within(invoice).getAllByText("Bappi Das")).toHaveLength(2);
    expect(within(invoice).getAllByText("Howly, Assam - 781316")).toHaveLength(2);
    unmount();

    orders.push({
      ...seeded(DELIVERED),
      orderNumber: "ORD-BILLING-0001",
      billingAddress: undefined,
      shippingAddress: { ...seeded(DELIVERED).shippingAddress, firstName: "Asha" },
    });
    renderAt("ORD-BILLING-0001");
    await thankYou();
    const second = await openInvoice();
    expect(within(second).getAllByText("Asha Das")).toHaveLength(2);
  });

  test("the items are a table: column headers, one row header per item, the figures", async () => {
    renderAt(DELIVERED_CREDIT);
    await thankYou();
    const invoice = await openInvoice();
    const table = within(invoice).getByRole("table", { name: `Items in order ${DELIVERED_CREDIT}` });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Item",
      "Qty",
      "Unit price",
      "Line total",
    ]);
    expect(within(table).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
      "4-Seater Plastic Dining Set - Marble Beige",
      "Slim Plastic Shoe Rack - 4 shelves",
    ]);
    const [, firstRow] = within(table).getAllByRole("row");
    expect(within(firstRow).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "1",
      formatCurrency(5999),
      formatCurrency(5999),
    ]);
  });

  test("a variant column appears only when an item records its variant apart from its name", async () => {
    orders.push({
      ...seeded(DELIVERED),
      orderNumber: "ORD-VARIANTS-0002",
      items: [
        { name: "Bentwood Chair", variantName: "Walnut", price: 2499, quantity: 2 },
        { name: "Side Table", price: 1500, quantity: 1 },
      ],
    });
    renderAt("ORD-VARIANTS-0002");
    await thankYou();
    const invoice = await openInvoice();
    const table = within(invoice).getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Item",
      "Variant",
      "Qty",
      "Unit price",
      "Line total",
    ]);
    const [, first, second] = within(table).getAllByRole("row");
    expect(within(first).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Walnut",
      "2",
      formatCurrency(2499),
      formatCurrency(4998),
    ]);
    expect(within(second).getAllByRole("cell")[0]).toHaveTextContent("None");
  });

  test("the figures are the summary's, with the store's rate beside the tax", async () => {
    renderAt(DELIVERED_CREDIT);
    await thankYou();
    const invoice = await openInvoice();
    await within(invoice).findByText("Tax (18% GST)");
    const invoiceRows = rowsOf(invoice);
    const summaryRows = rowsOf(summary());
    Object.entries(summaryRows).forEach(([term, value]) => {
      expect(invoiceRows[term === "Tax" ? "Tax (18% GST)" : term]).toBe(value);
    });
    expect(invoiceRows["Payment method"]).toBe("UPI");
    expect(invoiceRows["Payment status"]).toBe("Paid");
  });

  test("the tax row says plain 'Tax' when settings cannot be read", async () => {
    apiService.settings.get.mockRejectedValue(new Error("Network Error"));
    renderAt(DELIVERED);
    await thankYou();
    const invoice = await openInvoice();
    await waitFor(() => expect(apiService.settings.get).toHaveBeenCalled());
    expect(within(invoice).getByText("Tax", { selector: "dt" })).toBeInTheDocument();
    expect(within(invoice).queryByText(/GST/)).not.toBeInTheDocument();
  });

  test("the tax row never prints a rate the figure contradicts", () => {
    const totals = { subtotal: 8998, discountAmount: 500, taxAmount: 1530 };
    expect(invoiceTaxLabel(18, totals)).toBe("Tax (18% GST)");
    expect(invoiceTaxLabel("18", totals)).toBe("Tax (18% GST)");
    expect(invoiceTaxLabel(12, totals)).toBe("Tax");
    expect(invoiceTaxLabel(0, totals)).toBe("Tax");
    expect(invoiceTaxLabel(null, totals)).toBe("Tax");
    expect(invoiceTaxLabel(undefined, totals)).toBe("Tax");
    expect(invoiceTaxLabel(18, { subtotal: undefined, discountAmount: 0, taxAmount: 0 })).toBe("Tax");
    // Every seeded order was taxed at the store's 18% (validate-db checks it).
    db.orders.forEach((order) => {
      const { taxAmount, discountAmount } = reference.figures(order);
      expect(invoiceTaxLabel(db.settings.store.taxRate, { subtotal: order.subtotal, discountAmount, taxAmount })).toBe(
        "Tax (18% GST)"
      );
    });
  });

  test("cash on delivery: the payment and its status; the note; no GSTIN or 'tax invoice'", async () => {
    renderAt(JUST_PLACED_COD.orderNumber);
    await thankYou();
    const invoice = await openInvoice();
    const rows = rowsOf(invoice);
    expect(rows["Payment method"]).toBe("Cash on delivery");
    expect(rows["Payment status"]).toBe("Pay on delivery");
    expect(within(invoice).getByText("This is a system-generated invoice.")).toBeInTheDocument();
    expect(within(invoice).queryByText(/GSTIN|registration|tax invoice/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Every seeded order
// ---------------------------------------------------------------------------
describe("every seeded order", () => {
  test.each(db.orders.map((order) => [order.orderNumber]))("%s renders its own figures", async (number) => {
    const order = seeded(number);
    const { taxAmount, shippingAmount, discountAmount, paid } = reference.figures(order);
    renderAt(number);
    await thankYou();
    const rows = rowsOf(summary());
    expect(rows.Subtotal).toBe(formatCurrency(order.subtotal));
    expect(rows.Tax).toBe(formatCurrency(taxAmount));
    expect(rows.Shipping).toBe(shippingAmount > 0 ? formatCurrency(shippingAmount) : "Free");
    expect(rows.Total).toBe(formatCurrency(order.total));
    const discountRow = Object.keys(rows).find((term) => term.startsWith("Discount"));
    expect(discountRow ? rows[discountRow] : undefined).toBe(discountAmount > 0 ? `−${formatCurrency(discountAmount)}` : undefined);
    // With store credit, the last row (named by Order History's rule) is what
    // was paid outside the credit; without it there is no such row.
    const paidLabel = (order.storeCreditUsed ?? 0) > 0 ? paidRowLabel(order) : null;
    const paidTerms = Object.keys(rows).filter((term) => term === "Amount paid" || term === "Amount due");
    expect(paidTerms).toEqual(paidLabel ? [paidLabel] : []);
    expect(paidLabel ? rows[paidLabel] : undefined).toBe(paidLabel ? formatCurrency(paid) : undefined);
    expect(screen.queryByText(/estimated delivery/i)).not.toBeInTheDocument();
  });
});
