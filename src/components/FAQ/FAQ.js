import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FAQ_ITEMS } from "../../utils/constants";
import styles from "./FAQ.module.css";

// =============================================================================
// FAQ — the accessible question-and-answer accordion (prompts/DESIGN_SYSTEM.md
// §38.4). Used by the Help centre.
// =============================================================================
// <FAQ query={searchText} idPrefix="help-faq" />
//
// Each question is a heading (h3 by default) holding a button with
// aria-expanded and aria-controls; its answer is a region labelled by the
// button, and `inert` while closed, so a closed answer is out of the tab order
// and the accessibility tree. One answer is open at a time. The answer's
// height unfolds over --sf-duration (no motion under reduced motion).
//
// items          [{ id, question, answer, link?: { label, to } }], default
//                FAQ_ITEMS from constants.js
// query          filters the items: a case-insensitive match in the question
//                or the answer (blank shows them all)
// idPrefix       keeps ids unique when two lists share a page ("faq")
// headingLevel   2–6, default 3 (the list sits under the page's own h2)
// emptyMessage   shown when the query matches nothing (a node)
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

// The Help centre's search rule: the trimmed query, lower-cased, found in a
// question or its answer. A blank query keeps every item.
export const filterFaqs = (items, query) => {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return items;
  return items.filter(
    (item) =>
      String(item.question).toLowerCase().includes(needle) ||
      String(item.answer).toLowerCase().includes(needle)
  );
};

const FAQ = ({
  items = FAQ_ITEMS,
  query = "",
  idPrefix = "faq",
  headingLevel = 3,
  emptyMessage,
  className,
}) => {
  const [openId, setOpenId] = useState(null);
  const visible = useMemo(() => filterFaqs(items, query), [items, query]);
  const level = Math.min(6, Math.max(2, Number(headingLevel) || 3));
  const Heading = `h${level}`;

  if (visible.length === 0) {
    return (
      <div className={cx(styles.empty, className)}>
        {emptyMessage ?? <p>No questions match your search.</p>}
      </div>
    );
  }

  return (
    <div className={cx(styles.faq, className)}>
      {visible.map((item) => {
        const isOpen = openId === item.id;
        const questionId = `${idPrefix}-question-${item.id}`;
        const answerId = `${idPrefix}-answer-${item.id}`;
        return (
          <div key={item.id} className={cx(styles.item, isOpen && styles.open)}>
            <Heading className={styles.heading}>
              <button
                type="button"
                id={questionId}
                className={styles.question}
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
              >
                <span className={styles.questionText}>{item.question}</span>
                <span className={styles.toggle} aria-hidden="true" />
              </button>
            </Heading>
            {/* React 18 does not know `inert`; the empty string sets the attribute. */}
            <div
              id={answerId}
              role="region"
              aria-labelledby={questionId}
              className={styles.panel}
              inert={isOpen ? undefined : ""}
            >
              <div className={styles.panelInner}>
                <p className={styles.answer}>{item.answer}</p>
                {item.link?.to && (
                  <p className={styles.more}>
                    <Link to={item.link.to} className="sf-btn sf-btn--link">
                      {item.link.label}
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FAQ;
