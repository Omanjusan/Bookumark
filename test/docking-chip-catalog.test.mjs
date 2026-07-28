import test from "node:test";
import assert from "node:assert/strict";

import {
  CURRENT_DOCKING_CHIP_RECORDS,
  DEPRECATED_DOCKING_CHIP_RECORDS,
  classifyDockingChipType,
  classifyDockingDocumentChips,
  createDockingChipCatalog,
} from "../dist/panel/lib/docking-chip-catalog.js";
import { BASIC_DOCKING_CONTROL_DEFINITIONS } from "../dist/panel/lib/docking-basic-control-definitions.js";
import { BASIC_DOCKING_CHIP_TYPES } from "../dist/panel/lib/docking-chip-renderer-registry.js";
import { createInternalDefaultDockingDocuments } from "../dist/panel/lib/docking-internal-defaults.js";

test("defines the current six controls as the production chip catalog", () => {
  assert.deepEqual(CURRENT_DOCKING_CHIP_RECORDS, [
    { chipType: "search", displayName: "検索", kind: "control" },
    { chipType: "visit-status", displayName: "訪問状態", kind: "control" },
    { chipType: "folder-history", displayName: "フォルダ履歴", kind: "control" },
    { chipType: "sort", displayName: "ソート", kind: "control" },
    { chipType: "view-type", displayName: "表示形式", kind: "control" },
    { chipType: "movement-mode", displayName: "移動モード", kind: "control" },
  ]);
  assert.deepEqual(DEPRECATED_DOCKING_CHIP_RECORDS, []);
});

test("keeps the production catalog aligned with renderers, definitions, and internal defaults", () => {
  const catalogTypes = CURRENT_DOCKING_CHIP_RECORDS.map(({ chipType }) => chipType).sort();
  const defaultTypes = createInternalDefaultDockingDocuments()
    .bayConfigurations.bays.flatMap(({ chips }) => chips.map(({ chipType }) => chipType))
    .sort();

  assert.deepEqual(catalogTypes, [...BASIC_DOCKING_CHIP_TYPES].sort());
  assert.deepEqual(catalogTypes, [...BASIC_DOCKING_CONTROL_DEFINITIONS.keys()].sort());
  assert.deepEqual(catalogTypes, defaultTypes);
});

test("classifies current, deprecated, and unknown chip types", () => {
  const catalog = fixtureCatalog();

  assert.deepEqual(classifyDockingChipType("search", catalog), {
    status: "current",
    chipType: "search",
    displayName: "検索",
    kind: "control",
  });
  assert.deepEqual(classifyDockingChipType("legacy-search", catalog), {
    status: "deprecated",
    chipType: "legacy-search",
    displayName: "旧検索",
    deprecatedSince: "0.2.0",
    removedSince: "0.4.0",
    replacementChipType: "search",
  });
  assert.deepEqual(classifyDockingChipType("future-chip", catalog), {
    status: "unknown",
    chipType: "future-chip",
  });
});

test("detects every deprecated type across skipped release versions without version comparison", () => {
  const catalog = fixtureCatalog();

  assert.equal(classifyDockingChipType("legacy-search", catalog).status, "deprecated");
  assert.equal(classifyDockingChipType("legacy-sort", catalog).status, "deprecated");
});

test("classifies every saved instance in bay and chip order with its bay identity", () => {
  const documents = documentsFixture();
  const result = classifyDockingDocumentChips(documents.bayConfigurations, fixtureCatalog());

  assert.deepEqual(result.map((entry) => ({
    bayId: entry.bayId,
    bayName: entry.bayName,
    instanceId: entry.instanceId,
    chipType: entry.chipType,
    status: entry.status,
  })), [
    { bayId: "bay-1", bayName: "一", instanceId: "chip-1", chipType: "search", status: "current" },
    { bayId: "bay-1", bayName: "一", instanceId: "chip-2", chipType: "legacy-search", status: "deprecated" },
    { bayId: "bay-2", bayName: "二", instanceId: "chip-3", chipType: "legacy-search", status: "deprecated" },
    { bayId: "bay-2", bayName: "二", instanceId: "chip-4", chipType: "future-chip", status: "unknown" },
  ]);
});

test("rejects duplicate and overlapping catalog types", () => {
  const current = [{ chipType: "search", displayName: "検索", kind: "control" }];
  const deprecatedRecords = [deprecated("legacy")];

  assert.throws(
    () => createDockingChipCatalog([...current, ...current], deprecatedRecords),
    /duplicate current chip type: search/,
  );
  assert.throws(
    () => createDockingChipCatalog(current, [...deprecatedRecords, ...deprecatedRecords]),
    /duplicate deprecated chip type: legacy/,
  );
  assert.throws(
    () => createDockingChipCatalog(current, [deprecatedRecord("search")]),
    /chip type is both current and deprecated: search/,
  );
});

test("rejects malformed catalog records before producing a catalog", () => {
  for (const record of [
    { chipType: "", displayName: "検索", kind: "control" },
    { chipType: "search", displayName: "", kind: "control" },
    { chipType: "search", displayName: "検索", kind: "widget" },
  ]) {
    assert.throws(() => createDockingChipCatalog([record], []), /invalid current chip record/);
  }
  for (const record of [
    { ...deprecated("legacy"), displayName: "" },
    { ...deprecated("legacy"), deprecatedSince: "" },
    { ...deprecated("legacy"), removedSince: "" },
    { ...deprecated("legacy"), replacementChipType: "" },
  ]) {
    assert.throws(() => createDockingChipCatalog([], [record]), /invalid deprecated chip record/);
  }
});

test("returns independent classifications without changing catalog or documents", () => {
  const current = [{ chipType: "search", displayName: "検索", kind: "control" }];
  const deprecatedRecords = [deprecated("legacy")];
  const documents = documentsFixture();
  const before = structuredClone(documents);
  const catalog = createDockingChipCatalog(current, deprecatedRecords);
  current[0].displayName = "mutated";
  deprecatedRecords[0].displayName = "mutated";

  const first = classifyDockingDocumentChips(documents.bayConfigurations, catalog);
  first[0].displayName = "mutated result";

  assert.equal(classifyDockingChipType("search", catalog).displayName, "検索");
  assert.equal(classifyDockingChipType("legacy", catalog).displayName, "旧legacy");
  assert.equal(classifyDockingDocumentChips(documents.bayConfigurations, catalog)[0].displayName, "検索");
  assert.deepEqual(documents, before);
  assert.deepEqual(classifyDockingDocumentChips({ ...documents.bayConfigurations, bays: [] }, catalog), []);
});

function fixtureCatalog() {
  return createDockingChipCatalog(CURRENT_DOCKING_CHIP_RECORDS, [
    deprecatedRecord("legacy-search"),
    {
      chipType: "legacy-sort",
      displayName: "旧ソート",
      deprecatedSince: "0.1.0",
      removedSince: "0.3.0",
    },
  ]);
}

function deprecated(chipType) {
  return {
    chipType,
    displayName: `旧${chipType}`,
    deprecatedSince: "0.2.0",
    removedSince: "0.4.0",
  };
}

function deprecatedRecord(chipType) {
  return {
    chipType,
    displayName: "旧検索",
    deprecatedSince: "0.2.0",
    removedSince: "0.4.0",
    replacementChipType: "search",
  };
}

function documentsFixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 3,
      nextChipSequence: 5,
      bays: [
        {
          id: "bay-1",
          name: "一",
          permanent: false,
          chips: [
            { instanceId: "chip-1", chipType: "search", order: 1, settings: {} },
            { instanceId: "chip-2", chipType: "legacy-search", order: 2, settings: {} },
          ],
        },
        {
          id: "bay-2",
          name: "二",
          permanent: false,
          chips: [
            { instanceId: "chip-3", chipType: "legacy-search", order: 1, settings: {} },
            { instanceId: "chip-4", chipType: "future-chip", order: 2, settings: {} },
          ],
        },
      ],
    },
  };
}
