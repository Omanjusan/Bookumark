import test from "node:test";
import assert from "node:assert/strict";

import {
  restoreSystemDefaultLayout,
  switchNamedLayout,
} from "../dist/panel/lib/layout-selection.js";

test("switches to a named layout and records it as last used", () => {
  const result = switchNamedLayout(metadataDocument(), layoutDocument(), "layout-3");

  assert.deepEqual(result, {
    schemaVersion: 1,
    activeLayoutId: "layout-3",
    preferredLayoutId: "layout-2",
    lastUsedLayoutId: "layout-3",
  });
});

test("allows selecting the already active named layout without changing preference", () => {
  const result = switchNamedLayout(metadataDocument(), layoutDocument(), "layout-2");
  assert.deepEqual(result, metadataDocument());
});

test("rejects the internal default through the normal switch path and rejects unknown ids", () => {
  assert.throws(
    () => switchNamedLayout(metadataDocument(), layoutDocument(), "layout-1"),
    /system default layout requires the restore action/,
  );
  assert.throws(
    () => switchNamedLayout(metadataDocument(), layoutDocument(), "layout-404"),
    /layout was not found: layout-404/,
  );
});

test("restores the internal default by changing only the active layout", () => {
  const result = restoreSystemDefaultLayout(metadataDocument(), layoutDocument());

  assert.deepEqual(result, {
    schemaVersion: 1,
    activeLayoutId: "layout-1",
    preferredLayoutId: "layout-2",
    lastUsedLayoutId: "layout-2",
  });
});

test("requires exactly one internal default for the restore action", () => {
  const missing = layoutDocument();
  missing.layouts[0].systemDefault = false;
  assert.throws(
    () => restoreSystemDefaultLayout(metadataDocument(), missing),
    /exactly one system default layout is required/,
  );

  const multiple = layoutDocument();
  multiple.layouts[1].systemDefault = true;
  assert.throws(
    () => restoreSystemDefaultLayout(metadataDocument(), multiple),
    /exactly one system default layout is required/,
  );
});

test("does not mutate or share source metadata for either selection path", () => {
  const source = metadataDocument();
  const before = structuredClone(source);
  const switched = switchNamedLayout(source, layoutDocument(), "layout-3");
  const restored = restoreSystemDefaultLayout(source, layoutDocument());

  switched.activeLayoutId = "changed";
  restored.lastUsedLayoutId = "changed";
  assert.deepEqual(source, before);
});

function layoutDocument() {
  return {
    schemaVersion: 1,
    nextLayoutSequence: 4,
    layouts: [
      { id: "layout-1", name: "内部デフォルト", systemDefault: true, placements: [] },
      { id: "layout-2", name: "作業用", systemDefault: false, placements: [] },
      { id: "layout-3", name: "閲覧用", systemDefault: false, placements: [] },
    ],
  };
}

function metadataDocument() {
  return {
    schemaVersion: 1,
    activeLayoutId: "layout-2",
    preferredLayoutId: "layout-2",
    lastUsedLayoutId: "layout-2",
  };
}
