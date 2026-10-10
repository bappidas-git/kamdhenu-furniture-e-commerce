import React from "react";
import { useAuth } from "../../hooks/useAuth";
import usePageMeta from "../../hooks/usePageMeta";
import AccountNav from "./AccountNav";
import styles from "./AccountLayout.module.css";

// =============================================================================
// AccountLayout — the account pages' shell (prompts/DESIGN_SYSTEM.md §31)
// =============================================================================
// <AccountLayout active="orders">…the page's content…</AccountLayout>
//
// The page header (the eyebrow "Account" and the serif h1 "Hello, {first
// name}.", or "My account" without one) over a 3 / 9 grid: AccountNav as a
// rail that sticks under the header, the content beside it. Up to 900px it is
// one column: the nav's chip row under the header, then the content.
//
// active          the AccountNav key of the page or Profile tab on screen
// eyebrow, title  replace the header's eyebrow and h1 (title: string or node)
// description     an optional line under the h1 (a count, an intro)
// nav             false leaves the nav out; it is left out anyway while no
//                 one is signed in (it would show no identity)
// titleRef        a ref to the h1 (tabIndex -1), for moving focus there
// onSignOutError  passed to AccountNav
// pageTitle       the document title (usePageMeta, Prompt 32); by default
//                 the section's name from PAGE_TITLES ("My orders",
//                 "Store credit"…), with the default description.
//
// It renders inside the app's <main>, so it adds no landmark besides the nav.
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

// The document title of each section, by AccountNav key: the menu's names
// ("My account", "My orders", "My wishlist", DESIGN_SYSTEM §39.3) and the
// Profile tabs' own.
export const PAGE_TITLES = {
  profile: "My account",
  addresses: "Addresses",
  orders: "My orders",
  wallet: "Store credit",
  wishlist: "My wishlist",
  password: "Change password",
};

const AccountLayout = ({
  active,
  eyebrow = "Account",
  title,
  description,
  nav = true,
  titleRef,
  onSignOutError,
  pageTitle,
  className,
  children,
}) => {
  const { user } = useAuth();
  usePageMeta({ title: pageTitle || PAGE_TITLES[active] || PAGE_TITLES.profile });
  const firstName = typeof user?.firstName === "string" ? user.firstName.trim() : "";
  const showNav = nav && !!user;

  const heading =
    title ??
    (firstName ? (
      <>
        Hello, <em>{firstName}</em>.
      </>
    ) : (
      "My account"
    ));

  return (
    <div className={cx(styles.page, className)}>
      <div className="sf-container">
        <header className={styles.header}>
          <p className={cx("sf-eyebrow", styles.eyebrow)}>{eyebrow}</p>
          <h1 ref={titleRef} tabIndex={-1} className={cx("sf-display-lg", styles.title)}>
            {heading}
          </h1>
          {description && <div className={styles.description}>{description}</div>}
        </header>

        <div className={cx(styles.body, showNav && styles.withNav)}>
          {showNav && (
            <AccountNav active={active} className={styles.nav} onSignOutError={onSignOutError} />
          )}
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </div>
  );
};

export default AccountLayout;
