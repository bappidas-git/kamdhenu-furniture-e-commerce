import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { LOGO_URLS } from "../../utils/constants";
import styles from "./BrandLogo.module.css";

// Both PNGs are 1286 × 426. Explicit width/height from this ratio reserve the
// box before the image loads, so the logo never shifts layout.
const LOGO_RATIO = 1286 / 426;

// The ThemeContext hook throws outside its provider; an error fallback (the
// ErrorBoundary wraps the providers) may still want the logo, so fall back to
// the body class ThemeContext maintains.
const useIsDarkMode = () => {
  try {
    return useTheme().isDarkMode;
  } catch (e) {
    return typeof document !== "undefined" && document.body.classList.contains("dark");
  }
};

/**
 * The A & S Urbanseat logo, always in the variant that suits its background.
 *
 * variant  "auto" (default) | "light" | "white". "light" is the full-colour
 *          artwork for light backgrounds, "white" the one-colour artwork for
 *          dark ones. "auto" follows `onDark`, or the theme when omitted
 *          (dark mode → white).
 * onDark   auto mode only: true when the logo sits on a dark surface (navy
 *          footer, photo scrim) regardless of the theme, false on a light one.
 * height   rendered height in px (default 40; minimum 28, see DESIGN_SYSTEM.md).
 * priority eager-load with fetchpriority="high" (the header logo); otherwise
 *          the image is lazy-loaded.
 * loading  "eager" | "lazy", overriding the default above without touching
 *          the fetch priority: a logo in a hidden section that must be ready
 *          to print (the order invoice) passes "eager", since browsers do not
 *          load a lazy image for printing.
 */
const BrandLogo = ({
  variant = "auto",
  onDark,
  height = 40,
  priority = false,
  loading,
  className,
  ...rest
}) => {
  const isDarkMode = useIsDarkMode();
  const isWhite =
    variant === "white" || (variant === "auto" && (onDark ?? isDarkMode));

  return (
    <img
      {...rest}
      src={isWhite ? LOGO_URLS.white : LOGO_URLS.light}
      alt="A & S Urbanseat"
      width={Math.round(height * LOGO_RATIO)}
      height={height}
      decoding="async"
      loading={loading || (priority ? "eager" : "lazy")}
      // React 18.2 does not know the camelCase prop; the lowercase attribute
      // passes straight through to the DOM.
      fetchpriority={priority ? "high" : undefined}
      // The forced-colours backplate (BrandLogo.module.css) follows the artwork.
      data-logo-variant={isWhite ? "white" : "light"}
      className={className ? `${styles.logo} ${className}` : styles.logo}
    />
  );
};

export default BrandLogo;
