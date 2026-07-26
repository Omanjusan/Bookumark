import test from "node:test";
import assert from "node:assert/strict";

import { normalizeMainLayoutsDocument } from "../dist/panel/lib/docking-layout-normalization.js";

const fallback = {
  schemaVersion: 1,
  nextLayoutSequence: 2,
  layouts: [
    { id: "layout-1", name: "内部デフォルト", systemDefault: true, placements: [] },
  ],
};

test("keeps the first canonical layout id and drops malformed entries", () => {
  const result = normalizeMainLayoutsDocument({
    schemaVersion: 1,
    nextLayoutSequence: 4,
    layouts: [
      fallback.layouts[0],
      { id: "layout-2", name: "先頭", systemDefault: false, placements: [{ bayId: "bay-1" }] },
      { id: "layout-2", name: "重複", systemDefault: false, placements: [] },
      { id: "layout-02", name: "先頭ゼロ", systemDefault: false, placements: [] },
      { id: "other-3", name: "別種", systemDefault: false, placements: [] },
      null,
      { id: "layout-3", name: "末尾", systemDefault: false, placements: [] },
    ],
  }, fallback);

  assert.deepEqual(result.document.layouts, [
    fallback.layouts[0],
    { id: "layout-2", name: "先頭", systemDefault: false, placements: [{ bayId: "bay-1" }] },
    { id: "layout-3", name: "末尾", systemDefault: false, placements: [] },
  ]);
  assert.equal(result.recovery, "normalized");
});

test("repairs empty names and derives systemDefault only from the injected id", () => {
  const result = normalizeMainLayoutsDocument({
    schemaVersion: 1,
    nextLayoutSequence: 4,
    layouts: [
      { id: "layout-1", name: "  ", systemDefault: false, placements: [] },
      { id: "layout-2", name: "  余白名  ", systemDefault: true, placements: [] },
      { id: "layout-3", systemDefault: "yes", placements: [] },
    ],
  }, fallback);

  assert.deepEqual(result.document.layouts, [
    { id: "layout-1", name: "名称未設定", systemDefault: true, placements: [] },
    { id: "layout-2", name: "  余白名  ", systemDefault: false, placements: [] },
    { id: "layout-3", name: "名称未設定", systemDefault: false, placements: [] },
  ]);
});

test("does not rename duplicate non-empty layout names during recovery", () => {
  const result = normalizeMainLayoutsDocument({
    schemaVersion: 1,
    nextLayoutSequence: 3,
    layouts: [
      fallback.layouts[0],
      { id: "layout-2", name: "内部デフォルト", systemDefault: false, placements: [] },
    ],
  }, fallback);

  assert.equal(result.document.layouts[1].name, "内部デフォルト");
});
