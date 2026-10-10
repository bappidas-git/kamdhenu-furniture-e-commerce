import React, { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import VariantSelector from "./VariantSelector";

const SHELVES = [
  { id: "v1", name: "2 shelves", price: 1599, stock: 21, sku: "S-2", attributes: { Shelves: "2 shelves" } },
  { id: "v2", name: "3 shelves", price: 1999, stock: 32, sku: "S-3", attributes: { Shelves: "3 shelves" } },
  { id: "v3", name: "4 shelves", price: 2449, stock: 4, sku: "S-4", attributes: { Shelves: "4 shelves" } },
  { id: "v4", name: "5 shelves", price: 2849, stock: 0, sku: "S-5", attributes: { Shelves: "5 shelves" } },
];
const FINISHES = [
  { id: "v1", name: "Matte Black", price: 2499, stock: 10, sku: "F-B", attributes: { Finish: "Matte Black" }, swatchHex: "#2a2a2a" },
  { id: "v2", name: "Antique Brass", price: 2499, stock: 0, sku: "F-A", attributes: { Finish: "Antique Brass" }, swatchHex: "#9c7c45" },
  { id: "v3", name: "Sage", price: 2499, stock: 14, sku: "F-S", attributes: { Finish: "Sage" }, swatchHex: "#9aa48a" },
];

// A controlled harness, as the product page uses the selector.
const Harness = ({ variants, initial = 0, onChange }) => {
  const [value, setValue] = useState(variants[initial]);
  return (
    <VariantSelector
      variants={variants}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
};

test("one radiogroup per attribute, named by it, with the chosen value beside the eyebrow", () => {
  render(<Harness variants={SHELVES} />);
  const group = screen.getByRole("radiogroup", { name: "Shelves" });
  expect(within(group).getAllByRole("radio")).toHaveLength(4);
  expect(screen.getByText("Shelves")).toHaveClass("label");
  expect(screen.getByText("2 shelves", { selector: ".chosen" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "2 shelves" })).toHaveAttribute("aria-checked", "true");
  // Non-colour values are .sf-chip pills.
  expect(screen.getByRole("radio", { name: "3 shelves" })).toHaveClass("sf-chip");
});

test("one tab stop per group: the chosen option", () => {
  render(<Harness variants={SHELVES} initial={1} />);
  const tabIndexes = screen.getAllByRole("radio").map((r) => r.getAttribute("tabindex"));
  expect(tabIndexes).toEqual(["-1", "0", "-1", "-1"]);
});

test("arrow keys choose the next or previous option, skipping sold out and wrapping", () => {
  const onChange = jest.fn();
  render(<Harness variants={SHELVES} initial={2} onChange={onChange} />);
  const four = screen.getByRole("radio", { name: "4 shelves" });
  four.focus();
  // 5 shelves is sold out (disabled), so ArrowRight wraps to 2 shelves.
  fireEvent.keyDown(four, { key: "ArrowRight" });
  const two = screen.getByRole("radio", { name: "2 shelves" });
  expect(two).toHaveFocus();
  expect(two).toHaveAttribute("aria-checked", "true");
  expect(onChange).toHaveBeenLastCalledWith(SHELVES[0]);

  fireEvent.keyDown(two, { key: "ArrowLeft" });
  expect(screen.getByRole("radio", { name: "4 shelves" })).toHaveAttribute("aria-checked", "true");
  fireEvent.keyDown(screen.getByRole("radio", { name: "4 shelves" }), { key: "Home" });
  expect(screen.getByRole("radio", { name: "2 shelves" })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("radio", { name: "2 shelves" }), { key: "End" });
  expect(screen.getByRole("radio", { name: "4 shelves" })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("radio", { name: "4 shelves" }), { key: "ArrowDown" });
  expect(screen.getByRole("radio", { name: "2 shelves" })).toHaveAttribute("aria-checked", "true");
});

test("a sold-out option is disabled, struck and named as sold out", () => {
  render(<Harness variants={SHELVES} />);
  const five = screen.getByRole("radio", { name: "5 shelves (sold out)" });
  expect(five).toBeDisabled();
  expect(five).toHaveClass("chipOos");
});

test("colour rows are swatches with the data's colours; sold out is disabled", () => {
  const onChange = jest.fn();
  render(<Harness variants={FINISHES} onChange={onChange} />);
  const black = screen.getByRole("radio", { name: "Matte Black" });
  expect(black).toHaveClass("swatch");
  expect(black).toHaveClass("swatchActive");
  expect(black.querySelector(".swatchChip")).toHaveStyle({ background: "#2a2a2a" });
  expect(screen.getByRole("radio", { name: "Antique Brass (sold out)" })).toBeDisabled();
  const tabStops = () => screen.getAllByRole("radio").map((r) => r.getAttribute("tabindex"));
  expect(tabStops()).toEqual(["0", "-1", "-1"]);
  fireEvent.click(screen.getByRole("radio", { name: "Sage" }));
  expect(onChange).toHaveBeenLastCalledWith(FINISHES[2]);
  expect(screen.getByRole("radio", { name: "Sage" })).toHaveAttribute("aria-checked", "true");
  expect(tabStops()).toEqual(["-1", "-1", "0"]);
});

test("the chosen variant's stock note: only N left, or sold out", () => {
  const { rerender } = render(<VariantSelector variants={SHELVES} value={SHELVES[2]} />);
  expect(screen.getByText("Only 4 left in this option")).toBeInTheDocument();
  rerender(<VariantSelector variants={SHELVES} value={SHELVES[3]} />);
  expect(screen.getByText("This option is sold out")).toBeInTheDocument();
  rerender(<VariantSelector variants={SHELVES} value={SHELVES[1]} />);
  expect(screen.queryByText(/left in this option|sold out/)).not.toBeInTheDocument();
});

test("a choice unavailable with the other attribute stays clickable and snaps to a real variant", () => {
  // Black only in S, Blue only in L.
  const matrix = [
    { id: "a", name: "S / Black", price: 1, stock: 5, attributes: { Size: "S", Colour: "Black" } },
    { id: "b", name: "L / Blue", price: 1, stock: 5, attributes: { Size: "L", Colour: "Blue" } },
  ];
  const onChange = jest.fn();
  render(<Harness variants={matrix} onChange={onChange} />);
  const large = screen.getByRole("radio", { name: /^L \(not available with your other choices/ });
  expect(large).toBeEnabled();
  expect(large).toHaveClass("chipMuted");
  fireEvent.click(large);
  expect(onChange).toHaveBeenLastCalledWith(matrix[1]);
  expect(screen.getByRole("radio", { name: "Blue" })).toHaveAttribute("aria-checked", "true");
});

test("flat variants: one group of chips carrying their price", () => {
  const flat = [
    { id: "x1", name: "Small", price: 999, stock: 3 },
    { id: "x2", name: "Large", price: 1499, stock: 0 },
  ];
  const onChange = jest.fn();
  render(<VariantSelector variants={flat} value={flat[0]} onChange={onChange} />);
  const group = screen.getByRole("radiogroup", { name: "Option" });
  const [small, large] = within(group).getAllByRole("radio");
  expect(small).toHaveAccessibleName("Small , ₹999.00");
  expect(large).toBeDisabled();
  expect(large).toHaveAccessibleName("Large , ₹1,499.00 (sold out)");
  fireEvent.click(small);
  expect(onChange).toHaveBeenCalledWith(flat[0]);
});

test("renders nothing without variants", () => {
  const { container } = render(<VariantSelector variants={[]} />);
  expect(container).toBeEmptyDOMElement();
});
