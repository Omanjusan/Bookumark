import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("view mode glyph buttons use one fixed footprint", () => {
  assert.match(css, /\.view-type-option span\s*{[^}]*inline-size:\s*32px;[^}]*block-size:\s*28px;/s);
  assert.match(css, /\.view-type-glyph\s*{[^}]*inline-size:\s*18px;[^}]*block-size:\s*18px;/s);
});

test("panel, card, and list glyphs define their requested silhouettes", () => {
  assert.match(css, /\.view-type-glyph--panel\s*{[^}]*mask:/s);
  assert.match(css, /\.view-type-glyph--card\s*{[^}]*clip-path:\s*polygon/s);
  assert.match(css, /\.view-type-glyph--list\s*{[^}]*repeating-linear-gradient/s);
});
