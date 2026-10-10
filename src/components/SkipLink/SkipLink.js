import React, { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import useFocusNotObscured from "../ui/useFocusNotObscured";

// =============================================================================
// SkipLink — "Skip to content", and where focus goes on a route change
// =============================================================================
//
// The storefront's first focusable element (.sf-skip-link in
// storefront-base.css: off-screen until it has keyboard focus, then an ink tab
// top-left above everything). Activating it moves focus to the page area,
// <main id="main-content" tabIndex={-1}> (App.js), without writing
// "#main-content" into the URL: React Router would treat the hash as a
// navigation, and Back would then only remove it again.
//
// Route changes. On a new path (a link, or back and forward; not a REPLACE
// that only corrects the URL, and not the first page of a visit), focus that
// is not inside <main> moves here, as it would on a full page load: it was
// left on the link just used in the header, footer or bottom bar, or it fell
// to <body> with the page that held it. The next Tab then starts from the top
// of the page, Enter skips to the new content, and a screen reader hears
// "Skip to content", a cue that the page has changed. Keyboard users see the
// tab (:focus-visible); after a click or a tap it stays off-screen. Focus a
// page has already put inside <main> stays there, and a page that focuses its
// heading "from nowhere" on arrival treats this link as nowhere
// (`isFocusUnplaced`). When the link was followed from a drawer or dialog,
// this waits for the layer to close and hand focus back first.
//
// It also installs the keyboard focus guard (useFocusNotObscured): keyboard
// focus is never left hidden under the sticky header or the fixed bars.
// =============================================================================

export const MAIN_CONTENT_ID = "main-content";
// The longest a closing drawer or dialog keeps the route-change focus waiting
// (overlays leave over --sf-duration-exit, 240ms).
const LAYER_WAIT_MS = 1500;

/** True when focus is nowhere a shopper put it: no element, <body>, or this link. */
export const isFocusUnplaced = (element = document.activeElement) =>
  !element || element === document.body || element.classList?.contains("sf-skip-link");

const SkipLink = () => {
  const linkRef = useRef(null);
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const lastPathname = useRef(pathname);

  useFocusNotObscured();

  useEffect(() => {
    if (lastPathname.current === pathname) return undefined;
    lastPathname.current = pathname;
    if (navigationType === "REPLACE") return undefined;
    // A link followed from inside a drawer or dialog: the layer closes on the
    // route change, lifts the page's inert and hands focus back to its opener
    // first (useFocusTrap); this waits for that, at most LAYER_WAIT_MS.
    const started = Date.now();
    let frame = 0;
    const place = () => {
      const link = linkRef.current;
      if (!link) return;
      const layer = document.querySelector('[aria-modal="true"]') || link.closest("[inert]");
      if (layer && Date.now() - started < LAYER_WAIT_MS) {
        frame = requestAnimationFrame(place);
        return;
      }
      const main = document.getElementById(MAIN_CONTENT_ID);
      const active = document.activeElement;
      if (main && active && main.contains(active)) return;
      link.focus({ preventScroll: true });
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [pathname, navigationType]);

  const handleClick = (event) => {
    const main = document.getElementById(MAIN_CONTENT_ID);
    if (!main) return;
    event.preventDefault();
    main.focus();
  };

  return (
    <a ref={linkRef} className="sf-skip-link" href={`#${MAIN_CONTENT_ID}`} onClick={handleClick}>
      Skip to content
    </a>
  );
};

export default SkipLink;
