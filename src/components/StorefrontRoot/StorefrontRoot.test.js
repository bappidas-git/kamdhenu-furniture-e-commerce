import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import StorefrontRoot, { STOREFRONT_ATTRIBUTE } from "./StorefrontRoot";

// The storefront marks <html> itself while it is mounted (the follow-up to
// Prompt 32): index.css's reduced-motion rule reads the attribute instead of
// an html:has(> body:not(.admin-area)) rule, which restyled the whole page on
// every element added to it.
test("marks <html> while mounted, and only then", () => {
  const root = document.documentElement;
  expect(STOREFRONT_ATTRIBUTE).toBe("data-sf-storefront");
  expect(root).not.toHaveAttribute(STOREFRONT_ATTRIBUTE);
  const { unmount } = render(<StorefrontRoot />);
  expect(root).toHaveAttribute(STOREFRONT_ATTRIBUTE, "");
  // No class: SweetAlert's [class^=swal2] rule reads <html>'s class.
  expect(root.className).toBe("");
  unmount();
  expect(root).not.toHaveAttribute(STOREFRONT_ATTRIBUTE);
});
