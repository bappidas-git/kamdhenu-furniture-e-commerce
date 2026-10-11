import React, { createContext, useState, useContext, useEffect } from "react";
import apiService, { getErrorMessage } from "../services/api";
import authStorage from "../utils/authStorage";
import Swal from "sweetalert2";

const AuthContext = createContext();

// The sign-in sheet's message for a failed request (Prompt 34): the API's own
// words when it sent some (Laravel's validation text, e.g. "The email has
// already been taken."), else the storefront's line. Never axios's "Network
// Error" or "Request failed with status code 500", which getErrorMessage
// falls back to when there is no response body.
const SIGN_IN_FAILED = "We couldn’t sign you in. Try again in a moment.";
const SIGN_UP_FAILED = "We couldn’t create your account. Try again in a moment.";
const WRONG_CREDENTIALS = "Check your email address and password, then try again.";
// The mock API's duplicate-email error (code EMAIL_TAKEN) reads "… Please log
// in instead."; the storefront says Sign in, and no "Please" (DESIGN_SYSTEM §39).
const EMAIL_TAKEN = "An account with this email already exists. Sign in instead.";
const apiMessage = (error) => {
  const data = error?.response?.data;
  return data && (data.message || data.errors) ? getErrorMessage(error) : "";
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Global auth-modal state so any page (wishlist, orders, …) can open the
  // login/signup modal. The modal itself is rendered once, in the Header.
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("login");

  const openAuthModal = (tab = "login") => {
    setAuthModalTab(tab === "signup" ? "signup" : "login");
    setAuthModalOpen(true);
  };
  const closeAuthModal = () => setAuthModalOpen(false);

  useEffect(() => {
    // Restore an existing session on mount. authStorage checks sessionStorage
    // (default, per-tab) then localStorage ("Remember me" logins) — both the
    // mock and Laravel login paths store a token, so requiring user + token
    // works in either mode.
    const storedUser = authStorage.get("user");
    const token = authStorage.get("token");

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user:", error);
        authStorage.remove("user");
        authStorage.remove("token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      // Use the real API for user login
      const userData = await apiService.auth.login(credentials);

      if (userData) {
        authStorage.set("user", JSON.stringify(userData), !!credentials.remember);
        setUser(userData);

        Swal.fire({
          icon: "success",
          title: "Signed in",
          text: "Welcome back.",
          toast: true,
          position: "bottom-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });

        return { success: true, user: userData };
      } else {
        // No toast for a failure: the sign-in sheet (the only caller) shows the
        // message in its own alert, just above its button, and a toast there
        // covered that button at phone widths for three seconds (Prompt 34).
        return { success: false, error: WRONG_CREDENTIALS };
      }
    } catch (error) {
      console.error("Login error:", error);

      const errorMessage = apiMessage(error) || SIGN_IN_FAILED;
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    try {
      const newUser = await apiService.auth.register(userData);

      Swal.fire({
        icon: "success",
        title: "Account created",
        text: "Sign in with your password to continue.",
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });

      return { success: true, user: newUser };
    } catch (error) {
      if (error.code !== "EMAIL_TAKEN") console.error("Registration error:", error);

      // Shown by the sheet's alert, not a toast (see login).
      const errorMessage = error.code === "EMAIL_TAKEN" ? EMAIL_TAKEN : apiMessage(error) || SIGN_UP_FAILED;
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    // Removes user/token from both storages and, on the Laravel branch,
    // revokes the token server-side. Never sessionStorage.clear() — that
    // would also wipe an admin session open in the same tab.
    apiService.auth.logout().catch(() => {});
    setUser(null);

    Swal.fire({
      icon: "info",
      title: "Signed out",
      text: "See you again soon.",
      toast: true,
      position: "bottom-end",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });
  };

  const updateUser = async (updates) => {
    // Persist to the backend first so a failure surfaces to the caller (which
    // shows an error toast) instead of leaving the UI claiming a save that
    // never happened. Mock branch PATCHes /users/:id (db.json); Laravel branch
    // hits PUT /auth/user. Throws on failure.
    await apiService.auth.updateUser(updates);

    // Merge the *updates* (never the API response — on JSON Server that still
    // carries the password) into the current safe user, then mirror to storage.
    // setUser makes the Header name/initials/avatar reflect the change with no
    // reload; the storage write means a reload keeps it too (session persistence).
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    authStorage.update("user", JSON.stringify(updatedUser));
    return updatedUser;
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    authModalOpen,
    authModalTab,
    openAuthModal,
    closeAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
