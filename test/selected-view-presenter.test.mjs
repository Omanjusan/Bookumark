import test from "node:test";
import assert from "node:assert/strict";

import { presentSelectedView } from "../dist/panel/lib/selected-view-presenter.js";
import {
  INITIAL_FIXED_DISPLAY_STATE,
  reduceFixedDisplayState,
} from "../dist/panel/lib/fixed-display-controller.js";

const items = [
  { guid: "beta", title: "Beta Guide", url: "https://b.example", visitCount: 3 },
  { guid: "alpha", title: "Alpha Guide", url: "https://a.example", visitCount: 8 },
  { guid: "note", title: "Note", url: "https://n.example", visitCount: 1 },
];
const guideFilter = {
  id: "Guideのみ",
  matches: (item) => item.title.includes("Guide"),
};

test("routes the same filtered and sorted order to exactly one selected view", () => {
  let base = reduceFixedDisplayState(INITIAL_FIXED_DISPLAY_STATE, {
    type: "setFilters",
    filters: [guideFilter],
  });
  base = reduceFixedDisplayState(base, {
    type: "selectSort",
    axisId: "title",
    direction: "asc",
  });

  for (const viewType of ["panel", "icon", "card", "list"]) {
    const state = reduceFixedDisplayState(base, { type: "selectView", viewType });
    const harness = createHarness();
    presentSelectedView({ items, state, columns: 8, rows: 32, draggable: true }, harness.view);

    assert.equal(harness.calls.length, 1);
    assert.equal(harness.calls[0].type, viewType);
    assert.deepEqual(harness.calls[0].guids, ["alpha", "beta"]);
    assert.equal(harness.calls[0].draggable, true);
  }
});

test("shows one common empty state for every view", () => {
  for (const viewType of ["panel", "icon", "card", "list"]) {
    let state = reduceFixedDisplayState(INITIAL_FIXED_DISPLAY_STATE, {
      type: "setQuery",
      query: "missing",
    });
    state = reduceFixedDisplayState(state, { type: "selectView", viewType });
    const harness = createHarness();
    presentSelectedView({ items, state, columns: 8, rows: 8, draggable: false }, harness.view);
    assert.deepEqual(harness.calls, [{ type: "empty" }]);
  }
});

test("only panel view waits for measurable grid dimensions", () => {
  for (const viewType of ["panel", "icon", "card", "list"]) {
    const state = reduceFixedDisplayState(INITIAL_FIXED_DISPLAY_STATE, {
      type: "selectView",
      viewType,
    });
    const harness = createHarness();
    presentSelectedView({ items, state, columns: 0, rows: 0, draggable: false }, harness.view);
    assert.equal(harness.calls[0].type, viewType === "panel" ? "loading" : viewType);
  }
});

test("does not mutate items or shared state", () => {
  const itemSnapshot = structuredClone(items);
  const state = reduceFixedDisplayState(INITIAL_FIXED_DISPLAY_STATE, {
    type: "selectView",
    viewType: "card",
  });
  const stateSnapshot = structuredClone(state);

  presentSelectedView(
    { items, state, columns: 8, rows: 8, draggable: false },
    createHarness().view,
  );

  assert.deepEqual(items, itemSnapshot);
  assert.deepEqual(state, stateSnapshot);
});

function createHarness() {
  const calls = [];
  const ready = (type) => (models, options) => calls.push({
    type,
    guids: models.map(({ guid }) => guid),
    draggable: options.draggable,
  });
  return {
    calls,
    view: {
      showLoading: () => calls.push({ type: "loading" }),
      showEmpty: () => calls.push({ type: "empty" }),
      showPanel: ready("panel"),
      showIcon: ready("icon"),
      showCard: ready("card"),
      showList: ready("list"),
    },
  };
}
