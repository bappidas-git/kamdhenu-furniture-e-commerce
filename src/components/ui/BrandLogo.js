import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { LOGO_URLS } from "../../utils/constants";
import styles from "./BrandLogo.module.css";

// Both PNGs are 1286 × 426. Explicit width/height from this ratio reserve the
// box before the image loads, so the logo never shifts layout.
const LOGO_RATIO = 1286 / 426;

// Delivery (Prompt 32): the PNG is 141 KB. Cloudinary resizes it and picks a
// modern format (f_auto: WebP where the browser accepts it; q_auto) when the
// transformation follows /image/upload/, so the logo costs about 13 KB (640px)
// or 25 KB (960px) instead. Every logo on the site, at every pixel density up
// to about 4x, is covered by the 640px file, which public/index.html's
// loading screen also uses, so a visit downloads it once; 960px serves the
// largest at 3x and above. With width descriptors the browser chooses from
// srcSet and never fetches `src`, which stays the original file: browsers
// without srcset show it, and so does a logo whose variant fails to load
// (dropSrcSet).
const UPLOAD_PATH = "/image/upload/";
const VARIANT_WIDTHS = [640, 960];

/** "<640px variant> 640w, <960px variant> 960w" for a Cloudinary upload URL. */
export const logoSrcSet = (url) =>
  typeof url === "string" && url.includes(UPLOAD_PATH)
    ? VARIANT_WIDTHS.map(
        (width) => `${url.replace(UPLOAD_PATH, `${UPLOAD_PATH}f_auto,q_auto,w_${width}/`)} ${width}w`
      ).join(", ")
    : undefined;

// A variant that fails to load gives way to the original file.
const dropSrcSet = (event) => {
  const img = event.currentTarget;
  if (!img.hasAttribute("srcset")) return;
  img.removeAttribute("srcset");
  img.removeAttribute("sizes");
};

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
  const src = isWhite ? LOGO_URLS.white : LOGO_URLS.light;
  const width = Math.round(height * LOGO_RATIO);
  const srcSet = logoSrcSet(src);

  return (
    <img
      {...rest}
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? `${width}px` : undefined}
      onError={dropSrcSet}
      alt="A & S Urbanseat"
      width={width}
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
