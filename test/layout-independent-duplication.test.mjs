import test from "node:test";
import assert from "node:assert/strict";

import { duplicateLayoutWithIndependentBays } from "../dist/panel/lib/layout-duplication.js";

test("duplicates placed user bays and chips while sharing the permanent bay", () => {
  const result = duplicateLayoutWithIndependentBays(
    layoutDocument(),
    bayDocument(),
    "layout-2",
    "独立作業",
  );

  assert.deepEqual(result.layout, {
    id: "layout-3",
    name: "独立作業",
    systemDefault: false,
    placements: [
      { bayId: "bay-3", rail: "left", order: 1 },
      { bayId: "bay-1", rail: "bottom", order: 1 },
    ],
  });
  assert.deepEqual(result.duplicatedBayIds, ["bay-3"]);
  assert.deepEqual(result.bayConfigurations.bays.at(-1), {
    id: "bay-3",
    name: "検索用",
    permanent: false,
    chips: [
      { instanceId: "chip-3", chipType: "search", order: 1, settings: { query: "book" } },
      { instanceId: "chip-4", chipType: "sort", order: 2, settings: { axis: "title" } },
    ],
  });
  assert.equal(result.bayConfigurations.nextBaySequence, 4);
  assert.equal(result.bayConfigurations.nextChipSequence, 5);
  assert.equal(result.mainLayouts.nextLayoutSequence, 4);
});

test("duplicates each placed user bay once in placement order", () => {
  const layouts = layoutDocument();
  layouts.layouts[1].placements.unshift({ bayId: "bay-3", rail: "top", order: 1 });
  const bays = bayDocument();
  bays.bays.push({
    id: "bay-3",
    name: "空ベイ",
    permanent: false,
    chips: [],
  });

  bays.nextBaySequence = 4;
  const result = duplicateLayoutWithIndependentBays(layouts, bays, "layout-2", "独立作業");

  assert.deepEqual(result.duplicatedBayIds, ["bay-4", "bay-5"]);
  assert.deepEqual(result.layout.placements.map(({ bayId }) => bayId), ["bay-4", "bay-5", "bay-1"]);
  assert.deepEqual(result.bayConfigurations.bays.slice(-2).map(({ name }) => name), ["空ベイ", "検索用"]);
});

test("keeps duplicated settings and returned documents independent from every source", () => {
  const layouts = layoutDocument();
  const bays = bayDocument();
  const beforeLayouts = structuredClone(layouts);
  const beforeBays = structuredClone(bays);
  const result = duplicateLayoutWithIndependentBays(layouts, bays, "layout-2", "独立作業");

  result.bayConfigurations.bays.at(-1).chips[0].settings.query = "changed";
  result.layout.placements[0].rail = "right";

  assert.deepEqual(layouts, beforeLayouts);
  assert.deepEqual(bays, beforeBays);
  assert.equal(result.mainLayouts.layouts.at(-1).placements[0].rail, "left");
  assert.equal(bays.bays.at(-1).chips[0].settings.query, "book");
});

test("allows the internal default source and keeps its permanent bay shared", () => {
  const result = duplicateLayoutWithIndependentBays(
    layoutDocument(),
    bayDocument(),
    "layout-1",
    "復旧配置",
  );

  assert.deepEqual(result.duplicatedBayIds, []);
  assert.deepEqual(result.layout.placements, [{ bayId: "bay-1", rail: "top", order: 1 }]);
  assert.equal(result.layout.systemDefault, false);
  assert.equal(result.bayConfigurations.bays.length, 2);
});

test("rejects unknown layout and bay references before producing candidates", () => {
  assert.throws(
    () => duplicateLayoutWithIndependentBays(layoutDocument(), bayDocument(), "layout-404", "複製"),
    /layout source was not found: layout-404/,
  );

  const layouts = layoutDocument();
  layouts.layouts[1].placements[0].bayId = "bay-404";
  assert.throws(
    () => duplicateLayoutWithIndependentBays(layouts, bayDocument(), "layout-2", "複製"),
    /placed bay was not found: bay-404/,
  );
});

test("rejects exhausted layout, bay, and chip sequences without changing inputs", () => {
  for (const field of ["layout", "bay", "chip"]) {
    const layouts = layoutDocument();
    const bays = bayDocument();
    if (field === "layout") layouts.nextLayoutSequence = Number.MAX_SAFE_INTEGER;
    if (field === "bay") bays.nextBaySequence = Number.MAX_SAFE_INTEGER;
    if (field === "chip") bays.nextChipSequence = Number.MAX_SAFE_INTEGER;
    const beforeLayouts = structuredClone(layouts);
    const beforeBays = structuredClone(bays);

    assert.throws(
      () => duplicateLayoutWithIndependentBays(layouts, bays, "layout-2", "複製"),
      /incremented safely/,
    );
    assert.deepEqual(layouts, beforeLayouts);
    assert.deepEqual(bays, beforeBays);
  }
});

function layoutDocument() {
  return {
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
          { bayId: "bay-2", rail: "left", order: 1 },
          { bayId: "bay-1", rail: "bottom", order: 1 },
        ],
      },
    ],
  };
}

function bayDocument() {
  return {
    schemaVersion: 1,
    nextBaySequence: 3,
    nextChipSequence: 3,
    bays: [
      { id: "bay-1", name: "デフォルトベイ", permanent: true, chips: [] },
      {
        id: "bay-2",
        name: "検索用",
        permanent: false,
        chips: [
          { instanceId: "chip-1", chipType: "search", order: 1, settings: { query: "book" } },
          { instanceId: "chip-2", chipType: "sort", order: 2, settings: { axis: "title" } },
        ],
      },
    ],
  };
}
