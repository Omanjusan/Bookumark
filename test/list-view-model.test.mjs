import test from "node:test";
import assert from "node:assert/strict";

import { buildListViewModels } from "../dist/panel/lib/list-view-model.js";

test("builds dense list models in input order", () => {
  const input = [
    { guid: "b", title: "Beta", url: "https://docs.example.com/beta", visitCount: 2 },
    { guid: "a", title: "Alpha", url: "https://example.com/alpha", visitCount: 4 },
  ];

  assert.deepEqual(buildListViewModels(input), [
    { guid: "b", title: "Beta", url: "https://docs.example.com/beta", domain: "docs.example.com" },
    { guid: "a", title: "Alpha", url: "https://example.com/alpha", domain: "example.com" },
  ]);
});

test("uses an empty domain for an invalid URL and does not mutate input", () => {
  const input = [{ guid: "invalid", title: "Invalid", url: "not a URL" }];
  const snapshot = structuredClone(input);

  assert.deepEqual(buildListViewModels(input), [{
    guid: "invalid",
    title: "Invalid",
    url: "not a URL",
    domain: "",
  }]);
  assert.deepEqual(input, snapshot);
});
