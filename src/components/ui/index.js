// Storefront UI primitives. Reference: prompts/DESIGN_SYSTEM.md, "Primitives"
// and "Mobile navigation and overlays".
// The .sf-* CSS primitives live in src/theme/storefront-base.css (global).
export { default as BrandLogo } from "./BrandLogo";
export { default as Reveal, staggerDelay } from "./Reveal";
export { default as SectionHeading } from "./SectionHeading";
export { default as renderAccent, stripAccent } from "./renderAccent";
export { default as Marquee } from "./Marquee";
export { default as CountDisc } from "./CountDisc";
export {
  OVERLAY_ENTER,
  OVERLAY_EXIT,
  cssEase,
  overlayBackdropMotion,
  overlayPanelMotion,
  prefersReducedMotion,
} from "./motionPresets";
export {
  default as useFocusTrap,
  getFocusableElements,
  useBodyScrollLock,
  useBodyScrollLocked,
} from "./useFocusTrap";
// The shared bottom sheet keeps its historical folder; exported here too.
export { default as BottomDrawer } from "../BottomDrawer/BottomDrawer";
