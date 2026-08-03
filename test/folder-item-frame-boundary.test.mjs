import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");
const folderView = await readFile(
  new URL("../src/panel/lib/panel-folder-view.ts", import.meta.url),
  "utf8",
);

test("keeps both one-row frames reachable on a very short viewport", () => {
  assert.match(css, /\.frame\[data-docking-runtime="two-bay"\]\s+#docking-center\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.folder-frame-shell,[\s\S]*?\.item-frame-shell\s*\{[^}]*min-height:\s*48px/s);
  assert.match(css, /\.folder-frame-shell\s*\{[^}]*flex:\s*none/s);
  assert.match(css, /\.item-frame-shell\s*\{[^}]*flex:\s*1 1 auto/s);
});

test("wraps allocation controls and reserves stable internal scrollbars", () => {
  assert.match(css, /\.folder-item-frame-controls\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /\.folder-region\s*\{[^}]*scrollbar-gutter:\s*stable/s);
  assert.match(css, /\.item-frame-content\s*\{[^}]*scrollbar-gutter:\s*stable/s);
});

test("keeps empty frames natural and leaves creation features unimplemented", () => {
  assert.match(folderView, /root\.textContent = "";\s*root\.hidden = false;/);
  assert.doesNotMatch(html, /新規フォルダ|フォルダを作成|新規アイテム|アイテムを作成/);
});

test("contains every URL view inside the item frame while folders stay outside", () => {
  const folderFrameEnd = html.indexOf("</section>", html.indexOf('id="folder-frame-shell"'));
  const itemFrameStart = html.indexOf('id="item-frame-shell"');
  const app = html.indexOf('id="app"');
  assert.ok(folderFrameEnd < itemFrameStart && itemFrameStart < app);
  assert.match(html, /id="item-frame-shell"[\s\S]*?<main id="app"[^>]*class="item-frame-content"/);
});
