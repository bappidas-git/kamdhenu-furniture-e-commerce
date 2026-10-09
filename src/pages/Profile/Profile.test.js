import React from "react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Swal from "sweetalert2";
import { useReducedMotion } from "framer-motion";
import apiService from "../../services/api";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import db from "../../../db.json";
import Profile from "./Profile";

// The page runs against the real AuthProvider: the session is restored from
// storage, and updateUser(), login() and logout() are AuthContext's own, so
// the greeting, the rail and storage follow a save as they do in the app.
// Only the network, SweetAlert and the theme are stubbed. The account is the
// seeded customer (db.json users[0], without its password).
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

const signIn = (user = USER) => {
  sessionStorage.setItem("user", JSON.stringify(user));
  sessionStorage.setItem("token", "mock-token-1");
};

// Where the router is, how it got there, the auth dialog's state (spans, not
// <output>s, whose implicit status role would join the toast's), and two
// stand-ins: a route change the page did not make (back/forward, the header's
// links) and the dialog's own sign-in and close.
const Harness = () => {
  const location = useLocation();
  const type = useNavigationType();
  const navigate = useNavigate();
  const { authModalOpen, authModalTab, closeAuthModal, login } = useAuth();
  return (
    <div>
      <span data-testid="location">{location.pathname + location.search}</span>
      <span data-testid="navigation">{type}</span>
      <span data-testid="dialog">{authModalOpen ? authModalTab : "closed"}</span>
      <button type="button" onClick={() => navigate("/profile?tab=password")}>
        Route change
      </button>
      <button type="button" onClick={() => login({ email: USER.email, password: "password123" })}>
        Dialog sign-in
      </button>
      <button type="button" onClick={closeAuthModal}>
        Dialog close
      </button>
    </div>
  );
};

const renderProfile = (at = "/profile", { user = USER } = {}) => {
  if (user) signIn(user);
  return render(
    <MemoryRouter initialEntries={[at]}>
      <AuthProvider>
        <main>
          <Profile />
        </main>
        <Harness />
      </AuthProvider>
    </MemoryRouter>
  );
};

const location = () => screen.getByTestId("location").textContent;
const navigationType = () => screen.getByTestId("navigation").textContent;
const dialog = () => screen.getByTestId("dialog").textContent;
const nav = () => screen.getByRole("navigation", { name: "Account" });
const navLink = (name) => within(nav()).getByRole("link", { name });
const section = (name) => screen.getByRole("region", { name });
const h1 = () => screen.getByRole("heading", { level: 1 });
const status = () => screen.getByRole("status");
const field = (label) => screen.getByLabelText(label);
const saveButton = () => screen.getByRole("button", { name: /^(Save changes|Saving…)$/ });
// jsdom puts a space between the italic name and the full stop; browsers do not.
const greeting = (name) => new RegExp(`^Hello, ${name} ?\\.$`);

const changeField = (label, value) => fireEvent.change(field(label), { target: { value } });
// Press "Save changes" and let the request it starts (if any) settle.
const save = async () => {
  fireEvent.click(saveButton());
  await waitFor(() => expect(saveButton()).not.toHaveAttribute("data-busy"));
};
// Presentational wrappers, which have no role to query: the frame around a
// legacy section, the toast around its status line, the .sf-field around an
// input (what the page measures against the sticky header).
// eslint-disable-next-line testing-library/no-node-access
const frameOf = (region) => region.firstElementChild;
// eslint-disable-next-line testing-library/no-node-access
const toastTone = () => status().parentElement.getAttribute("data-tone");
// eslint-disable-next-line testing-library/no-node-access
const fieldBox = (label) => field(label).closest(".sf-field");

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
  apiService.auth.updateUser.mockImplementation((updates) => Promise.resolve({ ...USER, ...updates }));
  apiService.auth.logout.mockResolvedValue(undefined);
  apiService.auth.login.mockResolvedValue(USER);
  apiService.wallet.getBalance.mockResolvedValue(0);
  apiService.wallet.getTransactions.mockResolvedValue([]);
  Swal.fire.mockResolvedValue({ isConfirmed: true });
  scrollTo = jest.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  scrollTo.mockRestore();
  document.documentElement.style.removeProperty("--sf-header-height");
});

// ── The shell and the ?tab= contract ─────────────────────────────────────────

test("/profile: the greeting, the nav marking Profile, the Personal information section", () => {
  renderProfile();
  expect(h1()).toHaveAccessibleName(greeting("John"));
  expect(navLink("Profile")).toHaveAttribute("aria-current", "page");
  const region = section("Personal information");
  expect(within(region).getByRole("heading", { level: 2, name: "Personal information" })).toBeInTheDocument();
  expect(apiService.wallet.getBalance).not.toHaveBeenCalled();
});

test.each([
  ["addresses", "Addresses", "Addresses", "Addresses", "123 Main Street, Apt 4B"],
  ["password", "Change password", "Change password", "Change password", "A strong password has"],
])("?tab=%s opens that section inside the shell, the nav marking it", (tab, region, heading, linkName, sample) => {
  renderProfile(`/profile?tab=${tab}`);
  const content = section(region);
  expect(within(content).getByRole("heading", { level: 2, name: heading })).toBeInTheDocument();
  expect(within(content).getByText(sample)).toBeInTheDocument();
  expect(navLink(linkName)).toHaveAttribute("aria-current", "page");
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
});

test("?tab=wallet opens Store credit and reads the balance and the ledger, as the tab always did", async () => {
  apiService.wallet.getBalance.mockResolvedValue(2302);
  renderProfile("/profile?tab=wallet");
  const content = section("Store credit");
  expect(within(content).getByRole("heading", { level: 2, name: "Store Credit" })).toBeInTheDocument();
  expect(navLink("Store credit")).toHaveAttribute("aria-current", "page");
  expect(await within(content).findByText("₹2,302.00")).toBeInTheDocument();
  expect(apiService.wallet.getBalance).toHaveBeenCalledWith(USER.id);
  expect(apiService.wallet.getTransactions).toHaveBeenCalledWith(USER.id);
});

test.each(["orders", "wishlist", "logout", "profile", "PASSWORD", ""])(
  "?tab=%s (not a section here) shows the Profile section",
  (value) => {
    renderProfile(`/profile?tab=${value}`);
    expect(section("Personal information")).toBeInTheDocument();
    expect(navLink("Profile")).toHaveAttribute("aria-current", "page");
    // A link never signs anyone out.
    expect(Swal.fire).not.toHaveBeenCalled();
    expect(location()).toBe(`/profile?tab=${value}`);
  }
);

test("the legacy wallet section keeps its dark styles in dark mode, inside a neutral frame", async () => {
  useTheme.mockReturnValue({ isDarkMode: true });
  renderProfile("/profile?tab=wallet");
  expect(frameOf(section("Store credit"))).toHaveClass("legacy", "dark");
  await within(section("Store credit")).findByText("No store-credit transactions yet");
});

test("in light mode the frame has no dark class, and the Profile section has no frame", async () => {
  const { unmount } = renderProfile("/profile?tab=wallet");
  expect(frameOf(section("Store credit"))).toHaveClass("legacy");
  expect(frameOf(section("Store credit"))).not.toHaveClass("dark");
  await within(section("Store credit")).findByText("No store-credit transactions yet");
  unmount();
  sessionStorage.clear();
  renderProfile("/profile");
  expect(frameOf(section("Personal information"))).not.toHaveClass("legacy");
  expect(frameOf(section("Personal information"))).toHaveClass("sf-card", "sf-card--hairline");
});

test.each([
  ["addresses", "Addresses"],
  ["password", "Change password"],
])("?tab=%s is restyled: no legacy frame, no dark class, in either mode", (tab, region) => {
  useTheme.mockReturnValue({ isDarkMode: true });
  renderProfile(`/profile?tab=${tab}`);
  expect(frameOf(section(region))).not.toHaveClass("legacy");
  expect(frameOf(section(region))).not.toHaveClass("dark");
});

test("arriving on a tab leaves focus where the page load put it", async () => {
  renderProfile("/profile?tab=wallet");
  expect(document.body).toHaveFocus();
  await within(section("Store credit")).findByText("No store-credit transactions yet");
});

test("arriving from another page of the app (the session already restored) leaves focus alone too", () => {
  signIn();
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <main>
          <Routes>
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<p>Elsewhere</p>} />
          </Routes>
        </main>
        <Harness />
      </AuthProvider>
    </MemoryRouter>
  );
  expect(screen.getByText("Elsewhere")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Route change" }));
  expect(section("Change password")).toBeInTheDocument();
  expect(section("Change password")).not.toHaveFocus();
  expect(document.body).toHaveFocus();
});

test("a tab from the nav: replace, the new section, focus on it, the last message gone", () => {
  renderProfile();
  changeField("First name", "");
  fireEvent.click(saveButton());
  expect(status()).toHaveTextContent("First name and last name are required.");

  fireEvent.click(navLink("Addresses"));
  expect(location()).toBe("/profile?tab=addresses");
  expect(navigationType()).toBe("REPLACE");
  expect(section("Addresses")).toHaveFocus();
  expect(navLink("Addresses")).toHaveAttribute("aria-current", "page");
  expect(status().textContent).toBe("");
});

test("Profile in the nav goes back to /profile", async () => {
  renderProfile("/profile?tab=wallet");
  await within(section("Store credit")).findByText("No store-credit transactions yet");
  fireEvent.click(navLink("Profile"));
  expect(location()).toBe("/profile");
  expect(section("Personal information")).toHaveFocus();
});

test("Orders and Wishlist in the nav leave for their pages", () => {
  renderProfile();
  fireEvent.click(navLink("Orders"));
  expect(location()).toBe("/orders");
  expect(navigationType()).toBe("PUSH");
});

test("a route change the page did not make (back, forward, the header) switches the section too", () => {
  renderProfile();
  fireEvent.click(screen.getByRole("button", { name: "Route change" }));
  expect(section("Change password")).toHaveFocus();
  expect(navLink("Change password")).toHaveAttribute("aria-current", "page");
});

test("a switch made far down the page brings the new section's top back under the header", () => {
  document.documentElement.style.setProperty("--sf-header-height", "64px");
  renderProfile("/profile?tab=addresses");
  const region = section("Addresses");
  region.getBoundingClientRect = () => ({ top: -500, bottom: 300, left: 0, right: 900, width: 900, height: 800 });
  const scrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 1200 });
  try {
    fireEvent.click(navLink("Profile"));
    // 1200 + (-500) - 64 (the header) - 16 (the gap)
    expect(scrollTo).toHaveBeenCalledWith({ top: 620, behavior: "smooth" });
  } finally {
    Object.defineProperty(window, "scrollY", scrollY);
  }
});

test("…also when the top is only under the header; instantly under reduced motion; not when in view", () => {
  document.documentElement.style.setProperty("--sf-header-height", "64px");
  useReducedMotion.mockReturnValue(true);
  renderProfile("/profile?tab=addresses");
  const region = section("Addresses");
  // Below the window's top but still hidden under the 64px sticky header.
  region.getBoundingClientRect = () => ({ top: 30, bottom: 600, left: 0, right: 900, width: 900, height: 570 });
  const scrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 500 });
  try {
    fireEvent.click(navLink("Change password"));
    // 500 + 30 - 64 - 16
    expect(scrollTo).toHaveBeenCalledWith({ top: 450, behavior: "instant" });
  } finally {
    Object.defineProperty(window, "scrollY", scrollY);
  }

  scrollTo.mockClear();
  region.getBoundingClientRect = () => ({ top: 240, bottom: 900, left: 0, right: 900, width: 900, height: 660 });
  fireEvent.click(navLink("Profile"));
  expect(scrollTo).not.toHaveBeenCalled();
});

// ── Guests ───────────────────────────────────────────────────────────────────

test("a guest sees a sign-in panel; nothing redirects and nothing is read", () => {
  renderProfile("/profile?tab=wallet", { user: null });
  expect(location()).toBe("/profile?tab=wallet");
  expect(h1()).toHaveTextContent(/^My account$/);
  expect(screen.getByRole("heading", { level: 2, name: "Sign in to see your account." })).toBeInTheDocument();
  expect(
    screen.getByText("Your details, saved addresses and store credit are kept on your account.")
  ).toBeInTheDocument();
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
  expect(apiService.wallet.getBalance).not.toHaveBeenCalled();
});

test("Sign in opens the dialog on Sign in; Create account on its own tab", () => {
  renderProfile("/profile", { user: null });
  const signInButton = screen.getByRole("button", { name: "Sign in" });
  expect(signInButton).toHaveAttribute("aria-haspopup", "dialog");
  fireEvent.click(signInButton);
  expect(dialog()).toBe("login");
  fireEvent.click(screen.getByRole("button", { name: "Dialog close" }));
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(dialog()).toBe("signup");
});

test("signing in renders the account in place, on the tab asked for; focus waits for the dialog", async () => {
  renderProfile("/profile?tab=wallet", { user: null });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  // The sign-in, and the wallet read it starts, settle inside act(): the
  // wallet shows the same empty state before its read as after it.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Dialog sign-in" }));
  });
  // Signed in while the dialog still shows its success line.
  expect(dialog()).toBe("login");
  expect(nav()).toBeInTheDocument();
  expect(navLink("Store credit")).toHaveAttribute("aria-current", "page");
  expect(location()).toBe("/profile?tab=wallet");
  expect(h1()).toHaveAccessibleName(greeting("John"));
  expect(apiService.wallet.getBalance).toHaveBeenCalledWith(USER.id);
  expect(within(section("Store credit")).getByText("No store-credit transactions yet")).toBeInTheDocument();
  expect(h1()).not.toHaveFocus();

  fireEvent.click(screen.getByRole("button", { name: "Dialog close" }));
  await waitFor(() => expect(h1()).toHaveFocus());
});

test("…unless focus has gone somewhere else meanwhile", async () => {
  renderProfile("/profile", { user: null });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  fireEvent.click(screen.getByRole("button", { name: "Dialog sign-in" }));
  await screen.findByRole("navigation", { name: "Account" });
  const elsewhere = screen.getByRole("button", { name: "Route change" });
  elsewhere.focus();
  fireEvent.click(screen.getByRole("button", { name: "Dialog close" }));
  await act(async () => {
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
  });
  expect(elsewhere).toHaveFocus();
});

test("closing the dialog without signing in moves nothing", async () => {
  renderProfile("/profile", { user: null });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  fireEvent.click(screen.getByRole("button", { name: "Dialog close" }));
  await act(async () => {
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
  });
  expect(h1()).not.toHaveFocus();
  expect(screen.getByRole("heading", { level: 2, name: "Sign in to see your account." })).toBeInTheDocument();
});

// ── The Profile form ─────────────────────────────────────────────────────────

test("labelled fields with the right autocomplete, the read-only email and the hints", () => {
  renderProfile();
  const first = field("First name");
  expect(first).toHaveValue("John");
  expect(first).toHaveAttribute("autocomplete", "given-name");
  expect(first).toBeRequired();
  const last = field("Last name");
  expect(last).toHaveValue("Doe");
  expect(last).toHaveAttribute("autocomplete", "family-name");
  expect(last).toBeRequired();
  const email = field("Email address");
  expect(email).toHaveValue("user@example.com");
  expect(email).toHaveAttribute("readonly");
  expect(email).toHaveAttribute("type", "email");
  expect(email).toHaveAttribute("autocomplete", "email");
  expect(email).toHaveAccessibleDescription("Email cannot be changed");
  const phone = field("Phone number (optional)");
  expect(phone).toHaveValue("+91 9876543210");
  expect(phone).toHaveAttribute("type", "tel");
  expect(phone).toHaveAttribute("inputmode", "tel");
  expect(phone).toHaveAttribute("autocomplete", "tel");
  expect(phone).not.toBeRequired();
  expect(phone).toHaveAccessibleDescription("10-digit mobile number");
  [first, last, email, phone].forEach((input) => expect(input).not.toHaveAttribute("aria-invalid"));
});

test("'Member since' under the heading when the account has a date, nothing without", () => {
  const { unmount } = renderProfile();
  expect(screen.getByText("Member since January 15, 2025")).toBeInTheDocument();
  unmount();
  sessionStorage.clear();
  const { createdAt, ...noDate } = USER;
  renderProfile("/profile", { user: noDate });
  expect(screen.queryByText(/^Member since/)).not.toBeInTheDocument();
});

test("empty names: a message on each, focus on the first, the toast, and no save", async () => {
  renderProfile();
  changeField("First name", "  ");
  changeField("Last name", "");
  await save();
  const first = field("First name");
  const last = field("Last name");
  expect(first).toHaveAttribute("aria-invalid", "true");
  expect(first).toHaveAccessibleDescription("First name is required");
  expect(last).toHaveAttribute("aria-invalid", "true");
  expect(last).toHaveAccessibleDescription("Last name is required");
  expect(first).toHaveFocus();
  expect(status()).toHaveTextContent("First name and last name are required.");
  expect(toastTone()).toBe("error");
  expect(apiService.auth.updateUser).not.toHaveBeenCalled();
  // The values stay as typed.
  expect(first).toHaveValue("  ");
});

test("a failing field the sticky header covers is brought back under it, label first", async () => {
  document.documentElement.style.setProperty("--sf-header-height", "64px");
  renderProfile();
  changeField("First name", "");
  // The field (label, input, message) starts 10px below the window's top:
  // "in view" for focus(), but under the 64px header.
  fieldBox("First name").getBoundingClientRect = () => ({
    top: 10, bottom: 90, left: 0, right: 600, width: 600, height: 80,
  });
  const scrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 700 });
  try {
    await save();
    expect(field("First name")).toHaveFocus();
    // 700 + 10 - 64 (the header) - 16 (the gap)
    expect(scrollTo).toHaveBeenCalledWith({ top: 630, behavior: "smooth" });
  } finally {
    Object.defineProperty(window, "scrollY", scrollY);
  }
});

test("…while a failing field in full view stays where it is", async () => {
  document.documentElement.style.setProperty("--sf-header-height", "64px");
  renderProfile();
  changeField("Last name", "");
  fieldBox("Last name").getBoundingClientRect = () => ({
    top: 300, bottom: 380, left: 0, right: 600, width: 600, height: 80,
  });
  await save();
  expect(field("Last name")).toHaveFocus();
  expect(scrollTo).not.toHaveBeenCalled();
});

test("…and one below the fold (Enter pressed higher up) comes up under the header the same way", async () => {
  document.documentElement.style.setProperty("--sf-header-height", "64px");
  renderProfile();
  changeField("Phone number (optional)", "12345");
  // jsdom's window is 768px tall; the field ends below it.
  fieldBox("Phone number (optional)").getBoundingClientRect = () => ({
    top: 720, bottom: 800, left: 0, right: 600, width: 600, height: 80,
  });
  await save();
  expect(field("Phone number (optional)")).toHaveFocus();
  // 0 + 720 - 64 (the header) - 16 (the gap)
  expect(scrollTo).toHaveBeenCalledWith({ top: 640, behavior: "smooth" });
});

test("one blank name: only that field is marked; the toast is the same rule's", async () => {
  renderProfile();
  // Spaces only count as empty (the values are trimmed).
  changeField("Last name", "   ");
  await save();
  expect(field("First name")).not.toHaveAttribute("aria-invalid");
  expect(field("Last name")).toHaveAttribute("aria-invalid", "true");
  expect(field("Last name")).toHaveFocus();
  expect(status()).toHaveTextContent("First name and last name are required.");
});

test("an invalid phone: its message after the hint, focus on it, the toast, and no save", async () => {
  renderProfile();
  changeField("Phone number (optional)", "12345");
  await save();
  const phone = field("Phone number (optional)");
  expect(phone).toHaveAttribute("aria-invalid", "true");
  expect(phone).toHaveAccessibleDescription("10-digit mobile number Enter a valid 10-digit mobile number");
  expect(phone).toHaveFocus();
  expect(status()).toHaveTextContent("Please enter a valid 10-digit Indian mobile number.");
  expect(apiService.auth.updateUser).not.toHaveBeenCalled();
});

test("several at once: every field says what is wrong; the toast keeps the first rule's message", async () => {
  renderProfile();
  changeField("First name", "");
  changeField("Phone number (optional)", "5555");
  await save();
  expect(field("First name")).toHaveAttribute("aria-invalid", "true");
  expect(field("Phone number (optional)")).toHaveAttribute("aria-invalid", "true");
  expect(field("First name")).toHaveFocus();
  expect(status()).toHaveTextContent("First name and last name are required.");
});

test("typing in a field clears its own message, and only its own", async () => {
  renderProfile();
  changeField("First name", "");
  changeField("Last name", "");
  await save();
  changeField("First name", "J");
  expect(field("First name")).not.toHaveAttribute("aria-invalid");
  expect(field("First name")).not.toHaveAccessibleDescription();
  expect(screen.queryByText("First name is required")).not.toBeInTheDocument();
  expect(field("Last name")).toHaveAttribute("aria-invalid", "true");
});

test("a valid save sends the trimmed names and phone, and nothing else, through updateUser", async () => {
  renderProfile();
  changeField("First name", "  Johnny ");
  changeField("Last name", " Doe  ");
  changeField("Phone number (optional)", " 98765 43210 ");
  await save();
  expect(apiService.auth.updateUser).toHaveBeenCalledTimes(1);
  expect(apiService.auth.updateUser).toHaveBeenCalledWith({
    firstName: "Johnny",
    lastName: "Doe",
    phone: "98765 43210",
  });
  expect(status()).toHaveTextContent("Profile updated successfully.");
  expect(toastTone()).toBe("success");
  // The greeting and the rail follow at once, with no reload; so does the
  // stored session (a reload keeps it).
  expect(h1()).toHaveAccessibleName(greeting("Johnny"));
  expect(within(nav()).getByText("Johnny Doe")).toBeInTheDocument();
  expect(JSON.parse(sessionStorage.getItem("user"))).toMatchObject({
    firstName: "Johnny",
    lastName: "Doe",
    phone: "98765 43210",
  });
  ["First name", "Last name", "Phone number (optional)"].forEach((label) =>
    expect(field(label)).not.toHaveAttribute("aria-invalid")
  );
});

test("the phone is optional: an empty one saves as empty", async () => {
  renderProfile();
  changeField("Phone number (optional)", "");
  await save();
  expect(apiService.auth.updateUser).toHaveBeenCalledWith({ firstName: "John", lastName: "Doe", phone: "" });
});

test("Enter in a field submits the form", async () => {
  renderProfile();
  fireEvent.submit(field("Last name").form);
  await waitFor(() => expect(status()).toHaveTextContent("Profile updated successfully."));
  expect(apiService.auth.updateUser).toHaveBeenCalledTimes(1);
});

test("while saving: 'Saving…', busy but focusable, further presses ignored", async () => {
  let finish;
  apiService.auth.updateUser.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  renderProfile();
  const button = saveButton();
  expect(button).toHaveAttribute("type", "submit");
  button.focus();
  fireEvent.click(button);
  expect(button).toHaveTextContent("Saving…");
  expect(button).toHaveAttribute("aria-disabled", "true");
  expect(button).toHaveAttribute("data-busy", "true");
  expect(button).toBeEnabled();
  expect(button).toHaveFocus();
  fireEvent.click(button);
  expect(apiService.auth.updateUser).toHaveBeenCalledTimes(1);
  await act(async () => finish({}));
  expect(button).toHaveTextContent("Save changes");
  expect(button).not.toHaveAttribute("aria-disabled");
});

test("a failed save says so and keeps what was typed", async () => {
  apiService.auth.updateUser.mockRejectedValue(new Error("Network Error"));
  renderProfile();
  changeField("First name", "Johnny");
  await save();
  expect(status()).toHaveTextContent("Failed to update profile. Please try again.");
  expect(field("First name")).toHaveValue("Johnny");
  expect(h1()).toHaveAccessibleName(greeting("John"));
});

// ── The toast ────────────────────────────────────────────────────────────────

test("the status line is always in the page; a message clears itself after 4 seconds", async () => {
  jest.useFakeTimers();
  renderProfile();
  expect(status().textContent).toBe("");
  changeField("First name", "");
  fireEvent.click(saveButton());
  expect(status()).toHaveTextContent("First name and last name are required.");
  act(() => {
    jest.advanceTimersByTime(3999);
  });
  expect(status()).toHaveTextContent("First name and last name are required.");
  act(() => {
    jest.advanceTimersByTime(1);
  });
  expect(status().textContent).toBe("");
  expect(screen.queryByRole("button", { name: "Dismiss message" })).not.toBeInTheDocument();
});

test("Dismiss message clears it at once", () => {
  renderProfile();
  changeField("First name", "");
  fireEvent.click(saveButton());
  fireEvent.click(screen.getByRole("button", { name: "Dismiss message" }));
  expect(status().textContent).toBe("");
  expect(screen.queryByRole("button", { name: "Dismiss message" })).not.toBeInTheDocument();
});

// ── Signing out from the page ────────────────────────────────────────────────

test("Sign out confirms, signs out and goes home", async () => {
  renderProfile("/profile?tab=password");
  fireEvent.click(within(nav()).getByRole("button", { name: "Sign out" }));
  expect(Swal.fire.mock.calls[0][0]).toMatchObject({
    title: "Sign out?",
    customClass: { confirmButton: "sf-btn sf-btn--danger" },
  });
  await waitFor(() => expect(location()).toBe("/"));
  expect(apiService.auth.logout).toHaveBeenCalledTimes(1);
});

test("a sign-out that fails is reported in the page's toast", async () => {
  // logout() throws when the API call cannot even start (here the stub gives
  // it nothing to wait on).
  apiService.auth.logout.mockReturnValue(undefined);
  renderProfile();
  fireEvent.click(within(nav()).getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(status()).toHaveTextContent("Sign out failed. Please try again."));
  expect(location()).toBe("/profile");
  expect(nav()).toBeInTheDocument();
});
