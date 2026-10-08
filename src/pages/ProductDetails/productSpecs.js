// =============================================================================
// The product page's specifications table (Prompt 17)
// =============================================================================
// Rows, in order: the pairs parsed from the description's "Specifications:"
// paragraph (parseSpecifications in utils/helpers.js), then the rows the
// catalogue's own fields give: Brand (when set), SKU (the chosen variant's),
// Weight, Dimensions, Category and Tags. A field row is left out when it is
// empty, or when a parsed pair already has its name (compared without regard
// to case): the description's own wording wins.
//
// The admin records weight in kilograms and dimensions in centimetres
// (Admin → Products, "Inventory & Shipping"), so the units are added here.
// =============================================================================

const NUMBER = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

const positive = (value) => {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const sameKey = (key) => String(key).trim().replace(/\s+/g, " ").toLowerCase();

// "3.2 kg"; nothing for 0 or blank (the admin saves an empty field as 0).
export const formatWeight = (weight) => {
  const kilograms = positive(weight);
  return kilograms == null ? "" : `${NUMBER.format(kilograms)} kg`;
};

// "57 × 54 × 80 cm" (length × width × height). A record with only some of the
// three names the ones it has ("L 57 × H 80 cm"); an old free-text value is
// kept as written.
export const formatDimensions = (dimensions) => {
  if (typeof dimensions === "string") return dimensions.trim();
  if (!dimensions || typeof dimensions !== "object") return "";
  const sides = [
    ["L", positive(dimensions.length)],
    ["W", positive(dimensions.width)],
    ["H", positive(dimensions.height)],
  ];
  const known = sides.filter(([, value]) => value != null);
  if (known.length === 0) return "";
  if (known.length === sides.length) {
    return `${known.map(([, value]) => NUMBER.format(value)).join(" × ")} cm`;
  }
  return `${known.map(([side, value]) => `${side} ${NUMBER.format(value)}`).join(" × ")} cm`;
};

// Whole L × W × H records get the order spelled out beside the label.
const isWholeRecord = (dimensions) =>
  !!dimensions &&
  typeof dimensions === "object" &&
  [dimensions.length, dimensions.width, dimensions.height].every((value) => positive(value) != null);

const cleanTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  return tags
    .map((tag) => String(tag ?? "").trim())
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

/**
 * @param specs     [{ key, value }] from parseSpecifications
 * @param product   the product record
 * @param sku       the chosen variant's SKU (else the product's)
 * @param category  the product's category record, once read
 * @returns [{ key, value, hint?, tags? }] — `value` is text, or `tags` a list
 */
export const buildSpecRows = ({ specs = [], product = {}, sku = "", category = null } = {}) => {
  const rows = (Array.isArray(specs) ? specs : [])
    .filter((pair) => pair && String(pair.key || "").trim() && String(pair.value || "").trim())
    .map(({ key, value }) => ({ key: String(key).trim(), value: String(value).trim() }));
  const named = new Set(rows.map((row) => sameKey(row.key)));

  const add = (row, isEmpty) => {
    if (isEmpty || named.has(sameKey(row.key))) return;
    named.add(sameKey(row.key));
    rows.push(row);
  };
  const text = (value) => String(value ?? "").trim();

  add({ key: "Brand", value: text(product?.brand) }, !text(product?.brand));
  add({ key: "SKU", value: text(sku) }, !text(sku));
  const weight = formatWeight(product?.weight);
  add({ key: "Weight", value: weight }, !weight);
  const dimensions = formatDimensions(product?.dimensions);
  add(
    {
      key: "Dimensions",
      value: dimensions,
      ...(isWholeRecord(product?.dimensions) ? { hint: "L × W × H" } : {}),
    },
    !dimensions
  );
  add({ key: "Category", value: text(category?.name) }, !text(category?.name));
  const tags = cleanTags(product?.tags);
  add({ key: "Tags", tags }, tags.length === 0);

  return rows;
};
