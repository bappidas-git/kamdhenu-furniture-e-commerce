import { resolveTrustBadgeDetail } from "../../theme/tokens";
import db from "../../../db.json";
import { activeMethods, deliveryEstimate, freeDeliveryThreshold, methodRate } from "./cartDelivery";

const method = (overrides) => ({
  id: 1,
  name: "Standard Delivery",
  rateType: "flat",
  flatRate: 499,
  freeAbove: 9999,
  estimatedDays: "7-10",
  isActive: true,
  ...overrides,
});

const STANDARD = method({ id: 1 });
const EXPRESS = method({ id: 2, name: "Express Delivery", flatRate: 999, freeAbove: null });
const FREE_SHIPPING = method({ id: 4, name: "Free Shipping", rateType: "free", flatRate: 0, freeAbove: 0 });

// The footer, the assurance strip and the product page print this amount.
const resolverAmount = (methods) => {
  const detail = resolveTrustBadgeDetail("freeShipping", { shipping: methods });
  return detail === null ? null : Number(detail.replace(/[^\d]/g, ""));
};

describe("freeDeliveryThreshold", () => {
  test("agrees with resolveTrustBadgeDetail on the seeded methods and on edge cases", () => {
    const seededActive = activeMethods(db.shipping_methods);
    const cases = [
      seededActive,
      [STANDARD, EXPRESS],
      [EXPRESS],
      [method({ freeAbove: 4999 }), method({ id: 3, freeAbove: 12000 })],
      [method({ freeAbove: "14999" })],
      [method({ freeAbove: 0 }), method({ id: 3, freeAbove: -5 })],
      [method({ freeAbove: "not a number" })],
      [],
    ];
    cases.forEach((methods) => {
      expect(freeDeliveryThreshold(methods)).toBe(resolverAmount(methods));
    });
    expect(freeDeliveryThreshold(seededActive)).toBe(9999);
  });

  test("is null for anything but a list", () => {
    expect(freeDeliveryThreshold(null)).toBeNull();
    expect(freeDeliveryThreshold(undefined)).toBeNull();
    expect(freeDeliveryThreshold({ freeAbove: 9999 })).toBeNull();
  });
});

describe("activeMethods", () => {
  test("keeps the active methods of a list, as checkout does", () => {
    expect(activeMethods(db.shipping_methods).map((m) => m.name)).toEqual([
      "Standard Delivery",
      "Express Delivery",
    ]);
    expect(activeMethods([STANDARD, method({ id: 9, isActive: undefined })])).toHaveLength(2);
    expect(activeMethods([null, STANDARD])).toEqual([STANDARD]);
  });

  test("is null when the answer is not a list", () => {
    expect(activeMethods(undefined)).toBeNull();
    expect(activeMethods({ data: [STANDARD] })).toBeNull();
  });
});

describe("methodRate", () => {
  test("follows checkout: free methods cost nothing, otherwise the flat rate", () => {
    expect(methodRate(STANDARD)).toBe(499);
    expect(methodRate(method({ flatRate: "999" }))).toBe(999);
    expect(methodRate(FREE_SHIPPING)).toBe(0);
    expect(methodRate(method({ rateType: "free", flatRate: 250 }))).toBe(0);
    expect(methodRate(method({ flatRate: 0 }))).toBe(0);
  });

  test("is null when the rate is unknown", () => {
    expect(methodRate(method({ flatRate: undefined }))).toBeNull();
    expect(methodRate(method({ flatRate: "abc" }))).toBeNull();
    expect(methodRate(method({ flatRate: -1 }))).toBeNull();
  });
});

describe("deliveryEstimate", () => {
  test("the seeded store: ₹499, free above ₹9,999 (the Standard method)", () => {
    expect(deliveryEstimate(activeMethods(db.shipping_methods))).toEqual({ threshold: 9999, rate: 499 });
  });

  test("the rate is the threshold carrier's, not the lowest", () => {
    const cheapNoThreshold = method({ id: 5, name: "Economy", flatRate: 299, freeAbove: null });
    expect(deliveryEstimate([EXPRESS, cheapNoThreshold, STANDARD])).toEqual({ threshold: 9999, rate: 499 });
  });

  test("the lowest positive threshold wins, with its own method's rate", () => {
    const early = method({ id: 6, flatRate: 799, freeAbove: 4999 });
    expect(deliveryEstimate([STANDARD, early])).toEqual({ threshold: 4999, rate: 799 });
  });

  test("without a threshold: the lowest rate, and no threshold is invented", () => {
    expect(deliveryEstimate([method({ freeAbove: null }), EXPRESS])).toEqual({ threshold: null, rate: 499 });
    expect(deliveryEstimate([EXPRESS])).toEqual({ threshold: null, rate: 999 });
  });

  test("a method that is free at any amount makes delivery free outright", () => {
    expect(deliveryEstimate([STANDARD, EXPRESS, FREE_SHIPPING])).toEqual({ threshold: null, rate: 0 });
    expect(deliveryEstimate([method({ flatRate: 0, freeAbove: 9999 })])).toEqual({ threshold: null, rate: 0 });
  });

  test("an unknown rate stays unknown (never another method's)", () => {
    expect(deliveryEstimate([method({ flatRate: undefined }), EXPRESS])).toEqual({ threshold: 9999, rate: null });
    expect(deliveryEstimate([method({ flatRate: undefined, freeAbove: null })])).toEqual({
      threshold: null,
      rate: null,
    });
  });

  test("nothing to go on: null", () => {
    expect(deliveryEstimate([])).toBeNull();
    expect(deliveryEstimate(null)).toBeNull();
    expect(deliveryEstimate(undefined)).toBeNull();
  });
});
