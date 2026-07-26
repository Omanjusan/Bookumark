import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBayFactoryDrawingPlan,
  renderBayFactoryEditor,
} from "../dist/panel/lib/bay-factory-static-view.js";

const model = {
  bayId: "bay-2",
  name: "表示設定",
  chips: [
    { instanceId: "chip-1", label: "検索" },
    { instanceId: "chip-2", label: "訪問状態" },
    { instanceId: "chip-3", label: "表示形式" },
  ],
};

test("builds an ordered text-chip drawing plan for one bay", () => {
  assert.deepEqual(buildBayFactoryDrawingPlan(model), {
    bayId: "bay-2",
    name: "表示設定",
    content: {
      status: "chips",
      chips: [
        { instanceId: "chip-1", label: "検索" },
        { instanceId: "chip-2", label: "訪問状態" },
        { instanceId: "chip-3", label: "表示形式" },
      ],
    },
  });
});

test("builds an observable empty-bay plan", () => {
  assert.deepEqual(buildBayFactoryDrawingPlan({
    bayId: "bay-4",
    name: "空ベイ",
    chips: [],
  }), {
    bayId: "bay-4",
    name: "空ベイ",
    content: { status: "empty" },
  });
});

test("renders text chips in their model order without interactive controls", () => {
  const fake = createFakeDocument();
  const root = fake.element("section");

  renderBayFactoryEditor(root, model, { document: fake.document });

  assert.equal(root.dataset.bayId, "bay-2");
  assert.equal(root.attributes["aria-label"], "表示設定の横ベイ編集");
  assert.equal(root.children.length, 1);
  const preview = root.children[0];
  assert.equal(preview.className, "bay-factory-bay-preview");
  assert.deepEqual(preview.children.map((chip) => ({
    tagName: chip.tagName,
    className: chip.className,
    instanceId: chip.dataset.instanceId,
    text: chip.textContent,
  })), [
    { tagName: "SPAN", className: "bay-factory-chip", instanceId: "chip-1", text: "検索" },
    { tagName: "SPAN", className: "bay-factory-chip", instanceId: "chip-2", text: "訪問状態" },
    { tagName: "SPAN", className: "bay-factory-chip", instanceId: "chip-3", text: "表示形式" },
  ]);
});

test("renders empty and vertical-orientation guidance for an empty bay", () => {
  const fake = createFakeDocument();
  const root = fake.element("section");

  renderBayFactoryEditor(root, { bayId: "bay-4", name: "空ベイ", chips: [] }, {
    document: fake.document,
  });

  const empty = root.children[0];
  assert.equal(empty.className, "bay-factory-empty");
  assert.deepEqual(empty.children.map(({ textContent }) => textContent), [
    "チップを配置してください",
    "左側が上部、右側が下部に回転表示されます",
  ]);
});

function createFakeDocument() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(),
    className: "",
    textContent: "",
    dataset: {},
    children: [],
    attributes: {},
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  return { document: { createElement: element }, element };
}
