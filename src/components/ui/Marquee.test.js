import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Marquee from "./Marquee";

const PHRASES = ["Made for living", "Chosen with care", "Comfort that lasts"];

afterEach(() => {
  jest.restoreAllMocks();
});

test("gives screen readers the phrases once, as a plain list", () => {
  render(<Marquee items={PHRASES} />);
  const lists = screen.getAllByRole("list");
  expect(lists).toHaveLength(1);
  expect(within(lists[0]).getAllByRole("listitem").map((li) => li.textContent)).toEqual(PHRASES);
});

test("hides the moving track, which repeats the phrases, from assistive technology", () => {
  const { container } = render(<Marquee items={PHRASES} />);
  const track = container.querySelector('[aria-hidden="true"]');
  expect(track).toBeInTheDocument();
  // Two identical halves (two copies each by default) make the loop seamless.
  const text = track.textContent;
  PHRASES.forEach((phrase) => {
    expect(text.split(phrase)).toHaveLength(5);
  });
  // Nothing in the track can take focus.
  expect(track.querySelector("a, button, [tabindex]")).toBeNull();
});

test("one pass through the phrases takes `speed` seconds at any width", () => {
  // A 1000px viewport and 300px phrase sets: four copies per half.
  jest.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 300 });
  const { container } = render(<Marquee items={PHRASES} speed={45} />);
  const track = container.querySelector('[aria-hidden="true"]').firstElementChild;
  expect(track.style.getPropertyValue("--marquee-duration")).toBe(`${45 * 4}s`);
  expect(track.textContent.split(PHRASES[0])).toHaveLength(9);
});

test("falls back to 60 seconds for a missing or invalid speed", () => {
  const { container } = render(<Marquee items={PHRASES} speed={-3} />);
  const track = container.querySelector('[aria-hidden="true"]').firstElementChild;
  expect(track.style.getPropertyValue("--marquee-duration")).toBe("120s");
});

test("can be paused and played again with its control", () => {
  const { container } = render(<Marquee items={PHRASES} />);
  const root = container.firstElementChild;
  const pause = screen.getByRole("button", { name: "Pause the moving text" });
  const before = root.className;
  fireEvent.click(pause);
  const play = screen.getByRole("button", { name: "Play the moving text" });
  expect(play).toBe(pause);
  expect(root.className).not.toBe(before);
  fireEvent.click(play);
  expect(screen.getByRole("button", { name: "Pause the moving text" })).toBeInTheDocument();
  expect(root.className).toBe(before);
});

test.each([
  ["no phrases", []],
  ["blank phrases", ["", "  "]],
  ["no list", undefined],
])("renders nothing with %s", (_, items) => {
  const { container } = render(<Marquee items={items} />);
  expect(container).toBeEmptyDOMElement();
});
