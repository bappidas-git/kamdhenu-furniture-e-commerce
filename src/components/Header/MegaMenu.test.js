import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import MegaMenu, { groupCategoryTree } from "./MegaMenu";

// The row only exists from 1024px; jsdom has no matchMedia, so report a
// desktop viewport (and no reduced-motion preference).
beforeAll(() => {
  window.matchMedia = (query) => ({
    matches: /min-width/.test(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
});

const category = (id, name, slug, parentId = null, extra = {}) => ({
  id,
  name,
  slug,
  parentId,
  description: `${name} description.`,
  image: `https://example.test/${slug}.png`,
  isActive: true,
  sortOrder: 1,
  showInMainMenu: false,
  menuOrder: 0,
  ...extra,
});

const CATEGORIES = [
  category(1, "Plastic Furniture", "plastic-furniture", null, { showInMainMenu: true, menuOrder: 1 }),
  category(3, "Café & Restaurant Chairs", "cafe-restaurant-chairs", null, { showInMainMenu: true, menuOrder: 2 }),
  category(10, "Essentials", "plastic-essentials", 1, { sortOrder: 1 }),
  category(48, "Dining Sets", "plastic-dining-sets", 1, { sortOrder: 2 }),
  category(11, "Chairs with Arms", "plastic-essentials-armchairs", 10),
];

const renderMenu = (props = {}) =>
  render(
    <MemoryRouter>
      <MegaMenu departments={groupCategoryTree(CATEGORIES)} {...props} />
    </MemoryRouter>
  );

const department = (name) => screen.getByRole("link", { name });
const panel = (name) => screen.queryByRole("region", { name: `${name} menu` });

test("lists the departments as expandable links, then Offers and Our story", () => {
  renderMenu();
  const nav = screen.getByRole("navigation", { name: "Primary" });
  const plastic = within(nav).getByRole("link", { name: "Plastic Furniture" });
  expect(plastic).toHaveAttribute("href", "/products?category=plastic-furniture");
  expect(plastic).toHaveAttribute("aria-haspopup", "true");
  expect(plastic).toHaveAttribute("aria-expanded", "false");
  expect(plastic).toHaveAttribute("aria-controls", "sf-megamenu-plastic-furniture");
  expect(within(nav).getByRole("link", { name: "Offers" })).toHaveAttribute("href", "/special-offers");
  expect(within(nav).getByRole("link", { name: "Our story" })).toHaveAttribute("href", "/about");
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
});

test("hides Offers while the deals page is disabled", () => {
  renderMenu({ dealsEnabled: false });
  expect(screen.queryByRole("link", { name: "Offers" })).not.toBeInTheDocument();
});

test("a click opens the department's panel with canonical links, a second click closes it", async () => {
  renderMenu();
  fireEvent.click(department("Plastic Furniture"), { detail: 1 });
  const region = panel("Plastic Furniture");
  expect(region).toBeInTheDocument();
  expect(region).toHaveAttribute("id", "sf-megamenu-plastic-furniture");
  expect(department("Plastic Furniture")).toHaveAttribute("aria-expanded", "true");
  const links = within(region);
  expect(links.getByRole("link", { name: "Essentials" })).toHaveAttribute(
    "href",
    "/products?category=plastic-essentials"
  );
  expect(links.getByRole("link", { name: "Chairs with Arms" })).toHaveAttribute(
    "href",
    "/products?category=plastic-essentials-armchairs"
  );
  expect(links.getByRole("link", { name: "Dining Sets" })).toHaveAttribute(
    "href",
    "/products?category=plastic-dining-sets"
  );
  expect(links.getByRole("link", { name: "Shop all Plastic Furniture" })).toHaveAttribute(
    "href",
    "/products?category=plastic-furniture"
  );
  expect(links.getByRole("link", { name: "Browse all furniture" })).toHaveAttribute("href", "/products");
  const image = region.querySelector("img");
  expect(image).toHaveAttribute("alt", "Plastic Furniture");
  expect(image).toHaveAttribute("src", "https://example.test/plastic-furniture.png");
  expect(image).toHaveAttribute("loading", "lazy");

  fireEvent.click(department("Plastic Furniture"), { detail: 1 });
  await waitFor(() => expect(panel("Plastic Furniture")).not.toBeInTheDocument());
  expect(department("Plastic Furniture")).toHaveAttribute("aria-expanded", "false");
});

test("a flat department shows its description and a Shop all link", () => {
  renderMenu();
  fireEvent.click(department("Café & Restaurant Chairs"), { detail: 1 });
  const region = within(panel("Café & Restaurant Chairs"));
  expect(region.getByText("Café & Restaurant Chairs description.")).toBeInTheDocument();
  expect(region.getByRole("link", { name: "Shop all Café & Restaurant Chairs" })).toHaveAttribute(
    "href",
    "/products?category=cafe-restaurant-chairs"
  );
});

test("Enter moves focus into the panel and Escape closes it, back on the department", async () => {
  renderMenu();
  const plastic = department("Plastic Furniture");
  // Keyboard focus alone previews the panel.
  act(() => plastic.focus());
  expect(panel("Plastic Furniture")).toBeInTheDocument();
  // Enter on a link fires a click with detail 0.
  fireEvent.click(plastic, { detail: 0 });
  const region = panel("Plastic Furniture");
  await waitFor(() => expect(region).toContainElement(document.activeElement));
  expect(document.activeElement).toHaveTextContent("Essentials");

  fireEvent.keyDown(document.activeElement, { key: "Escape" });
  await waitFor(() => expect(panel("Plastic Furniture")).not.toBeInTheDocument());
  expect(document.activeElement).toBe(plastic);
  expect(plastic).toHaveAttribute("aria-expanded", "false");
});

test("marks the department that holds the current category", () => {
  renderMenu({ activeDepartments: new Map([["1", "true"]]) });
  expect(department("Plastic Furniture")).toHaveAttribute("aria-current", "true");
  expect(department("Café & Restaurant Chairs")).not.toHaveAttribute("aria-current");
});
