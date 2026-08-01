import test from "node:test";
import assert from "node:assert/strict";

import { createDockingChipRendererRegistry } from "../dist/panel/lib/docking-chip-renderer-registry.js";
import { renderTwoBay } from "../dist/panel/lib/two-bay-view.js";

test("renders each configured row as an independently labelled horizontal viewport", () => {
  const fake = createFakeDocument();
  const root = fake.element("div");
  const result = renderTwoBay(root, {
    bay: "top",
    rows: [
      { row: 1, chips: [chip("chip-1", "search", 1)] },
      { row: 2, chips: [chip("chip-2", "sort", 1)] },
    ],
  }, registry(fake), { document: fake.document });

  assert.equal(root.hidden, false);
  assert.deepEqual(root.children.map((row) => ({
    row: row.dataset.row,
    label: row.attributes["aria-label"],
    classes: row.className,
    chip: row.children[0].dataset.instanceId,
  })), [
    { row: "1", label: "上ベイ1行目", classes: "two-bay-row", chip: "chip-1" },
    { row: "2", label: "上ベイ2行目", classes: "two-bay-row", chip: "chip-2" },
  ]);
  assert.deepEqual(result.renderedInstanceIds, ["chip-1", "chip-2"]);
});

test("hides a zero-row bay and skips unknown chips without omitting its visible row", () => {
  const fake = createFakeDocument();
  const root = fake.element("div");
  renderTwoBay(root, { bay: "bottom", rows: [] }, registry(fake), { document: fake.document });
  assert.equal(root.hidden, true);
  assert.deepEqual(root.children, []);

  const result = renderTwoBay(root, {
    bay: "bottom",
    rows: [{ row: 1, chips: [chip("chip-x", "future-chip", 1)] }],
  }, registry(fake), { document: fake.document });
  assert.equal(root.hidden, false);
  assert.equal(root.children.length, 1);
  assert.deepEqual(result.skippedChips, [{
    instanceId: "chip-x",
    chipType: "future-chip",
    reason: "unknown-chip-type",
  }]);
});

test("renders edit controls and a disabled placeholder for a zero-row bay", () => {
  const fake = createFakeDocument();
  const root = fake.element("div");
  const changes = [];
  renderTwoBay(root, { bay: "bottom", rows: [] }, registry(fake), {
    document: fake.document,
    edit: { visibleRows: 0, isSystem: false, onRowsChange: (delta) => changes.push(delta) },
  });

  assert.equal(root.hidden, false);
  const editor = root.children[0];
  const controls = editor.children[0];
  const rows = editor.children[1];
  assert.equal(controls.children[0].attributes["aria-label"], "下ベイの行を追加");
  assert.equal(controls.children[0].disabled, false);
  assert.equal(controls.children[1].disabled, true);
  assert.equal(rows.children[0].dataset.dropDisabled, "true");
  assert.equal(rows.children[0].children[0].textContent, "非表示設定が有効です");
  controls.children[0].emit("click");
  assert.deepEqual(changes, [1]);
});

test("makes rendered chip instances draggable only while editing", () => {
  const fake = createFakeDocument();
  const root = fake.element("div");
  const plan = { bay: "top", rows: [{ row: 1, chips: [chip("chip-1", "search", 1)] }] };
  renderTwoBay(root, plan, registry(fake), { document: fake.document });
  assert.equal(root.children[0].children[0].draggable, false);
  renderTwoBay(root, plan, registry(fake), {
    document: fake.document,
    edit: { visibleRows: 1, isSystem: true, onRowsChange: () => {} },
  });
  assert.equal(root.children[0].children[1].children[0].children[0].draggable, true);
});

test("keeps the independent system slot first in the selected bay during normal and edit rendering", () => {
  const fake = createFakeDocument();
  const root = fake.element("div");
  const slot = fake.element("div");
  slot.id = "system-menu-slot";
  const plan = { bay: "bottom", rows: [{ row: 1, chips: [chip("chip-1", "search", 1)] }] };

  renderTwoBay(root, plan, registry(fake), { document: fake.document, systemSlot: slot });
  assert.equal(root.children[0].children[0], slot);
  assert.equal(slot.dataset.bay, "bottom");
  assert.equal(slot.draggable, false);

  renderTwoBay(root, plan, registry(fake), {
    document: fake.document,
    systemSlot: slot,
    edit: { visibleRows: 1, isSystem: true, onRowsChange: () => {} },
  });
  assert.equal(root.children[0].children[1].children[0].children[0], slot);
});

test("disables decrement for a one-row system bay and increment at three rows", () => {
  const fake = createFakeDocument();
  const root = fake.element("div");
  renderTwoBay(root, {
    bay: "top",
    rows: [
      { row: 1, chips: [] }, { row: 2, chips: [] }, { row: 3, chips: [] },
    ],
  }, registry(fake), {
    document: fake.document,
    edit: { visibleRows: 3, isSystem: true, onRowsChange: () => {} },
  });
  assert.equal(root.children[0].children[0].children[0].disabled, true);

  renderTwoBay(root, { bay: "top", rows: [{ row: 1, chips: [] }] }, registry(fake), {
    document: fake.document,
    edit: { visibleRows: 1, isSystem: true, onRowsChange: () => {} },
  });
  assert.equal(root.children[0].children[0].children[1].disabled, true);
});

function chip(instanceId, chipType, order) {
  return { instanceId, chipType, order, settings: {} };
}

function registry(fake) {
  const renderers = Object.fromEntries([
    "search", "visit-status", "folder-history", "sort", "view-type", "movement-mode",
  ].map((chipType) => [chipType, () => {
    const control = fake.element("button");
    control.textContent = chipType;
    return control;
  }]));
  return createDockingChipRendererRegistry(renderers);
}

function createFakeDocument() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(),
    className: "",
    textContent: "",
    hidden: false,
    dataset: {},
    children: [],
    attributes: {},
    disabled: false,
    draggable: false,
    listeners: {},
    replaceChildren(...children) { this.children = children; },
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); },
    emit(type) { for (const listener of this.listeners[type] ?? []) listener({ type }); },
  });
  return { document: { createElement: element }, element };
}
