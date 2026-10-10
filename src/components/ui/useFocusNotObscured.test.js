import { revealFromLayers } from "./useFocusNotObscured";

// jsdom has no layout: these tests give each element a box and answer
// elementFromPoint from those boxes, top layer first (what a browser does).

const VIEWPORT = window.innerHeight; // 768 in jsdom

const box = (element, top, height, left = 0, width = 300) => {
  element.getBoundingClientRect = () => ({
    top,
    bottom: top + height,
    left,
    right: left + width,
    width,
    height,
    x: left,
    y: top,
  });
};

const make = (parent, style = {}) => {
  const element = document.createElement("div");
  Object.assign(element.style, style);
  parent.appendChild(element);
  return element;
};

// Stacked from the top: the first box containing the point wins.
let stack = [];
const hitAt = (x, y) => {
  const hit = stack.find((element) => {
    const r = element.getBoundingClientRect();
    return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
  });
  return hit || document.body;
};

beforeEach(() => {
  document.elementFromPoint = jest.fn(hitAt);
  window.scrollBy = jest.fn();
});

afterEach(() => {
  delete document.elementFromPoint;
  document.body.innerHTML = "";
  stack = [];
});

const page = () => {
  const header = make(document.body, { position: "sticky" });
  box(header, 0, 64, 0, 1024);
  const bar = make(document.body, { position: "fixed" });
  box(bar, VIEWPORT - 56, 56, 0, 1024);
  const main = make(document.body);
  box(main, 64, 2000, 0, 1024);
  return { header, bar, main };
};

test("a control under the header comes down below it, with 16px to spare", () => {
  const { header, bar, main } = page();
  const control = make(main);
  box(control, 20, 44);
  stack = [header, bar, control, main];
  expect(revealFromLayers(control)).toBe(20 - (64 + 16));
  expect(window.scrollBy).toHaveBeenCalledWith({ top: -60, left: 0, behavior: "instant" });
});

test("a control under the bottom bar comes up above it", () => {
  const { header, bar, main } = page();
  const control = make(main);
  box(control, VIEWPORT - 40, 44);
  stack = [header, bar, control, main];
  const lower = VIEWPORT - 56 - 16;
  expect(revealFromLayers(control)).toBe(VIEWPORT - 40 + 44 - lower);
});

test("a control resting just below the header, but not under it, stays put", () => {
  const { header, bar, main } = page();
  const control = make(main);
  box(control, 70, 44);
  stack = [header, bar, control, main];
  expect(revealFromLayers(control)).toBe(0);
  expect(window.scrollBy).not.toHaveBeenCalled();
});

test("focus inside a fixed layer or a dialog is never moved", () => {
  const { header, bar, main } = page();
  const inBar = make(bar);
  box(inBar, VIEWPORT - 50, 44);
  const dialog = make(main);
  dialog.setAttribute("aria-modal", "true");
  const inDialog = make(dialog);
  box(inDialog, 10, 44);
  stack = [header, bar, inBar, inDialog, main];
  expect(revealFromLayers(inBar)).toBe(0);
  expect(revealFromLayers(inDialog)).toBe(0);
  expect(window.scrollBy).not.toHaveBeenCalled();
});

test("a sticky rail pushed under the header at the end of its run is scrolled back out", () => {
  const { header, bar, main } = page();
  const rail = make(main, { position: "sticky" });
  box(rail, 40, 48, 0, 1024);
  const link = make(rail);
  box(link, 40, 48, 0, 120);
  stack = [header, bar, link, rail, main];
  // Its own layer does not count; the header does.
  expect(revealFromLayers(link)).toBe(40 - (64 + 16));
});

test("a sticky rail resting against the header is left alone", () => {
  const { header, bar, main } = page();
  const rail = make(main, { position: "sticky" });
  box(rail, 64, 48, 0, 1024);
  const link = make(rail);
  box(link, 64, 48, 0, 120);
  stack = [header, bar, link, rail, main];
  expect(revealFromLayers(link)).toBe(0);
});

test("does nothing without layout (no elementFromPoint, as in jsdom)", () => {
  delete document.elementFromPoint;
  const control = make(document.body);
  box(control, 10, 44);
  expect(revealFromLayers(control)).toBe(0);
  expect(window.scrollBy).not.toHaveBeenCalled();
});
