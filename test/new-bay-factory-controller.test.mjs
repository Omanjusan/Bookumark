import test from "node:test";
import assert from "node:assert/strict";

import {
  bindNewBayFactory,
} from "../dist/panel/lib/new-bay-factory-controller.js";

test("opens one empty unsaved bay under an injected temporary identity", () => {
  const fake = harness();
  const controller = bindNewBayFactory(fake.elements, {
    createTemporaryId: () => "new-bay-session-7",
    render: (model) => fake.renders.push(structuredClone(model)),
  });

  fake.elements.add.emit("click");

  assert.equal(fake.elements.dialog.showModalCalls, 1);
  assert.equal(fake.elements.name.disabled, false);
  assert.equal(fake.elements.name.value, "新しいベイ");
  assert.deepEqual(controller.draft(), {
    temporaryId: "new-bay-session-7",
    name: "新しいベイ",
    chips: [],
  });
  assert.deepEqual(fake.renders, [{
    bayId: "new-bay-session-7",
    name: "新しいベイ",
    chips: [],
  }]);
});

test("keeps the draft private until it is explicitly queried", () => {
  const fake = harness();
  const publications = [];
  const controller = bindNewBayFactory(fake.elements, {
    createTemporaryId: () => "new-1",
    render: () => {},
    onDraftChange: (draft) => publications.push(draft),
  });

  fake.elements.add.emit("click");

  assert.deepEqual(publications, []);
  const first = controller.draft();
  first.name = "外から変更";
  assert.equal(controller.draft().name, "新しいベイ");
});

test("updates and trims the draft name without publishing it to saved bays", () => {
  const fake = harness();
  const changes = [];
  const controller = bindNewBayFactory(fake.elements, {
    createTemporaryId: () => "new-1",
    render: (model) => fake.renders.push(structuredClone(model)),
    onDraftChange: (draft) => changes.push(draft),
  });
  fake.elements.add.emit("click");

  fake.elements.name.value = "  調査用  ";
  fake.elements.name.emit("change");

  assert.equal(controller.draft().name, "調査用");
  assert.equal(fake.elements.name.value, "調査用");
  assert.equal(changes.length, 1);
  assert.equal(changes[0].name, "調査用");
});

test("rejects an empty name and keeps the last valid draft", () => {
  const fake = harness();
  const errors = [];
  const controller = bindNewBayFactory(fake.elements, {
    createTemporaryId: () => "new-1",
    render: () => {},
    onNameError: (error) => errors.push(error),
  });
  fake.elements.add.emit("click");

  fake.elements.name.value = "   ";
  fake.elements.name.emit("change");

  assert.equal(errors.length, 1);
  assert.equal(controller.draft().name, "新しいベイ");
  assert.equal(fake.elements.name.value, "新しいベイ");
});

test("discards the temporary draft without closing or saving by itself", () => {
  const fake = harness();
  const controller = bindNewBayFactory(fake.elements, {
    createTemporaryId: () => "new-1",
    render: () => {},
  });
  fake.elements.add.emit("click");

  controller.discard();

  assert.equal(controller.draft(), null);
  assert.equal(fake.elements.dialog.closeCalls, 0);
});

function harness() {
  const elements = {
    add: element(),
    dialog: element(),
    name: element(),
  };
  elements.name.disabled = true;
  elements.dialog.open = false;
  elements.dialog.showModalCalls = 0;
  elements.dialog.closeCalls = 0;
  elements.dialog.showModal = function () { this.open = true; this.showModalCalls += 1; };
  elements.dialog.close = function () { this.open = false; this.closeCalls += 1; };
  return { elements, renders: [] };
}

function element() {
  const listeners = new Map();
  return {
    value: "",
    disabled: false,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    emit(type) { listeners.get(type)?.({ type }); },
  };
}
