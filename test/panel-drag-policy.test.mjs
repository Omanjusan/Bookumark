import test from "node:test";
import assert from "node:assert/strict";

test("enables D&D only in unfiltered free-movement mode", async () => {
  const { isPanelDragEnabled } = await import(
    "../dist/panel/lib/panel-drag-policy.js"
  );

  assert.equal(isPanelDragEnabled({
    freeMovement: true,
    query: "",
    filterCount: 0,
  }), true);
  assert.equal(isPanelDragEnabled({
    freeMovement: true,
    query: "   ",
    filterCount: 0,
  }), true);
});

test("disables D&D outside free movement", async () => {
  const { isPanelDragEnabled } = await import(
    "../dist/panel/lib/panel-drag-policy.js"
  );

  assert.equal(isPanelDragEnabled({
    freeMovement: false,
    query: "",
    filterCount: 0,
  }), false);
});

test("disables D&D while search or any filter is active", async () => {
  const { isPanelDragEnabled } = await import(
    "../dist/panel/lib/panel-drag-policy.js"
  );

  assert.equal(isPanelDragEnabled({
    freeMovement: true,
    query: "alpha",
    filterCount: 0,
  }), false);
  assert.equal(isPanelDragEnabled({
    freeMovement: true,
    query: "",
    filterCount: 1,
  }), false);
});

test("rejects an invalid filter count", async () => {
  const { isPanelDragEnabled } = await import(
    "../dist/panel/lib/panel-drag-policy.js"
  );

  for (const filterCount of [-1, 0.5, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => isPanelDragEnabled({ freeMovement: true, query: "", filterCount }),
      RangeError,
    );
  }
});
