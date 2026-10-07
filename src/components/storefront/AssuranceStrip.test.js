import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import { STOREFRONT_CONFIG } from "../../theme/tokens";
import AssuranceStrip, { resolveAssuranceItems } from "./AssuranceStrip";

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    settings: { get: jest.fn() },
    shipping: { getMethods: jest.fn() },
  },
}));

const SHIPPING = [
  { id: 1, freeAbove: 9999 },
  { id: 2, freeAbove: null },
  { id: 3, freeAbove: 0 },
  { id: 4, freeAbove: 24999 },
];
const SETTINGS = { payment: { codEnabled: true } };

const ids = (items) => items.map((item) => item.id);

describe("resolveAssuranceItems", () => {
  const returnsDays = STOREFRONT_CONFIG.returnsWindowDays;
  afterEach(() => {
    STOREFRONT_CONFIG.returnsWindowDays = returnsDays;
  });

  test("shows every item the data backs, in content order", () => {
    const items = resolveAssuranceItems({ settings: SETTINGS, shipping: SHIPPING });
    expect(ids(items)).toEqual(["delivery", "returns", "securePayment", "cod"]);
    expect(items[0].detail).toBe("Above ₹9,999");
    expect(items[1].detail).toBe(`${returnsDays}-day returns on eligible pieces`);
    expect(items.every((item) => item.icon)).toBe(true);
  });

  test("hides delivery without a positive threshold and COD when it is off", () => {
    const items = resolveAssuranceItems({
      settings: { payment: { codEnabled: false } },
      shipping: [{ freeAbove: 0 }, { freeAbove: null }],
    });
    expect(ids(items)).toEqual(["returns", "securePayment"]);
  });

  test("hides returns when the window is 0 days", () => {
    STOREFRONT_CONFIG.returnsWindowDays = 0;
    expect(ids(resolveAssuranceItems({ settings: SETTINGS, shipping: SHIPPING }))).toEqual([
      "delivery",
      "securePayment",
      "cod",
    ]);
  });

  test("keeps only the static items when both fetches failed", () => {
    expect(ids(resolveAssuranceItems())).toEqual(["returns", "securePayment"]);
  });
});

describe("AssuranceStrip", () => {
  test("shows a skeleton, then the list of assurances", async () => {
    apiService.settings.get.mockResolvedValue(SETTINGS);
    apiService.shipping.getMethods.mockResolvedValue(SHIPPING);
    const { container } = render(<AssuranceStrip />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    const list = await screen.findByRole("list", { name: "Our assurances" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(within(list).getByText("Above ₹9,999")).toBeInTheDocument();
    expect(within(list).getByText("Cash on delivery")).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
  });

  test("falls back to the static items when the fetches fail", async () => {
    apiService.settings.get.mockRejectedValue(new Error("offline"));
    apiService.shipping.getMethods.mockRejectedValue(new Error("offline"));
    render(<AssuranceStrip />);
    const list = await screen.findByRole("list", { name: "Our assurances" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).queryByText("Free delivery")).not.toBeInTheDocument();
    expect(within(list).queryByText("Cash on delivery")).not.toBeInTheDocument();
  });
});
