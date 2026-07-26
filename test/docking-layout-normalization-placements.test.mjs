import test from "node:test";
import assert from "node:assert/strict";

import { normalizeMainLayoutsDocument } from "../dist/panel/lib/docking-layout-normalization.js";

const validBayIds = new Set(["bay-1", "bay-2", "bay-3", "bay-4", "bay-5", "bay-6"]);
const fallback = {
  schemaVersion: 1,
  nextLayoutSequence: 2,
  layouts: [{
    id: "layout-1",
    name: "内部デフォルト",
    systemDefault: true,
    placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
  }],
};

test("drops invalid placements, missing bays, and later duplicate bay references", () => {
  const result = normalizeMainLayoutsDocument({
    schemaVersion: 1,
    nextLayoutSequence: 3,
    layouts: [
      fallback.layouts[0],
      {
        id: "layout-2", name: "通常", systemDefault: false, placements: [
          { bayId: "bay-2", rail: "left", order: 1 },
          { bayId: "bay-2", rail: "right", order: 1 },
          { bayId: "bay-99", rail: "top", order: 1 },
          { bayId: "bay-3", rail: "center", order: 1 },
          { bayId: 4, rail: "bottom", order: 1 },
          null,
          { bayId: "bay-4", rail: "bottom", order: 1 },
        ],
      },
    ],
  }, fallback, validBayIds);

  assert.deepEqual(result.document.layouts[1].placements, [
    { bayId: "bay-2", rail: "left", order: 1 },
    { bayId: "bay-4", rail: "bottom", order: 1 },
  ]);
  assert.equal(result.recovery, "normalized");
});

test("groups rails canonically and reindexes stable order within each rail", () => {
  const result = normalizeMainLayoutsDocument({
    schemaVersion: 1,
    nextLayoutSequence: 3,
    layouts: [
      fallback.layouts[0],
      {
        id: "layout-2", name: "順序", systemDefault: false, placements: [
          { bayId: "bay-2", rail: "bottom", order: 8 },
          { bayId: "bay-3", rail: "top", order: "invalid" },
          { bayId: "bay-4", rail: "bottom", order: 2 },
          { bayId: "bay-5", rail: "top", order: 1 },
          { bayId: "bay-6", rail: "bottom", order: 2 },
        ],
      },
    ],
  }, fallback, validBayIds);

  assert.deepEqual(result.document.layouts[1].placements, [
    { bayId: "bay-5", rail: "top", order: 1 },
    { bayId: "bay-3", rail: "top", order: 2 },
    { bayId: "bay-4", rail: "bottom", order: 1 },
    { bayId: "bay-6", rail: "bottom", order: 2 },
    { bayId: "bay-2", rail: "bottom", order: 3 },
  ]);
});

test("treats a missing placement array as empty for a user layout", () => {
  const result = normalizeMainLayoutsDocument({
    schemaVersion: 1,
    nextLayoutSequence: 3,
    layouts: [fallback.layouts[0], { id: "layout-2", name: "空", systemDefault: false }],
  }, fallback, validBayIds);

  assert.deepEqual(result.document.layouts[1].placements, []);
  assert.equal(result.recovery, "normalized");
});

test("falls back if any injected system-default placement needs repair", () => {
  for (const placements of [
    [],
    [{ bayId: "bay-99", rail: "top", order: 1 }],
    [{ bayId: "bay-1", rail: "center", order: 1 }],
    [{ bayId: "bay-1", rail: "top", order: 4 }],
  ]) {
    const result = normalizeMainLayoutsDocument({
      schemaVersion: 1,
      nextLayoutSequence: 2,
      layouts: [{ ...fallback.layouts[0], placements }],
    }, fallback, validBayIds);
    assert.equal(result.recovery, "fallback");
    assert.deepEqual(result.document, fallback);
  }
});
