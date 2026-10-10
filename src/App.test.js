import React from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

// The storefront's routing (App.js): an unknown URL renders the 404 page inside
// the storefront shell and stays on its URL (until Prompt 28 it redirected to
// "/"). The shell's heavy parts are stood in for, and the one read a guest
// triggers on mount (the deals config) answers with nothing.
jest.mock("./services/api", () => ({
  __esModule: true,
  default: { deals: { getConfig: jest.fn(() => Promise.resolve(null)) } },
  getErrorMessage: (error) => error?.message,
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn(() => Promise.resolve({})) } }));
jest.mock("./components/Header/Header", () => ({ __esModule: true, default: () => mockShell("header") }));
jest.mock("./components/Footer/Footer", () => ({ __esModule: true, default: () => mockShell("footer") }));
jest.mock("./components/BottomNav/BottomNav", () => ({ __esModule: true, default: () => mockShell("bottom-nav") }));
jest.mock("./pages/Home/Home", () => ({ __esModule: true, default: () => mockShell("home") }));

function mockShell(name) {
  return <div data-testid={`shell-${name}`} />;
}

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

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver;
});

beforeEach(() => {
  // A saved theme keeps ThemeContextProvider away from window.matchMedia.
  localStorage.setItem("theme", "light");
  window.scrollTo = jest.fn();
});

afterEach(() => {
  localStorage.clear();
});

const renderAt = async (path) => {
  window.history.pushState({}, "", path);
  render(<App />);
  // Let the deals-config read settle inside act.
  await act(() => Promise.resolve());
};

test.each(["/nonsense", "/order-confirmation", "/products/bed/extra", "/admin/unknown-page"])(
  "%s: the 404 page inside the storefront shell, on its own URL",
  async (path) => {
    await renderAt(path);
    expect(
      screen.getByRole("heading", { level: 1, name: "This page has moved or never existed." })
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { level: 1 }));
    expect(screen.getByTestId("shell-header")).toBeInTheDocument();
    expect(screen.getByTestId("shell-footer")).toBeInTheDocument();
    expect(screen.getByTestId("shell-bottom-nav")).toBeInTheDocument();
    expect(window.location.pathname).toBe(path);
    expect(screen.queryByTestId("shell-home")).not.toBeInTheDocument();
  }
);

test("known routes are unchanged: / and /about", async () => {
  await renderAt("/");
  expect(screen.getByTestId("shell-home")).toBeInTheDocument();
  expect(screen.queryByText("This page has moved or never existed.")).not.toBeInTheDocument();
});

test("/about renders Our story", async () => {
  await renderAt("/about");
  expect(screen.getByRole("heading", { level: 1, name: /^Furniture made to be lived with ?\.$/ })).toBeInTheDocument();
});

// ── Prompt 32: pages fetched on their first visit, and each page's title ────

test("a page loaded on demand waits as a busy skeleton inside <main>, with the shell in place", async () => {
  window.history.pushState({}, "", "/help");
  render(<App />);
  const main = screen.getByRole("main");
  expect(within(main).getByRole("status")).toHaveTextContent("Loading the page");
  // eslint-disable-next-line testing-library/no-node-access -- the busy region has no role of its own
  expect(main.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  expect(screen.getByTestId("shell-header")).toBeInTheDocument();
  expect(screen.getByTestId("shell-footer")).toBeInTheDocument();
  expect(await screen.findByRole("heading", { level: 1, name: "How can we help?" })).toBeInTheDocument();
  expect(within(main).queryByText("Loading the page")).not.toBeInTheDocument();
  await waitFor(() => expect(document.title).toBe("Help centre | A & S Urbanseat"));
});

test("the admin's pages are in the main bundle: /admin renders at once, without the skeleton", () => {
  document.title = "The static title from index.html";
  window.history.pushState({}, "", "/admin");
  render(<App />);
  expect(screen.getByText("Sign in to manage your store")).toBeInTheDocument();
  expect(screen.queryByText("Loading the page")).not.toBeInTheDocument();
  // usePageMeta is never called on the admin: index.html's title stays.
  expect(document.title).toBe("The static title from index.html");
});

test("the 404 is titled and asks not to be indexed", async () => {
  await renderAt("/nonsense");
  await screen.findByRole("heading", { level: 1, name: "This page has moved or never existed." });
  expect(document.title).toBe("Page not found | A & S Urbanseat");
  // eslint-disable-next-line testing-library/no-node-access -- reading the document's head
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex");
});

test("/about is titled Our story, with its intro's first sentence as the description", async () => {
  await renderAt("/about");
  await screen.findByRole("heading", { level: 1, name: /^Furniture made to be lived with ?\.$/ });
  expect(document.title).toBe("Our story | A & S Urbanseat");
  // eslint-disable-next-line testing-library/no-node-access -- reading the document's head
  expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
    "content",
    "A & S Urbanseat makes and selects furniture for the places people spend their days: homes, offices, cafés and outdoor spaces."
  );
});
