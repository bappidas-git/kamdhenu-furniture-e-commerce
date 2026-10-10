import React from "react";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import ScrollToTop, { holdSmoothScrollOff, scrollToTopNow } from "./ScrollToTop";

// Route changes land at the top at once ("instant", which the root's smooth
// scroll-behavior cannot animate); back and forward leave the position to the
// browser's restoration, with the smooth rule held off meanwhile; the admin's
// routes keep their old scroll.

let navigate;
const NavigateProbe = () => {
  navigate = useNavigate();
  return null;
};

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ScrollToTop />
      <NavigateProbe />
    </MemoryRouter>
  );

const INSTANT = { top: 0, left: 0, behavior: "instant" };

beforeEach(() => {
  window.scrollTo = jest.fn();
});

afterEach(() => {
  document.documentElement.style.scrollBehavior = "";
});

test("the first page starts at the top, at once", () => {
  renderAt("/products");
  expect(window.scrollTo).toHaveBeenCalledTimes(1);
  expect(window.scrollTo).toHaveBeenCalledWith(INSTANT);
});

test("every new path starts at the top, at once", () => {
  renderAt("/");
  window.scrollTo.mockClear();
  act(() => navigate("/products"));
  expect(window.scrollTo).toHaveBeenCalledTimes(1);
  expect(window.scrollTo).toHaveBeenLastCalledWith(INSTANT);
  act(() => navigate("/products/lobby-set"));
  expect(window.scrollTo).toHaveBeenCalledTimes(2);
  expect(window.scrollTo).toHaveBeenLastCalledWith(INSTANT);
});

test("back and forward leave the position to the browser's restoration", () => {
  renderAt("/");
  act(() => navigate("/products"));
  window.scrollTo.mockClear();
  act(() => navigate(-1));
  act(() => navigate(1));
  expect(window.scrollTo).not.toHaveBeenCalled();
});

test("on popstate the smooth rule is held off for the restore, then given back", () => {
  jest.useFakeTimers();
  try {
    renderAt("/");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(document.documentElement.style.scrollBehavior).toBe("auto");
    act(() => jest.advanceTimersByTime(999));
    expect(document.documentElement.style.scrollBehavior).toBe("auto");
    act(() => jest.advanceTimersByTime(1));
    expect(document.documentElement.style.scrollBehavior).toBe("");
  } finally {
    jest.useRealTimers();
  }
});

test("the hold can be released early, and leaves an inline value it did not set alone", () => {
  const release = holdSmoothScrollOff();
  expect(document.documentElement.style.scrollBehavior).toBe("auto");
  release();
  expect(document.documentElement.style.scrollBehavior).toBe("");

  const releaseLater = holdSmoothScrollOff();
  document.documentElement.style.scrollBehavior = "smooth";
  releaseLater();
  expect(document.documentElement.style.scrollBehavior).toBe("smooth");
});

test("a search or hash change on the same path leaves the scroll alone", () => {
  renderAt("/products");
  window.scrollTo.mockClear();
  act(() => navigate("/products?category=office-chairs"));
  act(() => navigate("/products?category=office-chairs#results"));
  act(() => navigate("/products?sort=newest", { replace: true }));
  expect(window.scrollTo).not.toHaveBeenCalled();
});

test("a replace that only corrects the URL (the legacy product redirect) does not scroll again", () => {
  renderAt("/products/11");
  window.scrollTo.mockClear();
  act(() => navigate("/products/covered-plastic-shoe-rack", { replace: true }));
  expect(window.scrollTo).not.toHaveBeenCalled();
  act(() => navigate("/products/lobby-set"));
  expect(window.scrollTo).toHaveBeenCalledWith(INSTANT);
});

test("a browser that refuses 'instant' gets (0, 0) with smooth scrolling held off for the call", () => {
  let behaviourDuringCall;
  window.scrollTo = jest.fn((options) => {
    if (typeof options === "object") throw new TypeError("not a valid enum value");
    behaviourDuringCall = document.documentElement.style.scrollBehavior;
  });
  document.documentElement.style.scrollBehavior = "";
  scrollToTopNow();
  expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
  expect(behaviourDuringCall).toBe("auto");
  expect(document.documentElement.style.scrollBehavior).toBe("");
});

test("the admin's routes keep their old scroll: (0, 0) on every path", () => {
  renderAt("/admin/dashboard");
  expect(window.scrollTo).toHaveBeenCalledTimes(1);
  expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  window.scrollTo.mockClear();
  act(() => navigate("/admin/orders"));
  expect(window.scrollTo).toHaveBeenCalledTimes(1);
  expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
});

test("back from the admin to the same storefront path, the page starts at the top again", () => {
  renderAt("/");
  act(() => navigate("/admin"));
  window.scrollTo.mockClear();
  act(() => navigate("/"));
  expect(window.scrollTo).toHaveBeenCalledTimes(1);
  expect(window.scrollTo).toHaveBeenCalledWith(INSTANT);
});
