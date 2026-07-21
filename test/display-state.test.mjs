import test from "node:test";
import assert from "node:assert/strict";

import {
  INITIAL_DISPLAY_STATE,
  reduceDisplayState,
} from "../dist/panel/lib/display-state.js";

test("starts in the safe normal mode while remembering visit-count descending", () => {
  assert.deepEqual(INITIAL_DISPLAY_STATE, {
    movementMode: "normal",
    sort: { axisId: "visitCount", direction: "desc" },
    lastStandardSort: { axisId: "visitCount", direction: "desc" },
  });
});

test("switches directly among all three mutually exclusive modes", () => {
  const custom = reduceDisplayState(INITIAL_DISPLAY_STATE, {
    type: "setMovementMode",
    mode: "custom-order",
  });
  assert.deepEqual(custom, {
    movementMode: "custom-order",
    sort: { axisId: "custom", direction: "desc" },
    lastStandardSort: { axisId: "visitCount", direction: "desc" },
  });

  const directory = reduceDisplayState(custom, {
    type: "setMovementMode",
    mode: "directory-move",
  });
  assert.deepEqual(directory, {
    movementMode: "directory-move",
    sort: { axisId: "custom", direction: "desc" },
    lastStandardSort: { axisId: "visitCount", direction: "desc" },
  });

  assert.deepEqual(reduceDisplayState(directory, {
    type: "setMovementMode",
    mode: "normal",
  }), INITIAL_DISPLAY_STATE);
});

test("remembers the current standard sort when custom order is selected", () => {
  const state = {
    movementMode: "normal",
    sort: { axisId: "title", direction: "asc" },
    lastStandardSort: { axisId: "title", direction: "asc" },
  };

  assert.deepEqual(
    reduceDisplayState(state, { type: "setMovementMode", mode: "custom-order" }),
    {
      movementMode: "custom-order",
      sort: { axisId: "custom", direction: "asc" },
      lastStandardSort: { axisId: "title", direction: "asc" },
    },
  );
});

test("selecting a standard sort returns to normal mode", () => {
  assert.deepEqual(
    reduceDisplayState(INITIAL_DISPLAY_STATE, {
      type: "selectSort",
      axisId: "dateAdded",
      direction: "asc",
    }),
    {
      movementMode: "normal",
      sort: { axisId: "dateAdded", direction: "asc" },
      lastStandardSort: { axisId: "dateAdded", direction: "asc" },
    },
  );
});

test("resets movement to normal when search or filtering begins", () => {
  const custom = reduceDisplayState(INITIAL_DISPLAY_STATE, {
    type: "setMovementMode",
    mode: "custom-order",
  });

  assert.deepEqual(
    reduceDisplayState(custom, { type: "resetMovementMode" }),
    INITIAL_DISPLAY_STATE,
  );
});

test("toggles direction only for a standard sort", () => {
  const standard = {
    movementMode: "normal",
    sort: { axisId: "lastVisitTime", direction: "desc" },
    lastStandardSort: { axisId: "lastVisitTime", direction: "desc" },
  };

  assert.deepEqual(
    reduceDisplayState(standard, { type: "toggleDirection" }),
    {
      movementMode: "normal",
      sort: { axisId: "lastVisitTime", direction: "asc" },
      lastStandardSort: { axisId: "lastVisitTime", direction: "asc" },
    },
  );
  const custom = reduceDisplayState(INITIAL_DISPLAY_STATE, {
    type: "setMovementMode",
    mode: "custom-order",
  });
  assert.equal(reduceDisplayState(custom, { type: "toggleDirection" }), custom);
});

test("returns the same state when the selected mode is unchanged", () => {
  assert.equal(
    reduceDisplayState(INITIAL_DISPLAY_STATE, {
      type: "setMovementMode",
      mode: "normal",
    }),
    INITIAL_DISPLAY_STATE,
  );
});

test("does not mutate the previous state", () => {
  const state = structuredClone(INITIAL_DISPLAY_STATE);
  const snapshot = structuredClone(state);

  reduceDisplayState(state, { type: "setMovementMode", mode: "custom-order" });

  assert.deepEqual(state, snapshot);
});
