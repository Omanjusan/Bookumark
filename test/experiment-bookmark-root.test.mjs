import test from "node:test";
import assert from "node:assert/strict";

import { ensureExperimentBookmarkRoot } from "../dist/panel/lib/experiment-bookmark-root.js";

test("creates the experiment folder under the Firefox root when it is absent", async () => {
  const createCalls = [];
  const result = await ensureExperimentBookmarkRoot("root", {
    getChildren: async () => [],
    create: async (details) => {
      createCalls.push(details);
      return { id: "created", title: "bookumark" };
    },
  });

  assert.deepEqual(createCalls, [{ parentId: "root", title: "bookumark" }]);
  assert.deepEqual(result, { folderGuid: "created", error: null });
});

test("reuses the first existing experiment folder without changing its contents", async () => {
  let createCalls = 0;
  const children = [
    { id: "first", title: "bookumark", children: [{ id: "kept" }] },
    { id: "second", title: "bookumark", children: [] },
  ];
  const before = structuredClone(children);
  const result = await ensureExperimentBookmarkRoot("root", {
    getChildren: async () => children,
    create: async () => {
      createCalls += 1;
      return { id: "unexpected", title: "bookumark" };
    },
  });

  assert.deepEqual(result, { folderGuid: "first", error: null });
  assert.equal(createCalls, 0);
  assert.deepEqual(children, before);
});

test("does not treat a same-title bookmark as the experiment folder", async () => {
  const result = await ensureExperimentBookmarkRoot("root", {
    getChildren: async () => [
      { id: "bookmark", title: "bookumark", url: "https://example.com" },
    ],
    create: async () => ({ id: "folder", title: "bookumark" }),
  });

  assert.deepEqual(result, { folderGuid: "folder", error: null });
});

test("falls back to the Firefox root when listing children fails", async () => {
  const failure = new Error("bookmark lookup failed");
  const result = await ensureExperimentBookmarkRoot("root", {
    getChildren: async () => { throw failure; },
    create: async () => ({ id: "unused", title: "bookumark" }),
  });

  assert.deepEqual(result, { folderGuid: "root", error: failure });
});

test("falls back to the Firefox root when folder creation fails", async () => {
  const failure = new Error("bookmark creation failed");
  const result = await ensureExperimentBookmarkRoot("root", {
    getChildren: async () => [],
    create: async () => { throw failure; },
  });

  assert.deepEqual(result, { folderGuid: "root", error: failure });
});
