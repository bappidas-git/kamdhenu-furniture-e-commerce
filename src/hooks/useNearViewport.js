import { useEffect, useState } from "react";

/**
 * Lazy-loading trigger: true once the element comes near the viewport, then
 * true for good. Returns `[ref, near]`; pass `ref` to the element as a
 * callback ref (it may mount later or be replaced; the first element to come
 * near wins).
 *
 * rootMargin  how far outside the viewport counts as near; the default is one
 *             viewport height above and below, so a read can start before
 *             its section scrolls into view (and a section the page opens on,
 *             e.g. after scroll restoration, loads at once)
 *
 * Without IntersectionObserver (very old browsers, tests) it is true at once,
 * so the content still loads.
 */
const useNearViewport = ({ rootMargin = "100% 0px" } = {}) => {
  const [node, setNode] = useState(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return undefined;
    if (typeof window === "undefined" || typeof window.IntersectionObserver !== "function") {
      setNear(true);
      return undefined;
    }
    if (!node) return undefined;
    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, near, rootMargin]);

  return [setNode, near];
};

export default useNearViewport;
