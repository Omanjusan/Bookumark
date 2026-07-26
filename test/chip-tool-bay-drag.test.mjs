import test from "node:test";
import assert from "node:assert/strict";

import { bindChipToolBayDrag } from "../dist/panel/lib/chip-tool-bay-drag.js";

test("drops a text tool at index zero in an empty bay", () => {
  const fake = harness([]);
  const drops = [];
  bindChipToolBayDrag(fake.tools, fake.editor, (drop) => drops.push(drop), fake.options);

  fake.start("search", "検索");
  fake.over(12);
  fake.drop(12);

  assert.deepEqual(drops, [{ chipType: "search", index: 0 }]);
  assert.equal(fake.prevented, 2);
});

test("uses chip horizontal midpoints as insertion boundaries", () => {
  const fake = harness([{ left: 20, width: 40 }, { left: 80, width: 40 }]);
  const drops = [];
  bindChipToolBayDrag(fake.tools, fake.editor, (drop) => drops.push(drop), fake.options);

  for (const clientX of [10, 61, 121]) {
    fake.start("view", "表示形式");
    fake.drop(clientX);
  }

  assert.deepEqual(drops.map((drop) => drop.index), [0, 1, 2]);
});

test("allows repeated drops of the same tool and ignores external drags", () => {
  const fake = harness([]);
  const drops = [];
  bindChipToolBayDrag(fake.tools, fake.editor, (drop) => drops.push(drop), fake.options);

  fake.drop(0);
  fake.start("refresh", "再読込");
  fake.drop(0);
  fake.start("refresh", "再読込");
  fake.dropOutsideBay();
  fake.end();
  fake.start("refresh", "再読込");
  fake.drop(0);

  assert.deepEqual(drops, [
    { chipType: "refresh", index: 0 },
    { chipType: "refresh", index: 0 },
  ]);
});

test("shows and clears insertion markers while dragging a tool", () => {
  const fake = harness([{ left: 20, width: 40 }, { left: 80, width: 40 }]);
  bindChipToolBayDrag(fake.tools, fake.editor, () => {}, fake.options);

  fake.start("search", "検索");
  fake.over(10);
  assert.equal(fake.chips[0].classList.has("drop-before"), true);

  fake.over(140);
  assert.equal(fake.chips[0].classList.has("drop-before"), false);
  assert.equal(fake.zone.classList.has("drop-at-end"), true);

  fake.end();
  assert.equal(fake.zone.classList.has("drop-at-end"), false);
});

test("creates a text drag preview and clears state on dragend or disconnect", () => {
  const fake = harness([]);
  const connection = bindChipToolBayDrag(fake.tools, fake.editor, () => {}, fake.options);

  fake.start("visit", "訪問状態");
  assert.equal(fake.preview.textContent, "訪問状態");
  assert.equal(fake.dragImage, fake.preview);
  assert.equal(fake.tool.classList.has("dragging"), true);

  fake.end();
  assert.equal(fake.preview.removed, true);
  assert.equal(fake.tool.classList.has("dragging"), false);

  fake.start("visit", "訪問状態");
  connection.disconnect();
  assert.equal(fake.listenerCount(), 0);
  assert.equal(fake.preview.removed, true);
});

function harness(rects) {
  const toolListeners = new Map();
  const editorListeners = new Map();
  const chips = rects.map((rect) => ({
    classList: classList(),
    getBoundingClientRect: () => rect,
  }));
  let currentTool;
  let preview;
  let dragImage;
  let prevented = 0;
  const makeRoot = (listeners) => ({
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  });
  const tools = makeRoot(toolListeners);
  const zone = {
    classList: classList(),
    closest(selector) {
      return selector === ".bay-factory-bay-preview, .bay-factory-empty" ? this : null;
    },
  };
  const outsideTarget = { closest: () => null };
  const editor = {
    ...makeRoot(editorListeners),
    contains(target) { return target === zone || target === outsideTarget; },
    target: zone,
    querySelectorAll(selector) { return selector === ".bay-factory-chip" ? chips : []; },
  };
  const document = {
    body: {
      appendChild(element) { preview = element; return element; },
    },
    createElement() {
      return {
        className: "",
        textContent: "",
        removed: false,
        remove() { this.removed = true; },
      };
    },
  };
  const start = (chipType, label) => {
    currentTool = {
      dataset: { chipType },
      textContent: label,
      classList: classList(),
      closest(selector) { return selector === ".chip-tool-button" ? this : null; },
    };
    const dataTransfer = {
      effectAllowed: "none",
      setData() {},
      setDragImage(element) { dragImage = element; },
    };
    toolListeners.get("dragstart")?.({ target: currentTool, dataTransfer });
  };
  const emitEditor = (type, clientX) => editorListeners.get(type)?.({
    target: editor.target,
    clientX,
    preventDefault() { prevented += 1; },
  });
  const emitOutside = (type) => editorListeners.get(type)?.({
    target: outsideTarget,
    clientX: 0,
    preventDefault() { prevented += 1; },
  });
  return {
    tools,
    editor,
    chips,
    zone,
    options: { document },
    start,
    over: (clientX) => emitEditor("dragover", clientX),
    drop: (clientX) => emitEditor("drop", clientX),
    dropOutsideBay: () => emitOutside("drop"),
    end: () => toolListeners.get("dragend")?.({}),
    listenerCount: () => toolListeners.size + editorListeners.size,
    get preview() { return preview; },
    get dragImage() { return dragImage; },
    get tool() { return currentTool; },
    get prevented() { return prevented; },
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
