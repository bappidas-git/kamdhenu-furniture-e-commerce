import React, { Component, Suspense } from "react";
import { useLocation } from "react-router-dom";
import styles from "./LazyPage.module.css";

// =============================================================================
// LazyPage — where a page fetched on its first visit waits (Prompt 32)
// =============================================================================
// <LazyPageBoundary> sits inside <main id="main-content"> (App.js), around
// the storefront's <Routes>, so the skip link, the route-change focus and the
// page fade (PageTransition) keep their target, and the header, footer and
// bottom bar stay mounted while a page's chunk loads (src/pages/lazyPages.js).
//
// PageFallback   the Suspense fallback: a quiet page-shaped skeleton (a
//                trail, an eyebrow, a title and three lines), `aria-busy`,
//                with a visually hidden "Loading the page" for screen
//                readers. Its sand blocks are aria-hidden. It holds a screen
//                of height, so the footer does not rise into view and drop
//                back when the page arrives. It fades in with <main> on the
//                route change; a chunk that is already here never shows it.
// The boundary   a chunk that fails to load (offline, or a deploy replaced
//                it) shows "We couldn’t load this page." with "Try again",
//                which reloads the page, inside the shell. Every other error
//                goes on to the app's ErrorBoundary, as before. Going to
//                another page clears it.
// =============================================================================

export const PageFallback = () => (
  <div className={`sf-container ${styles.page}`} aria-busy="true">
    <p className="sf-visually-hidden" role="status">
      Loading the page
    </p>
    <div aria-hidden="true">
      <span className={`sf-skeleton ${styles.crumb}`} />
      <span className={`sf-skeleton ${styles.eyebrow}`} />
      <span className={`sf-skeleton ${styles.title}`} />
      <span className={styles.intro}>
        <span className="sf-skeleton sf-skeleton--text" />
        <span className="sf-skeleton sf-skeleton--text" />
        <span className="sf-skeleton sf-skeleton--text" />
      </span>
    </div>
  </div>
);

// webpack's JavaScript chunks fail with a ChunkLoadError; its CSS chunks with
// code CSS_CHUNK_LOAD_FAILED.
export const isChunkLoadError = (error) =>
  Boolean(error) &&
  (error.name === "ChunkLoadError" ||
    error.code === "CSS_CHUNK_LOAD_FAILED" ||
    /Loading (CSS )?chunk [\w-]+ failed/i.test(String(error.message)));

class ChunkErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.pathname !== this.props.pathname) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    // Not ours: the app's ErrorBoundary shows it, as it always has.
    if (!isChunkLoadError(error)) throw error;
    return (
      <div className={`sf-container ${styles.page}`}>
        <div className={`sf-panel ${styles.error}`} role="alert">
          <h1 className={styles.errorTitle}>We couldn’t load this page.</h1>
          <p className={styles.errorText}>Check your connection and try again.</p>
          <button
            type="button"
            className="sf-btn sf-btn--primary"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

export const LazyPageBoundary = ({ children }) => {
  const { pathname } = useLocation();
  return (
    <ChunkErrorBoundary pathname={pathname}>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </ChunkErrorBoundary>
  );
};

export default LazyPageBoundary;
