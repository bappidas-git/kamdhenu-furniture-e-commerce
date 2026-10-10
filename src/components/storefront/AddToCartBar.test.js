import React, { useRef } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import AddToCartBar from "./AddToCartBar";

let observers = [];
class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    observers.push(this);
  }
  observe(target) {
    this.target = target;
  }
  unobserve() {}
  disconnect() {
    observers = observers.filter((o) => o !== this);
  }
}

const Page = (props) => {
  const anchorRef = useRef(null);
  return (
    <>
      <div ref={anchorRef} data-testid="buy-box">
        <button type="button">In the buy box</button>
      </div>
      <AddToCartBar anchorRef={anchorRef} {...props} />
      <a href="#nav" data-testid="covered">
        A link the bar would cover
      </a>
    </>
  );
};

const bar = () => document.querySelector(".bar");
const barButton = () => within(bar()).getByRole("button", { hidden: true });
const setBuyBoxInView = (isIntersecting) =>
  act(() => observers.forEach((o) => o.callback([{ isIntersecting, target: o.target }], o)));

beforeEach(() => {
  observers = [];
  window.IntersectionObserver = MockIntersectionObserver;
});
afterEach(() => {
  delete window.IntersectionObserver;
  jest.useRealTimers();
});

const props = { price: 3449, name: "Covered Plastic Shoe Rack", detail: "5 shelves", image: "https://img.test/a.jpg" };

test("shown, and in the tab order, only while the buy box is out of view", () => {
  render(<Page {...props} onAddToCart={() => {}} />);
  expect(observers).toHaveLength(1);
  expect(observers[0].target).toBe(screen.getByTestId("buy-box"));
  expect(observers[0].options).toEqual({ rootMargin: "0px 0px -10% 0px", threshold: 0 });
  // Hidden until the observer reports.
  expect(bar()).toHaveAttribute("aria-hidden", "true");
  expect(barButton()).toHaveAttribute("tabindex", "-1");

  setBuyBoxInView(false);
  expect(bar()).toHaveAttribute("aria-hidden", "false");
  expect(bar()).toHaveClass("visible");
  expect(barButton()).toHaveAttribute("tabindex", "0");

  setBuyBoxInView(true);
  expect(bar()).toHaveAttribute("aria-hidden", "true");
  expect(barButton()).toHaveAttribute("tabindex", "-1");
});

test("without IntersectionObserver the bar is simply available", () => {
  delete window.IntersectionObserver;
  render(<Page {...props} onAddToCart={() => {}} />);
  expect(bar()).toHaveAttribute("aria-hidden", "false");
});

test("the thumbnail, the name, the price and the chosen option", () => {
  render(<Page {...props} onAddToCart={() => {}} />);
  setBuyBoxInView(false);
  expect(bar().querySelector("img")).toHaveAttribute("src", props.image);
  expect(bar().querySelector("img")).toHaveAttribute("alt", "");
  expect(within(bar()).getByText("Covered Plastic Shoe Rack")).toBeInTheDocument();
  expect(within(bar()).getByText("₹3,449.00")).toBeInTheDocument();
  expect(within(bar()).getByText("5 shelves")).toBeInTheDocument();
});

test("adds and reads Added for 1.4s", () => {
  jest.useFakeTimers();
  const onAddToCart = jest.fn();
  render(<Page {...props} onAddToCart={onAddToCart} />);
  setBuyBoxInView(false);
  fireEvent.click(barButton());
  expect(onAddToCart).toHaveBeenCalledTimes(1);
  expect(barButton()).toHaveTextContent("Added");
  act(() => {
    jest.advanceTimersByTime(1400);
  });
  expect(barButton()).toHaveTextContent("Add to cart");
});

test("sold out: disabled, says so, adds nothing", () => {
  const onAddToCart = jest.fn();
  render(<Page {...props} disabled onAddToCart={onAddToCart} />);
  setBuyBoxInView(false);
  expect(barButton()).toBeDisabled();
  expect(barButton()).toHaveTextContent("Sold out");
  fireEvent.click(barButton());
  expect(onAddToCart).not.toHaveBeenCalled();
});

test("steps aside while keyboard focus sits on something it covers", () => {
  jest.useFakeTimers();
  render(<Page {...props} onAddToCart={() => {}} />);
  setBuyBoxInView(false);
  // jsdom lays nothing out: give the bar its height and the link a place at
  // the bottom of the screen, under the bar.
  Object.defineProperty(bar(), "offsetHeight", { configurable: true, value: 64 });
  const covered = screen.getByTestId("covered");
  covered.getBoundingClientRect = () => ({ top: window.innerHeight - 40, bottom: window.innerHeight - 10, left: 0, right: 100 });
  const clear = screen.getByRole("button", { name: "In the buy box" });
  clear.getBoundingClientRect = () => ({ top: 100, bottom: 140, left: 0, right: 100 });

  act(() => {
    covered.focus();
    jest.runOnlyPendingTimers();
  });
  expect(bar()).toHaveAttribute("aria-hidden", "true");

  act(() => {
    clear.focus();
    jest.runOnlyPendingTimers();
  });
  expect(bar()).toHaveAttribute("aria-hidden", "false");
});
