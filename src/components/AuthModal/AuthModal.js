import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { CloseOutlined } from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { isEmailValid } from "../../utils/helpers";
import { TOKENS } from "../../theme/tokens";
import BrandLogo from "../ui/BrandLogo";
import useFocusTrap, { useBodyScrollLock } from "../ui/useFocusTrap";
import styles from "./AuthModal.module.css";

// =============================================================================
// AuthModal — the sign-in / create-account dialog
// =============================================================================
//
// There is no /login route: Header renders this dialog once, and any page
// opens it with useAuth().openAuthModal("login" | "signup"). Props: `open`,
// `onClose`, `defaultTab` ("login" | "signup").
//
// Layout: a paper dialog (480px wide, hairline, soft shadow) centred over the
// navy overlay; up to 640px a bottom sheet with 8px top corners and safe-area
// padding. The logo heads it (BrandLogo's auto variant: the light artwork on
// paper, the white one in dark mode), then the serif heading and one line on
// what an account is for. Two tabs, "Sign in" and "Create account", switch
// the forms.
//
// Kept from the boilerplate: the validation rules and messages
// (validateLogin / validateSignup, unchanged); login({ email, password,
// remember }), so "Remember me" keeps the session in localStorage instead of
// sessionStorage (authStorage, through AuthContext); register() with the
// phone prefixed "+91"; the dialog closes 1.5s after signing in, and turns to
// "Sign in" with the email filled in 1.8s after an account is created; a
// failed request shows its message and keeps what was typed; "Forgot
// password?" says reset isn't available yet and links to /support (no reset
// flow exists); the tab follows `defaultTab`; messages reset on opening; the
// page behind is locked; Escape and the overlay close it. The toasts stay in
// AuthContext. The disabled "Soon" Google and Facebook buttons are gone: no
// flow existed behind them.
//
// Accessibility (DESIGN_SYSTEM §19.1 and §30): role="dialog" aria-modal,
// named by its heading and described by its subtitle. useFocusTrap moves focus
// to the active form's first field, keeps Tab inside and gives focus back to
// whatever opened the dialog. The tabs are a tablist (arrow keys, Home, End).
// Every field has a visible label, autocomplete and, where it helps, an
// inputmode. A submit that fails validation marks the fields (aria-invalid,
// with the message in aria-describedby) and moves focus to the first one; the
// request's own error is role="alert"; the info and success lines are
// role="status". Rendered in a portal on <body> at --sf-z-modal.
//
// Motion: fades in with an 8px rise over --sf-duration (opacity only under
// reduced motion); the forms cross-fade when the tab changes.
// =============================================================================

const { duration, easeOut, easeInOut } = TOKENS.motion;

// Rendered height of the logo in the dialog's head (BrandLogo derives the
// width, 169px): DESIGN_SYSTEM §10's minimum for the auth modal, the size at
// which the wordmark and the tagline in the artwork stay legible.
const LOGO_HEIGHT = 56;

// The two delays the flows have always used.
const CLOSE_AFTER_SIGN_IN_MS = 1500;
const SWITCH_AFTER_SIGN_UP_MS = 1800;
// How long the visually hidden status line keeps what it said.
const ANNOUNCEMENT_MS = 5000;

const TABS = [
  { id: "login", label: "Sign in" },
  { id: "signup", label: "Create account" },
];

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to track orders and save your wishlist across devices.",
    submit: "Sign in",
    submitting: "Signing in…",
  },
  signup: {
    title: "Create your account",
    subtitle: "Create an account to track orders and save your wishlist across devices.",
    submit: "Create account",
    submitting: "Creating account…",
  },
};

// Top to bottom: a submit that fails validation moves focus to the first of
// these that has a message.
const FIELD_ORDER = {
  login: ["email", "password"],
  signup: ["firstName", "lastName", "email", "phone", "password", "confirmPassword", "terms"],
};

const cx = (...names) => names.filter(Boolean).join(" ");

// The control's description: its hint, then anything extra, then its error.
const describedBy = (id, { hint, extra, error } = {}) =>
  [hint && `${id}-hint`, extra, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

/* ------------------------------------------------------------------ */
/*  Password strength helper                                           */
/* ------------------------------------------------------------------ */

// The boilerplate's score and thresholds, unchanged. The tones moved to CSS:
// the meter reads `data-score` (1 weak … 4 strong).
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "" };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak" };
  if (score <= 2) return { score: 2, label: "Fair" };
  if (score <= 3) return { score: 3, label: "Good" };
  return { score: 4, label: "Strong" };
}

/* ------------------------------------------------------------------ */
/*  Small parts                                                        */
/* ------------------------------------------------------------------ */

// Status glyphs, drawn in currentColor so each follows its message's tone.
const GLYPHS = {
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.5h.01" />
    </>
  ),
  success: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

// A message line on its semantic tint. The live region is the slot around it
// (always in the DOM), so the message is announced as it arrives.
const Message = ({ tone, children }) => (
  <div className={cx(styles.message, styles[tone])}>
    <svg
      className={styles.glyph}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {GLYPHS[tone]}
    </svg>
    <p>{children}</p>
  </div>
);

// A labelled field: the label above the control, the hint and the error below
// it (both referenced from the control through describedBy).
const Field = ({ id, label, hint, error, className, children }) => (
  <div className={cx("sf-field", className)}>
    <label className="sf-field__label" htmlFor={id}>
      {label}
    </label>
    {children}
    {hint && (
      <p id={`${id}-hint`} className="sf-field__hint">
        {hint}
      </p>
    )}
    {error && (
      <p id={`${id}-error`} className="sf-field__error">
        {error}
      </p>
    )}
  </div>
);

// A password field with a "Show" / "Hide" text button. The button's name
// follows its text ("Show password" / "Hide password"), so it carries no
// aria-pressed: a control whose label changes with its state is not a toggle
// button (WAI-ARIA APG), and a fixed name would not contain the visible
// "Hide" (WCAG 2.5.3). The dialog's status line also says what changed.
const PasswordInput = React.forwardRef(function PasswordInput(
  { id, visible, onToggle, toggleNoun, ...inputProps },
  ref
) {
  return (
    <div className={styles.passwordControl}>
      <input
        ref={ref}
        id={id}
        type={visible ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cx("sf-input", styles.input, styles.passwordInput)}
        {...inputProps}
      />
      <button type="button" className={styles.reveal} onClick={onToggle} aria-controls={id}>
        {visible ? "Hide" : "Show"}
        <span className="sf-visually-hidden"> {toggleNoun}</span>
      </button>
    </div>
  );
});

// One tab panel. While it fades out it is inert; once a new one is in the DOM
// it calls onEntered, so focus can follow a switch made from inside a form.
const TabPanel = ({ id, tabId, onEntered, children }) => {
  const isPresent = useIsPresent();
  useEffect(() => {
    onEntered();
  }, [onEntered]);
  return (
    <motion.div
      role="tabpanel"
      id={id}
      aria-labelledby={tabId}
      className={cx("sf-tabpanel", styles.panel)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: duration.base, ease: easeOut } }}
      exit={{ opacity: 0, transition: { duration: duration.fast, ease: easeInOut } }}
    >
      {/* React 18 does not know `inert`; the empty string sets the attribute. */}
      <div inert={isPresent ? undefined : ""}>{children}</div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AuthModal = ({ open, onClose, defaultTab = "login" }) => {
  const { login, register, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const uid = useId();

  const [activeTab, setActiveTab] = useState(defaultTab);

  // Login state
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup state
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Shared state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  // Counts submits that failed validation; each one sends focus to the first
  // field with a message.
  const [failedSubmits, setFailedSubmits] = useState(0);
  // The dialog's visually hidden status line (a new key re-announces a
  // repeated message; the text clears after ANNOUNCEMENT_MS, so a fixed error
  // is not left behind in it).
  const [announcement, setAnnouncement] = useState({ key: 0, text: "" });

  // Reset on open: the messages start clean, the tab follows defaultTab and
  // passwords are hidden again. Done while rendering, so the dialog's first
  // frame already shows the right form and focus can go straight to its first
  // field.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setActiveTab(defaultTab);
      setErrors({});
      setSuccessMessage("");
      setInfoMessage("");
      setShowLoginPassword(false);
      setShowSignupPassword(false);
      setShowConfirmPassword(false);
      setAnnouncement((previous) => ({ key: previous.key, text: "" }));
    }
  }

  // Sync defaultTab prop
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const dialogRef = useRef(null);
  const loginEmailRef = useRef(null);
  const loginPasswordRef = useRef(null);
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const signupEmailRef = useRef(null);
  const phoneRef = useRef(null);
  const signupPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const termsRef = useRef(null);
  const tabRefs = useRef({});
  // A field to focus once the next panel is in the DOM (set by a switch made
  // from inside a form, and after an account is created).
  const pendingFocus = useRef(null);
  const openerRef = useRef(null);
  const timers = useRef([]);
  const openRef = useRef(open);
  openRef.current = open;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // ---- Focus in, focus back -------------------------------------------------
  // useFocusTrap gives focus back to the opener when the dialog closes. An
  // opener that is still inert at that moment cannot take it (BottomNav's
  // Account button is inert while any overlay locks the page), so this tries
  // again over the next frames, until the opener is reachable, unless focus
  // has gone somewhere else on purpose. Declared before useFocusTrap, so it
  // sees the opener before focus moves in.
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      return undefined;
    }
    pendingFocus.current = null;
    const opener = openerRef.current;
    openerRef.current = null;
    if (!opener || opener === document.body) return undefined;
    const dialog = dialogRef.current;
    let frame = 0;
    let attempts = 0;
    const retry = () => {
      frame = 0;
      const active = document.activeElement;
      const leftBehind = !active || active === document.body || (dialog && dialog.contains(active));
      if (!leftBehind || !opener.isConnected) return;
      if (!opener.closest("[inert]")) {
        opener.focus({ preventScroll: true });
        return;
      }
      attempts += 1;
      if (attempts < 30) frame = window.requestAnimationFrame(retry);
    };
    frame = window.requestAnimationFrame(retry);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [open]);

  useFocusTrap(dialogRef, {
    active: open,
    onEscape: onClose,
    initialFocusRef: activeTab === "login" ? loginEmailRef : firstNameRef,
  });
  useBodyScrollLock(open);

  // ---- Close when the route changes underneath (back, forward) -------------
  const routeKey = location.pathname + location.search;
  const lastRouteKey = useRef(routeKey);
  useEffect(() => {
    if (lastRouteKey.current === routeKey) return;
    lastRouteKey.current = routeKey;
    if (open) onCloseRef.current();
  }, [routeKey, open]);

  // ---- Timers ----------------------------------------------------------------
  // The success delays and the status line's clearing, all cancelled if the
  // dialog ever unmounts.
  useEffect(() => {
    const scheduled = timers.current;
    return () => scheduled.forEach((id) => clearTimeout(id));
  }, []);

  const later = useCallback((callback, ms) => {
    const timer = setTimeout(() => {
      const scheduled = timers.current;
      const index = scheduled.indexOf(timer);
      if (index !== -1) scheduled.splice(index, 1);
      callback();
    }, ms);
    timers.current.push(timer);
  }, []);

  const announcements = useRef(0);
  const announce = useCallback(
    (text) => {
      announcements.current += 1;
      const key = announcements.current;
      setAnnouncement({ key, text });
      later(
        () => setAnnouncement((current) => (current.key === key ? { key, text: "" } : current)),
        ANNOUNCEMENT_MS
      );
    },
    [later]
  );

  // ---- After a submit fails validation ---------------------------------------
  // Focus moves to the first field with a message, which then reads its
  // message (aria-describedby). When that field already has focus, nothing
  // would be read, so the status line says it instead.
  const handledFailures = useRef(0);
  useEffect(() => {
    if (failedSubmits === handledFailures.current) return;
    handledFailures.current = failedSubmits;
    const refs =
      activeTab === "login"
        ? { email: loginEmailRef, password: loginPasswordRef }
        : {
            firstName: firstNameRef,
            lastName: lastNameRef,
            email: signupEmailRef,
            phone: phoneRef,
            password: signupPasswordRef,
            confirmPassword: confirmPasswordRef,
            terms: termsRef,
          };
    const first = FIELD_ORDER[activeTab].find((name) => errors[name]);
    const field = first && refs[first].current;
    if (!field) return;
    if (document.activeElement === field) announce(errors[first]);
    else field.focus();
  }, [failedSubmits, activeTab, errors, announce]);

  /* ---- Derived ---- */

  const loading = isSubmitting || authLoading;
  // While the success line shows, the form waits for its timer.
  const busy = loading || Boolean(successMessage);
  const copy = COPY[activeTab];
  const passwordStrength = getPasswordStrength(signupData.password);

  // A panel has just entered: give focus to the field a switch asked for, when
  // focus was left behind in the panel that went away.
  const onPanelEntered = useCallback(() => {
    const target = pendingFocus.current && pendingFocus.current.current;
    pendingFocus.current = null;
    const active = document.activeElement;
    if (target && target.isConnected && (!active || active === document.body)) target.focus();
  }, []);

  /* ---- Tab switching ---- */

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setErrors({});
    setSuccessMessage("");
    setInfoMessage("");
  };

  // "Create an account" / "Sign in" at the foot of a form: focus follows to
  // the first field of the other form.
  const switchFromForm = (tab) => {
    pendingFocus.current = tab === "login" ? loginEmailRef : firstNameRef;
    switchTab(tab);
  };

  // Arrow keys move along the tabs (and select, as the panels are cheap to
  // show); Home and End jump to either end.
  const handleTabKeyDown = (event) => {
    const index = TABS.findIndex((tab) => tab.id === activeTab);
    let next;
    if (event.key === "ArrowRight") next = TABS[(index + 1) % TABS.length];
    else if (event.key === "ArrowLeft") next = TABS[(index - 1 + TABS.length) % TABS.length];
    else if (event.key === "Home") next = TABS[0];
    else if (event.key === "End") next = TABS[TABS.length - 1];
    else return;
    event.preventDefault();
    switchTab(next.id);
    const button = tabRefs.current[next.id];
    if (button) button.focus();
  };

  // Self-service password reset isn't built yet — say so instead of doing
  // nothing, and point at the support page (the manual path that exists).
  const handleForgotPassword = () => {
    setErrors({});
    setInfoMessage("Password reset isn't available yet. Our support team can help you regain access.");
  };

  /* ---- Handlers: Login ---- */

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateLogin = () => {
    const errs = {};
    if (!loginData.email.trim()) {
      errs.email = "Email is required";
    } else if (!isEmailValid(loginData.email)) {
      errs.email = "Enter a valid email address";
    }
    if (!loginData.password) {
      errs.password = "Password is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    // One request at a time; nothing more while the success line waits to close.
    if (busy) return;
    if (!validateLogin()) {
      setFailedSubmits((count) => count + 1);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setInfoMessage("");
    try {
      // login() resolves with { success, error } instead of throwing — check
      // it, or failed logins would show the success state and close the modal.
      const result = await login({
        email: loginData.email,
        password: loginData.password,
        remember: rememberMe,
      });
      if (!result.success) {
        setErrors({ general: result.error || "Login failed. Please try again." });
        return;
      }
      setSuccessMessage("Welcome back. Signing you in…");
      later(() => {
        onCloseRef.current();
        setSuccessMessage("");
        setLoginData({ email: "", password: "" });
      }, CLOSE_AFTER_SIGN_IN_MS);
    } catch (err) {
      setErrors({ general: err.message || "Login failed. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---- Handlers: Signup ---- */

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateSignup = () => {
    const errs = {};
    if (!signupData.firstName.trim()) errs.firstName = "First name is required";
    if (!signupData.lastName.trim()) errs.lastName = "Last name is required";
    if (!signupData.email.trim()) {
      errs.email = "Email is required";
    } else if (!isEmailValid(signupData.email)) {
      errs.email = "Enter a valid email address";
    }
    if (signupData.phone && !/^\d{10}$/.test(signupData.phone.replace(/\s/g, ""))) {
      errs.phone = "Enter a valid 10-digit phone number";
    }
    if (!signupData.password) {
      errs.password = "Password is required";
    } else if (signupData.password.length < 6) {
      errs.password = "Password must be at least 6 characters";
    }
    if (!signupData.confirmPassword) {
      errs.confirmPassword = "Please confirm your password";
    } else if (signupData.password !== signupData.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    if (!agreeTerms) {
      errs.terms = "You must accept the terms and conditions";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!validateSignup()) {
      setFailedSubmits((count) => count + 1);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      // register() resolves with { success, error } instead of throwing —
      // see handleLoginSubmit.
      const result = await register({
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        email: signupData.email,
        phone: signupData.phone ? `+91${signupData.phone.replace(/\s/g, "")}` : "",
        password: signupData.password,
        confirmPassword: signupData.confirmPassword,
      });
      if (!result.success) {
        setErrors({ general: result.error || "Registration failed. Please try again." });
        return;
      }
      setSuccessMessage("Account created. Taking you to sign in…");
      const registeredEmail = signupData.email;
      later(() => {
        // Focus follows to the password, the one field left to fill in.
        if (openRef.current) pendingFocus.current = loginPasswordRef;
        switchTab("login");
        setSuccessMessage("");
        setLoginData({ email: registeredEmail, password: "" });
        setSignupData({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
        setAgreeTerms(false);
      }, SWITCH_AFTER_SIGN_UP_MS);
    } catch (err) {
      setErrors({ general: err.message || "Registration failed. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---- Show / hide passwords ---- */

  const toggleLoginPassword = () => {
    announce(showLoginPassword ? "Password hidden." : "Password shown.");
    setShowLoginPassword((v) => !v);
  };
  const toggleSignupPassword = () => {
    announce(showSignupPassword ? "Password hidden." : "Password shown.");
    setShowSignupPassword((v) => !v);
  };
  const toggleConfirmPassword = () => {
    announce(showConfirmPassword ? "Password confirmation hidden." : "Password confirmation shown.");
    setShowConfirmPassword((v) => !v);
  };

  /* ---- Ids ---- */

  const id = (name) => `${uid}-${name}`;
  const titleId = id("title");
  const subtitleId = id("subtitle");
  const tabId = (tab) => id(`tab-${tab}`);
  const panelId = (tab) => id(`panel-${tab}`);

  if (typeof document === "undefined") return null;

  const submitButton = (tab) => (
    <button
      type="submit"
      className={cx("sf-btn sf-btn--primary sf-btn--lg sf-btn--block", styles.submit)}
      aria-disabled={busy || undefined}
      data-busy={busy || undefined}
    >
      {loading ? COPY[tab].submitting : COPY[tab].submit}
    </button>
  );

  // The request's own error (role="alert") and the info / success line
  // (role="status"): both slots stay in the DOM, so a message is announced as
  // it arrives. They sit just above the button, where the eye already is.
  const messageSlots = (statusContent) => (
    <>
      <div role="alert" className={styles.slot}>
        {errors.general && <Message tone="error">{errors.general}</Message>}
      </div>
      <div role="status" className={styles.slot}>
        {statusContent}
      </div>
    </>
  );

  /* ---- Sign in ---- */

  const loginEmailId = id("login-email");
  const loginPasswordId = id("login-password");

  const loginForm = (
    <form className={styles.form} onSubmit={handleLoginSubmit} noValidate>
      <Field id={loginEmailId} label="Email address" error={errors.email}>
        <input
          ref={loginEmailRef}
          id={loginEmailId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="name@example.com"
          required
          value={loginData.email}
          onChange={handleLoginChange}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy(loginEmailId, { error: errors.email })}
          className={cx("sf-input", styles.input)}
        />
      </Field>

      <Field id={loginPasswordId} label="Password" error={errors.password}>
        <PasswordInput
          ref={loginPasswordRef}
          id={loginPasswordId}
          name="password"
          autoComplete="current-password"
          required
          value={loginData.password}
          onChange={handleLoginChange}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={describedBy(loginPasswordId, { error: errors.password })}
          visible={showLoginPassword}
          onToggle={toggleLoginPassword}
          toggleNoun="password"
        />
      </Field>

      <div className={styles.options}>
        <label className="sf-check">
          <input
            type="checkbox"
            name="remember"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me
        </label>
        <button type="button" className="sf-btn sf-btn--link" onClick={handleForgotPassword}>
          Forgot password?
        </button>
      </div>

      <div className={styles.actions}>
        {messageSlots(
          successMessage ? (
            <Message tone="success">{successMessage}</Message>
          ) : infoMessage ? (
            <Message tone="info">
              {infoMessage}{" "}
              <Link to="/support" className={styles.messageLink} onClick={onClose}>
                Contact support
              </Link>
            </Message>
          ) : null
        )}
        {submitButton("login")}
      </div>

      <p className={styles.switch}>
        New here?{" "}
        <button type="button" className="sf-btn sf-btn--link" onClick={() => switchFromForm("signup")}>
          Create an account
        </button>
      </p>
    </form>
  );

  /* ---- Create account ---- */

  const firstNameId = id("first-name");
  const lastNameId = id("last-name");
  const signupEmailId = id("signup-email");
  const phoneId = id("phone");
  const signupPasswordId = id("signup-password");
  const strengthId = id("signup-password-strength");
  const confirmId = id("confirm-password");
  const termsId = id("terms");
  const newTabNoteId = id("new-tab");

  const signupForm = (
    <form className={styles.form} onSubmit={handleSignupSubmit} noValidate>
      <div className={styles.nameRow}>
        <Field id={firstNameId} label="First name" error={errors.firstName}>
          <input
            ref={firstNameRef}
            id={firstNameId}
            name="firstName"
            type="text"
            autoComplete="given-name"
            autoCapitalize="words"
            required
            value={signupData.firstName}
            onChange={handleSignupChange}
            aria-invalid={errors.firstName ? true : undefined}
            aria-describedby={describedBy(firstNameId, { error: errors.firstName })}
            className={cx("sf-input", styles.input)}
          />
        </Field>
        <Field id={lastNameId} label="Last name" error={errors.lastName}>
          <input
            ref={lastNameRef}
            id={lastNameId}
            name="lastName"
            type="text"
            autoComplete="family-name"
            autoCapitalize="words"
            required
            value={signupData.lastName}
            onChange={handleSignupChange}
            aria-invalid={errors.lastName ? true : undefined}
            aria-describedby={describedBy(lastNameId, { error: errors.lastName })}
            className={cx("sf-input", styles.input)}
          />
        </Field>
      </div>

      <Field id={signupEmailId} label="Email address" error={errors.email}>
        <input
          ref={signupEmailRef}
          id={signupEmailId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="name@example.com"
          required
          value={signupData.email}
          onChange={handleSignupChange}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy(signupEmailId, { error: errors.email })}
          className={cx("sf-input", styles.input)}
        />
      </Field>

      <Field
        id={phoneId}
        label={
          <>
            Mobile number <span className={styles.optional}>(optional)</span>
          </>
        }
        hint="10 digits, without +91 or 0."
        error={errors.phone}
      >
        <div className={styles.phoneControl}>
          <span className={styles.prefix} aria-hidden="true">
            +91
          </span>
          <input
            ref={phoneRef}
            id={phoneId}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={signupData.phone}
            onChange={handleSignupChange}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={describedBy(phoneId, { hint: true, error: errors.phone })}
            className={cx("sf-input", styles.input, styles.phoneInput)}
          />
        </div>
      </Field>

      {/* The password's hint and strength share one line under a quiet meter. */}
      <div className="sf-field">
        <label className="sf-field__label" htmlFor={signupPasswordId}>
          Password
        </label>
        <PasswordInput
          ref={signupPasswordRef}
          id={signupPasswordId}
          name="password"
          autoComplete="new-password"
          required
          value={signupData.password}
          onChange={handleSignupChange}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={describedBy(signupPasswordId, {
            hint: true,
            extra: passwordStrength.label ? strengthId : null,
            error: errors.password,
          })}
          visible={showSignupPassword}
          onToggle={toggleSignupPassword}
          toggleNoun="password"
        />
        {signupData.password && (
          <div className={styles.meter} data-score={passwordStrength.score} aria-hidden="true">
            <span className={styles.segment} />
            <span className={styles.segment} />
            <span className={styles.segment} />
            <span className={styles.segment} />
          </div>
        )}
        <div className={styles.passwordMeta}>
          <p id={`${signupPasswordId}-hint`} className="sf-field__hint">
            At least 6 characters.
          </p>
          <p id={strengthId} className={styles.strength} aria-live="polite">
            {passwordStrength.label && (
              <>
                <span className="sf-visually-hidden">Password strength: </span>
                {passwordStrength.label}
              </>
            )}
          </p>
        </div>
        {errors.password && (
          <p id={`${signupPasswordId}-error`} className="sf-field__error">
            {errors.password}
          </p>
        )}
      </div>

      <Field id={confirmId} label="Confirm password" error={errors.confirmPassword}>
        <PasswordInput
          ref={confirmPasswordRef}
          id={confirmId}
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={signupData.confirmPassword}
          onChange={handleSignupChange}
          aria-invalid={errors.confirmPassword ? true : undefined}
          aria-describedby={describedBy(confirmId, { error: errors.confirmPassword })}
          visible={showConfirmPassword}
          onToggle={toggleConfirmPassword}
          toggleNoun="password confirmation"
        />
      </Field>

      <div className={styles.terms}>
        <label className={cx("sf-check", styles.termsCheck)}>
          <input
            ref={termsRef}
            id={termsId}
            type="checkbox"
            name="terms"
            required
            checked={agreeTerms}
            onChange={(e) => {
              setAgreeTerms(e.target.checked);
              if (errors.terms) setErrors((prev) => ({ ...prev, terms: "" }));
            }}
            aria-invalid={errors.terms ? true : undefined}
            aria-describedby={describedBy(termsId, { error: errors.terms })}
          />
          <span>
            I agree to the{" "}
            <Link
              to="/terms"
              target="_blank"
              rel="noopener"
              className={styles.inlineLink}
              onClick={(e) => e.stopPropagation()}
              aria-describedby={newTabNoteId}
            >
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              target="_blank"
              rel="noopener"
              className={styles.inlineLink}
              onClick={(e) => e.stopPropagation()}
              aria-describedby={newTabNoteId}
            >
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.terms && (
          <p id={`${termsId}-error`} className={cx("sf-field__error", styles.termsError)}>
            {errors.terms}
          </p>
        )}
        <span id={newTabNoteId} hidden>
          Opens in a new tab
        </span>
      </div>

      <div className={styles.actions}>
        {messageSlots(successMessage ? <Message tone="success">{successMessage}</Message> : null)}
        {submitButton("signup")}
      </div>

      <p className={styles.switch}>
        Already have an account?{" "}
        <button type="button" className="sf-btn sf-btn--link" onClick={() => switchFromForm("login")}>
          Sign in
        </button>
      </p>
    </form>
  );

  /* ---- Render ---- */

  const dialogMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: duration.base, ease: easeInOut } },
      }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 8, transition: { duration: duration.base, ease: easeInOut } },
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="auth-modal" className={styles.root}>
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
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={subtitleId}
            tabIndex={-1}
            transition={{ duration: duration.base, ease: easeOut }}
            {...dialogMotion}
          >
            <button
              type="button"
              className={cx("sf-btn sf-btn--icon", styles.close)}
              onClick={onClose}
              aria-label="Close"
            >
              <CloseOutlined />
            </button>

            <div className={styles.body}>
              <div className={styles.head}>
                <BrandLogo height={LOGO_HEIGHT} className={styles.logo} aria-hidden="true" />
                <h2 id={titleId} className={cx("sf-display-sm", styles.title)}>
                  {copy.title}
                </h2>
                <p id={subtitleId} className={styles.subtitle}>
                  {copy.subtitle}
                </p>
              </div>

              <div
                className={cx("sf-tabs", styles.tabs)}
                role="tablist"
                aria-label="Sign in or create an account"
              >
                {TABS.map((tab) => {
                  const selected = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      ref={(node) => {
                        tabRefs.current[tab.id] = node;
                      }}
                      type="button"
                      role="tab"
                      id={tabId(tab.id)}
                      aria-selected={selected}
                      aria-controls={panelId(tab.id)}
                      tabIndex={selected ? 0 : -1}
                      className={cx("sf-tab", styles.tab)}
                      onClick={() => switchTab(tab.id)}
                      onKeyDown={handleTabKeyDown}
                    >
                      {tab.label}
                    </button>
                  );
                })}
                {/* The 1px ink underline, sliding to the selected tab. */}
                <span className={styles.indicator} data-tab={activeTab} aria-hidden="true" />
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <TabPanel
                  key={activeTab}
                  id={panelId(activeTab)}
                  tabId={tabId(activeTab)}
                  onEntered={onPanelEntered}
                >
                  {activeTab === "login" ? loginForm : signupForm}
                </TabPanel>
              </AnimatePresence>

              <p className="sf-visually-hidden" role="status">
                {announcement.text && <span key={announcement.key}>{announcement.text}</span>}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AuthModal;
