import test from "node:test";
import assert from "node:assert/strict";

import { normalizeDockingDocuments } from "../dist/panel/lib/docking-documents-normalization.js";

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

function createValidStoredDocuments() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 3,
      nextChipSequence: 1,
      bays: [
        fallback.bayConfigurations.bays[0],
        { id: "bay-2", name: "利用者ベイ", permanent: false, chips: [] },
      ],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        fallback.mainLayouts.layouts[0],
        {
          id: "layout-2",
          name: "利用者レイアウト",
          systemDefault: false,
          placements: [{ bayId: "bay-2", rail: "left", order: 1 }],
        },
      ],
    },
    dockingMetadata: {
      schemaVersion: 1,
      activeLayoutId: "layout-2",
      lastUsedLayoutId: "layout-2",
    },
  };
}

test("normalizes three valid documents without marking them for persistence", () => {
  const stored = createValidStoredDocuments();
  const result = normalizeDockingDocuments(stored, fallback);

  assert.deepEqual(result.documents, stored);
  assert.deepEqual(result.recoveries, {
    bayConfigurations: "unchanged",
    mainLayouts: "unchanged",
    dockingMetadata: "unchanged",
  });
  assert.deepEqual(result.changedDocuments, []);
  assert.notEqual(result.documents.bayConfigurations, stored.bayConfigurations);
  assert.notEqual(result.documents.mainLayouts, stored.mainLayouts);
  assert.notEqual(result.documents.dockingMetadata, stored.dockingMetadata);
});

test("uses normalized bay ids when repairing downstream layout placements", () => {
  const stored = createValidStoredDocuments();
  stored.bayConfigurations.bays[1].id = "broken-bay";
  const result = normalizeDockingDocuments(stored, fallback);

  assert.deepEqual(result.documents.bayConfigurations.bays.map(({ id }) => id), ["bay-1"]);
  assert.deepEqual(result.documents.mainLayouts.layouts[1].placements, []);
  assert.deepEqual(result.recoveries, {
    bayConfigurations: "normalized",
    mainLayouts: "normalized",
    dockingMetadata: "unchanged",
  });
  assert.deepEqual(result.changedDocuments, ["bayConfigurations", "mainLayouts"]);
});

test("uses normalized layouts when recovering metadata references", () => {
  const stored = createValidStoredDocuments();
  stored.mainLayouts.layouts[1].id = "broken-layout";
  const result = normalizeDockingDocuments(stored, fallback);

  assert.deepEqual(result.documents.mainLayouts.layouts.map(({ id }) => id), ["layout-1"]);
  assert.deepEqual(result.documents.dockingMetadata, {
    schemaVersion: 1,
    activeLayoutId: "layout-1",
  });
  assert.deepEqual(result.recoveries, {
    bayConfigurations: "unchanged",
    mainLayouts: "normalized",
    dockingMetadata: "normalized",
  });
  assert.deepEqual(result.changedDocuments, ["mainLayouts", "dockingMetadata"]);
});

test("falls back each missing document in dependency order", () => {
  const result = normalizeDockingDocuments({
    bayConfigurations: undefined,
    mainLayouts: undefined,
    dockingMetadata: undefined,
  }, fallback);

  assert.deepEqual(result.documents, fallback);
  assert.deepEqual(result.recoveries, {
    bayConfigurations: "fallback",
    mainLayouts: "fallback",
    dockingMetadata: "fallback",
  });
  assert.deepEqual(result.changedDocuments, [
    "bayConfigurations",
    "mainLayouts",
    "dockingMetadata",
  ]);
  assert.notEqual(result.documents, fallback);
});
