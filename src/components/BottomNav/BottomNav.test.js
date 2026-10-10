import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useAuth } from "../../hooks/useAuth";
import { useWishlist } from "../../context/WishlistContext";
import BottomNav from "./BottomNav";

jest.mock("../../hooks/useAuth", () => ({ useAuth: jest.fn() }));
jest.mock("../../context/WishlistContext", () => ({ useWishlist: jest.fn() }));

// The real overlay fetches the catalogue; this stand-in only does what the bar
// relies on: a dialog that locks the page scroll while open.
jest.mock("../SearchModal/SearchModal", () => ({
  __esModule: true,
  default: (props) => mockSearchModal(props),
}));

function mockSearchModal({ open, onClose }) {
  return <SearchModalStub open={open} onClose={onClose} />;
}

// Like the real overlay: it focuses its field, releases the scroll lock as
// soon as it closes, and stays in the DOM a moment longer for its exit.
function SearchModalStub({ open, onClose }) {
  const [present, setPresent] = React.useState(open);
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    if (open) {
      setPresent(true);
      return undefined;
    }
    const timer = setTimeout(() => setPresent(false), 30);
    return () => clearTimeout(timer);
  }, [open]);
  React.useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  React.useEffect(() => {
    if (open && present && inputRef.current) inputRef.current.focus();
  }, [open, present]);
  if (!present) return null;
  return (
    <div role="dialog" aria-label="Search">
      <input ref={inputRef} aria-label="Search products" />
      <button type="button" onClick={onClose}>
        Close search
      </button>
    </div>
  );
}

let auth;
let wishlistCount;

beforeEach(() => {
  auth = { isAuthenticated: false, openAuthModal: jest.fn() };
  wishlistCount = 0;
  useAuth.mockImplementation(() => auth);
  useWishlist.mockImplementation(() => ({ getWishlistCount: () => wishlistCount }));
  window.scrollY = 0;
});

afterEach(() => {
  document.body.style.overflow = "";
});

const renderNav = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>
  );

const nav = () => screen.getByRole("navigation", { name: "Quick links" });
const scrollTo = (y) =>
  act(() => {
    window.scrollY = y;
    fireEvent.scroll(window);
  });

test("five destinations: Home, Shop, Search, Wishlist, Account", () => {
  renderNav();
  const bar = within(nav());
  expect(bar.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  expect(bar.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/products");
  expect(bar.getByRole("button", { name: "Search" })).toHaveAttribute("aria-haspopup", "dialog");
  expect(bar.getByRole("link", { name: "Wishlist" })).toHaveAttribute("href", "/wishlist");
  expect(bar.getByRole("button", { name: "Account" })).toBeInTheDocument();
  expect(bar.getAllByRole("listitem")).toHaveLength(5);
  // The cart lives in the header.
  expect(bar.queryByText(/cart/i)).not.toBeInTheDocument();
});

test.each([
  ["/", "Home", "page"],
  ["/products", "Shop", "page"],
  ["/products/wooden-sofa-set", "Shop", "true"],
  ["/wishlist", "Wishlist", "page"],
])("on %s, %s is current (%s)", (path, name, value) => {
  renderNav(path);
  within(nav())
    .getAllByRole("link")
    .forEach((link) => {
      if (link.textContent === name) expect(link).toHaveAttribute("aria-current", value);
      else expect(link).not.toHaveAttribute("aria-current");
    });
});

test("nothing is current elsewhere", () => {
  renderNav("/about");
  within(nav())
    .getAllByRole("link")
    .forEach((link) => expect(link).not.toHaveAttribute("aria-current"));
});

test("a guest's Account opens the sign-in dialog", () => {
  renderNav();
  fireEvent.click(screen.getByRole("button", { name: "Account" }));
  expect(auth.openAuthModal).toHaveBeenCalledWith("login");
});

test("a signed-in shopper's Account is their profile", () => {
  auth = { isAuthenticated: true, openAuthModal: jest.fn() };
  const { unmount } = renderNav("/profile");
  expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/profile");
  expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("aria-current", "page");
  unmount();
  renderNav("/orders");
  expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("aria-current", "true");
});

test("the wishlist count shows on the glyph and in the name", () => {
  wishlistCount = 3;
  const { unmount } = renderNav();
  const wishlist = screen.getByRole("link", { name: "Wishlist, 3 pieces" });
  expect(within(wishlist).getByText("3")).toHaveAttribute("aria-hidden", "true");
  unmount();
  wishlistCount = 120;
  renderNav();
  expect(within(screen.getByRole("link", { name: "Wishlist, 120 pieces" })).getByText("99+")).toBeInTheDocument();
});

test("Search opens the overlay; the bar is inert under it; focus comes back to Search", async () => {
  renderNav();
  const search = screen.getByRole("button", { name: "Search" });
  search.focus();
  fireEvent.click(search);
  expect(screen.getByRole("dialog", { name: "Search" })).toBeInTheDocument();
  await waitFor(() => expect(document.querySelector("nav")).toHaveAttribute("inert"));
  expect(screen.getByRole("textbox", { name: "Search products" })).toHaveFocus();

  // Focus is still in the closing dialog when the page is released.
  fireEvent.click(screen.getByRole("button", { name: "Close search" }));
  await waitFor(() => expect(nav()).not.toHaveAttribute("inert"));
  expect(screen.getByRole("button", { name: "Search" })).toHaveFocus();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Search" })).toHaveFocus();
});

test("a tapped link keeps focus without pinning the bar; keyboard focus pins it", () => {
  const { matches } = Element.prototype;
  let keyboard = false;
  const spy = jest.spyOn(Element.prototype, "matches").mockImplementation(function (selector) {
    return selector === ":focus-visible" ? keyboard : matches.call(this, selector);
  });
  try {
    renderNav();
    act(() => screen.getByRole("link", { name: "Shop" }).focus());
    scrollTo(400);
    expect(nav()).toHaveClass("hidden");

    scrollTo(300);
    keyboard = true;
    scrollTo(700);
    expect(nav()).not.toHaveClass("hidden");
  } finally {
    spy.mockRestore();
  }
});

test("hides on scroll down past 80px and returns on scroll up", () => {
  renderNav();
  scrollTo(60);
  expect(nav()).not.toHaveClass("hidden");
  scrollTo(400);
  expect(nav()).toHaveClass("hidden");
  scrollTo(398); // under the tolerance
  expect(nav()).toHaveClass("hidden");
  scrollTo(300);
  expect(nav()).not.toHaveClass("hidden");
});

test("never hides while an overlay holds the scroll lock, and comes back when one opens", async () => {
  renderNav();
  scrollTo(400);
  expect(nav()).toHaveClass("hidden");

  await act(async () => {
    document.body.style.overflow = "hidden";
  });
  await waitFor(() => expect(document.querySelector("nav")).toHaveAttribute("inert"));
  expect(document.querySelector("nav")).not.toHaveClass("hidden");
  scrollTo(900);
  expect(document.querySelector("nav")).not.toHaveClass("hidden");

  await act(async () => {
    document.body.style.overflow = "";
  });
  await waitFor(() => expect(nav()).not.toHaveAttribute("inert"));
  expect(nav()).not.toHaveClass("hidden");
});

test("focus inside the bar brings it back", () => {
  renderNav();
  scrollTo(400);
  expect(nav()).toHaveClass("hidden");
  act(() => screen.getByRole("link", { name: "Home" }).focus());
  expect(nav()).not.toHaveClass("hidden");
});
