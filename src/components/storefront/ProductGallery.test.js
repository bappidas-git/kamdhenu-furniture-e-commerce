import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PLACEHOLDER_IMG } from "../../utils/helpers";
import ProductGallery, { ProductGallerySkeleton } from "./ProductGallery";

const IMAGES = ["https://img.test/a.jpg", "https://img.test/b.jpg", "https://img.test/c.jpg"];
const frame = () => screen.getByRole("group");
const tabs = () => screen.getAllByRole("tab");
const shown = () => frame().querySelector("img.imageActive");

// jsdom has no PointerEvent: build pointer events with the fields we read.
const pointer = (type, target, init) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, "pointerType", { value: init.pointerType });
  Object.defineProperty(event, "pointerId", { value: init.pointerId ?? 1 });
  fireEvent(target, event);
};

test("stacks every photograph in a 4:5 frame; only the first loads eagerly", () => {
  render(<ProductGallery images={IMAGES} alt="Lobby Set" />);
  const imgs = frame().querySelectorAll("img");
  expect(imgs).toHaveLength(3);
  expect(imgs[0]).toHaveAttribute("loading", "eager");
  expect(imgs[0]).toHaveAttribute("fetchpriority", "high");
  expect(imgs[1]).toHaveAttribute("loading", "lazy");
  expect(imgs[1]).not.toHaveAttribute("fetchpriority");
  imgs.forEach((img) => {
    expect(img).toHaveAttribute("width", "1200");
    expect(img).toHaveAttribute("height", "1500");
  });
  // Only the shown image is named; the others are hidden from assistive tech.
  expect(screen.getByRole("img", { name: "Lobby Set, view 1" })).toBe(imgs[0]);
  expect(imgs[1]).toHaveAttribute("alt", "");
  expect(frame()).toHaveAccessibleName("Lobby Set, image 1 of 3");
});

test("a quiet Sale chip only for a real discount; no percentage badge", () => {
  const { rerender } = render(<ProductGallery images={IMAGES} alt="Rack" discount={14} />);
  expect(within(frame()).getByText("Sale")).toBeInTheDocument();
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  rerender(<ProductGallery images={IMAGES} alt="Rack" discount={0} />);
  expect(screen.queryByText("Sale")).not.toBeInTheDocument();
});

test("thumbnails are a tablist with one tab stop; arrows, Home and End move the selection", () => {
  render(<ProductGallery images={IMAGES} alt="Rack" />);
  expect(screen.getByRole("tablist", { name: "Product images" })).toBeInTheDocument();
  expect(tabs().map((t) => t.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  expect(tabs()[0]).toHaveAttribute("aria-selected", "true");
  expect(tabs()[0]).toHaveAttribute("aria-controls", frame().id);

  tabs()[0].focus();
  fireEvent.keyDown(tabs()[0], { key: "ArrowDown" });
  expect(tabs()[1]).toHaveAttribute("aria-selected", "true");
  expect(tabs()[1]).toHaveFocus();
  expect(tabs().map((t) => t.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
  expect(shown()).toHaveAttribute("src", IMAGES[1]);

  fireEvent.keyDown(tabs()[1], { key: "End" });
  expect(tabs()[2]).toHaveFocus();
  fireEvent.keyDown(tabs()[2], { key: "ArrowRight" }); // wraps
  expect(tabs()[0]).toHaveFocus();
  fireEvent.keyDown(tabs()[0], { key: "ArrowLeft" }); // wraps back
  expect(tabs()[2]).toHaveFocus();
  fireEvent.keyDown(tabs()[2], { key: "Home" });
  expect(tabs()[0]).toHaveAttribute("aria-selected", "true");
});

test("a click or a hover on a thumbnail shows its photograph", () => {
  render(<ProductGallery images={IMAGES} alt="Rack" />);
  fireEvent.click(tabs()[2]);
  expect(shown()).toHaveAttribute("src", IMAGES[2]);
  fireEvent.mouseEnter(tabs()[1]);
  expect(shown()).toHaveAttribute("src", IMAGES[1]);
  expect(frame()).toHaveAccessibleName("Rack, image 2 of 3");
});

test("the frame's Left and Right arrow keys step through the photographs, wrapping", () => {
  render(<ProductGallery images={IMAGES} alt="Rack" />);
  expect(frame()).toHaveAttribute("tabindex", "0");
  fireEvent.keyDown(frame(), { key: "ArrowLeft" });
  expect(shown()).toHaveAttribute("src", IMAGES[2]);
  fireEvent.keyDown(frame(), { key: "ArrowRight" });
  expect(shown()).toHaveAttribute("src", IMAGES[0]);
  fireEvent.keyDown(frame(), { key: "ArrowRight" });
  expect(shown()).toHaveAttribute("src", IMAGES[1]);
});

test("hover-zoom follows a mouse only, and resets when it leaves", () => {
  render(<ProductGallery images={IMAGES} alt="Rack" />);
  frame().getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 500, right: 400, bottom: 500 });

  pointer("pointermove", frame(), { pointerType: "touch", clientX: 100, clientY: 100 });
  expect(shown().style.transform).toBe("");

  pointer("pointermove", frame(), { pointerType: "mouse", clientX: 100, clientY: 250 });
  expect(shown().style.transform).toBe("scale(2)");
  expect(shown().style.transformOrigin).toBe("25% 50%");

  fireEvent.pointerLeave(frame());
  expect(shown().style.transform).toBe("");
});

test("no zoom when it is switched off", () => {
  render(<ProductGallery images={IMAGES} alt="Rack" zoom={false} />);
  frame().getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 500, right: 400, bottom: 500 });
  pointer("pointermove", frame(), { pointerType: "mouse", clientX: 100, clientY: 250 });
  expect(shown().style.transform).toBe("");
});

test("a horizontal swipe on a touch screen steps through the photographs", () => {
  render(<ProductGallery images={IMAGES} alt="Rack" />);
  pointer("pointerdown", frame(), { pointerType: "touch", clientX: 300, clientY: 200 });
  pointer("pointerup", frame(), { pointerType: "touch", clientX: 220, clientY: 210 });
  expect(shown()).toHaveAttribute("src", IMAGES[1]);
  // A mostly vertical drag (a scroll) or a short one is not a swipe.
  pointer("pointerdown", frame(), { pointerType: "touch", clientX: 300, clientY: 200 });
  pointer("pointerup", frame(), { pointerType: "touch", clientX: 250, clientY: 320 });
  pointer("pointerdown", frame(), { pointerType: "touch", clientX: 300, clientY: 200 });
  pointer("pointerup", frame(), { pointerType: "touch", clientX: 280, clientY: 200 });
  expect(shown()).toHaveAttribute("src", IMAGES[1]);
  // Back with a swipe to the right.
  pointer("pointerdown", frame(), { pointerType: "touch", clientX: 100, clientY: 200 });
  pointer("pointerup", frame(), { pointerType: "touch", clientX: 200, clientY: 200 });
  expect(shown()).toHaveAttribute("src", IMAGES[0]);
});

test("one photograph: no strip, and the frame is not a tab stop", () => {
  render(<ProductGallery images={[IMAGES[0]]} alt="Rack" discount={10} />);
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  expect(frame()).not.toHaveAttribute("tabindex");
  expect(frame()).toHaveAccessibleName("Rack");
  expect(screen.getByRole("img", { name: "Rack" })).toBeInTheDocument();
});

test("no photographs: the placeholder", () => {
  render(<ProductGallery images={[]} alt="Rack" />);
  expect(screen.getByRole("img", { name: "Rack" })).toHaveAttribute("src", PLACEHOLDER_IMG);
});

test("a new set of photographs starts again from the first", () => {
  const { rerender } = render(<ProductGallery images={IMAGES} alt="Rack" />);
  fireEvent.click(tabs()[2]);
  rerender(<ProductGallery images={["https://img.test/x.jpg", "https://img.test/y.jpg"]} alt="Chair" />);
  expect(shown()).toHaveAttribute("src", "https://img.test/x.jpg");
  expect(tabs()[0]).toHaveAttribute("aria-selected", "true");
});

test("fit: cover by default, contain on request", () => {
  const { container, rerender } = render(<ProductGallery images={IMAGES} alt="Rack" />);
  expect(container.firstChild).not.toHaveClass("contain");
  rerender(<ProductGallery images={IMAGES} alt="Rack" fit="contain" />);
  expect(container.firstChild).toHaveClass("contain");
});

test("the skeleton holds the frame and strip, hidden from assistive technology", () => {
  const { container } = render(<ProductGallerySkeleton />);
  expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  expect(container.querySelectorAll(".thumbSkeleton")).toHaveLength(3);
  expect(container.querySelector(".frameSkeleton")).toBeInTheDocument();
});
