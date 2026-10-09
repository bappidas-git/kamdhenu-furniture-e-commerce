import fs from "fs";
import path from "path";
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ErrorBoundary, { FALLBACK, fallbackStyles } from "./ErrorBoundary";

// The crash fallback wraps the storefront and the admin. It is styled inline
// with var(--sf-token, fallback): the fallback is the token's own value, for a
// page whose token stylesheet never loaded.

const Boom = () => {
  throw new Error("Broken widget");
};

const originalLocation = window.location;
let consoleError;

beforeEach(() => {
  // React logs every caught error; the boundary logs it too.
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  delete window.location;
  window.location = { reload: jest.fn(), assign: jest.fn() };
});

afterEach(() => {
  consoleError.mockRestore();
  window.location = originalLocation;
  localStorage.clear();
});

// The fallback's one <style> element (hover and focus rules); it has no role.
// eslint-disable-next-line testing-library/no-node-access
const fallbackCss = () => document.querySelector("[data-error-fallback] style").textContent;

const crash = () =>
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>
  );

test("renders its children while nothing throws", () => {
  render(
    <ErrorBoundary>
      <p>All well</p>
    </ErrorBoundary>
  );
  expect(screen.getByText("All well")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("a crash: role=alert, the serif h1, one line, Reload and Go home, the details", () => {
  crash();
  const alert = screen.getByRole("alert");
  expect(within(alert).getByRole("heading", { level: 1, name: "Something went wrong." })).toBeInTheDocument();
  expect(within(alert).getByText(/^This page stopped working\./)).toBeInTheDocument();
  expect(within(alert).getByRole("button", { name: "Reload" })).toHaveAttribute("type", "button");
  expect(within(alert).getByRole("button", { name: "Go home" })).toHaveAttribute("type", "button");
  expect(within(alert).getByText("Error details").tagName).toBe("SUMMARY");
  expect(within(alert).getByText("Error: Broken widget").tagName).toBe("PRE");
  expect(consoleError).toHaveBeenCalledWith("=== CAUGHT ERROR ===", expect.any(Error));
});

test("Reload reloads; Go home navigates to / with a full page load", () => {
  crash();
  fireEvent.click(screen.getByRole("button", { name: "Reload" }));
  expect(window.location.reload).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Go home" }));
  expect(window.location.assign).toHaveBeenCalledWith("/");
});

// jsdom's CSS parser drops var() from colour properties (browsers keep it),
// so the colours are read from the style builder the fallback renders with.
test("light: paper and ink from the tokens, each with the token's light value as its fallback", () => {
  const s = fallbackStyles(FALLBACK.light);
  expect(s.page.background).toBe("var(--sf-color-bg, #faf7f2)");
  expect(s.page.color).toBe("var(--sf-color-text, #1c1a17)");
  expect(s.card.background).toBe("var(--sf-color-surface, #ffffff)");
  expect(s.card.border).toBe("1px solid var(--sf-color-border, #d9d0c3)");
  expect(s.title.fontFamily).toBe("var(--sf-font-display, Georgia, serif)");
  expect(s.primary.background).toBe("var(--sf-color-primary, #1c1a17)");
  expect(s.primary.color).toBe("var(--sf-color-primary-contrast, #faf7f2)");
  expect(s.ghost.background).toBe("transparent");
  expect(s.ghost.border).toBe("1px solid var(--sf-color-primary, #1c1a17)");
  expect(s.primary.minHeight).toBe("var(--sf-tap-target, 44px)");
});

test("dark: the same tokens, with the dark values as fallbacks", () => {
  const s = fallbackStyles(FALLBACK.dark);
  expect(s.page.background).toBe("var(--sf-color-bg, #0a1426)");
  expect(s.page.color).toBe("var(--sf-color-text, #f3eee6)");
  expect(s.primary.background).toBe("var(--sf-color-primary, #f3eee6)");
  expect(s.primary.color).toBe("var(--sf-color-primary-contrast, #0a1426)");
});

test("the saved theme picks the set: isDarkTheme() reads localStorage[\"theme\"]", () => {
  localStorage.setItem("theme", "dark");
  const { unmount } = crash();
  expect(fallbackCss()).toContain("var(--sf-color-focus, #ddb185)");
  unmount();

  localStorage.setItem("theme", "light");
  crash();
  expect(fallbackCss()).toContain("var(--sf-color-focus, #ae773d)");
  expect(screen.getByRole("heading", { level: 1 }).style.fontFamily).toBe("var(--sf-font-display, Georgia, serif)");
});

// The fallback literals must equal the tokens they stand in for. Resolve the
// tokens from storefront-tokens.css itself (light = :root; dark = :root with
// the body.dark overrides), following var() references, so a token that
// changes fails this test until the fallback is updated too.
const resolveTokens = () => {
  const css = fs.readFileSync(path.join(__dirname, "../../theme/storefront-tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const light = {};
  const dark = {};
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const declarations = (body) =>
    [...body.matchAll(/(--sf-[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim().replace(/\s+/g, " ")]);
  // Declaration order: :root, then body.dark, then the shared ":root, body.dark".
  rules.forEach(([, selector, body]) => {
    const selectors = selector.split(",").map((part) => part.trim());
    declarations(body).forEach(([name, value]) => {
      if (selectors.includes(":root")) {
        light[name] = value;
        if (!(name in dark) || selectors.includes("body.dark")) dark[name] = value;
      }
      if (selectors.includes("body.dark")) dark[name] = value;
    });
  });
  const resolve = (map, name, depth = 0) => {
    const value = map[name];
    if (depth > 10 || value == null) return value;
    return value.replace(/var\((--sf-[\w-]+)\)/g, (_, ref) => resolve(map, ref, depth + 1));
  };
  return { light: (name) => resolve(light, name), dark: (name) => resolve(dark, name) };
};

test("every fallback literal is the token's own value, in both modes", () => {
  const tokens = resolveTokens();
  const TOKEN_OF = {
    bg: "--sf-color-bg",
    surface: "--sf-color-surface",
    sand: "--sf-color-sand",
    border: "--sf-color-border",
    text: "--sf-color-text",
    secondary: "--sf-color-text-secondary",
    primary: "--sf-color-primary",
    primaryHover: "--sf-color-primary-hover",
    primaryContrast: "--sf-color-primary-contrast",
    primarySoft: "--sf-color-primary-soft",
    focus: "--sf-color-focus",
  };
  expect(Object.keys(FALLBACK.light).sort()).toEqual(Object.keys(TOKEN_OF).sort());
  expect(Object.keys(FALLBACK.dark).sort()).toEqual(Object.keys(TOKEN_OF).sort());
  Object.entries(TOKEN_OF).forEach(([key, name]) => {
    expect([key, FALLBACK.light[key]]).toEqual([key, tokens.light(name)]);
    expect([key, FALLBACK.dark[key]]).toEqual([key, tokens.dark(name)]);
  });
});

test("neutral: no gradient, no purple, no emoji; focus and hover scoped to the fallback", () => {
  crash();
  expect(screen.getByRole("alert").outerHTML).not.toMatch(/gradient|#667eea|#764ba2|#a855f7|⚠/);
  expect(fallbackCss()).toContain("[data-error-fallback] button:focus-visible");
  expect(fallbackCss()).toContain("var(--sf-color-focus, #ae773d)");
  expect(screen.getByRole("alert")).toHaveAttribute("data-error-fallback");
});
