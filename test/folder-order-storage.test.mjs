import test from "node:test";
import assert from "node:assert/strict";

import { loadFolderOrders, saveFolderOrders } from "../dist/panel/lib/overlay.js";

test("loads valid folder orders and distinguishes an absent value", async () => {
  const stored = [
    { orderByFolder: { root: ["a", "b"], empty: [] } },
    {},
  ];
  globalThis.browser = {
    storage: { local: { get: async () => stored.shift() } },
  };

  assert.deepEqual(await loadFolderOrders(), { root: ["a", "b"], empty: [] });
  assert.equal(await loadFolderOrders(), null);
});

test("treats malformed folder orders as absent", async () => {
  globalThis.browser = {
    storage: { local: { get: async () => ({ orderByFolder: { root: ["a", 1] } }) } },
  };

  assert.equal(await loadFolderOrders(), null);
});

test("saves a defensive copy of all folder orders", async () => {
  const writes = [];
  globalThis.browser = {
    storage: { local: { set: async (value) => writes.push(value) } },
  };
  const orders = { root: ["a", "b"], empty: [] };

  await saveFolderOrders(orders);
  orders.root.reverse();

  assert.deepEqual(writes, [{ orderByFolder: { root: ["a", "b"], empty: [] } }]);
});

test("propagates folder order storage failures", async () => {
  const failure = new Error("storage unavailable");
  globalThis.browser = {
    storage: { local: {
      get: async () => { throw failure; },
      set: async () => { throw failure; },
    } },
  };

  await assert.rejects(loadFolderOrders(), (error) => error === failure);
  await assert.rejects(saveFolderOrders({}), (error) => error === failure);
});
