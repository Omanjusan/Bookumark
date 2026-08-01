import test from "node:test";
import assert from "node:assert/strict";

import { changeTwoBayVisibleRows } from "../dist/panel/lib/two-bay-row-edit.js";
import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";

test("increments and decrements a non-system bay within zero to three rows", () => {
  const source = createInitialTwoBayConfiguration();
  const one = changeTwoBayVisibleRows(source, "bottom", 1);
  const zero = changeTwoBayVisibleRows(one, "bottom", -1);
  const three = changeTwoBayVisibleRows(
    changeTwoBayVisibleRows(one, "bottom", 1), "bottom", 1,
  );

  assert.equal(source.bays.bottom.visibleRows, 0);
  assert.equal(one.bays.bottom.visibleRows, 1);
  assert.equal(zero.bays.bottom.visibleRows, 0);
  assert.equal(three.bays.bottom.visibleRows, 3);
  assert.throws(() => changeTwoBayVisibleRows(three, "bottom", 1), /row limit/);
});

test("keeps the system bay at one row and preserves hidden-row chips", () => {
  const source = createInitialTwoBayConfiguration();
  source.bays.bottom.chips.push({
    instanceId: "chip-7", chipType: "search", row: 2, order: 1, settings: {},
  });
  const expanded = changeTwoBayVisibleRows(source, "bottom", 1);

  assert.throws(() => changeTwoBayVisibleRows(source, "top", -1), /system bay/);
  assert.deepEqual(expanded.bays.bottom.chips, source.bays.bottom.chips);
});

