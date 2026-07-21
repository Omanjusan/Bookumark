import test from "node:test";
import assert from "node:assert/strict";

import { loadBookmarkHistory } from "../dist/panel/lib/bookmark-history.js";

function item(guid) {
  return { guid, title: guid, url: `https://${guid}.example` };
}

test("adds visit counts and the latest defined visit time", async () => {
  const items = [item("a"), item("b")];
  const visitsByUrl = new Map([
    [items[0].url, [{ visitTime: 100 }, { visitTime: undefined }, { visitTime: 300 }]],
    [items[1].url, [{ visitTime: 200 }]],
  ]);

  const result = await loadBookmarkHistory(items, {
    getVisits: async ({ url }) => visitsByUrl.get(url),
  });

  assert.deepEqual(result, [
    { ...items[0], visitCount: 3, lastVisitTime: 300 },
    { ...items[1], visitCount: 1, lastVisitTime: 200 },
  ]);
});

test("represents an unvisited bookmark with count zero and no last visit time", async () => {
  const result = await loadBookmarkHistory([item("unvisited")], {
    getVisits: async () => [],
  });

  assert.deepEqual(result, [{ ...item("unvisited"), visitCount: 0 }]);
});

test("preserves input order when history requests finish out of order", async () => {
  const items = [item("slow"), item("fast")];
  let releaseSlow;
  const slow = new Promise((resolve) => {
    releaseSlow = resolve;
  });
  const loading = loadBookmarkHistory(items, {
    getVisits: async ({ url }) => {
      if (url === items[0].url) return slow;
      return [{ visitTime: 20 }];
    },
  });

  releaseSlow([{ visitTime: 10 }]);
  const result = await loading;

  assert.deepEqual(result.map(({ guid }) => guid), ["slow", "fast"]);
});

test("limits Firefox history requests to eight concurrent calls by default", async () => {
  const items = Array.from({ length: 20 }, (_, index) => item(`item-${index}`));
  let active = 0;
  let peak = 0;
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  const loading = loadBookmarkHistory(items, {
    getVisits: async () => {
      calls += 1;
      active += 1;
      peak = Math.max(peak, active);
      await gate;
      active -= 1;
      return [];
    },
  });

  await Promise.resolve();
  assert.equal(calls, 8);
  release();
  await loading;
  assert.equal(peak, 8);
});

test("propagates a history API failure", async () => {
  const expected = new Error("history unavailable");

  await assert.rejects(
    loadBookmarkHistory([item("a")], {
      getVisits: async () => {
        throw expected;
      },
    }),
    (error) => error === expected,
  );
});

test("does not mutate bookmark inputs", async () => {
  const items = [item("a")];
  const snapshot = structuredClone(items);

  await loadBookmarkHistory(items, { getVisits: async () => [] });

  assert.deepEqual(items, snapshot);
});
