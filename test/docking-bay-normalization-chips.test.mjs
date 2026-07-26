import test from "node:test";
import assert from "node:assert/strict";

import { normalizeBayConfigurationsDocument } from "../dist/panel/lib/docking-bay-normalization.js";

const fallback = {
  schemaVersion: 1,
  nextBaySequence: 2,
  nextChipSequence: 2,
  bays: [{ id: "bay-1", name: "既定", permanent: true, chips: [] }],
};

test("keeps the first valid chip id across bays and retains unknown chip types", () => {
  const result = normalizeBayConfigurationsDocument({
    schemaVersion: 1,
    nextBaySequence: 3,
    nextChipSequence: 4,
    bays: [
      {
        id: "bay-1", name: "一", permanent: false, chips: [
          { instanceId: "chip-1", chipType: "未知の種類", order: 1, settings: { text: "保持" } },
          { instanceId: "chip-01", chipType: "不正ID", order: 2, settings: {} },
          { instanceId: "chip-2", chipType: "", order: 3, settings: {} },
        ],
      },
      {
        id: "bay-2", name: "二", permanent: false, chips: [
          { instanceId: "chip-1", chipType: "重複", order: 1, settings: {} },
          { instanceId: "chip-3", chipType: "時計", order: 2, settings: {} },
        ],
      },
    ],
  }, fallback);

  assert.deepEqual(result.document.bays[0].chips, [
    { instanceId: "chip-1", chipType: "未知の種類", order: 1, settings: { text: "保持" } },
  ]);
  assert.deepEqual(result.document.bays[1].chips, [
    { instanceId: "chip-3", chipType: "時計", order: 1, settings: {} },
  ]);
  assert.equal(result.recovery, "normalized");
});

test("sorts valid orders first, puts invalid orders last, and reindexes from one", () => {
  const result = normalizeBayConfigurationsDocument({
    schemaVersion: 1,
    nextBaySequence: 2,
    nextChipSequence: 6,
    bays: [{
      id: "bay-1", name: "順序", permanent: false, chips: [
        { instanceId: "chip-1", chipType: "一", order: 8, settings: {} },
        { instanceId: "chip-2", chipType: "二", order: 2, settings: {} },
        { instanceId: "chip-3", chipType: "三", order: "invalid", settings: {} },
        { instanceId: "chip-4", chipType: "四", order: 2, settings: {} },
        { instanceId: "chip-5", chipType: "五", order: 0, settings: {} },
      ],
    }],
  }, fallback);

  assert.deepEqual(result.document.bays[0].chips.map(({ instanceId, order }) => ({ instanceId, order })), [
    { instanceId: "chip-2", order: 1 },
    { instanceId: "chip-4", order: 2 },
    { instanceId: "chip-1", order: 3 },
    { instanceId: "chip-3", order: 4 },
    { instanceId: "chip-5", order: 5 },
  ]);
});

test("keeps JSON object settings and resets only invalid settings", () => {
  const result = normalizeBayConfigurationsDocument({
    schemaVersion: 1,
    nextBaySequence: 2,
    nextChipSequence: 5,
    bays: [{
      id: "bay-1", name: "設定", permanent: false, chips: [
        { instanceId: "chip-1", chipType: "一", order: 1, settings: { nested: [1, true, null, { text: "値" }] } },
        { instanceId: "chip-2", chipType: "二", order: 2, settings: ["配列"] },
        { instanceId: "chip-3", chipType: "三", order: 3, settings: { value: Number.NaN } },
        { instanceId: "chip-4", chipType: "四", order: 4, settings: { value: undefined } },
      ],
    }],
  }, fallback);

  assert.deepEqual(result.document.bays[0].chips.map(({ settings }) => settings), [
    { nested: [1, true, null, { text: "値" }] },
    {},
    {},
    {},
  ]);
});

test("raises counters above retained ids without lowering valid counters", () => {
  const result = normalizeBayConfigurationsDocument({
    schemaVersion: 1,
    nextBaySequence: 2,
    nextChipSequence: 20,
    bays: [
      { id: "bay-7", name: "七", permanent: false, chips: [{ instanceId: "chip-12", chipType: "時計", order: 1, settings: {} }] },
      { id: "bay-3", name: "三", permanent: false, chips: [] },
    ],
  }, fallback);

  assert.equal(result.document.nextBaySequence, 8);
  assert.equal(result.document.nextChipSequence, 20);
});

test("treats missing chip arrays as empty and falls back if a retained id cannot advance", () => {
  const repaired = normalizeBayConfigurationsDocument({
    schemaVersion: 1,
    nextBaySequence: 2,
    nextChipSequence: 1,
    bays: [{ id: "bay-1", name: "空", permanent: false }],
  }, fallback);
  assert.deepEqual(repaired.document.bays[0].chips, []);
  assert.equal(repaired.recovery, "normalized");

  const overflow = normalizeBayConfigurationsDocument({
    schemaVersion: 1,
    nextBaySequence: 1,
    nextChipSequence: 1,
    bays: [{ id: `bay-${Number.MAX_SAFE_INTEGER - 1}`, name: "上限", permanent: false, chips: [] }],
  }, fallback);
  assert.equal(overflow.recovery, "fallback");
  assert.deepEqual(overflow.document, fallback);
});
