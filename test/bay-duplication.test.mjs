import test from "node:test";
import assert from "node:assert/strict";

import {
  createBayDuplicationSession,
} from "../dist/panel/lib/bay-duplication.js";

test("marks one independent duplicate as an undoable and redoable pending operation", () => {
  const session = createBayDuplicationSession(fixture(), "bay-2", "layout-2", {
    saveDocuments: async () => {},
  });

  assert.equal(session.pending, false);
  assert.equal(session.plan().name, "表示設定 3");
  assert.equal(session.pending, true);
  assert.equal(session.canUndo, true);
  assert.equal(session.undo(), true);
  assert.equal(session.pending, false);
  assert.equal(session.canRedo, true);
  assert.equal(session.redo(), true);
  assert.equal(session.pending, true);
  assert.equal(session.plan().name, "表示設定 3");
});

test("issues new bay and chip ids and saves an independent duplicate once", async () => {
  const requests = [];
  const documents = fixture();
  const session = createBayDuplicationSession(documents, "bay-2", "layout-2", {
    saveDocuments: async (patch) => { requests.push(patch); },
  });
  session.plan();

  const result = await session.save();

  assert.equal(requests.length, 1);
  assert.equal(result.bay.id, "bay-4");
  assert.equal(result.bay.name, "表示設定 3");
  assert.deepEqual(
    result.bay.chips.map(({ instanceId, chipType, order }) => ({ instanceId, chipType, order })),
    [
      { instanceId: "chip-4", chipType: "search", order: 1 },
      { instanceId: "chip-5", chipType: "view-type", order: 2 },
    ],
  );
  assert.equal(result.documents.bayConfigurations.nextBaySequence, 5);
  assert.equal(result.documents.bayConfigurations.nextChipSequence, 6);
  assert.deepEqual(
    result.documents.mainLayouts.layouts[1].placements.at(-1),
    { bayId: "bay-4", rail: "top", order: 3 },
  );
  assert.deepEqual(requests[0], result.documents);
  assert.equal(session.pending, false);
  assert.equal(session.canUndo, false);

  result.bay.chips[0].settings.query = "changed";
  assert.equal(documents.bayConfigurations.bays[1].chips[0].settings.query, "book");
});

test("keeps a duplicate unplaced when the active layout is the internal default", async () => {
  const session = createBayDuplicationSession(fixture(), "bay-2", "layout-1", {
    saveDocuments: async () => {},
  });
  session.plan();

  const result = await session.save();

  assert.deepEqual(result.documents.mainLayouts, fixture().mainLayouts);
});

test("keeps the pending operation and retries the same ids after save failure", async () => {
  const attempts = [];
  let fail = true;
  const session = createBayDuplicationSession(fixture(), "bay-2", "layout-2", {
    saveDocuments: async (patch) => {
      const bay = patch.bayConfigurations.bays.at(-1);
      attempts.push([bay.id, ...bay.chips.map(({ instanceId }) => instanceId)]);
      if (fail) throw new Error("storage failed");
    },
  });
  session.plan();

  await assert.rejects(session.save(), /storage failed/);
  assert.equal(session.pending, true);
  assert.equal(session.canUndo, true);
  fail = false;
  await session.save();

  assert.deepEqual(attempts, [
    ["bay-4", "chip-4", "chip-5"],
    ["bay-4", "chip-4", "chip-5"],
  ]);
});

test("rejects saving without a pending duplicate and protects permanent bays", async () => {
  const session = createBayDuplicationSession(fixture(), "bay-2", "layout-2", {
    saveDocuments: async () => {},
  });
  await assert.rejects(session.save(), /duplicate is not pending/);
  assert.throws(
    () => createBayDuplicationSession(fixture(), "bay-1", "layout-2"),
    /permanent bay cannot be duplicated/,
  );
});

test("fails before storage when any required id cannot be issued", async () => {
  const documents = fixture();
  documents.bayConfigurations.nextChipSequence = Number.MAX_SAFE_INTEGER;
  let saveCalls = 0;
  const session = createBayDuplicationSession(documents, "bay-2", "layout-2", {
    saveDocuments: async () => { saveCalls += 1; },
  });
  session.plan();

  await assert.rejects(session.save(), /cannot be incremented safely/);
  assert.equal(saveCalls, 0);
  assert.equal(session.pending, true);
});

function fixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 4,
      nextChipSequence: 4,
      bays: [
        { id: "bay-1", name: "固定", permanent: true, chips: [] },
        {
          id: "bay-2",
          name: "表示設定",
          permanent: false,
          chips: [
            { instanceId: "chip-1", chipType: "search", order: 1, settings: { query: "book" } },
            { instanceId: "chip-2", chipType: "view-type", order: 2, settings: {} },
          ],
        },
        { id: "bay-3", name: "表示設定 2", permanent: false, chips: [] },
      ],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        {
          id: "layout-1",
          name: "内部",
          systemDefault: true,
          placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
        },
        {
          id: "layout-2",
          name: "普段用",
          systemDefault: false,
          placements: [
            { bayId: "bay-1", rail: "top", order: 1 },
            { bayId: "bay-2", rail: "top", order: 2 },
          ],
        },
      ],
    },
  };
}
