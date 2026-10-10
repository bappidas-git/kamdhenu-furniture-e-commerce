import { buildProductStructuredData } from "./productStructuredData";

// The product page's JSON-LD (Prompt 32): built only from what the page shows.

const ORIGIN = "https://shop.example";

const product = {
  id: 2,
  name: "Ribbed-Back Plastic Armchair",
  slug: "ribbed-back-plastic-armchair",
  sku: "PLE-ARM-02",
  brand: "Nilkamal",
  shortDescription: "An everyday plastic armchair whose ribbed back lets air through.",
  description:
    "An everyday plastic armchair.\n\nIt stacks neatly.\n\nSpecifications: Material: Polypropylene; Seat height: 44 cm",
  metaDescription: "An everyday plastic armchair. Shop online at A & S Urbanseat.",
  images: ["https://placehold.co/1200x1500?text=One", "/uploads/two.jpg", "data:image/svg+xml,x"],
  rating: 4,
  totalReviews: 2,
};

const build = (overrides = {}) =>
  buildProductStructuredData({
    product,
    price: 999,
    sku: "PLE-ARM-02-WHT",
    stock: 32,
    rating: 4,
    reviewCount: 2,
    origin: ORIGIN,
    ...overrides,
  });

test("a Product with the page's name, photographs, prose, SKU, brand and offer", () => {
  expect(build()).toEqual({
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Ribbed-Back Plastic Armchair",
    url: "https://shop.example/products/ribbed-back-plastic-armchair",
    image: ["https://placehold.co/1200x1500?text=One", "https://shop.example/uploads/two.jpg"],
    description: "An everyday plastic armchair. It stacks neatly.",
    sku: "PLE-ARM-02-WHT",
    brand: { "@type": "Brand", name: "Nilkamal" },
    offers: {
      "@type": "Offer",
      url: "https://shop.example/products/ribbed-back-plastic-armchair",
      price: 999,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: 4,
      reviewCount: 2,
      bestRating: 5,
      worstRating: 1,
    },
  });
});

test("availability follows the stock: sold out at 0, left out when unknown", () => {
  expect(build({ stock: 0 }).offers.availability).toBe("https://schema.org/OutOfStock");
  expect(build({ stock: undefined }).offers).not.toHaveProperty("availability");
});

test("no aggregateRating without a real review, and never a review entry", () => {
  const data = build({ rating: 0, reviewCount: 0 });
  expect(data).not.toHaveProperty("aggregateRating");
  expect(data).not.toHaveProperty("review");
  expect(build({ rating: 4.25, reviewCount: 3 }).aggregateRating.ratingValue).toBe(4.3);
});

test("no brand is invented for a piece without one", () => {
  expect(build({ product: { ...product, brand: "" } })).not.toHaveProperty("brand");
});

test("the product's own SKU when no variant is chosen", () => {
  expect(build({ sku: "" }).sku).toBe("PLE-ARM-02");
});

test("the description falls back to the short description, then the meta description", () => {
  expect(build({ product: { ...product, description: "" } }).description).toBe(
    product.shortDescription
  );
  expect(
    build({ product: { ...product, description: "", shortDescription: "" } }).description
  ).toBe(product.metaDescription);
});

test("nothing without a name or a price", () => {
  expect(build({ product: { ...product, name: " " } })).toBeNull();
  expect(build({ price: 0 })).toBeNull();
  expect(build({ price: undefined })).toBeNull();
});
