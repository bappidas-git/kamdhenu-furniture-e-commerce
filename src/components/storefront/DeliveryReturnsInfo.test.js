import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import DeliveryReturnsInfo from "./DeliveryReturnsInfo";

const METHODS = [
  { id: 1, name: "Standard Delivery", rateType: "flat", flatRate: 499, freeAbove: 9999, estimatedDays: "7-10", isActive: true },
  { id: 2, name: "Express Delivery", rateType: "flat", flatRate: 999, freeAbove: null, estimatedDays: "3-5", isActive: true },
  { id: 3, name: "Same Day Delivery", rateType: "flat", flatRate: 1499, freeAbove: null, estimatedDays: "0", isActive: false },
];
const SETTINGS = {
  store: { taxIncluded: false, taxRate: 18 },
  payment: { codEnabled: true, codMaxOrder: 50000 },
};
const rows = () => within(screen.getByRole("list")).getAllByRole("listitem");

test("a serif heading over the facts: methods, COD, returns and tax", () => {
  render(<DeliveryReturnsInfo shipping={METHODS} settings={SETTINGS} returnsWindowDays={7} />);
  expect(screen.getByRole("heading", { level: 2, name: "Delivery & returns" })).toBeInTheDocument();
  expect(rows().map((li) => li.textContent.replace(/\s+/g, " "))).toEqual([
    "Standard Delivery, 7–10 business days, ₹499.00, Free above ₹9,999.00",
    "Express Delivery, 3–5 business days, ₹999.00",
    "Cash on Delivery available on orders up to ₹50,000.00",
    "7-day returns on eligible pieces",
    "Taxes calculated at checkout (18% GST)",
  ]);
});

test("only what the data backs: no COD while it is off, no returns at 0 days, inclusive tax", () => {
  render(
    <DeliveryReturnsInfo
      shipping={[{ id: 9, name: "Free Shipping", rateType: "free", flatRate: 0, estimatedDays: "0" }]}
      settings={{ store: { taxIncluded: true }, payment: { codEnabled: false } }}
      returnsWindowDays={0}
    />
  );
  expect(rows().map((li) => li.textContent.replace(/\s+/g, " "))).toEqual([
    "Free Shipping, Same day, Free",
    "Prices inclusive of all taxes",
  ]);
});

test("nothing at all renders nothing", () => {
  const { container } = render(<DeliveryReturnsInfo shipping={[]} settings={null} returnsWindowDays={0} />);
  expect(container).toBeEmptyDOMElement();
});

test("while loading: the heading over skeleton rows, busy", () => {
  const { container } = render(<DeliveryReturnsInfo loading shipping={METHODS} settings={SETTINGS} />);
  expect(screen.getByRole("heading", { name: "Delivery & returns" })).toBeInTheDocument();
  expect(container.firstChild).toHaveAttribute("aria-busy", "true");
  expect(screen.queryByText("Standard Delivery")).not.toBeInTheDocument();
  expect(container.querySelectorAll(".sf-skeleton").length).toBeGreaterThan(0);
});
