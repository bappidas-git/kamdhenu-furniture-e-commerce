import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useReducedMotion } from "framer-motion";
import ReviewCarousel, { QUOTE_MAX_LENGTH, clampQuote } from "./ReviewCarousel";

jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(() => false),
}));

const review = (id, extra = {}) => ({
  id,
  productId: 10 + id,
  userName: `Reviewer ${id}`,
  rating: 4,
  title: `Title ${id}`,
  body: `Review number ${id} says the chair is comfortable and solid for everyday use.`,
  status: "approved",
  isVerifiedPurchase: false,
  helpfulCount: 0,
  createdAt: "2026-09-25T10:00:00.000Z",
  product: { id: 10 + id, name: `Piece ${id}`, slug: `piece-${id}` },
  ...extra,
});
const REVIEWS = [1, 2, 3, 4, 5].map((id) => review(id));

const renderCarousel = (props = {}) =>
  render(
    <MemoryRouter>
      <ReviewCarousel reviews={REVIEWS} label="Customer reviews" {...props} />
    </MemoryRouter>
  );

const carousel = () => screen.getByRole("group", { name: "Customer reviews" });
const slides = () => carousel().querySelectorAll('[aria-roledescription="slide"]');
const isTrack = (el) => typeof el.id === "string" && el.id.endsWith("reviews");
const isSlide = (el) => el.getAttribute?.("aria-roledescription") === "slide";

// jsdom lays nothing out: report a 600px track holding 300px slides (two in
// view), scrolled to `scrollLeft`, and record scroll calls.
const layOut = ({ scrollLeft = 0, clientWidth = 600, slideWidth = 300, count = REVIEWS.length } = {}) => {
  jest.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function get() {
    return isTrack(this) ? slideWidth * count : 0;
  });
  jest.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function get() {
    return isTrack(this) ? clientWidth : 0;
  });
  jest.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function get() {
    return isSlide(this) ? slideWidth : 0;
  });
  jest.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function get() {
    return isSlide(this) ? [...this.parentElement.children].indexOf(this) * slideWidth : 0;
  });
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function rect() {
    return { width: isSlide(this) ? slideWidth : 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
  });
  const position = { left: scrollLeft };
  jest.spyOn(HTMLElement.prototype, "scrollLeft", "get").mockImplementation(function get() {
    return isTrack(this) ? position.left : 0;
  });
  const scrollBy = jest.fn();
  const scrollTo = jest.fn();
  HTMLElement.prototype.scrollBy = scrollBy;
  HTMLElement.prototype.scrollTo = scrollTo;
  return { scrollBy, scrollTo, position };
};

afterEach(() => {
  jest.restoreAllMocks();
  delete HTMLElement.prototype.scrollBy;
  delete HTMLElement.prototype.scrollTo;
  useReducedMotion.mockReturnValue(false);
});

// ── Structure and content ────────────────────────────────────────────────────

test("is a named carousel whose slides are labelled groups, in the given order", () => {
  renderCarousel();
  expect(carousel()).toHaveAttribute("aria-roledescription", "carousel");
  const all = slides();
  expect(all).toHaveLength(5);
  all.forEach((slide, index) => {
    expect(slide).toHaveAttribute("role", "group");
    expect(slide).toHaveAttribute("aria-label", `Review ${index + 1} of 5`);
  });
  expect(all[0]).toHaveTextContent(REVIEWS[0].body);
});

test("a slide quotes the text and shows the stars, name, product link and short date", () => {
  renderCarousel();
  const slide = within(slides()[0]);
  const quote = slides()[0].querySelector("blockquote");
  expect(quote).toHaveTextContent(REVIEWS[0].body);
  expect(slide.getByRole("img", { name: "Rated 4.0 out of 5" })).toBeInTheDocument();
  expect(slide.getByText("Reviewer 1")).toBeInTheDocument();
  expect(slide.getByRole("link", { name: "Piece 1" })).toHaveAttribute("href", "/products/piece-1");
  const time = slides()[0].querySelector("time");
  expect(time).toHaveAttribute("dateTime", REVIEWS[0].createdAt);
  expect(time).toHaveTextContent("Sep 25, 2026");
  // No avatar, no title, no invented place.
  expect(slide.getAllByRole("img")).toHaveLength(1);
  expect(slides()[0]).not.toHaveTextContent("Title 1");
});

test("marks a verified purchase only when the review says so", () => {
  renderCarousel({
    reviews: [review(1, { isVerifiedPurchase: true }), review(2), review(3, { isVerifiedPurchase: "yes" })],
  });
  const [first, second, third] = slides();
  expect(within(first).getByText("Verified purchase")).toBeInTheDocument();
  expect(within(second).queryByText("Verified purchase")).not.toBeInTheDocument();
  expect(within(third).queryByText("Verified purchase")).not.toBeInTheDocument();
});

test("shows the rating it is given, and no stars without one", () => {
  renderCarousel({ reviews: [review(1, { rating: 3 }), review(2, { rating: 0 }), review(3, { rating: undefined })] });
  const [first, second, third] = slides();
  expect(within(first).getByRole("img", { name: "Rated 3.0 out of 5" })).toBeInTheDocument();
  expect(within(second).queryByRole("img")).not.toBeInTheDocument();
  expect(within(third).queryByRole("img")).not.toBeInTheDocument();
});

test("leaves out a missing name, product or date rather than inventing one", () => {
  renderCarousel({
    reviews: [review(1, { userName: "", product: null, createdAt: "not a date" })],
  });
  const slide = slides()[0];
  expect(within(slide).queryByRole("link")).not.toBeInTheDocument();
  expect(slide.querySelector("time")).toBeNull();
  expect(slide).not.toHaveTextContent(/anonymous|invalid date/i);
});

test(`clamps a long quote to ${QUOTE_MAX_LENGTH} characters at a word`, () => {
  const long = `${"A sturdy, comfortable chair for long working days. ".repeat(8)}The end.`;
  const quote = clampQuote(long);
  expect(quote.length).toBeLessThanOrEqual(QUOTE_MAX_LENGTH);
  expect(quote.endsWith("…")).toBe(true);
  expect(long.startsWith(quote.slice(0, -1))).toBe(true);
  expect(quote.slice(0, -1)).toMatch(/[a-z]$/);
  expect(clampQuote("  Short   and\nsweet. ")).toBe("Short and sweet.");

  renderCarousel({ reviews: [review(1, { body: long })] });
  expect(slides()[0].querySelector("blockquote")).toHaveTextContent(quote);
});

// ── States ───────────────────────────────────────────────────────────────────

test("shows skeleton slides while loading, hidden from assistive technology", () => {
  const { container } = renderCarousel({ reviews: [], loading: true });
  expect(carousel()).toHaveAttribute("aria-busy", "true");
  expect(container.querySelectorAll('.sf-skeleton[aria-hidden="true"]')).toHaveLength(3);
  expect(within(carousel()).queryByRole("button")).not.toBeInTheDocument();
  expect(carousel().lastElementChild).toHaveAttribute("aria-hidden", "true");
});

test("has an honest empty state and an error state", () => {
  const { unmount } = renderCarousel({ reviews: [] });
  expect(screen.getByText("No customer reviews yet.")).toHaveClass("sf-eyebrow");
  expect(screen.queryByRole("group")).not.toBeInTheDocument();
  unmount();

  renderCarousel({ reviews: [], error: true });
  expect(screen.getByText("Reviews could not be loaded just now.")).toBeInTheDocument();
});

test("has no controls while every slide fits", () => {
  renderCarousel();
  expect(within(carousel()).queryByRole("button")).not.toBeInTheDocument();
});

// ── Controls ─────────────────────────────────────────────────────────────────

test("offers previous / next and a dot per review, marking the slides in view", () => {
  layOut();
  renderCarousel();
  const group = within(carousel());
  const dots = group.getAllByRole("button", { name: /^Review \d of 5$/ });
  expect(dots).toHaveLength(5);
  expect(dots.map((dot) => dot.getAttribute("aria-current"))).toEqual(["true", "true", null, null, null]);
  expect(group.getByRole("button", { name: "Previous reviews" })).toHaveAttribute("aria-disabled", "true");
  expect(group.getByRole("button", { name: "Next reviews" })).not.toHaveAttribute("aria-disabled");
  const trackId = carousel().firstElementChild.id;
  [...dots, group.getByRole("button", { name: "Next reviews" })].forEach((button) =>
    expect(button).toHaveAttribute("aria-controls", trackId)
  );
});

test("next scrolls one page of slides; previous does nothing at the start", () => {
  const { scrollBy } = layOut();
  renderCarousel();
  fireEvent.click(screen.getByRole("button", { name: "Previous reviews" }));
  expect(scrollBy).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Next reviews" }));
  expect(scrollBy).toHaveBeenCalledWith({ left: 600, behavior: "smooth" });
});

test("a dot scrolls its slide into view, instantly under reduced motion", () => {
  useReducedMotion.mockReturnValue(true);
  const { scrollTo } = layOut();
  renderCarousel();
  fireEvent.click(screen.getByRole("button", { name: "Review 3 of 5" }));
  expect(scrollTo).toHaveBeenCalledWith({ left: 600, behavior: "auto" });
  // The last slide cannot lead: it scrolls as far as the track goes.
  fireEvent.click(screen.getByRole("button", { name: "Review 5 of 5" }));
  expect(scrollTo).toHaveBeenLastCalledWith({ left: 900, behavior: "auto" });
});

test("follows the scroll position: dots, and next disabled at the end", async () => {
  const { position } = layOut();
  renderCarousel();
  const track = carousel().firstElementChild;
  position.left = 900;
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb();
    return 1;
  });
  await act(async () => {
    fireEvent.scroll(track);
  });
  const dots = screen.getAllByRole("button", { name: /^Review \d of 5$/ });
  expect(dots.map((dot) => dot.getAttribute("aria-current"))).toEqual([null, null, null, "true", "true"]);
  expect(screen.getByRole("button", { name: "Next reviews" })).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("button", { name: "Previous reviews" })).not.toHaveAttribute("aria-disabled");
});
