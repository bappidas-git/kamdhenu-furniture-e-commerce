import React from "react";
import { Reveal, SectionHeading } from "../ui";
import ProductRail from "../storefront/ProductRail";
import { HOME_SECTIONS } from "../../content/homeContent";
import styles from "./FeaturedProducts.module.css";

// =============================================================================
// FeaturedProducts — the home page's "Featured Collections" rail
// =============================================================================
// A section heading (eyebrow, serif title with one *accent* word, "View all")
// over the shared ProductRail of storefront ProductCards. While `loading` it
// shows skeleton cards; with no products, once loaded, it renders nothing.
// The defaults are the home page's copy (HOME_SECTIONS.featured).
//
// Props:
//   products          array   the featured products (products.getFeatured)
//   title             string  "*word*" sets the italic accent
//   eyebrow           string
//   viewAllLink       string  router path for "View all"; "" hides the link
//   viewAllLabel      string
//   railLabel         string  the carousel's accessible name
//   onAddToCart       fn      (cartItem) => void   } passed to every
//   onToggleWishlist  fn      (product) => void    } ProductCard
//   isInWishlist      fn      (productId) => boolean
//   loading           boolean skeleton cards while the products load
//   headingId         string  id of the h2, which names the section
//   className         string  extra class on the <section>
// =============================================================================

const COPY = HOME_SECTIONS.featured;

const FeaturedProducts = ({
  products = [],
  title = COPY.title,
  eyebrow = COPY.eyebrow,
  viewAllLink = COPY.viewAll.to,
  viewAllLabel = COPY.viewAll.label,
  railLabel = COPY.railLabel,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
  loading = false,
  headingId = "featured-products-title",
  className,
}) => {
  const items = Array.isArray(products) ? products : [];
  if (!loading && items.length === 0) return null;

  return (
    <section
      className={["sf-section", styles.section, className].filter(Boolean).join(" ")}
      aria-labelledby={headingId}
    >
      <Reveal className="sf-container sf-container--wide">
        <SectionHeading
          id={headingId}
          eyebrow={eyebrow}
          title={title}
          action={viewAllLink ? { label: viewAllLabel, to: viewAllLink } : undefined}
        />
        <ProductRail
          products={items}
          loading={loading}
          label={railLabel}
          onAddToCart={onAddToCart}
          onToggleWishlist={onToggleWishlist}
          isInWishlist={isInWishlist}
        />
      </Reveal>
    </section>
  );
};

export default FeaturedProducts;
