import React, { useId } from "react";
import { Reveal, SectionHeading } from "../ui";
import ProductRail from "./ProductRail";

// =============================================================================
// RelatedProducts — data-driven AOV carousel ("You may also like")
// =============================================================================
// A section heading over the storefront's one product rail (ProductRail: snap
// scrolling, hairline previous / next buttons, the progress line). Purely
// data-driven: if the caller has no real related products to pass, the whole
// section renders nothing (no filler, no fabricated "recommended" items).
//
// Props:
//   products         array   real products to recommend (products.getRelated)
//   eyebrow, title   string  "Related", "You may also *like*." (one accent)
//   railLabel        string  the carousel's accessible name
//   onAddToCart      fn      (cartItem) => void   } passed to each ProductCard
//   onToggleWishlist fn      (product) => void    }
//   isInWishlist     fn      (productId) => boolean
//   className        string  on the <section>
// =============================================================================
const RelatedProducts = ({
  products = [],
  eyebrow = "Related",
  title = "You may also *like*.",
  railLabel = "Related pieces",
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
  className,
}) => {
  const headingId = `${useId()}related-title`;
  const items = Array.isArray(products) ? products.filter(Boolean) : [];
  if (items.length === 0) return null;

  return (
    <section className={className} aria-labelledby={headingId}>
      <Reveal>
        <SectionHeading id={headingId} eyebrow={eyebrow} title={title} />
        <ProductRail
          products={items}
          label={railLabel}
          onAddToCart={onAddToCart}
          onToggleWishlist={onToggleWishlist}
          isInWishlist={isInWishlist}
        />
      </Reveal>
    </section>
  );
};

export default RelatedProducts;
