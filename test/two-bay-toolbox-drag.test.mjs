import test from "node:test";
import assert from "node:assert/strict";

import { bindTwoBayToolboxDrag } from "../dist/panel/lib/two-bay-toolbox-drag.js";

test("delivers a toolbox chip only to a visible two-bay row", () => {
  const toolbox = eventRoot();
  const frame = eventRoot();
  const drops = [];
  bindTwoBayToolboxDrag(toolbox, frame, (drop) => drops.push(drop));
  const tool = target({ tool: "search" });
  const row = target({ bay: "bottom", row: "2" });

  toolbox.emit("dragstart", { target: tool, dataTransfer: transfer() });
  const over = frame.emit("dragover", { target: row, dataTransfer: transfer() });
  frame.emit("drop", { target: row, dataTransfer: transfer() });

  assert.equal(over.defaultPrevented, true);
  assert.deepEqual(drops, [{ chipType: "search", bay: "bottom", row: 2 }]);
});

test("ignores zero-row placeholders and drops outside visible rows", () => {
  const toolbox = eventRoot();
  const frame = eventRoot();
  const drops = [];
  bindTwoBayToolboxDrag(toolbox, frame, (drop) => drops.push(drop));
  toolbox.emit("dragstart", { target: target({ tool: "search" }), dataTransfer: transfer() });
  frame.emit("drop", { target: target({ disabled: true }), dataTransfer: transfer() });
  frame.emit("drop", { target: target({}), dataTransfer: transfer() });
  assert.deepEqual(drops, []);
});

function eventRoot() {
  const listeners = {};
  return {
    addEventListener(type, listener) { (listeners[type] ??= []).push(listener); },
    removeEventListener() {},
    emit(type, values) {
      const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...values };
      for (const listener of listeners[type] ?? []) listener(event);
      return event;
    },
  };
}

function target(data) {
  return {
    closest(selector) {
      if (selector === ".two-bay-tool" && data.tool) return { dataset: { chipType: data.tool } };
      if (selector === ".two-bay-row[data-bay][data-row]" && data.bay) {
        return { dataset: { bay: data.bay, row: data.row } };
      }
      if (selector === "[data-drop-disabled=\"true\"]" && data.disabled) return this;
      return null;
    },
  };
}

function transfer() {
  return { effectAllowed: "", dropEffect: "", setData() {} };
}

