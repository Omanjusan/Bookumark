import test from "node:test";
import assert from "node:assert/strict";

import {
  createBookmarkMoveSnapshot,
  planOfficialUndo,
} from "../dist/panel/lib/official-undo.js";

const before = [
  { kind: "folder", guid: "root", parentGuid: null, index: 0, title: "Root" },
  { kind: "folder", guid: "folder", parentGuid: "root", index: 0, title: "Folder" },
  { kind: "bookmark", guid: "a", parentGuid: "folder", index: 0, title: "A", url: "https://a.example" },
  { kind: "bookmark", guid: "b", parentGuid: "folder", index: 1, title: "B", url: "https://b.example" },
  { kind: "bookmark", guid: "c", parentGuid: "folder", index: 2, title: "C", url: "https://c.example" },
];

test("captures the original parent and index without mutating items", () => {
  const copy = structuredClone(before);

  assert.deepEqual(createBookmarkMoveSnapshot(before, "c"), {
    guid: "c",
    previousParentGuid: "folder",
    previousIndex: 2,
  });
  assert.deepEqual(before, copy);
});

test("increments the insertion index when undoing an upward same-parent move", () => {
  const after = before.map((item) => item.guid === "c" ? { ...item, index: 0 } : item);
  const snapshot = createBookmarkMoveSnapshot(before, "c");

  assert.deepEqual(planOfficialUndo(snapshot, after), {
    guid: "c",
    destination: { parentId: "folder", index: 3 },
  });
});

test("uses the original index for a downward or cross-parent undo", () => {
  const downward = before.map((item) => item.guid === "a" ? { ...item, index: 2 } : item);
  assert.deepEqual(planOfficialUndo(createBookmarkMoveSnapshot(before, "a"), downward), {
    guid: "a",
    destination: { parentId: "folder", index: 0 },
  });

  const crossParent = before.map((item) => item.guid === "b"
    ? { ...item, parentGuid: "other", index: 0 }
    : item);
  assert.deepEqual(planOfficialUndo(createBookmarkMoveSnapshot(before, "b"), crossParent), {
    guid: "b",
    destination: { parentId: "folder", index: 1 },
  });
});

test("rejects snapshots for roots and missing current items", () => {
  assert.throws(() => createBookmarkMoveSnapshot(before, "root"), /root/);
  assert.throws(() => createBookmarkMoveSnapshot(before, "missing"), /not found/);
  assert.throws(
    () => planOfficialUndo(createBookmarkMoveSnapshot(before, "a"), []),
    /not found/,
  );
});
