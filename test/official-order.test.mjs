import test from "node:test";
import assert from "node:assert/strict";

import {
  planOfficialFolderMove,
  planOfficialSiblingMove,
} from "../dist/panel/lib/official-order.js";

const items = [
  { kind: "folder", guid: "root", parentGuid: null, index: 0, title: "Root" },
  { kind: "folder", guid: "container", parentGuid: "root", index: 0, title: "Container" },
  { kind: "bookmark", guid: "a", parentGuid: "container", index: 1, title: "A", url: "https://a.example" },
  { kind: "bookmark", guid: "b", parentGuid: "container", index: 3, title: "B", url: "https://b.example" },
  { kind: "bookmark", guid: "other", parentGuid: "other-folder", index: 0, title: "Other", url: "https://other.example" },
];

test("plans an absolute first-position move with index zero", () => {
  assert.deepEqual(planOfficialSiblingMove(items, {
    fromGuid: "b",
    toGuid: "a",
    placement: "start",
  }), {
    guid: "b",
    destination: { parentId: "container", index: 0 },
  });
});

test("plans an absolute last-position move by omitting index", () => {
  assert.deepEqual(planOfficialSiblingMove(items, {
    fromGuid: "a",
    toGuid: "b",
    placement: "end",
  }), {
    guid: "a",
    destination: { parentId: "container" },
  });
});

test("uses the target index for before and target index plus one for after", () => {
  assert.deepEqual(planOfficialSiblingMove(items, {
    fromGuid: "b",
    toGuid: "a",
    placement: "before",
  }), {
    guid: "b",
    destination: { parentId: "container", index: 1 },
  });
  assert.deepEqual(planOfficialSiblingMove(items, {
    fromGuid: "a",
    toGuid: "b",
    placement: "after",
  }), {
    guid: "a",
    destination: { parentId: "container", index: 4 },
  });
});

test("rejects missing items, different parents, roots, and self drops", () => {
  assert.throws(() => planOfficialSiblingMove(items, {
    fromGuid: "missing", toGuid: "a", placement: "before",
  }), /not found/);
  assert.throws(() => planOfficialSiblingMove(items, {
    fromGuid: "a", toGuid: "other", placement: "before",
  }), /same parent/);
  assert.throws(() => planOfficialSiblingMove(items, {
    fromGuid: "root", toGuid: "root", placement: "start",
  }), /root/);
  assert.equal(planOfficialSiblingMove(items, {
    fromGuid: "a", toGuid: "a", placement: "before",
  }), null);
});

test("does not mutate tree items", () => {
  const before = structuredClone(items);
  planOfficialSiblingMove(items, { fromGuid: "a", toGuid: "b", placement: "after" });
  assert.deepEqual(items, before);
});

test("plans moving a bookmark or folder into a destination folder", () => {
  const nestedTarget = {
    kind: "folder",
    guid: "target-folder",
    parentGuid: "container",
    index: 4,
    title: "Target",
  };
  const sourceFolder = {
    kind: "folder",
    guid: "source-folder",
    parentGuid: "container",
    index: 5,
    title: "Source",
  };
  const hierarchy = [...items, nestedTarget, sourceFolder];

  assert.deepEqual(planOfficialFolderMove(hierarchy, "a", "target-folder"), {
    guid: "a",
    destination: { parentId: "target-folder" },
  });
  assert.deepEqual(planOfficialFolderMove(hierarchy, "source-folder", "target-folder"), {
    guid: "source-folder",
    destination: { parentId: "target-folder" },
  });
});

test("rejects invalid hierarchy move endpoints", () => {
  assert.throws(() => planOfficialFolderMove(items, "missing", "root"), /not found/);
  assert.throws(() => planOfficialFolderMove(items, "a", "b"), /folder/);
  assert.throws(() => planOfficialFolderMove(items, "root", "root"), /root/);
  assert.equal(planOfficialFolderMove(items, "a", "a"), null);
});

test("rejects moving a folder into itself or any descendant", () => {
  const hierarchy = items.concat([
    { kind: "folder", guid: "parent", parentGuid: "container", index: 4, title: "Parent" },
    { kind: "folder", guid: "child", parentGuid: "parent", index: 0, title: "Child" },
    { kind: "folder", guid: "grandchild", parentGuid: "child", index: 0, title: "Grandchild" },
  ]);

  assert.equal(planOfficialFolderMove(hierarchy, "parent", "parent"), null);
  assert.throws(
    () => planOfficialFolderMove(hierarchy, "parent", "child"),
    /descendant/,
  );
  assert.throws(
    () => planOfficialFolderMove(hierarchy, "parent", "grandchild"),
    /descendant/,
  );
});

test("rejects moving Firefox special roots and managed nodes", () => {
  const protectedItems = items.concat([
    { kind: "folder", guid: "toolbar", parentGuid: "root", index: 1, title: "Toolbar" },
    { kind: "bookmark", guid: "managed", parentGuid: "container", index: 4, title: "Managed", url: "https://managed.example", unmodifiable: "managed" },
  ]);

  assert.throws(() => planOfficialSiblingMove(protectedItems, {
    fromGuid: "toolbar", toGuid: "container", placement: "after",
  }), /special root/);
  assert.throws(
    () => planOfficialFolderMove(protectedItems, "managed", "container"),
    /unmodifiable/,
  );
  assert.throws(
    () => planOfficialFolderMove(protectedItems, "a", "root"),
    /root/,
  );
});
