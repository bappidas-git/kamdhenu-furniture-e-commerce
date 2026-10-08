import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import StarRating from "./StarRating";

// Each star renders an empty star and, when it has a share of the rating, a
// clipping box as wide as that share.
const shares = (container) =>
  [...container.querySelectorAll('[role="img"] > span')].map((star) => {
    const fill = star.querySelector("span");
    return fill ? fill.style.width : "0%";
  });

test("is one image named by the rating", () => {
  const { container } = render(<StarRating rating={4} />);
  expect(screen.getByRole("img", { name: "Rated 4.0 out of 5" })).toBeInTheDocument();
  expect(container.querySelectorAll("svg")).toHaveLength(5 + 4);
  container.querySelectorAll("svg").forEach((svg) => expect(svg).toHaveAttribute("aria-hidden", "true"));
});

test("takes a label override", () => {
  render(<StarRating rating={4.5} label="Rated 4.5 out of 5, 12 reviews" />);
  expect(screen.getByRole("img", { name: "Rated 4.5 out of 5, 12 reviews" })).toBeInTheDocument();
});

test("fills each star by exactly its share of the rating", () => {
  const { container, rerender } = render(<StarRating rating={4.3} />);
  expect(shares(container)).toEqual(["100%", "100%", "100%", "100%", "30%"]);
  rerender(<StarRating rating={4.5} />);
  expect(shares(container)).toEqual(["100%", "100%", "100%", "100%", "50%"]);
  rerender(<StarRating rating={2} />);
  expect(shares(container)).toEqual(["100%", "100%", "0%", "0%", "0%"]);
});

test("clamps the rating to 0–5", () => {
  const { container, rerender } = render(<StarRating rating={7} />);
  expect(screen.getByRole("img", { name: "Rated 5.0 out of 5" })).toBeInTheDocument();
  expect(shares(container)).toEqual(["100%", "100%", "100%", "100%", "100%"]);
  rerender(<StarRating rating={-1} />);
  expect(screen.getByRole("img", { name: "Rated 0.0 out of 5" })).toBeInTheDocument();
  rerender(<StarRating rating="not a number" />);
  expect(screen.getByRole("img", { name: "Rated 0.0 out of 5" })).toBeInTheDocument();
  expect(shares(container)).toEqual(["0%", "0%", "0%", "0%", "0%"]);
});

test("sizes the stars from the size prop", () => {
  const { rerender } = render(<StarRating rating={3} />);
  expect(screen.getByRole("img")).toHaveStyle({ fontSize: "18px" });
  rerender(<StarRating rating={3} size={12} />);
  expect(screen.getByRole("img")).toHaveStyle({ fontSize: "12px" });
});
