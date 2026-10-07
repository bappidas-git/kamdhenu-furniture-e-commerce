import { groupCategoryTree } from "./groupCategoryTree";

const cat = (id, name, parentId = null, extra = {}) => ({
  id,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  parentId,
  isActive: true,
  sortOrder: 1,
  showInMainMenu: false,
  menuOrder: 0,
  ...extra,
});

const names = (nodes) => nodes.map((n) => n.category.name);

test("departments follow the admin main menu (flag and menu order), not the tree", () => {
  const tree = groupCategoryTree([
    cat(1, "Plastic", null, { showInMainMenu: true, menuOrder: 2 }),
    cat(2, "Office", null, { showInMainMenu: true, menuOrder: 1 }),
    cat(3, "Hidden", null),
  ]);
  expect(names(tree)).toEqual(["Office", "Plastic"]);
});

test("groups are the department's children and links their descendants, in sort order", () => {
  const tree = groupCategoryTree([
    cat(1, "Plastic", null, { showInMainMenu: true, menuOrder: 1 }),
    cat(10, "Premium", 1, { sortOrder: 2 }),
    cat(11, "Essentials", 1, { sortOrder: 1 }),
    cat(12, "Sofas", 1, { sortOrder: 3 }),
    cat(20, "Tables", 11, { sortOrder: 2 }),
    cat(21, "Chairs", 11, { sortOrder: 1 }),
    cat(22, "Folding chairs", 21, { sortOrder: 1 }),
  ]);
  const [plastic] = tree;
  expect(names(plastic.groups)).toEqual(["Essentials", "Premium", "Sofas"]);
  const essentials = plastic.groups[0];
  expect(essentials.links.map((l) => [l.category.name, l.depth])).toEqual([
    ["Chairs", 1],
    ["Folding chairs", 2],
    ["Tables", 1],
  ]);
  // A group without children renders as a single link.
  expect(plastic.groups[2].links).toEqual([]);
});

test("a department without children is flat", () => {
  const tree = groupCategoryTree([
    cat(3, "Cafe chairs", null, { showInMainMenu: true, menuOrder: 1 }),
  ]);
  expect(tree[0].groups).toEqual([]);
});

test("inactive categories are left out at every level", () => {
  const tree = groupCategoryTree([
    cat(1, "Home", null, { showInMainMenu: true, menuOrder: 1 }),
    cat(2, "Archived", null, { showInMainMenu: true, menuOrder: 2, isActive: false }),
    cat(10, "Bedroom", 1),
    cat(11, "Old room", 1, { isActive: false, sortOrder: 2 }),
    cat(20, "Beds", 10),
    cat(21, "Cots", 10, { isActive: false, sortOrder: 2 }),
  ]);
  expect(names(tree)).toEqual(["Home"]);
  expect(names(tree[0].groups)).toEqual(["Bedroom"]);
  expect(tree[0].groups[0].links.map((l) => l.category.name)).toEqual(["Beds"]);
});

test("survives empty or malformed input and parent-id cycles", () => {
  expect(groupCategoryTree()).toEqual([]);
  expect(groupCategoryTree(null)).toEqual([]);
  const tree = groupCategoryTree([
    cat(1, "Loop", 2, { showInMainMenu: true, menuOrder: 1 }),
    cat(2, "Back", 1),
  ]);
  expect(names(tree)).toEqual(["Loop"]);
  expect(names(tree[0].groups)).toEqual(["Back"]);
  expect(tree[0].groups[0].links).toEqual([]);
});
