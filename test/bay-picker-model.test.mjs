import test from "node:test";
import assert from "node:assert/strict";

import { buildBayPickerModel } from "../dist/panel/lib/bay-picker-model.js";

test("separates unplaced registration order from placed application order", () => {
  const model = buildBayPickerModel(fixture());

  assert.equal(model.activeLayoutId, "layout-2");
  assert.deepEqual(model.unplaced, [
    { bayId: "bay-3", name: "未配置A", permanent: false },
    { bayId: "bay-5", name: "未配置B", permanent: false },
  ]);
  assert.deepEqual(model.placed, [
    { bayId: "bay-2", name: "上", permanent: false, rail: "top", order: 1 },
    { bayId: "bay-1", name: "デフォルト", permanent: true, rail: "left", order: 1 },
    { bayId: "bay-4", name: "右", permanent: false, rail: "right", order: 1 },
    { bayId: "bay-6", name: "下", permanent: false, rail: "bottom", order: 1 },
  ]);
  assert.deepEqual(model.ignoredPlacements, []);
});

test("keeps same-name bays separately identifiable by immutable id", () => {
  const documents = fixture();
  documents.bayConfigurations.bays[2].name = "同名";
  documents.bayConfigurations.bays[4].name = "同名";

  const model = buildBayPickerModel(documents);

  assert.deepEqual(model.unplaced.map(({ bayId, name }) => ({ bayId, name })), [
    { bayId: "bay-3", name: "同名" },
    { bayId: "bay-5", name: "同名" },
  ]);
});

test("uses only the first application occurrence of a duplicate placement", () => {
  const documents = fixture();
  documents.mainLayouts.layouts[1].placements.push(
    { bayId: "bay-2", rail: "bottom", order: 2 },
  );

  const model = buildBayPickerModel(documents);

  assert.equal(model.placed.filter(({ bayId }) => bayId === "bay-2").length, 1);
  assert.deepEqual(model.ignoredPlacements, [{
    bayId: "bay-2",
    rail: "bottom",
    order: 2,
    reason: "duplicate-placement",
  }]);
});

test("ignores unknown placement references without dropping valid tags", () => {
  const documents = fixture();
  documents.mainLayouts.layouts[1].placements.push(
    { bayId: "bay-404", rail: "top", order: 2 },
  );

  const model = buildBayPickerModel(documents);

  assert.equal(model.placed.length, 4);
  assert.equal(model.unplaced.length, 2);
  assert.deepEqual(model.ignoredPlacements, [{
    bayId: "bay-404",
    rail: "top",
    order: 2,
    reason: "unknown-bay",
  }]);
});

test("rejects an unresolved active layout and returns defensive tag data", () => {
  const documents = fixture();
  const before = structuredClone(documents);
  const model = buildBayPickerModel(documents);
  model.unplaced[0].name = "changed";
  model.placed[0].name = "changed";
  assert.deepEqual(documents, before);

  documents.dockingMetadata.activeLayoutId = "layout-404";
  assert.throws(() => buildBayPickerModel(documents), /active layout was not found: layout-404/);
});

function fixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 7,
      nextChipSequence: 1,
      bays: [
        { id: "bay-1", name: "デフォルト", permanent: true, chips: [] },
        { id: "bay-2", name: "上", permanent: false, chips: [] },
        { id: "bay-3", name: "未配置A", permanent: false, chips: [] },
        { id: "bay-4", name: "右", permanent: false, chips: [] },
        { id: "bay-5", name: "未配置B", permanent: false, chips: [] },
        { id: "bay-6", name: "下", permanent: false, chips: [] },
      ],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        { id: "layout-1", name: "内部", systemDefault: true, placements: [] },
        {
          id: "layout-2",
          name: "作業",
          systemDefault: false,
          placements: [
            { bayId: "bay-6", rail: "bottom", order: 1 },
            { bayId: "bay-4", rail: "right", order: 1 },
            { bayId: "bay-1", rail: "left", order: 1 },
            { bayId: "bay-2", rail: "top", order: 1 },
          ],
        },
      ],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-2" },
  };
}
