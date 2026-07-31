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

test("keeps the next save as the latest complete order after a failure", async () => {
  const { persistCustomOrder } = await import(
    "../dist/panel/lib/custom-order-persistence.js"
  );
  const saved = [];
  let attempts = 0;
  const save = async (order) => {
    saved.push([...order]);
    attempts += 1;
    if (attempts === 1) throw new Error("first failed");
  };

  await persistCustomOrder([{ guid: "b" }, { guid: "a" }], save, () => {});
  await persistCustomOrder([{ guid: "a" }, { guid: "c" }, { guid: "b" }], save, assert.fail);

  assert.deepEqual(saved, [["b", "a"], ["a", "c", "b"]]);
});

test("does not reject when failure reporting itself throws", async () => {
  const { persistCustomOrder } = await import(
    "../dist/panel/lib/custom-order-persistence.js"
  );

  await assert.doesNotReject(() => persistCustomOrder(
    [{ guid: "a" }],
    async () => { throw new Error("save failed"); },
    () => { throw new Error("notification failed"); },
  ));
});
