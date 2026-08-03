import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("view mode glyph buttons use one fixed footprint", () => {
  assert.match(css, /\.view-type-option > span\s*{[^}]*inline-size:\s*32px;[^}]*block-size:\s*28px;/s);
  assert.doesNotMatch(css, /\.view-type-option span\s*{/);
  assert.match(css, /\.view-type-glyph\s*{[^}]*inline-size:\s*18px;[^}]*block-size:\s*18px;/s);
});

test("panel, card, and list glyphs define their requested silhouettes", () => {
  assert.match(css, /\.view-type-glyph--panel\s*{[^}]*transform:\s*scale\(\.9\);[^}]*mask:/s);
  assert.match(css, /\.view-type-glyph--icon\s*{[^}]*background:\s*currentColor;[^}]*bookmark\.svg/s);
  assert.match(css, /\.view-type-glyph--card\s*{[^}]*linear-gradient\(45deg/s);
  assert.match(css, /\.view-type-glyph--list\s*{[^}]*transform:\s*scale\(\.9\);[^}]*repeating-linear-gradient/s);
});
