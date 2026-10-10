import { STOREFRONT_CONFIG } from "../theme/tokens";

// App Info (override via .env)
export const APP_NAME = process.env.REACT_APP_NAME || "A & S Urbanseat";
// The tagline is printed inside the logo artwork: never render it as text
// directly beside <BrandLogo />.
export const APP_TAGLINE = "Trusted Comfort for Every Home";
export const APP_DESCRIPTION =
  "Furniture and seating for homes, offices, cafés and outdoor spaces, made to be lived with.";

// Document metadata: the defaults every page's own title and description
// (usePageMeta, src/hooks) fall back to and return to when the page unmounts.
// They equal the static tags in public/index.html word for word
// (usePageMeta.test.js compares them), so a route that sets nothing (the
// admin) keeps the document exactly as index.html shipped it.
export const DEFAULT_PAGE_TITLE =
  "A & S Urbanseat | Furniture and seating for home, office, café and outdoor";
export const DEFAULT_PAGE_DESCRIPTION =
  "Furniture and seating for homes, offices, cafés and outdoor spaces, from our own workshop and the makers we trust.";
// Placeholder until the production domain is confirmed: index.html's static
// og:url and twitter:url. At run time each page's og:url is built from
// window.location, so it always names the domain actually serving the page.
export const SITE_URL_PLACEHOLDER = "https://urbanseat.example/";

// Logo artwork (1286 × 426 PNG). `light` sits on light backgrounds, `white` on
// dark ones; render it through <BrandLogo /> (src/components/ui) so the
// variant always matches the background.
export const LOGO_URLS = {
  light: "https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo.png",
  white: "https://res.cloudinary.com/v8vrixwq/image/upload/v1787597119/urbanseat-logo-white.png",
};

// Routes
export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  PRODUCTS: "/products",
  PRODUCT_DETAIL: "/products/:slug",
  PROFILE: "/profile",
  ORDERS: "/orders",
  ORDER_CONFIRMATION: "/order-confirmation",
  CHECKOUT: "/checkout",
  WISHLIST: "/wishlist",
  SUPPORT: "/support",
  HELP: "/help",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  REFUND: "/refund",
  COOKIES: "/cookies",
  SPECIAL_OFFERS: "/special-offers",
};

// Product flags
export const PRODUCT_FLAGS = {
  FEATURED: "featured",
  TRENDING: "trending",
  HOT: "hot",
  NEW: "new",
  SALE: "sale",
};

// Payment methods
export const PAYMENT_METHODS = {
  CARD: "card",
  UPI: "upi",
  COD: "cod",
  WALLET: "wallet",
  NET_BANKING: "net_banking",
};

// Order statuses
export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURNED: "returned",
  REFUNDED: "refunded",
};

// Fulfillment statuses
export const FULFILLMENT_STATUS = {
  UNFULFILLED: "unfulfilled",
  PARTIALLY_FULFILLED: "partially_fulfilled",
  FULFILLED: "fulfilled",
  RETURNED: "returned",
};

// Payment statuses
export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  PARTIALLY_PAID: "partially_paid",
  REFUNDED: "refunded",
  VOIDED: "voided",
};

// Return statuses
export const RETURN_STATUS = {
  REQUESTED: "requested",
  APPROVED: "approved",
  REJECTED: "rejected",
  RECEIVED: "received",
  REFUNDED: "refunded",
};

// Return reasons
export const RETURN_REASONS = [
  { value: "defective", label: "Damaged or faulty" },
  { value: "wrong_item", label: "Wrong piece received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "size_fit", label: "Size or fit" },
  { value: "quality", label: "Quality not as expected" },
  { value: "other", label: "Other" },
];

// Currencies
export const CURRENCIES = {
  INR: { symbol: "₹", code: "INR", name: "Indian Rupee" },
  USD: { symbol: "$", code: "USD", name: "US Dollar" },
  EUR: { symbol: "€", code: "EUR", name: "Euro" },
  GBP: { symbol: "£", code: "GBP", name: "British Pound" },
};
export const DEFAULT_CURRENCY = CURRENCIES.INR;

// Shipping
// Single source of truth for the free-shipping threshold. Mirrors the
// Standard shipping method's `freeAbove` value in db.json (₹9,999, a
// placeholder awaiting client confirmation) and is shared by the Header banner
// and the CartDrawer progress bar. scripts/validate-db.js checks they agree.
export const FREE_SHIPPING_THRESHOLD = 9999;

// Social links. The Footer renders an icon only for entries with a non-empty
// URL, so a blank entry is hidden instead of leaving a dead link. The client's
// existing site lists WhatsApp only; add the other profiles once confirmed.
export const SOCIAL_LINKS = {
  FACEBOOK: "",
  TWITTER: "",
  INSTAGRAM: "",
  YOUTUBE: "",
  WHATSAPP: "https://wa.me/918472919541",
};

// Store contact, from the client's existing site (verified 2026-10-06). Single
// source so the Header top bar, Footer, Help Center and Support page all stay
// in sync. Pending client confirmation: the email (placeholder from the old
// site's domain) and the full street address with PIN code.
export const SUPPORT_EMAIL = "info@kamdhenufurniture.com";
export const SUPPORT_PHONE = "+91 84729 18653";
export const SUPPORT_ADDRESS = "Assam, India";
export const SUPPORT_HOURS = "Monday – Saturday: 9:00 AM – 7:00 PM IST, Sunday closed";

// Date the legal/policy pages were last reviewed. Single source so the Privacy,
// Terms, Cookie and Refund pages never show contradictory "last updated" dates.
export const POLICY_LAST_UPDATED = "7 October 2026";

// FAQs: the Help centre's questions (src/components/FAQ). Answers state only
// what the store does today. Delivery times, charges and payment limits come
// from live data, so the answers point to where the store shows them (the
// product page's Delivery & returns facts, the cart, checkout) instead of
// repeating numbers here. The one number, the returns window, is
// STOREFRONT_CONFIG.returnsWindowDays (a placeholder), which the trust badges
// and the Returns & refunds policy also read. `link` is optional: { label, to }.
const RETURN_DAYS = Number(STOREFRONT_CONFIG.returnsWindowDays) || 0;
const RETURN_WINDOW = RETURN_DAYS > 0 ? `${RETURN_DAYS} day${RETURN_DAYS === 1 ? "" : "s"}` : null;

export const FAQ_ITEMS = [
  {
    id: 1,
    question: "How long does delivery take?",
    answer:
      "It depends on the delivery method you choose. Every product page lists the methods and their estimated times under Delivery & returns, and checkout shows them again before you pay.",
  },
  {
    id: 2,
    question: "Is delivery free?",
    answer:
      "Some delivery methods are free above an order value. Your cart shows how far you are from free delivery, and checkout shows the delivery charge before you pay.",
  },
  {
    id: 3,
    question: "Where do you deliver?",
    answer:
      "We deliver within India. To check delivery to your town before you order, send us a message with your PIN code.",
    link: { label: "Send us a message", to: "/support?category=shipping" },
  },
  {
    id: 4,
    question: "How do I track my order?",
    answer:
      "Open My orders and choose Track on the order. You will see its progress and, once it ships, its tracking number.",
    link: { label: "Go to My orders", to: "/orders" },
  },
  {
    id: 5,
    question: "Can I cancel an order?",
    answer:
      "Yes, until it ships: open My orders and choose Cancel order. What you paid is refunded, and any store credit you used goes back to your account.",
  },
  {
    id: 6,
    question: "Do I need an account to order?",
    answer:
      "Yes. You can sign in or create an account at checkout. It keeps your orders, saved addresses, wishlist and store credit in one place.",
  },
  {
    id: 7,
    question: "How can I pay?",
    answer:
      "Checkout offers cards, UPI, net banking and wallets and, where available, Cash on Delivery up to the limit shown at checkout. You can also use store credit.",
  },
  {
    id: 8,
    question: "Do prices include GST?",
    answer:
      "No. Prices on the website don’t include GST. The tax for your order is added at checkout and shown before you pay.",
  },
  {
    id: 9,
    question: "How does store credit work?",
    answer:
      "Refunds can be issued as store credit, which stays on your account. You can apply it at checkout to any order, and see your balance under Store credit in your account.",
    link: { label: "View your store credit", to: "/profile?tab=wallet" },
  },
  {
    id: 10,
    question: "Can I return a piece?",
    answer: RETURN_WINDOW
      ? `Yes. Eligible pieces can be returned within ${RETURN_WINDOW} of delivery. Choose Return or exchange on the order in My orders, or send us a message with your order number.`
      : "We accept returns only for pieces that arrive damaged, faulty or different from what you ordered. Send us a message with your order number.",
    link: { label: "Read our returns policy", to: "/refund" },
  },
  {
    id: 11,
    question: "What if a piece arrives damaged?",
    answer: `Tell us ${RETURN_WINDOW ? `within ${RETURN_WINDOW} of delivery` : "as soon as you can"}, with your order number and photos, and we will arrange a repair, a replacement or a refund.`,
    link: { label: "Report a problem", to: "/support?category=returns" },
  },
];

// Help centre topics (/help): one hairline card each. The targets are the old
// tiles'; Payments now preselects the support form's "payment" category.
// `requiresDeals` hides a topic while the Special Offers page is switched off
// in the admin (the header's and footer's rule).
export const HELP_TOPICS = [
  {
    id: "orders",
    title: "Orders & delivery",
    description: "Track an order, and see what happens after you buy.",
    to: "/orders",
  },
  {
    id: "returns",
    title: "Returns & refunds",
    description: "How to return a piece, and how refunds are paid.",
    to: "/refund",
  },
  {
    id: "payments",
    title: "Payments",
    description: "A question about a payment, a charge or an invoice.",
    to: "/support?category=payment",
  },
  {
    id: "account",
    title: "Your account",
    description: "Your details, saved addresses, password and store credit.",
    to: "/profile",
  },
  {
    id: "privacy",
    title: "Privacy & security",
    description: "How we collect, use and protect your information.",
    to: "/privacy",
  },
  {
    id: "offers",
    title: "Offers",
    description: "Pieces on offer now, and codes to use at checkout.",
    to: "/special-offers",
    requiresDeals: true,
  },
];

// The support form's topics (/support). The values are what the form sends
// and what Admin → Leads shows; `?category=<value>` preselects one (Order
// History's "Return or exchange" sends `returns`).
export const SUPPORT_CATEGORIES = [
  { value: "general", label: "General question" },
  { value: "order", label: "An order" },
  { value: "shipping", label: "Delivery" },
  { value: "returns", label: "Returns & refunds" },
  { value: "product", label: "A product" },
  { value: "payment", label: "Payments" },
  { value: "account", label: "Your account" },
  { value: "other", label: "Something else" },
];

// Breakpoints
export const BREAKPOINTS = {
  XS: 480,
  SM: 768,
  MD: 1024,
  LG: 1280,
  XL: 1440,
};
