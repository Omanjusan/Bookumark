import test from "node:test";
import assert from "node:assert/strict";

import {
  migrateLegacyOrder,
  orderDirectFolderContents,
  reconcileFolderOrders,
  replaceFolderOrderSubset,
} from "../dist/panel/lib/folder-order.js";

const tree = [
  { kind: "folder", guid: "root", parentGuid: null, index: 0, title: "Root" },
  { kind: "folder", guid: "folder", parentGuid: "root", index: 0, title: "Folder" },
  { kind: "bookmark", guid: "root-link", parentGuid: "root", index: 1, title: "Root link", url: "https://root.example" },
  { kind: "bookmark", guid: "a", parentGuid: "folder", index: 0, title: "A", url: "https://a.example" },
  { kind: "bookmark", guid: "b", parentGuid: "folder", index: 1, title: "B", url: "https://b.example" },
  { kind: "folder", guid: "empty", parentGuid: "root", index: 2, title: "Empty" },
];

test("migrates the legacy global order into parent folder orders", () => {
  assert.deepEqual(migrateLegacyOrder(["b", "root-link", "a"], tree), {
    root: ["root-link", "folder", "empty"],
    folder: ["b", "a"],
    empty: [],
  });
});

test("migration removes duplicates and ignores unknown legacy GUIDs", () => {
  assert.deepEqual(migrateLegacyOrder(["b", "missing", "b", "a"], tree), {
    root: ["folder", "root-link", "empty"],
    folder: ["b", "a"],
    empty: [],
  });
});

test("reconcile appends new items and removes deleted items", () => {
  const saved = {
    root: ["deleted", "root-link", "folder"],
    folder: ["b", "a"],
    deletedFolder: ["orphan"],
  };

  assert.deepEqual(reconcileFolderOrders(saved, tree), {
    orders: {
      root: ["root-link", "folder", "empty"],
      folder: ["b", "a"],
      empty: [],
    },
    changed: true,
  });
});

test("reconcile moves an externally relocated item to its new parent", () => {
  const movedTree = tree.map((item) => item.guid === "b"
    ? { ...item, parentGuid: "root", index: 3 }
    : item);

  assert.deepEqual(reconcileFolderOrders({
    root: ["folder", "root-link", "empty"],
    folder: ["b", "a"],
    empty: [],
  }, movedTree).orders, {
    root: ["folder", "root-link", "empty", "b"],
    folder: ["a"],
    empty: [],
  });
});

test("reconcile is idempotent when saved orders already match", () => {
  const orders = migrateLegacyOrder(["b", "root-link", "a"], tree);

  assert.deepEqual(reconcileFolderOrders(orders, tree), {
    orders,
    changed: false,
  });
});

test("orders direct folder contents without mixing folders and bookmarks", () => {
  const contents = {
    folders: tree.filter((item) => item.parentGuid === "root" && item.kind === "folder"),
    bookmarks: tree.filter((item) => item.parentGuid === "root" && item.kind === "bookmark"),
  };

  const result = orderDirectFolderContents(contents, ["empty", "root-link", "folder"]);

  assert.deepEqual(result.folders.map(({ guid }) => guid), ["empty", "folder"]);
  assert.deepEqual(result.bookmarks.map(({ guid }) => guid), ["root-link"]);
});

test("replaces only the reordered subset while preserving folder positions", () => {
  assert.deepEqual(
    replaceFolderOrderSubset(["folder-a", "a", "folder-b", "b", "c"], ["c", "a", "b"]),
    ["folder-a", "c", "folder-b", "a", "b"],
  );
});

test("folder order operations do not mutate their inputs", () => {
  const saved = { root: ["root-link", "folder", "empty"] };
  const savedBefore = structuredClone(saved);
  const treeBefore = structuredClone(tree);

  reconcileFolderOrders(saved, tree);

  assert.deepEqual(saved, savedBefore);
  assert.deepEqual(tree, treeBefore);
});
