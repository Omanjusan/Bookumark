import test from "node:test";
import assert from "node:assert/strict";

import {
  createLayoutPlacementEditSession,
} from "../dist/panel/lib/layout-placement-edit-session.js";

test("saves only the main layouts document and makes success the new history boundary", async () => {
  const requests = [];
  const session = createLayoutPlacementEditSession(fixture(), {
    saveDocuments: async (patch) => { requests.push(structuredClone(patch)); },
  });
  session.moveToRailPosition("bay-3", "top", 1);

  const saved = await session.save();

  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0]), ["mainLayouts"]);
  assert.deepEqual(requests[0].mainLayouts, session.documents().mainLayouts);
  assert.equal(session.dirty, false);
  assert.equal(session.canUndo, false);
  assert.equal(session.canRedo, false);
  assert.equal(session.saving, false);
  assert.equal(session.pendingRetry, false);
  assert.deepEqual(saved.mainLayouts, requests[0].mainLayouts);

  session.moveToRailPosition("bay-1", "left", 0);
  assert.equal(session.dirty, true);
  assert.equal(session.undo(), true);
  assert.equal(session.dirty, false);
});

test("keeps draft, history, and the exact candidate after failure for explicit retry", async () => {
  const requests = [];
  let attempts = 0;
  const session = createLayoutPlacementEditSession(fixture(), {
    saveDocuments: async (patch) => {
      requests.push(structuredClone(patch));
      attempts += 1;
      patch.mainLayouts.layouts[1].placements.length = 0;
      if (attempts === 1) throw new Error("storage failed");
    },
  });
  session.moveToRailPosition("bay-3", "left", 0);
  const draftBeforeSave = session.documents();

  await assert.rejects(session.save(), /storage failed/);
  assert.deepEqual(session.documents(), draftBeforeSave);
  assert.equal(session.dirty, true);
  assert.equal(session.canUndo, true);
  assert.equal(session.pendingRetry, true);
  assert.deepEqual(session.retryCandidate(), { mainLayouts: draftBeforeSave.mainLayouts });
  assert.throws(
    () => session.moveToRailPosition("bay-1", "right", 0),
    /failed layout save must be retried/,
  );
  assert.throws(() => session.unplace("bay-1"), /failed layout save must be retried/);
  assert.throws(() => session.undo(), /failed layout save must be retried/);
  assert.throws(() => session.redo(), /failed layout save must be retried/);
  assert.deepEqual(session.documents(), draftBeforeSave);

  await session.retry();
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(session.pendingRetry, false);
  assert.equal(session.dirty, false);
  assert.equal(session.canUndo, false);
});

test("blocks edits, history actions, duplicate save, and retry while saving", async () => {
  let finish;
  const wait = new Promise((resolve) => { finish = resolve; });
  const session = createLayoutPlacementEditSession(fixture(), {
    saveDocuments: async () => { await wait; },
  });
  session.moveToRailPosition("bay-3", "top", 1);
  const saving = session.save();

  assert.equal(session.saving, true);
  assert.throws(() => session.moveToRailPosition("bay-1", "left", 0), /save is in progress/);
  assert.throws(() => session.unplace("bay-1"), /save is in progress/);
  assert.throws(() => session.undo(), /save is in progress/);
  assert.throws(() => session.redo(), /save is in progress/);
  await assert.rejects(session.save(), /save is already in progress/);
  await assert.rejects(session.retry(), /save is already in progress/);

  finish();
  await saving;
  assert.equal(session.saving, false);
});

test("does not save a clean draft or retry without a failed candidate", async () => {
  let saves = 0;
  const session = createLayoutPlacementEditSession(fixture(), {
    saveDocuments: async () => { saves += 1; },
  });

  await session.save();
  await assert.rejects(session.retry(), /layout save is not pending/);
  assert.equal(saves, 0);
});

function fixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 4,
      nextChipSequence: 1,
      bays: [
        { id: "bay-1", name: "固定", permanent: true, chips: [] },
        { id: "bay-2", name: "配置済み", permanent: false, chips: [] },
        { id: "bay-3", name: "未配置", permanent: false, chips: [] },
      ],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        { id: "layout-1", name: "内部", systemDefault: true, placements: [] },
        {
          id: "layout-2", name: "作業", systemDefault: false,
          placements: [
            { bayId: "bay-1", rail: "top", order: 1 },
            { bayId: "bay-2", rail: "bottom", order: 1 },
          ],
        },
      ],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-2" },
  };
}
