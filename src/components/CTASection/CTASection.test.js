import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import CTASection from "./CTASection";

const COPY = {
  eyebrow: "When you're ready",
  title: "Find the piece that *fits*.",
  line: "Browse the full collection, or talk to us about the space you are furnishing.",
  primary: { label: "Shop the collection", to: "/products" },
  secondary: { label: "Talk to us", to: "/support" },
};

const renderCta = (props = {}) =>
  render(
    <MemoryRouter>
      <CTASection {...COPY} {...props} />
    </MemoryRouter>
  );

// This dom-testing-library names "…that *fits*." as "…that fits ." (a space
// after the <em>); browsers do not.
const titleName = (name) => name.replace(/ (?=[.,!?])/g, "") === "Find the piece that fits.";

test("is a region named by its display title, with the accent word in an <em>", () => {
  renderCta();
  const region = screen.getByRole("region", { name: titleName });
  const heading = within(region).getByRole("heading", { level: 2 });
  expect(heading).toHaveClass("sf-display-xl");
  expect(heading.querySelector("em")).toHaveTextContent("fits");
  expect(region).toHaveTextContent(COPY.eyebrow);
  expect(region).toHaveTextContent(COPY.line);
});

test("on navy, the buttons are the paper pair and link where they say", () => {
  renderCta({ tone: "navy" });
  const shop = screen.getByRole("link", { name: "Shop the collection" });
  const talk = screen.getByRole("link", { name: "Talk to us" });
  expect(shop).toHaveAttribute("href", "/products");
  expect(talk).toHaveAttribute("href", "/support");
  expect(shop).toHaveClass("sf-btn", "sf-btn--paper");
  expect(talk).toHaveClass("sf-btn", "sf-btn--paper-ghost");
});

test.each(["paper", "sand", undefined, "purple"])("on %p, the buttons are primary and ghost", (tone) => {
  renderCta({ tone });
  expect(screen.getByRole("link", { name: "Shop the collection" })).toHaveClass("sf-btn--primary");
  expect(screen.getByRole("link", { name: "Talk to us" })).toHaveClass("sf-btn--ghost");
});

test("hides the second button when it is not given, and never carries a form", () => {
  const { container } = renderCta({ secondary: null });
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(container.querySelector("form, input")).toBeNull();
});

test("takes a heading level and id", () => {
  renderCta({ as: "h3", headingId: "closing-title" });
  const heading = screen.getByRole("heading", { level: 3 });
  expect(heading).toHaveAttribute("id", "closing-title");
  expect(screen.getByRole("region")).toHaveAttribute("aria-labelledby", "closing-title");
});

test("renders nothing without a title", () => {
  const { container } = renderCta({ title: "" });
  expect(container).toBeEmptyDOMElement();
});
