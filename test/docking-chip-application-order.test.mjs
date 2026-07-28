import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDockingChipApplicationOrder,
} from "../dist/panel/lib/docking-chip-application-order.js";

test("builds one chip sequence in top, left, right, bottom order", () => {
  const documents = fixture();

  assert.deepEqual(buildDockingChipApplicationOrder(documents), [
    chip("top-1-1", "top", "bay-top-1", 1, 1),
    chip("top-1-2", "top", "bay-top-1", 1, 2),
    chip("top-2-1", "top", "bay-top-2", 2, 1),
    chip("left-1-1", "left", "bay-left", 1, 1),
    chip("right-1-1", "right", "bay-right", 1, 1),
    chip("bottom-1-1", "bottom", "bay-bottom", 1, 1),
  ]);
});

test("omits unplaced bays and returns an empty sequence for an empty active layout", () => {
  const documents = fixture();
  assert.equal(
    buildDockingChipApplicationOrder(documents).some(({ bayId }) => bayId === "bay-unplaced"),
    false,
  );

  documents.mainLayouts.layouts[0].placements = [];
  assert.deepEqual(buildDockingChipApplicationOrder(documents), []);
});

test("returns defensive settings without mutating or reordering source documents", () => {
  const documents = fixture();
  const before = structuredClone(documents);
  const order = buildDockingChipApplicationOrder(documents);

  order[0].settings.nested.value = "changed";

  assert.deepEqual(documents, before);
});

function chip(instanceId, rail, bayId, bayOrder, chipOrder) {
  return {
    instanceId,
    chipType: "condition-test",
    settings: instanceId === "top-1-1" ? { nested: { value: "original" } } : {},
    rail,
    bayId,
    bayOrder,
    chipOrder,
  };
}

function fixture() {
  const bays = [
    ["bay-top-1", [["top-1-2", 2], ["top-1-1", 1]]],
    ["bay-top-2", [["top-2-1", 1]]],
    ["bay-left", [["left-1-1", 1]]],
    ["bay-right", [["right-1-1", 1]]],
    ["bay-bottom", [["bottom-1-1", 1]]],
    ["bay-unplaced", [["unplaced-1-1", 1]]],
  ].map(([id, chips]) => ({
    id,
    name: id,
    permanent: false,
    chips: chips.map(([instanceId, order]) => ({
      instanceId,
      chipType: "condition-test",
      order,
      settings: instanceId === "top-1-1" ? { nested: { value: "original" } } : {},
    })),
  }));

  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 7,
      nextChipSequence: 8,
      bays,
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 2,
      layouts: [{
        id: "layout-1",
        name: "作業用",
        systemDefault: false,
        placements: [
          { bayId: "bay-bottom", rail: "bottom", order: 1 },
          { bayId: "bay-top-2", rail: "top", order: 2 },
          { bayId: "bay-right", rail: "right", order: 1 },
          { bayId: "bay-top-1", rail: "top", order: 1 },
          { bayId: "bay-left", rail: "left", order: 1 },
        ],
      }],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-1" },
  };
}
