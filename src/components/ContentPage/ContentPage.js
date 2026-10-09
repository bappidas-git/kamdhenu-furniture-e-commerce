import React from "react";
import { Link } from "react-router-dom";
import Breadcrumb from "../Breadcrumb/Breadcrumb";
import { renderAccent } from "../ui";
import { SUPPORT_EMAIL } from "../../utils/constants";
import styles from "./ContentPage.module.css";

// =============================================================================
// ContentPage — the content pages' shared frame (prompts/DESIGN_SYSTEM.md §38)
// =============================================================================
// <ContentPage crumb="Privacy policy" eyebrow="Policies" title="Privacy policy"
//              intro="…" meta={…}>…the page…</ContentPage>
//
// The breadcrumb (Home › crumb), then a header: the eyebrow, the serif h1
// (display-lg; a string may carry one *accent* word), the intro line, an
// optional meta line (the policies' "Last reviewed") and an optional extra
// (the Help centre's search), closed by a hairline. Then the page, and a quiet
// "Questions? Contact us" line at the end.
//
// crumb      the trail's label for this page; null leaves the trail out
// eyebrow    .sf-eyebrow above the h1
// title      a string (with an optional *accent* word) or a node
// intro      the line under the h1 (17px secondary, 60ch)
// meta       a node under the intro
// extra      a node at the end of the header
// width      "narrow" (720px: prose, the policies, the 404) or "default"
//            (1280px: About, Help centre, Support)
// contact    false leaves the closing contact line out
// titleRef   a ref to the h1 (tabIndex -1), for moving focus there
//
// It renders inside the app's <main>, so its <header> is a plain group (no
// landmark). One h1 per page: this one. The page's own headings are h2s.
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

export const ContactNote = ({ className }) => (
  <p className={cx(styles.contact, className)}>
    Questions? <Link to="/support">Contact us</Link> or email{" "}
    <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
  </p>
);

const ContentPage = ({
  crumb,
  eyebrow,
  title,
  intro,
  meta,
  extra,
  width = "narrow",
  contact = true,
  titleRef,
  className,
  children,
}) => (
  <div
    className={cx(
      "sf-container",
      width === "narrow" && "sf-container--narrow",
      styles.page,
      className
    )}
  >
    {crumb && <Breadcrumb items={[{ label: crumb }]} className={styles.trail} />}

    <header className={styles.header}>
      {eyebrow && <p className={cx("sf-eyebrow", styles.eyebrow)}>{eyebrow}</p>}
      <h1
        ref={titleRef}
        tabIndex={titleRef ? -1 : undefined}
        className={cx("sf-display-lg", styles.title)}
      >
        {typeof title === "string" ? renderAccent(title) : title}
      </h1>
      {intro && <p className={styles.intro}>{intro}</p>}
      {meta}
      {extra}
    </header>

    {children}

    {contact && <ContactNote />}
  </div>
);

export default ContentPage;
