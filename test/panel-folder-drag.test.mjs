import test from "node:test";
import assert from "node:assert/strict";

import { bindPanelFolderDrag } from "../dist/panel/lib/panel-folder-drag.js";

test("delivers a horizontal before or after drop between folder buttons", () => {
  const source = folder("source", { left: 0, top: 0, width: 144, height: 36 });
  const target = folder("target", { left: 150, top: 0, width: 144, height: 36 });
  const fake = harness([source, target]);
  const drops = [];
  let dragStarts = 0;
  bindPanelFolderDrag(fake.root, (drop) => drops.push(drop), {
    isEnabled: () => true,
    onDragStart: () => { dragStarts += 1; },
  });

  fake.emit("dragstart", { target: nestedIn(source), dataTransfer: dataTransfer() });
  let prevented = false;
  fake.emit("dragover", {
    target: nestedIn(target),
    clientX: 160,
    preventDefault: () => { prevented = true; },
  });
  fake.emit("drop", {
    target: nestedIn(target),
    clientX: 160,
    preventDefault() {},
  });

  assert.equal(dragStarts, 1);
  assert.equal(prevented, true);
  assert.deepEqual(drops, [{
    fromGuid: "source",
    toGuid: "target",
    placement: "before",
  }]);
  assert.equal(source.classes.size, 0);
  assert.equal(target.classes.size, 0);
});

test("ignores folder drag events outside custom-order mode", () => {
  const source = folder("source", { left: 0, top: 0, width: 144, height: 36 });
  const target = folder("target", { left: 150, top: 0, width: 144, height: 36 });
  const fake = harness([source, target]);
  const drops = [];
  bindPanelFolderDrag(fake.root, (drop) => drops.push(drop), {
    isEnabled: () => false,
  });

  fake.emit("dragstart", { target: nestedIn(source) });
  fake.emit("drop", {
    target: nestedIn(target),
    clientX: 200,
    preventDefault() {},
  });

  assert.deepEqual(drops, []);
  assert.equal(source.classes.size, 0);
  assert.equal(target.classes.size, 0);
});

test("ignores self drops and removes listeners on disconnect", () => {
  const source = folder("source", { left: 0, top: 0, width: 144, height: 36 });
  const fake = harness([source]);
  const drops = [];
  const connection = bindPanelFolderDrag(fake.root, (drop) => drops.push(drop));

  fake.emit("dragstart", { target: nestedIn(source) });
  fake.emit("drop", {
    target: nestedIn(source),
    clientX: 100,
    preventDefault() {},
  });
  connection.disconnect();

  assert.deepEqual(drops, []);
  assert.equal(fake.listenerCount(), 0);
});

function dataTransfer() {
  return { effectAllowed: "", setData() {} };
}

function folder(guid, rect) {
  const classes = new Set();
  return {
    dataset: { folderGuid: guid },
    classes,
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
    },
    getBoundingClientRect: () => rect,
  };
}

function nestedIn(button) {
  return { closest: (selector) => selector === ".folder-button" ? button : null };
}

function harness(folders) {
  const listeners = new Map();
  return {
    root: {
      addEventListener: (type, listener) => listeners.set(type, listener),
      removeEventListener(type, listener) {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
      querySelectorAll(selector) {
        assert.equal(selector, ".folder-button");
        return folders;
      },
    },
    emit: (type, event) => listeners.get(type)?.(event),
    listenerCount: () => listeners.size,
  };
}
