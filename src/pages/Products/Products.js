import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, useId } from "react";
import { useSearchParams } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../context/WishlistContext";
import apiService from "../../services/api";
import {
  categoryParam,
  resolveCategory,
  getCategoryScopeIds,
  orderCategoriesHierarchically,
} from "../../utils/categories";
import { getProductMinPrice } from "../../utils/helpers";
import { APP_DESCRIPTION } from "../../utils/constants";
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";
import { buildCategoryMap, matchesSearch } from "../../components/SearchModal/searchData";
import { ProductCard, ProductCardSkeleton, StarRating } from "../../components/storefront";
import { BottomDrawer, Reveal, staggerDelay } from "../../components/ui";
import ProductListRow, { ProductListRowSkeleton } from "./ProductListRow";
import styles from "./Products.module.css";

// =============================================================================
// Products — the listing (/products)
// =============================================================================
// An editorial listing: the breadcrumb, the serif title and the category's
// description; a quiet filter rail (a bottom sheet below 1024px); a
// restrained toolbar (results, Sort, grid/list); the applied filters as
// removable chips; the storefront ProductCard grid (or list rows);
// pagination.
//
// The data and the rules are the page's long-standing ones, kept as they
// were: one catalogue read (products + categories), then client-side search
// (since Prompt 15, by the search overlay's rule, so its counts agree),
// category scope (a parent includes its children), price, rating, discount,
// stock and brand filters, sorting and pagination, all driven by the URL
// (category, search, sort, page, per_page, min_price, max_price; written with
// replace, defaults omitted). Rating, discount, stock and brand are
// session-only. A legacy ?category=<id> is rewritten to its slug.
// =============================================================================

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
  { value: "newest", label: "Newest first" },
  { value: "rating", label: "Highest rated" },
  { value: "popularity", label: "Most reviewed" },
];

// Accept common sort aliases from deep links (e.g. ?sort=price_asc) and map them
// to canonical option values; anything unrecognised falls back to "relevance".
const SORT_ALIASES = {
  price_asc: "price-low",
  "price-asc": "price-low",
  price_low: "price-low",
  lowtohigh: "price-low",
  price_desc: "price-high",
  "price-desc": "price-high",
  price_high: "price-high",
  hightolow: "price-high",
  latest: "newest",
  new: "newest",
  popular: "popularity",
  "best-rated": "rating",
};

const normalizeSort = (raw) => {
  if (!raw) return "relevance";
  const v = String(raw).toLowerCase();
  if (SORT_OPTIONS.some((o) => o.value === v)) return v;
  return SORT_ALIASES[v] || "relevance";
};

const PRICE_RANGES = [
  { label: "Under \u20b9500", min: 0, max: 500 },
  { label: "\u20b9500 \u2013 \u20b91,000", min: 500, max: 1000 },
  { label: "\u20b91,000 \u2013 \u20b95,000", min: 1000, max: 5000 },
  { label: "Above \u20b95,000", min: 5000, max: Infinity },
];

const RATING_OPTIONS = [4, 3, 2, 1];
const DISCOUNT_OPTIONS = [50, 30, 20, 10];
const PER_PAGE_OPTIONS = [12, 24, 48];

// From this width the filter rail sits beside the results (the header's
// desktop breakpoint); below it the filters open in the bottom sheet.
const RAIL_QUERY = "(min-width: 1024px)";
// The first cards enter with the staggered reveal; the rest render at once.
const REVEAL_COUNT = 6;
// Air between the sticky header and the results after a page change.
const RESULTS_SCROLL_GAP = 16;

// Listing copy (Prompt 29 owns the final wording).
const ALL_FURNITURE = "All furniture";
const ALL_FURNITURE_INTRO = APP_DESCRIPTION;
const FURNITURE_CRUMB = { label: "Furniture", link: "/products" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const listingPath = (category) => `/products?category=${categoryParam(category)}`;

// The category and its ancestors, root first, by walking `parentId` (a
// broken or cyclic parent link ends the walk).
const categoryTrail = (category, categories) => {
  const trail = [];
  const seen = new Set();
  let current = category;
  while (current && !seen.has(String(current.id))) {
    seen.add(String(current.id));
    trail.unshift(current);
    const { parentId } = current;
    current =
      parentId == null ? null : categories.find((c) => String(c.id) === String(parentId)) || null;
  }
  return trail;
};

// "Sofas", "Sofas and Beds", "Sofas, Beds and 2 more"; a repeated name once.
const joinNames = (names) => {
  const unique = [...new Set(names)];
  if (unique.length <= 2) return unique.join(" and ");
  return `${unique[0]}, ${unique[1]} and ${unique.length - 2} more`;
};

// Rupees without paise unless the value has them: "₹5,000", "₹1,250.5".
const formatRupees = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

// The applied price as a chip label, read the way the filter reads the
// bounds (a bound that is not a positive number is no bound).
const priceLabel = (min, max) => {
  const lo = parseFloat(min);
  const hi = parseFloat(max);
  const hasLo = !isNaN(lo) && lo > 0;
  const hasHi = !isNaN(hi) && hi > 0;
  if (hasLo && hasHi) return `${formatRupees(lo)} – ${formatRupees(hi)}`;
  if (hasLo) return `Above ${formatRupees(lo)}`;
  if (hasHi) return `Under ${formatRupees(hi)}`;
  return null;
};

// The price fields are numeric text: keep digits and the decimal point.
const cleanPriceInput = (value) => value.replace(/[^\d.]/g, "");

// "Only N left" follows the product page's rule: in stock, and at or under
// the product's own lowStockThreshold (5 when it has none). Null otherwise.
const lowStockCount = (product) => {
  const stock = product?.stock;
  if (typeof stock !== "number" || stock <= 0) return null;
  const threshold = Number(product.lowStockThreshold) || 5;
  return stock <= threshold ? stock : null;
};

const starsLabel = (count) => `${count} ${count === 1 ? "star" : "stars"}`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------------------
// Icons (1.5px strokes in currentColor)
// ---------------------------------------------------------------------------
const Icon = ({ children, size = 18 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

const FiltersIcon = () => (
  <Icon>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Icon>
);

const GridIcon = () => (
  <Icon>
    <rect x="4" y="4" width="6.5" height="6.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" />
  </Icon>
);

const ListIcon = () => (
  <Icon>
    <rect x="4" y="4.5" width="5" height="6" />
    <rect x="4" y="13.5" width="5" height="6" />
    <path d="M12 6h8M12 9h5M12 15h8M12 18h5" />
  </Icon>
);

const ChevronLeft = () => (
  <Icon>
    <path d="M14.5 6l-6 6 6 6" />
  </Icon>
);

const ChevronRight = () => (
  <Icon>
    <path d="M9.5 6l6 6-6 6" />
  </Icon>
);

const RemoveIcon = () => (
  <Icon size={12}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

// The filters' place while the catalogue loads: legends and option rows.
const FiltersSkeleton = () => (
  <div className={styles.filtersSkeleton} aria-hidden="true">
    {[6, 3, 4].map((rows, group) => (
      <div key={group} className={styles.skeletonGroup}>
        <span className={`sf-skeleton ${styles.skeletonLegend}`} />
        {Array.from({ length: rows }).map((_, row) => (
          <span key={row} className={`sf-skeleton ${styles.skeletonOption}`} />
        ))}
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const uid = useId();

  // ---- Data state ---
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // ---- UI state ----
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Departments open in the category outline (ids as strings).
  const [openDepartments, setOpenDepartments] = useState(() => new Set());

  // ---- Refs ----
  const mainRef = useRef(null); // top of results region, for page-change scroll
  const pendingScrollRef = useRef(false); // set by pagination, consumed post-commit
  const filtersChangeRef = useRef(false); // the next category change comes from the page's own controls

  // ---- Read URL params ----
  const urlCategory = searchParams.get("category") || "";
  const urlSearch = searchParams.get("search") || "";
  const urlSort = normalizeSort(searchParams.get("sort"));
  const urlPage = parseInt(searchParams.get("page"), 10) || 1;
  const urlPerPage = parseInt(searchParams.get("per_page"), 10);
  const urlMinPrice = searchParams.get("min_price") || "";
  const urlMaxPrice = searchParams.get("max_price") || "";

  // ---- Filter state (local, synced to URL) ----
  const [selectedCategories, setSelectedCategories] = useState(() => (urlCategory ? urlCategory.split(",") : []));
  const [minPrice, setMinPrice] = useState(urlMinPrice);
  const [maxPrice, setMaxPrice] = useState(urlMaxPrice);
  const [minRating, setMinRating] = useState(0);
  const [minDiscount, setMinDiscount] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [sortBy, setSortBy] = useState(urlSort);
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [perPage, setPerPage] = useState(() =>
    PER_PAGE_OPTIONS.includes(urlPerPage) ? urlPerPage : 12
  );

  // ---- Fetch data on mount (retryable from the error state) ----
  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [productsData, categoriesData] = await Promise.all([
        apiService.products.getAll(),
        apiService.categories.getAll(),
      ]);
      setAllProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setAllProducts([]);
      setCategories([]);
      // Distinguish "couldn't load" from "no matches" — the grid renders a
      // retryable error panel instead of the misleading empty state.
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // ---- Keep filter state in sync with the URL (the URL is the source of truth) ----
  // Re-derive every URL-backed filter whenever the query string (or the loaded
  // categories) changes. This fires not only on first mount / a deep link, but
  // ALSO when a header, main-menu, sidebar, homepage or breadcrumb link is
  // clicked while we are already on this page: React Router keeps <Products>
  // mounted on a query-only change, so without this the listing would never
  // react to the new category (the long-standing "URL changes but nothing
  // re-renders / the checkbox stays stuck" bug). Category tokens are normalized
  // to their canonical slug, and a legacy numeric-id deep link (?category=3) is
  // rewritten to the slug form in place. Every setter is guarded against its
  // current value, so re-applying a value we just pushed to the URL can't loop.
  useEffect(() => {
    const tokens = urlCategory ? urlCategory.split(",").filter(Boolean) : [];
    const normalized = categories.length
      ? tokens.map((t) => {
          const cat = resolveCategory(t, categories);
          return cat ? cat.slug : t;
        })
      : tokens;

    setSelectedCategories((prev) =>
      prev.join(",") === normalized.join(",") ? prev : normalized
    );
    // Canonicalize a legacy ?category=<id> link to its slug form in the URL.
    if (categories.length && normalized.join(",") !== tokens.join(",")) {
      syncUrlParams({
        category: normalized,
        search: urlSearch,
        sort: urlSort,
        page: urlPage,
        per_page: PER_PAGE_OPTIONS.includes(urlPerPage) ? urlPerPage : 12,
        min_price: urlMinPrice,
        max_price: urlMaxPrice,
      });
    }

    setMinPrice((prev) => (prev === urlMinPrice ? prev : urlMinPrice));
    setMaxPrice((prev) => (prev === urlMaxPrice ? prev : urlMaxPrice));
    setSortBy((prev) => (prev === urlSort ? prev : urlSort));
    setCurrentPage((prev) => (prev === urlPage ? prev : urlPage));
    setPerPage((prev) => {
      const next = PER_PAGE_OPTIONS.includes(urlPerPage) ? urlPerPage : 12;
      return prev === next ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCategory, urlSearch, urlSort, urlPage, urlPerPage, urlMinPrice, urlMaxPrice, categories]);

  // ---- Sync URL params when filters change ----
  // NOTE: any param mutated in the same handler MUST be passed as an override —
  // the closure below still holds this render's (pre-update) state values.
  const syncUrlParams = useCallback(
    (overrides = {}) => {
      const merged = {
        category: overrides.category !== undefined ? overrides.category : selectedCategories,
        search: overrides.search !== undefined ? overrides.search : urlSearch,
        sort: overrides.sort !== undefined ? overrides.sort : sortBy,
        page: overrides.page !== undefined ? overrides.page : currentPage,
        per_page: overrides.per_page !== undefined ? overrides.per_page : perPage,
        min_price: overrides.min_price !== undefined ? overrides.min_price : minPrice,
        max_price: overrides.max_price !== undefined ? overrides.max_price : maxPrice,
      };
      const params = new URLSearchParams();
      if (merged.category && merged.category.length) params.set("category", Array.isArray(merged.category) ? merged.category.join(",") : merged.category);
      if (merged.search) params.set("search", merged.search);
      if (merged.sort && merged.sort !== "relevance") params.set("sort", merged.sort);
      if (merged.page > 1) params.set("page", String(merged.page));
      if (merged.per_page && Number(merged.per_page) !== 12) params.set("per_page", String(merged.per_page));
      if (merged.min_price) params.set("min_price", merged.min_price);
      if (merged.max_price) params.set("max_price", merged.max_price);
      setSearchParams(params, { replace: true });
    },
    [selectedCategories, urlSearch, sortBy, currentPage, perPage, minPrice, maxPrice, setSearchParams]
  );

  // Reset to page 1 and drop the stale page param from the URL. Use this for the
  // session-only filters (rating/discount/in-stock/brand) that are not URL params
  // themselves — they only need the page reset reflected in the URL.
  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1);
    syncUrlParams({ page: 1 });
  }, [syncUrlParams]);

  // ---- Derived: brands extracted from loaded products ----
  const availableBrands = useMemo(() => {
    const brands = new Set();
    allProducts.forEach((p) => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands).sort();
  }, [allProducts]);

  // ---- Derived: product count per category id ----
  // Counts honour the parent-includes-children rule: a category's count is the
  // number of products in that category PLUS all of its descendants — i.e. the
  // exact result set you get by selecting it. (A parent therefore shows an
  // aggregate that overlaps its children's counts, which is the standard,
  // expected behaviour.)
  const categoryCounts = useMemo(() => {
    const direct = new Map();
    allProducts.forEach((p) => {
      const key = String(p.categoryId);
      direct.set(key, (direct.get(key) || 0) + 1);
    });
    const counts = new Map();
    categories.forEach((cat) => {
      let total = 0;
      getCategoryScopeIds(cat.id, categories).forEach((id) => {
        total += direct.get(String(id)) || 0;
      });
      counts.set(String(cat.id), total);
    });
    return counts;
  }, [allProducts, categories]);

  // ---- Derived: categories ordered for the filter list (parents → children) ----
  const orderedCategories = useMemo(
    () => orderCategoriesHierarchically(categories),
    [categories]
  );

  // ---- Filtering + Sorting (client-side) ----
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Search — the search overlay's own rule (SearchModal/searchData.js), so
    // its "View all N results" lands on these N products: the query in the
    // name, tags, category name or slug, brand or short description.
    if (urlSearch) {
      const categoryMap = buildCategoryMap(categories);
      result = result.filter((p) => matchesSearch(p, urlSearch, categoryMap));
    }

    // Categories — products carry a numeric `categoryId`; the selected tokens
    // are canonical slugs (legacy ids still resolve). Each selected category is
    // expanded to its own id PLUS all descendant ids, so selecting a PARENT
    // includes its children's products (parent-includes-children rule): picking
    // "Electronics" returns Laptops/Audio/Smartphones items too, and picking
    // "Women's Ethnic Wear" — which has no products of its own — returns its
    // Sarees/Kurtas items. Picking a leaf category returns just that category.
    if (selectedCategories.length > 0) {
      const wantedIds = new Set();
      selectedCategories.forEach((token) => {
        const cat = resolveCategory(token, categories);
        if (!cat) return;
        getCategoryScopeIds(cat.id, categories).forEach((id) => wantedIds.add(id));
      });
      if (wantedIds.size > 0) {
        result = result.filter((p) => wantedIds.has(String(p.categoryId)));
      }
    }

    // Price range
    const pMin = parseFloat(minPrice);
    const pMax = parseFloat(maxPrice);
    if (!isNaN(pMin) && pMin > 0) {
      result = result.filter((p) => getProductMinPrice(p).sellingPrice >= pMin);
    }
    if (!isNaN(pMax) && pMax > 0) {
      result = result.filter((p) => getProductMinPrice(p).sellingPrice <= pMax);
    }

    // Rating
    if (minRating > 0) {
      result = result.filter((p) => (p.rating || 0) >= minRating);
    }

    // Discount
    if (minDiscount > 0) {
      result = result.filter((p) => getProductMinPrice(p).discount >= minDiscount);
    }

    // In stock
    if (inStockOnly) {
      result = result.filter((p) => (p.stock === undefined ? true : p.stock > 0));
    }

    // Brands
    if (selectedBrands.length > 0) {
      result = result.filter((p) => selectedBrands.includes(p.brand));
    }

    // Sorting
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => getProductMinPrice(a).sellingPrice - getProductMinPrice(b).sellingPrice);
        break;
      case "price-high":
        result.sort((a, b) => getProductMinPrice(b).sellingPrice - getProductMinPrice(a).sellingPrice);
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case "rating":
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "popularity":
        result.sort((a, b) => (b.totalReviews || 0) - (a.totalReviews || 0));
        break;
      default:
        break;
    }

    return result;
  }, [allProducts, categories, urlSearch, selectedCategories, minPrice, maxPrice, minRating, minDiscount, inStockOnly, selectedBrands, sortBy]);

  // ---- Pagination ----
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((safePage - 1) * perPage, safePage * perPage),
    [filteredProducts, safePage, perPage]
  );

  // Keep currentPage within range whenever the result set shrinks (e.g. filters
  // applied, or a deep-linked page that no longer exists). The value guard
  // (currentPage !== safePage) terminates after one correction, so adding
  // syncUrlParams to the deps cannot loop. Nothing is clamped until the
  // catalogue has loaded: against the empty list every page but the first is
  // out of range, which used to drop a deep-linked ?page= before its results
  // existed.
  useEffect(() => {
    if (loading || fetchError) return;
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
      syncUrlParams({ page: safePage });
    }
  }, [loading, fetchError, safePage, currentPage, syncUrlParams]);

  // Scroll the results back to the top after a pagination/per-page change. Runs
  // post-commit (so the new page's layout is settled and the smooth scroll isn't
  // cancelled by the re-render), and only when a pager action requested it — not
  // on every filter change. The offset clears the sticky header, whose visible
  // height the header publishes as --sf-header-height (it changes with the
  // breakpoint and as the header compacts).
  useEffect(() => {
    if (!pendingScrollRef.current) return;
    pendingScrollRef.current = false;
    const headerHeight =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sf-header-height")) || 0;
    const offset = headerHeight + RESULTS_SCROLL_GAP;
    const el = mainRef.current;
    const y = el ? el.getBoundingClientRect().top + window.scrollY - offset : 0;
    // "instant", not "auto": the root's `scroll-behavior: smooth` (index.css)
    // would make "auto" smooth as well.
    window.scrollTo({ top: Math.max(0, y), behavior: prefersReducedMotion() ? "instant" : "smooth" });
  }, [safePage, perPage]);

  // ---- Mobile filter sheet ----
  // BottomDrawer owns the dialog semantics, Escape, the focus move to its
  // close button and back to the trigger, and the page scroll lock. The sheet
  // belongs to narrow screens: if the window grows to the rail's width while
  // it is open, it closes.
  useEffect(() => {
    if (!mobileFiltersOpen || typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(RAIL_QUERY);
    const onChange = () => {
      if (query.matches) setMobileFiltersOpen(false);
    };
    onChange();
    if (query.addEventListener) query.addEventListener("change", onChange);
    else query.addListener(onChange);
    return () => {
      if (query.removeEventListener) query.removeEventListener("change", onChange);
      else query.removeListener(onChange);
    };
  }, [mobileFiltersOpen]);

  const openFilters = (event) => {
    // Safari does not focus a clicked button, and the sheet hands focus back
    // to whatever held it when it opened: make that the trigger.
    event.currentTarget.focus({ preventScroll: true });
    setMobileFiltersOpen(true);
  };

  const closeFilters = useCallback(() => setMobileFiltersOpen(false), []);

  // ---- Helpers ----
  const hasActiveFilters =
    selectedCategories.length > 0 ||
    minPrice !== "" ||
    maxPrice !== "" ||
    minRating > 0 ||
    minDiscount > 0 ||
    inStockOnly ||
    selectedBrands.length > 0;

  // Whether anything is constraining the result set — includes the search query
  // (set from the header), so the empty state always offers a way out.
  const hasAnyConstraint = hasActiveFilters || Boolean(urlSearch);

  const clearAllFilters = useCallback(() => {
    setSelectedCategories([]);
    setMinPrice("");
    setMaxPrice("");
    setMinRating(0);
    setMinDiscount(0);
    setInStockOnly(false);
    setSelectedBrands([]);
    setSortBy("relevance");
    setCurrentPage(1);
    // Pass every reset value as an explicit override so no stale param survives.
    // per_page is intentionally preserved (it's a view preference, not a filter).
    syncUrlParams({
      category: [],
      search: "",
      sort: "relevance",
      min_price: "",
      max_price: "",
      page: 1,
    });
  }, [syncUrlParams]);

  // The next selection is computed from this render's state, not inside a
  // state updater: the URL sync is a side effect, and React may run an updater
  // during render, where navigating is an error ("Cannot update a component
  // while rendering a different component").
  const handleCategoryToggle = useCallback(
    (slug) => {
      const next = selectedCategories.includes(slug)
        ? selectedCategories.filter((c) => c !== slug)
        : [...selectedCategories, slug];
      setSelectedCategories(next);
      setCurrentPage(1);
      syncUrlParams({ category: next, page: 1 });
    },
    [selectedCategories, syncUrlParams]
  );

  const handlePriceRangeClick = useCallback(
    (range) => {
      const newMin = String(range.min);
      const newMax = range.max === Infinity ? "" : String(range.max);
      setMinPrice(newMin);
      setMaxPrice(newMax);
      setCurrentPage(1);
      syncUrlParams({ min_price: newMin, max_price: newMax, page: 1 });
    },
    [syncUrlParams]
  );

  const handlePriceApply = useCallback(() => {
    // Sanitize: ignore NaN / non-positive values, and swap only when BOTH bounds
    // are valid finite numbers and inverted. An empty max means "no upper bound"
    // and must not be coerced to 0.
    const lo = parseFloat(minPrice);
    const hi = parseFloat(maxPrice);
    const loValid = !isNaN(lo) && lo > 0;
    const hiValid = !isNaN(hi) && hi > 0;
    let nextMin = loValid ? lo : "";
    let nextMax = hiValid ? hi : "";
    if (loValid && hiValid && lo > hi) {
      nextMin = hi;
      nextMax = lo;
    }
    const minStr = nextMin === "" ? "" : String(nextMin);
    const maxStr = nextMax === "" ? "" : String(nextMax);
    setMinPrice(minStr);
    setMaxPrice(maxStr);
    setCurrentPage(1);
    syncUrlParams({ min_price: minStr, max_price: maxStr, page: 1 });
  }, [minPrice, maxPrice, syncUrlParams]);

  const handleSortChange = useCallback(
    (value) => {
      setSortBy(value);
      setCurrentPage(1);
      syncUrlParams({ sort: value, page: 1 });
    },
    [syncUrlParams]
  );

  const handlePageChange = useCallback(
    (page) => {
      const p = Math.max(1, Math.min(page, totalPages));
      pendingScrollRef.current = true; // scroll handled post-commit (see effect)
      setCurrentPage(p);
      syncUrlParams({ page: p });
    },
    [totalPages, syncUrlParams]
  );

  const handlePerPageChange = useCallback(
    (value) => {
      pendingScrollRef.current = true;
      setPerPage(value);
      setCurrentPage(1);
      syncUrlParams({ per_page: value, page: 1 });
    },
    [syncUrlParams]
  );

  // Select semantics (value, or 0 to clear). onChange handles keyboard + click;
  // a paired onClick clears when the already-selected radio is re-clicked.
  const handleRatingChange = useCallback(
    (value) => {
      setMinRating(value);
      resetToFirstPage();
    },
    [resetToFirstPage]
  );

  const handleDiscountChange = useCallback(
    (value) => {
      setMinDiscount(value);
      resetToFirstPage();
    },
    [resetToFirstPage]
  );

  const handleInStockToggle = useCallback(() => {
    setInStockOnly((v) => !v);
    resetToFirstPage();
  }, [resetToFirstPage]);

  const handleBrandToggle = useCallback(
    (brand) => {
      setSelectedBrands((prev) =>
        prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
      );
      resetToFirstPage();
    },
    [resetToFirstPage]
  );

  // ---- Applied-filter removal (the chips above the grid) ----
  const handlePriceClear = useCallback(() => {
    setMinPrice("");
    setMaxPrice("");
    setCurrentPage(1);
    syncUrlParams({ min_price: "", max_price: "", page: 1 });
  }, [syncUrlParams]);

  const handleSearchClear = useCallback(() => {
    setCurrentPage(1);
    syncUrlParams({ search: "", page: 1 });
  }, [syncUrlParams]);

  // Category changes and "Clear all" made on this page are flagged, so the
  // category outline never collapses a department under the pointer (below).
  const toggleCategoryFromPage = useCallback(
    (slug) => {
      filtersChangeRef.current = true;
      handleCategoryToggle(slug);
    },
    [handleCategoryToggle]
  );

  const clearAllFromPage = useCallback(() => {
    filtersChangeRef.current = true;
    clearAllFilters();
  }, [clearAllFilters]);

  // A quick range is "on" when the bounds in force are exactly its own.
  const isRangeActive = (range) => {
    const lo = parseFloat(minPrice);
    const hi = parseFloat(maxPrice);
    const min = !isNaN(lo) && lo > 0 ? lo : 0;
    const max = !isNaN(hi) && hi > 0 ? hi : Infinity;
    return min === range.min && max === range.max;
  };

  // A quick range applies its bounds; pressing the one in force clears the
  // price again, as a second click on a rating does.
  const handleQuickRange = (range) =>
    isRangeActive(range) ? handlePriceClear() : handlePriceRangeClick(range);

  // ---- Selected categories, resolved (unknown tokens and repeats dropped) ----
  const selectedCategoryList = useMemo(() => {
    const seen = new Set();
    return selectedCategories
      .map((token) => resolveCategory(token, categories))
      .filter((cat) => {
        if (!cat || seen.has(String(cat.id))) return false;
        seen.add(String(cat.id));
        return true;
      });
  }, [selectedCategories, categories]);

  // ---- Category outline: departments and which of them are open ----
  // Each category's children in orderCategoriesHierarchically's order, keyed
  // by parent id ("root" for the departments, and for any category whose
  // parent is missing, which that helper lists at the top level).
  const categoryChildren = useMemo(() => {
    const map = new Map();
    orderedCategories.ordered.forEach((cat) => {
      const key = orderedCategories.depthOf(cat.id) === 0 ? "root" : String(cat.parentId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(cat);
    });
    return map;
  }, [orderedCategories]);
  const departments = categoryChildren.get("root") || [];

  // The departments that hold a selected category, as a stable key.
  const activeDepartmentKey = useMemo(
    () =>
      [...new Set(selectedCategoryList.map((cat) => String(categoryTrail(cat, categories)[0].id)))]
        .sort()
        .join(","),
    [selectedCategoryList, categories]
  );

  // A selection that arrives from elsewhere (the mega-menu, the breadcrumb, a
  // link, back/forward) opens exactly its own departments. One made on this
  // page only ever opens more: unticking a box never folds its department
  // away under the pointer. A layout effect, so the outline is already open
  // in the first frame the loaded filters are painted (an effect would paint
  // it closed first and then push every department below it down).
  useLayoutEffect(() => {
    const active = activeDepartmentKey ? activeDepartmentKey.split(",") : [];
    const fromPage = filtersChangeRef.current;
    setOpenDepartments((prev) => {
      if (!fromPage) return new Set(active);
      if (active.every((id) => prev.has(id))) return prev;
      return new Set([...prev, ...active]);
    });
  }, [activeDepartmentKey]);

  // The flag covers one selection change, whether or not it moved a department.
  useEffect(() => {
    filtersChangeRef.current = false;
  }, [selectedCategories]);

  const toggleDepartment = useCallback((id) => {
    setOpenDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ---- Page header: title, introduction, breadcrumb ----
  // A deep-linked category is named once the category tree has loaded.
  const categoriesPending = loading && categories.length === 0;
  const headerPending = categoriesPending && selectedCategories.length > 0;
  const categoryTitle = joinNames(selectedCategoryList.map((cat) => cat.name));
  const heading = urlSearch ? `Results for “${urlSearch}”` : categoryTitle || ALL_FURNITURE;
  const intro = urlSearch
    ? null
    : selectedCategoryList.length === 0
      ? ALL_FURNITURE_INTRO
      : selectedCategoryList.length === 1
        ? selectedCategoryList[0].description || null
        : null;

  // Home › Furniture › Department › Group › Leaf: every ancestor of the
  // selected category, each linking to its own listing; the last is the page.
  const breadcrumbItems = useMemo(() => {
    if (selectedCategoryList.length === 1) {
      const crumbs = categoryTrail(selectedCategoryList[0], categories).map((cat) => ({
        label: cat.name,
        link: listingPath(cat),
      }));
      return urlSearch
        ? [FURNITURE_CRUMB, ...crumbs, { label: heading }]
        : [FURNITURE_CRUMB, ...crumbs];
    }
    if (selectedCategoryList.length > 1 || urlSearch) {
      return [FURNITURE_CRUMB, { label: heading }];
    }
    return [{ label: ALL_FURNITURE }];
  }, [selectedCategoryList, categories, urlSearch, heading]);

  // ---- Applied filters, as removable chips ----
  const appliedFilters = [];
  if (urlSearch) {
    appliedFilters.push({
      key: "search",
      label: `“${urlSearch}”`,
      name: `search “${urlSearch}”`,
      onRemove: handleSearchClear,
      isSearch: true,
    });
  }
  if (categoriesPending) {
    // A deep-linked category has no name until the tree arrives; its chip
    // holds its place meanwhile, so neither the chips nor the grid move.
    selectedCategories.forEach((token, index) =>
      appliedFilters.push({ key: `pending-${index}`, isPending: true })
    );
  } else {
    selectedCategoryList.forEach((cat) =>
      appliedFilters.push({
        key: `category-${cat.id}`,
        label: cat.name,
        onRemove: () => toggleCategoryFromPage(categoryParam(cat)),
      })
    );
  }
  const appliedPrice = priceLabel(minPrice, maxPrice);
  if (appliedPrice) {
    appliedFilters.push({ key: "price", label: appliedPrice, onRemove: handlePriceClear });
  }
  if (minRating > 0) {
    appliedFilters.push({
      key: "rating",
      label: `${starsLabel(minRating)} & up`,
      onRemove: () => handleRatingChange(0),
    });
  }
  if (minDiscount > 0) {
    appliedFilters.push({
      key: "discount",
      label: `${minDiscount}% off or more`,
      onRemove: () => handleDiscountChange(0),
    });
  }
  if (inStockOnly) {
    appliedFilters.push({ key: "stock", label: "In stock only", onRemove: handleInStockToggle });
  }
  selectedBrands.forEach((brand) =>
    appliedFilters.push({
      key: `brand-${brand}`,
      label: brand,
      onRemove: () => handleBrandToggle(brand),
    })
  );
  // The sheet's filters in force (the search is set from the header).
  const activeFilterCount = appliedFilters.filter((filter) => !filter.isSearch).length;

  // ---- Pagination range ----
  const paginationRange = useMemo(() => {
    const range = [];
    const delta = 2;
    const left = Math.max(2, safePage - delta);
    const right = Math.min(totalPages - 1, safePage + delta);

    range.push(1);
    if (left > 2) range.push("...");
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push("...");
    if (totalPages > 1) range.push(totalPages);

    return range;
  }, [safePage, totalPages]);

  // ---- Filters (rendered in the rail and in the sheet) ----
  // `instance` keeps ids and radio-group names unique: both copies can be in
  // the document at once.
  const renderCategoryOption = (cat, depth) => {
    const count = categoryCounts.get(String(cat.id)) || 0;
    return (
      <label className={`sf-check ${styles.option} ${depth === 0 ? styles.optionDepartment : ""}`}>
        <input
          type="checkbox"
          checked={selectedCategories.some(
            (t) => t === cat.slug || String(t) === String(cat.id)
          )}
          onChange={() => toggleCategoryFromPage(categoryParam(cat))}
        />
        <span className={styles.optionText}>{cat.name}</span>
        <span className={styles.optionCount} aria-hidden="true">
          {count}
        </span>
        <span className="sf-visually-hidden">
          , {count} {count === 1 ? "piece" : "pieces"}
        </span>
      </label>
    );
  };

  // A category's descendants as nested lists, so assistive technology hears
  // the hierarchy the indent shows (leaf names repeat across tiers).
  const renderCategoryBranch = (parentId) => {
    const children = categoryChildren.get(String(parentId));
    if (!children) return null;
    return (
      <ul className={styles.subtree}>
        {children.map((child) => (
          <li key={child.id}>
            {renderCategoryOption(child, 1)}
            {renderCategoryBranch(child.id)}
          </li>
        ))}
      </ul>
    );
  };

  const renderFilters = (instance) => {
    if (loading) return <FiltersSkeleton />;
    const id = `${uid}${instance}`;

    return (
      <div className={instance === "sheet" ? styles.filtersInSheet : undefined}>
        {/* Category: an outline of departments, open for the active one */}
        {departments.length > 0 && (
          <fieldset className={styles.group}>
            <legend className={`sf-eyebrow ${styles.legend}`}>Category</legend>
            <ul className={styles.tree}>
              {departments.map((category) => {
                const key = String(category.id);
                const hasChildren = categoryChildren.has(key);
                const open = openDepartments.has(key);
                const panelId = `${id}-department-${key}`;
                return (
                  <li key={key}>
                    <div className={styles.treeRow}>
                      {renderCategoryOption(category, 0)}
                      {hasChildren && (
                        <button
                          type="button"
                          className={styles.disclosure}
                          aria-expanded={open}
                          aria-controls={panelId}
                          aria-label={`${category.name} subcategories`}
                          onClick={() => toggleDepartment(key)}
                        >
                          <span className={styles.disclosureGlyph} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {hasChildren && (
                      <div id={panelId} hidden={!open}>
                        {renderCategoryBranch(category.id)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}

        {/* Price: Min / Max (applied with the button or Enter) and quick ranges */}
        <fieldset className={styles.group}>
          <legend className={`sf-eyebrow ${styles.legend}`}>Price</legend>
          <form
            className={styles.priceForm}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              handlePriceApply();
            }}
          >
            <div className={styles.priceFields}>
              <div className="sf-field">
                <label className="sf-field__label" htmlFor={`${id}-min-price`}>
                  Min
                </label>
                <span className={styles.money}>
                  <span className={styles.currency} aria-hidden="true">
                    {"₹"}
                  </span>
                  <input
                    id={`${id}-min-price`}
                    className={`sf-input ${styles.moneyInput}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={minPrice}
                    onChange={(e) => setMinPrice(cleanPriceInput(e.target.value))}
                  />
                </span>
              </div>
              <div className="sf-field">
                <label className="sf-field__label" htmlFor={`${id}-max-price`}>
                  Max
                </label>
                <span className={styles.money}>
                  <span className={styles.currency} aria-hidden="true">
                    {"₹"}
                  </span>
                  <input
                    id={`${id}-max-price`}
                    className={`sf-input ${styles.moneyInput}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(cleanPriceInput(e.target.value))}
                  />
                </span>
              </div>
            </div>
            <button type="submit" className={`sf-btn sf-btn--ghost ${styles.priceApply}`}>
              Apply price
            </button>
          </form>
          <ul className={styles.ranges} aria-label="Price ranges">
            {PRICE_RANGES.map((range) => (
              <li key={range.label}>
                <button
                  type="button"
                  className={`sf-chip ${styles.rangeChip}`}
                  aria-pressed={isRangeActive(range)}
                  onClick={() => handleQuickRange(range)}
                >
                  {range.label}
                </button>
              </li>
            ))}
          </ul>
        </fieldset>

        {/* Customer rating (pressing the chosen one again clears it) */}
        <fieldset className={`${styles.group} ${styles.ratingGroup}`}>
          <legend className={`sf-eyebrow ${styles.legend}`}>Customer rating</legend>
          {RATING_OPTIONS.map((r) => (
            <label key={r} className={`sf-radio ${styles.option}`}>
              <input
                type="radio"
                name={`${id}-rating`}
                checked={minRating === r}
                onChange={() => handleRatingChange(r)}
                onClick={() => { if (minRating === r) handleRatingChange(0); }}
              />
              <StarRating rating={r} size={14} label={starsLabel(r)} />{" "}
              <span className={styles.optionText}>&amp; up</span>
            </label>
          ))}
        </fieldset>

        {/* Discount (pressing the chosen one again clears it) */}
        <fieldset className={styles.group}>
          <legend className={`sf-eyebrow ${styles.legend}`}>Discount</legend>
          {DISCOUNT_OPTIONS.map((d) => (
            <label key={d} className={`sf-radio ${styles.option}`}>
              <input
                type="radio"
                name={`${id}-discount`}
                checked={minDiscount === d}
                onChange={() => handleDiscountChange(d)}
                onClick={() => { if (minDiscount === d) handleDiscountChange(0); }}
              />
              <span className={styles.optionText}>{d}% or more</span>
            </label>
          ))}
        </fieldset>

        {/* Availability */}
        <fieldset className={styles.group}>
          <legend className={`sf-eyebrow ${styles.legend}`}>Availability</legend>
          <label className={`sf-switch ${styles.option}`}>
            <input
              type="checkbox"
              role="switch"
              checked={inStockOnly}
              onChange={handleInStockToggle}
            />
            <span className={styles.optionText}>In stock only</span>
          </label>
        </fieldset>

        {/* Brand */}
        {availableBrands.length > 0 && (
          <fieldset className={styles.group}>
            <legend className={`sf-eyebrow ${styles.legend}`}>Brand</legend>
            {availableBrands.map((brand) => (
              <label key={brand} className={`sf-check ${styles.option}`}>
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => handleBrandToggle(brand)}
                />
                <span className={styles.optionText}>{brand}</span>
              </label>
            ))}
          </fieldset>
        )}
      </div>
    );
  };

  // ---- Results: skeletons, the error panel, the empty state, cards or rows ----
  const renderResults = () => {
    if (loading) {
      return (
        <ul key="loading" className={viewMode === "list" ? styles.rows : styles.grid} aria-hidden="true">
          {Array.from({ length: perPage }).map((_, i) => (
            <li key={i} className={styles.item}>
              {viewMode === "list" ? <ProductListRowSkeleton /> : <ProductCardSkeleton />}
            </li>
          ))}
        </ul>
      );
    }

    if (fetchError) {
      // Fetch failed — never masquerade as "No products found"
      return (
        <div className={`sf-panel ${styles.state} ${styles.statePanel}`}>
          <h2 className={styles.stateTitle}>We couldn&rsquo;t load the catalogue.</h2>
          <p className={styles.stateText}>Check your connection and try again.</p>
          <button type="button" className="sf-btn sf-btn--primary" onClick={fetchCatalog}>
            Try again
          </button>
        </div>
      );
    }

    if (paginatedProducts.length === 0) {
      return (
        <div className={styles.state}>
          <h2 className={styles.stateTitle}>No pieces to show.</h2>
          <p className={styles.stateText}>
            {urlSearch ? (
              <>
                We couldn&rsquo;t find anything matching &ldquo;{urlSearch}&rdquo;. Try
                another word, or clear the filters.
              </>
            ) : hasActiveFilters ? (
              "None of our pieces match these filters. Try removing one or two."
            ) : (
              "The catalogue is empty just now."
            )}
          </p>
          {hasAnyConstraint && (
            <button type="button" className="sf-btn sf-btn--ghost" onClick={clearAllFromPage}>
              Clear all filters
            </button>
          )}
        </div>
      );
    }

    return (
      <ul key={viewMode} className={viewMode === "list" ? styles.rows : styles.grid}>
        {paginatedProducts.map((product, index) => {
          const lowStock = lowStockCount(product);
          const content =
            viewMode === "list" ? (
              <ProductListRow
                product={product}
                lowStock={lowStock}
                onAddToCart={(item) => addToCart(item)}
                onToggleWishlist={toggleWishlist}
                isWishlisted={isInWishlist(product.id)}
              />
            ) : (
              <>
                <ProductCard
                  product={product}
                  onAddToCart={(item) => addToCart(item)}
                  onToggleWishlist={toggleWishlist}
                  isWishlisted={isInWishlist(product.id)}
                />
                {lowStock != null && <p className={styles.stockNote}>Only {lowStock} left</p>}
              </>
            );
          return index < REVEAL_COUNT ? (
            <Reveal as="li" key={product.id} className={styles.item} delay={staggerDelay(index)}>
              {content}
            </Reveal>
          ) : (
            <li key={product.id} className={styles.item}>
              {content}
            </li>
          );
        })}
      </ul>
    );
  };

  // ============================
  // RENDER
  // ============================
  return (
    <div>
      {/* ===== Page header ===== */}
      <header className={styles.header}>
        <div className="sf-container sf-container--wide">
          {headerPending ? (
            <span className={styles.skeletonCrumbs} aria-hidden="true">
              <span className="sf-skeleton" />
              <span className="sf-skeleton" />
            </span>
          ) : (
            <Breadcrumb items={breadcrumbItems} className={styles.crumbs} />
          )}
          <h1 className={`sf-display-lg ${styles.title}`}>
            {headerPending && !urlSearch ? (
              <span className={`sf-skeleton ${styles.skeletonTitle}`} aria-hidden="true" />
            ) : (
              heading
            )}
          </h1>
          {headerPending && !urlSearch ? (
            <span className={styles.skeletonIntro} aria-hidden="true">
              <span className={`sf-skeleton ${styles.skeletonIntroLine}`} />
              <span className={`sf-skeleton ${styles.skeletonIntroLine}`} />
              <span className={`sf-skeleton ${styles.skeletonIntroLine}`} />
            </span>
          ) : (
            intro && <p className={styles.intro}>{intro}</p>
          )}
        </div>
      </header>

      <div className={`sf-container sf-container--wide ${styles.layout}`}>
        {/* ===== Filter rail (from 1024px) ===== */}
        <section className={styles.rail} aria-labelledby={`${uid}filters`}>
          <div className={styles.railHeader}>
            <h2 id={`${uid}filters`} className={styles.railTitle}>
              Filters
            </h2>
            {hasActiveFilters && (
              <button type="button" className="sf-btn sf-btn--link" onClick={clearAllFromPage}>
                Clear all
              </button>
            )}
          </div>
          {renderFilters("rail")}
        </section>

        {/* ===== Results ===== */}
        <section className={styles.results} ref={mainRef} aria-label="Results">
          {/* Toolbar: Filters (below 1024px), Sort; sticky under the header on phones */}
          <div className={styles.toolbar}>
            <button
              type="button"
              className={`sf-btn sf-btn--ghost ${styles.filtersButton}`}
              onClick={openFilters}
              aria-haspopup="dialog"
              aria-expanded={mobileFiltersOpen}
            >
              <span className={`sf-btn__icon ${styles.filtersIcon}`}>
                <FiltersIcon />
              </span>
              Filters
              {activeFilterCount > 0 && (
                <>
                  <span className={`sf-count ${styles.filtersCount}`} aria-hidden="true">
                    {activeFilterCount}
                  </span>
                  <span className="sf-visually-hidden">, {activeFilterCount} applied</span>
                </>
              )}
            </button>

            <div className={styles.sort}>
              <label className={styles.sortLabel} htmlFor={`${uid}sort`}>
                Sort
              </label>
              <select
                id={`${uid}sort`}
                className={`sf-select ${styles.sortSelect}`}
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className={styles.count} aria-live="polite" aria-atomic="true">
            {loading ? (
              "Loading pieces…"
            ) : fetchError ? (
              "Couldn’t load the catalogue"
            ) : filteredProducts.length === 0 ? (
              "No pieces to show"
            ) : filteredProducts.length > perPage ? (
              <>
                Showing{" "}
                <strong>
                  {(safePage - 1) * perPage + 1}&ndash;
                  {Math.min(safePage * perPage, filteredProducts.length)}
                </strong>{" "}
                of <strong>{filteredProducts.length}</strong> pieces
              </>
            ) : (
              <>
                Showing <strong>{filteredProducts.length}</strong>{" "}
                {filteredProducts.length === 1 ? "piece" : "pieces"}
              </>
            )}
          </p>

          <div className={styles.view} role="group" aria-label="View">
            <button
              type="button"
              className={styles.viewButton}
              aria-pressed={viewMode === "grid"}
              aria-label="Grid view"
              onClick={() => setViewMode("grid")}
            >
              <GridIcon />
            </button>
            <button
              type="button"
              className={styles.viewButton}
              aria-pressed={viewMode === "list"}
              aria-label="List view"
              onClick={() => setViewMode("list")}
            >
              <ListIcon />
            </button>
          </div>

          {/* Applied filters */}
          {appliedFilters.length > 0 && (
            <div className={styles.applied}>
              <ul className={styles.chips} aria-label="Applied filters">
                {appliedFilters.map((filter) =>
                  filter.isPending ? (
                    <li key={filter.key} aria-hidden="true">
                      <span className={`sf-skeleton ${styles.chipSkeleton}`} />
                    </li>
                  ) : (
                    <li key={filter.key}>
                      <button
                        type="button"
                        className={`sf-chip ${styles.chip}`}
                        aria-label={`Remove ${filter.name || filter.label}`}
                        onClick={filter.onRemove}
                      >
                        {filter.label}
                        <span className={styles.chipIcon}>
                          <RemoveIcon />
                        </span>
                      </button>
                    </li>
                  )
                )}
              </ul>
              {appliedFilters.length > 1 && (
                <button
                  type="button"
                  className={`sf-btn sf-btn--link ${styles.appliedClear}`}
                  onClick={clearAllFromPage}
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Product grid / list. The loading region and the results region
              are separate elements: the results replace the skeletons rather
              than the skeletons' region moving to make room for them. */}
          <div
            key={loading ? "loading" : "results"}
            className={styles.body}
            aria-busy={loading || undefined}
          >
            {renderResults()}
          </div>

          {/* Pagination */}
          {!loading && filteredProducts.length > perPage && (
            <nav className={styles.pagination} aria-label="Pagination">
              <div className={styles.perPage}>
                <label className={styles.perPageLabel} htmlFor={`${uid}per-page`}>
                  Per page
                </label>
                <select
                  id={`${uid}per-page`}
                  className={`sf-select ${styles.perPageSelect}`}
                  value={perPage}
                  onChange={(e) => handlePerPageChange(Number(e.target.value))}
                >
                  {PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className={styles.pager}>
                <button
                  type="button"
                  className={`sf-btn sf-btn--ghost ${styles.step} ${styles.stepPrevious}`}
                  disabled={safePage <= 1}
                  onClick={() => handlePageChange(safePage - 1)}
                  aria-label="Previous page"
                >
                  <span className="sf-btn__icon">
                    <ChevronLeft />
                  </span>
                  <span className={styles.stepText}>Previous</span>
                </button>

                <ol className={styles.pages}>
                  {paginationRange.map((item, i) =>
                    item === "..." ? (
                      <li key={`ellipsis-${i}`} className={styles.ellipsis} aria-hidden="true">
                        &hellip;
                      </li>
                    ) : (
                      <li key={item}>
                        <button
                          type="button"
                          className={styles.pageButton}
                          aria-current={safePage === item ? "page" : undefined}
                          aria-label={`Page ${item}`}
                          onClick={() => handlePageChange(item)}
                        >
                          {item}
                        </button>
                      </li>
                    )
                  )}
                </ol>

                <button
                  type="button"
                  className={`sf-btn sf-btn--ghost ${styles.step} ${styles.stepNext}`}
                  disabled={safePage >= totalPages}
                  onClick={() => handlePageChange(safePage + 1)}
                  aria-label="Next page"
                >
                  <span className={styles.stepText}>Next</span>
                  <span className="sf-btn__icon">
                    <ChevronRight />
                  </span>
                </button>
              </div>

              <p className={styles.pageInfo}>
                Page {safePage} of {totalPages}
              </p>
            </nav>
          )}
        </section>
      </div>

      {/* ===== Filter sheet (below 1024px) ===== */}
      <BottomDrawer
        open={mobileFiltersOpen}
        onClose={closeFilters}
        title="Filters"
        maxHeight="85vh"
        footer={
          <>
            <button
              type="button"
              className={`sf-btn sf-btn--ghost ${styles.sheetClear}`}
              onClick={clearAllFromPage}
              disabled={!hasAnyConstraint}
            >
              Clear all
            </button>
            <button
              type="button"
              className={`sf-btn sf-btn--primary ${styles.sheetApply}`}
              onClick={closeFilters}
            >
              Show {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "result" : "results"}
            </button>
          </>
        }
      >
        {renderFilters("sheet")}
      </BottomDrawer>
    </div>
  );
};

export default Products;
