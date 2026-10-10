import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { getProductMinPrice, getDefaultCartVariant, buildCartItem } from "../../utils/helpers";
import { TOKENS } from "../../theme/tokens";
import AccountLayout from "../../components/account/AccountLayout";
import { ProductCard, ProductCardSkeleton } from "../../components/storefront";
import styles from "./Wishlist.module.css";

// =============================================================================
// Wishlist (/wishlist) — prompts/DESIGN_SYSTEM.md §35
// =============================================================================
// The saved pieces, inside the account shell (<AccountLayout active=
// "wishlist">: the eyebrow "Saved", the serif h1 "Your wishlist", the count).
// Guests keep a working wishlist on this device: the same header without the
// account rail (it would show no identity), and a sand banner with "Sign in"
// above whichever state applies.
//
// Each piece is the storefront ProductCard, without its heart (everything
// here is saved). Its quick add puts the cheapest variant in the cart, the
// line the old "Add to Cart" added. Under the card: the stock line, then the
// wishlist's own actions, "Move to cart" (adds it, then it leaves the
// wishlist silently 300ms later) and "Remove". A toolbar sorts the pieces and
// clears them all.
//
// What did not change: every read and write is WishlistContext's or
// CartContext's (removeFromWishlist, with { silent: true } for a move;
// clearWishlist and its confirm; addToCart with buildCartItem's line), so are
// the guest storage and the merge on sign-in; SORT_OPTIONS and getSortedItems;
// the stock rule (the stock of the variant "Add to cart" adds; unknown counts
// as in stock); the 300ms dim before a piece leaves; the banner opening the
// auth dialog.
// =============================================================================

const SORT_OPTIONS = [
  { value: "dateDesc", label: "Recently added" },
  { value: "dateAsc", label: "Oldest first" },
  { value: "priceLow", label: "Price: low to high" },
  { value: "priceHigh", label: "Price: high to low" },
  { value: "ratingHigh", label: "Highest rated" },
];

// How long a piece dims before it leaves (Remove, Move to cart).
const REMOVE_DELAY_MS = 300;
const LEAVING_OPACITY = 0.5;
// Skeleton pieces while the account's list loads: the device's own count
// when it has one (it is usually the account's), within these bounds.
const SKELETON_MIN = 3;
const SKELETON_MAX = 6;
// Frames a focus move waits for a closing dialog or drawer to leave the page,
// or for its target to render (about a second).
const FOCUS_WAIT_FRAMES = 60;

const { duration, easeOut, easeInOut } = TOKENS.motion;

const cx = (...names) => names.filter(Boolean).join(" ");

const pieces = (count) => `${count} ${count === 1 ? "piece" : "pieces"}`;

// Stock of what "Add to Cart" adds: the default (cheapest) variant when the
// product has variants, else the product itself. Unknown stock (older saved
// rows) is treated as in stock, as before; the line under the card then says
// nothing, since there is nothing known to say (the product page's rule).
export const describeStock = (item) => {
  const defaultVariant = getDefaultCartVariant(item);
  const stockValue = defaultVariant ? defaultVariant.stock : item.stock;
  const inStock = stockValue == null || stockValue === "" || Number(stockValue) > 0;
  const known = !(stockValue == null || stockValue === "");
  return {
    stockValue,
    inStock,
    label: known ? (inStock ? "In stock" : "Sold out") : null,
  };
};

// A saved row as the storefront card reads it (DESIGN_SYSTEM §23.1): the
// product id under `id` and the photograph under `images`. Its `stock` is the
// stock rule's, so the card's "Sold out" and its quick add follow the same
// rule as the line under it and "Move to cart". buildCartItem() of this
// object is buildCartItem({ ...item, id: item.productId }), the old line, for
// every product (the tests compare the two across the catalogue).
export const toCardProduct = (item) => {
  const { stockValue, inStock } = describeStock(item);
  return {
    ...item,
    id: item.productId,
    images:
      Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : [item.image].filter(Boolean),
    stock: inStock ? stockValue : 0,
  };
};

// The sticky header's visible height (§17.2), and moving focus without
// leaving its target under it ("instant", not "auto", under reduced motion:
// the root's scroll-behavior is smooth).
const headerHeight = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sf-header-height")) || 0;

const focusAndReveal = (element, reduceMotion) => {
  element.focus({ preventScroll: true });
  const rect = element.getBoundingClientRect();
  if (rect.top < headerHeight() || rect.bottom > window.innerHeight) {
    window.scrollTo({
      top: Math.max(0, window.scrollY + rect.top - headerHeight() - TOKENS.space[4]),
      behavior: reduceMotion ? "instant" : "smooth",
    });
  }
};

// ---------------------------------------------------------------------------
// One saved piece: the card, the stock line and the wishlist's actions. A
// motion.li that forwards its ref, so AnimatePresence's popLayout can lift a
// leaving piece out of the grid while it fades and the others close the gap.
// While it fades it is inert: out of the tab order and the accessibility
// tree, and no click lands on it.
// ---------------------------------------------------------------------------
const SavedPiece = forwardRef(function SavedPiece(
  { item, leaving, reduceMotion, onQuickAdd, onMove, onRemove },
  ref
) {
  const isPresent = useIsPresent();
  // The card's product, built once per row.
  const { product, stock } = useMemo(
    () => ({ product: toCardProduct(item), stock: describeStock(item) }),
    [item]
  );
  const name = item.name || "this piece";

  return (
    <motion.li
      ref={ref}
      className={cx(styles.item, leaving && styles.leaving)}
      data-saved-piece={String(item.productId)}
      data-exiting={isPresent ? undefined : ""}
      // React 18 does not know `inert`; the empty string sets the attribute.
      inert={isPresent ? undefined : ""}
      layout={!reduceMotion}
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? LEAVING_OPACITY : 1 }}
      exit={{ opacity: 0, transition: { duration: duration.base, ease: easeInOut } }}
      transition={{
        duration: duration.base,
        ease: easeOut,
        opacity: { duration: duration.fast, ease: easeOut },
      }}
    >
      <ProductCard product={product} onAddToCart={onQuickAdd} />

      {stock.label && (
        <p className={cx(styles.stock, stock.inStock ? styles.stockIn : styles.stockOut)}>
          {stock.label}
        </p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={cx("sf-btn sf-btn--ghost", styles.move)}
          data-action="move"
          disabled={!stock.inStock}
          aria-disabled={leaving || undefined}
          aria-label={`Move to cart, ${name}`}
          onClick={() => onMove(item)}
        >
          Move to cart
        </button>
        <button
          type="button"
          className={cx("sf-btn", styles.remove)}
          data-action="remove"
          aria-disabled={leaving || undefined}
          aria-label={`Remove ${name} from wishlist`}
          onClick={() => onRemove(item.productId)}
        >
          Remove
        </button>
      </div>
    </motion.li>
  );
});

const Wishlist = () => {
  const { wishlistItems, isLoading, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart, isCartOpen } = useCart();
  const { user, isLoading: authLoading, openAuthModal, authModalOpen } = useAuth();
  const reduceMotion = useReducedMotion();

  const [sortBy, setSortBy] = useState("dateDesc");
  // Pieces dimmed for REMOVE_DELAY_MS before they leave. The ref answers at
  // once (a second press before the next render is ignored); the state paints.
  const [leavingIds, setLeavingIds] = useState([]);
  const leaving = useRef(new Set());
  // The account whose saved list is known to have loaded (see `pending`).
  const [settledFor, setSettledFor] = useState(() => (authLoading ? undefined : user));
  // A focus move, made once the change it follows is on screen.
  const [focusRequest, setFocusRequest] = useState(null);

  const titleRef = useRef(null);
  const listRef = useRef(null);
  const emptyRef = useRef(null);
  const sortedIds = useRef([]);
  const lastCount = useRef(null);
  const sawGuest = useRef(false);
  const handledRequest = useRef(null);

  // On every sign-in, and on every reload with a session, WishlistContext
  // reads the account's list and merges the device's into it (isLoading).
  // Until that read has settled, the list on the device may not be the
  // account's, so the page shows its skeleton (after the session restore,
  // below), instead of flashing an empty or a partial list first. The one
  // render the context's flag cannot cover is the first with a new account,
  // before its effect has started the read: `settledFor` covers it. It
  // catches up in the same effect pass in which the context sets isLoading,
  // so no frame falls between the two.
  useEffect(() => {
    if (!authLoading) setSettledFor(user);
  }, [authLoading, user]);
  const pending = authLoading || isLoading || (Boolean(user) && settledFor !== user);

  const getSortedItems = () => {
    const items = [...wishlistItems];
    switch (sortBy) {
      case "dateAsc":
        return items.sort((a, b) => new Date(a.addedAt || 0) - new Date(b.addedAt || 0));
      case "dateDesc":
        return items.sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));
      case "priceLow":
        return items.sort(
          (a, b) => getProductMinPrice(a).sellingPrice - getProductMinPrice(b).sellingPrice
        );
      case "priceHigh":
        return items.sort(
          (a, b) => getProductMinPrice(b).sellingPrice - getProductMinPrice(a).sellingPrice
        );
      case "ratingHigh":
        return items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:
        return items;
    }
  };

  const markLeaving = (productId, isLeaving) => {
    if (isLeaving) leaving.current.add(productId);
    else leaving.current.delete(productId);
    setLeavingIds(Array.from(leaving.current));
  };

  // Focus follows the work, as in the cart drawer: once a piece has left, the
  // same control on the piece that took its place (else the one before it)
  // takes focus; the effect below picks that piece when it moves focus, from
  // the order on screen now. When the last piece leaves, the empty state's
  // line does (the effect on the count below).
  const focusNeighbour = (productId, control) => {
    setFocusRequest({ to: "piece", from: productId, control, order: sortedIds.current });
  };

  const handleRemove = (productId) => {
    if (leaving.current.has(productId)) return;
    markLeaving(productId, true);
    // Small delay to let the card dim before it goes
    setTimeout(() => {
      focusNeighbour(productId, "remove");
      removeFromWishlist(productId);
      markLeaving(productId, false);
    }, REMOVE_DELAY_MS);
  };

  const handleAddToCart = (item) => {
    // Same normalized line shape as card/PDP quick-adds (same default variant
    // and id scheme) so a wishlist add merges into the existing cart line. The
    // wishlist row's product id lives in `productId`, not `id`.
    addToCart(buildCartItem({ ...item, id: item.productId }), 1);
  };

  // The card's quick add hands over buildCartItem() of the card's product,
  // which is the line handleAddToCart builds (see toCardProduct).
  const handleQuickAdd = (cartItem) => addToCart(cartItem, 1);

  const handleMoveToCart = (item) => {
    if (leaving.current.has(item.productId)) return;
    handleAddToCart(item);
    markLeaving(item.productId, true);
    setTimeout(() => {
      focusNeighbour(item.productId, "move");
      // Silent: keeps the "Added to cart" toast on screen instead of
      // replacing it with a "Removed from wishlist" toast mid-move.
      removeFromWishlist(item.productId, { silent: true });
      markLeaving(item.productId, false);
    }, REMOVE_DELAY_MS);
  };

  const handleClearAll = () => {
    // Unavailable while the account's list loads: a clear would race the
    // merge. The confirm, the clear and the toast are the context's.
    if (pending) return;
    clearWishlist();
  };

  const count = wishlistItems.length;

  // The last piece has left (Remove, Move to cart, Clear all): focus moves
  // to the empty state's line, unless it has somewhere to be already.
  useEffect(() => {
    if (pending) return;
    const previous = lastCount.current;
    lastCount.current = count;
    if (previous > 0 && count === 0) setFocusRequest({ to: "empty" });
  }, [pending, count]);

  // A guest who signs in from the banner: the banner and its "Sign in" (the
  // dialog's opener) are gone, so focus moves to the page's h1 once the
  // dialog has left (the account pages' pattern, §31.5).
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      sawGuest.current = true;
      return;
    }
    if (!sawGuest.current) return;
    sawGuest.current = false;
    setFocusRequest({ to: "title" });
  }, [authLoading, user]);

  // Make a requested focus move once nothing holds the page: it waits while
  // the cart drawer (opened by Move to cart) or the auth dialog is open, then
  // for any dialog to finish leaving (the drawer, the auth dialog,
  // SweetAlert's confirm) and for its target to render. It never takes focus
  // from somewhere it has gone on purpose: only from nowhere (<body>, or an
  // element that has left the page) or from the piece that just left.
  useEffect(() => {
    const request = focusRequest;
    if (!request || handledRequest.current === request || isCartOpen || authModalOpen) {
      return undefined;
    }

    const targetOf = () => {
      if (request.to === "title") return titleRef.current;
      if (request.to === "empty") return emptyRef.current;
      const list = listRef.current;
      if (!list) return null;
      // The piece that took the left piece's place: the next one in the order
      // it left from, else the one before it, passing over pieces that are
      // dimming or fading out themselves.
      const staying = Array.from(list.querySelectorAll("[data-saved-piece]:not([data-exiting])"));
      const at = request.order.indexOf(request.from);
      const candidates = [
        ...request.order.slice(at + 1),
        ...request.order.slice(0, Math.max(at, 0)).reverse(),
      ];
      for (const id of candidates) {
        if (id === request.from || leaving.current.has(id)) continue;
        const piece = staying.find(
          (element) => element.getAttribute("data-saved-piece") === String(id)
        );
        if (!piece) continue;
        const preferred = piece.querySelector(`[data-action="${request.control}"]`);
        return preferred && !preferred.disabled
          ? preferred
          : piece.querySelector('[data-action="remove"]');
      }
      return null;
    };

    const focusIsFree = () => {
      const active = document.activeElement;
      if (!active || active === document.body || !active.isConnected) return true;
      if (request.from === undefined) return false;
      const piece = active.closest("[data-saved-piece]");
      return Boolean(piece) && piece.getAttribute("data-saved-piece") === String(request.from);
    };

    let frame = 0;
    let waited = 0;
    const attempt = () => {
      frame = 0;
      const target = targetOf();
      const dialogOpen = Boolean(document.querySelector('[aria-modal="true"]'));
      if ((dialogOpen || !target) && waited < FOCUS_WAIT_FRAMES) {
        waited += 1;
        frame = window.requestAnimationFrame(attempt);
        return;
      }
      handledRequest.current = request;
      if (target && target.isConnected && focusIsFree()) focusAndReveal(target, reduceMotion);
    };
    frame = window.requestAnimationFrame(attempt);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [focusRequest, isCartOpen, authModalOpen, reduceMotion]);

  // The session restore settles on the first render: nothing to show before
  // (as Profile). Whether the account rail or the guest banner belongs on
  // the page is not known yet, and either arriving under a page already
  // drawn would push it aside or down.
  if (authLoading) return null;

  const sortedItems = getSortedItems();
  sortedIds.current = sortedItems.map((item) => item.productId);

  const isGuest = !user;
  const countLine = !pending && count > 0 ? pieces(count) : null;
  const skeletonCount = Math.min(SKELETON_MAX, Math.max(SKELETON_MIN, count));

  // Guests keep a fully working wishlist (saved on this device), the same
  // open access as the hearts on cards and the product page. The banner is
  // the page's way to sign in: it opens the global auth dialog (there is no
  // /login route), and on sign-in WishlistContext merges these pieces into
  // the account's.
  const guestBanner = isGuest && (
    <div className={cx("sf-panel sf-panel--hairline", styles.banner)}>
      <div className={styles.bannerText}>
        <p className={cx("sf-display-sm", styles.bannerTitle)}>Saved on this device.</p>
        <p className={styles.bannerLine}>Sign in to keep your wishlist across devices.</p>
      </div>
      <button
        type="button"
        className={cx("sf-btn sf-btn--primary", styles.bannerAction)}
        onClick={() => openAuthModal("login")}
        aria-haspopup="dialog"
      >
        Sign in
      </button>
    </div>
  );

  const toolbar = (pending || count > 0) && (
    <div className={styles.toolbar}>
      <div className={styles.sort}>
        <label htmlFor="wishlist-sort" className={styles.sortLabel}>
          Sort by
        </label>
        <select
          id="wishlist-sort"
          className={cx("sf-select", styles.sortSelect)}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className={cx("sf-btn sf-btn--link", styles.clearAll)}
        onClick={handleClearAll}
        aria-label="Clear all saved pieces"
        aria-haspopup="dialog"
        aria-disabled={pending || undefined}
      >
        Clear all
      </button>
    </div>
  );

  let results;
  if (pending) {
    // The pieces' own boxes (the card's skeleton, the stock line, the
    // actions), so the loaded grid lands where the skeleton was.
    results = (
      <div aria-busy="true">
        <p className="sf-visually-hidden">Loading your wishlist</p>
        <ul className={styles.grid} aria-hidden="true">
          {Array.from({ length: skeletonCount }, (_, i) => (
            <li key={i} className={styles.item}>
              <ProductCardSkeleton />
              <span className={cx("sf-skeleton", styles.skeletonStock)} />
              <span className={styles.actions}>
                <span className={cx("sf-skeleton", styles.skeletonMove)} />
                <span className={cx("sf-skeleton", styles.skeletonRemove)} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (count > 0) {
    results = (
      <ul ref={listRef} className={styles.grid} aria-label="Saved pieces">
        <AnimatePresence mode="popLayout" initial={false}>
          {sortedItems.map((item) => (
            <SavedPiece
              key={item.productId}
              item={item}
              leaving={leavingIds.includes(item.productId)}
              reduceMotion={reduceMotion}
              onQuickAdd={handleQuickAdd}
              onMove={handleMoveToCart}
              onRemove={handleRemove}
            />
          ))}
        </AnimatePresence>
      </ul>
    );
  } else {
    results = (
      <div className={styles.empty}>
        {/* A reading position (focus lands here when the last piece leaves),
            not a control: no ring. */}
        <h2 ref={emptyRef} tabIndex={-1} className={cx("sf-display-md", styles.emptyTitle)}>
          Nothing saved yet.
        </h2>
        <p className={styles.emptyText}>Pieces you save will wait here.</p>
        <Link to="/products" className={cx("sf-btn sf-btn--primary", styles.emptyAction)}>
          Browse furniture
        </Link>
      </div>
    );
  }

  return (
    <AccountLayout
      active="wishlist"
      eyebrow="Saved"
      title="Your wishlist"
      titleRef={titleRef}
      description={
        // The line keeps its height while the count is unknown or zero, so
        // the page does not move when it arrives.
        <span className={styles.count} aria-hidden={countLine ? undefined : "true"}>
          {countLine || " "}
        </span>
      }
    >
      <div className={styles.content}>
        {guestBanner}
        {toolbar}
        {results}
      </div>
    </AccountLayout>
  );
};

export { SORT_OPTIONS, REMOVE_DELAY_MS };

export default Wishlist;
