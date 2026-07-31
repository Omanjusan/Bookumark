import test from "node:test";
import assert from "node:assert/strict";

import { bindBayFactory } from "../dist/panel/lib/bay-factory-controller.js";

const bays = [
  {
    bayId: "bay-1",
    name: "内部ベイ",
    permanent: true,
    chips: [{ instanceId: "chip-1", label: "固定" }],
  },
  {
    bayId: "bay-2",
    name: "表示設定",
    permanent: false,
    chips: [
      { instanceId: "chip-2", label: "検索" },
      { instanceId: "chip-3", label: "訪問状態" },
      { instanceId: "chip-4", label: "表示形式" },
    ],
  },
];

test("lists only user bays and keeps opening disabled until selection", () => {
  const fake = harness();
  bindBayFactory(fake.elements, bays, { document: fake.document });

  assert.deepEqual(fake.elements.select.children.map(({ value, textContent }) => ({
    value, textContent,
  })), [
    { value: "", textContent: "編集するベイを選択" },
    { value: "bay-2", textContent: "表示設定" },
  ]);
  assert.equal(fake.elements.open.disabled, true);

  fake.elements.select.value = "bay-2";
  fake.elements.select.emit("change");
  assert.equal(fake.elements.open.disabled, false);
});

test("toggles selection mode and reports the selected bay id", () => {
  const fake = harness();
  const selections = [];
  bindBayFactory(fake.elements, bays, {
    document: fake.document,
    onSelectionChange: (bayId) => selections.push(bayId),
  });

  fake.elements.entry.emit("click");
  assert.equal(fake.elements.selection.hidden, false);
  fake.elements.select.value = "bay-2";
  fake.elements.select.emit("change");
  fake.elements.entry.emit("click");

  assert.deepEqual(selections, ["bay-2", null]);
  assert.equal(fake.elements.selection.hidden, true);
});

test("opens the selected bay from button, Enter, and double click", () => {
  for (const [target, event, details] of [
    ["open", "click", {}],
    ["select", "keydown", { key: "Enter" }],
    ["select", "dblclick", {}],
  ]) {
    const fake = harness();
    bindBayFactory(fake.elements, bays, { document: fake.document });
    fake.elements.select.value = "bay-2";
    fake.elements.select.emit("change");

    fake.elements[target].emit(event, details);

    assert.equal(fake.elements.dialog.showModalCalls, 1);
    assert.equal(fake.elements.name.value, "表示設定");
    assert.deepEqual(
      fake.elements.editor.children[0].children.map(({ textContent }) => textContent),
      ["検索", "訪問状態", "表示形式"],
    );
  }
});

test("routes the close button and Escape cancel through the same close contract", () => {
  const fake = harness();
  let closes = 0;
  bindBayFactory(fake.elements, bays, {
    document: fake.document,
    onClose: () => { closes += 1; },
  });
  fake.elements.select.value = "bay-2";
  fake.elements.select.emit("change");
  fake.elements.open.emit("click");

  fake.elements.close.emit("click");
  fake.elements.dialog.open = true;
  const cancel = fake.elements.dialog.emit("cancel");

  assert.equal(cancel.defaultPrevented, true);
  assert.equal(fake.elements.dialog.closeCalls, 2);
  assert.equal(closes, 2);
});

test("closes immediately after a successful save and runs close cleanup", () => {
  const fake = harness();
  let closes = 0;
  const connection = bindBayFactory(fake.elements, bays, {
    document: fake.document,
    hasUnsavedChanges: () => true,
    onClose: () => { closes += 1; },
  });
  fake.elements.dialog.open = true;

  connection.closeAfterSave();

  assert.equal(fake.elements.dialog.closeCalls, 1);
  assert.equal(fake.elements.discardConfirmation.hidden, true);
  assert.equal(closes, 1);
});

test("shows the specified discard confirmation for unsaved close and Escape", () => {
  const fake = harness();
  bindBayFactory(fake.elements, bays, {
    document: fake.document,
    hasUnsavedChanges: () => true,
  });
  fake.elements.select.value = "bay-2";
  fake.elements.select.emit("change");
  fake.elements.open.emit("click");

  fake.elements.close.emit("click");
  assert.equal(fake.elements.discardConfirmation.hidden, false);
  assert.equal(fake.elements.dialog.closeCalls, 0);

  fake.elements.discardConfirmation.hidden = true;
  const cancel = fake.elements.dialog.emit("cancel");
  assert.equal(cancel.defaultPrevented, true);
  assert.equal(fake.elements.discardConfirmation.hidden, false);
  assert.equal(fake.elements.dialog.closeCalls, 0);
});

test("continues editing or discards through the confirmation actions", () => {
  const fake = harness();
  let dirty = true;
  let discards = 0;
  bindBayFactory(fake.elements, bays, {
    document: fake.document,
    hasUnsavedChanges: () => dirty,
    onDiscard: () => { discards += 1; dirty = false; },
  });
  fake.elements.select.value = "bay-2";
  fake.elements.select.emit("change");
  fake.elements.open.emit("click");

  fake.elements.close.emit("click");
  fake.elements.continueEditing.emit("click");
  assert.equal(fake.elements.discardConfirmation.hidden, true);
  assert.equal(fake.elements.dialog.open, true);

  fake.elements.close.emit("click");
  fake.elements.discardChanges.emit("click");
  assert.equal(discards, 1);
  assert.equal(fake.elements.discardConfirmation.hidden, true);
  assert.equal(fake.elements.dialog.open, false);
});

test("refreshes loaded user bays after add, rename, duplicate, and delete", () => {
  const fake = harness();
  const selections = [];
  const connection = bindBayFactory(fake.elements, bays, {
    document: fake.document,
    onSelectionChange: (bayId) => selections.push(bayId),
  });
  fake.elements.select.value = "bay-2";
  fake.elements.select.emit("change");

  connection.replaceBays([
    bays[0],
    { ...bays[1], name: "表示ツール" },
    { bayId: "bay-3", name: "表示ツール 2", permanent: false, chips: [] },
  ]);
  assert.equal(fake.elements.select.value, "bay-2");
  assert.deepEqual(
    fake.elements.select.children.map(({ value, textContent }) => [value, textContent]),
    [["", "編集するベイを選択"], ["bay-2", "表示ツール"], ["bay-3", "表示ツール 2"]],
  );

  connection.replaceBays([bays[0], {
    bayId: "bay-3", name: "表示ツール 2", permanent: false, chips: [],
  }]);
  assert.equal(fake.elements.select.value, "");
  assert.equal(fake.elements.open.disabled, true);
  assert.deepEqual(selections, ["bay-2", null]);
});

test("reports which loaded user bay is opened for transaction wiring", () => {
  const fake = harness();
  const opened = [];
  bindBayFactory(fake.elements, bays, {
    document: fake.document,
    onOpen: (bayId) => opened.push(bayId),
  });
  fake.elements.select.value = "bay-2";
  fake.elements.select.emit("change");
  fake.elements.open.emit("click");

  assert.deepEqual(opened, ["bay-2"]);
});

function harness() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(),
    className: "",
    _textContent: "",
    get textContent() { return this._textContent; },
    set textContent(value) {
      this._textContent = value;
      if (value === "") this.children.length = 0;
    },
    value: "",
    disabled: false,
    hidden: false,
    open: false,
    dataset: {},
    attributes: {},
    children: [],
    listeners: {},
    appendChild(child) { this.children.push(child); return child; },
    addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { this.focused = true; },
    emit(type, details = {}) {
      const event = {
        type,
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
        ...details,
      };
      for (const listener of this.listeners[type] ?? []) listener(event);
      return event;
    },
  });
  const elements = {
    entry: element("button"),
    selection: element("div"),
    select: element("select"),
    open: element("button"),
    dialog: element("dialog"),
    close: element("button"),
    name: element("input"),
    editor: element("section"),
    discardConfirmation: element("section"),
    continueEditing: element("button"),
    discardChanges: element("button"),
  };
  elements.selection.hidden = true;
  elements.discardConfirmation.hidden = true;
  elements.dialog.showModalCalls = 0;
  elements.dialog.closeCalls = 0;
  elements.dialog.showModal = function () { this.open = true; this.showModalCalls += 1; };
  elements.dialog.close = function () { this.open = false; this.closeCalls += 1; };
  return { elements, document: { createElement: element } };
}
