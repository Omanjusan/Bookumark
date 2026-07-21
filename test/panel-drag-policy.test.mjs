import test from "node:test";
import assert from "node:assert/strict";

import { isPanelDragEnabled } from "../dist/panel/lib/panel-drag-policy.js";

test("enables custom-order D&D only without search or filters", () => {
  assert.equal(isPanelDragEnabled({
    movementMode: "custom-order",
    query: "",
    filterCount: 0,
  }), true);
  assert.equal(isPanelDragEnabled({
    movementMode: "custom-order",
    query: "   ",
    filterCount: 0,
  }), true);
});

test("disables current custom-order D&D in normal and directory modes", () => {
  for (const movementMode of ["normal", "directory-move"]) {
    assert.equal(isPanelDragEnabled({ movementMode, query: "", filterCount: 0 }), false);
  }
});

test("disables D&D while search or any filter is active", () => {
  assert.equal(isPanelDragEnabled({
    movementMode: "custom-order",
    query: "alpha",
    filterCount: 0,
  }), false);
  assert.equal(isPanelDragEnabled({
    movementMode: "custom-order",
    query: "",
    filterCount: 1,
  }), false);
});

test("rejects an invalid filter count", () => {
  for (const filterCount of [-1, 0.5, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => isPanelDragEnabled({
        movementMode: "custom-order",
        query: "",
        filterCount,
      }),
      RangeError,
    );
  }
});
