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

test("deletes a chip and renumbers the remaining draft order", () => {
  const document = fixtureWithThreeChips();
  const session = createBayEditSession(document, "bay-2");

  session.deleteChip("chip-3");

  assert.equal(session.dirty, true);
  assert.deepEqual(
    session.draftBay().chips.map(({ instanceId, order }) => ({ instanceId, order })),
    [
      { instanceId: "chip-2", order: 1 },
      { instanceId: "chip-4", order: 2 },
    ],
  );
  assert.equal(session.savedBay().chips.length, 3);
});

test("reorders a chip using the index after removing its source", () => {
  const session = createBayEditSession(fixtureWithThreeChips(), "bay-2");

  assert.equal(session.reorderChip("chip-2", 2), true);
  assert.deepEqual(
    session.draftBay().chips.map(({ instanceId, order }) => ({ instanceId, order })),
    [
      { instanceId: "chip-3", order: 1 },
      { instanceId: "chip-4", order: 2 },
      { instanceId: "chip-2", order: 3 },
    ],
  );
});

test("treats a reorder to the current index as a no-op", () => {
  const session = createBayEditSession(fixtureWithThreeChips(), "bay-2");

  assert.equal(session.reorderChip("chip-3", 1), false);

  assert.equal(session.dirty, false);
  assert.deepEqual(session.draftBay(), session.savedBay());
});

test("replaces settings without sharing the caller's object", () => {
  const session = createBayEditSession(fixture(), "bay-2");
  const settings = { query: "firefox", nested: { exact: true } };

  session.updateChipSettings("chip-2", settings);
  settings.query = "changed";
  settings.nested.exact = false;

  assert.equal(session.dirty, true);
  assert.deepEqual(session.draftBay().chips[0].settings, {
    query: "firefox",
    nested: { exact: true },
  });
  assert.deepEqual(session.savedBay().chips[0].settings, { query: "book" });
});

test("rejects invalid chip mutations without partially changing the draft", () => {
  const session = createBayEditSession(fixtureWithThreeChips(), "bay-2");
  const before = session.draftBay();

  assert.throws(() => session.deleteChip("chip-404"), /chip was not found: chip-404/);
  assert.throws(() => session.reorderChip("chip-404", 0), /chip was not found: chip-404/);
  for (const index of [-1, 3, 0.5]) {
    assert.throws(() => session.reorderChip("chip-2", index), /index must be a chip position/);
  }
  assert.throws(
    () => session.updateChipSettings("chip-404", {}),
    /chip was not found: chip-404/,
  );

  assert.equal(session.dirty, false);
  assert.deepEqual(session.draftBay(), before);
});

test("does not reuse an id after deleting a newly added chip in the same session", () => {
  const session = createBayEditSession(fixture(), "bay-2");

  assert.equal(session.addChip("sort", 1), "chip-3");
  session.deleteChip("chip-3");

  assert.equal(session.addChip("view-type", 1), "chip-4");
  assert.equal(session.nextChipSequence, 5);
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

function fixtureWithThreeChips() {
  const document = fixture();
  document.nextChipSequence = 5;
  document.bays[1].chips.push(
    {
      instanceId: "chip-3",
      chipType: "visit-status",
      order: 2,
      settings: {},
    },
    {
      instanceId: "chip-4",
      chipType: "view-type",
      order: 3,
      settings: { value: "panel" },
    },
  );
  return document;
}
