import test from "node:test";
import assert from "node:assert/strict";

import { buildDockingRailDrawingPlan } from "../dist/panel/lib/docking-rail-drawing-plan.js";

test("builds rails in application order and bays in placement order", () => {
  const plan = buildDockingRailDrawingPlan(fixture());

  assert.equal(plan.activeLayoutId, "layout-2");
  assert.deepEqual(plan.rails.map(({ rail, orientation }) => [rail, orientation]), [
    ["top", "horizontal"],
    ["left", "vertical"],
    ["right", "vertical"],
    ["bottom", "horizontal"],
  ]);
  assert.deepEqual(plan.rails.map(({ bays }) => bays.map(({ bayId }) => bayId)), [
    ["bay-2", "bay-3"],
    ["bay-4"],
    [],
    ["bay-1"],
  ]);
});

test("orders chips within each bay and keeps immutable ids and settings", () => {
  const plan = buildDockingRailDrawingPlan(fixture());
  const bay = plan.rails[0].bays[0];

  assert.deepEqual(bay, {
    bayId: "bay-2",
    name: "検索",
    permanent: false,
    orientation: "horizontal",
    chips: [
      { instanceId: "chip-1", chipType: "search", order: 1, settings: { query: "book" } },
      { instanceId: "chip-2", chipType: "visit-status", order: 2, settings: {} },
    ],
  });
});

test("omits unplaced bays and reports unknown placed bays without stopping", () => {
  const documents = fixture();
  documents.mainLayouts.layouts[1].placements.push(
    { bayId: "bay-404", rail: "right", order: 1 },
  );

  const plan = buildDockingRailDrawingPlan(documents);

  assert.deepEqual(plan.skippedPlacements, [
    { bayId: "bay-404", rail: "right", order: 1, reason: "unknown-bay" },
  ]);
  assert.equal(plan.rails.flatMap(({ bays }) => bays).some(({ bayId }) => bayId === "bay-5"), false);
  assert.deepEqual(plan.rails[3].bays.map(({ bayId }) => bayId), ["bay-1"]);
});

test("uses the metadata active layout and rejects an unresolved active id", () => {
  const documents = fixture();
  documents.dockingMetadata.activeLayoutId = "layout-1";
  assert.deepEqual(
    buildDockingRailDrawingPlan(documents).rails[0].bays.map(({ bayId }) => bayId),
    ["bay-1"],
  );

  documents.dockingMetadata.activeLayoutId = "layout-404";
  assert.throws(
    () => buildDockingRailDrawingPlan(documents),
    /active layout was not found: layout-404/,
  );
});

test("returns a defensive plan without mutating source documents", () => {
  const documents = fixture();
  const before = structuredClone(documents);
  const plan = buildDockingRailDrawingPlan(documents);
  plan.rails[0].bays[0].chips[0].settings.query = "changed";
  plan.rails[0].bays[0].name = "changed";

  assert.deepEqual(documents, before);
});

function fixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 6,
      nextChipSequence: 3,
      bays: [
        { id: "bay-1", name: "固定", permanent: true, chips: [] },
        {
          id: "bay-2",
          name: "検索",
          permanent: false,
          chips: [
            { instanceId: "chip-2", chipType: "visit-status", order: 2, settings: {} },
            { instanceId: "chip-1", chipType: "search", order: 1, settings: { query: "book" } },
          ],
        },
        { id: "bay-3", name: "表示", permanent: false, chips: [] },
        { id: "bay-4", name: "履歴", permanent: false, chips: [] },
        { id: "bay-5", name: "未配置", permanent: false, chips: [] },
      ],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        {
          id: "layout-1",
          name: "内部デフォルト",
          systemDefault: true,
          placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
        },
        {
          id: "layout-2",
          name: "作業用",
          systemDefault: false,
          placements: [
            { bayId: "bay-3", rail: "top", order: 2 },
            { bayId: "bay-1", rail: "bottom", order: 1 },
            { bayId: "bay-4", rail: "left", order: 1 },
            { bayId: "bay-2", rail: "top", order: 1 },
          ],
        },
      ],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-2" },
  };
}
