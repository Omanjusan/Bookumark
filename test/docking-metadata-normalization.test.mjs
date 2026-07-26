import test from "node:test";
import assert from "node:assert/strict";

import { normalizeDockingMetadataDocument } from "../dist/panel/lib/docking-metadata-normalization.js";

const layouts = {
  schemaVersion: 1,
  nextLayoutSequence: 4,
  layouts: [
    { id: "layout-1", name: "内部デフォルト", systemDefault: true, placements: [] },
    { id: "layout-2", name: "通常", systemDefault: false, placements: [] },
    { id: "layout-3", name: "作業", systemDefault: false, placements: [] },
  ],
};
const fallback = { schemaVersion: 1, activeLayoutId: "layout-1" };

test("keeps valid metadata and returns a defensive copy", () => {
  const input = {
    schemaVersion: 1,
    activeLayoutId: "layout-2",
    preferredLayoutId: "layout-3",
    lastUsedLayoutId: "layout-2",
  };
  const result = normalizeDockingMetadataDocument(input, fallback, layouts);

  assert.deepEqual(result, { document: input, changed: false, recovery: "unchanged" });
  assert.notEqual(result.document, input);
});

test("falls back for an invalid document or unsupported schema", () => {
  for (const input of [null, [], { schemaVersion: 2, activeLayoutId: "layout-2" }]) {
    const result = normalizeDockingMetadataDocument(input, fallback, layouts);
    assert.deepEqual(result.document, fallback);
    assert.notEqual(result.document, fallback);
    assert.equal(result.recovery, "fallback");
  }
});

test("chooses active, last used, preferred, then system default in priority order", () => {
  const cases = [
    [{ activeLayoutId: "layout-2", lastUsedLayoutId: "layout-3", preferredLayoutId: "layout-1" }, "layout-2"],
    [{ activeLayoutId: "missing", lastUsedLayoutId: "layout-3", preferredLayoutId: "layout-2" }, "layout-3"],
    [{ activeLayoutId: "missing", lastUsedLayoutId: "missing", preferredLayoutId: "layout-2" }, "layout-2"],
    [{ activeLayoutId: "missing", lastUsedLayoutId: "missing", preferredLayoutId: "missing" }, "layout-1"],
  ];

  for (const [references, expected] of cases) {
    const result = normalizeDockingMetadataDocument({ schemaVersion: 1, ...references }, fallback, layouts);
    assert.equal(result.document.activeLayoutId, expected);
    assert.equal(result.recovery, references.activeLayoutId === expected ? "unchanged" : "normalized");
  }
});

test("removes invalid optional references while preserving valid ones", () => {
  const result = normalizeDockingMetadataDocument({
    schemaVersion: 1,
    activeLayoutId: "layout-2",
    preferredLayoutId: 2,
    lastUsedLayoutId: "layout-3",
  }, fallback, layouts);

  assert.deepEqual(result.document, {
    schemaVersion: 1,
    activeLayoutId: "layout-2",
    lastUsedLayoutId: "layout-3",
  });
  assert.equal(result.recovery, "normalized");
});

test("falls back when normalized layouts have no system default", () => {
  const result = normalizeDockingMetadataDocument(
    { schemaVersion: 1, activeLayoutId: "missing" },
    fallback,
    { ...layouts, layouts: layouts.layouts.map((layout) => ({ ...layout, systemDefault: false })) },
  );

  assert.equal(result.recovery, "fallback");
  assert.deepEqual(result.document, fallback);
});

test("does not share fallback state between recoveries", () => {
  const first = normalizeDockingMetadataDocument(null, fallback, layouts);
  const second = normalizeDockingMetadataDocument(null, fallback, layouts);
  first.document.activeLayoutId = "changed";

  assert.equal(second.document.activeLayoutId, "layout-1");
  assert.equal(fallback.activeLayoutId, "layout-1");
});
