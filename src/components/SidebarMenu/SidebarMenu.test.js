import React, { useState } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { useWishlist } from "../../context/WishlistContext";
import { useDealsConfig } from "../../context/DealsConfigContext";
import { groupCategoryTree } from "../Header/groupCategoryTree";
import db from "../../../db.json";
import SidebarMenu from "./SidebarMenu";

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: { categories: { getAll: jest.fn() } },
}));
jest.mock("../../context/ThemeContext", () => ({ useTheme: jest.fn() }));
jest.mock("../../hooks/useAuth", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/WishlistContext", () => ({ useWishlist: jest.fn() }));
jest.mock("../../context/DealsConfigContext", () => ({ useDealsConfig: jest.fn() }));

const category = (id, name, slug, parentId = null, extra = {}) => ({
  id,
  name,
  slug,
  parentId,
  isActive: true,
  sortOrder: 1,
  showInMainMenu: false,
  menuOrder: 0,
  ...extra,
});

// A slice of the seeded tree: a department with groups (one without leaves),
// a flat department, and a second department with groups.
const CATEGORIES = [
  category(1, "Plastic Furniture", "plastic-furniture", null, { showInMainMenu: true, menuOrder: 1 }),
  category(3, "Café & Restaurant Chairs", "cafe-restaurant-chairs", null, {
    showInMainMenu: true,
    menuOrder: 2,
  }),
  category(5, "Home Furniture", "home-furniture", null, { showInMainMenu: true, menuOrder: 3 }),
  category(10, "Essentials", "plastic-essentials", 1, { sortOrder: 1 }),
  category(11, "Chairs with Arms", "plastic-essentials-armchairs", 10, { sortOrder: 1 }),
  category(14, "Shoe Racks", "plastic-shoe-racks", 10, { sortOrder: 2 }),
  category(48, "Dining Sets", "plastic-dining-sets", 1, { sortOrder: 2 }),
  category(30, "Living Room", "living-room", 5, { sortOrder: 1 }),
  category(31, "Sofas", "sofas", 30, { sortOrder: 1 }),
];

const USER = { id: 3, firstName: "Asha", lastName: "Rao", email: "asha@example.com" };

let auth;
let theme;
let deals;
let wishlistCount;

beforeEach(() => {
  auth = { user: null, logout: jest.fn() };
  theme = { isDarkMode: false, toggleTheme: jest.fn() };
  deals = { enabled: true, loading: false };
  wishlistCount = 0;
  useAuth.mockImplementation(() => auth);
  useTheme.mockImplementation(() => theme);
  useDealsConfig.mockImplementation(() => deals);
  useWishlist.mockImplementation(() => ({ getWishlistCount: () => wishlistCount }));
  apiService.categories.getAll.mockReset();
  apiService.categories.getAll.mockResolvedValue(CATEGORIES);
});

afterEach(() => {
  document.body.style.overflow = "";
});

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
};

function Harness({ initialEntries = ["/"], onOpenAuth }) {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <button type="button" onClick={() => setOpen(true)}>
        Open menu
      </button>
      <SidebarMenu open={open} onClose={() => setOpen(false)} onOpenAuth={onOpenAuth} />
      <LocationProbe />
    </MemoryRouter>
  );
}

const renderMenu = (props) => render(<Harness {...props} />);

// Open from the hamburger stand-in and wait for the departments.
const openMenu = async () => {
  const opener = screen.getByRole("button", { name: "Open menu" });
  opener.focus();
  fireEvent.click(opener);
  const dialog = screen.getByRole("dialog", { name: "Menu" });
  await within(dialog).findByRole("button", { name: "Plastic Furniture" });
  return { dialog, opener };
};

const dialogGone = () => waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
const location = () => screen.getByTestId("location").textContent;

test("opens as a modal dialog, focus on the close button, the page locked; Escape closes it back on the opener", async () => {
  renderMenu();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  const { dialog, opener } = await openMenu();
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(within(dialog).getByRole("button", { name: "Close menu" })).toHaveFocus();
  expect(within(dialog).getByRole("img", { name: "A & S Urbanseat" })).toBeInTheDocument();
  expect(document.body.style.overflow).toBe("hidden");

  fireEvent.keyDown(document.activeElement, { key: "Escape" });
  await dialogGone();
  expect(opener).toHaveFocus();
  expect(document.body.style.overflow).toBe("");
});

test("Tab stays inside the menu", async () => {
  renderMenu();
  const { dialog } = await openMenu();
  const close = within(dialog).getByRole("button", { name: "Close menu" });
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  const cookies = within(dialog).getByRole("link", { name: "Cookies" });
  expect(cookies).toHaveFocus();
  fireEvent.keyDown(cookies, { key: "Tab" });
  expect(close).toHaveFocus();
});

test("the department accordion opens one department at a time, with groups, leaves and Shop all", async () => {
  renderMenu();
  const { dialog } = await openMenu();
  const plastic = within(dialog).getByRole("button", { name: "Plastic Furniture" });
  const home = within(dialog).getByRole("button", { name: "Home Furniture" });
  expect(plastic).toHaveAttribute("aria-expanded", "false");
  const panel = document.getElementById(plastic.getAttribute("aria-controls"));
  expect(panel).not.toBeVisible();

  fireEvent.click(plastic);
  expect(plastic).toHaveAttribute("aria-expanded", "true");
  expect(panel).toBeVisible();
  const group = within(panel);
  expect(group.getByRole("link", { name: "Shop all Plastic Furniture" })).toHaveAttribute(
    "href",
    "/products?category=plastic-furniture"
  );
  expect(group.getByRole("link", { name: "Essentials" })).toHaveAttribute(
    "href",
    "/products?category=plastic-essentials"
  );
  const leaves = group.getByRole("list", { name: "Essentials" });
  expect(within(leaves).getByRole("link", { name: "Chairs with Arms" })).toHaveAttribute(
    "href",
    "/products?category=plastic-essentials-armchairs"
  );
  expect(within(leaves).getByRole("link", { name: "Shoe Racks" })).toBeInTheDocument();
  // A group without leaves is a single link.
  expect(group.getByRole("link", { name: "Dining Sets" })).toHaveAttribute(
    "href",
    "/products?category=plastic-dining-sets"
  );

  fireEvent.click(home);
  expect(home).toHaveAttribute("aria-expanded", "true");
  expect(plastic).toHaveAttribute("aria-expanded", "false");
  expect(panel).not.toBeVisible();

  fireEvent.click(home);
  expect(home).toHaveAttribute("aria-expanded", "false");
});

test("a flat department links straight to its listing", async () => {
  renderMenu();
  const { dialog } = await openMenu();
  const cafe = within(dialog).getByRole("link", { name: "Café & Restaurant Chairs" });
  expect(cafe).toHaveAttribute("href", "/products?category=cafe-restaurant-chairs");
  expect(cafe).not.toHaveAttribute("aria-expanded");
  expect(within(dialog).getByRole("link", { name: "View all products" })).toHaveAttribute(
    "href",
    "/products"
  );
});

test("mirrors the mega-menu grouping for the seeded category tree", async () => {
  apiService.categories.getAll.mockResolvedValue(db.categories);
  renderMenu();
  const { dialog } = await openMenu();
  const departments = groupCategoryTree(db.categories);
  expect(departments.length).toBeGreaterThan(0);

  departments.forEach(({ category: department, groups }) => {
    const href = `/products?category=${department.slug}`;
    if (groups.length === 0) {
      expect(within(dialog).getByRole("link", { name: department.name })).toHaveAttribute("href", href);
      return;
    }
    const button = within(dialog).getByRole("button", { name: department.name });
    fireEvent.click(button);
    const panel = within(document.getElementById(button.getAttribute("aria-controls")));
    const hrefs = panel.getAllByRole("link").map((link) => link.getAttribute("href"));
    const expected = [
      href,
      ...groups.flatMap(({ category: group, links }) => [
        `/products?category=${group.slug}`,
        ...links.map(({ category: leaf }) => `/products?category=${leaf.slug}`),
      ]),
    ];
    expect(hrefs).toEqual(expected);
  });

  // The seeded tree's shape (prompts/BUILD_LOG.md, Prompts 03-04).
  fireEvent.click(within(dialog).getByRole("button", { name: "Plastic Furniture" }));
  const plastic = within(dialog).getByRole("group", { name: "Plastic Furniture" });
  ["Essentials", "Premium", "Dining Sets", "Sofas"].forEach((name) =>
    expect(within(plastic).getByRole("link", { name })).toBeInTheDocument()
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Home Furniture" }));
  const home = within(dialog).getByRole("group", { name: "Home Furniture" });
  expect(within(within(home).getByRole("list", { name: "Bedroom" })).getAllByRole("link")).toHaveLength(6);
});

test("reads the categories on every open and renders the last list at once", async () => {
  renderMenu();
  const { dialog } = await openMenu();
  fireEvent.click(within(dialog).getByRole("button", { name: "Close menu" }));
  await dialogGone();

  let resolve;
  apiService.categories.getAll.mockReturnValue(new Promise((r) => (resolve = r)));
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  expect(screen.getByRole("button", { name: "Plastic Furniture" })).toBeInTheDocument();
  expect(apiService.categories.getAll).toHaveBeenCalledTimes(2);
  await act(async () => resolve(CATEGORIES.filter((c) => c.id !== 3)));
  expect(screen.queryByRole("link", { name: "Café & Restaurant Chairs" })).not.toBeInTheDocument();
});

test("a failed first read offers a retry", async () => {
  apiService.categories.getAll.mockRejectedValueOnce(new Error("offline"));
  renderMenu();
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  expect(await screen.findByText("We couldn't load the departments just now.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View all products" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("button", { name: "Plastic Furniture" })).toBeInTheDocument();
});

test("opens on the current listing's department, marking the current links", async () => {
  renderMenu({ initialEntries: ["/products?category=plastic-essentials-armchairs"] });
  const { dialog } = await openMenu();
  const plastic = within(dialog).getByRole("button", { name: "Plastic Furniture" });
  await waitFor(() => expect(plastic).toHaveAttribute("aria-expanded", "true"));
  expect(plastic).toHaveAttribute("aria-current", "true");
  expect(within(dialog).getByRole("link", { name: "Chairs with Arms" })).toHaveAttribute(
    "aria-current",
    "page"
  );
});

test("a link navigates and closes the menu", async () => {
  renderMenu();
  const { dialog } = await openMenu();
  fireEvent.click(within(dialog).getByRole("button", { name: "Plastic Furniture" }));
  fireEvent.click(within(dialog).getByRole("link", { name: "Shoe Racks" }));
  expect(location()).toBe("/products?category=plastic-shoe-racks");
  await dialogGone();
});

test("Discover has only valid links; Offers follows the deals page", async () => {
  const { unmount } = renderMenu();
  let { dialog } = await openMenu();
  expect(within(dialog).getByRole("link", { name: "New arrivals" })).toHaveAttribute(
    "href",
    "/products?sort=newest"
  );
  expect(within(dialog).getByRole("link", { name: "Best sellers" })).toHaveAttribute(
    "href",
    "/products?sort=popular"
  );
  expect(within(dialog).getByRole("link", { name: "Offers" })).toHaveAttribute("href", "/special-offers");
  expect(within(dialog).getByRole("link", { name: "Our story" })).toHaveAttribute("href", "/about");
  within(dialog)
    .getAllByRole("link")
    .forEach((link) => expect(link.getAttribute("href")).not.toMatch(/filter=/));
  unmount();

  deals = { enabled: false, loading: false };
  renderMenu();
  ({ dialog } = await openMenu());
  expect(within(dialog).queryByRole("link", { name: "Offers" })).not.toBeInTheDocument();
});

test("a guest can sign in or create an account from the menu", async () => {
  const onOpenAuth = jest.fn();
  renderMenu({ onOpenAuth });
  let { dialog } = await openMenu();
  expect(
    within(dialog).getByText("Sign in for faster checkout and order tracking.")
  ).toBeInTheDocument();
  expect(within(dialog).getByRole("link", { name: "Track order" })).toHaveAttribute("href", "/orders");
  expect(within(dialog).queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole("button", { name: "Sign in" }));
  expect(onOpenAuth).toHaveBeenLastCalledWith();
  await dialogGone();

  ({ dialog } = await openMenu());
  fireEvent.click(within(dialog).getByRole("button", { name: "Create account" }));
  expect(onOpenAuth).toHaveBeenLastCalledWith("signup");
  await dialogGone();
});

test("a signed-in shopper sees their account and can sign out", async () => {
  auth = { user: USER, logout: jest.fn() };
  wishlistCount = 3;
  renderMenu({ initialEntries: ["/wishlist"] });
  const { dialog } = await openMenu();
  expect(within(dialog).getByText("Asha Rao")).toBeInTheDocument();
  expect(within(dialog).getByText("asha@example.com")).toBeInTheDocument();
  expect(within(dialog).getByText("A")).toHaveAttribute("aria-hidden", "true");
  expect(within(dialog).getByRole("link", { name: "My account" })).toHaveAttribute("href", "/profile");
  expect(within(dialog).getByRole("link", { name: "My orders" })).toHaveAttribute("href", "/orders");
  const wishlist = within(dialog).getByRole("link", { name: "My wishlist, 3 items" });
  expect(wishlist).toHaveAttribute("href", "/wishlist");
  expect(wishlist).toHaveAttribute("aria-current", "page");

  fireEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));
  expect(auth.logout).toHaveBeenCalledTimes(1);
  expect(location()).toBe("/");
  await dialogGone();
});

test("settings: Help & support and the dark mode switch; legal links", async () => {
  renderMenu();
  const { dialog } = await openMenu();
  expect(within(dialog).getByRole("link", { name: "Help & support" })).toHaveAttribute("href", "/support");
  const darkMode = within(dialog).getByRole("switch", { name: "Dark mode" });
  expect(darkMode).toHaveAttribute("aria-checked", "false");
  fireEvent.click(darkMode);
  expect(theme.toggleTheme).toHaveBeenCalledTimes(1);
  expect(within(dialog).getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  expect(within(dialog).getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  expect(within(dialog).getByText(`© ${new Date().getFullYear()} A & S Urbanseat`)).toBeInTheDocument();
});

test("the dark mode switch reports the current mode", async () => {
  theme = { isDarkMode: true, toggleTheme: jest.fn() };
  renderMenu();
  const { dialog } = await openMenu();
  expect(within(dialog).getByRole("switch", { name: "Dark mode" })).toHaveAttribute("aria-checked", "true");
});
