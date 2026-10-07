import React, { useRef, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import BottomDrawer from "./BottomDrawer";
import { BottomDrawer as FromBarrel } from "../ui";

function Harness({ drawerProps = {}, withInitialFocus = false }) {
  const [open, setOpen] = useState(false);
  const applyRef = useRef(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Filters
      </button>
      <BottomDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        initialFocusRef={withInitialFocus ? applyRef : undefined}
        {...drawerProps}
      >
        <label>
          In stock only <input type="checkbox" />
        </label>
        <button type="button" ref={applyRef}>
          Apply
        </button>
      </BottomDrawer>
    </>
  );
}

const openDrawer = () => {
  const trigger = screen.getByRole("button", { name: "Filters" });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
};

afterEach(() => {
  document.body.style.overflow = "";
});

test("is exported from the ui barrel", () => {
  expect(FromBarrel).toBe(BottomDrawer);
});

test("renders nothing while closed", () => {
  render(<Harness />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("opens as a labelled modal dialog with focus on the close button and the page locked", () => {
  render(<Harness />);
  openDrawer();
  const dialog = screen.getByRole("dialog", { name: "Filters" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(screen.getByRole("heading", { level: 2, name: "Filters" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  expect(document.body.style.overflow).toBe("hidden");
  expect(dialog).toHaveStyle({ maxHeight: "80vh" });
});

test("ariaLabel names the dialog; initialFocusRef takes the first focus; maxHeight applies", () => {
  render(
    <Harness withInitialFocus drawerProps={{ ariaLabel: "Filter products", maxHeight: "90vh" }} />
  );
  openDrawer();
  const dialog = screen.getByRole("dialog", { name: "Filter products" });
  expect(screen.getByRole("button", { name: "Apply" })).toHaveFocus();
  expect(dialog).toHaveStyle({ maxHeight: "90vh" });
});

test("a node title names the dialog through aria-labelledby", () => {
  render(<Harness drawerProps={{ title: <span>Sort by</span> }} />);
  openDrawer();
  expect(screen.getByRole("dialog", { name: "Sort by" })).toHaveAttribute("aria-labelledby");
});

test("Escape closes it and focus returns to the trigger", async () => {
  render(<Harness />);
  const trigger = openDrawer();
  fireEvent.keyDown(screen.getByRole("button", { name: "Close" }), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
  expect(document.body.style.overflow).toBe("");
});

test("the close button and the backdrop close it", async () => {
  render(<Harness />);
  openDrawer();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

  openDrawer();
  fireEvent.click(document.querySelector(".backdrop"));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

test("Tab cycles inside the sheet", () => {
  render(<Harness drawerProps={{ footer: <button type="button">Show results</button> }} />);
  openDrawer();
  const close = screen.getByRole("button", { name: "Close" });
  const last = screen.getByRole("button", { name: "Show results" });
  last.focus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  expect(last).toHaveFocus();
});
