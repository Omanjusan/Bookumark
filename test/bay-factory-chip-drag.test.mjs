import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { bindBayFactoryChipDrag } from "../dist/panel/lib/bay-factory-chip-drag.js";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("reorders a placed chip using horizontal midpoint boundaries", () => {
  const fake = harness();
  const changes = [];
  bindBayFactoryChipDrag(fake.editor, (change) => changes.push(change));

  fake.start(0);
  fake.dropInBay(200);
  fake.start(1);
  fake.dropInBay(0);

  assert.deepEqual(changes, [
    { type: "reorder", instanceId: "chip-1", index: 2 },
    { type: "reorder", instanceId: "chip-2", index: 0 },
  ]);
});

test("does not notify when a chip is dropped at its current position", () => {
  const fake = harness();
  const changes = [];
  bindBayFactoryChipDrag(fake.editor, (change) => changes.push(change));

  fake.start(1);
  fake.dropInBay(100);

  assert.deepEqual(changes, []);
});

test("deletes only when dropped inside the editor but outside the bay frame", () => {
  const fake = harness();
  const changes = [];
  bindBayFactoryChipDrag(fake.editor, (change) => changes.push(change));

  fake.start(2);
  fake.dropOutsideBay();
  fake.start(1);
  fake.end();

  assert.deepEqual(changes, [{ type: "delete", instanceId: "chip-3" }]);
});

test("ignores external drags and clears classes and listeners on disconnect", () => {
  const fake = harness();
  const changes = [];
  const connection = bindBayFactoryChipDrag(fake.editor, (change) => changes.push(change));

  fake.dropOutsideBay();
  fake.start(0);
  assert.equal(fake.chips[0].classList.has("dragging"), true);
  connection.disconnect();

  assert.deepEqual(changes, []);
  assert.equal(fake.chips[0].classList.has("dragging"), false);
  assert.equal(fake.listenerCount(), 0);
});

test("switches between insertion and delete markers without leaving residue", () => {
  const fake = harness();
  const connection = bindBayFactoryChipDrag(fake.editor, () => {});

  fake.start(0);
  fake.overInBay(90);
  assert.equal(fake.chips[1].classList.has("drop-before"), true);
  assert.equal(fake.editor.classList.has("delete-drop-target"), false);

  fake.overOutsideBay();
  assert.equal(fake.chips[1].classList.has("drop-before"), false);
  assert.equal(fake.editor.classList.has("delete-drop-target"), true);

  connection.disconnect();
  assert.equal(fake.editor.classList.has("delete-drop-target"), false);
});

test("styles insertion boundaries and the delete candidate region", () => {
  assert.match(css, /\.bay-factory-chip\.drop-before\s*\{[^}]*box-shadow:/s);
  assert.match(css, /\.bay-factory-bay-preview\.drop-at-end\s*\{[^}]*box-shadow:/s);
  assert.match(css, /\.bay-factory-editor\.delete-drop-target\s*\{[^}]*background:/s);
});

function harness() {
  const listeners = new Map();
  const frameTarget = {};
  const outsideTarget = {};
  const rects = [
    { left: 20, width: 40 },
    { left: 80, width: 40 },
    { left: 140, width: 40 },
  ];
  const chips = rects.map((rect, index) => ({
    dataset: { instanceId: `chip-${index + 1}` },
    classList: classList(),
    getBoundingClientRect: () => rect,
    closest(selector) {
      if (selector === ".bay-factory-chip") return this;
      if (selector === ".bay-factory-bay-preview") return frameTarget;
      return null;
    },
  }));
  frameTarget.closest = (selector) => selector === ".bay-factory-bay-preview" ? frameTarget : null;
  frameTarget.classList = classList();
  outsideTarget.closest = () => null;
  const editor = {
    classList: classList(),
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    contains(target) { return target === frameTarget || target === outsideTarget || chips.includes(target); },
    querySelectorAll(selector) { return selector === ".bay-factory-chip" ? chips : []; },
  };
  const emit = (type, target, clientX = 0) => listeners.get(type)?.({
    target,
    clientX,
    dataTransfer: { effectAllowed: "none", dropEffect: "none", setData() {} },
    preventDefault() {},
  });
  return {
    editor,
    chips,
    start: (index) => emit("dragstart", chips[index]),
    overInBay: (clientX) => emit("dragover", frameTarget, clientX),
    overOutsideBay: () => emit("dragover", outsideTarget),
    dropInBay: (clientX) => emit("drop", frameTarget, clientX),
    dropOutsideBay: () => emit("drop", outsideTarget),
    end: () => emit("dragend", outsideTarget),
    listenerCount: () => listeners.size,
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
