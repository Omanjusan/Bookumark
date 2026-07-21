import test from "node:test";
import assert from "node:assert/strict";

import { buildBreadcrumb } from "../dist/panel/lib/breadcrumb.js";

function folder(guid, title, parentGuid) {
  return { kind: "folder", guid, title, parentGuid, index: 0 };
}

test("builds breadcrumb items from the root through the current folder", () => {
  const folders = [
    folder("root", "Root", null),
    folder("parent", "Parent", "root"),
    folder("current", "Current", "parent"),
  ];

  assert.deepEqual(buildBreadcrumb("current", new Map(
    folders.map((item) => [item.guid, item]),
  )), [
    { guid: "root", title: "Root" },
    { guid: "parent", title: "Parent" },
    { guid: "current", title: "Current" },
  ]);
});

test("includes the root itself when it is the current folder", () => {
  const root = folder("root", "Root", null);

  assert.deepEqual(buildBreadcrumb("root", new Map([[root.guid, root]])), [
    { guid: "root", title: "Root" },
  ]);
});

test("returns the reachable partial path when a parent reference is missing", () => {
  const current = folder("current", "Current", "missing");

  assert.deepEqual(buildBreadcrumb(
    "current",
    new Map([[current.guid, current]]),
  ), [{ guid: "current", title: "Current" }]);
});

test("stops at a parent cycle without repeating a folder", () => {
  const a = folder("a", "A", "b");
  const b = folder("b", "B", "a");

  assert.deepEqual(buildBreadcrumb("a", new Map([
    [a.guid, a],
    [b.guid, b],
  ])), [
    { guid: "b", title: "B" },
    { guid: "a", title: "A" },
  ]);
});

test("returns an empty path when the current folder does not exist", () => {
  assert.deepEqual(buildBreadcrumb("missing", new Map()), []);
});

test("does not mutate folder data or expose mutable source objects", () => {
  const root = folder("root", "Root", null);
  const folders = new Map([[root.guid, root]]);
  const before = structuredClone(root);

  const result = buildBreadcrumb("root", folders);
  result[0].title = "Changed";

  assert.deepEqual(root, before);
});
