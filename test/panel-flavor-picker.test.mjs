import test from "node:test";
import assert from "node:assert/strict";

import { PANEL_FLAVOR_IDS } from "../dist/panel/lib/panel-flavor.js";
import { bindPanelFlavorPicker } from "../dist/panel/lib/panel-flavor-picker.js";

test("opens one palette with auto and all sixteen flavor choices", () => {
  const fake = harness();
  fake.picker.open("alpha", "Alpha", fake.anchor, "blue");

  assert.equal(fake.elements.root.hidden, false);
  assert.equal(fake.elements.title.textContent, "Alphaの配色");
  assert.equal(fake.elements.choices.children.length, 17);
  assert.deepEqual(fake.elements.choices.children.map((button) => button.dataset.flavorChoice), [
    "auto", ...PANEL_FLAVOR_IDS,
  ]);
  assert.equal(fake.elements.choices.children.find((button) => button.dataset.flavorChoice === "blue").attributes["aria-checked"], "true");
  assert.equal(fake.elements.choices.children[0].attributes["aria-checked"], "false");
});

test("marks auto when the bookmark has no override", () => {
  const fake = harness();
  fake.picker.open("alpha", "Alpha", fake.anchor, null);
  assert.equal(fake.elements.choices.children[0].attributes["aria-checked"], "true");
});

test("saves a flavor or auto choice and closes after success", async () => {
  const selections = [];
  const fake = harness(async (guid, flavor) => { selections.push({ guid, flavor }); });
  fake.picker.open("alpha", "Alpha", fake.anchor, null);
  await fake.elements.choices.emit("click", { target: choiceTarget("rose") });
  assert.deepEqual(selections, [{ guid: "alpha", flavor: "rose" }]);
  assert.equal(fake.elements.root.hidden, true);

  fake.picker.open("beta", "Beta", fake.anchor, "blue");
  await fake.elements.choices.emit("click", { target: choiceTarget("auto") });
  assert.deepEqual(selections.at(-1), { guid: "beta", flavor: null });
});

test("close button dismisses the picker without changing preferences", () => {
  const selections = [];
  const fake = harness(async (...args) => { selections.push(args); });
  fake.picker.open("alpha", "Alpha", fake.anchor, null);
  fake.elements.close.emit("click", {});
  assert.equal(fake.elements.root.hidden, true);
  assert.deepEqual(selections, []);
});

function harness(onSelect = async () => {}) {
  const document = fakeDocument();
  const elements = {
    root: document.element("section"),
    title: document.element("strong"),
    choices: document.element("div"),
    close: document.element("button"),
  };
  elements.root.hidden = true;
  const picker = bindPanelFlavorPicker(elements, { document: document.document, onSelect });
  return { picker, elements, anchor: document.element("button") };
}

function choiceTarget(value) {
  return { closest: (selector) => selector === "[data-flavor-choice]"
    ? { dataset: { flavorChoice: value } }
    : null };
}

function fakeDocument() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(), className: "", textContent: "", hidden: false,
    disabled: false, dataset: {}, attributes: {}, children: [], listeners: {}, style: {},
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    emit(type, event) { return this.listeners[type]?.(event); },
    getBoundingClientRect() { return { left: 100, right: 120, top: 80, bottom: 100 }; },
    focus() { this.focused = true; },
  });
  return { document: { createElement: element }, element };
}
