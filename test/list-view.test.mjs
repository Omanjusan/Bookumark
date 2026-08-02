import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  nextListSortSelection,
  renderListView,
} from "../dist/panel/lib/list-view.js";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

const item = {
  guid: "alpha",
  title: "Alpha",
  url: "https://example.com/alpha",
  domain: "example.com",
  dateAddedText: "2026/08/01 10:00",
  lastVisitText: "2026/08/03 12:30",
  visitCountText: "7",
};

test("renders a semantic five-column table with the common row contract", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  renderListView(root, [item], { draggable: true, document: fake.document });

  assert.deepEqual(root.children.map((child) => child.className), [
    "panel-drop-boundary",
    "list-view-scroll",
    "panel-drop-boundary",
  ]);
  const table = root.children[1].children[0];
  assert.equal(table.tagName, "TABLE");
  assert.equal(table.className, "list-view");
  const headerCells = table.children[1].children[0].children;
  assert.equal(headerCells[0].children.length, 0);
  assert.deepEqual(headerCells.slice(1).map((cell) => cell.children[0].textContent), [
    "タイトル", "登録日時", "最終訪問日時", "訪問回数",
  ]);

  const row = table.children[2].children[0];
  assert.equal(row.className, "panel-tile list-tile");
  assert.equal(row.dataset.guid, "alpha");
  assert.equal(row.dataset.url, item.url);
  assert.equal(row.dataset.panelFlavor, undefined);
  assert.equal(row.draggable, true);
  assert.equal(row.children[0].children[0].className, "list-icon");
  assert.deepEqual(row.children.slice(1).map((cell) => cell.textContent), [
    "Alpha", "2026/08/01 10:00", "2026/08/03 12:30", "7",
  ]);
});

test("renders active sort state and delivers header sort selections", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  const selections = [];
  renderListView(root, [item], {
    document: fake.document,
    sort: { axisId: "dateAdded", direction: "desc" },
    onSort: (selection) => selections.push(selection),
  });

  const headers = root.children[0].children[0].children[1].children[0].children;
  assert.deepEqual(headers.map((header) => header.attributes["aria-sort"]), [
    undefined, "none", "descending", "none", "none",
  ]);
  assert.equal(headers[2].children[0].textContent, "登録日時 ▼");

  headers[2].children[0].emit("click");
  headers[4].children[0].emit("click");
  assert.deepEqual(selections, [
    { axisId: "dateAdded", direction: "asc" },
    { axisId: "visitCount", direction: "asc" },
  ]);
});

test("selects a new list axis ascending and toggles only the active axis", () => {
  assert.deepEqual(
    nextListSortSelection({ axisId: "visitCount", direction: "desc" }, "title"),
    { axisId: "title", direction: "asc" },
  );
  assert.deepEqual(
    nextListSortSelection({ axisId: "title", direction: "asc" }, "title"),
    { axisId: "title", direction: "desc" },
  );
});

test("renders an empty table without boundaries and keeps rows non-draggable when disabled", () => {
  const fake = createFakeDocument();
  const emptyRoot = fake.element("main");
  renderListView(emptyRoot, [], { document: fake.document });
  assert.equal(emptyRoot.children.length, 1);
  assert.equal(emptyRoot.children[0].className, "list-view-scroll");
  assert.equal(emptyRoot.children[0].children[0].children[2].children.length, 0);

  const root = fake.element("main");
  renderListView(root, [item], { document: fake.document });
  const row = root.children[0].children[0].children[2].children[0];
  assert.equal(row.draggable, false);
});

test("uses the agreed dense transparent table layout without hiding narrow columns", () => {
  assert.match(css, /\.list-view-scroll\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /\.list-view\s*\{[^}]*min-width:\s*760px[^}]*border-collapse:\s*collapse/s);
  assert.match(css, /\.list-tile\s*\{[^}]*height:\s*24px[^}]*background:\s*transparent/s);
  assert.match(css, /\.list-cell\s*\{[^}]*padding:\s*0 4px[^}]*text-align:\s*left/s);
  assert.match(css, /\.list-icon\s*\{[^}]*inline-size:\s*16px[^}]*block-size:\s*16px/s);
  assert.match(css, /\.list-tile:hover\s+\.list-cell\s*\{[^}]*background:\s*var\(--hover\)/s);
  assert.doesNotMatch(css, /@media\s*\(max-width:\s*440px\)[\s\S]*?\.list-(?:date|visit)[^{]*\{[^}]*display:\s*none/s);
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
    listeners: {},
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    emit(type) { this.listeners[type]?.({ target: this }); },
  });
  return { document: { createElement: element }, element };
}
