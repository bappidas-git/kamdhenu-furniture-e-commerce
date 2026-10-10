import React, { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { TOKENS } from "../../theme/tokens";
import { cssEase } from "../ui/motionPresets";

// =============================================================================
// PageTransition — the storefront's page fade
// =============================================================================
//
// Renders the page area (<main> by default) and fades it in over
// --sf-duration-exit (240ms) with --sf-ease-out each time the route's path
// changes. Opacity only: a rise would fight the instant scroll to the top
// (ScrollToTop). The first page of a visit paints at once (its largest paint
// is the LCP), a replace that only corrects the URL (the product page's
// legacy-id redirect) does not fade a second time, and search or hash changes
// on the same path never fade.
//
// The fade runs on the Web Animations API, started before paint (a layout
// effect), so the new page's first frame is already transparent and nothing
// stays on the element afterwards. Like framer's fades under
// <MotionConfig reducedMotion="user">, it still runs under reduced motion: it
// moves nothing.
//
// Why not exit animations: App.js keeps AnimatePresence mode="wait" around
// <Routes>, but <Routes> is not keyed by location, on purpose, so a page stays
// mounted while only its URL changes (the product page's redirect, the account
// tabs) and no page waits for another to leave.
// =============================================================================

const { durationMs, easeOut } = TOKENS.motion;
const FADE_KEYFRAMES = [{ opacity: 0 }, { opacity: 1 }];
const FADE_TIMING = { duration: durationMs.exit, easing: cssEase(easeOut) };

const PageTransition = ({ as: Component = "main", children, ...rest }) => {
  const ref = useRef(null);
  const fade = useRef(null);
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const lastPathname = useRef(pathname);

  useLayoutEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    const node = ref.current;
    if (navigationType === "REPLACE" || !node || typeof node.animate !== "function") return;
    if (fade.current) fade.current.cancel();
    fade.current = node.animate(FADE_KEYFRAMES, FADE_TIMING);
  }, [pathname, navigationType]);

  return (
    <Component ref={ref} {...rest}>
      {children}
    </Component>
  );
};

export default PageTransition;
