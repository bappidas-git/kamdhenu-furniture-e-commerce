// =====================================================================
// STOREFRONT COLOUR PALETTE (MUI layer) — A & S Urbanseat
// =====================================================================
// Mirrors the colour tokens in src/theme/storefront-tokens.css for the
// storefront MUI theme built in src/context/ThemeContext.js. CSS Modules
// read the --sf-* custom properties; MUI reads these objects. Keep the two
// in sync: `node scripts/check-contrast.js` fails when they drift. The
// admin panel has its own theme (adminTheme.js) and is NOT affected by
// changes to this file.
//
// "primary" is the ink (its `dark` shade is the hover: navy), "secondary"
// is the navy, "accent" is the caramel. See prompts/DESIGN_SYSTEM.md.
//
// Gradients are no longer part of the brand: `gradient.*` and
// `bodyBackground` are kept only so existing readers keep working, and
// hold flat colours.
// =====================================================================

// ---------------------
// LIGHT MODE PALETTE
// ---------------------
export const LIGHT = {
  // Ink — primary buttons, links, active states. `dark` = hover (navy).
  primary: {
    main:  "#1c1a17",
    light: "#4d463e",
    dark:  "#0b1f3f",
    contrastText: "#faf7f2",
  },
  // Navy — the deep brand surface (MUI derives light/dark from main).
  secondary: {
    main:  "#0b1f3f",
    contrastText: "#faf7f2",
  },
  // Caramel — `main` for large display text and UI, `text` for small text.
  accent: {
    main: "#ae773d",
    text: "#8a5d2e",
    contrastText: "#1c1a17",
  },
  // Page (paper) and component (surface) backgrounds
  background: {
    default: "#faf7f2",
    paper:   "#ffffff",
  },
  // Text colors
  text: {
    primary:   "#1c1a17",
    secondary: "#4d463e",
  },
  divider: "#d9d0c3",
  action: {
    hover:    "rgba(28, 26, 23, 0.06)",
    selected: "rgba(174, 119, 61, 0.12)",
  },
  success: { main: "#2f6b46" },
  warning: { main: "#975f05" },
  error:   { main: "#a2382b" },
  info:    { main: "#3c5a80" },
  // Legacy keys — flat colours, no gradients.
  gradient: {
    primary:        "#1c1a17",
    primaryReverse: "#0b1f3f",
    hero:           "#0b1f3f",
  },
  bodyBackground: "#faf7f2",
};

// ---------------------
// DARK MODE PALETTE
// ---------------------
export const DARK = {
  primary: {
    main:  "#f3eee6",
    light: "#cfc6b9",
    dark:  "#ffffff",
    contrastText: "#0a1426",
  },
  secondary: {
    main:  "#0b1f3f",
    contrastText: "#faf7f2",
  },
  accent: {
    main: "#ddb185",
    text: "#e8c9a2",
    contrastText: "#0a1426",
  },
  background: {
    default: "#0a1426",
    paper:   "#111d34",
  },
  text: {
    primary:   "#f3eee6",
    secondary: "#cfc6b9",
  },
  divider: "rgba(243, 238, 230, 0.14)",
  action: {
    hover:    "rgba(243, 238, 230, 0.08)",
    selected: "rgba(221, 177, 133, 0.14)",
  },
  success: { main: "#7fbf95" },
  warning: { main: "#e9a94f" },
  error:   { main: "#ec9483" },
  info:    { main: "#9db4d6" },
  gradient: {
    primary:        "#f3eee6",
    primaryReverse: "#ffffff",
    hero:           "#0b1f3f",
  },
  bodyBackground: "#0a1426",
};

// ---------------------------------------------------------------------
// SHARED BASELINE — not a storefront colour, do not use in components.
// <CssBaseline /> (App.js) is built from the storefront MUI theme but also
// styles the admin's <body>, and admin page titles inherit its colour.
// ThemeContext pins that rule to these pre-rebrand values so the admin
// stays pixel-identical; the storefront body takes its colour from the
// tokens instead (`body:not(.admin-area)` in index.css).
// ---------------------------------------------------------------------
export const BASELINE_BODY = {
  light: { color: "#1a202c" },
  dark:  { color: "#f5f7fa" },
};
