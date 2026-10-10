import { parseSpecifications, productPath } from "../../utils/helpers";

// =============================================================================
// The product page's structured data (Prompt 32): a schema.org Product, as
// JSON-LD, for search engines
// =============================================================================
// Built from the same values the page shows, so the markup never says more
// than the page:
//   name, image   the product's name and its photographs (absolute URLs;
//                 inline data images left out)
//   description   the description's prose (the "Specifications:" paragraph
//                 left out), else the short description, else the meta
//                 description
//   sku           the chosen variant's SKU, else the product's
//   brand         only when the catalogue names one (nothing is invented for
//                 the workshop pieces without a brand)
//   offers        one Offer for the choice on screen: its price in INR and its
//                 availability from its stock (InStock above 0, OutOfStock at
//                 0, left out when the stock is unknown)
//   aggregateRating  only with at least one real review: the page's own
//                 average (one decimal, as the ratings row shows it) and count.
//                 Never a `review` entry, never a default rating.
// =============================================================================

const SCHEMA = "https://schema.org";
const IN_STOCK = `${SCHEMA}/InStock`;
const OUT_OF_STOCK = `${SCHEMA}/OutOfStock`;

const clean = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

const absoluteUrl = (value, origin) => {
  try {
    return new URL(value, origin).href;
  } catch {
    return null;
  }
};

const photographs = (product, origin) =>
  (Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image]
  )
    .filter((src) => typeof src === "string" && src.trim() && !src.startsWith("data:"))
    .map((src) => absoluteUrl(src.trim(), origin))
    .filter(Boolean);

/**
 * buildProductStructuredData({ product, price, sku, stock, rating, reviewCount, origin })
 * → a schema.org Product object, or null without a product name or a price.
 */
export const buildProductStructuredData = ({
  product,
  price,
  sku,
  stock,
  rating,
  reviewCount,
  origin = typeof window !== "undefined" ? window.location.origin : "",
}) => {
  const name = clean(product?.name);
  const amount = Number(price);
  if (!name || !Number.isFinite(amount) || amount <= 0) return null;

  const url = absoluteUrl(productPath(product), origin);
  const images = photographs(product, origin);
  const description =
    clean(parseSpecifications(product.description).body) ||
    clean(product.shortDescription) ||
    clean(product.metaDescription);
  const code = clean(sku) || clean(product.sku);
  const brand = clean(product.brand);

  const offer = {
    "@type": "Offer",
    ...(url && { url }),
    price: Math.round(amount * 100) / 100,
    priceCurrency: "INR",
  };
  if (typeof stock === "number" && Number.isFinite(stock)) {
    offer.availability = stock > 0 ? IN_STOCK : OUT_OF_STOCK;
  }

  const count = Math.max(0, Math.floor(Number(reviewCount) || 0));
  const average = Math.min(5, Math.max(0, Number(rating) || 0));

  return {
    "@context": SCHEMA,
    "@type": "Product",
    name,
    ...(url && { url }),
    ...(images.length > 0 && { image: images }),
    ...(description && { description }),
    ...(code && { sku: code }),
    ...(brand && { brand: { "@type": "Brand", name: brand } }),
    offers: offer,
    ...(count > 0 &&
      average > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: Number(average.toFixed(1)),
          reviewCount: count,
          bestRating: 5,
          worstRating: 1,
        },
      }),
  };
};
