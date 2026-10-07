import React from "react";

// One accent word per display headline is marked in copy as *word*
// (DESIGN_SYSTEM.md, "The accent-italic rule"). The heading styles the <em>:
// italic serif, caramel from display-md up.
const ACCENT = /\*([^*]+)\*/;
const ACCENT_ALL = /\*([^*]+)\*/g;

/**
 * Renders "Seating for the way you *live*." as text with the marked run in an
 * <em>. Returns an array of strings and keyed <em> elements, ready to drop
 * into JSX. Anything without a complete *pair* (and anything that is not a
 * string) comes back unchanged.
 */
const renderAccent = (text) => {
  if (typeof text !== "string" || !ACCENT.test(text)) return text;
  return text
    .split(ACCENT)
    .map((part, index) => (index % 2 ? <em key={index}>{part}</em> : part))
    .filter((part) => part !== "");
};

/** The same copy as plain text (for aria-label, document titles, alt text). */
export const stripAccent = (text) =>
  typeof text === "string" ? text.replace(ACCENT_ALL, "$1") : text;

export default renderAccent;
