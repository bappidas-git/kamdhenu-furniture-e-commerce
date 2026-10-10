import React from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  SOCIAL_LINKS,
  SUPPORT_ADDRESS,
  SUPPORT_CATEGORIES,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE,
} from "../../utils/constants";
import Support, { EMPTY_FORM, prefillFromParams, validateContact } from "./Support";

// Only the network and the session are stubbed.
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: { leads: { createContact: jest.fn() } },
}));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));

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

const createContact = apiService.leads.createContact;

// A request the test settles by hand, inside act() (so React has rendered and
// run the effects, focus moves included, before the assertions).
const deferred = () => {
  const handle = {};
  handle.promise = new Promise((resolve, reject) => {
    handle.resolve = resolve;
    handle.reject = reject;
  });
  return handle;
};

beforeAll(() => {
  window.IntersectionObserver = MockIntersectionObserver;
});

beforeEach(() => {
  useAuth.mockReturnValue({ user: null });
  window.scrollTo = jest.fn();
});

afterEach(() => {
  createContact.mockReset();
});

// Let a settled request finish: React renders and runs its effects (the
// focus moves) inside act before the assertions.
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

// A link elsewhere on the page that moves to another /support URL.
const Jump = ({ to }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      jump
    </button>
  );
};

const renderAt = (url = "/support", { jumpTo } = {}) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/support"
          element={
            <>
              <Support />
              {jumpTo && <Jump to={jumpTo} />}
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

const field = (name) => screen.getByLabelText(name, { exact: false });
const nameField = () => screen.getByRole("textbox", { name: "Full name" });
const emailField = () => screen.getByRole("textbox", { name: "Email address" });
const phoneField = () => screen.getByRole("textbox", { name: "Phone number (optional)" });
const orderField = () => screen.getByRole("textbox", { name: "Order number (optional)" });
const topicField = () => screen.getByRole("combobox", { name: "Topic" });
const subjectField = () => screen.getByRole("textbox", { name: "Subject" });
const messageField = () => screen.getByRole("textbox", { name: "Message" });
const sendButton = () => screen.getByRole("button", { name: /^(Send message|Sending…)$/ });
const type = (element, value) => fireEvent.change(element, { target: { value } });

const fillValid = () => {
  type(nameField(), "Asha Bora");
  type(emailField(), "asha@example.com");
  type(phoneField(), "98765 43210");
  type(subjectField(), "Sofa delivery");
  type(messageField(), "When will my sofa set be delivered to Guwahati?");
};

describe("the page", () => {
  test("the frame: trail, eyebrow, one h1", () => {
    renderAt();
    expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByText("Contact us")).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    // jsdom's name computation puts a space between the <em> and the period.
    expect(screen.getByRole("heading", { level: 1, name: /^Talk to us ?\.$/ })).toBeInTheDocument();
  });

  test("the facts come from constants: email, phone, WhatsApp, hours and address", () => {
    renderAt();
    const facts = screen.getByRole("region", { name: "Reach us directly" });
    expect(within(facts).getByRole("link", { name: SUPPORT_EMAIL })).toHaveAttribute("href", `mailto:${SUPPORT_EMAIL}`);
    expect(within(facts).getByRole("link", { name: SUPPORT_PHONE })).toHaveAttribute("href", "tel:+918472918653");
    expect(within(facts).getByRole("link", { name: /Message us on WhatsApp/ })).toHaveAttribute(
      "href",
      SOCIAL_LINKS.WHATSAPP
    );
    expect(within(facts).getByText(SUPPORT_HOURS)).toBeInTheDocument();
    expect(within(facts).getByText(SUPPORT_ADDRESS)).toBeInTheDocument();
    expect(within(facts).getByText("We reply during working hours.")).toBeInTheDocument();
  });

  test("the quick links keep the old targets", () => {
    renderAt();
    const list = screen.getByRole("list", { name: "Quick answers" });
    expect(within(list).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/help",
      "/orders",
      "/refund",
    ]);
  });

  test("no live chat, 24/7 or reply-time promise", () => {
    const { container } = renderAt();
    expect(container.textContent).not.toMatch(/live chat|24\/7|24 h|within 24|9am-8pm/i);
  });
});

describe("the form", () => {
  test("labelled fields with the right types, autocomplete and keypads", () => {
    renderAt();
    expect(screen.getByRole("form", { name: "Send us a message" })).toHaveAttribute("novalidate");
    expect(nameField()).toHaveAttribute("autocomplete", "name");
    expect(nameField()).toBeRequired();
    expect(emailField()).toHaveAttribute("type", "email");
    expect(emailField()).toHaveAttribute("autocomplete", "email");
    expect(emailField()).toHaveAttribute("inputmode", "email");
    expect(emailField()).toBeRequired();
    expect(phoneField()).toHaveAttribute("type", "tel");
    expect(phoneField()).toHaveAttribute("autocomplete", "tel");
    expect(phoneField()).toHaveAttribute("inputmode", "tel");
    expect(phoneField()).not.toBeRequired();
    expect(orderField()).not.toBeRequired();
    expect(subjectField()).toBeRequired();
    expect(messageField().tagName).toBe("TEXTAREA");
    expect(messageField()).toBeRequired();
    expect(sendButton()).toHaveAttribute("type", "submit");
  });

  test("the topics: the old values, in the old order, 'general' chosen", () => {
    renderAt();
    const options = within(topicField()).getAllByRole("option");
    expect(options.map((option) => option.value)).toEqual([
      "general",
      "order",
      "shipping",
      "returns",
      "product",
      "payment",
      "account",
      "other",
    ]);
    expect(options.map((option) => option.textContent)).toEqual(SUPPORT_CATEGORIES.map((c) => c.label));
    expect(topicField()).toHaveValue("general");
  });

  test("the message counter counts what will be checked, and describes the field", () => {
    renderAt();
    expect(screen.getByText("0 characters")).toBeInTheDocument();
    type(messageField(), "  hello  ");
    expect(screen.getByText("5 characters")).toBeInTheDocument();
    type(messageField(), "x");
    expect(screen.getByText("1 character")).toBeInTheDocument();
    expect(messageField().getAttribute("aria-describedby").split(" ")).toEqual([
      "support-message-hint",
      "support-message-count",
    ]);
  });
});

describe("prefill", () => {
  test("Order History's deep link fills the order number and chooses Returns & refunds", () => {
    renderAt("/support?order=ORD-20250310-0001&category=returns");
    expect(orderField()).toHaveValue("ORD-20250310-0001");
    expect(topicField()).toHaveValue("returns");
  });

  test("the confirmation page's link fills the order number only", () => {
    renderAt("/support?order=ORD-MQB0JHUB-9KL6");
    expect(orderField()).toHaveValue("ORD-MQB0JHUB-9KL6");
    expect(topicField()).toHaveValue("general");
  });

  test("an unknown topic is ignored; a blank order is ignored", () => {
    renderAt("/support?order=%20%20&category=refunds-please");
    expect(orderField()).toHaveValue("");
    expect(topicField()).toHaveValue("general");
  });

  test("the Help centre's Payments card chooses Payments", () => {
    renderAt("/support?category=payment");
    expect(topicField()).toHaveValue("payment");
  });

  test("a new deep link on the page fills again; the same URL never undoes typing", () => {
    renderAt("/support?order=ORD-A&category=returns", { jumpTo: "/support?order=ORD-B&category=order" });
    type(subjectField(), "Kept");
    fireEvent.click(screen.getByRole("button", { name: "jump" }));
    expect(orderField()).toHaveValue("ORD-B");
    expect(topicField()).toHaveValue("order");
    expect(subjectField()).toHaveValue("Kept");
  });

  test("a signed-in shopper's name and email fill in, never over what was typed", () => {
    const { rerender } = renderAt();
    type(emailField(), "typed@example.com");
    useAuth.mockReturnValue({ user: { firstName: "Bappi", lastName: "Das", email: "bappi@example.com" } });
    rerender(
      <MemoryRouter initialEntries={["/support"]}>
        <Routes>
          <Route path="/support" element={<Support />} />
        </Routes>
      </MemoryRouter>
    );
    expect(nameField()).toHaveValue("Bappi Das");
    expect(emailField()).toHaveValue("typed@example.com");
  });

  test("signed in from the start: both fields filled", () => {
    useAuth.mockReturnValue({ user: { firstName: "John", lastName: "Doe", email: "user@example.com" } });
    renderAt();
    expect(nameField()).toHaveValue("John Doe");
    expect(emailField()).toHaveValue("user@example.com");
  });

  test("prefillFromParams", () => {
    expect(prefillFromParams(new URLSearchParams("order=%20ORD-1%20&category=shipping"))).toEqual({
      orderNumber: "ORD-1",
      category: "shipping",
    });
    expect(prefillFromParams(new URLSearchParams(""))).toEqual({});
    expect(prefillFromParams(new URLSearchParams("category=RETURNS"))).toEqual({});
    expect(prefillFromParams(new URLSearchParams(`order=${"x".repeat(100)}`)).orderNumber).toHaveLength(64);
  });
});

describe("validation", () => {
  test("an empty submit marks every required field, focuses the first and sends nothing", () => {
    renderAt();
    fireEvent.click(sendButton());
    expect(createContact).not.toHaveBeenCalled();

    const expectations = [
      [nameField(), "Enter your name"],
      [emailField(), "Enter your email address"],
      [subjectField(), "Enter a subject"],
      [messageField(), "Write your message"],
    ];
    expectations.forEach(([input, message]) => {
      expect(input).toHaveAttribute("aria-invalid", "true");
      const error = screen.getByText(message);
      expect(error).toHaveAttribute("id", `${input.id}-error`);
      expect(input.getAttribute("aria-describedby").split(" ")).toContain(error.id);
    });
    expect(phoneField()).not.toHaveAttribute("aria-invalid");
    expect(nameField()).toHaveFocus();
  });

  test("the old rules: a valid email, an Indian mobile number if given, 20+ characters", () => {
    renderAt();
    fillValid();
    type(emailField(), "asha@");
    type(phoneField(), "12345");
    type(messageField(), "x".repeat(19));
    fireEvent.click(sendButton());
    expect(screen.getByText("Enter a valid email address, like name@example.com")).toBeInTheDocument();
    expect(screen.getByText("Enter a 10-digit mobile number")).toBeInTheDocument();
    expect(screen.getByText("Write at least 20 characters")).toBeInTheDocument();
    expect(emailField()).toHaveFocus();
    expect(createContact).not.toHaveBeenCalled();
  });

  test("focus moves after the messages render, so the field is read with its message", () => {
    renderAt();
    fillValid();
    type(subjectField(), "");
    // What the field carries at the moment it receives focus.
    const seen = [];
    subjectField().addEventListener("focus", (event) =>
      seen.push([event.target.getAttribute("aria-invalid"), event.target.getAttribute("aria-describedby")])
    );
    fireEvent.click(sendButton());
    expect(seen).toEqual([["true", "support-subject-error"]]);
    expect(subjectField()).toHaveFocus();
    expect(subjectField()).toHaveAttribute("aria-invalid", "true");
    // Focus came from elsewhere, so the field itself is read: the status line stays quiet.
    const form = screen.getByRole("form", { name: "Send us a message" });
    expect(within(form).getByRole("status")).toBeEmptyDOMElement();
  });

  test("Enter in the failing field itself: the hidden status line reads its message, then clears", () => {
    jest.useFakeTimers();
    try {
      renderAt();
      const form = screen.getByRole("form", { name: "Send us a message" });
      nameField().focus();
      fireEvent.submit(form);
      expect(nameField()).toHaveFocus();
      const status = within(form).getByRole("status");
      expect(status).toHaveTextContent("Enter your name");
      expect(status).toHaveClass("sf-visually-hidden");
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(status).toBeEmptyDOMElement();
    } finally {
      jest.useRealTimers();
    }
  });

  test("typing in a field clears its own message only", () => {
    renderAt();
    fireEvent.click(sendButton());
    type(nameField(), "A");
    expect(nameField()).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Enter your name")).not.toBeInTheDocument();
    expect(emailField()).toHaveAttribute("aria-invalid", "true");
  });

  test("validateContact, rule by rule", () => {
    const valid = { ...EMPTY_FORM, name: "A", email: "a@b.co", subject: "S", message: "x".repeat(20) };
    expect(validateContact(valid)).toEqual({});
    expect(validateContact({ ...valid, message: ` ${"x".repeat(19)} ` })).toEqual({
      message: "Write at least 20 characters",
    });
    expect(validateContact({ ...valid, phone: "+91 98765 43210" })).toEqual({});
    expect(validateContact({ ...valid, phone: "   " })).toEqual({});
    expect(validateContact({ ...valid, email: " a@b.co" })).toEqual({
      email: "Enter a valid email address, like name@example.com",
    });
  });
});

describe("sending", () => {
  test("sends exactly the form's fields once, busy meanwhile, then shows the sent panel with focus", async () => {
    const request = deferred();
    createContact.mockReturnValue(request.promise);
    renderAt("/support?order=ORD-20250310-0001&category=returns");
    fillValid();
    // Sent exactly as typed, as the old page did (the rules check trimmed values).
    type(messageField(), "  When will my sofa set be delivered to Guwahati?  ");
    fireEvent.click(sendButton());
    fireEvent.click(sendButton()); // a second press while sending is ignored

    expect(createContact).toHaveBeenCalledTimes(1);
    expect(createContact).toHaveBeenCalledWith({
      name: "Asha Bora",
      email: "asha@example.com",
      phone: "98765 43210",
      orderNumber: "ORD-20250310-0001",
      category: "returns",
      subject: "Sofa delivery",
      message: "  When will my sofa set be delivered to Guwahati?  ",
    });
    expect(sendButton()).toHaveTextContent("Sending…");
    expect(sendButton()).toHaveAttribute("aria-disabled", "true");
    expect(sendButton()).not.toBeDisabled();

    await act(async () => {
      request.resolve({ id: 9 });
      await request.promise;
    });

    const panel = screen.getByRole("status");
    expect(panel).toHaveTextContent("Message sent.");
    expect(panel).toHaveTextContent("We reply during working hours.");
    expect(panel).toHaveFocus();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  test("Send another message: an empty form (the shopper's details kept), focus on its heading", async () => {
    useAuth.mockReturnValue({ user: { firstName: "John", lastName: "Doe", email: "user@example.com" } });
    createContact.mockResolvedValue({ id: 9 });
    renderAt("/support?order=ORD-1&category=returns");
    type(subjectField(), "Return a chair");
    type(messageField(), "The chair arrived with a scratch on the seat.");
    fireEvent.click(sendButton());
    await settle();
    expect(screen.getByRole("status")).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Send another message" }));
    await settle();
    expect(screen.getByRole("heading", { level: 2, name: "Send us a message" })).toHaveFocus();
    expect(nameField()).toHaveValue("John Doe");
    expect(emailField()).toHaveValue("user@example.com");
    expect(orderField()).toHaveValue("");
    expect(topicField()).toHaveValue("general");
    expect(subjectField()).toHaveValue("");
    expect(messageField()).toHaveValue("");
  });

  test("a failed request: the alert, the values kept, the button back", async () => {
    const request = deferred();
    createContact.mockReturnValue(request.promise);
    renderAt();
    fillValid();
    fireEvent.click(sendButton());

    const alert = screen.getByRole("alert");
    expect(alert).toBeEmptyDOMElement();
    await act(async () => {
      request.reject(new Error("Network Error"));
      await request.promise.catch(() => {});
    });
    expect(alert).toHaveTextContent(`We couldn’t send your message. Try again in a moment, or email us at ${SUPPORT_EMAIL}.`);
    expect(nameField()).toHaveValue("Asha Bora");
    expect(messageField()).toHaveValue("When will my sofa set be delivered to Guwahati?");
    expect(sendButton()).toHaveTextContent("Send message");
    expect(sendButton()).not.toHaveAttribute("aria-disabled");
    expect(screen.queryByText("Message sent.")).not.toBeInTheDocument();
  });

  test("a new attempt clears the old alert: while sending, and when a field now fails", async () => {
    const retry = deferred();
    createContact.mockRejectedValueOnce(new Error("Network Error")).mockReturnValueOnce(retry.promise);
    renderAt();
    fillValid();
    fireEvent.click(sendButton());
    await settle();
    expect(screen.getByRole("alert")).not.toBeEmptyDOMElement();

    // Sending again: the old failure goes at once.
    fireEvent.click(sendButton());
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    await act(async () => {
      retry.reject(new Error("Network Error"));
      await retry.promise.catch(() => {});
    });
    expect(screen.getByRole("alert")).not.toBeEmptyDOMElement();

    // A submit that fails validation clears it too.
    type(subjectField(), "");
    fireEvent.click(sendButton());
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    expect(createContact).toHaveBeenCalledTimes(2);

    // And a success replaces the form.
    createContact.mockResolvedValueOnce({ id: 1 });
    type(subjectField(), "Sofa delivery");
    fireEvent.click(sendButton());
    await settle();
    expect(screen.getByRole("status")).toHaveTextContent("Message sent.");
  });
});

test("field() helper sanity: labels are unique", () => {
  renderAt();
  expect(field("Full name")).toBe(nameField());
});
