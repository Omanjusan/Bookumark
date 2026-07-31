import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("wraps header actions without collapsing labels vertically", () => {
  assert.match(css, /header\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /header button\s*\{[^}]*white-space:\s*nowrap/s);
});

test("keeps each horizontal bay at intrinsic width inside vertically stacking top rail", () => {
  assert.match(css, /\.dock-bay--horizontal\s*\{[^}]*flex:\s*none/s);
  assert.match(css, /\.dock-rail--top\s*\{[^}]*flex-direction:\s*column[^}]*overflow-y:\s*auto/s);
});

test("uses a replaceable 96 percent window width without the legacy 640px cap", () => {
  assert.match(css, /:root\s*\{[^}]*--panel-frame-width:\s*96%/s);
  assert.match(css, /\.frame\s*\{[^}]*width:\s*var\(--panel-frame-width\)[^}]*max-width:\s*none/s);
  assert.doesNotMatch(css, /\.frame\s*\{[^}]*max-width:\s*640px/s);
});

test("caps all rails while preserving a shrinkable 270px center preference", () => {
  assert.match(
    css,
    /\.docking-grid\s*\{[^}]*grid-template-columns:\s*fit-content\(20%\)\s+minmax\(min\(270px,\s*100%\),\s*1fr\)\s+fit-content\(20%\)/s,
  );
  assert.match(css, /\.dock-rail--top\s*\{[^}]*max-height:\s*25vh/s);
  assert.match(css, /\.dock-rail--bottom\s*\{[^}]*max-height:\s*25vh/s);
  assert.match(css, /\.dock-rail--left\s*\{[^}]*min-width:\s*0/s);
  assert.match(css, /\.dock-rail--right\s*\{[^}]*min-width:\s*0/s);
});

test("allows the document to shrink below the old 360px body floor", () => {
  assert.doesNotMatch(css, /body\s*\{[^}]*min-width:\s*360px/s);
});

test("caps horizontal bays and scrolls only their overlong contents", () => {
  assert.match(
    css,
    /\.dock-bay--horizontal\s*\{[^}]*max-width:\s*100%[^}]*overflow-x:\s*auto[^}]*overflow-y:\s*hidden/s,
  );
});

test("caps vertical bays to the viewport and scrolls only their overlong contents", () => {
  assert.match(
    css,
    /\.dock-bay--vertical\s*\{[^}]*max-height:\s*var\(--dock-side-rail-max-height,\s*100vh\)[^}]*overflow-x:\s*hidden[^}]*overflow-y:\s*auto/s,
  );
  assert.match(css, /\.dock-chip--vertical-viewport\s*\{[^}]*flex:\s*none/s);
});
