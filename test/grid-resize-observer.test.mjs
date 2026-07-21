import test from "node:test";
import assert from "node:assert/strict";

import { observeGridCells } from "../dist/panel/lib/grid-resize-observer.js";

function harness() {
  const scheduled = new Map();
  let nextTimerId = 1;
  let observerCallback;
  const observed = [];
  let disconnected = false;
  const options = {
    createObserver(callback) {
      observerCallback = callback;
      return {
        observe(target) {
          observed.push(target);
        },
        disconnect() {
          disconnected = true;
        },
      };
    },
    timers: {
      schedule(callback, delay) {
        const id = nextTimerId;
        nextTimerId += 1;
        scheduled.set(id, { callback, delay });
        return id;
      },
      clear(id) {
        scheduled.delete(id);
      },
    },
  };
  return {
    options,
    observed,
    scheduled,
    emit(entries) {
      observerCallback(entries);
    },
    isDisconnected() {
      return disconnected;
    },
  };
}

test("observes the target and converts its content box to cells", () => {
  const fake = harness();
  const target = { id: "grid" };
  const delivered = [];
  observeGridCells(target, (cells) => delivered.push(cells), fake.options);

  assert.deepEqual(fake.observed, [target]);
  fake.emit([{ target, contentRect: { width: 100, height: 52 } }]);
  assert.equal(fake.scheduled.get(1).delay, 120);
  fake.scheduled.get(1).callback();
  assert.deepEqual(delivered, [{ columns: 3, rows: 2 }]);
});

test("uses only the last matching entry from a resize notification", () => {
  const fake = harness();
  const target = { id: "grid" };
  const other = { id: "other" };
  const delivered = [];
  observeGridCells(target, (cells) => delivered.push(cells), fake.options);

  fake.emit([
    { target, contentRect: { width: 52, height: 52 } },
    { target: other, contentRect: { width: 500, height: 500 } },
    { target, contentRect: { width: 80, height: 80 } },
  ]);
  fake.scheduled.get(1).callback();

  assert.deepEqual(delivered, [{ columns: 3, rows: 3 }]);
});

test("holds allocation while the content box is not measurable", () => {
  const fake = harness();
  const target = { id: "grid" };
  const delivered = [];
  observeGridCells(target, (cells) => delivered.push(cells), fake.options);

  fake.emit([{ target, contentRect: { width: 0, height: 100 } }]);

  assert.equal(fake.scheduled.size, 0);
  assert.deepEqual(delivered, []);
});

test("debounces rapid observer notifications to the last valid dimensions", () => {
  const fake = harness();
  const target = { id: "grid" };
  const delivered = [];
  observeGridCells(target, (cells) => delivered.push(cells), fake.options);

  fake.emit([{ target, contentRect: { width: 52, height: 52 } }]);
  fake.emit([{ target, contentRect: { width: 108, height: 108 } }]);

  assert.equal(fake.scheduled.size, 1);
  fake.scheduled.get(2).callback();
  assert.deepEqual(delivered, [{ columns: 4, rows: 4 }]);
});

test("disconnects the observer and discards a pending notification", () => {
  const fake = harness();
  const target = { id: "grid" };
  const delivered = [];
  const connection = observeGridCells(target, (cells) => delivered.push(cells), fake.options);

  fake.emit([{ target, contentRect: { width: 52, height: 52 } }]);
  const pending = fake.scheduled.get(1).callback;
  connection.disconnect();
  pending();

  assert.equal(fake.isDisconnected(), true);
  assert.deepEqual(delivered, []);
});
