import test from "node:test";
import assert from "node:assert/strict";

import { applyDisplayFilters } from "../dist/panel/lib/display-filter.js";

const items = [
  { guid: "a", title: "Alpha", url: "https://a.example" },
  { guid: "b", title: "Beta", url: "https://b.example" },
  { guid: "c", title: "Gamma", url: "https://c.example" },
];

test("returns every item in input order when no filters are active", () => {
  assert.deepEqual(applyDisplayFilters(items, []).map(({ guid }) => guid), ["a", "b", "c"]);
});

test("requires an item to match every active filter", () => {
  const filters = [
    { id: "not-alpha", matches: (item) => item.guid !== "a" },
    { id: "example-b-or-c", matches: (item) => /[bc]\.example/.test(item.url) },
    { id: "only-c", matches: (item) => item.title === "Gamma" },
  ];

  assert.deepEqual(applyDisplayFilters(items, filters).map(({ guid }) => guid), ["c"]);
});

test("preserves result order and does not mutate items or filters", () => {
  const input = [items[2], items[0], items[1]];
  const filters = [{ id: "not-alpha", matches: (item) => item.guid !== "a" }];
  const inputSnapshot = [...input];
  const filterSnapshot = [...filters];

  assert.deepEqual(applyDisplayFilters(input, filters).map(({ guid }) => guid), ["c", "b"]);
  assert.deepEqual(input, inputSnapshot);
  assert.deepEqual(filters, filterSnapshot);
});

test("propagates filter errors instead of silently excluding an item", () => {
  const expected = new Error("filter failed");
  const filters = [{
    id: "broken",
    matches: () => {
      throw expected;
    },
  }];

  assert.throws(() => applyDisplayFilters(items, filters), (error) => error === expected);
});
