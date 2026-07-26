import test from "node:test";
import assert from "node:assert/strict";

import { normalizeDockingDocuments } from "../dist/panel/lib/docking-documents-normalization.js";
import {
  createInternalDefaultDockingDocuments,
  INTERNAL_DEFAULT_LAYOUT_ID,
  PERMANENT_DEFAULT_BAY_ID,
} from "../dist/panel/lib/docking-internal-defaults.js";

test("creates one permanent recovery bay with every basic panel chip", () => {
  const documents = createInternalDefaultDockingDocuments();

  assert.equal(documents.bayConfigurations.bays.length, 1);
  assert.deepEqual(documents.bayConfigurations.bays[0], {
    id: "bay-1",
    name: "デフォルトベイ",
    permanent: true,
    chips: [
      chip("chip-1", "search", 1),
      chip("chip-2", "visit-status", 2),
      chip("chip-3", "folder-history", 3),
      chip("chip-4", "sort", 4),
      chip("chip-5", "view-type", 5),
      chip("chip-6", "movement-mode", 6),
    ],
  });
  assert.equal(documents.bayConfigurations.nextBaySequence, 2);
  assert.equal(documents.bayConfigurations.nextChipSequence, 7);
  assert.equal(PERMANENT_DEFAULT_BAY_ID, "bay-1");
});

test("places the permanent bay in the protected internal default layout", () => {
  const documents = createInternalDefaultDockingDocuments();

  assert.deepEqual(documents.mainLayouts, {
    schemaVersion: 1,
    nextLayoutSequence: 2,
    layouts: [{
      id: "layout-1",
      name: "内部デフォルト",
      systemDefault: true,
      placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
    }],
  });
  assert.deepEqual(documents.dockingMetadata, {
    schemaVersion: 1,
    activeLayoutId: "layout-1",
  });
  assert.equal(INTERNAL_DEFAULT_LAYOUT_ID, "layout-1");
});

test("returns independent default documents on every call", () => {
  const first = createInternalDefaultDockingDocuments();
  const second = createInternalDefaultDockingDocuments();
  first.bayConfigurations.bays[0].name = "changed";
  first.bayConfigurations.bays[0].chips[0].settings.changed = true;
  first.mainLayouts.layouts[0].placements[0].rail = "bottom";

  assert.equal(second.bayConfigurations.bays[0].name, "デフォルトベイ");
  assert.deepEqual(second.bayConfigurations.bays[0].chips[0].settings, {});
  assert.equal(second.mainLayouts.layouts[0].placements[0].rail, "top");
});

test("is accepted unchanged by the complete docking normalizer", () => {
  const defaults = createInternalDefaultDockingDocuments();
  const result = normalizeDockingDocuments(defaults, defaults);

  assert.deepEqual(result.documents, defaults);
  assert.deepEqual(result.changedDocuments, []);
  assert.deepEqual(result.recoveries, {
    bayConfigurations: "unchanged",
    mainLayouts: "unchanged",
    dockingMetadata: "unchanged",
  });
});

function chip(instanceId, chipType, order) {
  return { instanceId, chipType, order, settings: {} };
}
