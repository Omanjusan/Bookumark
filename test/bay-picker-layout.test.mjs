import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("places two labelled picker rows above the four-rail grid", () => {
  const pickerIndex = html.indexOf('id="bay-picker"');
  const gridIndex = html.indexOf('id="docking-grid"');
  assert.ok(pickerIndex >= 0 && pickerIndex < gridIndex);
  assert.match(html, /id="bay-picker-unplaced-title">未配置<\/h2>[\s\S]*id="bay-picker-unplaced"/);
  assert.match(html, /id="bay-picker-placed-title">配置済み<\/h2>[\s\S]*id="bay-picker-placed"/);
});

test("keeps both picker rows horizontal and independently scrollable", () => {
  assert.match(
    css,
    /\.bay-picker-row\s*\{[^}]*display:\s*flex[^}]*overflow-x:\s*auto[^}]*overflow-y:\s*hidden/s,
  );
  assert.match(css, /\.bay-picker\[hidden\]\s*\{[^}]*display:\s*none/);
});

test("keeps empty rails visible as coarse drop areas only while editing", () => {
  assert.match(css, /\.frame\[data-layout-editing="true"\] \.dock-rail:empty\s*\{[^}]*display:\s*flex/);
  assert.match(css, /\.dock-rail--top:empty,[\s\S]*?min-height:\s*34px/);
  assert.match(css, /\.dock-rail--left:empty,[\s\S]*?min-width:\s*34px[^}]*min-height:\s*96px/);
});
