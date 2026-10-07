import React, { createContext, useState, useContext, useEffect, useMemo } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { LIGHT, DARK, BASELINE_BODY } from "../theme/colors";
import { TOKENS } from "../theme/tokens";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeContextProvider");
  }
  return context;
};

// Alias for useTheme to match naming convention
export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeContextProvider");
  }
  return { mode: context.isDarkMode ? "dark" : "light", toggleTheme: context.toggleTheme };
};

// Small icon buttons (admin table actions, input adornments, dialog controls)
// keep their compact desktop density but get a padded ≥40px hit area on
// touch-sized screens. Shared by the light and dark themes.
const iconButtonTouchOverrides = {
  sizeSmall: {
    "@media (max-width: 768px)": {
      padding: 11,
    },
  },
};

// ---------------------------------------------------------------------------
// Storefront component overrides: the few MUI controls the storefront shell
// renders, styled to match the .sf-* primitives in storefront-base.css. Every
// value is a --sf-* custom property, so the overrides flip with body.dark,
// collapse with the reduced-motion duration tokens and carry no colour
// literals. Identical for both modes. The admin has its own ThemeProvider
// (adminTheme.js), so none of this reaches it.
// ---------------------------------------------------------------------------
const sf = (token) => `var(--sf-${token})`;
const transitionOf = (...props) =>
  props.map((prop) => `${prop} ${sf("duration")} ${sf("ease-out")}`).join(", ");

// The ripple is off (colour-only feedback), so keyboard focus gets the ring.
const focusRing = {
  outline: "2px solid transparent",
  outlineOffset: 2,
  boxShadow: sf("shadow-focus"),
};

// Menus and popovers: surface, hairline, soft shadow, sharp corners.
const floatingPaper = {
  backgroundColor: sf("color-surface"),
  color: sf("color-text"),
  border: sf("hairline"),
  borderRadius: sf("radius-sm"),
  boxShadow: sf("shadow-sm"),
};

const storefrontComponents = {
  MuiButtonBase: {
    defaultProps: { disableRipple: true },
    styleOverrides: {
      root: { "&.Mui-focusVisible": focusRing },
    },
  },
  // .sf-btn: contained = primary (ink, navy on hover), outlined = ghost,
  // text = link (accent underline on hover).
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: ({ ownerState }) => ({
        minHeight: TOKENS.tapTarget,
        padding: `0 ${TOKENS.space[5]}px`,
        borderRadius: sf("radius-sm"),
        fontFamily: sf("font-sans"),
        fontSize: sf("text-sm"),
        lineHeight: sf("leading-tight"),
        transition: `${transitionOf("background-color", "border-color", "color", "text-decoration-color")}, transform ${sf("duration-fast")} ${sf("ease-out")}`,
        "&:active": { transform: "scale(0.99)" },
        // Repeated here: disableElevation clears the focus box-shadow.
        "&.Mui-focusVisible": focusRing,
        "&.Mui-disabled": { opacity: 0.5 },
        ...(ownerState.color === "primary" &&
          ownerState.variant === "contained" && {
            "&, &.Mui-disabled": {
              backgroundColor: sf("color-primary"),
              color: sf("color-primary-contrast"),
            },
            "&:hover": {
              backgroundColor: sf("color-primary-hover"),
              "@media (hover: none)": { backgroundColor: sf("color-primary") },
            },
          }),
        ...(ownerState.color === "primary" &&
          ownerState.variant === "outlined" && {
            "&, &:hover, &.Mui-disabled": {
              borderColor: sf("color-primary"),
              color: sf("color-primary"),
            },
            "&:hover": {
              backgroundColor: sf("color-primary-soft"),
              "@media (hover: none)": { backgroundColor: "transparent" },
            },
          }),
        ...(ownerState.variant === "text" && {
          minHeight: 0,
          padding: 0,
          minWidth: 0,
          textDecorationLine: "underline",
          textDecorationColor: sf("color-border"),
          textDecorationThickness: 1,
          textUnderlineOffset: "0.3em",
          "&:hover": {
            backgroundColor: "transparent",
            textDecorationLine: "underline",
            textDecorationColor: sf("color-accent"),
            "@media (hover: none)": { textDecorationColor: sf("color-border") },
          },
          ...(ownerState.color === "primary" && {
            "&, &.Mui-disabled": { color: sf("color-text") },
          }),
        }),
      }),
      sizeSmall: { minHeight: 36, padding: `0 ${TOKENS.space[4]}px` },
      sizeLarge: {
        minHeight: 52,
        padding: `0 ${TOKENS.space[8]}px`,
        fontSize: sf("text-base"),
      },
    },
  },
  // 44px hit area (24px icon + 10px padding), ink, sand on hover.
  MuiIconButton: {
    styleOverrides: {
      root: ({ ownerState }) => ({
        ...(ownerState.size === "medium" && { padding: 10 }),
        borderRadius: sf("radius-sm"),
        transition: transitionOf("background-color", "color"),
        ...(ownerState.color === "default" && { color: sf("color-text") }),
        "&:hover": {
          backgroundColor: sf("color-sand"),
          "@media (hover: none)": { backgroundColor: "transparent" },
        },
      }),
      ...iconButtonTouchOverrides,
    },
  },
  // .sf-count: a small ink disc with paper digits, whatever the color prop.
  MuiBadge: {
    styleOverrides: {
      badge: {
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: sf("radius-pill"),
        backgroundColor: sf("color-primary"),
        color: sf("color-primary-contrast"),
        fontFamily: sf("font-sans"),
        fontSize: 10,
        fontWeight: sf("font-semibold"),
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      },
      dot: { minWidth: 8, width: 8, height: 8, padding: 0 },
    },
  },
  // Initials as a serif monogram on sand, inside a hairline.
  MuiAvatar: {
    styleOverrides: {
      root: {
        border: sf("hairline"),
        fontFamily: sf("font-display"),
        fontWeight: sf("font-normal"),
      },
      colorDefault: {
        backgroundColor: sf("color-sand"),
        color: sf("color-text"),
      },
    },
  },
  MuiPopover: {
    styleOverrides: { paper: floatingPaper },
  },
  MuiMenu: {
    styleOverrides: {
      paper: floatingPaper,
      list: { paddingBlock: TOKENS.space[2] },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: ({ theme }) => ({
        minHeight: TOKENS.tapTarget,
        [theme.breakpoints.up("sm")]: { minHeight: TOKENS.tapTarget },
        gap: TOKENS.space[3],
        padding: `0 ${TOKENS.space[4]}px`,
        fontFamily: sf("font-sans"),
        fontSize: sf("text-sm"),
        color: sf("color-text"),
        transition: transitionOf("background-color"),
        "&:hover, &.Mui-focusVisible": { backgroundColor: sf("color-sand") },
        "&.Mui-focusVisible": { boxShadow: `inset 0 0 0 2px ${sf("color-focus")}` },
        "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: sf("color-accent-soft") },
      }),
    },
  },
  MuiDivider: {
    styleOverrides: { root: { borderColor: sf("color-border") } },
  },
  // Solid surface (no translucency) over the navy overlay.
  MuiDrawer: {
    styleOverrides: {
      root: { "& > .MuiBackdrop-root": { backgroundColor: sf("color-overlay") } },
      paper: {
        backgroundColor: sf("color-surface"),
        color: sf("color-text"),
        boxShadow: sf("shadow-lg"),
      },
    },
  },
  // .sf-input: border-strong boundary, radius sm, 1px accent border + ring on focus.
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: sf("radius-sm"),
        backgroundColor: sf("color-surface"),
        fontFamily: sf("font-sans"),
        transition: transitionOf("box-shadow"),
        "& .MuiOutlinedInput-notchedOutline": { borderColor: sf("color-border-strong") },
        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: sf("color-text-muted") },
        "&.Mui-focused": { boxShadow: sf("shadow-focus") },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderWidth: 1,
          borderColor: sf("color-accent"),
        },
        "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: sf("color-error") },
        "&.Mui-disabled": { backgroundColor: sf("color-sand") },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        "& .MuiInputLabel-root": { color: sf("color-text-muted") },
        "& .MuiInputLabel-root.Mui-focused": { color: sf("color-accent-text") },
        "& .MuiInputLabel-root.Mui-error": { color: sf("color-error") },
      },
    },
  },
  // .sf-chip: 32px hairline pill; filled = sand, primary = ink (selected).
  MuiChip: {
    styleOverrides: {
      root: ({ ownerState }) => ({
        height: 32,
        borderRadius: sf("radius-pill"),
        fontFamily: sf("font-sans"),
        fontSize: sf("text-sm"),
        transition: transitionOf("background-color", "border-color", "color"),
        ...(ownerState.color === "default" && {
          color: sf("color-text"),
          ...(ownerState.variant === "filled"
            ? { backgroundColor: sf("color-sand") }
            : { border: sf("hairline") }),
          "&.MuiChip-clickable:hover": {
            backgroundColor: ownerState.variant === "filled" ? sf("color-stone") : "transparent",
            borderColor: sf("color-primary"),
          },
        }),
        ...(ownerState.color === "primary" && {
          border: `1px solid ${sf("color-primary")}`,
          backgroundColor: sf("color-primary"),
          color: sf("color-primary-contrast"),
          "&.MuiChip-clickable:hover": { backgroundColor: sf("color-primary-hover") },
        }),
      }),
      label: { paddingInline: TOKENS.space[4] },
    },
  },
  // Sand blocks; the wave (not the pulse) and none under reduced motion.
  MuiSkeleton: {
    defaultProps: { animation: "wave" },
    styleOverrides: {
      root: { backgroundColor: sf("color-sand") },
      wave: {
        "@media (prefers-reduced-motion: reduce)": { "&::after": { animation: "none" } },
      },
    },
  },
  // .sf-tabs: hairline strip, eyebrow labels, a 1px ink underline.
  MuiTabs: {
    styleOverrides: {
      root: { minHeight: TOKENS.tapTarget, boxShadow: `inset 0 -1px 0 ${sf("color-border")}` },
      flexContainer: { gap: TOKENS.space[6] },
      indicator: { height: 1, backgroundColor: sf("color-primary") },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        minHeight: TOKENS.tapTarget,
        minWidth: 0,
        padding: `0 ${TOKENS.space[1]}px`,
        fontFamily: sf("font-sans"),
        fontSize: sf("text-eyebrow"),
        fontWeight: sf("font-medium"),
        letterSpacing: sf("tracking-eyebrow"),
        lineHeight: sf("leading-normal"),
        textTransform: "uppercase",
        color: sf("color-text-muted"),
        transition: transitionOf("color"),
        "&:hover, &.Mui-selected": { color: sf("color-text") },
        "&.Mui-focusVisible": {
          boxShadow: "none",
          outline: `2px solid ${sf("color-focus")}`,
          outlineOffset: -2,
        },
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        padding: `${TOKENS.space[1] + 2}px ${TOKENS.space[3] - 2}px`,
        borderRadius: sf("radius-md"),
        backgroundColor: sf("color-primary"),
        color: sf("color-primary-contrast"),
        fontFamily: sf("font-sans"),
        fontSize: sf("text-xs"),
        fontWeight: sf("font-medium"),
        lineHeight: sf("leading-normal"),
      },
      arrow: { color: sf("color-primary") },
    },
  },
};

// <CssBaseline /> (App.js) renders inside this provider but outside the
// admin's own ThemeProviders, so its `body` rule also styles the admin, whose
// page titles inherit that colour and type. Freeze the rule at its
// pre-rebrand output (MUI's default body1 in Inter, plus the old text colour)
// so the admin stays identical; the storefront body takes its colour and font
// from the tokens instead (`body:not(.admin-area)` in index.css).
const baselineBody1 = createTheme({ typography: { fontFamily: TOKENS.type.fontSans } })
  .typography.body1;

const { type } = TOKENS;
const display = (size, leading, fontWeight = type.weight.normal) => ({
  fontFamily: type.fontDisplay,
  fontWeight,
  fontSize: type.size[size],
  lineHeight: type.leading[leading],
  letterSpacing: type.tracking.display,
});

// Storefront MUI theme: palette from colors.js, type from the token scale
// (Playfair Display for h1–h4, Inter for everything else), component
// overrides from storefrontComponents above.
const buildStorefrontTheme = (mode) => {
  const palette = mode === "dark" ? DARK : LIGHT;
  return createTheme({
    palette: {
      mode,
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      background: palette.background,
      text: palette.text,
      divider: palette.divider,
      action: palette.action,
      success: palette.success,
      warning: palette.warning,
      error: palette.error,
      info: palette.info,
    },
    typography: {
      fontFamily: type.fontSans,
      h1: display("display-xl", "display"),
      h2: display("display-lg", "display"),
      h3: display("display-md", "heading"),
      h4: display("display-sm", "heading", type.weight.medium),
      h5: {
        fontSize: type.size.lg,
        fontWeight: type.weight.semibold,
        lineHeight: type.leading.tight,
      },
      h6: {
        fontSize: type.size.base,
        fontWeight: type.weight.semibold,
        lineHeight: type.leading.normal,
      },
      body1: {
        fontSize: type.size.base,
        lineHeight: type.leading.body,
      },
      body2: {
        fontSize: type.size.sm,
        lineHeight: type.leading.normal,
      },
      button: {
        textTransform: "none",
        fontWeight: type.weight.medium,
        letterSpacing: type.tracking.button,
      },
      overline: {
        fontSize: type.size.eyebrow,
        fontWeight: type.weight.medium,
        letterSpacing: type.tracking.eyebrow,
        lineHeight: type.leading.normal,
      },
    },
    shape: {
      borderRadius: TOKENS.radius.sm,
    },
    components: {
      // Keep this pin: it is what keeps the admin's <body> unchanged.
      MuiCssBaseline: {
        styleOverrides: {
          body: { ...baselineBody1, color: BASELINE_BODY[mode].color },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      ...storefrontComponents,
    },
  });
};

export const ThemeContextProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return (
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    document.body.style.backgroundColor = isDarkMode ? DARK.background.default : LIGHT.background.default;

    // Add/remove .dark class on body for CSS selectors
    if (isDarkMode) {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const theme = useMemo(() => buildStorefrontTheme(isDarkMode ? "dark" : "light"), [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};
