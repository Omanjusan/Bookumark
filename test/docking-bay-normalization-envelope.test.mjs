import test from "node:test";
import assert from "node:assert/strict";

import { normalizeBayConfigurationsDocument } from "../dist/panel/lib/docking-bay-normalization.js";

const fallback = {
  schemaVersion: 1,
  nextBaySequence: 2,
  nextChipSequence: 3,
  bays: [{ id: "bay-1", name: "文字ベイ", permanent: true, chips: [] }],
};

test("keeps a valid envelope unchanged while returning a defensive copy", () => {
  const input = {
    schemaVersion: 1,
    nextBaySequence: 4,
    nextChipSequence: 7,
    bays: [{ id: "bay-1", name: "保存ベイ", permanent: false, chips: [] }],
  };
  const result = normalizeBayConfigurationsDocument(input, fallback);

  assert.deepEqual(result, {
    document: input,
    changed: false,
    recovery: "unchanged",
  });
  assert.notEqual(result.document, input);
  assert.notEqual(result.document.bays, input.bays);
  assert.notEqual(result.document.bays[0], input.bays[0]);
});

test("normalizes missing or invalid counters to the first sequence", () => {
  const result = normalizeBayConfigurationsDocument({
    schemaVersion: 1,
    nextBaySequence: 0,
    nextChipSequence: "invalid",
    bays: [],
  }, fallback);

  assert.deepEqual(result, {
    document: {
      schemaVersion: 1,
      nextBaySequence: 1,
      nextChipSequence: 1,
      bays: [],
    },
    changed: true,
    recovery: "normalized",
  });
});

test("falls back for an unknown schema, invalid document, or non-array bays", () => {
  for (const input of [
    null,
    [],
    { schemaVersion: 2, nextBaySequence: 1, nextChipSequence: 1, bays: [] },
    { schemaVersion: 1, nextBaySequence: 1, nextChipSequence: 1, bays: {} },
  ]) {
    const result = normalizeBayConfigurationsDocument(input, fallback);
    assert.deepEqual(result, {
      document: fallback,
      changed: true,
      recovery: "fallback",
    });
    assert.notEqual(result.document, fallback);
    assert.notEqual(result.document.bays, fallback.bays);
  }
});

test("falls back when a sequence cannot be incremented safely", () => {
  const result = normalizeBayConfigurationsDocument({
    schemaVersion: 1,
    nextBaySequence: Number.MAX_SAFE_INTEGER,
    nextChipSequence: 1,
    bays: [],
  }, fallback);
  assert.equal(result.recovery, "fallback");
  assert.deepEqual(result.document, fallback);
});

test("does not share fallback state between recoveries", () => {
  const first = normalizeBayConfigurationsDocument(null, fallback);
  const second = normalizeBayConfigurationsDocument(null, fallback);
  first.document.bays[0].name = "変更";

  assert.equal(second.document.bays[0].name, "文字ベイ");
  assert.equal(fallback.bays[0].name, "文字ベイ");
});
