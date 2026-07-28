import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { bindLayoutBayTrash } from "../dist/panel/lib/layout-bay-trash.js";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("places a hidden central bay trash target outside the inert center content", () => {
  const grid = html.match(/<div[^>]+id="docking-grid"[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? "";
  const centerEnd = grid.indexOf("</main>\n    </div>");
  const trashIndex = grid.indexOf('id="layout-bay-trash"');
  assert.ok(centerEnd >= 0 && trashIndex > centerEnd);
  assert.match(grid, /id="layout-bay-trash"[^>]+aria-label="ベイを未配置にする"[^>]+hidden/);
  assert.match(css, /\.layout-bay-trash\[hidden\]\s*\{[^}]*display:\s*none/);
  assert.match(css, /\.layout-bay-trash\s*\{[^}]*position:\s*absolute[^}]*top:\s*50%[^}]*left:\s*50%/s);
});

test("shows only during an internal bay drag and highlights a valid drop", () => {
  const fake = harness();
  const connection = bindLayoutBayTrash(fake.trash, fake.picker, fake.drag, {
    keyboardTarget: fake.keyboard,
    onUnplace: (bayId) => fake.unplaced.push(bayId),
  });

  fake.start();
  assert.equal(fake.trash.hidden, false);
  const over = fake.emitTrash("dragover");
  assert.equal(over.prevented, true);
  assert.equal(fake.trash.classList.has("layout-bay-trash--active"), true);
  assert.equal(over.dropEffect(), "move");

  connection.clear();
  assert.equal(fake.trash.hidden, true);
  assert.equal(fake.trash.classList.has("layout-bay-trash--active"), false);
});

test("unplaces on drop and hides after drop, dragend, and Escape", () => {
  const fake = harness();
  bindLayoutBayTrash(fake.trash, fake.picker, fake.drag, {
    keyboardTarget: fake.keyboard,
    onUnplace: (bayId) => fake.unplaced.push(bayId),
  });

  fake.start();
  const drop = fake.emitTrash("drop");
  assert.equal(drop.prevented, true);
  assert.deepEqual(fake.unplaced, ["bay-1"]);
  assert.equal(fake.cancelCalls(), 1);
  assert.equal(fake.trash.hidden, true);

  fake.setState({ bayId: "bay-2", sourceRail: "left" });
  fake.start();
  fake.end();
  assert.equal(fake.trash.hidden, true);
  fake.start();
  fake.escape();
  assert.equal(fake.trash.hidden, true);
});

test("ignores external drags and removes all listeners on disconnect", () => {
  const fake = harness();
  fake.setState(null);
  const connection = bindLayoutBayTrash(fake.trash, fake.picker, fake.drag, {
    keyboardTarget: fake.keyboard,
    onUnplace: () => assert.fail("external drag must not unplace"),
  });

  fake.start();
  assert.equal(fake.trash.hidden, true);
  assert.equal(fake.emitTrash("dragover").prevented, false);
  connection.disconnect();
  assert.equal(fake.listenerCount(), 0);
});

test("styles a distinct active central trash target", () => {
  assert.match(css, /\.layout-bay-trash--active\s*\{[^}]*border-color:\s*var\(--danger\)/s);
});

function harness() {
  let state = { bayId: "bay-1", sourceRail: "top" };
  let cancels = 0;
  const picker = eventTarget();
  const keyboard = eventTarget();
  const trash = { ...eventTarget(), hidden: true, classList: classList() };
  const unplaced = [];
  return {
    picker, keyboard, trash, unplaced,
    drag: { state: () => state, cancel: () => { state = null; cancels += 1; } },
    setState: (value) => { state = value; },
    cancelCalls: () => cancels,
    start: () => picker.listeners.get("dragstart")?.({}),
    end: () => picker.listeners.get("dragend")?.({}),
    escape: () => keyboard.listeners.get("keydown")?.({ key: "Escape" }),
    emitTrash(type) {
      let prevented = false;
      const transfer = { dropEffect: "none" };
      trash.listeners.get(type)?.({
        relatedTarget: null,
        dataTransfer: transfer,
        preventDefault: () => { prevented = true; },
      });
      return { prevented, dropEffect: () => transfer.dropEffect };
    },
    listenerCount: () => picker.listeners.size + keyboard.listeners.size + trash.listeners.size,
  };
}

function eventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    contains: () => false,
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
