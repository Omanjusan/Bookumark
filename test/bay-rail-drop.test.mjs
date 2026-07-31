import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { bindBayRailDrop } from "../dist/panel/lib/bay-rail-drop.js";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("drops an active bay at any rail end and clears lifecycle state", () => {
  for (const rail of ["top", "left", "right", "bottom"]) {
    const fake = harness();
    const drops = [];
    bindBayRailDrop(fake.roots, fake.drag, (drop) => drops.push(drop));
    const over = fake.emit(rail, "dragover", pointerFor(rail));
    assert.equal(over.prevented, true);
    assert.equal(fake.roots[rail].classList.has("dock-rail--bay-drop-end"), true);
    const drop = fake.emit(rail, "drop");
    assert.equal(drop.prevented, true);
    assert.deepEqual(drops, [{ bayId: "bay-2", rail }]);
    assert.equal(fake.cancelCalls(), 1);
    assert.equal(fake.roots[rail].classList.has("dock-rail--bay-drop-end"), false);
  }
});

test("applies edge pan only on the target rail orientation axis", () => {
  const fake = harness();
  bindBayRailDrop(fake.roots, fake.drag, () => {}, { edgeThreshold: 40, maxPanStep: 20 });
  fake.emit("top", "dragover", { clientX: 200, clientY: 245 });
  fake.emit("left", "dragover", { clientX: 105, clientY: 150 });
  assert.deepEqual(fake.roots.top.scrollCalls, [{ left: 0, top: 18, behavior: "auto" }]);
  assert.deepEqual(fake.roots.left.scrollCalls, [{ left: -18, top: 0, behavior: "auto" }]);
});

test("ignores external drags and clears markers on leave, clear, and disconnect", () => {
  const fake = harness();
  fake.setState(null);
  const connection = bindBayRailDrop(fake.roots, fake.drag, () => {});
  assert.equal(fake.emit("top", "dragover").prevented, false);
  fake.setState({ bayId: "bay-2", sourceRail: "top" });
  fake.emit("top", "dragover");
  fake.emit("top", "dragleave", { relatedTarget: null });
  assert.equal(fake.roots.top.classList.has("dock-rail--bay-drop-end"), false);
  fake.emit("right", "dragover");
  connection.clear();
  assert.equal(fake.roots.right.classList.has("dock-rail--bay-drop-end"), false);
  connection.disconnect();
  assert.equal(fake.listenerCount(), 0);
});

test("styles a visible coarse rail-end drop target", () => {
  assert.match(css, /\.dock-rail--bay-drop-end\s*\{[^}]*outline:\s*2px dashed/s);
});

function harness() {
  let state = { bayId: "bay-2", sourceRail: "left" };
  let cancels = 0;
  const roots = Object.fromEntries(["top", "left", "right", "bottom"].map((rail) => [rail, root()]));
  return {
    roots,
    drag: { state: () => state, cancel: () => { state = null; cancels += 1; } },
    setState: (value) => { state = value; },
    cancelCalls: () => cancels,
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

function root() {
  const listeners = new Map();
  return {
    listeners,
    classList: classList(),
    scrollCalls: [],
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    contains: () => false,
    getBoundingClientRect: () => ({ left: 100, right: 300, top: 50, bottom: 250 }),
    scrollBy(options) { this.scrollCalls.push(options); },
  };
}

function pointerFor(rail) {
  return rail === "top" || rail === "bottom"
    ? { clientX: 200, clientY: 100 }
    : { clientX: 150, clientY: 150 };
}

function classList() {
  const values = new Set();
  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    has: (value) => values.has(value),
  };
}
