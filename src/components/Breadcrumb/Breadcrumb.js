import React from "react";
import { Link } from "react-router-dom";
import styles from "./Breadcrumb.module.css";

// =============================================================================
// Breadcrumb — the storefront's shared trail
// =============================================================================
// "Home" first, then `items` in order. Every item before the last is a router
// Link when it has a `link` (plain text otherwise); the last item is the
// current page: plain text with aria-current="page", even when it has a link.
// The "›" separators are drawn by CSS and kept out of the accessibility tree.
//
//   <Breadcrumb
//     items={[
//       { label: "Furniture", link: "/products" },
//       { label: "Plastic Furniture", link: "/products?category=plastic-furniture" },
//       { label: "Essentials" },
//     ]}
//   />
//   → Home › Furniture › Plastic Furniture › Essentials
//
// Props:
//   items      [{ label, link? }]  the trail after Home (default [])
//   className  string              appended to the nav's class
//
// Used by the listing (Prompt 14); the product page (16) and the content
// pages (28) adopt it. Tokens only.
// =============================================================================

const HOME = { label: "Home", link: "/" };

const Breadcrumb = ({ items = [], className }) => {
  const trail = [
    HOME,
    ...items.filter((item) => item && item.label != null && item.label !== ""),
  ];

  return (
    <nav
      className={className ? `${styles.breadcrumb} ${className}` : styles.breadcrumb}
      aria-label="Breadcrumb"
    >
      <ol className={styles.list}>
        {trail.map((item, index) => {
          const current = index === trail.length - 1;
          return (
            <li key={index} className={styles.item}>
              {current ? (
                <span className={styles.current} aria-current="page">
                  {item.label}
                </span>
              ) : item.link ? (
                <Link to={item.link} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span className={styles.text}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
