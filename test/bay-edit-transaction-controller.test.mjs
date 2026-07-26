import test from "node:test";
import assert from "node:assert/strict";

import { createBayEditSession } from "../dist/panel/lib/bay-edit-session.js";
import {
  bindBayEditTransaction,
} from "../dist/panel/lib/bay-edit-transaction-controller.js";

test("connects DB-6 add, reorder, and delete notifications to one redraw path", () => {
  const session = createBayEditSession(fixture(), "bay-1");
  const fake = harness(session);

  fake.connection.handleToolDrop({ chipType: "sort", index: 1 });
  fake.connection.handleChipChange({ type: "reorder", instanceId: "chip-2", index: 0 });
  fake.connection.handleChipChange({ type: "delete", instanceId: "chip-1" });

  assert.deepEqual(session.draftBay().chips.map(({ instanceId }) => instanceId), ["chip-2"]);
  assert.equal(fake.renders.length, 4);
  assert.deepEqual(fake.renders.at(-1).chips, [{ instanceId: "chip-2", label: "ソート" }]);
  assert.equal(fake.elements.undo.disabled, false);
  assert.equal(fake.elements.redo.disabled, true);
  assert.equal(fake.elements.save.disabled, false);
});

test("connects undo and redo buttons and refreshes their disabled states", () => {
  const session = createBayEditSession(fixture(), "bay-1");
  const fake = harness(session);
  fake.connection.handleToolDrop({ chipType: "sort", index: 1 });

  fake.elements.undo.emit("click");
  assert.equal(fake.elements.undo.disabled, true);
  assert.equal(fake.elements.redo.disabled, false);
  assert.equal(fake.elements.save.disabled, true);

  fake.elements.redo.emit("click");
  assert.equal(fake.elements.undo.disabled, false);
  assert.equal(fake.elements.redo.disabled, true);
  assert.equal(fake.elements.save.disabled, false);
});

test("keeps the dialog state on save failure and reports the error", async () => {
  const errors = [];
  const session = createBayEditSession(fixture(), "bay-1", {
    saveDocument: async () => { throw new Error("storage failed"); },
  });
  const fake = harness(session, { onSaveError: (error) => errors.push(error) });
  fake.connection.handleToolDrop({ chipType: "sort", index: 1 });

  fake.elements.save.emit("click");
  await flush();

  assert.equal(errors[0].message, "storage failed");
  assert.equal(session.dirty, true);
  assert.equal(session.canUndo, true);
  assert.equal(fake.elements.save.disabled, false);
});

test("reports save success, clears history controls, and stays connected", async () => {
  let successes = 0;
  const session = createBayEditSession(fixture(), "bay-1", {
    saveDocument: async () => {},
  });
  const fake = harness(session, { onSaved: () => { successes += 1; } });
  fake.connection.handleToolDrop({ chipType: "sort", index: 1 });

  fake.elements.save.emit("click");
  assert.equal(fake.elements.save.disabled, true);
  assert.equal(fake.elements.undo.disabled, true);
  await flush();

  assert.equal(successes, 1);
  assert.equal(session.dirty, false);
  assert.equal(fake.elements.save.disabled, true);
  fake.connection.handleChipChange({ type: "delete", instanceId: "chip-2" });
  assert.equal(session.dirty, true);
});

test("connects the name input to history and restores invalid input", () => {
  const errors = [];
  const session = createBayEditSession(fixture(), "bay-1");
  const fake = harness(session, { onNameError: (error) => errors.push(error) });

  fake.elements.name.value = "  調査用  ";
  fake.elements.name.emit("change");
  assert.equal(session.draftBay().name, "調査用");
  assert.equal(fake.elements.name.value, "調査用");

  fake.elements.name.value = "   ";
  fake.elements.name.emit("change");
  assert.equal(errors.length, 1);
  assert.equal(session.draftBay().name, "調査用");
  assert.equal(fake.elements.name.value, "調査用");

  fake.elements.undo.emit("click");
  assert.equal(fake.elements.name.value, "表示設定");
});

function harness(session, options = {}) {
  const renders = [];
  const elements = { undo: button(), redo: button(), save: button(), name: button() };
  const connection = bindBayEditTransaction(session, elements, {
    chipLabels: new Map([["search", "検索"], ["sort", "ソート"]]),
    render: (model) => renders.push(structuredClone(model)),
    ...options,
  });
  return { connection, elements, renders };
}

function button() {
  const listeners = new Map();
  return {
    disabled: false,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    emit(type) { listeners.get(type)?.({ type }); },
  };
}

function fixture() {
  return {
    schemaVersion: 1,
    nextBaySequence: 2,
    nextChipSequence: 2,
    bays: [{
      id: "bay-1",
      name: "表示設定",
      permanent: false,
      chips: [{ instanceId: "chip-1", chipType: "search", order: 1, settings: {} }],
    }],
  };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
