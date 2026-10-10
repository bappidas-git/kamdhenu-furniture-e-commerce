import React, { useRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider } from "../../context/AuthContext";
import AccountLayout from "./AccountLayout";

// The shell against the real AuthProvider (the session restored from
// storage); nothing here touches the network or SweetAlert.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: { auth: { logout: jest.fn() } },
  getErrorMessage: (error) => error?.message,
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn() } }));

const USER = { id: 1, email: "user@example.com", firstName: "John", lastName: "Doe" };

const signIn = (user = USER) => {
  sessionStorage.setItem("user", JSON.stringify(user));
  sessionStorage.setItem("token", "mock-token-1");
};

const renderLayout = (props = {}, children = <p>The page's content</p>) =>
  render(
    <MemoryRouter initialEntries={["/profile"]}>
      <AuthProvider>
        <AccountLayout {...props}>{children}</AccountLayout>
      </AuthProvider>
    </MemoryRouter>
  );

// jsdom puts a space between the italic name and the full stop; browsers do not.
const greeting = (name) => new RegExp(`^Hello, ${name} ?\\.$`);

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

test("the header: the eyebrow, then the greeting as the page's only h1, the name in italics", () => {
  signIn();
  renderLayout({ active: "profile" });
  expect(screen.getByText("Account")).toHaveClass("sf-eyebrow");
  const h1 = screen.getByRole("heading", { level: 1 });
  expect(h1).toHaveAccessibleName(greeting("John"));
  expect(within(h1).getByText("John").tagName).toBe("EM");
  expect(h1).toHaveClass("sf-display-lg");
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
});

test("without a first name the h1 reads 'My account'", () => {
  signIn({ ...USER, firstName: "   " });
  renderLayout();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^My account$/);
});

test("signed in: AccountNav beside the content, carrying the active key", () => {
  signIn();
  renderLayout({ active: "wallet" });
  const nav = screen.getByRole("navigation", { name: "Account" });
  expect(within(nav).getByRole("link", { name: "Store credit" })).toHaveAttribute("aria-current", "page");
  const content = screen.getByText("The page's content");
  // The nav comes first in the reading order (the chip row sits above the
  // content on phones, the rail beside it from 901px).
  expect(nav.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("a guest gets the header and the content, but no nav", () => {
  renderLayout({ active: "profile" });
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^My account$/);
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  expect(screen.getByText("The page's content")).toBeInTheDocument();
});

test("nav={false} leaves the nav out for a signed-in page too", () => {
  signIn();
  renderLayout({ nav: false });
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});

test("the eyebrow, the title and a description line can be set", () => {
  signIn();
  renderLayout({ eyebrow: "Saved", title: "Your wishlist", description: <span>3 pieces</span> });
  expect(screen.getByText("Saved")).toHaveClass("sf-eyebrow");
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Your wishlist$/);
  expect(screen.getByText("3 pieces")).toBeInTheDocument();
});

test("the h1 is a focus target (tabIndex -1) reachable through titleRef", () => {
  signIn();
  let ref;
  const WithRef = () => {
    ref = useRef(null);
    return (
      <AccountLayout titleRef={ref}>
        <p>Content</p>
      </AccountLayout>
    );
  };
  render(
    <MemoryRouter>
      <AuthProvider>
        <WithRef />
      </AuthProvider>
    </MemoryRouter>
  );
  const h1 = screen.getByRole("heading", { level: 1 });
  expect(ref.current).toBe(h1);
  expect(h1).toHaveAttribute("tabindex", "-1");
  h1.focus();
  expect(h1).toHaveFocus();
});

test("inside the app's main it adds no landmark besides the nav", () => {
  signIn();
  render(
    <MemoryRouter>
      <AuthProvider>
        <main>
          <AccountLayout active="profile">
            <p>Content</p>
          </AccountLayout>
        </main>
      </AuthProvider>
    </MemoryRouter>
  );
  // No second main (the old page nested one) and no aside. (Testing Library
  // calls every <header> a banner; inside <main> browsers do not, which the
  // browser QA checks in Chromium's accessibility tree.)
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  expect(screen.getAllByRole("navigation")).toHaveLength(1);
});

// Prompt 32: each section names the document; the default description stays.
test.each([
  ["profile", "My account"],
  ["addresses", "Addresses"],
  ["orders", "My orders"],
  ["wallet", "Store credit"],
  ["wishlist", "My wishlist"],
  ["password", "Change password"],
  [undefined, "My account"],
])("active %s titles the document %s", (active, title) => {
  signIn();
  const { unmount } = renderLayout({ active });
  expect(document.title).toBe(`${title} | A & S Urbanseat`);
  unmount();
  expect(document.title).toBe(
    "A & S Urbanseat | Furniture and seating for home, office, café and outdoor"
  );
});

test("pageTitle replaces the section's name", () => {
  renderLayout({ active: "orders", pageTitle: "Track an order" });
  expect(document.title).toBe("Track an order | A & S Urbanseat");
});
