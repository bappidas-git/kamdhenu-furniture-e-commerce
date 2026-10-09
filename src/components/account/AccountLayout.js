import React from "react";
import { useAuth } from "../../hooks/useAuth";
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
//
// It renders inside the app's <main>, so it adds no landmark besides the nav.
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

const AccountLayout = ({
  active,
  eyebrow = "Account",
  title,
  description,
  nav = true,
  titleRef,
  onSignOutError,
  className,
  children,
}) => {
  const { user } = useAuth();
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
