import db from "../../db.json";
import { formatDate, formatDateIN, getCartSavings, parseSpecifications } from "./helpers";

describe("parseSpecifications", () => {
  test("splits a seeded description into its prose and its specification pairs", () => {
    const armchair = db.products.find((p) => p.slug === "classic-plastic-armchair");
    const { body, specs } = parseSpecifications(armchair.description);

    expect(body.split("\n\n")).toEqual([
      expect.stringMatching(/^The armchair most homes reach for first/),
      expect.stringMatching(/^Moulded in one piece/),
    ]);
    expect(body).not.toMatch(/Specifications/);
    expect(specs).toEqual([
      { key: "Material", value: "Virgin polypropylene" },
      { key: "Finish", value: "Matte" },
      { key: "Seat height", value: "approx. 43 cm" },
      { key: "Overall size", value: "approx. 57 × 54 × 80 cm" },
      { key: "Weight capacity", value: "approx. 100 kg" },
      { key: "Stackable", value: "Yes" },
      { key: "Care", value: "Wipe clean with a damp cloth" },
    ]);
  });

  test("every seeded description gives two paragraphs of prose and 5–7 pairs", () => {
    db.products.forEach((product) => {
      const { body, specs } = parseSpecifications(product.description);
      expect(body.split(/\n\s*\n/)).toHaveLength(2);
      expect(body).not.toMatch(/Specifications:/);
      expect(specs.length).toBeGreaterThanOrEqual(5);
      expect(specs.length).toBeLessThanOrEqual(7);
      specs.forEach(({ key, value }) => {
        expect(key).not.toBe("");
        expect(value).not.toBe("");
      });
    });
  });

  test("splits on '; ' first, then on the first ': ', so a value can hold a colon", () => {
    const { specs } = parseSpecifications(
      "A bed.\n\nSpecifications: Size: 180 × 90 cm; Sizes: Single: 36 × 78 in; Assembly time: 1:30 h"
    );
    expect(specs).toEqual([
      { key: "Size", value: "180 × 90 cm" },
      { key: "Sizes", value: "Single: 36 × 78 in" },
      { key: "Assembly time", value: "1:30 h" },
    ]);
  });

  test("a description without the paragraph comes back whole, with no specs", () => {
    const description = "A sofa for long evenings.\n\nIt seats three.";
    expect(parseSpecifications(description)).toEqual({ body: description, specs: [] });
  });

  test("only the last paragraph is read", () => {
    const description = "Specifications: Material: Teak\n\nA closing line.";
    expect(parseSpecifications(description)).toEqual({ body: description, specs: [] });
  });

  test("a description that is only the paragraph has an empty body", () => {
    expect(parseSpecifications("Specifications: Material: Teak; Finish: Oil")).toEqual({
      body: "",
      specs: [
        { key: "Material", value: "Teak" },
        { key: "Finish", value: "Oil" },
      ],
    });
  });

  test("a paragraph with no pair stays in the prose", () => {
    const description = "A stool.\n\nSpecifications: to follow";
    expect(parseSpecifications(description)).toEqual({ body: description, specs: [] });
  });

  test("tolerates CRLF line endings, extra blank lines, stray semicolons and spacing", () => {
    expect(
      parseSpecifications("First line.\r\n\r\n\r\nSpecifications:  Material:  Teak ; ;Finish: Oil;")
    ).toEqual({
      body: "First line.",
      specs: [
        { key: "Material", value: "Teak" },
        { key: "Finish", value: "Oil" },
      ],
    });
  });

  test("a fragment without 'Key: ' continues the value before it", () => {
    expect(
      parseSpecifications("A chair.\n\nSpecifications: Care: Wipe clean; keep dry; Seat: Cane").specs
    ).toEqual([
      { key: "Care", value: "Wipe clean; keep dry" },
      { key: "Seat", value: "Cane" },
    ]);
  });

  test.each([[undefined], [null], [""], ["   "], [42], [{}]])(
    "%p gives an empty body and no specs",
    (description) => {
      expect(parseSpecifications(description)).toEqual({ body: "", specs: [] });
    }
  );
});

describe("formatDateIN", () => {
  // Noon UTC, so the day is the same in any time zone the tests run in.
  const DATE = "2026-09-25T12:00:00.000Z";

  test("writes the day before the month, as Indian dates read", () => {
    expect(formatDateIN(DATE)).toBe("25 September 2026");
    expect(formatDateIN(DATE, "medium")).toBe("25 September 2026");
    expect(formatDateIN(DATE, "short")).toMatch(/^25 Sept? 2026$/);
    expect(formatDateIN(DATE, "long")).toMatch(/^Friday,? 25 September,? 2026$/);
  });

  test("an unknown format falls back to the medium form, as formatDate's does", () => {
    expect(formatDateIN(DATE, "nonsense")).toBe(formatDateIN(DATE, "medium"));
  });

  test("leaves formatDate (en-US, shared) as it was", () => {
    expect(formatDate(DATE)).toBe("September 25, 2026");
    expect(formatDate(DATE, "short")).toBe("Sep 25, 2026");
  });
});

describe("getCartSavings (Prompt 32)", () => {
  test("adds each line's compare-at saving times its quantity, to the paisa", () => {
    expect(
      getCartSavings([
        { price: 999, comparePrice: 1149, quantity: 3 },
        { price: 699, comparePrice: 0, quantity: 4 },
        { price: 10.1, comparePrice: 10.3, quantity: 3 },
      ])
    ).toBe(450.6);
  });

  test("a line at or above its compare-at price, or without one, saves nothing", () => {
    expect(getCartSavings([{ price: 500, comparePrice: 500, quantity: 2 }])).toBe(0);
    expect(getCartSavings([{ price: 600, comparePrice: 500, quantity: 2 }])).toBe(0);
    expect(getCartSavings([{ price: 600, quantity: 2 }])).toBe(0);
    expect(getCartSavings([])).toBe(0);
    expect(getCartSavings(undefined)).toBe(0);
  });
});
