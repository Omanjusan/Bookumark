import test from "node:test";
import assert from "node:assert/strict";

import { createBayPlacementDraft } from "../dist/panel/lib/bay-placement-draft.js";

test("places an unplaced bay at the first rail that fits with a 2px gap", () => {
  const documents = fixture();
  const draft = createBayPlacementDraft(documents);

  const result = draft.autoPlace("bay-3", capacity({
    top: { available: 100, existingExtents: [60], candidateExtent: 40 },
    bottom: { available: 100, existingExtents: [50], candidateExtent: 48 },
  }));

  assert.deepEqual(result, { status: "placed", bayId: "bay-3", rail: "bottom", order: 2 });
  assert.deepEqual(draft.picker().placed.at(-1), {
    bayId: "bay-3", name: "未配置", permanent: false, rail: "bottom", order: 2,
  });
  assert.deepEqual(documents, fixture());
});

test("uses top, bottom, left, right priority independently of document placement order", () => {
  for (const [blocked, expected] of [
    [[], "top"],
    [["top"], "bottom"],
    [["top", "bottom"], "left"],
    [["top", "bottom", "left"], "right"],
  ]) {
    const draft = createBayPlacementDraft(fixture());
    const measurements = capacity();
    for (const rail of blocked) measurements[rail].candidateExtent = 99;
    assert.equal(draft.autoPlace("bay-3", measurements).rail, expected);
  }
});

test("keeps a bay unplaced when every rail would require scrolling", () => {
  const draft = createBayPlacementDraft(fixture());
  const before = draft.documents();
  const measurements = capacity();
  for (const rail of Object.keys(measurements)) measurements[rail].candidateExtent = 99;

  assert.deepEqual(draft.autoPlace("bay-3", measurements), {
    status: "unplaced", bayId: "bay-3", reason: "no-rail-fits",
  });
  assert.deepEqual(draft.documents(), before);
});

test("accounts for a 2px gap between every existing and candidate bay", () => {
  const draft = createBayPlacementDraft(fixture());
  const measurements = capacity();
  measurements.top = { available: 102, existingExtents: [40, 30], candidateExtent: 28 };
  assert.equal(draft.autoPlace("bay-3", measurements).rail, "top");

  const tight = createBayPlacementDraft(fixture());
  measurements.top.available = 101;
  assert.equal(tight.autoPlace("bay-3", measurements).rail, "bottom");
});

test("does not place an already placed or unknown bay", () => {
  const draft = createBayPlacementDraft(fixture());
  assert.deepEqual(draft.autoPlace("bay-2", capacity()), {
    status: "unchanged", bayId: "bay-2", reason: "already-placed",
  });
  assert.deepEqual(draft.autoPlace("bay-404", capacity()), {
    status: "unchanged", bayId: "bay-404", reason: "unknown-bay",
  });
});

test("rejects incomplete or invalid measurements without changing the draft", () => {
  const draft = createBayPlacementDraft(fixture());
  const before = draft.documents();
  const incomplete = capacity();
  delete incomplete.right;
  assert.throws(() => draft.autoPlace("bay-3", incomplete), /measurement is required: right/);
  const invalid = capacity();
  invalid.left.existingExtents = [-1];
  assert.throws(() => draft.autoPlace("bay-3", invalid), /extent must be a finite non-negative number/);
  assert.deepEqual(draft.documents(), before);
});

test("returns defensive snapshots and discards all edits back to the saved documents", () => {
  const draft = createBayPlacementDraft(fixture());
  draft.autoPlace("bay-3", capacity());
  const snapshot = draft.documents();
  snapshot.mainLayouts.layouts[1].placements.at(-1).rail = "right";
  assert.equal(draft.documents().mainLayouts.layouts[1].placements.at(-1).rail, "top");

  draft.discard();
  assert.deepEqual(draft.documents(), fixture());
  assert.deepEqual(draft.picker().unplaced.map(({ bayId }) => bayId), ["bay-3"]);
});

test("places an unplaced bay or relocates a placed bay at the target rail end", () => {
  const draft = createBayPlacementDraft(fixture());
  assert.deepEqual(draft.moveToRailEnd("bay-3", "left"), {
    status: "moved", bayId: "bay-3", rail: "left", order: 1,
  });
  assert.deepEqual(draft.moveToRailEnd("bay-2", "bottom"), {
    status: "moved", bayId: "bay-2", rail: "bottom", order: 2,
  });
  assert.deepEqual(draft.picker().placed.map(({ bayId, rail, order }) => ({ bayId, rail, order })), [
    { bayId: "bay-3", rail: "left", order: 1 },
    { bayId: "bay-1", rail: "bottom", order: 1 },
    { bayId: "bay-2", rail: "bottom", order: 2 },
  ]);
});

test("moves a bay to the end of its current rail without duplicating it", () => {
  const draft = createBayPlacementDraft(fixture());
  draft.moveToRailEnd("bay-1", "bottom");
  const placements = draft.documents().mainLayouts.layouts[1].placements;
  assert.equal(placements.filter(({ bayId }) => bayId === "bay-1").length, 1);
  assert.deepEqual(placements.find(({ bayId }) => bayId === "bay-1"), {
    bayId: "bay-1", rail: "bottom", order: 1,
  });
  assert.deepEqual(draft.moveToRailEnd("bay-404", "top"), {
    status: "unchanged", bayId: "bay-404", reason: "unknown-bay",
  });
});

test("inserts an unplaced bay at an arbitrary target-rail position", () => {
  const draft = createBayPlacementDraft(positionFixture());

  assert.deepEqual(draft.moveToRailPosition("bay-4", "top", 1), {
    status: "moved", bayId: "bay-4", rail: "top", order: 2,
  });
  assert.deepEqual(placementsByRail(draft, "top"), [
    { bayId: "bay-1", order: 1 },
    { bayId: "bay-4", order: 2 },
    { bayId: "bay-2", order: 3 },
    { bayId: "bay-3", order: 4 },
  ]);
});

test("reorders within one rail using the sequence after excluding the dragged bay", () => {
  const draft = createBayPlacementDraft(positionFixture());

  assert.deepEqual(draft.moveToRailPosition("bay-1", "top", 2), {
    status: "moved", bayId: "bay-1", rail: "top", order: 3,
  });
  assert.deepEqual(placementsByRail(draft, "top"), [
    { bayId: "bay-2", order: 1 },
    { bayId: "bay-3", order: 2 },
    { bayId: "bay-1", order: 3 },
  ]);
});

test("moves between rails and renumbers both source and target rails", () => {
  const draft = createBayPlacementDraft(positionFixture());

  draft.moveToRailPosition("bay-2", "left", 1);

  assert.deepEqual(placementsByRail(draft, "top"), [
    { bayId: "bay-1", order: 1 },
    { bayId: "bay-3", order: 2 },
  ]);
  assert.deepEqual(placementsByRail(draft, "left"), [
    { bayId: "bay-5", order: 1 },
    { bayId: "bay-2", order: 2 },
  ]);
});

test("does not change the draft when the effective position is unchanged", () => {
  const draft = createBayPlacementDraft(positionFixture());
  const before = draft.documents();

  assert.deepEqual(draft.moveToRailPosition("bay-2", "top", 1), {
    status: "unchanged", bayId: "bay-2", reason: "same-position",
  });
  assert.deepEqual(draft.documents(), before);
});

test("rejects an unknown bay or out-of-range insertion without partial changes", () => {
  const draft = createBayPlacementDraft(positionFixture());
  const before = draft.documents();

  assert.deepEqual(draft.moveToRailPosition("bay-404", "top", 0), {
    status: "unchanged", bayId: "bay-404", reason: "unknown-bay",
  });
  assert.throws(() => draft.moveToRailPosition("bay-1", "left", 2), /insertion index is out of range/);
  assert.throws(() => draft.moveToRailPosition("bay-1", "left", -1), /insertion index is out of range/);
  assert.deepEqual(draft.documents(), before);
});

test("records each successful placement mutation as one undo and redo step", () => {
  const draft = createBayPlacementDraft(positionFixture());
  const initial = draft.documents();

  assert.equal(draft.dirty, false);
  assert.equal(draft.canUndo, false);
  assert.equal(draft.canRedo, false);

  draft.moveToRailPosition("bay-4", "top", 1);
  const afterInsert = draft.documents();
  draft.moveToRailPosition("bay-1", "left", 1);
  const afterMove = draft.documents();

  assert.equal(draft.dirty, true);
  assert.equal(draft.canUndo, true);
  assert.equal(draft.undo(), true);
  assert.deepEqual(draft.documents(), afterInsert);
  assert.equal(draft.undo(), true);
  assert.deepEqual(draft.documents(), initial);
  assert.equal(draft.dirty, false);
  assert.equal(draft.canUndo, false);
  assert.equal(draft.canRedo, true);

  assert.equal(draft.redo(), true);
  assert.deepEqual(draft.documents(), afterInsert);
  assert.equal(draft.redo(), true);
  assert.deepEqual(draft.documents(), afterMove);
  assert.equal(draft.canRedo, false);
});

test("records click auto-placement and rough rail drop while keeping history snapshots isolated", () => {
  const draft = createBayPlacementDraft(fixture());
  draft.autoPlace("bay-3", capacity());
  const autoPlaced = draft.documents();
  draft.moveToRailEnd("bay-3", "left");

  assert.equal(draft.undo(), true);
  assert.deepEqual(draft.documents(), autoPlaced);
  const exposed = draft.documents();
  exposed.mainLayouts.layouts[1].placements.at(-1).rail = "right";
  assert.deepEqual(draft.documents(), autoPlaced);
  assert.equal(draft.undo(), true);
  assert.deepEqual(draft.documents(), fixture());
});

test("does not add history or clear redo for a no-op placement", () => {
  const draft = createBayPlacementDraft(positionFixture());
  draft.moveToRailPosition("bay-1", "left", 1);
  draft.undo();

  assert.equal(draft.canRedo, true);
  draft.moveToRailPosition("bay-2", "top", 1);
  draft.moveToRailEnd("bay-3", "top");

  assert.equal(draft.dirty, false);
  assert.equal(draft.canUndo, false);
  assert.equal(draft.canRedo, true);
});

test("clears redo after a new mutation and resets history when discarded", () => {
  const draft = createBayPlacementDraft(positionFixture());
  draft.moveToRailPosition("bay-4", "top", 0);
  draft.undo();
  draft.moveToRailPosition("bay-4", "left", 0);

  assert.equal(draft.canRedo, false);
  assert.equal(draft.redo(), false);
  draft.discard();
  assert.equal(draft.dirty, false);
  assert.equal(draft.canUndo, false);
  assert.equal(draft.canRedo, false);
  assert.equal(draft.undo(), false);
  assert.deepEqual(draft.documents(), positionFixture());
});

test("unplaces regular and permanent bays without deleting their definitions or settings", () => {
  const documents = positionFixture();
  documents.bayConfigurations.bays[0].chips.push({
    instanceId: "chip-1", chipType: "search", order: 1, settings: { query: "kept" },
  });
  const draft = createBayPlacementDraft(documents);

  assert.deepEqual(draft.unplace("bay-2"), { status: "unplaced", bayId: "bay-2" });
  assert.deepEqual(draft.unplace("bay-1"), { status: "unplaced", bayId: "bay-1" });
  assert.deepEqual(placementsByRail(draft, "top"), [{ bayId: "bay-3", order: 1 }]);
  assert.deepEqual(draft.documents().bayConfigurations.bays[0], documents.bayConfigurations.bays[0]);
  assert.deepEqual(draft.picker().unplaced.map(({ bayId }) => bayId), ["bay-1", "bay-2", "bay-4"]);
  assert.equal(draft.canUndo, true);
  assert.equal(draft.undo(), true);
  assert.equal(draft.picker().placed.some(({ bayId }) => bayId === "bay-1"), true);
  assert.equal(draft.undo(), true);
  assert.deepEqual(draft.documents(), documents);
  assert.equal(draft.dirty, false);
});

test("does not add history when unplacing an unknown or already unplaced bay", () => {
  const draft = createBayPlacementDraft(positionFixture());

  assert.deepEqual(draft.unplace("bay-4"), {
    status: "unchanged", bayId: "bay-4", reason: "already-unplaced",
  });
  assert.deepEqual(draft.unplace("bay-404"), {
    status: "unchanged", bayId: "bay-404", reason: "unknown-bay",
  });
  assert.equal(draft.dirty, false);
  assert.equal(draft.canUndo, false);
});

function capacity(overrides = {}) {
  const result = {
    top: { available: 100, existingExtents: [40], candidateExtent: 20 },
    bottom: { available: 100, existingExtents: [40], candidateExtent: 20 },
    left: { available: 100, existingExtents: [40], candidateExtent: 20 },
    right: { available: 100, existingExtents: [40], candidateExtent: 20 },
  };
  for (const [rail, value] of Object.entries(overrides)) result[rail] = value;
  return result;
}

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
            { bayId: "bay-2", rail: "top", order: 3 },
            { bayId: "bay-1", rail: "bottom", order: 1 },
          ],
        },
      ],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-2" },
  };
}

function positionFixture() {
  const documents = fixture();
  documents.bayConfigurations.nextBaySequence = 6;
  documents.bayConfigurations.bays.push(
    { id: "bay-4", name: "未配置2", permanent: false, chips: [] },
    { id: "bay-5", name: "左", permanent: false, chips: [] },
  );
  documents.mainLayouts.layouts[1].placements = [
    { bayId: "bay-1", rail: "top", order: 10 },
    { bayId: "bay-2", rail: "top", order: 20 },
    { bayId: "bay-3", rail: "top", order: 30 },
    { bayId: "bay-5", rail: "left", order: 7 },
  ];
  return documents;
}

function placementsByRail(draft, rail) {
  return draft.documents().mainLayouts.layouts[1].placements
    .filter((placement) => placement.rail === rail)
    .sort((left, right) => left.order - right.order)
    .map(({ bayId, order }) => ({ bayId, order }));
}
