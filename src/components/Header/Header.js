import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { useWishlist } from "../../context/WishlistContext";
import { useDealsConfig } from "../../context/DealsConfigContext";
import apiService from "../../services/api";
import { getCategoryScopeIds, resolveCategory } from "../../utils/categories";
import { SUPPORT_PHONE, FREE_SHIPPING_THRESHOLD } from "../../utils/constants";
import { formatCurrency } from "../../utils/helpers";
import { BrandLogo } from "../ui";
import CartDrawer from "../CartDrawer/CartDrawer";
import SidebarMenu from "../SidebarMenu/SidebarMenu";
import AuthModal from "../AuthModal/AuthModal";
import SearchModal from "../SearchModal/SearchModal";
import { Avatar, Divider, Menu, MenuItem } from "@mui/material";
import {
  DarkModeOutlined,
  FavoriteBorderOutlined,
  LightModeOutlined,
  MenuOutlined,
  PersonOutlineOutlined,
  SearchOutlined,
  ShoppingBagOutlined,
} from "@mui/icons-material";
import MegaMenu, { groupCategoryTree } from "./MegaMenu";
import useHeaderHeight from "./useHeaderHeight";
import styles from "./Header.module.css";

// =============================================================================
// Header — utility strip, centred-logo main row, department row + mega-menu
// =============================================================================
//
// Layout by width (all switched in CSS, so the first paint is already right):
//   ≥ 1024px  utility strip · search | logo | account, wishlist, cart ·
//             department row with the mega-menu (MegaMenu.js)
//   768–1023  menu | logo | search, theme, account, cart
//   < 768     menu | logo | search, cart (account, wishlist and the theme
//             toggle live in the sidebar and the bottom nav)
//
// The header is sticky, so it keeps its own place in the page flow and needs
// no spacer. Past 80px of scroll it compacts (the utility strip folds away,
// the main row and logo shrink, a soft shadow appears) and hands the height
// it gave up back as a bottom margin, so the page below never moves. Its live
// height is published as --sf-header-height for sticky offsets elsewhere
// (useHeaderHeight.js).
//
// It also mounts the cart drawer, the sidebar, the auth modal (only here;
// other pages call openAuthModal) and the search modal.
// =============================================================================

const COMPACT_AFTER = 80; // px of scroll before the header compacts

const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, "")}`;
const initialOf = (user) => (user?.firstName || user?.name || "U").charAt(0).toUpperCase();
const countText = (count) => (count > 99 ? "99+" : String(count));
const countLabel = (label, count) =>
  count > 0 ? `${label}, ${count} ${count === 1 ? "piece" : "pieces"}` : `${label}, empty`;

// The signed-in summary at the top of the account menu: plain text, not a
// menu item, so MUI's MenuList skips it when it picks the item to focus.
const AccountSummary = ({ user }) => (
  <li role="presentation" className={styles.accountSummary}>
    <Avatar sx={{ width: 40, height: 40, fontSize: "1.125rem" }}>{initialOf(user)}</Avatar>
    <div className={styles.accountText}>
      <p className={styles.accountName}>{user?.firstName || user?.name || "User"}</p>
      {user?.email && <p className={styles.accountEmail}>{user.email}</p>}
    </div>
  </li>
);
AccountSummary.muiSkipListHighlight = true;

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();
  const {
    user,
    isAuthenticated,
    logout,
    authModalOpen,
    authModalTab,
    openAuthModal,
    closeAuthModal,
  } = useAuth();
  const { getCartItemCount, isCartOpen, setIsCartOpen } = useCart();
  const { getWishlistCount } = useWishlist();
  // The "Offers" entry is hidden when the admin turns the deals page off.
  const { enabled: dealsEnabled } = useDealsConfig();

  // Live badge counts (context exposes getters, not raw values)
  const cartCount = getCartItemCount();
  const wishlistCount = getWishlistCount();

  const headerRef = useRef(null);
  useHeaderHeight(headerRef);

  const [categories, setCategories] = useState([]);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [compact, setCompact] = useState(() => window.scrollY > COMPACT_AFTER);

  // Fetch categories on mount. Also refetch when the tab regains focus so any
  // change the admin makes (toggling a category into the main menu, reordering
  // it, activating/deactivating it) shows up on the storefront without a hard
  // reload — the menu is fully API-driven from the same categories source the
  // admin edits.
  useEffect(() => {
    let active = true;
    const fetchCategories = async () => {
      try {
        const data = await apiService.categories.getAll();
        if (active) setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      } finally {
        if (active) setCategoriesReady(true);
      }
    };
    fetchCategories();
    const onFocus = () => fetchCategories();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Compact past 80px of scroll; never hidden. One read per frame at most.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setCompact(window.scrollY > COMPACT_AFTER);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Close the account menu on route change (the mega-menu closes itself).
  useEffect(() => {
    setUserMenuAnchor(null);
  }, [location.pathname]);

  // The main menu: the admin-curated departments (getMainMenuCategories: "Show
  // in main menu", menu order) with their children grouped in the hierarchical
  // order (orderCategoriesHierarchically). No hardcoded list.
  const departments = useMemo(() => groupCategoryTree(categories), [categories]);

  // The department holding the listing's current ?category= (itself or a
  // descendant) is marked: "page" on its own listing, "true" below it.
  const categoryToken =
    location.pathname === "/products" ? new URLSearchParams(location.search).get("category") : null;
  const activeDepartments = useMemo(() => {
    const current = new Map();
    const selected = resolveCategory(categoryToken, categories);
    if (!selected) return current;
    departments.forEach(({ category }) => {
      if (getCategoryScopeIds(category.id, categories).has(String(selected.id))) {
        current.set(String(category.id), String(category.id) === String(selected.id) ? "page" : "true");
      }
    });
    return current;
  }, [categoryToken, categories, departments]);

  const handleUserMenuOpen = (e) => {
    if (isAuthenticated) {
      setUserMenuAnchor(e.currentTarget);
    } else {
      openAuthModal("login");
    }
  };

  const handleUserMenuClose = () => setUserMenuAnchor(null);

  const handleMenuNavigate = (path) => {
    handleUserMenuClose();
    navigate(path);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate("/");
  };

  const handleCartClick = () => setIsCartOpen(true);
  const handleSearchClick = () => setSearchModalOpen(true);
  const handleMobileMenuClick = () => setSidebarOpen(true);

  const userMenuOpen = Boolean(userMenuAnchor);
  const themeLabel = isDarkMode ? "Switch to light mode" : "Switch to dark mode";
  const ThemeIcon = isDarkMode ? LightModeOutlined : DarkModeOutlined;
  const freeDeliveryLine = FREE_SHIPPING_THRESHOLD
    ? `Free delivery on orders above ${formatCurrency(FREE_SHIPPING_THRESHOLD)}`
    : "";

  return (
    <>
      <header ref={headerRef} className={`${styles.header} ${compact ? styles.compact : ""}`}>
        {/* ===== UTILITY STRIP (desktop) ===== */}
        <div className={styles.utility}>
          <div className={styles.utilityInner}>
            <p className={styles.utilityNote}>{freeDeliveryLine}</p>
            <ul className={styles.utilityLinks}>
              <li>
                <a
                  href={telHref(SUPPORT_PHONE)}
                  className={styles.utilityLink}
                  aria-label={`Call ${SUPPORT_PHONE}`}
                >
                  {SUPPORT_PHONE}
                </a>
              </li>
              <li>
                <Link to="/help" className={styles.utilityLink}>
                  Help
                </Link>
              </li>
              <li>
                <Link to="/orders" className={styles.utilityLink}>
                  Track order
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  className={styles.utilityToggle}
                  onClick={toggleTheme}
                  aria-label={themeLabel}
                >
                  <ThemeIcon />
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* ===== MAIN ROW ===== */}
        <div className={styles.main}>
          <div className={styles.mainInner}>
            <div className={styles.start}>
              <button
                type="button"
                className={`${styles.iconButton} ${styles.menuButton}`}
                onClick={handleMobileMenuClick}
                aria-label="Open menu"
                aria-haspopup="dialog"
                aria-expanded={sidebarOpen}
              >
                <MenuOutlined />
              </button>
              <button
                type="button"
                className={styles.searchTrigger}
                onClick={handleSearchClick}
                aria-haspopup="dialog"
              >
                <SearchOutlined />
                <span className={styles.searchLabel}>Search</span>
              </button>
            </div>

            <Link to="/" className={styles.logoLink}>
              <BrandLogo priority height={48} className={styles.logo} />
            </Link>

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.iconButton} ${styles.searchButton}`}
                onClick={handleSearchClick}
                aria-label="Search"
                aria-haspopup="dialog"
              >
                <SearchOutlined />
              </button>
              <button
                type="button"
                className={`${styles.iconButton} ${styles.themeButton}`}
                onClick={toggleTheme}
                aria-label={themeLabel}
              >
                <ThemeIcon />
              </button>
              <button
                type="button"
                id="sf-account-button"
                className={`${styles.action} ${styles.accountAction}`}
                onClick={handleUserMenuOpen}
                aria-haspopup={isAuthenticated ? "menu" : "dialog"}
                aria-expanded={isAuthenticated ? userMenuOpen : undefined}
                aria-controls={userMenuOpen ? "sf-account-menu" : undefined}
              >
                <span className={styles.actionIcon}>
                  {isAuthenticated && user ? (
                    <Avatar sx={{ width: 32, height: 32, fontSize: "0.9375rem" }}>
                      {initialOf(user)}
                    </Avatar>
                  ) : (
                    <PersonOutlineOutlined />
                  )}
                </span>
                <span className={styles.actionLabel}>{isAuthenticated ? "Account" : "Sign in"}</span>
              </button>
              <Link
                to="/wishlist"
                className={`${styles.action} ${styles.wishlistAction}`}
                aria-label={countLabel("Wishlist", wishlistCount)}
              >
                <span className={styles.actionIcon}>
                  <FavoriteBorderOutlined />
                  {wishlistCount > 0 && (
                    <span className={`sf-count ${styles.count}`} aria-hidden="true">
                      {countText(wishlistCount)}
                    </span>
                  )}
                </span>
                <span className={styles.actionLabel} aria-hidden="true">
                  Wishlist
                </span>
              </Link>
              <button
                type="button"
                className={`${styles.action} ${styles.cartAction}`}
                onClick={handleCartClick}
                aria-label={countLabel("Cart", cartCount)}
                aria-haspopup="dialog"
              >
                <span className={styles.actionIcon}>
                  <ShoppingBagOutlined />
                  {cartCount > 0 && (
                    <span className={`sf-count ${styles.count}`} aria-hidden="true">
                      {countText(cartCount)}
                    </span>
                  )}
                </span>
                <span className={styles.actionLabel} aria-hidden="true">
                  Cart
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ===== DEPARTMENT ROW + MEGA-MENU (desktop) ===== */}
        <MegaMenu
          departments={departments}
          ready={categoriesReady}
          dealsEnabled={dealsEnabled}
          activeDepartments={activeDepartments}
        />
      </header>

      {/* ===== ACCOUNT MENU ===== */}
      <Menu
        id="sf-account-menu"
        anchorEl={userMenuAnchor}
        open={userMenuOpen}
        onClose={handleUserMenuClose}
        MenuListProps={{ "aria-labelledby": "sf-account-button" }}
        PaperProps={{ className: styles.accountMenu, sx: { minWidth: 248 } }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {isAuthenticated
          ? [
              <AccountSummary key="summary" user={user} />,
              <Divider key="div1" component="li" />,
              <MenuItem key="profile" onClick={() => handleMenuNavigate("/profile")}>
                My account
              </MenuItem>,
              <MenuItem key="orders" onClick={() => handleMenuNavigate("/orders")}>
                My orders
              </MenuItem>,
              <MenuItem key="wishlist" onClick={() => handleMenuNavigate("/wishlist")}>
                My wishlist
              </MenuItem>,
              <Divider key="div2" component="li" />,
              <MenuItem key="logout" onClick={handleLogout}>
                Sign out
              </MenuItem>,
            ]
          : [
              <MenuItem
                key="login"
                onClick={() => {
                  handleUserMenuClose();
                  openAuthModal("login");
                }}
              >
                Sign in
              </MenuItem>,
              <MenuItem
                key="register"
                onClick={() => {
                  handleUserMenuClose();
                  openAuthModal("signup");
                }}
              >
                Create account
              </MenuItem>,
            ]}
      </Menu>

      {/* ===== MODALS & DRAWERS ===== */}
      <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <SidebarMenu
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAuth={(tab) => openAuthModal(tab === "signup" ? "signup" : "login")}
      />
      <AuthModal open={authModalOpen} onClose={closeAuthModal} defaultTab={authModalTab} />
      <SearchModal open={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </>
  );
};

export default Header;
