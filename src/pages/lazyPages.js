import { lazy } from "react";
import { matchPath } from "react-router-dom";

// =============================================================================
// The storefront pages that load on their first visit (Prompt 32)
// =============================================================================
// Home, the listing and the product page are in the main bundle: most visits
// start on them. The pages below are each split into a chunk of their own
// (static/js/page-*.chunk.js, with its CSS), fetched the first time a page is
// shown; until it arrives, <main> shows PageFallback (LazyPage.js) and the
// header, footer and bottom bar stay as they are. A page already fetched
// shows at once on every later visit, Back and Forward included. The admin's
// pages are not here: they stay in the main bundle, as before.
//
// A visit that starts on one of these pages (a reload, a bookmarked
// /checkout, an emailed order link) asks for its chunk as soon as this module
// is evaluated: index.js imports it before the app, so the chunk downloads
// while the main bundle is still being evaluated instead of after the app's
// first render. The route paths here must match App.js's <Route>s.
// =============================================================================

const pages = [];

const lazyPage = (path, load) => {
  if (path) pages.push({ path, load });
  return lazy(load);
};

export const Checkout = lazyPage("/checkout", () =>
  import(/* webpackChunkName: "page-checkout" */ "./Checkout/Checkout")
);
export const OrderConfirmation = lazyPage("/order-confirmation/:orderNumber", () =>
  import(/* webpackChunkName: "page-order-confirmation" */ "./OrderConfirmation/OrderConfirmation")
);
export const OrderHistory = lazyPage("/orders", () =>
  import(/* webpackChunkName: "page-orders" */ "./OrderHistory/OrderHistory")
);
export const Profile = lazyPage("/profile", () =>
  import(/* webpackChunkName: "page-profile" */ "./Profile/Profile")
);
export const Wishlist = lazyPage("/wishlist", () =>
  import(/* webpackChunkName: "page-wishlist" */ "./Wishlist/Wishlist")
);
export const SpecialOffers = lazyPage("/special-offers", () =>
  import(/* webpackChunkName: "page-offers" */ "./SpecialOffers/SpecialOffers")
);
export const HelpCenter = lazyPage("/help", () =>
  import(/* webpackChunkName: "page-help" */ "./HelpCenter/HelpCenter")
);
export const Support = lazyPage("/support", () =>
  import(/* webpackChunkName: "page-support" */ "./Support/Support")
);
export const AboutUs = lazyPage("/about", () =>
  import(/* webpackChunkName: "page-about" */ "./AboutUs/AboutUs")
);
// The four policies share PolicyPage and legalContent.js: one chunk.
export const PrivacyPolicy = lazyPage("/privacy", () =>
  import(/* webpackChunkName: "page-policies" */ "./PrivacyPolicy/PrivacyPolicy")
);
export const TermsOfService = lazyPage("/terms", () =>
  import(/* webpackChunkName: "page-policies" */ "./TermsOfService/TermsOfService")
);
export const CookiePolicy = lazyPage("/cookies", () =>
  import(/* webpackChunkName: "page-policies" */ "./CookiePolicy/CookiePolicy")
);
export const RefundPolicy = lazyPage("/refund", () =>
  import(/* webpackChunkName: "page-policies" */ "./RefundPolicy/RefundPolicy")
);
// Any other URL: no path of its own to fetch it for early.
export const NotFound = lazyPage(null, () =>
  import(/* webpackChunkName: "page-not-found" */ "./NotFound/NotFound")
);

/** Starts fetching the chunk of the lazy page at `pathname`, if there is one. */
export const preloadPageFor = (pathname) => {
  const page = pages.find(({ path }) => matchPath(path, pathname));
  // A failure here is not reported: the page asks again when it renders, and
  // LazyPageBoundary shows the failure then if it happens again.
  if (page) page.load().catch(() => {});
};

if (typeof window !== "undefined") preloadPageFor(window.location.pathname);
