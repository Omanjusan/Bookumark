import test from "node:test";
import assert from "node:assert/strict";

import {
  INITIAL_DISPLAY_STATE,
  reduceDisplayState,
} from "../dist/panel/lib/display-state.js";

test("starts in custom free-movement mode while remembering visit-count descending", () => {
  assert.deepEqual(INITIAL_DISPLAY_STATE, {
    freeMovement: true,
    sort: { axisId: "custom", direction: "desc" },
    lastStandardSort: { axisId: "visitCount", direction: "desc" },
  });
});

test("restores the remembered standard sort when free movement is disabled", () => {
  assert.deepEqual(
    reduceDisplayState(INITIAL_DISPLAY_STATE, {
      type: "setFreeMovement",
      enabled: false,
    }),
    {
      freeMovement: false,
      sort: { axisId: "visitCount", direction: "desc" },
      lastStandardSort: { axisId: "visitCount", direction: "desc" },
    },
  );
});

test("remembers the current standard sort when free movement is enabled", () => {
  const state = {
    freeMovement: false,
    sort: { axisId: "title", direction: "asc" },
    lastStandardSort: { axisId: "visitCount", direction: "desc" },
  };

  assert.deepEqual(
    reduceDisplayState(state, { type: "setFreeMovement", enabled: true }),
    {
      freeMovement: true,
      sort: { axisId: "custom", direction: "asc" },
      lastStandardSort: { axisId: "title", direction: "asc" },
    },
  );
});

test("selecting a standard sort also disables free movement", () => {
  assert.deepEqual(
    reduceDisplayState(INITIAL_DISPLAY_STATE, {
      type: "selectSort",
      axisId: "dateAdded",
      direction: "asc",
    }),
    {
      freeMovement: false,
      sort: { axisId: "dateAdded", direction: "asc" },
      lastStandardSort: { axisId: "dateAdded", direction: "asc" },
    },
  );
});

test("toggles direction only for a standard sort", () => {
  const standard = {
    freeMovement: false,
    sort: { axisId: "lastVisitTime", direction: "desc" },
    lastStandardSort: { axisId: "lastVisitTime", direction: "desc" },
  };

  assert.deepEqual(
    reduceDisplayState(standard, { type: "toggleDirection" }),
    {
      freeMovement: false,
      sort: { axisId: "lastVisitTime", direction: "asc" },
      lastStandardSort: { axisId: "lastVisitTime", direction: "asc" },
    },
  );
  assert.deepEqual(
    reduceDisplayState(INITIAL_DISPLAY_STATE, { type: "toggleDirection" }),
    INITIAL_DISPLAY_STATE,
  );
});

test("does not mutate the previous state", () => {
  const state = structuredClone(INITIAL_DISPLAY_STATE);
  const snapshot = structuredClone(state);

  reduceDisplayState(state, { type: "setFreeMovement", enabled: false });

  assert.deepEqual(state, snapshot);
});
