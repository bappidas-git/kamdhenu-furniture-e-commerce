import apiService from "../../services/api";
import { categoryParam, getMainMenuCategories } from "../../utils/categories";

// =============================================================================
// searchData — the search overlay's data rules
// =============================================================================
// The catalogue cache, the recent-searches store, the category chips and the
// relevance scoring of the search overlay. Prompt 15 moved them here from
// SearchModal.js unchanged, so the overlay's markup and its rules can be read
// (and tested) apart. Added alongside them: searchProducts() (the overlay's
// runSearch pipeline as a pure function), matchesSearch() (the same rule as
// a yes/no, used by the product listing's ?search= filter),
// removeRecentSearch() (a recent chip's ×), getPopularSuggestions() and
// getDepartments() (data-derived suggestions in place of the old demo
// TRENDING_SEARCHES list), and peekSearchData() / clearSearchDataCache().
// =============================================================================

// Category filter chips (and the slugs each one matches) are derived at runtime
// from the live category tree — see buildCategoryNav() — so they always reflect
// what's in the catalogue with no hardcoded list to drift out of sync.

export const RECENT_SEARCHES_KEY = "recentSearches";
export const MAX_RECENT_SEARCHES = 8;
export const MAX_RESULTS = 12;
export const DEBOUNCE_MS = 300;
// "Popular" lists at most this many trending products.
export const POPULAR_COUNT = 6;

// ---------------------------------------------------------------------------
// Module-level cache — shared across every SearchModal instance (Header +
// BottomNav) so the catalogue is fetched once instead of on every open.
// ---------------------------------------------------------------------------
let searchDataCache = null; // { products, categories }
let searchDataPromise = null;

export const loadSearchData = () => {
  if (searchDataCache) return Promise.resolve(searchDataCache);
  if (!searchDataPromise) {
    searchDataPromise = Promise.all([
      apiService.products.getAll(),
      apiService.categories.getAll(),
    ])
      .then(([products, categories]) => {
        searchDataCache = {
          products: Array.isArray(products) ? products : [],
          categories: Array.isArray(categories) ? categories : [],
        };
        return searchDataCache;
      })
      .catch((err) => {
        searchDataPromise = null; // allow a retry on the next open
        throw err;
      });
  }
  return searchDataPromise;
};

// The cached catalogue, or null before the first successful load. Lets an
// instance opening after the other one has loaded render at once.
export const peekSearchData = () => searchDataCache;

// Tests only: forget the cached catalogue, so the next open fetches again.
export const clearSearchDataCache = () => {
  searchDataCache = null;
  searchDataPromise = null;
};

// ---------------------------------------------------------------------------
// Recent searches (localStorage)
// ---------------------------------------------------------------------------
export const getRecentSearches = () => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveRecentSearch = (query) => {
  try {
    const recent = getRecentSearches();
    const filtered = recent.filter((s) => s.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return getRecentSearches();
  }
};

export const clearRecentSearches = () => {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // ignore
  }
};

// Drop one term (the × on a recent chip). The list is already de-duplicated
// case-insensitively, so at most one entry goes; removing the last one clears
// the key, as "Clear all" does.
export const removeRecentSearch = (term) => {
  try {
    const lower = String(term).toLowerCase();
    const updated = getRecentSearches().filter((s) => String(s).toLowerCase() !== lower);
    if (updated.length > 0) localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    else localStorage.removeItem(RECENT_SEARCHES_KEY);
    return updated;
  } catch {
    return getRecentSearches();
  }
};

// ---------------------------------------------------------------------------
// Category resolution — products reference a numeric categoryId; resolve it to
// a { name, slug } via the categories list. Tolerant of the Laravel shape too
// (string slug or nested object), so both API branches keep working.
// ---------------------------------------------------------------------------
export const buildCategoryMap = (categories) => {
  const byId = {};
  const bySlug = {};
  (categories || []).forEach((c) => {
    if (!c) return;
    if (c.id != null) byId[c.id] = c;
    if (c.slug) bySlug[String(c.slug).toLowerCase()] = c;
  });
  return { byId, bySlug };
};

// Build the storefront filter chips straight from the live category tree, so
// adding / renaming / removing a category in the admin is reflected here with no
// code change. One chip per active top-level category; each chip matches that
// category's slug AND all of its descendants' slugs (so a "Women's Ethnic Wear"
// chip still surfaces Sarees / Kurtas products). Returns { chips, groups }.
export const buildCategoryNav = (categories) => {
  const list = (Array.isArray(categories) ? categories : []).filter(
    (c) => c && c.isActive !== false
  );
  const byParent = {};
  list.forEach((c) => {
    const key = c.parentId == null ? "root" : String(c.parentId);
    (byParent[key] = byParent[key] || []).push(c);
  });
  const descendantSlugs = (cat) => {
    const slugs = [];
    const stack = [cat];
    while (stack.length) {
      const cur = stack.pop();
      if (cur.slug) slugs.push(String(cur.slug).toLowerCase());
      (byParent[String(cur.id)] || []).forEach((child) => stack.push(child));
    }
    return slugs;
  };
  const tops = (byParent.root || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.name).localeCompare(String(b.name)));
  const chips = ["All", ...tops.map((c) => c.name)];
  const groups = {};
  tops.forEach((c) => { groups[c.name] = descendantSlugs(c); });
  return { chips, groups };
};

export const resolveCategory = (product, map) => {
  if (!product) return { name: "", slug: "" };
  if (typeof product.category === "string" && product.category) {
    const slug = product.category.toLowerCase();
    const found = map.bySlug[slug];
    return { name: found ? found.name : product.category, slug: found ? String(found.slug).toLowerCase() : slug };
  }
  if (product.category && typeof product.category === "object") {
    return {
      name: product.category.name || "",
      slug: String(product.category.slug || "").toLowerCase(),
    };
  }
  const byId = map.byId[product.categoryId];
  if (byId) return { name: byId.name, slug: String(byId.slug || "").toLowerCase() };
  return { name: "", slug: "" };
};

export const matchesCategoryChip = (product, chip, catInfo, groups = {}) => {
  if (!chip || chip === "All") return true;
  const group = groups[chip] || [chip.toLowerCase()];
  const slug = (catInfo.slug || "").toLowerCase();
  const name = (catInfo.name || "").toLowerCase();
  const chipLower = chip.toLowerCase();
  if (group.includes(slug)) return true;
  if ((name && name.includes(chipLower)) || (slug && slug.includes(chipLower))) return true;
  const tags = (product.tags || []).map((t) => String(t).toLowerCase());
  if (group.some((g) => tags.includes(g))) return true;
  return false;
};

// ---------------------------------------------------------------------------
// Relevance scoring: exact name → starts-with → word match → contains →
// tags → brand/category → description, with a small trending/hot boost.
// ---------------------------------------------------------------------------
export const scoreProduct = (product, lowerQuery, catInfo) => {
  let score = 0;
  const name = (product.name || "").toLowerCase();
  const desc = (product.shortDescription || "").toLowerCase();
  const brand = (product.brand || "").toLowerCase();
  const tags = (product.tags || []).map((t) => String(t).toLowerCase());
  const catName = (catInfo.name || "").toLowerCase();
  const catSlug = (catInfo.slug || "").toLowerCase();

  // Name
  if (name === lowerQuery) score += 100;
  else if (name.startsWith(lowerQuery)) score += 80;
  else if (name.split(/\s+/).some((w) => w.startsWith(lowerQuery))) score += 60;
  else if (name.includes(lowerQuery)) score += 40;

  // Tags
  if (tags.some((t) => t === lowerQuery)) score += 30;
  else if (tags.some((t) => t.startsWith(lowerQuery))) score += 20;
  else if (tags.some((t) => t.includes(lowerQuery))) score += 10;

  // Category / brand
  if (catName.includes(lowerQuery) || catSlug.includes(lowerQuery)) score += 15;
  if (brand.includes(lowerQuery)) score += 15;

  // Description (weakest signal)
  if (desc.includes(lowerQuery)) score += 5;

  // Only matched products are eligible. Trending/hot give a small ranking
  // boost on top of a real match — never a reason to surface a non-match.
  if (score <= 0) return 0;
  if (product.trending) score += 3;
  if (product.hot) score += 2;

  return score;
};

// ---------------------------------------------------------------------------
// The search itself — the pipeline SearchModal's runSearch ran inline before
// Prompt 15: every product scored against the query, kept when it matches and
// falls inside the selected chip, best first. Array#sort is stable, so equal
// scores keep the catalogue's order.
// ---------------------------------------------------------------------------
export const searchProducts = (allProducts, categoryMap, groups, rawQuery, category) => {
  const lowerQuery = (rawQuery || "").toLowerCase().trim();
  if (!lowerQuery) return [];
  const cat = category || "All";
  return (allProducts || [])
    .map((product) => {
      const catInfo = resolveCategory(product, categoryMap);
      return { product, catInfo, score: scoreProduct(product, lowerQuery, catInfo) };
    })
    .filter((entry) => entry.score > 0 && matchesCategoryChip(entry.product, cat, entry.catInfo, groups))
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({ ...entry.product, _catName: entry.catInfo.name }));
};

// Whether a product matches a query at all: any positive score, i.e. the
// query occurs in its name, tags, category name or slug, brand or short
// description. The product listing filters `?search=` with it, so the
// overlay's "View all N results" lands on the same N products. A blank query
// matches everything, as the listing has always treated one.
export const matchesSearch = (product, rawQuery, categoryMap) => {
  const lowerQuery = (rawQuery || "").toLowerCase().trim();
  return scoreProduct(product, lowerQuery, resolveCategory(product, categoryMap)) > 0;
};

// ---------------------------------------------------------------------------
// Suggestions shown before typing — from data only, never a demo list.
// ---------------------------------------------------------------------------

// The departments: the admin-managed main menu (active, `showInMainMenu`, in
// menu order), the same list the header, sidebar and footer show.
export const getDepartments = (categories) =>
  getMainMenuCategories(Array.isArray(categories) ? categories.filter(Boolean) : []);

// A department's listing, by the canonical `?category=<slug>` link.
export const departmentPath = (category) => `/products?category=${categoryParam(category)}`;

// "Popular": the names of the first POPULAR_COUNT active products the admin
// flags as trending, in catalogue order; a chip runs a search for its name.
// With none flagged, the departments stand in, labelled "Departments" (a
// department is not a popularity claim); a chip opens its listing.
export const getPopularSuggestions = (products, categories) => {
  const trending = (Array.isArray(products) ? products : [])
    .filter((p) => p && p.trending && p.isActive !== false && typeof p.name === "string" && p.name.trim())
    .slice(0, POPULAR_COUNT);
  if (trending.length > 0) {
    return {
      kind: "popular",
      items: trending.map((p) => ({ key: String(p.id ?? p.name), label: p.name.trim() })),
    };
  }
  return {
    kind: "departments",
    items: getDepartments(categories).map((c) => ({
      key: String(c.id ?? c.slug),
      label: c.name,
      to: departmentPath(c),
    })),
  };
};
