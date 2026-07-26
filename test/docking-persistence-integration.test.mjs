import test from "node:test";
import assert from "node:assert/strict";

import { loadNormalizedDockingDocuments } from "../dist/panel/lib/docking-documents-normalization.js";

const fallback = {
  bayConfigurations: {
    schemaVersion: 1,
    nextBaySequence: 2,
    nextChipSequence: 1,
    bays: [{ id: "bay-1", name: "既定ベイ", permanent: true, chips: [] }],
  },
  mainLayouts: {
    schemaVersion: 1,
    nextLayoutSequence: 2,
    layouts: [{
      id: "layout-1",
      name: "内部デフォルト",
      systemDefault: true,
      placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
    }],
  },
  dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-1" },
};

function toStoredValues(documents) {
  return {
    "bayConfigurations.v1": documents.bayConfigurations,
    "mainLayouts.v1": documents.mainLayouts,
    "dockingMetadata.v1": documents.dockingMetadata,
  };
}

function createValidDocuments() {
  return structuredClone(fallback);
}

test("loads once and skips persistence when every document is unchanged", async () => {
  const reads = [];
  const writes = [];
  const stored = createValidDocuments();
  globalThis.browser = {
    storage: { local: {
      get: async (keys) => { reads.push(keys); return toStoredValues(stored); },
      set: async (value) => writes.push(value),
    } },
  };

  const result = await loadNormalizedDockingDocuments(fallback);

  assert.equal(reads.length, 1);
  assert.deepEqual(writes, []);
  assert.deepEqual(result.documents, stored);
  assert.deepEqual(result.changedDocuments, []);
});

test("persists only a repaired document", async () => {
  const writes = [];
  const stored = createValidDocuments();
  stored.bayConfigurations.bays[0].name = " ";
  globalThis.browser = {
    storage: { local: {
      get: async () => toStoredValues(stored),
      set: async (value) => writes.push(value),
    } },
  };

  const result = await loadNormalizedDockingDocuments(fallback);

  assert.deepEqual(result.changedDocuments, ["bayConfigurations"]);
  assert.deepEqual(writes, [{
    "bayConfigurations.v1": result.documents.bayConfigurations,
  }]);
});

test("persists all downstream repairs together in one write", async () => {
  const writes = [];
  const stored = createValidDocuments();
  stored.bayConfigurations.bays.push({
    id: "broken-bay", name: "破損", permanent: false, chips: [],
  });
  stored.mainLayouts.layouts.push({
    id: "broken-layout",
    name: "破損",
    systemDefault: false,
    placements: [],
  });
  stored.dockingMetadata.activeLayoutId = "broken-layout";
  globalThis.browser = {
    storage: { local: {
      get: async () => toStoredValues(stored),
      set: async (value) => writes.push(value),
    } },
  };

  const result = await loadNormalizedDockingDocuments(fallback);

  assert.deepEqual(result.changedDocuments, [
    "bayConfigurations",
    "mainLayouts",
    "dockingMetadata",
  ]);
  assert.equal(writes.length, 1);
  assert.deepEqual(Object.keys(writes[0]), [
    "bayConfigurations.v1",
    "mainLayouts.v1",
    "dockingMetadata.v1",
  ]);
});

test("propagates a read failure without attempting persistence", async () => {
  const failure = new Error("read unavailable");
  let writes = 0;
  globalThis.browser = {
    storage: { local: {
      get: async () => { throw failure; },
      set: async () => { writes += 1; },
    } },
  };

  await assert.rejects(
    loadNormalizedDockingDocuments(fallback),
    (error) => error === failure,
  );
  assert.equal(writes, 0);
});

test("does not return a recovery result when automatic persistence fails", async () => {
  const failure = new Error("write unavailable");
  globalThis.browser = {
    storage: { local: {
      get: async () => ({}),
      set: async () => { throw failure; },
    } },
  };

  await assert.rejects(
    loadNormalizedDockingDocuments(fallback),
    (error) => error === failure,
  );
});
