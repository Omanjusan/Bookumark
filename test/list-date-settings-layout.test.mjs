import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("provides the persistent list date settings overlay and locale choices", () => {
  assert.match(html, /id="list-date-settings"[^>]*role="dialog"[^>]*hidden/);
  assert.match(html, /id="list-date-settings-close"[^>]*aria-label="一覧の日付表示設定を閉じる"/);
  assert.match(html, /id="list-date-format"[\s\S]*?value="browser"[\s\S]*?value="iso"[\s\S]*?value="ja-JP"[\s\S]*?value="en-US"[\s\S]*?value="en-GB"[\s\S]*?value="de-DE"/);
  assert.match(css, /\.list-date-settings-button\s*\{[^}]*position:\s*absolute[^}]*inset-inline-end:\s*0/s);
  assert.match(css, /\.list-date-settings\s*\{[^}]*position:\s*fixed/s);
});
