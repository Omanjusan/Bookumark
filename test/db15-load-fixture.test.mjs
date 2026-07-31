import test from "node:test";
import assert from "node:assert/strict";

import {
  createDb15BayEditingFixture,
  createDb15DockingFixture,
  DB15_FIXTURE_COUNTS,
} from "../dist/panel/lib/db15-load-fixture.js";
import { createInternalDefaultDockingDocuments } from "../dist/panel/lib/docking-internal-defaults.js";
import { normalizeDockingDocuments } from "../dist/panel/lib/docking-documents-normalization.js";

test("creates the agreed DB-15 high-load docking fixture", () => {
  const documents = createDb15DockingFixture();
  const { bays } = documents.bayConfigurations;
  const layout = documents.mainLayouts.layouts.find(({ id }) => id === "layout-2");

  assert.deepEqual(DB15_FIXTURE_COUNTS, {
    bookmarks: 2_000,
    bays: 20,
    chipsPerBay: 10,
    chips: 200,
  });
  assert.equal(bays.length, 20);
  assert.ok(layout);
  assert.ok(bays.every(({ chips }) => chips.length === 10));
  assert.equal(new Set(bays.flatMap(({ chips }) => chips.map(({ instanceId }) => instanceId))).size, 200);
  assert.equal(layout.placements.length, 20);
  assert.deepEqual(
    layout.placements.reduce((counts, { rail }) => ({ ...counts, [rail]: counts[rail] + 1 }), {
      top: 0, left: 0, right: 0, bottom: 0,
    }),
    { top: 5, left: 5, right: 5, bottom: 5 },
  );
  for (const rail of ["top", "left", "right", "bottom"]) {
    assert.deepEqual(
      layout.placements.filter((placement) => placement.rail === rail).map(({ order }) => order),
      [1, 2, 3, 4, 5],
    );
  }
});

test("creates a four-rail fixture with one identifiable bay per rail", () => {
  const documents = createDb15BayEditingFixture();
  const layout = documents.mainLayouts.layouts.find(({ id }) => id === "layout-2");

  assert.ok(layout);
  assert.deepEqual(layout.placements, [
    { bayId: "bay-1", rail: "top", order: 1 },
    { bayId: "bay-2", rail: "left", order: 1 },
    { bayId: "bay-3", rail: "right", order: 1 },
    { bayId: "bay-4", rail: "bottom", order: 1 },
  ]);
  assert.deepEqual(
    documents.bayConfigurations.bays.map(({ name }) => name),
    ["上レール・基本操作", "左レール・表示操作", "右レール・絞り込み", "下レール・移動操作"],
  );
  const normalized = normalizeDockingDocuments(documents, createInternalDefaultDockingDocuments());
  assert.deepEqual(normalized.documents, documents);
  assert.deepEqual(normalized.changedDocuments, []);
});

test("returns an independent DB-15 fixture on every call", () => {
  const first = createDb15DockingFixture();
  first.bayConfigurations.bays[0].chips[0].settings.changed = true;
  first.mainLayouts.layouts[0].placements[0].rail = "bottom";

  const second = createDb15DockingFixture();
  assert.deepEqual(second.bayConfigurations.bays[0].chips[0].settings, {});
  assert.equal(second.mainLayouts.layouts[0].placements[0].rail, "top");
});

test("is accepted unchanged by the production docking normalizer", () => {
  const fixture = createDb15DockingFixture();
  const result = normalizeDockingDocuments(fixture, createInternalDefaultDockingDocuments());

  assert.deepEqual(result.documents, fixture);
  assert.deepEqual(result.changedDocuments, []);
});
