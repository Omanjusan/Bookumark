import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { renderListView } from "../dist/panel/lib/list-view.js";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("renders list rows with the common tile and drag-boundary contracts", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  renderListView(root, [{
    guid: "alpha",
    title: "Alpha",
    url: "https://example.com/alpha",
    domain: "example.com",
  }], { draggable: true, document: fake.document });

  assert.deepEqual(root.children.map((child) => child.className), [
    "panel-drop-boundary",
    "list-view",
    "panel-drop-boundary",
  ]);
  const row = root.children[1].children[0];
  assert.equal(row.className, "panel-tile list-tile");
  assert.equal(row.dataset.guid, "alpha");
  assert.equal(row.dataset.url, "https://example.com/alpha");
  assert.equal(row.dataset.panelFlavor, undefined);
  assert.equal(row.draggable, true);
  assert.equal(row.children[1].textContent, "Alpha");
  assert.equal(row.children[2].textContent, "example.com");
});

test("renders an empty list without boundaries and keeps rows non-draggable when disabled", () => {
  const fake = createFakeDocument();
  const emptyRoot = fake.element("main");
  renderListView(emptyRoot, [], { document: fake.document });
  assert.equal(emptyRoot.children.length, 1);
  assert.equal(emptyRoot.children[0].className, "list-view");

  const root = fake.element("main");
  renderListView(root, [{ guid: "a", title: "A", url: "https://a.test", domain: "a.test" }], {
    document: fake.document,
  });
  assert.equal(root.children[0].children[0].draggable, false);
});

test("hides list domains at the agreed narrow-panel breakpoint", () => {
  assert.match(
    css,
    /@media\s*\(max-width:\s*440px\)\s*\{[\s\S]*?\.list-domain\s*\{[^}]*display:\s*none/s,
  );
});

function createFakeDocument() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(),
    className: "",
    textContent: "",
    title: "",
    tabIndex: -1,
    draggable: false,
    dataset: {},
    children: [],
    attributes: {},
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  return { document: { createElement: element }, element };
}
