// =============================================================================
// bootError — what the page shows when the app fails before React renders
// =============================================================================
// index.js listens for an error, or an unhandled rejection, that arrives while
// #root is still empty: the bundle failing as it runs, a chunk that never
// loads. ErrorBoundary cannot catch those (React never mounted), so this
// writes the same crash screen into #root with plain DOM: the boundary's copy
// and actions, styled by the storefront's tokens (.sf-boot-error in index.css,
// loaded with the bundle) and the button primitives. No colour or font
// literal, so it follows the saved theme like the rest of the page.
//
// The error's message stays available in a collapsed "Error details" line, set
// as text, never parsed as HTML. The loading screen is released (the
// "react-loaded" class it waits for), so the message is not held behind it for
// the loader's 10-second safety net. Once React has rendered, #root has
// content and nothing here runs.
//
// Before Prompt 34 these handlers wrote red or orange monospace text and the
// raw stack on a hard-coded #1a1a2e panel, through innerHTML.
// =============================================================================

const node = (doc, tag, className, text) => {
  const element = doc.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
};

/**
 * Renders the crash screen into an empty `root`. Returns false (and changes
 * nothing) when `root` is missing or already has content.
 *   root    the #root element
 *   detail  the error's message (text), shown under "Error details"
 */
export const renderBootError = (root, detail) => {
  if (!root || root.hasChildNodes()) return false;
  const doc = root.ownerDocument;

  const page = node(doc, "div", "sf-boot-error");
  page.setAttribute("role", "alert");
  const card = node(doc, "div", "sf-boot-error__card");
  card.append(
    node(doc, "h1", "sf-boot-error__title", "Something went wrong."),
    node(
      doc,
      "p",
      "sf-boot-error__line",
      "This page stopped working. Reload to try again, or start again from the home page."
    )
  );

  const actions = node(doc, "div", "sf-boot-error__actions");
  const reload = node(doc, "button", "sf-btn sf-btn--primary", "Reload");
  reload.type = "button";
  reload.addEventListener("click", () => window.location.reload());
  const home = node(doc, "a", "sf-btn sf-btn--ghost", "Back to home");
  home.href = "/";
  actions.append(reload, home);
  card.append(actions);

  const text = detail == null ? "" : String(detail).trim();
  if (text) {
    const details = node(doc, "details", "sf-boot-error__details");
    details.append(node(doc, "summary", null, "Error details"), node(doc, "pre", null, text));
    card.append(details);
  }

  page.append(card);
  root.append(page);
  if (doc.body) doc.body.classList.add("react-loaded");
  return true;
};

export default renderBootError;
