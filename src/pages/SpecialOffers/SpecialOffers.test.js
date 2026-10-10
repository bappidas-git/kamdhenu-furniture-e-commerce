import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, isInaccessible, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../context/WishlistContext";
import { DealsConfigProvider } from "../../context/DealsConfigContext";
import { buildCartItem, getProductMaxDiscount, getProductMinPrice, formatCurrency } from "../../utils/helpers";
import db from "../../../db.json";
import SpecialOffers from "./SpecialOffers";

// The page runs inside the real DealsConfigProvider (the admin's config is
// normalised there, as in the app); only the network, the cart and the
// wishlist are stubbed. Data is the seeded db.json, served the way api.js
// serves it in mock mode.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    deals: { getConfig: jest.fn() },
    products: { getAll: jest.fn() },
    categories: { getAll: jest.fn() },
    coupons: { getActive: jest.fn() },
  },
}));
jest.mock("../../hooks/useCart", () => ({ useCart: jest.fn() }));
jest.mock("../../context/WishlistContext", () => ({ useWishlist: jest.fn() }));

// jsdom has no IntersectionObserver (Reveal uses one): report every observed
// element in view at once.
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

const PRODUCTS = db.products;
const CATEGORIES = db.categories
  .filter((c) => c.isActive !== false)
  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
// json-server answers coupons.getActive with ?isActive=true.
const ACTIVE_COUPONS = db.coupons.filter((c) => c.isActive === true);
const CONFIG = db.dealsConfig;
// The countdown ticks every second; it is switched off except where a test is
// about it (fake timers there), so no tick lands outside act().
const BASE_CONFIG = { ...CONFIG, timer: { ...CONFIG.timer, enabled: false } };
const product = (id) => PRODUCTS.find((p) => p.id === id);
const category = (id) => CATEGORIES.find((c) => c.id === id);

let addToCart;
let toggleWishlist;
let wishlisted;
let writeText;
let scrollIntoView;

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver;
  window.scrollTo = jest.fn();
});
afterAll(() => {
  delete window.IntersectionObserver;
});

beforeEach(() => {
  apiService.deals.getConfig.mockResolvedValue(BASE_CONFIG);
  apiService.products.getAll.mockResolvedValue(PRODUCTS);
  apiService.categories.getAll.mockResolvedValue(CATEGORIES);
  apiService.coupons.getActive.mockResolvedValue(ACTIVE_COUPONS);
  addToCart = jest.fn();
  toggleWishlist = jest.fn();
  wishlisted = new Set();
  useCart.mockReturnValue({ addToCart });
  useWishlist.mockReturnValue({ toggleWishlist, isInWishlist: (id) => wishlisted.has(id) });
  writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  scrollIntoView = jest.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  delete Element.prototype.scrollIntoView;
});

const withConfig = (overrides) => apiService.deals.getConfig.mockResolvedValue({ ...BASE_CONFIG, ...overrides });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/special-offers"]}>
      <DealsConfigProvider>
        <SpecialOffers />
      </DealsConfigProvider>
    </MemoryRouter>
  );

// Section names come from their SectionHeading. jsdom puts a space between
// the italic accent word and the full stop that browsers do not; match both.
const titled = (title) =>
  new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\.$/, "\\s?\\.")}$`);
const region = (title) => screen.getByRole("region", { name: titled(title) });
const findRegion = (title) => screen.findByRole("region", { name: titled(title) });
// The cards in a section, in order, each named by its product.
const expectCards = (container, names) => {
  const articles = within(container).queryAllByRole("article");
  expect(articles).toHaveLength(names.length);
  articles.forEach((article, i) => expect(article).toHaveAccessibleName(names[i]));
};
// The codes on the tickets, in order, read from their copy buttons' names.
const ticketCodes = () =>
  within(region("Codes to use at checkout."))
    .getAllByRole("button", { name: /^Copy code / })
    .map((button) => button.getAttribute("aria-label").replace("Copy code ", ""));
// The skeletons are hidden from assistive technology: count their list items.
const skeletonCounts = () =>
  screen
    .getAllByRole("list", { hidden: true })
    .map((list) => within(list).getAllByRole("listitem", { hidden: true }).length);
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// ── Config and hero ──────────────────────────────────────────────────────────

test("while the config loads, the page is a skeleton: no hero, four ticket skeletons", async () => {
  const pending = deferred();
  apiService.deals.getConfig.mockReturnValue(pending.promise);
  renderPage();

  expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  expect(screen.getByText("Loading offers").closest("[aria-busy='true']")).not.toBeNull();
  expect(skeletonCounts()).toEqual([4]);
  // As before, the data read starts alongside the config read (the context's
  // default config is enabled), so an enabled page loads in one round trip.
  expect(apiService.products.getAll).toHaveBeenCalledTimes(1);

  await act(async () => pending.resolve(BASE_CONFIG));
  expect(await screen.findByRole("heading", { level: 1, name: CONFIG.hero.title })).toBeInTheDocument();
});

test("the hero renders the admin's tag, title and subtitle as given, with one h1", async () => {
  renderPage();
  expect(await screen.findByRole("heading", { level: 1, name: "Offers on pieces we love" })).toBeInTheDocument();
  expect(screen.getByText(CONFIG.hero.tag)).toBeInTheDocument();
  expect(screen.getByText(CONFIG.hero.subtitle)).toBeInTheDocument();
  await findRegion("Codes to use at checkout.");
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
});

test("an empty title falls back to the default; an empty tag and subtitle are left out", async () => {
  withConfig({ hero: { tag: "", title: "", subtitle: "" } });
  renderPage();
  expect(await screen.findByRole("heading", { level: 1, name: "Special offers" })).toBeInTheDocument();
  // Rendered on its own here, the hero's <header> is a banner: only the title.
  expect(screen.getByRole("banner")).toHaveTextContent(/^Special offers$/);
});

test("switched off in the admin: the unavailable state, and nothing more is read", async () => {
  withConfig({ enabled: false });
  renderPage();
  expect(await screen.findByRole("heading", { level: 1, name: "No offers at the moment." })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Browse furniture" })).toHaveAttribute("href", "/products");
  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
  // Only the read that started alongside the config (dropped once it said
  // "off"); none after it.
  expect(apiService.products.getAll).toHaveBeenCalledTimes(1);
  expect(apiService.coupons.getActive).toHaveBeenCalledTimes(1);
});

// ── Coupons ──────────────────────────────────────────────────────────────────

test("featured coupons follow the admin's order and show their terms", async () => {
  renderPage();
  await findRegion("Codes to use at checkout.");
  await waitFor(() => expect(ticketCodes()).toEqual(["WELCOME500", "FLAT10"]));

  const [welcome, flat] = within(region("Codes to use at checkout.")).getAllByRole("listitem");
  expect(welcome).toHaveTextContent("₹500 off");
  expect(welcome).toHaveTextContent("₹500 off your first order above ₹5,000");
  expect(welcome).toHaveTextContent("Minimum order ₹5,000");
  expect(welcome).not.toHaveTextContent("Up to");
  expect(within(welcome).getByText(/Expires/)).toHaveTextContent(/^Expires \d{1,2} [A-Z][a-z]{2} 2027$/);
  expect(within(welcome).getByText(/^\d{1,2} [A-Z][a-z]{2} 2027$/)).toHaveAttribute(
    "dateTime",
    "2027-03-31T23:59:59.000Z"
  );

  expect(flat).toHaveTextContent("10% off");
  expect(flat).toHaveTextContent(/Minimum order ₹2,000\s?·\s?, Up to ₹2,000 off/);
  expect(within(flat).getByRole("button", { name: "Copy code FLAT10" })).toHaveTextContent("Copy code");
});

test("with no selection every valid coupon shows; invalid picks are dropped in order", async () => {
  withConfig({ featuredCouponIds: [] });
  const { unmount } = renderPage();
  await findRegion("Codes to use at checkout.");
  await waitFor(() => expect(ticketCodes()).toEqual(["WELCOME500", "FLAT10", "NEWHOME20", "WORKSPACE15"]));
  unmount();

  // FESTIVE25 (3) is inactive, expired and used up: never advertised.
  withConfig({ featuredCouponIds: [5, 3, 1] });
  apiService.coupons.getActive.mockResolvedValue(db.coupons);
  renderPage();
  await findRegion("Codes to use at checkout.");
  await waitFor(() => expect(ticketCodes()).toEqual(["WORKSPACE15", "WELCOME500"]));
});

test("a coupon without a minimum, an expiry or a description says so honestly", async () => {
  withConfig({ featuredCouponIds: [] });
  apiService.coupons.getActive.mockResolvedValue([
    { id: 9, code: "PLAIN5", type: "percentage", value: 5, minOrderAmount: 0, maxDiscount: null, isActive: true, expiresAt: null },
  ]);
  renderPage();
  const codes = await findRegion("Codes to use at checkout.");
  const item = await within(codes).findByRole("listitem");
  expect(item).toHaveTextContent("5% off");
  expect(item).toHaveTextContent("No minimum order");
  expect(item).toHaveTextContent("No expiry");
  expect(item).not.toHaveTextContent("Up to");
});

test("no codes: the honest empty line", async () => {
  apiService.coupons.getActive.mockResolvedValue([]);
  renderPage();
  const codes = await findRegion("Codes to use at checkout.");
  expect(await within(codes).findByText("No codes right now.")).toBeInTheDocument();
  expect(within(codes).queryByRole("list")).not.toBeInTheDocument();
});

test("copying a code: the clipboard, 'Copied' for two seconds and a status line", async () => {
  renderPage();
  const button = await screen.findByRole("button", { name: "Copy code WELCOME500" });
  const status = within(region("Codes to use at checkout.")).getByRole("status");
  expect(status).toHaveTextContent("");

  jest.useFakeTimers();
  await act(async () => {
    fireEvent.click(button);
  });
  expect(writeText).toHaveBeenCalledWith("WELCOME500");
  expect(button).toHaveTextContent("Copied");
  expect(button).toHaveAccessibleName("Copy code WELCOME500");
  expect(status).toHaveTextContent("Code WELCOME500 copied.");
  // The other ticket is untouched.
  expect(screen.getByRole("button", { name: "Copy code FLAT10" })).toHaveTextContent("Copy code");

  act(() => jest.advanceTimersByTime(1999));
  expect(button).toHaveTextContent("Copied");
  act(() => jest.advanceTimersByTime(1));
  expect(button).toHaveTextContent("Copy code");
  expect(status).toHaveTextContent("");
});

test("a second copy restarts the two seconds rather than ending early", async () => {
  renderPage();
  const welcome = await screen.findByRole("button", { name: "Copy code WELCOME500" });
  const flat = screen.getByRole("button", { name: "Copy code FLAT10" });
  jest.useFakeTimers();
  await act(async () => {
    fireEvent.click(welcome);
  });
  act(() => jest.advanceTimersByTime(1500));
  await act(async () => {
    fireEvent.click(flat);
  });
  expect(welcome).toHaveTextContent("Copy code");
  expect(flat).toHaveTextContent("Copied");
  act(() => jest.advanceTimersByTime(1000));
  expect(flat).toHaveTextContent("Copied");
  act(() => jest.advanceTimersByTime(1000));
  expect(flat).toHaveTextContent("Copy code");
});

test("when the clipboard is unavailable the code is selected and the failure is said", async () => {
  writeText.mockRejectedValue(new Error("Not allowed"));
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  renderPage();
  const button = await screen.findByRole("button", { name: "Copy code FLAT10" });
  await act(async () => {
    fireEvent.click(button);
  });
  expect(button).toHaveTextContent("Couldn’t copy");
  expect(within(region("Codes to use at checkout.")).getByRole("status")).toHaveTextContent(
    "Couldn’t copy. The code is FLAT10."
  );
  expect(window.getSelection().toString()).toBe("FLAT10");
  consoleError.mockRestore();
});

// ── Deal of the day ──────────────────────────────────────────────────────────

test("the deal of the day: the admin's picks in order, each with what it saves", async () => {
  renderPage();
  const today = await findRegion("Deal of the day.");
  expectCards(today, CONFIG.dealOfTheDayIds.map((id) => product(id).name));

  const savings = within(today)
    .getAllByText(/^You save/)
    .map((p) => p.textContent);
  const expected = CONFIG.dealOfTheDayIds.map((id) => {
    const { originalPrice, sellingPrice } = getProductMinPrice(product(id));
    return `You save ${formatCurrency(originalPrice - sellingPrice)}`;
  });
  expect(savings).toEqual(expected);
  expect(savings[0]).toBe("You save ₹5,000.00");
});

test("with no picks the deal of the day is the top three by discount", async () => {
  withConfig({ dealOfTheDayIds: [] });
  renderPage();
  const today = await findRegion("Deal of the day.");
  const top3 = PRODUCTS.filter((p) => getProductMaxDiscount(p) > 0)
    .sort((a, b) => getProductMaxDiscount(b) - getProductMaxDiscount(a))
    .slice(0, 3)
    .map((p) => p.name);
  expectCards(today, top3);
});

test("a picked piece without a discount shows no saving line", async () => {
  const plain = PRODUCTS.find((p) => !(Number(p.comparePrice) > Number(p.price)));
  withConfig({ dealOfTheDayIds: [plain.id] });
  renderPage();
  const today = await findRegion("Deal of the day.");
  expectCards(today, [plain.name]);
  expect(within(today).queryByText(/^You save/)).not.toBeInTheDocument();
});

test("cards add to the cart exactly as before and toggle the wishlist", async () => {
  wishlisted.add(21);
  renderPage();
  const today = await findRegion("Deal of the day.");
  fireEvent.click(within(today).getByRole("button", { name: "Add Wooden Sofa Set to cart" }));
  expect(addToCart).toHaveBeenCalledWith(buildCartItem(product(47)), 1);

  const all = region("8 pieces on offer.");
  fireEvent.click(within(all).getByRole("button", { name: "Add Lobby Set to cart" }));
  expect(addToCart).toHaveBeenLastCalledWith(buildCartItem(product(19)), 1);

  const sofaCard = within(today).getByRole("article", { name: "Wooden Sofa Set" });
  fireEvent.click(within(sofaCard).getByRole("button", { name: "Save Wooden Sofa Set to wishlist" }));
  expect(toggleWishlist).toHaveBeenCalledWith(product(47));
  const chairCard = within(today).getByRole("article", { name: "Mesh High-Back Office Chair" });
  expect(within(chairCard).getByRole("button", { name: "Remove Mesh High-Back Office Chair from wishlist" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("no hollow ratings: a piece without reviews shows no stars and no (0)", async () => {
  renderPage();
  const all = await findRegion("8 pieces on offer.");
  const unrated = within(all).getByRole("article", { name: "Executive Mesh High-Back Chair" });
  expect(product(29).totalReviews).toBe(0);
  expect(within(unrated).queryByRole("img", { name: /Rated/ })).not.toBeInTheDocument();
  expect(unrated).not.toHaveTextContent("(0)");
  const rated = within(all).getByRole("article", { name: "Lobby Set" });
  expect(within(rated).getByRole("img", { name: "Rated 4.0 out of 5, 1 review" })).toBeInTheDocument();
});

// ── All offers ───────────────────────────────────────────────────────────────

test("the grid: the admin's picks in order, counted in the heading", async () => {
  renderPage();
  const all = await findRegion("8 pieces on offer.");
  expect(within(all).getByText("All offers")).toBeInTheDocument();
  expectCards(all, CONFIG.featuredProductIds.map((id) => product(id).name));
});

test("with no picks the grid is every discounted piece, the largest discount first", async () => {
  withConfig({ featuredProductIds: [] });
  renderPage();
  const discounted = PRODUCTS.filter((p) => getProductMaxDiscount(p) > 0).sort(
    (a, b) => getProductMaxDiscount(b) - getProductMaxDiscount(a)
  );
  const all = await findRegion(`${discounted.length} pieces on offer.`);
  expectCards(all, discounted.map((p) => p.name));
});

test("the chips: All plus the grid's categories in catalogue order, as pressed toggles", async () => {
  renderPage();
  const all = await findRegion("8 pieces on offer.");
  const group = within(all).getByRole("group", { name: "Filter offers by category" });
  const ids = new Set(CONFIG.featuredProductIds.map((id) => product(id).categoryId));
  const expected = ["All", ...CATEGORIES.filter((c) => ids.has(c.id)).map((c) => c.name)];
  const chips = within(group).getAllByRole("button");
  expect(chips.map((chip) => chip.textContent)).toEqual(expected);
  expect(chips[0]).toHaveAttribute("aria-pressed", "true");
  expect(chips.slice(1).every((chip) => chip.getAttribute("aria-pressed") === "false")).toBe(true);
  // Loading the page never scrolls anything into view.
  expect(scrollIntoView).not.toHaveBeenCalled();
});

test("pressing a chip filters the grid, says so, and scrolls the chip into view", async () => {
  renderPage();
  const all = await findRegion("8 pieces on offer.");
  const status = within(all).getByRole("status");
  expect(status).toHaveTextContent("Showing all 8 pieces.");

  const beds = within(all).getByRole("button", { name: "Beds" });
  fireEvent.click(beds);
  expect(beds).toHaveAttribute("aria-pressed", "true");
  expect(within(all).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
  expect(status).toHaveTextContent("Showing 1 piece in Beds.");
  await waitFor(() => expectCards(all, ["King Size Bed"]));
  expect(scrollIntoView).toHaveBeenCalledTimes(1);
  expect(scrollIntoView.mock.instances[0]).toBe(beds);
  expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "center", behavior: "smooth" });

  fireEvent.click(within(all).getByRole("button", { name: "All" }));
  expect(status).toHaveTextContent("Showing all 8 pieces.");
  await waitFor(() => expect(within(all).getAllByRole("article")).toHaveLength(8));
});

test("repeated category names are told apart by their parent", async () => {
  withConfig({ featuredProductIds: [] });
  renderPage();
  const group = await screen.findByRole("group", { name: "Filter offers by category" });
  // Office Chairs › Essentials / Premium › High-Back Chairs (21 and 25).
  expect(within(group).getByRole("button", { name: /^High-Back Chairs\s?, Essentials$/ })).toBeInTheDocument();
  expect(within(group).getByRole("button", { name: /^High-Back Chairs\s?, Premium$/ })).toBeInTheDocument();
  expect(category(21).name).toBe(category(25).name);
  // A name nobody else has stays alone.
  expect(within(group).getByRole("button", { name: "Beds" })).toBeInTheDocument();
});

test("when the pressed category leaves the offers, the grid falls back to All", async () => {
  renderPage();
  const all = await findRegion("8 pieces on offer.");
  fireEvent.click(within(all).getByRole("button", { name: "Beds" }));
  await waitFor(() => expectCards(all, ["King Size Bed"]));

  // The admin takes the bed (55) out of the grid; the provider re-reads the
  // config when the window regains focus.
  withConfig({ featuredProductIds: CONFIG.featuredProductIds.filter((id) => id !== 55) });
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  const next = await findRegion("7 pieces on offer.");
  expect(within(next).queryByRole("button", { name: "Beds" })).not.toBeInTheDocument();
  expect(within(next).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  await waitFor(() => expect(within(next).getAllByRole("article")).toHaveLength(7));
});

// ── States ───────────────────────────────────────────────────────────────────

test("while the data loads, skeletons hold the admin's counts under the real hero", async () => {
  const pending = deferred();
  apiService.products.getAll.mockReturnValue(pending.promise);
  renderPage();
  expect(await screen.findByRole("heading", { level: 1, name: CONFIG.hero.title })).toBeInTheDocument();
  expect(screen.getByText("Loading offers").closest("[aria-busy='true']")).not.toBeNull();
  expect(skeletonCounts()).toEqual([
    CONFIG.featuredCouponIds.length,
    CONFIG.dealOfTheDayIds.length,
    CONFIG.featuredProductIds.length,
  ]);
  await act(async () => pending.resolve(PRODUCTS));
  expect(await findRegion("Deal of the day.")).toBeInTheDocument();
  expect(screen.queryByText("Loading offers")).not.toBeInTheDocument();
});

// The retry tests settle each read inside act(), which returns only once React
// has rendered and run its effects. Awaiting findBy* instead let the click land
// while the error panel's effects were still queued: under load the queued
// focus effect then spent the retry's focus flag on the old button.
test("a failed read: the panel, then Try again reads again and moves focus to the codes", async () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const failed = deferred();
  const retried = deferred();
  apiService.products.getAll.mockReturnValueOnce(failed.promise).mockReturnValueOnce(retried.promise);
  renderPage();
  await act(async () => failed.reject(new Error("offline")));
  expect(screen.getByRole("heading", { name: "We couldn’t load the offers." })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: titled("Codes to use at checkout.") })).not.toBeInTheDocument();
  expect(screen.queryByText("Nothing on offer right now.")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await act(async () => retried.resolve(PRODUCTS));
  expect(region("Codes to use at checkout.")).toHaveFocus();
  expect(apiService.products.getAll).toHaveBeenCalledTimes(2);
  expect(region("8 pieces on offer.")).toBeInTheDocument();
  consoleError.mockRestore();
});

test("a second failure keeps focus on Try again", async () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const failed = deferred();
  const failedAgain = deferred();
  apiService.categories.getAll.mockReturnValueOnce(failed.promise).mockReturnValueOnce(failedAgain.promise);
  renderPage();
  await act(async () => failed.reject(new Error("offline")));
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await act(async () => failedAgain.reject(new Error("offline")));
  expect(screen.getByRole("button", { name: "Try again" })).toHaveFocus();
  expect(apiService.categories.getAll).toHaveBeenCalledTimes(2);
  consoleError.mockRestore();
});

test("nothing on offer: the serif line and a way to browse, mentioning codes only if there are any", async () => {
  apiService.products.getAll.mockResolvedValue([]);
  const { unmount } = renderPage();
  expect(await screen.findByRole("heading", { name: "Nothing on offer right now." })).toBeInTheDocument();
  expect(screen.getByText(/the codes above still apply at checkout/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Browse furniture" })).toHaveAttribute("href", "/products");
  expect(screen.queryByRole("region", { name: titled("Deal of the day.") })).not.toBeInTheDocument();
  unmount();

  apiService.coupons.getActive.mockResolvedValue([]);
  renderPage();
  expect(await screen.findByText("No pieces are reduced just now.")).toBeInTheDocument();
  expect(screen.getByText("No codes right now.")).toBeInTheDocument();
});

// ── Countdown ────────────────────────────────────────────────────────────────

describe("the countdown", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 8, 20, 6, 30)); // local 20:06:30
  });

  const figures = (timer) => within(timer).getAllByText(/^\d+$/).map((span) => span.textContent);

  test("no end date: a timer to the end of today, its figures hidden from assistive technology", async () => {
    withConfig({ timer: CONFIG.timer });
    renderPage();
    const timer = await screen.findByRole("timer");
    expect(timer).toHaveAccessibleName("Offers end in 3 hours and 53 minutes");
    expect(figures(timer)).toEqual(["03", "53", "29"]);
    expect(timer).toHaveTextContent("Offers end in");
    // The visible label, the figures and the units are hidden; the name speaks.
    ["Offers end in", "03", "53", "29", "Hours", "Seconds"].forEach((text) =>
      expect(isInaccessible(within(timer).getByText(text))).toBe(true)
    );
  });

  test("the name changes at most once a minute while the seconds tick", async () => {
    withConfig({ timer: CONFIG.timer });
    renderPage();
    const timer = await screen.findByRole("timer");
    const names = [timer.getAttribute("aria-label")];
    const seconds = [figures(timer)[2]];
    for (let i = 0; i < 125; i += 1) {
      act(() => jest.advanceTimersByTime(1000));
      names.push(timer.getAttribute("aria-label"));
      seconds.push(figures(timer)[2]);
    }
    const changes = (list) => list.filter((value, i) => i > 0 && value !== list[i - 1]).length;
    expect(changes(seconds)).toBe(125);
    expect(changes(names)).toBe(2);
    expect(names[names.length - 1]).toBe("Offers end in 3 hours and 51 minutes");
  });

  test("a future end date counts down to it", async () => {
    const endAt = new Date(Date.now() + ((77 * 60 + 7) * 60 + 30) * 1000).toISOString();
    withConfig({ timer: { enabled: true, endAt, onExpiry: "hide" } });
    renderPage();
    const timer = await screen.findByRole("timer");
    expect(timer).toHaveAccessibleName("Offers end in 77 hours and 7 minutes");
    expect(figures(timer).slice(0, 2)).toEqual(["77", "07"]);
  });

  test("a past end date with 'hide': the ended note instead of a timer", async () => {
    withConfig({ timer: { enabled: true, endAt: "2026-01-01T00:00:00.000Z", onExpiry: "hide" } });
    renderPage();
    expect(
      await screen.findByText("This round of offers has ended. Prices shown are current.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  test("a past end date with 'endOfDay' rolls over to the end of today", async () => {
    withConfig({ timer: { enabled: true, endAt: "2026-01-01T00:00:00.000Z", onExpiry: "endOfDay" } });
    renderPage();
    expect(await screen.findByRole("timer")).toHaveAccessibleName("Offers end in 3 hours and 53 minutes");
  });

  test("a timer switched off in the admin: no countdown and no note", async () => {
    withConfig({ timer: { enabled: false, endAt: "", onExpiry: "endOfDay" } });
    renderPage();
    await screen.findByRole("heading", { level: 1 });
    await findRegion("Codes to use at checkout.");
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.queryByText(/has ended/)).not.toBeInTheDocument();
  });

  test("a fixed end passing while the page is open turns into the ended note", async () => {
    withConfig({ timer: { enabled: true, endAt: new Date(Date.now() + 5000).toISOString(), onExpiry: "hide" } });
    renderPage();
    const timer = await screen.findByRole("timer");
    expect(timer).toHaveAccessibleName("Offers end in less than a minute");
    act(() => jest.advanceTimersByTime(6000));
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.getByText("This round of offers has ended. Prices shown are current.")).toBeInTheDocument();
  });
});
