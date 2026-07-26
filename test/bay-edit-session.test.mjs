import test from "node:test";
import assert from "node:assert/strict";

import { createBayEditSession } from "../dist/panel/lib/bay-edit-session.js";

test("starts a clean edit session from a user bay", () => {
  const document = fixture();
  const session = createBayEditSession(document, "bay-2");

  assert.equal(session.bayId, "bay-2");
  assert.equal(session.dirty, false);
  assert.deepEqual(session.savedBay(), document.bays[1]);
  assert.deepEqual(session.draftBay(), document.bays[1]);
});

test("accepts an empty user bay as an editable boundary case", () => {
  const document = fixture();
  document.bays[1].chips = [];

  const session = createBayEditSession(document, "bay-2");

  assert.deepEqual(session.draftBay().chips, []);
});

test("does not share state with the source document or returned snapshots", () => {
  const document = fixture();
  const session = createBayEditSession(document, "bay-2");

  document.bays[1].name = "原本を後から変更";
  document.bays[1].chips[0].settings.query = "changed";
  const firstDraft = session.draftBay();
  firstDraft.name = "返却値を変更";
  firstDraft.chips[0].settings.query = "also changed";

  assert.equal(session.savedBay().name, "表示設定");
  assert.equal(session.draftBay().name, "表示設定");
  assert.equal(session.draftBay().chips[0].settings.query, "book");
});

test("rejects an unknown bay and a permanent bay", () => {
  const document = fixture();

  assert.throws(
    () => createBayEditSession(document, "bay-404"),
    /editable bay was not found: bay-404/,
  );
  assert.throws(
    () => createBayEditSession(document, "bay-1"),
    /permanent bay cannot be edited: bay-1/,
  );
});

test("adds duplicate chip types at the requested boundaries with monotonic ids", () => {
  const session = createBayEditSession(fixture(), "bay-2");

  assert.equal(session.addChip("visit-status", 0), "chip-3");
  assert.equal(session.addChip("search", 2), "chip-4");
  assert.equal(session.addChip("search", 1), "chip-5");

  assert.equal(session.dirty, true);
  assert.equal(session.nextChipSequence, 6);
  assert.deepEqual(
    session.draftBay().chips.map(({ instanceId, chipType, order }) => ({
      instanceId, chipType, order,
    })),
    [
      { instanceId: "chip-3", chipType: "visit-status", order: 1 },
      { instanceId: "chip-5", chipType: "search", order: 2 },
      { instanceId: "chip-2", chipType: "search", order: 3 },
      { instanceId: "chip-4", chipType: "search", order: 4 },
    ],
  );
});

test("creates independent initial settings through the injected chip definition", () => {
  const shared = { mode: "unvisited", nested: { enabled: true } };
  const session = createBayEditSession(fixture(), "bay-2", {
    createInitialSettings: (chipType) => {
      assert.equal(chipType, "visit-status");
      return shared;
    },
  });

  session.addChip("visit-status", 1);
  shared.mode = "visited";
  shared.nested.enabled = false;

  assert.deepEqual(session.draftBay().chips[1].settings, {
    mode: "unvisited",
    nested: { enabled: true },
  });
});

test("uses empty settings when no chip-specific initializer is registered", () => {
  const session = createBayEditSession(fixture(), "bay-2");

  session.addChip("unknown-but-preserved", 1);

  assert.deepEqual(session.draftBay().chips[1].settings, {});
});

test("rejects invalid additions without consuming an id or changing the draft", () => {
  const document = fixture();
  const session = createBayEditSession(document, "bay-2");
  const before = session.draftBay();

  for (const [chipType, index] of [["", 0], ["search", -1], ["search", 2], ["search", 0.5]]) {
    assert.throws(() => session.addChip(chipType, index));
  }

  assert.equal(session.nextChipSequence, 3);
  assert.equal(session.dirty, false);
  assert.deepEqual(session.draftBay(), before);
});

test("keeps the draft unchanged when a chip id cannot be issued", () => {
  const document = fixture();
  document.nextChipSequence = Number.MAX_SAFE_INTEGER;
  const session = createBayEditSession(document, "bay-2");

  assert.throws(() => session.addChip("search", 1), /cannot be incremented safely/);
  assert.equal(session.nextChipSequence, Number.MAX_SAFE_INTEGER);
  assert.equal(session.dirty, false);
  assert.deepEqual(session.draftBay(), document.bays[1]);
});

function fixture() {
  return {
    schemaVersion: 1,
    nextBaySequence: 3,
    nextChipSequence: 3,
    bays: [
      {
        id: "bay-1",
        name: "内部ベイ",
        permanent: true,
        chips: [],
      },
      {
        id: "bay-2",
        name: "表示設定",
        permanent: false,
        chips: [
          {
            instanceId: "chip-2",
            chipType: "search",
            order: 1,
            settings: { query: "book" },
          },
        ],
      },
    ],
  };
}
