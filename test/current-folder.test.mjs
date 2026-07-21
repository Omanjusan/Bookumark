import test from "node:test";
import assert from "node:assert/strict";

import {
  createStoredCurrentFolder,
  loadCurrentFolder,
  resolveCurrentFolderGuid,
  saveCurrentFolder,
} from "../dist/panel/lib/current-folder.js";

const folders = [
  { kind: "folder", guid: "root", parentGuid: null, index: 0, title: "Root" },
  { kind: "folder", guid: "parent", parentGuid: "root", index: 0, title: "Parent" },
  { kind: "folder", guid: "current", parentGuid: "parent", index: 0, title: "Current" },
];

test("uses the Firefox root when no previous folder was saved", () => {
  assert.equal(resolveCurrentFolderGuid(folders, null), "root");
});

test("restores the previously displayed folder when it still exists", () => {
  assert.equal(resolveCurrentFolderGuid(folders, {
    guid: "current",
    ancestorGuids: ["root", "parent"],
  }), "current");
});

test("falls back to the nearest saved ancestor when the current folder was deleted", () => {
  assert.equal(resolveCurrentFolderGuid(folders.slice(0, 2), {
    guid: "current",
    ancestorGuids: ["root", "parent"],
  }), "parent");
});

test("falls back to the root when the saved folder and ancestors no longer exist", () => {
  assert.equal(resolveCurrentFolderGuid([folders[0]], {
    guid: "deleted",
    ancestorGuids: ["old-root", "old-parent"],
  }), "root");
});

test("does not accept a bookmark GUID as the current folder", () => {
  const items = folders.concat({
    kind: "bookmark",
    guid: "bookmark",
    parentGuid: "parent",
    index: 1,
    title: "Bookmark",
    url: "https://example.com",
  });

  assert.equal(resolveCurrentFolderGuid(items, {
    guid: "bookmark",
    ancestorGuids: ["root", "parent"],
  }), "parent");
});

test("returns null for an invalid tree without a root folder", () => {
  assert.equal(resolveCurrentFolderGuid([], null), null);
});

test("creates a restorable snapshot without mutating tree items", () => {
  const before = structuredClone(folders);

  assert.deepEqual(createStoredCurrentFolder(folders, "current"), {
    guid: "current",
    ancestorGuids: ["root", "parent"],
  });
  assert.deepEqual(folders, before);
});

test("loads a valid current folder snapshot and rejects malformed storage", async () => {
  const values = [
    { currentFolder: { guid: "current", ancestorGuids: ["root", "parent"] } },
    { currentFolder: { guid: 123, ancestorGuids: ["root"] } },
  ];
  globalThis.browser = {
    storage: { local: { get: async () => values.shift() } },
  };

  assert.deepEqual(await loadCurrentFolder(), {
    guid: "current",
    ancestorGuids: ["root", "parent"],
  });
  assert.equal(await loadCurrentFolder(), null);
});

test("saves the complete current folder snapshot", async () => {
  const writes = [];
  globalThis.browser = {
    storage: { local: { set: async (value) => writes.push(value) } },
  };

  await saveCurrentFolder({
    guid: "current",
    ancestorGuids: ["root", "parent"],
  });

  assert.deepEqual(writes, [{
    currentFolder: {
      guid: "current",
      ancestorGuids: ["root", "parent"],
    },
  }]);
});

test("propagates storage failures", async () => {
  const failure = new Error("storage unavailable");
  globalThis.browser = {
    storage: {
      local: {
        get: async () => { throw failure; },
        set: async () => { throw failure; },
      },
    },
  };

  await assert.rejects(loadCurrentFolder(), (error) => error === failure);
  await assert.rejects(
    saveCurrentFolder({ guid: "root", ancestorGuids: [] }),
    (error) => error === failure,
  );
});
