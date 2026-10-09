import React from "react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Swal from "sweetalert2";
import apiService from "../../services/api";
import { AuthProvider } from "../../context/AuthContext";
import { useAuth } from "../../hooks/useAuth";
import AccountNav, { ACCOUNT_NAV_ITEMS } from "./AccountNav";

// The nav runs against the real AuthProvider (the session restored from
// storage, logout() its own); only the network and SweetAlert are stubbed.
// useAuth is wrapped so one test can stand in a logout that fails.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: { auth: { logout: jest.fn(() => Promise.resolve()) } },
  getErrorMessage: (error) => error?.message,
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn() } }));
jest.mock("../../hooks/useAuth", () => {
  const actual = jest.requireActual("../../hooks/useAuth");
  return { __esModule: true, ...actual, useAuth: jest.fn(actual.useAuth) };
});

const { useAuth: realUseAuth } = jest.requireActual("../../hooks/useAuth");

const USER = { id: 1, email: "user@example.com", firstName: "John", lastName: "Doe" };

const signIn = (user = USER) => {
  sessionStorage.setItem("user", JSON.stringify(user));
  sessionStorage.setItem("token", "mock-token-1");
};

const Probe = () => {
  const location = useLocation();
  const type = useNavigationType();
  return (
    <>
      <output data-testid="location">{location.pathname + location.search}</output>
      <output data-testid="navigation">{type}</output>
    </>
  );
};

const renderNav = ({ active = "profile", at = "/profile", ...props } = {}) =>
  render(
    <MemoryRouter initialEntries={[at]}>
      <AuthProvider>
        <AccountNav active={active} {...props} />
        <Probe />
      </AuthProvider>
    </MemoryRouter>
  );

const nav = () => screen.getByRole("navigation", { name: "Account" });
const link = (name) => within(nav()).getByRole("link", { name });
const location = () => screen.getByTestId("location").textContent;
const navigationType = () => screen.getByTestId("navigation").textContent;

// CRA resets every mock before each test (resetMocks), so implementations are
// set here rather than in the factories.
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  apiService.auth.logout.mockImplementation(() => Promise.resolve());
  useAuth.mockImplementation(realUseAuth);
});

// ── What it shows ────────────────────────────────────────────────────────────

test("is a navigation landmark named Account: six links to their pages, then Sign out", () => {
  signIn();
  renderNav();
  const links = within(nav()).getAllByRole("link");
  expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
    ["Profile", "/profile"],
    ["Addresses", "/profile?tab=addresses"],
    ["Orders", "/orders"],
    ["Store credit", "/profile?tab=wallet"],
    ["Wishlist", "/wishlist"],
    ["Change password", "/profile?tab=password"],
  ]);
  const items = within(nav()).getAllByRole("listitem");
  expect(items).toHaveLength(7);
  expect(within(items[6]).getByRole("button", { name: "Sign out" })).toHaveAttribute("aria-haspopup", "dialog");
  // Chips up to 900px (the primitive), rail rows from 901px (the module).
  links.forEach((a) => expect(a).toHaveClass("sf-chip"));
  // It reads the session and fetches nothing.
  expect(apiService.auth.logout).not.toHaveBeenCalled();
  expect(Swal.fire).not.toHaveBeenCalled();
});

test.each(ACCOUNT_NAV_ITEMS.map((item) => [item.key, item.label]))(
  "active=%s marks %s as the current page, and nothing else",
  (key, label) => {
    signIn();
    renderNav({ active: key });
    const marked = within(nav())
      .getAllByRole("link")
      .filter((a) => a.hasAttribute("aria-current"))
      .map((a) => [a.textContent, a.getAttribute("aria-current")]);
    expect(marked).toEqual([[label, "page"]]);
    expect(within(nav()).getByRole("button", { name: "Sign out" })).not.toHaveAttribute("aria-current");
  }
);

test("an unknown active key marks nothing", () => {
  signIn();
  renderNav({ active: "logout" });
  within(nav())
    .getAllByRole("link")
    .forEach((a) => expect(a).not.toHaveAttribute("aria-current"));
});

test("shows who is signed in: the initials (decorative), the name and the email", () => {
  signIn();
  renderNav();
  const initials = within(nav()).getByText("JD");
  expect(initials).toHaveAttribute("aria-hidden", "true");
  expect(within(nav()).getByText("John Doe")).toBeInTheDocument();
  expect(within(nav()).getByText("user@example.com")).toBeInTheDocument();
});

test("an account without a name shows its email once, and its first letter as the initial", () => {
  signIn({ id: 7, email: "asha@example.com", firstName: "  ", lastName: "" });
  renderNav();
  expect(within(nav()).getByText("A")).toHaveAttribute("aria-hidden", "true");
  expect(within(nav()).getAllByText("asha@example.com")).toHaveLength(1);
});

test("renders nothing while no one is signed in", () => {
  renderNav();
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});

// ── Links and history ────────────────────────────────────────────────────────

test("a tab of the page on screen replaces the history entry", () => {
  signIn();
  renderNav({ at: "/profile" });
  fireEvent.click(link("Addresses"));
  expect(location()).toBe("/profile?tab=addresses");
  expect(navigationType()).toBe("REPLACE");
  fireEvent.click(link("Profile"));
  expect(location()).toBe("/profile");
  expect(navigationType()).toBe("REPLACE");
});

test("a link to another page adds a history entry", () => {
  signIn();
  renderNav({ at: "/profile" });
  fireEvent.click(link("Orders"));
  expect(location()).toBe("/orders");
  expect(navigationType()).toBe("PUSH");
});

test("from another account page, a Profile tab is a normal navigation", () => {
  signIn();
  renderNav({ active: "orders", at: "/orders" });
  fireEvent.click(link("Store credit"));
  expect(location()).toBe("/profile?tab=wallet");
  expect(navigationType()).toBe("PUSH");
});

// ── Sign out ─────────────────────────────────────────────────────────────────

test("Sign out asks first, with its confirm in the error token (no hex colour)", async () => {
  signIn();
  Swal.fire.mockResolvedValue({ isConfirmed: false });
  renderNav();
  fireEvent.click(within(nav()).getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
  const options = Swal.fire.mock.calls[0][0];
  expect(options).toEqual({
    title: "Sign out?",
    text: "You'll need to sign in again to access your account.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sign out",
    cancelButtonText: "Stay signed in",
    customClass: { confirmButton: "sf-btn sf-btn--danger" },
  });
  expect(options.confirmButtonColor).toBeUndefined();
});

test("confirming signs out and goes home", async () => {
  signIn();
  Swal.fire.mockResolvedValue({ isConfirmed: true });
  renderNav({ at: "/profile?tab=wallet", active: "wallet" });
  fireEvent.click(within(nav()).getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(location()).toBe("/"));
  // AuthContext's logout(): the API call (which clears the stored session)
  // and the user gone from the context, so the nav has no one to show.
  expect(apiService.auth.logout).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});

test("staying signed in changes nothing", async () => {
  signIn();
  Swal.fire.mockResolvedValue({ isConfirmed: false });
  renderNav();
  fireEvent.click(within(nav()).getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
  await Promise.resolve();
  expect(location()).toBe("/profile");
  expect(apiService.auth.logout).not.toHaveBeenCalled();
  expect(sessionStorage.getItem("user")).not.toBeNull();
  expect(nav()).toBeInTheDocument();
});

describe("a sign-out that fails", () => {
  const failingAuth = () => ({ user: USER, logout: () => Promise.reject(new Error("offline")) });

  test("is reported through onSignOutError, and the page stays", async () => {
    useAuth.mockImplementation(failingAuth);
    Swal.fire.mockResolvedValue({ isConfirmed: true });
    const onSignOutError = jest.fn();
    renderNav({ onSignOutError });
    fireEvent.click(within(nav()).getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(onSignOutError).toHaveBeenCalledWith("Sign out failed. Please try again."));
    expect(location()).toBe("/profile");
    expect(Swal.fire).toHaveBeenCalledTimes(1);
  });

  test("falls back to a toast without onSignOutError", async () => {
    useAuth.mockImplementation(failingAuth);
    Swal.fire.mockResolvedValue({ isConfirmed: true });
    renderNav();
    fireEvent.click(within(nav()).getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(2));
    expect(Swal.fire.mock.calls[1][0]).toMatchObject({
      icon: "error",
      title: "Sign out failed. Please try again.",
      toast: true,
    });
    expect(location()).toBe("/profile");
  });
});

// ── The chip row (up to 900px) ───────────────────────────────────────────────

test("brings the current chip into view by scrolling the row, never the window", () => {
  signIn();
  const scrollTo = jest.spyOn(window, "scrollTo").mockImplementation(() => {});
  const { rerender } = renderNav({ active: "profile" });
  const list = within(nav()).getAllByRole("list")[0];
  // A 360px row showing the first chips; "Change password" starts at 520px.
  Object.defineProperty(list, "scrollWidth", { configurable: true, value: 860 });
  Object.defineProperty(list, "clientWidth", { configurable: true, value: 360 });
  list.getBoundingClientRect = () => ({ left: 0, right: 360, width: 360 });
  link("Change password").getBoundingClientRect = () => ({ left: 520, right: 660, width: 140 });
  rerender(
    <MemoryRouter initialEntries={["/profile"]}>
      <AuthProvider>
        <AccountNav active="password" />
        <Probe />
      </AuthProvider>
    </MemoryRouter>
  );
  // Centred: 520 + 70 - 180 = 410.
  expect(list.scrollLeft).toBe(410);
  expect(scrollTo).not.toHaveBeenCalled();
  scrollTo.mockRestore();
});

test("leaves the row alone when the current chip is already in view", () => {
  signIn();
  const { rerender } = renderNav({ active: "profile" });
  const list = within(nav()).getAllByRole("list")[0];
  Object.defineProperty(list, "scrollWidth", { configurable: true, value: 860 });
  Object.defineProperty(list, "clientWidth", { configurable: true, value: 360 });
  list.getBoundingClientRect = () => ({ left: 0, right: 360, width: 360 });
  link("Addresses").getBoundingClientRect = () => ({ left: 100, right: 210, width: 110 });
  rerender(
    <MemoryRouter initialEntries={["/profile"]}>
      <AuthProvider>
        <AccountNav active="addresses" />
        <Probe />
      </AuthProvider>
    </MemoryRouter>
  );
  expect(list.scrollLeft).toBe(0);
});
