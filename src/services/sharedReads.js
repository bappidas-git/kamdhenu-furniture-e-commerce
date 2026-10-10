import apiService from "./api";

// =============================================================================
// sharedReads — one request where several parts of a page read the same thing
// at the same moment (Prompt 32)
// =============================================================================
// On a page load the header, the footer, the page itself and the assurance
// strip each read the categories, the store settings or the shipping methods
// as they mount: before this, the home page asked for the categories three
// times and for the settings and shipping methods twice. A read made through
// these helpers while the same read was started in the same moment (the
// effects of one render run together) gets that request's answer instead of a
// request of its own.
//
// Nothing is cached: once the moment has passed, the next read (the header's
// refetch when the tab regains focus, a drawer opening, the next page) asks
// the API again, exactly as before. The calls and their answers are the
// apiService ones, unchanged. Several components receive the same answer, so
// they must not change it in place (none does: they filter and sort copies).
// =============================================================================

const started = new Map();

export const shareRead = (key, read) => {
  if (started.has(key)) return started.get(key);
  const request = new Promise((resolve) => resolve(read()));
  started.set(key, request);
  // The moment ends once the code running now has finished (one commit's
  // effects, all run in one go).
  Promise.resolve().then(() => started.delete(key));
  return request;
};

export const readCategories = () =>
  shareRead("categories", () => apiService.categories.getAll());

export const readSettings = () => shareRead("settings", () => apiService.settings.get());

export const readShippingMethods = () =>
  shareRead("shipping-methods", () => apiService.shipping.getMethods());
