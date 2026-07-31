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

test("provides the complete layout edit action bar", () => {
  const bar = html.match(/<div[^>]+id="layout-edit-bar"[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.match(bar, /id="layout-edit-name"/);
  assert.match(bar, /id="layout-edit-unsaved"[^>]+hidden[^>]*>未保存<\/span>/);
  assert.match(bar, /<button[^>]+id="layout-edit-undo"[^>]+disabled[^>]*>元に戻す<\/button>/);
  assert.match(bar, /<button[^>]+id="layout-edit-redo"[^>]+disabled[^>]*>やり直す<\/button>/);
  assert.match(bar, /<button[^>]+id="layout-edit-save"[^>]+disabled[^>]*>保存<\/button>/);
  assert.match(bar, /<button[^>]+id="layout-edit-retry"[^>]+hidden[^>]*>保存を再試行<\/button>/);
  assert.match(bar, /<button[^>]+id="layout-edit-delete"[^>]*>削除<\/button>/);
  assert.match(bar, /<button[^>]+id="layout-edit-exit"[^>]*>編集を終了<\/button>/);
  assert.match(css, /\.layout-edit-bar\[hidden\]\s*\{[^}]*display:\s*none/);
  assert.match(css, /\.layout-edit-unsaved\s*\{[^}]*color:\s*var\(--mode-directory\)/s);
  assert.match(bar, /id="layout-edit-status"[^>]+role="status"[^>]+aria-live="polite"/);
});

test("provides the specified unsaved-exit confirmation outside the edit bar", () => {
  assert.match(
    html,
    /id="layout-edit-discard-confirmation"[^>]+role="alertdialog"[^>]+hidden[\s\S]*?未保存の変更があります/,
  );
  assert.match(html, /id="layout-edit-continue"[^>]*>編集を続ける<\/button>/);
  assert.match(html, /id="layout-edit-discard"[^>]*>変更を破棄<\/button>/);
  assert.match(
    css,
    /\.layout-edit-discard-confirmation\[hidden\]\s*\{[^}]*display:\s*none/,
  );
});

test("collapses normal center content while preserving the editing grid", () => {
  assert.match(
    css,
    /\.frame\[data-layout-editing="true"\]\s+#docking-center\s*\{[^}]*display:\s*none/s,
  );
  assert.doesNotMatch(css, /\.frame\[data-layout-editing="true"\]\s+#layout-bay-trash/);
});
