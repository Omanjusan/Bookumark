import test from "node:test";
import assert from "node:assert/strict";

import {
  createBayDeletionSession,
} from "../dist/panel/lib/bay-deletion-session.js";

test("marks complete deletion as an undoable pending operation with reference count", () => {
  const session = createBayDeletionSession(fixture(), "bay-2");

  assert.equal(session.pending, false);
  assert.deepEqual(session.plan(), {
    bayId: "bay-2",
    referencedLayoutIds: ["layout-1", "layout-3"],
    referencedLayoutCount: 2,
  });
  assert.equal(session.pending, true);
  assert.equal(session.canUndo, true);
  assert.equal(session.canRedo, false);
});

test("undoes and redoes the same deletion plan", () => {
  const session = createBayDeletionSession(fixture(), "bay-2");
  const planned = session.plan();

  assert.equal(session.undo(), true);
  assert.equal(session.pending, false);
  assert.equal(session.canUndo, false);
  assert.equal(session.canRedo, true);
  assert.equal(session.redo(), true);
  assert.equal(session.pending, true);
  assert.deepEqual(session.plan(), planned);
});

test("does not create duplicate history when deletion is already pending", () => {
  const session = createBayDeletionSession(fixture(), "bay-2");

  session.plan();
  session.plan();
  session.undo();

  assert.equal(session.pending, false);
  assert.equal(session.undo(), false);
});

test("returns defensive plans and supports an unreferenced user bay", () => {
  const session = createBayDeletionSession(fixture(), "bay-3");
  const first = session.plan();
  first.referencedLayoutIds.push("changed");

  assert.deepEqual(session.currentPlan(), {
    bayId: "bay-3",
    referencedLayoutIds: [],
    referencedLayoutCount: 0,
  });
});

test("rejects unknown and permanent bays before creating pending state", () => {
  assert.throws(
    () => createBayDeletionSession(fixture(), "bay-404"),
    /bay was not found: bay-404/,
  );
  assert.throws(
    () => createBayDeletionSession(fixture(), "bay-1"),
    /permanent bay cannot be deleted/,
  );
});

test("removes the bay and every layout reference in one save request", async () => {
  const requests = [];
  const documents = fixture();
  documents.mainLayouts.layouts[0].placements.push(
    { bayId: "bay-3", rail: "top", order: 3 },
    { bayId: "bay-3", rail: "bottom", order: 1 },
  );
  const session = createBayDeletionSession(documents, "bay-2", {
    saveDocuments: async (patch) => { requests.push(patch); },
  });
  session.plan();

  const result = await session.save();

  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0]).sort(), ["bayConfigurations", "mainLayouts"]);
  assert.deepEqual(
    result.documents.bayConfigurations.bays.map(({ id }) => id),
    ["bay-1", "bay-3"],
  );
  assert.equal(
    result.documents.mainLayouts.layouts.flatMap((layout) => layout.placements)
      .some(({ bayId }) => bayId === "bay-2"),
    false,
  );
  assert.deepEqual(result.documents.mainLayouts.layouts[0].placements, [
    { bayId: "bay-1", rail: "top", order: 1 },
    { bayId: "bay-3", rail: "top", order: 2 },
    { bayId: "bay-3", rail: "bottom", order: 1 },
  ]);
  assert.equal(result.documents.bayConfigurations.nextBaySequence, 4);
  assert.equal(result.documents.bayConfigurations.nextChipSequence, 1);
  assert.deepEqual(requests[0], result.documents);
  assert.equal(session.deleted, true);
  assert.equal(session.pending, false);
  assert.equal(session.canUndo, false);
});

test("keeps the deletion plan and history when saving fails", async () => {
  const session = createBayDeletionSession(fixture(), "bay-2", {
    saveDocuments: async () => { throw new Error("storage failed"); },
  });
  session.plan();

  await assert.rejects(session.save(), /storage failed/);

  assert.equal(session.saving, false);
  assert.equal(session.deleted, false);
  assert.equal(session.pending, true);
  assert.equal(session.canUndo, true);
  assert.equal(session.undo(), true);
});

test("rejects save without a pending deletion and prevents duplicate saves", async () => {
  let finishSave;
  const pendingSave = new Promise((resolve) => { finishSave = resolve; });
  const session = createBayDeletionSession(fixture(), "bay-2", {
    saveDocuments: async () => { await pendingSave; },
  });

  await assert.rejects(session.save(), /deletion is not pending/);
  session.plan();
  const saving = session.save();
  assert.equal(session.saving, true);
  await assert.rejects(session.save(), /deletion save is already in progress/);
  assert.throws(() => session.undo(), /deletion save is in progress/);
  finishSave();
  await saving;
});

test("does not change input documents when deletion saving fails", async () => {
  const documents = fixture();
  const before = structuredClone(documents);
  const session = createBayDeletionSession(documents, "bay-2", {
    saveDocuments: async (patch) => {
      patch.bayConfigurations.bays.length = 0;
      throw new Error("storage failed");
    },
  });
  session.plan();

  await assert.rejects(session.save());

  assert.deepEqual(documents, before);
  assert.deepEqual(session.currentPlan().referencedLayoutIds, ["layout-1", "layout-3"]);
});

function fixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 4,
      nextChipSequence: 1,
      bays: [
        { id: "bay-1", name: "固定", permanent: true, chips: [] },
        { id: "bay-2", name: "表示", permanent: false, chips: [] },
        { id: "bay-3", name: "未配置", permanent: false, chips: [] },
      ],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 4,
      layouts: [
        layout("layout-1", ["bay-1", "bay-2"]),
        layout("layout-2", ["bay-1"]),
        layout("layout-3", ["bay-2"]),
      ],
    },
  };
}

function layout(id, bayIds) {
  return {
    id,
    name: id,
    systemDefault: id === "layout-1",
    placements: bayIds.map((bayId, index) => ({ bayId, rail: "top", order: index + 1 })),
  };
}
