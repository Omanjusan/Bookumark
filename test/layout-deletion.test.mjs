import test from "node:test";
import assert from "node:assert/strict";

import { deleteNamedLayout } from "../dist/panel/lib/layout-deletion.js";

test("deletes an inactive named layout without changing a valid active layout", () => {
  const result = deleteNamedLayout(layoutDocument(), metadataDocument(), "layout-3");

  assert.deepEqual(
    result.mainLayouts.layouts.map(({ id }) => id),
    ["layout-1", "layout-2", "layout-4"],
  );
  assert.equal(result.mainLayouts.nextLayoutSequence, 4);
  assert.deepEqual(result.dockingMetadata, {
    schemaVersion: 1,
    activeLayoutId: "layout-2",
    preferredLayoutId: "layout-2",
    lastUsedLayoutId: "layout-2",
  });
});

test("clears a deleted preferred reference without transferring preference", () => {
  const metadata = metadataDocument();
  metadata.preferredLayoutId = "layout-3";
  const result = deleteNamedLayout(layoutDocument(), metadata, "layout-3");

  assert.equal("preferredLayoutId" in result.dockingMetadata, false);
  assert.equal(result.dockingMetadata.activeLayoutId, "layout-2");
});

test("falls back from a deleted active layout to a valid last-used layout first", () => {
  const metadata = metadataDocument();
  metadata.activeLayoutId = "layout-3";
  metadata.lastUsedLayoutId = "layout-2";
  metadata.preferredLayoutId = "layout-4";

  const result = deleteNamedLayout(layoutDocument(), metadata, "layout-3");
  assert.equal(result.dockingMetadata.activeLayoutId, "layout-2");
  assert.equal(result.dockingMetadata.lastUsedLayoutId, "layout-2");
  assert.equal(result.dockingMetadata.preferredLayoutId, "layout-4");
});

test("uses the preferred layout when deleted active and last-used references are invalid", () => {
  const metadata = metadataDocument();
  metadata.activeLayoutId = "layout-2";
  metadata.lastUsedLayoutId = "layout-2";
  metadata.preferredLayoutId = "layout-4";

  const result = deleteNamedLayout(layoutDocument(), metadata, "layout-2");
  assert.deepEqual(result.dockingMetadata, {
    schemaVersion: 1,
    activeLayoutId: "layout-4",
    preferredLayoutId: "layout-4",
  });
});

test("falls back to the internal default after deleting the final named layout", () => {
  const layouts = layoutDocument();
  layouts.layouts = layouts.layouts.filter(({ id }) => ["layout-1", "layout-2"].includes(id));
  const metadata = metadataDocument();

  const result = deleteNamedLayout(layouts, metadata, "layout-2");
  assert.deepEqual(result.dockingMetadata, {
    schemaVersion: 1,
    activeLayoutId: "layout-1",
  });
  assert.deepEqual(result.mainLayouts.layouts.map(({ id }) => id), ["layout-1"]);
});

test("rejects deleting the internal default and unknown layouts", () => {
  assert.throws(
    () => deleteNamedLayout(layoutDocument(), metadataDocument(), "layout-1"),
    /system default layout cannot be deleted/,
  );
  assert.throws(
    () => deleteNamedLayout(layoutDocument(), metadataDocument(), "layout-404"),
    /layout was not found: layout-404/,
  );
});

test("requires one remaining internal default and keeps input documents independent", () => {
  const layouts = layoutDocument();
  const metadata = metadataDocument();
  const beforeLayouts = structuredClone(layouts);
  const beforeMetadata = structuredClone(metadata);
  const result = deleteNamedLayout(layouts, metadata, "layout-3");
  result.mainLayouts.layouts[0].name = "changed";
  result.dockingMetadata.activeLayoutId = "changed";

  assert.deepEqual(layouts, beforeLayouts);
  assert.deepEqual(metadata, beforeMetadata);

  layouts.layouts[0].systemDefault = false;
  assert.throws(
    () => deleteNamedLayout(layouts, metadata, "layout-3"),
    /exactly one system default layout is required/,
  );
});

function layoutDocument() {
  return {
    schemaVersion: 1,
    nextLayoutSequence: 4,
    layouts: [
      { id: "layout-1", name: "内部デフォルト", systemDefault: true, placements: [] },
      { id: "layout-2", name: "作業用", systemDefault: false, placements: [] },
      { id: "layout-3", name: "閲覧用", systemDefault: false, placements: [] },
      { id: "layout-4", name: "整理用", systemDefault: false, placements: [] },
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
