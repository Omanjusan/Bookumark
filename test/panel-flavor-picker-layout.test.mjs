import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("provides one accessible palette surface outside the redrawable panel root", () => {
  const app = html.indexOf('id="app"');
  const picker = html.indexOf('id="panel-flavor-picker"');
  assert.ok(app >= 0 && picker > app);
  assert.match(html, /id="panel-flavor-picker"[^>]+role="dialog"[^>]+hidden/);
  assert.match(html, /id="panel-flavor-picker-title"/);
  assert.match(html, /id="panel-flavor-picker-choices"[^>]+role="radiogroup"/);
});

test("shows the gear on hover or keyboard focus and preserves tiny-panel access", () => {
  assert.match(css, /\.panel-flavor-settings\s*\{[^}]*position:\s*absolute[^}]*opacity:\s*0/s);
  assert.match(css, /\.panel-tile:hover\s+\.panel-flavor-settings[^}]*opacity:\s*1/s);
  assert.match(css, /\.panel-tile:focus-within\s+\.panel-flavor-settings[^}]*opacity:\s*1/s);
  assert.match(css, /\.panel-tile\[data-size="1\/16"\][^}]*\.panel-flavor-settings[^}]*inset:\s*0/s);
  assert.match(css, /\.panel-flavor-picker\s*\{[^}]*position:\s*fixed/s);
});
