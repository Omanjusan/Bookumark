import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/panel/panel.ts", "utf8");
const css = await readFile("panel/panel.css", "utf8");

test("connects bay-factory selection to the matching live rail bay", () => {
  assert.match(source, /onSelectionChange:\s*\(bayId\)\s*=>\s*highlightBayFactorySelection\(bayId\)/);
  assert.match(source, /bay\.classList\.toggle\("dock-bay--factory-selected", bay\.dataset\.bayId === bayId\)/);
});

test("draws a visible selection outline without changing bay opacity", () => {
  assert.match(css, /\.dock-bay--factory-selected\s*\{[^}]*outline:\s*3px solid var\(--mode-custom\)/s);
  assert.doesNotMatch(css, /\.dock-bay--factory-selected\s*\{[^}]*opacity:/s);
});
