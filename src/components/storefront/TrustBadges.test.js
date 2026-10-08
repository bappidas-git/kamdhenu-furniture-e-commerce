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

test("a dynamic badge shows only while the live data backs it", () => {
  render(
    <TrustBadges
      ids={["securePayment", "cod", "freeShipping", "easyReturns"]}
      settings={{ payment: { codEnabled: false } }}
      shipping={[{ freeAbove: 0 }]}
    />
  );
  const items = within(screen.getByRole("list", { name: "Our promises" })).getAllByRole("listitem");
  expect(items.map((item) => item.querySelector(".label").textContent)).toEqual([
    TRUST_BADGE_CATALOG.securePayment.label,
    TRUST_BADGE_CATALOG.easyReturns.label,
  ]);
  expect(screen.queryByText(TRUST_BADGE_CATALOG.cod.label)).not.toBeInTheDocument();
  expect(screen.queryByText(TRUST_BADGE_CATALOG.freeShipping.label)).not.toBeInTheDocument();
});

test("while the data loads, dynamic badges are hidden skeletons and nothing is claimed", () => {
  render(<TrustBadges ids={["securePayment", "cod"]} loading settings={null} shipping={[]} />);
  const list = screen.getByRole("list", { name: "Our promises" });
  expect(list).toHaveAttribute("aria-busy", "true");
  expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  expect(within(list).getByText(TRUST_BADGE_CATALOG.securePayment.label)).toBeInTheDocument();
  expect(screen.queryByText(TRUST_BADGE_CATALOG.cod.label)).not.toBeInTheDocument();
  expect(list.querySelectorAll('li[aria-hidden="true"] .sf-skeleton').length).toBeGreaterThan(0);
});

test("the detail follows the label, separated for screen readers", () => {
  render(<TrustBadges ids={["easyReturns"]} />);
  expect(screen.getByRole("listitem")).toHaveTextContent(
    `${TRUST_BADGE_CATALOG.easyReturns.label}, ${STOREFRONT_CONFIG.returnsWindowDays}-day returns`
  );
});
