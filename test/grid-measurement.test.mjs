import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_GRID_GAP,
  DEFAULT_GRID_UNIT,
  calculateGridCells,
} from "../dist/panel/lib/grid-measurement.js";

test("defines the initial grid unit and gap separately", () => {
  assert.equal(DEFAULT_GRID_UNIT, 24);
  assert.equal(DEFAULT_GRID_GAP, 4);
});

test("counts only complete cells after subtracting inter-cell gaps", () => {
  assert.deepEqual(calculateGridCells({ width: 24, height: 24 }), { columns: 1, rows: 1 });
  assert.deepEqual(calculateGridCells({ width: 51, height: 51 }), { columns: 1, rows: 1 });
  assert.deepEqual(calculateGridCells({ width: 52, height: 52 }), { columns: 2, rows: 2 });
  assert.deepEqual(calculateGridCells({ width: 192, height: 96 }), { columns: 7, rows: 3 });
});

test("returns zero for a dimension smaller than one cell", () => {
  assert.deepEqual(calculateGridCells({ width: 23.99, height: 24 }), { columns: 0, rows: 1 });
  assert.deepEqual(calculateGridCells({ width: 24, height: 0 }), { columns: 1, rows: 0 });
});

test("supports replacement unit and gap values", () => {
  assert.deepEqual(
    calculateGridCells({ width: 32, height: 74, unit: 16, gap: 2 }),
    { columns: 1, rows: 4 },
  );
});

test("rejects invalid dimensions and grid settings", () => {
  assert.throws(() => calculateGridCells({ width: -1, height: 24 }), RangeError);
  assert.throws(() => calculateGridCells({ width: 24, height: Number.NaN }), RangeError);
  assert.throws(() => calculateGridCells({ width: 24, height: 24, unit: 0 }), RangeError);
  assert.throws(() => calculateGridCells({ width: 24, height: 24, gap: -1 }), RangeError);
});
