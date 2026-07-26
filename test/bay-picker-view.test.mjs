import test from "node:test";
import assert from "node:assert/strict";

import { renderBayPicker } from "../dist/panel/lib/bay-picker-view.js";

test("renders unplaced and placed tags in model order with identifying badges", () => {
  const fake = createFakeDocument();
  const elements = {
    root: fake.element("section"),
    unplaced: fake.element("div"),
    placed: fake.element("div"),
  };
  renderBayPicker(elements, model(), { document: fake.document });

  assert.equal(elements.root.dataset.activeLayoutId, "layout-2");
  assert.deepEqual(elements.unplaced.children.map(tagSummary), [
    { bayId: "bay-12", rail: undefined, tagName: "SPAN", tabIndex: 0, draggable: true, labels: ["同名", "#12"] },
    { bayId: "custom", rail: undefined, tagName: "SPAN", tabIndex: 0, draggable: true, labels: ["同名", "custom"] },
  ]);
  assert.deepEqual(elements.placed.children.map(tagSummary), [
    { bayId: "bay-1", rail: "left", tagName: "SPAN", tabIndex: 0, draggable: true, labels: ["固定", "#1", "デフォルト", "左"] },
    { bayId: "bay-3", rail: "bottom", tagName: "SPAN", tabIndex: 0, draggable: true, labels: ["下", "#3", "下"] },
  ]);
});

test("keeps an observable empty state in each empty section", () => {
  const fake = createFakeDocument();
  const elements = {
    root: fake.element("section"),
    unplaced: fake.element("div"),
    placed: fake.element("div"),
  };
  const empty = model();
  empty.unplaced = [];
  empty.placed = [];
  renderBayPicker(elements, empty, { document: fake.document });

  for (const row of [elements.unplaced, elements.placed]) {
    assert.equal(row.children.length, 1);
    assert.equal(row.children[0].className, "bay-picker-empty");
    assert.equal(row.children[0].textContent, "該当するベイはありません");
  }
});

function tagSummary(tag) {
  return {
    bayId: tag.dataset.bayId,
    rail: tag.dataset.rail,
    tagName: tag.tagName,
    tabIndex: tag.tabIndex,
    draggable: tag.draggable,
    labels: tag.children.map(({ textContent }) => textContent),
  };
}

function model() {
  return {
    activeLayoutId: "layout-2",
    unplaced: [
      { bayId: "bay-12", name: "同名", permanent: false },
      { bayId: "custom", name: "同名", permanent: false },
    ],
    placed: [
      { bayId: "bay-1", name: "固定", permanent: true, rail: "left", order: 1 },
      { bayId: "bay-3", name: "下", permanent: false, rail: "bottom", order: 1 },
    ],
    ignoredPlacements: [],
  };
}

function createFakeDocument() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(),
    className: "",
    textContent: "",
    tabIndex: -1,
    draggable: false,
    dataset: {},
    children: [],
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...children) { this.children = children; },
  });
  return { document: { createElement: element }, element };
}
