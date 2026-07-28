import test from "node:test";
import assert from "node:assert/strict";

import {
  createDockingEditRuntimeCoordinator,
} from "../dist/panel/lib/docking-edit-runtime-coordinator.js";
import { createDefaultDockingSharedState } from "../dist/panel/lib/docking-shared-state.js";

test("disconnects normal runtime on enter and uses only previews while editing", () => {
  const harness = createHarness();
  const coordinator = createDockingEditRuntimeCoordinator(
    fixture(),
    createDefaultDockingSharedState("layout-1"),
    harness.options,
  );

  coordinator.enter(fixture());
  const draft = fixture();
  draft.mainLayouts.layouts[0].placements.push({ bayId: "bay-1", rail: "left", order: 1 });
  coordinator.preview(draft);

  assert.equal(coordinator.editing, true);
  assert.deepEqual(harness.events.map(([type]) => type), ["disconnect", "preview", "preview"]);
  assert.equal(harness.events.some(([type]) => type === "connect"), false);
});

test("keeps editing after save commit and reconnects only on exit", () => {
  const harness = createHarness();
  const initial = fixture();
  const coordinator = createDockingEditRuntimeCoordinator(
    initial,
    createDefaultDockingSharedState("layout-1"),
    harness.options,
  );
  coordinator.enter(initial);
  const saved = fixture();
  saved.mainLayouts.layouts[0].placements.push({ bayId: "bay-1", rail: "right", order: 1 });
  const state = { ...createDefaultDockingSharedState("layout-1"), query: "condition" };

  coordinator.commit({
    documents: saved,
    state,
    warnings: [],
    conditionFailures: [],
  });

  assert.equal(coordinator.editing, true);
  assert.equal(harness.events.some(([type]) => type === "connect"), false);
  coordinator.exit();
  coordinator.exit();

  assert.equal(coordinator.editing, false);
  assert.deepEqual(harness.events.map(([type]) => type), ["disconnect", "preview", "connect"]);
  assert.deepEqual(harness.events.at(-1), ["connect", saved, state]);
});

test("maintains a non-active preview without changing saved active layout", () => {
  const harness = createHarness();
  const documents = fixture();
  const before = structuredClone(documents);
  const coordinator = createDockingEditRuntimeCoordinator(
    documents,
    createDefaultDockingSharedState("layout-1"),
    harness.options,
  );
  coordinator.enter(documents);

  coordinator.preview(documents, "layout-2");
  const previewEvent = harness.events.at(-1);
  assert.equal(previewEvent[0], "preview");
  assert.equal(previewEvent[1].dockingMetadata.activeLayoutId, "layout-2");
  assert.deepEqual(documents, before);

  coordinator.commit({
    documents,
    state: createDefaultDockingSharedState("layout-1"),
    warnings: [],
    conditionFailures: [],
  });
  assert.equal(harness.events.filter(([type]) => type === "preview").length, 2);
  assert.equal(coordinator.previewLayoutId, "layout-2");
});

test("reconnects the previous saved baseline when editing exits without a commit", () => {
  const harness = createHarness();
  const documents = fixture();
  const state = { ...createDefaultDockingSharedState("layout-1"), query: "before" };
  const coordinator = createDockingEditRuntimeCoordinator(documents, state, harness.options);
  coordinator.enter(documents);
  const draft = fixture();
  draft.dockingMetadata.activeLayoutId = "layout-2";
  coordinator.preview(draft, "layout-2");

  coordinator.exit();

  assert.deepEqual(harness.events.at(-1), ["connect", documents, state]);
});

test("defensively separates committed and connected documents from callers", () => {
  const harness = createHarness();
  const documents = fixture();
  const coordinator = createDockingEditRuntimeCoordinator(
    documents,
    createDefaultDockingSharedState("layout-1"),
    harness.options,
  );
  coordinator.enter(documents);
  const saved = fixture();
  const state = createDefaultDockingSharedState("layout-1");
  coordinator.commit({ documents: saved, state, warnings: [], conditionFailures: [] });
  saved.mainLayouts.layouts[0].name = "mutated";
  state.query = "mutated";
  coordinator.exit();
  harness.events.at(-1)[1].mainLayouts.layouts[0].name = "consumer mutation";

  assert.equal(coordinator.getSavedDocuments().mainLayouts.layouts[0].name, "一");
  assert.equal(coordinator.getSavedState().query, "");
});

function createHarness() {
  const events = [];
  return {
    events,
    options: {
      disconnectNormalRuntime: () => events.push(["disconnect"]),
      renderPreview: (documents) => events.push(["preview", documents]),
      connectNormalRuntime: (documents, state) => events.push(["connect", documents, state]),
    },
  };
}

function fixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 2,
      nextChipSequence: 1,
      bays: [{ id: "bay-1", name: "基本", permanent: true, chips: [] }],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        { id: "layout-1", name: "一", systemDefault: false, placements: [] },
        { id: "layout-2", name: "二", systemDefault: false, placements: [] },
      ],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-1" },
  };
}
