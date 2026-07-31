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
