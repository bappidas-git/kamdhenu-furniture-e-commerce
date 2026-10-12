// =============================================================================
// storageFallback — the app keeps working when the browser refuses storage
// =============================================================================
//
// A browser set to block all site data throws a SecurityError on any use of
// window.localStorage or window.sessionStorage. The providers read them on
// their first render (the theme, the sessions, the wishlist, the cart), so the
// storefront showed only the crash screen (V2-01, finding F2). src/index.js
// calls installStorageFallback() before React renders: a storage that cannot
// be read is replaced, for this page, by one kept in memory. The visit works
// and nothing is kept after it, which is what blocking site data asks for.
// Where storage can be read, as on every ordinary visit, nothing changes. The
// pre-paint script in public/index.html guards its own read.
// =============================================================================

export const STORAGE_NAMES = ["localStorage", "sessionStorage"];

// The Storage interface (getItem, setItem, removeItem, clear, key, length),
// over a Map. Keys and values are strings, as in the browser's own.
export const createMemoryStorage = () => {
  const items = new Map();
  return {
    get length() {
      return items.size;
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => (items.has(String(key)) ? items.get(String(key)) : null),
    setItem: (key, value) => {
      items.set(String(key), String(value));
    },
    removeItem: (key) => {
      items.delete(String(key));
    },
    clear: () => {
      items.clear();
    },
  };
};

const isReadable = (scope, name) => {
  try {
    scope[name].getItem("");
    return true;
  } catch {
    return false;
  }
};

/**
 * Replaces each of `scope`'s storages that cannot be read with one kept in
 * memory. Returns the names replaced. A storage whose property cannot be
 * redefined is left as it is.
 */
export const installStorageFallback = (scope = window) => {
  const replaced = [];
  STORAGE_NAMES.forEach((name) => {
    if (isReadable(scope, name)) return;
    try {
      Object.defineProperty(scope, name, {
        configurable: true,
        enumerable: true,
        value: createMemoryStorage(),
      });
      replaced.push(name);
    } catch {
      // Not redefinable: the app behaves as it did before.
    }
  });
  return replaced;
};
