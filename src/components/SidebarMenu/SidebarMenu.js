import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CloseOutlined } from "@mui/icons-material";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { useWishlist } from "../../context/WishlistContext";
import { useDealsConfig } from "../../context/DealsConfigContext";
import apiService from "../../services/api";
import { categoryParam, getCategoryScopeIds, resolveCategory } from "../../utils/categories";
import { APP_NAME } from "../../utils/constants";
import { getDepartmentFeature } from "../../content/navigationContent";
import { groupCategoryTree } from "../Header/groupCategoryTree";
import BrandLogo from "../ui/BrandLogo";
import useFocusTrap, { useBodyScrollLock } from "../ui/useFocusTrap";
import { TOKENS } from "../../theme/tokens";
import styles from "./SidebarMenu.module.css";

// =============================================================================
// SidebarMenu — the slide-in menu below 1024px (opened by the header's
// hamburger; usable at any width)
// =============================================================================
//
// From the top: the logo and a close button; the account block (who is
// signed in, or a sign-in prompt); Shop, the department accordion; Discover;
// Account; Settings; the legal links.
//
// Shop mirrors the desktop mega-menu exactly: departments are the admin's
// main-menu categories (getMainMenuCategories), grouped by groupCategoryTree
// (Header/groupCategoryTree.js), the helper the mega-menu renders from. A
// department with groups expands (one at a time) into its groups, shown as
// eyebrow links with their leaves beneath, and a "Shop all" link; a flat
// department links straight to its listing. Every category link is the
// canonical /products?category=<slug>.
//
// Categories are read from apiService.categories.getAll() each time the menu
// opens; the last good list stays in state, so a re-open renders at once and
// a failed refresh keeps it. Each opening starts with the department of the
// current listing expanded, or none.
//
// Dialog behaviour: role="dialog" aria-modal, Tab stays inside, Escape and the
// backdrop close it, focus starts on the close button and returns to the
// hamburger, the page behind does not scroll (useFocusTrap). It also closes
// when the route changes.
// =============================================================================

const { duration, easeOut, easeInOut } = TOKENS.motion;

const cx = (...names) => names.filter(Boolean).join(" ");
const listingPath = (category) => `/products?category=${categoryParam(category)}`;
const toList = (data) => (Array.isArray(data) ? data : (data && data.data) || []);
const countText = (count) => (count > 99 ? "99+" : String(count));

const initialOf = (user) =>
  (user?.firstName || user?.name || user?.email || "U").trim().charAt(0).toUpperCase() || "U";

const displayNameOf = (user) => {
  if (!user) return "";
  if (user.firstName) return `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`;
  return user.name || user.email || "Your account";
};

// A plain left click closes the menu as the link navigates; a modified click
// (new tab or window) leaves it open.
const isPlainClick = (event) =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !event.metaKey &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.shiftKey;

const SidebarMenu = ({ open, onClose, onOpenAuth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { getWishlistCount } = useWishlist();
  // Offers waits for the deals config, so a disabled page never flashes a link.
  const { enabled: dealsEnabled, loading: dealsLoading } = useDealsConfig();

  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useFocusTrap(panelRef, { active: open, onEscape: onClose, initialFocusRef: closeRef });
  useBodyScrollLock(open);

  // ---- Categories: read on every open, the last good list kept ------------
  const [categories, setCategories] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setFailed(false);
    apiService.categories.getAll().then(
      (data) => {
        if (active) setCategories(toList(data));
      },
      () => {
        if (active) setFailed(true);
      }
    );
    return () => {
      active = false;
    };
  }, [open, attempt]);

  const departments = useMemo(() => groupCategoryTree(categories || []), [categories]);

  // ---- The listing's current category, and the department holding it ------
  const categoryToken =
    location.pathname === "/products" ? new URLSearchParams(location.search).get("category") : null;
  const currentCategoryId = useMemo(() => {
    const current = resolveCategory(categoryToken, categories || []);
    return current ? String(current.id) : null;
  }, [categoryToken, categories]);
  const currentDepartmentId = useMemo(() => {
    if (!currentCategoryId) return null;
    const match = departments.find(({ category }) =>
      getCategoryScopeIds(category.id, categories || []).has(currentCategoryId)
    );
    return match ? String(match.category.id) : null;
  }, [currentCategoryId, departments, categories]);

  // ---- Accordion: one department at a time ---------------------------------
  // Until the shopper picks one, the department of the current listing is the
  // open one; each opening of the menu starts from there again.
  const [expandedChoice, setExpandedChoice] = useState(undefined);
  const expandedId = expandedChoice === undefined ? currentDepartmentId : expandedChoice;
  const toggleDepartment = (id) => setExpandedChoice(expandedId === id ? null : id);
  useEffect(() => {
    if (!open) setExpandedChoice(undefined);
  }, [open]);

  // ---- Close when the route changes (links, back/forward) -----------------
  const routeKey = location.pathname + location.search;
  const lastRouteKey = useRef(routeKey);
  useEffect(() => {
    if (lastRouteKey.current === routeKey) return;
    lastRouteKey.current = routeKey;
    if (open) onCloseRef.current();
  }, [routeKey, open]);

  // ---- Actions ---------------------------------------------------------------
  const onNavigate = (event) => {
    if (isPlainClick(event)) onClose();
  };

  const handleSignIn = () => {
    onClose();
    if (onOpenAuth) onOpenAuth();
  };

  const handleCreateAccount = () => {
    onClose();
    if (onOpenAuth) onOpenAuth("signup");
  };

  const handleSignOut = () => {
    onClose();
    logout();
    navigate("/");
  };

  const pathCurrent = (to) => (location.pathname === to ? "page" : undefined);
  const categoryCurrent = (category) =>
    currentCategoryId && String(category.id) === currentCategoryId ? "page" : undefined;

  const wishlistCount = getWishlistCount ? getWishlistCount() : 0;
  const showOffers = dealsEnabled && !dealsLoading;
  const loadingDepartments = categories === null && !failed;
  const departmentsFailed = categories === null && failed;

  const panelMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: duration.base, ease: easeInOut } },
      }
    : {
        initial: { x: "-100%" },
        animate: { x: 0 },
        exit: { x: "-100%", transition: { duration: duration.base, ease: easeInOut } },
      };

  return (
    <AnimatePresence>
      {open && (
        <React.Fragment key="sidebar-menu">
          <motion.div
            className={styles.backdrop}
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: duration.base, ease: easeInOut } }}
            transition={{ duration: duration.slow, ease: easeOut }}
          />
          <motion.div
            ref={panelRef}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
            transition={{ duration: duration.slow, ease: easeOut }}
            {...panelMotion}
          >
            <div className={styles.top}>
              <BrandLogo height={28} className={styles.logo} />
              <button
                ref={closeRef}
                type="button"
                className={styles.iconButton}
                onClick={onClose}
                aria-label="Close menu"
              >
                <CloseOutlined />
              </button>
            </div>

            <div className={styles.scroll}>
              {/* ===== Account block ===== */}
              {user ? (
                <div className={styles.account}>
                  <span className={styles.avatar} aria-hidden="true">
                    {user.avatar || user.profileImage ? (
                      <img src={user.avatar || user.profileImage} alt="" />
                    ) : (
                      initialOf(user)
                    )}
                  </span>
                  <div className={styles.identity}>
                    <p className={styles.name}>{displayNameOf(user)}</p>
                    {user.email && <p className={styles.email}>{user.email}</p>}
                    <Link
                      to="/profile"
                      className={styles.textLink}
                      onClick={onNavigate}
                      aria-current={pathCurrent("/profile")}
                    >
                      My account
                    </Link>
                  </div>
                </div>
              ) : (
                <div className={styles.guest}>
                  <p className={styles.guestLine}>Sign in for faster checkout and order tracking.</p>
                  <div className={styles.guestActions}>
                    <button
                      type="button"
                      className="sf-btn sf-btn--primary sf-btn--block"
                      onClick={handleSignIn}
                      aria-haspopup="dialog"
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      className="sf-btn sf-btn--ghost sf-btn--block"
                      onClick={handleCreateAccount}
                      aria-haspopup="dialog"
                    >
                      Create account
                    </button>
                  </div>
                </div>
              )}

              <nav aria-label="Main">
                {/* ===== Shop: the department accordion ===== */}
                <div className={styles.section} aria-busy={loadingDepartments || undefined}>
                  <h2 className={cx("sf-eyebrow", styles.sectionTitle)}>
                    Shop
                  </h2>

                  {loadingDepartments && (
                    <>
                      <p className="sf-visually-hidden" role="status">
                        Loading departments
                      </p>
                      <ul className={styles.list} aria-hidden="true">
                        {[0, 1, 2, 3].map((key) => (
                          <li key={key} className={styles.skeletonRow}>
                            <span className="sf-skeleton sf-skeleton--text" />
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {departmentsFailed && (
                    <div className={styles.notice} role="status">
                      <p>We couldn't load the departments just now.</p>
                      <button
                        type="button"
                        className="sf-btn sf-btn--link"
                        onClick={() => setAttempt((count) => count + 1)}
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {categories !== null && departments.length > 0 && (
                    <ul className={styles.list}>
                      {departments.map((department) => {
                        const id = String(department.category.id);
                        return (
                          <DepartmentItem
                            key={id}
                            department={department}
                            expanded={expandedId === id}
                            inCurrent={currentDepartmentId === id}
                            onToggle={() => toggleDepartment(id)}
                            onNavigate={onNavigate}
                            categoryCurrent={categoryCurrent}
                          />
                        );
                      })}
                    </ul>
                  )}

                  <p className={styles.viewAll}>
                    <Link to="/products" className={styles.textLink} onClick={onNavigate}>
                      View all products
                    </Link>
                  </p>
                </div>

                {/* ===== Discover ===== */}
                <div className={styles.section}>
                  <h2 className={cx("sf-eyebrow", styles.sectionTitle)}>
                    Discover
                  </h2>
                  <ul className={styles.list}>
                    <li>
                      <Link to="/products?sort=newest" className={styles.row} onClick={onNavigate}>
                        New arrivals
                      </Link>
                    </li>
                    <li>
                      <Link to="/products?sort=popular" className={styles.row} onClick={onNavigate}>
                        Best sellers
                      </Link>
                    </li>
                    {showOffers && (
                      <li>
                        <Link
                          to="/special-offers"
                          className={styles.row}
                          onClick={onNavigate}
                          aria-current={pathCurrent("/special-offers")}
                        >
                          Offers
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link
                        to="/about"
                        className={styles.row}
                        onClick={onNavigate}
                        aria-current={pathCurrent("/about")}
                      >
                        Our story
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* ===== Account ===== */}
                <div className={styles.section}>
                  <h2 className={cx("sf-eyebrow", styles.sectionTitle)}>
                    Account
                  </h2>
                  <ul className={styles.list}>
                    <li>
                      <Link
                        to="/orders"
                        className={styles.row}
                        onClick={onNavigate}
                        aria-current={pathCurrent("/orders")}
                      >
                        {user ? "My orders" : "Track order"}
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/wishlist"
                        className={styles.row}
                        onClick={onNavigate}
                        aria-current={pathCurrent("/wishlist")}
                        aria-label={
                          wishlistCount > 0
                            ? `My wishlist, ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"}`
                            : undefined
                        }
                      >
                        <span>My wishlist</span>
                        {wishlistCount > 0 && (
                          <span className="sf-count" aria-hidden="true">
                            {countText(wishlistCount)}
                          </span>
                        )}
                      </Link>
                    </li>
                    {user && (
                      <li>
                        <button type="button" className={styles.row} onClick={handleSignOut}>
                          Sign out
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              </nav>

              {/* ===== Settings ===== */}
              <div className={styles.section}>
                <h2 className={cx("sf-eyebrow", styles.sectionTitle)}>
                  Settings
                </h2>
                <ul className={styles.list}>
                  <li>
                    <Link
                      to="/support"
                      className={styles.row}
                      onClick={onNavigate}
                      aria-current={pathCurrent("/support")}
                    >
                      Help &amp; support
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isDarkMode}
                      className={styles.row}
                      onClick={toggleTheme}
                    >
                      Dark mode
                      <span className={styles.switch} aria-hidden="true" />
                    </button>
                  </li>
                </ul>
              </div>

              {/* ===== Legal ===== */}
              <div className={styles.legal}>
                <ul className={styles.legalLinks}>
                  <li>
                    <Link to="/terms" onClick={onNavigate} aria-current={pathCurrent("/terms")}>
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" onClick={onNavigate} aria-current={pathCurrent("/privacy")}>
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link to="/cookies" onClick={onNavigate} aria-current={pathCurrent("/cookies")}>
                      Cookies
                    </Link>
                  </li>
                </ul>
                <p className={styles.copyright}>
                  © {new Date().getFullYear()} {APP_NAME}
                </p>
              </div>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
};

// One department: a link when it is flat, otherwise a disclosure button over
// its groups (eyebrow links with their leaves beneath) and a "Shop all" link.
function DepartmentItem({ department, expanded, inCurrent, onToggle, onNavigate, categoryCurrent }) {
  const { category, groups } = department;
  const slug = categoryParam(category);

  if (groups.length === 0) {
    return (
      <li>
        <Link
          to={listingPath(category)}
          className={styles.department}
          onClick={onNavigate}
          aria-current={categoryCurrent(category)}
        >
          {category.name}
        </Link>
      </li>
    );
  }

  const buttonId = `sf-sidebar-department-${slug}`;
  const panelId = `sf-sidebar-panel-${slug}`;
  const feature = getDepartmentFeature(category);

  return (
    <li>
      <button
        type="button"
        id={buttonId}
        className={styles.department}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-current={inCurrent ? "true" : undefined}
        onClick={onToggle}
      >
        <span>{category.name}</span>
        <span className={styles.toggleGlyph} aria-hidden="true" />
      </button>
      <div
        id={panelId}
        role="group"
        aria-labelledby={buttonId}
        className={styles.departmentPanel}
        hidden={!expanded}
      >
        <Link
          to={listingPath(category)}
          className={styles.shopAll}
          onClick={onNavigate}
          aria-current={categoryCurrent(category)}
        >
          {feature.ctaLabel || `Shop all ${category.name}`}
        </Link>
        {groups.map(({ category: group, links }) => {
          const groupId = `sf-sidebar-group-${categoryParam(group)}`;
          return (
            <div key={group.id} className={styles.group}>
              <Link
                id={groupId}
                to={listingPath(group)}
                className={styles.groupLink}
                onClick={onNavigate}
                aria-current={categoryCurrent(group)}
              >
                {group.name}
              </Link>
              {links.length > 0 && (
                <ul className={styles.leaves} aria-labelledby={groupId}>
                  {links.map(({ category: leaf, depth }) => (
                    <li key={leaf.id}>
                      <Link
                        to={listingPath(leaf)}
                        className={cx(styles.leaf, depth > 1 && styles.leafNested)}
                        onClick={onNavigate}
                        aria-current={categoryCurrent(leaf)}
                      >
                        {leaf.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </li>
  );
}

export default SidebarMenu;
