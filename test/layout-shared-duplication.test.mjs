import test from "node:test";
import assert from "node:assert/strict";

import { duplicateLayoutWithSharedBays } from "../dist/panel/lib/layout-duplication.js";

test("duplicates placements while retaining the same bay references", () => {
  const source = documentFixture();
  const result = duplicateLayoutWithSharedBays(source, "layout-2", "  作業コピー  ");

  assert.deepEqual(result.layout, {
    id: "layout-3",
    name: "作業コピー",
    systemDefault: false,
    placements: [
      { bayId: "bay-2", rail: "left", order: 1 },
      { bayId: "bay-1", rail: "bottom", order: 1 },
    ],
  });
  assert.equal(result.document.nextLayoutSequence, 4);
  assert.deepEqual(result.document.layouts.at(-1), result.layout);
});

test("allows the internal default as a source but never copies its protected flag", () => {
  const result = duplicateLayoutWithSharedBays(documentFixture(), "layout-1", "復旧配置");

  assert.equal(result.layout.systemDefault, false);
  assert.deepEqual(result.layout.placements, [
    { bayId: "bay-1", rail: "top", order: 1 },
  ]);
});

test("applies the standard unique-name rule to the duplicate", () => {
  const result = duplicateLayoutWithSharedBays(documentFixture(), "layout-2", "作業用");
  assert.equal(result.layout.name, "作業用 (2)");
});

test("does not mutate or share placement state with the source document", () => {
  const source = documentFixture();
  const before = structuredClone(source);
  const result = duplicateLayoutWithSharedBays(source, "layout-2", "コピー");

  result.layout.placements[0].rail = "right";
  result.document.layouts[1].placements[0].rail = "top";
  result.document.layouts.at(-1).placements[1].rail = "left";

  assert.deepEqual(source, before);
  assert.equal(result.layout.placements[1].rail, "bottom");
});

test("rejects an unknown source and an exhausted sequence without partial changes", () => {
  const source = documentFixture();
  assert.throws(
    () => duplicateLayoutWithSharedBays(source, "layout-404", "コピー"),
    /layout source was not found: layout-404/,
  );

  source.nextLayoutSequence = Number.MAX_SAFE_INTEGER;
  const before = structuredClone(source);
  assert.throws(
    () => duplicateLayoutWithSharedBays(source, "layout-2", "コピー"),
    /incremented safely/,
  );
  assert.deepEqual(source, before);
});

function documentFixture() {
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
