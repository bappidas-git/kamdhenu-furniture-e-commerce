import React from "react";
import ReactDOM from "react-dom/client";
// First, so a visit that lands on a page loaded on demand starts fetching its
// chunk while the rest of the bundle is evaluated (src/pages/lazyPages.js).
import "./pages/lazyPages";
import "./index.css";
import App from "./App";
import { renderBootError } from "./components/ErrorBoundary/bootError";
import { installStorageFallback } from "./utils/storageFallback";
// import reportWebVitals from "./reportWebVitals";

// Catch any JS errors that occur before or outside React's tree. While #root
// is still empty (React never rendered), show the crash screen the
// ErrorBoundary shows once it has (bootError.js); after that, React's own
// boundary handles render errors and these change nothing.
window.onerror = function (msg, src, line, col, error) {
  renderBootError(document.getElementById("root"), error ? error.stack || String(error) : msg);
};

window.addEventListener("unhandledrejection", function (event) {
  renderBootError(document.getElementById("root"), String(event.reason));
});

// With site data blocked, reading storage throws and the providers' first
// render would fail: such a visit runs on storage kept in memory (V2-05).
installStorageFallback(window);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Signal that React has mounted so the HTML loading screen (public/index.html)
// can fade out. Tying this to the actual mount — rather than an arbitrary
// timer — prevents a flash of unstyled content while React boots, and the
// loader's own fallback timeout guarantees it can never get stuck visible.
//
// React 18 renders after root.render() returns, so the next animation frame
// came before the app had rendered anything: the loader went and the page
// stood empty until the first render landed (about 0.2s on a fast computer,
// most of a second on a mid-range phone). On the storefront the loader now
// leaves in the frame that paints the app's first render: the first time
// #root has content (Prompt 32). The admin keeps its timing, unchanged.
const markLoaded = () =>
  requestAnimationFrame(() => {
    document.body.classList.add("react-loaded");
  });

if (typeof window !== "undefined") {
  const rootElement = document.getElementById("root");
  const isAdmin = /^\/admin(\/|$)/.test(window.location.pathname);
  if (isAdmin || !rootElement || typeof MutationObserver === "undefined") {
    markLoaded();
  } else if (rootElement.firstChild) {
    markLoaded();
  } else {
    const observer = new MutationObserver(() => {
      if (!rootElement.firstChild) return;
      observer.disconnect();
      markLoaded();
    });
    observer.observe(rootElement, { childList: true });
  }
}
// reportWebVitals();
