import test from "node:test";
import assert from "node:assert/strict";

import { createLayoutManagementCoordinator } from "../dist/panel/lib/layout-management-coordinator.js";

test("creates blank, shared, and independent layouts through atomic saves", async () => {
  const requests = [];
  const coordinator = createLayoutManagementCoordinator(fixture(), {
    saveDocuments: async (patch) => { requests.push(patch); },
  });

  await coordinator.create({ name: "空", sourceLayoutId: null, duplicateBays: false });
  await coordinator.create({ name: "共有", sourceLayoutId: "layout-2", duplicateBays: false });
  await coordinator.create({ name: "独立", sourceLayoutId: "layout-2", duplicateBays: true });

  const state = coordinator.state();
  assert.deepEqual(state.mainLayouts.layouts.slice(-3).map(({ name }) => name), ["空", "共有", "独立"]);
  assert.deepEqual(state.mainLayouts.layouts.at(-2).placements.map(({ bayId }) => bayId), ["bay-2", "bay-1"]);
  assert.deepEqual(state.mainLayouts.layouts.at(-1).placements.map(({ bayId }) => bayId), ["bay-3", "bay-1"]);
  assert.equal(state.dockingMetadata.activeLayoutId, state.mainLayouts.layouts.at(-1).id);
  assert.deepEqual(requests.map((request) => Object.keys(request).sort()), [
    ["dockingMetadata", "mainLayouts"],
    ["dockingMetadata", "mainLayouts"],
    ["bayConfigurations", "dockingMetadata", "mainLayouts"],
  ]);
});

test("coordinates rename, preference, switch, restore, and deletion", async () => {
  const requests = [];
  const coordinator = createLayoutManagementCoordinator(fixture(), {
    saveDocuments: async (patch) => { requests.push(patch); },
  });

  await coordinator.rename("layout-2", "集中用");
  await coordinator.setPreferred("layout-2");
  await coordinator.restoreDefault();
  assert.equal(coordinator.state().dockingMetadata.activeLayoutId, "layout-1");
  await coordinator.switchTo("layout-2");
  await coordinator.delete("layout-2");

  const state = coordinator.state();
  assert.deepEqual(state.mainLayouts.layouts.map(({ id }) => id), ["layout-1"]);
  assert.deepEqual(state.dockingMetadata, { schemaVersion: 1, activeLayoutId: "layout-1" });
  assert.deepEqual(requests.map((request) => Object.keys(request).sort()), [
    ["mainLayouts"],
    ["dockingMetadata"],
    ["dockingMetadata"],
    ["dockingMetadata"],
    ["dockingMetadata", "mainLayouts"],
  ]);
});

test("keeps state unchanged when persistence fails and exposes retry", async () => {
  let attempts = 0;
  const coordinator = createLayoutManagementCoordinator(fixture(), {
    saveDocuments: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("storage failed");
    },
  });

  await assert.rejects(coordinator.rename("layout-2", "集中用"), /storage failed/);
  assert.equal(coordinator.state().mainLayouts.layouts[1].name, "作業用");
  assert.equal(coordinator.pending, true);

  await coordinator.retry();
  assert.equal(coordinator.state().mainLayouts.layouts[1].name, "集中用");
  assert.equal(coordinator.pending, false);
});

function fixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 3,
      nextChipSequence: 2,
      bays: [
        { id: "bay-1", name: "固定", permanent: true, chips: [] },
        {
          id: "bay-2",
          name: "検索",
          permanent: false,
          chips: [{ instanceId: "chip-1", chipType: "search", order: 1, settings: {} }],
        },
      ],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        {
          id: "layout-1",
          name: "内部デフォルト",
          systemDefault: true,
          placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
        },
        {
          id: "layout-2",
          name: "作業用",
          systemDefault: false,
          placements: [
            { bayId: "bay-2", rail: "top", order: 1 },
            { bayId: "bay-1", rail: "bottom", order: 1 },
          ],
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
