import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Swal from "sweetalert2";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import apiService from "../../services/api";
import AccountLayout from "../../components/account/AccountLayout";
import { Reveal } from "../../components/ui";
import { TOKENS } from "../../theme/tokens";
import { formatDate, formatCurrency, generateId, isValidPhone } from "../../utils/helpers";
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
//   header's "My profile", back and forward all land on the right section.
//   AccountNav switches tabs here with replace, so tabs add no history. After
//   a switch, focus moves to the new section (a region named after it).
//
// GUESTS
//   Once the session restore has settled, a guest sees a sign-in panel here
//   (no silent redirect home). "Sign in" opens the auth modal; signing in
//   renders the account in place, on the tab the URL asked for, and moves
//   focus to the greeting once the dialog has gone.
//
// The addresses, password and wallet sections are still the boilerplate's
// (Prompts 22 and 23 restyle them); they keep their own styles, .dark
// variants included, inside a neutral frame.
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

// Icons for the legacy empty states (addresses, wallet).
const TabIcon = ({ icon }) => {
  const icons = {
    location: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    wallet: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
      </svg>
    ),
  };
  return icons[icon] || null;
};

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
  const navigate = useNavigate();
  // isDarkMode now only feeds the legacy sections (their .dark styles and the
  // password meter); everything new follows the tokens.
  const { isDarkMode } = useTheme();
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

  // Store-credit wallet
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTx, setWalletTx] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);

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
  // from the API, so a refund issued by the admin in another session shows up).
  useEffect(() => {
    if (activeTab !== "wallet" || !user?.id) return;
    let active = true;
    (async () => {
      setWalletLoading(true);
      try {
        const [bal, tx] = await Promise.all([
          apiService.wallet.getBalance(user.id),
          apiService.wallet.getTransactions(user.id),
        ]);
        if (active) {
          setWalletBalance(Number(bal) || 0);
          setWalletTx(Array.isArray(tx) ? tx : []);
        }
      } catch (e) {
        console.error("Load wallet error:", e);
      } finally {
        if (active) setWalletLoading(false);
      }
    })();
    return () => { active = false; };
  }, [activeTab, user]);

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
    if (!profileForm.firstName.trim()) errors.firstName = "First name is required";
    if (!profileForm.lastName.trim()) errors.lastName = "Last name is required";
    if (profileForm.phone && !isValidPhone(profileForm.phone)) {
      errors.phone = "Enter a valid 10-digit mobile number";
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
      showFeedback("error", "First name and last name are required.");
      return;
    }
    if (errors.phone) {
      showFeedback("error", "Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    try {
      await updateUser({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phone: profileForm.phone.trim(),
      });
      showFeedback("success", "Profile updated successfully.");
    } catch (err) {
      showFeedback("error", "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Password handlers ----
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { level: 1, label: "Weak", color: "#ef4444" };
    if (score <= 4) return { level: 2, label: "Fair", color: "#f59e0b" };
    if (score <= 5) return { level: 3, label: "Good", color: "#3b82f6" };
    return { level: 4, label: "Strong", color: "#22c55e" };
  };

  const handlePasswordSubmit = async () => {
    if (!passwordForm.currentPassword) {
      showFeedback("error", "Please enter your current password.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showFeedback("error", "New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showFeedback("error", "New password and confirm password do not match.");
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
      showFeedback("success", "Password updated successfully.");
    } catch (err) {
      showFeedback("error", "Failed to change password. Please check your current password.");
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
  };

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddressSave = async () => {
    if (
      !addressForm.firstName.trim() ||
      !addressForm.lastName.trim() ||
      !addressForm.addressLine1.trim() ||
      !addressForm.city.trim() ||
      !addressForm.state.trim() ||
      !addressForm.postalCode.trim()
    ) {
      showFeedback("error", "Please fill in all required address fields.");
      return;
    }
    if (!isValidPhone(addressForm.phone)) {
      showFeedback("error", "Please enter a valid 10-digit Indian mobile number.");
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
      showFeedback(
        "success",
        editingAddressIndex !== null ? "Address updated successfully." : "Address added successfully."
      );
    } catch (err) {
      showFeedback("error", "Failed to save address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddressEdit = (index) => {
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
  };

  const handleAddressDelete = async (index) => {
    const result = await Swal.fire({
      title: "Delete this address?",
      text: "This address will be removed from your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
      cancelButtonText: "Keep",
    });
    if (!result.isConfirmed) return;

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
      showFeedback("success", "Address deleted successfully.");
    } catch (err) {
      showFeedback("error", "Failed to delete address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultAddress = async (index) => {
    setLoading(true);
    try {
      const updatedAddresses = addresses.map((a, i) => ({
        ...a,
        isDefault: i === index,
      }));
      await updateUser({ addresses: updatedAddresses });
      setAddresses(updatedAddresses);
      showFeedback("success", "Default address updated.");
    } catch (err) {
      showFeedback("error", "Failed to update default address.");
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
        <p className={styles.memberSince}>Member since {formatDate(user.createdAt, "medium")}</p>
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
              Email cannot be changed
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

  const renderAddressesSection = () => (
    <motion.div
      key="addresses"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>My Addresses</h2>
          <p className={styles.sectionSubtitle}>Manage your delivery addresses</p>
        </div>
        {!showAddressForm && (
          <button
            className={styles.btnOutline}
            onClick={() => {
              resetAddressForm();
              setShowAddressForm(true);
            }}
          >
            + Add New Address
          </button>
        )}
      </div>

      {showAddressForm && (
        <div className={styles.addressFormCard}>
          <h3 className={styles.addressFormTitle}>
            {editingAddressIndex !== null ? "Edit Address" : "Add New Address"}
          </h3>

          <div className={styles.labelSelector}>
            {["Home", "Work", "Other"].map((label) => (
              <button
                key={label}
                className={`${styles.labelChip} ${
                  addressForm.label === label ? styles.labelChipActive : ""
                }`}
                onClick={() =>
                  setAddressForm((prev) => ({ ...prev, label }))
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>First Name *</label>
              <input
                type="text"
                name="firstName"
                value={addressForm.firstName}
                onChange={handleAddressChange}
                className={styles.formInput}
                placeholder="Enter first name"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={addressForm.lastName}
                onChange={handleAddressChange}
                className={styles.formInput}
                placeholder="Enter last name"
              />
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={addressForm.phone}
                onChange={handleAddressChange}
                className={styles.formInput}
                placeholder="10-digit mobile number"
              />
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Address Line 1 *</label>
              <input
                type="text"
                name="addressLine1"
                value={addressForm.addressLine1}
                onChange={handleAddressChange}
                className={styles.formInput}
                placeholder="House/Flat No., Building, Street"
              />
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Address Line 2</label>
              <input
                type="text"
                name="addressLine2"
                value={addressForm.addressLine2}
                onChange={handleAddressChange}
                className={styles.formInput}
                placeholder="Landmark, Area (optional)"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>City *</label>
              <input
                type="text"
                name="city"
                value={addressForm.city}
                onChange={handleAddressChange}
                className={styles.formInput}
                placeholder="Enter city"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>State *</label>
              <input
                type="text"
                name="state"
                value={addressForm.state}
                onChange={handleAddressChange}
                className={styles.formInput}
                placeholder="Enter state"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Postal Code *</label>
              <input
                type="text"
                name="postalCode"
                value={addressForm.postalCode}
                onChange={handleAddressChange}
                className={styles.formInput}
                placeholder="Enter postal code"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Country</label>
              <input
                type="text"
                name="country"
                value={addressForm.country}
                className={`${styles.formInput} ${styles.readOnly}`}
                readOnly
              />
              <span className={styles.fieldHint}>Currently shipping within India only</span>
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="isDefault"
                checked={addressForm.isDefault}
                onChange={handleAddressChange}
                className={styles.checkbox}
              />
              <span>Set as default address</span>
            </label>
          </div>

          <div className={styles.formActions}>
            <button
              className={styles.btnSecondary}
              onClick={resetAddressForm}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={styles.btnPrimary}
              onClick={handleAddressSave}
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : editingAddressIndex !== null
                ? "Update Address"
                : "Save Address"}
            </button>
          </div>
        </div>
      )}

      <div className={styles.addressList}>
        {addresses.length === 0 && !showAddressForm ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <TabIcon icon="location" />
            </div>
            <p className={styles.emptyText}>No addresses saved yet</p>
            <p className={styles.emptySubtext}>
              Add an address to make checkout faster
            </p>
          </div>
        ) : (
          addresses.map((addr, index) => (
            <div
              key={index}
              className={`${styles.addressCard} ${
                addr.isDefault ? styles.addressCardDefault : ""
              }`}
            >
              <div className={styles.addressCardHeader}>
                <div className={styles.addressLabelRow}>
                  <span className={styles.addressLabel}>{addr.label}</span>
                  {addr.isDefault && (
                    <span className={styles.defaultBadge}>Default</span>
                  )}
                </div>
                <div className={styles.addressActions}>
                  {!addr.isDefault && (
                    <button
                      className={styles.actionLink}
                      onClick={() => handleSetDefaultAddress(index)}
                      disabled={loading}
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    className={styles.actionLink}
                    onClick={() => handleAddressEdit(index)}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button
                    className={`${styles.actionLink} ${styles.actionLinkDanger}`}
                    onClick={() => handleAddressDelete(index)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className={styles.addressCardBody}>
                <p className={styles.addressName}>
                  {[addr.firstName, addr.lastName].filter(Boolean).join(" ") ||
                    addr.fullName ||
                    ""}
                </p>
                <p className={styles.addressText}>
                  {addr.addressLine1}
                  {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                </p>
                <p className={styles.addressText}>
                  {addr.city}, {addr.state} {addr.postalCode || addr.zipCode || ""}
                </p>
                <p className={styles.addressText}>{addr.country}</p>
                <p className={styles.addressPhone}>Phone: {addr.phone}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );

  const renderPasswordSection = () => (
    <motion.div
      key="password"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Change Password</h2>
        <p className={styles.sectionSubtitle}>
          Update your password to keep your account secure
        </p>
      </div>

      <div className={styles.passwordFormWrapper}>
        <div className={styles.formGroupStacked}>
          <label className={styles.formLabel}>Current Password *</label>
          <div className={styles.passwordInputWrapper}>
            <input
              type={showPasswords.current ? "text" : "password"}
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              className={styles.formInput}
              placeholder="Enter current password"
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() =>
                setShowPasswords((p) => ({ ...p, current: !p.current }))
              }
            >
              {showPasswords.current ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className={styles.formGroupStacked}>
          <label className={styles.formLabel}>New Password *</label>
          <div className={styles.passwordInputWrapper}>
            <input
              type={showPasswords.new ? "text" : "password"}
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              className={styles.formInput}
              placeholder="Enter new password"
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() =>
                setShowPasswords((p) => ({ ...p, new: !p.new }))
              }
            >
              {showPasswords.new ? "Hide" : "Show"}
            </button>
          </div>
          {passwordForm.newPassword && (
            <div className={styles.strengthMeter}>
              <div className={styles.strengthBar}>
                {[1, 2, 3, 4].map((seg) => (
                  <div
                    key={seg}
                    className={styles.strengthSegment}
                    style={{
                      backgroundColor:
                        seg <= passwordStrength.level
                          ? passwordStrength.color
                          : isDarkMode
                          ? "rgba(255,255,255,0.1)"
                          : "#e5e7eb",
                    }}
                  />
                ))}
              </div>
              <span
                className={styles.strengthLabel}
                style={{ color: passwordStrength.color }}
              >
                {passwordStrength.label}
              </span>
            </div>
          )}
        </div>

        <div className={styles.formGroupStacked}>
          <label className={styles.formLabel}>Confirm New Password *</label>
          <div className={styles.passwordInputWrapper}>
            <input
              type={showPasswords.confirm ? "text" : "password"}
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              className={styles.formInput}
              placeholder="Confirm new password"
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() =>
                setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))
              }
            >
              {showPasswords.confirm ? "Hide" : "Show"}
            </button>
          </div>
          {passwordForm.confirmPassword &&
            passwordForm.newPassword !== passwordForm.confirmPassword && (
              <span className={styles.fieldError}>Passwords do not match</span>
            )}
        </div>

        <div className={styles.passwordRequirements}>
          <p className={styles.requirementsTitle}>Password Requirements:</p>
          <ul className={styles.requirementsList}>
            <li
              className={
                passwordForm.newPassword.length >= 8
                  ? styles.requirementMet
                  : ""
              }
            >
              At least 8 characters
            </li>
            <li
              className={
                /[A-Z]/.test(passwordForm.newPassword)
                  ? styles.requirementMet
                  : ""
              }
            >
              One uppercase letter
            </li>
            <li
              className={
                /[a-z]/.test(passwordForm.newPassword)
                  ? styles.requirementMet
                  : ""
              }
            >
              One lowercase letter
            </li>
            <li
              className={
                /[0-9]/.test(passwordForm.newPassword)
                  ? styles.requirementMet
                  : ""
              }
            >
              One number
            </li>
            <li
              className={
                /[^A-Za-z0-9]/.test(passwordForm.newPassword)
                  ? styles.requirementMet
                  : ""
              }
            >
              One special character
            </li>
          </ul>
        </div>

        <div className={styles.formActions}>
          <button
            className={styles.btnPrimary}
            onClick={handlePasswordSubmit}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderWalletSection = () => (
    <motion.div
      key="wallet"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Store Credit</h2>
        <p className={styles.sectionSubtitle}>
          Your wallet balance and transaction history
        </p>
      </div>

      <div className={styles.walletBalanceCard}>
        <div className={styles.walletBalanceIcon}>
          <TabIcon icon="wallet" />
        </div>
        <div>
          <span className={styles.walletBalanceLabel}>Available Balance</span>
          <span className={styles.walletBalanceValue}>{formatCurrency(walletBalance)}</span>
        </div>
        <p className={styles.walletBalanceHint}>
          Apply your store credit at checkout toward any order.
        </p>
      </div>

      <h3 className={styles.walletHistoryTitle}>Transaction History</h3>

      {walletLoading ? (
        <div className={styles.walletLoading}>
          <div className={styles.spinner} />
          <p>Loading your transactions…</p>
        </div>
      ) : walletTx.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <TabIcon icon="wallet" />
          </div>
          <p className={styles.emptyText}>No store-credit transactions yet</p>
          <p className={styles.emptySubtext}>
            Refunds issued to store credit, and credit you spend at checkout, will appear here.
          </p>
        </div>
      ) : (
        <div className={styles.walletTxList}>
          {walletTx.map((t) => {
            const isCredit = t.type === "credit";
            return (
              <div key={t.id} className={styles.walletTxRow}>
                <div
                  className={`${styles.walletTxBadge} ${
                    isCredit ? styles.walletTxBadgeCredit : styles.walletTxBadgeDebit
                  }`}
                  aria-hidden
                >
                  {isCredit ? "+" : "−"}
                </div>
                <div className={styles.walletTxBody}>
                  <span className={styles.walletTxReason}>
                    {t.reason || (isCredit ? "Store credit added" : "Store credit used")}
                  </span>
                  <span className={styles.walletTxMeta}>
                    {formatDate(t.createdAt, "medium")}
                    {t.orderNumber && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          className={styles.walletTxLink}
                          onClick={() => navigate("/orders")}
                        >
                          {t.orderNumber}
                        </button>
                      </>
                    )}
                  </span>
                </div>
                <div className={styles.walletTxAmountWrap}>
                  <span
                    className={isCredit ? styles.walletTxAmountCredit : styles.walletTxAmountDebit}
                  >
                    {isCredit ? "+" : "−"}
                    {formatCurrency(t.amount)}
                  </span>
                  {t.balanceAfter != null && (
                    <span className={styles.walletTxBalance}>
                      Bal: {formatCurrency(t.balanceAfter)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );

  // The boilerplate's sections, until Prompts 22 and 23 restyle them: a
  // neutral token frame, plus the .dark class their own dark rules key off.
  const renderLegacySection = (section) => (
    <div className={cx(styles.legacy, isDarkMode && styles.dark)}>{section}</div>
  );

  const renderActiveSection = () => {
    switch (activeTab) {
      case "profile":
        return renderProfileSection();
      case "addresses":
        return renderLegacySection(renderAddressesSection());
      case "wallet":
        return renderLegacySection(renderWalletSection());
      case "password":
        return renderLegacySection(renderPasswordSection());
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
