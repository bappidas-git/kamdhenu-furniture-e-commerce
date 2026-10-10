import {
  OVERLAY_ENTER,
  OVERLAY_EXIT,
  cssEase,
  overlayBackdropMotion,
  overlayPanelMotion,
  prefersReducedMotion,
} from "./motionPresets";

// The overlay presets carry the motion language: in over --sf-duration with
// --sf-ease-out, out over --sf-duration-exit with --sf-ease-in-out; slides
// and rises only with motion allowed, a fade otherwise.

const EASE_OUT = [0.22, 1, 0.36, 1];
const EASE_IN_OUT = [0.65, 0, 0.35, 1];
const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.32, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.24, ease: EASE_IN_OUT } },
};

test("overlays arrive over 320ms with the ease-out curve and leave over 240ms with ease-in-out", () => {
  expect(OVERLAY_ENTER).toEqual({ duration: 0.32, ease: EASE_OUT });
  expect(OVERLAY_EXIT).toEqual({ duration: 0.24, ease: EASE_IN_OUT });
});

test("the backdrop fades", () => {
  expect(overlayBackdropMotion).toEqual(FADE);
});

test.each([
  ["right", { x: "100%" }, { x: 0 }],
  ["left", { x: "-100%" }, { x: 0 }],
  ["bottom", { y: "100%" }, { y: 0 }],
  ["dialog", { opacity: 0, y: 8 }, { opacity: 1, y: 0 }],
  ["menu", { opacity: 0, y: -8 }, { opacity: 1, y: 0 }],
])("%s: from %o to %o, and back the same way", (kind, hidden, shown) => {
  expect(overlayPanelMotion(kind, false)).toEqual({
    initial: hidden,
    animate: { ...shown, transition: OVERLAY_ENTER },
    exit: { ...hidden, transition: OVERLAY_EXIT },
  });
});

test("under reduced motion every kind only fades (no slide, no rise)", () => {
  ["right", "left", "bottom", "dialog", "menu"].forEach((kind) => {
    expect(overlayPanelMotion(kind, true)).toEqual(FADE);
  });
});

test("an unknown kind fades", () => {
  expect(overlayPanelMotion("sideways", false)).toEqual(FADE);
});

test("cssEase writes a cubic-bezier() for CSS, the Web Animations API and MUI", () => {
  expect(cssEase(EASE_OUT)).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
});

describe("prefersReducedMotion", () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  test("reads the OS setting", () => {
    window.matchMedia = jest.fn((query) => ({ matches: query === "(prefers-reduced-motion: reduce)" }));
    expect(prefersReducedMotion()).toBe(true);
    window.matchMedia = jest.fn(() => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);
  });

  test("is false where matchMedia does not exist", () => {
    window.matchMedia = undefined;
    expect(prefersReducedMotion()).toBe(false);
  });
});
