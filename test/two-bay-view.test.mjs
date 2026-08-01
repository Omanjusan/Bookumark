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
    replaceChildren(...children) { this.children = children; },
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  return { document: { createElement: element }, element };
}
