import test from "node:test";
import assert from "node:assert/strict";

import { bindTwoBayChipDrag } from "../dist/panel/lib/two-bay-chip-drag.js";

test("delivers insertion index for a visible row drop", () => {
  const frame = eventRoot();
  const drops = [];
  bindTwoBayChipDrag(frame, (drop) => drops.push(drop));
  const source = chipTarget("chip-1");
  const row = rowTarget("bottom", "1", [positionedChip("chip-5", 0, 40)]);
  frame.emit("dragstart", { target: source, dataTransfer: transfer() });
  const over = frame.emit("dragover", { target: row, clientX: 50, dataTransfer: transfer() });
  frame.emit("drop", { target: row, clientX: 50, dataTransfer: transfer() });
  assert.equal(over.defaultPrevented, true);
  assert.deepEqual(drops, [{ type: "move", instanceId: "chip-1", bay: "bottom", row: 1, index: 1 }]);
});

test("removes a chip only through the explicit removal region", () => {
  const frame = eventRoot();
  const drops = [];
  bindTwoBayChipDrag(frame, (drop) => drops.push(drop));
  frame.emit("dragstart", { target: chipTarget("chip-2"), dataTransfer: transfer() });
  const removal = removalTarget();
  frame.emit("drop", { target: removal, dataTransfer: transfer() });
  assert.deepEqual(drops, [{ type: "remove", instanceId: "chip-2" }]);
});

test("ignores placeholders, gaps, outside drops, and drag cancellation", () => {
  const frame = eventRoot();
  const drops = [];
  bindTwoBayChipDrag(frame, (drop) => drops.push(drop));
  frame.emit("dragstart", { target: chipTarget("chip-3"), dataTransfer: transfer() });
  frame.emit("drop", { target: plainTarget(), dataTransfer: transfer() });
  frame.emit("dragend", { target: plainTarget() });
  frame.emit("drop", { target: rowTarget("top", "1", []), dataTransfer: transfer() });
  assert.deepEqual(drops, []);
});

function eventRoot() {
  const listeners = {};
  return {
    addEventListener(type, listener) { (listeners[type] ??= []).push(listener); },
    removeEventListener() {},
    emit(type, values) {
      const event = { defaultPrevented: false, clientX: 0, preventDefault() { this.defaultPrevented = true; }, ...values };
      for (const listener of listeners[type] ?? []) listener(event);
      return event;
    },
  };
}

function chipTarget(instanceId) {
  const chip = { dataset: { instanceId } };
  return { closest(selector) { return selector === ".dock-chip[data-instance-id]" ? chip : null; } };
}

function rowTarget(bay, row, chips) {
  const target = {
    dataset: { bay, row },
    querySelectorAll() { return chips; },
  };
  target.closest = (selector) => selector === ".two-bay-row[data-bay][data-row]" ? target : null;
  return target;
}

function removalTarget() {
  const target = {};
  target.closest = (selector) => selector === "#two-bay-chip-removal" ? target : null;
  return target;
}

function plainTarget() { return { closest() { return null; } }; }
function positionedChip(instanceId, left, width) {
  return { dataset: { instanceId }, getBoundingClientRect: () => ({ left, width }) };
}
function transfer() { return { effectAllowed: "", dropEffect: "", setData() {} }; }

