import React from "react";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useDealsConfig } from "../../context/DealsConfigContext";
import {
  FAQ_ITEMS,
  HELP_TOPICS,
  SOCIAL_LINKS,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE,
} from "../../utils/constants";
import HelpCenter, { searchStatus } from "./HelpCenter";

jest.mock("../../context/DealsConfigContext", () => ({ useDealsConfig: jest.fn() }));

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
  useDealsConfig.mockReturnValue({ enabled: true, loading: false });
});

const renderHelp = () =>
  render(
    <MemoryRouter initialEntries={["/help"]}>
      <HelpCenter />
    </MemoryRouter>
  );

const searchField = () => screen.getByRole("searchbox", { name: "Search the questions" });
const type = (value) => fireEvent.change(searchField(), { target: { value } });
const questions = () => within(screen.getByRole("region", { name: "Common questions" })).queryAllByRole("button");
const topics = () => within(screen.getByRole("region", { name: "Browse by topic" })).getAllByRole("link");

test("the frame: trail, eyebrow, one h1, the intro", () => {
  renderHelp();
  const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
  expect(within(trail).getByText("Help centre")).toHaveAttribute("aria-current", "page");
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("heading", { level: 1, name: "How can we help?" })).toBeInTheDocument();
  expect(screen.getByText(/^Answers about orders, delivery, payments and returns/)).toBeInTheDocument();
});

test("a labelled search field in a search landmark; the status line starts empty", () => {
  renderHelp();
  expect(screen.getByRole("search", { name: "Help centre" })).toContainElement(searchField());
  expect(searchField()).toHaveAttribute("type", "search");
  const status = screen.getByRole("status");
  expect(searchField()).toHaveAttribute("aria-describedby", status.id);
  expect(status).toBeEmptyDOMElement();
});

test("every question shows until a search; typing filters them (the old rule) and says how many", () => {
  renderHelp();
  expect(questions()).toHaveLength(FAQ_ITEMS.length);

  type("GST");
  expect(questions().map((button) => button.textContent)).toEqual(["Do prices include GST?"]);
  expect(screen.getByRole("status")).toHaveTextContent("1 question matches “GST”.");

  type("store credit");
  const expected = FAQ_ITEMS.filter((item) =>
    `${item.question} ${item.answer}`.toLowerCase().includes("store credit")
  ).length;
  expect(questions()).toHaveLength(expected);
  expect(screen.getByRole("status")).toHaveTextContent(`${expected} questions match “store credit”.`);
});

test("no match: the status says so and the list offers to send the question", () => {
  renderHelp();
  type("trampoline");
  expect(questions()).toHaveLength(0);
  expect(screen.getByRole("status")).toHaveTextContent("No questions match “trampoline”.");
  expect(screen.getByRole("link", { name: "Send us your question" })).toHaveAttribute("href", "/support");
});

test("clearing the search brings every question back; submitting does not leave the page", () => {
  renderHelp();
  type("delivery");
  type("   ");
  expect(questions()).toHaveLength(FAQ_ITEMS.length);
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  const submitted = fireEvent.submit(screen.getByRole("search"));
  expect(submitted).toBe(false); // preventDefault was called
});

test("an answer opens in place", () => {
  renderHelp();
  const button = screen.getByRole("button", { name: "Do I need an account to order?" });
  fireEvent.click(button);
  expect(button).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("region", { name: "Do I need an account to order?" })).toHaveTextContent(
    "sign in or create an account at checkout"
  );
});

test("six topic cards with the old targets (Payments preselects its topic)", () => {
  renderHelp();
  const links = topics();
  HELP_TOPICS.forEach((topic, index) => {
    expect(within(links[index]).getByText(topic.title)).toBeInTheDocument();
    expect(links[index]).toHaveAttribute("href", topic.to);
  });
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "/orders",
    "/refund",
    "/support?category=payment",
    "/profile",
    "/privacy",
    "/special-offers",
  ]);
});

test("the Offers card follows the deals switch, and waits for the config", () => {
  useDealsConfig.mockReturnValue({ enabled: false, loading: false });
  const { unmount } = renderHelp();
  expect(topics()).toHaveLength(5);
  expect(screen.queryByRole("link", { name: /^Offers/ })).not.toBeInTheDocument();
  unmount();

  useDealsConfig.mockReturnValue({ enabled: true, loading: true });
  renderHelp();
  expect(topics()).toHaveLength(5);
});

test("no emoji or HTML-entity icons on the cards", () => {
  renderHelp();
  topics().forEach((link) => {
    expect(link.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u);
    expect(link.innerHTML).toMatch(/<svg[^>]*aria-hidden="true"/);
  });
});

test("the contact block: hours, email, phone, WhatsApp, and the support form", () => {
  renderHelp();
  const block = screen.getByRole("region", { name: "Still need help?" });
  expect(within(block).getByText(SUPPORT_HOURS)).toBeInTheDocument();
  expect(within(block).getByRole("link", { name: SUPPORT_EMAIL })).toHaveAttribute("href", `mailto:${SUPPORT_EMAIL}`);
  expect(within(block).getByRole("link", { name: SUPPORT_PHONE })).toHaveAttribute(
    "href",
    `tel:${SUPPORT_PHONE.replace(/[^\d+]/g, "")}`
  );
  const whatsapp = within(block).getByRole("link", { name: /Message us on WhatsApp/ });
  expect(whatsapp).toHaveAttribute("href", SOCIAL_LINKS.WHATSAPP);
  expect(whatsapp).toHaveAttribute("target", "_blank");
  expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
  expect(within(block).getByRole("link", { name: "Send us a message" })).toHaveAttribute("href", "/support");
});

test("no invented hours or 24/7 claims anywhere on the page", () => {
  const { container } = renderHelp();
  expect(container.textContent).not.toMatch(/24\/7|9am-8pm|Mon-Sat|live chat/i);
});

describe("searchStatus", () => {
  test("empty for a blank query; the count otherwise", () => {
    expect(searchStatus("", 11)).toBe("");
    expect(searchStatus("  ", 11)).toBe("");
    expect(searchStatus(" sofa ", 0)).toBe("No questions match “sofa”.");
    expect(searchStatus("gst", 1)).toBe("1 question matches “gst”.");
    expect(searchStatus("order", 4)).toBe("4 questions match “order”.");
  });
});
