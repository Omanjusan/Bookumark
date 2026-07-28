import test from "node:test";
import assert from "node:assert/strict";

import { runPanelDockingStartup } from "../dist/panel/lib/panel-docking-startup.js";
import { createDockingChipCatalog } from "../dist/panel/lib/docking-chip-catalog.js";

test("starts runtime once without dialogs or saves when recovery is unnecessary", async () => {
  const calls = [];
  const documents = fixture();
  const result = await runPanelDockingStartup(normalization(documents), catalog(), options(calls));
  assert.deepEqual(calls, ["runtime"]);
  assert.deepEqual(result, documents);
});

test("persists unknown recovery before deprecated confirmation and runtime", async () => {
  const calls = [];
  const documents = fixture([
    chip("unknown", "future-chip", 1),
    chip("old", "legacy-chip", 2),
    chip("current", "search", 3),
  ]);
  await runPanelDockingStartup(normalization(documents), catalog(), options(calls));
  assert.deepEqual(calls, ["recovery-dialog", "save:old,current", "deprecated-dialog", "save:current", "runtime"]);
});

test("keeps runtime closed and allows the identical recovery candidate to be retried", async () => {
  const calls = [];
  let attempts = 0;
  const dependencies = options(calls);
  dependencies.saveDocuments = async (patch) => {
    calls.push(`save:${ids(patch.bayConfigurations)}`);
    attempts += 1;
    if (attempts === 1) throw new Error("storage failed");
  };
  dependencies.presentRecovery = async (_snapshot, save) => {
    calls.push("recovery-dialog");
    await assert.rejects(save, /storage failed/);
    assert.equal(calls.includes("runtime"), false);
    await save();
  };
  await runPanelDockingStartup(
    normalization(fixture([chip("unknown", "future-chip", 1), chip("current", "search", 2)])),
    catalog(),
    dependencies,
  );
  assert.deepEqual(calls, ["recovery-dialog", "save:current", "save:current", "runtime"]);
});

test("does not start runtime when a dialog bypasses its required save", async () => {
  const dependencies = options([]);
  dependencies.presentRecovery = async () => {};
  await assert.rejects(
    runPanelDockingStartup(
      normalization(fixture([chip("unknown", "future-chip", 1)])),
      catalog(),
      dependencies,
    ),
    /completed before persistence/,
  );
});

function options(calls) {
  return {
    saveDocuments: async (patch) => calls.push(`save:${ids(patch.bayConfigurations)}`),
    presentRecovery: async (_snapshot, save) => { calls.push("recovery-dialog"); await save(); },
    presentDeprecated: async (_summary, save) => { calls.push("deprecated-dialog"); await save(); },
    startRuntime: () => calls.push("runtime"),
  };
}

function ids(document) {
  return document?.bays[0].chips.map(({ instanceId }) => instanceId).join(",") ?? "structural";
}

function normalization(documents) {
  return {
    documents,
    recoveries: { bayConfigurations: "unchanged", mainLayouts: "unchanged", dockingMetadata: "unchanged" },
    changedDocuments: [],
  };
}

function catalog() {
  return createDockingChipCatalog(
    [{ chipType: "search", displayName: "検索", kind: "control" }],
    [{ chipType: "legacy-chip", displayName: "旧検索", deprecatedSince: "1", removedSince: "2", replacementChipType: "search" }],
  );
}

function chip(instanceId, chipType, order) { return { instanceId, chipType, order, settings: {} }; }

function fixture(chips = [chip("current", "search", 1)]) {
  return {
    bayConfigurations: { schemaVersion: 1, nextBaySequence: 2, nextChipSequence: 4, bays: [{ id: "bay-1", name: "ベイ", permanent: true, chips }] },
    mainLayouts: { schemaVersion: 1, nextLayoutSequence: 2, layouts: [{ id: "layout-1", name: "標準", systemDefault: true, placements: [] }] },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-1", lastUsedLayoutId: "layout-1" },
  };
}
