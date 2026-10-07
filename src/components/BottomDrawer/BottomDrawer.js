import React, { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CloseOutlined } from "@mui/icons-material";
import useFocusTrap, { useBodyScrollLock } from "../ui/useFocusTrap";
import { TOKENS } from "../../theme/tokens";
import styles from "./BottomDrawer.module.css";

// =============================================================================
// BottomDrawer — the storefront's shared bottom sheet (phones and tablets)
// =============================================================================
//
// A modal sheet that slides up from the bottom edge over the overlay backdrop:
// drag handle (visual only), a hairline header with the title in the display
// serif and a 44px close button, a scrolling body, and an optional footer
// that stays put under it (e.g. "Clear all" / "Show 24 results").
//
//   <BottomDrawer open={open} onClose={close} title="Filters"
//                 footer={<button className="sf-btn sf-btn--primary sf-btn--block">Show results</button>}>
//     …
//   </BottomDrawer>
//
// Props: open, onClose, title (string or node), children, ariaLabel (the
// dialog's name; defaults to a string title), initialFocusRef (default: the
// close button), maxHeight (any CSS length, default "80vh"), footer,
// className (on the sheet).
//
// Behaviour: role="dialog" + aria-modal, Escape and the backdrop close it,
// Tab stays inside, focus returns to the opener, the page behind does not
// scroll. Rendered in a portal on <body>, so a transformed ancestor never
// re-anchors it. Motion: slides up over --sf-duration with --sf-ease-out; a
// plain fade under reduced motion.
// =============================================================================

const { duration, easeOut, easeInOut } = TOKENS.motion;

const BottomDrawer = ({
  open,
  onClose,
  title,
  children,
  ariaLabel,
  initialFocusRef,
  maxHeight = "80vh",
  footer,
  className,
}) => {
  const sheetRef = useRef(null);
  const closeRef = useRef(null);
  const titleId = useId();
  const reduceMotion = useReducedMotion();

  useFocusTrap(sheetRef, {
    active: open,
    onEscape: onClose,
    initialFocusRef: initialFocusRef || closeRef,
  });
  useBodyScrollLock(open);

  if (typeof document === "undefined") return null;

  // A string title names the dialog; a node title is pointed at instead.
  const label = ariaLabel || (typeof title === "string" ? title : undefined);
  const labelledBy = !label && title ? titleId : undefined;

  const sheetMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: duration.base, ease: easeInOut } },
      }
    : {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%", transition: { duration: duration.base, ease: easeInOut } },
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <React.Fragment key="bottom-drawer">
          <motion.div
            className={styles.backdrop}
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: duration.base, ease: easeInOut } }}
            transition={{ duration: duration.base, ease: easeOut }}
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            aria-labelledby={labelledBy}
            tabIndex={-1}
            className={className ? `${styles.sheet} ${className}` : styles.sheet}
            style={{ maxHeight }}
            transition={{ duration: duration.base, ease: easeOut }}
            {...sheetMotion}
          >
            <span className={styles.handle} aria-hidden="true" />
            <div className={styles.header}>
              {title ? (
                <h2 id={titleId} className={styles.title}>
                  {title}
                </h2>
              ) : null}
              <button
                ref={closeRef}
                type="button"
                className={styles.close}
                onClick={onClose}
                aria-label="Close"
              >
                <CloseOutlined />
              </button>
            </div>
            <div className={styles.body}>{children}</div>
            {footer ? <div className={styles.footer}>{footer}</div> : null}
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default BottomDrawer;
