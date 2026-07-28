import test from "node:test";
import assert from "node:assert/strict";

import {
  createDockingInteractionExecutor,
} from "../dist/panel/lib/docking-interaction-executor.js";
import { createDefaultDockingSharedState } from "../dist/panel/lib/docking-shared-state.js";

test("reads and updates injected controls through the latest shared state", () => {
  const definitions = new Map([
    ["future-control", {
      chipType: "future-control",
      kind: "control",
      read: (state, settings) => state[settings.key],
      update: (state, value, settings) => ({ ...state, [settings.key]: value }),
    }],
  ]);
  const executor = createDockingInteractionExecutor({
    ...createDefaultDockingSharedState("layout-1"),
    futureValue: "initial",
  }, definitions);
  const control = instance("future-control", { key: "futureValue" });

  assert.deepEqual(executor.readControl(control), { ok: true, value: "initial" });
  assert.deepEqual(executor.updateControl(control, "updated"), {
    ok: true,
    state: {
      ...createDefaultDockingSharedState("layout-1"),
      futureValue: "updated",
    },
  });
  assert.deepEqual(executor.readControl(control), { ok: true, value: "updated" });
});

test("executes an action only through an explicit call with a defensive latest state", async () => {
  const calls = [];
  const definitions = new Map([
    ["record", {
      chipType: "record",
      kind: "action",
      execute: (context, settings) => {
        calls.push([context.state.query, context.target, settings.message]);
        context.state.query = "mutated";
      },
    }],
  ]);
  const executor = createDockingInteractionExecutor({
    ...createDefaultDockingSharedState("layout-1"),
    query: "book",
  }, definitions);
  const action = instance("record", { message: "run" });

  assert.deepEqual(calls, []);
  assert.deepEqual(await executor.executeAction(action, { target: "main" }), { ok: true });
  assert.deepEqual(calls, [["book", "main", "run"]]);
  assert.equal(executor.getState().query, "book");
});

test("returns structured resolution and kind failures without changing state", async () => {
  const definitions = new Map([
    ["mismatch", { chipType: "different", kind: "action", execute: () => {} }],
    ["control", { chipType: "control", kind: "control", read: () => 1, update: (state) => state }],
    ["action", { chipType: "action", kind: "action", execute: () => {} }],
  ]);
  const initial = createDefaultDockingSharedState("layout-1");
  const executor = createDockingInteractionExecutor(initial, definitions);

  assert.deepEqual(executor.readControl(instance("unknown")), failed("unknown", "unknown-definition"));
  assert.deepEqual(await executor.executeAction(instance("mismatch")), failed("mismatch", "definition-mismatch"));
  assert.deepEqual(executor.readControl(instance("action")), failed("action", "kind-mismatch"));
  assert.deepEqual(await executor.executeAction(instance("control")), failed("control", "kind-mismatch"));
  assert.deepEqual(executor.getState(), initial);
});

test("rejects invalid control results atomically and permits later operations", () => {
  const definitions = new Map([
    ["invalid", {
      chipType: "invalid",
      kind: "control",
      read: (state) => state.viewType,
      update: (state) => ({ ...state, viewType: "unknown", leaked: true }),
    }],
    ["valid", {
      chipType: "valid",
      kind: "control",
      read: (state) => state.query,
      update: (state, value) => ({ ...state, query: value }),
    }],
  ]);
  const initial = createDefaultDockingSharedState("layout-1");
  const executor = createDockingInteractionExecutor(initial, definitions);

  assert.deepEqual(
    executor.updateControl(instance("invalid"), "ignored"),
    failed("invalid", "invalid-standard-state"),
  );
  assert.equal(executor.updateControl(instance("valid"), "after").ok, true);
  assert.deepEqual(executor.getState(), { ...initial, query: "after" });
});

test("isolates thrown and rejected actions so a following action still runs", async () => {
  const calls = [];
  const definitions = new Map([
    ["throw", { chipType: "throw", kind: "action", execute: () => { throw new Error("broken"); } }],
    ["reject", { chipType: "reject", kind: "action", execute: async () => { throw new Error("rejected"); } }],
    ["success", { chipType: "success", kind: "action", execute: () => calls.push("success") }],
  ]);
  const executor = createDockingInteractionExecutor(
    createDefaultDockingSharedState("layout-1"),
    definitions,
  );

  assert.deepEqual(await executor.executeAction(instance("throw")), failed("throw", "execution-threw"));
  assert.deepEqual(await executor.executeAction(instance("reject")), failed("reject", "execution-threw"));
  assert.deepEqual(await executor.executeAction(instance("success")), { ok: true });
  assert.deepEqual(calls, ["success"]);
});

test("reports uncloneable control values and action contexts without changing state", async () => {
  const definitions = new Map([
    ["uncloneable-read", {
      chipType: "uncloneable-read",
      kind: "control",
      read: () => () => undefined,
      update: (state) => state,
    }],
    ["valid", {
      chipType: "valid",
      kind: "control",
      read: (state) => state.query,
      update: (state, value) => ({ ...state, query: value }),
    }],
    ["action", { chipType: "action", kind: "action", execute: () => {} }],
  ]);
  const initial = createDefaultDockingSharedState("layout-1");
  const executor = createDockingInteractionExecutor(initial, definitions);

  assert.deepEqual(
    executor.readControl(instance("uncloneable-read")),
    failed("uncloneable-read", "clone-failed"),
  );
  assert.deepEqual(
    executor.updateControl(instance("valid"), () => undefined),
    failed("valid", "clone-failed"),
  );
  assert.deepEqual(
    await executor.executeAction(instance("action"), { callback: () => undefined }),
    failed("action", "clone-failed"),
  );
  assert.deepEqual(executor.getState(), initial);
});

function instance(chipType, settings = {}) {
  return { instanceId: `${chipType}-1`, chipType, order: 1, settings };
}

function failed(chipType, reason) {
  return {
    ok: false,
    failure: { instanceId: `${chipType}-1`, chipType, reason },
  };
}
