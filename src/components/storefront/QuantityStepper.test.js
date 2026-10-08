import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import QuantityStepper from "./QuantityStepper";

const Harness = ({ initial = 1, ...props }) => {
  const [value, setValue] = useState(initial);
  return <QuantityStepper value={value} onChange={setValue} {...props} />;
};

const value = () => screen.getByRole("group", { name: "Quantity" }).querySelector('[aria-live="polite"]');

test("a named group whose figure is a polite live region", () => {
  render(<Harness />);
  expect(screen.getByRole("group", { name: "Quantity" })).toBeInTheDocument();
  expect(value()).toHaveTextContent("1");
  expect(value()).toHaveAttribute("aria-atomic", "true");
});

test("steps between min and max, disabling each end", () => {
  render(<Harness min={1} max={3} />);
  const dec = screen.getByRole("button", { name: "Decrease quantity" });
  const inc = screen.getByRole("button", { name: "Increase quantity" });
  expect(dec).toBeDisabled();
  fireEvent.click(inc);
  fireEvent.click(inc);
  expect(value()).toHaveTextContent("3");
  expect(inc).toBeDisabled();
  expect(inc).toHaveAttribute("title", "No more stock available");
  fireEvent.click(dec);
  expect(value()).toHaveTextContent("2");
});

test("disabled disables both buttons", () => {
  render(<Harness max={5} disabled />);
  expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
});

test("the group's name can be changed", () => {
  render(<QuantityStepper value={2} label="Quantity of Lobby Set" />);
  expect(screen.getByRole("group", { name: "Quantity of Lobby Set" })).toBeInTheDocument();
});
