import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SocialProof from "./SocialProof";

test("no ratings: an honest empty state, never 0.0", () => {
  render(<SocialProof rating={0} count={0} onReviewsClick={() => {}} />);
  expect(screen.getByText("No reviews yet")).toBeInTheDocument();
  expect(screen.queryByText(/0\.0/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("a quiet row that jumps to the reviews", () => {
  const onReviewsClick = jest.fn();
  render(<SocialProof rating={4.6} count={12} onReviewsClick={onReviewsClick} />);
  const jump = screen.getByRole("button", { name: "Rated 4.6 out of 5, 12 reviews" });
  expect(jump).toHaveTextContent("4.6");
  expect(jump).toHaveTextContent("12 reviews");
  // The stars are part of the row, but the button carries the words.
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  fireEvent.click(jump);
  expect(onReviewsClick).toHaveBeenCalledTimes(1);
});

test("one review is singular; large counts are grouped", () => {
  const { rerender } = render(<SocialProof rating={4} count={1} onReviewsClick={() => {}} />);
  expect(screen.getByRole("button", { name: "Rated 4.0 out of 5, 1 review" })).toBeInTheDocument();
  rerender(<SocialProof rating={4.24} count={1200} onReviewsClick={() => {}} />);
  expect(screen.getByRole("button", { name: "Rated 4.2 out of 5, 1,200 reviews" })).toBeInTheDocument();
});

test("without a jump it is plain text", () => {
  render(<SocialProof rating={5} count={3} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByText("3 reviews")).toBeInTheDocument();
});

test("the rating is clamped to 0–5", () => {
  render(<SocialProof rating={7} count={2} onReviewsClick={() => {}} />);
  expect(screen.getByRole("button", { name: "Rated 5.0 out of 5, 2 reviews" })).toBeInTheDocument();
});
