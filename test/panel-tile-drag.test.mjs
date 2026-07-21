import test from "node:test";
import assert from "node:assert/strict";

test("uses horizontal halves for wide tiles and vertical halves otherwise", async () => {
  const { placementForTilePointer } = await import(
    "../dist/panel/lib/panel-tile-drag.js"
  );

  const wide = { left: 10, top: 20, width: 200, height: 100 };
  assert.equal(placementForTilePointer(wide, 50, 70), "before");
  assert.equal(placementForTilePointer(wide, 180, 70), "after");

  const square = { left: 10, top: 20, width: 100, height: 100 };
  assert.equal(placementForTilePointer(square, 60, 40), "before");
  assert.equal(placementForTilePointer(square, 60, 100), "after");
});

test("tracks a tile drag, marks placement, and delivers one drop", async () => {
  const { bindPanelTileDrag } = await import(
    "../dist/panel/lib/panel-tile-drag.js"
  );
  const source = tile("source", { left: 0, top: 0, width: 100, height: 100 });
  const target = tile("target", { left: 120, top: 0, width: 200, height: 100 });
  const fake = harness([source, target]);
  const drops = [];
  bindPanelTileDrag(fake.root, (drop) => drops.push(drop));

  const transferred = [];
  fake.emit("dragstart", {
    target: nestedIn(source),
    dataTransfer: {
      effectAllowed: "",
      setData: (type, value) => transferred.push([type, value]),
    },
  });
  assert.equal(source.classes.has("dragging"), true);
  assert.deepEqual(transferred, [["text/plain", "source"]]);

  let prevented = false;
  fake.emit("dragover", {
    target: nestedIn(target),
    clientX: 140,
    clientY: 50,
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, true);
  assert.equal(target.classes.has("drag-over-before"), true);
  assert.equal(target.classes.has("drag-over-after"), false);

  fake.emit("drop", {
    target: nestedIn(target),
    clientX: 140,
    clientY: 50,
    preventDefault() {},
  });
  assert.deepEqual(drops, [{
    fromGuid: "source",
    toGuid: "target",
    placement: "before",
  }]);
  assert.equal(source.classes.size, 0);
  assert.equal(target.classes.size, 0);
});

test("ignores self drops and clears every mark on dragend", async () => {
  const { bindPanelTileDrag } = await import(
    "../dist/panel/lib/panel-tile-drag.js"
  );
  const source = tile("source", { left: 0, top: 0, width: 100, height: 100 });
  const other = tile("other", { left: 120, top: 0, width: 100, height: 100 });
  const fake = harness([source, other]);
  const drops = [];
  const connection = bindPanelTileDrag(fake.root, (drop) => drops.push(drop));

  fake.emit("dragstart", { target: nestedIn(source) });
  fake.emit("drop", {
    target: nestedIn(source), clientX: 20, clientY: 20, preventDefault() {},
  });
  other.classes.add("drag-over-after");
  fake.emit("dragend", { target: nestedIn(source) });

  assert.deepEqual(drops, []);
  assert.equal(source.classes.size, 0);
  assert.equal(other.classes.size, 0);
  connection.disconnect();
  assert.equal(fake.listenerCount(), 0);
});

function tile(guid, rect) {
  const classes = new Set();
  return {
    dataset: { guid },
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

function nestedIn(panelTile) {
  return { closest: (selector) => selector === ".panel-tile" ? panelTile : null };
}

function harness(tiles) {
  const listeners = new Map();
  return {
    root: {
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      removeEventListener(type, listener) {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
      querySelectorAll(selector) {
        assert.equal(selector, ".panel-tile");
        return tiles;
      },
    },
    emit(type, event) {
      listeners.get(type)?.(event);
    },
    listenerCount() {
      return listeners.size;
    },
  };
}
