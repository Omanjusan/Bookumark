import test from "node:test";
import assert from "node:assert/strict";

import {
  RESIZE_DEBOUNCE_MS,
  createResizeDebouncer,
} from "../dist/panel/lib/resize-debounce.js";

function fakeTimers() {
  let nextId = 1;
  const scheduled = new Map();
  const cleared = [];
  return {
    scheduled,
    cleared,
    schedule(callback, delay) {
      const id = nextId;
      nextId += 1;
      scheduled.set(id, { callback, delay });
      return id;
    },
    clear(id) {
      cleared.push(id);
      scheduled.delete(id);
    },
  };
}

test("defines resize debounce as 120 milliseconds", () => {
  assert.equal(RESIZE_DEBOUNCE_MS, 120);
});

test("delivers only the last value after the debounce delay", () => {
  const timers = fakeTimers();
  const delivered = [];
  const debouncer = createResizeDebouncer((value) => delivered.push(value), timers);

  debouncer.push({ width: 100, height: 50 });
  debouncer.push({ width: 200, height: 80 });
  debouncer.push({ width: 300, height: 100 });

  assert.deepEqual(timers.cleared, [1, 2]);
  assert.equal(timers.scheduled.size, 1);
  assert.equal(timers.scheduled.get(3).delay, 120);
  timers.scheduled.get(3).callback();
  assert.deepEqual(delivered, [{ width: 300, height: 100 }]);
});

test("does not deliver a canceled pending value", () => {
  const timers = fakeTimers();
  const delivered = [];
  const debouncer = createResizeDebouncer((value) => delivered.push(value), timers);

  debouncer.push("pending");
  const pendingCallback = timers.scheduled.get(1).callback;
  debouncer.cancel();
  pendingCallback();

  assert.deepEqual(timers.cleared, [1]);
  assert.deepEqual(delivered, []);
});

test("can schedule a new value after delivery", () => {
  const timers = fakeTimers();
  const delivered = [];
  const debouncer = createResizeDebouncer((value) => delivered.push(value), timers);

  debouncer.push("first");
  timers.scheduled.get(1).callback();
  debouncer.push("second");
  timers.scheduled.get(2).callback();

  assert.deepEqual(delivered, ["first", "second"]);
  assert.deepEqual(timers.cleared, []);
});
