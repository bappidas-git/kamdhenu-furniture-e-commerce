import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import { useDealsConfig } from "../../context/DealsConfigContext";
import { BRAND_PROMISE } from "../../content/brandContent";
import { STOREFRONT_CONFIG } from "../../theme/tokens";
import Footer from "./Footer";

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    categories: { getAll: jest.fn() },
    settings: { get: jest.fn() },
    shipping: { getMethods: jest.fn() },
    leads: { createNewsletter: jest.fn() },
  },
}));

jest.mock("../../context/DealsConfigContext", () => ({
  useDealsConfig: jest.fn(),
}));

// jsdom has no IntersectionObserver (the band's Reveal uses one).
beforeAll(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterAll(() => {
  delete window.IntersectionObserver;
});

const category = (id, name, slug, extra = {}) => ({
  id,
  name,
  slug,
  parentId: null,
  isActive: true,
  showInMainMenu: true,
  sortOrder: id,
  ...extra,
});

const CATEGORIES = [
  category(1, "Plastic Furniture", "plastic-furniture", { menuOrder: 1 }),
  category(3, "Café & Restaurant Chairs", "cafe-restaurant-chairs", { menuOrder: 3 }),
  category(2, "Office Chairs", "office-chairs", { menuOrder: 2 }),
  category(10, "Essentials", "plastic-essentials", { parentId: 1, showInMainMenu: false, menuOrder: 0 }),
  category(7, "Retired Range", "retired-range", { isActive: false, menuOrder: 4 }),
];
const SETTINGS = { payment: { codEnabled: true, codMaxOrder: 50000 } };
const SHIPPING = [
  { id: 1, name: "Standard Delivery", freeAbove: 9999 },
  { id: 2, name: "Express Delivery", freeAbove: null },
];

const deferred = () => {
  const handle = {};
  handle.promise = new Promise((resolve, reject) => {
    handle.resolve = resolve;
    handle.reject = reject;
  });
  return handle;
};

const serve = ({ categories = CATEGORIES, settings = SETTINGS, shipping = SHIPPING } = {}) => {
  apiService.categories.getAll.mockResolvedValue(categories);
  apiService.settings.get.mockResolvedValue(settings);
  apiService.shipping.getMethods.mockResolvedValue(shipping);
};

// Render and let the three reads settle.
const renderFooter = async () => {
  const utils = render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
  await act(async () => {});
  return utils;
};

const footer = () => screen.getByRole("contentinfo", { name: "Footer" });
const link = (name) => within(footer()).getByRole("link", { name });
const promises = () =>
  within(screen.getByRole("list", { name: "Our promises" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);
const marks = () =>
  within(screen.getByRole("list", { name: "We accept" }))
    .getAllByRole("img")
    .map((img) => img.getAttribute("aria-label"));

beforeEach(() => {
  useDealsConfig.mockReturnValue({ enabled: true, loading: false });
  serve();
});

afterEach(() => {
  jest.clearAllMocks();
  delete window.matchMedia;
});

test("is the Footer landmark: white logo linking home, the brand promise, one newsletter form", async () => {
  await renderFooter();
  const logo = within(footer()).getByRole("img", { name: "A & S Urbanseat" });
  expect(logo.getAttribute("src")).toMatch(/urbanseat-logo-white\.png$/);
  expect(logo.closest("a")).toHaveAttribute("href", "/");
  expect(within(footer()).getByText(BRAND_PROMISE)).toBeInTheDocument();
  const forms = within(footer()).getAllByRole("form");
  expect(forms).toHaveLength(1);
  expect(forms[0]).toHaveAccessibleName("Newsletter");
  expect(within(footer()).getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
    "Newsletter",
    "Shop",
    "Help",
    "Contact",
  ]);
});

test("keeps every link target, with a single Offers link while deals are on", async () => {
  await renderFooter();
  const targets = {
    "All furniture": "/products",
    "New arrivals": "/products?sort=newest",
    "Best sellers": "/products?sort=popular",
    Offers: "/special-offers",
    "My account": "/profile",
    "Track order": "/orders",
    "Help centre": "/help",
    "Returns & refunds": "/refund",
    Contact: "/support",
    "Our story": "/about",
    Terms: "/terms",
    Privacy: "/privacy",
    Cookies: "/cookies",
  };
  Object.entries(targets).forEach(([name, href]) => expect(link(name)).toHaveAttribute("href", href));
  expect(within(footer()).getAllByRole("link", { name: "Offers" })).toHaveLength(1);
  expect(link("info@kamdhenufurniture.com")).toHaveAttribute("href", "mailto:info@kamdhenufurniture.com");
  expect(link("Call +91 84729 18653")).toHaveAttribute("href", "tel:+918472918653");
  const whatsapp = link("Message us on WhatsApp (opens in a new tab)");
  expect(whatsapp).toHaveAttribute("href", "https://wa.me/918472919541");
  expect(whatsapp).toHaveAttribute("target", "_blank");
  expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
  expect(within(footer()).getByText("Assam, India").closest("address")).toBeInTheDocument();
});

test("hides Offers while the deals page is off, and until the deals config has loaded", async () => {
  useDealsConfig.mockReturnValue({ enabled: false, loading: false });
  const { rerender } = await renderFooter();
  expect(within(footer()).queryByRole("link", { name: "Offers" })).not.toBeInTheDocument();

  useDealsConfig.mockReturnValue({ enabled: true, loading: true });
  rerender(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
  expect(within(footer()).queryByRole("link", { name: "Offers" })).not.toBeInTheDocument();
});

test("lists the menu departments from the live categories, in menu order, with canonical links", async () => {
  await renderFooter();
  const departments = within(screen.getByRole("list", { name: "Departments" })).getAllByRole("link");
  expect(departments.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
    ["Plastic Furniture", "/products?category=plastic-furniture"],
    ["Office Chairs", "/products?category=office-chairs"],
    ["Café & Restaurant Chairs", "/products?category=cafe-restaurant-chairs"],
  ]);
  expect(apiService.categories.getAll).toHaveBeenCalledTimes(1);
});

test("shows a social icon only for profiles that are set, WhatsApp included", async () => {
  await renderFooter();
  const social = within(screen.getByRole("list", { name: "Social media" })).getAllByRole("link");
  expect(social).toHaveLength(1);
  expect(social[0]).toHaveAccessibleName("WhatsApp (opens in a new tab)");
  expect(social[0]).toHaveAttribute("href", "https://wa.me/918472919541");
  expect(social[0]).toHaveAttribute("rel", "noopener noreferrer");
  expect(social[0]).toHaveAttribute("target", "_blank");
});

test("adds COD and free delivery only once the store data confirms them", async () => {
  const settings = deferred();
  const shipping = deferred();
  apiService.settings.get.mockReturnValue(settings.promise);
  apiService.shipping.getMethods.mockReturnValue(shipping.promise);
  await renderFooter();

  expect(promises()).toEqual(["Secure payment", "Easy returns, 7 days"]);
  expect(marks()).toEqual(["Visa", "Mastercard", "UPI"]);

  await act(async () => settings.resolve(SETTINGS));
  expect(promises()).toEqual(["Secure payment", "Cash on Delivery", "Easy returns, 7 days"]);
  expect(marks()).toEqual(["Visa", "Mastercard", "UPI", "Cash on delivery"]);

  await act(async () => shipping.resolve(SHIPPING));
  expect(promises()).toEqual([
    "Secure payment",
    "Cash on Delivery",
    "Easy returns, 7 days",
    "Free delivery, Above ₹9,999",
  ]);
  expect(apiService.settings.get).toHaveBeenCalledTimes(1);
  expect(apiService.shipping.getMethods).toHaveBeenCalledTimes(1);
});

test("never claims COD, free delivery or returns the data does not support", async () => {
  serve({
    settings: { payment: { codEnabled: false } },
    shipping: [{ id: 4, freeAbove: 0 }, { id: 2, freeAbove: null }],
  });
  const days = STOREFRONT_CONFIG.returnsWindowDays;
  STOREFRONT_CONFIG.returnsWindowDays = 0;
  try {
    await renderFooter();
    expect(promises()).toEqual(["Secure payment"]);
    expect(marks()).toEqual(["Visa", "Mastercard", "UPI"]);
    expect(footer()).not.toHaveTextContent(/24\/7|best price|guarantee/i);
  } finally {
    STOREFRONT_CONFIG.returnsWindowDays = days;
  }
});

test("still renders every link when the reads fail, without departments or data-backed claims", async () => {
  apiService.categories.getAll.mockRejectedValue(new Error("offline"));
  apiService.settings.get.mockRejectedValue(new Error("offline"));
  apiService.shipping.getMethods.mockRejectedValue(new Error("offline"));
  await renderFooter();
  expect(link("All furniture")).toHaveAttribute("href", "/products");
  expect(link("Our story")).toHaveAttribute("href", "/about");
  expect(screen.queryByRole("list", { name: "Departments" })).not.toBeInTheDocument();
  expect(promises()).toEqual(["Secure payment", "Easy returns, 7 days"]);
  expect(marks()).toEqual(["Visa", "Mastercard", "UPI"]);
});

test("the bottom bar carries the year, the brand and the currency note", async () => {
  await renderFooter();
  expect(within(footer()).getByText(`© ${new Date().getFullYear()} A & S Urbanseat`)).toBeInTheDocument();
  expect(within(footer()).getByText("Prices in INR")).toBeInTheDocument();
});

test("from 768px the column headings are plain h2s with their links shown", async () => {
  await renderFooter();
  expect(within(footer()).queryByRole("button", { name: "Shop" })).not.toBeInTheDocument();
  expect(link("All furniture")).toBeVisible();
  expect(link("My account")).toBeVisible();
});

test("on phones Shop, Help and Contact collapse behind disclosure buttons", async () => {
  window.matchMedia = (query) => ({
    matches: /max-width/.test(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
  await renderFooter();

  ["Shop", "Help", "Contact"].forEach((name) => {
    const button = within(footer()).getByRole("button", { name });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button.closest("h2")).toBeInTheDocument();
    expect(document.getElementById(button.getAttribute("aria-controls"))).not.toBeVisible();
  });
  expect(within(footer()).queryByRole("link", { name: "All furniture" })).not.toBeInTheDocument();

  const shop = within(footer()).getByRole("button", { name: "Shop" });
  fireEvent.click(shop);
  expect(shop).toHaveAttribute("aria-expanded", "true");
  expect(link("All furniture")).toBeVisible();
  expect(within(footer()).getByRole("button", { name: "Help" })).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(shop);
  expect(shop).toHaveAttribute("aria-expanded", "false");
  expect(within(footer()).queryByRole("link", { name: "All furniture" })).not.toBeInTheDocument();
});
