import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ReviewsSection from "./ReviewsSection";

// jsdom has no IntersectionObserver (the section's Reveal uses one).
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

// This dom-testing-library computes "What customers *say*." as "What
// customers say ." (a space after the <em>); browsers do not.
const accentName = (text) => (name) => name.replace(/ (?=[.,!?])/g, "") === text;
const section = () => screen.getByRole("region", { name: accentName("What customers say.") });

const REVIEWS = [
  {
    id: 1,
    userName: "Rituparna B.",
    rating: 5,
    title: "Our living room finally feels finished",
    body: "The cushions are firm in a good way.",
    isVerifiedPurchase: false,
    helpfulCount: 9,
    createdAt: "2026-06-28T12:00:00.000Z",
  },
  {
    id: 2,
    userName: "Bappi D.",
    rating: 4,
    title: "Solid",
    body: "The drawer slides without catching.",
    isVerifiedPurchase: true,
    helpfulCount: 1,
    createdAt: "2026-07-14T09:30:00.000Z",
    photos: ["/img/a.jpg", "/img/b.jpg"],
  },
  {
    id: 3,
    userName: "",
    rating: 5,
    title: "",
    body: "Worth the wait.",
    isVerifiedPurchase: "true",
    helpfulCount: 0,
    createdAt: "not a date",
  },
];

const renderSection = (props = {}) =>
  render(
    <ReviewsSection
      reviews={REVIEWS}
      displayAvg={14 / 3}
      totalRatingsCount={3}
      id="product-reviews"
      {...props}
    />
  );

test("a section named by its serif heading, after the Reviews eyebrow", () => {
  renderSection();
  const region = section();
  expect(region).toHaveAttribute("id", "product-reviews");
  expect(region).toHaveAttribute("tabindex", "-1");
  const heading = within(region).getByRole("heading", { level: 2 });
  expect(heading).toHaveAttribute("id", "product-reviews-title");
  expect(heading.querySelector("em")).toHaveTextContent("say");
  expect(within(region).getByText("Reviews")).toHaveClass("sf-eyebrow");
});

test("the summary: the average to one place, out of 5, and how many ratings", () => {
  renderSection();
  const average = screen.getByText("4.7");
  expect(average).toHaveTextContent("4.7 out of 5");
  expect(screen.getByText("Based on 3 ratings")).toBeInTheDocument();
  // The summary's stars repeat the figure, so they are hidden from assistive technology.
  expect(screen.queryByRole("img", { name: "Rated 4.7 out of 5" })).not.toBeInTheDocument();
  expect(screen.queryByText("No reviews yet")).not.toBeInTheDocument();
});

test("one rating reads in the singular", () => {
  renderSection({ reviews: [REVIEWS[0]], totalRatingsCount: 1, displayAvg: 5 });
  expect(screen.getByText("Based on 1 rating")).toBeInTheDocument();
});

test("no ratings: no average at all, an honest line instead", () => {
  renderSection({ reviews: [], totalRatingsCount: 0, displayAvg: 0 });
  expect(screen.getByText("No reviews yet")).toBeInTheDocument();
  expect(
    screen.getByText("Reviews come from verified orders and are published after moderation.")
  ).toBeInTheDocument();
  expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  expect(screen.queryByText(/Based on/)).not.toBeInTheDocument();
  expect(screen.queryByRole("list", { name: "Ratings by star" })).not.toBeInTheDocument();
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
});

test("the rating bars: 5 → 1 stars, each an image named by its count", () => {
  renderSection();
  const bars = within(screen.getByRole("list", { name: "Ratings by star" })).getAllByRole("img");
  expect(bars.map((bar) => bar.getAttribute("aria-label"))).toEqual([
    "5 stars: 2 reviews",
    "4 stars: 1 review",
    "3 stars: 0 reviews",
    "2 stars: 0 reviews",
    "1 star: 0 reviews",
  ]);
  // Each fill is its share of the written reviews.
  const fills = bars.map((bar) => bar.querySelector(".ratingFill").style.getPropertyValue("--share"));
  expect(fills.map(Number)).toEqual([2 / 3, 1 / 3, 0, 0, 0]);
});

test("each review is an article: name, verified mark, date, stars, title, body", () => {
  renderSection();
  const articles = screen.getAllByRole("article");
  expect(articles).toHaveLength(3);

  const [first, second, third] = articles.map((article) => within(article));
  expect(first.getByText("Rituparna B.")).toBeInTheDocument();
  expect(first.queryByText("Verified purchase")).not.toBeInTheDocument();
  expect(first.getByText("Jun 28, 2026")).toHaveAttribute("datetime", "2026-06-28T12:00:00.000Z");
  expect(first.getByRole("img", { name: "Rated 5.0 out of 5" })).toBeInTheDocument();
  expect(first.getByRole("heading", { level: 3, name: "Our living room finally feels finished" })).toBeInTheDocument();
  expect(first.getByText("The cushions are firm in a good way.")).toBeInTheDocument();
  expect(first.getByText("9 people found this helpful")).toBeInTheDocument();

  expect(second.getByText("Verified purchase")).toHaveClass("sf-eyebrow");
  expect(second.getByText("1 person found this helpful")).toBeInTheDocument();

  // No name, no title, a date that does not parse, and a verified flag that
  // is not exactly true: nothing is invented.
  expect(third.getByText("Anonymous")).toBeInTheDocument();
  expect(third.queryByRole("heading")).not.toBeInTheDocument();
  expect(articles[2].querySelector("time")).toBeNull();
  expect(third.queryByText("Verified purchase")).not.toBeInTheDocument();
  expect(third.queryByText(/found this helpful/)).not.toBeInTheDocument();
});

test("customer photos are lazy 72px thumbnails with their own names", () => {
  renderSection();
  const photos = within(screen.getByRole("list", { name: "Customer photos" })).getAllByRole("img");
  expect(photos.map((img) => img.getAttribute("alt"))).toEqual([
    "Customer upload 1 of 2",
    "Customer upload 2 of 2",
  ]);
  photos.forEach((img) => {
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("width", "72");
  });
});

test("loading: skeleton reviews in a busy region, the known summary kept", () => {
  renderSection({ reviews: [], loading: true });
  expect(screen.getByText("Loading reviews")).toHaveClass("sf-visually-hidden");
  expect(screen.getByText("Loading reviews").closest('[aria-busy="true"]')).not.toBeNull();
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  expect(screen.getByText("Based on 3 ratings")).toBeInTheDocument();
  expect(screen.queryByRole("list", { name: "Ratings by star" })).not.toBeInTheDocument();
});

test("loading with no ratings yet claims nothing", () => {
  renderSection({ reviews: [], loading: true, totalRatingsCount: 0, displayAvg: 0 });
  expect(screen.queryByText("No reviews yet")).not.toBeInTheDocument();
  expect(screen.queryByText(/Based on/)).not.toBeInTheDocument();
});

test("a failed read says so, and Try again reads again with focus on the section", () => {
  const onRetry = jest.fn();
  renderSection({ reviews: [], error: true, onRetry });
  expect(screen.getByText("Reviews could not be loaded just now.")).toBeInTheDocument();
  expect(screen.queryByText("No reviews yet")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(section()).toHaveFocus();
});

test("no sort control and no write form: reviews are written from Order History", () => {
  const { container } = renderSection();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.queryByText(/sort/i)).not.toBeInTheDocument();
  expect(container.querySelector("form, textarea, input")).toBeNull();
  expect(screen.queryByText(/write a review/i)).not.toBeInTheDocument();
});

test("the ref reaches the section", () => {
  const ref = React.createRef();
  render(<ReviewsSection ref={ref} id="product-reviews" />);
  expect(ref.current).toBe(section());
});
