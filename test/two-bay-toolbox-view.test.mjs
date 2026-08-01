import test from "node:test";
import assert from "node:assert/strict";

import { renderTwoBayToolbox } from "../dist/panel/lib/two-bay-toolbox-view.js";

test("renders tabs from definitions and switches the visible tool panel", () => {
  const fake = createFakeDocument();
  const root = fake.element("section");
  renderTwoBayToolbox(root, { document: fake.document });

  const tabs = root.children[0];
  const panels = root.children.slice(1);
  assert.equal(tabs.attributes.role, "tablist");
  assert.deepEqual(tabs.children.map((tab) => tab.textContent), [
    "絞り込み", "ナビゲーション", "表示", "情報",
  ]);
  assert.equal(panels[0].hidden, false);
  tabs.children[3].emit("click");
  assert.equal(panels[0].hidden, true);
  assert.equal(panels[3].hidden, false);
  assert.deepEqual(panels[3].children.map((tool) => [tool.textContent, tool.draggable, tool.disabled]), [
    ["日付", false, true], ["時計", false, true],
  ]);
});

function createFakeDocument() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(), textContent: "", className: "", hidden: false,
    disabled: false, draggable: false, dataset: {}, attributes: {}, children: [], listeners: {},
    replaceChildren(...children) { this.children = children; },
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); },
    emit(type) { for (const listener of this.listeners[type] ?? []) listener({ type }); },
  });
  return { document: { createElement: element }, element };
}

