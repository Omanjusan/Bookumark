import test from "node:test";
import assert from "node:assert/strict";

import { PANEL_FLAVOR_IDS, panelFlavorForGuid } from "../dist/panel/lib/panel-flavor.js";
import { panelFlavorFromPreferences } from "../dist/panel/lib/panel-flavor-preferences.js";
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

test("renders persistent seed colors and GUID overrides from startup preferences", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  const preferences = {
    version: 1,
    seed: 73,
    overrides: { alpha: "rose" },
  };

  renderPanelGrid(root, [tile("alpha"), tile("beta")], {
    document: fake.document,
    flavorPreferences: preferences,
  });

  const rendered = root.children[0].children;
  assert.equal(rendered[0].dataset.panelFlavor, "rose");
  assert.equal(rendered[1].dataset.panelFlavor, panelFlavorFromPreferences("beta", preferences));
});

test("renders a labelled settings gear that opens the current bookmark without opening it", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  const opened = [];
  renderPanelGrid(root, [tile("alpha")], {
    document: fake.document,
    flavorSeed: 1,
    onFlavorSettings: (guid, title, anchor) => opened.push({ guid, title, anchor }),
  });

  const rendered = root.children[0].children[0];
  const gear = rendered.children.at(-1);
  assert.equal(gear.className, "panel-flavor-settings");
  assert.equal(gear.attributes["aria-label"], "alphaの配色を変更");
  assert.equal(gear.draggable, false);
  const event = { stopPropagationCalls: 0, stopPropagation() { this.stopPropagationCalls += 1; } };
  gear.listeners.click(event);
  assert.equal(event.stopPropagationCalls, 1);
  assert.deepEqual(opened, [{ guid: "alpha", title: "alpha", anchor: gear }]);
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
    getBoundingClientRect() { return { left: 10, right: 30, top: 20, bottom: 40 }; },
  });
  return { document: { createElement: element }, element };
}
