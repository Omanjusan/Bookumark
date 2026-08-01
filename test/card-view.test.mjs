import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { renderCardView } from "../dist/panel/lib/card-view.js";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("renders two full metadata lines with the common tile contract", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  renderCardView(root, [{
    guid: "alpha",
    title: "Alpha",
    url: "https://example.com/alpha",
    domain: "example.com",
    visitText: "訪問回数: 12回",
    lastVisitText: "最終訪問: 2026/07/25 14:30",
  }], { draggable: true, document: fake.document });

  assert.deepEqual(root.children.map((child) => child.className), [
    "panel-drop-boundary",
    "card-view",
    "panel-drop-boundary",
  ]);
  const card = root.children[1].children[0];
  assert.equal(card.className, "panel-tile card-tile");
  assert.equal(card.dataset.guid, "alpha");
  assert.equal(card.dataset.url, "https://example.com/alpha");
  assert.equal(card.dataset.panelFlavor, undefined);
  assert.equal(card.draggable, true);
  const content = card.children[1];
  assert.equal(content.children[2].textContent, "訪問回数: 12回");
  assert.equal(content.children[2].title, "訪問回数: 12回");
  assert.equal(content.children[3].textContent, "最終訪問: 2026/07/25 14:30");
  assert.equal(content.children[3].title, "最終訪問: 2026/07/25 14:30");
});

test("uses the specified responsive card grid and dimensions", () => {
  assert.match(
    css,
    /\.card-view\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(270px,\s*1fr\)\)/s,
  );
  assert.match(css, /\.card-tile\s*\{[^}]*min-height:\s*96px/s);
  assert.match(css, /\.card-view-image\s*\{[^}]*inline-size:\s*48px[^}]*block-size:\s*48px/s);
  assert.match(css, /\.card-meta\s*\{[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/s);
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
