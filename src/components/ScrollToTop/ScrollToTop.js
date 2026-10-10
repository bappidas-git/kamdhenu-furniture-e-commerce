import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Every new storefront page starts at the top, at once. "instant" overrides
// the root's smooth scroll-behavior (index.css), which in-page anchor links
// keep, so a route change never animates the scroll; a browser that does not
// know "instant" gets the same jump with the smooth rule held off for the call.
export const scrollToTopNow = () => {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  } catch {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previous;
  }
};

// Back and forward: the browser puts the page back where it was left (its
// own scroll restoration, a little after the page renders), and the root's
// smooth scroll-behavior would make that an animated scroll between pages.
// The smooth rule is held off for a moment while that happens.
const RESTORE_WINDOW_MS = 1000;

export const holdSmoothScrollOff = () => {
  const root = document.documentElement;
  root.style.scrollBehavior = "auto";
  const timer = window.setTimeout(() => {
    if (root.style.scrollBehavior === "auto") root.style.scrollBehavior = "";
  }, RESTORE_WINDOW_MS);
  return () => {
    window.clearTimeout(timer);
    if (root.style.scrollBehavior === "auto") root.style.scrollBehavior = "";
  };
};

// The admin's routes keep their scroll as it was (Prompt 30 changes the
// storefront only).
const isAdminPath = (pathname) => pathname === "/admin" || pathname.startsWith("/admin/");

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const lastPathname = useRef(null);

  // Storefront: a new path starts at the top, before paint (a layout effect),
  // so the new page is never drawn at the old page's offset. Back and forward
  // leave the position to the browser's restoration (above), and a replace
  // that only corrects the URL (the product page's legacy-id redirect) leaves
  // the scroll where it is.
  useLayoutEffect(() => {
    if (lastPathname.current === pathname) return;
    const firstPage = lastPathname.current === null;
    lastPathname.current = pathname;
    if (isAdminPath(pathname)) return;
    if (!firstPage && (navigationType === "REPLACE" || navigationType === "POP")) return;
    scrollToTopNow();
  }, [pathname, navigationType]);

  useEffect(() => {
    let release = null;
    const onPopState = () => {
      if (isAdminPath(window.location.pathname)) return;
      if (release) release();
      release = holdSmoothScrollOff();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (release) release();
    };
  }, []);

  // Admin: unchanged.
  useEffect(() => {
    if (isAdminPath(pathname)) window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
