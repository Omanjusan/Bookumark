import test from "node:test";
import assert from "node:assert/strict";

import {
  loadPanelFolderCandidate,
} from "../dist/panel/lib/panel-folder-load.js";

test("loads and saves a complete folder candidate without mutating its inputs", async () => {
  const treeItems = fixture();
  const orders = { root: ["bookmark-b", "folder-a", "bookmark-a"] };
  const before = structuredClone({ treeItems, orders });
  const saved = [];

  const candidate = await loadPanelFolderCandidate({
    treeItems,
    folderOrders: orders,
    movementMode: "custom-order",
    folderGuid: "root",
  }, {
    loadHistory: async (items) => items.map((item) => ({ ...item, visitCount: 0 })),
    saveCurrentFolder: async (stored) => { saved.push(stored); },
  });

  assert.deepEqual(candidate.folders.map(({ guid }) => guid), ["folder-a"]);
  assert.deepEqual(candidate.items.map(({ guid }) => guid), ["bookmark-b", "bookmark-a"]);
  assert.deepEqual(candidate.storedFolder, { guid: "root", ancestorGuids: [] });
  assert.deepEqual(saved, [{ guid: "root", ancestorGuids: [] }]);
  assert.deepEqual({ treeItems, orders }, before);
});

test("does not publish or save a partial candidate when history loading fails", async () => {
  const failure = new Error("private bookmark id");
  let saveCalls = 0;

  await assert.rejects(
    loadPanelFolderCandidate(input("folder-a"), {
      loadHistory: async () => { throw failure; },
      saveCurrentFolder: async () => { saveCalls += 1; },
    }),
    (error) => error === failure,
  );

  assert.equal(saveCalls, 0);
});

test("rejects a failed current-folder save without returning the loaded candidate", async () => {
  const failure = new Error("storage key currentFolder");

  await assert.rejects(
    loadPanelFolderCandidate(input("folder-a"), {
      loadHistory: async (items) => items,
      saveCurrentFolder: async () => { throw failure; },
    }),
    (error) => error === failure,
  );
});

test("rejects an unknown destination before loading or saving", async () => {
  let effectCalls = 0;

  await assert.rejects(
    loadPanelFolderCandidate(input("missing"), {
      loadHistory: async () => { effectCalls += 1; return []; },
      saveCurrentFolder: async () => { effectCalls += 1; },
    }),
    /Folder not found/,
  );

  assert.equal(effectCalls, 0);
});

function input(folderGuid) {
  return {
    treeItems: fixture(),
    folderOrders: { root: [], "folder-a": [] },
    movementMode: "custom-order",
    folderGuid,
  };
}

function fixture() {
  return [
    { kind: "folder", guid: "root", parentGuid: null, index: 0, title: "root" },
    { kind: "folder", guid: "folder-a", parentGuid: "root", index: 0, title: "private folder" },
    { kind: "bookmark", guid: "bookmark-a", parentGuid: "root", index: 1, title: "A", url: "https://a.test" },
    { kind: "bookmark", guid: "bookmark-b", parentGuid: "root", index: 2, title: "B", url: "https://b.test" },
    { kind: "bookmark", guid: "nested", parentGuid: "folder-a", index: 0, title: "nested", url: "https://nested.test" },
  ];
}
