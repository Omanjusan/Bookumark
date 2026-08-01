import test from "node:test";
import assert from "node:assert/strict";

import { PANEL_FLAVOR_IDS, panelFlavorForGuid } from "../dist/panel/lib/panel-flavor.js";
import { renderPanelGrid } from "../dist/panel/lib/panel-grid-view.js";

test("adds a registered stable flavor only to panel-grid tiles", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  const tiles = [tile("alpha"), tile("beta")];

  renderPanelGrid(root, tiles, { document: fake.document, flavorSeed: 42 });

  const rendered = root.children[0].children;
  assert.equal(rendered[0].dataset.panelFlavor, panelFlavorForGuid("alpha", 42));
  assert.equal(rendered[1].dataset.panelFlavor, panelFlavorForGuid("beta", 42));
  assert.ok(rendered.every((element) => PANEL_FLAVOR_IDS.includes(element.dataset.panelFlavor)));
});

function tile(guid) {
  return {
    guid,
    url: `https://${guid}.example`,
    title: guid,
    domain: `${guid}.example`,
    size: "1",
    fields: ["favicon", "title", "domain"],
  };
}

function createFakeDocument() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(),
    className: "",
    textContent: "",
    title: "",
    draggable: false,
    src: "",
    alt: "",
    dataset: {},
    children: [],
    attributes: {},
    listeners: {},
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
  });
  return { document: { createElement: element }, element };
}
