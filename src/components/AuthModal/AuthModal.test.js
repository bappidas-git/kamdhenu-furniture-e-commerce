import React from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { useBodyScrollLocked } from "../ui/useFocusTrap";
import AuthModal from "./AuthModal";

// The dialog runs against the real AuthProvider, mounted the way Header mounts
// it (open={authModalOpen}, onClose={closeAuthModal}, defaultTab=
// {authModalTab}), so login() and register() are AuthContext's own and
// "Remember me" reaches authStorage. Only the network and the toasts are
// stubbed.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    auth: { login: jest.fn(), register: jest.fn(), logout: jest.fn(() => Promise.resolve()) },
  },
  getErrorMessage: (error) => error?.response?.data?.message || error?.message || "An error occurred",
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn(() => Promise.resolve({})) } }));

const USER = { id: 1, email: "user@example.com", firstName: "John", lastName: "Doe" };

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

// Stands in for the browser's back/forward: a route change the dialog did not make.
const RouteChanger = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/about")}>
      Change route
    </button>
  );
};

// BottomNav's guest Account button: inert while any overlay locks the page.
const InertBar = () => {
  const locked = useBodyScrollLocked();
  const { openAuthModal } = useAuth();
  return (
    <nav aria-label="Quick links" inert={locked ? "" : undefined}>
      <button type="button" onClick={() => openAuthModal("login")}>
        Account
      </button>
    </nav>
  );
};

const Host = () => {
  const { authModalOpen, authModalTab, openAuthModal, closeAuthModal, user } = useAuth();
  return (
    <>
      <button type="button" onClick={() => openAuthModal("login")}>
        Open sign in
      </button>
      <button type="button" onClick={() => openAuthModal("signup")}>
        Open create account
      </button>
      <output data-testid="open">{String(authModalOpen)}</output>
      <output data-testid="user">{user ? user.email : ""}</output>
      <AuthModal open={authModalOpen} onClose={closeAuthModal} defaultTab={authModalTab} />
    </>
  );
};

const renderModal = ({ withBar = false } = {}) =>
  render(
    <MemoryRouter initialEntries={["/wishlist"]}>
      <AuthProvider>
        <Host />
        {withBar && <InertBar />}
        <RouteChanger />
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>
  );

const open = (name = "Open sign in") => {
  const opener = screen.getByRole("button", { name });
  opener.focus();
  fireEvent.click(opener);
  return opener;
};

const openSignIn = async () => {
  const opener = open("Open sign in");
  const dialog = await screen.findByRole("dialog", { name: "Welcome back" });
  return { dialog, opener };
};

const openCreateAccount = async () => {
  const opener = open("Open create account");
  const dialog = await screen.findByRole("dialog", { name: "Create your account" });
  return { dialog, opener };
};

const fill = (scope, label, value) =>
  fireEvent.change(within(scope).getByLabelText(label), { target: { value } });

const submitButton = (scope, name) => within(scope).getByRole("button", { name });

// Everything a valid sign-up needs.
const fillSignUp = (dialog, overrides = {}) => {
  const values = {
    "First name": "Asha",
    "Last name": "Rao",
    "Email address": "asha@example.com",
    "Mobile number (optional)": "98765 43210",
    Password: "Abcdef1!",
    "Confirm password": "Abcdef1!",
    ...overrides,
  };
  Object.entries(values).forEach(([label, value]) => fill(dialog, label, value));
  fireEvent.click(within(dialog).getByRole("checkbox", { name: /I agree to the/ }));
};

const waitForClosed = (options) =>
  waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), options);

// The sign-in form is in place (the other panel has finished fading out).
const signInForm = (dialog) => within(dialog).findByRole("checkbox", { name: "Remember me" });

beforeEach(() => {
  apiService.auth.login.mockReset();
  apiService.auth.register.mockReset();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
  document.body.style.overflow = "";
});

// ── The dialog ───────────────────────────────────────────────────────────────

test("renders nothing while closed", () => {
  renderModal();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("opens as a modal dialog on <body>, named by its heading and described by its line", async () => {
  const { container } = renderModal();
  const { dialog } = await openSignIn();
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog).toHaveAccessibleDescription(
    "Sign in to track orders and save your wishlist across devices."
  );
  expect(within(dialog).getByRole("heading", { level: 2, name: "Welcome back" })).toBeInTheDocument();
  // Portalled: not inside the component tree's container.
  expect(within(container).queryByRole("dialog")).not.toBeInTheDocument();
  expect(dialog).toBeInTheDocument();
});

test("the logo is the 56px artwork, decorative inside the dialog", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  // Hidden from assistive technology here, so it has no computed name.
  const logo = within(dialog).getByRole("img", { hidden: true });
  expect(logo).toHaveAttribute("alt", "A & S Urbanseat");
  expect(logo).toHaveAttribute("height", "56");
  expect(logo).toHaveAttribute("aria-hidden", "true");
});

test("the disabled Google / Facebook buttons are gone", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  expect(within(dialog).queryByText(/google|facebook|soon|continue with/i)).not.toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("tab", { name: "Create account" }));
  await within(dialog).findByLabelText("First name");
  expect(within(dialog).queryByText(/google|facebook|soon|continue with/i)).not.toBeInTheDocument();
});

test("focus starts in the email field and the page is locked; Escape closes and focus returns", async () => {
  renderModal();
  const { dialog, opener } = await openSignIn();
  const email = within(dialog).getByLabelText("Email address");
  expect(email).toHaveFocus();
  expect(document.body.style.overflow).toBe("hidden");

  fireEvent.keyDown(email, { key: "Escape" });
  await waitForClosed();
  expect(opener).toHaveFocus();
  expect(document.body.style.overflow).toBe("");
});

test("opened on Create account, focus starts in First name", async () => {
  renderModal();
  const { dialog } = await openCreateAccount();
  expect(within(dialog).getByRole("tab", { name: "Create account" })).toHaveAttribute("aria-selected", "true");
  expect(within(dialog).getByLabelText("First name")).toHaveFocus();
});

test("Tab and Shift+Tab stay inside the dialog", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  const close = within(dialog).getByRole("button", { name: "Close" });
  const last = within(dialog).getByRole("button", { name: "Create an account" });

  last.focus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  expect(last).toHaveFocus();
});

test("the close button and the overlay close it", async () => {
  renderModal();
  let { dialog } = await openSignIn();
  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  await waitForClosed();

  ({ dialog } = await openSignIn());
  // The overlay is the dialog's previous sibling, hidden from assistive tech.
  // eslint-disable-next-line testing-library/no-node-access
  const overlay = dialog.previousElementSibling;
  expect(overlay).toHaveAttribute("aria-hidden", "true");
  fireEvent.click(overlay);
  await waitForClosed();
});

test("a route change underneath closes it", async () => {
  renderModal();
  await openSignIn();
  fireEvent.click(screen.getByRole("button", { name: "Change route" }));
  expect(screen.getByTestId("location")).toHaveTextContent("/about");
  await waitForClosed();
});

test("focus goes back to an opener that was inert while the page was locked", async () => {
  // jsdom does not implement inert; make focus() fail inside it, as browsers do.
  const realFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function focus(...args) {
    // eslint-disable-next-line testing-library/no-node-access
    if (this.closest("[inert]")) return undefined;
    return realFocus.apply(this, args);
  };
  try {
    renderModal({ withBar: true });
    const account = screen.getByRole("button", { name: "Account" });
    account.focus();
    fireEvent.click(account);
    const dialog = await screen.findByRole("dialog", { name: "Welcome back" });
    await waitFor(() => expect(screen.getByRole("navigation", { hidden: true })).toHaveAttribute("inert"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(account).toHaveFocus());
  } finally {
    HTMLElement.prototype.focus = realFocus;
  }
});

// ── Tabs ─────────────────────────────────────────────────────────────────────

test("two tabs in a tablist; the selected one controls the visible panel", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  const tablist = within(dialog).getByRole("tablist", { name: "Sign in or create an account" });
  const [signIn, create] = within(tablist).getAllByRole("tab");
  expect(signIn).toHaveAccessibleName("Sign in");
  expect(create).toHaveAccessibleName("Create account");
  expect(signIn).toHaveAttribute("aria-selected", "true");
  expect(signIn).toHaveAttribute("tabindex", "0");
  expect(create).toHaveAttribute("aria-selected", "false");
  expect(create).toHaveAttribute("tabindex", "-1");

  const panel = within(dialog).getByRole("tabpanel");
  expect(signIn).toHaveAttribute("aria-controls", panel.id);
  expect(panel).toHaveAccessibleName("Sign in");
});

test("arrow keys, Home and End move along the tabs and switch the form", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  const signIn = within(dialog).getByRole("tab", { name: "Sign in" });
  const create = within(dialog).getByRole("tab", { name: "Create account" });

  signIn.focus();
  fireEvent.keyDown(signIn, { key: "ArrowRight" });
  expect(create).toHaveFocus();
  expect(create).toHaveAttribute("aria-selected", "true");
  expect(await within(dialog).findByLabelText("First name")).toBeInTheDocument();
  expect(within(dialog).getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
  expect(within(dialog).getByRole("tabpanel")).toHaveAccessibleName("Create account");
  expect(create).toHaveAttribute("aria-controls", within(dialog).getByRole("tabpanel").id);
  expect(signIn).toHaveAttribute("tabindex", "-1");

  fireEvent.keyDown(create, { key: "ArrowRight" }); // wraps
  expect(signIn).toHaveFocus();
  expect(signIn).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(signIn, { key: "End" });
  expect(create).toHaveFocus();
  fireEvent.keyDown(create, { key: "Home" });
  expect(signIn).toHaveFocus();
  fireEvent.keyDown(signIn, { key: "ArrowLeft" }); // wraps
  expect(create).toHaveFocus();
  expect(create).toHaveAttribute("aria-selected", "true");
});

test("the links under each form switch tabs and take focus to the other form's first field", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  fireEvent.click(within(dialog).getByRole("button", { name: "Create an account" }));
  const firstName = await within(dialog).findByLabelText("First name");
  await waitFor(() => expect(firstName).toHaveFocus());

  fireEvent.click(within(dialog).getByRole("button", { name: "Sign in" }));
  await signInForm(dialog);
  const email = within(dialog).getByLabelText("Email address");
  await waitFor(() => expect(email).toHaveFocus());
  expect(within(dialog).getByRole("tab", { name: "Sign in" })).toHaveAttribute("aria-selected", "true");
});

test("switching tabs clears the messages", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  fireEvent.click(submitButton(dialog, "Sign in"));
  expect(within(dialog).getByLabelText("Email address")).toHaveAccessibleDescription("Enter your email address");
  fireEvent.click(within(dialog).getByRole("tab", { name: "Create account" }));
  await within(dialog).findByLabelText("First name");
  fireEvent.click(within(dialog).getByRole("tab", { name: "Sign in" }));
  await signInForm(dialog);
  const email = within(dialog).getByLabelText("Email address");
  expect(email).not.toHaveAttribute("aria-invalid");
  expect(email).not.toHaveAccessibleDescription();
});

test("it opens on the tab asked for, every time", async () => {
  renderModal();
  let { dialog } = await openCreateAccount();
  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  await waitForClosed();

  ({ dialog } = await openSignIn());
  expect(within(dialog).getByRole("tab", { name: "Sign in" })).toHaveAttribute("aria-selected", "true");

  // Switched inside the dialog, then reopened with the same request: the
  // request wins (the old dialog kept the tab it was left on).
  fireEvent.click(within(dialog).getByRole("tab", { name: "Create account" }));
  await within(dialog).findByLabelText("First name");
  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  await waitForClosed();
  ({ dialog } = await openSignIn());
  expect(within(dialog).getByLabelText("Email address")).toHaveFocus();
});

test("a new defaultTab while open switches the form (tab sync)", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  fireEvent.click(screen.getByRole("button", { name: "Open create account", hidden: true }));
  expect(within(dialog).getByRole("tab", { name: "Create account" })).toHaveAttribute("aria-selected", "true");
  expect(await within(dialog).findByLabelText("First name")).toBeInTheDocument();
});

// ── Sign in ──────────────────────────────────────────────────────────────────

test("fields carry their labels, autocomplete and inputmode", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  const email = within(dialog).getByLabelText("Email address");
  expect(email).toHaveAttribute("type", "email");
  expect(email).toHaveAttribute("autocomplete", "email");
  expect(email).toHaveAttribute("inputmode", "email");
  expect(email).toBeRequired();
  const password = within(dialog).getByLabelText("Password");
  expect(password).toHaveAttribute("type", "password");
  expect(password).toHaveAttribute("autocomplete", "current-password");
  expect(within(dialog).getByRole("checkbox", { name: "Remember me" })).not.toBeChecked();

  fireEvent.click(within(dialog).getByRole("tab", { name: "Create account" }));
  await within(dialog).findByLabelText("First name");
  const expectations = [
    ["First name", { autocomplete: "given-name", type: "text" }],
    ["Last name", { autocomplete: "family-name", type: "text" }],
    ["Email address", { autocomplete: "email", type: "email", inputmode: "email" }],
    ["Mobile number (optional)", { autocomplete: "tel-national", type: "tel", inputmode: "tel" }],
    ["Password", { autocomplete: "new-password", type: "password" }],
    ["Confirm password", { autocomplete: "new-password", type: "password" }],
  ];
  expectations.forEach(([label, attributes]) => {
    const field = within(dialog).getByLabelText(label);
    Object.entries(attributes).forEach(([name, value]) => expect(field).toHaveAttribute(name, value));
  });
  expect(within(dialog).getByLabelText("Mobile number (optional)")).not.toBeRequired();
  expect(within(dialog).getByLabelText("Mobile number (optional)")).toHaveAccessibleDescription(
    "10 digits, without +91 or 0."
  );
});

test("an empty sign-in shows the messages under the fields, marks them and focuses the first", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  fireEvent.click(submitButton(dialog, "Sign in"));
  const email = within(dialog).getByLabelText("Email address");
  const password = within(dialog).getByLabelText("Password");
  expect(email).toHaveAttribute("aria-invalid", "true");
  expect(email).toHaveAccessibleDescription("Enter your email address");
  expect(password).toHaveAttribute("aria-invalid", "true");
  expect(password).toHaveAccessibleDescription("Enter your password");
  await waitFor(() => expect(email).toHaveFocus());
  expect(apiService.auth.login).not.toHaveBeenCalled();
});

test("a malformed email gets its message; typing clears it", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  fill(dialog, "Email address", "user@example");
  fill(dialog, "Password", "password123");
  fireEvent.click(submitButton(dialog, "Sign in"));
  const email = within(dialog).getByLabelText("Email address");
  expect(email).toHaveAccessibleDescription("Enter a valid email address");
  fill(dialog, "Email address", "user@example.com");
  expect(email).not.toHaveAttribute("aria-invalid");
  expect(email).not.toHaveAccessibleDescription();
  expect(
    within(dialog).queryByText("Enter a valid email address", { selector: ".sf-field__error" })
  ).not.toBeInTheDocument();
});

test("when the field to fix already has focus, the message is announced instead (and clears later)", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  const email = within(dialog).getByLabelText("Email address");
  expect(email).toHaveFocus();
  fill(dialog, "Email address", "nope");
  const said = (text) => within(dialog).getAllByRole("status").some((s) => s.textContent === text);
  jest.useFakeTimers();
  fireEvent.submit(email.form);
  expect(said("Enter a valid email address")).toBe(true);
  expect(email).toHaveFocus();
  act(() => jest.advanceTimersByTime(5000));
  expect(said("Enter a valid email address")).toBe(false);
});

test("signing in calls login({ email, password, remember }); the dialog says so and closes 1.5s later", async () => {
  apiService.auth.login.mockResolvedValue(USER);
  renderModal();
  const { dialog, opener } = await openSignIn();
  fill(dialog, "Email address", "user@example.com");
  fill(dialog, "Password", "password123");

  jest.useFakeTimers();
  // The request settles inside act() while the clock is the test's.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => {
    fireEvent.click(submitButton(dialog, "Sign in"));
  });
  expect(apiService.auth.login).toHaveBeenCalledWith({
    email: "user@example.com",
    password: "password123",
    remember: false,
  });
  const status = within(dialog)
    .getAllByRole("status")
    .find((s) => s.textContent.includes("Welcome back. Signing you in…"));
  expect(status).toBeTruthy();
  expect(screen.getByTestId("user")).toHaveTextContent("user@example.com");
  // Waiting to close: the button is busy, not clickable again.
  expect(submitButton(dialog, "Sign in")).toHaveAttribute("aria-disabled", "true");

  act(() => jest.advanceTimersByTime(1499));
  expect(screen.getByTestId("open")).toHaveTextContent("true");
  act(() => jest.advanceTimersByTime(1));
  expect(screen.getByTestId("open")).toHaveTextContent("false");
  expect(opener).toHaveFocus();
});

test("without Remember me the session is per tab; with it, it persists (authStorage)", async () => {
  apiService.auth.login.mockResolvedValue(USER);
  renderModal();
  let { dialog } = await openSignIn();
  fill(dialog, "Email address", "user@example.com");
  fill(dialog, "Password", "password123");
  fireEvent.click(submitButton(dialog, "Sign in"));
  await within(dialog).findByText("Welcome back. Signing you in…");
  expect(sessionStorage.getItem("user")).toContain("user@example.com");
  expect(localStorage.getItem("user")).toBeNull();
  await waitForClosed({ timeout: 4000 });

  ({ dialog } = await openSignIn());
  fill(dialog, "Email address", "user@example.com");
  fill(dialog, "Password", "password123");
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "Remember me" }));
  fireEvent.click(submitButton(dialog, "Sign in"));
  await within(dialog).findByText("Welcome back. Signing you in…");
  expect(apiService.auth.login).toHaveBeenLastCalledWith({
    email: "user@example.com",
    password: "password123",
    remember: true,
  });
  expect(localStorage.getItem("user")).toContain("user@example.com");
  expect(sessionStorage.getItem("user")).toBeNull();
});

test("a failed sign-in shows the request's message as an alert and keeps what was typed", async () => {
  apiService.auth.login.mockResolvedValue(null);
  renderModal();
  const { dialog } = await openSignIn();
  fill(dialog, "Email address", "user@example.com");
  fill(dialog, "Password", "wrong-password");
  fireEvent.click(submitButton(dialog, "Sign in"));
  await within(dialog).findByText("Invalid email or password");
  const alert = within(dialog).getAllByRole("alert").find((a) => a.textContent);
  expect(alert).toHaveTextContent("Invalid email or password");
  expect(within(dialog).getByLabelText("Email address")).toHaveValue("user@example.com");
  expect(within(dialog).getByLabelText("Password")).toHaveValue("wrong-password");
  expect(screen.getByTestId("open")).toHaveTextContent("true");
  expect(submitButton(dialog, "Sign in")).not.toHaveAttribute("aria-disabled");
});

test("a request error from the API reaches the alert", async () => {
  apiService.auth.login.mockRejectedValue(new Error("Network Error"));
  jest.spyOn(console, "error").mockImplementation(() => {});
  renderModal();
  const { dialog } = await openSignIn();
  fill(dialog, "Email address", "user@example.com");
  fill(dialog, "Password", "password123");
  fireEvent.click(submitButton(dialog, "Sign in"));
  expect(await within(dialog).findByText("Network Error")).toBeInTheDocument();
  expect(within(dialog).getAllByRole("alert").find((a) => a.textContent)).toHaveTextContent("Network Error");
  console.error.mockRestore();
});

test("one request at a time: the button is busy and says so while signing in", async () => {
  let resolve;
  apiService.auth.login.mockImplementation(() => new Promise((r) => (resolve = r)));
  renderModal();
  const { dialog } = await openSignIn();
  fill(dialog, "Email address", "user@example.com");
  fill(dialog, "Password", "password123");
  fireEvent.click(submitButton(dialog, "Sign in"));
  const busy = submitButton(dialog, "Signing in…");
  expect(busy).toHaveAttribute("aria-disabled", "true");
  expect(busy).not.toBeDisabled(); // keeps keyboard focus
  fireEvent.click(busy);
  fireEvent.submit(busy.form);
  expect(apiService.auth.login).toHaveBeenCalledTimes(1);
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => resolve(null));
  expect(submitButton(dialog, "Sign in")).not.toHaveAttribute("aria-disabled");
});

test("Forgot password? says reset isn't available yet and links to support", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  fireEvent.click(within(dialog).getByRole("button", { name: "Forgot password?" }));
  const status = within(dialog)
    .getAllByRole("status")
    .find((s) => s.textContent.includes("Password reset isn’t available online yet."));
  expect(status).toHaveTextContent(
    "Password reset isn’t available online yet. Our support team can help you sign in again. Contact support"
  );
  const link = within(status).getByRole("link", { name: "Contact support" });
  expect(link).toHaveAttribute("href", "/support");
  fireEvent.click(link);
  expect(screen.getByTestId("location")).toHaveTextContent("/support");
  await waitForClosed();
});

test("Show / Hide is a focusable text button that reveals the password and says so", async () => {
  renderModal();
  const { dialog } = await openSignIn();
  const password = within(dialog).getByLabelText("Password");
  const toggle = within(dialog).getByRole("button", { name: "Show password" });
  expect(toggle).toHaveTextContent("Show");
  expect(toggle).not.toHaveAttribute("tabindex");
  expect(toggle).toHaveAttribute("aria-controls", password.id);

  fireEvent.click(toggle);
  expect(password).toHaveAttribute("type", "text");
  expect(toggle).toHaveAccessibleName("Hide password");
  expect(toggle).toHaveTextContent("Hide");
  expect(within(dialog).getAllByRole("status").some((s) => s.textContent === "Password shown.")).toBe(true);

  fireEvent.click(toggle);
  expect(password).toHaveAttribute("type", "password");
  expect(within(dialog).getAllByRole("status").some((s) => s.textContent === "Password hidden.")).toBe(true);
});

test("passwords are hidden again when the dialog reopens", async () => {
  renderModal();
  let { dialog } = await openSignIn();
  fireEvent.click(within(dialog).getByRole("button", { name: "Show password" }));
  const toggle = within(dialog).getByRole("button", { name: "Hide password" });
  expect(within(dialog).getByLabelText("Password")).toHaveAttribute("type", "text");
  fireEvent.keyDown(toggle, { key: "Escape" });
  await waitForClosed();
  ({ dialog } = await openSignIn());
  expect(within(dialog).getByLabelText("Password")).toHaveAttribute("type", "password");
});

// ── Create account ───────────────────────────────────────────────────────────

test("an empty sign-up gives every message, verbatim, and focuses First name", async () => {
  renderModal();
  const { dialog } = await openCreateAccount();
  fireEvent.click(submitButton(dialog, "Create account"));
  [
    ["First name", "Enter your first name"],
    ["Last name", "Enter your last name"],
    ["Email address", "Enter your email address"],
    ["Password", "Create a password"],
    ["Confirm password", "Enter your password again"],
  ].forEach(([label, message]) => {
    const field = within(dialog).getByLabelText(label);
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(expect.stringContaining(message));
  });
  const terms = within(dialog).getByRole("checkbox", { name: /I agree to the/ });
  expect(terms).toHaveAttribute("aria-invalid", "true");
  expect(terms).toHaveAccessibleDescription("Agree to the terms of service and privacy policy to continue");
  // The phone is optional: no message when empty.
  expect(within(dialog).getByLabelText("Mobile number (optional)")).not.toHaveAttribute("aria-invalid");
  await waitFor(() => expect(within(dialog).getByLabelText("First name")).toHaveFocus());
  expect(apiService.auth.register).not.toHaveBeenCalled();
});

test("the sign-up rules: phone, password length and the confirmation", async () => {
  renderModal();
  const { dialog } = await openCreateAccount();
  fillSignUp(dialog, { "Mobile number (optional)": "98765", Password: "abc12", "Confirm password": "abc13" });
  fireEvent.click(submitButton(dialog, "Create account"));
  expect(within(dialog).getByLabelText("Mobile number (optional)")).toHaveAccessibleDescription(
    "10 digits, without +91 or 0. Enter a 10-digit mobile number"
  );
  expect(within(dialog).getByLabelText("Password")).toHaveAccessibleDescription(
    expect.stringContaining("Use at least 6 characters")
  );
  expect(within(dialog).getByLabelText("Confirm password")).toHaveAccessibleDescription("Passwords don’t match");
  await waitFor(() => expect(within(dialog).getByLabelText("Mobile number (optional)")).toHaveFocus());
  expect(apiService.auth.register).not.toHaveBeenCalled();
});

test("the terms links open in a new tab and say so", async () => {
  renderModal();
  const { dialog } = await openCreateAccount();
  const terms = within(dialog).getByRole("link", { name: "terms of service" });
  const privacy = within(dialog).getByRole("link", { name: "privacy policy" });
  expect(terms).toHaveAttribute("href", "/terms");
  expect(privacy).toHaveAttribute("href", "/privacy");
  [terms, privacy].forEach((link) => {
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAccessibleDescription("Opens in a new tab");
  });
  // The checkbox's name stays the sentence.
  expect(within(dialog).getByRole("checkbox", { name: "I agree to the terms of service and privacy policy" })).toBeInTheDocument();
});

test("the strength meter keeps the old thresholds", async () => {
  renderModal();
  const { dialog } = await openCreateAccount();
  const password = within(dialog).getByLabelText("Password");
  const strength = () => {
    // eslint-disable-next-line testing-library/no-node-access
    const meter = dialog.querySelector("[data-score]");
    return [meter && meter.getAttribute("data-score"), password.getAttribute("aria-describedby")];
  };
  expect(strength()[0]).toBeNull();
  expect(password).toHaveAccessibleDescription("At least 6 characters.");

  const cases = [
    ["abc", "1", "Weak"],
    ["abcdef", "1", "Weak"],
    ["abcdefgh", "1", "Weak"],
    ["abcdefghi", "1", "Weak"],
    ["abcdef1", "2", "Fair"],
    ["abcdefghij", "2", "Fair"],
    ["Abcdef1", "3", "Good"],
    ["abcdefghij1", "3", "Good"],
    ["Abcdef1!", "4", "Strong"],
    ["Abcdefghij1!", "4", "Strong"],
  ];
  cases.forEach(([value, score, label]) => {
    fill(dialog, "Password", value);
    expect(strength()[0]).toBe(score);
    expect(password).toHaveAccessibleDescription(`At least 6 characters. Password strength: ${label}`);
  });
});

test("creating an account: the payload (phone with +91), then Sign in with the email filled in 1.8s later", async () => {
  apiService.auth.register.mockResolvedValue({ id: 9, email: "asha@example.com" });
  renderModal();
  const { dialog } = await openCreateAccount();
  fillSignUp(dialog);

  jest.useFakeTimers();
  // The request settles inside act() while the clock is the test's.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => {
    fireEvent.click(submitButton(dialog, "Create account"));
  });
  expect(apiService.auth.register).toHaveBeenCalledWith({
    firstName: "Asha",
    lastName: "Rao",
    email: "asha@example.com",
    phone: "+919876543210",
    password: "Abcdef1!",
    confirmPassword: "Abcdef1!",
  });
  expect(
    within(dialog).getAllByRole("status").some((s) => s.textContent.includes("Account created. Taking you to sign in…"))
  ).toBe(true);
  // Not signed in: register() only creates the account.
  expect(screen.getByTestId("user")).toHaveTextContent("");

  act(() => jest.advanceTimersByTime(1799));
  expect(within(dialog).getByRole("tab", { name: "Create account" })).toHaveAttribute("aria-selected", "true");
  act(() => jest.advanceTimersByTime(1));
  expect(within(dialog).getByRole("tab", { name: "Sign in" })).toHaveAttribute("aria-selected", "true");
  // framer-motion's frame clock is not Jest's: the cross-fade runs on real time.
  jest.useRealTimers();
  await signInForm(dialog);
  expect(within(dialog).getByLabelText("Email address")).toHaveValue("asha@example.com");
  expect(within(dialog).getByLabelText("Password")).toHaveValue("");
  await waitFor(() => expect(within(dialog).getByLabelText("Password")).toHaveFocus());

  // The sign-up form starts empty again.
  fireEvent.click(within(dialog).getByRole("tab", { name: "Create account" }));
  expect(await within(dialog).findByLabelText("First name")).toHaveValue("");
  expect(within(dialog).getByRole("checkbox", { name: /I agree to the/ })).not.toBeChecked();
});

test("an empty phone is sent as an empty string", async () => {
  apiService.auth.register.mockResolvedValue({ id: 9 });
  renderModal();
  const { dialog } = await openCreateAccount();
  fillSignUp(dialog, { "Mobile number (optional)": "" });
  fireEvent.click(submitButton(dialog, "Create account"));
  await within(dialog).findByText("Account created. Taking you to sign in…");
  expect(apiService.auth.register).toHaveBeenCalledWith(expect.objectContaining({ phone: "" }));
});

test("an email already in use shows the API's message and keeps the form", async () => {
  const taken = new Error("An account with this email already exists. Please log in instead.");
  taken.code = "EMAIL_TAKEN";
  apiService.auth.register.mockRejectedValue(taken);
  renderModal();
  const { dialog } = await openCreateAccount();
  fillSignUp(dialog, { "Email address": "user@example.com" });
  fireEvent.click(submitButton(dialog, "Create account"));
  expect(
    await within(dialog).findByText("An account with this email already exists. Please log in instead.")
  ).toBeInTheDocument();
  expect(within(dialog).getAllByRole("alert").find((a) => a.textContent)).toHaveTextContent(
    "An account with this email already exists. Please log in instead."
  );
  expect(within(dialog).getByLabelText("Email address")).toHaveValue("user@example.com");
  expect(within(dialog).getByLabelText("First name")).toHaveValue("Asha");
  expect(within(dialog).getByRole("tab", { name: "Create account" })).toHaveAttribute("aria-selected", "true");
});
