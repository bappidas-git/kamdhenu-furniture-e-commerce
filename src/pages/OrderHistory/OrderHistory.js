import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Swal from "sweetalert2";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import apiService from "../../services/api";
import {
  copyToClipboard,
  formatCurrency,
  formatDateIN,
  normalizeOrderAddress,
  onImageError,
  PLACEHOLDER_IMG,
} from "../../utils/helpers";
import { TOKENS } from "../../theme/tokens";
import AccountLayout from "../../components/account/AccountLayout";
import ReviewModal from "../../components/ReviewModal/ReviewModal";
import styles from "./OrderHistory.module.css";

// =============================================================================
// Order history (/orders) — prompts/DESIGN_SYSTEM.md §34
// =============================================================================
// The customer's hub for tracking, cancelling, returning and reviewing, inside
// the account shell (<AccountLayout active="orders">: the greeting is the h1,
// "Orders" the section's eyebrow h2). A toolbar (search by order number, the
// status chips, refresh) over hairline order cards: the number with a copy
// button, the date, an honest status badge, thumbnails and the total, then
// Track (a sand panel: a progress line only as far as the status fields go,
// tracking number, carrier link, refund line), Details (items with the review
// control, address, payment, the summary with the store-credit rows), Return
// or exchange (to Support, prefilled) and Cancel order.
//
// What did not change (the rules and the requests are the old ones): the
// reads (orders.getByUserId + reviews.getMine in one Promise.all, newest
// first), deriveOrderStatus and STATUS_CONFIG, the filter on the derived label,
// the search on the order number, ORDERS_PER_PAGE and the page reset and clamp,
// isReturnEligible (RETURN_WINDOW_DAYS from the delivery date), isCancellable,
// isReviewable, reviewFor, the cancel request and its merge, the review payload
// and the refresh after it, the guest panel instead of a redirect.
//
// Returns: there is no return form on the storefront (apiService.returns.create
// is not called here). "Return or exchange" opens the Support form with
// ?order=<orderNumber>&category=returns, which Prompt 28's form prefills.
// =============================================================================

// Short, privacy-friendly display name for a review, e.g. "Bappi D." — matches
// the style of the seeded reviews.
const reviewDisplayName = (user) => {
  const first = user?.firstName?.trim() || "";
  const last = user?.lastName?.trim() || "";
  if (first && last) return `${first} ${last[0].toUpperCase()}.`;
  return first || user?.email?.split("@")[0] || "Customer";
};

const REVIEW_STATUS = {
  pending: { label: "Review pending approval", className: "reviewPending" },
  approved: { label: "Review published", className: "reviewApproved" },
  rejected: { label: "Review not approved", className: "reviewRejected" },
};

const STATUS_CONFIG = {
  processing: { label: "Processing", className: "statusProcessing" },
  shipped: { label: "Shipped", className: "statusShipped" },
  delivered: { label: "Delivered", className: "statusDelivered" },
  cancelled: { label: "Cancelled", className: "statusCancelled" },
  returned: { label: "Returned", className: "statusCancelled" },
  pending: { label: "Processing", className: "statusProcessing" },
  completed: { label: "Delivered", className: "statusDelivered" },
  failed: { label: "Cancelled", className: "statusCancelled" },
  refunded: { label: "Cancelled", className: "statusCancelled" },
};

// "Returned" has its own chip: the admin's return refund sets fulfillmentStatus
// "returned", and such an order used to show only under All.
const FILTER_OPTIONS = ["All", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];
const ORDERS_PER_PAGE = 5;
const RETURN_WINDOW_DAYS = 7; // per the 7-day return policy (see /refund-policy)

// Orders carry paymentStatus / fulfillmentStatus / shippingStatus (the shape
// checkout writes and Admin manages) — collapse those into the single display
// status this page badges and filters by. A legacy `status` field is only
// honoured when none of the canonical fields exist.
const deriveOrderStatus = (order) => {
  if (order.paymentStatus || order.fulfillmentStatus || order.shippingStatus) {
    // A returned order is its own outcome — show it honestly rather than
    // collapsing it into "Cancelled" (full refund) or "Delivered" (partial).
    if (order.fulfillmentStatus === "returned") return "returned";
    if (
      order.fulfillmentStatus === "cancelled" ||
      order.paymentStatus === "failed" ||
      order.paymentStatus === "refunded"
    ) {
      return "cancelled";
    }
    if (order.shippingStatus === "delivered") return "delivered";
    if (order.shippingStatus === "shipped") return "shipped";
    return "processing";
  }
  return order.status || "processing";
};

const getStatusInfo = (status) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG.processing;
};

const isReturnEligible = (order) => {
  if (deriveOrderStatus(order) !== "delivered") return false;
  // The window starts when the parcel arrived: deliveredAt when recorded,
  // else updatedAt (bumped by the delivered status change) — never
  // createdAt, which would open the window before delivery.
  const deliveredOn = order.deliveredAt || order.updatedAt;
  if (!deliveredOn) return false;
  const daysSinceDelivery = (Date.now() - new Date(deliveredOn).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceDelivery <= RETURN_WINDOW_DAYS;
};

// Orders can be cancelled until they ship — i.e. while the derived status
// is still "processing" (covers pending-payment and unfulfilled orders).
const isCancellable = (order) => deriveOrderStatus(order) === "processing";

// Purchase-gated reviews: a product is reviewable only from an order the
// customer kept — derived status "delivered" (delivered, and NOT cancelled,
// returned or refunded).
const isReviewable = (order) => deriveOrderStatus(order) === "delivered";

// ---------------------------------------------------------------------------
// Presentation only: none of the rules above depends on anything below.
// ---------------------------------------------------------------------------

const { duration, easeInOut } = TOKENS.motion;

const cx = (...names) => names.filter(Boolean).join(" ");

// The status badge, keyed by STATUS_CONFIG's className: ink while processing,
// slate once shipped, green when delivered, quiet sand when cancelled or
// returned (never red: a cancelled order is a normal outcome).
const STATUS_BADGE = {
  statusProcessing: "sf-badge--ink",
  statusShipped: "sf-badge--info",
  statusDelivered: "sf-badge--success",
  statusCancelled: `sf-badge--sand ${styles.badgeQuiet}`,
};

// The review chip, keyed by REVIEW_STATUS's className.
const REVIEW_BADGE = {
  reviewPending: "sf-badge--info",
  reviewApproved: "sf-badge--success",
  reviewRejected: `sf-badge--sand ${styles.badgeQuiet}`,
};

// The progress line marks only what the status fields imply: the order exists
// (Placed), is still being prepared (Processing), has shipped, or was
// delivered. Steps beyond the status are "not yet". Dates only where the order
// records them: placed (createdAt) and delivered (deliveredAt).
const PROGRESS_STEPS = ["Placed", "Processing", "Shipped", "Delivered"];
const PROGRESS_STAGE = { Processing: 1, Shipped: 2, Delivered: 3 };

// A cancelled or returned order has no line to walk: one sentence says what
// its status fields record (in deriveOrderStatus's order).
const closedNote = (order, label) => {
  if (label === "Returned") return "This order was returned.";
  if (order.fulfillmentStatus === "cancelled") {
    return order.cancelledAt
      ? `This order was cancelled on ${formatDateIN(order.cancelledAt)}.`
      : "This order was cancelled.";
  }
  if (order.paymentStatus === "failed" || order.status === "failed") {
    return "The payment for this order didn’t go through.";
  }
  if (order.paymentStatus === "refunded" || order.status === "refunded") {
    return "The payment for this order was refunded.";
  }
  return "This order was cancelled.";
};

// The tracking panel's refund line. It states no refund timing: none is
// confirmed (the refund policy leaves it blank).
const refundText = (order) =>
  order.refundStatus === "completed"
    ? `Refunded${order.refundedAmount ? ` ${formatCurrency(order.refundedAmount)}` : ""} to your ${(order.refundMethod || "original payment method").replace(/_/g, " ")}`
    : order.refundStatus === "processing"
    ? "Refund in progress"
    : order.refundStatus === "failed"
    ? "Refund delayed. We’re looking into it."
    : order.refundStatus;

// A carrier link opens only for a web address (never a javascript: URL).
const isWebUrl = (url) => typeof url === "string" && /^https?:\/\//i.test(url.trim());

// Payment methods by checkout's names (its PAYMENT_OPTIONS) and store credit;
// any other value reads as it did before.
const PAYMENT_METHOD_LABELS = {
  card: "Credit or debit card",
  upi: "UPI",
  net_banking: "Net banking",
  wallet: "Wallet",
  cod: "Cash on Delivery",
  store_credit: "Store credit",
};

const paymentMethodLabel = (method) =>
  method ? PAYMENT_METHOD_LABELS[method] || method.replace(/_/g, " ").toUpperCase() : "Not recorded";

const paymentStatusLabel = (status) => {
  const text = String(status).replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// The summary's last row when store credit was used (the confirmation page's
// "Amount paid"), named for what happened: "Amount due" while the payment is
// still to be collected, and no row once the payment was voided or failed.
const paidRowLabel = (order) => {
  if (order.paymentStatus === "pending") return "Amount due";
  if (["voided", "failed"].includes(order.paymentStatus)) return null;
  return "Amount paid";
};

// Returns and exchanges start from the Support form, prefilled.
const supportReturnPath = (order) => {
  const params = new URLSearchParams();
  if (order.orderNumber) params.set("order", order.orderNumber);
  params.set("category", "returns");
  return `/support?${params.toString()}`;
};

// The cancel confirm's refund sentence, from what orders.cancel does (api.js,
// performCancel): what was paid outside store credit (the total less the
// credit) goes back to the original method, or to a bank account or UPI for
// cash collected on delivery; store credit used on the order goes back to the
// account; nothing is refunded when nothing was collected.
const cancelRefundSentence = (order) => {
  const credit = Number(order.storeCreditUsed) || 0;
  const external =
    order.amountPayable != null ? Number(order.amountPayable) : Number(order.total) || 0;
  const alreadyRefunded = Number(order.refundedAmount) || 0;
  const isOnline = order.paymentMethod && order.paymentMethod !== "cod";
  const captured = ["paid", "partially_refunded"].includes(order.paymentStatus);
  const creditLine =
    credit > 0
      ? ` The ${formatCurrency(credit)} of store credit you used will go back to your account.`
      : "";
  if (external > 0 && captured) {
    const amount = Math.max(0, external - alreadyRefunded);
    return ` We’ll start a ${alreadyRefunded > 0 ? "" : "full "}refund of ${formatCurrency(amount)} to your ${isOnline ? "original payment method" : "bank account or UPI"}.${creditLine}`;
  }
  if (credit > 0) {
    return `${creditLine}${external > 0 ? " No other payment has been collected." : ""}`;
  }
  return " No payment has been collected, so there’s nothing to refund.";
};

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
  );

// The listing's page list (DESIGN_SYSTEM §24.7): the first and last pages, two
// either side of the current one, an ellipsis for each gap.
const pageRange = (page, totalPages) => {
  const range = [1];
  const left = Math.max(2, page - 2);
  const right = Math.min(totalPages - 1, page + 2);
  if (left > 2) range.push("...");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < totalPages - 1) range.push("...");
  if (totalPages > 1) range.push(totalPages);
  return range;
};

// The sticky header's visible height (§17.2), and moving focus without
// leaving its target under it ("instant", not "auto", under reduced motion:
// the root's scroll-behavior is smooth).
const headerHeight = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sf-header-height")) || 0;

const focusAndReveal = (element, reduceMotion) => {
  element.focus({ preventScroll: true });
  const rect = element.getBoundingClientRect();
  if (rect.top < headerHeight() || rect.bottom > window.innerHeight) {
    window.scrollTo({
      top: Math.max(0, window.scrollY + rect.top - headerHeight() - TOKENS.space[4]),
      behavior: reduceMotion ? "instant" : "smooth",
    });
  }
};

// ---------------------------------------------------------------------------
// Glyphs (1.5px strokes in currentColor)
// ---------------------------------------------------------------------------
const Icon = ({ children, size = 18, className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

const CopyIcon = () => (
  <Icon size={16}>
    <rect x="9" y="9" width="11" height="11" rx="1" />
    <path d="M15 9V5a1 1 0 00-1-1H5a1 1 0 00-1 1v9a1 1 0 001 1h4" />
  </Icon>
);

const CheckIcon = () => (
  <Icon size={16}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

const RefreshIcon = () => (
  <Icon>
    <path d="M19.5 9.5A8 8 0 005.6 7.1L4 9" />
    <path d="M4 4.5V9h4.5" />
    <path d="M4.5 14.5a8 8 0 0013.9 2.4L20 15" />
    <path d="M20 19.5V15h-4.5" />
  </Icon>
);

const SearchIcon = () => (
  <Icon className={styles.searchIcon}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </Icon>
);

const ClearIcon = () => (
  <Icon size={14}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

const ChevronDown = () => (
  <Icon size={16} className={styles.chevron}>
    <path d="M6 9.5l6 6 6-6" />
  </Icon>
);

const ChevronLeft = () => (
  <Icon>
    <path d="M14.5 6l-6 6 6 6" />
  </Icon>
);

const ChevronRight = () => (
  <Icon>
    <path d="M9.5 6l6 6-6 6" />
  </Icon>
);

const ExternalIcon = () => (
  <Icon size={14}>
    <path d="M14 4h6v6" />
    <path d="M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
  </Icon>
);

const OrderHistory = () => {
  const { isDarkMode } = useTheme();
  const { user, isAuthenticated, isLoading: authLoading, openAuthModal, authModalOpen } = useAuth();
  const reduceMotion = useReducedMotion();
  const uid = useId();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [trackingVisible, setTrackingVisible] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Reviews authored by this customer (any status), keyed by productId for the
  // per-item "your review" state, plus the rate/review modal.
  const [myReviews, setMyReviews] = useState([]);
  const [reviewModal, setReviewModal] = useState({ open: false, product: null, existing: null, orderId: null, orderNumber: null });

  // The page's status line (copy feedback, a cancelled order; a new key
  // re-announces a repeated message) and focus moves, each requested in the
  // same render batch as the change it follows.
  const [announcement, setAnnouncement] = useState({ key: 0, text: "" });
  const [focusRequest, setFocusRequest] = useState(null);

  const titleRef = useRef(null);
  const sectionRef = useRef(null);
  const searchRef = useRef(null);
  const retryRef = useRef(null);
  const headingRefs = useRef(new Map());
  const copyTimer = useRef(null);
  const retried = useRef(false);
  const sawGuest = useRef(false);

  useEffect(() => {
    if (authLoading) return; // session restore in progress — keep the loader up
    if (isAuthenticated) {
      fetchOrders();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  const fetchOrders = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [response, reviews] = await Promise.all([
        apiService.orders.getByUserId(user?.id),
        apiService.reviews.getMine(user?.id).catch(() => []),
      ]);
      const data = Array.isArray(response) ? response : response?.data || response?.orders || [];
      const sorted = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(sorted);
      setMyReviews(Array.isArray(reviews) ? reviews : []);
    } catch (err) {
      // Keep "No Orders Yet" honest: a failed fetch renders the error state,
      // never the empty state.
      console.error("Failed to fetch orders:", err);
      setOrders([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const announce = useCallback((text) => {
    setAnnouncement((previous) => ({ key: previous.key + 1, text }));
  }, []);

  // Copy a number: the button shows a check for 2 seconds, and the status
  // line says it worked (or that it did not, which the old page never said).
  const handleCopy = async (text, what) => {
    const copied = await copyToClipboard(String(text));
    clearTimeout(copyTimer.current);
    setCopiedId(copied ? text : null);
    if (copied) copyTimer.current = setTimeout(() => setCopiedId(null), 2000);
    announce(copied ? `${what} copied.` : `Couldn’t copy the ${what.toLowerCase()}.`);
  };

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  // The customer's existing review for a product (if any), to drive the
  // edit flow and the "your review" status chip.
  const reviewFor = (productId) =>
    myReviews.find((r) => Number(r.productId) === Number(productId)) || null;

  const openReviewModal = (order, item) => {
    setReviewModal({
      open: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      product: { productId: item.productId, name: item.name, image: item.image },
      existing: reviewFor(item.productId),
    });
  };

  const closeReviewModal = () => setReviewModal((m) => ({ ...m, open: false }));

  const handleSubmitReview = async ({ rating, title, body }) => {
    const { product, existing, orderId, orderNumber } = reviewModal;
    await apiService.reviews.submit({
      productId: product.productId,
      userId: user.id,
      userName: reviewDisplayName(user),
      rating,
      title,
      body,
      orderId,
      orderNumber,
      isVerifiedPurchase: true,
    });
    // Refresh the customer's reviews so the chip reflects the new pending state.
    const refreshed = await apiService.reviews.getMine(user.id).catch(() => myReviews);
    setMyReviews(Array.isArray(refreshed) ? refreshed : []);
    closeReviewModal();
    Swal.fire({
      icon: "success",
      title: existing ? "Review updated" : "Review submitted",
      text: "Thank you. Your review will appear on the product page once it’s approved.",
      toast: true,
      position: "bottom-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  };

  const handleCancelOrder = async (order, event) => {
    if (cancellingId) return;
    const opener = event ? event.currentTarget : null;
    // Payment-aware messaging (see cancelRefundSentence): what goes back to the
    // payment method, what goes back to store credit, or that nothing was
    // collected.
    const refundLine = cancelRefundSentence(order);
    const result = await Swal.fire({
      title: "Cancel this order?",
      html: `Order <strong>${escapeHtml(order.orderNumber || `#${order.id}`)}</strong> will be cancelled.${refundLine}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Cancel order",
      cancelButtonText: "Keep order",
      // Enter or Space on arrival keeps the order: focus starts on the
      // harmless choice (the destructive one is a deliberate move).
      focusCancel: true,
      customClass: { confirmButton: "sf-btn sf-btn--danger" },
      // The page moves focus itself, at once (SweetAlert's own return comes
      // after its closing animation): back to this button, busy while the
      // request runs, then to the order's heading once it is cancelled.
      returnFocus: false,
    });
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    if (!result.isConfirmed) return;

    setCancellingId(order.id);
    try {
      const updated = await apiService.orders.cancel(order.id);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, ...updated } : o))
      );
      announce(`Order ${order.orderNumber || `#${order.id}`} has been cancelled.`);
      setFocusRequest({ to: "order", key: order.id || order.orderNumber });
    } catch (err) {
      console.error("Failed to cancel order:", err);
      Swal.fire({
        icon: "error",
        title: "Couldn’t cancel the order",
        text: "Your order hasn’t changed. Try again in a moment.",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const statusInfo = getStatusInfo(deriveOrderStatus(order));
    const matchesFilter =
      activeFilter === "All" ||
      statusInfo.label.toLowerCase() === activeFilter.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (order.orderNumber || order.id || "")
        .toString()
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  // Keep the page in range when the result set shrinks (e.g. after a refresh).
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // A requested focus move, after the render that shows its change: an
  // order's heading (after a cancel), the first order on screen (after a page
  // change or "Show all orders"), else the section itself.
  const handledRequest = useRef(null);
  useEffect(() => {
    if (!focusRequest || handledRequest.current === focusRequest) return;
    handledRequest.current = focusRequest;
    const section = sectionRef.current;
    let target = null;
    if (focusRequest.to === "order") target = headingRefs.current.get(focusRequest.key) || null;
    if (focusRequest.to === "first" && section) target = section.querySelector("[data-order-heading]");
    if (!target) target = section;
    if (target && target.isConnected) focusAndReveal(target, reduceMotion);
  }, [focusRequest, reduceMotion]);

  // After "Try again": focus waits on the section while the read runs (the
  // panel makes way for the skeletons) and stays there on success; a second
  // failure puts it on the new "Try again", unless it has moved meanwhile.
  useEffect(() => {
    if (!retried.current || loading) return;
    retried.current = false;
    const focused = document.activeElement;
    const waiting = !focused || focused === document.body || focused === sectionRef.current;
    if (fetchError && waiting && retryRef.current) retryRef.current.focus();
  }, [loading, fetchError]);

  // A guest who signs in from the panel: the panel and its "Sign in" button
  // (the dialog's opener) are gone, so once the dialog has left the page focus
  // moves to the greeting (the Profile page's pattern, §31.5).
  useEffect(() => {
    if (authLoading) return undefined;
    if (!isAuthenticated) {
      sawGuest.current = true;
      return undefined;
    }
    if (!sawGuest.current || authModalOpen) return undefined;
    sawGuest.current = false;
    let frame = 0;
    let attempts = 0;
    const focusGreeting = () => {
      frame = 0;
      const active = document.activeElement;
      // Focus has gone somewhere on purpose meanwhile: leave it there.
      if (active && active !== document.body && !active.closest('[aria-modal="true"]')) return;
      // The dialog is still on its way out: try again next frame.
      if (document.querySelector('[aria-modal="true"]') && attempts < 60) {
        attempts += 1;
        frame = window.requestAnimationFrame(focusGreeting);
        return;
      }
      if (titleRef.current) titleRef.current.focus();
    };
    frame = window.requestAnimationFrame(focusGreeting);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [authLoading, isAuthenticated, authModalOpen]);

  // Not authenticated - show the sign-in panel (only once the session restore
  // has settled, so a reload while logged in doesn't flash this screen)
  if (!authLoading && !isAuthenticated) {
    return (
      <AccountLayout active="orders" titleRef={titleRef}>
        <div className={cx("sf-panel", styles.guest)}>
          <h2 className={cx("sf-display-sm", styles.guestTitle)}>Sign in to see your orders.</h2>
          <p className={styles.guestText}>
            Your orders are linked to your account, where you can track, cancel, return or review
            them.
          </p>
          <div className={styles.guestActions}>
            <button
              type="button"
              className="sf-btn sf-btn--primary"
              onClick={() => openAuthModal("login")}
              aria-haspopup="dialog"
            >
              Sign in
            </button>
            <button
              type="button"
              className="sf-btn sf-btn--ghost"
              onClick={() => openAuthModal("signup")}
              aria-haspopup="dialog"
            >
              Create account
            </button>
          </div>
        </div>
      </AccountLayout>
    );
  }

  const showLoading = authLoading || loading;
  const hasOrders = orders.length > 0;
  const narrowed = activeFilter !== "All" || searchQuery !== "";
  const countText = narrowed
    ? `${filteredOrders.length} of ${orders.length} orders`
    : `${orders.length} order${orders.length === 1 ? "" : "s"}`;

  const refresh = () => {
    if (!showLoading) fetchOrders();
  };

  const retry = () => {
    retried.current = true;
    if (sectionRef.current) sectionRef.current.focus({ preventScroll: true });
    fetchOrders();
  };

  const clearSearch = () => {
    setSearchQuery("");
    if (searchRef.current) searchRef.current.focus();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveFilter("All");
    setFocusRequest({ to: "first" });
  };

  const goToPage = (page) => {
    setCurrentPage(page);
    setFocusRequest({ to: "first" });
  };

  // Panels unfold from no height over --sf-duration; under reduced motion
  // they only fade (framer's reducedMotion leaves height alone, so it is
  // spelled out here).
  const panelMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: duration.base, ease: easeInOut },
      }
    : {
        initial: { height: 0, opacity: 0 },
        animate: { height: "auto", opacity: 1 },
        exit: { height: 0, opacity: 0 },
        transition: { duration: duration.base, ease: easeInOut },
      };

  const statusBadge = (statusInfo) => (
    <span className={cx("sf-badge", STATUS_BADGE[statusInfo.className], styles.status)}>
      {statusInfo.label}
    </span>
  );

  const copyButton = (value, what, label) => (
    <button
      type="button"
      className={cx("sf-btn sf-btn--icon", styles.copy)}
      onClick={() => handleCopy(value, what)}
      aria-label={label}
      data-copied={copiedId === value || undefined}
    >
      {copiedId === value ? <CheckIcon /> : <CopyIcon />}
    </button>
  );

  // ---- Track: a sand panel ----
  const renderTracking = (order, statusInfo) => {
    const stage = PROGRESS_STAGE[statusInfo.label];
    const open = statusInfo.label === "Processing" || statusInfo.label === "Shipped";
    return (
      <div className={cx("sf-panel", styles.tracking)}>
        <h4 className={cx("sf-eyebrow", styles.panelTitle)}>Tracking</h4>
        {stage != null ? (
          <ol className={styles.progress} aria-label="Delivery progress">
            {PROGRESS_STEPS.map((step, index) => {
              const state = index < stage ? "done" : index === stage ? "current" : "todo";
              const date =
                index === 0 ? order.createdAt : index === 3 && state === "current" ? order.deliveredAt : null;
              return (
                <li
                  key={step}
                  className={styles.step}
                  data-state={state}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span className={styles.stepMark} aria-hidden="true" />
                  <span className={styles.stepText}>
                    <span className={styles.stepLabel}>
                      {step}
                      {state !== "current" && (
                        <span className="sf-visually-hidden">{state === "done" ? ", done" : ", not yet"}</span>
                      )}
                    </span>
                    {date && (
                      <time className={styles.stepDate} dateTime={date}>
                        {formatDateIN(date, "short")}
                      </time>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className={styles.closedNote}>{closedNote(order, statusInfo.label)}</p>
        )}

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Tracking number</dt>
            <dd>
              {order.trackingNumber ? (
                <>
                  <span className={styles.trackingNumber}>{order.trackingNumber}</span>
                  {copyButton(order.trackingNumber, "Tracking number", "Copy tracking number")}
                </>
              ) : (
                <span className={styles.muted}>{open ? "Not yet available" : "Not available"}</span>
              )}
            </dd>
          </div>
          {isWebUrl(order.trackingUrl) && (
            <div className={styles.fact}>
              <dt>Carrier</dt>
              <dd>
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx("sf-btn sf-btn--link", styles.carrier)}
                >
                  Open carrier page
                  <span className="sf-visually-hidden"> (opens in a new tab)</span>
                  <ExternalIcon />
                </a>
              </dd>
            </div>
          )}
          <div className={styles.fact}>
            <dt>Status</dt>
            <dd>{statusBadge(statusInfo)}</dd>
          </div>
          {order.refundStatus && (
            <div className={styles.fact}>
              <dt>Refund</dt>
              <dd>{refundText(order)}</dd>
            </div>
          )}
        </dl>
      </div>
    );
  };

  // ---- Details: items with the review control, address, payment, summary ----
  const renderDetails = (order) => {
    const orderItems = order.items || [];
    const reviewable = isReviewable(order);
    const addr = normalizeOrderAddress(order.shippingAddress);
    const paidLabel = paidRowLabel(order);
    return (
      <div className={styles.details}>
        <div className={styles.block}>
          <h4 className={cx("sf-eyebrow", styles.panelTitle)}>Items</h4>
          <ul className={styles.items}>
            {orderItems.map((item, i) => {
              const canReview = reviewable && item.productId != null;
              const existing = canReview ? reviewFor(item.productId) : null;
              const sc = existing ? REVIEW_STATUS[existing.status] : null;
              return (
                <li key={i} className={styles.itemRow}>
                  <span className={styles.itemThumb}>
                    <img
                      src={item.image || PLACEHOLDER_IMG}
                      alt=""
                      width="56"
                      height="70"
                      loading="lazy"
                      decoding="async"
                      onError={onImageError}
                    />
                  </span>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{item.name}</p>
                    {item.variantName && <p className={styles.itemMeta}>{item.variantName}</p>}
                    <p className={styles.itemMeta}>Qty: {item.quantity}</p>
                  </div>
                  <p className={styles.itemTotal}>
                    <span className="sf-visually-hidden">Line total </span>
                    {formatCurrency(item.price * item.quantity, item.currency)}
                  </p>
                  {canReview && (
                    <div className={styles.review}>
                      {existing && sc && (
                        <span className={cx("sf-badge", REVIEW_BADGE[sc.className], styles.reviewChip)}>
                          {sc.label}
                        </span>
                      )}
                      <button
                        type="button"
                        className={cx("sf-btn sf-btn--link", styles.reviewButton)}
                        onClick={() => openReviewModal(order, item)}
                        aria-haspopup="dialog"
                      >
                        {existing ? "Edit review" : "Write a review"}
                        <span className="sf-visually-hidden"> {item.name}</span>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.blocks}>
          <div className={cx(styles.block, styles.addressBlock)}>
            <h4 className={cx("sf-eyebrow", styles.panelTitle)}>Delivery address</h4>
            {addr ? (
              <div className={styles.lines}>
                {addr.name && <p className={styles.lineStrong}>{addr.name}</p>}
                {addr.line1 && <p>{addr.line1}</p>}
                {addr.line2 && <p>{addr.line2}</p>}
                {addr.cityLine && <p>{addr.cityLine}</p>}
                {addr.country && <p>{addr.country}</p>}
                {addr.phone && <p className={styles.phone}>Phone: {addr.phone}</p>}
              </div>
            ) : (
              <p className={styles.muted}>No delivery address recorded</p>
            )}
          </div>

          <div className={cx(styles.block, styles.paymentBlock)}>
            <h4 className={cx("sf-eyebrow", styles.panelTitle)}>Payment</h4>
            <div className={styles.lines}>
              <p className={styles.lineStrong}>{paymentMethodLabel(order.paymentMethod)}</p>
              {order.paymentStatus && (
                <p className={styles.muted}>Status: {paymentStatusLabel(order.paymentStatus)}</p>
              )}
            </div>
          </div>

          <div className={cx(styles.block, styles.summaryBlock)}>
            <h4 className={cx("sf-eyebrow", styles.panelTitle)}>Summary</h4>
            <dl className={styles.summary}>
              <div className={styles.row}>
                <dt>Subtotal</dt>
                <dd>{formatCurrency(order.subtotal)}</dd>
              </div>
              {(order.discountAmount ?? 0) > 0 && (
                <div className={styles.row}>
                  <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                  <dd>−{formatCurrency(order.discountAmount)}</dd>
                </div>
              )}
              <div className={styles.row}>
                <dt>Delivery</dt>
                <dd>
                  {(order.shippingAmount ?? order.shipping ?? 0) > 0
                    ? formatCurrency(order.shippingAmount ?? order.shipping)
                    : "Free"}
                </dd>
              </div>
              <div className={styles.row}>
                <dt>Tax</dt>
                <dd>{formatCurrency(order.taxAmount ?? order.tax ?? 0)}</dd>
              </div>
              <div className={cx(styles.row, styles.rowTotal)}>
                <dt>Total</dt>
                <dd>{formatCurrency(order.total)}</dd>
              </div>
              {(order.storeCreditUsed ?? 0) > 0 && (
                <>
                  <div className={styles.row}>
                    <dt>Store credit</dt>
                    <dd>−{formatCurrency(order.storeCreditUsed)}</dd>
                  </div>
                  {paidLabel && (
                    <div className={cx(styles.row, styles.rowTotal)}>
                      <dt>{paidLabel}</dt>
                      <dd>
                        {formatCurrency(order.amountPayable ?? Math.max(0, order.total - order.storeCreditUsed))}
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>
        </div>
      </div>
    );
  };

  // ---- One order card ----
  const renderOrder = (order) => {
    const key = order.id || order.orderNumber;
    const statusInfo = getStatusInfo(deriveOrderStatus(order));
    const orderItems = order.items || [];
    const visibleItems = orderItems.slice(0, 3);
    const remainingCount = orderItems.length - 3;
    const isExpanded = expandedOrder === key;
    const showTracking = trackingVisible === key;
    const number = order.orderNumber || `#${order.id}`;
    const headingId = `${uid}order-${key}`;
    const trackingId = `${uid}tracking-${key}`;
    const detailsId = `${uid}details-${key}`;
    const busy = cancellingId === order.id;

    return (
      <li key={key}>
        <article className={cx("sf-card sf-card--hairline", styles.card)} aria-labelledby={headingId}>
          <div className={styles.cardHead}>
            <div className={styles.identity}>
              <div className={styles.numberRow}>
                <h3
                  id={headingId}
                  ref={(node) => {
                    if (node) headingRefs.current.set(key, node);
                    else headingRefs.current.delete(key);
                  }}
                  className={styles.number}
                  tabIndex={-1}
                  data-order-heading=""
                >
                  <span className="sf-visually-hidden">Order </span>
                  {number}
                </h3>
                {copyButton(order.orderNumber || order.id, "Order number", `Copy order number ${number}`)}
              </div>
              {order.createdAt && (
                <p className={styles.placed}>
                  Placed on <time dateTime={order.createdAt}>{formatDateIN(order.createdAt)}</time>
                </p>
              )}
            </div>
            {statusBadge(statusInfo)}
          </div>

          <div className={styles.cardBody}>
            {visibleItems.length > 0 && (
              <ul className={styles.thumbs} aria-label="Items in this order">
                {visibleItems.map((item, i) => (
                  <li key={i} className={styles.thumb}>
                    <img
                      src={item.image || PLACEHOLDER_IMG}
                      alt={item.name || "Product"}
                      width="56"
                      height="70"
                      loading="lazy"
                      decoding="async"
                      onError={onImageError}
                    />
                  </li>
                ))}
                {remainingCount > 0 && <li className={styles.more}>+{remainingCount} more</li>}
              </ul>
            )}
            <p className={styles.total}>
              <span className={styles.totalLabel}>Total</span>
              <span className={styles.totalValue}>{formatCurrency(order.total)}</span>
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={cx("sf-btn sf-btn--ghost", styles.action)}
              aria-expanded={showTracking}
              aria-controls={trackingId}
              onClick={() =>
                setTrackingVisible(
                  showTracking ? null : order.id || order.orderNumber
                )
              }
            >
              Track
              <span className="sf-visually-hidden"> order {number}</span>
              <ChevronDown />
            </button>
            <button
              type="button"
              className={cx("sf-btn sf-btn--ghost", styles.action)}
              aria-expanded={isExpanded}
              aria-controls={detailsId}
              onClick={() =>
                setExpandedOrder(
                  isExpanded ? null : order.id || order.orderNumber
                )
              }
            >
              Details
              <span className="sf-visually-hidden"> of order {number}</span>
              <ChevronDown />
            </button>
            {isReturnEligible(order) && (
              <Link to={supportReturnPath(order)} className={cx("sf-btn sf-btn--ghost", styles.action)}>
                Return or exchange
                <span className="sf-visually-hidden"> order {number}</span>
              </Link>
            )}
            {isCancellable(order) && (
              <button
                type="button"
                className={cx("sf-btn", styles.action, styles.cancel)}
                onClick={(event) => handleCancelOrder(order, event)}
                aria-haspopup="dialog"
                aria-disabled={cancellingId !== null || undefined}
                data-busy={busy || undefined}
              >
                {busy ? (
                  "Cancelling…"
                ) : (
                  <>
                    Cancel order
                    <span className="sf-visually-hidden"> {number}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* The panels' ids stay in the page, so aria-controls always points at them. */}
          <div id={trackingId} className={styles.slot}>
            <AnimatePresence initial={false}>
              {showTracking && (
                <motion.div key="tracking" className={styles.reveal} {...panelMotion}>
                  {renderTracking(order, statusInfo)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div id={detailsId} className={styles.slot}>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div key="details" className={styles.reveal} {...panelMotion}>
                  {renderDetails(order)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </article>
      </li>
    );
  };

  // ---- States ----
  const renderSkeletons = () => (
    <>
      <p className="sf-visually-hidden">Loading your orders</p>
      <ul className={styles.list} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <div className={cx("sf-card sf-card--hairline", styles.card)}>
              <div className={styles.cardHead}>
                <div className={styles.identity}>
                  <span className={cx("sf-skeleton", styles.skNumber)} />
                  <span className={cx("sf-skeleton", styles.skDate)} />
                </div>
                <span className={cx("sf-skeleton", styles.skBadge)} />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.thumbs}>
                  {[0, 1].map((j) => (
                    <span key={j} className={cx("sf-skeleton", styles.thumb)} />
                  ))}
                </div>
                <span className={cx("sf-skeleton", styles.skTotal)} />
              </div>
              <div className={styles.actions}>
                <span className={cx("sf-skeleton", styles.action, styles.skAction)} />
                <span className={cx("sf-skeleton", styles.action, styles.skAction)} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );

  const renderResults = () => {
    if (showLoading) return renderSkeletons();
    if (fetchError) {
      // Never masquerade as "No orders yet."
      return (
        <div className={cx("sf-panel", styles.state)}>
          <h3 className={cx("sf-display-sm", styles.stateTitle)}>We couldn’t load your orders.</h3>
          <p className={styles.stateText}>Check your connection and try again.</p>
          <button ref={retryRef} type="button" className={cx("sf-btn sf-btn--primary", styles.stateAction)} onClick={retry}>
            Try again
          </button>
        </div>
      );
    }
    if (!hasOrders) {
      return (
        <div className={cx("sf-panel", styles.state)}>
          <h3 className={cx("sf-display-sm", styles.stateTitle)}>No orders yet.</h3>
          <p className={styles.stateText}>When you place an order, it appears here, ready to track.</p>
          <Link to="/products" className={cx("sf-btn sf-btn--primary", styles.stateAction)}>
            Browse furniture
          </Link>
        </div>
      );
    }
    if (filteredOrders.length === 0) {
      return (
        <div className={styles.noMatch}>
          <h3 className={cx("sf-display-sm", styles.stateTitle)}>No orders match.</h3>
          <p className={styles.stateText}>Try another order number or status.</p>
          <button type="button" className={cx("sf-btn sf-btn--ghost", styles.stateAction)} onClick={clearFilters}>
            Show all orders
          </button>
        </div>
      );
    }
    return <ul className={styles.list}>{paginatedOrders.map(renderOrder)}</ul>;
  };

  return (
    <AccountLayout active="orders" titleRef={titleRef}>
      <section
        ref={sectionRef}
        className={styles.section}
        aria-labelledby={`${uid}heading`}
        tabIndex={-1}
      >
        <div className={styles.head}>
          <div>
            <h2 id={`${uid}heading`} className={cx("sf-eyebrow", styles.heading)}>
              Orders
            </h2>
            <p className={styles.count} aria-live="polite" aria-atomic="true">
              {!showLoading && !fetchError && hasOrders ? countText : ""}
            </p>
          </div>
          <button
            type="button"
            className={cx("sf-btn sf-btn--ghost sf-btn--icon", styles.refresh)}
            onClick={refresh}
            aria-label="Refresh orders"
            aria-disabled={showLoading || undefined}
          >
            <RefreshIcon />
          </button>
        </div>

        {!fetchError && (showLoading || hasOrders) && (
          <div className={styles.toolbar}>
            <div className={cx("sf-field", styles.search)}>
              <label htmlFor={`${uid}search`}>Search by order number</label>
              <div className={styles.searchControl}>
                <SearchIcon />
                <input
                  ref={searchRef}
                  id={`${uid}search`}
                  type="search"
                  className={cx("sf-input", styles.searchInput)}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  enterKeyHint="search"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className={cx("sf-btn sf-btn--icon", styles.clearSearch)}
                    onClick={clearSearch}
                    aria-label="Clear search"
                  >
                    <ClearIcon />
                  </button>
                )}
              </div>
            </div>
            <div className={styles.filters} role="group" aria-label="Filter by status">
              {FILTER_OPTIONS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={cx("sf-chip", styles.filter)}
                  aria-pressed={activeFilter === filter}
                  // A pressed chip un-presses back to All.
                  onClick={() => setActiveFilter(activeFilter === filter && filter !== "All" ? "All" : filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.results} aria-busy={showLoading || undefined}>
          {renderResults()}
        </div>

        {!showLoading && !fetchError && totalPages > 1 && (
          <nav className={styles.pagination} aria-label="Pagination">
            <div className={styles.pager}>
              <button
                type="button"
                className={cx("sf-btn sf-btn--ghost", styles.pageStep, styles.pageStepPrevious)}
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
                aria-label="Previous page"
              >
                <span className="sf-btn__icon">
                  <ChevronLeft />
                </span>
                <span className={styles.pageStepWord}>Previous</span>
              </button>

              <ol className={styles.pages}>
                {pageRange(currentPage, totalPages).map((item, i) =>
                  item === "..." ? (
                    <li key={`ellipsis-${i}`} className={styles.ellipsis} aria-hidden="true">
                      &hellip;
                    </li>
                  ) : (
                    <li key={item}>
                      <button
                        type="button"
                        className={styles.pageButton}
                        aria-current={currentPage === item ? "page" : undefined}
                        aria-label={`Page ${item}`}
                        onClick={() => goToPage(item)}
                      >
                        {item}
                      </button>
                    </li>
                  )
                )}
              </ol>

              <button
                type="button"
                className={cx("sf-btn sf-btn--ghost", styles.pageStep, styles.pageStepNext)}
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
                aria-label="Next page"
              >
                <span className={styles.pageStepWord}>Next</span>
                <span className="sf-btn__icon">
                  <ChevronRight />
                </span>
              </button>
            </div>
            <p className={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </p>
          </nav>
        )}

        <p className="sf-visually-hidden" role="status">
          {announcement.text && <span key={announcement.key}>{announcement.text}</span>}
        </p>
      </section>

      <ReviewModal
        open={reviewModal.open}
        onClose={closeReviewModal}
        product={reviewModal.product}
        existing={reviewModal.existing}
        onSubmit={handleSubmitReview}
        isDarkMode={isDarkMode}
      />
    </AccountLayout>
  );
};

export {
  deriveOrderStatus,
  getStatusInfo,
  isReturnEligible,
  isCancellable,
  isReviewable,
  cancelRefundSentence,
  closedNote,
  supportReturnPath,
  STATUS_CONFIG,
  FILTER_OPTIONS,
  ORDERS_PER_PAGE,
  RETURN_WINDOW_DAYS,
};

export default OrderHistory;
