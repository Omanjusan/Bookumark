import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { renderIconView } from "../dist/panel/lib/icon-view.js";
import { placementForTilePointer } from "../dist/panel/lib/panel-tile-drag.js";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("renders icon items with the common tile and drag-boundary contracts", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  renderIconView(root, [{
    guid: "alpha",
    title: "Alpha Guide",
    url: "https://example.com/alpha",
  }], { draggable: true, document: fake.document });

  assert.deepEqual(root.children.map((child) => child.className), [
    "panel-drop-boundary",
    "icon-view",
    "panel-drop-boundary",
  ]);
  const tile = root.children[1].children[0];
  assert.equal(tile.className, "panel-tile icon-tile");
  assert.equal(tile.dataset.guid, "alpha");
  assert.equal(tile.dataset.url, "https://example.com/alpha");
  assert.equal(tile.draggable, true);
  assert.equal(tile.children[0].className, "icon-view-image");
  assert.equal(tile.children[1].textContent, "Alpha Guide");
});

test("keeps icon items non-draggable when disabled", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  renderIconView(root, [{ guid: "a", title: "A", url: "https://a.test" }], {
    document: fake.document,
  });
  assert.equal(root.children[0].children[0].draggable, false);
});

test("uses the specified uniform icon grid and two-line title", () => {
  assert.match(
    css,
    /\.icon-view\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(86px,\s*1fr\)\)[^}]*column-gap:\s*10px[^}]*row-gap:\s*20px/s,
  );
  assert.match(css, /\.icon-view-image\s*\{[^}]*inline-size:\s*52px[^}]*block-size:\s*52px/s);
  assert.match(css, /\.icon-view-title\s*\{[^}]*-webkit-line-clamp:\s*2/s);
});

test("icon grid drops use the horizontal half even for tall tiles", () => {
  const rect = { left: 10, top: 20, width: 86, height: 96 };
  assert.equal(placementForTilePointer(rect, 30, 90, "horizontal"), "before");
  assert.equal(placementForTilePointer(rect, 80, 25, "horizontal"), "after");
});

function createFakeDocument() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(),
    className: "",
    textContent: "",
    title: "",
    tabIndex: -1,
    draggable: false,
    src: "",
    alt: "",
    dataset: {},
    children: [],
    attributes: {},
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  return { document: { createElement: element }, element };
}
