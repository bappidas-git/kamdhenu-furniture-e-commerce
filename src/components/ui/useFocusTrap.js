import { useEffect, useRef, useState } from "react";

// =============================================================================
// useFocusTrap — modal focus management for drawers, sheets and dialogs
// =============================================================================
//
// What a modal layer needs from the keyboard (WAI-ARIA dialog pattern):
//   • on open, focus moves inside: `initialFocusRef`, else the first focusable
//     element, else the container itself (give it tabIndex={-1});
//   • Tab and Shift+Tab cycle inside the container;
//   • Escape calls `onEscape`;
//   • on close (or unmount), focus returns to the element that had it before
//     the layer opened (the hamburger, a "Filters" button…), or to
//     `returnFocusRef` when given.
// Only the most recently opened trap reacts, so a layer opened from inside
// another one owns Tab and Escape until it closes.
//
// The rest of the page is inert while the layer is open (Prompt 31): out of
// reach of the pointer, the keyboard and a screen reader's virtual cursor,
// which `aria-modal="true"` alone does not guarantee in every screen reader.
// What is made inert: the siblings of the container and of each of its
// ancestors up to <body>, except decorative (aria-hidden) ones such as the
// layer's own backdrop, which must still take the closing click, and
// SweetAlert's containers, whose toasts must still be announced. On close,
// inert is lifted before focus goes back to the opener.
//
// Focus is not forcibly pulled back when it lands outside the container:
// a popover or SweetAlert dialog opened from inside the layer renders
// elsewhere in the document and must keep its own focus. Tab still re-enters
// the container when focus has fallen back to <body>.
//
// Companions in this file: useBodyScrollLock(active) locks the page scroll the
// way the storefront's other overlays do (an inline `overflow: hidden` on
// <body>), and useBodyScrollLocked() reports whether any overlay holds that
// lock (BottomNav uses it to stay put, and out of reach, under overlays).
//
// Usage:
//   const panelRef = useRef(null);
//   useFocusTrap(panelRef, { active: open, onEscape: onClose, initialFocusRef: closeRef });
//   useBodyScrollLock(open);
// =============================================================================

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]",
].join(",");

// Another layer above or beside ours (SweetAlert, a portalled MUI popover,
// another dialog): its focus is its own business.
const OTHER_LAYER =
  '[aria-modal="true"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], .swal2-container';

const isVisible = (element) => {
  if (element.closest("[hidden], [inert]")) return false;
  if (typeof element.checkVisibility === "function") {
    return element.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true });
  }
  return true;
};

/** The elements inside `container` that Tab can reach, in DOM order. */
export const getFocusableElements = (container) => {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (element) => element.tabIndex >= 0 && isVisible(element)
  );
};

const focusElement = (element) => {
  if (element && typeof element.focus === "function") element.focus({ preventScroll: true });
};

// Open traps, oldest first; only the last one handles keys.
const openTraps = [];

// Never made inert: they hold no page content.
const KEEP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "TEMPLATE", "NOSCRIPT"]);

/**
 * Make everything outside `container` inert (see above). Returns the undo:
 * it lifts inert from exactly the elements this call set it on.
 */
export const inertOutside = (container) => {
  const changed = [];
  for (let node = container; node && node !== document.body && node.parentElement; node = node.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (sibling === node || KEEP_TAGS.has(sibling.tagName) || sibling.hasAttribute("inert")) continue;
      if (sibling.getAttribute("aria-hidden") === "true" || sibling.classList.contains("swal2-container")) {
        continue;
      }
      sibling.setAttribute("inert", "");
      changed.push(sibling);
    }
  }
  return () => {
    changed.forEach((element) => element.removeAttribute("inert"));
  };
};

/**
 * @param {{ current: HTMLElement | null }} containerRef  the dialog, drawer or sheet
 * @param {object}   options
 * @param {boolean}  options.active           trap while true (usually the `open` prop)
 * @param {object}  [options.initialFocusRef] ref to focus first
 * @param {object}  [options.returnFocusRef]  ref to focus on close (default: the opener)
 * @param {Function}[options.onEscape]        called on Escape (usually `onClose`)
 * @param {boolean} [options.returnFocus=true] set false to leave focus where it is on close
 */
export default function useFocusTrap(containerRef, options = {}) {
  const { active = false } = options;
  // The latest callbacks and refs, read when an event fires, so a new
  // `onEscape` arrow on every render never re-runs the effect.
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    if (!active) return undefined;
    const trap = {};
    openTraps.push(trap);
    const opener = document.activeElement;
    const isTopmost = () => openTraps[openTraps.length - 1] === trap;

    const container = containerRef.current;
    if (container && !container.contains(document.activeElement)) {
      const initial = latest.current.initialFocusRef && latest.current.initialFocusRef.current;
      focusElement(initial || getFocusableElements(container)[0] || container);
    }
    const restoreOutside = container ? inertOutside(container) : () => {};

    const onKeyDown = (event) => {
      if (!isTopmost() || event.defaultPrevented) return;
      const root = containerRef.current;
      if (!root) return;
      const current = document.activeElement;
      const inside = root.contains(current);
      // Keys typed in another layer (a SweetAlert, a popover) belong to it.
      if (!inside && current && current !== document.body && current.closest(OTHER_LAYER)) return;

      if (event.key === "Escape" || event.key === "Esc") {
        if (latest.current.onEscape) {
          event.preventDefault();
          latest.current.onEscape(event);
        }
        return;
      }
      if (event.key !== "Tab") return;

      const items = getFocusableElements(root);
      if (items.length === 0) {
        event.preventDefault();
        focusElement(root);
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey) {
        if (!inside || current === first || current === root) {
          event.preventDefault();
          focusElement(last);
        }
      } else if (!inside || current === last) {
        event.preventDefault();
        focusElement(first);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const index = openTraps.indexOf(trap);
      if (index !== -1) openTraps.splice(index, 1);
      // Before focus goes back: the opener is in the part made inert.
      restoreOutside();

      const { returnFocus = true, returnFocusRef } = latest.current;
      if (!returnFocus) return;
      const target = (returnFocusRef && returnFocusRef.current) || opener;
      const current = document.activeElement;
      // Only take focus back from our own layer (or from nowhere): never from
      // a layer that has opened in the meantime and focused itself.
      const ours = !current || current === document.body || (container && container.contains(current));
      const outside = target && target !== document.body && !(container && container.contains(target));
      if (ours && outside && target.isConnected) focusElement(target);
    };
  }, [active, containerRef]);
}

/**
 * Lock the page scroll while `active`, restoring the previous inline value on
 * release. The same inline `overflow: hidden` the cart drawer, search and
 * auth modal set, so BottomNav's overlay check sees every layer.
 */
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const { style } = document.body;
    const previous = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = previous;
    };
  }, [active]);
}

const isBodyScrollLocked = () =>
  typeof document !== "undefined" && document.body.style.overflow === "hidden";

/**
 * True while any overlay holds the body scroll lock (inline
 * `overflow: hidden` on <body>), updated as the lock is taken and released.
 */
export function useBodyScrollLocked() {
  const [locked, setLocked] = useState(isBodyScrollLocked);
  useEffect(() => {
    const update = () => setLocked(isBodyScrollLocked());
    update();
    if (typeof MutationObserver === "undefined") return undefined;
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);
  return locked;
}
