import React from "react";
import { Link } from "react-router-dom";
import ContentPage from "./ContentPage";
import { Reveal } from "../ui";
import { POLICY_LAST_UPDATED } from "../../utils/constants";
import styles from "./PolicyPage.module.css";

// =============================================================================
// PolicyPage — one policy from src/content/legalContent.js (§38.3)
// =============================================================================
// <PolicyPage document={PRIVACY_POLICY} />
//
// The ContentPage frame on the narrow (720px) column: the trail, "Policies",
// the title, the intro and a muted line with "Last reviewed: {date}" and,
// while the document is a draft, "Draft for legal review". Then the sections
// as .sf-prose: a serif h2 (display-sm, a hairline above) per section, each
// revealed as it scrolls in, and the blocks under it (paragraphs, lists,
// ordered steps, real tables). Placeholders render as a visible blank.
// =============================================================================

// Rich text (legalContent.js, "Shape"): a string, or an array of strings,
// { label, to } router links, { label, href } mailto:/tel: links and
// { placeholder } blanks.
export const renderRich = (text) => {
  if (text == null) return null;
  if (!Array.isArray(text)) return typeof text === "object" ? renderRich([text]) : text;
  return text.map((part, index) => {
    if (part == null) return null;
    if (typeof part === "string") return part;
    if (part.placeholder) {
      return (
        <span key={index} className={styles.placeholder}>
          {part.placeholder}
        </span>
      );
    }
    if (part.to) {
      return (
        <Link key={index} to={part.to}>
          {part.label}
        </Link>
      );
    }
    if (part.href) {
      return (
        <a key={index} href={part.href}>
          {part.label}
        </a>
      );
    }
    return part.label ?? null;
  });
};

// A real table: column headers, and each row's first cell as its header. The
// caption names it for assistive technology; on screen the section's h2
// already says what it is.
const PolicyTable = ({ block }) => (
  <div className={styles.tableWrap}>
    <table className={styles.table}>
      {block.caption && <caption className="sf-visually-hidden">{block.caption}</caption>}
      <thead>
        <tr>
          {block.columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {block.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            <th scope="row">{renderRich(row[0])}</th>
            {row.slice(1).map((cell, cellIndex) => (
              <td key={cellIndex}>{renderRich(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PolicyBlock = ({ block }) => {
  switch (block.type) {
    case "list":
      return (
        <ul>
          {block.items.map((item, index) => (
            <li key={index}>{renderRich(item)}</li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol>
          {block.items.map((item, index) => (
            <li key={index}>{renderRich(item)}</li>
          ))}
        </ol>
      );
    case "table":
      return <PolicyTable block={block} />;
    case "p":
    default:
      return <p>{renderRich(block.text)}</p>;
  }
};

export const PolicyMeta = ({ draft }) => (
  <p className={styles.meta}>
    <span>Last reviewed: {POLICY_LAST_UPDATED}</span>
    {draft && (
      <>
        <span className="sf-visually-hidden">. </span>
        <span className="sf-divider--dot" aria-hidden="true" />
        <span className={styles.draft}>Draft for legal review</span>
      </>
    )}
  </p>
);

const PolicyPage = ({ document }) => (
  <ContentPage
    crumb={document.crumb}
    eyebrow={document.eyebrow}
    title={document.title}
    intro={document.intro}
    meta={<PolicyMeta draft={document.draft !== false} />}
  >
    <div className="sf-prose">
      {document.sections.map((section) => (
        <Reveal as="section" key={section.id} className={styles.section}>
          <h2 id={section.id} className={styles.heading}>
            {section.heading}
          </h2>
          {section.blocks.map((block, index) => (
            <PolicyBlock key={index} block={block} />
          ))}
        </Reveal>
      ))}
    </div>
  </ContentPage>
);

export default PolicyPage;
