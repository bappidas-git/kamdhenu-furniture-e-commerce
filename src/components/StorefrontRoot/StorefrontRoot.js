import { useEffect } from "react";

// =============================================================================
// StorefrontRoot — marks <html> while the storefront's routes are mounted
// =============================================================================
//
// <html data-sf-storefront> while a storefront page is shown (App.js mounts
// this inside the storefront's route only, so the admin never has it). The
// root's storefront-only rules key off it: under reduced motion the page
// drops smooth scrolling (index.css), while the admin keeps it.
//
// An attribute set from here, not an html:has(> body:not(.admin-area)) rule
// (the follow-up to Prompt 32): with :has() on <html>, every element added
// anywhere in the page (the cart drawer, a toast) restyled the whole document,
// since a restyle of <html> reaches every element (App.css's scrollbar rule
// gives it a scrollbar of its own). An attribute, not a class: SweetAlert's
// [class^=swal2] rule reads <html>'s class.
// =============================================================================

export const STOREFRONT_ATTRIBUTE = "data-sf-storefront";

const StorefrontRoot = () => {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute(STOREFRONT_ATTRIBUTE, "");
    return () => root.removeAttribute(STOREFRONT_ATTRIBUTE);
  }, []);
  return null;
};

export default StorefrontRoot;
