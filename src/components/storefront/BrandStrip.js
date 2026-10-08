import React, { forwardRef, useId } from "react";
import styles from "./BrandStrip.module.css";

// =============================================================================
// BrandStrip — "Brands we carry"
// =============================================================================
// One quiet row between hairlines: the label (an h2 set as an eyebrow) on the
// left, the brand names on the right as text wordmarks (13px, uppercase,
// tracked, muted) separated by dots; on phones the label sits above them and
// the names wrap. Names only: no logos (none are licensed) and no "trusted
// by" wording. The home page derives the list from the catalogue's own
// `brand` values (collectBrands in src/pages/Home/homeData.js).
//
// WordmarkStrip is the shared row; PressStrip ("As featured in") uses it too.
//
// BrandStrip props:
//   brands     string[]  the names, in display order
//   label      string    the row's heading
//   loading    boolean   hold the row's place with a skeleton line
//   headingId  string    id of the heading (one is generated otherwise)
//   className  string    extra class on the section
//   ref        forwarded to the <section> (e.g. a lazy-load trigger)
// Renders nothing when it is not loading and has no names.
// =============================================================================

const keyOf = (item, index) => (typeof item === "string" ? item : item?.name) || index;

export const WordmarkStrip = forwardRef(function WordmarkStrip(
  { label, items = [], renderItem = (item) => item, loading = false, headingId, className },
  ref
) {
  const generatedId = useId();
  const id = headingId || `${generatedId}heading`;
  const rootClass = [styles.strip, className].filter(Boolean).join(" ");

  return (
    <section
      ref={ref}
      className={rootClass}
      aria-labelledby={label ? id : undefined}
      aria-busy={loading || undefined}
    >
      <div className={`sf-container sf-container--wide ${styles.inner}`}>
        {label && (
          <h2 id={id} className={`sf-eyebrow ${styles.label}`}>
            {label}
          </h2>
        )}
        {loading ? (
          // As tall as the names will be: two lines on phones, one above.
          <span className={styles.skeleton} aria-hidden="true">
            <span className="sf-skeleton sf-skeleton--text" />
            <span className={`sf-skeleton sf-skeleton--text ${styles.skeletonExtra}`} />
          </span>
        ) : (
          // The wrapper clips the dot before the first name on each line, so
          // a wrapped line never starts with a separator.
          <div className={styles.listWrap}>
            <ul className={styles.list}>
              {items.map((item, index) => (
                <li key={keyOf(item, index)} className={styles.item}>
                  {renderItem(item)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
});

const BrandStrip = forwardRef(function BrandStrip(
  { brands = [], label, loading = false, headingId, className },
  ref
) {
  const names = (Array.isArray(brands) ? brands : []).filter(
    (name) => typeof name === "string" && name.trim() !== ""
  );
  if (!loading && names.length === 0) return null;

  return (
    <WordmarkStrip
      ref={ref}
      label={label}
      items={names}
      loading={loading}
      headingId={headingId}
      className={className}
    />
  );
});

export default BrandStrip;
