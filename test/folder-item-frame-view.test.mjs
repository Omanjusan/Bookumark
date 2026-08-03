import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  renderFolderItemFrameAllocation,
} from "../dist/panel/lib/folder-item-frame-view.js";
import {
  createFolderFrameRowsState,
  expandFolderFrame,
} from "../dist/panel/lib/folder-item-frame-rows.js";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/panel/panel.ts", import.meta.url), "utf8");

test("renders separate folder and item frames around the allocation controls", () => {
  const folderAt = html.indexOf('id="folder-frame-shell"');
  const controlsAt = html.indexOf('id="folder-item-frame-controls"');
  const itemAt = html.indexOf('id="item-frame-shell"');
  assert.ok(folderAt >= 0 && folderAt < controlsAt && controlsAt < itemAt);
  assert.match(html, /id="expand-folder-frame"[^>]*>フォルダ欄を1段階広げる<\/button>/);
  assert.match(html, /id="expand-item-frame"[^>]*>アイテム欄を1段階広げる<\/button>/);
  assert.match(css, /#docking-center\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/s);
  assert.match(css, /\.folder-frame-shell,[\s\S]*?\.item-frame-shell\s*\{[^}]*border:\s*1px solid var\(--border\)[^}]*background:/s);
  assert.match(css, /\.folder-region\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.item-frame-content\s*\{[^}]*overflow-y:\s*auto/s);
});

test("uses required rows and the viewport quarter while retaining scroll positions", () => {
  const elements = fakeElements();
  elements.folderContent.scrollTop = 17;
  elements.itemContent.scrollTop = 29;

  const result = renderFolderItemFrameAllocation(elements, createFolderFrameRowsState(3), {
    folderCount: 7,
    folderContentWidth: 320,
    availableHeight: 800,
  });

  assert.deepEqual(result, { requiredRows: 4, viewportLimitRows: 4, effectiveRows: 3 });
  assert.equal(elements.folderFrame.style.height, "132px");
  assert.equal(elements.folderContent.scrollTop, 17);
  assert.equal(elements.itemContent.scrollTop, 29);
});

test("keeps one empty row and disables only the requested-row limit", () => {
  const elements = fakeElements();
  renderFolderItemFrameAllocation(elements, createFolderFrameRowsState(1), {
    folderCount: 0,
    folderContentWidth: 900,
    availableHeight: 800,
  });
  assert.equal(elements.folderFrame.style.height, "48px");
  assert.equal(elements.expandFolder.disabled, false);
  assert.equal(elements.expandItem.disabled, true);

  renderFolderItemFrameAllocation(
    elements,
    expandFolderFrame(createFolderFrameRowsState(5)),
    { folderCount: 20, folderContentWidth: 900, availableHeight: 800 },
  );
  assert.equal(elements.expandFolder.disabled, true);
  assert.equal(elements.expandItem.disabled, false);
});

test("connects both controls without rebuilding either content collection", () => {
  assert.match(runtime, /expandFolderFrameButton\.addEventListener\("click"[\s\S]*?expandFolderFrame\(folderFrameRowsState\)[\s\S]*?applyFolderItemFrameLayout\(\)/);
  assert.match(runtime, /expandItemFrameButton\.addEventListener\("click"[\s\S]*?expandItemFrame\(folderFrameRowsState\)[\s\S]*?applyFolderItemFrameLayout\(\)/);
});

function fakeElements() {
  return {
    folderFrame: { style: {} },
    folderContent: { scrollTop: 0 },
    itemContent: { scrollTop: 0 },
    expandFolder: { disabled: false },
    expandItem: { disabled: false },
  };
}
