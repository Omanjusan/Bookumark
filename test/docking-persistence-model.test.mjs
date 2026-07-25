import test from "node:test";
import assert from "node:assert/strict";

import {
  DOCKING_SCHEMA_VERSION,
  createDockingDocuments,
  issueBayId,
  issueChipId,
  issueLayoutId,
} from "../dist/panel/lib/docking-persistence-model.js";

test("creates three separate versioned documents around an injected active layout", () => {
  assert.equal(DOCKING_SCHEMA_VERSION, 1);
  assert.deepEqual(createDockingDocuments("内部レイアウト"), {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 1,
      nextChipSequence: 1,
      bays: [],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 1,
      layouts: [],
    },
    dockingMetadata: {
      schemaVersion: 1,
      activeLayoutId: "内部レイアウト",
    },
  });
});

test("issues independent monotonic IDs for bays, chips, and layouts", () => {
  assert.deepEqual(issueBayId(1), { id: "bay-1", nextSequence: 2 });
  assert.deepEqual(issueBayId(8), { id: "bay-8", nextSequence: 9 });
  assert.deepEqual(issueChipId(1), { id: "chip-1", nextSequence: 2 });
  assert.deepEqual(issueLayoutId(1), { id: "layout-1", nextSequence: 2 });
});

test("does not reuse a lower ID when a later saved sequence is supplied", () => {
  const first = issueBayId(4);
  const second = issueBayId(first.nextSequence);
  assert.deepEqual([first.id, second.id], ["bay-4", "bay-5"]);
});

test("rejects invalid and overflowing ID sequences", () => {
  for (const sequence of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => issueBayId(sequence), /sequence must be a positive safe integer/);
  }
  assert.throws(
    () => issueChipId(Number.MAX_SAFE_INTEGER),
    /sequence cannot be incremented safely/,
  );
});

test("creates fresh mutable collections without sharing document state", () => {
  const first = createDockingDocuments("内部レイアウト");
  const second = createDockingDocuments("内部レイアウト");
  first.bayConfigurations.bays.push({
    id: "bay-1",
    name: "文字ベイ",
    permanent: false,
    chips: [],
  });

  assert.deepEqual(second.bayConfigurations.bays, []);
});
