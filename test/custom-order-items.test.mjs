import test from "node:test";
import assert from "node:assert/strict";

const items = [
  { guid: "a", title: "Alpha", url: "https://a.example", visitCount: 1 },
  { guid: "b", title: "Beta", url: "https://b.example", visitCount: 2 },
  { guid: "c", title: "Gamma", url: "https://c.example", visitCount: 3 },
  { guid: "d", title: "Delta", url: "https://d.example", visitCount: 4 },
];

test("reorders display items from a tile drop without losing metadata", async () => {
  const { reorderItemsForTileDrop } = await import(
    "../dist/panel/lib/custom-order-items.js"
  );

  const result = reorderItemsForTileDrop(items, {
    fromGuid: "d",
    toGuid: "b",
    placement: "before",
  });

  assert.deepEqual(result.map(({ guid }) => guid), ["a", "d", "b", "c"]);
  assert.equal(result[1], items[3]);
  assert.equal(result[2].visitCount, 2);
  assert.equal(result.length, items.length);
});

test("supports insertion after the target item", async () => {
  const { reorderItemsForTileDrop } = await import(
    "../dist/panel/lib/custom-order-items.js"
  );

  assert.deepEqual(
    reorderItemsForTileDrop(items, {
      fromGuid: "a",
      toGuid: "c",
      placement: "after",
    }).map(({ guid }) => guid),
    ["b", "c", "a", "d"],
  );
});

test("returns an equal copy for a no-op drop", async () => {
  const { reorderItemsForTileDrop } = await import(
    "../dist/panel/lib/custom-order-items.js"
  );

  const result = reorderItemsForTileDrop(items, {
    fromGuid: "missing",
    toGuid: "b",
    placement: "before",
  });

  assert.deepEqual(result, items);
  assert.notEqual(result, items);
});

test("does not mutate the supplied display items", async () => {
  const { reorderItemsForTileDrop } = await import(
    "../dist/panel/lib/custom-order-items.js"
  );
  const orderSnapshot = items.map(({ guid }) => guid);

  reorderItemsForTileDrop(items, {
    fromGuid: "d",
    toGuid: "a",
    placement: "after",
  });

  assert.deepEqual(items.map(({ guid }) => guid), orderSnapshot);
});
