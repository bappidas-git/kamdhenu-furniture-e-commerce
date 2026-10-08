import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PriceBlock from "./PriceBlock";

test("shows only the price when there is no genuine saving", () => {
  const { container, rerender } = render(<PriceBlock price={2499} comparePrice={0} size="sm" />);
  expect(container).toHaveTextContent(/^₹2,499\.00$/);
  rerender(<PriceBlock price={2499} comparePrice={2499} size="lg" />);
  expect(container).toHaveTextContent(/^₹2,499\.00$/);
  rerender(<PriceBlock price={2499} comparePrice={1999} size="lg" />);
  expect(container).toHaveTextContent(/^₹2,499\.00$/);
});

test("strikes the compare-at price and announces it as Was", () => {
  const { container } = render(<PriceBlock price={2499} comparePrice={2849} size="sm" showSavings={false} />);
  expect(screen.getByText("Was")).toHaveClass("sf-visually-hidden");
  expect(container).toHaveTextContent("₹2,499.00Was ₹2,849.00");
  expect(screen.queryByText(/Save/)).not.toBeInTheDocument();
});

test("cards and summaries state the saving as a share, only when asked", () => {
  const { rerender } = render(<PriceBlock price={2499} comparePrice={2849} size="sm" />);
  expect(screen.queryByText(/Save/)).not.toBeInTheDocument();
  rerender(<PriceBlock price={2499} comparePrice={2849} size="sm" showSavings />);
  expect(screen.getByText("Save 12%")).toBeInTheDocument();
  rerender(<PriceBlock price={2499} comparePrice={2849} size="md" showSavings />);
  expect(screen.getByText("Save 12%")).toBeInTheDocument();
  // A saving that rounds to 0% is not worth a line; the struck price stays.
  rerender(<PriceBlock price={999} comparePrice={1000} size="sm" showSavings />);
  expect(screen.queryByText(/Save/)).not.toBeInTheDocument();
  expect(screen.getByText("Was")).toBeInTheDocument();
});

test("the product page (lg, the default) states the amount saved and the tax note", () => {
  const { rerender } = render(
    <PriceBlock price={2499} comparePrice={2899} taxNote="Inclusive of all taxes" />
  );
  expect(screen.getByText("Save ₹400.00")).toBeInTheDocument();
  expect(screen.getByText("Inclusive of all taxes")).toBeInTheDocument();
  rerender(<PriceBlock price={2499} comparePrice={2899} showSavings={false} />);
  expect(screen.queryByText(/Save/)).not.toBeInTheDocument();
});

test("never derives a saving from a zero price", () => {
  render(<PriceBlock price={0} comparePrice={1000} size="lg" />);
  expect(screen.queryByText("Was")).not.toBeInTheDocument();
  expect(screen.queryByText(/Save/)).not.toBeInTheDocument();
});
