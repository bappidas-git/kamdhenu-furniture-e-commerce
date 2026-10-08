import React, { createRef } from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import BrandStrip from "./BrandStrip";
import PressStrip from "./PressStrip";

const BRANDS = ["Carlton", "Nilkamal", "Winsome", "A & S Urbanseat"];

describe("BrandStrip", () => {
  test("is a region named by its eyebrow heading, listing the names as text in order", () => {
    render(<BrandStrip brands={BRANDS} label="Brands we carry" />);
    const region = screen.getByRole("region", { name: "Brands we carry" });
    const heading = within(region).getByRole("heading", { level: 2, name: "Brands we carry" });
    expect(heading).toHaveClass("sf-eyebrow");
    const items = within(region).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(BRANDS);
    // Wordmarks only: no logos, no links, no "trusted by" wording.
    expect(within(region).queryByRole("img")).not.toBeInTheDocument();
    expect(within(region).queryByRole("link")).not.toBeInTheDocument();
    expect(region).not.toHaveTextContent(/trusted/i);
  });

  test("uses the given heading id", () => {
    render(<BrandStrip brands={BRANDS} label="Brands we carry" headingId="home-brands-title" />);
    expect(screen.getByRole("heading", { name: "Brands we carry" })).toHaveAttribute("id", "home-brands-title");
    expect(screen.getByRole("region")).toHaveAttribute("aria-labelledby", "home-brands-title");
  });

  test.each([
    ["an empty list", []],
    ["blank names only", ["", "   "]],
    ["no list", undefined],
  ])("renders nothing with %s", (_, brands) => {
    const { container } = render(<BrandStrip brands={brands} label="Brands we carry" />);
    expect(container).toBeEmptyDOMElement();
  });

  test("holds its place with a skeleton line while loading", () => {
    const ref = createRef();
    const { container } = render(<BrandStrip ref={ref} brands={[]} loading label="Brands we carry" />);
    const region = screen.getByRole("region", { name: "Brands we carry" });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(within(region).queryByRole("list")).not.toBeInTheDocument();
    expect(container.querySelector(".sf-skeleton").closest('[aria-hidden="true"]')).not.toBeNull();
    // The ref reaches the section (the home page's lazy-load trigger).
    expect(ref.current).toBe(region);
  });
});

describe("PressStrip", () => {
  test.each([
    ["an empty list", []],
    ["no list", undefined],
    ["items without names", [{ logo: "/press.svg" }, { name: "  " }, null]],
  ])("renders nothing with %s", (_, items) => {
    const { container } = render(<PressStrip items={items} label="As featured in" />);
    expect(container).toBeEmptyDOMElement();
  });

  test("shows only the items it is given: names as text, logos with the name as alt", () => {
    render(
      <PressStrip
        label="As featured in"
        items={[{ name: "The Example Times" }, { name: "Design Weekly", logo: "/logos/design.svg" }]}
      />
    );
    const region = screen.getByRole("region", { name: "As featured in" });
    const items = within(region).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("The Example Times");
    expect(within(items[1]).getByRole("img", { name: "Design Weekly" })).toHaveAttribute(
      "src",
      "/logos/design.svg"
    );
  });
});
