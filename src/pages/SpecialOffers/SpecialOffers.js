import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../context/WishlistContext";
import { useDealsConfig } from "../../context/DealsConfigContext";
import apiService from "../../services/api";
import { ProductCard, ProductCardSkeleton } from "../../components/storefront";
import { Reveal, SectionHeading, staggerDelay } from "../../components/ui";
import { TOKENS } from "../../theme/tokens";
import {
  formatCurrency,
  getProductMinPrice,
  getProductMaxDiscount,
  copyToClipboard,
} from "../../utils/helpers";
import {
  rupees,
  formatExpiry,
  couponHeadline,
  isCouponValid,
  pickByIds,
  pad,
  useDealsCountdown,
  timeLeftLabel,
  chipContexts,
} from "./offersData";
import styles from "./SpecialOffers.module.css";

// =============================================================================
// Special Offers — /special-offers (Prompt 19)
// =============================================================================
// Admin-managed from top to bottom: the dealsConfig record (DealsConfigContext)
// switches the page on or off, writes the hero's copy, sets the countdown and
// picks the coupons, the deal of the day and the grid (each in the admin's
// order, or automatic when the list is empty; rules in offersData.js and the
// memos below, unchanged from the boilerplate).
//
// Paper and hairlines, no gradient and no urgency of our own:
//   • the hero: the admin's tag (eyebrow), title (serif h1) and subtitle, then
//     the countdown as one hairline row, only when the config runs a timer, or
//     the "ended" note when a fixed end has passed with onExpiry "hide";
//   • "Codes to use at checkout": the coupons as hairline tickets (value stub,
//     a notched hairline, the terms, the code and a "Copy code" button);
//   • "Deal of the day": three storefront cards with "You save ₹X" under each;
//   • "All offers": the category chips (one row that scrolls sideways) over a
//     grid of storefront cards that re-flows with AnimatePresence popLayout.
// States: the config loading (the hero and four tickets in sand), the page
// switched off, the data loading (skeletons in the final layout), a failed
// read (a sand panel with "Try again") and nothing on offer.
//
// Accessibility: the countdown is role="timer", named by a summary that
// changes at most once a minute ("Offers end in 5 hours and 12 minutes"); its
// ticking figures are hidden from assistive technology. "Hide seconds" takes
// the ticking figure away, so the clock changes once a minute (WCAG 2.2.2,
// Prompt 31); "Show seconds" brings it back. The chips are
// aria-pressed toggles; a status line says what the grid shows. Each copy
// button is named "Copy coupon code X", and a status line says whether the
// code was copied.
// =============================================================================

// How long a copy button reads "Copied" (or "Couldn't copy").
const COPY_FEEDBACK_MS = 2000;
// Skeleton counts while the data loads: the admin's selection when there is
// one (capped), else a typical automatic set.
const skeletonCount = (ids, fallback, cap) => Math.min(ids?.length || fallback, cap);

const { duration, easeOut, easeInOut, riseDistance, staggerFast } = TOKENS.motion;
// Grid cards entering after a chip press: --sf-stagger-fast (40ms) apart for
// the first eight, rising --sf-rise-distance (8px).
const ENTER_STAGGER = staggerFast;

const CheckGlyph = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
    <path
      d="M5 12.5l4.5 4.5L19 7.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Chevron = ({ back }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path
      d={back ? "M14.5 5.5 8 12l6.5 6.5" : "M9.5 5.5 16 12l-6.5 6.5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Countdown ────────────────────────────────────────────────────────────────
// The admin's countdown, the "ended" note, or nothing; the rules are
// useDealsCountdown's, and showCountdown / timerEnded are computed as before.
// In its own component so the once-a-second tick re-renders this row only.
const OfferCountdown = ({ timer }) => {
  const countdown = useDealsCountdown(timer);
  const [showSeconds, setShowSeconds] = useState(true);
  const showCountdown = timer?.enabled !== false && countdown.show;
  const timerEnded = timer?.enabled !== false && countdown.ended;

  if (showCountdown) {
    const { hours, minutes, seconds } = countdown.parts;
    return (
      <div className={styles.countdown}>
        {/* The figures tick every second; what assistive technology reads is
            the summary in aria-label, which changes at most once a minute. */}
        <div className={styles.timer} role="timer" aria-label={timeLeftLabel(countdown.parts)}>
          <span className={styles.timerLabel} aria-hidden="true">
            Offers end in
          </span>
          <span className={styles.clock} aria-hidden="true">
            <span className={styles.unit}>
              <span className={styles.figure}>{pad(hours)}</span>
              <span className={`sf-eyebrow ${styles.unitLabel}`}>Hours</span>
            </span>
            <span className={styles.separator}>:</span>
            <span className={styles.unit}>
              <span className={styles.figure}>{pad(minutes)}</span>
              <span className={`sf-eyebrow ${styles.unitLabel}`}>Minutes</span>
            </span>
            {showSeconds && (
              <>
                <span className={styles.separator}>:</span>
                <span className={styles.unit}>
                  <span className={styles.figure}>{pad(seconds)}</span>
                  <span className={`sf-eyebrow ${styles.unitLabel}`}>Seconds</span>
                </span>
              </>
            )}
          </span>
        </div>
        {/* Its name follows its text, so no aria-pressed (as the password
            fields' Show / Hide). */}
        <button
          type="button"
          className={`sf-btn sf-btn--link ${styles.secondsToggle}`}
          onClick={() => setShowSeconds((shown) => !shown)}
        >
          {showSeconds ? "Hide seconds" : "Show seconds"}
        </button>
      </div>
    );
  }

  if (timerEnded) {
    return (
      <div className={styles.countdown}>
        <p className={styles.ended}>This round of offers has ended. Prices shown are current.</p>
      </div>
    );
  }

  return null;
};

// ── Skeletons ────────────────────────────────────────────────────────────────
// Sand blocks in the boxes the content will take; hidden from assistive
// technology (the loading region is aria-busy).

// A SectionHeading's eyebrow and title.
const HeadingSkeleton = () => (
  <div className={styles.headingSkeleton} aria-hidden="true">
    <span className={`sf-skeleton ${styles.skeletonEyebrow}`} />
    <span className={styles.skeletonHeadingLine}>
      <span className="sf-skeleton" />
    </span>
  </div>
);

const TicketSkeleton = () => (
  <div className={`${styles.ticket} ${styles.ticketSkeleton}`} aria-hidden="true">
    <span className={styles.stub}>
      <span className={`sf-skeleton ${styles.skeletonValue}`} />
      <span className={`sf-skeleton ${styles.skeletonOff}`} />
    </span>
    <span className={styles.details}>
      <span className={styles.skeletonDescription}>
        <span className="sf-skeleton" />
        <span className="sf-skeleton" />
      </span>
      <span className={styles.skeletonTerms}>
        <span className="sf-skeleton" />
      </span>
      <span className={styles.skeletonTerms}>
        <span className="sf-skeleton" />
      </span>
      <span className={styles.codeRow}>
        <span className={`sf-skeleton ${styles.skeletonCode}`} />
        <span className={`sf-skeleton ${styles.skeletonCopy}`} />
      </span>
    </span>
  </div>
);

const TicketSkeletons = ({ count }) => (
  <ul className={styles.tickets} aria-hidden="true">
    {Array.from({ length: count }, (_, i) => (
      <li key={i} className={styles.ticketItem}>
        <TicketSkeleton />
      </li>
    ))}
  </ul>
);

// While the config loads: the hero (eyebrow, the title's and the subtitle's
// lines, the countdown row) and the coupons section with four tickets.
const PageSkeleton = () => (
  <div className={styles.page} aria-busy="true">
    <p className="sf-visually-hidden">Loading offers</p>
    <div className={styles.hero} aria-hidden="true">
      <div className="sf-container sf-container--wide">
        <span className={`sf-skeleton ${styles.skeletonTag}`} />
        <span className={styles.skeletonTitle}>
          <span className="sf-skeleton" />
          <span className="sf-skeleton" />
          <span className="sf-skeleton" />
        </span>
        <span className={styles.skeletonSubtitle}>
          <span className="sf-skeleton" />
          <span className="sf-skeleton" />
          <span className="sf-skeleton" />
        </span>
        <div className={styles.countdown}>
          <span className={styles.skeletonClock}>
            <span className="sf-skeleton" />
          </span>
        </div>
      </div>
    </div>
    <div className={styles.section} aria-hidden="true">
      <div className="sf-container sf-container--wide">
        <HeadingSkeleton />
        <TicketSkeletons count={4} />
      </div>
    </div>
  </div>
);

// ── Coupon ticket ────────────────────────────────────────────────────────────
// A hairline ticket: the value on the stub, a hairline with a notch at either
// end, then the terms, the code (selectable, so it can be copied by hand) and
// the copy button. "Copied" in the success tone for two seconds; the section's
// status line says it for assistive technology.
const CouponTicket = ({ coupon, feedback, onCopy }) => {
  const codeRef = useRef(null);
  const copied = feedback === "copied";
  const failed = feedback === "failed";

  return (
    <div className={styles.ticket}>
      <p className={styles.stub}>
        <span className={styles.value}>{couponHeadline(coupon)}</span>{" "}
        <span className={`sf-eyebrow ${styles.off}`}>off</span>
      </p>
      <div className={styles.details}>
        <p className={styles.description}>{coupon.description || `${couponHeadline(coupon)} off`}</p>
        <p className={styles.terms}>
          {coupon.minOrderAmount > 0 ? `Minimum order ${rupees(coupon.minOrderAmount)}` : "No minimum order"}
          {coupon.type === "percentage" && coupon.maxDiscount ? (
            <>
              <span aria-hidden="true"> · </span>
              <span className="sf-visually-hidden">, </span>
              {`Up to ${rupees(coupon.maxDiscount)} off`}
            </>
          ) : null}
        </p>
        <p className={styles.terms}>
          {coupon.expiresAt ? (
            <>
              Expires <time dateTime={coupon.expiresAt}>{formatExpiry(coupon.expiresAt)}</time>
            </>
          ) : (
            "No expiry"
          )}
        </p>
        <div className={styles.codeRow}>
          <code ref={codeRef} className={`sf-chip sf-chip--selected ${styles.code}`}>
            {coupon.code}
          </code>
          <button
            type="button"
            className={`sf-btn sf-btn--ghost ${styles.copy} ${copied ? styles.copied : ""}`}
            onClick={() => onCopy(coupon.code, codeRef.current)}
            aria-label={`Copy code ${coupon.code}`}
          >
            {copied ? (
              <>
                <span className="sf-btn__icon sf-fade-in">
                  <CheckGlyph />
                </span>
                <span className="sf-fade-in">Copied</span>
              </>
            ) : failed ? (
              "Couldn’t copy"
            ) : (
              "Copy code"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Category chips ───────────────────────────────────────────────────────────
// One row of .sf-chip toggles (aria-pressed) that scrolls sideways: swipe,
// trackpad, or Tab (each chip scrolls into view as it takes focus). A pressed
// chip is brought into view with scrollIntoView. On pointer screens from
// 768px, while the row overflows, two hairline buttons page it left and right
// (the product rail's buttons). No edge fades.
const CategoryChips = ({ categories, contexts, activeTab, onSelect }) => {
  const scrollerId = `${useId()}chips`;
  const scrollerRef = useRef(null);
  const listRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [edges, setEdges] = useState({ overflows: false, atStart: true, atEnd: true });

  // Measure the overflow and the scroll position on scroll (once a frame) and
  // whenever the row or its chips change size.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const { scrollLeft, scrollWidth, clientWidth } = scroller;
      const next = {
        overflows: scrollWidth > clientWidth + 1,
        atStart: scrollLeft <= 1,
        atEnd: scrollLeft + clientWidth >= scrollWidth - 1,
      };
      setEdges((prev) =>
        prev.overflows === next.overflows && prev.atStart === next.atStart && prev.atEnd === next.atEnd
          ? prev
          : next
      );
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    scroller.addEventListener("scroll", schedule, { passive: true });
    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);
      observer.observe(scroller);
      if (listRef.current) observer.observe(listRef.current);
    } else {
      window.addEventListener("resize", schedule);
    }
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", schedule);
      if (observer) observer.disconnect();
      else window.removeEventListener("resize", schedule);
    };
  }, [categories.length]);

  // "instant" under reduced motion: "auto" would follow the page's smooth
  // scroll-behavior.
  const behavior = reduceMotion ? "instant" : "smooth";

  const press = (event, id) => {
    onSelect(id);
    event.currentTarget.scrollIntoView?.({ block: "nearest", inline: "center", behavior });
  };

  const scrollPage = (direction) => {
    const scroller = scrollerRef.current;
    scroller?.scrollBy?.({ left: direction * Math.max(180, scroller.clientWidth * 0.6), behavior });
  };

  const chip = (id, label, context) => (
    <li key={id}>
      <button
        type="button"
        className={`sf-chip ${styles.chip}`}
        aria-pressed={activeTab === id}
        onClick={(event) => press(event, id)}
      >
        {label}
        {context && (
          <>
            <span className={styles.chipDot} aria-hidden="true">
              ·
            </span>
            <span className="sf-visually-hidden">, </span>
            {context}
          </>
        )}
      </button>
    </li>
  );

  return (
    <div className={styles.chipBar} role="group" aria-label="Filter offers by category">
      <div id={scrollerId} ref={scrollerRef} className={styles.chipScroller}>
        <ul ref={listRef} className={styles.chipList}>
          {chip("all", "All")}
          {categories.map((cat) => chip(cat.id, cat.name, contexts.get(cat.id)))}
        </ul>
      </div>
      {edges.overflows && (
        <div className={styles.chipNav}>
          <button
            type="button"
            className={`sf-btn sf-btn--icon ${styles.chipNavButton}`}
            aria-label="Previous categories"
            aria-controls={scrollerId}
            aria-disabled={edges.atStart || undefined}
            onClick={() => !edges.atStart && scrollPage(-1)}
          >
            <Chevron back />
          </button>
          <button
            type="button"
            className={`sf-btn sf-btn--icon ${styles.chipNavButton}`}
            aria-label="Next categories"
            aria-controls={scrollerId}
            aria-disabled={edges.atEnd || undefined}
            onClick={() => !edges.atEnd && scrollPage(1)}
          >
            <Chevron />
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

const SpecialOffers = () => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  // The whole page is admin-managed via this config (master toggle, hero,
  // timer, featured coupon/product selections).
  const { config, loading: configLoading } = useDealsConfig();
  const enabled = config.enabled !== false;
  const reduceMotion = useReducedMotion();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  // A failed read shows the "Try again" panel; `attempt` re-runs the read.
  const [fetchError, setFetchError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  // { code, ok } for COPY_FEEDBACK_MS after a copy button is pressed.
  const [copyResult, setCopyResult] = useState(null);
  const copyTimer = useRef(0);
  // After "Try again", focus goes to the codes section (or back to the
  // button when the read fails again), so it is not lost with the panel.
  const focusAfterRetry = useRef(false);
  const codesRef = useRef(null);
  const retryRef = useRef(null);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  // Fetch products (for deals), categories (for accurate tabs) and the real
  // coupons (so advertised codes match what checkout accepts) in one pass. Only
  // when the page is actually enabled — no point fetching for a hidden page.
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setFetchError(false);
        const [productsData, categoriesData, couponsData] = await Promise.all([
          apiService.products.getAll(),
          apiService.categories.getAll(),
          apiService.coupons.getActive(),
        ]);
        if (cancelled) return;
        setProducts(Array.isArray(productsData) ? productsData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setCoupons(Array.isArray(couponsData) ? couponsData : []);
      } catch (error) {
        console.error("Error fetching offers data:", error);
        if (cancelled) return;
        setProducts([]);
        setCategories([]);
        setCoupons([]);
        setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  useEffect(() => {
    if (loading || !focusAfterRetry.current) return;
    focusAfterRetry.current = false;
    (fetchError ? retryRef.current : codesRef.current)?.focus();
  }, [loading, fetchError]);

  // Coupons to advertise: the admin's ordered selection (kept to valid ones), or
  // — when nothing is selected — every valid active coupon (automatic).
  const featuredCoupons = useMemo(() => {
    const valid = coupons.filter((c) => isCouponValid(c));
    if (config.featuredCouponIds?.length) {
      return pickByIds(valid, config.featuredCouponIds);
    }
    return valid;
  }, [coupons, config.featuredCouponIds]);

  // Discounted products, highest discount first — the automatic deal pool.
  const discountedProducts = useMemo(() => {
    return products
      .filter((p) => getProductMaxDiscount(p) > 0)
      .sort((a, b) => getProductMaxDiscount(b) - getProductMaxDiscount(a));
  }, [products]);

  // Deal of the Day: the admin's ordered picks, else the top 3 by discount.
  const dealOfTheDay = useMemo(() => {
    if (config.dealOfTheDayIds?.length) return pickByIds(products, config.dealOfTheDayIds);
    return discountedProducts.slice(0, 3);
  }, [products, discountedProducts, config.dealOfTheDayIds]);

  // Deals grid: the admin's ordered picks, else every discounted product.
  const gridProducts = useMemo(() => {
    if (config.featuredProductIds?.length) return pickByIds(products, config.featuredProductIds);
    return discountedProducts;
  }, [products, discountedProducts, config.featuredProductIds]);

  // Category tabs = real categories represented in the grid, in catalogue order.
  const dealCategories = useMemo(() => {
    const ids = new Set(gridProducts.map((p) => p.categoryId).filter((id) => id != null));
    return categories.filter((c) => ids.has(c.id));
  }, [gridProducts, categories]);

  // Filtered by active tab (tab value is a categoryId, or "all").
  const filteredProducts = useMemo(() => {
    if (activeTab === "all") return gridProducts;
    return gridProducts.filter((p) => p.categoryId === activeTab);
  }, [gridProducts, activeTab]);

  // If the active tab's category drops out of the deal set, fall back to "all".
  useEffect(() => {
    if (activeTab !== "all" && !dealCategories.some((c) => c.id === activeTab)) {
      setActiveTab("all");
    }
  }, [dealCategories, activeTab]);

  // A repeated chip name also shows its parent ("High-Back Chairs · Premium").
  const chipContextById = useMemo(
    () => chipContexts(dealCategories, categories),
    [dealCategories, categories]
  );

  // Handlers
  const handleCopyCode = useCallback(async (code, codeElement) => {
    const ok = await copyToClipboard(code);
    // When the clipboard is unavailable (an insecure page, a denied
    // permission), leave the code selected so it can be copied by hand.
    if (!ok && codeElement) window.getSelection?.()?.selectAllChildren(codeElement);
    setCopyResult({ code, ok });
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyResult(null), COPY_FEEDBACK_MS);
  }, []);

  const handleAddToCart = useCallback(
    // The card hands over buildCartItem(product): the same id scheme (and
    // default variant/price) the product page uses, so offer adds merge with
    // PDP adds instead of duplicating. The call is still
    // addToCart(buildCartItem(product), 1).
    (cartItem) => addToCart(cartItem, 1),
    [addToCart]
  );

  const handleToggleWishlist = useCallback(
    (product) => {
      toggleWishlist(product);
    },
    [toggleWishlist]
  );

  const handleRetry = () => {
    focusAfterRetry.current = true;
    setAttempt((n) => n + 1);
  };

  // ── Master toggle: page hidden ───────────────────────────────────────────────
  // While the config is still loading we show the page's skeleton, so a
  // disabled page never flashes its content first.
  if (configLoading) return <PageSkeleton />;

  if (!enabled) {
    return (
      <div className={`sf-container sf-container--wide ${styles.unavailable}`}>
        <p className="sf-eyebrow">Offers</p>
        <h1 className={`sf-display-md ${styles.unavailableTitle}`}>No offers at the moment.</h1>
        <p className={styles.unavailableText}>The full collection is open as usual.</p>
        <Link to="/products" className="sf-btn sf-btn--primary sf-btn--lg">
          Browse furniture
        </Link>
      </div>
    );
  }

  const hero = config.hero || {};
  const isEmpty = !loading && gridProducts.length === 0 && dealOfTheDay.length === 0;
  const pieces = (n) => `${n} ${n === 1 ? "piece" : "pieces"}`;
  const activeCategory = dealCategories.find((c) => c.id === activeTab);
  const activeLabel = activeCategory
    ? [activeCategory.name, chipContextById.get(activeCategory.id)].filter(Boolean).join(", ")
    : "";
  const copyStatus = copyResult
    ? copyResult.ok
      ? `Code ${copyResult.code} copied.`
      : `Couldn’t copy. The code is ${copyResult.code}.`
    : "";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* ── Hero: the admin's copy, then the countdown row ─────────────── */}
      <header className={styles.hero}>
        <div className="sf-container sf-container--wide">
          {hero.tag && <p className={`sf-eyebrow sf-eyebrow--rule ${styles.heroTag}`}>{hero.tag}</p>}
          <h1 className={`sf-display-xl ${styles.heroTitle}`}>
            {hero.title || "Special offers"}
          </h1>
          {hero.subtitle && <p className={styles.heroSubtitle}>{hero.subtitle}</p>}
          <OfferCountdown timer={config.timer} />
        </div>
      </header>

      {fetchError ? (
        <div className={styles.content}>
          <section className={styles.section} aria-labelledby="offers-error-title">
            <div className="sf-container sf-container--wide">
              <div className={`sf-panel ${styles.state} ${styles.statePanel}`}>
                <h2 id="offers-error-title" className={styles.stateTitle}>
                  We couldn’t load the offers.
                </h2>
                <p className={styles.stateText}>Check your connection and try again.</p>
                <button
                  ref={retryRef}
                  type="button"
                  className="sf-btn sf-btn--primary"
                  onClick={handleRetry}
                >
                  Try again
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className={styles.content} aria-busy={loading || undefined}>
          {loading && <p className="sf-visually-hidden">Loading offers</p>}

          {/* ── Codes ──────────────────────────────────────────────────── */}
          <section
            ref={codesRef}
            tabIndex={-1}
            className={`${styles.section} ${styles.focusTarget}`}
            aria-labelledby="offers-codes-title"
          >
            <div className="sf-container sf-container--wide">
              <SectionHeading
                id="offers-codes-title"
                eyebrow="Coupons"
                title="Codes to use at *checkout*."
                intro="Copy a code here, then enter it at checkout."
              />
              {loading ? (
                <TicketSkeletons count={skeletonCount(config.featuredCouponIds, 4, 6)} />
              ) : featuredCoupons.length > 0 ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops a list-style: none list's semantics without it (Prompt 31) */}
                  <ul role="list" className={styles.tickets}>
                    {featuredCoupons.map((coupon, index) => (
                      <Reveal
                        as="li"
                        key={coupon.id ?? coupon.code}
                        className={styles.ticketItem}
                        delay={staggerDelay(index)}
                      >
                        <CouponTicket
                          coupon={coupon}
                          feedback={
                            copyResult?.code === coupon.code ? (copyResult.ok ? "copied" : "failed") : null
                          }
                          onCopy={handleCopyCode}
                        />
                      </Reveal>
                    ))}
                  </ul>
                  <p className="sf-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
                    {copyStatus}
                  </p>
                </>
              ) : (
                <p className={styles.couponEmpty}>No codes right now.</p>
              )}
            </div>
          </section>

          {/* ── Deal of the day ────────────────────────────────────────── */}
          {loading ? (
            <div className={styles.section} aria-hidden="true">
              <div className="sf-container sf-container--wide">
                <HeadingSkeleton />
                <ul className={styles.deals}>
                  {Array.from({ length: skeletonCount(config.dealOfTheDayIds, 3, 6) }, (_, i) => (
                    <li key={i} className={styles.deal}>
                      <ProductCardSkeleton />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            dealOfTheDay.length > 0 && (
              <section className={styles.section} aria-labelledby="offers-today-title">
                <div className="sf-container sf-container--wide">
                  <SectionHeading id="offers-today-title" eyebrow="Today" title="Deal of the *day*." />
                  {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops a list-style: none list's semantics without it (Prompt 31) */}
                  <ul role="list" className={styles.deals}>
                    {dealOfTheDay.map((product, idx) => {
                      const minPrice = getProductMinPrice(product);
                      const saving = minPrice.originalPrice - minPrice.sellingPrice;
                      return (
                        <Reveal as="li" key={product.id} className={styles.deal} delay={staggerDelay(idx)}>
                          <ProductCard
                            product={product}
                            onAddToCart={handleAddToCart}
                            onToggleWishlist={handleToggleWishlist}
                            isWishlisted={isInWishlist(product.id)}
                          />
                          {saving > 0 && (
                            <p className={styles.saving}>
                              You save{" "}
                              <span className={styles.savingAmount}>
                                {formatCurrency(saving, minPrice.currency)}
                              </span>
                            </p>
                          )}
                        </Reveal>
                      );
                    })}
                  </ul>
                </div>
              </section>
            )
          )}

          {/* ── All offers ─────────────────────────────────────────────── */}
          {loading ? (
            <div className={styles.section} aria-hidden="true">
              <div className="sf-container sf-container--wide">
                <HeadingSkeleton />
                <div className={styles.chipSkeletons}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={`sf-skeleton ${styles.chipSkeleton}`} />
                  ))}
                </div>
                {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops a list-style: none list's semantics without it (Prompt 31) */}
                <ul role="list" className={styles.grid}>
                  {Array.from({ length: skeletonCount(config.featuredProductIds, 6, 9) }, (_, i) => (
                    <li key={i} className={styles.item}>
                      <ProductCardSkeleton />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            gridProducts.length > 0 && (
              <section className={styles.section} aria-labelledby="offers-all-title">
                <div className="sf-container sf-container--wide">
                  <SectionHeading
                    id="offers-all-title"
                    eyebrow="All offers"
                    title={`${pieces(gridProducts.length)} on *offer*.`}
                  />
                  {dealCategories.length > 0 && (
                    <CategoryChips
                      categories={dealCategories}
                      contexts={chipContextById}
                      activeTab={activeTab}
                      onSelect={setActiveTab}
                    />
                  )}
                  <p className="sf-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
                    {activeCategory
                      ? `Showing ${pieces(filteredProducts.length)} in ${activeLabel}.`
                      : `Showing all ${pieces(gridProducts.length)}.`}
                  </p>
                  <Reveal>
                    {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops a list-style: none list's semantics without it (Prompt 31) */}
                    <ul role="list" className={styles.grid}>
                      <AnimatePresence mode="popLayout" initial={false}>
                        {filteredProducts.map((product, index) => (
                          <motion.li
                            key={product.id}
                            className={styles.item}
                            // Position only: a card that changes rows (and so
                            // height) glides there without being stretched.
                            layout={reduceMotion ? false : "position"}
                            initial={{ opacity: 0, y: reduceMotion ? 0 : riseDistance }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              transition: {
                                duration: duration.base,
                                ease: easeOut,
                                delay: Math.min(index, 8) * ENTER_STAGGER,
                              },
                            }}
                            exit={{ opacity: 0, transition: { duration: duration.fast, ease: easeInOut } }}
                            transition={{ duration: duration.base, ease: easeOut }}
                          >
                            <ProductCard
                              product={product}
                              onAddToCart={handleAddToCart}
                              onToggleWishlist={handleToggleWishlist}
                              isWishlisted={isInWishlist(product.id)}
                            />
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </Reveal>
                </div>
              </section>
            )
          )}

          {/* ── Nothing on offer ───────────────────────────────────────── */}
          {isEmpty && (
            <section className={styles.section} aria-labelledby="offers-empty-title">
              <div className="sf-container sf-container--wide">
                <div className={styles.state}>
                  <h2 id="offers-empty-title" className={styles.stateTitle}>
                    Nothing on offer right now.
                  </h2>
                  <p className={styles.stateText}>
                    {featuredCoupons.length > 0
                      ? "No pieces are reduced just now, but the codes above still apply at checkout."
                      : "No pieces are reduced just now."}
                  </p>
                  <Link to="/products" className="sf-btn sf-btn--ghost">
                    Browse furniture
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default SpecialOffers;
