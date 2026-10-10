import React from "react";
import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useNavigate } from "react-router-dom";
import PageTransition from "./PageTransition";

// The page fade: <main> fades in (opacity only, 240ms, ease-out) when the
// path changes; never on the first page, never for a replace that only
// corrects the URL, never for a search change. jsdom has no Web Animations
// API, so element.animate is stood in for.

let navigate;
const NavigateProbe = () => {
  navigate = useNavigate();
  return null;
};

let fades;
let cancels;
beforeEach(() => {
  fades = [];
  cancels = 0;
  Element.prototype.animate = function animate(keyframes, timing) {
    fades.push({ element: this, keyframes, timing });
    return {
      cancel: () => {
        cancels += 1;
      },
    };
  };
});

afterEach(() => {
  delete Element.prototype.animate;
});

const renderAt = (path, props = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PageTransition className="main-content" {...props}>
        <p>The page</p>
      </PageTransition>
      <NavigateProbe />
    </MemoryRouter>
  );

test("renders the page area: a <main> with the props it is given", () => {
  renderAt("/", { id: "main-content" });
  const main = screen.getByRole("main");
  expect(main).toHaveClass("main-content");
  expect(main).toHaveAttribute("id", "main-content");
  expect(main).toHaveTextContent("The page");
});

test("the first page paints at once, without a fade", () => {
  renderAt("/");
  expect(fades).toHaveLength(0);
});

test("a new path fades the page in: opacity only, over 240ms with the ease-out curve", () => {
  renderAt("/");
  act(() => navigate("/products"));
  expect(fades).toHaveLength(1);
  expect(fades[0].element).toBe(screen.getByRole("main"));
  expect(fades[0].keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
  expect(fades[0].timing).toEqual({ duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
});

test("back and forward fade as well", () => {
  renderAt("/");
  act(() => navigate("/about"));
  act(() => navigate(-1));
  expect(fades).toHaveLength(2);
});

test("a replace that only corrects the URL does not fade a second time", () => {
  renderAt("/");
  act(() => navigate("/products/11"));
  act(() => navigate("/products/covered-plastic-shoe-rack", { replace: true }));
  expect(fades).toHaveLength(1);
});

test("search and hash changes on the same path never fade", () => {
  renderAt("/products");
  act(() => navigate("/products?category=office-chairs"));
  act(() => navigate("/products?category=office-chairs#results"));
  expect(fades).toHaveLength(0);
});

test("a new fade cancels one still running", () => {
  renderAt("/");
  act(() => navigate("/products"));
  act(() => navigate("/about"));
  expect(fades).toHaveLength(2);
  expect(cancels).toBe(1);
});

test("without the Web Animations API the page simply shows", () => {
  delete Element.prototype.animate;
  renderAt("/");
  expect(() => act(() => navigate("/products"))).not.toThrow();
  expect(screen.getByRole("main")).toHaveTextContent("The page");
});

test("`as` renders another element", () => {
  renderAt("/", { as: "div", "data-testid": "page" });
  expect(screen.queryByRole("main")).not.toBeInTheDocument();
  expect(screen.getByTestId("page").tagName).toBe("DIV");
});
