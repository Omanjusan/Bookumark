import test from "node:test";
import assert from "node:assert/strict";

import {
  applyConditionChips,
  executeActionChip,
  readControlChipState,
  updateControlChipState,
} from "../dist/panel/lib/chip-contract.js";

const definitions = new Map([
  ["表示名条件", {
    chipType: "表示名条件",
    kind: "condition",
    apply: (state, settings) => ({ ...state, label: settings.label }),
  }],
  ["色条件", {
    chipType: "色条件",
    kind: "condition",
    apply: (state, settings) => ({ ...state, color: settings.color }),
  }],
  ["表示名操作", {
    chipType: "表示名操作",
    kind: "control",
    read: (state) => state.label,
    update: (state, value) => ({ ...state, label: value }),
  }],
]);

test("applies condition chips by order with later values winning", () => {
  const initial = { label: "初期", untouched: true };
  const instances = [
    { instanceId: "chip-2", chipType: "表示名条件", order: 2, settings: { label: "後" } },
    { instanceId: "chip-1", chipType: "表示名条件", order: 1, settings: { label: "前" } },
    { instanceId: "chip-3", chipType: "色条件", order: 3, settings: { color: "青" } },
  ];

  assert.deepEqual(applyConditionChips(initial, instances, definitions), {
    label: "後",
    color: "青",
    untouched: true,
  });
});

test("accepts multiple instances of the same chip type", () => {
  const result = applyConditionChips({}, [
    { instanceId: "chip-1", chipType: "表示名条件", order: 1, settings: { label: "一" } },
    { instanceId: "chip-2", chipType: "表示名条件", order: 2, settings: { label: "二" } },
  ], definitions);

  assert.deepEqual(result, { label: "二" });
});

test("returns the original state when there are no condition chips", () => {
  const initial = { label: "初期" };
  assert.equal(applyConditionChips(initial, [], definitions), initial);
});

test("does not mutate input state, instances, or settings", () => {
  const initial = { label: "初期" };
  const instances = [
    { instanceId: "chip-1", chipType: "表示名条件", order: 1, settings: { label: "更新" } },
  ];
  const stateSnapshot = structuredClone(initial);
  const instancesSnapshot = structuredClone(instances);

  applyConditionChips(initial, instances, definitions);

  assert.deepEqual(initial, stateSnapshot);
  assert.deepEqual(instances, instancesSnapshot);
});

test("rejects duplicate order values", () => {
  assert.throws(() => applyConditionChips({}, [
    { instanceId: "chip-1", chipType: "表示名条件", order: 1, settings: { label: "一" } },
    { instanceId: "chip-2", chipType: "色条件", order: 1, settings: { color: "青" } },
  ], definitions), /Duplicate chip order: 1/);
});

test("rejects unknown and non-condition chip types during condition evaluation", () => {
  assert.throws(() => applyConditionChips({}, [
    { instanceId: "chip-1", chipType: "未知", order: 1, settings: {} },
  ], definitions), /Unknown chip type: 未知/);

  assert.throws(() => applyConditionChips({}, [
    { instanceId: "chip-1", chipType: "表示名操作", order: 1, settings: {} },
  ], definitions), /Chip is not a condition: 表示名操作/);
});

test("control chip instances read and update one shared state", () => {
  const definition = definitions.get("表示名操作");
  const first = { instanceId: "chip-1", chipType: "表示名操作", order: 1, settings: {} };
  const second = { instanceId: "chip-2", chipType: "表示名操作", order: 2, settings: {} };
  const initial = { label: "共通" };

  assert.equal(readControlChipState(definition, first, initial), "共通");
  const updated = updateControlChipState(definition, first, initial, "更新");
  assert.equal(readControlChipState(definition, second, updated), "更新");
  assert.deepEqual(initial, { label: "共通" });
});

test("action chips execute only through an explicit action call", async () => {
  const calls = [];
  const definition = {
    chipType: "記録アクション",
    kind: "action",
    execute: (context, settings) => calls.push([context.target, settings.message]),
  };
  const instance = {
    instanceId: "chip-1",
    chipType: "記録アクション",
    order: 1,
    settings: { message: "実行" },
  };

  assert.deepEqual(calls, []);
  await executeActionChip(definition, instance, { target: "共有先" });
  assert.deepEqual(calls, [["共有先", "実行"]]);
});
