import React from "react";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FAQ_ITEMS } from "../../utils/constants";
import { STOREFRONT_CONFIG } from "../../theme/tokens";
import FAQ, { filterFaqs } from "./FAQ";

const ITEMS = [
  { id: 1, question: "How long does delivery take?", answer: "It depends on the method." },
  { id: 2, question: "Can I return a piece?", answer: "Yes, within the window.", link: { label: "Read our returns policy", to: "/refund" } },
  { id: 3, question: "Do prices include GST?", answer: "No. Tax is added at checkout." },
];

const renderFaq = (props = {}) =>
  render(
    <MemoryRouter>
      <FAQ items={ITEMS} {...props} />
    </MemoryRouter>
  );

const question = (name) => screen.getByRole("button", { name });
// The region a question controls (closed ones included: jsdom keeps inert
// elements in its accessibility tree).
const answerOf = (button) => screen.getByRole("region", { name: button.textContent });

describe("filterFaqs", () => {
  test("a blank or whitespace query keeps every item", () => {
    expect(filterFaqs(ITEMS, "")).toBe(ITEMS);
    expect(filterFaqs(ITEMS, "   ")).toBe(ITEMS);
    expect(filterFaqs(ITEMS, undefined)).toBe(ITEMS);
  });

  test("matches the question or the answer, case-insensitively, trimmed", () => {
    expect(filterFaqs(ITEMS, "DELIVERY").map((item) => item.id)).toEqual([1]);
    expect(filterFaqs(ITEMS, "  checkout ").map((item) => item.id)).toEqual([3]);
    expect(filterFaqs(ITEMS, "window").map((item) => item.id)).toEqual([2]);
    expect(filterFaqs(ITEMS, "sofa")).toEqual([]);
  });
});

describe("FAQ", () => {
  test("each question is a heading holding a button that controls a labelled region", () => {
    renderFaq();
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(ITEMS.map((item) => item.question));

    const button = question("How long does delivery take?");
    expect(within(headings[0]).getByRole("button")).toBe(button);
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    const answer = answerOf(button);
    expect(button).toHaveAttribute("aria-controls", answer.id);
    expect(answer).toHaveAttribute("aria-labelledby", button.id);
  });

  test("closed answers are inert (out of the tab order and the accessibility tree)", () => {
    renderFaq();
    ITEMS.forEach((item) => {
      expect(answerOf(question(item.question))).toHaveAttribute("inert");
    });
  });

  test("a click opens an answer; one answer is open at a time; a second click closes it", () => {
    renderFaq();
    const first = question("How long does delivery take?");
    const second = question("Can I return a piece?");

    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(answerOf(first)).not.toHaveAttribute("inert");
    expect(screen.getByRole("region", { name: "How long does delivery take?" })).toHaveTextContent(
      "It depends on the method."
    );

    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(answerOf(first)).toHaveAttribute("inert");

    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-expanded", "false");
    expect(answerOf(second)).toHaveAttribute("inert");
  });

  test("an answer's link is a router link inside the open region", () => {
    renderFaq();
    fireEvent.click(question("Can I return a piece?"));
    const region = screen.getByRole("region", { name: "Can I return a piece?" });
    expect(within(region).getByRole("link", { name: "Read our returns policy" })).toHaveAttribute("href", "/refund");
  });

  test("the query filters the list; nothing matching shows the empty message", () => {
    const { rerender } = renderFaq({ query: "gst" });
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Do prices include GST?"]);

    rerender(
      <MemoryRouter>
        <FAQ items={ITEMS} query="sofa" emptyMessage={<p>Nothing matches.</p>} />
      </MemoryRouter>
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Nothing matches.")).toBeInTheDocument();
  });

  test("a default empty message when none is given", () => {
    renderFaq({ query: "sofa" });
    expect(screen.getByText("No questions match your search.")).toBeInTheDocument();
  });

  test("idPrefix keeps ids unique; headingLevel sets the heading level", () => {
    render(
      <MemoryRouter>
        <FAQ items={ITEMS} idPrefix="one" headingLevel={2} />
        <FAQ items={ITEMS} idPrefix="two" />
      </MemoryRouter>
    );
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    const ids = screen.getAllByRole("button").map((button) => button.id);
    expect(new Set(ids).size).toBe(6);
    expect(ids[0]).toBe("one-question-1");
    expect(ids[3]).toBe("two-question-1");
  });

  test("defaults to FAQ_ITEMS", () => {
    render(
      <MemoryRouter>
        <FAQ />
      </MemoryRouter>
    );
    expect(screen.getAllByRole("button")).toHaveLength(FAQ_ITEMS.length);
  });
});

describe("FAQ_ITEMS", () => {
  const text = FAQ_ITEMS.map((item) => `${item.question} ${item.answer}`).join(" ");

  test("unique ids, a question and an answer each, links inside the site", () => {
    expect(new Set(FAQ_ITEMS.map((item) => item.id)).size).toBe(FAQ_ITEMS.length);
    FAQ_ITEMS.forEach((item) => {
      expect(item.question).toMatch(/\?$/);
      expect(item.answer.length).toBeGreaterThan(20);
    });
    FAQ_ITEMS.filter((item) => item.link).forEach((item) => expect(item.link.to).toMatch(/^\//));
  });

  test("no invented delivery windows, caps, same-day or 24/7 claims", () => {
    expect(text).not.toMatch(/business days|same-day|same day|24\/7|₹|\d+\s*-\s*\d+\s*days|SSL|guarantee/i);
  });

  test("the returns window is the shared placeholder", () => {
    const days = STOREFRONT_CONFIG.returnsWindowDays;
    expect(FAQ_ITEMS.find((item) => item.question === "Can I return a piece?").answer).toContain(`within ${days} days of delivery`);
  });
});
