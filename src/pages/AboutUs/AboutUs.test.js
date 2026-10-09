import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  ABOUT_CLOSING,
  ABOUT_HEADLINE,
  ABOUT_INTRO,
  ABOUT_STORY,
  ABOUT_VALUES,
} from "../../content/brandContent";
import { stripAccent } from "../../components/ui";
import { SUPPORT_EMAIL } from "../../utils/constants";
import * as constants from "../../utils/constants";
import AboutUs from "./AboutUs";

// jsdom has no IntersectionObserver (Reveal uses one): everything is in view.
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

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver;
});

const renderAbout = () =>
  render(
    <MemoryRouter initialEntries={["/about"]}>
      <AboutUs />
    </MemoryRouter>
  );

// jsdom's name computation may put spaces around the <em>; browsers do not.
const nameOf = (text) => new RegExp(`^${stripAccent(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, " ?")}$`.replace(/\\\.\$$/, " ?\\.$"));

test("the frame: trail, eyebrow, the headline as the one h1, the intro", () => {
  renderAbout();
  const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
  expect(within(trail).getByText("Our story")).toHaveAttribute("aria-current", "page");
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  const h1 = screen.getByRole("heading", { level: 1 });
  expect(h1.textContent).toBe(stripAccent(ABOUT_HEADLINE));
  expect(within(h1).getByText("lived").tagName).toBe("EM");
  expect(screen.getByText(ABOUT_INTRO)).toBeInTheDocument();
});

test("two story blocks: a 4:5 photograph and text each, the second mirrored", () => {
  renderAbout();
  ABOUT_STORY.forEach((story, index) => {
    const region = screen.getByRole("region", { name: nameOf(story.title) });
    expect(within(region).getByText(story.eyebrow)).toHaveClass("sf-eyebrow");
    const image = within(region).getByRole("img", { name: story.image.alt });
    expect(image).toHaveAttribute("src", story.image.src);
    expect(image).toHaveAttribute("width", "1200");
    expect(image).toHaveAttribute("height", "1500");
    expect(image).toHaveAttribute("loading", "lazy");
    story.body.forEach((paragraph) => expect(within(region).getByText(paragraph)).toBeInTheDocument());
    expect(region.classList.contains("mirrored")).toBe(index === 1);
  });
  expect(screen.getAllByRole("img")).toHaveLength(ABOUT_STORY.length);
});

test("the three values, each an h3 under the section's h2", () => {
  renderAbout();
  const values = screen.getByRole("region", { name: nameOf(ABOUT_VALUES.title) });
  expect(within(values).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
    "Quality first",
    "Customer focused",
    "Trust & reliability",
  ]);
  ABOUT_VALUES.items.forEach((value) => expect(within(values).getByText(value.body)).toBeInTheDocument());
});

test("closes with the ghost button to the collection, then the contact line", () => {
  renderAbout();
  const cta = screen.getByRole("link", { name: ABOUT_CLOSING.cta.label });
  expect(cta).toHaveAttribute("href", "/products");
  expect(cta).toHaveClass("sf-btn", "sf-btn--ghost");
  expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/support");
  expect(screen.getByRole("link", { name: SUPPORT_EMAIL })).toHaveAttribute("href", `mailto:${SUPPORT_EMAIL}`);
});

test("no statistics, years in business, warranties or stock claims", () => {
  const { container } = renderAbout();
  expect(container.textContent).not.toMatch(
    /50K|10K|500\+|99\.9|happy customers|uptime|\d+\+? years|since \d|warranty|24\/7|founded/i
  );
});

test("WHY_CHOOSE_US is gone from constants", () => {
  expect(constants.WHY_CHOOSE_US).toBeUndefined();
});
