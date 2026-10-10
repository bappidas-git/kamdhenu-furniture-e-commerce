// The pages fetched on their first visit (Prompt 32): a visit that starts on
// one asks for its chunk at once; any other address asks for nothing. In
// Jest, import() becomes a require on the next tick, so a page module's
// factory running is the chunk being fetched.

const mockLoaded = [];
jest.mock("./Checkout/Checkout", () => {
  mockLoaded.push("checkout");
  return { __esModule: true, default: () => null };
});
jest.mock("./OrderConfirmation/OrderConfirmation", () => {
  mockLoaded.push("order-confirmation");
  return { __esModule: true, default: () => null };
});
jest.mock("./PrivacyPolicy/PrivacyPolicy", () => {
  mockLoaded.push("privacy");
  return { __esModule: true, default: () => null };
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

let preloadPageFor;
beforeAll(() => {
  // The module preloads the address the test runner starts on ("/"): nothing.
  ({ preloadPageFor } = require("./lazyPages"));
});

beforeEach(() => {
  mockLoaded.length = 0;
});

test("the starting address of a lazy page fetches that page's chunk", async () => {
  preloadPageFor("/checkout");
  await settle();
  expect(mockLoaded).toEqual(["checkout"]);
});

test("route parameters match, as in App.js's routes", async () => {
  preloadPageFor("/order-confirmation/ORD-20261010-0001");
  await settle();
  expect(mockLoaded).toEqual(["order-confirmation"]);
});

test("pages in the main bundle, the admin and unknown addresses fetch nothing", async () => {
  ["/", "/products", "/products/teak-lounge-chair", "/admin", "/admin/orders", "/nonsense"].forEach(
    preloadPageFor
  );
  await settle();
  expect(mockLoaded).toEqual([]);
});

test("the lazy pages are React.lazy components", () => {
  const pages = require("./lazyPages");
  const lazyType = Symbol.for("react.lazy");
  [
    "Checkout",
    "OrderConfirmation",
    "OrderHistory",
    "Profile",
    "Wishlist",
    "SpecialOffers",
    "HelpCenter",
    "Support",
    "AboutUs",
    "PrivacyPolicy",
    "TermsOfService",
    "CookiePolicy",
    "RefundPolicy",
    "NotFound",
  ].forEach((name) => expect(pages[name].$$typeof).toBe(lazyType));
});
