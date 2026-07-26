import test from "node:test";
import assert from "node:assert/strict";

import { createBayEditSession } from "../dist/panel/lib/bay-edit-session.js";

test("saves only the edited bay and issued sequence in a defensive document", async () => {
  const source = fixture();
  const saved = [];
  const session = createBayEditSession(source, "bay-2", {
    saveDocument: async (document) => { saved.push(document); },
  });
  session.addChip("sort", 1);

  await session.save();

  assert.equal(saved.length, 1);
  assert.equal(saved[0].nextBaySequence, source.nextBaySequence);
  assert.equal(saved[0].nextChipSequence, 4);
  assert.deepEqual(saved[0].bays[0], source.bays[0]);
  assert.deepEqual(saved[0].bays[1], session.savedBay());
  assert.equal(session.dirty, false);
  assert.equal(session.canUndo, false);
  assert.equal(session.canRedo, false);

  source.bays[0].name = "呼出後に原本を変更";
  assert.equal(saved[0].bays[0].name, "固定ベイ");
});

test("keeps the draft and complete history when saving fails", async () => {
  const failure = new Error("storage unavailable");
  const session = createBayEditSession(fixture(), "bay-2", {
    saveDocument: async () => { throw failure; },
  });
  session.addChip("sort", 1);
  session.deleteChip("chip-2");
  const draft = session.draftBay();

  await assert.rejects(session.save(), failure);

  assert.equal(session.saving, false);
  assert.equal(session.dirty, true);
  assert.equal(session.canUndo, true);
  assert.deepEqual(session.draftBay(), draft);
  assert.equal(session.undo(), true);
  assert.equal(session.undo(), true);
  assert.deepEqual(session.draftBay(), session.savedBay());
});

test("blocks mutations, history actions, and duplicate saves while saving", async () => {
  let finishSave;
  let saveCalls = 0;
  const pending = new Promise((resolve) => { finishSave = resolve; });
  const session = createBayEditSession(fixture(), "bay-2", {
    saveDocument: async () => { saveCalls += 1; await pending; },
  });
  session.addChip("sort", 1);

  const saving = session.save();

  assert.equal(session.saving, true);
  assert.throws(() => session.addChip("view-type", 0), /save is in progress/);
  assert.throws(() => session.deleteChip("chip-2"), /save is in progress/);
  assert.throws(() => session.reorderChip("chip-2", 1), /save is in progress/);
  assert.throws(() => session.updateChipSettings("chip-2", {}), /save is in progress/);
  assert.throws(() => session.undo(), /save is in progress/);
  assert.throws(() => session.redo(), /save is in progress/);
  await assert.rejects(session.save(), /save is already in progress/);
  assert.equal(saveCalls, 1);

  finishSave();
  await saving;
  assert.equal(session.saving, false);
});

test("does not issue a storage request for a clean session", async () => {
  let saveCalls = 0;
  const session = createBayEditSession(fixture(), "bay-2", {
    saveDocument: async () => { saveCalls += 1; },
  });

  await session.save();

  assert.equal(saveCalls, 0);
  assert.equal(session.saving, false);
});

test("uses the last successful document as the base of a later save", async () => {
  const saved = [];
  const session = createBayEditSession(fixture(), "bay-2", {
    saveDocument: async (document) => { saved.push(structuredClone(document)); },
  });

  session.addChip("sort", 1);
  await session.save();
  session.updateChipSettings("chip-3", { direction: "descending" });
  await session.save();

  assert.equal(saved.length, 2);
  assert.equal(saved[1].nextChipSequence, 4);
  assert.deepEqual(saved[1].bays[1].chips[1].settings, { direction: "descending" });
});

function fixture() {
  return {
    schemaVersion: 1,
    nextBaySequence: 3,
    nextChipSequence: 3,
    bays: [
      { id: "bay-1", name: "固定ベイ", permanent: true, chips: [] },
      {
        id: "bay-2",
        name: "表示設定",
        permanent: false,
        chips: [
          { instanceId: "chip-2", chipType: "search", order: 1, settings: {} },
        ],
      },
    ],
  };
}
