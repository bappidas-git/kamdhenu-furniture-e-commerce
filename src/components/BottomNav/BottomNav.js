import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChairOutlined,
  FavoriteBorderOutlined,
  HomeOutlined,
  PersonOutlineOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { useWishlist } from "../../context/WishlistContext";
import { useBodyScrollLocked } from "../ui/useFocusTrap";
import SearchModal from "../SearchModal/SearchModal";
import styles from "./BottomNav.module.css";

// =============================================================================
// BottomNav — the fixed bar on phones and small tablets (up to 768px)
// =============================================================================
//
// Five destinations: Home, Shop (/products), Search (opens the search
// overlay), Wishlist (with its count) and Account (/profile when signed in;
// the sign-in dialog for guests). The cart stays in the header, which is
// always visible, so the bar never duplicates it.
//
// It slides away on scroll down (past 80px) and back on scroll up, with a
// transform only. While any overlay holds the page's scroll lock (a drawer,
// sheet or modal sets an inline `overflow: hidden` on <body>), it stays in
// place under that overlay and is inert, out of the tab order and hidden from
// assistive technology; it also comes back whenever it receives focus.
//
// Search: the bar keeps its own SearchModal instance (the header owns the
// other). The modal caches the catalogue at module level, so the two
// instances share one fetch, and they can never be open together (each
// overlay covers the other's trigger). Focus returns to the Search button
// when the overlay closes.
// =============================================================================

const HIDE_AFTER = 80; // px of scroll before the bar may hide
const SCROLL_TOLERANCE = 6; // smaller moves (momentum jitter, rubber-banding) are ignored

const cx = (...names) => names.filter(Boolean).join(" ");
const countText = (count) => (count > 99 ? "99+" : String(count));

// Keyboard focus inside `root`. A tapped link keeps focus too, but that must
// not pin the bar on screen, so only :focus-visible counts.
const hasKeyboardFocus = (root) => {
  const active = document.activeElement;
  if (!root || !active || !root.contains(active)) return false;
  try {
    return active.matches(":focus-visible");
  } catch (e) {
    return true;
  }
};

// aria-current per destination: "page" on its own page, "true" inside it.
const currentFor = (key, pathname) => {
  switch (key) {
    case "home":
      return pathname === "/" ? "page" : undefined;
    case "shop":
      if (pathname === "/products") return "page";
      return pathname.startsWith("/products/") ? "true" : undefined;
    case "wishlist":
      return pathname === "/wishlist" ? "page" : undefined;
    case "account":
      if (pathname === "/profile") return "page";
      return pathname === "/orders" ? "true" : undefined;
    default:
      return undefined;
  }
};

const BottomNav = () => {
  const { pathname } = useLocation();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { getWishlistCount } = useWishlist();
  const overlayOpen = useBodyScrollLocked();

  const [scrollHidden, setScrollHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navRef = useRef(null);
  const searchButtonRef = useRef(null);
  const overlayRef = useRef(overlayOpen);
  overlayRef.current = overlayOpen;

  // Hide on scroll down, show on scroll up; nothing changes under an overlay.
  useEffect(() => {
    let lastY = Math.max(0, window.scrollY);
    const onScroll = () => {
      const y = Math.max(0, window.scrollY);
      if (overlayRef.current || y <= HIDE_AFTER) {
        lastY = y;
        if (!overlayRef.current) setScrollHidden(false);
        return;
      }
      const delta = y - lastY;
      if (Math.abs(delta) < SCROLL_TOLERANCE) return;
      lastY = y;
      // Keep the bar while it holds keyboard focus.
      if (delta > 0 && hasKeyboardFocus(navRef.current)) return;
      setScrollHidden(delta > 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // An overlay opening brings the bar back, so it is in place when it closes.
  useEffect(() => {
    if (overlayOpen) setScrollHidden(false);
  }, [overlayOpen]);

  // Back on the Search button once the overlay releases the page (the bar is
  // inert until then). Focus is then on <body> or still inside the closing
  // dialog, which stays in the DOM for its exit animation; anywhere else,
  // something has taken it on purpose and keeps it.
  const restoreSearchFocus = useRef(false);
  useEffect(() => {
    if (searchOpen) {
      restoreSearchFocus.current = true;
      return;
    }
    if (!restoreSearchFocus.current || overlayOpen) return;
    restoreSearchFocus.current = false;
    const active = document.activeElement;
    const leftBehind = !active || active === document.body || !!active.closest('[role="dialog"]');
    if (leftBehind && searchButtonRef.current) searchButtonRef.current.focus({ preventScroll: true });
  }, [searchOpen, overlayOpen]);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const wishlistCount = getWishlistCount ? getWishlistCount() : 0;
  const wishlistLabel =
    wishlistCount > 0
      ? `Wishlist, ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"}`
      : undefined;

  const item = (Icon, label, extra = null) => (
    <>
      <span className={styles.icon}>
        <Icon />
        {extra}
      </span>
      <span className={styles.label}>{label}</span>
    </>
  );

  return (
    <>
      <nav
        ref={navRef}
        className={cx(styles.nav, scrollHidden && !overlayOpen && styles.hidden)}
        aria-label="Quick links"
        // React 18 does not know `inert`; the empty string sets the attribute.
        inert={overlayOpen ? "" : undefined}
        onFocus={() => setScrollHidden(false)}
      >
        <ul className={styles.list}>
          <li>
            <Link to="/" className={styles.link} aria-current={currentFor("home", pathname)}>
              {item(HomeOutlined, "Home")}
            </Link>
          </li>
          <li>
            <Link to="/products" className={styles.link} aria-current={currentFor("shop", pathname)}>
              {item(ChairOutlined, "Shop")}
            </Link>
          </li>
          <li>
            <button
              ref={searchButtonRef}
              type="button"
              className={styles.link}
              onClick={() => setSearchOpen(true)}
              aria-haspopup="dialog"
            >
              {item(SearchOutlined, "Search")}
            </button>
          </li>
          <li>
            <Link
              to="/wishlist"
              className={styles.link}
              aria-current={currentFor("wishlist", pathname)}
              aria-label={wishlistLabel}
            >
              {item(
                FavoriteBorderOutlined,
                "Wishlist",
                wishlistCount > 0 ? (
                  <span className={`sf-count ${styles.count}`} aria-hidden="true">
                    {countText(wishlistCount)}
                  </span>
                ) : null
              )}
            </Link>
          </li>
          <li>
            {isAuthenticated ? (
              <Link to="/profile" className={styles.link} aria-current={currentFor("account", pathname)}>
                {item(PersonOutlineOutlined, "Account")}
              </Link>
            ) : (
              <button
                type="button"
                className={styles.link}
                onClick={() => openAuthModal("login")}
                aria-haspopup="dialog"
              >
                {item(PersonOutlineOutlined, "Account")}
              </button>
            )}
          </li>
        </ul>
      </nav>

      <SearchModal open={searchOpen} onClose={closeSearch} />
    </>
  );
};

export default BottomNav;
