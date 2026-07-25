import test from "node:test";
import assert from "node:assert/strict";

import { createVisitStatusFilters } from "../dist/panel/lib/visit-status-filter.js";

const items = [
  { guid: "visited", title: "訪問済み", url: "https://example.com/visited", visitCount: 2 },
  { guid: "unvisited", title: "未訪問", url: "https://example.com/unvisited", visitCount: 0 },
  { guid: "missing", title: "履歴不明", url: "https://example.com/missing" },
];

test("all mode does not create an active filter", () => {
  assert.deepEqual(createVisitStatusFilters("all"), []);
});

test("visited mode includes only positive visit counts", () => {
  const [filter] = createVisitStatusFilters("visited");
  assert.deepEqual(items.filter((item) => filter.matches(item)).map(({ guid }) => guid), [
    "visited",
  ]);
});

test("unvisited mode includes zero but not missing visit counts", () => {
  const [filter] = createVisitStatusFilters("unvisited");
  assert.deepEqual(items.filter((item) => filter.matches(item)).map(({ guid }) => guid), [
    "unvisited",
  ]);
});

test("rejects an unknown visit-status mode", () => {
  assert.throws(() => createVisitStatusFilters("unknown"), /Unknown visit status: unknown/);
});
