import test from "node:test";
import assert from "node:assert/strict";

import { normalizeMainLayoutsDocument } from "../dist/panel/lib/docking-layout-normalization.js";

const validBayIds = new Set(["bay-1", "bay-2", "bay-3"]);

const fallback = {
  schemaVersion: 1,
  nextLayoutSequence: 3,
  layouts: [
    { id: "layout-1", name: "内部デフォルト", systemDefault: true, placements: [] },
    { id: "layout-2", name: "通常", systemDefault: false, placements: [] },
  ],
};

test("keeps a valid layout envelope as a defensive copy", () => {
  const input = structuredClone(fallback);
  const result = normalizeMainLayoutsDocument(input, fallback, validBayIds);

  assert.deepEqual(result, { document: input, changed: false, recovery: "unchanged" });
  assert.notEqual(result.document, input);
  assert.notEqual(result.document.layouts, input.layouts);
  assert.notEqual(result.document.layouts[0], input.layouts[0]);
});

test("falls back for an invalid envelope or missing injected system default", () => {
  for (const input of [
    null,
    [],
    { schemaVersion: 2, nextLayoutSequence: 3, layouts: fallback.layouts },
    { schemaVersion: 1, nextLayoutSequence: 3, layouts: {} },
    { schemaVersion: 1, nextLayoutSequence: 3, layouts: [fallback.layouts[1]] },
  ]) {
    const result = normalizeMainLayoutsDocument(input, fallback, validBayIds);
    assert.deepEqual(result.document, fallback);
    assert.equal(result.recovery, "fallback");
    assert.notEqual(result.document, fallback);
  }
});

test("normalizes invalid counters and raises them above retained layout ids", () => {
  const result = normalizeMainLayoutsDocument({
    schemaVersion: 1,
    nextLayoutSequence: 0,
    layouts: [
      fallback.layouts[0],
      { id: "layout-8", name: "八", systemDefault: false, placements: [] },
    ],
  }, fallback, validBayIds);

  assert.equal(result.document.nextLayoutSequence, 9);
  assert.equal(result.recovery, "normalized");
});

test("falls back if the counter or retained id cannot advance safely", () => {
  for (const input of [
    {
      schemaVersion: 1,
      nextLayoutSequence: Number.MAX_SAFE_INTEGER,
      layouts: fallback.layouts,
    },
    {
      schemaVersion: 1,
      nextLayoutSequence: 1,
      layouts: [
        fallback.layouts[0],
        {
          id: `layout-${Number.MAX_SAFE_INTEGER - 1}`,
          name: "上限",
          systemDefault: false,
          placements: [],
        },
      ],
    },
  ]) {
    assert.equal(normalizeMainLayoutsDocument(input, fallback, validBayIds).recovery, "fallback");
  }
});
