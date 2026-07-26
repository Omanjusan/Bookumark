import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { bindBayPickerDrag } from "../dist/panel/lib/bay-picker-drag.js";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("starts from an unplaced tag without fading any rail preview", () => {
  const fake = harness();
  const connection = bindBayPickerDrag(fake.picker, fake.roots, { keyboardTarget: fake.keyboard });
  fake.start(fake.unplaced);

  assert.deepEqual(connection.state(), { bayId: "bay-3" });
  assert.equal(fake.unplaced.classList.has("dragging"), true);
  assert.equal(fake.placedPreview.classList.has("dock-bay--drag-source"), false);
  assert.deepEqual(fake.transfer.data, [["text/plain", "bay-3"]]);
  assert.equal(fake.transfer.effectAllowed, "move");
});

test("keeps a placed source preview in DOM at the faded state until drag end", () => {
  const fake = harness();
  const connection = bindBayPickerDrag(fake.picker, fake.roots, { keyboardTarget: fake.keyboard });
  fake.start(fake.placed);

  assert.deepEqual(connection.state(), { bayId: "bay-2", sourceRail: "left" });
  assert.equal(fake.roots[0].previews.includes(fake.placedPreview), true);
  assert.equal(fake.placedPreview.classList.has("dock-bay--drag-source"), true);
  fake.end();
  assert.equal(connection.state(), null);
  assert.equal(fake.placed.classList.has("dragging"), false);
  assert.equal(fake.placedPreview.classList.has("dock-bay--drag-source"), false);
});

test("restores drag presentation on Escape, explicit cancel, and disconnect", () => {
  const fake = harness();
  const connection = bindBayPickerDrag(fake.picker, fake.roots, { keyboardTarget: fake.keyboard });
  fake.start(fake.placed);
  fake.escape();
  assert.equal(connection.state(), null);
  fake.start(fake.placed);
  connection.cancel();
  assert.equal(connection.state(), null);
  fake.start(fake.placed);
  connection.disconnect();
  assert.equal(connection.state(), null);
  assert.equal(fake.placedPreview.classList.has("dock-bay--drag-source"), false);
  assert.equal(fake.listenerCount(), 0);
});

test("does not start when the edit session is inactive", () => {
  const fake = harness();
  const connection = bindBayPickerDrag(fake.picker, fake.roots, {
    keyboardTarget: fake.keyboard,
    isEnabled: () => false,
  });
  fake.start(fake.placed);
  assert.equal(connection.state(), null);
});

test("styles the placed source preview at 35 percent opacity", () => {
  assert.match(css, /\.dock-bay--preview\.dock-bay--drag-source\s*\{[^}]*opacity:\s*0\.35/s);
});

function harness() {
  const pickerListeners = new Map();
  const keyboardListeners = new Map();
  const placedPreview = element({ dataset: { bayId: "bay-2" } });
  const roots = [{
    previews: [placedPreview],
    querySelectorAll() { return this.previews; },
  }, { querySelectorAll: () => [] }];
  const unplaced = tag("bay-3");
  const placed = tag("bay-2", "left");
  const transfer = {
    effectAllowed: "none", data: [],
    setData(type, value) { this.data.push([type, value]); },
  };
  const picker = eventTarget(pickerListeners);
  const keyboard = eventTarget(keyboardListeners);
  return {
    picker, keyboard, roots, unplaced, placed, placedPreview, transfer,
    start: (target) => pickerListeners.get("dragstart")?.({ target, dataTransfer: transfer }),
    end: () => pickerListeners.get("dragend")?.({}),
    escape: () => keyboardListeners.get("keydown")?.({ key: "Escape" }),
    listenerCount: () => pickerListeners.size + keyboardListeners.size,
  };
}

function tag(bayId, rail) {
  const value = element({ dataset: { bayId, ...(rail === undefined ? {} : { rail }) } });
  value.closest = (selector) => selector === ".bay-picker-tag" ? value : null;
  return value;
}

function element(values = {}) {
  return { dataset: {}, classList: classList(), ...values };
}

function eventTarget(listeners) {
  return {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
}

function classList() {
  const values = new Set();
  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    has: (value) => values.has(value),
  };
}
