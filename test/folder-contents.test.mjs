import test from "node:test";
import assert from "node:assert/strict";

import { directFolderContents } from "../dist/panel/lib/folder-contents.js";

const items = [
  { kind: "folder", guid: "root", parentGuid: null, index: 0, title: "Root" },
  { kind: "folder", guid: "folder-b", parentGuid: "root", index: 2, title: "B" },
  { kind: "bookmark", guid: "root-link", parentGuid: "root", index: 1, title: "Root link", url: "https://root.example" },
  { kind: "folder", guid: "folder-a", parentGuid: "root", index: 0, title: "A" },
  { kind: "bookmark", guid: "nested", parentGuid: "folder-a", index: 0, title: "Nested", url: "https://nested.example" },
];

test("returns only direct folders and bookmarks in Firefox index order", () => {
  const result = directFolderContents(items, "root");

  assert.deepEqual(result.folders.map(({ guid }) => guid), ["folder-a", "folder-b"]);
  assert.deepEqual(result.bookmarks.map(({ guid }) => guid), ["root-link"]);
});

test("does not include descendants or siblings from another folder", () => {
  const result = directFolderContents(items, "folder-a");

  assert.deepEqual(result.folders, []);
  assert.deepEqual(result.bookmarks.map(({ guid }) => guid), ["nested"]);
});

test("returns independent arrays without mutating the tree", () => {
  const before = structuredClone(items);
  const result = directFolderContents(items, "root");
  result.folders.reverse();

  assert.deepEqual(items, before);
});
