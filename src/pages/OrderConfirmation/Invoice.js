import React, { forwardRef, useEffect, useId, useState } from "react";
import apiService from "../../services/api";
import { BrandLogo } from "../../components/ui";
import { APP_NAME, SUPPORT_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE } from "../../utils/constants";
import { formatCurrency, formatDate, normalizeOrderAddress } from "../../utils/helpers";
import styles from "./Invoice.module.css";

// =============================================================================
// Invoice — the printable invoice on the order confirmation page (§37.6)
// =============================================================================
// A plain, print-first document built from the order the page has already
// loaded, plus the store's tax rate when settings can be read: the light logo
// on paper, the store's details (constants.js), the order number and date,
// bill-to and ship-to, the items table, the figures (the page's own, passed
// in, so the two can never disagree), the payment, and a system-generated
// note. No invoice number, GSTIN or registration number is printed: the store
// has not supplied them (BUILD_LOG, Prompt 27).
//
// The page renders it once the order is in, hidden on screen until "Print
// invoice" reveals it. While it is on the page, Invoice.module.css prints it
// alone, on A4, in ink, with no backgrounds, whatever the theme and whether
// or not it has been revealed. On screen it is a sheet of paper in both
// themes, so the light logo always sits on paper.
// =============================================================================

const cx = (...names) => names.filter(Boolean).join(" ");

// The store's rate beside "Tax", only when it accounts for the order's tax.
// An order does not record the rate it was taxed at, so a rate that no longer
// adds up to the figure (checkout's formula: the subtotal less the discount,
// times the rate, rounded) would print a claim the figure contradicts.
export const invoiceTaxLabel = (rate, { subtotal, discountAmount, taxAmount }) => {
  const pct = Number(rate);
  if (!Number.isFinite(pct) || pct <= 0) return "Tax";
  const base = Math.max(0, Number(subtotal) - (Number(discountAmount) || 0));
  if (!Number.isFinite(base) || !Number.isFinite(Number(taxAmount))) return "Tax";
  return Math.round(base * (pct / 100)) === Math.round(Number(taxAmount)) ? `Tax (${pct}% GST)` : "Tax";
};

const AddressLines = ({ address }) =>
  address ? (
    <div className={styles.lines}>
      {address.name && <p className={styles.name}>{address.name}</p>}
      {address.line1 && <p>{address.line1}</p>}
      {address.line2 && <p>{address.line2}</p>}
      {address.cityLine && <p>{address.cityLine}</p>}
      {address.country && <p>{address.country}</p>}
      {address.phone && <p className={styles.phone}>Phone: {address.phone}</p>}
    </div>
  ) : (
    <p className={styles.lines}>Not recorded</p>
  );

const Invoice = forwardRef(function Invoice(
  { id, hidden, order, orderNumber, items = [], shippingAddress, totals, payment, outcome = null },
  ref
) {
  const titleId = useId();
  const [taxRate, setTaxRate] = useState(null);

  // The one read of its own: the store's tax rate, for the tax row's label.
  // Without it (a failed read, no rate) the row says "Tax".
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => apiService.settings.get())
      .then((settings) => {
        if (active) setTaxRate(settings?.store?.taxRate ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const billingAddress = normalizeOrderAddress(order.billingAddress) || shippingAddress;
  // A variant column only when an item records its variant apart from its
  // name (checkout writes "Name - Variant" as the name, with no variantName).
  const hasVariants = items.some((item) => item.variantName);
  const {
    subtotal,
    discountAmount,
    couponCode,
    shippingAmount,
    taxAmount,
    total,
    storeCreditUsed,
    paidLabel,
    paidAmount,
  } = totals;

  return (
    <section ref={ref} id={id} className={styles.invoice} hidden={hidden} aria-labelledby={titleId}>
      <div className={styles.sheet}>
        <header className={styles.head}>
          <address className={styles.store}>
            {/* Eager: browsers do not load a lazy image for printing, and the
                section is hidden until "Print invoice" (or never shown at all
                when the browser's own Print is used). */}
            <BrandLogo variant="light" height={56} loading="eager" className={styles.logo} />
            <span className={styles.storeName}>{APP_NAME}</span>
            <span>{SUPPORT_ADDRESS}</span>
            <span>{SUPPORT_EMAIL}</span>
            <span>{SUPPORT_PHONE}</span>
          </address>
          <div className={styles.meta}>
            <h2 id={titleId} className={styles.title}>
              Invoice
            </h2>
            <dl className={styles.facts}>
              <div className={styles.fact}>
                <dt>Order number</dt>
                <dd>{orderNumber}</dd>
              </div>
              {order.createdAt && (
                <div className={styles.fact}>
                  <dt>Order date</dt>
                  <dd>
                    <time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time>
                  </dd>
                </div>
              )}
            </dl>
            {/* A cancelled, returned, failed or refunded order says so on the
                paper (the page's own sentence), so the invoice never reads as
                a standing sale. */}
            {outcome && <p className={styles.outcome}>{outcome}</p>}
          </div>
        </header>

        <div className={styles.parties}>
          <div>
            <h3 className={styles.label}>Bill to</h3>
            <AddressLines address={billingAddress} />
          </div>
          <div>
            <h3 className={styles.label}>Ship to</h3>
            <AddressLines address={shippingAddress} />
          </div>
        </div>

        <table className={styles.table}>
          {/* Named for screen readers only: the "Item" column says it on paper,
              and an in-flow caption makes Chromium break the page between it
              and the table under the named print page. */}
          <caption className="sf-visually-hidden">Items in order {orderNumber}</caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              {hasVariants && <th scope="col">Variant</th>}
              <th scope="col" className={styles.num}>
                Qty
              </th>
              <th scope="col" className={styles.num}>
                Unit price
              </th>
              <th scope="col" className={styles.num}>
                Line total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <th scope="row">{item.name || item.productName}</th>
                {hasVariants && (
                  <td>
                    {item.variantName || (
                      <>
                        <span aria-hidden="true">—</span>
                        <span className="sf-visually-hidden">None</span>
                      </>
                    )}
                  </td>
                )}
                <td className={styles.num}>{item.quantity}</td>
                <td className={styles.num}>{formatCurrency(item.price, item.currency)}</td>
                <td className={styles.num}>{formatCurrency(item.price * item.quantity, item.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className={styles.totals}>
          <div className={styles.row}>
            <dt>Subtotal</dt>
            <dd>{formatCurrency(subtotal)}</dd>
          </div>
          {discountAmount > 0 && (
            <div className={styles.row}>
              <dt>Discount{couponCode ? ` (${couponCode})` : ""}</dt>
              <dd>−{formatCurrency(discountAmount)}</dd>
            </div>
          )}
          <div className={styles.row}>
            <dt>Shipping</dt>
            <dd>{shippingAmount > 0 ? formatCurrency(shippingAmount) : "Free"}</dd>
          </div>
          <div className={styles.row}>
            <dt>{invoiceTaxLabel(taxRate, totals)}</dt>
            <dd>{formatCurrency(taxAmount)}</dd>
          </div>
          <div className={cx(styles.row, styles.rowTotal)}>
            <dt>Total</dt>
            <dd>{formatCurrency(total)}</dd>
          </div>
          {storeCreditUsed > 0 && (
            <>
              <div className={styles.row}>
                <dt>Store credit</dt>
                <dd>−{formatCurrency(storeCreditUsed)}</dd>
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

        <div className={styles.foot}>
          <dl className={styles.payment}>
            <div className={styles.fact}>
              <dt>Payment method</dt>
              <dd>{payment.method}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Payment status</dt>
              <dd>{payment.status}</dd>
            </div>
          </dl>
          <p className={styles.note}>This is a system-generated invoice.</p>
        </div>
      </div>
    </section>
  );
});

export default Invoice;
