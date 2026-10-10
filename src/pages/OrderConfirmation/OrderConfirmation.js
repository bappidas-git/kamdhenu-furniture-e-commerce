import React, { useEffect, useId, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiService from "../../services/api";
import {
  copyToClipboard,
  formatCurrency,
  formatDateIN,
  normalizeOrderAddress,
  onImageError,
  PLACEHOLDER_IMG,
} from "../../utils/helpers";
import { Reveal, staggerDelay } from "../../components/ui";
import Invoice from "./Invoice";
import styles from "./OrderConfirmation.module.css";

// =============================================================================
// Order confirmation (/order-confirmation/:orderNumber) — DESIGN_SYSTEM §37
// =============================================================================
// Where checkout lands once an order is placed. A calm, centred thank-you (a
// thin ink circle whose check draws itself, "Thank you, Bappi." in the serif,
// one line that says only what the order's status fields say, the order
// number in a hairline chip with a copy button), a hairline row of facts
// (delivery, payment, help), the summary card (items, delivery address, price
// details, the actions) and, hidden until "Print invoice" is used, a
// print-first invoice (Invoice.js), which is also what printing this page
// prints.
//
// What did not change: the read (orders.getByOrderNumber with the URL's
// number; the response normalised as data → order → the response itself),
// the three states (loading; a failed read, which offers a retry and never
// claims the order does not exist; no order), the derived figures and their
// fallbacks (taxAmount ?? tax, shippingAmount ?? shipping, discountAmount ??
// 0, amountPayable ?? the total less the store credit), the payment-status
// switch's cases, and where the actions lead (Track order and My orders →
// /orders, Back to home → /). "Continue shopping" opens /products (the brief's
// design; it opened /).
//
// The delivery line no longer invents a date. An order does not record its
// delivery method, so the old "placed + 5 days" estimate is gone: a delivered
// order shows the day it arrived, a shipped one says so, and an order still
// being prepared says what happens next.
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

// Payment methods by checkout's names (Order History's list); any other value
// reads as it did before.
const PAYMENT_METHOD_LABELS = {
  card: "Credit or debit card",
  upi: "UPI",
  net_banking: "Net banking",
  wallet: "Wallet",
  cod: "Cash on Delivery",
  store_credit: "Store credit",
};

export const paymentMethodLabel = (method) =>
  method ? PAYMENT_METHOD_LABELS[method] || method.replace(/_/g, " ").toUpperCase() : "Not recorded";

// Where the order stands, read from its three status fields in the order
// Order History's deriveOrderStatus reads them. The eyebrow, the mark, the
// line under the thank-you and the delivery fact follow it, so the page never
// says more than the fields do (a cancelled order is not "being prepared").
export const orderStage = (order) => {
  if (order.fulfillmentStatus === "returned") return "returned";
  if (order.fulfillmentStatus === "cancelled") return "cancelled";
  if (order.paymentStatus === "failed") return "failed";
  if (order.paymentStatus === "refunded") return "refunded";
  if (order.shippingStatus === "delivered") return "delivered";
  if (order.shippingStatus === "shipped") return "shipped";
  return "placed";
};

const CLOSED_STAGES = ["returned", "cancelled", "failed", "refunded"];

const EYEBROW = {
  placed: "Order confirmed",
  shipped: "Order confirmed",
  delivered: "Order confirmed",
  cancelled: "Order cancelled",
  returned: "Order returned",
  failed: "Payment failed",
  refunded: "Order refunded",
};

// The line under the thank-you. While the order is being prepared it follows
// the payment (cash on delivery to collect, or received); a shipped or
// delivered order says so; a closed order gets Order History's sentence.
export const headlineFor = (
  order,
  stage = orderStage(order),
  isPaymentPending = order.paymentStatus === "pending"
) => {
  const payOnDelivery = isPaymentPending && order.paymentMethod === "cod";
  switch (stage) {
    case "returned":
      return "This order was returned.";
    case "cancelled":
      return order.cancelledAt
        ? `This order was cancelled on ${formatDateIN(order.cancelledAt)}.`
        : "This order was cancelled.";
    case "failed":
      return "The payment for this order didn’t go through.";
    case "refunded":
      return "The payment for this order was refunded.";
    case "delivered":
      return "Your order was delivered.";
    case "shipped":
      return payOnDelivery ? "Your order is on its way. Pay when it arrives." : "Your order is on its way.";
    default:
      if (payOnDelivery) return "Your order is placed. Pay when it arrives.";
      if (order.paymentStatus === "paid") return "Your payment was received and your order is being prepared.";
      if (isPaymentPending) return "Your order is placed. Its payment is still pending.";
      return "Your order is placed.";
  }
};

// The delivery fact. There is no estimate to give (the order does not store
// its delivery method), so: the day a delivered order arrived (deliveredAt,
// else updatedAt, as before), "shipped" for a shipped one, a plain "not
// shipped" for a closed one, and what happens next for the rest.
export const deliveryFor = (
  order,
  stage = orderStage(order),
  isDelivered = order.shippingStatus === "delivered"
) => {
  if (isDelivered) {
    const deliveredOn = order.deliveredAt || order.updatedAt;
    return deliveredOn ? `Delivered on ${formatDateIN(deliveredOn)}.` : "Delivered.";
  }
  if (order.shippingStatus === "shipped") return "Your order has shipped.";
  if (CLOSED_STAGES.includes(stage)) return "This order was not shipped.";
  return "We’ll email tracking details when your order ships.";
};

// The last row of the price details when store credit was used, named for
// what happened (Order History's rule): "Amount due" while the payment is
// still to be collected, no row once it was voided or failed, else "Amount
// paid".
export const paidRowLabel = (order) => {
  if (order.paymentStatus === "pending") return "Amount due";
  if (["voided", "failed"].includes(order.paymentStatus)) return null;
  return "Amount paid";
};

// Glyphs (strokes in currentColor)
const Icon = ({ children, className }) => (
  <svg
    className={className}
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
    {children}
  </svg>
);

const CopyIcon = () => (
  <Icon>
    <rect x="9" y="9" width="11" height="11" rx="1" />
    <path d="M15 9V5a1 1 0 00-1-1H5a1 1 0 00-1 1v9a1 1 0 001 1h4" />
  </Icon>
);

const CheckIcon = ({ className }) => (
  <Icon className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

// A thin ink circle; the check draws itself in one stroke (static under
// reduced motion). Once drawn it stays drawn: printing hides the thank-you
// and shows it again, which would otherwise restart the animation.
const ConfirmedMark = () => {
  const [drawn, setDrawn] = useState(false);
  return (
    <svg className={styles.mark} viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">
      <circle className={styles.markRing} cx="32" cy="32" r="31.5" />
      <path
        className={cx(styles.markCheck, drawn && styles.markDrawn)}
        d="M21 33l7.5 7.5L43.5 25"
        pathLength="1"
        onAnimationEnd={() => setDrawn(true)}
      />
    </svg>
  );
};

const OrderConfirmation = () => {
  const { orderNumber } = useParams();
  const uid = useId();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  // The copy button's note ("Copied" / "Couldn’t copy"), over the button for
  // two seconds in a polite live region; a new key re-announces a repeat.
  const [copyNote, setCopyNote] = useState({ key: 0, text: "", copied: false });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [printRequest, setPrintRequest] = useState(0);
  const [announcement, setAnnouncement] = useState({ key: 0, text: "" });

  const titleRef = useRef(null);
  const retryRef = useRef(null);
  const invoiceRef = useRef(null);
  const copyTimer = useRef(null);
  const retrying = useRef(false);
  const revealingInvoice = useRef(false);

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  const fetchOrder = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const response = await apiService.orders.getByOrderNumber(orderNumber);
      const data = response?.data || response?.order || response;
      setOrder(data || null);
    } catch (err) {
      // A failed request is not "order not found" — offer a retry instead.
      console.error("Failed to fetch order:", err);
      setOrder(null);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  // "Try again" runs the same read; focus follows it (below).
  const handleRetry = () => {
    retrying.current = true;
    fetchOrder();
  };

  // Focus follows the read. After "Try again": the loading line while it
  // runs, then the result (the new "Try again" if it failed again). On
  // arrival: the page's h1 once the read has settled, so a screen reader
  // hears the outcome of the order, but only when focus is nowhere yet (it is
  // never taken from where the shopper has put it).
  useEffect(() => {
    if (loading) {
      if (retrying.current) titleRef.current?.focus({ preventScroll: true });
      return;
    }
    const afterRetry = retrying.current;
    retrying.current = false;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const target = afterRetry && fetchError ? retryRef.current : titleRef.current;
    target?.focus({ preventScroll: true });
  }, [loading, fetchError]);

  // Copy the order number: a check on the button and "Copied" over it for two
  // seconds, announced; a refused copy says so (the old handler always
  // claimed success).
  const handleCopyOrderNumber = async () => {
    const text = order?.orderNumber || orderNumber;
    const copied = await copyToClipboard(String(text));
    clearTimeout(copyTimer.current);
    setCopyNote((previous) => ({ key: previous.key + 1, text: copied ? "Copied" : "Couldn’t copy", copied }));
    copyTimer.current = setTimeout(() => setCopyNote((previous) => ({ ...previous, text: "", copied: false })), 2000);
  };

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  // "Print invoice": the invoice comes into view under the summary, then the
  // browser's print dialog opens once its logo has loaded (at most 3 seconds:
  // the store's name is printed beside it anyway). The print stylesheet
  // prints the invoice alone, so the browser's own Print prints it too.
  const handlePrintInvoice = () => {
    revealingInvoice.current = !invoiceOpen;
    setInvoiceOpen(true);
    setPrintRequest((count) => count + 1);
  };

  useEffect(() => {
    if (!printRequest) return undefined;
    let settled = false;
    let frame = 0;
    const logo = invoiceRef.current?.querySelector("img");
    const print = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      frame = window.requestAnimationFrame(() => {
        window.print();
        if (revealingInvoice.current) {
          revealingInvoice.current = false;
          setAnnouncement((previous) => ({ key: previous.key + 1, text: "Your invoice is below the order summary." }));
        }
      });
    };
    const timer = setTimeout(print, 3000);
    if (!logo || logo.complete) {
      print();
    } else {
      logo.addEventListener("load", print, { once: true });
      logo.addEventListener("error", print, { once: true });
    }
    return () => {
      settled = true;
      clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      logo?.removeEventListener("load", print);
      logo?.removeEventListener("error", print);
    };
  }, [printRequest]);

  // Loading: the thank-you, the facts and the card as placeholders.
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={cx("sf-container sf-container--narrow", styles.layout)}>
          <h1 ref={titleRef} tabIndex={-1} className={cx("sf-visually-hidden", styles.title)}>
            Loading your order
          </h1>
          <div className={styles.layout} aria-busy="true">
            <div className={styles.skHero} aria-hidden="true">
              <span className={cx("sf-skeleton sf-skeleton--circle", styles.skMark)} />
              <span className={cx("sf-skeleton", styles.skEyebrow)} />
              <span className={cx("sf-skeleton", styles.skTitle)} />
              <span className={cx("sf-skeleton", styles.skLead)} />
              <span className={cx("sf-skeleton", styles.skChip)} />
            </div>
            <div className={styles.skFacts} aria-hidden="true">
              {[0, 1, 2].map((index) => (
                <div key={index} className={styles.skFact}>
                  <span className={cx("sf-skeleton", styles.skLabel)} />
                  <span className={cx("sf-skeleton", styles.skText)} />
                </div>
              ))}
            </div>
            <div className={cx("sf-card sf-card--hairline", styles.summary)} aria-hidden="true">
              <span className={cx("sf-skeleton", styles.skHeading)} />
              <div className={styles.items}>
                {[0, 1].map((index) => (
                  <div key={index} className={styles.item}>
                    <span className={cx("sf-skeleton sf-skeleton--image", styles.skThumb)} />
                    <span className={styles.skItemText}>
                      <span className={cx("sf-skeleton", styles.skText)} />
                      <span className={cx("sf-skeleton", styles.skShort)} />
                    </span>
                    <span className={cx("sf-skeleton", styles.skAmount)} />
                  </div>
                ))}
              </div>
              <div className={styles.details}>
                <span className={styles.skBlock}>
                  <span className={cx("sf-skeleton", styles.skLabel)} />
                  <span className={cx("sf-skeleton", styles.skText)} />
                  <span className={cx("sf-skeleton", styles.skShort)} />
                </span>
                <span className={styles.skBlock}>
                  <span className={cx("sf-skeleton", styles.skLabel)} />
                  <span className={cx("sf-skeleton", styles.skText)} />
                  <span className={cx("sf-skeleton", styles.skText)} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch failed — distinct from "not found" so a flaky network never claims
  // the order doesn't exist.
  if (fetchError) {
    return (
      <div className={styles.page}>
        <div className="sf-container sf-container--narrow">
          <div className={cx("sf-panel", styles.state)}>
            <h1 ref={titleRef} tabIndex={-1} className={cx("sf-display-sm", styles.stateTitle)}>
              We couldn&rsquo;t load your order.
            </h1>
            <p className={styles.stateText}>
              Check your connection and try again.
            </p>
            <div className={styles.stateActions}>
              <button ref={retryRef} type="button" className="sf-btn sf-btn--primary" onClick={handleRetry}>
                Try again
              </button>
              <Link to="/orders" className="sf-btn sf-btn--ghost">
                My orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Order not found
  if (!order) {
    return (
      <div className={styles.page}>
        <div className="sf-container sf-container--narrow">
          <div className={cx("sf-panel", styles.state)}>
            <h1 ref={titleRef} tabIndex={-1} className={cx("sf-display-sm", styles.stateTitle)}>
              We couldn&rsquo;t find this order.
            </h1>
            <p className={styles.stateText}>
              Check that {orderNumber} is the right number, or find the order in My orders.
            </p>
            <div className={styles.stateActions}>
              <Link to="/" className="sf-btn sf-btn--primary">
                Back to home
              </Link>
              <Link to="/orders" className="sf-btn sf-btn--ghost">
                My orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const orderItems = order.items || [];
  // Orders store taxAmount/shippingAmount/discountAmount (the canonical shape
  // checkout writes); older field names are kept as fallbacks.
  const taxAmount = order.taxAmount ?? order.tax ?? 0;
  const shippingAmount = order.shippingAmount ?? order.shipping ?? 0;
  const discountAmount = order.discountAmount ?? 0;
  const isPaymentPending = order.paymentStatus === "pending";
  const shippingAddr = normalizeOrderAddress(order.shippingAddress);
  const isDelivered = order.shippingStatus === "delivered";

  const stage = orderStage(order);
  const closed = CLOSED_STAGES.includes(stage);
  // Quiet: muted text on sand (a refund, a payment never taken).
  const quiet = `sf-badge--sand ${styles.badgeQuiet}`;

  // Badge text mirrors the order's real paymentStatus — never a hardcoded
  // "successful". Cash on delivery reads "Pay on delivery" only while the
  // order can still arrive.
  const paymentStatusInfo = (() => {
    switch (order.paymentStatus) {
      case "paid":
        return { label: "Paid", modifier: "sf-badge--success" };
      case "failed":
        return { label: "Failed", modifier: "sf-badge--error" };
      case "refunded":
        return { label: "Refunded", modifier: quiet };
      case "partially_refunded":
        return { label: "Partially refunded", modifier: quiet };
      case "voided":
        return { label: "Not charged", modifier: quiet };
      default:
        if (closed) return { label: "Not charged", modifier: quiet };
        return order.paymentMethod === "cod"
          ? { label: "Pay on delivery", modifier: "sf-badge--info" }
          : { label: "Pending", modifier: "sf-badge--warning" };
    }
  })();

  const displayNumber = order.orderNumber || orderNumber;
  const firstName =
    typeof order.shippingAddress?.firstName === "string" ? order.shippingAddress.firstName.trim() : "";
  const storeCreditUsed = order.storeCreditUsed ?? 0;
  const paidLabel = paidRowLabel(order);
  const paidAmount = order.amountPayable ?? Math.max(0, order.total - order.storeCreditUsed);
  const showsTracking = order.shippingStatus === "shipped" && Boolean(order.trackingNumber);
  const supportPath = `/support?${new URLSearchParams({ order: displayNumber }).toString()}`;
  const summaryId = `${uid}summary`;
  const invoiceId = `${uid}invoice`;

  return (
    <div className={styles.page}>
      <div className={cx("sf-container sf-container--narrow", styles.layout)}>
        <Reveal as="header" className={styles.hero}>
          {!closed && <ConfirmedMark />}
          <p className={cx("sf-eyebrow", styles.eyebrow)}>{EYEBROW[stage]}</p>
          <h1 ref={titleRef} tabIndex={-1} className={cx("sf-display-lg", styles.title)}>
            {firstName ? (
              <>
                Thank you, <em>{firstName}</em>.
              </>
            ) : (
              "Thank you."
            )}
          </h1>
          <p className={styles.lead}>{headlineFor(order, stage, isPaymentPending)}</p>

          <div className={styles.chip}>
            <p className={styles.chipText}>
              <span className={styles.chipLabel}>Order number</span>
              <span className={styles.chipValue}>{displayNumber}</span>
            </p>
            <span className={styles.copyWrap}>
              <button
                type="button"
                className={cx("sf-btn sf-btn--icon", styles.copy)}
                onClick={handleCopyOrderNumber}
                aria-label={`Copy order number ${displayNumber}`}
                data-copied={copyNote.copied || undefined}
              >
                {copyNote.copied ? <CheckIcon className="sf-fade-in" /> : <CopyIcon />}
              </button>
              <span role="status" className={styles.copyStatus}>
                {copyNote.text && (
                  <span key={copyNote.key} className={cx("sf-fade-in", styles.copyBubble)}>
                    {copyNote.text}
                  </span>
                )}
              </span>
            </span>
          </div>

          {order.createdAt && (
            <p className={styles.placed}>
              Placed on <time dateTime={order.createdAt}>{formatDateIN(order.createdAt)}</time>
            </p>
          )}
        </Reveal>

        <Reveal as="dl" className={styles.facts} delay={staggerDelay(1)}>
          <div className={styles.fact}>
            <dt className="sf-eyebrow">Delivery</dt>
            <dd className={styles.factValue}>
              <p>{deliveryFor(order, stage, isDelivered)}</p>
              {showsTracking && <p className={styles.factMeta}>Tracking number {order.trackingNumber}</p>}
            </dd>
          </div>
          <div className={styles.fact}>
            <dt className="sf-eyebrow">Payment</dt>
            <dd className={styles.factValue}>
              <p>{paymentMethodLabel(order.paymentMethod)}</p>
              <span className={cx("sf-badge", paymentStatusInfo.modifier)}>{paymentStatusInfo.label}</span>
            </dd>
          </div>
          <div className={styles.fact}>
            <dt className="sf-eyebrow">Help</dt>
            <dd className={styles.factValue}>
              <p>
                Questions?{" "}
                <Link to={supportPath} className={cx("sf-btn sf-btn--link", styles.inlineLink)}>
                  Contact us
                </Link>
              </p>
            </dd>
          </div>
        </Reveal>

        <Reveal
          as="section"
          className={cx("sf-card sf-card--hairline", styles.summary)}
          delay={staggerDelay(2)}
          aria-labelledby={summaryId}
        >
          <div className={styles.summaryHead}>
            <h2 id={summaryId} className={cx("sf-display-sm", styles.summaryTitle)}>
              Order summary
            </h2>
            <p className={styles.count}>
              {orderItems.length} item{orderItems.length !== 1 ? "s" : ""}
            </p>
          </div>

          <ul className={styles.items}>
            {orderItems.map((item, index) => (
              <li key={index} className={styles.item}>
                <span className={styles.thumb}>
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
                <div className={styles.itemText}>
                  <p className={styles.itemName}>{item.name || item.productName}</p>
                  {item.variantName && <p className={styles.itemMeta}>{item.variantName}</p>}
                  <p className={styles.itemMeta}>Qty: {item.quantity}</p>
                </div>
                <p className={styles.itemTotal}>
                  <span className="sf-visually-hidden">Line total </span>
                  {formatCurrency(item.price * item.quantity, item.currency)}
                </p>
              </li>
            ))}
          </ul>

          <div className={styles.details}>
            <div className={styles.block}>
              <h3 className={cx("sf-eyebrow", styles.blockTitle)}>Delivery address</h3>
              {shippingAddr ? (
                <div className={styles.lines}>
                  {shippingAddr.name && <p className={styles.lineStrong}>{shippingAddr.name}</p>}
                  {shippingAddr.line1 && <p>{shippingAddr.line1}</p>}
                  {shippingAddr.line2 && <p>{shippingAddr.line2}</p>}
                  {shippingAddr.cityLine && <p>{shippingAddr.cityLine}</p>}
                  {shippingAddr.country && <p>{shippingAddr.country}</p>}
                  {shippingAddr.phone && <p className={styles.phone}>Phone: {shippingAddr.phone}</p>}
                </div>
              ) : (
                <p className={styles.muted}>No delivery address recorded</p>
              )}
            </div>

            <div className={styles.block}>
              <h3 className={cx("sf-eyebrow", styles.blockTitle)}>Price details</h3>
              <dl className={styles.totals}>
                <div className={styles.row}>
                  <dt>Subtotal</dt>
                  <dd>{formatCurrency(order.subtotal)}</dd>
                </div>
                {discountAmount > 0 && (
                  <div className={styles.row}>
                    <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                    <dd>−{formatCurrency(discountAmount)}</dd>
                  </div>
                )}
                <div className={styles.row}>
                  <dt>Delivery</dt>
                  <dd>{shippingAmount > 0 ? formatCurrency(shippingAmount) : "Free"}</dd>
                </div>
                <div className={styles.row}>
                  <dt>Tax</dt>
                  <dd>{formatCurrency(taxAmount)}</dd>
                </div>
                <div className={cx(styles.row, styles.rowTotal)}>
                  <dt>Total</dt>
                  <dd>{formatCurrency(order.total)}</dd>
                </div>
                {storeCreditUsed > 0 && (
                  <>
                    <div className={styles.row}>
                      <dt>Store credit</dt>
                      <dd>−{formatCurrency(order.storeCreditUsed)}</dd>
                    </div>
                    {paidLabel && (
                      <div className={cx(styles.row, styles.rowPaid)}>
                        <dt>{paidLabel}</dt>
                        <dd>{formatCurrency(paidAmount)}</dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
            </div>
          </div>

          <div className={styles.actions}>
            <Link to="/orders" className={cx("sf-btn sf-btn--primary", styles.action)}>
              Track order
            </Link>
            <button
              type="button"
              className={cx("sf-btn sf-btn--ghost", styles.action)}
              onClick={handlePrintInvoice}
              aria-controls={invoiceId}
            >
              Print invoice
            </button>
            <Link to="/products" className={cx("sf-btn sf-btn--link", styles.continue)}>
              Continue shopping
            </Link>
          </div>
        </Reveal>

        <Invoice
          ref={invoiceRef}
          id={invoiceId}
          hidden={!invoiceOpen}
          order={order}
          orderNumber={displayNumber}
          items={orderItems}
          shippingAddress={shippingAddr}
          totals={{
            subtotal: order.subtotal,
            discountAmount,
            couponCode: order.couponCode,
            shippingAmount,
            taxAmount,
            total: order.total,
            storeCreditUsed,
            paidLabel,
            paidAmount,
          }}
          payment={{ method: paymentMethodLabel(order.paymentMethod), status: paymentStatusInfo.label }}
        />

        <p className="sf-visually-hidden" role="status">
          {announcement.text && <span key={announcement.key}>{announcement.text}</span>}
        </p>
      </div>
    </div>
  );
};

export default OrderConfirmation;
