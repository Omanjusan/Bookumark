import test from "node:test";
import assert from "node:assert/strict";

import {
  renameNamedLayout,
  setPreferredLayout,
} from "../dist/panel/lib/layout-management.js";

test("renames a named layout after trimming without changing its placements", () => {
  const source = layoutDocument();
  const result = renameNamedLayout(source, "layout-2", "  集中用  ");

  assert.equal(result.layouts[1].name, "集中用");
  assert.deepEqual(result.layouts[1].placements, source.layouts[1].placements);
  assert.equal(result.nextLayoutSequence, source.nextLayoutSequence);
});

test("keeps its current name but suffixes a name used by another layout", () => {
  assert.equal(renameNamedLayout(layoutDocument(), "layout-2", "作業用").layouts[1].name, "作業用");
  assert.equal(
    renameNamedLayout(layoutDocument(), "layout-3", "作業用").layouts[2].name,
    "作業用 (2)",
  );
});

test("rejects renaming the internal default, an unknown layout, and an empty name", () => {
  assert.throws(
    () => renameNamedLayout(layoutDocument(), "layout-1", "変更"),
    /system default layout cannot be renamed/,
  );
  assert.throws(
    () => renameNamedLayout(layoutDocument(), "layout-404", "変更"),
    /layout was not found: layout-404/,
  );
  assert.throws(
    () => renameNamedLayout(layoutDocument(), "layout-2", "  "),
    /layout name must not be empty/,
  );
});

test("returns an independent renamed document", () => {
  const source = layoutDocument();
  const before = structuredClone(source);
  const result = renameNamedLayout(source, "layout-2", "集中用");
  result.layouts[1].placements[0].rail = "right";

  assert.deepEqual(source, before);
});

test("sets a named layout as preferred while preserving current selection metadata", () => {
  const metadata = metadataDocument();
  const result = setPreferredLayout(metadata, layoutDocument(), "layout-3");

  assert.deepEqual(result, {
    schemaVersion: 1,
    activeLayoutId: "layout-2",
    lastUsedLayoutId: "layout-2",
    preferredLayoutId: "layout-3",
  });
});

test("clears the preferred layout without changing active or last-used values", () => {
  assert.deepEqual(setPreferredLayout(metadataDocument(), layoutDocument(), undefined), {
    schemaVersion: 1,
    activeLayoutId: "layout-2",
    lastUsedLayoutId: "layout-2",
  });
});

test("rejects the internal default and unknown layouts as preferred targets", () => {
  assert.throws(
    () => setPreferredLayout(metadataDocument(), layoutDocument(), "layout-1"),
    /system default layout cannot be preferred/,
  );
  assert.throws(
    () => setPreferredLayout(metadataDocument(), layoutDocument(), "layout-404"),
    /layout was not found: layout-404/,
  );
});

test("does not mutate or share metadata when setting or clearing preference", () => {
  const source = metadataDocument();
  const before = structuredClone(source);
  const preferred = setPreferredLayout(source, layoutDocument(), "layout-3");
  const cleared = setPreferredLayout(source, layoutDocument(), undefined);

  preferred.activeLayoutId = "changed";
  cleared.lastUsedLayoutId = "changed";
  assert.deepEqual(source, before);
});

function layoutDocument() {
  return {
    schemaVersion: 1,
    nextLayoutSequence: 4,
    layouts: [
      { id: "layout-1", name: "内部デフォルト", systemDefault: true, placements: [] },
      {
        id: "layout-2",
        name: "作業用",
        systemDefault: false,
        placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
      },
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
