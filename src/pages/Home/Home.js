import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../context/WishlistContext";
import useNearViewport from "../../hooks/useNearViewport";
import apiService from "../../services/api";
import { categoryParam } from "../../utils/categories";
import HeroSection from "../../components/HeroSection/HeroSection";
import AssuranceStrip from "../../components/storefront/AssuranceStrip";
import FeaturedProducts from "../../components/FeaturedProducts/FeaturedProducts";
import CTASection from "../../components/CTASection/CTASection";
import {
  BrandStrip,
  PressStrip,
  PriceBlock,
  ProductCard,
  ProductRail,
  ReviewCarousel,
} from "../../components/storefront";
import { Marquee, Reveal, SectionHeading, renderAccent, staggerDelay } from "../../components/ui";
import {
  CLOSING_CTA,
  COMPLETE_THE_SPACE,
  HOME_SECTIONS,
  MARQUEE_PHRASES,
  PROMISE_STEPS,
  SPACES,
  STORY,
} from "../../content/homeContent";
import {
  buildCartItem,
  formatCurrency,
  getProductMinPrice,
  onImageError,
  PLACEHOLDER_IMG,
  productPath,
} from "../../utils/helpers";
import {
  collectBrands,
  loadFeaturedReviews,
  loadPromiseData,
  promiseBodyLayout,
  resolvePromiseBody,
} from "./homeData";
import styles from "./Home.module.css";

// =============================================================================
// Home page
// =============================================================================
// Hero and assurance strip (Prompt 10), then the discovery sections (Prompt
// 11), in this order:
//   Shop by space · story block 1 · Featured Collections · Complete the space
//   (the one sand band) · story block 2 · Trending · Recently viewed
// then the closing half (Prompt 12):
//   Brands we carry · (As featured in) · From our customers · Our promise ·
//   the marquee · the closing CTA, directly above the footer's newsletter band
// Copy and media come from homeContent.js.
//
// Data: categories, featured and trending products in one Promise.all (each
// read falls back to [] on failure); once featured has resolved, the "Complete
// the space" anchor and its companions. The closing half reads lazily, each
// section when it comes within a screen of the viewport: the catalogue for the
// brand names, the approved reviews of the featured products, and the store
// settings and shipping methods for the promise steps (rules in homeData.js).
// Sections whose data is missing are hidden; nothing is invented to fill them.
// =============================================================================

// Must match the key written by ProductDetails.js so viewing a product
// populates this list end-to-end.
const RECENTLY_VIEWED_KEY = "recentlyViewed";

const getRecentlyViewed = () => {
  try {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const isProduct = (product) =>
  Boolean(product) && typeof product === "object" && product.id != null && product.isActive !== false;

const productList = (value) => (Array.isArray(value) ? value.filter(isProduct) : []);

// Fills "{count} pieces, {total}".
const fillTemplate = (template, values) =>
  template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));

// The "Complete the space" curation: the anchor (by slug, else the first
// featured product with frequentlyBoughtTogetherIds) and two to four
// companions (its frequently-bought-together pieces, topped up with related
// products when those give fewer than two). Null hides the section.
const loadCompleteTheSpace = async (featured = []) => {
  const slug = COMPLETE_THE_SPACE.anchorProductSlug;
  let anchor = slug ? await apiService.products.getBySlug(slug).catch(() => null) : null;
  if (!isProduct(anchor)) {
    anchor =
      featured.find(
        (product) =>
          isProduct(product) &&
          Array.isArray(product.frequentlyBoughtTogetherIds) &&
          product.frequentlyBoughtTogetherIds.length > 0
      ) || null;
  }
  if (!anchor) return null;

  const seen = new Set([String(anchor.id)]);
  const unique = (product) => {
    const key = String(product.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  let companions = productList(
    await apiService.products.getFrequentlyBoughtTogether(anchor, 4).catch(() => [])
  ).filter(unique);
  if (companions.length < 2) {
    const related = productList(
      await apiService.products.getRelated(anchor, 4).catch(() => [])
    ).filter(unique);
    companions = [...companions, ...related];
  }
  companions = companions.slice(0, 4);
  return companions.length >= 2 ? { anchor, companions } : null;
};

// ── Shop by space ────────────────────────────────────────────────────────────

const ShopBySpace = ({ categories, loading }) => {
  const tiles = useMemo(
    () =>
      SPACES.map((space) => {
        const category = categories.find(
          (c) => c.slug === space.categorySlug && c.isActive !== false
        );
        return category ? { ...space, category } : null;
      }).filter(Boolean),
    [categories]
  );

  if (!loading && tiles.length === 0) return null;
  const copy = HOME_SECTIONS.spaces;

  return (
    <section className={`sf-section ${styles.section}`} aria-labelledby="home-spaces-title">
      <div className="sf-container sf-container--wide">
        <SectionHeading id="home-spaces-title" eyebrow={copy.eyebrow} title={copy.title} />
        <ul className={styles.spaces} aria-busy={loading || undefined}>
          {loading
            ? SPACES.map((space) => (
                <li key={space.key} aria-hidden="true">
                  <span className={`sf-skeleton ${styles.spaceSkeleton}`} />
                </li>
              ))
            : tiles.map((tile, index) => (
                <Reveal as="li" key={tile.key} delay={staggerDelay(index)}>
                  <Link
                    to={`/products?category=${categoryParam(tile.category)}`}
                    className={`sf-focus ${styles.spaceTile}`}
                  >
                    <img
                      className={styles.spaceImage}
                      src={tile.category.image || PLACEHOLDER_IMG}
                      alt={tile.category.name}
                      loading="lazy"
                      decoding="async"
                      onError={onImageError}
                    />
                    {/* Read as "Office Chairs, Office, Task, executive…": the
                        hidden commas separate the alt text, label and line. */}
                    <span className={styles.spaceText}>
                      <span className="sf-visually-hidden">, </span>
                      <span className={styles.spaceLabel}>{tile.label}</span>
                      <span className="sf-visually-hidden">, </span>
                      <span className={styles.spaceLine}>{tile.line}</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
        </ul>
      </div>
    </section>
  );
};

// ── Editorial story block ────────────────────────────────────────────────────

const StoryBlock = ({ story, number, mirrored = false }) => {
  if (!story) return null;
  const titleId = `home-story-${number}-title`;
  const { image, cta } = story;

  return (
    <section className={`sf-section ${styles.section}`} aria-labelledby={titleId}>
      <div className="sf-container sf-container--wide">
        <div className={`${styles.story} ${mirrored ? styles.storyMirrored : ""}`}>
          {image?.src && (
            <Reveal className={styles.storyMedia}>
              <img
                className={styles.storyImage}
                src={image.src}
                alt={image.alt || ""}
                width={image.width}
                height={image.height}
                loading="lazy"
                decoding="async"
                onError={onImageError}
              />
            </Reveal>
          )}
          <Reveal className={styles.storyText} delay={staggerDelay(1)}>
            {story.eyebrow && <p className="sf-eyebrow sf-eyebrow--rule">{story.eyebrow}</p>}
            <h2 id={titleId} className={`sf-display-lg ${styles.storyTitle}`}>
              {renderAccent(story.title)}
            </h2>
            {story.body && <p className={styles.storyBody}>{story.body}</p>}
            {cta?.to && (
              <Link to={cta.to} className={`sf-btn sf-btn--ghost ${styles.storyCta}`}>
                {cta.label}
              </Link>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
};

// ── Complete the space ───────────────────────────────────────────────────────

const CompleteTheSpace = ({ curation, onAddToCart, onToggleWishlist, isInWishlist, onAddAll }) => {
  if (!curation) return null;
  const copy = COMPLETE_THE_SPACE;
  const { anchor, companions } = curation;
  const { sellingPrice, originalPrice } = getProductMinPrice(anchor);
  const pieces = [anchor, ...companions];
  // Sold-out pieces are left out, as their cards disable quick add.
  const available = pieces.filter((product) => product.stock !== 0);
  const total = available.reduce((sum, product) => sum + (buildCartItem(product).price || 0), 0);
  const href = productPath(anchor);

  return (
    <section
      className={`sf-section ${styles.section} ${styles.band}`}
      aria-labelledby="home-complete-title"
    >
      <div className="sf-container sf-container--wide">
        <SectionHeading
          id="home-complete-title"
          eyebrow={copy.eyebrow}
          title={copy.title}
          intro={copy.intro}
        />
        <div className={styles.curation}>
          {/* The image repeats the "View" link for pointer users; keyboard and
              screen-reader users get that link once. */}
          <Reveal className={styles.anchorMedia}>
            <Link to={href} className={styles.anchorImageLink} tabIndex={-1} aria-hidden="true">
              <img
                className={styles.anchorImage}
                src={anchor.images?.[0] || anchor.image || PLACEHOLDER_IMG}
                alt={anchor.name}
                width={1200}
                height={1500}
                loading="lazy"
                decoding="async"
                onError={onImageError}
              />
            </Link>
          </Reveal>

          <Reveal className={styles.anchorDetails} delay={staggerDelay(1)}>
            {anchor.brand && <p className="sf-eyebrow">{anchor.brand}</p>}
            <h3 className={styles.anchorName}>{anchor.name}</h3>
            {anchor.shortDescription && <p className={styles.anchorText}>{anchor.shortDescription}</p>}
            <PriceBlock price={sellingPrice} comparePrice={originalPrice} size="md" showSavings={false} />
            <Link to={href} className="sf-btn sf-btn--link">
              {copy.viewLabel}
              <span className="sf-visually-hidden"> {anchor.name}</span>
            </Link>
          </Reveal>

          <Reveal className={styles.companions} delay={staggerDelay(2)}>
            <h3 className={`sf-eyebrow ${styles.companionsTitle}`}>{copy.companionsLabel}</h3>
            <ul className={styles.companionGrid}>
              {companions.map((product) => (
                <li key={product.id}>
                  <ProductCard
                    product={product}
                    onAddToCart={onAddToCart}
                    onToggleWishlist={onToggleWishlist}
                    isWishlisted={isInWishlist(product.id)}
                  />
                </li>
              ))}
            </ul>
            {available.length > 0 && (
              <div className={styles.addAll}>
                <button
                  type="button"
                  className="sf-btn sf-btn--ghost"
                  aria-describedby="home-complete-total"
                  onClick={() => onAddAll(available)}
                >
                  {available.length === pieces.length ? copy.addAllLabel : copy.addAvailableLabel}
                </button>
                <p id="home-complete-total" className={styles.addAllTotal}>
                  {fillTemplate(copy.totalLabel, {
                    count: available.length,
                    total: formatCurrency(total),
                  })}
                </p>
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
};

// ── From our customers ───────────────────────────────────────────────────────
// Approved reviews of the featured pieces (loadFeaturedReviews). `reviews` is
// null until they are read (skeleton slides hold the section's place); with
// none to show the section is hidden rather than showing an empty block.

const CustomerReviews = ({ reviews, sectionRef }) => {
  if (Array.isArray(reviews) && reviews.length === 0) return null;
  const copy = HOME_SECTIONS.reviews;

  return (
    <section
      ref={sectionRef}
      className={`sf-section ${styles.section}`}
      aria-labelledby="home-reviews-title"
    >
      <Reveal className="sf-container sf-container--wide">
        <SectionHeading id="home-reviews-title" eyebrow={copy.eyebrow} title={copy.title} />
        <ReviewCarousel
          reviews={reviews || []}
          loading={reviews === null}
          label={copy.carouselLabel}
        />
      </Reveal>
    </section>
  );
};

// ── Our promise ──────────────────────────────────────────────────────────────
// Three steps from PROMISE_STEPS. Each body quotes only live data (the
// shipping methods, the store settings, the returns policy) through
// resolvePromiseBody; `data` is null until those reads settle, and meanwhile
// skeleton lines over an invisible layout copy hold each body's place.

const stepNumber = (index) => String(index + 1).padStart(2, "0");

const PromiseSteps = ({ data, sectionRef }) => {
  const steps = PROMISE_STEPS.filter(Boolean);
  if (steps.length === 0) return null;
  const copy = HOME_SECTIONS.promise;
  const loading = data === null;

  return (
    <section
      ref={sectionRef}
      className={`sf-section ${styles.section}`}
      aria-labelledby="home-promise-title"
    >
      <div className="sf-container sf-container--wide">
        <SectionHeading id="home-promise-title" eyebrow={copy.eyebrow} title={copy.title} />
        <ol className={styles.steps} aria-busy={loading || undefined}>
          {steps.map((step, index) => {
            const body = loading ? "" : resolvePromiseBody(step, data);
            return (
              <Reveal
                as="li"
                key={step.dataKey || index}
                className={styles.step}
                delay={staggerDelay(index)}
              >
                {step.image?.src && (
                  <div className={styles.stepMedia}>
                    <img
                      className={styles.stepImage}
                      src={step.image.src}
                      alt={step.image.alt || ""}
                      width={step.image.width}
                      height={step.image.height}
                      loading="lazy"
                      decoding="async"
                      onError={onImageError}
                    />
                  </div>
                )}
                <p className={styles.stepMeta}>
                  {/* The list already numbers the steps for screen readers. */}
                  <span className={styles.stepNumber} aria-hidden="true">
                    {stepNumber(index)}
                  </span>
                  {step.eyebrow && <span className="sf-eyebrow">{step.eyebrow}</span>}
                </p>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                {loading ? (
                  // The body laid out invisibly (with fillers for the live
                  // values) holds the step's height under the skeleton lines.
                  <p className={`${styles.stepBody} ${styles.stepBodyPending}`} aria-hidden="true">
                    <span className={styles.stepBodyLayout}>{promiseBodyLayout(step)}</span>
                    <span className={styles.stepSkeleton}>
                      <span className="sf-skeleton sf-skeleton--text" />
                      <span className="sf-skeleton sf-skeleton--text" />
                    </span>
                  </p>
                ) : (
                  body && <p className={styles.stepBody}>{body}</p>
                )}
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ══════════════════════════════════════════════════════════════════════════════

const Home = () => {
  const { addToCart, setIsCartOpen } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [curation, setCuration] = useState(null);
  const [loading, setLoading] = useState(true);
  // Read before the first paint, so the rail never appears after the page.
  const [recentlyViewed] = useState(getRecentlyViewed);
  const addingAllRef = useRef(false);

  // The closing half: null until read, each read starting once its section
  // comes within a screen of the viewport.
  const [brands, setBrands] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [promiseData, setPromiseData] = useState(null);
  const [brandsRef, brandsNear] = useNearViewport();
  const [reviewsRef, reviewsNear] = useNearViewport();
  const [promiseRef, promiseNear] = useNearViewport();

  // ── Data fetching ────────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const [cats, featured, trending] = await Promise.all([
          apiService.categories.getAll().catch(() => []),
          apiService.products.getFeatured(8).catch(() => []),
          apiService.products.getTrending(8).catch(() => []),
        ]);
        if (!active) return;

        const featuredList = Array.isArray(featured) ? featured.slice(0, 8) : [];
        setCategories(Array.isArray(cats) ? cats : []);
        setFeaturedProducts(featuredList);
        setTrendingProducts(Array.isArray(trending) ? trending.slice(0, 8) : []);
        setLoading(false);

        const result = await loadCompleteTheSpace(featuredList);
        if (active) setCuration(result);
      } catch (err) {
        console.error("Error fetching home data:", err);
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  // Brands we carry: one catalogue read, its distinct brand names.
  useEffect(() => {
    if (!brandsNear) return undefined;
    let active = true;
    apiService.products
      .getAll()
      .catch(() => [])
      .then((products) => {
        if (active) setBrands(collectBrands(products));
      });
    return () => {
      active = false;
    };
  }, [brandsNear]);

  // From our customers: the featured products' approved reviews, once the
  // featured list is known.
  useEffect(() => {
    if (!reviewsNear || loading) return undefined;
    let active = true;
    loadFeaturedReviews(featuredProducts)
      .catch(() => [])
      .then((list) => {
        if (active) setReviews(list);
      });
    return () => {
      active = false;
    };
  }, [reviewsNear, loading, featuredProducts]);

  // Our promise: the store settings and shipping methods its copy quotes.
  useEffect(() => {
    if (!promiseNear) return undefined;
    let active = true;
    loadPromiseData().then((data) => {
      if (active) setPromiseData(data);
    });
    return () => {
      active = false;
    };
  }, [promiseNear]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  // ProductCard hands over buildCartItem(product): the variant-aware line whose
  // id and price match the product page, so quick-adds merge with PDP adds.
  const handleAddToCart = useCallback((cartItem) => addToCart(cartItem, 1), [addToCart]);

  // Wishlist works for guests (persisted to localStorage), matching the
  // product detail page — no auth gate / dead-end redirect.
  const handleToggleWishlist = useCallback(
    (product) => {
      toggleWishlist(product);
    },
    [toggleWishlist]
  );

  // "Add all to cart": each piece in turn, without opening the drawer, then
  // the drawer once at the end.
  const handleAddAll = useCallback(
    async (pieces) => {
      if (addingAllRef.current || pieces.length === 0) return;
      addingAllRef.current = true;
      try {
        for (const product of pieces) {
          await addToCart(buildCartItem(product), 1, { openDrawer: false });
        }
        setIsCartOpen(true);
      } finally {
        addingAllRef.current = false;
      }
    },
    [addToCart, setIsCartOpen]
  );

  const cardHandlers = {
    onAddToCart: handleAddToCart,
    onToggleWishlist: handleToggleWishlist,
    isInWishlist,
  };
  const { featured: featuredCopy, trending: trendingCopy, recentlyViewed: recentCopy } =
    HOME_SECTIONS;
  const hasRecentlyViewed = Array.isArray(recentlyViewed) && recentlyViewed.length > 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Hero and assurance strip (Prompt 10) */}
      <HeroSection />
      <AssuranceStrip />

      {/* 1. Shop by space */}
      <ShopBySpace categories={categories} loading={loading} />

      {/* 2. Story block 1: image left */}
      <StoryBlock story={STORY[0]} number={1} />

      {/* 3. Featured Collections */}
      <FeaturedProducts
        className={styles.section}
        headingId="home-featured-title"
        products={featuredProducts}
        loading={loading}
        eyebrow={featuredCopy.eyebrow}
        title={featuredCopy.title}
        viewAllLink={featuredCopy.viewAll.to}
        viewAllLabel={featuredCopy.viewAll.label}
        railLabel={featuredCopy.railLabel}
        {...cardHandlers}
      />

      {/* 4. Complete the space: the page's one sand band */}
      <CompleteTheSpace
        curation={curation}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        isInWishlist={isInWishlist}
        onAddAll={handleAddAll}
      />

      {/* 5. Story block 2: mirrored */}
      <StoryBlock story={STORY[1]} number={2} mirrored />

      {/* 6. Trending (the admin's trending flag) */}
      {(loading || trendingProducts.length > 0) && (
        <section className={`sf-section ${styles.section}`} aria-labelledby="home-trending-title">
          <Reveal className="sf-container sf-container--wide">
            <SectionHeading
              id="home-trending-title"
              eyebrow={trendingCopy.eyebrow}
              title={trendingCopy.title}
              action={trendingCopy.viewAll}
            />
            <ProductRail
              products={trendingProducts}
              loading={loading}
              label={trendingCopy.railLabel}
              {...cardHandlers}
            />
          </Reveal>
        </section>
      )}

      {/* 7. Recently viewed (written by ProductDetails.js) */}
      {hasRecentlyViewed && (
        <section
          className={`sf-section sf-section--tight ${styles.section}`}
          aria-labelledby="home-recent-title"
        >
          <Reveal className="sf-container sf-container--wide">
            <h2 id="home-recent-title" className={`sf-eyebrow ${styles.recentTitle}`}>
              {recentCopy.eyebrow}
            </h2>
            <ProductRail
              compact
              products={recentlyViewed}
              label={recentCopy.railLabel}
              {...cardHandlers}
            />
          </Reveal>
        </section>
      )}

      {/* 8. Brands we carry: the catalogue's own brand names, as text */}
      <BrandStrip
        ref={brandsRef}
        brands={brands || []}
        loading={brands === null}
        label={HOME_SECTIONS.brands.eyebrow}
        headingId="home-brands-title"
      />

      {/* 9. As featured in: there is no data source for press or client names
          yet (prompts/00_INDEX.md, "Open questions and deviations", item 7)
          and the db.json schema must not be extended, so the slot is handed
          an empty list and renders nothing. Pass real items from the API once
          one exists; never hardcode names here. */}
      <PressStrip items={[]} label={HOME_SECTIONS.press.eyebrow} headingId="home-press-title" />

      {/* 10. From our customers (hidden when there are no approved reviews) */}
      <CustomerReviews reviews={reviews} sectionRef={reviewsRef} />

      {/* 11. Our promise */}
      <PromiseSteps data={promiseData} sectionRef={promiseRef} />

      {/* 12. A slow ribbon of brand phrases (decorative) */}
      <Marquee items={MARQUEE_PHRASES} />

      {/* 13. The closing CTA, directly above the footer's newsletter band */}
      <CTASection
        tone="navy"
        eyebrow={CLOSING_CTA.eyebrow}
        title={CLOSING_CTA.title}
        line={CLOSING_CTA.line}
        primary={CLOSING_CTA.primary}
        secondary={CLOSING_CTA.secondary}
        headingId="home-closing-title"
        className={styles.closing}
      />
    </div>
  );
};

export default Home;
