import React, { useEffect, useRef, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import SkipLink, { MAIN_CONTENT_ID, isFocusUnplaced } from "./SkipLink";

// A page that puts focus on its heading when it arrives "from nowhere", as
// the order confirmation does.
const Arrival = () => {
  const ref = useRef(null);
  useEffect(() => {
    if (isFocusUnplaced()) ref.current.focus();
  }, []);
  return (
    <h1 tabIndex={-1} ref={ref}>
      Arrived
    </h1>
  );
};

// A drawer over the page that closes a moment after one of its links is
// followed, as the sidebar does on a route change.
const Drawer = () => {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Menu">
      <Link to="/about" onClick={() => setTimeout(() => setOpen(false), 30)}>
        About from the menu
      </Link>
    </div>
  );
};

const Fixer = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/products", { replace: true })}>
      Correct the URL
    </button>
  );
};

const Shell = ({ drawer = false }) => (
  <div className="App">
    <SkipLink />
    <header>
      <Link to="/about">About</Link>
      <Link to="/arrival">Arrival</Link>
      <Fixer />
    </header>
    {drawer && <Drawer />}
    <main id={MAIN_CONTENT_ID} tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Link to="/products">Products</Link>} />
        <Route path="/products" element={<h1>Products</h1>} />
        <Route path="/about" element={<h1>About us</h1>} />
        <Route path="/arrival" element={<Arrival />} />
      </Routes>
    </main>
  </div>
);

const renderAt = (path = "/", props = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Shell {...props} />
    </MemoryRouter>
  );

const skipLink = () => screen.getByRole("link", { name: "Skip to content" });

test("is the first link, and moves focus to the page area without writing a hash", () => {
  renderAt();
  expect(skipLink()).toHaveAttribute("href", "#main-content");
  expect(skipLink()).toHaveClass("sf-skip-link");
  expect(screen.getAllByRole("link")[0]).toBe(skipLink());

  // fireEvent returns false when the default (following the hash) was prevented.
  expect(fireEvent.click(skipLink())).toBe(false);
  expect(screen.getByRole("main")).toHaveFocus();
});

test("the first page of a visit leaves focus alone", () => {
  renderAt("/products");
  expect(document.body).toHaveFocus();
});

test("a route change moves focus left in the header to the skip link", () => {
  renderAt();
  const about = screen.getByRole("link", { name: "About" });
  about.focus();
  fireEvent.click(about);
  expect(screen.getByRole("heading", { name: "About us" })).toBeInTheDocument();
  expect(skipLink()).toHaveFocus();
});

test("focus that fell to the body with the old page goes to the skip link", () => {
  renderAt();
  fireEvent.click(screen.getByRole("link", { name: "Products" }));
  expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
  expect(skipLink()).toHaveFocus();
});

test("a page that focuses its heading on arrival keeps it: the skip link counts as nowhere", () => {
  renderAt();
  const arrival = screen.getByRole("link", { name: "Arrival" });
  arrival.focus();
  fireEvent.click(arrival);
  expect(screen.getByRole("heading", { name: "Arrived" })).toHaveFocus();
});

test("a REPLACE navigation (a corrected URL) leaves focus where it is", () => {
  renderAt();
  const fixer = screen.getByRole("button", { name: "Correct the URL" });
  fixer.focus();
  fireEvent.click(fixer);
  expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
  expect(fixer).toHaveFocus();
});

test("a link followed from a dialog waits for the dialog to close", async () => {
  renderAt("/", { drawer: true });
  const link = screen.getByRole("link", { name: "About from the menu" });
  link.focus();
  fireEvent.click(link);
  expect(screen.getByRole("heading", { name: "About us" })).toBeInTheDocument();
  // The dialog is still up: focus is not pulled out from under it.
  expect(skipLink()).not.toHaveFocus();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(skipLink()).toHaveFocus());
});

test("isFocusUnplaced: nothing, the body and the skip link count as nowhere", () => {
  renderAt();
  expect(isFocusUnplaced(null)).toBe(true);
  expect(isFocusUnplaced(document.body)).toBe(true);
  expect(isFocusUnplaced(skipLink())).toBe(true);
  expect(isFocusUnplaced(screen.getByRole("link", { name: "About" }))).toBe(false);
});
