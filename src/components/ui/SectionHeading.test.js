import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SectionHeading from "./SectionHeading";

const renderInRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

test("renders the eyebrow, an h2 title with its accent, and the intro", () => {
  renderInRouter(
    <SectionHeading
      eyebrow="Shop by space"
      title="Furniture for every *room*."
      intro="Start with the room you are furnishing."
    />
  );
  const heading = screen.getByRole("heading", { level: 2 });
  expect(heading).toHaveClass("sf-display-lg");
  expect(heading.querySelector("em")).toHaveTextContent("room");
  expect(screen.getByText("Shop by space")).toHaveClass("sf-eyebrow");
  expect(screen.getByText("Start with the room you are furnishing.")).toBeInTheDocument();
});

test("uses the heading level and id it is given", () => {
  renderInRouter(<SectionHeading as="h3" id="related-title" title="You may also *like*." />);
  expect(screen.getByRole("heading", { level: 3 })).toHaveAttribute("id", "related-title");
});

test("renders an { label, to } action as a router link styled as a text link", () => {
  renderInRouter(<SectionHeading title="Trending" action={{ label: "View all", to: "/products" }} />);
  const link = screen.getByRole("link", { name: "View all" });
  expect(link).toHaveAttribute("href", "/products");
  expect(link).toHaveClass("sf-btn", "sf-btn--link");
});

test("renders an { label, href } action as a plain anchor", () => {
  renderInRouter(<SectionHeading title="Help" action={{ label: "Email us", href: "mailto:x@y.z" }} />);
  expect(screen.getByRole("link", { name: "Email us" })).toHaveAttribute("href", "mailto:x@y.z");
});

test("passes a ready-made action element through", () => {
  renderInRouter(<SectionHeading title="Reviews" action={<button type="button">Write a review</button>} />);
  expect(screen.getByRole("button", { name: "Write a review" })).toBeInTheDocument();
});

test("adds the centred modifier and extra classes", () => {
  const { container } = renderInRouter(
    <SectionHeading title="Our promise" align="center" className="extra" />
  );
  expect(container.firstChild).toHaveClass("center", "extra");
});
