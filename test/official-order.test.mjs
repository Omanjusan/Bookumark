import test from "node:test";
import assert from "node:assert/strict";

import { planOfficialSiblingMove } from "../dist/panel/lib/official-order.js";

const items = [
  { kind: "folder", guid: "root", parentGuid: null, index: 0, title: "Root" },
  { kind: "bookmark", guid: "a", parentGuid: "root", index: 1, title: "A", url: "https://a.example" },
  { kind: "bookmark", guid: "b", parentGuid: "root", index: 3, title: "B", url: "https://b.example" },
  { kind: "bookmark", guid: "other", parentGuid: "other-folder", index: 0, title: "Other", url: "https://other.example" },
];

test("plans an absolute first-position move with index zero", () => {
  assert.deepEqual(planOfficialSiblingMove(items, {
    fromGuid: "b",
    toGuid: "a",
    placement: "start",
  }), {
    guid: "b",
    destination: { parentId: "root", index: 0 },
  });
});

test("plans an absolute last-position move by omitting index", () => {
  assert.deepEqual(planOfficialSiblingMove(items, {
    fromGuid: "a",
    toGuid: "b",
    placement: "end",
  }), {
    guid: "a",
    destination: { parentId: "root" },
  });
});

test("uses the target index for before and target index plus one for after", () => {
  assert.deepEqual(planOfficialSiblingMove(items, {
    fromGuid: "b",
    toGuid: "a",
    placement: "before",
  }), {
    guid: "b",
    destination: { parentId: "root", index: 1 },
  });
  assert.deepEqual(planOfficialSiblingMove(items, {
    fromGuid: "a",
    toGuid: "b",
    placement: "after",
  }), {
    guid: "a",
    destination: { parentId: "root", index: 4 },
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
