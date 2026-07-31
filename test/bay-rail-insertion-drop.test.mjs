import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  bindBayRailInsertionDrop,
  calculateBayRailInsertionIndex,
} from "../dist/panel/lib/bay-rail-insertion-drop.js";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("uses horizontal left-right centers after excluding the dragged bay", () => {
  const candidates = [
    { bayId: "bay-1", start: 0, end: 40 },
    { bayId: "bay-2", start: 42, end: 82 },
    { bayId: "bay-3", start: 84, end: 124 },
  ];

  assert.equal(calculateBayRailInsertionIndex(candidates, "bay-2", 19), 0);
  assert.equal(calculateBayRailInsertionIndex(candidates, "bay-2", 20), 1);
  assert.equal(calculateBayRailInsertionIndex(candidates, "bay-2", 103), 1);
  assert.equal(calculateBayRailInsertionIndex(candidates, "bay-2", 104), 2);
});

test("uses the same center boundary contract for vertical top-bottom coordinates", () => {
  const candidates = [
    { bayId: "bay-1", start: 10, end: 50 },
    { bayId: "bay-2", start: 60, end: 100 },
  ];

  assert.equal(calculateBayRailInsertionIndex(candidates, "bay-404", 29), 0);
  assert.equal(calculateBayRailInsertionIndex(candidates, "bay-404", 30), 1);
  assert.equal(calculateBayRailInsertionIndex(candidates, "bay-404", 80), 2);
});

test("returns zero for an empty target and rejects malformed geometry", () => {
  assert.equal(calculateBayRailInsertionIndex([], "bay-1", 0), 0);
  assert.throws(
    () => calculateBayRailInsertionIndex([{ bayId: "bay-1", start: 5, end: 4 }], "bay-2", 0),
    /candidate geometry is invalid/,
  );
  assert.throws(
    () => calculateBayRailInsertionIndex([], "bay-1", Number.NaN),
    /pointer coordinate must be finite/,
  );
});

test("uses vertical stacking for top and horizontal stacking for left", () => {
  const fake = harness();
  const drops = [];
  bindBayRailInsertionDrop(fake.roots, fake.drag, (drop) => drops.push(drop));

  fake.emit("top", "dragover", { clientY: 75 });
  assert.equal(fake.bays.top[2].classList.has("dock-bay--drop-before-vertical"), true);
  fake.emit("top", "drop", { clientY: 75 });

  fake.setState({ bayId: "bay-2", sourceRail: "top" });
  fake.emit("left", "dragover", { clientX: 200 });
  assert.equal(fake.bays.left[1].classList.has("dock-bay--drop-after-horizontal"), true);
  fake.emit("left", "drop", { clientX: 200 });

  assert.deepEqual(drops, [
    { bayId: "bay-2", rail: "top", index: 1 },
    { bayId: "bay-2", rail: "left", index: 2 },
  ]);
  assert.equal(fake.cancelCalls(), 2);
});

test("maps bottom and right reverse visuals back to outside-to-inside storage order", () => {
  const fake = harness();
  const drops = [];
  bindBayRailInsertionDrop(fake.roots, fake.drag, (drop) => drops.push(drop));

  fake.setState({ bayId: "moving", sourceRail: "left" });
  fake.emit("bottom", "dragover", { clientY: 235 });
  assert.equal(fake.bays.bottom[0].classList.has("dock-bay--drop-after-vertical"), true);
  fake.emit("bottom", "drop", { clientY: 235 });

  fake.setState({ bayId: "moving", sourceRail: "top" });
  fake.emit("right", "dragover", { clientX: 235 });
  assert.equal(fake.bays.right[0].classList.has("dock-bay--drop-after-horizontal"), true);
  fake.emit("right", "drop", { clientX: 235 });

  assert.deepEqual(drops, [
    { bayId: "moving", rail: "bottom", index: 0 },
    { bayId: "moving", rail: "right", index: 0 },
  ]);
});

test("marks an empty rail and clears all markers on leave, clear, and disconnect", () => {
  const fake = harness({ right: [] });
  const connection = bindBayRailInsertionDrop(fake.roots, fake.drag, () => {});

  fake.emit("right", "dragover");
  assert.equal(fake.roots.right.classList.has("dock-rail--bay-drop-empty"), true);
  fake.emit("right", "dragleave", { relatedTarget: null });
  assert.equal(fake.roots.right.classList.has("dock-rail--bay-drop-empty"), false);
  fake.emit("top", "dragover", { clientY: 10 });
  connection.clear();
  assert.equal(fake.bays.top[0].classList.has("dock-bay--drop-before-vertical"), false);
  fake.emit("top", "dragover", { clientY: 10 });
  connection.disconnect();
  assert.equal(fake.bays.top[0].classList.has("dock-bay--drop-before-vertical"), false);
  assert.equal(fake.listenerCount(), 0);
});

test("ignores external drags and styles orientation-specific insertion markers", () => {
  const fake = harness();
  fake.setState(null);
  bindBayRailInsertionDrop(fake.roots, fake.drag, () => {});
  assert.equal(fake.emit("top", "dragover").prevented, false);
  assert.match(css, /\.dock-bay--drop-before-horizontal::before[^{]*\{[^}]*left:\s*-3px/s);
  assert.match(css, /\.dock-bay--drop-after-vertical::after[^{]*\{[^}]*bottom:\s*-3px/s);
  assert.match(css, /\.dock-rail--bay-drop-empty\s*\{[^}]*outline:\s*2px dashed/s);
});

test("continues edge pan while stationary and stops on leave, clear, and drop", () => {
  const fake = harness();
  const connection = bindBayRailInsertionDrop(fake.roots, fake.drag, () => {}, {
    edgeThreshold: 40,
    maxPanStep: 20,
    requestFrame: fake.requestFrame,
    cancelFrame: fake.cancelFrame,
  });

  fake.emit("top", "dragover", { clientY: 295 });
  const afterDragOver = fake.scrollPosition("top");
  assert.ok(afterDragOver > 0);
  assert.equal(fake.pendingFrames(), 1);
  fake.runFrame();
  assert.ok(fake.scrollPosition("top") > afterDragOver);
  assert.equal(fake.pendingFrames(), 1);

  fake.emit("top", "dragleave", { relatedTarget: null });
  assert.equal(fake.pendingFrames(), 0);
  fake.emit("top", "dragover", { clientY: 295 });
  connection.clear();
  assert.equal(fake.pendingFrames(), 0);
  fake.emit("top", "dragover", { clientY: 295 });
  fake.emit("top", "drop", { clientY: 295 });
  assert.equal(fake.pendingFrames(), 0);
});

test("continues edge pan when Firefox applies scrollBy after the current frame", () => {
  const fake = harness({}, deferredRoot);
  bindBayRailInsertionDrop(fake.roots, fake.drag, () => {}, {
    edgeThreshold: 40,
    maxPanStep: 20,
    requestFrame: fake.requestFrame,
    cancelFrame: fake.cancelFrame,
  });

  fake.emit("top", "dragover", { clientY: 295 });
  assert.equal(fake.pendingFrames(), 1);
  const beforeFrame = fake.scrollPosition("top");
  fake.runFrame();
  assert.ok(fake.scrollPosition("top") > beforeFrame);
  assert.equal(fake.pendingFrames(), 1);
});

function harness(overrides = {}, createRoot = root) {
  let state = { bayId: "bay-2", sourceRail: "top" };
  let cancels = 0;
  let nextFrameId = 1;
  const frames = new Map();
  const bays = {
    top: [bay("bay-1", 0, 40, 0, 40), bay("bay-2", 0, 40, 42, 82), bay("bay-3", 0, 40, 84, 124)],
    left: [bay("bay-4", 10, 50, 0, 30), bay("bay-5", 60, 100, 0, 30)],
    right: [bay("bay-6", 210, 250, 0, 30)],
    bottom: [bay("bay-7", 0, 40, 210, 250)],
    ...overrides,
  };
  const roots = Object.fromEntries(Object.entries(bays).map(([rail, children]) => [rail, createRoot(children)]));
  return {
    bays,
    roots,
    drag: { state: () => state, cancel: () => { state = null; cancels += 1; } },
    setState: (value) => { state = value; },
    cancelCalls: () => cancels,
    requestFrame(callback) {
      const id = nextFrameId;
      nextFrameId += 1;
      frames.set(id, callback);
      return id;
    },
    cancelFrame(id) { frames.delete(id); },
    pendingFrames: () => frames.size,
    runFrame() {
      const entry = frames.entries().next().value;
      if (entry === undefined) return;
      const [id, callback] = entry;
      frames.delete(id);
      for (const value of Object.values(roots)) value.flushScroll?.();
      callback(0);
    },
    scrollPosition: (rail) => roots[rail].position(),
    emit(rail, type, details = {}) {
      let prevented = false;
      roots[rail].listeners.get(type)?.({
        clientX: 150, clientY: 100, relatedTarget: null,
        dataTransfer: { dropEffect: "none" },
        preventDefault: () => { prevented = true; },
        ...details,
      });
      return { prevented };
    },
    listenerCount: () => Object.values(roots).reduce((total, value) => total + value.listeners.size, 0),
  };
}

function deferredRoot(children) {
  const value = root(children);
  const scrollBy = value.scrollBy.bind(value);
  const pending = [];
  value.scrollBy = (options) => { pending.push(options); };
  value.flushScroll = () => {
    for (const options of pending.splice(0)) scrollBy(options);
  };
  return value;
}

function root(children) {
  const listeners = new Map();
  let scrollLeft = 100;
  let scrollTop = 100;
  return {
    listeners,
    classList: classList(),
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    contains: () => false,
    querySelectorAll: () => children,
    getBoundingClientRect: () => ({ left: 0, right: 300, top: 0, bottom: 300 }),
    get scrollLeft() { return scrollLeft; },
    get scrollTop() { return scrollTop; },
    scrollBy({ left, top }) {
      scrollLeft = Math.min(200, Math.max(0, scrollLeft + left));
      scrollTop = Math.min(200, Math.max(0, scrollTop + top));
    },
    position: () => scrollTop,
  };
}

function bay(bayId, left, right, top, bottom) {
  return {
    dataset: { bayId },
    classList: classList(),
    getBoundingClientRect: () => ({ left, right, top, bottom }),
  };
}

function classList() {
  const values = new Set();
  return {
    add: (...items) => items.forEach((value) => values.add(value)),
    remove: (...items) => items.forEach((value) => values.delete(value)),
    has: (value) => values.has(value),
  };
}
