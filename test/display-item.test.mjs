import test from "node:test";
import assert from "node:assert/strict";

import { withBookmarkSortMetadata } from "../dist/panel/lib/display-item.js";

test("adds sortable metadata without changing core bookmark fields", () => {
  const item = { guid: "a", title: "Alpha", url: "https://a.example" };

  assert.deepEqual(withBookmarkSortMetadata(item, {
    dateAdded: 100,
    visitCount: 5,
    lastVisitTime: 200,
  }), {
    guid: "a",
    title: "Alpha",
    url: "https://a.example",
    dateAdded: 100,
    visitCount: 5,
    lastVisitTime: 200,
  });
});

test("allows every metadata field to be omitted", () => {
  const item = { guid: "a", title: "Alpha", url: "https://a.example" };

  assert.deepEqual(withBookmarkSortMetadata(item, {}), item);
});

test("does not mutate the bookmark or metadata objects", () => {
  const item = { guid: "a", title: "Alpha", url: "https://a.example" };
  const metadata = { visitCount: 3 };
  const itemSnapshot = structuredClone(item);
  const metadataSnapshot = structuredClone(metadata);

  withBookmarkSortMetadata(item, metadata);

  assert.deepEqual(item, itemSnapshot);
  assert.deepEqual(metadata, metadataSnapshot);
});
