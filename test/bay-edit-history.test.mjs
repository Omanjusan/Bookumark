import test from "node:test";
import assert from "node:assert/strict";

import { createBayEditSession } from "../dist/panel/lib/bay-edit-session.js";

test("undoes and redoes add, delete, reorder, and settings as individual operations", () => {
  const session = createBayEditSession(fixture(), "bay-1");
  const initial = session.draftBay();

  session.addChip("sort", 1);
  const afterAdd = session.draftBay();
  session.deleteChip("chip-1");
  const afterDelete = session.draftBay();
  session.reorderChip("chip-2", 0);
  const afterReorder = session.draftBay();
  session.updateChipSettings("chip-3", { direction: "descending" });
  const afterSettings = session.draftBay();

  assert.equal(session.canUndo, true);
  assert.equal(session.canRedo, false);
  assert.equal(session.undo(), true);
  assert.deepEqual(session.draftBay(), afterReorder);
  assert.equal(session.undo(), true);
  assert.deepEqual(session.draftBay(), afterDelete);
  assert.equal(session.undo(), true);
  assert.deepEqual(session.draftBay(), afterAdd);
  assert.equal(session.undo(), true);
  assert.deepEqual(session.draftBay(), initial);
  assert.equal(session.dirty, false);
  assert.equal(session.canUndo, false);

  assert.equal(session.redo(), true);
  assert.deepEqual(session.draftBay(), afterAdd);
  assert.equal(session.redo(), true);
  assert.deepEqual(session.draftBay(), afterDelete);
  assert.equal(session.redo(), true);
  assert.deepEqual(session.draftBay(), afterReorder);
  assert.equal(session.redo(), true);
  assert.deepEqual(session.draftBay(), afterSettings);
  assert.equal(session.canRedo, false);
});

test("does not rewind issued ids when an addition is undone", () => {
  const session = createBayEditSession(fixture(), "bay-1");

  assert.equal(session.addChip("sort", 2), "chip-3");
  session.undo();
  assert.equal(session.nextChipSequence, 4);
  assert.equal(session.addChip("view-type", 2), "chip-4");

  assert.equal(session.nextChipSequence, 5);
  assert.equal(session.draftBay().chips.at(-1).instanceId, "chip-4");
});

test("restores the same issued id when an undone addition is redone", () => {
  const session = createBayEditSession(fixture(), "bay-1");

  session.addChip("sort", 2);
  session.undo();
  session.redo();

  assert.equal(session.draftBay().chips.at(-1).instanceId, "chip-3");
  assert.equal(session.nextChipSequence, 4);
});

test("clears the redo branch after a new mutation", () => {
  const session = createBayEditSession(fixture(), "bay-1");
  session.deleteChip("chip-1");
  session.undo();

  session.updateChipSettings("chip-2", { mode: "unvisited" });

  assert.equal(session.canRedo, false);
  assert.equal(session.redo(), false);
});

test("does not create history for a no-op or invalid operation", () => {
  const session = createBayEditSession(fixture(), "bay-1");

  assert.equal(session.reorderChip("chip-1", 0), false);
  assert.throws(() => session.deleteChip("chip-404"));

  assert.equal(session.canUndo, false);
  assert.equal(session.undo(), false);
  assert.equal(session.redo(), false);
});

test("makes a saved state the new irreversible history boundary", () => {
  const session = createBayEditSession(fixture(), "bay-1");
  session.deleteChip("chip-1");
  const saved = session.draftBay();

  session.markSaved();

  assert.equal(session.dirty, false);
  assert.equal(session.canUndo, false);
  assert.equal(session.canRedo, false);
  assert.equal(session.undo(), false);
  assert.deepEqual(session.savedBay(), saved);

  session.addChip("sort", 1);
  assert.equal(session.undo(), true);
  assert.deepEqual(session.draftBay(), saved);
  assert.equal(session.undo(), false);
});

test("discards changes back to the last saved boundary without reusing ids", () => {
  const session = createBayEditSession(fixture(), "bay-1");
  session.addChip("sort", 2);
  session.deleteChip("chip-1");

  session.discardChanges();

  assert.equal(session.dirty, false);
  assert.equal(session.canUndo, false);
  assert.equal(session.canRedo, false);
  assert.deepEqual(session.draftBay(), session.savedBay());
  assert.equal(session.nextChipSequence, 4);
  assert.equal(session.addChip("view-type", 2), "chip-4");
});

function fixture() {
  return {
    schemaVersion: 1,
    nextBaySequence: 2,
    nextChipSequence: 3,
    bays: [{
      id: "bay-1",
      name: "表示設定",
      permanent: false,
      chips: [
        { instanceId: "chip-1", chipType: "search", order: 1, settings: {} },
        { instanceId: "chip-2", chipType: "visit-status", order: 2, settings: {} },
      ],
    }],
  };
}
