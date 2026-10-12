/* eslint-disable testing-library/no-node-access -- the component writes <head>, which has no roles to query */
import React from "react";
import { act, render } from "@testing-library/react";
import { ThemeContextProvider, useThemeContext } from "../../context/ThemeContext";
import { DARK, LIGHT } from "../../theme/colors";
import BrowserThemeColor, { THEME_COLOR_SELECTOR } from "./BrowserThemeColor";

// The browser's colour follows the storefront's own light/dark switch, not
// only the device's (V2-01, finding F1; fixed by V2-05).

// public/index.html's two tags (src/publicIndex.test.js pins them).
const INDEX_TAGS = [
  { content: LIGHT.background.default, media: "(prefers-color-scheme: light)" },
  { content: DARK.background.default, media: "(prefers-color-scheme: dark)" },
];

let toggleTheme;
const ThemeSwitch = () => {
  ({ toggleTheme } = useThemeContext());
  return null;
};

// A saved theme keeps ThemeContextProvider away from window.matchMedia,
// which jsdom does not implement.
const renderInTheme = (mode) => {
  localStorage.setItem("theme", mode);
  return render(
    <ThemeContextProvider>
      <BrowserThemeColor />
      <ThemeSwitch />
    </ThemeContextProvider>
  );
};

const tags = () => Array.from(document.querySelectorAll(THEME_COLOR_SELECTOR));
const contents = () => tags().map((tag) => tag.getAttribute("content"));

beforeEach(() => {
  INDEX_TAGS.forEach(({ content, media }) => {
    const tag = document.createElement("meta");
    tag.setAttribute("name", "theme-color");
    tag.setAttribute("content", content);
    tag.setAttribute("media", media);
    document.head.appendChild(tag);
  });
});

afterEach(() => {
  tags().forEach((tag) => tag.remove());
  localStorage.clear();
  document.body.className = "";
  document.body.removeAttribute("style");
});

test("both tags take the ground of the mode in use, and follow the switch", () => {
  renderInTheme("dark");
  expect(contents()).toEqual([DARK.background.default, DARK.background.default]);
  act(() => toggleTheme());
  expect(contents()).toEqual([LIGHT.background.default, LIGHT.background.default]);
  // The media queries stay as index.html gave them.
  expect(tags().map((tag) => tag.getAttribute("media"))).toEqual(INDEX_TAGS.map((tag) => tag.media));
});

test("once the storefront unmounts (the admin's routes), index.html's values come back", () => {
  const { unmount } = renderInTheme("light");
  expect(contents()).toEqual([LIGHT.background.default, LIGHT.background.default]);
  unmount();
  expect(contents()).toEqual(INDEX_TAGS.map((tag) => tag.content));
});
