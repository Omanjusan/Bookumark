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

function harness() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(),
    className: "",
    textContent: "",
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
  };
  elements.selection.hidden = true;
  elements.dialog.showModalCalls = 0;
  elements.dialog.closeCalls = 0;
  elements.dialog.showModal = function () { this.open = true; this.showModalCalls += 1; };
  elements.dialog.close = function () { this.open = false; this.closeCalls += 1; };
  return { elements, document: { createElement: element } };
}
