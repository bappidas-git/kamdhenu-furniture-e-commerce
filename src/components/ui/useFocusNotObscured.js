import { useEffect } from "react";

// =============================================================================
// useFocusNotObscured — keyboard focus is never hidden under a sticky layer
// =============================================================================
//
// WCAG 2.4.11 (Focus Not Obscured). The storefront's sticky header (and, up
// to 768px, the fixed bottom bar and the product page's sticky bar) sits over
// the page. When Tab or Shift+Tab lands on a control that the browser
// considers "in view" but that lies under one of those layers, the browser
// does not scroll, and the control can end up entirely hidden (the listing's
// sort under the header, "Move to cart" under the bottom bar).
//
// After a keyboard focus move, once the browser's own scrolling has settled,
// this finds the band of the window that the fixed and sticky layers leave
// free (below those stacked at the top, above those at the bottom) and, if a
// layer covers the focused element or the browser left it partly outside the
// window, scrolls just enough to bring it into that band, with 16px to spare
// for the focus ring. Instantly: the browser's own focus scroll is a jump too.
// A second look, once the header has finished compacting or expanding and
// any scroll reveal around the element has finished rising, corrects what
// moved since.
//
// Why not `scroll-padding` on the root (WCAG technique C43): Chromium then
// also "reveals" controls inside the sticky header itself, scrolling the page
// up by the padding whenever focus enters the header (measured: 300px). The
// anchors' scroll-margins (DESIGN_SYSTEM §17.2) stay as they are.
//
// Only keyboard focus moves count (the last input was a key, not a pointer),
// and never focus inside a fixed layer (the bars, the drawers) or a dialog:
// those never scroll with the page. Focus inside a sticky one (the header,
// the product page's section nav, the sticky rails) treats that layer as its
// own and only looks for others: a rail pushed under the header at the end of
// its run is scrolled back out, a rail resting against the header is left
// alone. Installed once, by SkipLink (storefront only; the admin never
// mounts it).
// =============================================================================

const SPARE = 16; // px between a layer's edge and the focused element
// The longest wait for the page (and, on the second look, the element) to
// settle: a scroll reveal rises over --sf-duration-reveal (0.9s) after up to
// 7 stagger steps.
const MAX_FRAMES = 120;
// Still frames that count as settled: the root's smooth scrolling can start a
// frame or two after the focus moves.
const STILL_FRAMES = 4;

const positionOf = (element) => window.getComputedStyle(element).position;

// The fixed or sticky layer an element belongs to, or null.
const layerOf = (element) => {
  for (let node = element; node && node !== document.body; node = node.parentElement) {
    const position = positionOf(node);
    if (position === "fixed" || position === "sticky") return node;
  }
  return null;
};

// The layer covering point (x, y) above `target`, or null when the target,
// its own layer (`own`) or in-flow content is what is there.
const coveringLayer = (target, own, x, y) => {
  if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) return null;
  const hit = document.elementFromPoint(x, y);
  if (!hit || hit === target || target.contains(hit) || hit.contains(target)) return null;
  const layer = layerOf(hit);
  return layer === own ? null : layer;
};

// The free band at column x: below the layers stacked at the top of the
// window (the header, then the listing's phone toolbar or the product page's
// section nav under it) and above those at the bottom (the bottom bar, the
// sticky add-to-cart bar). Found from the window's edges inward, so it does
// not depend on where the focused element is (even outside the window).
const MAX_STACK = 4;
const freeBand = (target, own, x) => {
  const viewport = window.innerHeight;
  let top = 0;
  for (let i = 0, y = 1; i < MAX_STACK && y < viewport / 2; i++) {
    const layer = coveringLayer(target, own, x, y);
    if (!layer) break;
    top = Math.max(top, layer.getBoundingClientRect().bottom);
    y = Math.ceil(top) + 1;
  }
  let bottom = viewport;
  for (let i = 0, y = viewport - 2; i < MAX_STACK && y > viewport / 2; i++) {
    const layer = coveringLayer(target, own, x, y);
    if (!layer) break;
    bottom = Math.min(bottom, layer.getBoundingClientRect().top);
    y = Math.floor(bottom) - 1;
  }
  return { top, bottom };
};

/**
 * Scroll the window so `target` sits in the band the fixed and sticky layers
 * leave free (see freeBand), with SPARE px on each side. A control the
 * browser left partly outside the window counts too. Returns the distance
 * scrolled (0 when nothing hid it).
 */
export const revealFromLayers = (target) => {
  if (!target || !target.isConnected || target === document.body) return 0;
  // jsdom (the tests) has no layout to measure.
  if (typeof document.elementFromPoint !== "function") return 0;
  if (target.closest('[aria-modal="true"], .swal2-container')) return 0;
  const own = layerOf(target);
  if (own && positionOf(own) === "fixed") return 0;
  const rect = target.getBoundingClientRect();
  if (!rect.width && !rect.height) return 0;
  const viewport = window.innerHeight;
  const x = Math.min(Math.max(rect.left + rect.width / 2, 1), window.innerWidth - 1);
  const band = freeBand(target, own, x);
  // The free band's edges: SPARE px inside any layer (none at a bare edge).
  const upper = band.top > 0 ? band.top + SPARE : 0;
  const lower = band.bottom < viewport ? band.bottom - SPARE : viewport;
  if (rect.top >= upper && rect.bottom <= lower) return 0;
  // Only when a layer actually covers it, or it is partly outside the window:
  // a control resting within SPARE px of a layer's edge stays where it is.
  const covered =
    coveringLayer(target, own, x, Math.round(rect.top + 2)) ||
    coveringLayer(target, own, x, Math.round(rect.bottom - 2)) ||
    rect.top < 0 ||
    rect.bottom > viewport;
  if (!covered) return 0;
  let delta = 0;
  if (rect.top < upper) {
    delta = rect.top - upper; // up: below the top layers
  } else if (rect.bottom > lower) {
    // Down: above the bottom layers, but never so far that its top goes
    // under the top ones (a control taller than the band keeps its top).
    delta = Math.min(rect.bottom - lower, rect.top - upper);
  }
  if (Math.abs(delta) < 1) return 0;
  window.scrollBy({ top: delta, left: 0, behavior: "instant" });
  return delta;
};

// The second look (below) comes after the header's compaction, which runs
// over --sf-duration (320ms).
const RECHECK_MS = 400;

// True while a scroll reveal around `element` has yet to start (Reveal waits
// at opacity 0 for its stagger delay before it rises).
const awaitingReveal = (element) => {
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
    if (window.getComputedStyle(node).opacity === "0") return true;
  }
  return false;
};

export default function useFocusNotObscured() {
  useEffect(() => {
    let keyboard = false;
    let frame = 0;
    let recheck = 0;

    // Call `then` once the page has stopped scrolling for STILL_FRAMES frames
    // (at most MAX_FRAMES), if `target` still has focus. With `motion`,
    // `target` must also hold exactly still (an eased rise creeps by fractions
    // of a pixel at its end), and a scroll reveal around it must have run.
    const whenSettled = (target, then, motion = false) => {
      let lastY = window.scrollY;
      let lastTop = target.getBoundingClientRect().top;
      let still = 0;
      let count = 0;
      const settle = () => {
        const y = window.scrollY;
        const top = target.getBoundingClientRect().top;
        const resting = y === lastY && (!motion || (top === lastTop && !awaitingReveal(target)));
        still = resting ? still + 1 : 0;
        lastY = y;
        lastTop = top;
        if (still < STILL_FRAMES && ++count < MAX_FRAMES) {
          frame = requestAnimationFrame(settle);
        } else if (document.activeElement === target) {
          then();
        }
      };
      frame = requestAnimationFrame(settle);
    };

    const onKeyDown = (event) => {
      if (event.key !== "Shift" && event.key !== "Control" && event.key !== "Alt" && event.key !== "Meta") {
        keyboard = true;
      }
    };
    const onPointerDown = () => {
      keyboard = false;
    };
    const onFocusIn = (event) => {
      if (!keyboard) return;
      const target = event.target;
      cancelAnimationFrame(frame);
      clearTimeout(recheck);
      const startY = window.scrollY;
      whenSettled(target, () => {
        const scrolled = revealFromLayers(target);
        // Any scroll (the browser's or ours) can expand the compact header
        // again near the top of the page, or bring a scroll reveal into view
        // that then rises 20px: look once more when that is over. The first
        // look does not wait for it, so focus is in view at once.
        if (scrolled || window.scrollY !== startY) {
          recheck = setTimeout(() => whenSettled(target, () => revealFromLayers(target), true), RECHECK_MS);
        }
      });
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(recheck);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);
}
