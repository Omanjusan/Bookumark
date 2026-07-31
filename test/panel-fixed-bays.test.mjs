import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/panel/lib/docking-basic-chip-runtime.ts", import.meta.url), "utf8");

test("keeps four rail roots free of fixed control DOM", () => {
  assert.match(html, /id="docking-rail-top"[^>]*><\/div>/);
  assert.match(html, /id="docking-rail-left"[^>]*><\/div>/);
  assert.match(html, /id="docking-rail-right"[^>]*><\/div>/);
  assert.match(html, /id="docking-rail-bottom"[^>]*><\/footer>/);
  assert.doesNotMatch(html, /id="(?:search|visit-status-filter|folder-back|sort-axis|view-type|movement-mode)"/);
});

test("registers the six former fixed controls as dynamic renderers", () => {
  for (const chipType of ["search", "visit-status", "folder-history", "sort", "view-type", "movement-mode"]) {
    assert.match(runtime, new RegExp(`(?:"${chipType}"|${chipType}):\\s*render`));
  }
});

test("fixed bays have visible boundaries and bottom bays stack inward", () => {
  assert.match(css, /\.dock-bay\s*\{[^}]*border:\s*1px solid var\(--border\)[^}]*border-radius:/s);
  assert.match(css, /\.dock-rail--bottom\s*\{[^}]*flex-direction:\s*column-reverse/s);
  assert.match(css, /\.dock-bay--search\s*\{[^}]*width:\s*100%/s);
});
