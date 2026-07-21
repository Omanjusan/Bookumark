import test from "node:test";
import assert from "node:assert/strict";

test("persists the complete current GUID order", async () => {
  const { persistCustomOrder } = await import(
    "../dist/panel/lib/custom-order-persistence.js"
  );
  const saved = [];
  const items = [{ guid: "c" }, { guid: "a" }, { guid: "b" }];

  await persistCustomOrder(
    items,
    async (order) => saved.push([...order]),
    assert.fail,
  );

  assert.deepEqual(saved, [["c", "a", "b"]]);
});

test("persists an empty order", async () => {
  const { persistCustomOrder } = await import(
    "../dist/panel/lib/custom-order-persistence.js"
  );
  const saved = [];

  await persistCustomOrder(
    [],
    async (order) => saved.push([...order]),
    assert.fail,
  );

  assert.deepEqual(saved, [[]]);
});

test("reports an asynchronous save failure without rejecting", async () => {
  const { persistCustomOrder } = await import(
    "../dist/panel/lib/custom-order-persistence.js"
  );
  const failure = new Error("storage.local.set failed");
  const reported = [];

  await assert.doesNotReject(() => persistCustomOrder(
    [{ guid: "a" }],
    async () => { throw failure; },
    (error) => reported.push(error),
  ));

  assert.deepEqual(reported, [failure]);
});

test("reports a synchronous save failure without rejecting", async () => {
  const { persistCustomOrder } = await import(
    "../dist/panel/lib/custom-order-persistence.js"
  );
  const failure = new Error("synchronous storage failure");
  const reported = [];

  await assert.doesNotReject(() => persistCustomOrder(
    [{ guid: "a" }],
    () => { throw failure; },
    (error) => reported.push(error),
  ));

  assert.deepEqual(reported, [failure]);
});
