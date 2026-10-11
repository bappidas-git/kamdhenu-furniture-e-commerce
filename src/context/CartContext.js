import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";
import apiService from "../services/api";
import { TOKENS } from "../theme/tokens";
import Swal from "sweetalert2";

// Two contexts (Prompt 32 follow-up): the cart's state (its lines, whether the
// drawer is open, the totals) and its actions. The actions never change, so a
// component that only adds to the cart (a product page, a listing) reads them
// with useCartActions and does not re-render when the cart changes; before,
// every add re-rendered the whole product page under the opening drawer.
const CartStateContext = createContext(null);
const CartActionsContext = createContext(null);

/** The cart's state and actions; re-renders whenever the cart changes. */
export const useCart = () => {
  const state = useContext(CartStateContext);
  const actions = useContext(CartActionsContext);
  if (!state || !actions) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};

/**
 * The cart's actions alone (addToCart, removeFromCart, updateQuantity,
 * clearCart, toggleCart, setIsCartOpen), the same for the provider's life.
 */
export const useCartActions = () => {
  const actions = useContext(CartActionsContext);
  if (!actions) {
    throw new Error("useCartActions must be used within a CartProvider");
  }
  return actions;
};

// Canonical line key. A cart "line" is uniquely identified by its product and
// the chosen variant, so the same variant added twice increments one line while
// two different variants of the same product become two distinct lines. Every
// add path (PDP, product cards, wishlist, offers) funnels through this so ids
// never drift between callers (the source of the old duplicate-line bug).
const lineKey = (productId, variantId) =>
  `${productId ?? "item"}-${variantId ?? "default"}`;

// Coerce any "add" payload into the one shape the cart stores. The line `id` is
// always recomputed from productId + variantId so a caller-supplied id can never
// collide with another caller's scheme.
const normalizeCartItem = (raw = {}) => {
  const productId = raw.productId ?? raw.id ?? null;
  const variantId = raw.variantId ?? null;
  const stock =
    raw.stock === undefined || raw.stock === null || raw.stock === ""
      ? null
      : Number(raw.stock);

  return {
    id: lineKey(productId, variantId),
    productId,
    variantId,
    // Accept the legacy `variant` field too, but normalize to `variantName`.
    variantName: raw.variantName || raw.variant || null,
    name: raw.name || "Item",
    image: raw.image || raw.product?.images?.[0] || raw.product?.image || "",
    price: Number(raw.price) || 0,
    comparePrice: Number(raw.comparePrice) || 0,
    currency: raw.currency || "INR",
    quantity: Math.max(1, parseInt(raw.quantity, 10) || 1),
    // Only carried when known; gates the stock cap (otherwise unenforced).
    ...(stock !== null && !Number.isNaN(stock) ? { stock } : {}),
  };
};

// Clamp a desired quantity to [1, stock] when stock is known, else [1, ∞).
// The cart as the API sync writes it (replaceApiCart's fields, one entry per
// line, in a stable order): two carts with the same key need no write between
// them. The server's rows are normalised the same way, so a duplicate row
// there makes the keys differ, and the next sync tidies it.
const syncKey = (items) =>
  JSON.stringify(
    (items || [])
      .map((item) => [
        item.id,
        item.productId,
        item.variantId ?? null,
        item.variantName ?? null,
        item.name,
        item.image,
        item.price,
        item.comparePrice,
        item.currency,
        item.quantity,
        item.stock ?? null,
      ])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  );

const clampQty = (qty, stock) => {
  const q = Math.max(1, qty);
  return typeof stock === "number" && stock > 0 ? Math.min(q, stock) : q;
};

// Merge two carts by line key: keep every distinct line (no silent loss) and,
// for a line present in both, take the larger quantity (no duplicates, and
// idempotent across repeated logins). Used when a guest logs in.
const mergeCarts = (primary = [], secondary = []) => {
  const byId = new Map();
  primary.forEach((item) => byId.set(item.id, { ...item }));
  secondary.forEach((item) => {
    const existing = byId.get(item.id);
    if (existing) {
      existing.quantity = clampQty(
        Math.max(existing.quantity, item.quantity),
        existing.stock ?? item.stock
      );
      // Backfill any display fields the primary line was missing.
      existing.image = existing.image || item.image;
      existing.variantName = existing.variantName || item.variantName;
      existing.comparePrice = existing.comparePrice || item.comparePrice;
    } else {
      byId.set(item.id, { ...item });
    }
  });
  return Array.from(byId.values());
};

// Shared SweetAlert toast config so every cart toast is themed/positioned alike.
const cartToast = (options) =>
  Swal.fire({
    toast: true,
    position: "bottom-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    ...options,
  });

// How long an opening drawer takes to slide in (or, under reduced motion, to
// fade in): --sf-duration (motionPresets' OVERLAY_ENTER).
const DRAWER_ENTER_MS = TOKENS.motion.durationMs.base;

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // The account whose saved cart has been read and merged (Prompt 34). Until
  // it is the signed-in user's, that cart is not known yet (a cart saved on
  // another device arrives with this read), so checkout shows that it is
  // loading instead of "Your cart is empty." Derived during render
  // (isCartReady, below), so even the first frame after sign-in is covered.
  const [loadedFor, setLoadedFor] = useState(null);

  // Skips the very first "save" so the initial empty state can't overwrite the
  // persisted cart before the "load" effect has hydrated it.
  const firstSaveRef = useRef(true);
  // Serializes API writes so overlapping syncs can't interleave delete/recreate.
  const syncChainRef = useRef(Promise.resolve());
  // Tracks the previous auth value so we only clear the cart on a real logout
  // transition (user → null), not on the initial null render or for guests.
  const prevUserRef = useRef(undefined);
  // True once the logged-in user's server cart has been loaded+merged; gates the
  // API sync so a half-loaded cart can't be pushed back over the server cart.
  const cartLoadedRef = useRef(false);
  // What the server cart holds (syncKey), from the load and from every sync
  // queued since; null when unknown. A cart equal to it is not written again:
  // before, every signed-in page load re-read the server cart and rewrote it
  // line by line (a delete and an add each) though nothing had changed.
  const serverKeyRef = useRef(null);
  // Mirror of the latest committed cart, so callbacks with stable identities can
  // read current lines without re-subscribing (used for the add/update toast).
  const cartItemsRef = useRef(cartItems);
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  // ── Toasts ────────────────────────────────────────────────────────────────
  // An add that opens the drawer holds its toast ("Added to cart") until the
  // drawer has painted and slid in. The open cart is its own confirmation: the
  // toast is clipped out of sight while the cart is open and is there to be
  // announced (role="alert", Prompt 31), which it still is, a beat later.
  // Fired with the click, SweetAlert's classes on <html> restyled the whole
  // page twice inside the drawer's first frame (Prompt 32 follow-up). Any
  // cart toast fired meanwhile replaces the held one, as it would a shown one.
  const heldToast = useRef({ frame: 0, timer: 0 });
  const dropHeldToast = useCallback(() => {
    cancelAnimationFrame(heldToast.current.frame);
    clearTimeout(heldToast.current.timer);
  }, []);
  useEffect(() => dropHeldToast, [dropHeldToast]);

  const showToast = useCallback(
    (options) => {
      dropHeldToast();
      cartToast(options);
    },
    [dropHeldToast]
  );

  // After the drawer's first frame (requestAnimationFrame runs just before
  // it is painted), then its entrance.
  const showToastOnceOpen = useCallback(
    (options) => {
      dropHeldToast();
      heldToast.current.frame = requestAnimationFrame(() => {
        heldToast.current.timer = setTimeout(() => cartToast(options), DRAWER_ENTER_MS);
      });
    },
    [dropHeldToast]
  );

  // ── Persistence: load once on mount ──────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCartItems(parsed.map(normalizeCartItem));
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      localStorage.removeItem("cart");
    }
  }, []);

  // ── Persistence: save on every change (skipping the initial commit) ──────
  useEffect(() => {
    if (firstSaveRef.current) {
      firstSaveRef.current = false;
      return;
    }
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  // ── Replace the logged-in user's server cart with the local cart ─────────
  // Local state is the single source of truth; this mirrors it to the API as a
  // full replace, so rapid local edits can never desync from the server cart.
  const replaceApiCart = useCallback(async (userId, items) => {
    const existing = await apiService.cart.getCart(userId).catch(() => []);
    await Promise.all(
      (existing || []).map((row) =>
        apiService.cart.removeFromCart(row.id).catch(() => {})
      )
    );
    await Promise.all(
      items.map((item) =>
        apiService.cart
          .addToCart({
            productId: item.productId,
            variantId: item.variantId,
            variantName: item.variantName,
            name: item.name,
            image: item.image,
            price: item.price,
            comparePrice: item.comparePrice,
            currency: item.currency,
            quantity: item.quantity,
            ...(item.stock != null ? { stock: item.stock } : {}),
            userId,
          })
          .catch(() => {})
      )
    );
  }, []);

  // Queue a serialized sync (latest call always runs after the previous one).
  const queueApiSync = useCallback(
    (userId, items) => {
      syncChainRef.current = syncChainRef.current
        .catch(() => {})
        .then(() => replaceApiCart(userId, items));
    },
    [replaceApiCart]
  );

  // ── Load + merge the user's cart on login; clear it on logout ────────────
  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (!user) {
      // Only a genuine logout (had a user, now null) clears the cart — not the
      // initial null render or a browsing guest, which would wipe a guest cart.
      if (prevUser) {
        cartLoadedRef.current = false;
        serverKeyRef.current = null;
        setLoadedFor(null);
        setCartItems([]);
        setIsCartOpen(false);
        localStorage.removeItem("cart");
      }
      // The server cart is left intact so logging back in restores it.
      return;
    }

    // Login (or already-logged-in on reload): load the server cart and merge it
    // with whatever is in the local/guest cart. Block the API sync until done.
    cartLoadedRef.current = false;
    serverKeyRef.current = null;
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const apiCart = await apiService.cart.getCart(user.id);
        const apiItems = (apiCart || []).map(normalizeCartItem);
        if (cancelled) return;
        serverKeyRef.current = syncKey(apiItems);
        setCartItems((local) => mergeCarts(local, apiItems));
      } catch (error) {
        console.error("Error loading cart:", error);
      } finally {
        if (!cancelled) {
          cartLoadedRef.current = true;
          setIsLoading(false);
          setLoadedFor(user.id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // ── Debounced mirror of local cart → server (logged-in users only) ───────
  // A cart the server already holds (a reload with this device's copy, a
  // merge that added nothing, a change undone within the debounce) is not
  // written.
  useEffect(() => {
    if (!user || !cartLoadedRef.current) return;
    const items = cartItems;
    const key = syncKey(items);
    if (key === serverKeyRef.current) return;
    const t = setTimeout(() => {
      serverKeyRef.current = key;
      queueApiSync(user.id, items);
    }, 600);
    return () => clearTimeout(t);
  }, [cartItems, user, queueApiSync]);

  // ── Mutations (all functional updates → race-safe) ───────────────────────
  const addToCart = useCallback(async (product, quantity = 1, options = {}) => {
    // openDrawer can be disabled by callers that navigate away immediately
    // (e.g. "Buy Now" → /checkout) so the drawer doesn't flash over the page.
    const { openDrawer = true } = options;
    try {
      const incoming = normalizeCartItem({ ...product, quantity });
      // Decide the toast copy from the latest committed cart (cosmetic only —
      // the quantity math below runs inside the functional update, race-safe).
      const wasUpdate = cartItemsRef.current.some(
        (item) => item.id === incoming.id
      );

      setCartItems((prev) => {
        const existing = prev.find((item) => item.id === incoming.id);
        if (existing) {
          return prev.map((item) =>
            item.id === incoming.id
              ? {
                  ...item,
                  quantity: clampQty(
                    item.quantity + incoming.quantity,
                    item.stock ?? incoming.stock
                  ),
                }
              : item
          );
        }
        return [
          ...prev,
          { ...incoming, quantity: clampQty(incoming.quantity, incoming.stock) },
        ];
      });

      const toast = {
        icon: "success",
        title: wasUpdate ? "Cart updated" : "Added to cart",
        text: wasUpdate
          ? `Quantity of ${incoming.name} updated.`
          : `${incoming.name} is in your cart.`,
      };

      if (openDrawer) {
        setIsCartOpen(true);
        showToastOnceOpen(toast);
      } else {
        showToast(toast);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      showToast({
        icon: "error",
        title: "Couldn’t add to cart",
        text: "Try again in a moment.",
        timer: 2000,
      });
    }
  }, [showToast, showToastOnceOpen]);

  const removeFromCart = useCallback((itemId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
    showToast({
      icon: "info",
      title: "Removed from cart",
      timer: 1500,
    });
  }, [showToast]);

  const updateQuantity = useCallback(
    (itemId, newQuantity) => {
      if (newQuantity < 1) {
        removeFromCart(itemId);
        return;
      }
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, quantity: clampQty(newQuantity, item.stock) }
            : item
        )
      );
    },
    [removeFromCart]
  );

  const clearCart = useCallback((options = {}) => {
    // Empties local state; the sync effect mirrors the empty cart to the server
    // for logged-in users. `silent` skips the toast for flows where emptying is
    // a side effect of something bigger (e.g. an order was just placed).
    setCartItems([]);
    if (!options.silent) {
      showToast({
        icon: "info",
        title: "Cart cleared",
      });
    }
  }, [showToast]);

  const getCartTotal = useCallback(
    () =>
      cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems]
  );

  const getCartItemCount = useCallback(
    () => cartItems.reduce((count, item) => count + item.quantity, 0),
    [cartItems]
  );

  const toggleCart = useCallback(() => setIsCartOpen((open) => !open), []);

  // A guest's cart is the device's; a signed-in shopper's is known once the
  // account's saved cart has been read (a failed read counts as read).
  const isCartReady = !user || loadedFor === user.id;

  const state = useMemo(
    () => ({ cartItems, isCartOpen, isLoading, isCartReady, getCartTotal, getCartItemCount }),
    [cartItems, isCartOpen, isLoading, isCartReady, getCartTotal, getCartItemCount]
  );
  const actions = useMemo(
    () => ({ addToCart, removeFromCart, updateQuantity, clearCart, toggleCart, setIsCartOpen }),
    [addToCart, removeFromCart, updateQuantity, clearCart, toggleCart]
  );

  return (
    <CartActionsContext.Provider value={actions}>
      <CartStateContext.Provider value={state}>{children}</CartStateContext.Provider>
    </CartActionsContext.Provider>
  );
};
