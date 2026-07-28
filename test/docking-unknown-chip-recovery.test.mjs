import test from "node:test";
import assert from "node:assert/strict";

import { createDockingChipCatalog } from "../dist/panel/lib/docking-chip-catalog.js";
import {
  createUnknownChipRecoveryCandidate,
} from "../dist/panel/lib/docking-unknown-chip-recovery.js";

test("removes only unknown chips while retaining current and deprecated instances", () => {
  const source = documentsFixture();
  const result = createUnknownChipRecoveryCandidate(source, catalog());

  assert.deepEqual(result.documents.bayConfigurations.bays[0].chips, [
    { instanceId: "chip-1", chipType: "search", order: 1, settings: { query: "kept" } },
    { instanceId: "chip-3", chipType: "legacy-search", order: 2, settings: { legacy: true } },
    { instanceId: "chip-5", chipType: "sort", order: 3, settings: {} },
  ]);
  assert.deepEqual(result.documents.bayConfigurations.bays[1].chips, []);
});

test("reports every removed instance in saved bay and chip order", () => {
  const result = createUnknownChipRecoveryCandidate(documentsFixture(), catalog());

  assert.deepEqual(result.removed, [
    { bayId: "bay-1", bayName: "一", instanceId: "chip-2", chipType: "future-a" },
    { bayId: "bay-1", bayName: "一", instanceId: "chip-4", chipType: "future-b" },
    { bayId: "bay-2", bayName: "二", instanceId: "chip-6", chipType: "future-a" },
  ]);
  assert.equal(result.changed, true);
  assert.deepEqual(result.changedDocuments, ["bayConfigurations"]);
});

test("preserves empty bays, placements, metadata, counters, and retained settings", () => {
  const source = documentsFixture();
  const result = createUnknownChipRecoveryCandidate(source, catalog());

  assert.equal(result.documents.bayConfigurations.bays.length, 2);
  assert.equal(result.documents.bayConfigurations.nextBaySequence, 3);
  assert.equal(result.documents.bayConfigurations.nextChipSequence, 7);
  assert.deepEqual(result.documents.mainLayouts, source.mainLayouts);
  assert.deepEqual(result.documents.dockingMetadata, source.dockingMetadata);
  assert.deepEqual(result.documents.bayConfigurations.bays[0].chips[0].settings, { query: "kept" });
});

test("returns an unchanged save-free result when no unknown chips exist", () => {
  const source = documentsFixture();
  source.bayConfigurations.bays.forEach((bay) => {
    bay.chips = bay.chips.filter(({ chipType }) => !chipType.startsWith("future-"));
  });
  const result = createUnknownChipRecoveryCandidate(source, catalog());

  assert.equal(result.changed, false);
  assert.deepEqual(result.changedDocuments, []);
  assert.deepEqual(result.removed, []);
  assert.deepEqual(result.documents, source);
});

test("is idempotent after producing a recovery candidate", () => {
  const first = createUnknownChipRecoveryCandidate(documentsFixture(), catalog());
  const second = createUnknownChipRecoveryCandidate(first.documents, catalog());

  assert.equal(second.changed, false);
  assert.deepEqual(second.changedDocuments, []);
  assert.deepEqual(second.removed, []);
  assert.deepEqual(second.documents, first.documents);
});

test("defensively separates source documents and returned recovery state", () => {
  const source = documentsFixture();
  const before = structuredClone(source);
  const result = createUnknownChipRecoveryCandidate(source, catalog());

  result.documents.bayConfigurations.bays[0].chips[0].settings.query = "mutated";
  result.removed[0].bayName = "mutated";

  const next = createUnknownChipRecoveryCandidate(source, catalog());
  assert.deepEqual(source, before);
  assert.equal(next.documents.bayConfigurations.bays[0].chips[0].settings.query, "kept");
  assert.equal(next.removed[0].bayName, "一");
});

test("handles documents with no bays or chips as an unchanged boundary", () => {
  const source = documentsFixture();
  source.bayConfigurations.bays = [];

  const result = createUnknownChipRecoveryCandidate(source, catalog());

  assert.equal(result.changed, false);
  assert.deepEqual(result.removed, []);
  assert.deepEqual(result.documents, source);
});

function catalog() {
  return createDockingChipCatalog([
    { chipType: "search", displayName: "検索", kind: "control" },
    { chipType: "sort", displayName: "ソート", kind: "control" },
  ], [{
    chipType: "legacy-search",
    displayName: "旧検索",
    deprecatedSince: "0.2.0",
    removedSince: "0.4.0",
    replacementChipType: "search",
  }]);
}

function documentsFixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 3,
      nextChipSequence: 7,
      bays: [
        {
          id: "bay-1",
          name: "一",
          permanent: false,
          chips: [
            { instanceId: "chip-1", chipType: "search", order: 1, settings: { query: "kept" } },
            { instanceId: "chip-2", chipType: "future-a", order: 2, settings: { removed: 1 } },
            { instanceId: "chip-3", chipType: "legacy-search", order: 3, settings: { legacy: true } },
            { instanceId: "chip-4", chipType: "future-b", order: 4, settings: { removed: 2 } },
            { instanceId: "chip-5", chipType: "sort", order: 5, settings: {} },
          ],
        },
        {
          id: "bay-2",
          name: "二",
          permanent: false,
          chips: [
            { instanceId: "chip-6", chipType: "future-a", order: 1, settings: {} },
          ],
        },
      ],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 2,
      layouts: [{
        id: "layout-1",
        name: "一",
        systemDefault: false,
        placements: [
          { bayId: "bay-1", rail: "top", order: 1 },
          { bayId: "bay-2", rail: "bottom", order: 1 },
        ],
      }],
    },
    dockingMetadata: {
      schemaVersion: 1,
      activeLayoutId: "layout-1",
      lastUsedLayoutId: "layout-1",
    },
  };
}
