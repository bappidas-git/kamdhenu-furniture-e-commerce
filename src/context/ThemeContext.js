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
  styleOverrides: {
    sizeSmall: {
      "@media (max-width: 768px)": {
        padding: 11,
      },
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
// (Playfair Display for h1–h4, Inter for everything else). Component
// overrides stay neutral; the final storefront overrides come with the
// global UI primitives.
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
      MuiIconButton: iconButtonTouchOverrides,
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
