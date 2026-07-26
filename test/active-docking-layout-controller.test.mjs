import test from "node:test";
import assert from "node:assert/strict";

import {
  createActiveDockingLayoutController,
  createDockingTransientState,
} from "../dist/panel/lib/active-docking-layout-controller.js";

test("disconnects, clears, resets, then renders the new active layout", () => {
  const events = [];
  let connectionSequence = 0;
  const controller = createActiveDockingLayoutController({
    clearDynamicRails: () => events.push("clear"),
    resetTransientState: () => events.push("reset"),
    render: (plan) => {
      events.push(`render:${plan.activeLayoutId}`);
      const sequence = ++connectionSequence;
      return { disconnect: () => events.push(`disconnect:${sequence}`) };
    },
  });

  controller.rebuild(documents("layout-1"));
  assert.deepEqual(events, ["clear", "reset", "render:layout-1"]);

  events.length = 0;
  const result = controller.rebuild(documents("layout-2"));
  assert.deepEqual(events, ["disconnect:1", "clear", "reset", "render:layout-2"]);
  assert.equal(result.activeLayoutId, "layout-2");
  assert.equal(controller.activeLayoutId, "layout-2");
});

test("resets only agreed transient UI state and starts history at the current folder", () => {
  const state = createDockingTransientState("folder-current");

  assert.deepEqual(state.fixedDisplayState, {
    query: "",
    filters: [],
    display: {
      movementMode: "normal",
      sort: { axisId: "visitCount", direction: "desc" },
      lastStandardSort: { axisId: "visitCount", direction: "desc" },
    },
    activeViewType: "panel",
  });
  assert.equal(state.folderHistory.current(), "folder-current");
  assert.equal(state.folderHistory.backDestination(), null);
  assert.equal(state.folderHistory.forwardDestination(), null);
  assert.equal(state.officialUndo, null);
  assert.equal(state.officialMovePending, false);
  assert.equal(state.folderNavigationPending, false);
  assert.equal(state.dragSession, null);
  assert.equal(state.saving, false);
});

test("does not own or mutate preserved folder, custom order, or docking documents", () => {
  const source = documents("layout-1");
  const before = structuredClone(source);
  const preserved = {
    currentFolderGuid: "folder-9",
    customOrderByFolder: { "folder-9": ["bookmark-2", "bookmark-1"] },
  };
  const preservedBefore = structuredClone(preserved);
  const controller = createActiveDockingLayoutController({
    clearDynamicRails: () => {},
    resetTransientState: () => createDockingTransientState(preserved.currentFolderGuid),
    render: () => ({ disconnect() {} }),
  });

  const plan = controller.rebuild(source);
  plan.rails[0].bays[0].name = "changed result";

  assert.deepEqual(source, before);
  assert.deepEqual(preserved, preservedBefore);
});

test("disconnect clears the current dynamic connection and active id once", () => {
  let disconnected = 0;
  let cleared = 0;
  const controller = createActiveDockingLayoutController({
    clearDynamicRails: () => { cleared += 1; },
    resetTransientState: () => {},
    render: () => ({ disconnect: () => { disconnected += 1; } }),
  });
  controller.rebuild(documents("layout-1"));

  controller.disconnect();
  controller.disconnect();

  assert.equal(disconnected, 1);
  assert.equal(cleared, 2);
  assert.equal(controller.activeLayoutId, null);
});

function documents(activeLayoutId) {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 2,
      nextChipSequence: 2,
      bays: [{
        id: "bay-1",
        name: "基本",
        permanent: true,
        chips: [{ instanceId: "chip-1", chipType: "search", order: 1, settings: {} }],
      }],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        {
          id: "layout-1",
          name: "一",
          systemDefault: true,
          placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
        },
        {
          id: "layout-2",
          name: "二",
          systemDefault: false,
          placements: [{ bayId: "bay-1", rail: "bottom", order: 1 }],
        },
      ],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId },
  };
}
