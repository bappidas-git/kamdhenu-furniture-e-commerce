import React, { useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useReducedMotion } from "framer-motion";
import { PLACEHOLDER_IMG } from "../../utils/helpers";
import ReviewModal from "./ReviewModal";

// The review dialog (prompts/DESIGN_SYSTEM.md §34.8), mounted the way Order
// History mounts it: an opener sets `open`, onClose clears it, and onSubmit
// is the page's request (here a mock), after which the page closes it.
jest.mock("framer-motion", () => ({
  ...jest.requireActual("framer-motion"),
  useReducedMotion: jest.fn(),
}));

const PRODUCT = {
  productId: 82,
  name: "4-Seater Plastic Dining Set - Marble Beige",
  image: "https://placehold.co/1200x1500/f1ebe1/686158?text=4-Seater+Plastic+Dining+Set",
};

const EXISTING = {
  id: 25,
  productId: 9,
  rating: 4,
  title: "Fits the hallway",
  body: "Light, sturdy and easy to wipe clean.",
  status: "approved",
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

let submit;

const Host = ({ existing = null, product = PRODUCT }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Rate &amp; review
      </button>
      {/* The host's own state: what the dialog asked for, before its exit animation. */}
      <span data-testid="open">{String(open)}</span>
      <ReviewModal
        open={open}
        onClose={() => setOpen(false)}
        product={product}
        existing={existing}
        onSubmit={async (values) => {
          await submit(values);
          setOpen(false);
        }}
        isDarkMode={false}
      />
    </>
  );
};

const renderHost = (props) => render(<Host {...props} />);

const open = () => {
  const opener = screen.getByRole("button", { name: "Rate & review" });
  opener.focus();
  fireEvent.click(opener);
  return { opener, dialog: screen.getByRole("dialog") };
};

const waitForClosed = () =>
  waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

const stars = (dialog) => within(dialog).getAllByRole("radio");
const star = (dialog, n) => within(dialog).getByRole("radio", { name: n === 1 ? "1 star" : `${n} stars` });
const submitButton = (dialog) =>
  within(dialog).getByRole("button", { name: /^(Submit review|Update review|Submitting…)$/ });

beforeEach(() => {
  useReducedMotion.mockReturnValue(false);
  submit = jest.fn(() => Promise.resolve());
});

afterEach(() => {
  document.body.style.overflow = "";
});

// ── The dialog ───────────────────────────────────────────────────────────────

test("renders nothing while closed", () => {
  renderHost();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("opens as a modal dialog on <body>, named by its heading and described by the piece", () => {
  const { container } = renderHost();
  const { dialog } = open();
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog).toHaveAccessibleName("Write a review");
  expect(dialog).toHaveAccessibleDescription(PRODUCT.name);
  expect(within(dialog).getByRole("heading", { level: 2, name: "Write a review" })).toBeInTheDocument();
  // Portalled: outside the component tree's container.
  expect(within(container).queryByRole("dialog")).not.toBeInTheDocument();
});

test("the thumbnail is decorative (the name is beside it) and falls back to the placeholder", () => {
  renderHost({ product: { ...PRODUCT, image: "" } });
  const { dialog } = open();
  // eslint-disable-next-line testing-library/no-node-access
  const image = dialog.querySelector("img");
  expect(image).toHaveAttribute("alt", "");
  expect(image).toHaveAttribute("src", PLACEHOLDER_IMG);
  expect(image).toHaveAttribute("width", "44");
});

test("focus starts on the first star and the page is locked; Escape closes and focus returns", async () => {
  renderHost();
  const { dialog, opener } = open();
  expect(star(dialog, 1)).toHaveFocus();
  expect(document.body.style.overflow).toBe("hidden");

  fireEvent.keyDown(star(dialog, 1), { key: "Escape" });
  await waitForClosed();
  expect(opener).toHaveFocus();
  expect(document.body.style.overflow).toBe("");
});

test("Close, Cancel and the backdrop each close the dialog", async () => {
  renderHost();
  let { dialog } = open();
  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  await waitForClosed();

  ({ dialog } = open());
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitForClosed();

  ({ dialog } = open());
  // The backdrop is the dialog's previous sibling: presentational, no role.
  // eslint-disable-next-line testing-library/no-node-access
  fireEvent.click(dialog.previousElementSibling);
  await waitForClosed();
});

test("Tab and Shift+Tab stay inside the dialog", () => {
  renderHost();
  const { dialog } = open();
  const close = within(dialog).getByRole("button", { name: "Close" });
  const last = submitButton(dialog);
  last.focus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  expect(last).toHaveFocus();
});

// ── The stars ───────────────────────────────────────────────────────────────

test("the stars are a required radio group named 'Your rating', with one tab stop", () => {
  renderHost();
  const { dialog } = open();
  const group = within(dialog).getByRole("radiogroup", { name: "Your rating" });
  expect(group).toHaveAttribute("aria-required", "true");
  expect(stars(dialog).map((radio) => radio.getAttribute("aria-label"))).toEqual([
    "1 star",
    "2 stars",
    "3 stars",
    "4 stars",
    "5 stars",
  ]);
  expect(stars(dialog).map((radio) => radio.tabIndex)).toEqual([0, -1, -1, -1, -1]);
  expect(stars(dialog).every((radio) => radio.getAttribute("aria-checked") === "false")).toBe(true);
});

test("a click chooses a star, which becomes the tab stop; the choice is shown in words", () => {
  renderHost();
  const { dialog } = open();
  fireEvent.click(star(dialog, 3));
  expect(star(dialog, 3)).toHaveAttribute("aria-checked", "true");
  expect(star(dialog, 3)).toHaveFocus();
  expect(stars(dialog).map((radio) => radio.tabIndex)).toEqual([-1, -1, 0, -1, -1]);
  expect(within(dialog).getByText("3 out of 5")).toBeInTheDocument();
});

test("arrow keys move and choose, wrapping; Home and End jump", () => {
  renderHost();
  const { dialog } = open();
  fireEvent.keyDown(star(dialog, 1), { key: "ArrowRight" });
  expect(star(dialog, 2)).toHaveFocus();
  expect(star(dialog, 2)).toHaveAttribute("aria-checked", "true");

  fireEvent.keyDown(star(dialog, 2), { key: "ArrowUp" });
  expect(star(dialog, 3)).toHaveAttribute("aria-checked", "true");

  fireEvent.keyDown(star(dialog, 3), { key: "End" });
  expect(star(dialog, 5)).toHaveFocus();
  fireEvent.keyDown(star(dialog, 5), { key: "ArrowRight" });
  expect(star(dialog, 1)).toHaveAttribute("aria-checked", "true");

  fireEvent.keyDown(star(dialog, 1), { key: "ArrowLeft" });
  expect(star(dialog, 5)).toHaveAttribute("aria-checked", "true");
  fireEvent.keyDown(star(dialog, 5), { key: "Home" });
  expect(star(dialog, 1)).toHaveFocus();
  expect(star(dialog, 1)).toHaveAttribute("aria-checked", "true");
});

test("submitting without a rating says so under the stars and sends nothing", () => {
  renderHost();
  const { dialog } = open();
  submitButton(dialog).focus();
  fireEvent.click(submitButton(dialog));

  const message = within(dialog).getByText("Please select a star rating.");
  const group = within(dialog).getByRole("radiogroup", { name: "Your rating" });
  expect(group).toHaveAttribute("aria-invalid", "true");
  expect(group).toHaveAccessibleDescription("Please select a star rating.");
  expect(message).toBeInTheDocument();
  expect(star(dialog, 1)).toHaveFocus();
  expect(submit).not.toHaveBeenCalled();

  // Choosing a star clears the message.
  fireEvent.click(star(dialog, 4));
  expect(within(dialog).queryByText("Please select a star rating.")).not.toBeInTheDocument();
  expect(group).not.toHaveAttribute("aria-invalid");
});

// ── Fields ──────────────────────────────────────────────────────────────────

test("title and review are optional, capped at 80 and 1000, with live counts in their descriptions", () => {
  renderHost();
  const { dialog } = open();
  const title = within(dialog).getByLabelText("Title (optional)");
  const body = within(dialog).getByLabelText("Review (optional)");
  expect(title).toHaveAttribute("maxLength", "80");
  expect(body).toHaveAttribute("maxLength", "1000");
  expect(title).toHaveAccessibleDescription("Sum it up in a line. 0 of 80 characters");
  expect(body).toHaveAccessibleDescription(
    "What did you like or dislike? How is the quality? 0 of 1000 characters"
  );
  expect(within(dialog).getByText("0/80")).toBeInTheDocument();

  fireEvent.change(title, { target: { value: "Fits the hallway" } });
  expect(within(dialog).getByText("16/80")).toBeInTheDocument();
  expect(title).toHaveAccessibleDescription("Sum it up in a line. 16 of 80 characters");
  fireEvent.change(body, { target: { value: "Sturdy." } });
  expect(within(dialog).getByText("7/1000")).toBeInTheDocument();
});

// ── Submitting ──────────────────────────────────────────────────────────────

test("submits the rating with the title and review trimmed, the old payload exactly", async () => {
  renderHost();
  const { dialog, opener } = open();
  fireEvent.click(star(dialog, 5));
  fireEvent.change(within(dialog).getByLabelText("Title (optional)"), { target: { value: "  Solid build  " } });
  fireEvent.change(within(dialog).getByLabelText("Review (optional)"), { target: { value: "\n Seats six. \n" } });
  fireEvent.click(submitButton(dialog));

  await waitForClosed();
  expect(submit).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledWith({ rating: 5, title: "Solid build", body: "Seats six." });
  expect(opener).toHaveFocus();
});

test("Enter in the title submits the form", async () => {
  renderHost();
  const { dialog } = open();
  fireEvent.click(star(dialog, 2));
  // Submitting the form is what Enter in a text field does.
  // eslint-disable-next-line testing-library/no-node-access
  fireEvent.submit(within(dialog).getByLabelText("Title (optional)").closest("form"));
  await waitForClosed();
  expect(submit).toHaveBeenCalledWith({ rating: 2, title: "", body: "" });
});

test("busy while the request runs: one request, and the dialog cannot be dismissed half-way", async () => {
  const request = deferred();
  submit = jest.fn(() => request.promise);
  renderHost();
  const { dialog } = open();
  fireEvent.click(star(dialog, 4));
  fireEvent.click(submitButton(dialog));

  const busy = submitButton(dialog);
  expect(busy).toHaveTextContent("Submitting…");
  expect(busy).toHaveAttribute("aria-disabled", "true");
  expect(busy).toHaveAttribute("data-busy", "true");
  expect(busy).not.toBeDisabled();

  fireEvent.click(busy);
  fireEvent.keyDown(busy, { key: "Escape" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  // eslint-disable-next-line testing-library/no-node-access
  fireEvent.click(dialog.previousElementSibling);
  expect(submit).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("open")).toHaveTextContent("true");
  expect(screen.getByRole("dialog")).toBeInTheDocument();

  await act(async () => request.resolve());
  await waitForClosed();
});

test("a failed request says so in an alert and keeps what was typed", async () => {
  submit = jest.fn(() => Promise.reject(new Error("Network Error")));
  renderHost();
  const { dialog } = open();
  expect(within(dialog).getByRole("alert")).toBeEmptyDOMElement();
  fireEvent.click(star(dialog, 3));
  fireEvent.change(within(dialog).getByLabelText("Title (optional)"), { target: { value: "Good" } });
  fireEvent.click(submitButton(dialog));

  await waitFor(() =>
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Something went wrong. Please try again.")
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(within(dialog).getByLabelText("Title (optional)")).toHaveValue("Good");
  expect(star(dialog, 3)).toHaveAttribute("aria-checked", "true");
  expect(submitButton(dialog)).toHaveTextContent("Submit review");
  expect(submitButton(dialog)).not.toHaveAttribute("aria-disabled");
});

// ── Opening again; editing ─────────────────────────────────────────────────────

test("each opening starts clean", async () => {
  renderHost();
  let { dialog } = open();
  fireEvent.click(star(dialog, 2));
  fireEvent.change(within(dialog).getByLabelText("Title (optional)"), { target: { value: "Draft" } });
  fireEvent.click(submitButton(dialog));
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitForClosed();

  ({ dialog } = open());
  expect(within(dialog).getByLabelText("Title (optional)")).toHaveValue("");
  expect(stars(dialog).every((radio) => radio.getAttribute("aria-checked") === "false")).toBe(true);
  expect(star(dialog, 1)).toHaveFocus();
});

test("editing: the review's values, the edit note, focus on its star, and 'Update review'", () => {
  renderHost({ existing: EXISTING });
  const { dialog } = open();
  expect(dialog).toHaveAccessibleName("Edit your review");
  expect(
    within(dialog).getByText(
      "Editing resubmits your review for approval before it shows on the product page."
    )
  ).toBeInTheDocument();
  expect(star(dialog, 4)).toHaveAttribute("aria-checked", "true");
  expect(star(dialog, 4)).toHaveFocus();
  expect(within(dialog).getByLabelText("Title (optional)")).toHaveValue(EXISTING.title);
  expect(within(dialog).getByLabelText("Review (optional)")).toHaveValue(EXISTING.body);
  expect(submitButton(dialog)).toHaveTextContent("Update review");
});

test("a new review has no edit note", () => {
  renderHost();
  const { dialog } = open();
  expect(within(dialog).queryByText(/Editing resubmits/)).not.toBeInTheDocument();
});
