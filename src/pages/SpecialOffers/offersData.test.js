import React from "react";
import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import db from "../../../db.json";
import {
  rupees,
  formatExpiry,
  couponHeadline,
  isCouponValid,
  pickByIds,
  pad,
  computeCountdown,
  useDealsCountdown,
  timeLeftLabel,
  chipContexts,
} from "./offersData";

const NOW = new Date("2026-10-08T12:00:00.000Z");
const coupon = (overrides) => ({
  code: "TEST",
  type: "percentage",
  value: 10,
  isActive: true,
  expiresAt: "2027-01-01T00:00:00.000Z",
  usageLimit: null,
  usedCount: 0,
  ...overrides,
});

// ── Coupon helpers ───────────────────────────────────────────────────────────

test("rupees rounds to whole rupees in Indian grouping", () => {
  expect(rupees(5000)).toBe("₹5,000");
  expect(rupees(150000)).toBe("₹1,50,000");
  expect(rupees("1999.6")).toBe("₹2,000");
  expect(rupees(undefined)).toBe("₹0");
});

test("the expiry reads day, short month and year", () => {
  expect(formatExpiry("2027-03-31T12:00:00.000Z")).toBe("31 Mar 2027");
});

test("the headline is the percentage or the rupee amount", () => {
  expect(couponHeadline({ type: "percentage", value: 20 })).toBe("20%");
  expect(couponHeadline({ type: "fixed", value: 500 })).toBe("₹500");
});

test("a coupon is advertised only while checkout would accept it", () => {
  expect(isCouponValid(coupon(), NOW)).toBe(true);
  expect(isCouponValid(coupon({ isActive: false }), NOW)).toBe(false);
  expect(isCouponValid(coupon({ expiresAt: "2026-10-08T11:59:59.000Z" }), NOW)).toBe(false);
  expect(isCouponValid(coupon({ expiresAt: null }), NOW)).toBe(true);
  expect(isCouponValid(coupon({ usageLimit: 5, usedCount: 5 }), NOW)).toBe(false);
  expect(isCouponValid(coupon({ usageLimit: 5, usedCount: 4 }), NOW)).toBe(true);
  expect(isCouponValid(coupon({ usageLimit: null, usedCount: 900 }), NOW)).toBe(true);
  expect(isCouponValid(null, NOW)).toBeFalsy();
});

test("the seeded coupons: every active, unexpired, unexhausted code", () => {
  const valid = db.coupons.filter((c) => isCouponValid(c, NOW)).map((c) => c.code);
  expect(valid).toEqual(["WELCOME500", "FLAT10", "NEWHOME20", "WORKSPACE15"]);
});

test("pickByIds keeps the admin's order, matches ids loosely and drops the missing", () => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
  expect(pickByIds(items, [3, "1", 99, 2]).map((it) => it.id)).toEqual([3, 1, 2]);
  expect(pickByIds(items, undefined)).toEqual([]);
});

test("pad keeps two digits", () => {
  expect(pad(3)).toBe("03");
  expect(pad(12)).toBe("12");
  expect(pad(240)).toBe("240");
});

// ── Countdown ────────────────────────────────────────────────────────────────

describe("the countdown rules", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 8, 20, 6, 30)); // local 20:06:30
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test("no end date counts down to the end of today", () => {
    expect(computeCountdown({ enabled: true, endAt: "", onExpiry: "endOfDay" })).toEqual({
      show: true,
      ended: false,
      parts: expect.objectContaining({ hours: 3, minutes: 53, seconds: 29 }),
    });
  });

  test("a future end date counts down to it, hours running past 24", () => {
    const endAt = new Date(Date.now() + (3 * 24 + 5) * 3600000 + 7 * 60000).toISOString();
    expect(computeCountdown({ enabled: true, endAt, onExpiry: "hide" }).parts).toEqual(
      expect.objectContaining({ hours: 77, minutes: 7, seconds: 0 })
    );
  });

  test("a past end date ends with onExpiry 'hide' and rolls over with 'endOfDay'", () => {
    const endAt = new Date(Date.now() - 1000).toISOString();
    expect(computeCountdown({ enabled: true, endAt, onExpiry: "hide" })).toEqual({
      show: false,
      ended: true,
      parts: { hours: 0, minutes: 0, seconds: 0 },
    });
    expect(computeCountdown({ enabled: true, endAt, onExpiry: "endOfDay" }).parts.hours).toBe(3);
  });

  test("a switched-off timer neither shows nor ends", () => {
    expect(computeCountdown({ enabled: false, endAt: "", onExpiry: "endOfDay" })).toEqual({
      show: false,
      ended: false,
      parts: { hours: 0, minutes: 0, seconds: 0 },
    });
  });

  test("useDealsCountdown ticks every second and expires live", () => {
    const Probe = ({ timer }) => {
      const { show, ended, parts } = useDealsCountdown(timer);
      return <output>{show ? `${parts.hours}:${parts.minutes}:${parts.seconds}` : ended ? "ended" : "off"}</output>;
    };
    const timer = { enabled: true, endAt: new Date(Date.now() + 3000).toISOString(), onExpiry: "hide" };
    render(<Probe timer={timer} />);
    expect(screen.getByRole("status")).toHaveTextContent("0:0:3");
    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByRole("status")).toHaveTextContent("0:0:2");
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByRole("status")).toHaveTextContent("ended");
  });
});

// ── The timer's accessible name ──────────────────────────────────────────────

test("the summary names hours and minutes only", () => {
  expect(timeLeftLabel({ hours: 5, minutes: 12, seconds: 40 })).toBe("Offers end in 5 hours and 12 minutes");
  expect(timeLeftLabel({ hours: 1, minutes: 1 })).toBe("Offers end in 1 hour and 1 minute");
  expect(timeLeftLabel({ hours: 0, minutes: 12 })).toBe("Offers end in 12 minutes");
  expect(timeLeftLabel({ hours: 3, minutes: 0 })).toBe("Offers end in 3 hours");
  expect(timeLeftLabel({ hours: 0, minutes: 0, seconds: 59 })).toBe("Offers end in less than a minute");
  expect(timeLeftLabel({ hours: 77, minutes: 7 })).toBe("Offers end in 77 hours and 7 minutes");
});

// ── Chip names ───────────────────────────────────────────────────────────────

test("only a repeated chip name gets its parent's name", () => {
  const categories = [
    { id: 1, name: "Office Chairs", parentId: null },
    { id: 20, name: "Essentials", parentId: 1 },
    { id: 24, name: "Premium", parentId: 1 },
    { id: 21, name: "High-Back Chairs", parentId: 20 },
    { id: 25, name: "High-Back Chairs", parentId: 24 },
    { id: 46, name: "Computer Tables", parentId: 6 },
  ];
  const deal = categories.filter((c) => [21, 25, 46].includes(c.id));
  const contexts = chipContexts(deal, categories);
  expect([...contexts.entries()]).toEqual([
    [21, "Essentials"],
    [25, "Premium"],
  ]);
  // A repeated name whose parent is not in the list stays as it is.
  expect(chipContexts(deal, categories.filter((c) => c.id !== 24)).get(25)).toBeUndefined();
});
