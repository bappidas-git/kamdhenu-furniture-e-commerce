import React from "react";
import { WordmarkStrip } from "./BrandStrip";
import styles from "./BrandStrip.module.css";

// =============================================================================
// PressStrip — the "As featured in" slot
// =============================================================================
// The BrandStrip row for press or client names. There is no data source for
// them yet: db.json has no press or client collection or settings field, and
// the schema must not be extended (prompts/00_INDEX.md, "Open questions and
// deviations", item 7). So the home page hands it an empty list and it
// renders nothing. It shows only real items it is given; never hardcode names
// or logos here.
//
// Props:
//   items      [{ name, logo? }]  name (required, also the logo's alt text);
//                                 logo: an image URL shown instead of the name
//   label      string            the row's heading, e.g. "As featured in"
//   headingId, className         as BrandStrip
// Returns null unless `items` holds at least one named item.
// =============================================================================

const PressMark = ({ name, logo }) =>
  logo ? (
    <img
      className={styles.logo}
      src={logo}
      alt={name}
      height="24"
      loading="lazy"
      decoding="async"
    />
  ) : (
    name
  );

const PressStrip = ({ items, label, headingId, className }) => {
  const named = (Array.isArray(items) ? items : []).filter(
    (item) => item && typeof item.name === "string" && item.name.trim() !== ""
  );
  if (named.length === 0) return null;

  return (
    <WordmarkStrip
      label={label}
      items={named}
      renderItem={(item) => <PressMark name={item.name.trim()} logo={item.logo} />}
      headingId={headingId}
      className={className}
    />
  );
};

export default PressStrip;
