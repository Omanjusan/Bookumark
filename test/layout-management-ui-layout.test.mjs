import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");

test("provides named layout selection and a dedicated default restore action", () => {
  assert.match(html, /<select[^>]+id="layout-select"[^>]+aria-label="名前付きレイアウト"/);
  assert.match(html, /<button[^>]+id="layout-default"[^>]*>デフォルトに戻す<\/button>/);
  assert.match(html, /<button[^>]+id="layout-manage"[^>]*>レイアウト管理<\/button>/);
});

test("provides blank or source-based creation with both duplication modes", () => {
  assert.match(html, /<dialog[^>]+id="layout-dialog"/);
  assert.match(html, /<input[^>]+id="layout-name"/);
  assert.match(html, /<select[^>]+id="layout-source"/);
  assert.match(html, /<option value="">空白から作成<\/option>/);
  assert.match(html, /name="layout-duplication"[^>]+value="shared"[^>]+checked/);
  assert.match(html, /name="layout-duplication"[^>]+value="independent"/);
});

test("provides create, rename, delete, preference, and close actions", () => {
  for (const id of [
    "layout-create",
    "layout-rename",
    "layout-delete",
    "layout-preferred",
    "layout-retry",
    "layout-dialog-close",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="layout-status"[^>]+role="status"/);
});
