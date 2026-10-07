// =============================================================================
// groupCategoryTree — the department → group → link structure of the main menu
// =============================================================================
//
// The header mega-menu renders from this, and the mobile sidebar accordion
// (Prompt 09) can reuse it so both menus always group categories the same way.
// It only reshapes the admin-managed category list; the rules themselves stay
// in src/utils/categories.js:
//   • departments = getMainMenuCategories() (flagged "Show in main menu",
//     active, ordered by menuOrder), so the admin decides what appears;
//   • siblings keep the order orderCategoriesHierarchically() gives them
//     (sortOrder, then name).
// =============================================================================

import {
  getMainMenuCategories,
  orderCategoriesHierarchically,
} from "../../utils/categories";

/**
 * Group a flat category list into the main-menu tree:
 *
 *   [{ category,                                  // a department
 *      groups: [{ category,                       // its direct children
 *                 links: [{ category, depth }] }] // the group's descendants,
 *   }]                                            // depth-first (1 = child)
 *
 * A department without groups is "flat" (it links straight to its listing);
 * a group without links renders as a single link. Inactive categories are
 * skipped, and a parent-id cycle can never loop.
 */
export const groupCategoryTree = (categories = []) => {
  const active = (Array.isArray(categories) ? categories : []).filter(
    (c) => c && c.isActive !== false
  );

  // Children per parent, in display order: the hierarchical order lists every
  // parent's children in their sorted order, so appending in that order keeps it.
  const childrenOf = new Map();
  orderCategoriesHierarchically(active).ordered.forEach((c) => {
    if (c.parentId == null) return;
    const key = String(c.parentId);
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key).push(c);
  });

  const collectLinks = (parent, depth, seen, links) => {
    (childrenOf.get(String(parent.id)) || []).forEach((child) => {
      if (seen.has(String(child.id))) return;
      seen.add(String(child.id));
      links.push({ category: child, depth });
      collectLinks(child, depth + 1, seen, links);
    });
    return links;
  };

  return getMainMenuCategories(active).map((department) => ({
    category: department,
    groups: (childrenOf.get(String(department.id)) || [])
      .filter((group) => String(group.id) !== String(department.id))
      .map((group) => ({
        category: group,
        links: collectLinks(
          group,
          1,
          new Set([String(department.id), String(group.id)]),
          []
        ),
      })),
  }));
};

export default groupCategoryTree;
