import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../context/WishlistContext";
import apiService from "../../services/api";
import { categoryParam } from "../../utils/categories";
import HeroSection from "../../components/HeroSection/HeroSection";
import AssuranceStrip from "../../components/storefront/AssuranceStrip";
import FeaturedProducts from "../../components/FeaturedProducts/FeaturedProducts";
import { PriceBlock, ProductCard, ProductRail } from "../../components/storefront";
import { Reveal, SectionHeading, renderAccent, staggerDelay } from "../../components/ui";
import {
  COMPLETE_THE_SPACE,
  HOME_SECTIONS,
  SPACES,
  STORY,
} from "../../content/homeContent";
import { APP_NAME, WHY_CHOOSE_US } from "../../utils/constants";
import {
  buildCartItem,
  formatCurrency,
  getProductMinPrice,
  onImageError,
  PLACEHOLDER_IMG,
  productPath,
} from "../../utils/helpers";
import styles from "./Home.module.css";

// =============================================================================
// Home page
// =============================================================================
// Hero and assurance strip (Prompt 10), then the discovery sections (Prompt
// 11), in this order:
//   Shop by space · story block 1 · Featured Collections · Complete the space
//   (the one sand band) · story block 2 · Trending · Recently viewed
// then the sections Prompt 12 owns. Copy and media come from homeContent.js.
//
// Data: categories, featured and trending products in one Promise.all (each
// read falls back to [] on failure); once featured has resolved, the "Complete
// the space" anchor and its companions. Sections whose data is missing are
// hidden; nothing is invented to fill them.
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

// ── Interim: "Why choose us" ─────────────────────────────────────────────────
// Kept as it was for Prompt 12, which replaces it with the "Our promise"
// explainer (its claims come from WHY_CHOOSE_US in constants.js); restyled
// here only so the page carries no colour literals.

const WhyChooseUs = () => (
  <section className={`sf-section ${styles.section}`} aria-labelledby="home-why-title">
    <div className="sf-container sf-container--wide">
      <SectionHeading
        id="home-why-title"
        title={`Why Choose ${APP_NAME}`}
        intro="We put our customers first"
      />
      <ul className={styles.whyGrid}>
        {WHY_CHOOSE_US.map((item, index) => (
          <Reveal as="li" key={item.id || index} className={styles.whyItem} delay={staggerDelay(index)}>
            <Icon icon={item.icon} className={styles.whyIcon} aria-hidden="true" />
            <h3 className={styles.whyTitle}>{item.title}</h3>
            <p className={styles.whyText}>{item.description}</p>
          </Reveal>
        ))}
      </ul>
    </div>
  </section>
);

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

      {/* Prompt 12 */}
      <WhyChooseUs />
    </div>
  );
};

export default Home;
