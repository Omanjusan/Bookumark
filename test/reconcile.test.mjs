import test from "node:test";
import assert from "node:assert/strict";

import { reconcile } from "../dist/panel/lib/overlay.js";

const cases = [
  {
    name: "keeps an order that already matches the current bookmarks",
    saved: ["a", "b"],
    current: ["a", "b"],
    expected: { order: ["a", "b"], changed: false },
  },
  {
    name: "appends a new bookmark to the saved order",
    saved: ["a"],
    current: ["a", "b"],
    expected: { order: ["a", "b"], changed: true },
  },
  {
    name: "removes an orphaned bookmark from the saved order",
    saved: ["a", "b"],
    current: ["a"],
    expected: { order: ["a"], changed: true },
  },
  {
    name: "uses the current order when no saved order exists",
    saved: [],
    current: ["a", "b"],
    expected: { order: ["a", "b"], changed: true },
  },
  {
    name: "returns an empty order when no bookmarks currently exist",
    saved: ["a", "b"],
    current: [],
    expected: { order: [], changed: true },
  },
  {
    name: "leaves two empty orders unchanged",
    saved: [],
    current: [],
    expected: { order: [], changed: false },
  },
  {
    name: "repairs duplicate GUIDs while preserving their first position",
    saved: ["a", "a", "b"],
    current: ["a", "b"],
    expected: { order: ["a", "b"], changed: true },
  },
];

for (const { name, saved, current, expected } of cases) {
  test(name, () => {
    assert.deepEqual(reconcile(saved, current), expected);
  });
}
