import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import Swal from "sweetalert2";
import { useAuth } from "../../hooks/useAuth";
import apiService from "../../services/api";
import AccountLayout from "../../components/account/AccountLayout";
import { Reveal } from "../../components/ui";
import { TOKENS } from "../../theme/tokens";
import { formatDateIN, formatCurrency, generateId, isValidPhone } from "../../utils/helpers";
import styles from "./Profile.module.css";

// =============================================================================
// Profile — /profile, the account page (prompts/DESIGN_SYSTEM.md §31)
// =============================================================================
// AccountLayout (the header and AccountNav) around one section at a time:
// profile (the default), addresses, wallet or password. Orders and Wishlist
// are routes of their own.
//
// THE ?tab= CONTRACT
//   The section comes from the URL: /profile?tab=addresses | wallet |
//   password; no value (or any other value) shows the Profile section. It is
//   read on every location change, so AccountNav's links (from any page), the
//   header's "My account", back and forward all land on the right section.
//   AccountNav switches tabs here with replace, so tabs add no history. After
//   a switch, focus moves to the new section (a region named after it).
//
// GUESTS
//   Once the session restore has settled, a guest sees a sign-in panel here
//   (no silent redirect home). "Sign in" opens the auth modal; signing in
//   renders the account in place, on the tab the URL asked for, and moves
//   focus to the greeting once the dialog has gone.
//
// ADDRESSES AND CHANGE PASSWORD (§32)
//   Addresses: hairline cards (the default one carries a caramel bar), and a
//   sand form with an "Address type" radio group, labelled fields with
//   autocomplete, inline errors and focus on the first one that needs
//   attention. Every address is saved as the whole array through
//   updateUser({ addresses }), as before. Change password: a hairline card, a
//   440px form with Show / Hide on each field, the strength meter on the
//   semantic tokens and a checklist; the request is changePassword(), as
//   before. Focus moves with the work: into an opened form, back to what
//   opened it, and to the nearest card when a card's own button goes away.
//
// STORE CREDIT (§33)
//   A navy balance card (the balance in the display serif, "Browse furniture"), a
//   hairline "How it works" line and the ledger: a hairline table from 601px,
//   a list of label / value rows up to 600px, 50 entries at a time. The two
//   reads are the ones the tab always made, getBalance and getTransactions,
//   started when the tab opens; the balance shown is the API's (the page
//   never adds up the ledger). Skeletons while they run, an empty state, and
//   a "Try again" panel when they fail.
// =============================================================================

const PROFILE_TABS = ["profile", "addresses", "wallet", "password"];

// The section region's name (it takes focus after a tab switch).
const SECTION_LABELS = {
  profile: "Personal information",
  addresses: "Addresses",
  wallet: "Store credit",
  password: "Change password",
};

const EMPTY_FEEDBACK = { type: "", message: "" };

const cx = (...names) => names.filter(Boolean).join(" ");

// The sticky header's visible height, published by the header (§17.2).
const headerHeight = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sf-header-height")) || 0;

// Scroll so `element` starts 16px under the sticky header ("instant", not
// "auto", under reduced motion: the root's scroll-behavior is smooth).
const scrollUnderHeader = (element, reduceMotion) =>
  window.scrollTo({
    top: Math.max(0, window.scrollY + element.getBoundingClientRect().top - headerHeight() - TOKENS.space[4]),
    behavior: reduceMotion ? "instant" : "smooth",
  });

// Focus an element without the browser's own scroll, then bring it (or `box`,
// the field around it) to 16px under the sticky header when the header covers
// it or it is outside the window: focus() alone leaves an element the header
// hides where it is, since it counts as in view.
const focusAndReveal = (element, reduceMotion, box = element) => {
  element.focus({ preventScroll: true });
  const rect = box.getBoundingClientRect();
  if (rect.top < headerHeight() || rect.bottom > window.innerHeight) scrollUnderHeader(box, reduceMotion);
};

// ---- Addresses (§32) ----------------------------------------------------------

// The "Address type" radio group (the card's eyebrow).
const ADDRESS_LABELS = ["Home", "Work", "Other"];

// The address form's fields, in form order: a visible label, the autocomplete
// token for each part of the address, and a hint where the old placeholder
// carried one.
const ADDRESS_FIELDS = [
  { name: "firstName", id: "address-first-name", label: "First name", autoComplete: "given-name", autoCapitalize: "words", required: true },
  { name: "lastName", id: "address-last-name", label: "Last name", autoComplete: "family-name", autoCapitalize: "words", required: true },
  { name: "phone", id: "address-phone", label: "Phone number", type: "tel", inputMode: "tel", autoComplete: "tel", hint: "10-digit mobile number", required: true, wide: true },
  { name: "addressLine1", id: "address-line-1", label: "Address line 1", autoComplete: "address-line1", hint: "House or flat number, building and street", required: true, wide: true },
  { name: "addressLine2", id: "address-line-2", label: "Address line 2", optional: true, autoComplete: "address-line2", hint: "Landmark or area", wide: true },
  { name: "city", id: "address-city", label: "City", autoComplete: "address-level2", autoCapitalize: "words", required: true },
  { name: "state", id: "address-state", label: "State", autoComplete: "address-level1", autoCapitalize: "words", required: true },
  { name: "postalCode", id: "address-postal-code", label: "Postal code", inputMode: "numeric", autoComplete: "postal-code", hint: "6-digit PIN", required: true },
  { name: "country", id: "address-country", label: "Country", autoComplete: "country-name", hint: "We deliver within India only", readOnly: true },
];

// A card's buttons carry its name ("Edit Home address at 123 Main Street"),
// so a list of cards never reads as a row of bare "Edit"s.
const addressContext = (address) => {
  const name = address.label ? `${address.label} address` : "Address";
  return address.addressLine1 ? `${name} at ${address.addressLine1}` : name;
};

// "Mumbai, Maharashtra 400001" (legacy rows may carry zipCode).
const cityLine = (address) =>
  [[address.city, address.state].filter(Boolean).join(", "), address.postalCode || address.zipCode]
    .filter(Boolean)
    .join(" ");

// ---- Change password (§32) ----------------------------------------------------

// The three fields, keyed like showPasswords. `noun` completes the Show / Hide
// button's name ("Show current password") and its announcement.
const PASSWORD_FIELDS = {
  current: { name: "currentPassword", id: "password-current", label: "Current password", autoComplete: "current-password", noun: "current password" },
  new: { name: "newPassword", id: "password-new", label: "New password", autoComplete: "new-password", noun: "new password" },
  confirm: { name: "confirmPassword", id: "password-confirm", label: "Confirm new password", autoComplete: "new-password", noun: "password confirmation" },
};

// The checklist under the new password: display only, as before (the one
// rule the form enforces is the 8-character minimum).
const PASSWORD_CHECKS = [
  { label: "At least 8 characters", test: (password) => password.length >= 8 },
  { label: "One uppercase letter", test: (password) => /[A-Z]/.test(password) },
  { label: "One lowercase letter", test: (password) => /[a-z]/.test(password) },
  { label: "One number", test: (password) => /[0-9]/.test(password) },
  { label: "One special character", test: (password) => /[^A-Za-z0-9]/.test(password) },
];

// A check (the rule passes) or a small ring (not yet), in currentColor.
const CheckGlyph = ({ met }) => (
  <svg className={styles.checkGlyph} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {met ? <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" /> : <circle cx="8" cy="8" r="2.5" />}
  </svg>
);

// ---- Store credit (§33) ----------------------------------------------------------

// The ledger lists 50 entries at first; "Show more" adds 50 at a time.
const WALLET_PAGE_SIZE = 50;

// "How it works": static, and true of the storefront today. A third fact, "It
// never expires", waits until the business confirms an expiry policy.
const WALLET_FACTS = [
  "Credit is added when a refund is issued to store credit",
  "Apply it at checkout on any order",
];

// The tab's state before each read: the skeletons, never a figure from an
// earlier visit. `shown` caps the ledger's rows.
const WALLET_LOADING = { status: "loading", balance: 0, transactions: [], shown: WALLET_PAGE_SIZE };

// Any entry that is not a credit is a debit, as the ledger was always read.
const isCreditEntry = (entry) => entry.type === "credit";

// The rows "Show more" can move focus to: the first of each further 50.
const isPageStart = (index) => index > 0 && index % WALLET_PAGE_SIZE === 0;

// A value the entry does not carry: a dash, with words for screen readers.
const Missing = ({ label }) => (
  <>
    <span aria-hidden="true">—</span>
    <span className="sf-visually-hidden">{label}</span>
  </>
);

const LedgerDate = ({ entry }) => {
  const time = entry.createdAt ? new Date(entry.createdAt).getTime() : NaN;
  if (Number.isNaN(time)) return <Missing label="Date not recorded" />;
  return <time dateTime={new Date(time).toISOString()}>{formatDateIN(entry.createdAt, "short")}</time>;
};

// The reason, with the order number in it as the link to Orders ("Applied to
// order ORD-…"); a reason that does not name the order is followed by
// "Order ORD-…". The refund number, when the entry has one, goes under it.
const LedgerDescription = ({ entry }) => {
  const reason =
    (typeof entry.reason === "string" && entry.reason.trim()) ||
    (isCreditEntry(entry) ? "Store credit added" : "Store credit used");
  const orderNumber = entry.orderNumber ? String(entry.orderNumber) : "";
  const refundNumber = entry.refundNumber ? String(entry.refundNumber) : "";
  const at = orderNumber ? reason.indexOf(orderNumber) : -1;
  const orderLink = orderNumber && (
    <Link to="/orders" className={cx("sf-btn sf-btn--link", styles.orderLink)}>
      {orderNumber}
    </Link>
  );
  const orderOnItsOwn = Boolean(orderNumber) && at < 0;
  return (
    <>
      <span className={styles.txReason}>
        {at < 0 ? (
          reason
        ) : (
          <>
            {reason.slice(0, at)}
            {orderLink}
            {reason.slice(at + orderNumber.length)}
          </>
        )}
      </span>
      {(orderOnItsOwn || refundNumber) && (
        <span className={styles.txMeta}>
          {orderOnItsOwn && <span>Order {orderLink}</span>}
          {refundNumber && <span>Refund {refundNumber}</span>}
        </span>
      )}
    </>
  );
};

// "+₹4,302.00" in the success tone or "−₹1,000.00" in ink, read as "Credit of
// ₹4,302.00" / "Debit of ₹1,000.00" (the sign and the colour stay visual).
const LedgerAmount = ({ entry }) => {
  const credit = isCreditEntry(entry);
  const amount = formatCurrency(Math.abs(Number(entry.amount) || 0));
  return (
    <span className={styles.txAmount} data-type={credit ? "credit" : "debit"}>
      <span aria-hidden="true">
        {credit ? "+" : "−"}
        {amount}
      </span>
      <span className="sf-visually-hidden">
        {credit ? "Credit" : "Debit"} of {amount}
      </span>
    </span>
  );
};

// The running balance the API recorded with the entry (never worked out here).
const LedgerBalance = ({ entry }) => {
  const value = entry.balanceAfter == null || entry.balanceAfter === "" ? NaN : Number(entry.balanceAfter);
  return Number.isFinite(value) ? formatCurrency(value) : <Missing label="Not recorded" />;
};

const entryKey = (entry, index) => entry.id ?? `entry-${index}`;

// The ledger twice over: a hairline table (from 601px) and a list of label /
// value rows (up to 600px). The stylesheet shows one; the other is display:
// none, which takes it out of the accessibility tree too. `rowRef(view, i)`
// keeps the rows "Show more" moves focus to.
const LedgerTable = ({ entries, labelledBy, rowRef }) => (
  <table className={styles.ledgerTable} aria-labelledby={labelledBy}>
    <thead>
      <tr>
        <th scope="col">Date</th>
        <th scope="col">Description</th>
        <th scope="col" className={styles.num}>
          Amount
        </th>
        <th scope="col" className={styles.num}>
          Balance
        </th>
      </tr>
    </thead>
    <tbody>
      {entries.map((entry, index) => (
        <tr
          key={entryKey(entry, index)}
          ref={rowRef("table", index)}
          tabIndex={isPageStart(index) ? -1 : undefined}
        >
          <td className={styles.txDate}>
            <LedgerDate entry={entry} />
          </td>
          <td className={styles.txDescription}>
            <LedgerDescription entry={entry} />
          </td>
          <td className={styles.num}>
            <LedgerAmount entry={entry} />
          </td>
          <td className={cx(styles.num, styles.txBalance)}>
            <LedgerBalance entry={entry} />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const LedgerList = ({ entries, labelledBy, rowRef }) => (
  <ul className={styles.ledgerList} aria-labelledby={labelledBy}>
    {entries.map((entry, index) => (
      <li
        key={entryKey(entry, index)}
        ref={rowRef("list", index)}
        tabIndex={isPageStart(index) ? -1 : undefined}
        className={styles.ledgerItem}
      >
        <dl className={styles.txFacts}>
          <div>
            <dt>Date</dt>
            <dd className={styles.txDate}>
              <LedgerDate entry={entry} />
            </dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>
              <LedgerDescription entry={entry} />
            </dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>
              <LedgerAmount entry={entry} />
            </dd>
          </div>
          <div>
            <dt>Balance</dt>
            <dd className={styles.txBalance}>
              <LedgerBalance entry={entry} />
            </dd>
          </div>
        </dl>
      </li>
    ))}
  </ul>
);

// Loading: the table's head over three placeholder rows (from 601px), three
// placeholder entries (up to 600px). Hidden from assistive technology; the
// section says "Loading your store credit" instead.
const SKELETON_ROWS = [0, 1, 2];
const LedgerSkeleton = () => (
  <div aria-hidden="true">
    <table className={cx(styles.ledgerTable, styles.ledgerSkeleton)}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th className={styles.num}>Amount</th>
          <th className={styles.num}>Balance</th>
        </tr>
      </thead>
      <tbody>
        {SKELETON_ROWS.map((row) => (
          <tr key={row}>
            <td className={styles.txDate}>
              <span className={cx("sf-skeleton sf-skeleton--text", styles.skeletonDate)} />
            </td>
            <td className={styles.txDescription}>
              <span className={cx("sf-skeleton sf-skeleton--text", styles.skeletonReason)} />
            </td>
            <td className={styles.num}>
              <span className={cx("sf-skeleton sf-skeleton--text", styles.skeletonFigure)} />
            </td>
            <td className={styles.num}>
              <span className={cx("sf-skeleton sf-skeleton--text", styles.skeletonFigure)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <ul className={cx(styles.ledgerList, styles.ledgerSkeleton)}>
      {SKELETON_ROWS.map((row) => (
        <li key={row} className={styles.ledgerItem}>
          <span className={cx("sf-skeleton sf-skeleton--text", styles.skeletonDate)} />
          <span className={cx("sf-skeleton sf-skeleton--text", styles.skeletonReason)} />
          <span className={cx("sf-skeleton sf-skeleton--text", styles.skeletonFigure)} />
        </li>
      ))}
    </ul>
  </div>
);

// The toast's tone glyph, drawn in currentColor (the success or error token).
const FeedbackGlyph = ({ tone }) =>
  tone === "success" ? (
    <svg className={styles.toastGlyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg className={styles.toastGlyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="7.5" x2="12" y2="12.5" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

const Profile = () => {
  const reduceMotion = useReducedMotion();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    updateUser,
    openAuthModal,
    authModalOpen,
  } = useAuth();

  // The section on screen comes from the URL (see "The ?tab= contract").
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = PROFILE_TABS.includes(tabParam) ? tabParam : "profile";

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);

  // Store credit: the balance and the ledger, read when the tab opens (status
  // "loading" | "ready" | "error"; `shown` caps the ledger's rows).
  const [wallet, setWallet] = useState(WALLET_LOADING);
  // "Try again" bumps this to run the same two reads again; after a retry
  // that fails, focus goes to the new "Try again".
  const [walletAttempt, setWalletAttempt] = useState(0);
  const walletRetried = useRef(false);
  const walletRetryRef = useRef(null);
  // The ledger's rows in each view, for "Show more"'s focus move.
  const walletRows = useRef({ table: [], list: [] });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  // Inline messages under the profile fields ("" or absent = none).
  const [profileErrors, setProfileErrors] = useState({});
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const phoneRef = useRef(null);

  // Focus targets: the h1 (after signing in here) and the section region
  // (after a tab switch).
  const titleRef = useRef(null);
  const sectionRef = useRef(null);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  // Inline messages under the password fields, from the last submit. The
  // confirmation also says "Passwords don’t match" on its own as soon as it
  // cannot match (the old form said it from the first keystroke; see
  // renderPasswordSection), until the two match.
  const [passwordErrors, setPasswordErrors] = useState({});
  const passwordFieldRefs = useRef({});
  // The visually hidden line that says "Current password shown." (a new key
  // re-announces a repeated message).
  const [passwordAnnouncement, setPasswordAnnouncement] = useState({ key: 0, text: "" });

  // Address state
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState(null);
  const [addressForm, setAddressForm] = useState({
    id: null,
    label: "Home",
    firstName: "",
    lastName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    isDefault: false,
  });
  // Inline messages under the address fields ("" or absent = none).
  const [addressErrors, setAddressErrors] = useState({});
  const addressFieldRefs = useRef({});
  const labelChipRefs = useRef([]);
  // Focus targets as the addresses change: the form's heading, "Add address"
  // and the empty state's button, each card's heading, Edit and Delete.
  const addressFormTitleRef = useRef(null);
  const addAddressRef = useRef(null);
  const emptyAddressRef = useRef(null);
  const emptyTitleRef = useRef(null);
  const cardHeadingRefs = useRef([]);
  const editButtonRefs = useRef([]);
  const deleteButtonRefs = useRef([]);

  // Focus to move once the change that asks for it is on screen (a form
  // opened or closed, a card's own button gone): requestFocus(resolve) keeps
  // a function that returns the element and bumps focusRequest in the same
  // batch as that change, so the effect runs after the commit that shows it
  // (not after an earlier commit whose effects flush first).
  const pendingFocus = useRef(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const requestFocus = (resolve) => {
    pendingFocus.current = resolve;
    setFocusRequest((count) => count + 1);
  };
  useEffect(() => {
    const resolve = pendingFocus.current;
    if (!resolve) return;
    pendingFocus.current = null;
    const target = resolve();
    if (target && target.isConnected) focusAndReveal(target, reduceMotion);
  }, [focusRequest, reduceMotion]);

  // Populate form data from user
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
      });
      setProfileErrors({});
      setAddresses(user.addresses || []);
    }
  }, [user]);

  // Guests see a sign-in panel (rendered below, once the session restore has
  // settled) instead of a silent redirect home. When someone signs in from
  // it, the panel and its "Sign in" button (the dialog's opener) are gone, so
  // focus moves to the greeting once the dialog has left the page.
  const sawGuest = useRef(false);
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

  // After a tab switch (not on arrival): drop the last message, as switching
  // always did, and move focus to the new section. A switch made from the
  // sticky rail far down a long section would leave the new one above the
  // window, so its top is brought back under the header.
  const shownTab = useRef(activeTab);
  useEffect(() => {
    if (shownTab.current === activeTab) return;
    shownTab.current = activeTab;
    setFeedback(EMPTY_FEEDBACK);
    const region = sectionRef.current;
    if (!region) return;
    region.focus({ preventScroll: true });
    if (region.getBoundingClientRect().top < headerHeight()) scrollUnderHeader(region, reduceMotion);
  }, [activeTab, reduceMotion]);

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (feedback.message) {
      const timer = setTimeout(() => setFeedback({ type: "", message: "" }), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Load wallet balance + ledger when the Store Credit tab is opened (fresh
  // from the API, so a refund issued by the admin in another session shows up),
  // and again after "Try again". The balance is the API's, as it comes: the
  // page never adds up the ledger.
  useEffect(() => {
    if (activeTab !== "wallet" || !user?.id) return;
    let active = true;
    (async () => {
      setWallet(WALLET_LOADING);
      try {
        const [bal, tx] = await Promise.all([
          apiService.wallet.getBalance(user.id),
          apiService.wallet.getTransactions(user.id),
        ]);
        if (active) {
          setWallet({
            status: "ready",
            balance: Number(bal) || 0,
            transactions: Array.isArray(tx) ? tx : [],
            shown: WALLET_PAGE_SIZE,
          });
        }
      } catch (e) {
        console.error("Load wallet error:", e);
        if (active) setWallet((current) => ({ ...current, status: "error" }));
      }
    })();
    // Leaving the tab (or reading again) starts the next visit from the
    // skeletons, never from the last visit's figures.
    return () => {
      active = false;
      setWallet(WALLET_LOADING);
    };
  }, [activeTab, user, walletAttempt]);

  // After "Try again", focus waited on the section region while the reads ran
  // (the panel had made way for the skeletons). If they fail again, it moves
  // to the new "Try again", unless it has gone somewhere else meanwhile.
  useEffect(() => {
    if (!walletRetried.current || wallet.status === "loading") return;
    walletRetried.current = false;
    const focused = document.activeElement;
    const waiting = !focused || focused === document.body || focused === sectionRef.current;
    if (wallet.status === "error" && waiting && walletRetryRef.current) walletRetryRef.current.focus();
  }, [wallet.status]);

  // The session restore settles on the first render: nothing to show before.
  if (authLoading) return null;

  if (!isAuthenticated || !user) {
    return (
      <AccountLayout titleRef={titleRef}>
        <div className={cx("sf-panel", styles.guest)}>
          <h2 className={cx("sf-display-sm", styles.guestTitle)}>Sign in to see your account.</h2>
          <p className={styles.guestText}>
            Your details, saved addresses and store credit are kept on your account.
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

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  // ---- Profile handlers ----
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
    // Editing a field clears its message.
    setProfileErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  };

  const handleProfileSave = async (event) => {
    if (event) event.preventDefault();
    if (loading) return;

    // The rules are the same as ever. Each field now also says what is wrong
    // with it, and focus moves to the first one that needs attention; the
    // toast still carries the first rule's message.
    const errors = {};
    if (!profileForm.firstName.trim()) errors.firstName = "Enter your first name";
    if (!profileForm.lastName.trim()) errors.lastName = "Enter your last name";
    if (profileForm.phone && !isValidPhone(profileForm.phone)) {
      errors.phone = "Enter a 10-digit mobile number";
    }
    setProfileErrors(errors);
    const firstInvalid = [
      ["firstName", firstNameRef],
      ["lastName", lastNameRef],
      ["phone", phoneRef],
    ].find(([name]) => errors[name]);
    if (firstInvalid && firstInvalid[1].current) {
      const input = firstInvalid[1].current;
      input.focus({ preventScroll: true });
      // focus() leaves a field the sticky header covers where it is (it is
      // "in view"), so bring the whole field, label first, under the header.
      const field = input.closest(".sf-field") || input;
      const box = field.getBoundingClientRect();
      if (box.top < headerHeight() || box.bottom > window.innerHeight) scrollUnderHeader(field, reduceMotion);
    }

    if (errors.firstName || errors.lastName) {
      showFeedback("error", "Add your first and last name to save your details.");
      return;
    }
    if (errors.phone) {
      showFeedback("error", "Enter a 10-digit mobile number to save your details.");
      return;
    }

    setLoading(true);
    try {
      await updateUser({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phone: profileForm.phone.trim(),
      });
      showFeedback("success", "Details saved.");
    } catch (err) {
      showFeedback("error", "We couldn’t save your details. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Password handlers ----
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    // Editing a field clears its message.
    setPasswordErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  };

  // The score and thresholds are the same as ever; the tones moved to the
  // stylesheet (the meter reads data-level, 1 weak … 4 strong).
  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, label: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { level: 1, label: "Weak" };
    if (score <= 4) return { level: 2, label: "Fair" };
    if (score <= 5) return { level: 3, label: "Good" };
    return { level: 4, label: "Strong" };
  };

  // Show / Hide. The button's name follows its text ("Show current password",
  // "Hide current password"), so it carries no aria-pressed (§30.4), and the
  // hidden status line says what changed.
  const togglePasswordVisibility = (key) => {
    const { noun } = PASSWORD_FIELDS[key];
    const text = `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${showPasswords[key] ? "hidden" : "shown"}.`;
    setPasswordAnnouncement((previous) => ({ key: previous.key + 1, text }));
    setShowPasswords((p) => ({ ...p, [key]: !p[key] }));
  };

  const handlePasswordSubmit = async (event) => {
    if (event) event.preventDefault();
    if (loading) return;

    // The rules, their order and their toasts are the same as ever. Each field
    // now also says what is wrong with it, and focus moves to the first one
    // that needs attention; the toast still carries the first rule's message.
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    const errors = {};
    if (!currentPassword) errors.currentPassword = "Enter your current password";
    if (newPassword.length < 8) {
      errors.newPassword = newPassword ? "Use at least 8 characters" : "Enter a new password";
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = confirmPassword ? "Passwords don’t match" : "Enter the new password again";
    }
    setPasswordErrors(errors);
    const firstInvalid = ["current", "new", "confirm"].find((key) => errors[PASSWORD_FIELDS[key].name]);
    if (firstInvalid) {
      const input = passwordFieldRefs.current[PASSWORD_FIELDS[firstInvalid].name];
      if (input) focusAndReveal(input, reduceMotion, input.closest(".sf-field") || input);
    }

    if (!passwordForm.currentPassword) {
      showFeedback("error", "Enter your current password to continue.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showFeedback("error", "Your new password needs at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showFeedback("error", "The new passwords don’t match.");
      return;
    }

    setLoading(true);
    try {
      await apiService.auth.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswords({ current: false, new: false, confirm: false });
      showFeedback("success", "Password updated.");
    } catch (err) {
      showFeedback("error", "We couldn’t update your password. Check your current password and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Address handlers ----
  const resetAddressForm = () => {
    setAddressForm({
      id: null,
      label: "Home",
      firstName: "",
      lastName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
      isDefault: false,
    });
    setShowAddressForm(false);
    setEditingAddressIndex(null);
    setAddressErrors({});
  };

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Editing a field clears its message.
    setAddressErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  };

  // Opening the form moves focus to its heading. Closing it (Cancel, or a
  // save) gives focus back to what opened it: the card's Edit button, else
  // "Add address", or the empty state's button when there is no address.
  const focusAddressFormTitle = () => {
    requestFocus(() => addressFormTitleRef.current);
  };
  const focusAddressOpener = (editedIndex) => {
    requestFocus(() =>
      editedIndex !== null ? editButtonRefs.current[editedIndex] : addAddressRef.current || emptyAddressRef.current
    );
  };

  const openNewAddressForm = () => {
    resetAddressForm();
    setShowAddressForm(true);
    focusAddressFormTitle();
  };

  const cancelAddressForm = () => {
    if (loading) return;
    const editedIndex = editingAddressIndex;
    resetAddressForm();
    focusAddressOpener(editedIndex);
  };

  // "Address type": arrow keys move along the chips and select (a radio
  // group); Home and End jump to either end.
  const handleLabelKeyDown = (event, index) => {
    const count = ADDRESS_LABELS.length;
    let next;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % count;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else return;
    event.preventDefault();
    const label = ADDRESS_LABELS[next];
    setAddressForm((prev) => ({ ...prev, label }));
    if (labelChipRefs.current[next]) labelChipRefs.current[next].focus();
  };

  const handleAddressSave = async (event) => {
    if (event) event.preventDefault();
    if (loading) return;

    // The rules are the same as ever: the required fields, then the phone.
    // Each field now also says what is wrong with it, and focus moves to the
    // first one that needs attention (form order); the toast still carries
    // the first rule's message.
    const errors = {};
    if (!addressForm.firstName.trim()) errors.firstName = "Enter a first name";
    if (!addressForm.lastName.trim()) errors.lastName = "Enter a last name";
    if (!isValidPhone(addressForm.phone)) {
      errors.phone = addressForm.phone.trim() ? "Enter a 10-digit mobile number" : "Enter a phone number";
    }
    if (!addressForm.addressLine1.trim()) errors.addressLine1 = "Enter the house or flat number and street";
    if (!addressForm.city.trim()) errors.city = "Enter a city";
    if (!addressForm.state.trim()) errors.state = "Enter a state";
    if (!addressForm.postalCode.trim()) errors.postalCode = "Enter a 6-digit PIN";
    setAddressErrors(errors);
    const firstInvalid = ADDRESS_FIELDS.find(({ name }) => errors[name]);
    if (firstInvalid) {
      const input = addressFieldRefs.current[firstInvalid.name];
      if (input) focusAndReveal(input, reduceMotion, input.closest(".sf-field") || input);
    }

    if (
      !addressForm.firstName.trim() ||
      !addressForm.lastName.trim() ||
      !addressForm.addressLine1.trim() ||
      !addressForm.city.trim() ||
      !addressForm.state.trim() ||
      !addressForm.postalCode.trim()
    ) {
      showFeedback("error", "Fill in the marked fields to save the address.");
      return;
    }
    if (!isValidPhone(addressForm.phone)) {
      showFeedback("error", "Enter a 10-digit mobile number to save the address.");
      return;
    }

    setLoading(true);
    try {
      // Persist the canonical shape (firstName/lastName/postalCode + a stable
      // id) so the row round-trips with Checkout, Orders and db.json. New rows
      // get an id; edited rows keep theirs.
      const isFirst = addresses.length === 0;
      const entry = {
        ...addressForm,
        id: addressForm.id || generateId(),
        firstName: addressForm.firstName.trim(),
        lastName: addressForm.lastName.trim(),
        phone: addressForm.phone.trim(),
        country: addressForm.country || "India",
        // The first address is always the default; otherwise honour the box.
        isDefault: isFirst ? true : addressForm.isDefault,
      };

      let updatedAddresses = [...addresses];
      // "Default" is exclusive — clear it everywhere else before applying.
      if (entry.isDefault) {
        updatedAddresses = updatedAddresses.map((a) => ({ ...a, isDefault: false }));
      }
      if (editingAddressIndex !== null) {
        updatedAddresses[editingAddressIndex] = entry;
      } else {
        updatedAddresses.push(entry);
      }
      // Guard against zero defaults (e.g. un-checking default on the only row):
      // there must always be exactly one when addresses exist.
      if (updatedAddresses.length > 0 && !updatedAddresses.some((a) => a.isDefault)) {
        updatedAddresses[0] = { ...updatedAddresses[0], isDefault: true };
      }

      await updateUser({ addresses: updatedAddresses });
      setAddresses(updatedAddresses);
      resetAddressForm();
      focusAddressOpener(editingAddressIndex);
      showFeedback(
        "success",
        editingAddressIndex !== null ? "Address updated." : "Address saved."
      );
    } catch (err) {
      showFeedback("error", "We couldn’t save the address. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddressEdit = (index) => {
    if (loading) return;
    const a = addresses[index] || {};
    // Normalise any legacy row (single fullName / zipCode) into the canonical
    // form shape so an edit always writes firstName/lastName/postalCode back.
    const [firstFromFull, ...restFromFull] = (a.fullName || "").trim().split(/\s+/);
    setAddressForm({
      id: a.id || null,
      label: a.label || "Home",
      firstName: a.firstName || firstFromFull || "",
      lastName: a.lastName || restFromFull.join(" ") || "",
      phone: a.phone || "",
      addressLine1: a.addressLine1 || "",
      addressLine2: a.addressLine2 || "",
      city: a.city || "",
      state: a.state || "",
      postalCode: a.postalCode || a.zipCode || "",
      country: a.country || "India",
      isDefault: !!a.isDefault,
    });
    setEditingAddressIndex(index);
    setShowAddressForm(true);
    setAddressErrors({});
    focusAddressFormTitle();
  };

  const handleAddressDelete = async (index) => {
    if (loading) return;
    // The confirm button is the danger primitive (the error token with
    // primary-contrast text in both modes, §31.8), not a hex colour. The page
    // moves focus itself once the dialog has gone (returnFocus: false):
    // SweetAlert's own return comes after its closing animation, by when
    // React has reused this Delete button for the card that took this one's
    // place, so focus would land on that card's Delete.
    const result = await Swal.fire({
      title: "Delete this address?",
      text: "This address will be removed from your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Keep address",
      customClass: { confirmButton: "sf-btn sf-btn--danger" },
      returnFocus: false,
    });
    if (!result.isConfirmed) {
      // Nothing deleted ("Keep address", Escape): back to this card's Delete.
      requestFocus(() => deleteButtonRefs.current[index]);
      return;
    }

    setLoading(true);
    try {
      const removedDefault = addresses[index]?.isDefault;
      let updatedAddresses = addresses.filter((_, i) => i !== index);
      // Deleting the default promotes the next remaining address (immutably —
      // never mutate the shared objects still referenced by state).
      if (removedDefault && updatedAddresses.length > 0) {
        updatedAddresses = updatedAddresses.map((a, i) => ({ ...a, isDefault: i === 0 }));
      }
      await updateUser({ addresses: updatedAddresses });
      setAddresses(updatedAddresses);
      // If we were editing the row we just deleted, drop the open form.
      if (editingAddressIndex === index) resetAddressForm();
      // A form open on a later row follows that row up the list, so saving it
      // still replaces the row it was opened for.
      else if (editingAddressIndex !== null && editingAddressIndex > index) {
        setEditingAddressIndex(editingAddressIndex - 1);
      }
      // The deleted card's buttons are gone: focus moves to the card that took
      // its place (else the one before it), or the empty state.
      requestFocus(
        () =>
          cardHeadingRefs.current[Math.min(index, updatedAddresses.length - 1)] ||
          emptyTitleRef.current ||
          addressFormTitleRef.current
      );
      showFeedback("success", "Address deleted.");
    } catch (err) {
      // Nothing deleted: back to this card's Delete.
      requestFocus(() => deleteButtonRefs.current[index]);
      showFeedback("error", "We couldn’t delete the address. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultAddress = async (index) => {
    if (loading) return;
    setLoading(true);
    try {
      const updatedAddresses = addresses.map((a, i) => ({
        ...a,
        isDefault: i === index,
      }));
      await updateUser({ addresses: updatedAddresses });
      setAddresses(updatedAddresses);
      // "Set as default" has gone from this card: focus moves to its heading,
      // which now reads "Default".
      requestFocus(() => cardHeadingRefs.current[index]);
      showFeedback("success", "Default address updated.");
    } catch (err) {
      showFeedback("error", "We couldn’t change your default address. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  // Signing out (the confirm, logout(), home) lives in AccountNav, which the
  // orders and wishlist pages share; a failure is reported in this page's toast.

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);

  // ---- Render sections ----
  // aria-describedby: the hint, then the message when there is one.
  const describedBy = (...ids) => ids.filter(Boolean).join(" ") || undefined;

  const renderProfileSection = () => (
    <Reveal className={cx("sf-card sf-card--hairline", styles.panel)}>
      <h2 className={cx("sf-display-sm", styles.panelTitle)}>Personal information</h2>
      {user.createdAt && (
        <p className={styles.memberSince}>Member since {formatDateIN(user.createdAt, "medium")}</p>
      )}

      <form className={styles.form} onSubmit={handleProfileSave} noValidate>
        <div className={styles.fields}>
          <div className="sf-field">
            <label className="sf-field__label" htmlFor="profile-first-name">
              First name
            </label>
            <input
              ref={firstNameRef}
              id="profile-first-name"
              className="sf-input"
              type="text"
              name="firstName"
              value={profileForm.firstName}
              onChange={handleProfileChange}
              autoComplete="given-name"
              autoCapitalize="words"
              required
              aria-invalid={profileErrors.firstName ? "true" : undefined}
              aria-describedby={describedBy(profileErrors.firstName && "profile-first-name-error")}
            />
            {profileErrors.firstName && (
              <p className="sf-field__error" id="profile-first-name-error">
                {profileErrors.firstName}
              </p>
            )}
          </div>

          <div className="sf-field">
            <label className="sf-field__label" htmlFor="profile-last-name">
              Last name
            </label>
            <input
              ref={lastNameRef}
              id="profile-last-name"
              className="sf-input"
              type="text"
              name="lastName"
              value={profileForm.lastName}
              onChange={handleProfileChange}
              autoComplete="family-name"
              autoCapitalize="words"
              required
              aria-invalid={profileErrors.lastName ? "true" : undefined}
              aria-describedby={describedBy(profileErrors.lastName && "profile-last-name-error")}
            />
            {profileErrors.lastName && (
              <p className="sf-field__error" id="profile-last-name-error">
                {profileErrors.lastName}
              </p>
            )}
          </div>

          <div className="sf-field">
            <label className="sf-field__label" htmlFor="profile-email">
              Email address
            </label>
            <input
              id="profile-email"
              className="sf-input"
              type="email"
              name="email"
              value={profileForm.email}
              readOnly
              autoComplete="email"
              aria-describedby="profile-email-hint"
            />
            <p className="sf-field__hint" id="profile-email-hint">
              Email address can’t be changed
            </p>
          </div>

          <div className="sf-field">
            <label className="sf-field__label" htmlFor="profile-phone">
              Phone number <span className={styles.optional}>(optional)</span>
            </label>
            <input
              ref={phoneRef}
              id="profile-phone"
              className="sf-input"
              type="tel"
              name="phone"
              value={profileForm.phone}
              onChange={handleProfileChange}
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={profileErrors.phone ? "true" : undefined}
              aria-describedby={describedBy(
                "profile-phone-hint",
                profileErrors.phone && "profile-phone-error"
              )}
            />
            <p className="sf-field__hint" id="profile-phone-hint">
              10-digit mobile number
            </p>
            {profileErrors.phone && (
              <p className="sf-field__error" id="profile-phone-error">
                {profileErrors.phone}
              </p>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          {/* Busy, not disabled, while saving: focus stays on the button
              (the auth modal's pattern) and further presses are ignored. */}
          <button
            type="submit"
            className={cx("sf-btn sf-btn--primary", styles.save)}
            aria-disabled={loading || undefined}
            data-busy={loading || undefined}
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Reveal>
  );

  // ---- Addresses section (§32) ----
  // While there is at most one address (the first one being added, or the
  // only one being edited), the save makes it the default whatever the box
  // says, so the box shows that: checked and locked, with a hint.
  const defaultIsFixed = addresses.length === 0 || (addresses.length === 1 && editingAddressIndex === 0);

  const renderAddressField = ({ name, id, label, optional, hint, wide, readOnly, ...inputProps }) => {
    const error = addressErrors[name];
    return (
      <div key={name} className={cx("sf-field", wide && styles.wide)}>
        <label className="sf-field__label" htmlFor={id}>
          {label}
          {optional && (
            <>
              {" "}
              <span className={styles.optional}>(optional)</span>
            </>
          )}
        </label>
        <input
          ref={(node) => {
            addressFieldRefs.current[name] = node;
          }}
          id={id}
          className="sf-input"
          type="text"
          name={name}
          value={addressForm[name]}
          onChange={readOnly ? undefined : handleAddressChange}
          readOnly={readOnly}
          {...inputProps}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy(hint && `${id}-hint`, error && `${id}-error`)}
        />
        {hint && (
          <p className="sf-field__hint" id={`${id}-hint`}>
            {hint}
          </p>
        )}
        {error && (
          <p className="sf-field__error" id={`${id}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  };

  const renderAddressForm = () => {
    // A saved label that is none of the three keeps the first chip in the tab
    // order, so the group can still be reached.
    const labelIsChip = ADDRESS_LABELS.includes(addressForm.label);
    return (
      <form
        className={cx("sf-panel", styles.addressForm)}
        onSubmit={handleAddressSave}
        noValidate
        aria-labelledby="address-form-title"
      >
        {/* Takes focus when the form opens: a reading position, no ring. */}
        <h3 ref={addressFormTitleRef} id="address-form-title" className={styles.addressFormTitle} tabIndex={-1}>
          {editingAddressIndex !== null ? "Edit address" : "Add an address"}
        </h3>

        <div className="sf-field">
          <span className="sf-field__label" id="address-type-label">
            Address type
          </span>
          <div className={styles.chips} role="radiogroup" aria-labelledby="address-type-label">
            {ADDRESS_LABELS.map((label, index) => {
              const checked = addressForm.label === label;
              return (
                <button
                  key={label}
                  ref={(node) => {
                    labelChipRefs.current[index] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked || (!labelIsChip && index === 0) ? 0 : -1}
                  className={cx("sf-chip", styles.chip)}
                  onClick={() => setAddressForm((prev) => ({ ...prev, label }))}
                  onKeyDown={(event) => handleLabelKeyDown(event, index)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.addressFields}>{ADDRESS_FIELDS.map(renderAddressField)}</div>

        <div className={styles.defaultChoice}>
          <label className="sf-check">
            <input
              type="checkbox"
              name="isDefault"
              checked={defaultIsFixed || addressForm.isDefault}
              disabled={defaultIsFixed}
              onChange={handleAddressChange}
              aria-describedby={defaultIsFixed ? "address-default-hint" : undefined}
            />
            Set as default address
          </label>
          {defaultIsFixed && (
            <p className={cx("sf-field__hint", styles.defaultHint)} id="address-default-hint">
              Your only address is always the default.
            </p>
          )}
        </div>

        <div className={styles.addressFormActions}>
          {/* Busy, not disabled, while saving (the Profile form's pattern):
              focus stays on the button and further presses are ignored. */}
          <button
            type="submit"
            className={cx("sf-btn sf-btn--primary", styles.busy)}
            aria-disabled={loading || undefined}
            data-busy={loading || undefined}
          >
            {loading ? "Saving…" : "Save address"}
          </button>
          <button
            type="button"
            className="sf-btn sf-btn--ghost"
            onClick={cancelAddressForm}
            aria-disabled={loading || undefined}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  const renderAddressCard = (addr, index) => {
    const name = [addr.firstName, addr.lastName].filter(Boolean).join(" ") || addr.fullName || "";
    const street = [addr.addressLine1, addr.addressLine2].filter(Boolean).join(", ");
    const place = cityLine(addr);
    const context = addressContext(addr);
    return (
      <li
        key={index}
        className={cx("sf-card sf-card--hairline", styles.addressCard, addr.isDefault && styles.addressCardDefault)}
      >
        {/* Takes focus when one of this card's buttons goes away (a reading
            position, no ring); "Default" is part of its name. */}
        <h3
          ref={(node) => {
            cardHeadingRefs.current[index] = node;
          }}
          className={styles.addressCardHead}
          tabIndex={-1}
        >
          <span className="sf-eyebrow">{addr.label || "Address"}</span>
          {addr.isDefault && (
            <>
              {" "}
              <span className="sf-badge sf-badge--ink">Default</span>
            </>
          )}
        </h3>
        <div className={styles.addressBody}>
          {name && <p className={styles.addressName}>{name}</p>}
          {(street || place || addr.country) && (
            <p className={styles.addressLines}>
              {street && <span>{street}</span>}
              {place && <span>{place}</span>}
              {addr.country && <span>{addr.country}</span>}
            </p>
          )}
          {addr.phone && (
            <p className={styles.addressPhone}>
              <span className="sf-visually-hidden">Phone: </span>
              {addr.phone}
            </p>
          )}
        </div>
        <div className={styles.addressCardActions}>
          {!addr.isDefault && (
            <button
              type="button"
              className="sf-btn sf-btn--link"
              onClick={() => handleSetDefaultAddress(index)}
              aria-disabled={loading || undefined}
            >
              Set as default<span className="sf-visually-hidden"> {context}</span>
            </button>
          )}
          <button
            ref={(node) => {
              editButtonRefs.current[index] = node;
            }}
            type="button"
            className="sf-btn sf-btn--link"
            onClick={() => handleAddressEdit(index)}
            aria-disabled={loading || undefined}
          >
            Edit<span className="sf-visually-hidden"> {context}</span>
          </button>
          <button
            ref={(node) => {
              deleteButtonRefs.current[index] = node;
            }}
            type="button"
            className={cx("sf-btn sf-btn--link", styles.deleteAddress)}
            onClick={() => handleAddressDelete(index)}
            aria-disabled={loading || undefined}
            aria-haspopup="dialog"
          >
            Delete<span className="sf-visually-hidden"> {context}</span>
          </button>
        </div>
      </li>
    );
  };

  // Keyed, like the password card: the sections share their place in the
  // tree, so without a key React would reuse the previous section's
  // already-revealed element and a tab switch would show no reveal.
  const renderAddressesSection = () => (
    <Reveal key="addresses">
      <div className={styles.addressesHead}>
        <div>
          <h2 className={cx("sf-display-sm", styles.panelTitle)}>Addresses</h2>
          <p className={styles.addressesIntro}>Your default address is selected for you at checkout.</p>
        </div>
        {!showAddressForm && addresses.length > 0 && (
          <button ref={addAddressRef} type="button" className="sf-btn sf-btn--ghost" onClick={openNewAddressForm}>
            Add address
          </button>
        )}
      </div>

      {showAddressForm && renderAddressForm()}

      {addresses.length > 0 ? (
        <ul className={styles.addressGrid}>{addresses.map(renderAddressCard)}</ul>
      ) : (
        !showAddressForm && (
          <div className={cx("sf-panel", styles.addressesEmpty)}>
            {/* Takes focus when the last address is deleted (no ring). */}
            <p ref={emptyTitleRef} className={cx("sf-display-sm", styles.addressesEmptyTitle)} tabIndex={-1}>
              No addresses yet.
            </p>
            <p className={styles.addressesEmptyText}>Add an address to make checkout faster.</p>
            <button
              ref={emptyAddressRef}
              type="button"
              className={cx("sf-btn sf-btn--primary", styles.emptyAction)}
              onClick={openNewAddressForm}
            >
              Add your first address
            </button>
          </div>
        )
      )}
    </Reveal>
  );

  // ---- Change password section (§32) ----
  // A password field with its "Show" / "Hide" text button inside the right
  // edge (the auth modal's control, §30.4).
  const renderPasswordControl = (key, { error, description }) => {
    const { name, id, autoComplete, noun } = PASSWORD_FIELDS[key];
    const visible = showPasswords[key];
    return (
      <div className={styles.passwordControl}>
        <input
          ref={(node) => {
            passwordFieldRefs.current[name] = node;
          }}
          id={id}
          className={cx("sf-input", styles.passwordInput)}
          type={visible ? "text" : "password"}
          name={name}
          value={passwordForm[name]}
          onChange={handlePasswordChange}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          aria-invalid={error ? "true" : undefined}
          aria-describedby={description}
        />
        <button type="button" className={styles.reveal} onClick={() => togglePasswordVisibility(key)} aria-controls={id}>
          {visible ? "Hide" : "Show"}
          <span className="sf-visually-hidden"> {noun}</span>
        </button>
      </div>
    );
  };

  const renderPasswordSection = () => {
    const { current, new: next, confirm } = PASSWORD_FIELDS;
    // The confirmation's message: the last submit's, or "Passwords do not
    // match" as soon as typing on cannot make the two match (the confirmation
    // is not the start of the new password; an empty one always is). A correct
    // entry never shows it, a slip shows it at once, and nothing changes on
    // leaving the field, so the button never moves under a pointer on its way
    // to it. Either message goes as soon as the two match.
    const { newPassword, confirmPassword } = passwordForm;
    const confirmError =
      newPassword !== confirmPassword
        ? passwordErrors.confirmPassword || (newPassword.startsWith(confirmPassword) ? "" : "Passwords don’t match")
        : "";
    const errorLine = (message, id) =>
      message && (
        <p className="sf-field__error" id={id}>
          {message}
        </p>
      );

    return (
      <Reveal key="password" className={cx("sf-card sf-card--hairline", styles.panel)}>
        <h2 className={cx("sf-display-sm", styles.panelTitle)}>Change password</h2>

        <form className={styles.passwordForm} onSubmit={handlePasswordSubmit} noValidate>
          {/* For password managers: the account the new password belongs to. */}
          <input type="text" name="username" autoComplete="username" value={user.email || ""} readOnly hidden />

          <div className="sf-field">
            <label className="sf-field__label" htmlFor={current.id}>
              {current.label}
            </label>
            {renderPasswordControl("current", {
              error: passwordErrors.currentPassword,
              description: describedBy(passwordErrors.currentPassword && `${current.id}-error`),
            })}
            {errorLine(passwordErrors.currentPassword, `${current.id}-error`)}
          </div>

          <div className="sf-field">
            <label className="sf-field__label" htmlFor={next.id}>
              {next.label}
            </label>
            {renderPasswordControl("new", {
              error: passwordErrors.newPassword,
              description: describedBy(
                passwordStrength.label && `${next.id}-strength`,
                passwordErrors.newPassword && `${next.id}-error`
              ),
            })}
            {/* The meter, while there is a password, and its word: a polite
                live region that stays in the page. */}
            <div className={styles.strengthRow}>
              {passwordForm.newPassword && (
                <div className={styles.meter} data-level={passwordStrength.level} aria-hidden="true">
                  <span className={styles.segment} />
                  <span className={styles.segment} />
                  <span className={styles.segment} />
                  <span className={styles.segment} />
                </div>
              )}
              <p id={`${next.id}-strength`} className={styles.strength} aria-live="polite">
                {passwordStrength.label && (
                  <>
                    <span className="sf-visually-hidden">Password strength: </span>
                    {passwordStrength.label}
                  </>
                )}
              </p>
            </div>
            {errorLine(passwordErrors.newPassword, `${next.id}-error`)}
          </div>

          {/* Display only, as before; not a live region (it would speak on
              every keystroke). Each rule's state is in its text too. */}
          <div className={styles.checklist}>
            <p className={styles.checklistTitle} id="password-checklist-title">
              A strong password has
            </p>
            <ul className={styles.checks} aria-labelledby="password-checklist-title">
              {PASSWORD_CHECKS.map(({ label, test }) => {
                const met = test(passwordForm.newPassword);
                return (
                  <li key={label} className={styles.check} data-met={met || undefined}>
                    <CheckGlyph met={met} />
                    {label}
                    <span className="sf-visually-hidden">{met ? ", done" : ", not yet"}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="sf-field">
            <label className="sf-field__label" htmlFor={confirm.id}>
              {confirm.label}
            </label>
            {renderPasswordControl("confirm", {
              error: confirmError,
              description: describedBy(confirmError && `${confirm.id}-error`),
            })}
            {errorLine(confirmError, `${confirm.id}-error`)}
          </div>

          <div className={styles.passwordActions}>
            {/* Busy, not disabled, while the request runs. */}
            <button
              type="submit"
              className={cx("sf-btn sf-btn--primary", styles.save)}
              aria-disabled={loading || undefined}
              data-busy={loading || undefined}
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </div>

          <p className="sf-visually-hidden" aria-live="polite" aria-atomic="true">
            {passwordAnnouncement.text && <span key={passwordAnnouncement.key}>{passwordAnnouncement.text}</span>}
          </p>
        </form>
      </Reveal>
    );
  };

  // ---- Store credit handlers ----

  // "Try again" runs the same two reads. The panel (and this button) makes way
  // for the skeletons, so focus waits on the section region meanwhile.
  const retryWallet = () => {
    walletRetried.current = true;
    if (sectionRef.current) sectionRef.current.focus({ preventScroll: true });
    setWalletAttempt((count) => count + 1);
  };

  // 50 more rows; focus moves to the first of them, in the view on screen.
  const showMoreWallet = () => {
    const first = wallet.shown;
    setWallet((current) => ({ ...current, shown: current.shown + WALLET_PAGE_SIZE }));
    requestFocus(() => {
      const rows = [walletRows.current.table[first], walletRows.current.list[first]].filter(Boolean);
      return rows.find((row) => row.getClientRects().length > 0) || rows[0] || null;
    });
  };

  const walletRowRef = (view, index) => (element) => {
    walletRows.current[view][index] = element;
  };

  const renderWalletSection = () => {
    if (wallet.status === "error") {
      return (
        <div className={cx("sf-panel", styles.walletError)}>
          <h2 className={cx("sf-display-sm", styles.walletErrorTitle)}>We couldn’t load your store credit.</h2>
          <p className={styles.walletErrorText}>Check your connection and try again.</p>
          <button
            ref={walletRetryRef}
            type="button"
            className={cx("sf-btn sf-btn--primary", styles.walletRetry)}
            onClick={retryWallet}
          >
            Try again
          </button>
        </div>
      );
    }

    const ready = wallet.status === "ready";
    const total = wallet.transactions.length;
    const shown = Math.min(wallet.shown, total);
    const entries = wallet.transactions.slice(0, shown);

    return (
      <div className={styles.wallet} aria-busy={!ready || undefined}>
        {!ready && <p className="sf-visually-hidden">Loading your store credit</p>}

        {/* The balance: always navy, in both modes. */}
        <Reveal key="wallet-card" className={styles.walletCard}>
          <div>
            <h2 className={cx("sf-eyebrow", styles.walletEyebrow)}>Store credit</h2>
            <div className={styles.balanceLine}>
              {ready ? (
                <p className={cx("sf-display-md", styles.balance)}>
                  <span className="sf-visually-hidden">Available balance </span>
                  {formatCurrency(wallet.balance)}
                </p>
              ) : (
                <span className={cx("sf-skeleton", styles.balanceSkeleton)} aria-hidden="true" />
              )}
            </div>
            <p className={styles.walletHint}>Apply your store credit at checkout towards any order.</p>
          </div>
          <Link to="/products" className={cx("sf-btn sf-btn--paper-ghost", styles.shopNow)}>
            Browse furniture
          </Link>
        </Reveal>

        <div className={styles.facts}>
          <p id="wallet-facts-title" className={cx("sf-eyebrow", styles.factsTitle)}>
            How it works
          </p>
          <ul className={styles.factList} aria-labelledby="wallet-facts-title">
            {WALLET_FACTS.map((fact) => (
              <li key={fact} className={styles.fact}>
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.ledger}>
          <h2 id="wallet-ledger-title" className={cx("sf-display-sm", styles.ledgerTitle)}>
            Transactions
          </h2>

          {!ready ? (
            <LedgerSkeleton />
          ) : total === 0 ? (
            <div className={cx("sf-panel", styles.ledgerEmpty)}>
              <p className={cx("sf-display-sm", styles.ledgerEmptyTitle)}>No transactions yet.</p>
              <p className={styles.ledgerEmptyText}>
                Refunds issued to store credit, and credit you spend at checkout, will appear here.
              </p>
            </div>
          ) : (
            <>
              <LedgerTable entries={entries} labelledBy="wallet-ledger-title" rowRef={walletRowRef} />
              <LedgerList entries={entries} labelledBy="wallet-ledger-title" rowRef={walletRowRef} />
              {total > WALLET_PAGE_SIZE && (
                <div className={styles.ledgerMore}>
                  <p className={styles.ledgerCount} aria-live="polite">
                    {shown < total ? `Showing ${shown} of ${total} transactions` : `Showing all ${total} transactions`}
                  </p>
                  {shown < total && (
                    <button type="button" className="sf-btn sf-btn--ghost" onClick={showMoreWallet}>
                      Show more
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderActiveSection = () => {
    switch (activeTab) {
      case "profile":
        return renderProfileSection();
      case "addresses":
        return renderAddressesSection();
      case "wallet":
        return renderWalletSection();
      case "password":
        return renderPasswordSection();
      default:
        return renderProfileSection();
    }
  };

  return (
    <AccountLayout
      active={activeTab}
      titleRef={titleRef}
      onSignOutError={(message) => showFeedback("error", message)}
    >
      {/* Named after the section; takes focus after a tab switch. */}
      <section
        ref={sectionRef}
        className={styles.section}
        tabIndex={-1}
        aria-label={SECTION_LABELS[activeTab]}
      >
        {renderActiveSection()}
      </section>

      {/* Feedback toast: fixed bottom-right, above the bottom nav on phones.
          The status line stays in the page while empty, so each message is
          announced as it arrives; it clears itself after 4 seconds. */}
      <div
        className={cx(styles.toast, feedback.message && styles.toastShown)}
        data-tone={feedback.type || undefined}
      >
        {feedback.message && <FeedbackGlyph tone={feedback.type} />}
        <p className={styles.toastMessage} role="status" aria-live="polite">
          {feedback.message}
        </p>
        {feedback.message && (
          <button
            type="button"
            className={cx("sf-btn sf-btn--icon sf-btn--sm", styles.toastClose)}
            onClick={() => setFeedback(EMPTY_FEEDBACK)}
            aria-label="Dismiss message"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" focusable="false">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </AccountLayout>
  );
};

export default Profile;
