import test from "node:test";
import assert from "node:assert/strict";

import { buildListViewModels } from "../dist/panel/lib/list-view-model.js";

test("builds five-column table models in input order", () => {
  const input = [
    {
      guid: "b",
      title: "Beta",
      url: "https://docs.example.com/beta",
      dateAdded: 100,
      lastVisitTime: 200,
      visitCount: 2,
    },
    { guid: "a", title: "Alpha", url: "https://example.com/alpha", visitCount: 0 },
  ];

  assert.deepEqual(buildListViewModels(input, { formatDateTime: (value) => `date:${value}` }), [
    {
      guid: "b",
      title: "Beta",
      url: "https://docs.example.com/beta",
      domain: "docs.example.com",
      dateAddedText: "date:100",
      lastVisitText: "date:200",
      visitCountText: "2",
    },
    {
      guid: "a",
      title: "Alpha",
      url: "https://example.com/alpha",
      domain: "example.com",
      dateAddedText: "—",
      lastVisitText: "—",
      visitCountText: "0",
    },
  ]);
});

test("uses placeholders for invalid metadata and does not mutate input", () => {
  const input = [{
    guid: "invalid",
    title: "Invalid",
    url: "not a URL",
    dateAdded: Number.NaN,
    lastVisitTime: Number.POSITIVE_INFINITY,
    visitCount: -1,
  }];
  const snapshot = structuredClone(input);

  assert.deepEqual(buildListViewModels(input), [{
    guid: "invalid",
    title: "Invalid",
    url: "not a URL",
    domain: "",
    dateAddedText: "—",
    lastVisitText: "—",
    visitCountText: "—",
  }]);
  assert.deepEqual(input, snapshot);
});
