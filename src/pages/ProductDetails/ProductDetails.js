import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../context/WishlistContext";
import apiService from "../../services/api";
import { categoryParam } from "../../utils/categories";
import { formatCurrency } from "../../utils/helpers";
import { STOREFRONT_CONFIG } from "../../theme/tokens";
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";
import {
  ProductGallery,
  ProductGallerySkeleton,
  SocialProof,
  PriceBlock,
  VariantSelector,
  QuantityStepper,
  TrustBadges,
  DeliveryReturnsInfo,
  AddToCartBar,
  ReviewsSection,
  RelatedProducts,
  FrequentlyBoughtTogether,
} from "../../components/storefront";
import styles from "./ProductDetails.module.css";

// =============================================================================
// Product Detail Page (PDP)
// =============================================================================
// Assembled entirely from the reusable, themeable, domain-agnostic storefront
// component library (src/components/storefront). This page owns DATA (loading,
// variant/stock derivation, the reviews blend, cart wiring); the components own
// PRESENTATION + the UX principles. Everything here is API/db.json-driven — no
// hardcoded business content — and every persuasive element is bound to real
// data (see the ethics notes in STOREFRONT_UX_GUIDELINES.md).
//
// The first screen (Prompt 16): the shared breadcrumb with the category's
// full trail, then a 12-column grid with the gallery in seven columns (sticky
// from 1024px) and the buy box in five: eyebrow, serif title, ratings row,
// price, summary, variants, quantity and stock, actions, SKU, promises and the
// delivery facts. One column below 980px, the gallery first. The tabs, the
// bundle and the related rail below are Prompt 17's.
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

// The category's ancestors, root first ([department, …, leaf]), read one level
// at a time through the category endpoint the page already uses. A failed or
// missing read leaves the leaf on its own; a cycle or a very deep tree stops.
const MAX_CATEGORY_DEPTH = 6;
const loadCategoryTrail = async (leaf) => {
  const trail = [leaf];
  const seen = new Set([String(leaf.id)]);
  let parentId = leaf.parentId;
  try {
    while (
      parentId != null &&
      parentId !== "" &&
      trail.length < MAX_CATEGORY_DEPTH &&
      !seen.has(String(parentId))
    ) {
      const parent = await apiService.categories.getById(parentId);
      if (!parent) return [leaf];
      seen.add(String(parentId));
      trail.unshift(parent);
      parentId = parent.parentId;
    }
    return trail;
  } catch (error) {
    return [leaf];
  }
};

// ─── Loading Skeleton ───────────────────────────────────────────────────────
// The page's own layout in sand: trail, gallery, then the buy box's lines,
// chips, stepper and buttons, so the loaded page lands in the same places.
const Skeleton = () => (
  <div className={`sf-container sf-container--wide ${styles.container}`} aria-busy="true">
    <span className="sf-visually-hidden">Loading the product</span>
    <div className={styles.crumbs} aria-hidden="true">
      <span className={`sf-skeleton ${styles.crumbSkeleton}`} />
    </div>
    <div className={styles.mainLayout} aria-hidden="true">
      <div className={styles.gallerySection}>
        <ProductGallerySkeleton />
      </div>
      <div className={styles.infoSection}>
        <span className={styles.eyebrow}>
          <span className={`sf-skeleton ${styles.eyebrowSkeleton}`} />
        </span>
        <span className={`sf-display-md ${styles.productName} ${styles.titleSkeleton}`}>
          <span className="sf-skeleton" />
          <span className="sf-skeleton" />
        </span>
        <span className={`${styles.socialProof} ${styles.lineSkeleton}`}>
          <span className="sf-skeleton" />
        </span>
        <span className={`${styles.price} ${styles.priceSkeleton}`}>
          <span className="sf-skeleton" />
          <span className="sf-skeleton" />
        </span>
        <span className={`${styles.shortDescription} ${styles.textSkeleton}`}>
          <span className="sf-skeleton" />
          <span className="sf-skeleton" />
        </span>
        <hr className={styles.rule} />
        <span className={styles.chipsSkeleton}>
          <span className={`sf-skeleton ${styles.eyebrowSkeleton}`} />
          <span className={styles.chipsRow}>
            <span className="sf-skeleton" />
            <span className="sf-skeleton" />
            <span className="sf-skeleton" />
          </span>
        </span>
        <span className={`${styles.purchaseRow} ${styles.variantsGap}`}>
          <span className={`sf-skeleton ${styles.stepperSkeleton}`} />
          <span className={`sf-skeleton ${styles.statusSkeleton}`} />
        </span>
        <span className={styles.actions}>
          <span className={`sf-skeleton ${styles.addToCart} ${styles.buttonSkeleton}`} />
          <span className={`sf-skeleton ${styles.buyNow} ${styles.buttonSkeleton}`} />
          <span className={`sf-skeleton ${styles.wishlist} ${styles.circleSkeleton}`} />
        </span>
      </div>
    </div>
  </div>
);

// ─── Not Found State ────────────────────────────────────────────────────────
// An in-app state (no redirect): the serif line and a way back to the shop.
const NotFound = () => (
  <div className={`sf-container sf-container--wide ${styles.notFound}`}>
    <p className="sf-eyebrow">Not found</p>
    <h1 className={`sf-display-md ${styles.notFoundTitle}`}>We couldn't find that piece.</h1>
    <p className={styles.notFoundText}>
      It may have been renamed, or it is no longer in our catalogue.
    </p>
    <Link to="/products" className="sf-btn sf-btn--primary sf-btn--lg">
      Browse all furniture
    </Link>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
const ProductDetails = () => {
  // Route is /products/:slug (slug canonical; legacy numeric id still resolves).
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const tabsRef = useRef(null);
  const buyBoxRef = useRef(null); // anchor for the sticky mobile Add-to-Cart bar

  // ── State ──────────────────────────────────────────────────────────────
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [added, setAdded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [bundle, setBundle] = useState([]);
  const [category, setCategory] = useState(null);
  const [settings, setSettings] = useState(null);
  const [shipping, setShipping] = useState([]);
  // [department, …, leaf] once read; [] with no category; null while reading.
  const [categoryTrail, setCategoryTrail] = useState(null);
  // Settings and shipping methods have both answered (or failed).
  const [storeDataReady, setStoreDataReady] = useState(false);
  // The shopper has changed the variant (drives the status announcement).
  const [variantPicked, setVariantPicked] = useState(false);

  // ── Fetch product ──────────────────────────────────────────────────────
  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setNotFound(false);

      const isLegacyId = /^\d+$/.test(String(slug));
      let data = isLegacyId
        ? await apiService.products.getById(slug)
        : await apiService.products.getBySlug(slug);

      if (!data) {
        data = isLegacyId
          ? await apiService.products.getBySlug(slug).catch(() => null)
          : await apiService.products.getById(slug).catch(() => null);
      }

      if (!data) {
        setNotFound(true);
        return;
      }

      // Canonicalise the URL to the slug form so old links never 404.
      if (data.slug && String(slug) !== String(data.slug)) {
        navigate(`/products/${data.slug}`, { replace: true });
      }

      setProduct(data);
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0]);
      } else {
        setSelectedVariant(null);
      }
      setQuantity(1);
      setVariantPicked(false);

      // Recently viewed (key must match what Home.js reads).
      try {
        const viewed = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
        const filtered = viewed.filter((item) => String(item.id) !== String(data.id));
        filtered.unshift({
          id: data.id,
          slug: data.slug,
          name: data.name,
          brand: data.brand,
          image: data.images?.[0] || data.image,
          images: data.images,
          price: data.price,
          comparePrice: data.comparePrice,
          variants: data.variants,
          rating: data.rating,
          totalReviews: data.totalReviews,
          viewedAt: new Date().toISOString(),
        });
        localStorage.setItem("recentlyViewed", JSON.stringify(filtered.slice(0, 20)));
      } catch (e) {
        /* ignore localStorage errors */
      }

      // A new product never shows the previous one's category or trail.
      setCategory(null);
      setCategoryTrail(data.categoryId ? null : []);
      if (data.categoryId) {
        apiService.categories
          .getById(data.categoryId)
          .then((found) => {
            setCategory(found);
            if (!found) setCategoryTrail([]);
          })
          .catch(() => setCategoryTrail([]));
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug, navigate]);

  // ── Fetch reviews (approved only — enforced by the API) ─────────────────
  const fetchReviews = useCallback(async () => {
    const productId = product?.id;
    if (!productId) return;
    try {
      setReviewsLoading(true);
      setReviewsError(false);
      const data = await apiService.products.getReviews(productId);
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setReviews([]);
      setReviewsError(true);
    } finally {
      setReviewsLoading(false);
    }
  }, [product?.id]);

  // ── Related + bundle (AOV) — real catalogue data only ───────────────────
  const fetchAov = useCallback(async () => {
    if (!product) return;
    const cfg = STOREFRONT_CONFIG.aov;
    if (cfg.relatedProducts) {
      apiService.products
        .getRelated(product, cfg.maxRelated)
        .then(setRelatedProducts)
        .catch(() => setRelatedProducts([]));
    }
    if (cfg.frequentlyBoughtTogether) {
      apiService.products
        .getFrequentlyBoughtTogether(product, cfg.maxBundle - 1)
        .then(setBundle)
        .catch(() => setBundle([]));
    }
  }, [product]);

  // ── Public store data for trust signals + transparent delivery info ─────
  // Both reads settle (a failure counts as no data) before the promises and
  // the delivery facts are shown, so nothing is claimed ahead of the data.
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiService.settings.get().then((s) => active && setSettings(s)),
      apiService.shipping
        .getMethods()
        .then((m) => active && setShipping(Array.isArray(m) ? m : [])),
    ]).then(() => active && setStoreDataReady(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetchProduct();
    window.scrollTo(0, 0);
  }, [fetchProduct]);

  useEffect(() => {
    if (product) {
      fetchReviews();
      fetchAov();
    }
  }, [product, fetchReviews, fetchAov]);

  // ── Category trail for the breadcrumb (once the leaf is known) ──────────
  useEffect(() => {
    if (!category) return undefined;
    let active = true;
    loadCategoryTrail(category).then((trail) => {
      if (active) setCategoryTrail(trail);
    });
    return () => {
      active = false;
    };
  }, [category]);

  // ── Derived values ─────────────────────────────────────────────────────
  const images =
    product?.images?.length > 0
      ? product.images
      : product?.image
      ? [product.image]
      : [];

  const currentPrice = selectedVariant ? selectedVariant.price : product?.price || 0;
  const comparePrice = product?.comparePrice || 0;
  const discount =
    comparePrice > currentPrice
      ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100)
      : 0;
  const currentSku = selectedVariant?.sku || product?.sku || "";

  // Stock for the active selection — variant stock, else product stock (never
  // silently 0). Low-stock uses the product's REAL threshold (not a magic 5).
  const currentStock = selectedVariant
    ? typeof selectedVariant.stock === "number"
      ? selectedVariant.stock
      : product?.stock
    : product?.stock;
  const hasStockInfo = typeof currentStock === "number";
  const isOutOfStock = hasStockInfo && currentStock <= 0;
  const lowStockThreshold = Number(product?.lowStockThreshold) || 5;
  const isLowStock = !isOutOfStock && hasStockInfo && currentStock <= lowStockThreshold;
  const STOCK_UNKNOWN_MAX = 10;
  const maxQuantity = hasStockInfo ? Math.max(1, currentStock) : STOCK_UNKNOWN_MAX;

  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), maxQuantity));
  }, [maxQuantity]);

  // ── Reviews blend (consistent average across the page) ──────────────────
  const baseRating = Number(product?.rating) || 0;
  const baseCount = Number(product?.totalReviews) || 0;
  const reviewSum = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
  const totalRatingsCount = baseCount + reviews.length;
  const displayAvg =
    totalRatingsCount > 0
      ? (baseRating * baseCount + reviewSum) / totalRatingsCount
      : baseRating;

  // ── Cart wiring ────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(
    (options) => {
      if (!product) return;
      if (product.variants?.length > 0 && !selectedVariant) return;

      const effectivePrice = selectedVariant ? selectedVariant.price : product.price;
      const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock;
      const cartItem = {
        id: selectedVariant ? `${product.id}-${selectedVariant.id}` : String(product.id),
        productId: product.id,
        slug: product.slug || null,
        variantId: selectedVariant?.id || null,
        variantName: selectedVariant?.name || null,
        name: product.name,
        image: product.images?.[0] || product.image || "",
        price: effectivePrice,
        comparePrice: product.comparePrice || 0,
        currency: "INR",
        ...(effectiveStock != null && effectiveStock !== ""
          ? { stock: Number(effectiveStock) }
          : {}),
      };
      return addToCart(cartItem, quantity, options);
    },
    [product, selectedVariant, quantity, addToCart]
  );

  // Primary CTA with a brief, satisfying "Added ✓" confirmation (the cart toast
  // + mini-cart drawer also fire from CartContext).
  const handleAddClick = useCallback(() => {
    if (isOutOfStock) return;
    handleAddToCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }, [handleAddToCart, isOutOfStock]);

  const handleBuyNow = useCallback(async () => {
    await handleAddToCart({ openDrawer: false });
    navigate("/checkout");
  }, [handleAddToCart, navigate]);

  const scrollToReviews = useCallback(() => {
    setActiveTab("reviews");
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // A variant chosen in the selector (the selection logic is the selector's).
  const handleVariantChange = useCallback((variant) => {
    setSelectedVariant(variant);
    setVariantPicked(true);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) return <Skeleton />;
  if (notFound || !product) return <NotFound />;

  const wishlisted = isInWishlist(product.id);

  // Stock status, from the derived values only.
  const stockStatus = isOutOfStock
    ? { text: "Out of stock", tone: styles.stockOut }
    : isLowStock
    ? { text: `Only ${currentStock} left`, tone: styles.stockLow }
    : hasStockInfo
    ? { text: "In stock", tone: styles.stockIn }
    : null;

  // Announced (politely) when the shopper changes the variant: what it is,
  // what it costs and whether it is in stock.
  const variantAnnouncement =
    variantPicked && selectedVariant
      ? [selectedVariant.name, formatCurrency(currentPrice, "INR"), stockStatus?.text]
          .filter(Boolean)
          .join(", ")
      : "";

  // Brand first; else the category's name (held as a skeleton while it loads).
  const eyebrowPending =
    !product.brand && !!product.categoryId && !category && categoryTrail === null;
  const eyebrow = product.brand || category?.name || "";

  const crumbs = [
    ...(categoryTrail || []).map((c) => ({
      label: c.name,
      link: `/products?category=${categoryParam(c)}`,
    })),
    { label: product.name },
  ];

  // The tax line waits for the settings (a blank line holds its place), so
  // the page never states a tax treatment the store has not confirmed.
  const taxNote = settings
    ? settings?.store?.taxIncluded === false
      ? "Exclusive of taxes — calculated at checkout"
      : "Inclusive of all taxes"
    : "\u00a0";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={styles.page}
    >
      <div className={`sf-container sf-container--wide ${styles.container}`}>
        {/* ── Breadcrumb (orientation): the category's full trail ───────── */}
        <div className={styles.crumbs}>
          {categoryTrail === null ? (
            <span className={`sf-skeleton ${styles.crumbSkeleton}`} aria-hidden="true" />
          ) : (
            <Breadcrumb items={crumbs} className={styles.trail} />
          )}
        </div>

        {/* ── Above the fold: media + buy box ───────────────────────────── */}
        <div className={styles.mainLayout}>
          <div className={styles.gallerySection}>
            <ProductGallery images={images} alt={product.name} discount={discount} />
          </div>

          <div className={styles.infoSection}>
            {(product.brand || product.categoryId) && (
              <p className={styles.eyebrow}>
                {eyebrowPending ? (
                  <span className={`sf-skeleton ${styles.eyebrowSkeleton}`} aria-hidden="true" />
                ) : (
                  eyebrow
                )}
              </p>
            )}
            <h1 className={`sf-display-md ${styles.productName}`}>{product.name}</h1>

            {/* Social proof — real ratings only, jumps to reviews */}
            <SocialProof
              rating={displayAvg}
              count={totalRatingsCount}
              onReviewsClick={scrollToReviews}
              className={styles.socialProof}
            />

            {/* Price — honest compare/discount + transparent tax note */}
            <div className={styles.price}>
              <PriceBlock
                price={currentPrice}
                comparePrice={comparePrice}
                currency="INR"
                size="lg"
                taxNote={taxNote}
              />
            </div>

            {product.shortDescription && (
              <p className={styles.shortDescription}>{product.shortDescription}</p>
            )}

            <hr className={styles.rule} />

            {/* Variant selection — visible swatches/chips, never a dropdown */}
            {product.variants && product.variants.length > 0 && (
              <div className={styles.variants}>
                <VariantSelector
                  variants={product.variants}
                  value={selectedVariant}
                  onChange={handleVariantChange}
                  productStock={product.stock}
                  currency="INR"
                />
              </div>
            )}

            {/* Quantity + honest stock status */}
            <div className={styles.purchaseRow}>
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={maxQuantity}
                disabled={isOutOfStock}
              />
              {stockStatus && (
                <p className={cx(styles.stockStatus, stockStatus.tone)}>{stockStatus.text}</p>
              )}
            </div>

            {/* Primary / secondary CTAs (standard copy, clear hierarchy) */}
            <div className={styles.actions} ref={buyBoxRef}>
              <button
                type="button"
                className={cx(
                  "sf-btn sf-btn--primary sf-btn--lg sf-btn--block",
                  styles.addToCart
                )}
                onClick={handleAddClick}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? (
                  "Out of stock"
                ) : added ? (
                  <>
                    Added
                    <svg className={styles.check} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </>
                ) : (
                  "Add to cart"
                )}
              </button>
              <button
                type="button"
                className={cx("sf-btn sf-btn--ghost sf-btn--lg sf-btn--block", styles.buyNow)}
                onClick={handleBuyNow}
                disabled={isOutOfStock}
              >
                Buy now
              </button>
              <button
                type="button"
                className={cx(styles.wishlist, wishlisted && styles.wishlistActive)}
                onClick={() => toggleWishlist(product)}
                aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                aria-pressed={wishlisted}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </button>
            </div>

            {currentSku && (
              <p className={styles.sku}>
                SKU: <span>{currentSku}</span>
              </p>
            )}

            <hr className={styles.rule} />

            {/* Trust signals near the decision point (config + live data) */}
            <TrustBadges
              settings={settings}
              shipping={shipping}
              variant="grid"
              loading={!storeDataReady}
            />

            {/* Transparent delivery, COD & returns — REAL data, shown upfront */}
            <div className={styles.delivery}>
              <DeliveryReturnsInfo
                shipping={shipping}
                settings={settings}
                currency="INR"
                loading={!storeDataReady}
              />
            </div>

            <p className="sf-visually-hidden" role="status">
              {variantAnnouncement}
            </p>
          </div>
        </div>

        {/* ── Below the fold: tabs ──────────────────────────────────────── */}
        <div className={styles.tabsSection} ref={tabsRef}>
          <div className={styles.tabNav} role="tablist" aria-label="Product information">
            <button
              role="tab"
              aria-selected={activeTab === "description"}
              className={`${styles.tabButton} ${activeTab === "description" ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab("description")}
            >
              Description
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "reviews"}
              className={`${styles.tabButton} ${activeTab === "reviews" ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab("reviews")}
            >
              Reviews ({reviews.length})
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === "description" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={styles.descriptionTab}
              >
                <div className={styles.fullDescription}>
                  <h3>Product Description</h3>
                  <p>{product.description || "No description available."}</p>
                </div>

                <div className={styles.specTable}>
                  <h3>Specifications</h3>
                  <table>
                    <tbody>
                      {product.brand && (
                        <tr>
                          <td className={styles.specLabel}>Brand</td>
                          <td className={styles.specValue}>{product.brand}</td>
                        </tr>
                      )}
                      {currentSku && (
                        <tr>
                          <td className={styles.specLabel}>SKU</td>
                          <td className={styles.specValue}>{currentSku}</td>
                        </tr>
                      )}
                      {product.weight && (
                        <tr>
                          <td className={styles.specLabel}>Weight</td>
                          <td className={styles.specValue}>{product.weight}</td>
                        </tr>
                      )}
                      {product.dimensions && (
                        <tr>
                          <td className={styles.specLabel}>Dimensions</td>
                          <td className={styles.specValue}>
                            {typeof product.dimensions === "object"
                              ? [
                                  product.dimensions.length,
                                  product.dimensions.width,
                                  product.dimensions.height,
                                ]
                                  .filter((v) => v != null && v !== "")
                                  .join(" × ")
                              : product.dimensions}
                          </td>
                        </tr>
                      )}
                      {category?.name && (
                        <tr>
                          <td className={styles.specLabel}>Category</td>
                          <td className={styles.specValue}>{category.name}</td>
                        </tr>
                      )}
                      {product.tags && product.tags.length > 0 && (
                        <tr>
                          <td className={styles.specLabel}>Tags</td>
                          <td className={styles.specValue}>{product.tags.join(", ")}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === "reviews" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <ReviewsSection
                  reviews={reviews}
                  displayAvg={displayAvg}
                  totalRatingsCount={totalRatingsCount}
                  loading={reviewsLoading}
                  error={reviewsError}
                  onRetry={fetchReviews}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* ── AOV: curated bundle, then similar products (data-driven) ──── */}
        <FrequentlyBoughtTogether
          anchor={product}
          companions={bundle}
          onAddToCart={addToCart}
          currency="INR"
        />

        <RelatedProducts
          title="You may also like"
          products={relatedProducts}
          onAddToCart={addToCart}
          onToggleWishlist={toggleWishlist}
          isInWishlist={isInWishlist}
        />
      </div>

      {/* ── Sticky mobile Add-to-Cart (mobile-first) ──────────────────────── */}
      <AddToCartBar
        anchorRef={buyBoxRef}
        price={currentPrice}
        currency="INR"
        image={product.images?.[0] || product.image}
        name={product.name}
        detail={selectedVariant?.name}
        disabled={isOutOfStock}
        onAddToCart={handleAddClick}
      />
    </motion.div>
  );
};

export default ProductDetails;
