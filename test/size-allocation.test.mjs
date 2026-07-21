import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_AREA_BUDGETS,
  PANEL_SIZE_SPECS,
  allocatePanelSizes,
} from "../dist/panel/lib/size-allocation.js";

const expectedSpecs = {
  "4": { columns: 8, rows: 8, area: 64 },
  "2": { columns: 8, rows: 4, area: 32 },
  "1": { columns: 4, rows: 4, area: 16 },
  "1/2": { columns: 4, rows: 2, area: 8 },
  "1/4": { columns: 2, rows: 2, area: 4 },
  "1/8": { columns: 2, rows: 1, area: 2 },
  "1/16": { columns: 1, rows: 1, area: 1 },
};

function desired(guid, desiredSize) {
  return { guid, desiredSize };
}

test("defines the grid span and area for all seven panel sizes", () => {
  assert.deepEqual(PANEL_SIZE_SPECS, expectedSpecs);
});

test("keeps a desired size when it fits the available width", () => {
  const result = allocatePanelSizes({
    items: [desired("a", "4")],
    scalable: true,
    columns: 8,
    rows: 64,
  });

  assert.deepEqual(result, {
    status: "allocated",
    sizes: [{ guid: "a", size: "4" }],
  });
});

test("cascades past equally wide stages to the largest size that fits", () => {
  const cases = [
    { columns: 7, expected: "1" },
    { columns: 3, expected: "1/4" },
    { columns: 1, expected: "1/16" },
  ];

  for (const { columns, expected } of cases) {
    const result = allocatePanelSizes({
      items: [desired("a", "4")],
      scalable: true,
      columns,
      rows: 256,
    });
    assert.equal(result.status, "allocated");
    assert.equal(result.sizes[0].size, expected);
  }
});

test("uses one uniform width-compatible size for a non-scalable axis", () => {
  const items = [desired("b", "4"), desired("a", "1/16")];

  assert.deepEqual(
    allocatePanelSizes({ items, scalable: false, columns: 4, rows: 4 }),
    {
      status: "allocated",
      sizes: [
        { guid: "b", size: "1" },
        { guid: "a", size: "1" },
      ],
    },
  );
  assert.deepEqual(
    allocatePanelSizes({ items, scalable: false, columns: 3, rows: 4 }),
    {
      status: "allocated",
      sizes: [
        { guid: "b", size: "1/4" },
        { guid: "a", size: "1/4" },
      ],
    },
  );
});

test("defers allocation while either grid dimension is zero", () => {
  const items = [desired("a", "1")];

  assert.deepEqual(
    allocatePanelSizes({ items, scalable: true, columns: 0, rows: 10 }),
    { status: "deferred" },
  );
  assert.deepEqual(
    allocatePanelSizes({ items, scalable: true, columns: 10, rows: 0 }),
    { status: "deferred" },
  );
});

test("rejects invalid grid dimensions", () => {
  const items = [desired("a", "1")];

  for (const [columns, rows] of [[-1, 1], [1.5, 2], [2, Number.POSITIVE_INFINITY]]) {
    assert.throws(
      () => allocatePanelSizes({ items, scalable: true, columns, rows }),
      RangeError,
    );
  }
});

test("defines cumulative area budgets separately from the allocation logic", () => {
  assert.deepEqual(DEFAULT_AREA_BUDGETS, {
    "4": 0.25,
    "2": 0.45,
    "1": 0.7,
    "1/2": 0.85,
    "1/4": 0.92,
    "1/8": 0.97,
  });
});

test("accepts a large tile exactly at its cumulative area limit", () => {
  const result = allocatePanelSizes({
    items: [desired("a", "4")],
    scalable: true,
    columns: 8,
    rows: 32,
  });

  assert.deepEqual(result, {
    status: "allocated",
    sizes: [{ guid: "a", size: "4" }],
  });
});

test("demotes a large tile when it exceeds its limit by one cell", () => {
  const result = allocatePanelSizes({
    items: [desired("a", "4")],
    scalable: true,
    columns: 9,
    rows: 28,
  });

  assert.deepEqual(result, {
    status: "allocated",
    sizes: [{ guid: "a", size: "2" }],
  });
});

test("rechecks the next cumulative budget after a cascade demotion", () => {
  const result = allocatePanelSizes({
    items: [desired("a", "4"), desired("b", "2"), desired("c", "2")],
    scalable: true,
    columns: 8,
    rows: 32,
  });

  assert.deepEqual(result, {
    status: "allocated",
    sizes: [
      { guid: "a", size: "4" },
      { guid: "b", size: "2" },
      { guid: "c", size: "1" },
    ],
  });
});

test("always accepts the minimum size even when every finite budget is zero", () => {
  const zeroBudgets = {
    "4": 0,
    "2": 0,
    "1": 0,
    "1/2": 0,
    "1/4": 0,
    "1/8": 0,
  };
  const result = allocatePanelSizes({
    items: [desired("a", "4"), desired("b", "2")],
    scalable: true,
    columns: 8,
    rows: 8,
    budgets: zeroBudgets,
  });

  assert.deepEqual(result, {
    status: "allocated",
    sizes: [
      { guid: "a", size: "1/16" },
      { guid: "b", size: "1/16" },
    ],
  });
});

test("uses replacement cumulative area budgets", () => {
  const permissiveBudgets = {
    "4": 1,
    "2": 1,
    "1": 1,
    "1/2": 1,
    "1/4": 1,
    "1/8": 1,
  };
  const result = allocatePanelSizes({
    items: [desired("a", "4")],
    scalable: true,
    columns: 8,
    rows: 8,
    budgets: permissiveBudgets,
  });

  assert.deepEqual(result, {
    status: "allocated",
    sizes: [{ guid: "a", size: "4" }],
  });
});

test("rejects invalid cumulative budget configurations", () => {
  const valid = {
    "4": 0.25,
    "2": 0.45,
    "1": 0.7,
    "1/2": 0.85,
    "1/4": 0.92,
    "1/8": 0.97,
  };

  assert.throws(
    () => allocatePanelSizes({
      items: [], scalable: true, columns: 8, rows: 8,
      budgets: { ...valid, "4": -0.1 },
    }),
    RangeError,
  );
  assert.throws(
    () => allocatePanelSizes({
      items: [], scalable: true, columns: 8, rows: 8,
      budgets: { ...valid, "2": 0.2 },
    }),
    RangeError,
  );
});

test("allocates all 2,000 items in input order without mutating the input", () => {
  const items = Array.from({ length: 2_000 }, (_, index) => desired(`item-${index}`, "4"));
  const snapshot = structuredClone(items);

  const result = allocatePanelSizes({
    items,
    scalable: true,
    columns: 1,
    rows: 1,
  });

  assert.equal(result.status, "allocated");
  assert.equal(result.sizes.length, 2_000);
  assert.deepEqual(result.sizes.map(({ guid }) => guid), items.map(({ guid }) => guid));
  assert.ok(result.sizes.every(({ size }) => size === "1/16"));
  assert.deepEqual(items, snapshot);
});

test("accepts every size tier when its cumulative budget is met exactly", () => {
  const cases = [
    { size: "4", columns: 8, rows: 32, count: 1 },
    { size: "2", columns: 8, rows: 80, count: 9 },
    { size: "1", columns: 8, rows: 20, count: 7 },
    { size: "1/2", columns: 8, rows: 20, count: 17 },
    { size: "1/4", columns: 10, rows: 10, count: 23 },
    { size: "1/8", columns: 10, rows: 20, count: 97 },
  ];

  for (const { size, columns, rows, count } of cases) {
    const items = Array.from({ length: count }, (_, index) => desired(`${size}-${index}`, size));
    const result = allocatePanelSizes({ items, scalable: true, columns, rows });

    assert.equal(result.status, "allocated");
    assert.ok(
      result.sizes.every((allocation) => allocation.size === size),
      `${size} should be accepted at its exact cumulative limit`,
    );
  }
});

test("demotes at every size tier when cumulative usage is one cell over its budget", () => {
  const cases = [
    { size: "4", nextSize: "2", columns: 9, rows: 28, count: 1 },
    { size: "2", nextSize: "1", columns: 10, rows: 14, count: 2 },
    { size: "1", nextSize: "1/2", columns: 9, rows: 10, count: 4 },
    { size: "1/2", nextSize: "1/4", columns: 10, rows: 14, count: 15 },
    { size: "1/4", nextSize: "1/8", columns: 5, rows: 5, count: 6 },
    { size: "1/8", nextSize: "1/16", columns: 10, rows: 10, count: 49 },
  ];

  for (const { size, nextSize, columns, rows, count } of cases) {
    const items = Array.from({ length: count }, (_, index) => desired(`${size}-${index}`, size));
    const result = allocatePanelSizes({ items, scalable: true, columns, rows });

    assert.equal(result.status, "allocated");
    assert.ok(
      result.sizes.slice(0, -1).every((allocation) => allocation.size === size),
      `${size} should remain accepted until the cumulative limit`,
    );
    assert.equal(result.sizes.at(-1).size, nextSize);
  }
});
