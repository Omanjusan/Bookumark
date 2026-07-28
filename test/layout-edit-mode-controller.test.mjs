import test from "node:test";
import assert from "node:assert/strict";

import { bindLayoutEditMode } from "../dist/panel/lib/layout-edit-mode-controller.js";

test("enters a named layout edit session and restores guarded interaction on exit", () => {
  const fake = harness();
  const events = [];
  const controller = bindLayoutEditMode(fake.elements, fixture(), {
    onEnter: (documents) => events.push(["enter", documents.dockingMetadata.activeLayoutId]),
    onExit: (documents) => events.push(["exit", documents.dockingMetadata.activeLayoutId]),
  });

  fake.elements.entry.emit("click");
  assert.equal(controller.editing, true);
  assert.equal(fake.elements.root.dataset.layoutEditing, "true");
  assert.equal(fake.elements.layoutName.textContent, "作業用");
  assert.equal(fake.elements.entry.hidden, true);
  assert.equal(fake.elements.editBar.hidden, false);
  assert.deepEqual(fake.elements.guardedControls.map(({ disabled }) => disabled), [true, true]);
  assert.deepEqual(fake.elements.guardedRegions.map(({ inert }) => inert), [true, true]);

  fake.elements.exit.emit("click");
  assert.equal(controller.editing, false);
  assert.equal("layoutEditing" in fake.elements.root.dataset, false);
  assert.equal(fake.elements.entry.hidden, false);
  assert.equal(fake.elements.editBar.hidden, true);
  assert.deepEqual(fake.elements.guardedControls.map(({ disabled }) => disabled), [false, true]);
  assert.deepEqual(fake.elements.guardedRegions.map(({ inert }) => inert), [false, true]);
  assert.deepEqual(events, [["enter", "layout-2"], ["exit", "layout-2"]]);
});

test("disables entry with an explanation for the internal default", () => {
  const fake = harness();
  const documents = fixture();
  documents.dockingMetadata.activeLayoutId = "layout-1";
  const controller = bindLayoutEditMode(fake.elements, documents);

  assert.equal(fake.elements.entry.disabled, true);
  assert.equal(fake.elements.unavailableReason.hidden, false);
  assert.match(fake.elements.unavailableReason.textContent, /内部デフォルトは編集できません/);
  fake.elements.entry.emit("click");
  assert.equal(controller.editing, false);
});

test("updates availability after a saved layout switch and rejects changes during editing", () => {
  const fake = harness();
  const controller = bindLayoutEditMode(fake.elements, fixture());
  const internal = fixture();
  internal.dockingMetadata.activeLayoutId = "layout-1";
  controller.replaceDocuments(internal);
  assert.equal(fake.elements.entry.disabled, true);

  controller.replaceDocuments(fixture());
  fake.elements.entry.emit("click");
  assert.throws(() => controller.replaceDocuments(internal), /cannot change while editing/);
});

test("rejects an unresolved active layout", () => {
  const fake = harness();
  const documents = fixture();
  documents.dockingMetadata.activeLayoutId = "layout-404";
  assert.throws(
    () => bindLayoutEditMode(fake.elements, documents),
    /active layout was not found: layout-404/,
  );
});

test("keeps editing unavailable until initial panel restoration is ready", () => {
  const fake = harness();
  const controller = bindLayoutEditMode(fake.elements, fixture(), { initiallyReady: false });
  assert.equal(fake.elements.entry.disabled, true);
  fake.elements.entry.emit("click");
  assert.equal(controller.editing, false);
  controller.setReady();
  assert.equal(fake.elements.entry.disabled, false);
  fake.elements.entry.emit("click");
  assert.equal(controller.editing, true);
});

test("commits a saved placement baseline while editing and returns it on exit", () => {
  const fake = harness();
  const exits = [];
  const controller = bindLayoutEditMode(fake.elements, fixture(), {
    onExit: (documents) => exits.push(documents),
  });
  assert.throws(
    () => controller.commitDocuments(fixture()),
    /can only be committed while editing/,
  );
  fake.elements.entry.emit("click");
  const saved = fixture();
  saved.mainLayouts.layouts[1].placements.push({ bayId: "bay-1", rail: "left", order: 1 });
  controller.commitDocuments(saved);
  fake.elements.exit.emit("click");

  assert.deepEqual(exits[0], saved);
});

test("asks to continue editing or discard when exit is requested with unsaved changes", () => {
  const fake = harness();
  let dirty = true;
  let exits = 0;
  const controller = bindLayoutEditMode(fake.elements, fixture(), {
    hasUnsavedChanges: () => dirty,
    onExit: () => { exits += 1; },
  });
  fake.elements.entry.emit("click");

  fake.elements.exit.emit("click");
  assert.equal(controller.editing, true);
  assert.equal(fake.elements.discardConfirmation.hidden, false);
  assert.equal(exits, 0);

  fake.elements.continueEditing.emit("click");
  assert.equal(controller.editing, true);
  assert.equal(fake.elements.discardConfirmation.hidden, true);

  fake.elements.exit.emit("click");
  fake.elements.discardChanges.emit("click");
  assert.equal(controller.editing, false);
  assert.equal(fake.elements.discardConfirmation.hidden, true);
  assert.equal(exits, 1);

  dirty = false;
});

test("exits immediately without showing confirmation when the draft is clean", () => {
  const fake = harness();
  const controller = bindLayoutEditMode(fake.elements, fixture(), {
    hasUnsavedChanges: () => false,
  });
  fake.elements.entry.emit("click");
  fake.elements.exit.emit("click");

  assert.equal(controller.editing, false);
  assert.equal(fake.elements.discardConfirmation.hidden, true);
});

function harness() {
  const element = (values = {}) => ({
    disabled: false,
    hidden: false,
    inert: false,
    textContent: "",
    dataset: {},
    listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    emit(type) { this.listeners[type]?.({}); },
    ...values,
  });
  return {
    elements: {
      root: element(),
      entry: element(),
      unavailableReason: element({ hidden: true }),
      editBar: element({ hidden: true }),
      layoutName: element(),
      exit: element(),
      discardConfirmation: element({ hidden: true }),
      continueEditing: element(),
      discardChanges: element(),
      guardedControls: [element(), element({ disabled: true })],
      guardedRegions: [element(), element({ inert: true })],
    },
  };
}

function fixture() {
  return {
    bayConfigurations: { schemaVersion: 1, nextBaySequence: 1, nextChipSequence: 1, bays: [] },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        { id: "layout-1", name: "内部デフォルト", systemDefault: true, placements: [] },
        { id: "layout-2", name: "作業用", systemDefault: false, placements: [] },
      ],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-2" },
  };
}
