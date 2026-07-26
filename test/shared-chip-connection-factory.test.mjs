import test from "node:test";
import assert from "node:assert/strict";

import { createSharedChipConnectionFactory } from "../dist/panel/lib/shared-chip-connection-factory.js";

test("connects separate chip DOM and synchronizes every copy through one state", () => {
  const fake = createBindingAdapter();
  const factory = createSharedChipConnectionFactory({ value: "all" }, {
    bind: fake.bind,
    reduce: (_state, value) => ({ value }),
  });
  const first = fake.element("first");
  const second = fake.element("second");

  factory.connect(first);
  factory.connect(second);
  assert.deepEqual(first.rendered, [{ value: "all" }]);
  assert.deepEqual(second.rendered, [{ value: "all" }]);

  first.deliver("visited");
  assert.deepEqual(first.rendered.at(-1), { value: "visited" });
  assert.deepEqual(second.rendered.at(-1), { value: "visited" });
  assert.deepEqual(factory.getState(), { value: "visited" });

  second.deliver("unvisited");
  assert.deepEqual(first.rendered.at(-1), { value: "unvisited" });
  assert.deepEqual(second.rendered.at(-1), { value: "unvisited" });
});

test("renders current shared state into a copy connected later", () => {
  const fake = createBindingAdapter();
  const factory = createSharedChipConnectionFactory(0, {
    bind: fake.bind,
    reduce: (state, amount) => state + amount,
  });
  const first = fake.element("first");
  factory.connect(first);
  first.deliver(3);

  const late = fake.element("late");
  factory.connect(late);

  assert.deepEqual(late.rendered, [3]);
  factory.setState(8);
  assert.equal(first.rendered.at(-1), 8);
  assert.equal(late.rendered.at(-1), 8);
});

test("disconnects one copy independently and can disconnect all remaining copies", () => {
  const fake = createBindingAdapter();
  const factory = createSharedChipConnectionFactory("initial", {
    bind: fake.bind,
    reduce: (_state, value) => value,
  });
  const first = fake.element("first");
  const second = fake.element("second");
  const firstConnection = factory.connect(first);
  factory.connect(second);

  firstConnection.disconnect();
  second.deliver("next");
  assert.deepEqual(first.rendered, ["initial"]);
  assert.equal(second.rendered.at(-1), "next");
  assert.equal(first.disconnected, true);

  factory.disconnect();
  assert.equal(second.disconnected, true);
  assert.equal(factory.connectionCount(), 0);
});

test("isolates a copy that fails during synchronization", () => {
  const fake = createBindingAdapter();
  const errors = [];
  const factory = createSharedChipConnectionFactory(0, {
    bind: fake.bind,
    reduce: (_state, value) => value,
    reportConnectionError: (error) => errors.push(error.message),
  });
  const healthy = fake.element("healthy");
  const broken = fake.element("broken");
  factory.connect(healthy);
  factory.connect(broken);
  broken.failAt = 2;

  healthy.deliver(1);
  healthy.deliver(2);

  assert.deepEqual(healthy.rendered, [0, 1, 2]);
  assert.deepEqual(broken.rendered, [0]);
  assert.equal(broken.disconnected, true);
  assert.deepEqual(errors, ["broken render"]);
  assert.equal(factory.connectionCount(), 1);
});

test("defensively separates shared state from callers and chip renderers", () => {
  const fake = createBindingAdapter();
  const initial = { nested: { value: 1 } };
  const factory = createSharedChipConnectionFactory(initial, {
    bind: fake.bind,
    reduce: (_state, event) => event,
  });
  const element = fake.element("copy");
  factory.connect(element);

  initial.nested.value = 9;
  element.rendered[0].nested.value = 8;
  const snapshot = factory.getState();
  snapshot.nested.value = 7;

  assert.deepEqual(factory.getState(), { nested: { value: 1 } });
});

function createBindingAdapter() {
  const bind = (element, deliver) => {
    element.deliver = deliver;
    return {
      render(state) {
        if (element.failAt === element.rendered.length + 1) throw new Error("broken render");
        element.rendered.push(state);
      },
      disconnect() { element.disconnected = true; },
    };
  };
  return {
    bind,
    element: (name) => ({
      name,
      rendered: [],
      disconnected: false,
      failAt: null,
      deliver: () => {},
    }),
  };
}
