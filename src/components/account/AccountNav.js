import React, { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../../hooks/useAuth";
import { getInitials } from "../../utils/helpers";
import styles from "./AccountNav.module.css";

// =============================================================================
// AccountNav — the account area's navigation (prompts/DESIGN_SYSTEM.md §31)
// =============================================================================
// <AccountNav active="orders" />
//   active: "profile" | "addresses" | "orders" | "wallet" | "wishlist" |
//           "password" (the page or Profile tab on screen)
//
// One <nav aria-label="Account">, two looks, switched by CSS alone:
//   • above 900px, a rail: the initials in a hairline circle, the name and the
//     email, then the links (44px rows; the current one ink with a 2px caramel
//     bar) and "Sign out", hairlines between the three;
//   • up to 900px, one row of .sf-chip links that scrolls sideways (the
//     current one is the ink chip) and ends with "Sign out".
// The current link carries aria-current="page". A link to the page already on
// screen (a Profile tab while on /profile) replaces the history entry instead
// of adding one, so switching tabs never piles up history.
//
// It reads useAuth().user and fetches nothing. "Sign out" asks first (the
// SweetAlert confirm, its button in the error token), then logout() and home,
// as the Profile page always did. onSignOutError(message), when given,
// reports a failure; otherwise a toast does.
// =============================================================================

export const ACCOUNT_NAV_ITEMS = [
  { key: "profile", label: "Profile", to: "/profile" },
  { key: "addresses", label: "Addresses", to: "/profile?tab=addresses" },
  { key: "orders", label: "Orders", to: "/orders" },
  { key: "wallet", label: "Store credit", to: "/profile?tab=wallet" },
  { key: "wishlist", label: "Wishlist", to: "/wishlist" },
  { key: "password", label: "Change password", to: "/profile?tab=password" },
];

const SIGN_OUT_FAILED = "Sign out failed. Please try again.";

const cx = (...names) => names.filter(Boolean).join(" ");
const pathOf = (to) => to.split("?")[0];
const trimmed = (value) => (typeof value === "string" ? value.trim() : "");

const fullNameOf = (user) =>
  [trimmed(user.firstName), trimmed(user.lastName)].filter(Boolean).join(" ");

const initialsOf = (user) =>
  getInitials(trimmed(user.firstName), trimmed(user.lastName)) ||
  trimmed(user.email).charAt(0).toUpperCase();

const AccountNav = ({ active, className, onSignOutError }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const listRef = useRef(null);

  // Up to 900px the links are one scrolling row: bring the current chip into
  // view when it starts outside it. Only the row scrolls, never the window.
  useEffect(() => {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const current = list.querySelector('[aria-current="page"]');
    if (!current) return;
    const row = list.getBoundingClientRect();
    const chip = current.getBoundingClientRect();
    if (chip.left >= row.left && chip.right <= row.right) return;
    list.scrollLeft += chip.left + chip.width / 2 - (row.left + row.width / 2);
  }, [active]);

  if (!user) return null;

  const handleSignOut = async () => {
    // Confirm first so signing out is never a one-click accident.
    const result = await Swal.fire({
      title: "Sign out?",
      text: "You'll need to sign in again to access your account.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sign out",
      cancelButtonText: "Stay signed in",
      customClass: { confirmButton: "sf-btn sf-btn--danger" },
    });
    if (!result.isConfirmed) return;

    try {
      await logout();
      navigate("/");
    } catch (error) {
      if (onSignOutError) {
        onSignOutError(SIGN_OUT_FAILED);
      } else {
        Swal.fire({
          icon: "error",
          title: SIGN_OUT_FAILED,
          toast: true,
          position: "bottom-end",
          showConfirmButton: false,
          timer: 3000,
        });
      }
    }
  };

  const fullName = fullNameOf(user);

  return (
    <nav aria-label="Account" className={cx(styles.nav, className)}>
      <div className={styles.identity}>
        <span className={styles.avatar} aria-hidden="true">
          {initialsOf(user)}
        </span>
        <p className={styles.name}>{fullName || user.email}</p>
        {fullName && user.email && <p className={styles.email}>{user.email}</p>}
      </div>

      <ul ref={listRef} className={styles.list}>
        {ACCOUNT_NAV_ITEMS.map((item) => (
          <li key={item.key} className={styles.item}>
            <Link
              to={item.to}
              replace={pathOf(item.to) === pathname}
              className={cx("sf-chip", styles.link)}
              aria-current={item.key === active ? "page" : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li className={cx(styles.item, styles.signOutItem)}>
          <button
            type="button"
            className={cx("sf-chip", styles.link, styles.signOut)}
            onClick={handleSignOut}
            aria-haspopup="dialog"
          >
            Sign out
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default AccountNav;
