import test from "node:test";
import assert from "node:assert/strict";

import { buildDisplaySet } from "../dist/panel/lib/display-pipeline.js";

const standardState = {
  freeMovement: false,
  sort: { axisId: "visitCount", direction: "desc" },
  lastStandardSort: { axisId: "visitCount", direction: "desc" },
};

const items = [
  { guid: "a", title: "Alpha project", url: "https://a.example", visitCount: 2 },
  { guid: "b", title: "Beta project", url: "https://b.example", visitCount: 5 },
  { guid: "c", title: "Gamma note", url: "https://c.example", visitCount: 10 },
  { guid: "d", title: "Delta project", url: "https://d.example", visitCount: 1 },
];

test("applies search, then filters, then the selected sort", () => {
  const visitedByFilter = [];
  const result = buildDisplaySet({
    items,
    query: "project",
    filters: [{
      id: "not-alpha",
      matches: (item) => {
        visitedByFilter.push(item.guid);
        return item.guid !== "a";
      },
    }],
    state: standardState,
  });

  assert.deepEqual(visitedByFilter, ["a", "b", "d"]);
  assert.deepEqual(result.items.map(({ guid }) => guid), ["b", "d"]);
  assert.equal(result.axis.id, "visitCount");
  assert.equal(result.axis.scalable, true);
});

test("uses the saved input order and a non-scalable axis in custom mode", () => {
  const state = {
    freeMovement: true,
    sort: { axisId: "custom", direction: "desc" },
    lastStandardSort: { axisId: "visitCount", direction: "desc" },
  };

  const result = buildDisplaySet({ items: [items[2], items[0], items[1]], query: "", filters: [], state });

  assert.deepEqual(result.items.map(({ guid }) => guid), ["c", "a", "b"]);
  assert.equal(result.axis.id, "custom");
  assert.equal(result.axis.scalable, false);
});

test("uses the selected axis direction", () => {
  const state = {
    freeMovement: false,
    sort: { axisId: "title", direction: "desc" },
    lastStandardSort: { axisId: "title", direction: "desc" },
  };

  assert.deepEqual(
    buildDisplaySet({ items, query: "", filters: [], state }).items.map(({ guid }) => guid),
    ["c", "d", "b", "a"],
  );
});

test("does not mutate items, filters, or state", () => {
  const filters = [{ id: "all", matches: () => true }];
  const itemSnapshot = structuredClone(items);
  const filterSnapshot = [...filters];
  const stateSnapshot = structuredClone(standardState);

  buildDisplaySet({ items, query: "", filters, state: standardState });

  assert.deepEqual(items, itemSnapshot);
  assert.deepEqual(filters, filterSnapshot);
  assert.deepEqual(standardState, stateSnapshot);
});
