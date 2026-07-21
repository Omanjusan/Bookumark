import test from "node:test";
import assert from "node:assert/strict";

import { buildPanelDrawingPlan } from "../dist/panel/lib/panel-drawing-plan.js";

const scalableState = {
  freeMovement: false,
  sort: { axisId: "visitCount", direction: "desc" },
  lastStandardSort: { axisId: "visitCount", direction: "desc" },
};

const customState = {
  freeMovement: true,
  sort: { axisId: "custom", direction: "desc" },
  lastStandardSort: { axisId: "visitCount", direction: "desc" },
};

const items = [
  {
    guid: "a",
    title: "Alpha project",
    url: "https://a.example/path",
    visitCount: 2,
    lastVisitTime: 1_000,
  },
  {
    guid: "b",
    title: "Beta note",
    url: "https://b.example/path",
    visitCount: 5,
    lastVisitTime: 2_000,
  },
  {
    guid: "c",
    title: "Gamma project",
    url: "https://c.example/path",
    visitCount: 10,
    lastVisitTime: 3_000,
  },
];

test("integrates the filtered display order, desired sizes, allocation, and tile models", () => {
  const result = buildPanelDrawingPlan({
    items,
    query: "project",
    filters: [],
    state: scalableState,
    columns: 8,
    rows: 32,
  });

  assert.equal(result.status, "ready");
  assert.deepEqual(
    result.tiles.map(({ guid, size, scaleValue, auxiliary }) => ({
      guid,
      size,
      scaleValue,
      auxiliary,
    })),
    [
      { guid: "c", size: "4", scaleValue: "10回", auxiliary: undefined },
      { guid: "a", size: "1/4", scaleValue: "2回", auxiliary: undefined },
    ],
  );
});

test("keeps custom order and assigns one uniform size in free-movement mode", () => {
  const result = buildPanelDrawingPlan({
    items: [items[1], items[0], items[2]],
    query: "",
    filters: [],
    state: customState,
    columns: 4,
    rows: 8,
  });

  assert.equal(result.status, "ready");
  assert.deepEqual(
    result.tiles.map(({ guid, size }) => ({ guid, size })),
    [
      { guid: "b", size: "1" },
      { guid: "a", size: "1" },
      { guid: "c", size: "1" },
    ],
  );
});

test("defers the drawing plan until both grid dimensions are valid", () => {
  const result = buildPanelDrawingPlan({
    items,
    query: "",
    filters: [],
    state: scalableState,
    columns: 0,
    rows: 8,
  });

  assert.deepEqual(result, { status: "deferred" });
});

test("returns an observable empty plan after filtering removes every item", () => {
  const result = buildPanelDrawingPlan({
    items,
    query: "missing",
    filters: [],
    state: scalableState,
    columns: 8,
    rows: 8,
  });

  assert.deepEqual(result, { status: "ready", tiles: [] });
});
