import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  APP_NAME,
  DEFAULT_PAGE_DESCRIPTION,
  DEFAULT_PAGE_TITLE,
  SITE_URL_PLACEHOLDER,
} from "../utils/constants";

// =============================================================================
// usePageMeta — a storefront page's title, description and sharing tags
// =============================================================================
//
//   usePageMeta({ title, description, noindex })
//
// While the page is mounted:
//   document.title             "<title> | A & S Urbanseat". A title that
//                              already ends with " | A & S Urbanseat" (the
//                              catalogue's metaTitle) is used as it is; no
//                              title keeps the default.
//   meta description           `description`, else the default. Text over
//                              160 characters (about what a search result
//                              shows) keeps its opening sentences, or is cut
//                              at a word with an ellipsis.
//   og:title, twitter:title    the title without the store's name
//                              (og:site_name already carries it)
//   og:description,            as the meta description
//   twitter:description
//   og:url, twitter:url        this page's address from window.location
//                              (origin, path and query, no hash), so a route
//                              change updates it
//   meta robots "noindex"      only with `noindex`: the soft 404s (the 404
//                              page, a product or an order that does not
//                              exist; the app answers 200 for any URL) and
//                              search results. The hook's own tag, removed
//                              again on unmount.
// A tag missing from the document is created. On unmount everything goes back
// to the defaults in src/utils/constants.js, which equal public/index.html's
// static tags: a route that calls nothing (the admin) keeps the document as
// index.html shipped it. Call it once per page, from the page component.
//
// Crawlers that run JavaScript (Google) read these tags. Link previews
// (WhatsApp, Facebook, X) do not run it and only ever see index.html's static
// tags: per-page previews need prerendering or server rendering, which Create
// React App does not do.
// =============================================================================

const TITLE_SUFFIX = ` | ${APP_NAME}`;
const DESCRIPTION_MAX = 160;
// Marks the robots tag this hook adds, so it never removes one it did not add.
const OWN_TAG = "data-page-meta";

const clean = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

/** "Classic Plastic Armchair | A & S Urbanseat" → "Classic Plastic Armchair". */
export const stripStoreName = (title) => {
  const text = clean(title);
  return text.endsWith(TITLE_SUFFIX) ? text.slice(0, -TITLE_SUFFIX.length).trim() : text;
};

/** A description of at most 160 characters: whole sentences, else cut at a word. */
export const toMetaDescription = (text) => {
  const value = clean(text);
  if (value.length <= DESCRIPTION_MAX) return value;
  let kept = "";
  for (const sentence of value.match(/[^.!?]+[.!?]+(?=\s|$)/g) || []) {
    const next = `${kept} ${sentence.trim()}`.trim();
    if (next.length > DESCRIPTION_MAX) break;
    kept = next;
  }
  if (kept) return kept;
  const cut = value.slice(0, DESCRIPTION_MAX);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:–-]+$/, "")}…`;
};

/** The document title for a page title: "<title> | A & S Urbanseat", or the default. */
export const formatPageTitle = (title) => {
  const name = stripStoreName(title);
  return name ? `${name}${TITLE_SUFFIX}` : DEFAULT_PAGE_TITLE;
};

const findMeta = (attribute, key) => document.head.querySelector(`meta[${attribute}="${key}"]`);

const setMeta = (attribute, key, content) => {
  let tag = findMeta(attribute, key);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const setNoindex = (noindex) => {
  const own = document.head.querySelector(`meta[name="robots"][${OWN_TAG}]`);
  if (!noindex) {
    if (own) own.remove();
    return;
  }
  if (own) return;
  const tag = document.createElement("meta");
  tag.setAttribute("name", "robots");
  tag.setAttribute("content", "noindex");
  tag.setAttribute(OWN_TAG, "");
  document.head.appendChild(tag);
};

const applyMeta = ({ title, shareTitle, description, url, noindex }) => {
  document.title = title;
  setMeta("name", "description", description);
  setMeta("property", "og:title", shareTitle);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", url);
  setMeta("name", "twitter:title", shareTitle);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:url", url);
  setNoindex(noindex);
};

/** Puts the document back as public/index.html ships it. */
export const restoreDefaultMeta = () =>
  applyMeta({
    title: DEFAULT_PAGE_TITLE,
    shareTitle: DEFAULT_PAGE_TITLE,
    description: DEFAULT_PAGE_DESCRIPTION,
    url: SITE_URL_PLACEHOLDER,
    noindex: false,
  });

const usePageMeta = ({ title, description, noindex = false } = {}) => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const name = stripStoreName(title);
    applyMeta({
      title: formatPageTitle(name),
      shareTitle: name || DEFAULT_PAGE_TITLE,
      description: toMetaDescription(description) || DEFAULT_PAGE_DESCRIPTION,
      url: `${window.location.origin}${pathname}${search}`,
      noindex: Boolean(noindex),
    });
    return restoreDefaultMeta;
  }, [title, description, noindex, pathname, search]);
};

export default usePageMeta;
