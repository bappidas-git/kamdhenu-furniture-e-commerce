import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useReducedMotion } from "framer-motion";
import apiService from "../../services/api";
import { AuthProvider } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import db from "../../../db.json";
import Profile from "./Profile";

// The Change password section (prompts/DESIGN_SYSTEM.md §32) against the real
// AuthProvider. The request is apiService.auth.changePassword, stubbed with the
// network; SweetAlert and the theme are stubbed too.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    auth: { login: jest.fn(), logout: jest.fn(), updateUser: jest.fn(), changePassword: jest.fn() },
    wallet: { getBalance: jest.fn(), getTransactions: jest.fn() },
  },
  getErrorMessage: (error) => error?.message,
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn() } }));
jest.mock("../../context/ThemeContext", () => ({ useTheme: jest.fn() }));
jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(),
}));

// jsdom has no IntersectionObserver (Reveal uses one): everything is in view.
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe(target) {
    this.callback([{ isIntersecting: true, target }], this);
  }
  unobserve() {}
  disconnect() {}
}

const { password: _password, ...USER } = db.users[0];

const renderPassword = () => {
  sessionStorage.setItem("user", JSON.stringify(USER));
  sessionStorage.setItem("token", "mock-token-1");
  return render(
    <MemoryRouter initialEntries={["/profile?tab=password"]}>
      <AuthProvider>
        <main>
          <Profile />
        </main>
      </AuthProvider>
    </MemoryRouter>
  );
};

const region = () => screen.getByRole("region", { name: "Change password" });
const current = () => within(region()).getByLabelText("Current password");
const next = () => within(region()).getByLabelText("New password");
const confirmation = () => within(region()).getByLabelText("Confirm new password");
const type = (input, value) => fireEvent.change(input, { target: { value } });
const submitButton = () => within(region()).getByRole("button", { name: /^(Update password|Updating…)$/ });
const status = () => screen.getByRole("status");
// Presentational parts with no role to query: the strength line (a live
// region that is empty while there is no password), the meter (aria-hidden),
// its segments, and the hidden line that says what Show / Hide did.
// eslint-disable-next-line testing-library/no-node-access
const strength = () => document.getElementById("password-new-strength");
// eslint-disable-next-line testing-library/no-node-access
const meter = () => region().querySelector("[data-level]");
// eslint-disable-next-line testing-library/no-node-access
const announcement = () => region().querySelector('p[aria-atomic="true"]');
const checks = () => within(within(region()).getByRole("list", { name: "A strong password has" })).getAllByRole("listitem");

// Click, and let the request it starts (if any) settle.
const press = async (element) => {
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => {
    fireEvent.click(element);
  });
};

const fillValid = () => {
  type(current(), "password123");
  type(next(), "Furniture#2026");
  type(confirmation(), "Furniture#2026");
};

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver;
});
afterAll(() => {
  delete window.IntersectionObserver;
});

// CRA resets every mock before each test (resetMocks): implementations here.
let scrollTo;
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  useTheme.mockReturnValue({ isDarkMode: false });
  useReducedMotion.mockReturnValue(false);
  apiService.auth.changePassword.mockResolvedValue({ success: true });
  apiService.wallet.getBalance.mockResolvedValue(0);
  apiService.wallet.getTransactions.mockResolvedValue([]);
  scrollTo = jest.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  scrollTo.mockRestore();
  document.documentElement.style.removeProperty("--sf-header-height");
});

// ── The form ─────────────────────────────────────────────────────────────────

test("a hairline card: the serif h2, one form, three labelled password fields with autocomplete", () => {
  renderPassword();
  const card = within(region()).getByRole("heading", { level: 2, name: "Change password" });
  expect(card).toHaveClass("sf-display-sm");
  [
    [current(), "current-password"],
    [next(), "new-password"],
    [confirmation(), "new-password"],
  ].forEach(([input, autocomplete]) => {
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", autocomplete);
    expect(input).toHaveAttribute("autocapitalize", "none");
    expect(input).toHaveAttribute("spellcheck", "false");
    expect(input).toBeRequired();
    expect(input).toHaveValue("");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("placeholder");
  });
  expect(within(region()).getByRole("button", { name: "Update password" })).toHaveClass("sf-btn--primary");
});

test("password managers get the account: a hidden username field with the email", () => {
  renderPassword();
  // eslint-disable-next-line testing-library/no-node-access
  const username = region().querySelector('input[autocomplete="username"]');
  expect(username).toHaveValue(USER.email);
  expect(username).toHaveAttribute("readonly");
  expect(username).not.toBeVisible();
  // eslint-disable-next-line testing-library/no-node-access
  expect(username.form).toBe(current().form);
});

test("Show / Hide: the name follows the text, the field shows its text, a hidden line says so", () => {
  renderPassword();
  const show = within(region()).getByRole("button", { name: "Show current password" });
  expect(show).toHaveAttribute("aria-controls", current().id);
  expect(show).not.toHaveAttribute("aria-pressed");
  expect(show).toHaveAttribute("type", "button");
  fireEvent.click(show);
  expect(current()).toHaveAttribute("type", "text");
  expect(show).toHaveAccessibleName("Hide current password");
  expect(show).toHaveTextContent(/^Hide/);
  expect(announcement()).toHaveTextContent("Current password shown.");
  expect(announcement()).toHaveAttribute("aria-live", "polite");
  fireEvent.click(show);
  expect(current()).toHaveAttribute("type", "password");
  expect(announcement()).toHaveTextContent("Current password hidden.");
  // Each field has its own.
  fireEvent.click(within(region()).getByRole("button", { name: "Show new password" }));
  expect(next()).toHaveAttribute("type", "text");
  expect(confirmation()).toHaveAttribute("type", "password");
  expect(announcement()).toHaveTextContent("New password shown.");
  fireEvent.click(within(region()).getByRole("button", { name: "Show password confirmation" }));
  expect(confirmation()).toHaveAttribute("type", "text");
  expect(announcement()).toHaveTextContent("Password confirmation shown.");
});

test("Show / Hide does not submit the form", () => {
  renderPassword();
  fireEvent.click(within(region()).getByRole("button", { name: "Show current password" }));
  expect(apiService.auth.changePassword).not.toHaveBeenCalled();
  expect(status().textContent).toBe("");
});

// ── The strength meter and the checklist ────────────────────────────────────

test.each([
  ["abc", 1, "Weak"],
  ["abcdefgh", 1, "Weak"],
  ["abcdefgH1", 2, "Fair"],
  ["Furniture1", 2, "Fair"],
  ["Furniture1!", 3, "Good"],
  ["furniture#2026x", 3, "Good"],
  ["Furniture#2026", 4, "Strong"],
])("'%s': the meter at level %i, '%s' in a polite live line that describes the field", (value, level, label) => {
  renderPassword();
  type(next(), value);
  expect(meter()).toHaveAttribute("data-level", String(level));
  expect(meter()).toHaveAttribute("aria-hidden", "true");
  expect(strength()).toHaveTextContent(`Password strength: ${label}`);
  expect(strength()).toHaveAttribute("aria-live", "polite");
  expect(next()).toHaveAccessibleDescription(`Password strength: ${label}`);
});

test("no password, no meter; the live line stays in the page, empty", () => {
  renderPassword();
  expect(meter()).toBeNull();
  expect(strength()).toBeInTheDocument();
  expect(strength().textContent).toBe("");
  expect(next()).not.toHaveAccessibleDescription();
});

test("the meter's tones come from the stylesheet: no inline colours anywhere in the section", () => {
  renderPassword();
  type(next(), "Furniture1");
  // eslint-disable-next-line testing-library/no-node-access
  expect(region().querySelectorAll("[style*='color']")).toHaveLength(0);
  // eslint-disable-next-line testing-library/no-node-access
  expect(meter().querySelectorAll("span")).toHaveLength(4);
});

test("the checklist: five rules, each saying in text whether it passes, as you type", () => {
  renderPassword();
  expect(checks().map((item) => item.textContent)).toEqual([
    "At least 8 characters, not yet",
    "One uppercase letter, not yet",
    "One lowercase letter, not yet",
    "One number, not yet",
    "One special character, not yet",
  ]);
  type(next(), "Ab1!");
  expect(checks().map((item) => item.textContent)).toEqual([
    "At least 8 characters, not yet",
    "One uppercase letter, done",
    "One lowercase letter, done",
    "One number, done",
    "One special character, done",
  ]);
  checks()
    .slice(1)
    .forEach((item) => expect(item).toHaveAttribute("data-met", "true"));
  expect(checks()[0]).not.toHaveAttribute("data-met");
  type(next(), "Abcde1!");
  expect(checks()[0]).toHaveTextContent("At least 8 characters, not yet");
  type(next(), "Abcdef1!");
  expect(checks()[0]).toHaveTextContent("At least 8 characters, done");
});

test("the checklist is not a live region (it would speak on every keystroke)", () => {
  renderPassword();
  const list = within(region()).getByRole("list", { name: "A strong password has" });
  expect(list).not.toHaveAttribute("aria-live");
  // eslint-disable-next-line testing-library/no-node-access
  expect(list.closest("[aria-live]")).toBeNull();
});

// ── Validation ───────────────────────────────────────────────────────────────

test("an empty submit: a message on the two fields that fail, focus on the first, the old toast, no request", async () => {
  renderPassword();
  await press(submitButton());
  expect(current()).toHaveAttribute("aria-invalid", "true");
  expect(current()).toHaveAccessibleDescription("Enter your current password");
  expect(next()).toHaveAttribute("aria-invalid", "true");
  expect(next()).toHaveAccessibleDescription("Enter a new password");
  // Both empty still match: the confirmation passes its rule.
  expect(confirmation()).not.toHaveAttribute("aria-invalid");
  expect(current()).toHaveFocus();
  expect(status()).toHaveTextContent("Please enter your current password.");
  expect(apiService.auth.changePassword).not.toHaveBeenCalled();
});

test("a short new password: its message, focus on it, the length toast", async () => {
  renderPassword();
  type(current(), "password123");
  type(next(), "abc");
  type(confirmation(), "abc");
  await press(submitButton());
  expect(current()).not.toHaveAttribute("aria-invalid");
  expect(next()).toHaveAccessibleDescription("Password strength: Weak New password must be at least 8 characters");
  expect(next()).toHaveFocus();
  expect(confirmation()).not.toHaveAttribute("aria-invalid");
  expect(status()).toHaveTextContent("New password must be at least 8 characters.");
  expect(apiService.auth.changePassword).not.toHaveBeenCalled();
});

test("a mismatch: 'Passwords do not match' on the confirmation, focus there, the old toast", async () => {
  renderPassword();
  type(current(), "password123");
  type(next(), "Furniture#2026");
  type(confirmation(), "Furniture#2025");
  await press(submitButton());
  expect(confirmation()).toHaveAttribute("aria-invalid", "true");
  expect(confirmation()).toHaveAccessibleDescription("Passwords do not match");
  expect(confirmation()).toHaveFocus();
  expect(status()).toHaveTextContent("New password and confirm password do not match.");
  expect(apiService.auth.changePassword).not.toHaveBeenCalled();
  // The values stay as typed.
  expect(next()).toHaveValue("Furniture#2026");
  expect(confirmation()).toHaveValue("Furniture#2025");
});

test("an empty confirmation under a good new password asks for it", async () => {
  renderPassword();
  type(current(), "password123");
  type(next(), "Furniture#2026");
  await press(submitButton());
  expect(confirmation()).toHaveAccessibleDescription("Confirm your new password");
  expect(status()).toHaveTextContent("New password and confirm password do not match.");
});

test("several at once: focus on the first; the toast is the first rule's", async () => {
  renderPassword();
  type(next(), "Furniture#2026");
  type(confirmation(), "nope");
  await press(submitButton());
  expect(current()).toHaveAttribute("aria-invalid", "true");
  expect(confirmation()).toHaveAttribute("aria-invalid", "true");
  expect(current()).toHaveFocus();
  expect(status()).toHaveTextContent("Please enter your current password.");
});

test("typing in a field clears its own message, and only its own", async () => {
  renderPassword();
  await press(submitButton());
  type(current(), "p");
  expect(current()).not.toHaveAttribute("aria-invalid");
  expect(within(region()).queryByText("Enter your current password")).not.toBeInTheDocument();
  expect(next()).toHaveAttribute("aria-invalid", "true");
});

test("the mismatch message goes as soon as the two match, from either field", async () => {
  renderPassword();
  type(current(), "password123");
  type(next(), "Furniture#2026");
  type(confirmation(), "Furniture#2025");
  await press(submitButton());
  expect(confirmation()).toHaveAttribute("aria-invalid", "true");
  type(next(), "Furniture#2025");
  expect(confirmation()).not.toHaveAttribute("aria-invalid");
  expect(within(region()).queryByText("Passwords do not match")).not.toBeInTheDocument();
});

test("leaving the confirmation with a value that differs says so (not while typing), until they match", () => {
  renderPassword();
  type(next(), "Furniture#2026");
  type(confirmation(), "Furn");
  expect(confirmation()).not.toHaveAttribute("aria-invalid");
  fireEvent.blur(confirmation());
  expect(confirmation()).toHaveAttribute("aria-invalid", "true");
  expect(confirmation()).toHaveAccessibleDescription("Passwords do not match");
  // From then on it follows the typing.
  type(confirmation(), "Furniture#2026");
  expect(confirmation()).not.toHaveAttribute("aria-invalid");
  type(confirmation(), "Furniture#202");
  expect(confirmation()).toHaveAccessibleDescription("Passwords do not match");
  expect(apiService.auth.changePassword).not.toHaveBeenCalled();
});

test("leaving an empty confirmation says nothing", () => {
  renderPassword();
  type(next(), "Furniture#2026");
  fireEvent.blur(confirmation());
  expect(confirmation()).not.toHaveAttribute("aria-invalid");
});

test("a failing field the sticky header covers is brought back under it, label first", async () => {
  document.documentElement.style.setProperty("--sf-header-height", "64px");
  renderPassword();
  // eslint-disable-next-line testing-library/no-node-access
  current().closest(".sf-field").getBoundingClientRect = () => ({
    top: 30, bottom: 110, left: 0, right: 440, width: 440, height: 80,
  });
  const scrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 400 });
  try {
    await press(submitButton());
    expect(current()).toHaveFocus();
    // 400 + 30 - 64 (the header) - 16 (the gap)
    expect(scrollTo).toHaveBeenCalledWith({ top: 350, behavior: "smooth" });
  } finally {
    Object.defineProperty(window, "scrollY", scrollY);
  }
});

// ── The request ──────────────────────────────────────────────────────────────

test("a valid change: changePassword with the same object as ever, the toast, a clean form", async () => {
  renderPassword();
  type(current(), " password123 ");
  type(next(), "Furniture#2026");
  type(confirmation(), "Furniture#2026");
  fireEvent.click(within(region()).getByRole("button", { name: "Show new password" }));
  await press(submitButton());
  expect(apiService.auth.changePassword).toHaveBeenCalledTimes(1);
  // Passwords are sent as typed (never trimmed).
  expect(apiService.auth.changePassword).toHaveBeenCalledWith({
    currentPassword: " password123 ",
    newPassword: "Furniture#2026",
    confirmPassword: "Furniture#2026",
  });
  expect(status()).toHaveTextContent("Password updated successfully.");
  [current(), next(), confirmation()].forEach((input) => {
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("type", "password");
    expect(input).not.toHaveAttribute("aria-invalid");
  });
  expect(meter()).toBeNull();
  expect(apiService.auth.updateUser).not.toHaveBeenCalled();
  // The next attempt starts fresh: no mismatch message until the
  // confirmation is left again.
  type(next(), "Another#2026");
  type(confirmation(), "Ano");
  expect(confirmation()).not.toHaveAttribute("aria-invalid");
});

test("Enter in a field submits the form", async () => {
  renderPassword();
  fillValid();
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => {
    fireEvent.submit(current().form);
  });
  expect(apiService.auth.changePassword).toHaveBeenCalledTimes(1);
});

test("while the request runs: 'Updating…', busy but focusable, further presses ignored", async () => {
  let finish;
  apiService.auth.changePassword.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  renderPassword();
  fillValid();
  const button = submitButton();
  expect(button).toHaveAttribute("type", "submit");
  button.focus();
  fireEvent.click(button);
  expect(button).toHaveTextContent("Updating…");
  expect(button).toHaveAttribute("aria-disabled", "true");
  expect(button).toHaveAttribute("data-busy", "true");
  expect(button).toBeEnabled();
  expect(button).toHaveFocus();
  fireEvent.click(button);
  expect(apiService.auth.changePassword).toHaveBeenCalledTimes(1);
  await act(async () => finish({ success: true }));
  expect(button).toHaveTextContent("Update password");
  expect(button).not.toHaveAttribute("aria-disabled");
  expect(button).toHaveFocus();
});

test("a refused change says so and keeps what was typed", async () => {
  apiService.auth.changePassword.mockRejectedValue(new Error("The current password is incorrect."));
  renderPassword();
  fillValid();
  await press(submitButton());
  expect(status()).toHaveTextContent("Failed to change password. Please check your current password.");
  expect(current()).toHaveValue("password123");
  expect(next()).toHaveValue("Furniture#2026");
});
