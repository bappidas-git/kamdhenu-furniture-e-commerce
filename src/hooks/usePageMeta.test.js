/* eslint-disable testing-library/no-node-access -- the hook writes <head>, which has no roles to query */
import React from "react";
import fs from "fs";
import path from "path";
import { act, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useNavigate } from "react-router-dom";
import usePageMeta, {
  formatPageTitle,
  restoreDefaultMeta,
  stripStoreName,
  toMetaDescription,
} from "./usePageMeta";
import {
  DEFAULT_PAGE_DESCRIPTION,
  DEFAULT_PAGE_TITLE,
  SITE_URL_PLACEHOLDER,
} from "../utils/constants";

// usePageMeta (Prompt 32): a page's document title, description and sharing
// tags while it is mounted, and index.html's defaults again once it unmounts.

const meta = (attribute, key) =>
  document.head.querySelector(`meta[${attribute}="${key}"]`)?.getAttribute("content");
const robots = () => document.head.querySelectorAll('meta[name="robots"]');

let navigate;
const Page = (props) => {
  navigate = useNavigate();
  usePageMeta(props);
  return null;
};

const renderPage = (props, initialPath = "/") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Page {...props} />
    </MemoryRouter>
  );

beforeEach(() => {
  document.head.innerHTML = "";
  restoreDefaultMeta();
});

describe("titles", () => {
  test("a page title takes the store's name after it", () => {
    expect(formatPageTitle("Help centre")).toBe("Help centre | A & S Urbanseat");
  });

  test("a title that already ends with the store's name keeps it once", () => {
    expect(formatPageTitle("Classic Plastic Armchair | A & S Urbanseat")).toBe(
      "Classic Plastic Armchair | A & S Urbanseat"
    );
    expect(stripStoreName("  Classic Plastic Armchair |  A & S Urbanseat ")).toBe(
      "Classic Plastic Armchair"
    );
  });

  test("no title is the default title", () => {
    expect(formatPageTitle("")).toBe(DEFAULT_PAGE_TITLE);
    expect(formatPageTitle(undefined)).toBe(DEFAULT_PAGE_TITLE);
  });
});

describe("descriptions", () => {
  test("text of 160 characters or fewer is kept as it is", () => {
    expect(toMetaDescription("  How to return a piece,\n what can be returned.  ")).toBe(
      "How to return a piece, what can be returned."
    );
  });

  test("longer text keeps its opening sentences that fit in 160 characters", () => {
    const text =
      "A & S Urbanseat makes and selects furniture for the places people spend their days: homes, offices, cafés and outdoor spaces. Some of what we sell is made in our own workshop.";
    expect(toMetaDescription(text)).toBe(
      "A & S Urbanseat makes and selects furniture for the places people spend their days: homes, offices, cafés and outdoor spaces."
    );
  });

  test("a first sentence over 160 characters is cut at a word, with an ellipsis", () => {
    const result = toMetaDescription(`${"chair ".repeat(40)}end.`);
    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith("chair…")).toBe(true);
  });
});

describe("the hook", () => {
  test("sets the title, the description and the sharing tags", () => {
    renderPage({ title: "Our story", description: "How we work." }, "/about");
    expect(document.title).toBe("Our story | A & S Urbanseat");
    expect(meta("name", "description")).toBe("How we work.");
    expect(meta("property", "og:title")).toBe("Our story");
    expect(meta("property", "og:description")).toBe("How we work.");
    expect(meta("property", "og:url")).toBe("http://localhost/about");
    expect(meta("name", "twitter:title")).toBe("Our story");
    expect(meta("name", "twitter:description")).toBe("How we work.");
    expect(meta("name", "twitter:url")).toBe("http://localhost/about");
  });

  test("the catalogue's metaTitle is not doubled, and og:title drops the store's name", () => {
    renderPage({ title: "Classic Plastic Armchair | A & S Urbanseat" });
    expect(document.title).toBe("Classic Plastic Armchair | A & S Urbanseat");
    expect(meta("property", "og:title")).toBe("Classic Plastic Armchair");
  });

  test("without a description the default one is used", () => {
    renderPage({ title: "Checkout" });
    expect(meta("name", "description")).toBe(DEFAULT_PAGE_DESCRIPTION);
  });

  test("og:url follows the route, query included and no hash", () => {
    renderPage({ title: "All furniture" }, "/products?category=sofas#top");
    expect(meta("property", "og:url")).toBe("http://localhost/products?category=sofas");
    act(() => navigate("/products?category=beds"));
    expect(meta("property", "og:url")).toBe("http://localhost/products?category=beds");
  });

  test("on unmount everything returns to index.html's defaults", () => {
    const { unmount } = renderPage({ title: "Our story", description: "How we work." }, "/about");
    unmount();
    expect(document.title).toBe(DEFAULT_PAGE_TITLE);
    expect(meta("name", "description")).toBe(DEFAULT_PAGE_DESCRIPTION);
    expect(meta("property", "og:title")).toBe(DEFAULT_PAGE_TITLE);
    expect(meta("property", "og:url")).toBe(SITE_URL_PLACEHOLDER);
    expect(meta("name", "twitter:url")).toBe(SITE_URL_PLACEHOLDER);
  });

  test("noindex adds a robots tag while the page is mounted, and only its own", () => {
    const { unmount, rerender } = renderPage({ title: "Page not found", noindex: true });
    expect(robots()).toHaveLength(1);
    expect(robots()[0]).toHaveAttribute("content", "noindex");
    rerender(
      <MemoryRouter>
        <Page title="Our story" />
      </MemoryRouter>
    );
    expect(robots()).toHaveLength(0);
    unmount();
    expect(robots()).toHaveLength(0);
  });

  test("a robots tag the document already had is left alone", () => {
    const existing = document.createElement("meta");
    existing.setAttribute("name", "robots");
    existing.setAttribute("content", "nofollow");
    document.head.appendChild(existing);
    const { unmount } = renderPage({ title: "Page not found", noindex: true });
    expect(robots()).toHaveLength(2);
    unmount();
    expect(robots()).toHaveLength(1);
    expect(robots()[0]).toBe(existing);
  });
});

test("the defaults equal public/index.html's static tags word for word", () => {
  const html = fs.readFileSync(path.join(__dirname, "../../public/index.html"), "utf8");
  const doc = new DOMParser().parseFromString(html, "text/html");
  const content = (selector) => doc.querySelector(selector).getAttribute("content");
  expect(doc.title).toBe(DEFAULT_PAGE_TITLE);
  expect(content('meta[name="description"]')).toBe(DEFAULT_PAGE_DESCRIPTION);
  expect(content('meta[property="og:title"]')).toBe(DEFAULT_PAGE_TITLE);
  expect(content('meta[property="og:description"]')).toBe(DEFAULT_PAGE_DESCRIPTION);
  expect(content('meta[property="og:url"]')).toBe(SITE_URL_PLACEHOLDER);
  expect(content('meta[name="twitter:title"]')).toBe(DEFAULT_PAGE_TITLE);
  expect(content('meta[name="twitter:description"]')).toBe(DEFAULT_PAGE_DESCRIPTION);
  expect(content('meta[name="twitter:url"]')).toBe(SITE_URL_PLACEHOLDER);
  expect(doc.documentElement.getAttribute("lang")).toBe("en-IN");
});
