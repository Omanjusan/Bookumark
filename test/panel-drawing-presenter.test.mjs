import test from "node:test";
import assert from "node:assert/strict";

import { presentPanelDrawingPlan } from "../dist/panel/lib/panel-drawing-presenter.js";

const state = {
  freeMovement: true,
  sort: { axisId: "custom", direction: "desc" },
  lastStandardSort: { axisId: "visitCount", direction: "desc" },
};

const item = {
  guid: "a",
  title: "Alpha",
  url: "https://a.example/path",
};

function harness() {
  const calls = [];
  return {
    calls,
    view: {
      showLoading: () => calls.push({ type: "loading" }),
      showEmpty: () => calls.push({ type: "empty" }),
      showGrid: (tiles) => calls.push({ type: "grid", tiles }),
    },
  };
}

test("keeps the loading state until measurable grid dimensions arrive", () => {
  const fake = harness();

  presentPanelDrawingPlan({
    items: [item], query: "", filters: [], state, columns: 0, rows: 8,
  }, fake.view);

  assert.deepEqual(fake.calls, [{ type: "loading" }]);
});

test("shows the empty state when the current display set has no items", () => {
  const fake = harness();

  presentPanelDrawingPlan({
    items: [item], query: "missing", filters: [], state, columns: 8, rows: 8,
  }, fake.view);

  assert.deepEqual(fake.calls, [{ type: "empty" }]);
});

test("passes an allocated drawing plan to the panel grid view", () => {
  const fake = harness();

  presentPanelDrawingPlan({
    items: [item], query: "", filters: [], state, columns: 4, rows: 4,
  }, fake.view);

  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0].type, "grid");
  assert.deepEqual(
    fake.calls[0].tiles.map(({ guid, size }) => ({ guid, size })),
    [{ guid: "a", size: "1" }],
  );
});
