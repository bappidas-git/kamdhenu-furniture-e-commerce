import React, { useLayoutEffect, useRef } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useReducedMotion } from "framer-motion";
import apiService from "../../services/api";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import db from "../../../db.json";
import Profile from "./Profile";

// The Store credit tab (prompts/DESIGN_SYSTEM.md §33) against the real
// AuthProvider: the session is restored from storage as in the app. Only the
// network is stubbed, with the seeded store-credit account (db.json users[2])
// and its seeded ledger, newest first as the API returns it.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    auth: { login: jest.fn(), logout: jest.fn(), updateUser: jest.fn(), changePassword: jest.fn() },
    wallet: { getBalance: jest.fn(), getTransactions: jest.fn() },
  },
  getErrorMessage: (error) => error?.message,
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn() } }));
jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(),
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

const { password: _password, ...USER } = db.users[2];
const SEEDED_BALANCE = USER.storeCredit; // 2302, the seeded ledger's last balanceAfter
const seededLedger = () =>
  db.walletTransactions
    .filter((entry) => entry.userId === USER.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// `count` debits, newest first, each 10 lower than the one before.
const longLedger = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    userId: USER.id,
    type: "debit",
    amount: 10,
    reason: `Applied to order ORD-${String(index + 1).padStart(4, "0")}`,
    orderId: index + 1,
    orderNumber: `ORD-${String(index + 1).padStart(4, "0")}`,
    refundId: null,
    refundNumber: null,
    balanceBefore: 10 * (count - index + 1),
    balanceAfter: 10 * (count - index),
    createdAt: new Date(Date.UTC(2026, 5, 1, 12) - index * 3600000).toISOString(),
  }));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// The two reads, held until the test settles them inside act().
const holdReads = () => {
  const balance = deferred();
  const ledger = deferred();
  apiService.wallet.getBalance.mockReturnValueOnce(balance.promise);
  apiService.wallet.getTransactions.mockReturnValueOnce(ledger.promise);
  return {
    settle: (value = SEEDED_BALANCE, entries = seededLedger()) =>
      act(async () => {
        balance.resolve(value);
        ledger.resolve(entries);
      }),
    fail: (error = new Error("Network Error")) =>
      act(async () => {
        balance.reject(error);
        ledger.resolve([]);
      }),
  };
};

const Probe = () => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <span data-testid="location">{location.pathname + location.search}</span>
      <button type="button" onClick={() => navigate("/profile?tab=password")}>
        Route change
      </button>
    </div>
  );
};

// What the Store credit region holds in the commit it appears in, before any
// effect has run: a layout effect sees the DOM before React's passive effects
// (the wallet's read among them), so this is each visit's first paint. It
// re-renders with the session and the route, as the page does.
let firstPaints = [];
const FirstPaint = () => {
  useLocation();
  useAuth();
  const shown = useRef(false);
  useLayoutEffect(() => {
    // The raw DOM at commit time (role queries would rebuild the accessibility
    // tree of a 120-row ledger on every route change).
    // eslint-disable-next-line testing-library/no-node-access
    const region = document.querySelector('section[aria-label="Store credit"]');
    if (region && !shown.current) firstPaints.push(region.textContent);
    shown.current = Boolean(region);
  });
  return null;
};

const renderWallet = (at = "/profile?tab=wallet") => {
  sessionStorage.setItem("user", JSON.stringify(USER));
  sessionStorage.setItem("token", "mock-token-3");
  return render(
    <MemoryRouter initialEntries={[at]}>
      <AuthProvider>
        <main>
          <Profile />
        </main>
        <Probe />
        <FirstPaint />
      </AuthProvider>
    </MemoryRouter>
  );
};

const region = () => screen.getByRole("region", { name: "Store credit" });
const navLink = (name) => within(screen.getByRole("navigation", { name: "Account" })).getByRole("link", { name });
const table = () => within(region()).getByRole("table", { name: "Transactions" });
const bodyRows = () => within(table()).getAllByRole("row").slice(1);
const ledgerList = () => within(region()).getByRole("list", { name: "Transactions" });
const cells = (row) => within(row).getAllByRole("cell");
// The card (the Reveal around the "Store credit" heading) and the skeleton
// wrapper are presentational: no role to query them by.
// eslint-disable-next-line testing-library/no-node-access
const card = () => within(region()).getByRole("heading", { level: 2, name: "Store credit" }).parentElement.parentElement;
const location = () => screen.getByTestId("location").textContent;

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver;
});
afterAll(() => {
  delete window.IntersectionObserver;
});

// An element with an inline style (the motion primitive's opacity) between
// `element` and the section region, if any.
const styledAncestor = (element) => {
  // eslint-disable-next-line testing-library/no-node-access
  for (let node = element; node && node !== region(); node = node.parentElement) {
    if (node.hasAttribute("style")) return node;
  }
  return null;
};

// CRA resets every mock before each test (resetMocks): implementations here.
// console.error fails a test (an act() warning, a crash) unless the test
// expects the page's own "Load wallet error" log.
let scrollTo;
let consoleError;
let errorsExpected;
const expectWalletErrors = () => {
  errorsExpected = true;
  consoleError.mockImplementation(() => {});
};
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  firstPaints = [];
  useReducedMotion.mockReturnValue(false);
  apiService.wallet.getBalance.mockResolvedValue(SEEDED_BALANCE);
  apiService.wallet.getTransactions.mockResolvedValue(seededLedger());
  scrollTo = jest.spyOn(window, "scrollTo").mockImplementation(() => {});
  errorsExpected = false;
  consoleError = jest.spyOn(console, "error");
});

afterEach(() => {
  const calls = consoleError.mock.calls;
  scrollTo.mockRestore();
  consoleError.mockRestore();
  if (!errorsExpected) expect(calls).toEqual([]);
});

// ── When the reads run ────────────────────────────────────────────────────────

test("opening the tab reads the balance and the ledger, once each, for the signed-in account", async () => {
  const reads = holdReads();
  renderWallet();
  expect(apiService.wallet.getBalance).toHaveBeenCalledTimes(1);
  expect(apiService.wallet.getBalance).toHaveBeenCalledWith(USER.id);
  expect(apiService.wallet.getTransactions).toHaveBeenCalledTimes(1);
  expect(apiService.wallet.getTransactions).toHaveBeenCalledWith(USER.id);
  await reads.settle();
  expect(apiService.wallet.getBalance).toHaveBeenCalledTimes(1);
  expect(apiService.wallet.getTransactions).toHaveBeenCalledTimes(1);
});

test("other tabs read nothing; Store credit from the nav reads then, and focus moves to its section", async () => {
  renderWallet("/profile");
  expect(apiService.wallet.getBalance).not.toHaveBeenCalled();
  expect(apiService.wallet.getTransactions).not.toHaveBeenCalled();
  const reads = holdReads();
  fireEvent.click(navLink("Store credit"));
  expect(location()).toBe("/profile?tab=wallet");
  expect(region()).toHaveFocus();
  expect(apiService.wallet.getBalance).toHaveBeenCalledWith(USER.id);
  expect(apiService.wallet.getTransactions).toHaveBeenCalledWith(USER.id);
  await reads.settle();
  expect(within(card()).getByText("₹2,302.00")).toBeInTheDocument();
});

test("every visit reads afresh, and starts from the skeletons, not the last visit's figures", async () => {
  const first = holdReads();
  renderWallet();
  await first.settle();
  expect(within(card()).getByText("₹2,302.00")).toBeInTheDocument();

  fireEvent.click(navLink("Profile"));
  const second = holdReads();
  fireEvent.click(navLink("Store credit"));
  expect(apiService.wallet.getBalance).toHaveBeenCalledTimes(2);
  expect(apiService.wallet.getTransactions).toHaveBeenCalledTimes(2);
  expect(within(region()).queryByText("₹2,302.00")).not.toBeInTheDocument();
  expect(within(region()).queryByRole("table")).not.toBeInTheDocument();
  expect(within(region()).getByText("Loading your store credit")).toBeInTheDocument();

  await second.settle(1302, seededLedger().slice(1));
  expect(within(card()).getByText("₹1,302.00")).toBeInTheDocument();
  expect(bodyRows()).toHaveLength(2);
});

test("reads that settle after the tab has closed change nothing", async () => {
  const late = holdReads();
  renderWallet();
  fireEvent.click(navLink("Profile"));
  await late.settle(9999, longLedger(3));
  expect(screen.queryByRole("region", { name: "Store credit" })).not.toBeInTheDocument();

  const next = holdReads();
  fireEvent.click(navLink("Store credit"));
  expect(within(region()).queryByText("₹9,999.00")).not.toBeInTheDocument();
  expect(within(region()).getByText("Loading your store credit")).toBeInTheDocument();
  await next.settle();
  expect(within(card()).getByText("₹2,302.00")).toBeInTheDocument();
  expect(bodyRows()).toHaveLength(3);
});

test("a read from an earlier visit that settles during the next visit's read changes nothing", async () => {
  const earlier = holdReads();
  renderWallet();
  fireEvent.click(navLink("Profile"));
  const next = holdReads();
  fireEvent.click(navLink("Store credit"));
  await earlier.settle(9999, longLedger(3));
  expect(within(region()).queryByText("₹9,999.00")).not.toBeInTheDocument();
  expect(within(region()).getByText("Loading your store credit")).toBeInTheDocument();
  await next.settle();
  expect(within(card()).getByText("₹2,302.00")).toBeInTheDocument();
});

test("…and one that fails then shows no error: the next visit's read decides", async () => {
  expectWalletErrors();
  const earlier = holdReads();
  renderWallet();
  fireEvent.click(navLink("Profile"));
  const next = holdReads();
  fireEvent.click(navLink("Store credit"));
  await earlier.fail();
  expect(within(region()).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  expect(within(region()).getByText("Loading your store credit")).toBeInTheDocument();
  await next.settle();
  expect(within(card()).getByText("₹2,302.00")).toBeInTheDocument();
});

test("the first paint of a visit is the skeletons, never an empty wallet", async () => {
  const reads = holdReads();
  renderWallet();
  expect(firstPaints).toHaveLength(1);
  expect(firstPaints[0]).toContain("Loading your store credit");
  expect(firstPaints[0]).not.toContain("₹");
  expect(firstPaints[0]).not.toContain("No transactions yet.");
  await reads.settle();
});

test("…and a return visit's first paint is the skeletons, never the last visit's figures", async () => {
  const first = holdReads();
  renderWallet();
  await first.settle();
  fireEvent.click(navLink("Profile"));
  const second = holdReads();
  fireEvent.click(navLink("Store credit"));
  expect(firstPaints).toHaveLength(2);
  expect(firstPaints[1]).toContain("Loading your store credit");
  expect(firstPaints[1]).not.toContain("₹2,302.00");
  await second.settle();
});

// ── Loading ────────────────────────────────────────────────────────────────────

test("while the reads run: busy, the skeletons, the headings, no figure, no empty state", async () => {
  const reads = holdReads();
  renderWallet();
  const content = region();
  // eslint-disable-next-line testing-library/no-node-access
  const wrapper = content.firstElementChild;
  expect(wrapper).toHaveAttribute("aria-busy", "true");
  expect(within(content).getByText("Loading your store credit")).toHaveClass("sf-visually-hidden");
  expect(within(content).getByRole("heading", { level: 2, name: "Store credit" })).toBeInTheDocument();
  expect(within(content).getByRole("heading", { level: 2, name: "Transactions" })).toBeInTheDocument();
  // The placeholders are hidden from assistive technology: no table, no list.
  expect(within(content).queryByRole("table")).not.toBeInTheDocument();
  expect(within(content).queryByRole("list", { name: "Transactions" })).not.toBeInTheDocument();
  // eslint-disable-next-line testing-library/no-node-access
  expect(content.querySelectorAll(".sf-skeleton").length).toBeGreaterThan(3);
  expect(within(content).queryByText(/₹/)).not.toBeInTheDocument();
  expect(within(content).queryByText("No transactions yet.")).not.toBeInTheDocument();

  await reads.settle();
  expect(wrapper).not.toHaveAttribute("aria-busy");
  expect(within(content).queryByText("Loading your store credit")).not.toBeInTheDocument();
  // eslint-disable-next-line testing-library/no-node-access
  expect(content.querySelectorAll(".sf-skeleton")).toHaveLength(0);
});

// ── The balance card ───────────────────────────────────────────────────────────

test("the card: the eyebrow heading, the API's balance, the hint and Shop now", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle();
  const box = card();
  const heading = within(box).getByRole("heading", { level: 2, name: "Store credit" });
  expect(heading).toHaveClass("sf-eyebrow");
  const balance = within(box).getByText("₹2,302.00");
  expect(balance).toHaveClass("sf-display-md");
  expect(balance).toHaveTextContent(/^Available balance ₹2,302\.00$/);
  expect(within(balance).getByText("Available balance")).toHaveClass("sf-visually-hidden");
  expect(within(box).getByText("Apply your store credit at checkout toward any order.")).toBeInTheDocument();
  const shop = within(box).getByRole("link", { name: "Shop now" });
  expect(shop).toHaveAttribute("href", "/products");
  expect(shop).toHaveClass("sf-btn", "sf-btn--paper-ghost");
});

test("Shop now goes to the catalogue", async () => {
  renderWallet();
  fireEvent.click(await within(region()).findByRole("link", { name: "Shop now" }));
  expect(location()).toBe("/products");
});

test("the balance is the API's: the page never adds up the ledger", async () => {
  const reads = holdReads();
  renderWallet();
  // The ledger ends at ₹2,302 (and sums to it); the API says ₹5,000.
  await reads.settle(5000);
  expect(within(card()).getByText("₹5,000.00")).toBeInTheDocument();
  expect(within(card()).queryByText("₹2,302.00")).not.toBeInTheDocument();
});

test.each([
  ["a number as text", "1250", "₹1,250.00"],
  ["no balance", null, "₹0.00"],
  ["not a number", "n/a", "₹0.00"],
])("a balance given as %s reads as before (Number, else zero)", async (_, value, shown) => {
  const reads = holdReads();
  renderWallet();
  await reads.settle(value);
  expect(within(card()).getByText(shown)).toBeInTheDocument();
});

// ── How it works ───────────────────────────────────────────────────────────────

test("How it works lists the two facts, and makes no expiry claim", async () => {
  const reads = holdReads();
  renderWallet();
  const facts = within(region()).getByRole("list", { name: "How it works" });
  expect(
    within(facts)
      .getAllByRole("listitem")
      .map((item) => item.textContent)
  ).toEqual(["Credit is added when a refund is issued to store credit", "Apply it at checkout on any order"]);
  await reads.settle();
  expect(within(region()).queryByText(/expire/i)).not.toBeInTheDocument();
});

// ── The ledger: the table ──────────────────────────────────────────────────────

test("the table: named by its heading, four column headers (scope col), one row per entry, in the API's order", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle();
  const headers = within(table()).getAllByRole("columnheader");
  expect(headers.map((header) => header.textContent)).toEqual(["Date", "Description", "Amount", "Balance"]);
  headers.forEach((header) => expect(header).toHaveAttribute("scope", "col"));
  expect(bodyRows().map((row) => cells(row)[0].textContent)).toEqual(["Jun 14, 2026", "Jun 13, 2026", "Jun 13, 2026"]);
  expect(within(region()).getByRole("heading", { level: 2, name: "Transactions" })).toHaveClass("sf-display-sm");
});

test("dates: formatDate's short form in a <time> with the instant", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle();
  // eslint-disable-next-line testing-library/no-node-access
  const time = cells(bodyRows()[0])[0].querySelector("time");
  expect(time).toHaveAttribute("dateTime", "2026-06-14T14:22:33.343Z");
  expect(time).toHaveTextContent("Jun 14, 2026");
});

test("credits read '+' in the success tone, debits '−' in ink; both as words for screen readers", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle();
  const [newest, , oldest] = bodyRows();

  const debit = within(cells(newest)[2]).getByText("Debit of ₹1,000.00");
  expect(debit).toHaveClass("sf-visually-hidden");
  // eslint-disable-next-line testing-library/no-node-access
  const debitBox = debit.parentElement;
  expect(debitBox).toHaveAttribute("data-type", "debit");
  expect(within(debitBox).getByText("−₹1,000.00")).toHaveAttribute("aria-hidden", "true");

  const credit = within(cells(oldest)[2]).getByText("Credit of ₹4,302.00");
  expect(credit).toHaveClass("sf-visually-hidden");
  // eslint-disable-next-line testing-library/no-node-access
  const creditBox = credit.parentElement;
  expect(creditBox).toHaveAttribute("data-type", "credit");
  expect(within(creditBox).getByText("+₹4,302.00")).toHaveAttribute("aria-hidden", "true");
});

test("balances: the balanceAfter recorded with each entry", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle();
  expect(bodyRows().map((row) => cells(row)[3].textContent)).toEqual(["₹2,302.00", "₹3,302.00", "₹4,302.00"]);
});

test("the order number in the reason is the link to Orders; the refund number goes under it", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle();
  const [newest, , oldest] = bodyRows();
  const description = cells(newest)[1];
  expect(description).toHaveTextContent(/^Applied to order ORD-MQDVIQCV-30A9$/);
  const link = within(description).getByRole("link", { name: "ORD-MQDVIQCV-30A9" });
  expect(link).toHaveAttribute("href", "/orders");
  expect(link).toHaveClass("sf-btn", "sf-btn--link");
  // The number shows once: in the sentence, as the link.
  expect(within(description).getAllByText(/ORD-MQDVIQCV-30A9/)).toHaveLength(1);

  const refunded = cells(oldest)[1];
  expect(within(refunded).getByRole("link", { name: "ORD-MQC1HWSZ-CAN8" })).toHaveAttribute("href", "/orders");
  expect(within(refunded).getByText("Refund REF-20260613-JQ3L")).toBeInTheDocument();
  expect(within(cells(newest)[1]).queryByText(/^Refund /)).not.toBeInTheDocument();
});

test("the order link goes to Orders", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle();
  fireEvent.click(within(table()).getByRole("link", { name: "ORD-MQDVIQCV-30A9" }));
  expect(location()).toBe("/orders");
});

test("a reason that does not name its order is followed by 'Order <link>', beside the refund number", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle(500, [
    {
      id: 7,
      type: "credit",
      amount: 500,
      reason: "Refund for return RET-20260701-0003",
      orderNumber: "ORD-0042",
      refundNumber: "REF-0042",
      balanceAfter: 500,
      createdAt: "2026-07-01T10:00:00.000Z",
    },
  ]);
  const description = cells(bodyRows()[0])[1];
  expect(within(description).getByText("Refund for return RET-20260701-0003")).toBeInTheDocument();
  const order = within(description).getByText(/^Order/);
  expect(order).toHaveTextContent(/^Order ORD-0042$/);
  expect(within(order).getByRole("link", { name: "ORD-0042" })).toHaveAttribute("href", "/orders");
  expect(within(description).getByText("Refund REF-0042")).toBeInTheDocument();
});

test.each([
  ["no reason", undefined],
  ["an empty reason", ""],
  ["a reason of spaces", "   "],
])("%s: 'Store credit added' for a credit, 'Store credit used' for a debit", async (_, reason) => {
  const reads = holdReads();
  renderWallet();
  await reads.settle(0, [
    { id: 1, type: "credit", amount: 100, reason, balanceAfter: 100, createdAt: "2026-07-02T10:00:00.000Z" },
    { id: 2, type: "debit", amount: 100, reason, balanceAfter: 0, createdAt: "2026-07-03T10:00:00.000Z" },
  ]);
  const [first, second] = bodyRows();
  expect(cells(first)[1]).toHaveTextContent(/^Store credit added$/);
  expect(cells(second)[1]).toHaveTextContent(/^Store credit used$/);
  // No order number: no link.
  expect(within(table()).queryByRole("link")).not.toBeInTheDocument();
});

test("a missing date or balance shows a dash, named for screen readers", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle(0, [{ id: 1, type: "debit", amount: 100, reason: "Adjustment", balanceAfter: null }]);
  const [date, , , balance] = cells(bodyRows()[0]);
  expect(within(date).getByText("—")).toHaveAttribute("aria-hidden", "true");
  expect(within(date).getByText("Date not recorded")).toHaveClass("sf-visually-hidden");
  expect(within(balance).getByText("—")).toHaveAttribute("aria-hidden", "true");
  expect(within(balance).getByText("Not recorded")).toHaveClass("sf-visually-hidden");
});

test("the sign comes from the entry's type, so a signed amount still reads once", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle(0, [
    { id: 1, type: "debit", amount: -1000, reason: "Applied", balanceAfter: 0, createdAt: "2026-07-02T10:00:00.000Z" },
    { id: 2, type: "credit", amount: "250", reason: "Refund", balanceAfter: 250, createdAt: "2026-07-01T10:00:00.000Z" },
  ]);
  const [debit, credit] = bodyRows();
  expect(within(cells(debit)[2]).getByText("Debit of ₹1,000.00")).toBeInTheDocument();
  expect(within(cells(debit)[2]).getByText("−₹1,000.00")).toBeInTheDocument();
  expect(within(cells(credit)[2]).getByText("Credit of ₹250.00")).toBeInTheDocument();
});

// ── The ledger: the list (up to 600px) ─────────────────────────────────────────

test("the list carries the same entries, each as label / value rows", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle();
  const items = within(ledgerList()).getAllByRole("listitem");
  expect(items).toHaveLength(3);
  const [newest, , oldest] = items;
  expect(within(newest).getAllByRole("term").map((term) => term.textContent)).toEqual([
    "Date",
    "Description",
    "Amount",
    "Balance",
  ]);
  const values = within(newest).getAllByRole("definition");
  expect(values[0]).toHaveTextContent("Jun 14, 2026");
  expect(values[1]).toHaveTextContent(/^Applied to order ORD-MQDVIQCV-30A9$/);
  expect(within(values[1]).getByRole("link", { name: "ORD-MQDVIQCV-30A9" })).toHaveAttribute("href", "/orders");
  expect(within(values[2]).getByText("Debit of ₹1,000.00")).toBeInTheDocument();
  expect(values[3]).toHaveTextContent("₹2,302.00");
  expect(within(oldest).getByText("Credit of ₹4,302.00")).toBeInTheDocument();
  expect(within(oldest).getByText("Refund REF-20260613-JQ3L")).toBeInTheDocument();
});

// ── Empty ──────────────────────────────────────────────────────────────────────

test("no entries yet: the serif line and its one line of fact, no table or list", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle(0, []);
  const content = region();
  expect(within(content).getByText("No transactions yet.")).toHaveClass("sf-display-sm");
  expect(
    within(content).getByText("Refunds issued to store credit, and credit you spend at checkout, will appear here.")
  ).toBeInTheDocument();
  expect(within(content).queryByRole("table")).not.toBeInTheDocument();
  expect(within(content).queryByRole("list", { name: "Transactions" })).not.toBeInTheDocument();
  expect(within(card()).getByText("₹0.00")).toBeInTheDocument();
});

test("a ledger that is not a list (an unexpected API shape) reads as empty", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle(0, { data: [] });
  expect(within(region()).getByText("No transactions yet.")).toBeInTheDocument();
});

// ── Error and Try again ────────────────────────────────────────────────────────

test("a failed read: the panel and Try again, in place of the card and the ledger", async () => {
  expectWalletErrors();
  const reads = holdReads();
  renderWallet();
  await reads.fail();
  const content = region();
  expect(within(content).getByRole("heading", { level: 2, name: "We couldn’t load your store credit." })).toBeInTheDocument();
  expect(within(content).getByText("Please check your connection and try again.")).toBeInTheDocument();
  expect(within(content).getByRole("button", { name: "Try again" })).toHaveClass("sf-btn", "sf-btn--primary");
  // eslint-disable-next-line testing-library/no-node-access
  expect(content.firstElementChild).toHaveClass("sf-panel");
  expect(within(content).queryByRole("heading", { name: "Store credit" })).not.toBeInTheDocument();
  expect(within(content).queryByRole("link", { name: "Shop now" })).not.toBeInTheDocument();
  expect(within(content).queryByText(/₹/)).not.toBeInTheDocument();
  expect(consoleError).toHaveBeenCalledWith("Load wallet error:", expect.any(Error));
});

test("the ledger's read failing shows the panel too", async () => {
  expectWalletErrors();
  apiService.wallet.getTransactions.mockRejectedValueOnce(new Error("Network Error"));
  renderWallet();
  expect(await within(region()).findByRole("button", { name: "Try again" })).toBeInTheDocument();
});

test("Try again runs the same two reads; focus waits on the section and stays there when they succeed", async () => {
  expectWalletErrors();
  const first = holdReads();
  renderWallet();
  await first.fail();

  const retry = holdReads();
  fireEvent.click(within(region()).getByRole("button", { name: "Try again" }));
  expect(region()).toHaveFocus();
  expect(apiService.wallet.getBalance).toHaveBeenCalledTimes(2);
  expect(apiService.wallet.getBalance).toHaveBeenLastCalledWith(USER.id);
  expect(apiService.wallet.getTransactions).toHaveBeenCalledTimes(2);
  expect(apiService.wallet.getTransactions).toHaveBeenLastCalledWith(USER.id);
  // The panel makes way for the skeletons.
  expect(within(region()).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  expect(within(region()).getByText("Loading your store credit")).toBeInTheDocument();

  await retry.settle();
  expect(within(card()).getByText("₹2,302.00")).toBeInTheDocument();
  expect(bodyRows()).toHaveLength(3);
  expect(region()).toHaveFocus();
});

test("a second failure hands focus to the new Try again", async () => {
  expectWalletErrors();
  const first = holdReads();
  renderWallet();
  await first.fail();
  const retry = holdReads();
  fireEvent.click(within(region()).getByRole("button", { name: "Try again" }));
  await retry.fail();
  expect(within(region()).getByRole("button", { name: "Try again" })).toHaveFocus();
});

test("…unless focus has gone somewhere else meanwhile", async () => {
  expectWalletErrors();
  const first = holdReads();
  renderWallet();
  await first.fail();
  const retry = holdReads();
  fireEvent.click(within(region()).getByRole("button", { name: "Try again" }));
  const elsewhere = navLink("Addresses");
  elsewhere.focus();
  await retry.fail();
  expect(elsewhere).toHaveFocus();
});

test("a failure on arrival leaves focus where the page load put it", async () => {
  expectWalletErrors();
  const reads = holdReads();
  renderWallet();
  await reads.fail();
  expect(document.body).toHaveFocus();
});

// ── Long ledgers: 50 at a time ─────────────────────────────────────────────────

test("more than 50 entries: 50 in each view, the count, and Show more", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle(1200, longLedger(120));
  expect(bodyRows()).toHaveLength(50);
  expect(within(ledgerList()).getAllByRole("listitem")).toHaveLength(50);
  const count = within(region()).getByText("Showing 50 of 120 transactions");
  expect(count).toHaveAttribute("aria-live", "polite");
  expect(within(region()).getByRole("button", { name: "Show more" })).toHaveClass("sf-btn", "sf-btn--ghost");
});

test("Show more adds 50 and moves focus to the first of them; the last press shows them all", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle(1200, longLedger(120));

  fireEvent.click(within(region()).getByRole("button", { name: "Show more" }));
  expect(bodyRows()).toHaveLength(100);
  expect(within(ledgerList()).getAllByRole("listitem")).toHaveLength(100);
  expect(bodyRows()[50]).toHaveFocus();
  expect(cells(bodyRows()[50])[1]).toHaveTextContent("ORD-0051");
  expect(within(region()).getByText("Showing 100 of 120 transactions")).toBeInTheDocument();

  fireEvent.click(within(region()).getByRole("button", { name: "Show more" }));
  expect(bodyRows()).toHaveLength(120);
  expect(bodyRows()[100]).toHaveFocus();
  expect(within(region()).getByText("Showing all 120 transactions")).toBeInTheDocument();
  expect(within(region()).queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
});

test("only the first row of each further 50 is focusable (a reading position, not a tab stop)", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle(1200, longLedger(120));
  fireEvent.click(within(region()).getByRole("button", { name: "Show more" }));
  const rows = bodyRows();
  expect(rows.filter((row) => row.hasAttribute("tabindex"))).toEqual([rows[50]]);
  expect(rows[50]).toHaveAttribute("tabindex", "-1");
  const items = within(ledgerList()).getAllByRole("listitem");
  expect(items.filter((item) => item.hasAttribute("tabindex"))).toEqual([items[50]]);
});

test("50 entries or fewer: no count and no Show more", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle(500, longLedger(50));
  expect(bodyRows()).toHaveLength(50);
  expect(within(region()).queryByText(/^Showing/)).not.toBeInTheDocument();
  expect(within(region()).queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
});

test("the next visit starts from 50 again", async () => {
  const first = holdReads();
  renderWallet();
  await first.settle(1200, longLedger(120));
  fireEvent.click(within(region()).getByRole("button", { name: "Show more" }));
  expect(bodyRows()).toHaveLength(100);
  fireEvent.click(navLink("Profile"));
  const second = holdReads();
  fireEvent.click(navLink("Store credit"));
  await second.settle(1200, longLedger(120));
  expect(bodyRows()).toHaveLength(50);
});

// ── Headings and motion ────────────────────────────────────────────────────────

test("headings: the page's one h1, then the card's h2 and the ledger's h2", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle();
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(
    within(region())
      .getAllByRole("heading")
      .map((heading) => [heading.tagName, heading.textContent])
  ).toEqual([
    ["H2", "Store credit"],
    ["H2", "Transactions"],
  ]);
});

test("the card reveals on every visit (a new element), and the ledger's rows do not", async () => {
  const first = holdReads();
  renderWallet();
  await first.settle();
  const firstCard = card();
  fireEvent.click(navLink("Addresses"));
  const second = holdReads();
  fireEvent.click(navLink("Store credit"));
  await second.settle();
  expect(card()).not.toBe(firstCard);
  // No reveal (an opacity style from the motion primitive) around the rows.
  expect(styledAncestor(table())).toBeNull();
  expect(styledAncestor(ledgerList())).toBeNull();
});

test("the section does not read the theme: no frame, no dark class", async () => {
  const reads = holdReads();
  renderWallet();
  await reads.settle();
  // eslint-disable-next-line testing-library/no-node-access
  const wrapper = region().firstElementChild;
  expect(wrapper).not.toHaveClass("legacy");
  expect(wrapper).not.toHaveClass("dark");
  expect(wrapper).toHaveClass("wallet");
});
