import { useEffect } from "react";
import { useThemeContext } from "../../context/ThemeContext";
import { DARK, LIGHT } from "../../theme/colors";

// =============================================================================
// BrowserThemeColor — the browser's own colour follows the storefront's switch
// =============================================================================
//
// public/index.html carries two theme-color tags: the paper for a light device
// and the dark base for a dark one (prompts/DESIGN_SYSTEM.md §12). The
// storefront has its own light/dark switch, though, so a shopper who picked
// the other mode saw a browser bar that did not match the page (V2-01, finding
// F1). While a storefront page is shown, both tags take the ground of the
// mode in use, the colour ThemeContext gives <body>. When the storefront
// unmounts (the admin's routes), each tag gets back the value index.html gave
// it, so the admin keeps its device-based colour as before. App.js mounts this
// inside the storefront's route only, beside StorefrontRoot. Before React
// renders (the loading screen), index.html's tags apply.
// =============================================================================

export const THEME_COLOR_SELECTOR = 'meta[name="theme-color"]';

const BrowserThemeColor = () => {
  const { mode } = useThemeContext();
  useEffect(() => {
    const tags = Array.from(document.querySelectorAll(THEME_COLOR_SELECTOR));
    const original = tags.map((tag) => tag.getAttribute("content"));
    const ground = mode === "dark" ? DARK.background.default : LIGHT.background.default;
    tags.forEach((tag) => tag.setAttribute("content", ground));
    return () => tags.forEach((tag, index) => tag.setAttribute("content", original[index]));
  }, [mode]);
  return null;
};

export default BrowserThemeColor;
