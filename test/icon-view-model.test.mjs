import test from "node:test";
import assert from "node:assert/strict";

import { buildIconViewModels } from "../dist/panel/lib/icon-view-model.js";

test("builds uniform icon models in input order without display metadata", () => {
  const input = [
    { guid: "b", title: "Beta", url: "https://example.com/beta", visitCount: 2 },
    { guid: "a", title: "Alpha", url: "not a URL", lastVisitTime: 10 },
  ];
  const snapshot = structuredClone(input);

  assert.deepEqual(buildIconViewModels(input), [
    { guid: "b", title: "Beta", url: "https://example.com/beta" },
    { guid: "a", title: "Alpha", url: "not a URL" },
  ]);
  assert.deepEqual(input, snapshot);
});
