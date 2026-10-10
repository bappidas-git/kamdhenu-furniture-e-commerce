import React from "react";

// Resolve the active theme without depending on React context (this component
// must work even if the provider tree above it failed to render).
const isDarkTheme = () => {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  } catch {
    return false;
  }
};

// -----------------------------------------------------------------------------
// The crash fallback (prompts/DESIGN_SYSTEM.md §38.9). This boundary wraps the
// whole app, the admin included, so the fallback is neutral (paper and ink,
// the storefront's tokens; navy-ink and off-white in dark mode) and imports no
// stylesheet or storefront component.
//
// It is styled inline with the tokens read through var(--token, fallback).
// The fallback after the comma is the token's own value and applies only when
// the token stylesheet never loaded: this UI must still render then. These
// literals are permitted here and nowhere else in src/ (DESIGN_SYSTEM §12 and
// §13). isDarkTheme() picks the light or the dark set, so even without the
// stylesheet the fallback follows the saved theme.
//
// A style attribute cannot express :hover or :focus-visible, so one small
// <style> element, scoped to [data-error-fallback], adds the buttons' hover
// fills and the caramel focus ring.
// -----------------------------------------------------------------------------
export const FALLBACK = {
  light: {
    bg: "#faf7f2",
    surface: "#ffffff",
    sand: "#f1ebe1",
    border: "#d9d0c3",
    text: "#1c1a17",
    secondary: "#4d463e",
    primary: "#1c1a17",
    primaryHover: "#0b1f3f",
    primaryContrast: "#faf7f2",
    primarySoft: "rgba(28, 26, 23, 0.06)",
    focus: "#ae773d",
  },
  dark: {
    bg: "#0a1426",
    surface: "#111d34",
    sand: "rgba(243, 238, 230, 0.06)",
    border: "rgba(243, 238, 230, 0.14)",
    text: "#f3eee6",
    secondary: "#cfc6b9",
    primary: "#f3eee6",
    primaryHover: "#ffffff",
    primaryContrast: "#0a1426",
    primarySoft: "rgba(243, 238, 230, 0.08)",
    focus: "#ddb185",
  },
};

// var(--sf-<name>, <fallback>)
const token = (name, fallback) => `var(--sf-${name}, ${fallback})`;

export const fallbackStyles = (palette) => {
  const button = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: token("tap-target", "44px"),
    padding: "0 20px",
    borderRadius: token("radius-sm", "2px"),
    fontFamily: "inherit",
    fontSize: token("text-sm", "0.875rem"),
    fontWeight: 500,
    letterSpacing: "0.02em",
    lineHeight: 1.25,
    cursor: "pointer",
  };

  return {
    page: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      boxSizing: "border-box",
      background: token("color-bg", palette.bg),
      color: token("color-text", palette.text),
      fontFamily: token("font-sans", "system-ui, sans-serif"),
    },
    card: {
      width: "100%",
      maxWidth: "560px",
      boxSizing: "border-box",
      padding: "clamp(24px, 6vw, 48px)",
      background: token("color-surface", palette.surface),
      border: `1px solid ${token("color-border", palette.border)}`,
      borderRadius: token("radius-md", "4px"),
    },
    title: {
      margin: 0,
      fontFamily: token("font-display", "Georgia, serif"),
      fontSize: token("text-display-md", "2rem"),
      fontWeight: 400,
      lineHeight: 1.1,
      letterSpacing: "-0.015em",
      color: token("color-text", palette.text),
    },
    line: {
      margin: "16px 0 0",
      fontSize: token("text-base", "1rem"),
      lineHeight: 1.6,
      color: token("color-text-secondary", palette.secondary),
    },
    actions: {
      display: "flex",
      flexWrap: "wrap",
      gap: "12px",
      marginTop: "32px",
    },
    primary: {
      ...button,
      border: `1px solid ${token("color-primary", palette.primary)}`,
      background: token("color-primary", palette.primary),
      color: token("color-primary-contrast", palette.primaryContrast),
    },
    ghost: {
      ...button,
      border: `1px solid ${token("color-primary", palette.primary)}`,
      background: "transparent",
      color: token("color-primary", palette.primary),
    },
    details: {
      marginTop: "32px",
      paddingTop: "8px",
      borderTop: `1px solid ${token("color-border", palette.border)}`,
      color: token("color-text-secondary", palette.secondary),
    },
    summary: {
      padding: "12px 0",
      fontSize: token("text-sm", "0.875rem"),
      fontWeight: 500,
      cursor: "pointer",
      userSelect: "none",
    },
    pre: {
      margin: "4px 0 0",
      padding: "16px",
      maxHeight: "240px",
      overflow: "auto",
      borderRadius: token("radius-sm", "2px"),
      background: token("color-sand", palette.sand),
      color: token("color-text", palette.text),
      fontFamily: "monospace",
      fontSize: "0.8125rem",
      lineHeight: 1.5,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },
  };
};

// Hover and keyboard focus, which a style attribute cannot express.
const interactionCss = (palette) => `
[data-error-fallback] button:focus-visible,
[data-error-fallback] summary:focus-visible {
  outline: 2px solid ${token("color-focus", palette.focus)};
  outline-offset: 2px;
}
@media (hover: hover) {
  [data-error-fallback] [data-variant="primary"]:hover {
    background: ${token("color-primary-hover", palette.primaryHover)} !important;
    border-color: ${token("color-primary-hover", palette.primaryHover)} !important;
  }
  [data-error-fallback] [data-variant="ghost"]:hover {
    background: ${token("color-primary-soft", palette.primarySoft)} !important;
  }
}
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("=== CAUGHT ERROR ===", error);
    console.error("Component stack:", info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Full navigation resets the broken React tree, even outside the Router.
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const palette = isDarkTheme() ? FALLBACK.dark : FALLBACK.light;
    const s = fallbackStyles(palette);

    return (
      <div role="alert" data-error-fallback="" style={s.page}>
        <style>{interactionCss(palette)}</style>
        <div style={s.card}>
          <h1 style={s.title}>Something went wrong.</h1>
          <p style={s.line}>
            This page stopped working. Reload to try again, or start again from the home page.
          </p>

          <div style={s.actions}>
            <button type="button" data-variant="primary" onClick={this.handleReload} style={s.primary}>
              Reload
            </button>
            <button type="button" data-variant="ghost" onClick={this.handleGoHome} style={s.ghost}>
              Back to home
            </button>
          </div>

          {this.state.error && (
            <details style={s.details}>
              <summary style={s.summary}>Error details</summary>
              <pre style={s.pre}>{this.state.error.toString()}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
