import test from "node:test";
import assert from "node:assert/strict";

import { normalizeBayConfigurationsDocument } from "../dist/panel/lib/docking-bay-normalization.js";

const fallback = {
  schemaVersion: 1,
  nextBaySequence: 1,
  nextChipSequence: 1,
  bays: [],
};

test("keeps the first bay for each valid canonical id", () => {
  const firstChips = [{ instanceId: "chip-1", chipType: "clock", order: 8, settings: {} }];
  const result = normalizeBayConfigurationsDocument({
    schemaVersion: 1,
    nextBaySequence: 5,
    nextChipSequence: 2,
    bays: [
      { id: "bay-1", name: "先頭", permanent: true, chips: firstChips },
      { id: "bay-1", name: "重複", permanent: false, chips: [] },
      { id: "bay-4", name: "末尾", permanent: false, chips: [] },
    ],
  }, fallback);

  assert.deepEqual(result.document.bays, [
    { id: "bay-1", name: "先頭", permanent: true, chips: firstChips },
    { id: "bay-4", name: "末尾", permanent: false, chips: [] },
  ]);
  assert.equal(result.changed, true);
  assert.equal(result.recovery, "normalized");
});

test("drops malformed bay entries and invalid ids", () => {
  const result = normalizeBayConfigurationsDocument({
    schemaVersion: 1,
    nextBaySequence: 1,
    nextChipSequence: 1,
    bays: [
      null,
      [],
      { id: 1, name: "数値ID", permanent: false, chips: [] },
      { id: "bay-0", name: "ゼロ", permanent: false, chips: [] },
      { id: "bay-01", name: "先頭ゼロ", permanent: false, chips: [] },
      { id: "bay-9007199254740992", name: "上限超過", permanent: false, chips: [] },
      { id: "other-1", name: "別種", permanent: false, chips: [] },
      { id: "bay-2", name: "有効", permanent: false, chips: [] },
    ],
  }, fallback);

  assert.deepEqual(result.document.bays, [
    { id: "bay-2", name: "有効", permanent: false, chips: [] },
  ]);
  assert.equal(result.recovery, "normalized");
});

test("repairs empty names and invalid permanent values without changing valid text", () => {
  const result = normalizeBayConfigurationsDocument({
    schemaVersion: 1,
    nextBaySequence: 4,
    nextChipSequence: 1,
    bays: [
      { id: "bay-1", name: "   ", permanent: "yes", chips: [] },
      { id: "bay-2", permanent: null, chips: [] },
      { id: "bay-3", name: "  余白を含む名前  ", permanent: true, chips: [] },
    ],
  }, fallback);

  assert.deepEqual(result.document.bays, [
    { id: "bay-1", name: "名称未設定", permanent: false, chips: [] },
    { id: "bay-2", name: "名称未設定", permanent: false, chips: [] },
    { id: "bay-3", name: "  余白を含む名前  ", permanent: true, chips: [] },
  ]);
  assert.equal(result.recovery, "normalized");
});
