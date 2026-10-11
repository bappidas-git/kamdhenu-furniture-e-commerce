import { STORAGE_NAMES, createMemoryStorage, installStorageFallback } from "./storageFallback";

// With site data blocked the browser throws on any use of its storages; the
// app then runs on storage kept in memory (V2-01, finding F2; fixed by V2-05).

const blocked = () => {
  throw new DOMException("Access is denied for this document.", "SecurityError");
};

// A stand-in for window whose storages throw, as a blocking browser's do.
const blockedScope = () => {
  const scope = {};
  STORAGE_NAMES.forEach((name) => Object.defineProperty(scope, name, { configurable: true, get: blocked }));
  return scope;
};

describe("createMemoryStorage", () => {
  test("reads, writes and removes strings like the browser's storage", () => {
    const storage = createMemoryStorage();
    expect(storage.getItem("cart")).toBeNull();
    storage.setItem("cart", JSON.stringify([{ id: 1 }]));
    storage.setItem("count", 3);
    expect(storage.getItem("cart")).toBe('[{"id":1}]');
    expect(storage.getItem("count")).toBe("3");
    expect(storage).toHaveLength(2);
    expect(storage.key(0)).toBe("cart");
    expect(storage.key(5)).toBeNull();
    storage.removeItem("cart");
    expect(storage.getItem("cart")).toBeNull();
    storage.clear();
    expect(storage).toHaveLength(0);
  });

  test("each storage is its own", () => {
    const local = createMemoryStorage();
    const session = createMemoryStorage();
    local.setItem("theme", "dark");
    expect(session.getItem("theme")).toBeNull();
  });
});

describe("installStorageFallback", () => {
  test("replaces storages that throw with ones kept in memory", () => {
    const scope = blockedScope();
    expect(() => scope.localStorage).toThrow("Access is denied");
    expect(installStorageFallback(scope)).toEqual(["localStorage", "sessionStorage"]);
    scope.localStorage.setItem("theme", "dark");
    scope.sessionStorage.setItem("token", "abc");
    expect(scope.localStorage.getItem("theme")).toBe("dark");
    expect(scope.sessionStorage.getItem("token")).toBe("abc");
    expect(scope.localStorage.getItem("token")).toBeNull();
  });

  test("leaves readable storages as they are", () => {
    const local = window.localStorage;
    const session = window.sessionStorage;
    expect(installStorageFallback(window)).toEqual([]);
    expect(window.localStorage).toBe(local);
    expect(window.sessionStorage).toBe(session);
  });

  test("replaces only the storage that throws", () => {
    const scope = blockedScope();
    const session = createMemoryStorage();
    Object.defineProperty(scope, "sessionStorage", { configurable: true, value: session });
    expect(installStorageFallback(scope)).toEqual(["localStorage"]);
    expect(scope.sessionStorage).toBe(session);
  });

  test("a storage that cannot be redefined is left alone, without throwing", () => {
    const scope = {};
    STORAGE_NAMES.forEach((name) => Object.defineProperty(scope, name, { configurable: false, get: blocked }));
    expect(installStorageFallback(scope)).toEqual([]);
  });
});
