import test from "node:test";
import assert from "node:assert/strict";

import { resolvePanelInitialBookmarkRoot } from "../dist/panel/lib/panel-initial-bookmark-root.js";

test("keeps the saved folder for a production startup without bookmark mutations", async () => {
  let effectCalls = 0;
  const items = fixture();
  const result = await resolvePanelInitialBookmarkRoot({
    treeItems: items,
    savedFolder: { guid: "saved", ancestorGuids: ["root"] },
    experiment: false,
  }, {
    getChildren: async () => { effectCalls += 1; return []; },
    create: async () => { effectCalls += 1; return { id: "unused" }; },
    reloadTreeItems: async () => { effectCalls += 1; return []; },
  });

  assert.equal(effectCalls, 0);
  assert.deepEqual(result, { treeItems: items, folderGuid: "saved", error: null });
});

test("selects an existing bookumark folder for experiment startup", async () => {
  const items = fixture(true);
  const result = await resolvePanelInitialBookmarkRoot({
    treeItems: items,
    savedFolder: { guid: "saved", ancestorGuids: ["root"] },
    experiment: true,
  }, {
    getChildren: async () => [{ id: "experiment", title: "bookumark", children: [] }],
    create: async () => { throw new Error("must not create"); },
    reloadTreeItems: async () => { throw new Error("must not reload"); },
  });

  assert.deepEqual(result, { treeItems: items, folderGuid: "experiment", error: null });
});

test("reloads the tree after creating the experiment folder", async () => {
  const initial = fixture();
  const refreshed = fixture(true);
  const result = await resolvePanelInitialBookmarkRoot({
    treeItems: initial,
    savedFolder: null,
    experiment: true,
  }, {
    getChildren: async () => [],
    create: async () => ({ id: "experiment", title: "bookumark" }),
    reloadTreeItems: async () => refreshed,
  });

  assert.deepEqual(result, { treeItems: refreshed, folderGuid: "experiment", error: null });
});

test("reports experiment setup failure and continues from the Firefox root", async () => {
  const failure = new Error("create failed");
  const items = fixture();
  const result = await resolvePanelInitialBookmarkRoot({
    treeItems: items,
    savedFolder: { guid: "saved", ancestorGuids: ["root"] },
    experiment: true,
  }, {
    getChildren: async () => [],
    create: async () => { throw failure; },
    reloadTreeItems: async () => { throw new Error("must not reload"); },
  });

  assert.deepEqual(result, { treeItems: items, folderGuid: "root", error: failure });
});

test("reports refresh failure and continues from the Firefox root", async () => {
  const failure = new Error("reload failed");
  const items = fixture();
  const result = await resolvePanelInitialBookmarkRoot({
    treeItems: items,
    savedFolder: null,
    experiment: true,
  }, {
    getChildren: async () => [],
    create: async () => ({ id: "experiment", title: "bookumark" }),
    reloadTreeItems: async () => { throw failure; },
  });

  assert.deepEqual(result, { treeItems: items, folderGuid: "root", error: failure });
});

function fixture(includeExperiment = false) {
  return [
    { kind: "folder", guid: "root", parentGuid: null, index: 0, title: "root" },
    { kind: "folder", guid: "saved", parentGuid: "root", index: 0, title: "saved" },
    ...(includeExperiment
      ? [{ kind: "folder", guid: "experiment", parentGuid: "root", index: 1, title: "bookumark" }]
      : []),
  ];
}
