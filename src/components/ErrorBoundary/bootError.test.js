import { screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { renderBootError } from "./bootError";

let root;
beforeEach(() => {
  root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);
  document.body.classList.remove("react-loaded");
});
afterEach(() => {
  root.remove();
});

test("an empty #root gets ErrorBoundary's crash screen, from the tokens' classes", () => {
  expect(renderBootError(root, "TypeError: x is not a function")).toBe(true);
  const alert = screen.getByRole("alert");
  expect(alert).toHaveClass("sf-boot-error");
  expect(within(alert).getByRole("heading", { level: 1, name: "Something went wrong." })).toBeInTheDocument();
  expect(
    within(alert).getByText("This page stopped working. Reload to try again, or start again from the home page.")
  ).toBeInTheDocument();
  expect(within(alert).getByRole("button", { name: "Reload" })).toHaveClass("sf-btn", "sf-btn--primary");
  expect(within(alert).getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  expect(within(alert).getByText("Error details")).toBeInTheDocument();
  expect(within(alert).getByText("TypeError: x is not a function")).toBeInTheDocument();
  // No inline colour or font: the page follows the saved theme through the tokens.
  expect(root.innerHTML).not.toMatch(/style=/);
});

test("the detail is text, never parsed as HTML", () => {
  renderBootError(root, '<img src="x" onerror="alert(1)">');
  expect(root.querySelector("img")).toBeNull(); // eslint-disable-line testing-library/no-node-access
  expect(screen.getByText('<img src="x" onerror="alert(1)">')).toBeInTheDocument();
});

test("releases the loading screen, which waits for react-loaded", () => {
  renderBootError(root, "boom");
  expect(document.body).toHaveClass("react-loaded");
});

test("no detail, no details line", () => {
  renderBootError(root, "");
  expect(screen.queryByText("Error details")).not.toBeInTheDocument();
});

test("changes nothing once React has rendered (or without a root)", () => {
  const app = document.createElement("main");
  root.appendChild(app);
  expect(renderBootError(root, "late error")).toBe(false);
  expect(root.childNodes).toHaveLength(1); // eslint-disable-line testing-library/no-node-access
  expect(renderBootError(null, "no root")).toBe(false);
});
