import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateDockingConditions,
} from "../dist/panel/lib/docking-condition-evaluator.js";

test("applies conditions in sequence and keeps later successful values", () => {
  const definitions = new Map([
    ["label", condition("label", (state, settings) => ({ ...state, label: settings.value }))],
    ["color", condition("color", (state, settings) => ({ ...state, color: settings.value }))],
  ]);
  const result = evaluateDockingConditions(
    { label: "initial", untouched: true },
    [entry("first", "label", { value: "first" }), entry("color", "color", { value: "blue" }), entry("last", "label", { value: "last" })],
    definitions,
  );

  assert.deepEqual(result, {
    state: { label: "last", color: "blue", untouched: true },
    failures: [],
  });
});

test("records a failed chip atomically and continues with following conditions", () => {
  const definitions = new Map([
    ["success", condition("success", (state, settings) => ({ ...state, ...settings }))],
    ["mutate-then-throw", condition("mutate-then-throw", (state) => {
      state.nested.value = "leaked";
      throw new Error("broken");
    })],
    ["primitive", condition("primitive", () => "invalid")],
  ]);
  const initial = { nested: { value: "safe" }, count: 0 };
  const result = evaluateDockingConditions(initial, [
    entry("before", "success", { count: 1 }),
    entry("throws", "mutate-then-throw"),
    entry("invalid", "primitive"),
    entry("after", "success", { finished: true }),
  ], definitions);

  assert.deepEqual(result.state, {
    nested: { value: "safe" },
    count: 1,
    finished: true,
  });
  assert.deepEqual(result.failures, [
    { instanceId: "throws", chipType: "mutate-then-throw", reason: "apply-threw" },
    { instanceId: "invalid", chipType: "primitive", reason: "invalid-result" },
  ]);
  assert.deepEqual(initial, { nested: { value: "safe" }, count: 0 });
});

test("isolates cloned settings and does not mutate the application sequence", () => {
  const definitions = new Map([
    ["mutator", condition("mutator", (state, settings) => {
      settings.nested.value = "changed";
      return { ...state, applied: settings.nested.value };
    })],
  ]);
  const sequence = [entry("mutator", "mutator", { nested: { value: "original" } })];
  const before = structuredClone(sequence);

  assert.deepEqual(evaluateDockingConditions({}, sequence, definitions).state, { applied: "changed" });
  assert.deepEqual(sequence, before);
});

test("records unknown, mismatched, and clone failures while continuing", () => {
  const definitions = new Map([
    ["mismatch", condition("different", (state) => state)],
    ["clone", condition("clone", (state) => state)],
    ["success", condition("success", (state) => ({ ...state, finished: true }))],
  ]);
  const result = evaluateDockingConditions(
    { uncloneable: () => undefined },
    [entry("unknown", "unknown"), entry("mismatch", "mismatch"), entry("clone", "clone"), entry("success", "success")],
    definitions,
  );

  assert.equal(result.state.uncloneable instanceof Function, true);
  assert.deepEqual(result.failures, [
    { instanceId: "unknown", chipType: "unknown", reason: "unknown-definition" },
    { instanceId: "mismatch", chipType: "mismatch", reason: "definition-mismatch" },
    { instanceId: "clone", chipType: "clone", reason: "clone-failed" },
    { instanceId: "success", chipType: "success", reason: "clone-failed" },
  ]);
});

test("does not initialize known control or action definitions", () => {
  const calls = [];
  const definitions = new Map([
    ["control", { chipType: "control", kind: "control", read: () => calls.push("read"), update: () => calls.push("update") }],
    ["action", { chipType: "action", kind: "action", execute: () => calls.push("execute") }],
  ]);

  assert.deepEqual(evaluateDockingConditions({}, [entry("control", "control"), entry("action", "action")], definitions), {
    state: {},
    failures: [],
  });
  assert.deepEqual(calls, []);
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
