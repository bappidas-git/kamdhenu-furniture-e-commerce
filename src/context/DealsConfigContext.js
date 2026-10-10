import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import apiService from "../services/api";
import { normalizeDealsConfig, DEFAULT_DEALS_CONFIG } from "../utils/dealsConfig";

// =============================================================================
// DealsConfigContext
// =============================================================================
// Single shared source for the admin-managed Special Offers configuration on the
// storefront. The nav (Header / SidebarMenu / Footer) reads `enabled` to show or
// hide the "Today's Deals" entry, and the Special Offers page reads the full
// `config`. Like the category menu, it refetches when the tab regains focus so
// changes the admin makes appear without a hard reload.
//
// `error` is true while no config has been read and the last read failed: the
// Special Offers page cannot know what the admin set (whether the page is on,
// which pieces and codes it features), so it says it could not load the
// offers, with Try again (`refresh`). The nav keeps the default `enabled`, as
// before. A read that fails after one has succeeded keeps the config already
// read.
// =============================================================================

const DealsConfigContext = createContext({
  config: DEFAULT_DEALS_CONFIG,
  enabled: true,
  loading: true,
  error: false,
  refresh: () => Promise.resolve(),
});

export const useDealsConfig = () => useContext(DealsConfigContext);

export const DealsConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULT_DEALS_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);
  const readOnce = useRef(false);

  const load = useCallback(async () => {
    try {
      const raw = await apiService.deals.getConfig();
      if (mountedRef.current) {
        readOnce.current = true;
        setConfig(normalizeDealsConfig(raw));
        setError(false);
      }
    } catch (readError) {
      console.error("Failed to load deals config:", readError);
      // Leave the last-known (or default) config in place rather than breaking
      // the nav/page; with none read yet, say so (`error`).
      if (mountedRef.current && !readOnce.current) setError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const value = {
    config,
    enabled: config.enabled !== false,
    loading,
    error,
    refresh: load,
  };

  return (
    <DealsConfigContext.Provider value={value}>
      {children}
    </DealsConfigContext.Provider>
  );
};
