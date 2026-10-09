import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useIsPresent, useReducedMotion } from "framer-motion";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { useOrder } from "../../context/OrderContext";
import apiService from "../../services/api";
import { IS_MOCK_API } from "../../services/baseURL";
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";
import TRUST_ICONS from "../../components/storefront/trustIcons";
import { STOREFRONT_CONFIG, TOKENS } from "../../theme/tokens";
import { formatCurrency, isValidPhone, onImageError, PLACEHOLDER_IMG } from "../../utils/helpers";
import styles from "./Checkout.module.css";

// =============================================================================
// Checkout — one page, four steps: Cart → Shipping → Payment → Review
// =============================================================================
// Look (Prompt 26, prompts/DESIGN_SYSTEM.md §36): a minimal header (the
// breadcrumb, the serif h1 and a hairline stepper), then the step in seven
// columns and the order summary in five. From 901px the summary sticks under
// the header; up to 900px it sits above the step as an "Order summary · ₹X"
// disclosure, open on the Review step.
//
// THE LOGIC IS THE OLD PAGE'S. A script compares these with main, byte for
// byte: STEPS, couponDiscountFor, the order math (subtotal, couponDiscount,
// shippingCost, taxRatePct and taxAmount, total, maxApplicableCredit,
// storeCreditApplied, amountPayable, fullyCovered), the COD rules (codEnabled,
// codMinOrder, codMaxOrder, codAvailable), the effects (the wallet balance,
// the prefill, the scroll to the top on every step, the COD → card fallback,
// the credit clamp, the coupon's auto-removal), applyCoupon, removeCoupon,
// handleNext, placeOrder (the payload, clearCart({ silent: true }) and the
// confirmation route) and handleAddressChange.
//
// Three additions, each documented in prompts/BUILD_LOG.md (Prompt 26):
//   • the two store reads note when they have settled (.finally), so the page
//     can tell "loading" from "failed"; what they read and store is unchanged;
//   • validateAddress also refuses a filled-in phone that isValidPhone
//     refuses and a PIN that is not six digits (it only ever tightens);
//   • a failed order shows a role="alert" panel. placeOrder is untouched: the
//     panel follows from processing ending without an order placed, which is
//     what both of its failure paths (createOrder reporting a failure, or a
//     throw) leave behind.
// =============================================================================

const STEPS = ["Cart", "Shipping", "Payment", "Review"];

// The ids are what orders store (`paymentMethod`); the labels are the names
// Order History prints for them (its PAYMENT_METHOD_LABELS).
const PAYMENT_OPTIONS = [
  { id: "card", label: "Credit or debit card", desc: "Visa, Mastercard, RuPay" },
  { id: "upi", label: "UPI", desc: "Google Pay, PhonePe, Paytm" },
  { id: "net_banking", label: "Net banking", desc: "Pay from your bank account" },
  { id: "wallet", label: "Wallet", desc: "Paytm, PhonePe, Amazon Pay" },
  { id: "cod", label: "Cash on delivery", desc: "Pay when your order arrives" },
];

// Discount for an applied coupon at the current subtotal. Derived (never
// stored), so qty changes can't leave a stale amount and re-applying a coupon
// can't stack. `capped` flags when maxDiscount limited the raw value.
const couponDiscountFor = (coupon, amount) => {
  if (!coupon) return { discount: 0, capped: false };
  const raw =
    coupon.type === "percentage"
      ? Math.round((amount * coupon.value) / 100)
      : coupon.value;
  const cap = coupon.maxDiscount || Infinity;
  return { discount: Math.max(0, Math.min(raw, cap, amount)), capped: raw > cap };
};

// ---- Presentation helpers (Prompt 26) ----------------------------------------

const { duration, easeOut, easeInOut } = TOKENS.motion;

const cx = (...names) => names.filter(Boolean).join(" ");

// The net-banking select's options (a choice of bank, not a claim of support).
const BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
];

// The new-address form, in form order: labels, autocomplete tokens, keypads
// and hints as in My addresses (prompts/DESIGN_SYSTEM.md §32.2), so the two
// forms read alike. `required` is the message shown for validateAddress's
// "Required".
const ADDRESS_FIELDS = [
  { name: "firstName", id: "checkout-first-name", label: "First name", autoComplete: "given-name", autoCapitalize: "words", required: "First name is required" },
  { name: "lastName", id: "checkout-last-name", label: "Last name", autoComplete: "family-name", autoCapitalize: "words", required: "Last name is required" },
  { name: "phone", id: "checkout-phone", label: "Phone number", type: "tel", inputMode: "tel", autoComplete: "tel", hint: "10-digit mobile number", required: "Phone number is required", wide: true },
  { name: "addressLine1", id: "checkout-address-line-1", label: "Address line 1", autoComplete: "address-line1", hint: "House or flat number, building and street", required: "Address line 1 is required", wide: true },
  { name: "addressLine2", id: "checkout-address-line-2", label: "Address line 2", optional: true, autoComplete: "address-line2", hint: "Landmark or area", wide: true },
  { name: "city", id: "checkout-city", label: "City", autoComplete: "address-level2", autoCapitalize: "words", required: "City is required" },
  { name: "state", id: "checkout-state", label: "State", autoComplete: "address-level1", autoCapitalize: "words", required: "State is required" },
  { name: "postalCode", id: "checkout-postal-code", label: "Postal code", inputMode: "numeric", autoComplete: "postal-code", hint: "6-digit PIN", required: "Postal code is required" },
  { name: "country", id: "checkout-country", label: "Country", autoComplete: "country-name", hint: "Currently shipping within India only", readOnly: true },
];

// What a saved address lacks, for the line under the saved addresses (their
// fields are not on screen, so the field messages cannot show there).
const SAVED_ADDRESS_NEEDS = {
  firstName: "a first name",
  lastName: "a last name",
  phone: "a phone number",
  addressLine1: "an address line",
  city: "a city",
  state: "a state",
  postalCode: "a postal code",
};
const SAVED_ADDRESS_INVALID = {
  phone: "a valid 10-digit mobile number",
  postalCode: "a 6-digit PIN",
};

const joinList = (items) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const savedAddressProblem = (errors) => {
  const needs = ADDRESS_FIELDS.filter((field) => errors[field.name]).map((field) =>
    errors[field.name] === "Required" ? SAVED_ADDRESS_NEEDS[field.name] : SAVED_ADDRESS_INVALID[field.name]
  );
  return needs.length ? `This address needs ${joinList(needs.filter(Boolean))}.` : "";
};

// The default address first; the others keep their saved order.
const defaultFirst = (addresses) =>
  [...addresses].sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)));

// "Howly, Assam 781316" (legacy rows may carry zipCode).
const cityLine = (address) =>
  [[address.city, address.state].filter(Boolean).join(", "), address.postalCode || address.zipCode]
    .filter(Boolean)
    .join(" ");

// "7-10" → "7–10 business days", "0" → "Same day" (the product page's rule).
const deliveryWindow = (estimatedDays) => {
  if (estimatedDays == null || estimatedDays === "") return null;
  const days = String(estimatedDays).trim();
  if (days === "0") return "Same day";
  const range = days.replace(/^(\d+)\s*-\s*(\d+)$/, "$1–$2");
  return `${range} business ${range === "1" ? "day" : "days"}`;
};

// The review step's delivery fact: "Delivery in 7–10 business days".
const deliveryPromise = (method) => {
  const window = deliveryWindow(method?.estimatedDays);
  if (window === "Same day") return "Same-day delivery";
  if (window) return `Delivery in ${window}`;
  return method?.description || null;
};

// The summary's delivery cue, from the chosen method (else Standard).
const deliveryCue = (method) => {
  if (!method) return null;
  if (method.rateType === "free" || Number(method.flatRate) === 0) return "Free delivery";
  const rate = Number(method.flatRate);
  if (!Number.isFinite(rate)) return null;
  const freeAbove = Number(method.freeAbove);
  return `Delivery ${formatCurrency(rate)}${freeAbove > 0 ? ` · free above ${formatCurrency(freeAbove)}` : ""}`;
};

const standardMethod = (methods) =>
  methods.find((method) => /standard/i.test(String(method.name || ""))) || methods[0] || null;

// The sticky header's visible height (§17.2), and a focus move that never
// leaves its target under it: focus() alone does not scroll an element the
// header covers, since it counts as in view.
const headerHeight = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sf-header-height")) || 0;

const focusAndReveal = (element, reduceMotion, box = element) => {
  element.focus({ preventScroll: true });
  const rect = box.getBoundingClientRect();
  if (rect.top < headerHeight() || rect.bottom > window.innerHeight) {
    window.scrollTo({
      top: Math.max(0, window.scrollY + rect.top - headerHeight() - TOKENS.space[4]),
      behavior: reduceMotion ? "instant" : "smooth",
    });
  }
};

// Calls `callback` on the first frame with no modal dialog open (the sign-in
// dialog, SweetAlert2's), or once `limit` ms have passed. While one is open
// the page behind it is hidden from assistive tech (aria-hidden). With
// `settle`, it also waits up to that long after the dialog has gone for the
// focus it hands back (SweetAlert2 does so on a short timer) to land, so a
// focus change does not cut off what the callback announces. Returns a
// cancel for the effect's cleanup.
const afterDialogs = (callback, { limit = Infinity, settle = 0 } = {}) => {
  const started = Date.now();
  let closedAt = null;
  let frame = 0;
  const check = () => {
    const now = Date.now();
    if (now - started < limit) {
      const open = Boolean(document.querySelector('[aria-modal="true"]'));
      if (open) closedAt = null;
      else if (closedAt === null) closedAt = now;
      const active = document.activeElement;
      const focusPending = !active || active === document.body;
      if (open || (focusPending && now - closedAt < settle)) {
        frame = requestAnimationFrame(check);
        return;
      }
    }
    callback();
  };
  frame = requestAnimationFrame(check);
  return () => cancelAnimationFrame(frame);
};

// True while `node` scrolls (the sticky summary in a short window), so it can
// take keyboard focus and be scrolled from the keyboard.
const useScrolls = (node) => {
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const check = () => setScrolls(node.scrollHeight > node.clientHeight + 1);
    const observer = new ResizeObserver(check);
    observer.observe(node);
    Array.from(node.children).forEach((child) => observer.observe(child));
    window.addEventListener("resize", check);
    check();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [node]);
  return scrolls;
};

// ---- Glyphs (outline, in currentColor) --------------------------------------

const Glyph = ({ size = 16, strokeWidth = 1.5, className, children }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

const CheckGlyph = (props) => (
  <Glyph {...props}>
    <polyline points="20 6 9 17 4 12" />
  </Glyph>
);

const ChevronGlyph = (props) => (
  <Glyph {...props}>
    <polyline points="6 9 12 15 18 9" />
  </Glyph>
);

const BackGlyph = (props) => (
  <Glyph {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </Glyph>
);

const AlertGlyph = (props) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="12.5" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </Glyph>
);

const InfoGlyph = (props) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </Glyph>
);

const StepIcon = ({ plus }) => (
  <Glyph size={14} strokeWidth={1.75}>
    {plus && <line x1="12" y1="5" x2="12" y2="19" />}
    <line x1="5" y1="12" x2="19" y2="12" />
  </Glyph>
);

const TrustIcon = ({ name, size = 16 }) => <Glyph size={size}>{TRUST_ICONS[name]}</Glyph>;

// A figure that is not known yet (the store reads are still out).
const Pending = ({ className }) => (
  <>
    <span className={cx("sf-skeleton", styles.pending, className)} aria-hidden="true" />
    <span className="sf-visually-hidden">Loading</span>
  </>
);

// One step's panel. Panels cross-fade (AnimatePresence mode="wait"); the one
// fading out is inert, so nothing in it can be used or read on its way out.
const StepPanel = ({ reduceMotion, children }) => {
  const isPresent = useIsPresent();
  return (
    <motion.section
      className={styles.panel}
      aria-labelledby="checkout-step-title"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: duration.base, ease: easeOut } }}
      exit={{ opacity: 0, transition: { duration: duration.fast, ease: easeInOut } }}
    >
      {/* React 18 does not know `inert`; the empty string sets the attribute. */}
      <div className={styles.panelInner} inert={isPresent ? undefined : ""}>
        {children}
      </div>
    </motion.section>
  );
};

// The step's heading takes focus on every step change ("Step 2 of 4:
// Shipping details"), so progress is announced where the reader now is.
const StepHeading = ({ index, headingRef, children }) => (
  <h2
    id="checkout-step-title"
    ref={headingRef}
    data-step={index}
    tabIndex={-1}
    className={cx("sf-display-sm", styles.stepTitle)}
  >
    <span className="sf-visually-hidden">{`Step ${index + 1} of ${STEPS.length}: `}</span>
    {children}
  </h2>
);

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, getCartItemCount, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { isLoading: authLoading } = useAuth();
  const { createOrder } = useOrder();
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponApplied, setCouponApplied] = useState(null);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [shippingError, setShippingError] = useState("");
  const [storeSettings, setStoreSettings] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);

  // Store-credit wallet
  const [walletBalance, setWalletBalance] = useState(0);
  const [applyStoreCredit, setApplyStoreCredit] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0); // amount the customer chose to apply

  const [shippingAddress, setShippingAddress] = useState({
    firstName: user?.firstName || "", lastName: user?.lastName || "",
    phone: user?.phone || "", addressLine1: "", addressLine2: "",
    city: "", state: "", postalCode: "", country: "India",
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [useExistingAddress, setUseExistingAddress] = useState(null);

  // ── Page state (Prompt 26): loading, the failure alert, focus, the summary ──
  const [shippingLoaded, setShippingLoaded] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const [couponTried, setCouponTried] = useState(false);
  const [continueAttempt, setContinueAttempt] = useState(0);
  const [summaryChoice, setSummaryChoice] = useState({ step: 0, open: false });
  const [summaryNode, setSummaryNode] = useState(null);
  const primaryRef = useRef(null);
  const emptyTitleRef = useRef(null);
  const couponInputRef = useRef(null);
  const couponAppliedRef = useRef(null);
  const shippingErrorRef = useRef(null);
  const removeButtonsRef = useRef(new Map());
  const lineFocusRef = useRef(null);
  const stepFocusRef = useRef(null);
  const stepHeadingNodeRef = useRef(null);

  useEffect(() => {
    const loadShipping = async () => {
      try {
        // Storefront endpoint (active methods only) — never the admin-scoped
        // method, which needs an admin token on the Laravel branch.
        const methods = await apiService.shipping.getMethods();
        const active = methods.filter((m) => m.isActive !== false);
        setShippingMethods(active);
        if (active.length > 0) setSelectedShipping(active[0]);
      } catch (e) { console.error("Load shipping methods error:", e); }
    };
    const loadSettings = async () => {
      try {
        const settings = await apiService.settings.get();
        setStoreSettings(settings);
      } catch (e) { console.error("Load store settings error:", e); }
    };
    // Prompt 26: note when each read has settled, either way, for the loading
    // states. The reads and what they store are unchanged.
    loadShipping().finally(() => setShippingLoaded(true));
    loadSettings().finally(() => setSettingsLoaded(true));
  }, []);

  // Load the signed-in customer's store-credit balance so it can be applied here.
  useEffect(() => {
    if (!user?.id) { setWalletBalance(0); return; }
    let active = true;
    (async () => {
      try {
        const balance = await apiService.wallet.getBalance(user.id);
        if (active) setWalletBalance(Number(balance) || 0);
      } catch (e) { console.error("Load wallet balance error:", e); }
    })();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (user) {
      setShippingAddress((prev) => ({
        ...prev,
        firstName: prev.firstName || user.firstName || "",
        lastName: prev.lastName || user.lastName || "",
        phone: prev.phone || user.phone || "",
      }));
      if (user.addresses?.length > 0) {
        const defaultAddr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
        setUseExistingAddress(defaultAddr);
      }
    }
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // ── Order math ────────────────────────────────────────────────────────────
  // total = subtotal − discount + shipping + tax, with tax on the discounted
  // subtotal. The same rounded figures are stored on the order so Confirmation,
  // Order History and Admin all display exactly what was charged.
  const subtotal = getCartTotal();
  const { discount: couponDiscount, capped: couponCapped } = couponDiscountFor(couponApplied, subtotal);
  const shippingCost = selectedShipping
    ? selectedShipping.rateType === "free" || (selectedShipping.freeAbove && subtotal >= selectedShipping.freeAbove) ? 0 : selectedShipping.flatRate
    : 0;
  const taxRatePct = storeSettings?.store?.taxRate ?? 18;
  const taxAmount = Math.round(Math.max(0, subtotal - couponDiscount) * (taxRatePct / 100));
  const total = subtotal - couponDiscount + shippingCost + taxAmount;

  // Store credit is applied LAST, against the grand total (it behaves like a
  // prepaid gift card — after discounts, shipping and tax). The customer can
  // apply up to their balance, capped by the order total; the remainder, if
  // any, is collected via the chosen payment method. (See PR notes.)
  const maxApplicableCredit = Math.min(walletBalance, total);
  const storeCreditApplied = applyStoreCredit
    ? Math.min(Math.max(0, Math.round(creditAmount)), maxApplicableCredit)
    : 0;
  const amountPayable = Math.max(0, total - storeCreditApplied);
  const fullyCovered = storeCreditApplied > 0 && amountPayable === 0;

  // COD availability comes from store settings, bounded by the amount actually
  // collected on delivery (the payable remainder after store credit).
  const paymentCfg = storeSettings?.payment;
  const codEnabled = paymentCfg?.codEnabled !== false;
  const codMinOrder = paymentCfg?.codMinOrder ?? 0;
  const codMaxOrder = paymentCfg?.codMaxOrder ?? null;
  const codAvailable = codEnabled && amountPayable > 0 &&
    amountPayable >= codMinOrder && (codMaxOrder == null || amountPayable <= codMaxOrder);

  // If totals shift (qty/coupon/shipping) and COD falls out of range, move the
  // selection back to card rather than letting an invalid method be submitted.
  useEffect(() => {
    if (paymentMethod === "cod" && !codAvailable) setPaymentMethod("card");
  }, [paymentMethod, codAvailable]);

  // Keep the chosen credit amount within the current applicable maximum — e.g.
  // when the cart total drops after removing an item or a coupon — so the input
  // never displays (or submits) more than can actually be applied.
  useEffect(() => {
    if (applyStoreCredit && creditAmount > maxApplicableCredit) {
      setCreditAmount(maxApplicableCredit);
    }
  }, [applyStoreCredit, creditAmount, maxApplicableCredit]);

  // A coupon only stays applied while the cart still meets its minimum.
  useEffect(() => {
    if (couponApplied && subtotal < (couponApplied.minOrderAmount || 0)) {
      setCouponApplied(null);
      setCouponCode("");
      setCouponError(
        `${couponApplied.code} was removed — it needs a minimum order of ${formatCurrency(couponApplied.minOrderAmount)}.`
      );
    }
  }, [subtotal, couponApplied]);

  const applyCoupon = async () => {
    setCouponError("");
    if (!couponCode.trim()) { setCouponError("Enter a coupon code"); return; }
    try {
      const coupon = await apiService.coupons.validate(couponCode.trim(), subtotal);
      setCouponApplied(coupon);
    } catch (e) {
      setCouponError(e.message || "Invalid coupon");
      setCouponApplied(null);
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponApplied(null);
    setCouponError("");
  };

  const validateAddress = () => {
    const addr = useExistingAddress || shippingAddress;
    const errs = {};
    if (!addr.firstName?.trim()) errs.firstName = "Required";
    if (!addr.lastName?.trim()) errs.lastName = "Required";
    if (!addr.phone?.trim()) errs.phone = "Required";
    if (!addr.addressLine1?.trim()) errs.addressLine1 = "Required";
    if (!addr.city?.trim()) errs.city = "Required";
    if (!addr.state?.trim()) errs.state = "Required";
    if (!addr.postalCode?.trim()) errs.postalCode = "Required";
    // Prompt 26 (tightening only): a filled-in phone must pass isValidPhone and
    // a filled-in PIN must be six digits; an empty field keeps "Required".
    if (!errs.phone && !isValidPhone(addr.phone)) errs.phone = "Enter a valid 10-digit mobile number";
    if (!errs.postalCode && !/^\d{6}$/.test(String(addr.postalCode).replace(/\s/g, ""))) errs.postalCode = "Enter a valid 6-digit PIN";
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 0) {
      if (cartItems.length === 0) return;
      if (!isAuthenticated) { openAuthModal("login"); return; }
      setStep(1);
    } else if (step === 1) {
      if (!validateAddress()) return;
      if (!selectedShipping) { setShippingError("Please select a shipping method."); return; }
      setShippingError("");
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      placeOrder();
    }
  };

  const placeOrder = async () => {
    setIsProcessing(true);
    try {
      const addr = useExistingAddress || shippingAddress;
      const orderData = {
        items: cartItems.map((item) => ({
          productId: item.productId, variantId: item.variantId,
          name: `${item.name}${item.variantName ? ` - ${item.variantName}` : ""}`,
          image: item.image, sku: item.sku || "", price: item.price,
          quantity: item.quantity, subtotal: item.price * item.quantity,
        })),
        shippingAddress: addr,
        billingAddress: addr,
        subtotal,
        discountAmount: couponDiscount,
        couponCode: couponApplied?.code || null,
        shippingAmount: shippingCost,
        taxAmount,
        total,
        // Store credit applied at checkout, and what's left for the gateway.
        storeCreditUsed: storeCreditApplied,
        amountPayable,
        // A fully store-credit order needs no further payment, so it is "paid"
        // via store credit; otherwise the chosen method settles the remainder.
        paymentMethod: fullyCovered ? "store_credit" : paymentMethod,
        paymentStatus: fullyCovered ? "paid" : paymentMethod === "cod" ? "pending" : "paid",
        fulfillmentStatus: "unfulfilled",
        shippingStatus: "pending",
        trackingNumber: null,
        notes: "",
      };

      const result = await createOrder(orderData);
      if (result.success) {
        setOrderPlaced(result.order);
        clearCart({ silent: true });
        const orderNum = result.order.orderNumber || result.order.id;
        navigate(`/order-confirmation/${orderNum}`);
      }
    } catch (e) {
      console.error("Order error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress((prev) => ({ ...prev, [name]: value }));
    if (addressErrors[name]) setAddressErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ── Prompt 26: states, focus and the failure alert (around the logic) ─────

  // The order did not go through: placeOrder ended without placing it (a
  // success sets orderPlaced before processing ends). OrderContext's "Order
  // Failed" dialog hides the page from assistive tech while it is open, so
  // the alert comes in once that has closed and handed focus back, and is
  // announced. It goes on the next attempt and when the step changes.
  const wasProcessingRef = useRef(false);
  useEffect(() => {
    const failed = wasProcessingRef.current && !isProcessing && !orderPlaced;
    wasProcessingRef.current = isProcessing;
    if (!failed) return undefined;
    return afterDialogs(() => setOrderError(true), { settle: 500 });
  }, [isProcessing, orderPlaced]);

  useEffect(() => {
    setOrderError(false);
  }, [step]);

  // A step change moves focus to the new step's heading once its panel is in
  // (the old one fades out first); not on arrival. focus() skips its own
  // scroll: the scroll to the top above already brings the page up.
  const isFirstStepRef = useRef(true);
  useLayoutEffect(() => {
    if (isFirstStepRef.current) {
      isFirstStepRef.current = false;
      return;
    }
    stepFocusRef.current = step;
    const node = stepHeadingNodeRef.current;
    if (node && node.isConnected && Number(node.dataset.step) === step) {
      stepFocusRef.current = null;
      node.focus({ preventScroll: true });
    }
  }, [step]);

  const stepHeadingRef = useCallback((node) => {
    stepHeadingNodeRef.current = node;
    if (node && stepFocusRef.current === Number(node.dataset.step)) {
      stepFocusRef.current = null;
      node.focus({ preventScroll: true });
    }
  }, []);

  // A Continue on Shipping that the checks refused: focus the first thing to
  // fix (a field in form order, the saved address, or the delivery methods).
  const handledAttemptRef = useRef(0);
  useEffect(() => {
    if (continueAttempt === handledAttemptRef.current) return;
    handledAttemptRef.current = continueAttempt;
    if (step !== 1) return;
    const failed = ADDRESS_FIELDS.find((field) => addressErrors[field.name]);
    if (failed) {
      const target = useExistingAddress
        ? document.querySelector('input[name="savedAddress"]:checked')
        : document.getElementById(failed.id);
      if (target) focusAndReveal(target, reduceMotion, target.closest("label, .sf-field") || target);
      return;
    }
    if (shippingError && !selectedShipping && shippingErrorRef.current) {
      focusAndReveal(shippingErrorRef.current, reduceMotion);
    }
  }, [continueAttempt, step, addressErrors, useExistingAddress, shippingError, selectedShipping, reduceMotion]);

  // Removing a line hands focus to the next line's Remove (the previous one's
  // for the last line); the last line leaving hands it to the empty state.
  const registerRemove = useCallback((id, node) => {
    if (node) removeButtonsRef.current.set(id, node);
    else removeButtonsRef.current.delete(id);
  }, []);

  const handleRemoveLine = (itemId) => {
    const ids = cartItems.map((item) => item.id);
    const index = ids.indexOf(itemId);
    lineFocusRef.current = ids[index + 1] ?? ids[index - 1] ?? "empty";
    removeFromCart(itemId);
  };

  useLayoutEffect(() => {
    const target = lineFocusRef.current;
    if (target == null) return;
    lineFocusRef.current = null;
    const node = target === "empty" ? emptyTitleRef.current : removeButtonsRef.current.get(target);
    if (node && node.isConnected) focusAndReveal(node, reduceMotion);
  }, [cartItems, reduceMotion]);

  // Applying a coupon replaces its form with the applied line, and removing it
  // brings the form back: focus follows when it would otherwise drop.
  const prevCouponRef = useRef(couponApplied);
  useLayoutEffect(() => {
    const previous = prevCouponRef.current;
    prevCouponRef.current = couponApplied;
    if (Boolean(previous) === Boolean(couponApplied)) return;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    const target = couponApplied ? couponAppliedRef.current : couponInputRef.current;
    if (target) target.focus({ preventScroll: true });
  }, [couponApplied]);

  // A coupon that applied leaves no failed attempt behind (so a later
  // auto-removal notice does not mark the empty field invalid).
  useEffect(() => {
    if (couponApplied) setCouponTried(false);
  }, [couponApplied]);

  // Signing in here: the guest panel (and its "Sign in") goes, so once the
  // dialog has left, focus that dropped to the page moves to Continue. Only a
  // guest seen after the session restore counts: a restored session is not a
  // sign-in.
  const wasAuthenticatedRef = useRef(null);
  useEffect(() => {
    if (authLoading) return undefined;
    const was = wasAuthenticatedRef.current;
    wasAuthenticatedRef.current = isAuthenticated;
    if (was !== false || !isAuthenticated) return undefined;
    return afterDialogs(() => {
      const active = document.activeElement;
      if ((!active || active === document.body || !active.isConnected) && primaryRef.current) {
        primaryRef.current.focus({ preventScroll: true });
      }
    }, { limit: 4000 });
  }, [authLoading, isAuthenticated]);

  const summaryScrolls = useScrolls(summaryNode);

  // Nothing is drawn while the session is restored (the first render): the
  // account and the saved cart arrive together on the next one, so a reload
  // never flashes the empty state.
  if (authLoading) return null;

  if (cartItems.length === 0 && !orderPlaced) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <Breadcrumb items={[{ label: "Checkout" }]} />
          <h1 className={cx("sf-display-md", styles.title)}>Checkout</h1>
        </header>
        <div className={cx("sf-panel", styles.empty)}>
          <h2 className={cx("sf-display-sm", styles.emptyTitle)} tabIndex={-1} ref={emptyTitleRef}>
            Your cart is empty.
          </h2>
          <p className={styles.emptyText}>Pieces you add to your cart will be here, ready to check out.</p>
          <Link to="/products" className={cx("sf-btn sf-btn--primary", styles.emptyAction)}>
            Browse furniture
          </Link>
        </div>
      </div>
    );
  }

  const reviewAddress = useExistingAddress || shippingAddress;
  const selectedPaymentOption = PAYMENT_OPTIONS.find((pm) => pm.id === paymentMethod);

  // ── Presentation values ──────────────────────────────────────────────────
  const itemCount = getCartItemCount();
  const shippingPending = !shippingLoaded;
  const totalsPending = !shippingLoaded || !settingsLoaded;
  const isReview = step === STEPS.length - 1;
  const summaryOpen = summaryChoice.step === step ? summaryChoice.open : isReview;
  const savedAddresses = user?.addresses?.length > 0 ? defaultFirst(user.addresses) : [];
  const hasAddressErrors = Object.values(addressErrors).some(Boolean);
  const returnsDays = STOREFRONT_CONFIG.returnsWindowDays;
  const gatewayConfigured =
    !IS_MOCK_API && Boolean(storeSettings?.payment?.razorpayEnabled || storeSettings?.payment?.stripeEnabled);

  // COD's real condition. The cap is left out when there is none (the old
  // hint printed "up to ₹0.00" then).
  const codRange = [
    codMinOrder > 0 ? `from ${formatCurrency(codMinOrder)}` : null,
    codMaxOrder != null ? `up to ${formatCurrency(codMaxOrder)}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const codDescription = !codEnabled
    ? "Currently unavailable"
    : !codAvailable
    ? `Not available for this amount${codRange ? ` · Available for orders ${codRange}` : ""}`
    : codRange
    ? `Available for orders ${codRange}`
    : PAYMENT_OPTIONS.find((pm) => pm.id === "cod").desc;

  const isSelectedAddress = (addr) =>
    useExistingAddress != null &&
    (addr.id != null ? useExistingAddress.id === addr.id : useExistingAddress === addr);

  const toggleSummary = () => setSummaryChoice({ step, open: !summaryOpen });

  const goToStep = (target) => {
    if (isProcessing) return;
    setStep(target);
  };

  const onPrimaryClick = () => {
    if (isProcessing || cartItems.length === 0) return;
    if (step === 1) setContinueAttempt((count) => count + 1);
    if (isReview) setOrderError(false);
    handleNext();
  };

  const handleCouponSubmit = (event) => {
    event.preventDefault();
    setCouponTried(true);
    applyCoupon();
  };

  // ── Header: breadcrumb, h1, stepper ──────────────────────────────────────
  const renderStepper = () => (
    <div className={styles.progress}>
      <ol className={styles.stepper} aria-label="Checkout progress">
        {STEPS.map((label, index) => {
          const state = index < step ? "done" : index === step ? "current" : "upcoming";
          return (
            <li
              key={label}
              className={styles.stepperItem}
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className={styles.stepperNumber} aria-hidden="true">
                {index + 1}
              </span>
              <span className={styles.stepperLabel}>{label}</span>
              {state === "done" && <span className="sf-visually-hidden">, done</span>}
            </li>
          );
        })}
      </ol>
      <p className={styles.stepperCompact} aria-hidden="true">
        Step {step + 1} of {STEPS.length}
        <span className={styles.dot}>·</span>
        {STEPS[step]}
      </p>
    </div>
  );

  // ── Step 1: the cart ─────────────────────────────────────────────────────
  const renderCartLine = (item) => {
    const label = item.variantName ? `${item.name}, ${item.variantName}` : item.name;
    const atMin = item.quantity <= 1;
    const atMax = typeof item.stock === "number" && item.quantity >= item.stock;
    return (
      <li key={item.id} className={styles.line}>
        <span className={styles.thumb}>
          <img
            src={item.image || PLACEHOLDER_IMG}
            alt=""
            width="72"
            height="90"
            loading="lazy"
            decoding="async"
            onError={onImageError}
          />
        </span>
        <div className={styles.lineBody}>
          <div className={styles.lineHead}>
            <p className={styles.lineName}>{item.name}</p>
            <button
              ref={(node) => registerRemove(item.id, node)}
              type="button"
              className={cx("sf-btn sf-btn--link", styles.lineRemove)}
              onClick={() => handleRemoveLine(item.id)}
            >
              Remove<span className="sf-visually-hidden"> {label}</span>
            </button>
          </div>
          {item.variantName && <p className={styles.lineVariant}>{item.variantName}</p>}
          <p className={styles.lineUnit}>{formatCurrency(item.price)} each</p>
          <div className={styles.lineFoot}>
            <div className={styles.qty} role="group" aria-label={`Quantity, ${label}`}>
              <button
                type="button"
                className={styles.qtyButton}
                aria-label="Decrease quantity"
                aria-disabled={atMin || undefined}
                onClick={() => {
                  if (!atMin) updateQuantity(item.id, item.quantity - 1);
                }}
              >
                <StepIcon />
              </button>
              <span className={styles.qtyValue} aria-live="polite" aria-atomic="true">
                {item.quantity}
              </span>
              <button
                type="button"
                className={styles.qtyButton}
                aria-label="Increase quantity"
                aria-disabled={atMax || undefined}
                title={atMax ? "No more stock available" : undefined}
                onClick={() => {
                  if (!atMax) updateQuantity(item.id, item.quantity + 1);
                }}
              >
                <StepIcon plus />
              </button>
            </div>
            <p className={styles.lineTotal}>
              <span className="sf-visually-hidden">Line total </span>
              {formatCurrency(item.price * item.quantity)}
            </p>
          </div>
        </div>
      </li>
    );
  };

  const renderCoupon = () => {
    const couponInvalid = Boolean(couponError) && couponTried && !couponApplied;
    return (
      <div className={styles.coupon}>
        {couponApplied ? (
          <div className={styles.couponApplied}>
            <p className={styles.couponAppliedText} tabIndex={-1} ref={couponAppliedRef}>
              <span className={styles.couponCheck}>
                <CheckGlyph size={16} strokeWidth={1.75} />
              </span>
              <span>
                <span className={styles.couponCode}>{couponApplied.code}</span> applied
              </span>
              <span className={styles.couponSaving}>
                <span className="sf-visually-hidden">, saving </span>
                <span aria-hidden="true">−</span>
                {formatCurrency(couponDiscount)}
              </span>
              {couponCapped && (
                <span className={styles.couponCap}>
                  <span className="sf-visually-hidden">, </span>capped at {formatCurrency(couponApplied.maxDiscount)}
                </span>
              )}
            </p>
            <button type="button" className={cx("sf-btn sf-btn--link", styles.couponRemove)} onClick={removeCoupon}>
              Remove<span className="sf-visually-hidden"> coupon {couponApplied.code}</span>
            </button>
          </div>
        ) : (
          <form className={styles.couponForm} noValidate onSubmit={handleCouponSubmit}>
            <label className="sf-field__label" htmlFor="checkout-coupon">
              Coupon code
            </label>
            <div className={styles.couponRow}>
              <input
                ref={couponInputRef}
                id="checkout-coupon"
                className={cx("sf-input", styles.couponInput)}
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponError("");
                  setCouponTried(false);
                }}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={couponInvalid || undefined}
                aria-describedby={couponError ? "checkout-coupon-message" : undefined}
              />
              <button type="submit" className="sf-btn sf-btn--ghost">
                Apply
              </button>
            </div>
          </form>
        )}
        <div id="checkout-coupon-message" className={styles.couponMessage} aria-live="polite">
          {couponError && <p className="sf-field__error">{couponError}</p>}
        </div>
      </div>
    );
  };

  const renderGuestPanel = () => (
    <div className={cx("sf-panel sf-panel--hairline", styles.guest)}>
      <div className={styles.guestText}>
        <p className={cx("sf-display-sm", styles.guestTitle)}>Sign in to check out.</p>
        <p className={styles.guestLine}>Your orders, their tracking and your saved addresses stay with your account.</p>
      </div>
      <div className={styles.guestActions}>
        <button
          type="button"
          className="sf-btn sf-btn--ghost"
          aria-haspopup="dialog"
          onClick={() => openAuthModal("login")}
        >
          Sign in
        </button>
        <button
          type="button"
          className="sf-btn sf-btn--link"
          aria-haspopup="dialog"
          onClick={() => openAuthModal("signup")}
        >
          Create an account
        </button>
      </div>
    </div>
  );

  const renderCartStep = () => (
    <>
      <StepHeading index={0} headingRef={stepHeadingRef}>
        Your cart
      </StepHeading>
      <p className={styles.stepIntro}>
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </p>
      <ul className={styles.lines} aria-label="Items in your cart">
        {cartItems.map(renderCartLine)}
      </ul>
      {renderCoupon()}
      {!isAuthenticated && renderGuestPanel()}
    </>
  );

  // ── Step 2: shipping ─────────────────────────────────────────────────────
  const renderAddressField = (field) => {
    const error = addressErrors[field.name];
    const message = error ? (error === "Required" ? field.required : error) : "";
    const hintId = field.hint ? `${field.id}-hint` : null;
    const errorId = message ? `${field.id}-error` : null;
    return (
      <div key={field.name} className={cx("sf-field", field.wide && styles.wide)}>
        <label className="sf-field__label" htmlFor={field.id}>
          {field.label}
          {field.optional && <span className={styles.optional}> (optional)</span>}
        </label>
        <input
          id={field.id}
          name={field.readOnly ? undefined : field.name}
          className="sf-input"
          type={field.type || "text"}
          inputMode={field.inputMode}
          autoComplete={field.autoComplete}
          autoCapitalize={field.autoCapitalize}
          required={field.required ? true : undefined}
          readOnly={field.readOnly}
          value={shippingAddress[field.name]}
          onChange={field.readOnly ? undefined : handleAddressChange}
          aria-invalid={message ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        />
        {field.hint && (
          <p className="sf-field__hint" id={hintId}>
            {field.hint}
          </p>
        )}
        {message && (
          <p className="sf-field__error" id={errorId}>
            {message}
          </p>
        )}
      </div>
    );
  };

  const renderSavedAddresses = () => {
    const problem = useExistingAddress && hasAddressErrors ? savedAddressProblem(addressErrors) : "";
    return (
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Deliver to</legend>
        <div className={styles.addressOptions}>
          {savedAddresses.map((addr, index) => {
            const checked = isSelectedAddress(addr);
            const name = [addr.firstName, addr.lastName].filter(Boolean).join(" ");
            return (
              <label
                key={addr.id ?? index}
                className={cx("sf-radio", styles.addressCard, checked && styles.checked)}
              >
                <input
                  type="radio"
                  name="savedAddress"
                  checked={checked}
                  onChange={() => { setUseExistingAddress(addr); setAddressErrors({}); }}
                  aria-describedby={checked && problem ? "checkout-saved-address-error" : undefined}
                />
                <span className={styles.addressText}>
                  <span className={styles.addressEyebrow}>
                    {addr.label || "Address"}
                    {addr.isDefault && (
                      <>
                        <span className="sf-visually-hidden">, </span>
                        <span className={styles.dot} aria-hidden="true">
                          ·
                        </span>
                        Default
                      </>
                    )}
                  </span>
                  {name && (
                    <span className={styles.addressName}>
                      <span className="sf-visually-hidden">, </span>
                      {name}
                    </span>
                  )}
                  <span className={styles.addressLine}>
                    <span className="sf-visually-hidden">, </span>
                    {[addr.addressLine1, addr.addressLine2].filter(Boolean).join(", ")}
                  </span>
                  <span className={styles.addressLine}>
                    <span className="sf-visually-hidden">, </span>
                    {cityLine(addr)}
                  </span>
                  {addr.phone && (
                    <span className={styles.addressMeta}>
                      <span className="sf-visually-hidden">, phone </span>
                      {addr.phone}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
          <label className={cx("sf-radio", styles.addressCard, styles.addressNew, !useExistingAddress && styles.checked)}>
            <input
              type="radio"
              name="savedAddress"
              checked={!useExistingAddress}
              onChange={() => setUseExistingAddress(null)}
            />
            <span className={styles.addressName}>A new address</span>
          </label>
        </div>
        {problem && (
          <p className={cx("sf-field__error", styles.groupError)} id="checkout-saved-address-error">
            <span>
              {problem} Choose “A new address” to enter it here, or update it in{" "}
              <Link to="/profile?tab=addresses" className="sf-btn sf-btn--link">
                My addresses
              </Link>
              .
            </span>
          </p>
        )}
      </fieldset>
    );
  };

  const renderMethods = () => {
    if (shippingPending) {
      return (
        <>
          <p className={styles.loadingLine}>Loading delivery options…</p>
          <div className={styles.methods} aria-hidden="true">
            {[0, 1].map((key) => (
              <div key={key} className={cx(styles.method, styles.methodSkeleton)}>
                <span className={cx("sf-skeleton", styles.skeletonRadio)} />
                <span className={styles.methodText}>
                  <span className={cx("sf-skeleton", styles.skeletonName)} />
                  <span className={cx("sf-skeleton", styles.skeletonMeta)} />
                </span>
                <span className={cx("sf-skeleton", styles.skeletonCost)} />
              </div>
            ))}
          </div>
        </>
      );
    }
    if (shippingMethods.length === 0) {
      return <p className={styles.methodsEmpty}>No delivery methods are available right now. Please try again later.</p>;
    }
    return (
      <div className={styles.methods}>
        {shippingMethods.map((method) => {
          const isFree = method.rateType === "free" || (method.freeAbove && subtotal >= method.freeAbove);
          const window = deliveryWindow(method.estimatedDays) || method.description;
          const freeAbove = method.rateType !== "free" && Number(method.freeAbove) > 0 ? Number(method.freeAbove) : null;
          const checked = selectedShipping?.id === method.id;
          return (
            <label key={method.id} className={cx("sf-radio", styles.method, checked && styles.checked)}>
              <input
                type="radio"
                name="shipping"
                checked={checked}
                onChange={() => { setSelectedShipping(method); setShippingError(""); }}
              />
              <span className={styles.methodText}>
                <span className={styles.methodName}>{method.name}</span>
                {window && (
                  <span className={styles.methodMeta}>
                    <span className="sf-visually-hidden">, </span>
                    {window}
                  </span>
                )}
              </span>
              <span className={styles.methodAside}>
                <span className={cx(styles.methodCost, isFree && styles.free)}>
                  <span className="sf-visually-hidden">, </span>
                  {isFree ? "Free" : formatCurrency(method.flatRate)}
                </span>
                {freeAbove && (
                  <span className={styles.methodMeta}>
                    <span className="sf-visually-hidden">, </span>
                    Free above {formatCurrency(freeAbove)}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    );
  };

  const renderShippingStep = () => (
    <>
      <StepHeading index={1} headingRef={stepHeadingRef}>
        Shipping details
      </StepHeading>
      {savedAddresses.length > 0 && renderSavedAddresses()}
      {!useExistingAddress && (
        <fieldset className={styles.group}>
          <legend className={styles.legend}>{savedAddresses.length > 0 ? "New address" : "Delivery address"}</legend>
          <div className={styles.fields}>{ADDRESS_FIELDS.map(renderAddressField)}</div>
        </fieldset>
      )}
      <fieldset className={styles.group} aria-busy={shippingPending || undefined}>
        <legend className={styles.legend}>Delivery method</legend>
        {renderMethods()}
        {shippingError && !selectedShipping && (
          <p
            ref={shippingErrorRef}
            className={cx("sf-field__error", styles.groupError)}
            id="checkout-shipping-error"
            role="alert"
            tabIndex={-1}
          >
            {shippingError}
          </p>
        )}
      </fieldset>
    </>
  );

  // ── Step 3: payment ──────────────────────────────────────────────────────
  const renderStoreCredit = () => (
    <div className={cx("sf-panel", styles.credit)}>
      <div className={styles.creditHead}>
        <div className={styles.creditFigure}>
          <h3 className={cx("sf-eyebrow", styles.creditEyebrow)}>Store credit</h3>
          <p className={styles.creditBalance}>
            <span className="sf-visually-hidden">Available balance </span>
            {formatCurrency(walletBalance)}
          </p>
          <p className={styles.creditHint}>Available to use on this order.</p>
        </div>
        <label className={cx("sf-switch", styles.creditSwitch)}>
          <input
            type="checkbox"
            role="switch"
            checked={applyStoreCredit}
            onChange={(e) => {
              const on = e.target.checked;
              setApplyStoreCredit(on);
              setCreditAmount(on ? maxApplicableCredit : 0);
            }}
          />
          Apply to this order
        </label>
      </div>

      {applyStoreCredit && (
        <div className={styles.creditApply}>
          <div className={cx("sf-field", styles.creditField)}>
            <label className="sf-field__label" htmlFor="checkout-credit-amount">
              Amount to apply
            </label>
            <div className={styles.creditRow}>
              <div className={styles.creditInputWrap}>
                <span className={styles.currency} aria-hidden="true">
                  ₹
                </span>
                <input
                  id="checkout-credit-amount"
                  className={cx("sf-input", styles.creditInput)}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={maxApplicableCredit}
                  value={creditAmount}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setCreditAmount(Number.isFinite(n) ? Math.max(0, n) : 0);
                  }}
                  aria-describedby="checkout-credit-hint"
                />
              </div>
              <button type="button" className="sf-btn sf-btn--link" onClick={() => setCreditAmount(maxApplicableCredit)}>
                Use max<span className="sf-visually-hidden">, {formatCurrency(maxApplicableCredit)}</span>
              </button>
            </div>
            <p className="sf-field__hint" id="checkout-credit-hint">
              Up to {formatCurrency(maxApplicableCredit)} on this order.
            </p>
          </div>
          <dl className={styles.creditRows}>
            <div className={styles.creditRowLine}>
              <dt>Store credit applied</dt>
              <dd className={styles.saving}>
                <span aria-hidden="true">−</span>
                <span className="sf-visually-hidden">minus </span>
                {formatCurrency(storeCreditApplied)}
              </dd>
            </div>
            <div className={styles.creditRowLine}>
              <dt>Remaining to pay</dt>
              <dd className={styles.strong}>{formatCurrency(amountPayable)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );

  const renderPaymentDetails = () => {
    if (paymentMethod === "card") {
      return (
        <div className={styles.subform}>
          <p className={styles.subformTitle}>Card details</p>
          <div className={styles.fields}>
            <div className={cx("sf-field", styles.wide)}>
              <label className="sf-field__label" htmlFor="checkout-card-number">
                Card number
              </label>
              <input
                id="checkout-card-number"
                className="sf-input"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                maxLength={19}
              />
            </div>
            <div className="sf-field">
              <label className="sf-field__label" htmlFor="checkout-card-expiry">
                Expiry date
              </label>
              <input
                id="checkout-card-expiry"
                className="sf-input"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                maxLength={5}
                aria-describedby="checkout-card-expiry-hint"
              />
              <p className="sf-field__hint" id="checkout-card-expiry-hint">
                MM/YY
              </p>
            </div>
            <div className="sf-field">
              <label className="sf-field__label" htmlFor="checkout-card-csc">
                Security code
              </label>
              <input
                id="checkout-card-csc"
                className="sf-input"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                aria-describedby="checkout-card-csc-hint"
              />
              <p className="sf-field__hint" id="checkout-card-csc-hint">
                3 or 4 digits
              </p>
            </div>
            <div className={cx("sf-field", styles.wide)}>
              <label className="sf-field__label" htmlFor="checkout-card-name">
                Name on card
              </label>
              <input
                id="checkout-card-name"
                className="sf-input"
                type="text"
                autoComplete="cc-name"
                autoCapitalize="words"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      );
    }
    if (paymentMethod === "upi") {
      return (
        <div className={styles.subform}>
          <div className="sf-field">
            <label className="sf-field__label" htmlFor="checkout-upi-id">
              UPI ID
            </label>
            <input
              id="checkout-upi-id"
              className="sf-input"
              type="text"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby="checkout-upi-id-hint"
            />
            <p className="sf-field__hint" id="checkout-upi-id-hint">
              For example, name@upi
            </p>
          </div>
        </div>
      );
    }
    if (paymentMethod === "net_banking") {
      return (
        <div className={styles.subform}>
          <div className="sf-field">
            <label className="sf-field__label" htmlFor="checkout-bank">
              Bank
            </label>
            <select id="checkout-bank" className="sf-select">
              {BANKS.map((bank) => (
                <option key={bank}>{bank}</option>
              ))}
            </select>
          </div>
        </div>
      );
    }
    if (paymentMethod === "cod") {
      return (
        <p className={styles.codInfo}>
          <span className={styles.codIcon}>
            <InfoGlyph size={18} />
          </span>
          <span>
            Pay with cash when your order is delivered.
            {codRange ? ` Available for orders ${codRange}.` : ""}
          </span>
        </p>
      );
    }
    return null;
  };

  const renderPaymentStep = () => (
    <>
      <StepHeading index={2} headingRef={stepHeadingRef}>
        Payment
      </StepHeading>

      {walletBalance > 0 && renderStoreCredit()}

      <div role="status">
        {fullyCovered && (
          <p className={styles.covered}>
            <span className={styles.coveredIcon}>
              <CheckGlyph size={18} strokeWidth={1.75} />
            </span>
            Your store credit covers this order in full — no further payment needed.
          </p>
        )}
      </div>

      {!fullyCovered && (
        <>
          <fieldset className={styles.group}>
            <legend className={styles.legend}>Payment method</legend>
            <div className={styles.methods}>
              {PAYMENT_OPTIONS.map((pm) => {
                const isCod = pm.id === "cod";
                const isDisabled = isCod && !codAvailable;
                const checked = paymentMethod === pm.id;
                return (
                  <label
                    key={pm.id}
                    className={cx("sf-radio", styles.method, checked && styles.checked, isDisabled && styles.unavailable)}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={pm.id}
                      checked={checked}
                      disabled={isDisabled}
                      onChange={() => setPaymentMethod(pm.id)}
                    />
                    <span className={styles.methodText}>
                      <span className={styles.methodName}>{pm.label}</span>
                      <span className={styles.methodMeta}>
                        <span className="sf-visually-hidden">, </span>
                        {isCod ? codDescription : pm.desc}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {renderPaymentDetails()}
          {gatewayConfigured && paymentMethod !== "cod" && (
            <p className={styles.gatewayNote}>Payment details are collected securely at the gateway.</p>
          )}
        </>
      )}
    </>
  );

  // ── Step 4: review ───────────────────────────────────────────────────────
  const renderReviewBlock = (id, title, editLabel, editStep, children) => (
    <section className={styles.reviewBlock} aria-labelledby={id}>
      <div className={styles.reviewBlockHead}>
        <h3 id={id} className={styles.reviewBlockTitle}>
          {title}
        </h3>
        <button
          type="button"
          className="sf-btn sf-btn--link"
          onClick={() => goToStep(editStep)}
          aria-disabled={isProcessing || undefined}
        >
          Edit<span className="sf-visually-hidden"> {editLabel}</span>
        </button>
      </div>
      <div className={styles.reviewText}>{children}</div>
    </section>
  );

  const renderFacts = () => {
    const promise = selectedShipping ? deliveryPromise(selectedShipping) : null;
    const paymentCue = fullyCovered
      ? { icon: <CheckGlyph size={16} />, text: "Paid in full with store credit" }
      : paymentMethod === "cod"
      ? { icon: <TrustIcon name="cash" />, text: "Pay in cash on delivery" }
      : { icon: <TrustIcon name="lock" />, text: "Secure payment" };
    return (
      <div className={styles.facts}>
        <p className={styles.factsAmount}>
          <span className={styles.factsLabel}>Amount payable</span>
          <span className={styles.factsValue}>{formatCurrency(amountPayable)}</span>
        </p>
        <ul className={styles.factsList} aria-label="About this order">
          {promise && (
            <li className={styles.fact}>
              <span className={styles.factIcon}>
                <TrustIcon name="truck" />
              </span>
              {promise}
            </li>
          )}
          {returnsDays > 0 && (
            <li className={styles.fact}>
              <span className={styles.factIcon}>
                <TrustIcon name="rotate" />
              </span>
              Easy returns within {returnsDays} {returnsDays === 1 ? "day" : "days"} of delivery
            </li>
          )}
          <li className={styles.fact}>
            <span className={styles.factIcon}>{paymentCue.icon}</span>
            {paymentCue.text}
          </li>
        </ul>
      </div>
    );
  };

  const renderReviewStep = () => (
    <>
      <StepHeading index={3} headingRef={stepHeadingRef}>
        Review your order
      </StepHeading>

      <ul className={styles.lines} aria-label="Items in your order">
        {cartItems.map((item) => (
          <li key={item.id} className={styles.line}>
            <span className={styles.thumb}>
              <img
                src={item.image || PLACEHOLDER_IMG}
                alt=""
                width="72"
                height="90"
                loading="lazy"
                decoding="async"
                onError={onImageError}
              />
            </span>
            <div className={styles.lineBody}>
              <p className={styles.lineName}>{item.name}</p>
              {item.variantName && <p className={styles.lineVariant}>{item.variantName}</p>}
              <div className={styles.lineFoot}>
                <p className={styles.lineUnit}>
                  Qty {item.quantity} × {formatCurrency(item.price)}
                </p>
                <p className={styles.lineTotal}>
                  <span className="sf-visually-hidden">Line total </span>
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.reviewBlocks}>
        {renderReviewBlock(
          "checkout-review-address",
          "Deliver to",
          "delivery address",
          1,
          <>
            <p className={styles.reviewStrong}>
              {reviewAddress.firstName} {reviewAddress.lastName}
            </p>
            <p>
              {reviewAddress.addressLine1}
              {reviewAddress.addressLine2 ? `, ${reviewAddress.addressLine2}` : ""}
            </p>
            <p>{cityLine(reviewAddress)}</p>
            <p>{reviewAddress.country}</p>
            <p>{reviewAddress.phone}</p>
          </>
        )}
        {renderReviewBlock(
          "checkout-review-delivery",
          "Delivery method",
          "delivery method",
          1,
          <>
            <p className={styles.reviewStrong}>{selectedShipping?.name}</p>
            {selectedShipping && (
              <p>{deliveryWindow(selectedShipping.estimatedDays) || selectedShipping.description}</p>
            )}
            <p className={cx(styles.reviewStrong, shippingCost === 0 && styles.free)}>
              {shippingCost === 0 ? "Free" : formatCurrency(shippingCost)}
            </p>
          </>
        )}
        {renderReviewBlock(
          "checkout-review-payment",
          "Payment",
          "payment",
          2,
          fullyCovered ? (
            <>
              <p className={styles.reviewStrong}>Store credit</p>
              <p>Paid in full with store credit ({formatCurrency(storeCreditApplied)}).</p>
            </>
          ) : (
            <>
              <p className={styles.reviewStrong}>{selectedPaymentOption?.label}</p>
              {storeCreditApplied > 0 && <p>Store credit applied: −{formatCurrency(storeCreditApplied)}</p>}
              {paymentMethod === "cod" ? (
                <p>Pay {formatCurrency(amountPayable)} in cash on delivery.</p>
              ) : (
                <p>You will be charged {formatCurrency(amountPayable)}.</p>
              )}
            </>
          )
        )}
      </div>

      {renderFacts()}

      <div role="alert">
        {orderError && (
          <p className={styles.orderAlert}>
            <span className={styles.orderAlertIcon}>
              <AlertGlyph size={18} />
            </span>
            We couldn't place your order. Nothing has been charged. Please try again.
          </p>
        )}
      </div>
    </>
  );

  // ── The actions under every step ─────────────────────────────────────────
  const renderActions = () => {
    const signInFirst = step === 0 && !isAuthenticated;
    const primaryUnavailable = isProcessing || cartItems.length === 0;
    return (
      <div className={styles.actions}>
        {step > 0 && (
          <button
            type="button"
            className={cx("sf-btn sf-btn--link", styles.back)}
            onClick={() => goToStep(step - 1)}
            aria-disabled={isProcessing || undefined}
          >
            <BackGlyph size={16} />
            Back
          </button>
        )}
        <button
          ref={primaryRef}
          type="button"
          className={cx("sf-btn sf-btn--primary sf-btn--lg", styles.primary)}
          onClick={onPrimaryClick}
          aria-disabled={primaryUnavailable || undefined}
          aria-busy={isProcessing || undefined}
          data-busy={isProcessing || undefined}
          aria-haspopup={signInFirst ? "dialog" : undefined}
        >
          {isProcessing
            ? "Processing…"
            : step === 3
            ? fullyCovered
              ? "Place order"
              : `Place order · ${formatCurrency(amountPayable)}`
            : signInFirst
            ? "Sign in to continue"
            : "Continue"}
        </button>
      </div>
    );
  };

  // ── The order summary ────────────────────────────────────────────────────
  const renderSummary = () => {
    // Only what the data backs: COD while the settings say it is on, returns
    // while the window is above 0, delivery from the chosen (else Standard)
    // method. Drawn once both reads have settled, so nothing pops in.
    const delivery = deliveryCue(selectedShipping || standardMethod(shippingMethods));
    const cues = [
      { key: "secure", icon: "lock", text: "Secure payment" },
      storeSettings && codEnabled ? { key: "cod", icon: "cash", text: "Cash on Delivery available" } : null,
      returnsDays > 0
        ? { key: "returns", icon: "rotate", text: `Easy returns · ${returnsDays} ${returnsDays === 1 ? "day" : "days"}` }
        : null,
      delivery ? { key: "delivery", icon: "truck", text: delivery } : null,
    ].filter(Boolean);

    return (
      <section
        ref={setSummaryNode}
        className={styles.summary}
        aria-labelledby="checkout-summary-title"
        tabIndex={summaryScrolls ? 0 : undefined}
      >
        <button
          type="button"
          className={styles.summaryToggle}
          aria-expanded={summaryOpen}
          aria-controls="checkout-summary-body"
          onClick={toggleSummary}
        >
          <span className={styles.summaryToggleLabel}>Order summary</span>
          <span className={styles.summaryToggleAmount}>
            <span className="sf-visually-hidden">, </span>
            {totalsPending ? <Pending className={styles.pendingToggle} /> : formatCurrency(amountPayable)}
          </span>
          <ChevronGlyph size={18} className={styles.summaryChevron} />
        </button>

        <div id="checkout-summary-body" className={styles.summaryBody} data-open={summaryOpen ? "true" : "false"}>
          <h2 id="checkout-summary-title" className={cx("sf-display-sm", styles.summaryTitle)}>
            Order summary
          </h2>

          <ul className={styles.summaryLines} aria-label="Items">
            {cartItems.slice(0, 3).map((item) => (
              <li key={item.id} className={styles.summaryLine}>
                <span className={styles.summaryLineText}>
                  <span className={styles.summaryLineName}>{item.name}</span>
                  <span className={styles.summaryLineMeta}>
                    <span className="sf-visually-hidden">, </span>
                    {item.variantName ? `${item.variantName} · ` : ""}Qty {item.quantity}
                  </span>
                </span>
                <span className={styles.summaryLineTotal}>
                  <span className="sf-visually-hidden">, </span>
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          {cartItems.length > 3 && (
            <p className={styles.moreItems}>
              +{cartItems.length - 3} more {cartItems.length - 3 === 1 ? "item" : "items"}
            </p>
          )}

          <dl className={styles.totals}>
            <div className={styles.totalsRow}>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(subtotal)}</dd>
            </div>
            {couponDiscount > 0 && (
              <div className={cx(styles.totalsRow, styles.saving)}>
                <dt>Discount ({couponApplied.code})</dt>
                <dd>
                  <span aria-hidden="true">−</span>
                  <span className="sf-visually-hidden">minus </span>
                  {formatCurrency(couponDiscount)}
                </dd>
              </div>
            )}
            <div className={styles.totalsRow}>
              <dt>Shipping</dt>
              <dd className={cx(!shippingPending && selectedShipping && shippingCost === 0 && styles.free)}>
                {shippingPending ? (
                  <Pending />
                ) : !selectedShipping ? (
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="sf-visually-hidden">Not chosen yet</span>
                  </>
                ) : shippingCost === 0 ? (
                  "Free"
                ) : (
                  formatCurrency(shippingCost)
                )}
              </dd>
            </div>
            <div className={styles.totalsRow}>
              <dt>Tax ({taxRatePct}% GST)</dt>
              <dd>{settingsLoaded ? formatCurrency(taxAmount) : <Pending />}</dd>
            </div>
            <div className={cx(styles.totalsRow, styles.totalRow)}>
              <dt>Total</dt>
              <dd>{totalsPending ? <Pending className={styles.pendingLarge} /> : formatCurrency(total)}</dd>
            </div>
            {storeCreditApplied > 0 && (
              <>
                <div className={cx(styles.totalsRow, styles.saving)}>
                  <dt>Store credit</dt>
                  <dd>
                    <span aria-hidden="true">−</span>
                    <span className="sf-visually-hidden">minus </span>
                    {formatCurrency(storeCreditApplied)}
                  </dd>
                </div>
                <div className={cx(styles.totalsRow, styles.totalRow)}>
                  <dt>Amount payable</dt>
                  <dd>{formatCurrency(amountPayable)}</dd>
                </div>
              </>
            )}
          </dl>

          {!totalsPending && (
            <ul className={styles.cues} aria-label="Our promises">
              {cues.map((cue) => (
                <li key={cue.key} className={styles.cue}>
                  <span className={styles.cueIcon}>
                    <TrustIcon name={cue.icon} />
                  </span>
                  {cue.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Breadcrumb items={[{ label: "Checkout" }]} />
        <h1 className={cx("sf-display-md", styles.title)}>Checkout</h1>
        {renderStepper()}
      </header>

      <div className={styles.layout}>
        {renderSummary()}

        <div className={styles.main}>
          <AnimatePresence mode="wait" initial={false}>
            <StepPanel key={STEPS[step]} reduceMotion={reduceMotion}>
              {step === 0 && renderCartStep()}
              {step === 1 && renderShippingStep()}
              {step === 2 && renderPaymentStep()}
              {step === 3 && renderReviewStep()}
            </StepPanel>
          </AnimatePresence>
          {renderActions()}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
