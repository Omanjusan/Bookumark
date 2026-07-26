import test from "node:test";
import assert from "node:assert/strict";

import { loadPanelDockingState } from "../dist/panel/lib/panel-docking-bootstrap.js";

test("injects concrete internal defaults into normalized startup loading", async () => {
  let receivedFallback;
  const documents = fixture();
  const result = await loadPanelDockingState({
    loadNormalized: async (fallback) => {
      receivedFallback = fallback;
      return {
        documents,
        recoveries: {
          bayConfigurations: "unchanged",
          mainLayouts: "unchanged",
          dockingMetadata: "unchanged",
        },
        changedDocuments: [],
      };
    },
  });

  assert.equal(receivedFallback.bayConfigurations.bays[0].permanent, true);
  assert.equal(receivedFallback.mainLayouts.layouts[0].systemDefault, true);
  assert.equal(receivedFallback.dockingMetadata.activeLayoutId, "layout-1");
  assert.deepEqual(result.documents, documents);
});

test("maps loaded bays to factory models and resolves the active layout", async () => {
  const documents = fixture();
  const result = await loadPanelDockingState({
    loadNormalized: async () => ({
      documents,
      recoveries: {
        bayConfigurations: "unchanged",
        mainLayouts: "unchanged",
        dockingMetadata: "unchanged",
      },
      changedDocuments: [],
    }),
  });

  assert.deepEqual(result.bays, [
    {
      bayId: "bay-1",
      name: "デフォルトベイ",
      permanent: true,
      chips: [{ instanceId: "chip-1", label: "検索" }],
    },
    {
      bayId: "bay-2",
      name: "作業ベイ",
      permanent: false,
      chips: [
        { instanceId: "chip-2", label: "表示形式" },
        { instanceId: "chip-3", label: "custom-chip" },
      ],
    },
  ]);
  assert.deepEqual(result.activeLayout, documents.mainLayouts.layouts[1]);
});

test("returns independent state and propagates startup persistence failures", async () => {
  const documents = fixture();
  const result = await loadPanelDockingState({
    loadNormalized: async () => ({
      documents,
      recoveries: {
        bayConfigurations: "unchanged",
        mainLayouts: "unchanged",
        dockingMetadata: "unchanged",
      },
      changedDocuments: [],
    }),
  });
  result.documents.bayConfigurations.bays[0].name = "changed";
  result.bays[0].chips[0].label = "changed";
  result.activeLayout.name = "changed";
  assert.equal(documents.bayConfigurations.bays[0].name, "デフォルトベイ");
  assert.equal(documents.mainLayouts.layouts[1].name, "作業用");

  const failure = new Error("storage failed");
  await assert.rejects(
    loadPanelDockingState({ loadNormalized: async () => { throw failure; } }),
    (error) => error === failure,
  );
});

function fixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 3,
      nextChipSequence: 4,
      bays: [
        {
          id: "bay-1",
          name: "デフォルトベイ",
          permanent: true,
          chips: [{ instanceId: "chip-1", chipType: "search", order: 1, settings: {} }],
        },
        {
          id: "bay-2",
          name: "作業ベイ",
          permanent: false,
          chips: [
            { instanceId: "chip-2", chipType: "view-type", order: 1, settings: {} },
            { instanceId: "chip-3", chipType: "custom-chip", order: 2, settings: {} },
          ],
        },
      ],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        { id: "layout-1", name: "内部デフォルト", systemDefault: true, placements: [] },
        { id: "layout-2", name: "作業用", systemDefault: false, placements: [] },
      ],
    },
    dockingMetadata: {
      schemaVersion: 1,
      activeLayoutId: "layout-2",
      lastUsedLayoutId: "layout-2",
    },
  };
}
