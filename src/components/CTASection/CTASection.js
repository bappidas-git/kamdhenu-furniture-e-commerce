import React, { useId } from "react";
import { Link } from "react-router-dom";
import { renderAccent } from "../ui";
import styles from "./CTASection.module.css";

// =============================================================================
// CTASection — a closing brand statement with one or two calls to action
// =============================================================================
// A centred block: eyebrow, a display-xl title with one *accent* word, one
// line of copy and up to two buttons. The home page ends with it on navy,
// directly above the footer's newsletter band (so it never carries a form).
//
// Tones:
//   paper  on the page itself; ink text; primary (ink) and ghost buttons
//   sand   a sand panel; the same type and buttons
//   navy   a navy panel (always dark, in both modes); paper text, the accent
//          word in caramel; paper and paper-ghost buttons
//
// Props:
//   eyebrow    string           small tracked label above the title
//   title      string           "*word*" renders the italic accent (required)
//   line       string           one sentence under the title
//   primary    { label, to }    the main button (a router link)
//   secondary  { label, to }    the second button; omit or null to hide it
//   tone       "paper" | "sand" | "navy"   default "paper"
//   as         heading tag, default "h2"
//   headingId  id of the heading (one is generated otherwise)
//   className  extra class on the section
// Renders nothing without a title.
// =============================================================================

const TONES = ["paper", "sand", "navy"];

const CTASection = ({
  eyebrow,
  title,
  line,
  primary,
  secondary,
  tone = "paper",
  as: Heading = "h2",
  headingId,
  className,
}) => {
  const generatedId = useId();
  if (!title) return null;

  const id = headingId || `${generatedId}title`;
  const toneName = TONES.includes(tone) ? tone : "paper";
  const onDark = toneName === "navy";
  const actions = [
    primary?.to && { ...primary, variant: onDark ? "sf-btn--paper" : "sf-btn--primary" },
    secondary?.to && { ...secondary, variant: onDark ? "sf-btn--paper-ghost" : "sf-btn--ghost" },
  ].filter(Boolean);
  const rootClass = [styles.cta, styles[toneName], className].filter(Boolean).join(" ");

  return (
    <section className={rootClass} aria-labelledby={id}>
      <div className="sf-container sf-container--wide">
        <div className={styles.panel}>
          {eyebrow && <p className={`sf-eyebrow ${styles.eyebrow}`}>{eyebrow}</p>}
          <Heading id={id} className={`sf-display-xl ${styles.title}`}>
            {renderAccent(title)}
          </Heading>
          {line && <p className={styles.line}>{line}</p>}
          {actions.length > 0 && (
            <div className={styles.actions}>
              {actions.map((action) => (
                <Link
                  key={action.variant}
                  to={action.to}
                  className={`sf-btn ${action.variant} ${styles.button}`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CTASection;
