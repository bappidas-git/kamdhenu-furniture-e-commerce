import { useEffect } from "react";

// =============================================================================
// useStructuredData — one JSON-LD block in <head> while a page is mounted
// =============================================================================
//
//   useStructuredData(data, name)
//
// Adds <script type="application/ld+json" data-structured-data="<name>"> with
// `data` (a plain schema.org object) to <head>, replaces it when the data
// changes and removes it on unmount. `null` adds nothing. The JSON is compared
// as text, so a new object with the same content changes nothing in the DOM.
// "<" is written as <, so no value from the catalogue can close the
// script element early.
// =============================================================================

export const serializeStructuredData = (data) =>
  data ? JSON.stringify(data).replace(/</g, "\\u003c") : "";

const useStructuredData = (data, name = "page") => {
  const json = serializeStructuredData(data);

  useEffect(() => {
    if (!json) return undefined;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-structured-data", name);
    script.textContent = json;
    document.head.appendChild(script);
    return () => script.remove();
  }, [json, name]);
};

export default useStructuredData;
