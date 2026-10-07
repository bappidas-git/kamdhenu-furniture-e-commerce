import React from "react";
import { render } from "@testing-library/react";
import renderAccent, { stripAccent } from "./renderAccent";

const html = (node) => render(<h2>{node}</h2>).container.firstChild.innerHTML;

test("wraps the *marked* word in an <em>", () => {
  expect(html(renderAccent("Seating for the way you *live*."))).toBe(
    "Seating for the way you <em>live</em>."
  );
});

test("handles an accent at the start and more than one accent", () => {
  expect(html(renderAccent("*Comfort*, quietly *made*"))).toBe(
    "<em>Comfort</em>, quietly <em>made</em>"
  );
});

test("returns text without a complete pair unchanged", () => {
  expect(renderAccent("Plain heading")).toBe("Plain heading");
  expect(renderAccent("5 * 3 = 15")).toBe("5 * 3 = 15");
  expect(renderAccent("Empty ** pair")).toBe("Empty ** pair");
});

test("passes non-strings through", () => {
  const node = <span>Already a node</span>;
  expect(renderAccent(node)).toBe(node);
  expect(renderAccent(undefined)).toBeUndefined();
});

test("stripAccent returns plain text", () => {
  expect(stripAccent("Rooms that feel *finished*.")).toBe("Rooms that feel finished.");
  expect(stripAccent("No accent")).toBe("No accent");
});
