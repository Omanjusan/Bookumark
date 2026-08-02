import test from "node:test";
import assert from "node:assert/strict";

import { resolveViewDragMode } from "../dist/panel/lib/view-drag-policy.js";

test("enables the matching drag operation only in custom or official mode", () => {
  assert.equal(resolveViewDragMode({
    viewType: "panel", movementMode: "custom-order", query: "", filterCount: 0, officialMovePending: false,
  }), "custom");
  assert.equal(resolveViewDragMode({
    viewType: "card", movementMode: "directory-move", query: "", filterCount: 0, officialMovePending: false,
  }), "official");
  assert.equal(resolveViewDragMode({
    viewType: "icon", movementMode: "normal", query: "", filterCount: 0, officialMovePending: false,
  }), null);
});

test("disables custom and official D&D in list view", () => {
  for (const movementMode of ["custom-order", "directory-move"]) {
    assert.equal(resolveViewDragMode({
      viewType: "list", movementMode, query: "", filterCount: 0, officialMovePending: false,
    }), null);
  }
});

test("disables every view drag during search, filtering, or an official move", () => {
  assert.equal(resolveViewDragMode({
    viewType: "panel", movementMode: "custom-order", query: "query", filterCount: 0, officialMovePending: false,
  }), null);
  assert.equal(resolveViewDragMode({
    viewType: "panel", movementMode: "directory-move", query: "", filterCount: 1, officialMovePending: false,
  }), null);
  assert.equal(resolveViewDragMode({
    viewType: "panel", movementMode: "directory-move", query: "", filterCount: 0, officialMovePending: true,
  }), null);
});

test("rejects invalid filter counts", () => {
  assert.throws(() => resolveViewDragMode({
    viewType: "panel", movementMode: "normal", query: "", filterCount: -1, officialMovePending: false,
  }), /filterCount must be a non-negative integer/);
});
