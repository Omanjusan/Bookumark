import test from "node:test";
import assert from "node:assert/strict";

import {
  INITIAL_FIXED_DISPLAY_STATE,
  buildFixedDisplaySet,
  reduceFixedDisplayState,
} from "../dist/panel/lib/fixed-display-controller.js";

const items = [
  { guid: "beta", title: "Beta Guide", url: "https://example.com/beta", visitCount: 3 },
  { guid: "alpha", title: "Alpha Notes", url: "https://example.com/alpha", visitCount: 8 },
  { guid: "gamma", title: "Gamma Guide", url: "https://example.com/gamma", visitCount: 5 },
];

const guideFilter = {
  id: "タイトルにGuideを含む",
  matches: (item) => item.title.includes("Guide"),
};

test("combines search, text-based filters, and sort without a bay dependency", () => {
  let state = reduceFixedDisplayState(INITIAL_FIXED_DISPLAY_STATE, {
    type: "setFilters",
    filters: [guideFilter],
  });
  state = reduceFixedDisplayState(state, {
    type: "selectSort",
    axisId: "title",
    direction: "desc",
  });
  state = reduceFixedDisplayState(state, { type: "setQuery", query: "example.com" });

  assert.deepEqual(
    buildFixedDisplaySet(items, state).items.map(({ guid }) => guid),
    ["gamma", "beta"],
  );
});

test("resets movement mode when search or filtering starts", () => {
  const custom = reduceFixedDisplayState(INITIAL_FIXED_DISPLAY_STATE, {
    type: "setMovementMode",
    mode: "custom-order",
  });
  assert.equal(custom.display.movementMode, "custom-order");

  const searching = reduceFixedDisplayState(custom, {
    type: "setQuery",
    query: "Guide",
  });
  assert.equal(searching.display.movementMode, "normal");

  const directory = reduceFixedDisplayState(INITIAL_FIXED_DISPLAY_STATE, {
    type: "setMovementMode",
    mode: "directory-move",
  });
  const filtering = reduceFixedDisplayState(directory, {
    type: "setFilters",
    filters: [guideFilter],
  });
  assert.equal(filtering.display.movementMode, "normal");
});

test("supports sort-axis selection and direction changes through shared state", () => {
  let state = reduceFixedDisplayState(INITIAL_FIXED_DISPLAY_STATE, {
    type: "selectSort",
    axisId: "visitCount",
    direction: "asc",
  });
  assert.deepEqual(
    buildFixedDisplaySet(items, state).items.map(({ guid }) => guid),
    ["beta", "gamma", "alpha"],
  );

  state = reduceFixedDisplayState(state, { type: "toggleDirection" });
  assert.deepEqual(
    buildFixedDisplaySet(items, state).items.map(({ guid }) => guid),
    ["alpha", "gamma", "beta"],
  );
});

test("can remove filters without changing the current query or sort", () => {
  let state = reduceFixedDisplayState(INITIAL_FIXED_DISPLAY_STATE, {
    type: "setQuery",
    query: "Guide",
  });
  state = reduceFixedDisplayState(state, { type: "setFilters", filters: [guideFilter] });
  state = reduceFixedDisplayState(state, { type: "setFilters", filters: [] });

  assert.equal(state.query, "Guide");
  assert.equal(state.filters.length, 0);
  assert.deepEqual(
    buildFixedDisplaySet(items, state).items.map(({ guid }) => guid),
    ["gamma", "beta"],
  );
});

test("does not mutate items, filters, or previous state", () => {
  const itemSnapshot = structuredClone(items);
  const filters = [guideFilter];
  const state = reduceFixedDisplayState(INITIAL_FIXED_DISPLAY_STATE, {
    type: "setFilters",
    filters,
  });
  const stateSnapshot = {
    query: state.query,
    filters: [...state.filters],
    display: structuredClone(state.display),
    activeViewType: "panel",
  };

  const next = reduceFixedDisplayState(state, { type: "setQuery", query: "Alpha" });
  buildFixedDisplaySet(items, next);

  assert.deepEqual(items, itemSnapshot);
  assert.deepEqual(state, stateSnapshot);
  assert.equal(state.filters === filters, false);
});
