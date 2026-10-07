import React from "react";
import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useReducedMotion } from "framer-motion";
import Reveal, { staggerDelay } from "./Reveal";

jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(() => false),
}));

// jsdom has no IntersectionObserver. framer-motion shares one observer per
// root and options, so keep every instance and let a test report an element
// as in view.
const observers = [];
beforeAll(() => {
  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterAll(() => {
  delete window.IntersectionObserver;
});
afterEach(() => useReducedMotion.mockReturnValue(false));

const enterView = (target) =>
  act(() => {
    observers.forEach((observer) => observer.callback([{ target, isIntersecting: true }]));
  });

test("starts hidden, risen by the token distance, as a div by default", () => {
  render(<Reveal data-testid="reveal">Hello</Reveal>);
  const el = screen.getByTestId("reveal");
  expect(el.tagName).toBe("DIV");
  expect(el).toHaveTextContent("Hello");
  expect(el.style.opacity).toBe("0");
  expect(el.style.transform).toContain("translateY(20px)");
});

test("renders the requested tag and passes props through", () => {
  render(
    <Reveal as="section" className="story" aria-label="Our story" distance={32}>
      Copy
    </Reveal>
  );
  const el = screen.getByRole("region", { name: "Our story" });
  expect(el.tagName).toBe("SECTION");
  expect(el).toHaveClass("story");
  expect(el.style.transform).toContain("translateY(32px)");
});

test("only fades under reduced motion (no transform)", () => {
  useReducedMotion.mockReturnValue(true);
  render(<Reveal data-testid="reveal">Calm</Reveal>);
  const el = screen.getByTestId("reveal");
  expect(el.style.opacity).toBe("0");
  expect(el.style.transform || "none").not.toContain("translateY");
});

test("calls onInView when the element enters the viewport", () => {
  const onInView = jest.fn();
  render(
    <Reveal data-testid="reveal" onInView={onInView}>
      Reviews
    </Reveal>
  );
  const el = screen.getByTestId("reveal");
  enterView(el);
  expect(onInView).toHaveBeenCalledTimes(1);
  const [entry] = onInView.mock.calls[0];
  expect(entry.target).toBe(el);
  expect(entry.isIntersecting).toBe(true);
});

test("staggerDelay steps by --sf-stagger and caps the group", () => {
  expect(staggerDelay(0)).toBe(0);
  expect(staggerDelay(3)).toBeCloseTo(0.27);
  expect(staggerDelay(7)).toBeCloseTo(0.63);
  expect(staggerDelay(8)).toBe(0);
  expect(staggerDelay(5, 4)).toBe(0);
});
