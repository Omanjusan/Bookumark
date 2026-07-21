import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("places the folder region outside and before the bookmark grid", () => {
  const foldersAt = html.indexOf('id="folders"');
  const appAt = html.indexOf('id="app"');

  assert.notEqual(foldersAt, -1);
  assert.ok(foldersAt < appAt);
  assert.match(html, /id="folders"[^>]*aria-label="フォルダ"/);
});

test("gives folders a fixed-size wrapping button layout", () => {
  assert.match(css, /\.folder-region\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /\.folder-button\s*\{[^}]*width:\s*144px[^}]*height:\s*36px/s);
});
