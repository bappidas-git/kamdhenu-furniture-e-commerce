import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import legalContent, {
  COOKIE_POLICY,
  LEGAL_DOCUMENTS,
  PRIVACY_POLICY,
  REFUND_POLICY,
  TERMS_OF_SERVICE,
} from "../../content/legalContent";
import { STOREFRONT_CONFIG } from "../../theme/tokens";
import { POLICY_LAST_UPDATED, SUPPORT_EMAIL } from "../../utils/constants";
import PrivacyPolicy from "../../pages/PrivacyPolicy/PrivacyPolicy";
import TermsOfService from "../../pages/TermsOfService/TermsOfService";
import CookiePolicy from "../../pages/CookiePolicy/CookiePolicy";
import RefundPolicy from "../../pages/RefundPolicy/RefundPolicy";
import PolicyPage, { renderRich } from "./PolicyPage";

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

const renderPage = (element) => render(<MemoryRouter>{element}</MemoryRouter>);

const PAGES = [
  ["/privacy", PrivacyPolicy, PRIVACY_POLICY],
  ["/terms", TermsOfService, TERMS_OF_SERVICE],
  ["/cookies", CookiePolicy, COOKIE_POLICY],
  ["/refund", RefundPolicy, REFUND_POLICY],
];

// Every string a document renders (rich text flattened), for wording checks.
const flatten = (text) =>
  (Array.isArray(text) ? text : [text])
    .map((part) => (typeof part === "string" ? part : part?.label ?? part?.placeholder ?? ""))
    .join("");
const documentText = (doc) =>
  [
    doc.title,
    doc.intro,
    ...doc.sections.flatMap((section) => [
      section.heading,
      ...section.blocks.flatMap((block) => {
        if (block.type === "table") return [block.caption, ...block.columns, ...block.rows.flat().map(flatten)];
        if (block.items) return block.items.map(flatten);
        return [flatten(block.text)];
      }),
    ]),
  ].join(" ");

describe.each(PAGES)("%s", (route, Page, doc) => {
  test("renders its document: the trail, eyebrow, h1, intro, the review date and the draft line", () => {
    renderPage(<Page />);
    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(trail).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(trail).getByText(doc.crumb)).toHaveAttribute("aria-current", "page");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: doc.title })).toBeInTheDocument();
    expect(screen.getByText("Policies")).toHaveClass("sf-eyebrow");
    expect(screen.getByText(doc.intro)).toBeInTheDocument();
    expect(screen.getByText(`Last reviewed: ${POLICY_LAST_UPDATED}`)).toBeInTheDocument();
    expect(screen.getByText("Draft for legal review")).toBeInTheDocument();
  });

  test("one h2 per section, in order, each with its anchor id", () => {
    renderPage(<Page />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(doc.sections.map((section) => section.heading));
    expect(headings.map((heading) => heading.id)).toEqual(doc.sections.map((section) => section.id));
  });

  test("ends with the contact line: the support form and the email address", () => {
    renderPage(<Page />);
    const note = screen.getByText(/^Questions\?/);
    expect(within(note).getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/support");
    expect(within(note).getByRole("link", { name: SUPPORT_EMAIL })).toHaveAttribute("href", `mailto:${SUPPORT_EMAIL}`);
  });

  test("the module keys it by its route; every internal link points inside the site", () => {
    expect(LEGAL_DOCUMENTS[route]).toBe(doc);
    expect(legalContent.LEGAL_DOCUMENTS[route]).toBe(doc);
    renderPage(<Page />);
    screen.getAllByRole("link").forEach((link) => {
      expect(link.getAttribute("href")).toMatch(/^(\/|mailto:|tel:)/);
    });
  });
});

test.each(PAGES)("%s names the document after the policy, with its intro as the description", (path, Page, doc) => {
  const { unmount } = renderPage(<Page />);
  expect(document.title).toBe(`${doc.crumb} | A & S Urbanseat`);
  // eslint-disable-next-line testing-library/no-node-access -- reading the document's head
  expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute("content", doc.intro);
  unmount();
});

test("an approved document drops the draft line", () => {
  renderPage(<PolicyPage document={{ ...PRIVACY_POLICY, draft: false }} />);
  expect(screen.getByText(`Last reviewed: ${POLICY_LAST_UPDATED}`)).toBeInTheDocument();
  expect(screen.queryByText("Draft for legal review")).not.toBeInTheDocument();
});

test("the cookie types are a real table: column headers, row headers and a caption", () => {
  renderPage(<CookiePolicy />);
  const table = screen.getByRole("table", { name: "Types of cookies, and whether this website uses them" });
  expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
    "Type",
    "What it does",
    "Used here",
  ]);
  expect(within(table).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
    "Essential",
    "Functional",
    "Analytics",
    "Marketing",
  ]);
  const analytics = within(table).getByRole("row", { name: /^Analytics/ });
  expect(within(analytics).getByText("Not at present")).toBeInTheDocument();
});

test("refund timings are visible blanks, never invented numbers", () => {
  renderPage(<RefundPolicy />);
  const table = screen.getByRole("table", { name: "How refunds are paid" });
  expect(within(table).getAllByText("To be confirmed")).toHaveLength(2);
  expect(within(table).queryByText(/business days/)).not.toBeInTheDocument();
});

test("returns start from the Support form with the order number (the order page's route)", () => {
  renderPage(<RefundPolicy />);
  // The list under "How to start a return" (the breadcrumb is a list too).
  const steps = screen.getAllByRole("list").find((list) => within(list).queryByText(/Return or exchange/));
  expect(steps.tagName).toBe("OL");
  expect(within(steps).getByRole("link", { name: "My orders" })).toHaveAttribute("href", "/orders");
  expect(within(steps).getByRole("link", { name: "support form" })).toHaveAttribute(
    "href",
    "/support?category=returns"
  );
});

test("the returns window is STOREFRONT_CONFIG.returnsWindowDays", () => {
  const days = STOREFRONT_CONFIG.returnsWindowDays;
  expect(documentText(REFUND_POLICY)).toContain(`within ${days} days of delivery`);
});

test("terms: prices exclude GST (the store's settings), and the courts of Assam", () => {
  const text = documentText(TERMS_OF_SERVICE);
  expect(text).toContain("Product prices do not include GST");
  expect(text).toContain("the courts of Assam, India");
  expect(text).not.toMatch(/include applicable taxes|Mumbai|Maharashtra/);
});

test("no generic-retail or invented claims in any policy", () => {
  const text = Object.values(LEGAL_DOCUMENTS).map(documentText).join(" ");
  expect(text).not.toMatch(
    /intimate wear|swimwear|gift card|24\/7|live chat|5-7 business days|3-5 business days|256-bit|PCI|SSL|hassle-free/i
  );
});

test("every document is a draft until approved", () => {
  Object.values(LEGAL_DOCUMENTS).forEach((doc) => expect(doc.draft).toBe(true));
});

describe("renderRich", () => {
  test("strings pass through; null renders nothing", () => {
    expect(renderRich("Plain words.")).toBe("Plain words.");
    expect(renderRich(null)).toBeNull();
  });

  test("links, mailto links and placeholders", () => {
    render(
      <MemoryRouter>
        <p data-testid="rich">
          {renderRich([
            "See ",
            { label: "My orders", to: "/orders" },
            ", email ",
            { label: "us", href: "mailto:a@b.co" },
            ". Officer: ",
            { placeholder: "to be confirmed" },
            ".",
          ])}
        </p>
      </MemoryRouter>
    );
    const rich = screen.getByTestId("rich");
    expect(rich).toHaveTextContent("See My orders, email us. Officer: to be confirmed.");
    expect(within(rich).getByRole("link", { name: "My orders" })).toHaveAttribute("href", "/orders");
    expect(within(rich).getByRole("link", { name: "us" })).toHaveAttribute("href", "mailto:a@b.co");
    expect(within(rich).getByText("to be confirmed").tagName).toBe("SPAN");
  });

  test("a single segment object renders as one", () => {
    render(<MemoryRouter>{renderRich({ placeholder: "To be confirmed" })}</MemoryRouter>);
    expect(screen.getByText("To be confirmed")).toBeInTheDocument();
  });
});
