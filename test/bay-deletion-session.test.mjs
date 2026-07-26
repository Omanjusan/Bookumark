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
