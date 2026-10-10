import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ProductCard, { ProductCardSkeleton } from "../storefront/ProductCard";
import BrandLogo from "../ui/BrandLogo";
import useFocusTrap, { useBodyScrollLock } from "../ui/useFocusTrap";
import { TOKENS } from "../../theme/tokens";
import {
  DEBOUNCE_MS,
  MAX_RESULTS,
  buildCategoryMap,
  buildCategoryNav,
  clearRecentSearches,
  departmentPath,
  getDepartments,
  getPopularSuggestions,
  getRecentSearches,
  loadSearchData,
  peekSearchData,
  removeRecentSearch,
  saveRecentSearch,
  searchProducts,
} from "./searchData";
import styles from "./SearchModal.module.css";

// =============================================================================
// SearchModal — the full-screen search overlay
// =============================================================================
//
// Props: open, onClose. Mounted twice, by Header and by BottomNav; the module
// cache in searchData.js means one catalogue read (products.getAll +
// categories.getAll, both API branches), and the two can never be open
// together.
//
// A paper surface over the whole viewport: the logo top-left, "Close search"
// top-right, a large serif field, then by state:
//   • before typing — "Recent" (localStorage, each chip removable, "Clear all")
//     and "Popular" (the first six products the admin flags as trending; with
//     none, the departments, labelled "Departments");
//   • searching — the department chips that scope the search, the live count
//     and up to MAX_RESULTS storefront ProductCards ("View all N results" to
//     the listing when more match); skeleton cards until a search settles;
//   • nothing matched — a serif line, a hint and the department links;
//   • catalogue unavailable — a serif line and "Try again".
// A caramel hairline runs along the top while the catalogue loads or a
// search is pending.
//
// Scoring, chip matching, the cache and the recent-searches rules live in
// searchData.js, unchanged.
//
// Keyboard: focus starts in the field; ArrowDown moves to the first result
// and ArrowUp from it back to the field; Tab runs field → clear → chips →
// results → View all → close and stays inside; Escape closes; focus returns
// to the control that opened the overlay. A route change closes it.
// =============================================================================

const { duration, easeOut, easeInOut } = TOKENS.motion;
// Results enter 40ms apart; from the eighth on they arrive together.
const RESULT_STAGGER = 0.04;
const STAGGER_CAP = 8;
// How far a result rises as it fades in (px).
const RESULT_RISE = 8;
// Card boxes held while the catalogue loads or the first search settles:
// two rows at three across, three rows at two.
const SKELETON_COUNT = 6;
// Pills held in a chip row while the catalogue loads.
const CHIP_SKELETONS = 4;

const cx = (...names) => names.filter(Boolean).join(" ");

// Only non-empty strings make chips: a hand-edited or legacy value in the
// store must never break the overlay.
const recentTerms = (list) =>
  (Array.isArray(list) ? list : []).filter((term) => typeof term === "string" && term.trim() !== "");

const readRecentSearches = () => recentTerms(getRecentSearches());

// A plain left click: the router navigates in place and the overlay closes
// with it. A modified click (new tab or window) leaves it open.
const isPlainClick = (event) =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !event.metaKey &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.shiftKey;

const hasModifier = (event) => event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

const quoted = (text) => `“${text}”`;

const CloseGlyph = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ChipSkeletons = () =>
  Array.from({ length: CHIP_SKELETONS }, (_, index) => (
    <span key={index} className={`sf-skeleton ${styles.chipSkeleton}`} />
  ));

const SearchModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const uid = useId();
  const inputId = `${uid}input`;
  const countId = `${uid}count`;
  const recentTitleId = `${uid}recent`;
  const popularTitleId = `${uid}popular`;

  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const recentListRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const activeCategoryRef = useRef("All");
  const pendingRecentFocus = useRef(null);

  const [query, setQuery] = useState("");
  // The catalogue: "idle" before the first open, then "loading", "ready" or
  // "error". An instance opening after the other one has loaded starts ready.
  const [catalog, setCatalog] = useState(() => {
    const cached = peekSearchData();
    return cached ? { status: "ready", data: cached } : { status: "idle", data: null };
  });
  const [results, setResults] = useState([]);
  // The query the shown results belong to; null until a search settles.
  const [resultsQuery, setResultsQuery] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [recentSearches, setRecentSearches] = useState([]);

  const statusRef = useRef(catalog.status);
  statusRef.current = catalog.status;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Keep a ref of the active category so the debounced query effect always uses
  // the latest value without re-subscribing on every chip change.
  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  // The catalogue, through the shared cache. A failed read reset the cached
  // promise, so this (on the next open, or "Try again") reads again.
  const loadCatalog = useCallback(() => {
    const cached = peekSearchData();
    if (cached) {
      setCatalog({ status: "ready", data: cached });
      return;
    }
    setCatalog({ status: "loading", data: null });
    loadSearchData()
      .then((data) => setCatalog({ status: "ready", data }))
      .catch((err) => {
        console.error("Failed to load search data:", err);
        setCatalog({ status: "error", data: null });
      });
  }, []);

  // On open: the recent searches, and the catalogue unless it is here already.
  // On close: back to a clean slate. A layout effect, so the first frame
  // already shows the recent chips and a cached catalogue.
  useLayoutEffect(() => {
    if (!open) {
      setQuery("");
      setResults((current) => (current.length ? [] : current));
      setResultsQuery(null);
      setIsSearching(false);
      setActiveCategory("All");
      return;
    }
    setRecentSearches(readRecentSearches());
    if (statusRef.current !== "ready") loadCatalog();
  }, [open, loadCatalog]);

  // Focus into the field, Tab kept inside, Escape closes, focus back to the
  // opener on close; the page behind does not scroll.
  useFocusTrap(dialogRef, { active: open, onEscape: onClose, initialFocusRef: inputRef });
  useBodyScrollLock(open);

  // A route change underneath (back, forward) closes the overlay; links
  // inside close it as they navigate.
  const routeKey = location.pathname + location.search;
  const lastRouteKey = useRef(routeKey);
  useEffect(() => {
    if (lastRouteKey.current === routeKey) return;
    lastRouteKey.current = routeKey;
    if (open) onCloseRef.current();
  }, [routeKey, open]);

  const data = catalog.status === "ready" ? catalog.data : null;
  const categoryMap = useMemo(() => buildCategoryMap(data?.categories), [data]);
  const categoryNav = useMemo(() => buildCategoryNav(data?.categories), [data]);
  const popular = useMemo(() => getPopularSuggestions(data?.products, data?.categories), [data]);
  const departments = useMemo(() => getDepartments(data?.categories), [data]);

  // Core search routine (synchronous; the catalogue is already in memory).
  const runSearch = useCallback(
    (rawQuery, category) => {
      const trimmed = (rawQuery || "").trim();
      if (!trimmed) {
        setResults([]);
        setResultsQuery(null);
        setIsSearching(false);
        return;
      }
      // Nothing to score until the catalogue arrives; this runs again then.
      if (!data) return;
      setResults(searchProducts(data.products, categoryMap, categoryNav.groups, trimmed, category));
      setResultsQuery(trimmed);
      setIsSearching(false);
    },
    [data, categoryMap, categoryNav]
  );

  // Debounced search as the user types.
  useEffect(() => {
    const trimmed = query.trim();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!trimmed) {
      setResults((current) => (current.length ? [] : current));
      setResultsQuery(null);
      setIsSearching(false);
      return undefined;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      runSearch(trimmed, activeCategoryRef.current);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, runSearch]);

  // After a recent search is removed, focus the × of the chip that took its
  // place (or the last one); with none left, the field.
  useEffect(() => {
    const index = pendingRecentFocus.current;
    if (index === null) return;
    pendingRecentFocus.current = null;
    const removers = recentListRef.current
      ? recentListRef.current.querySelectorAll("button[data-remove]")
      : [];
    const next = removers[Math.min(index, removers.length - 1)] || inputRef.current;
    if (next) next.focus();
  }, [recentSearches]);

  // ----- Handlers -----
  const focusInput = () => {
    if (inputRef.current) inputRef.current.focus();
  };

  const handleInputChange = (e) => setQuery(e.target.value);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setResultsQuery(null);
    focusInput();
  };

  const goToSearchResults = (term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches(recentTerms(saveRecentSearch(trimmed)));
    onClose();
    navigate(`/products?search=${encodeURIComponent(trimmed)}`);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    goToSearchResults(query);
  };

  // Following a result (or "View all") remembers the query, as before.
  const rememberQuery = () => {
    const trimmed = query.trim();
    if (trimmed) setRecentSearches(recentTerms(saveRecentSearch(trimmed)));
  };

  // Clicks inside a result card bubble here after the card's link has acted.
  // When the router took the click (a plain click) it navigates in place, so
  // the overlay closes; a modified click opens a new tab and leaves it open.
  const handleResultClick = (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== "function" || !target.closest("a[href]")) return;
    rememberQuery();
    if (event.defaultPrevented) onClose();
  };

  const handleViewAllClick = (event) => {
    rememberQuery();
    if (isPlainClick(event)) onClose();
  };

  const handleDepartmentClick = (event) => {
    if (isPlainClick(event)) onClose();
  };

  // A recent or popular chip runs its search. Focus returns to the field, as
  // the chip itself gives way to the results.
  const runSuggestion = (term) => {
    setQuery(term);
    focusInput();
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
    focusInput();
  };

  const handleRemoveRecent = (term, index) => {
    pendingRecentFocus.current = index;
    setRecentSearches(recentTerms(removeRecentSearch(term)));
  };

  // A second press on the department in force goes back to "All".
  const handleCategoryClick = (cat) => {
    const next = cat !== "All" && cat === activeCategory ? "All" : cat;
    setActiveCategory(next);
    if (query.trim()) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      runSearch(query, next);
    }
  };

  const handleRetry = () => {
    loadCatalog();
    focusInput();
  };

  // ArrowDown from the field to the first result; ArrowUp from it back.
  const firstResultLink = () =>
    resultsRef.current ? resultsRef.current.querySelector("a[href]") : null;

  const handleInputKeyDown = (event) => {
    if (event.key !== "ArrowDown" || hasModifier(event)) return;
    const first = firstResultLink();
    if (!first) return;
    event.preventDefault();
    first.focus();
  };

  const handleResultsKeyDown = (event) => {
    if (event.key !== "ArrowUp" || hasModifier(event)) return;
    if (event.target !== firstResultLink()) return;
    event.preventDefault();
    focusInput();
  };

  // ----- Derived -----
  const trimmedQuery = query.trim();
  const status = catalog.status;
  let view = "suggestions";
  if (status === "error") view = "error";
  else if (trimmedQuery) {
    if (!data || resultsQuery === null) view = "loading";
    else view = results.length > 0 ? "results" : "none";
  }
  const busy = status === "loading" || (status === "ready" && isSearching);
  const scopeSuffix = activeCategory !== "All" ? ` in ${activeCategory}` : "";
  const showScope =
    (view === "loading" || view === "results" || view === "none") &&
    (!data || categoryNav.chips.length > 1);
  const cappedResults = results.slice(0, MAX_RESULTS);
  const searchHref = `/products?search=${encodeURIComponent(trimmedQuery)}`;

  let statusContent = null;
  if (view === "results") {
    statusContent = (
      <p id={countId} className={styles.count}>
        <span className={styles.countFigure}>{results.length}</span>{" "}
        {results.length === 1 ? "result" : "results"} for{" "}
        <span className={styles.countFigure}>{quoted(resultsQuery)}</span>
        {scopeSuffix}
      </p>
    );
  } else if (view === "none") {
    statusContent = (
      <h2 className={`sf-display-sm ${styles.stateTitle}`}>
        Nothing matched {quoted(resultsQuery)}
        {scopeSuffix}.
      </h2>
    );
  } else if (view === "error") {
    statusContent = (
      <h2 className={`sf-display-sm ${styles.stateTitle}`}>We couldn’t load the catalogue.</h2>
    );
  }

  const resultMotion = (index) =>
    reduceMotion
      ? { initial: false }
      : {
          initial: { opacity: 0, y: RESULT_RISE },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: duration.base,
            ease: easeOut,
            delay: Math.min(index, STAGGER_CAP - 1) * RESULT_STAGGER,
          },
        };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Product search"
          tabIndex={-1}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: reduceMotion ? 0 : duration.base, ease: easeOut } }}
          exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : duration.base, ease: easeInOut } }}
        >
          <span className={cx(styles.progress, busy && styles.progressActive)} aria-hidden="true" />

          <div className={styles.bar}>
            <div className={`sf-container sf-container--wide ${styles.barInner}`}>
              <BrandLogo height={28} className={styles.logo} aria-hidden="true" />
            </div>
          </div>

          <div className={styles.body}>
            <div className={styles.column}>
              <form className={styles.form} role="search" onSubmit={handleSubmit}>
                <label htmlFor={inputId} className="sf-visually-hidden">
                  Search products
                </label>
                <div className={styles.field}>
                  <input
                    ref={inputRef}
                    id={inputId}
                    className={styles.input}
                    type="search"
                    placeholder="Search furniture, rooms, brands…"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="search"
                  />
                  {query && (
                    <button
                      type="button"
                      className={`sf-btn sf-btn--icon ${styles.iconButton} ${styles.clear}`}
                      onClick={handleClear}
                      aria-label="Clear search"
                    >
                      <CloseGlyph />
                    </button>
                  )}
                </div>
              </form>

              {showScope && (
                <div className={styles.scope} role="group" aria-label="Filter by department">
                  {data ? (
                    <ul className={styles.scopeList}>
                      {categoryNav.chips.map((cat) => (
                        <li key={cat}>
                          <button
                            type="button"
                            className={`sf-chip ${styles.chip} ${styles.scopeChip}`}
                            aria-pressed={activeCategory === cat}
                            onClick={() => handleCategoryClick(cat)}
                          >
                            {cat}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className={styles.scopeList} aria-hidden="true">
                      <ChipSkeletons />
                    </div>
                  )}
                </div>
              )}

              <div
                className={cx(styles.status, (view === "loading" || view === "results") && styles.statusLine)}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {statusContent}
              </div>

              <div className={styles.content} aria-busy={view === "loading" ? "true" : undefined}>
                {view === "loading" && (
                  <ul className={styles.grid} aria-hidden="true">
                    {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                      <li key={index}>
                        <ProductCardSkeleton />
                      </li>
                    ))}
                  </ul>
                )}

                {view === "results" && (
                  <>
                    <ul
                      ref={resultsRef}
                      className={styles.grid}
                      aria-labelledby={countId}
                      onKeyDown={handleResultsKeyDown}
                    >
                      {cappedResults.map((product, index) => (
                        <motion.li key={product.id} onClick={handleResultClick} {...resultMotion(index)}>
                          <ProductCard product={product} />
                        </motion.li>
                      ))}
                    </ul>

                    {results.length > MAX_RESULTS && (
                      <div className={styles.more}>
                        <Link to={searchHref} className="sf-btn sf-btn--ghost" onClick={handleViewAllClick}>
                          View all {results.length} results
                        </Link>
                      </div>
                    )}
                  </>
                )}

                {view === "none" && (
                  <div className={styles.state}>
                    <p className={styles.stateLine}>Try a room, a material or a department.</p>
                    {departments.length > 0 && (
                      <ul className={cx(styles.chipList, styles.stateChips)} aria-label="Departments">
                        {departments.map((department) => (
                          <li key={department.id}>
                            <Link
                              to={departmentPath(department)}
                              className={`sf-chip ${styles.chip}`}
                              onClick={handleDepartmentClick}
                            >
                              {department.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {view === "error" && (
                  <div className={styles.state}>
                    <p className={styles.stateLine}>Check your connection and try again.</p>
                    <button
                      type="button"
                      className={`sf-btn sf-btn--primary ${styles.stateAction}`}
                      onClick={handleRetry}
                    >
                      Try again
                    </button>
                  </div>
                )}

                {view === "suggestions" && (
                  <div className={styles.suggestions}>
                    {recentSearches.length > 0 && (
                      <section className={styles.group} aria-labelledby={recentTitleId}>
                        <div className={styles.groupHead}>
                          <h2 id={recentTitleId} className={`sf-eyebrow ${styles.groupTitle}`}>
                            Recent
                          </h2>
                          <button
                            type="button"
                            className={`sf-btn sf-btn--link ${styles.clearAll}`}
                            onClick={handleClearRecent}
                            aria-label="Clear all recent searches"
                          >
                            Clear all
                          </button>
                        </div>
                        <ul ref={recentListRef} className={styles.chipList}>
                          {recentSearches.map((term, index) => (
                            <li key={term} className={`sf-chip ${styles.recentChip}`}>
                              <button
                                type="button"
                                className={styles.recentTerm}
                                onClick={() => runSuggestion(term)}
                              >
                                {term}
                              </button>
                              <button
                                type="button"
                                className={styles.recentRemove}
                                onClick={() => handleRemoveRecent(term, index)}
                                aria-label={`Remove ${term} from recent searches`}
                                data-remove=""
                              >
                                <CloseGlyph size={16} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {data ? (
                      popular.items.length > 0 && (
                        <section className={styles.group} aria-labelledby={popularTitleId}>
                          <div className={styles.groupHead}>
                            <h2 id={popularTitleId} className={`sf-eyebrow ${styles.groupTitle}`}>
                              {popular.kind === "popular" ? "Popular" : "Departments"}
                            </h2>
                          </div>
                          <ul className={styles.chipList}>
                            {popular.items.map((item) => (
                              <li key={item.key}>
                                {item.to ? (
                                  <Link
                                    to={item.to}
                                    className={`sf-chip ${styles.chip}`}
                                    onClick={handleDepartmentClick}
                                  >
                                    {item.label}
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    className={`sf-chip ${styles.chip}`}
                                    onClick={() => runSuggestion(item.label)}
                                  >
                                    {item.label}
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )
                    ) : (
                      <div className={styles.group} aria-hidden="true">
                        <div className={styles.groupHead}>
                          <span className={`sf-skeleton ${styles.titleSkeleton}`} />
                        </div>
                        <div className={styles.chipList}>
                          <ChipSkeletons />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Last in the DOM, so Tab reaches it after the results; shown in the
              top bar's row, top-right. */}
          <div className={`sf-container sf-container--wide ${styles.closeRow}`}>
            <button
              type="button"
              className={`sf-btn sf-btn--icon ${styles.iconButton} ${styles.close}`}
              onClick={onClose}
              aria-label="Close search"
            >
              <CloseGlyph />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
