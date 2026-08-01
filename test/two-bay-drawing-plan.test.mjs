import test from "node:test";
import assert from "node:assert/strict";

import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";
import { buildTwoBayDrawingPlan } from "../dist/panel/lib/two-bay-drawing-plan.js";

test("plans only visible rows and sorts their chips without losing hidden chips", () => {
  const configuration = createInitialTwoBayConfiguration();
  configuration.bays.top.visibleRows = 2;
  configuration.bays.top.chips.push(
    chip("chip-7", "date", 2, 9),
    chip("chip-8", "clock", 2, 2),
    chip("chip-9", "future-chip", 3, 1),
  );
  configuration.nextChipSequence = 10;

  const plan = buildTwoBayDrawingPlan(configuration);

  assert.deepEqual(plan.top.rows.map((row) => ({
    row: row.row,
    chips: row.chips.map(({ instanceId }) => instanceId),
  })), [
    { row: 1, chips: ["chip-1", "chip-2", "chip-3", "chip-4", "chip-5", "chip-6"] },
    { row: 2, chips: ["chip-8", "chip-7"] },
  ]);
  assert.deepEqual(plan.bottom.rows, []);
  assert.equal(configuration.bays.top.chips.some(({ instanceId }) => instanceId === "chip-9"), true);
});

test("keeps lower-bay row numbers in outer-to-inner order", () => {
  const configuration = createInitialTwoBayConfiguration();
  configuration.bays.bottom.visibleRows = 3;
  configuration.bays.bottom.chips.push(
    chip("chip-7", "search", 3, 1),
    chip("chip-8", "sort", 1, 1),
    chip("chip-9", "view-type", 2, 1),
  );
  configuration.nextChipSequence = 10;

  const plan = buildTwoBayDrawingPlan(configuration);

  assert.deepEqual(plan.bottom.rows.map(({ row }) => row), [1, 2, 3]);
  assert.deepEqual(plan.bottom.rows.map(({ chips }) => chips[0].instanceId), [
    "chip-8", "chip-9", "chip-7",
  ]);
});

function chip(instanceId, chipType, row, order) {
  return { instanceId, chipType, row, order, settings: {} };
}
