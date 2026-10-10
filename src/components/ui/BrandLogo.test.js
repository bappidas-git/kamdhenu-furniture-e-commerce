import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BrandLogo, { logoSrcSet } from "./BrandLogo";
import { ThemeContextProvider } from "../../context/ThemeContext";
import { LOGO_URLS } from "../../utils/constants";

// A saved theme keeps ThemeContextProvider away from window.matchMedia,
// which jsdom does not implement.
const renderInTheme = (ui, mode = "light") => {
  localStorage.setItem("theme", mode);
  return render(<ThemeContextProvider>{ui}</ThemeContextProvider>);
};

const logo = () => screen.getByAltText("A & S Urbanseat");

afterEach(() => {
  localStorage.clear();
  document.body.className = "";
});

test("auto mode follows the theme", () => {
  const { unmount } = renderInTheme(<BrandLogo />, "light");
  expect(logo()).toHaveAttribute("src", LOGO_URLS.light);
  unmount();
  renderInTheme(<BrandLogo />, "dark");
  expect(logo()).toHaveAttribute("src", LOGO_URLS.white);
});

test("onDark overrides the theme in auto mode", () => {
  const { unmount } = renderInTheme(<BrandLogo onDark />, "light");
  expect(logo()).toHaveAttribute("src", LOGO_URLS.white);
  unmount();
  renderInTheme(<BrandLogo onDark={false} />, "dark");
  expect(logo()).toHaveAttribute("src", LOGO_URLS.light);
});

test("explicit variants ignore the theme", () => {
  const { unmount } = renderInTheme(<BrandLogo variant="light" />, "dark");
  expect(logo()).toHaveAttribute("src", LOGO_URLS.light);
  unmount();
  renderInTheme(<BrandLogo variant="white" />, "light");
  expect(logo()).toHaveAttribute("src", LOGO_URLS.white);
});

test("names its variant for the forced-colours ground (Prompt 31)", () => {
  const { unmount } = renderInTheme(<BrandLogo variant="light" />);
  expect(logo()).toHaveAttribute("data-logo-variant", "light");
  unmount();
  renderInTheme(<BrandLogo variant="white" />);
  expect(logo()).toHaveAttribute("data-logo-variant", "white");
});

test("reserves its box from the 1286 × 426 artwork and lazy-loads by default", () => {
  renderInTheme(<BrandLogo height={28} className="extra" />);
  const img = logo();
  expect(img).toHaveAttribute("width", "85");
  expect(img).toHaveAttribute("height", "28");
  expect(img).toHaveAttribute("decoding", "async");
  expect(img).toHaveAttribute("loading", "lazy");
  expect(img).not.toHaveAttribute("fetchpriority");
  expect(img).toHaveClass("extra");
});

test("priority loads eagerly with high fetch priority", () => {
  renderInTheme(<BrandLogo priority />);
  expect(logo()).toHaveAttribute("loading", "eager");
  expect(logo()).toHaveAttribute("fetchpriority", "high");
  expect(logo()).toHaveAttribute("width", "121");
});

test("loading overrides the default without raising the fetch priority", () => {
  const { unmount } = renderInTheme(<BrandLogo variant="light" height={56} loading="eager" />);
  expect(logo()).toHaveAttribute("loading", "eager");
  expect(logo()).not.toHaveAttribute("fetchpriority");
  expect(logo()).toHaveAttribute("width", "169");
  unmount();
  renderInTheme(<BrandLogo priority loading="lazy" />);
  expect(logo()).toHaveAttribute("loading", "lazy");
  expect(logo()).toHaveAttribute("fetchpriority", "high");
});

test("renders outside the theme provider using the body class", () => {
  document.body.classList.add("dark");
  render(<BrandLogo />);
  expect(logo()).toHaveAttribute("src", LOGO_URLS.white);
});

// Prompt 32: the PNGs are 141 KB (light) and 58 KB (white); Cloudinary serves
// resized WebP copies through srcSet, the 640px one shared with the loading
// screen in public/index.html. `src` stays the original file.
test("offers Cloudinary's resized copies, sized to the logo, and keeps the original as src", () => {
  renderInTheme(<BrandLogo variant="light" height={48} />);
  const img = logo();
  expect(img).toHaveAttribute("src", LOGO_URLS.light);
  expect(img).toHaveAttribute("sizes", "145px");
  expect(img.getAttribute("srcset")).toBe(
    "https://res.cloudinary.com/v8vrixwq/image/upload/f_auto,q_auto,w_640/v1787597119/urbanseat-logo.png 640w, " +
      "https://res.cloudinary.com/v8vrixwq/image/upload/f_auto,q_auto,w_960/v1787597119/urbanseat-logo.png 960w"
  );
});

test("the white logo's copies follow the variant", () => {
  renderInTheme(<BrandLogo variant="white" />);
  expect(logo().getAttribute("srcset")).toContain("f_auto,q_auto,w_640/v1787597119/urbanseat-logo-white.png 640w");
});

test("a copy that fails to load gives way to the original file", () => {
  renderInTheme(<BrandLogo variant="light" />);
  const img = logo();
  fireEvent.error(img);
  expect(img).not.toHaveAttribute("srcset");
  expect(img).not.toHaveAttribute("sizes");
  expect(img).toHaveAttribute("src", LOGO_URLS.light);
});

test("logoSrcSet leaves a URL that is not a Cloudinary upload alone", () => {
  expect(logoSrcSet("/logo.png")).toBeUndefined();
  expect(logoSrcSet("")).toBeUndefined();
  expect(logoSrcSet(undefined)).toBeUndefined();
});
