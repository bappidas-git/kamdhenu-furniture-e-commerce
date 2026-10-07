import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { STOREFRONT_CONFIG, TRUST_BADGE_CATALOG } from "../../theme/tokens";
import TRUST_ICONS from "./trustIcons";
import TrustBadges from "./TrustBadges";

test("renders the configured badges, each with its shared outline icon", () => {
  render(<TrustBadges settings={{ payment: { codEnabled: true } }} shipping={[]} />);
  const items = within(screen.getByRole("list", { name: "Our promises" })).getAllByRole("listitem");
  expect(items.map((item) => item.querySelector("span:last-child span").textContent)).toEqual(
    STOREFRONT_CONFIG.trustBadges.map((id) => TRUST_BADGE_CATALOG[id].label)
  );
  items.forEach((item, index) => {
    const { icon } = TRUST_BADGE_CATALOG[STOREFRONT_CONFIG.trustBadges[index]];
    expect(TRUST_ICONS[icon]).toBeDefined();
    expect(item.querySelector("svg").childElementCount).toBeGreaterThan(0);
  });
});

test("dynamic sub-labels come from live data", () => {
  const { rerender } = render(<TrustBadges ids={["cod", "freeShipping"]} settings={{ payment: { codEnabled: true } }} shipping={[{ freeAbove: 9999 }]} />);
  expect(screen.getByText("Available")).toBeInTheDocument();
  expect(screen.getByText("Above ₹9,999")).toBeInTheDocument();
  rerender(<TrustBadges ids={["cod", "freeShipping"]} settings={{ payment: { codEnabled: false } }} shipping={[]} />);
  expect(screen.queryByText("Available")).not.toBeInTheDocument();
  expect(screen.queryByText(/Above/)).not.toBeInTheDocument();
});
