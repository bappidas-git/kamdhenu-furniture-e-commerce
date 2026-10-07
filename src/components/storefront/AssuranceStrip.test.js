import React from "react";
import { act, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import { ASSURANCE_ITEMS } from "../../content/brandContent";
import { STOREFRONT_CONFIG } from "../../theme/tokens";
import AssuranceStrip from "./AssuranceStrip";

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    settings: { get: jest.fn() },
    shipping: { getMethods: jest.fn() },
  },
}));

const SETTINGS = { payment: { codEnabled: true, codMaxOrder: 50000 } };
const SHIPPING = [
  { id: 1, name: "Standard Delivery", flatRate: 499, freeAbove: 9999 },
  { id: 2, name: "Express Delivery", flatRate: 999, freeAbove: null },
];
const label = (id) => ASSURANCE_ITEMS.find((item) => item.id === id).label;
const detail = (id) => ASSURANCE_ITEMS.find((item) => item.id === id).detail;

const deferred = () => {
  const handle = {};
  handle.promise = new Promise((resolve, reject) => {
    handle.resolve = resolve;
    handle.reject = reject;
  });
  return handle;
};

const serve = ({ settings = SETTINGS, shipping = SHIPPING } = {}) => {
  const answer = (value) =>
    value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  apiService.settings.get.mockImplementation(() => answer(settings));
  apiService.shipping.getMethods.mockImplementation(() => answer(shipping));
};

// Render and let both reads settle.
const renderStrip = async () => {
  const utils = render(<AssuranceStrip />);
  await screen.findByRole("list", { name: "Our assurances" });
  return utils;
};

const itemTexts = () =>
  within(screen.getByRole("list", { name: "Our assurances" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);

test("shows every backed promise, in content order, with live details", async () => {
  serve();
  await renderStrip();
  expect(itemTexts()).toEqual([
    `${label("delivery")}, Above ₹9,999`,
    `${label("returns")}, ${detail("returns").replace("{days}", STOREFRONT_CONFIG.returnsWindowDays)}`,
    `${label("securePayment")}, ${detail("securePayment")}`,
    `${label("cod")}, ${detail("cod")}`,
  ]);
  expect(apiService.settings.get).toHaveBeenCalledTimes(1);
  expect(apiService.shipping.getMethods).toHaveBeenCalledTimes(1);
});

test("each item carries a decorative outline icon", async () => {
  serve();
  await renderStrip();
  const items = within(screen.getByRole("list", { name: "Our assurances" })).getAllByRole("listitem");
  items.forEach((item) => {
    const svg = item.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "16");
    expect(svg.childElementCount).toBeGreaterThan(0);
  });
});

test("holds its place with a skeleton until both reads settle", async () => {
  const settings = deferred();
  const shipping = deferred();
  apiService.settings.get.mockReturnValue(settings.promise);
  apiService.shipping.getMethods.mockReturnValue(shipping.promise);
  const { container } = render(<AssuranceStrip />);

  const strip = container.firstChild;
  expect(strip).toHaveAttribute("aria-busy", "true");
  expect(container.querySelector(".sf-skeleton")).toHaveAttribute("aria-hidden", "true");
  // The invisible layout copy that reserves the height is not exposed.
  expect(screen.queryByRole("list")).not.toBeInTheDocument();

  await act(async () => settings.resolve(SETTINGS));
  expect(screen.queryByRole("list")).not.toBeInTheDocument();

  await act(async () => shipping.resolve(SHIPPING));
  expect(screen.getByRole("list", { name: "Our assurances" })).toBeInTheDocument();
  expect(strip).not.toHaveAttribute("aria-busy");
  expect(container.querySelector(".sf-skeleton")).toBeNull();
});

test("free delivery uses the lowest positive threshold", async () => {
  serve({
    shipping: [
      { id: 1, freeAbove: 12000 },
      { id: 2, freeAbove: 5000 },
      { id: 3, freeAbove: 0 },
      { id: 4, freeAbove: null },
    ],
  });
  await renderStrip();
  expect(itemTexts()[0]).toBe(`${label("delivery")}, Above ₹5,000`);
});

test("free delivery is hidden when no method has a threshold", async () => {
  serve({ shipping: [{ id: 2, freeAbove: null }, { id: 4, freeAbove: 0 }] });
  await renderStrip();
  expect(screen.queryByText(label("delivery"))).not.toBeInTheDocument();
  expect(itemTexts()).toHaveLength(3);
});

test("cash on delivery shows only while it is enabled", async () => {
  serve({ settings: { payment: { codEnabled: false } } });
  await renderStrip();
  expect(screen.queryByText(label("cod"))).not.toBeInTheDocument();
  expect(itemTexts()).toHaveLength(3);
});

test("easy returns is hidden when the returns window is 0", async () => {
  const days = STOREFRONT_CONFIG.returnsWindowDays;
  STOREFRONT_CONFIG.returnsWindowDays = 0;
  try {
    serve();
    await renderStrip();
    expect(screen.queryByText(label("returns"))).not.toBeInTheDocument();
  } finally {
    STOREFRONT_CONFIG.returnsWindowDays = days;
  }
});

test("a failed read only drops the items that depend on it", async () => {
  serve({ settings: new Error("settings down") });
  await renderStrip();
  expect(screen.queryByText(label("cod"))).not.toBeInTheDocument();
  expect(screen.getByText(label("delivery"))).toBeInTheDocument();
});

test("when both reads fail only the static promises remain", async () => {
  serve({ settings: new Error("settings down"), shipping: new Error("shipping down") });
  await renderStrip();
  expect(itemTexts()).toEqual([
    expect.stringContaining(label("returns")),
    `${label("securePayment")}, ${detail("securePayment")}`,
  ]);
});

test("unmounting before the reads settle is safe", async () => {
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  const settings = deferred();
  const shipping = deferred();
  apiService.settings.get.mockReturnValue(settings.promise);
  apiService.shipping.getMethods.mockReturnValue(shipping.promise);
  const { unmount } = render(<AssuranceStrip />);
  unmount();
  await act(async () => {
    settings.resolve(SETTINGS);
    shipping.resolve(SHIPPING);
  });
  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});
