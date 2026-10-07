// Editorial copy for the header mega-menu's feature panel, pending client
// approval. Replace values here, never inline copy in components.
//
// Keyed by the department's category slug; every field is optional:
//   eyebrow   a short label above the panel copy
//   line      replaces the department's description in the panel
//   ctaLabel  replaces the default "Shop all <Department>" link label
//
// Images never come from this module: the panel shows the department's own
// `image` (Admin → Categories), so photography stays admin-managed. The line
// defaults to the department's admin-managed description, so only add one here
// to say something the description does not. A department without an entry,
// or one whose slug changes, simply uses those defaults.
//
// The eyebrows below restate where each range is used, taken from the
// department descriptions; they make no claims (see prompts/BUILD_LOG.md,
// Prompt 07).

export const DEPARTMENT_FEATURES = {
  "plastic-furniture": { eyebrow: "Light and weather-ready" },
  "office-chairs": { eyebrow: "For the workday" },
  "cafe-restaurant-chairs": { eyebrow: "For cafés and dining rooms" },
  "outdoor-furniture": { eyebrow: "For verandas and lawns" },
  "home-furniture": { eyebrow: "For every room at home" },
  "office-tables-desks": { eyebrow: "For work and study" },
};

// The copy the feature panel shows for a department, overrides applied. An
// empty ctaLabel means "use the panel's default label" ("Shop all <Department>").
export const getDepartmentFeature = (department) => {
  const override = (department && DEPARTMENT_FEATURES[department.slug]) || {};
  return {
    eyebrow: override.eyebrow || "",
    line: override.line || (department && department.description) || "",
    ctaLabel: override.ctaLabel || "",
  };
};

const navigationContent = { DEPARTMENT_FEATURES, getDepartmentFeature };
export default navigationContent;
