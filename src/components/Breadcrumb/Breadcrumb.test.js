import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Breadcrumb from "./Breadcrumb";

const renderTrail = (items) =>
  render(
    <MemoryRouter>
      <Breadcrumb items={items} />
    </MemoryRouter>
  );

test("is a navigation landmark named Breadcrumb holding an ordered list", () => {
  renderTrail([{ label: "Furniture", link: "/products" }, { label: "Sofas" }]);
  const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
  const list = within(nav).getByRole("list");
  expect(list.tagName).toBe("OL");
  expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    "Home",
    "Furniture",
    "Sofas",
  ]);
});

test("links every ancestor and marks the last item as the current page", () => {
  renderTrail([
    { label: "Furniture", link: "/products" },
    { label: "Plastic Furniture", link: "/products?category=plastic-furniture" },
    { label: "Essentials", link: "/products?category=plastic-essentials" },
  ]);
  expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "Furniture" })).toHaveAttribute("href", "/products");
  expect(screen.getByRole("link", { name: "Plastic Furniture" })).toHaveAttribute(
    "href",
    "/products?category=plastic-furniture"
  );
  // The current page is text, even when its item carries a link.
  expect(screen.queryByRole("link", { name: "Essentials" })).not.toBeInTheDocument();
  const current = screen.getByText("Essentials");
  expect(current).toHaveAttribute("aria-current", "page");
  expect(screen.getAllByRole("link")).toHaveLength(3);
});

test("renders an item without a link as plain text", () => {
  renderTrail([{ label: "Help" }, { label: "Returns" }]);
  expect(screen.queryByRole("link", { name: "Help" })).not.toBeInTheDocument();
  expect(screen.getByText("Help")).not.toHaveAttribute("aria-current");
  expect(screen.getByText("Returns")).toHaveAttribute("aria-current", "page");
});

test("with no items, Home is the current page", () => {
  renderTrail([]);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByText("Home")).toHaveAttribute("aria-current", "page");
});

test("skips empty items", () => {
  renderTrail([{ label: "" }, null, { label: "All furniture" }]);
  const items = screen.getAllByRole("listitem");
  expect(items.map((li) => li.textContent)).toEqual(["Home", "All furniture"]);
  expect(screen.getByText("All furniture")).toHaveAttribute("aria-current", "page");
});
