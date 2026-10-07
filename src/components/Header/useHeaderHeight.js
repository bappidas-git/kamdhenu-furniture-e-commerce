import { useLayoutEffect, useRef } from "react";

// =============================================================================
// useHeaderHeight — publishes the storefront header's height as a CSS variable
// =============================================================================
//
// CONTRACT (prompts/BUILD_LOG.md, Prompt 07): `--sf-header-height` on <html>
// is the height of the header currently covering the top of the viewport. It
// follows the header as it compacts on scroll and as the department row wraps,
// so page code never hardcodes a header height:
//   • sticky elements:  top: calc(var(--sf-header-height) + 24px);
//   • anchor targets:   scroll-margin-top: calc(var(--sf-header-height) + 16px);
//   • JS offsets:       getComputedStyle(document.documentElement)
//                         .getPropertyValue("--sf-header-height")
// storefront-tokens.css declares a 0px default for the first frame and for
// pages without the header.
//
// The header compacts by sliding up (a transform), so its box keeps its size;
// the visible height is the box height minus how far it has slid. A
// ResizeObserver catches size changes (breakpoints, a wrapping department
// row) before paint, and while the slide animates the value is re-measured on
// every frame, so sticky elements follow the header's edge exactly.
//
// The hook returns a ref holding the latest height in px: a ref, not state,
// so per-frame updates never re-render the header (and the drawers and modals
// it mounts).
// =============================================================================

const HEADER_HEIGHT_VAR = "--sf-header-height";

const useHeaderHeight = (headerRef) => {
  const heightRef = useRef(0);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;
    const root = document.documentElement;
    let frame = 0;
    let sliding = false;

    const measure = () => {
      const rect = header.getBoundingClientRect();
      // A negative top is the part slid out of view while compact.
      const px = Math.round(rect.height + Math.min(0, rect.top));
      if (px === heightRef.current) return;
      heightRef.current = px;
      root.style.setProperty(HEADER_HEIGHT_VAR, `${px}px`);
    };

    const tick = () => {
      measure();
      frame = sliding ? window.requestAnimationFrame(tick) : 0;
    };

    const isSlide = (event) => event.target === header && event.propertyName === "transform";
    const onSlideStart = (event) => {
      if (!isSlide(event)) return;
      sliding = true;
      if (!frame) frame = window.requestAnimationFrame(tick);
    };
    const onSlideEnd = (event) => {
      if (!isSlide(event)) return;
      sliding = false;
      measure();
    };

    heightRef.current = -1;
    measure();

    header.addEventListener("transitionrun", onSlideStart);
    header.addEventListener("transitionend", onSlideEnd);
    header.addEventListener("transitioncancel", onSlideEnd);

    // A class change with no transition to report (none configured) still
    // gets measured on the next frame.
    const classObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => window.requestAnimationFrame(measure))
        : null;
    if (classObserver) classObserver.observe(header, { attributes: true, attributeFilter: ["class"] });

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (resizeObserver) resizeObserver.observe(header);

    return () => {
      header.removeEventListener("transitionrun", onSlideStart);
      header.removeEventListener("transitionend", onSlideEnd);
      header.removeEventListener("transitioncancel", onSlideEnd);
      if (classObserver) classObserver.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      root.style.removeProperty(HEADER_HEIGHT_VAR);
    };
  }, [headerRef]);

  return heightRef;
};

export default useHeaderHeight;
