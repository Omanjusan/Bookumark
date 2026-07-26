import test from "node:test";
import assert from "node:assert/strict";

import {
  DOCKING_STORAGE_KEYS,
  loadDockingDocuments,
} from "../dist/panel/lib/docking-storage.js";

test("loads all docking document keys with one storage request", async () => {
  const calls = [];
  const stored = {
    "bayConfigurations.v1": { schemaVersion: 1, bays: [] },
    "mainLayouts.v1": { schemaVersion: 1, layouts: [] },
    "dockingMetadata.v1": { schemaVersion: 1, activeLayoutId: "layout-1" },
  };
  globalThis.browser = {
    storage: { local: { get: async (keys) => { calls.push(keys); return stored; } } },
  };

  const result = await loadDockingDocuments();

  assert.deepEqual(DOCKING_STORAGE_KEYS, {
    bayConfigurations: "bayConfigurations.v1",
    mainLayouts: "mainLayouts.v1",
    dockingMetadata: "dockingMetadata.v1",
  });
  assert.deepEqual(calls, [[
    "bayConfigurations.v1",
    "mainLayouts.v1",
    "dockingMetadata.v1",
  ]]);
  assert.deepEqual(result, {
    bayConfigurations: stored["bayConfigurations.v1"],
    mainLayouts: stored["mainLayouts.v1"],
    dockingMetadata: stored["dockingMetadata.v1"],
  });
});

test("returns undefined fields for documents that have not been saved", async () => {
  globalThis.browser = {
    storage: { local: { get: async () => ({ "mainLayouts.v1": null }) } },
  };

  assert.deepEqual(await loadDockingDocuments(), {
    bayConfigurations: undefined,
    mainLayouts: null,
    dockingMetadata: undefined,
  });
});

test("does not interpret malformed stored values", async () => {
  globalThis.browser = {
    storage: { local: { get: async () => ({
      "bayConfigurations.v1": "broken",
      "mainLayouts.v1": 42,
      "dockingMetadata.v1": [],
    }) } },
  };

  assert.deepEqual(await loadDockingDocuments(), {
    bayConfigurations: "broken",
    mainLayouts: 42,
    dockingMetadata: [],
  });
});

test("propagates docking storage read failures", async () => {
  const failure = new Error("storage unavailable");
  globalThis.browser = {
    storage: { local: { get: async () => { throw failure; } } },
  };

  await assert.rejects(loadDockingDocuments(), (error) => error === failure);
});
