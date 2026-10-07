import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BrandLogo from "./BrandLogo";
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

test("renders outside the theme provider using the body class", () => {
  document.body.classList.add("dark");
  render(<BrandLogo />);
  expect(logo()).toHaveAttribute("src", LOGO_URLS.white);
});
