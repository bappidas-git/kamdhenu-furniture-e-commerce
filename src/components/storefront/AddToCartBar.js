import React, { useState, useEffect, useRef } from "react";
import { formatCurrency, PLACEHOLDER_IMG, onImageError } from "../../utils/helpers";
import styles from "./AddToCartBar.module.css";

// =============================================================================
// AddToCartBar — persistent mobile Add-to-Cart (mobile-first conversion)
// =============================================================================
// On phones the primary CTA must always be a thumb away. This bar pins the price
// + "Add to cart" to the bottom of the screen and reveals itself once the
// in-page buy box scrolls out of view (tracked via IntersectionObserver on
// `anchorRef`). It shows the REAL selected price and is disabled when the real
// selection is out of stock — it asserts nothing the buy box doesn't.
//
// Look (Prompt 16): a 64px paper bar with a top hairline, up to 768px only:
// a 40px thumbnail, the name (serif 15px, one line), the price and the chosen
// option, and a compact 44px primary button. It sits at --sf-z-stickybar:
// above the bottom nav (--sf-z-bottomnav), below every drawer and modal.
//
// Keyboard: while the bar is shown, the page keeps focused content clear of it
// (scroll-padding in the stylesheet), and if keyboard focus lands on something
// the bar covers (the fixed bottom nav), the bar steps aside until focus
// moves on. Hidden, it is aria-hidden and its button leaves the tab order.
//
// Props:
//   anchorRef    ref      element whose visibility toggles the bar (the buy box)
//   price        number   current selected price (real)
//   currency     string
//   image,name   string   small product thumbnail/label
//   detail       string   optional, e.g. the chosen variant ("5 shelves")
//   disabled     boolean  out of stock
//   ctaLabel     string   default "Add to cart"
//   onAddToCart  fn
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

// The bottom nav slides back over --sf-duration (320ms) when it takes focus.
const YIELD_RECHECK_MS = 400;

// How far a sliding fixed ancestor (the bottom nav on its way back up) is
// still translated: the element rests that much higher once it settles.
const slideOffset = (element) => {
  for (let node = element; node && node !== document.body; node = node.parentElement) {
    const style = window.getComputedStyle(node);
    if (style.position !== "fixed") continue;
    if (!style.transform || style.transform === "none" || typeof DOMMatrixReadOnly === "undefined") return 0;
    try {
      return new DOMMatrixReadOnly(style.transform).m42;
    } catch (e) {
      return 0;
    }
  }
  return 0;
};

// Keyboard focus only: a tap or click also focuses, but never needs this.
const isKeyboardFocus = (el) => {
  try {
    return el.matches(":focus-visible");
  } catch (e) {
    return true;
  }
};

const AddToCartBar = ({
  anchorRef,
  price = 0,
  currency = "INR",
  image,
  name,
  detail,
  disabled = false,
  ctaLabel = "Add to cart",
  onAddToCart,
}) => {
  const [showBar, setShowBar] = useState(false);
  const [added, setAdded] = useState(false);
  const [yielding, setYielding] = useState(false);
  const barRef = useRef(null);

  // Reveal the bar only after the in-page buy box has scrolled away.
  useEffect(() => {
    const el = anchorRef?.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShowBar(true); // graceful fallback: always available on mobile
      return undefined;
    }
    const obs = new IntersectionObserver(
      ([entry]) => setShowBar(!entry.isIntersecting),
      { rootMargin: "0px 0px -10% 0px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [anchorRef]);

  // Step aside while keyboard focus sits on something the shown bar would
  // cover (it is measured where the bar rests, at the bottom of the screen).
  useEffect(() => {
    if (!showBar) {
      setYielding(false);
      return undefined;
    }
    let frame = 0;
    let recheck = 0;
    const covered = (target) => {
      const bar = barRef.current;
      if (!bar || !target || target === document.body || bar.contains(target)) return false;
      if (typeof target.getBoundingClientRect !== "function" || !isKeyboardFocus(target)) return false;
      const height = bar.offsetHeight;
      if (!height) return false; // not displayed (wider screens)
      const top = window.innerHeight - height;
      const rect = target.getBoundingClientRect();
      // Where it will rest: a bottom nav sliding back in is not there yet.
      const offset = slideOffset(target);
      return rect.bottom - offset > top && rect.top - offset < window.innerHeight;
    };
    const onFocusIn = (e) => {
      const target = e.target;
      cancelAnimationFrame(frame);
      clearTimeout(recheck);
      // After the browser has scrolled the newly focused element into view.
      frame = requestAnimationFrame(() => setYielding(covered(target)));
      // Once more after the bottom nav has slid back into place: taking focus
      // brings it back from below the screen, where it was not covered yet.
      recheck = setTimeout(() => {
        if (document.activeElement === target) setYielding(covered(target));
      }, YIELD_RECHECK_MS);
    };
    const onFocusOut = (e) => {
      if (!e.relatedTarget) setYielding(false);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(recheck);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [showBar]);

  const handleAdd = () => {
    if (disabled) return;
    onAddToCart?.();
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const visible = showBar && !yielding;

  return (
    <div
      ref={barRef}
      className={cx(styles.bar, visible && styles.visible)}
      aria-hidden={!visible}
    >
      <div className={styles.info}>
        {image && (
          <img
            className={styles.thumb}
            src={image || PLACEHOLDER_IMG}
            alt=""
            width="40"
            height="40"
            loading="lazy"
            decoding="async"
            onError={onImageError}
          />
        )}
        <div className={styles.text}>
          {name && <span className={styles.name}>{name}</span>}
          <span className={styles.priceRow}>
            <span className={styles.price}>{formatCurrency(price, currency)}</span>
            {detail && (
              <>
                <span className={styles.dot} aria-hidden="true" />
                <span className="sf-visually-hidden">, </span>
                <span className={styles.detail}>{detail}</span>
              </>
            )}
          </span>
        </div>
      </div>
      <button
        type="button"
        className={cx("sf-btn", "sf-btn--primary", styles.addBtn)}
        onClick={handleAdd}
        disabled={disabled}
        tabIndex={visible ? 0 : -1}
      >
        {disabled ? (
          "Sold out"
        ) : added ? (
          <>
            <span className="sf-fade-in">Added</span>
            <svg className={cx("sf-fade-in", styles.check)} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </>
        ) : (
          ctaLabel
        )}
      </button>
    </div>
  );
};

export default AddToCartBar;
