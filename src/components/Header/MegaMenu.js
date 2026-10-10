import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { ClickAwayListener, useMediaQuery } from "@mui/material";
import { categoryParam } from "../../utils/categories";
import { PLACEHOLDER_IMG, onImageError } from "../../utils/helpers";
import { getDepartmentFeature } from "../../content/navigationContent";
import { overlayPanelMotion } from "../ui/motionPresets";
import styles from "./MegaMenu.module.css";

// The grouping behind the panels, shared with the mobile sidebar (Prompt 09).
export { groupCategoryTree } from "./groupCategoryTree";

// =============================================================================
// MegaMenu — the desktop department row (≥ 1024px) and its flyout panel
// =============================================================================
//
// One department row, one panel instance. The row lists the admin-curated
// departments (`departments` comes from groupCategoryTree), a divider dot,
// then "Offers" (only while the deals page is enabled) and "Our story". The
// panel opens for one department at a time and is only in the DOM while open.
//
// How a panel opens:
//   • pointer hover, after 120ms (mouse only, so a tap never half-opens it);
//   • keyboard focus on a department link (a preview: Tab carries on along
//     the row rather than into the panel);
//   • click, Enter or Space toggle it. A click after a hover keeps it open,
//     and Enter/Space/ArrowDown move focus to the panel's first link.
// How it closes: the pointer leaving the menu for 200ms, Escape (focus goes
// back to the department link), a click outside, focus leaving the menu, a
// route change, or the viewport dropping below 1024px.
//
// Inside the panel, Tab and Shift+Tab walk its links; Tab past the last one
// moves to the next item in the row, Shift+Tab from the first returns to the
// department link. ArrowLeft/Right move along the row, ArrowUp/Down through
// the panel. A modified click (new tab or window) on a department link still
// follows its href, the department's listing.
// =============================================================================

const OPEN_DELAY = 120; // ms a pointer rests on a department before it opens
const CLOSE_DELAY = 200; // ms of grace after the pointer leaves the menu
const FOCUSABLE = 'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"])';
const ROW_ITEM = "[data-megamenu-item]";

const cx = (...names) => names.filter(Boolean).join(" ");
const listingPath = (category) => `/products?category=${categoryParam(category)}`;
const panelIdOf = (category) => `sf-megamenu-${categoryParam(category)}`;

// Focus that should open a preview: keyboard focus, not the focus a mouse
// click gives a link.
const isKeyboardFocus = (element) => {
  try {
    return element.matches(":focus-visible");
  } catch (e) {
    return true;
  }
};

// The panel's layer. While it leaves (its 240ms exit) it is inert: a quick Tab
// past "Our story" would otherwise land in the leaving panel's links, and
// focus would drop to <body> when the panel unmounts a moment later.
const PanelLayer = React.forwardRef(function PanelLayer({ children, ...rest }, ref) {
  const isPresent = useIsPresent();
  return (
    // React 18 does not know `inert`; the empty string sets the attribute.
    <motion.div ref={ref} {...rest} inert={isPresent ? undefined : ""}>
      {children}
    </motion.div>
  );
});

const MegaMenu = ({ departments = [], ready = true, dealsEnabled = true, activeDepartments }) => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width:1024px)");
  // mode: "hover" | "focus" (previews) or "explicit" (clicked, Enter, Space).
  const [menu, setMenu] = useState({ id: null, mode: null });
  const navRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRefs = useRef(new Map());
  const timers = useRef({ open: null, close: null });
  const suppressFocusOpen = useRef(false);
  const focusPanelOnOpen = useRef(false);

  const openId = menu.id;
  const openDepartment =
    openId == null ? null : departments.find((d) => String(d.category.id) === openId) || null;

  const clearTimer = useCallback((name) => {
    clearTimeout(timers.current[name]);
    timers.current[name] = null;
  }, []);

  const schedule = useCallback(
    (name, callback, delay) => {
      clearTimer(name);
      timers.current[name] = setTimeout(callback, delay);
    },
    [clearTimer]
  );

  const openMenu = useCallback(
    (id, mode) => {
      clearTimer("open");
      clearTimer("close");
      setMenu((prev) => {
        // A preview never downgrades a panel the shopper opened on purpose.
        const nextMode = prev.id === id && prev.mode === "explicit" ? "explicit" : mode;
        return prev.id === id && prev.mode === nextMode ? prev : { id, mode: nextMode };
      });
    },
    [clearTimer]
  );

  const closeMenu = useCallback(() => {
    clearTimer("open");
    clearTimer("close");
    focusPanelOnOpen.current = false;
    setMenu((prev) => (prev.id == null ? prev : { id: null, mode: null }));
  }, [clearTimer]);

  // Close on route change; the listing keeps its pathname when only
  // ?category= changes, so the query counts too.
  useEffect(() => {
    closeMenu();
  }, [location.pathname, location.search, closeMenu]);

  // Below 1024px the row is hidden and the sidebar takes over.
  useEffect(() => {
    if (!isDesktop) closeMenu();
  }, [isDesktop, closeMenu]);

  // The open department left the menu (an admin change picked up on focus).
  useEffect(() => {
    if (openId != null && !openDepartment) closeMenu();
  }, [openId, openDepartment, closeMenu]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      clearTimeout(pending.open);
      clearTimeout(pending.close);
    };
  }, []);

  // Escape closes from anywhere; focus returns to the department link when it
  // was inside the menu.
  useEffect(() => {
    if (openId == null) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const trigger = triggerRefs.current.get(openId);
      const focusInside = navRef.current && navRef.current.contains(document.activeElement);
      closeMenu();
      if (focusInside && trigger && document.activeElement !== trigger) {
        suppressFocusOpen.current = true;
        trigger.focus();
        suppressFocusOpen.current = false;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openId, closeMenu]);

  const focusFirstInPanel = () => {
    const first = panelRef.current && panelRef.current.querySelector(FOCUSABLE);
    if (!first) return false;
    first.focus();
    return true;
  };

  // A keyboard open moves focus into the panel once it has rendered.
  useEffect(() => {
    if (!focusPanelOnOpen.current || openId == null) return;
    focusPanelOnOpen.current = false;
    const first = panelRef.current && panelRef.current.querySelector(FOCUSABLE);
    if (first) first.focus();
  }, [openId, menu.mode]);

  const openAndEnter = (id) => {
    if (openId === id && panelRef.current) {
      openMenu(id, "explicit");
      focusFirstInPanel();
      return;
    }
    focusPanelOnOpen.current = true;
    openMenu(id, "explicit");
  };

  // Click, Enter and Space: open (or keep open) on purpose, or close a panel
  // that was already opened on purpose.
  const toggle = (id, fromKeyboard) => {
    if (openId === id && menu.mode === "explicit") {
      closeMenu();
    } else if (fromKeyboard) {
      openAndEnter(id);
    } else {
      openMenu(id, "explicit");
    }
  };

  const rowItems = () =>
    navRef.current ? Array.from(navRef.current.querySelectorAll(ROW_ITEM)) : [];

  const focusRowNeighbour = (from, step) => {
    const items = rowItems();
    const next = items[items.indexOf(from) + step];
    if (!next) return false;
    next.focus();
    return true;
  };

  const onRowArrow = (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return false;
    if (focusRowNeighbour(event.currentTarget, event.key === "ArrowRight" ? 1 : -1)) {
      event.preventDefault();
    }
    return true;
  };

  const departmentHandlers = (id) => ({
    onPointerEnter: (event) => {
      if (event.pointerType !== "mouse") return;
      clearTimer("close");
      if (openId === id) clearTimer("open");
      else schedule("open", () => openMenu(id, "hover"), OPEN_DELAY);
    },
    onPointerLeave: (event) => {
      if (event.pointerType === "mouse") clearTimer("open");
    },
    onFocus: (event) => {
      if (suppressFocusOpen.current || !isKeyboardFocus(event.currentTarget)) return;
      openMenu(id, "focus");
    },
    onClick: (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      // Enter on a link fires a click with detail 0.
      toggle(id, event.detail === 0);
    },
    onKeyDown: (event) => {
      if (onRowArrow(event)) return;
      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        toggle(id, true);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        openAndEnter(id);
      } else if (
        event.key === "Tab" &&
        !event.shiftKey &&
        openId === id &&
        menu.mode === "explicit" &&
        focusFirstInPanel()
      ) {
        event.preventDefault();
      }
    },
  });

  // "Offers" and "Our story": no panel of their own, so they close one.
  const itemHandlers = {
    onPointerEnter: (event) => {
      if (event.pointerType !== "mouse") return;
      clearTimer("open");
      if (openId != null) schedule("close", closeMenu, CLOSE_DELAY);
    },
    onFocus: () => closeMenu(),
    onKeyDown: onRowArrow,
  };

  const onPanelKeyDown = (event) => {
    const panel = panelRef.current;
    const trigger = openId != null ? triggerRefs.current.get(openId) : null;
    if (!panel || !trigger) return;
    const items = Array.from(panel.querySelectorAll(FOCUSABLE));
    const index = items.indexOf(document.activeElement);
    if (index === -1) return;
    if (event.key === "Tab") {
      if (event.shiftKey && index === 0) {
        event.preventDefault();
        trigger.focus();
      } else if (!event.shiftKey && index === items.length - 1 && focusRowNeighbour(trigger, 1)) {
        event.preventDefault();
      }
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (event.key === "ArrowUp" && index === 0) trigger.focus();
      else items[Math.min(items.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))].focus();
    }
  };

  const onClickAway = () => {
    if (openId != null) closeMenu();
  };

  const pathname = location.pathname;
  const secondaryLink = (to, label) => {
    const current = pathname === to;
    return (
      <li className={styles.item}>
        <Link
          to={to}
          className={cx(styles.rowLink, current && styles.rowLinkActive)}
          aria-current={current ? "page" : undefined}
          data-megamenu-item=""
          {...itemHandlers}
        >
          {label}
        </Link>
      </li>
    );
  };

  return (
    <ClickAwayListener onClickAway={onClickAway}>
      <nav
        ref={navRef}
        aria-label="Primary"
        className={styles.nav}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") clearTimer("close");
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          clearTimer("open");
          if (openId != null) schedule("close", closeMenu, CLOSE_DELAY);
        }}
        onBlur={(event) => {
          // Only a move to another control closes it; a click on the panel's
          // own text blurs to nothing and must not.
          const next = event.relatedTarget;
          if (next && navRef.current && !navRef.current.contains(next)) closeMenu();
        }}
      >
        <ul className={cx(styles.row, !ready && styles.rowPending)}>
          {ready &&
            departments.map(({ category }) => {
              const id = String(category.id);
              const isOpen = openId === id;
              const current = activeDepartments ? activeDepartments.get(id) : undefined;
              return (
                <li key={id} className={styles.item}>
                  <Link
                    ref={(element) => {
                      if (element) triggerRefs.current.set(id, element);
                      else triggerRefs.current.delete(id);
                    }}
                    to={listingPath(category)}
                    className={cx(
                      styles.rowLink,
                      isOpen && styles.rowLinkOpen,
                      current && styles.rowLinkActive
                    )}
                    aria-expanded={isOpen}
                    aria-controls={panelIdOf(category)}
                    aria-haspopup="true"
                    aria-current={current || undefined}
                    data-megamenu-item=""
                    {...departmentHandlers(id)}
                  >
                    {category.name}
                  </Link>
                </li>
              );
            })}
          {ready && departments.length > 0 && <li className={styles.divider} aria-hidden="true" />}
          {ready && dealsEnabled && secondaryLink("/special-offers", "Offers")}
          {ready && secondaryLink("/about", "Our story")}
        </ul>

        <AnimatePresence>
          {openDepartment && (
            <PanelLayer
              key="megamenu-panel"
              ref={panelRef}
              id={panelIdOf(openDepartment.category)}
              role="region"
              aria-label={`${openDepartment.category.name} menu`}
              className={styles.panel}
              {...overlayPanelMotion("menu", reduceMotion)}
              onKeyDown={onPanelKeyDown}
            >
              <MegaMenuPanel department={openDepartment} onNavigate={closeMenu} />
            </PanelLayer>
          )}
        </AnimatePresence>
      </nav>
    </ClickAwayListener>
  );
};

// The panel's content: a column per group (its name as an eyebrow link, then
// its own children), or a short introduction for a flat department; the
// editorial feature (the department's image, copy and "Shop all" link); and
// "Browse all furniture".
function MegaMenuPanel({ department, onNavigate }) {
  const { category, groups } = department;
  const feature = getDepartmentFeature(category);
  const listing = listingPath(category);
  const flat = groups.length === 0;

  return (
    <div className={styles.inner}>
      <div className={styles.main}>
        {flat ? (
          <div className={styles.intro}>
            {feature.eyebrow && <p className="sf-eyebrow">{feature.eyebrow}</p>}
            <p className={styles.introTitle}>{category.name}</p>
            {feature.line && <p className={styles.introText}>{feature.line}</p>}
            <p className={styles.introAction}>
              <Link to={listing} className="sf-btn sf-btn--link" onClick={onNavigate}>
                {feature.ctaLabel || (
                  <>
                    Shop all<span className="sf-visually-hidden"> {category.name}</span>
                  </>
                )}
              </Link>
            </p>
          </div>
        ) : (
          <div className={styles.columns}>
            {groups.map(({ category: group, links }) => {
              const headingId = `sf-megamenu-group-${categoryParam(group)}`;
              return (
                <div key={group.id} className={styles.column}>
                  <Link
                    id={headingId}
                    to={listingPath(group)}
                    className={styles.groupLink}
                    onClick={onNavigate}
                  >
                    {group.name}
                  </Link>
                  {links.length > 0 && (
                    <ul className={styles.links} aria-labelledby={headingId}>
                      {links.map(({ category: leaf, depth }) => (
                        <li key={leaf.id}>
                          <Link
                            to={listingPath(leaf)}
                            className={cx(styles.link, depth > 1 && styles.linkNested)}
                            onClick={onNavigate}
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
        )}
        <p className={styles.footer}>
          <Link to="/products" className="sf-btn sf-btn--link" onClick={onNavigate}>
            Browse all furniture
          </Link>
        </p>
      </div>

      <div className={styles.feature}>
        {/* A pointer shortcut only: the text link goes to the same place, so the
            image link stays out of the tab order and the accessibility tree. */}
        <Link
          to={listing}
          className={styles.media}
          tabIndex={-1}
          aria-hidden="true"
          onClick={onNavigate}
        >
          <img
            src={category.image || PLACEHOLDER_IMG}
            alt={category.name}
            width={400}
            height={500}
            loading="lazy"
            decoding="async"
            onError={onImageError}
          />
        </Link>
        {!flat && (
          <div className={styles.featureText}>
            {feature.eyebrow && <p className="sf-eyebrow">{feature.eyebrow}</p>}
            {feature.line && <p className={styles.featureLine}>{feature.line}</p>}
            <p className={styles.featureAction}>
              <Link to={listing} className="sf-btn sf-btn--link" onClick={onNavigate}>
                {feature.ctaLabel || `Shop all ${category.name}`}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MegaMenu;
