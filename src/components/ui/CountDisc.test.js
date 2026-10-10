import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import CountDisc from "./CountDisc";

// The count disc: hidden at 0, "99+" above 99, decorative; a new figure fades
// in (an opacity change, never a pop), while the first render draws the disc
// as it is.

// The disc is decorative (aria-hidden): no role to query.
// eslint-disable-next-line testing-library/no-node-access
const disc = (container) => container.querySelector(".sf-count");

test("renders nothing at 0 (or without a count)", () => {
  const { container, rerender } = render(<CountDisc count={0} />);
  expect(container).toBeEmptyDOMElement();
  rerender(<CountDisc />);
  expect(container).toBeEmptyDOMElement();
});

test("draws the figure in an aria-hidden .sf-count disc with the placement class", () => {
  const { container } = render(<CountDisc count={3} className="placed" />);
  expect(disc(container)).toHaveTextContent("3");
  expect(disc(container)).toHaveClass("sf-count", "placed");
  expect(disc(container)).toHaveAttribute("aria-hidden", "true");
});

test("anything above 99 reads 99+", () => {
  const { container } = render(<CountDisc count={140} />);
  expect(disc(container)).toHaveTextContent("99+");
});

test("the first render is not animated: the disc starts fully drawn", () => {
  const { container } = render(<CountDisc count={2} />);
  expect(disc(container).style.opacity).not.toBe("0");
});

test("a new figure is a new disc that fades in from transparent", () => {
  const { container, rerender } = render(<CountDisc count={2} />);
  const first = disc(container);
  rerender(<CountDisc count={3} />);
  const next = disc(container);
  expect(next).toHaveTextContent("3");
  expect(next).not.toBe(first);
  expect(next.style.opacity).toBe("0");
  expect(next.style.transform || "none").toBe("none");
});

test("a disc appearing after 0 fades in too", () => {
  const { container, rerender } = render(<CountDisc count={0} />);
  rerender(<CountDisc count={1} />);
  expect(disc(container)).toHaveTextContent("1");
  expect(disc(container).style.opacity).toBe("0");
});

test("past 99 the figure does not change, so neither does the disc", () => {
  const { container, rerender } = render(<CountDisc count={120} />);
  const first = disc(container);
  rerender(<CountDisc count={121} />);
  expect(disc(container)).toBe(first);
});
