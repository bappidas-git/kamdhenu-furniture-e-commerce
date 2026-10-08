import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { CloseOutlined } from "@mui/icons-material";
import { useCart } from "../../hooks/useCart";
import apiService from "../../services/api";
import { formatCurrency, productPath, PLACEHOLDER_IMG, onImageError } from "../../utils/helpers";
import { STOREFRONT_CONFIG, TOKENS, resolveTrustBadgeDetail } from "../../theme/tokens";
import useFocusTrap, { useBodyScrollLock } from "../ui/useFocusTrap";
import PriceBlock from "../storefront/PriceBlock";
import TRUST_ICONS from "../storefront/trustIcons";
import { activeMethods, deliveryEstimate } from "./cartDelivery";
import styles from "./CartDrawer.module.css";

// =============================================================================
// CartDrawer — the cart (there is no cart page; checkout step 0 is the review)
// =============================================================================
//
// A side panel on the right, opened by the header's cart button and by
// CartContext.addToCart. From the top:
//   • "Your cart" and the number of pieces, with a close button;
//   • the free-delivery line and its progress hairline, from the live shipping
//     methods (cartDelivery.js): "Add ₹X more for free delivery", or "Free
//     delivery unlocked". Nothing is drawn until the methods have been read,
//     and nothing at all when no method has a free-delivery threshold;
//   • the lines: thumbnail, name, option, unit price, a quantity stepper, the
//     line total and "Remove";
//   • one quiet row of promises: Secure payment, Cash on Delivery (while
//     settings.payment.codEnabled), Easy returns · N days (while
//     STOREFRONT_CONFIG.returnsWindowDays > 0), by resolveTrustBadgeDetail's
//     rules, as in the footer and on the product page;
//   • a footer that stays at the bottom: the subtotal, what delivery costs,
//     "Taxes calculated at checkout", Checkout and "Continue shopping".
//
// Data. Every change goes through useCart (updateQuantity clamps to the stock
// the line knows of; removeFromCart; the toasts are the context's). The
// subtotal is getCartTotal() and the count getCartItemCount(). Shipping
// methods and store settings are read once, when the drawer first opens
// (a failed read is tried again on the next opening), for display only: the
// drawer never charges delivery, never computes taxes and never applies a
// coupon; checkout does all three.
//
// Dialog behaviour (DESIGN_SYSTEM §19.1): role="dialog" aria-modal, named by
// its title; focus starts on the close button, Tab stays inside, Escape and
// the backdrop close it, focus returns to whatever opened it (useFocusTrap
// keeps document.activeElement from the moment it opens), and the page behind
// does not scroll. A plain click on a link closes it as it navigates; any
// route change closes it too. Rendered in a portal on <body>.
//
// Motion: slides in over --sf-duration-slow with --sf-ease-out and leaves over
// --sf-duration with --sf-ease-in-out; a removed line folds its height to 0.
// Under reduced motion the panel and the lines only fade.
// =============================================================================

const { duration, easeOut, easeInOut } = TOKENS.motion;

// The free-delivery block: unfolds from no height; only fades under reduced
// motion (MotionConfig leaves height animations alone, so this is explicit).
const UNFOLD = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1, transition: { duration: duration.base, ease: easeOut } },
  exit: { height: 0, opacity: 0, transition: { duration: duration.base, ease: easeInOut } },
};
const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.base, ease: easeOut } },
  exit: { opacity: 0, transition: { duration: duration.base, ease: easeInOut } },
};

// A plain left click closes the drawer as the link navigates; a modified
// click (new tab or window) leaves it open.
const isPlainClick = (event) =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !event.metaKey &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.shiftKey;

const itemsLabel = (count) => `${count} ${count === 1 ? "item" : "items"}`;
const daysLabel = (days) => `${days} ${days === 1 ? "day" : "days"}`;
const lineLabel = (line) => (line.variantName ? `${line.name}, ${line.variantName}` : line.name);

// "+" is out of reach once a line holds all the stock it knows of.
const atStockLimit = (line) => typeof line.stock === "number" && line.quantity >= line.stock;

// A read that throws before it returns a promise still settles as a failure.
const settle = (read) => Promise.resolve().then(read);

// Shipping methods and store settings: read when the drawer first opens and
// kept for the session. A read that failed is tried again on the next
// opening. null until the first reads settle; then { methods, settings },
// where a failed read is null.
const useStoreData = (open) => {
  const [data, setData] = useState(null);
  const pending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const needsRead = data === null || data.methods === null || data.settings === null;

  useEffect(() => {
    if (!open || !needsRead || pending.current) return;
    pending.current = true;
    Promise.allSettled([
      settle(() => apiService.shipping.getMethods()),
      settle(() => apiService.settings.get()),
    ]).then(([shipping, settings]) => {
      pending.current = false;
      if (!mounted.current) return;
      setData((previous) => ({
        methods:
          (shipping.status === "fulfilled" && activeMethods(shipping.value)) ||
          (previous && previous.methods) ||
          null,
        settings:
          (settings.status === "fulfilled" && settings.value) ||
          (previous && previous.settings) ||
          null,
      }));
    });
  }, [open, needsRead]);

  return data;
};

// What the footer's "Delivery" row says. null while the methods are read.
const describeDelivery = (store, estimate, subtotal) => {
  if (!store) return null;
  if (!estimate) return { text: "Calculated at checkout" };
  const { threshold, rate } = estimate;
  if (rate === 0 || (threshold !== null && subtotal >= threshold)) {
    return { text: "Free", free: true };
  }
  if (rate === null) return { text: "Calculated at checkout" };
  if (threshold === null) return { text: formatCurrency(rate) };
  return { text: formatCurrency(rate), freeAbove: formatCurrency(threshold) };
};

const TrustIcon = ({ name }) => (
  <svg
    className={styles.trustIcon}
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {TRUST_ICONS[name]}
  </svg>
);

const StepIcon = ({ plus }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
  >
    {plus && <line x1="12" y1="5" x2="12" y2="19" />}
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CartLine = ({ line, reduceMotion, onNavigate, onDecrease, onIncrease, onRemove, registerRemove }) => {
  // While a removed line folds away it stays in the DOM: keep it out of the
  // tab order and the accessibility tree.
  const isPresent = useIsPresent();
  const href = productPath(line);
  const label = lineLabel(line);
  const currency = line.currency || "INR";
  const atMin = line.quantity <= 1;
  const atMax = atStockLimit(line);

  return (
    <motion.li
      layout="position"
      className={styles.line}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: duration.base, ease: easeOut }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: duration.base, ease: easeInOut } }
          : { opacity: 0, height: 0, transition: { duration: duration.base, ease: easeInOut } }
      }
    >
      {/* React 18 does not know `inert`; the empty string sets the attribute. */}
      <div className={styles.lineInner} inert={isPresent ? undefined : ""}>
        <Link to={href} className={styles.thumb} tabIndex={-1} aria-hidden="true" onClick={onNavigate}>
          <img
            src={line.image || PLACEHOLDER_IMG}
            alt=""
            width="72"
            height="90"
            loading="lazy"
            decoding="async"
            onError={onImageError}
          />
        </Link>

        <div className={styles.details}>
          <div className={styles.lineHead}>
            <Link to={href} className={styles.name} onClick={onNavigate}>
              {line.name}
            </Link>
            <button
              ref={(element) => registerRemove(line.id, element)}
              type="button"
              className={`sf-btn sf-btn--link ${styles.remove}`}
              onClick={() => onRemove(line.id)}
            >
              Remove<span className="sf-visually-hidden"> {label}</span>
            </button>
          </div>
          {line.variantName && <p className={styles.variant}>{line.variantName}</p>}
          <div className={styles.unitPrice}>
            <PriceBlock price={line.price} comparePrice={line.comparePrice} currency={currency} size="sm" />
          </div>

          <div className={styles.lineFoot}>
            <div className={styles.stepper} role="group" aria-label={`Quantity, ${label}`}>
              <button
                type="button"
                className={styles.step}
                aria-label="Decrease quantity"
                aria-disabled={atMin || undefined}
                onClick={() => onDecrease(line)}
              >
                <StepIcon />
              </button>
              <span className={styles.quantity} aria-live="polite" aria-atomic="true">
                {line.quantity}
              </span>
              <button
                type="button"
                className={styles.step}
                aria-label="Increase quantity"
                aria-disabled={atMax || undefined}
                title={atMax ? "No more stock available" : undefined}
                onClick={() => onIncrease(line)}
              >
                <StepIcon plus />
              </button>
            </div>
            <p className={styles.lineTotal}>
              <span className="sf-visually-hidden">Line total </span>
              {formatCurrency(line.price * line.quantity, currency)}
            </p>
          </div>
        </div>
      </div>
    </motion.li>
  );
};

const CartDrawer = ({ open, onClose }) => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, getCartItemCount } = useCart();

  const lines = cartItems || [];
  const isEmpty = lines.length === 0;
  const count = getCartItemCount ? getCartItemCount() : 0;
  const subtotal = getCartTotal ? getCartTotal() : 0;

  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const emptyRef = useRef(null);
  const removeButtons = useRef(new Map());
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const countId = useId();

  useFocusTrap(panelRef, { active: open, onEscape: onClose, initialFocusRef: closeRef });
  useBodyScrollLock(open);

  const store = useStoreData(open);
  const estimate = store ? deliveryEstimate(store.methods) : null;
  const delivery = describeDelivery(store, estimate, subtotal);

  // ---- Free-delivery progress (display only) ---------------------------------
  const threshold = estimate ? estimate.threshold : null;
  const showProgress = !isEmpty && threshold !== null;
  const unlocked = showProgress && subtotal >= threshold;
  const remaining = showProgress ? Math.max(0, threshold - subtotal) : 0;
  const ratio = showProgress ? Math.min(1, Math.max(0, subtotal / threshold)) : 0;

  // ---- Promises: shown once the store data has settled ----------------------
  const trustItems = store
    ? [
        { id: "securePayment", icon: "lock", label: "Secure payment" },
        resolveTrustBadgeDetail("cod", { settings: store.settings }) !== null && {
          id: "cod",
          icon: "cash",
          label: "Cash on Delivery",
        },
        resolveTrustBadgeDetail("easyReturns") !== null && {
          id: "easyReturns",
          icon: "rotate",
          label: "Easy returns",
          detail: daysLabel(STOREFRONT_CONFIG.returnsWindowDays),
        },
      ].filter(Boolean)
    : [];

  // ---- Close when the route changes (links, back/forward) ------------------
  const routeKey = location.pathname + location.search;
  const lastRouteKey = useRef(routeKey);
  useEffect(() => {
    if (lastRouteKey.current === routeKey) return;
    lastRouteKey.current = routeKey;
    if (open) onCloseRef.current();
  }, [routeKey, open]);

  // ---- Focus after a removal -------------------------------------------------
  // The next line's Remove takes focus (the previous one's for the last line);
  // when the cart is empty, the empty-state message does.
  const [focusEmpty, setFocusEmpty] = useState(false);
  useEffect(() => {
    if (!focusEmpty || !isEmpty) return;
    setFocusEmpty(false);
    if (emptyRef.current) emptyRef.current.focus();
  }, [focusEmpty, isEmpty]);
  useEffect(() => {
    if (!open) setFocusEmpty(false);
  }, [open]);

  const registerRemove = useCallback((lineId, element) => {
    if (element) removeButtons.current.set(lineId, element);
    else removeButtons.current.delete(lineId);
  }, []);

  // ---- Actions -----------------------------------------------------------------
  const onNavigate = (event) => {
    if (isPlainClick(event)) onClose();
  };

  const handleDecrease = (line) => {
    if (line.quantity <= 1) return;
    updateQuantity(line.id, line.quantity - 1);
  };

  const handleIncrease = (line) => {
    if (atStockLimit(line)) return;
    updateQuantity(line.id, line.quantity + 1);
  };

  const handleRemove = (lineId) => {
    const index = lines.findIndex((line) => line.id === lineId);
    const neighbour = lines[index + 1] || lines[index - 1];
    removeFromCart(lineId);
    if (neighbour) {
      const next = removeButtons.current.get(neighbour.id);
      if (next) next.focus();
    } else {
      setFocusEmpty(true);
    }
  };

  if (typeof document === "undefined") return null;

  const panelMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: duration.base, ease: easeInOut } },
      }
    : {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%", transition: { duration: duration.base, ease: easeInOut } },
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <React.Fragment key="cart-drawer">
          <motion.div
            className={styles.backdrop}
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: duration.base, ease: easeInOut } }}
            transition={{ duration: duration.slow, ease: easeOut }}
          />
          <motion.div
            ref={panelRef}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={count > 0 ? countId : undefined}
            tabIndex={-1}
            layoutRoot
            transition={{ duration: duration.slow, ease: easeOut }}
            {...panelMotion}
          >
            <div className={styles.header}>
              <div className={styles.heading}>
                <h2 id={titleId} className={`sf-display-sm ${styles.title}`}>
                  Your cart
                </h2>
                {count > 0 && (
                  <p id={countId} className={styles.count}>
                    {itemsLabel(count)}
                  </p>
                )}
              </div>
              <button
                ref={closeRef}
                type="button"
                className={styles.close}
                onClick={onClose}
                aria-label="Close cart"
              >
                <CloseOutlined />
              </button>
            </div>

            {/* Already known when the drawer opens: drawn at once. Arriving
                later (the first opening): it unfolds, so the lines below move
                down smoothly instead of jumping. */}
            <AnimatePresence initial={false}>
              {showProgress && (
                <motion.div
                  key="progress"
                  className={styles.progress}
                  {...(reduceMotion ? FADE : UNFOLD)}
                >
                  <div className={styles.progressInner}>
                    <p
                      className={unlocked ? `${styles.progressLine} ${styles.unlocked}` : styles.progressLine}
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {unlocked ? (
                        <>
                          <svg
                            className={styles.check}
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Free delivery unlocked
                        </>
                      ) : (
                        <>
                          Add <span className={styles.amount}>{formatCurrency(remaining)}</span> more for
                          free delivery
                        </>
                      )}
                    </p>
                    <span className={styles.track} aria-hidden="true">
                      <motion.span
                        className={styles.fill}
                        style={{ originX: 0 }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: ratio }}
                        transition={{ duration: duration.slow, ease: easeOut }}
                      />
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div className={styles.body} layoutScroll>
              {isEmpty ? (
                <motion.div
                  className={styles.empty}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: duration.base, ease: easeOut }}
                >
                  <p ref={emptyRef} tabIndex={-1} className={`sf-display-sm ${styles.emptyTitle}`}>
                    Your cart is empty.
                  </p>
                  <p className={styles.emptyLine}>
                    Pieces you add will wait here until you are ready to check out.
                  </p>
                  <Link to="/products" className="sf-btn sf-btn--ghost" onClick={onNavigate}>
                    Browse furniture
                  </Link>
                </motion.div>
              ) : (
                <>
                  <ul className={styles.lines} aria-labelledby={titleId}>
                    <AnimatePresence initial={false}>
                      {lines.map((line) => (
                        <CartLine
                          key={line.id}
                          line={line}
                          reduceMotion={reduceMotion}
                          onNavigate={onNavigate}
                          onDecrease={handleDecrease}
                          onIncrease={handleIncrease}
                          onRemove={handleRemove}
                          registerRemove={registerRemove}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>

                  {trustItems.length > 0 && (
                    <ul className={styles.trust} aria-label="Our promises">
                      {trustItems.map((item) => (
                        <li key={item.id} className={styles.trustItem}>
                          <TrustIcon name={item.icon} />
                          <span>
                            {item.label}
                            {item.detail && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span className="sf-visually-hidden">, </span>
                                {item.detail}
                              </>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </motion.div>

            {!isEmpty && (
              <div className={styles.footer}>
                <dl className={styles.summary}>
                  <div className={`${styles.summaryRow} ${styles.subtotal}`}>
                    <dt>Subtotal</dt>
                    <dd>{formatCurrency(subtotal)}</dd>
                  </div>
                  <div className={`${styles.summaryRow} ${styles.delivery}`}>
                    <dt>Delivery</dt>
                    {delivery ? (
                      <dd className={delivery.free ? styles.free : undefined}>
                        {delivery.text}
                        {delivery.freeAbove && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="sf-visually-hidden">, </span>
                            free above {delivery.freeAbove}
                          </>
                        )}
                      </dd>
                    ) : (
                      <dd aria-busy="true">
                        <span className="sf-visually-hidden">Loading</span>
                        <span className={`sf-skeleton ${styles.deliverySkeleton}`} aria-hidden="true" />
                      </dd>
                    )}
                  </div>
                </dl>
                <p className={styles.taxNote}>Taxes calculated at checkout</p>
                <Link
                  to="/checkout"
                  className={`sf-btn sf-btn--primary sf-btn--lg sf-btn--block ${styles.checkout}`}
                  onClick={onNavigate}
                >
                  Checkout
                </Link>
                <button type="button" className={`sf-btn sf-btn--link ${styles.continue}`} onClick={onClose}>
                  Continue shopping
                </button>
              </div>
            )}
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CartDrawer;
