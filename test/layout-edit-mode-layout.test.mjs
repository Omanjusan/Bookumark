import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("provides the layout edit entry and internal-default explanation in the header", () => {
  const header = html.match(/<header>([\s\S]*?)<\/header>/)?.[1] ?? "";
  assert.match(header, /<button[^>]+id="layout-edit-entry"[^>]+disabled[^>]*>レイアウト編集<\/button>/);
  assert.match(header, /id="layout-edit-unavailable"[^>]+role="status"[^>]+hidden/);
});

test("provides an edit bar containing only the active name and exit action", () => {
  const bar = html.match(/<div[^>]+id="layout-edit-bar"[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.match(bar, /id="layout-edit-name"/);
  assert.match(bar, /<button[^>]+id="layout-edit-exit"[^>]*>編集を終了<\/button>/);
  assert.doesNotMatch(bar, /保存|元に戻す|やり直す|削除/);
  assert.match(css, /\.layout-edit-bar\[hidden\]\s*\{[^}]*display:\s*none/);
});
