import test from "node:test";
import assert from "node:assert/strict";

import { createBlankNamedLayout } from "../dist/panel/lib/layout-creation.js";

test("creates a named layout with only the permanent bay on the top rail", () => {
  const layouts = layoutDocument();
  const bays = bayDocument();

  const result = createBlankNamedLayout(layouts, bays, "  読書用  ");

  assert.deepEqual(result.layout, {
    id: "layout-3",
    name: "読書用",
    systemDefault: false,
    placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
  });
  assert.equal(result.document.nextLayoutSequence, 4);
  assert.deepEqual(result.document.layouts, [...layouts.layouts, result.layout]);
});

test("leaves every user bay unplaced and does not mutate or share input documents", () => {
  const layouts = layoutDocument();
  const bays = bayDocument();
  const beforeLayouts = structuredClone(layouts);
  const beforeBays = structuredClone(bays);

  const result = createBlankNamedLayout(layouts, bays, "閲覧用");
  result.document.layouts[0].name = "changed";
  result.document.layouts.at(-1).placements[0].rail = "bottom";

  assert.deepEqual(layouts, beforeLayouts);
  assert.deepEqual(bays, beforeBays);
  assert.equal(result.layout.placements.some(({ bayId }) => bayId === "bay-2"), false);
});

test("assigns the next available name without changing the system default", () => {
  const result = createBlankNamedLayout(layoutDocument(), bayDocument(), "作業用");

  assert.equal(result.layout.name, "作業用 (2)");
  assert.equal(result.document.layouts[0].systemDefault, true);
  assert.equal(result.document.layouts.at(-1).systemDefault, false);
});

test("rejects documents without exactly one permanent bay", () => {
  const bays = bayDocument();
  bays.bays[0].permanent = false;
  assert.throws(
    () => createBlankNamedLayout(layoutDocument(), bays, "作業用"),
    /exactly one permanent bay is required/,
  );

  bays.bays.push({ id: "bay-3", name: "別の固定", permanent: true, chips: [] });
  bays.bays[0].permanent = true;
  assert.throws(
    () => createBlankNamedLayout(layoutDocument(), bays, "作業用"),
    /exactly one permanent bay is required/,
  );
});

test("rejects an exhausted sequence without returning a partial document", () => {
  const layouts = layoutDocument();
  layouts.nextLayoutSequence = Number.MAX_SAFE_INTEGER;
  const before = structuredClone(layouts);

  assert.throws(
    () => createBlankNamedLayout(layouts, bayDocument(), "作業用"),
    /incremented safely/,
  );
  assert.deepEqual(layouts, before);
});

function layoutDocument() {
  return {
    schemaVersion: 1,
    nextLayoutSequence: 3,
    layouts: [
      { id: "layout-1", name: "内部デフォルト", systemDefault: true, placements: [] },
      { id: "layout-2", name: "作業用", systemDefault: false, placements: [] },
    ],
  };
}

function bayDocument() {
  return {
    schemaVersion: 1,
    nextBaySequence: 3,
    nextChipSequence: 1,
    bays: [
      { id: "bay-1", name: "デフォルトベイ", permanent: true, chips: [] },
      { id: "bay-2", name: "検索用", permanent: false, chips: [] },
    ],
  };
}
