import test from "node:test";
import assert from "node:assert/strict";

import { moveTwoBayChip, removeTwoBayChip } from "../dist/panel/lib/two-bay-chip-edit.js";
import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";

test("reorders a chip within one row and normalizes row order", () => {
  const source = configuration();
  const moved = moveTwoBayChip(source, "chip-1", { bay: "top", row: 1, index: 2 });
  assert.deepEqual(rowIds(moved, "top", 1), ["chip-2", "chip-3", "chip-1"]);
  assert.deepEqual(rowOrders(moved, "top", 1), [1, 2, 3]);
  assert.deepEqual(rowIds(source, "top", 1), ["chip-1", "chip-2", "chip-3"]);
});

test("moves a chip between rows and between top and bottom bays", () => {
  const source = configuration();
  const rowMoved = moveTwoBayChip(source, "chip-2", { bay: "top", row: 2, index: 0 });
  const bayMoved = moveTwoBayChip(rowMoved, "chip-2", { bay: "bottom", row: 1, index: 1 });
  assert.deepEqual(rowIds(rowMoved, "top", 2), ["chip-2", "chip-4"]);
  assert.deepEqual(rowIds(bayMoved, "bottom", 1), ["chip-5", "chip-2"]);
  assert.deepEqual(rowOrders(bayMoved, "top", 2), [1]);
});

test("removes only the selected instance and normalizes the source row", () => {
  const removed = removeTwoBayChip(configuration(), "chip-2");
  assert.deepEqual(rowIds(removed, "top", 1), ["chip-1", "chip-3"]);
  assert.deepEqual(rowOrders(removed, "top", 1), [1, 2]);
  assert.equal(removed.nextChipSequence, 6);
});

test("rejects moves to hidden rows and unknown instances", () => {
  const source = configuration();
  assert.throws(
    () => moveTwoBayChip(source, "chip-1", { bay: "bottom", row: 2, index: 0 }),
    /visible row/,
  );
  assert.throws(() => removeTwoBayChip(source, "missing"), /instance/);
});

function configuration() {
  const value = createInitialTwoBayConfiguration();
  value.nextChipSequence = 6;
  value.bays.top.visibleRows = 2;
  value.bays.top.chips = [
    chip("chip-1", 1, 1), chip("chip-2", 1, 2), chip("chip-3", 1, 3), chip("chip-4", 2, 1),
  ];
  value.bays.bottom.visibleRows = 1;
  value.bays.bottom.chips = [chip("chip-5", 1, 1)];
  return value;
}

function chip(instanceId, row, order) {
  return { instanceId, chipType: "search", row, order, settings: {} };
}

function rowIds(value, bay, row) {
  return value.bays[bay].chips.filter((chip) => chip.row === row)
    .sort((a, b) => a.order - b.order).map((chip) => chip.instanceId);
}

function rowOrders(value, bay, row) {
  return value.bays[bay].chips.filter((chip) => chip.row === row)
    .sort((a, b) => a.order - b.order).map((chip) => chip.order);
}

