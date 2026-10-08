import React, { useState } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useReducedMotion } from "framer-motion";
import apiService from "../../services/api";
import { getFocusableElements } from "../ui/useFocusTrap";
import db from "../../../db.json";
import SearchModal from "./SearchModal";
import {
  RECENT_SEARCHES_KEY,
  buildCategoryMap,
  buildCategoryNav,
  clearSearchDataCache,
  searchProducts,
} from "./searchData";

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    products: { getAll: jest.fn() },
    categories: { getAll: jest.fn() },
  },
}));

// Reduced motion by default: no entrance, and the exit is instant. One test
// turns motion back on.
jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(() => true),
}));

// ── The seeded catalogue, served the way api.js serves it ──────────────────

const PRODUCTS = db.products;
const CATEGORIES = db.categories
  .filter((c) => c.isActive !== false)
  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
const NAV = buildCategoryNav(CATEGORIES);
const MAP = buildCategoryMap(CATEGORIES);
const expectedResults = (query, chip = "All") =>
  searchProducts(PRODUCTS, MAP, NAV.groups, query, chip);
const DEPARTMENT_LINKS = [
  "/products?category=plastic-furniture",
  "/products?category=office-chairs",
  "/products?category=cafe-restaurant-chairs",
  "/products?category=outdoor-furniture",
  "/products?category=home-furniture",
  "/products?category=office-tables-desks",
];

beforeEach(() => {
  clearSearchDataCache();
  localStorage.clear();
  apiService.products.getAll.mockResolvedValue(PRODUCTS);
  apiService.categories.getAll.mockResolvedValue(CATEGORIES);
  useReducedMotion.mockReturnValue(true);
});

afterEach(() => {
  jest.clearAllMocks();
  document.body.style.overflow = "";
});

// ── Harness: a trigger, the overlay, and probes for the router ─────────────

let navigateTo;
const RouterProbes = () => {
  const location = useLocation();
  navigateTo = useNavigate();
  return <span data-testid="location">{location.pathname + location.search}</span>;
};

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Search
      </button>
      <SearchModal open={open} onClose={() => setOpen(false)} />
      <RouterProbes />
    </>
  );
}

const renderHarness = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Harness />
    </MemoryRouter>
  );

const dialog = () => screen.getByRole("dialog", { name: "Product search" });
const field = () => screen.getByRole("searchbox", { name: "Search products" });
const status = () => screen.getByRole("status");
const location = () => screen.getByTestId("location").textContent;
const recents = () => JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY));
const progressActive = () => dialog().querySelector(".progressActive");
const type = (value) => fireEvent.change(field(), { target: { value } });
const waitForStatus = (text) => waitFor(() => expect(status()).toHaveTextContent(text));
const waitForClosed = () =>
  waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
// The product an article (card) is named by.
const articleName = (article) =>
  document.getElementById(article.getAttribute("aria-labelledby")).textContent;
const resultsList = () => screen.getByRole("list", { name: /results? for/ });

// Open from the trigger; by default wait until the catalogue has arrived.
const openSearch = async ({ settle = true } = {}) => {
  const trigger = screen.getByRole("button", { name: "Search" });
  trigger.focus();
  fireEvent.click(trigger);
  await screen.findByRole("dialog", { name: "Product search" });
  if (settle) await waitFor(() => expect(progressActive()).toBeNull());
  return trigger;
};

const searchFor = async (query) => {
  type(query);
  await waitFor(() => expect(status()).toHaveTextContent(`“${query}”`));
};

// ── Opening ──────────────────────────────────────────────────────────────────

test("renders nothing and reads nothing while closed", () => {
  renderHarness();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(apiService.products.getAll).not.toHaveBeenCalled();
});

test("opens as a modal dialog with a labelled search field in focus; the page is locked", async () => {
  renderHarness();
  await openSearch();
  expect(dialog()).toHaveAttribute("aria-modal", "true");
  expect(within(dialog()).getByRole("search")).toContainElement(field());
  expect(field()).toHaveFocus();
  expect(field()).toHaveAttribute("type", "search");
  expect(field()).toHaveAttribute("placeholder", "Search furniture, rooms, brands…");
  expect(field()).toHaveAttribute("autocomplete", "off");
  expect(field()).toHaveAttribute("enterkeyhint", "search");
  expect(screen.getByText("Search products").tagName).toBe("LABEL");
  expect(within(dialog()).getByRole("button", { name: "Close search" })).toBeInTheDocument();
  expect(status()).toHaveAttribute("aria-live", "polite");
  expect(document.body.style.overflow).toBe("hidden");
});

test("two instances (header and bottom bar) share one catalogue read", async () => {
  function Two() {
    const [first, setFirst] = useState(false);
    const [second, setSecond] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setFirst(true)}>
          Open first
        </button>
        <button type="button" onClick={() => setSecond(true)}>
          Open second
        </button>
        <SearchModal open={first} onClose={() => setFirst(false)} />
        <SearchModal open={second} onClose={() => setSecond(false)} />
      </>
    );
  }
  render(
    <MemoryRouter>
      <Two />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole("button", { name: "Open first" }));
  await screen.findByRole("region", { name: "Popular" });
  fireEvent.keyDown(field(), { key: "Escape" });
  await waitForClosed();
  fireEvent.click(screen.getByRole("button", { name: "Open second" }));
  // The cached catalogue shows at once: no skeleton, no second read.
  expect(screen.getByRole("region", { name: "Popular" })).toBeInTheDocument();
  expect(apiService.products.getAll).toHaveBeenCalledTimes(1);
  expect(apiService.categories.getAll).toHaveBeenCalledTimes(1);
});

// ── Before typing ────────────────────────────────────────────────────────────

test("before typing: Recent from localStorage, Popular from the first six trending products", async () => {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(["office chair", "almirah"]));
  renderHarness();
  await openSearch();
  const recent = screen.getByRole("region", { name: "Recent" });
  expect(within(recent).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    "office chair",
    "almirah",
  ]);
  expect(within(recent).getByRole("button", { name: "Remove almirah from recent searches" })).toBeInTheDocument();
  const popular = screen.getByRole("region", { name: "Popular" });
  expect(within(popular).getAllByRole("button").map((button) => button.textContent)).toEqual(
    PRODUCTS.filter((p) => p.trending)
      .slice(0, 6)
      .map((p) => p.name)
  );
  // The department chips scope a search, so they wait for one.
  expect(screen.queryByRole("group", { name: "Filter by department" })).not.toBeInTheDocument();
  expect(status()).toBeEmptyDOMElement();
});

test("with nothing trending, the column is Departments and opens their listings", async () => {
  apiService.products.getAll.mockResolvedValue(PRODUCTS.map((p) => ({ ...p, trending: false })));
  renderHarness();
  await openSearch();
  expect(screen.queryByRole("region", { name: "Popular" })).not.toBeInTheDocument();
  const departments = screen.getByRole("region", { name: "Departments" });
  const links = within(departments).getAllByRole("link");
  expect(links.map((link) => link.getAttribute("href"))).toEqual(DEPARTMENT_LINKS);
  fireEvent.click(links[1]);
  expect(location()).toBe("/products?category=office-chairs");
  await waitForClosed();
});

test("a popular chip runs its search, keeping focus in the field", async () => {
  renderHarness();
  await openSearch();
  const chip = within(screen.getByRole("region", { name: "Popular" })).getAllByRole("button")[0];
  const name = chip.textContent;
  fireEvent.click(chip);
  expect(field()).toHaveValue(name);
  expect(field()).toHaveFocus();
  await waitForStatus(`for “${name}”`);
  expect(articleName(within(resultsList()).getAllByRole("article")[0])).toBe(name);
});

test("a recent chip runs its search; × forgets one, focus moving to the next ×; Clear all forgets all", async () => {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(["office chair", "almirah", "sofa"]));
  renderHarness();
  await openSearch();
  const recent = screen.getByRole("region", { name: "Recent" });

  fireEvent.click(within(recent).getByRole("button", { name: "Remove almirah from recent searches" }));
  expect(within(recent).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    "office chair",
    "sofa",
  ]);
  expect(recents()).toEqual(["office chair", "sofa"]);
  expect(within(recent).getByRole("button", { name: "Remove sofa from recent searches" })).toHaveFocus();

  fireEvent.click(within(recent).getByRole("button", { name: "Clear all recent searches" }));
  expect(screen.queryByRole("region", { name: "Recent" })).not.toBeInTheDocument();
  expect(localStorage.getItem(RECENT_SEARCHES_KEY)).toBeNull();
  expect(field()).toHaveFocus();
});

test("a recent chip runs its search", async () => {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(["almirah"]));
  renderHarness();
  await openSearch();
  fireEvent.click(within(screen.getByRole("region", { name: "Recent" })).getByRole("button", { name: "almirah" }));
  expect(field()).toHaveValue("almirah");
  await waitForStatus("2 results for “almirah”");
});

test("stored values that are not text never become chips", async () => {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(["chair", { q: "x" }, 5, "  "]));
  renderHarness();
  await openSearch();
  const recent = screen.getByRole("region", { name: "Recent" });
  expect(within(recent).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["chair"]);
});

// ── Searching ────────────────────────────────────────────────────────────────

test("typing searches after the pause: the live count, twelve cards in score order, View all", async () => {
  renderHarness();
  await openSearch();
  type("chair");
  const expected = expectedResults("chair");
  await waitForStatus(`${expected.length} results for “chair”`);
  const list = resultsList();
  expect(list).toHaveAccessibleName(`${expected.length} results for “chair”`);
  expect(within(list).getAllByRole("article").map(articleName)).toEqual(
    expected.slice(0, 12).map((p) => p.name)
  );
  // Navigation only: no quick add, no wishlist.
  expect(within(list).queryByRole("button")).not.toBeInTheDocument();
  expect(within(list).getAllByRole("link")[0]).toHaveAttribute("href", `/products/${expected[0].slug}`);
  expect(screen.getByRole("link", { name: `View all ${expected.length} results` })).toHaveAttribute(
    "href",
    "/products?search=chair"
  );
});

test("with twelve or fewer matches every card shows and there is no View all", async () => {
  renderHarness();
  await openSearch();
  await searchFor("almirah");
  expect(status()).toHaveTextContent("2 results for “almirah”");
  expect(within(resultsList()).getAllByRole("article")).toHaveLength(2);
  expect(screen.queryByRole("link", { name: /View all/ })).not.toBeInTheDocument();
});

test("while a new search is pending the last results stay, under the progress line", async () => {
  renderHarness();
  await openSearch();
  await searchFor("chair");
  type("chairs");
  expect(progressActive()).not.toBeNull();
  expect(within(resultsList()).getAllByRole("article").length).toBeGreaterThan(0);
  expect(status()).toHaveTextContent("results for “chair”");
  await waitForStatus("“chairs”");
  expect(progressActive()).toBeNull();
});

test("department chips scope the search (aria-pressed); a second press returns to All", async () => {
  renderHarness();
  await openSearch();
  await searchFor("chair");
  const group = screen.getByRole("group", { name: "Filter by department" });
  expect(within(group).getAllByRole("button").map((chip) => chip.textContent)).toEqual(NAV.chips);
  expect(within(group).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");

  const office = within(group).getByRole("button", { name: "Office Chairs" });
  fireEvent.click(office);
  expect(office).toHaveAttribute("aria-pressed", "true");
  expect(within(group).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
  const scoped = expectedResults("chair", "Office Chairs");
  expect(status()).toHaveTextContent(`${scoped.length} results for “chair” in Office Chairs`);
  expect(within(resultsList()).getAllByRole("article").map(articleName)).toEqual(
    scoped.slice(0, 12).map((p) => p.name)
  );

  fireEvent.click(office);
  expect(within(group).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  expect(status()).toHaveTextContent(`${expectedResults("chair").length} results for “chair”`);
});

test("nothing matched: the serif line in the live region, a hint and the department links", async () => {
  renderHarness();
  await openSearch();
  type("zzz");
  const heading = await screen.findByRole("heading", { name: "Nothing matched “zzz”." });
  expect(status()).toContainElement(heading);
  expect(screen.getByText("Try a room, a material or a department.")).toBeInTheDocument();
  const departments = screen.getByRole("list", { name: "Departments" });
  expect(within(departments).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(
    DEPARTMENT_LINKS
  );
});

test("nothing matched inside a department says so", async () => {
  renderHarness();
  await openSearch();
  await searchFor("chair");
  fireEvent.click(screen.getByRole("button", { name: "Office Tables & Desks" }));
  type("sofa");
  expect(await screen.findByRole("heading", { name: "Nothing matched “sofa” in Office Tables & Desks." })).toBeInTheDocument();
});

test("the clear button empties the field, refocuses it and brings back the suggestions", async () => {
  renderHarness();
  await openSearch();
  await searchFor("chair");
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(field()).toHaveValue("");
  expect(field()).toHaveFocus();
  expect(screen.getByRole("region", { name: "Popular" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  expect(status()).toBeEmptyDOMElement();
});

// ── Loading and failure ──────────────────────────────────────────────────────

test("while the catalogue loads: the progress line, skeleton cards in a busy region, then results", async () => {
  let resolveProducts;
  apiService.products.getAll.mockReturnValue(
    new Promise((resolve) => {
      resolveProducts = resolve;
    })
  );
  renderHarness();
  await openSearch({ settle: false });
  expect(progressActive()).not.toBeNull();
  type("chair");
  const busy = dialog().querySelector('[aria-busy="true"]');
  expect(busy).not.toBeNull();
  expect(within(busy).queryAllByRole("article")).toHaveLength(0);
  await act(async () => {
    resolveProducts(PRODUCTS);
  });
  await waitForStatus(`${expectedResults("chair").length} results for “chair”`);
  expect(dialog().querySelector('[aria-busy="true"]')).toBeNull();
  expect(progressActive()).toBeNull();
});

test("catalogue unavailable: the serif line and Try again, which reads it again", async () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  apiService.products.getAll.mockRejectedValueOnce(new Error("offline"));
  renderHarness();
  await openSearch({ settle: false });
  const heading = await screen.findByRole("heading", { name: "Search is unavailable right now." });
  expect(status()).toContainElement(heading);
  expect(progressActive()).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(field()).toHaveFocus();
  expect(await screen.findByRole("region", { name: "Popular" })).toBeInTheDocument();
  expect(apiService.products.getAll).toHaveBeenCalledTimes(2);
  consoleError.mockRestore();
});

test("a failed read is tried again on the next open", async () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  apiService.products.getAll.mockRejectedValueOnce(new Error("offline"));
  renderHarness();
  await openSearch({ settle: false });
  await screen.findByRole("heading", { name: "Search is unavailable right now." });
  fireEvent.keyDown(field(), { key: "Escape" });
  await waitForClosed();
  await openSearch();
  expect(screen.getByRole("region", { name: "Popular" })).toBeInTheDocument();
  expect(apiService.products.getAll).toHaveBeenCalledTimes(2);
  consoleError.mockRestore();
});

// ── Keyboard and focus ───────────────────────────────────────────────────────

test("Escape closes the overlay, focus returns to the trigger and the page unlocks", async () => {
  renderHarness();
  const trigger = await openSearch();
  fireEvent.keyDown(field(), { key: "Escape" });
  await waitForClosed();
  expect(trigger).toHaveFocus();
  expect(document.body.style.overflow).toBe("");
});

test("the close button closes it", async () => {
  renderHarness();
  const trigger = await openSearch();
  fireEvent.click(screen.getByRole("button", { name: "Close search" }));
  await waitForClosed();
  expect(trigger).toHaveFocus();
});

test("Tab runs field → clear → chips → results → View all → close, and wraps inside", async () => {
  renderHarness();
  await openSearch();
  await searchFor("chair");
  const order = getFocusableElements(dialog());
  const chips = NAV.chips.length;
  expect(order[0]).toBe(field());
  expect(order[1]).toHaveAccessibleName("Clear search");
  expect(order.slice(2, 2 + chips).map((el) => el.textContent)).toEqual(NAV.chips);
  const cards = order.slice(2 + chips, 2 + chips + 12);
  expect(cards.every((el) => el.tagName === "A" && el.closest("article"))).toBe(true);
  expect(order).toHaveLength(2 + chips + 12 + 2);
  expect(order[order.length - 2]).toHaveTextContent(/^View all \d+ results$/);
  const close = order[order.length - 1];
  expect(close).toHaveAccessibleName("Close search");

  close.focus();
  fireEvent.keyDown(close, { key: "Tab" });
  expect(field()).toHaveFocus();
  fireEvent.keyDown(field(), { key: "Tab", shiftKey: true });
  expect(close).toHaveFocus();
});

test("ArrowDown from the field reaches the first result; ArrowUp from it comes back", async () => {
  renderHarness();
  await openSearch();
  fireEvent.keyDown(field(), { key: "ArrowDown" });
  expect(field()).toHaveFocus(); // nothing to move to yet
  await searchFor("chair");
  const links = within(resultsList()).getAllByRole("link");
  fireEvent.keyDown(field(), { key: "ArrowDown" });
  expect(links[0]).toHaveFocus();
  fireEvent.keyDown(links[0], { key: "ArrowUp" });
  expect(field()).toHaveFocus();
  links[1].focus();
  fireEvent.keyDown(links[1], { key: "ArrowUp" });
  expect(links[1]).toHaveFocus();
});

// ── Leaving the overlay ──────────────────────────────────────────────────────

test("following a result opens the product, remembers the query and closes", async () => {
  renderHarness();
  const trigger = await openSearch();
  await searchFor("almirah");
  const first = within(resultsList()).getAllByRole("link")[0];
  const slug = expectedResults("almirah")[0].slug;
  expect(first).toHaveAttribute("href", `/products/${slug}`);
  fireEvent.click(first);
  expect(location()).toBe(`/products/${slug}`);
  await waitForClosed();
  expect(recents()).toEqual(["almirah"]);
  expect(trigger).toHaveFocus();
});

test("a modified click on a result (a new tab) remembers the query and leaves the overlay open", async () => {
  // jsdom cannot open tabs; stop its navigation once React has seen the click.
  const blockNavigation = (event) => event.preventDefault();
  document.addEventListener("click", blockNavigation);
  renderHarness();
  await openSearch();
  await searchFor("almirah");
  fireEvent.click(within(resultsList()).getAllByRole("link")[0], { ctrlKey: true });
  expect(location()).toBe("/");
  expect(field()).toHaveFocus();
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  expect(dialog()).toBeInTheDocument();
  expect(recents()).toEqual(["almirah"]);
  document.removeEventListener("click", blockNavigation);
});

test("a link to the page already open still closes the overlay (no route change to rely on)", async () => {
  const slug = expectedResults("almirah")[0].slug;
  renderHarness(`/products/${slug}`);
  await openSearch();
  await searchFor("almirah");
  fireEvent.click(within(resultsList()).getAllByRole("link")[0]);
  await waitForClosed();
  expect(location()).toBe(`/products/${slug}`);

  await openSearch();
  await searchFor("chair");
  act(() => navigateTo("/products?search=chair"));
  await waitForClosed();
  await openSearch();
  await searchFor("chair");
  fireEvent.click(screen.getByRole("link", { name: /^View all \d+ results$/ }));
  await waitForClosed();
  expect(location()).toBe("/products?search=chair");

  act(() => navigateTo("/products?category=office-chairs"));
  await openSearch();
  type("zzz");
  const departments = await screen.findByRole("list", { name: "Departments" });
  fireEvent.click(within(departments).getByRole("link", { name: "Office Chairs" }));
  await waitForClosed();
  expect(location()).toBe("/products?category=office-chairs");
});

test("View all opens the listing for the query, remembers it and closes", async () => {
  renderHarness();
  await openSearch();
  await searchFor("chair");
  fireEvent.click(screen.getByRole("link", { name: /^View all \d+ results$/ }));
  expect(location()).toBe("/products?search=chair");
  await waitForClosed();
  expect(recents()).toEqual(["chair"]);
});

test("Enter opens the listing for the query, as before; a blank query goes nowhere", async () => {
  renderHarness();
  await openSearch();
  type("   ");
  fireEvent.submit(field().form);
  expect(location()).toBe("/");
  type("sofa bed");
  fireEvent.submit(field().form);
  expect(location()).toBe("/products?search=sofa%20bed");
  await waitForClosed();
  expect(recents()).toEqual(["sofa bed"]);
});

test("a route change underneath closes the overlay", async () => {
  renderHarness();
  await openSearch();
  act(() => navigateTo("/about"));
  await waitForClosed();
});

test("reopening starts clean: empty field, All, suggestions", async () => {
  renderHarness();
  await openSearch();
  await searchFor("chair");
  fireEvent.click(screen.getByRole("button", { name: "Office Chairs" }));
  fireEvent.keyDown(field(), { key: "Escape" });
  await waitForClosed();
  await openSearch();
  expect(field()).toHaveValue("");
  expect(screen.getByRole("region", { name: "Popular" })).toBeInTheDocument();
  await searchFor("chair");
  expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
});

// ── Motion ───────────────────────────────────────────────────────────────────

test("results fade in when motion is allowed, and appear at once under reduced motion", async () => {
  renderHarness();
  await openSearch();
  await searchFor("almirah");
  expect(within(resultsList()).getAllByRole("listitem")[0].style.opacity).toBe("");
  fireEvent.keyDown(field(), { key: "Escape" });
  await waitForClosed();

  useReducedMotion.mockReturnValue(false);
  await openSearch();
  await searchFor("almirah");
  expect(within(resultsList()).getAllByRole("listitem")[0].style.opacity).toBe("0");
  fireEvent.keyDown(field(), { key: "Escape" });
  await waitForClosed();
});
