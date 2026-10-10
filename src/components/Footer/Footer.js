import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMediaQuery } from "@mui/material";
import { useDealsConfig } from "../../context/DealsConfigContext";
import apiService from "../../services/api";
import { categoryParam, getMainMenuCategories } from "../../utils/categories";
import {
  APP_NAME,
  SOCIAL_LINKS,
  SUPPORT_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE,
} from "../../utils/constants";
import { STOREFRONT_CONFIG, resolveTrustBadgeDetail } from "../../theme/tokens";
import { BRAND_PROMISE } from "../../content/brandContent";
import { BrandLogo, Reveal } from "../ui";
import Newsletter from "../Newsletter/Newsletter";
import styles from "./Footer.module.css";

// =============================================================================
// Footer — navy in both modes
// =============================================================================
//
//   newsletter band   the site's one sign-up form (Newsletter), revealed
//   columns           brand (white logo, promise, social) · Shop · Help ·
//                     Contact; 4/2/2/4 of 12 from 1024px, two columns from
//                     768px, stacked below with Shop/Help/Contact collapsing
//                     behind their headings
//   trust bar         only promises the data backs, plus the payment marks
//   bottom bar        copyright, legal links, currency note
//
// Data: categories (the departments), settings (COD) and shipping methods
// (free-delivery threshold), each read once on mount. The links never wait
// for them; until a read settles its items are simply not shown, and a
// failed read counts as no data, so the footer can never claim something
// the store has not confirmed.
// =============================================================================

const SHOP_LINKS = [
  { label: "All furniture", to: "/products" },
  { label: "New arrivals", to: "/products?sort=newest" },
  { label: "Most reviewed", to: "/products?sort=popular" },
];

const HELP_LINKS = [
  { label: "My account", to: "/profile" },
  { label: "Track order", to: "/orders" },
  { label: "Help centre", to: "/help" },
  { label: "Returns & refunds", to: "/refund" },
  { label: "Contact us", to: "/support" },
  { label: "Our story", to: "/about" },
];

const LEGAL_LINKS = [
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
  { label: "Cookies", to: "/cookies" },
];

// Brand glyphs, drawn in currentColor. Only profiles with a URL in
// SOCIAL_LINKS are shown.
const SOCIAL = [
  {
    key: "WHATSAPP",
    label: "WhatsApp",
    path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  },
  {
    key: "INSTAGRAM",
    label: "Instagram",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  {
    key: "FACEBOOK",
    label: "Facebook",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    key: "YOUTUBE",
    label: "YouTube",
    path: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  {
    key: "TWITTER",
    label: "X (Twitter)",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
];

// Outline icons for the trust bar (the same drawings as the product page's
// TrustBadges), stroked in currentColor.
const TRUST_ICONS = {
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </>
  ),
  cash: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  rotate: (
    <>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </>
  ),
  truck: (
    <>
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </>
  ),
};

// The accepted-payment marks: one-colour line drawings on a 48 × 32 card
// (the frame is drawn by CSS-coloured strokes, the marks in currentColor).
// Cards and UPI match the checkout's options; COD shows only while the
// store has cash on delivery switched on.
const CardFrame = () => <rect className={styles.markFrame} x="0.5" y="0.5" width="47" height="31" rx="3.5" />;
const PAYMENT_MARKS = [
  {
    id: "visa",
    label: "Visa",
    art: (
      <text
        x="24"
        y="20.5"
        textAnchor="middle"
        fontSize="12.5"
        fontStyle="italic"
        className={styles.markText}
      >
        VISA
      </text>
    ),
  },
  {
    id: "mastercard",
    label: "Mastercard",
    art: (
      <>
        <circle cx="19.5" cy="16" r="7" className={styles.markRing} />
        <circle cx="28.5" cy="16" r="7" className={styles.markRing} />
      </>
    ),
  },
  {
    id: "upi",
    label: "UPI",
    art: (
      <text x="24" y="20.5" textAnchor="middle" fontSize="12" className={styles.markText}>
        UPI
      </text>
    ),
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    cod: true,
    art: (
      <text x="24" y="20" textAnchor="middle" fontSize="10.5" className={styles.markText}>
        COD
      </text>
    ),
  },
];

const cx = (...names) => names.filter(Boolean).join(" ");
const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, "")}`;
const NewTab = () => <span className="sf-visually-hidden"> (opens in a new tab)</span>;

// Categories, settings and shipping methods, each read once. A failed read
// leaves the empty value in place (no departments, no COD, no threshold).
const useFooterData = () => {
  const [data, setData] = useState({ categories: [], settings: null, shipping: null });

  useEffect(() => {
    let active = true;
    const read = (key, request, normalise) =>
      request()
        .then(normalise)
        .catch(() => normalise(null))
        .then((value) => {
          if (active) setData((prev) => ({ ...prev, [key]: value }));
        });
    const list = (value) => (Array.isArray(value) ? value : []);
    read("categories", () => apiService.categories.getAll(), list);
    read("settings", () => apiService.settings.get(), (value) => value || {});
    read("shipping", () => apiService.shipping.getMethods(), list);
    return () => {
      active = false;
    };
  }, []);

  return data;
};

// A link column. On phones the heading becomes a disclosure button that
// shows and hides the list; from 768px the list is always shown.
const FooterColumn = ({ id, title, collapsible, open, onToggle, className, children }) => {
  const panelId = `sf-footer-${id}`;
  return (
    <div className={cx(styles.column, className)}>
      <h2 className={styles.heading}>
        {collapsible ? (
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
          >
            {title}
            <span className={styles.toggleIcon} aria-hidden="true" />
          </button>
        ) : (
          title
        )}
      </h2>
      <div id={panelId} className={styles.panel} hidden={collapsible && !open}>
        {children}
      </div>
    </div>
  );
};

const LinkList = ({ links, className, ...rest }) => (
  <ul className={cx(styles.links, className)} {...rest}>
    {links.map((link) => (
      <li key={link.to}>
        <Link to={link.to} className={styles.link}>
          {link.label}
        </Link>
      </li>
    ))}
  </ul>
);

const Footer = () => {
  const { enabled: dealsEnabled, loading: dealsLoading } = useDealsConfig();
  const { categories, settings, shipping } = useFooterData();
  const collapsible = useMediaQuery("(max-width: 767.98px)", { noSsr: true });
  const [openColumns, setOpenColumns] = useState({});
  const toggleColumn = (id) => setOpenColumns((prev) => ({ ...prev, [id]: !prev[id] }));

  // One "Offers" link, only once the deals page is known to be on.
  const showOffers = dealsEnabled && !dealsLoading;
  const shopLinks = useMemo(
    () => (showOffers ? [...SHOP_LINKS, { label: "Offers", to: "/special-offers" }] : SHOP_LINKS),
    [showOffers]
  );

  // The admin-curated departments, with the header's canonical links.
  const departments = useMemo(
    () =>
      getMainMenuCategories(categories).map((category) => ({
        label: category.name,
        to: `/products?category=${categoryParam(category)}`,
      })),
    [categories]
  );

  // The same rules as the product page's TrustBadges (resolveTrustBadgeDetail).
  const codAvailable = resolveTrustBadgeDetail("cod", { settings }) !== null;
  const trustItems = useMemo(() => {
    const days = STOREFRONT_CONFIG.returnsWindowDays;
    const freeDelivery = resolveTrustBadgeDetail("freeShipping", { shipping });
    return [
      { id: "securePayment", icon: "lock", label: "Secure payment" },
      codAvailable && { id: "cod", icon: "cash", label: "Cash on Delivery" },
      resolveTrustBadgeDetail("easyReturns") !== null && {
        id: "easyReturns",
        icon: "rotate",
        label: "Easy returns",
        detail: `${days} ${days === 1 ? "day" : "days"}`,
      },
      freeDelivery && { id: "freeShipping", icon: "truck", label: "Free delivery", detail: freeDelivery },
    ].filter(Boolean);
  }, [codAvailable, shipping]);

  const paymentMarks = PAYMENT_MARKS.filter((mark) => !mark.cod || codAvailable);
  const socialLinks = SOCIAL.map((s) => ({ ...s, url: SOCIAL_LINKS[s.key] })).filter((s) => s.url);
  const year = new Date().getFullYear();

  const column = (id) => ({
    id,
    collapsible,
    open: Boolean(openColumns[id]),
    onToggle: () => toggleColumn(id),
  });

  return (
    <footer className={styles.footer} aria-label="Footer">
      <div className="sf-container sf-container--wide">
        <Reveal className={styles.band}>
          <Newsletter />
        </Reveal>

        <div className={styles.columns}>
          <div className={styles.brand}>
            <Link to="/" className={styles.logoLink}>
              <BrandLogo variant="white" height={40} />
            </Link>
            <p className={styles.promise}>{BRAND_PROMISE}</p>
            {socialLinks.length > 0 && (
              <ul className={styles.social} aria-label="Social media">
                {socialLinks.map((social) => (
                  <li key={social.key}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialLink}
                      aria-label={`${social.label} (opens in a new tab)`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="currentColor"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d={social.path} />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <FooterColumn title="Shop" className={styles.shop} {...column("shop")}>
            <LinkList links={shopLinks} />
            {departments.length > 0 && (
              <LinkList links={departments} className={styles.departments} aria-label="Departments" />
            )}
          </FooterColumn>

          <FooterColumn title="Help" className={styles.help} {...column("help")}>
            <LinkList links={HELP_LINKS} />
          </FooterColumn>

          <FooterColumn title="Contact" className={styles.contact} {...column("contact")}>
            <address className={styles.address}>
              <ul className={styles.contactList}>
                {SUPPORT_ADDRESS && <li className={styles.contactText}>{SUPPORT_ADDRESS}</li>}
                {SUPPORT_EMAIL && (
                  <li>
                    <a href={`mailto:${SUPPORT_EMAIL}`} className={styles.link}>
                      {SUPPORT_EMAIL}
                    </a>
                  </li>
                )}
                {SUPPORT_PHONE && (
                  <li>
                    <a
                      href={telHref(SUPPORT_PHONE)}
                      className={styles.link}
                      aria-label={`Call ${SUPPORT_PHONE}`}
                    >
                      {SUPPORT_PHONE}
                    </a>
                  </li>
                )}
                {SOCIAL_LINKS.WHATSAPP && (
                  <li>
                    <a
                      href={SOCIAL_LINKS.WHATSAPP}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      Message us on WhatsApp
                      <NewTab />
                    </a>
                  </li>
                )}
                {SUPPORT_HOURS && <li className={styles.contactText}>{SUPPORT_HOURS}</li>}
              </ul>
            </address>
          </FooterColumn>
        </div>

        <div className={styles.trust}>
          <ul className={styles.trustList} aria-label="Our promises">
            {trustItems.map((item) => (
              <li key={item.id} className={styles.trustItem}>
                <svg
                  className={styles.trustIcon}
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  {TRUST_ICONS[item.icon]}
                </svg>
                <span>
                  {item.label}
                  {item.detail && (
                    <>
                      <span className={`sf-divider--dot ${styles.dot}`} aria-hidden="true" />
                      <span className="sf-visually-hidden">, </span>
                      <span className={styles.trustDetail}>{item.detail}</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className={styles.payments}>
            <p className={styles.paymentsLabel} id="sf-footer-payments">
              We accept
            </p>
            <ul className={styles.marks} aria-labelledby="sf-footer-payments">
              {paymentMarks.map((mark) => (
                <li key={mark.id}>
                  <svg
                    className={styles.mark}
                    viewBox="0 0 48 32"
                    width="42"
                    height="28"
                    role="img"
                    aria-label={mark.label}
                    focusable="false"
                  >
                    <CardFrame />
                    {mark.art}
                  </svg>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <div className={styles.bottomStart}>
            <p className={styles.copyright}>
              © {year} {APP_NAME}
            </p>
            <ul className={styles.legal}>
              {LEGAL_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={cx(styles.link, styles.legalLink)}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className={styles.note}>Prices in INR</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
