import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("provides top, left, center, right, and bottom grid regions", () => {
  assert.match(
    html,
    /<div[^>]+id="docking-grid"[^>]+class="docking-grid"[^>]*>[\s\S]*?id="docking-rail-top"[\s\S]*?id="docking-rail-left"[\s\S]*?id="docking-center"[\s\S]*?id="docking-rail-right"[\s\S]*?id="docking-rail-bottom"[\s\S]*?<\/div>/,
  );
});

test("keeps folders, notices, and bookmark content in the center region", () => {
  const center = html.match(/<div[^>]+id="docking-center"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]+id="docking-rail-right"/)?.[1];
  assert.ok(center);
  assert.match(center, /id="folders"[\s\S]*?id="official-move-notice"[\s\S]*?<main id="app">/);
});

test("uses a five-area CSS grid and collapses empty rails", () => {
  assert.match(css, /\.docking-grid\s*\{[^}]*display:\s*grid[^}]*grid-template-areas:[^}]*"top top top"[^}]*"left center right"[^}]*"bottom bottom bottom"/s);
  assert.match(css, /#docking-rail-top\s*\{[^}]*grid-area:\s*top/s);
  assert.match(css, /#docking-rail-left\s*\{[^}]*grid-area:\s*left/s);
  assert.match(css, /#docking-center\s*\{[^}]*grid-area:\s*center/s);
  assert.match(css, /#docking-rail-right\s*\{[^}]*grid-area:\s*right/s);
  assert.match(css, /#docking-rail-bottom\s*\{[^}]*grid-area:\s*bottom/s);
  assert.match(css, /\.dock-rail:empty\s*\{[^}]*display:\s*none/s);
});

test("prevents the center and rail contents from forcing grid overflow", () => {
  assert.match(css, /\.docking-grid\s*\{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\) auto/s);
  assert.match(css, /#docking-center\s*\{[^}]*min-width:\s*0[^}]*min-height:\s*0/s);
});
