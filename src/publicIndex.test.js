/* eslint-disable testing-library/no-node-access -- a parsed file, not a rendered component */
import fs from "fs";
import path from "path";
import { DARK, LIGHT } from "./theme/colors";

// public/index.html's two V2-01 repairs, pinned (V2-01, finding F7; added by
// V2-05). Browsers use the first theme-color tag whose media matches, so the
// light tag names its scheme too, or the dark tag is never chosen. Without
// JavaScript the splash never leaves, so a <noscript> style hides it and the
// "enable JavaScript" message shows.

const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
const doc = new DOMParser().parseFromString(html, "text/html");

test("each theme-color tag names its scheme: the paper for light, the dark base for dark", () => {
  const tags = Array.from(doc.querySelectorAll('meta[name="theme-color"]')).map((tag) => ({
    content: tag.getAttribute("content"),
    media: tag.getAttribute("media"),
  }));
  expect(tags).toEqual([
    { content: LIGHT.background.default, media: "(prefers-color-scheme: light)" },
    { content: DARK.background.default, media: "(prefers-color-scheme: dark)" },
  ]);
});

test("without JavaScript the splash is hidden, so the noscript message shows", () => {
  // Whether the parser reads <noscript> as markup or as text, its CSS is in
  // its text.
  const headStyles = Array.from(doc.head.querySelectorAll("noscript")).map((noscript) =>
    noscript.textContent
      .replace(/<\/?style>/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
  expect(headStyles).toContain("#loading-screen { display: none; }");
  expect(doc.getElementById("loading-screen")).not.toBeNull();
  expect(doc.body.querySelector("noscript").textContent).toBe(
    "You need to enable JavaScript to run this app."
  );
});
