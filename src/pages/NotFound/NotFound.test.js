import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import NotFound from "./NotFound";

const renderNotFound = () =>
  render(
    <MemoryRouter initialEntries={["/nonsense"]}>
      <NotFound />
    </MemoryRouter>
  );

test("one serif h1, the eyebrow and one line", () => {
  renderNotFound();
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  const h1 = screen.getByRole("heading", { level: 1, name: "This page has moved or never existed." });
  expect(h1).toHaveClass("sf-display-lg");
  expect(screen.getByText("Page not found")).toHaveClass("sf-eyebrow");
  expect(
    screen.getByText(
      "The link may be out of date, or the address may have a typo. Start again from the home page, or browse the collection."
    )
  ).toBeInTheDocument();
});

test("primary Back to home, ghost Browse furniture", () => {
  renderNotFound();
  const home = screen.getByRole("link", { name: "Back to home" });
  expect(home).toHaveAttribute("href", "/");
  expect(home).toHaveClass("sf-btn", "sf-btn--primary");
  const browse = screen.getByRole("link", { name: "Browse furniture" });
  expect(browse).toHaveAttribute("href", "/products");
  expect(browse).toHaveClass("sf-btn", "sf-btn--ghost");
  expect(screen.getAllByRole("link")).toHaveLength(2);
});

test("no breadcrumb (a 404 is not a place in the site)", () => {
  renderNotFound();
  expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).not.toBeInTheDocument();
});
