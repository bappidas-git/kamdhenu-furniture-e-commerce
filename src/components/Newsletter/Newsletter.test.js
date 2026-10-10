import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../../services/api";
import { NEWSLETTER_LINE } from "../../content/brandContent";
import Newsletter from "./Newsletter";

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: { leads: { createNewsletter: jest.fn() } },
}));

const subscribe = apiService.leads.createNewsletter;

// A request the test resolves or rejects by hand.
const deferred = () => {
  const handle = {};
  handle.promise = new Promise((resolve, reject) => {
    handle.resolve = resolve;
    handle.reject = reject;
  });
  return handle;
};

const field = () => screen.getByRole("textbox", { name: "Email address" });
const form = () => screen.getByRole("form", { name: "Newsletter" });
const type = (value) => fireEvent.change(field(), { target: { value } });

afterEach(() => {
  jest.useRealTimers();
  subscribe.mockReset();
});

test("is a form named by its eyebrow heading, with the brand line and a labelled email field", () => {
  render(<Newsletter />);
  expect(form()).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "Newsletter" })).toBeInTheDocument();
  expect(screen.getByText(NEWSLETTER_LINE)).toBeInTheDocument();
  const input = field();
  expect(input).toHaveAttribute("type", "email");
  expect(input).toHaveAttribute("autocomplete", "email");
  expect(input).toHaveAttribute("inputmode", "email");
  expect(input).toHaveAttribute("placeholder", "name@example.com");
  expect(input).toBeRequired();
  expect(input).not.toHaveAttribute("aria-invalid");
  expect(screen.getByRole("button", { name: "Subscribe" })).toHaveAttribute("type", "submit");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});

test("an empty submit asks for an address and never calls the API", () => {
  render(<Newsletter />);
  fireEvent.submit(form());
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent(/^Enter your email address$/);
  expect(field()).toHaveAttribute("aria-invalid", "true");
  expect(field()).toHaveAttribute("aria-describedby", alert.id);
  expect(subscribe).not.toHaveBeenCalled();
});

test("a malformed address is kept and explained, and typing clears the error", () => {
  render(<Newsletter />);
  type("not-an-email");
  fireEvent.submit(form());
  expect(screen.getByRole("alert")).toHaveTextContent(/^Enter a valid email address, like name@example\.com$/);
  expect(field()).toHaveValue("not-an-email");
  expect(field()).toHaveAttribute("aria-invalid", "true");
  expect(subscribe).not.toHaveBeenCalled();

  type("not-an-email@");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(field()).not.toHaveAttribute("aria-invalid");
  expect(field()).not.toHaveAttribute("aria-describedby");
});

test("a valid address is trimmed and sent once; success is announced, then resets", async () => {
  jest.useFakeTimers();
  const request = deferred();
  subscribe.mockReturnValue(request.promise);
  render(<Newsletter />);

  type("  shopper@example.com  ");
  fireEvent.submit(form());
  fireEvent.submit(form());
  expect(subscribe).toHaveBeenCalledTimes(1);
  expect(subscribe).toHaveBeenCalledWith("shopper@example.com");
  // Sending: aria-disabled (never disabled, which would drop focus).
  const busyButton = screen.getByRole("button", { name: "Subscribing…" });
  expect(busyButton).toHaveAttribute("aria-disabled", "true");
  expect(busyButton).not.toBeDisabled();

  await act(async () => {
    request.resolve({ id: 9 });
  });
  expect(screen.getByRole("status")).toHaveTextContent("You’re on the list.");
  expect(field()).toHaveValue("");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Subscribe" })).not.toHaveAttribute("aria-disabled");

  act(() => {
    jest.advanceTimersByTime(6000);
  });
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});

test("a failed request keeps the address and says so, without marking the field invalid", async () => {
  subscribe.mockRejectedValue(new Error("Network Error"));
  render(<Newsletter />);
  type("shopper@example.com");
  await act(async () => {
    fireEvent.submit(form());
  });
  expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t add you to the list. Check your connection and try again.");
  expect(field()).toHaveValue("shopper@example.com");
  expect(field()).not.toHaveAttribute("aria-invalid");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  expect(screen.getByRole("button", { name: "Subscribe" })).not.toHaveAttribute("aria-disabled");
});

test("clears its reset timer on unmount and ignores a request that settles after it", async () => {
  jest.useFakeTimers();
  subscribe.mockResolvedValue({});
  const { unmount } = render(<Newsletter />);
  type("shopper@example.com");
  await act(async () => {
    fireEvent.submit(form());
  });
  expect(screen.getByRole("status")).toHaveTextContent("You’re on the list.");
  expect(jest.getTimerCount()).toBe(1);
  unmount();
  expect(jest.getTimerCount()).toBe(0);

  const request = deferred();
  subscribe.mockReturnValue(request.promise);
  const errors = jest.spyOn(console, "error").mockImplementation(() => {});
  const second = render(<Newsletter />);
  type("late@example.com");
  fireEvent.submit(form());
  second.unmount();
  await act(async () => {
    request.resolve({});
  });
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});
