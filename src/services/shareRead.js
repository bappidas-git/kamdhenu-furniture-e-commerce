// =============================================================================
// shareRead — one request where several callers start the same read at the
// same moment (Prompt 32)
// =============================================================================
// A call made while a read with the same key was started in the same moment
// (the code running now: one commit's effects, one function's calls) gets that
// request's promise instead of a request of its own. Nothing is cached: once
// the moment has passed, the next call reads again. Callers share the answer,
// so they must not change it in place.
//
// Used by sharedReads.js (the categories, settings and shipping methods the
// shell and the pages read on mount) and by api.js (the catalogue the product
// page's two recommendation reads both need). It imports nothing, so api.js
// can use it.
// =============================================================================

const started = new Map();

export const shareRead = (key, read) => {
  if (started.has(key)) return started.get(key);
  const request = new Promise((resolve) => resolve(read()));
  started.set(key, request);
  // The moment ends once the code running now has finished.
  Promise.resolve().then(() => started.delete(key));
  return request;
};

export default shareRead;
