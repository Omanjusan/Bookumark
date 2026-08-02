import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  nextListSortSelection,
  renderListView,
} from "../dist/panel/lib/list-view.js";
import { DEFAULT_LIST_COLUMN_WIDTHS } from "../dist/panel/lib/list-column-width-preferences.js";

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
  assert.equal(headerCells[0].children.length, 2);
  assert.equal(headerCells[0].children.at(-1).dataset.columnResize, "icon");
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

test("renders a labelled top-right date settings gear", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  let opened = 0;
  renderListView(root, [item], {
    document: fake.document,
    onDateSettings: () => { opened += 1; },
  });

  const gear = root.children[0].children[1];
  assert.equal(gear.className, "list-date-settings-button");
  assert.equal(gear.attributes["aria-label"], "一覧の日付表示設定");
  gear.emit("click");
  assert.equal(opened, 1);
});

test("renders five right-edge resize handles and commits only the dragged left column", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  const changes = [];
  renderListView(root, [item], {
    document: fake.document,
    columnWidths: DEFAULT_LIST_COLUMN_WIDTHS,
    onColumnResize: (columnId, width) => changes.push([columnId, width]),
  });

  const table = root.children[0].children[0];
  const columns = table.children[0].children;
  const headers = table.children[1].children[0].children;
  assert.deepEqual(columns.map((column) => column.style.width), [
    "24px", "292px", "160px", "160px", "84px",
  ]);
  assert.equal(table.style.width, "720px");
  assert.deepEqual(headers.map((header) => header.children.at(-1).dataset.columnResize), [
    "icon", "title", "dateAdded", "lastVisitTime", "visitCount",
  ]);

  const titleHandle = headers[1].children.at(-1);
  titleHandle.emit("pointerdown", { button: 0, pointerId: 7, clientX: 300 });
  titleHandle.emit("pointermove", { pointerId: 7, clientX: 340 });
  assert.equal(columns[1].style.width, "332px");
  assert.equal(columns[2].style.width, "160px");
  assert.equal(table.style.width, "760px");
  titleHandle.emit("pointerup", { pointerId: 7, clientX: 340 });
  assert.deepEqual(changes, [["title", 332]]);
});

test("renders an immediate column-width reset button in the icon header", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  let resets = 0;
  renderListView(root, [item], {
    document: fake.document,
    onColumnWidthsReset: () => { resets += 1; },
  });

  const iconHeader = root.children[0].children[0].children[1].children[0].children[0];
  const button = iconHeader.children[0];
  assert.equal(button.className, "list-column-width-reset");
  assert.equal(button.textContent, "↺");
  assert.equal(button.attributes["aria-label"], "列幅を初期設定に戻す");
  button.emit("click");
  assert.equal(resets, 1);
});

test("clamps a dragged column at its minimum and does not commit a cancelled drag", () => {
  const fake = createFakeDocument();
  const root = fake.element("main");
  const changes = [];
  renderListView(root, [item], {
    document: fake.document,
    columnWidths: DEFAULT_LIST_COLUMN_WIDTHS,
    onColumnResize: (columnId, width) => changes.push([columnId, width]),
  });

  const table = root.children[0].children[0];
  const titleHandle = table.children[1].children[0].children[1].children.at(-1);
  titleHandle.emit("pointerdown", { button: 0, pointerId: 1, clientX: 300 });
  titleHandle.emit("pointermove", { pointerId: 1, clientX: 0 });
  assert.equal(table.children[0].children[1].style.width, "60px");
  titleHandle.emit("pointercancel", { pointerId: 1 });
  assert.equal(table.children[0].children[1].style.width, "292px");
  assert.deepEqual(changes, []);
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
  assert.match(css, /\.list-view\s*\{[^}]*border-collapse:\s*collapse/s);
  assert.match(css, /\.list-column-resize-handle\s*\{[^}]*cursor:\s*col-resize/s);
  assert.match(css, /\.list-tile\s*\{[^}]*height:\s*24px[^}]*background:\s*transparent/s);
  assert.match(css, /\.list-cell\s*\{[^}]*padding:\s*0 4px[^}]*text-align:\s*left/s);
  assert.match(css, /\.list-icon\s*\{[^}]*inline-size:\s*16px[^}]*block-size:\s*16px/s);
  assert.match(css, /\.list-tile:hover\s+\.list-cell\s*\{[^}]*background:\s*var\(--hover\)/s);
  assert.doesNotMatch(css, /\.list-(?:date-added|last-visit|visit-count)\s*\{[^}]*display:\s*none/s);
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
    style: {},
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    setPointerCapture() {},
    releasePointerCapture() {},
    emit(type, event = {}) {
      this.listeners[type]?.({ target: this, preventDefault() {}, ...event });
    },
  });
  return { document: { createElement: element }, element };
}
