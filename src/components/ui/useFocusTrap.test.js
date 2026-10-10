import React, { useRef } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import useFocusTrap, {
  getFocusableElements,
  useBodyScrollLock,
  useBodyScrollLocked,
} from "./useFocusTrap";

function Layer({ open, onClose, name = "Layer", initial = false, children }) {
  const ref = useRef(null);
  const initialRef = useRef(null);
  useFocusTrap(ref, {
    active: open,
    onEscape: onClose,
    initialFocusRef: initial ? initialRef : undefined,
  });
  useBodyScrollLock(open);
  if (!open) return null;
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-label={name}>
      <button type="button">{name} first</button>
      <button type="button" ref={initialRef}>
        {name} second
      </button>
      <button type="button" hidden>
        {name} hidden
      </button>
      <button type="button" disabled>
        {name} disabled
      </button>
      <a href="/somewhere">{name} last</a>
      {children}
    </div>
  );
}

function Page({ open, onClose, initial }) {
  return (
    <>
      <button type="button">Opener</button>
      <Layer open={open} onClose={onClose} initial={initial} />
      <button type="button">Page after</button>
    </>
  );
}

const tab = (shiftKey = false) => fireEvent.keyDown(document.activeElement, { key: "Tab", shiftKey });

afterEach(() => {
  document.body.style.overflow = "";
});

test("moves focus inside on open: the first focusable element, or initialFocusRef", () => {
  const { rerender } = render(<Page open={false} onClose={() => {}} />);
  screen.getByRole("button", { name: "Opener" }).focus();
  rerender(<Page open onClose={() => {}} />);
  expect(screen.getByRole("button", { name: "Layer first" })).toHaveFocus();

  rerender(<Page open={false} onClose={() => {}} />);
  rerender(<Page open onClose={() => {}} initial />);
  expect(screen.getByRole("button", { name: "Layer second" })).toHaveFocus();
});

test("Tab and Shift+Tab cycle inside, skipping hidden and disabled controls", () => {
  render(<Page open onClose={() => {}} />);
  const first = screen.getByRole("button", { name: "Layer first" });
  const last = screen.getByRole("link", { name: "Layer last" });

  last.focus();
  tab();
  expect(first).toHaveFocus();

  tab(true);
  expect(last).toHaveFocus();

  // Focus that fell back to <body> re-enters on Tab.
  last.blur();
  expect(document.body).toHaveFocus();
  tab();
  expect(first).toHaveFocus();
});

test("getFocusableElements lists only reachable controls, in order", () => {
  render(<Page open onClose={() => {}} />);
  const names = getFocusableElements(screen.getByRole("dialog")).map((el) => el.textContent);
  expect(names).toEqual(["Layer first", "Layer second", "Layer last"]);
  expect(getFocusableElements(null)).toEqual([]);
});

test("Escape calls onEscape, and only the most recently opened layer reacts", () => {
  const outerClose = jest.fn();
  const innerClose = jest.fn();
  const { rerender } = render(<Layer open name="Outer" onClose={outerClose} />);
  rerender(
    <Layer open name="Outer" onClose={outerClose}>
      <Layer open name="Inner" onClose={innerClose} />
    </Layer>
  );
  expect(screen.getByRole("button", { name: "Inner first" })).toHaveFocus();

  fireEvent.keyDown(document.activeElement, { key: "Escape" });
  expect(innerClose).toHaveBeenCalledTimes(1);
  expect(outerClose).not.toHaveBeenCalled();

  rerender(<Layer open name="Outer" onClose={outerClose} />);
  screen.getByRole("button", { name: "Outer first" }).focus();
  fireEvent.keyDown(document.activeElement, { key: "Escape" });
  expect(outerClose).toHaveBeenCalledTimes(1);
});

test("returns focus to the opener on close", () => {
  const { rerender } = render(<Page open={false} onClose={() => {}} />);
  const opener = screen.getByRole("button", { name: "Opener" });
  opener.focus();
  rerender(<Page open onClose={() => {}} />);
  expect(opener).not.toHaveFocus();
  rerender(<Page open={false} onClose={() => {}} />);
  expect(opener).toHaveFocus();
});

test("makes the rest of the page inert while open, but not a backdrop or SweetAlert, and lifts it on close", () => {
  const backdrop = document.createElement("div");
  backdrop.setAttribute("aria-hidden", "true");
  const toasts = document.createElement("div");
  toasts.className = "swal2-container";
  const elsewhere = document.createElement("div");
  elsewhere.setAttribute("inert", "");
  document.body.append(backdrop, toasts, elsewhere);
  try {
    const { rerender } = render(<Page open={false} onClose={() => {}} />);
    rerender(<Page open onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Opener" })).toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Page after" })).toHaveAttribute("inert");
    expect(screen.getByRole("dialog")).not.toHaveAttribute("inert");
    // The backdrop still takes the closing click; toasts are still announced.
    expect(backdrop).not.toHaveAttribute("inert");
    expect(toasts).not.toHaveAttribute("inert");

    rerender(<Page open={false} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Opener" })).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Page after" })).not.toHaveAttribute("inert");
    // Only what the trap made inert is lifted.
    expect(elsewhere).toHaveAttribute("inert");
  } finally {
    backdrop.remove();
    toasts.remove();
    elsewhere.remove();
  }
});

test("does not take focus back from a layer that focused itself in the meantime", () => {
  const { rerender } = render(<Page open={false} onClose={() => {}} />);
  screen.getByRole("button", { name: "Opener" }).focus();
  rerender(<Page open onClose={() => {}} />);
  const after = screen.getByRole("button", { name: "Page after" });
  after.focus();
  rerender(<Page open={false} onClose={() => {}} />);
  expect(after).toHaveFocus();
});

test("locks the body scroll while open and restores the previous value", () => {
  document.body.style.overflow = "auto";
  const { rerender } = render(<Page open onClose={() => {}} />);
  expect(document.body.style.overflow).toBe("hidden");
  rerender(<Page open={false} onClose={() => {}} />);
  expect(document.body.style.overflow).toBe("auto");
});

test("useBodyScrollLocked follows the body lock", async () => {
  const Probe = () => <p>{useBodyScrollLocked() ? "locked" : "free"}</p>;
  render(<Probe />);
  expect(screen.getByText("free")).toBeInTheDocument();
  // The observer reports in a microtask; an async act lets it settle.
  await act(async () => {
    document.body.style.overflow = "hidden";
  });
  await waitFor(() => expect(screen.getByText("locked")).toBeInTheDocument());
  await act(async () => {
    document.body.style.overflow = "";
  });
  await waitFor(() => expect(screen.getByText("free")).toBeInTheDocument());
});
