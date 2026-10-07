import React from "react";
import { Link } from "react-router-dom";
import renderAccent from "./renderAccent";
import styles from "./SectionHeading.module.css";

const renderAction = (action) => {
  if (React.isValidElement(action)) return action;
  const { label, to, href, ...rest } = action;
  return to ? (
    <Link to={to} className="sf-btn sf-btn--link" {...rest}>
      {label}
    </Link>
  ) : (
    <a href={href} className="sf-btn sf-btn--link" {...rest}>
      {label}
    </a>
  );
};

/**
 * Section title block: eyebrow, serif display-lg title with an optional
 * *accent* word, intro and a "View all"-style action. Left-aligned with the
 * action on the right from 768px up (below the text on phones);
 * align="center" centres everything in a 640px measure.
 *
 * eyebrow    string | node            small tracked label above the title
 * title      string | node            "*word*" renders the italic accent
 * intro      string | node            a sentence or two (17px, secondary, 56ch)
 * align      "left" | "center"        default "left"
 * action     node | { label, to }     a ready link, or { label, to } for a
 *            | { label, href }        router <Link> (href: a plain <a>) styled
 *                                     .sf-btn--link; other keys pass through
 * as         heading tag, default "h2"
 * id         id of the heading (for aria-labelledby on the section)
 * className  extra class on the wrapper
 */
const SectionHeading = ({
  eyebrow,
  title,
  intro,
  align = "left",
  action,
  as: Heading = "h2",
  id,
  className,
}) => {
  const rootClass = [styles.root, align === "center" && styles.center, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <div className={styles.text}>
        {eyebrow && <p className={`sf-eyebrow ${styles.eyebrow}`}>{eyebrow}</p>}
        {title && (
          <Heading id={id} className={`sf-display-lg ${styles.title}`}>
            {renderAccent(title)}
          </Heading>
        )}
        {intro && <p className={styles.intro}>{intro}</p>}
      </div>
      {action && <div className={styles.action}>{renderAction(action)}</div>}
    </div>
  );
};

export default SectionHeading;
