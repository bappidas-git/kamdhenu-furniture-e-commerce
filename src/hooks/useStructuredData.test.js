/* eslint-disable testing-library/no-node-access -- the hook writes <head>, which has no roles to query */
import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import useStructuredData, { serializeStructuredData } from "./useStructuredData";

// useStructuredData (Prompt 32): one JSON-LD block in <head> while mounted.

const blocks = () => document.head.querySelectorAll('script[type="application/ld+json"]');

const Page = ({ data, name }) => {
  useStructuredData(data, name);
  return null;
};

beforeEach(() => {
  document.head.innerHTML = "";
});

test("adds the data as JSON-LD in <head>, and removes it on unmount", () => {
  const data = { "@context": "https://schema.org", "@type": "Product", name: "Teak Lounge Chair" };
  const { unmount } = render(<Page data={data} name="product" />);
  expect(blocks()).toHaveLength(1);
  expect(blocks()[0]).toHaveAttribute("data-structured-data", "product");
  expect(JSON.parse(blocks()[0].textContent)).toEqual(data);
  unmount();
  expect(blocks()).toHaveLength(0);
});

test("null adds nothing", () => {
  render(<Page data={null} />);
  expect(blocks()).toHaveLength(0);
});

test("new data replaces the block; the same content in a new object leaves it alone", () => {
  const { rerender } = render(<Page data={{ name: "One" }} />);
  const first = blocks()[0];
  rerender(<Page data={{ name: "One" }} />);
  expect(blocks()[0]).toBe(first);
  rerender(<Page data={{ name: "Two" }} />);
  expect(blocks()).toHaveLength(1);
  expect(JSON.parse(blocks()[0].textContent)).toEqual({ name: "Two" });
});

test("a value cannot close the script element early", () => {
  const json = serializeStructuredData({ name: "</script><script>alert(1)</script>" });
  expect(json).not.toContain("<");
  expect(JSON.parse(json).name).toBe("</script><script>alert(1)</script>");
});
