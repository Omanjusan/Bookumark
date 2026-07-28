import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultDockingSharedState,
  evaluateDockingSharedStateConditions,
  isValidDockingSharedState,
} from "../dist/panel/lib/docking-shared-state.js";

test("creates the standard default state for the active layout", () => {
  assert.deepEqual(createDefaultDockingSharedState("layout-2"), {
    query: "",
    filters: { visitStatus: "all" },
    sort: { axisId: "visitCount", direction: "desc" },
    viewType: "panel",
    movementMode: "normal",
    activeLayoutId: "layout-2",
  });
});

test("validates every standard key and accepts extension keys", () => {
  const state = {
    ...createDefaultDockingSharedState("layout-1"),
    filters: { visitStatus: "visited", futureFilter: true },
    futureState: { enabled: true },
  };

  assert.equal(isValidDockingSharedState(state, "layout-1"), true);
  for (const invalid of [
    { ...state, query: 1 },
    { ...state, filters: [] },
    { ...state, filters: { visitStatus: "unknown" } },
    { ...state, sort: { axisId: "unknown", direction: "desc" } },
    { ...state, sort: { axisId: "title", direction: "unknown" } },
    { ...state, viewType: "unknown" },
    { ...state, movementMode: "unknown" },
    { ...state, activeLayoutId: "layout-2" },
    { query: "" },
  ]) assert.equal(isValidDockingSharedState(invalid, "layout-1"), false);
});

test("rejects an invalid standard value atomically and continues", () => {
  const definitions = new Map([
    ["valid", condition("valid", (state, settings) => ({ ...state, ...settings }))],
    ["invalid", condition("invalid", (state) => ({ ...state, viewType: "unknown", leaked: true }))],
    ["switch-layout", condition("switch-layout", (state) => ({ ...state, activeLayoutId: "layout-2" }))],
  ]);
  const initial = createDefaultDockingSharedState("layout-1");
  const result = evaluateDockingSharedStateConditions(initial, [
    entry("before", "valid", { query: "book", futureState: "kept" }),
    entry("invalid", "invalid"),
    entry("switch", "switch-layout"),
    entry("after", "valid", { movementMode: "custom-order" }),
  ], definitions);

  assert.deepEqual(result.state, {
    ...initial,
    query: "book",
    movementMode: "custom-order",
    futureState: "kept",
  });
  assert.deepEqual(result.failures, [
    { instanceId: "invalid", chipType: "invalid", reason: "invalid-standard-state" },
    { instanceId: "switch", chipType: "switch-layout", reason: "invalid-standard-state" },
  ]);
});

function condition(chipType, apply) {
  return { chipType, kind: "condition", apply };
}

function entry(instanceId, chipType, settings = {}) {
  return {
    instanceId,
    chipType,
    settings,
    rail: "top",
    bayId: "bay-1",
    bayOrder: 1,
    chipOrder: 1,
  };
}
