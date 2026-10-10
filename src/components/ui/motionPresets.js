import { TOKENS } from "../../theme/tokens";

// =============================================================================
// motionPresets — the storefront's overlay motion, in one place
// =============================================================================
//
// DESIGN_SYSTEM.md §40.3. Overlays arrive over --sf-duration with --sf-ease-out
// and leave over --sf-duration-exit (240ms) with --sf-ease-in-out, a backdrop
// fading behind them. Under reduced motion a panel only fades: the storefront's
// <MotionConfig reducedMotion="user"> would otherwise skip its transform and
// show it at once.
//
//   overlayBackdropMotion              the backdrop's fade
//   overlayPanelMotion(kind, reduce)   the panel's motion, by kind:
//     "right"   slides in from the right edge (the cart drawer)
//     "left"    slides in from the left edge (the menu)
//     "bottom"  slides up from the bottom edge (the bottom sheet)
//     "dialog"  fades in rising --sf-rise-distance (search, sign-in, review)
//     "menu"    fades in dropping --sf-rise-distance (the mega-menu)
//
// Spread a preset on a motion element inside <AnimatePresence>. The
// transitions travel inside it, so the element needs no transition prop.
// =============================================================================

const { duration, easeOut, easeInOut, riseDistance } = TOKENS.motion;

export const OVERLAY_ENTER = { duration: duration.base, ease: easeOut };
export const OVERLAY_EXIT = { duration: duration.exit, ease: easeInOut };

const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: OVERLAY_ENTER },
  exit: { opacity: 0, transition: OVERLAY_EXIT },
};

export const overlayBackdropMotion = FADE;

const HIDDEN = {
  right: { x: "100%" },
  left: { x: "-100%" },
  bottom: { y: "100%" },
  dialog: { opacity: 0, y: riseDistance },
  menu: { opacity: 0, y: -riseDistance },
};

const SHOWN = {
  right: { x: 0 },
  left: { x: 0 },
  bottom: { y: 0 },
  dialog: { opacity: 1, y: 0 },
  menu: { opacity: 1, y: 0 },
};

export const overlayPanelMotion = (kind, reduceMotion) =>
  reduceMotion || !HIDDEN[kind]
    ? FADE
    : {
        initial: HIDDEN[kind],
        animate: { ...SHOWN[kind], transition: OVERLAY_ENTER },
        exit: { ...HIDDEN[kind], transition: OVERLAY_EXIT },
      };

// A cubic-bezier() string for CSS, the Web Animations API and MUI.
export const cssEase = (curve) => `cubic-bezier(${curve.join(", ")})`;

// The OS setting, read at the moment it is needed (in effects and handlers,
// where the useReducedMotion hook's value would have to become a dependency).
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
