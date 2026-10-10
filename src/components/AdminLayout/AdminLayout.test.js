import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Swal from "sweetalert2";
import apiService from "../../services/api";
import { ThemeContextProvider } from "../../context/ThemeContext";
import { AdminProvider } from "../../context/AdminContext";
import AdminLayout from "./AdminLayout";

// The logout confirm runs against the real MUI menu and the real SweetAlert:
// the menu hides the rest of the page from screen readers while it is open
// (aria-hidden on its siblings), and SweetAlert saves the aria-hidden it finds
// when it opens and puts it back when it closes. SweetAlert comes from its
// build without the injected stylesheet (the same script; jsdom cannot parse
// the CSS). Only the network is stubbed.
jest.mock("sweetalert2", () => jest.requireActual("sweetalert2/dist/sweetalert2.js"));
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: { admin: { getOrders: jest.fn(), getLeads: jest.fn(), logout: jest.fn() } },
}));

const ADMIN = { id: 1, email: "admin@store.com", firstName: "Admin", lastName: "User" };

// jsdom has no matchMedia (SweetAlert's icon listens for a colour-scheme
// change; MUI asks for the drawer's breakpoint): nothing matches, so a
// desktop viewport.
beforeAll(() => {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
});

beforeEach(() => {
  // The notifications poll: nothing new.
  apiService.admin.getOrders.mockResolvedValue([]);
  apiService.admin.getLeads.mockResolvedValue([]);
  // SweetAlert restores the scroll position when it closes; jsdom cannot.
  window.scrollTo = jest.fn();
  // A saved theme keeps ThemeContextProvider away from window.matchMedia.
  localStorage.setItem("theme", "light");
  sessionStorage.setItem("admin", JSON.stringify(ADMIN));
  sessionStorage.setItem("adminToken", "mock-admin-token");
});

afterEach(() => {
  Swal.close();
  localStorage.clear();
  sessionStorage.clear();
});

const renderAdmin = async () => {
  const view = render(
    <ThemeContextProvider>
      <AdminProvider>
        <MemoryRouter initialEntries={["/admin/dashboard"]}>
          <Routes>
            <Route path="/admin">
              <Route index element={<button type="button">Sign In</button>} />
              <Route element={<AdminLayout />}>
                <Route path="dashboard" element={<p>Store overview</p>} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </AdminProvider>
    </ThemeContextProvider>
  );
  // Let the notification reads settle inside act.
  await act(() => Promise.resolve());
  return view;
};

const openLogoutConfirm = async () => {
  const accountButton = await screen.findByRole("button", { name: "Account menu" });
  // As after Tab (or a click, in most browsers): the button has focus when
  // the menu opens, so the menu gives focus back to it when it closes.
  act(() => accountButton.focus());
  fireEvent.click(accountButton);
  fireEvent.click(await screen.findByRole("menuitem", { name: "Logout" }));
  return accountButton;
};

const confirmClosed = () =>
  waitFor(() => expect(screen.queryByRole("dialog", { name: "Log out?" })).not.toBeInTheDocument());

test("Stay Signed In: the dashboard stays readable by screen readers, focus back on the account button", async () => {
  const { container } = await renderAdmin();
  const accountButton = await openLogoutConfirm();
  fireEvent.click(await screen.findByRole("button", { name: "Stay Signed In" }));
  await confirmClosed();

  expect(container).not.toHaveAttribute("aria-hidden");
  // Queries by role skip anything under aria-hidden="true".
  expect(screen.getByRole("button", { name: "Account menu" })).toBe(accountButton);
  await waitFor(() => expect(accountButton).toHaveFocus());
  expect(apiService.admin.logout).not.toHaveBeenCalled();
});

test("Log Out: the sign-in page is readable by screen readers", async () => {
  const { container } = await renderAdmin();
  await openLogoutConfirm();
  fireEvent.click(await screen.findByRole("button", { name: "Log Out" }));

  expect(await screen.findByRole("button", { name: "Sign In" })).toBeInTheDocument();
  expect(container).not.toHaveAttribute("aria-hidden");
  expect(apiService.admin.logout).toHaveBeenCalledTimes(1);
});
