import test from "node:test";
import assert from "node:assert/strict";

import {
  INITIAL_FIXED_DISPLAY_STATE,
  reduceFixedDisplayState,
} from "../dist/panel/lib/fixed-display-controller.js";

test("starts with the panel view", () => {
  assert.equal(INITIAL_FIXED_DISPLAY_STATE.activeViewType, "panel");
});

test("selects each view while preserving the other shared state", () => {
  let state = reduceFixedDisplayState(INITIAL_FIXED_DISPLAY_STATE, {
    type: "setQuery",
    query: "Guide",
  });
  state = reduceFixedDisplayState(state, {
    type: "selectSort",
    axisId: "title",
    direction: "asc",
  });
  const before = {
    query: state.query,
    filters: state.filters,
    display: state.display,
  };

  for (const viewType of ["icon", "card", "list", "panel"]) {
    state = reduceFixedDisplayState(state, { type: "selectView", viewType });
    assert.equal(state.activeViewType, viewType);
    assert.equal(state.query, before.query);
    assert.equal(state.filters, before.filters);
    assert.equal(state.display, before.display);
  }
});

test("returns the same shared state when the selected view is unchanged", () => {
  assert.equal(
    reduceFixedDisplayState(INITIAL_FIXED_DISPLAY_STATE, {
      type: "selectView",
      viewType: "panel",
    }),
    INITIAL_FIXED_DISPLAY_STATE,
  );
});
