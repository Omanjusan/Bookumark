import test from "node:test";
import assert from "node:assert/strict";

import { createBayEditSession } from "../dist/panel/lib/bay-edit-session.js";

test("renames with trimming and includes the name in undo and redo", () => {
  const session = createBayEditSession(fixture(), "bay-1");

  assert.equal(session.renameBay("  調査用  "), true);
  assert.equal(session.draftBay().name, "調査用");
  assert.equal(session.savedBay().name, "表示設定");
  assert.equal(session.undo(), true);
  assert.equal(session.draftBay().name, "表示設定");
  assert.equal(session.redo(), true);
  assert.equal(session.draftBay().name, "調査用");
});

test("allows duplicate names and treats the current trimmed name as a no-op", () => {
  const session = createBayEditSession(fixture(), "bay-1");

  assert.equal(session.renameBay("表示設定"), false);
  assert.equal(session.renameBay("  表示設定  "), false);

  assert.equal(session.dirty, false);
  assert.equal(session.canUndo, false);
});

test("rejects an empty name without changing the draft or history", () => {
  const session = createBayEditSession(fixture(), "bay-1");

  assert.throws(() => session.renameBay("   "), /bay name must not be empty/);

  assert.equal(session.draftBay().name, "表示設定");
  assert.equal(session.dirty, false);
  assert.equal(session.canUndo, false);
});

test("saves and discards renamed states through the existing boundaries", async () => {
  const saved = [];
  const session = createBayEditSession(fixture(), "bay-1", {
    saveDocument: async (document) => { saved.push(document); },
  });
  session.renameBay("調査用");
  await session.save();

  assert.equal(saved[0].bays[0].name, "調査用");
  assert.equal(session.savedBay().name, "調査用");
  session.renameBay("一時名");
  session.discardChanges();
  assert.equal(session.draftBay().name, "調査用");
});

function fixture() {
  return {
    schemaVersion: 1,
    nextBaySequence: 2,
    nextChipSequence: 1,
    bays: [{ id: "bay-1", name: "表示設定", permanent: false, chips: [] }],
  };
}
