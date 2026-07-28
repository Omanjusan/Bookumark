import test from "node:test";
import assert from "node:assert/strict";

import {
  bindLayoutEditTransaction,
} from "../dist/panel/lib/layout-edit-transaction-controller.js";

test("renders clean initial history and unsaved states", () => {
  const fake = harness();

  assert.equal(fake.elements.undo.disabled, true);
  assert.equal(fake.elements.redo.disabled, true);
  assert.equal(fake.elements.save.disabled, true);
  assert.equal(fake.elements.delete.disabled, false);
  assert.equal(fake.elements.exit.disabled, false);
  assert.equal(fake.elements.unsaved.hidden, true);
});

test("connects undo and redo to one synchronized redraw path", () => {
  const fake = harness();
  fake.session.dirty = true;
  fake.session.canUndo = true;
  fake.connection.refresh();

  fake.elements.undo.emit("click");
  assert.equal(fake.session.undoCalls, 1);
  assert.equal(fake.redraws(), 1);
  assert.equal(fake.elements.unsaved.hidden, true);
  assert.equal(fake.elements.undo.disabled, true);
  assert.equal(fake.elements.redo.disabled, false);

  fake.elements.redo.emit("click");
  assert.equal(fake.session.redoCalls, 1);
  assert.equal(fake.redraws(), 2);
  assert.equal(fake.elements.unsaved.hidden, false);
});

test("routes save and delete buttons to explicit callbacks", () => {
  const fake = harness();
  fake.session.dirty = true;
  fake.connection.refresh();

  fake.elements.save.emit("click");
  fake.elements.delete.emit("click");

  assert.equal(fake.saveCalls(), 1);
  assert.equal(fake.deleteCalls(), 1);
});

test("blocks every edit-bar action including exit while saving", () => {
  const fake = harness();
  fake.session.dirty = true;
  fake.session.canUndo = true;
  fake.session.canRedo = true;
  fake.session.saving = true;
  fake.connection.refresh();

  for (const key of ["undo", "redo", "save", "delete", "exit"]) {
    assert.equal(fake.elements[key].disabled, true);
  }
  fake.elements.undo.emit("click");
  fake.elements.redo.emit("click");
  fake.elements.save.emit("click");
  fake.elements.delete.emit("click");
  assert.deepEqual([
    fake.session.undoCalls, fake.session.redoCalls, fake.saveCalls(), fake.deleteCalls(),
  ], [0, 0, 0, 0]);
  assert.equal(fake.elements.unsaved.hidden, false);
});

test("refreshes external placement changes and disconnects listeners", () => {
  const fake = harness();
  fake.session.dirty = true;
  fake.session.canUndo = true;
  fake.connection.refresh();
  assert.equal(fake.elements.save.disabled, false);
  assert.equal(fake.elements.unsaved.hidden, false);

  fake.connection.disconnect();
  fake.elements.undo.emit("click");
  assert.equal(fake.session.undoCalls, 0);
  assert.equal(fake.listenerCount(), 0);
});

function harness() {
  const session = {
    dirty: false,
    canUndo: false,
    canRedo: false,
    saving: false,
    undoCalls: 0,
    redoCalls: 0,
    undo() {
      this.undoCalls += 1;
      this.dirty = false;
      this.canUndo = false;
      this.canRedo = true;
      return true;
    },
    redo() {
      this.redoCalls += 1;
      this.dirty = true;
      this.canUndo = true;
      this.canRedo = false;
      return true;
    },
  };
  const elements = {
    undo: button(), redo: button(), save: button(), delete: button(), exit: button(),
    unsaved: button({ hidden: true }),
  };
  let redraws = 0;
  let saves = 0;
  let deletions = 0;
  const connection = bindLayoutEditTransaction(session, elements, {
    onStateChange: () => { redraws += 1; },
    onSave: () => { saves += 1; },
    onDelete: () => { deletions += 1; },
  });
  return {
    session, elements, connection,
    redraws: () => redraws,
    saveCalls: () => saves,
    deleteCalls: () => deletions,
    listenerCount: () => Object.values(elements)
      .reduce((total, element) => total + element.listeners.size, 0),
  };
}

function button(values = {}) {
  const listeners = new Map();
  return {
    disabled: false, hidden: false, listeners,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    emit(type) { listeners.get(type)?.({}); },
    ...values,
  };
}
