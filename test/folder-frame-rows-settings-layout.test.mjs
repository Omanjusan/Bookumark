import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/panel/panel.ts", import.meta.url), "utf8");

test("provides a top-right folder settings route without a heading row", () => {
  assert.match(html, /id="folder-frame-shell"[\s\S]*?id="folder-frame-settings"[^>]*aria-label="フォルダ欄の既定段数を設定"[\s\S]*?id="folders"/);
  assert.match(css, /\.folder-frame-shell\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /\.folder-frame-settings-button\s*\{[^}]*position:\s*absolute[^}]*inset-block-start:\s*0[^}]*inset-inline-end:\s*0/s);
});

test("provides the agreed one-to-five spinbox modal", () => {
  assert.match(html, /<dialog[^>]*id="folder-frame-rows-settings"[^>]*aria-labelledby="folder-frame-rows-settings-title"/);
  assert.match(html, /id="folder-frame-rows-settings-close"[^>]*aria-label="フォルダ欄の設定を確定して閉じる"/);
  assert.match(html, /id="folder-frame-rows-decrease"[\s\S]*?id="folder-frame-default-rows"[^>]*type="number"[^>]*min="1"[^>]*max="5"[^>]*step="1"[^>]*readonly[\s\S]*?id="folder-frame-rows-increase"/);
  assert.doesNotMatch(html, /id="folder-frame-rows-settings-confirm"/);
  assert.match(css, /\.folder-frame-rows-settings\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /\.folder-frame-rows-settings::backdrop\s*\{[^}]*background:/s);
});

test("loads normalized preferences before publishing runtime and connects successful saves", () => {
  assert.match(runtime, /loadFolderFrameRowPreferences\(\)/);
  assert.match(runtime, /normalizeFolderFrameRowPreferences\(/);
  assert.match(runtime, /candidateFolderFrameRowPreferences\.changed[\s\S]*?await saveFolderFrameRowPreferences/);
  assert.match(runtime, /await saveFolderFrameRowPreferences\(candidate\);[\s\S]*?setDefaultFolderFrameRows/);
});
