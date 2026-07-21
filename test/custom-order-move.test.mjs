import test from "node:test";
import assert from "node:assert/strict";

test("moves a GUID immediately before another GUID", async () => {
  const { moveGuidInCustomOrder } = await import(
    "../dist/panel/lib/custom-order-move.js"
  );

  assert.deepEqual(
    moveGuidInCustomOrder(["a", "b", "c", "d"], "d", "b", "before"),
    ["a", "d", "b", "c"],
  );
});

test("moves a GUID immediately after another GUID", async () => {
  const { moveGuidInCustomOrder } = await import(
    "../dist/panel/lib/custom-order-move.js"
  );

  assert.deepEqual(
    moveGuidInCustomOrder(["a", "b", "c", "d"], "a", "c", "after"),
    ["b", "c", "a", "d"],
  );
});

test("supports moving to the first and last insertion positions", async () => {
  const { moveGuidInCustomOrder } = await import(
    "../dist/panel/lib/custom-order-move.js"
  );

  assert.deepEqual(
    moveGuidInCustomOrder(["a", "b", "c"], "c", "a", "before"),
    ["c", "a", "b"],
  );
  assert.deepEqual(
    moveGuidInCustomOrder(["a", "b", "c"], "a", "c", "after"),
    ["b", "c", "a"],
  );
});

test("returns an equal copy for the same or a missing source or target", async () => {
  const { moveGuidInCustomOrder } = await import(
    "../dist/panel/lib/custom-order-move.js"
  );
  const order = ["a", "b", "c"];

  for (const [fromGuid, toGuid] of [
    ["b", "b"],
    ["missing", "b"],
    ["a", "missing"],
  ]) {
    const result = moveGuidInCustomOrder(order, fromGuid, toGuid, "before");
    assert.deepEqual(result, order);
    assert.notEqual(result, order);
  }
});

test("does not mutate the supplied custom order", async () => {
  const { moveGuidInCustomOrder } = await import(
    "../dist/panel/lib/custom-order-move.js"
  );
  const order = ["a", "b", "c", "d"];
  const snapshot = [...order];

  moveGuidInCustomOrder(order, "d", "a", "after");

  assert.deepEqual(order, snapshot);
});
