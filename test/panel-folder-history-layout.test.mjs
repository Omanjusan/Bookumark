import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/panel/lib/docking-basic-chip-runtime.ts", import.meta.url), "utf8");

test("groups folder history controls in the dynamic chip", () => {
  assert.doesNotMatch(html, /class="folder-navigation"/);
  assert.match(runtime, /folder-navigation/);
  assert.match(runtime, /"aria-label", "フォルダ履歴"/);
});

test("keeps the horizontal navigation group on the left of the remaining tools", () => {
  assert.match(
    css,
    /\.folder-navigation\s*\{[^}]*display:\s*inline-flex[^}]*margin-right:\s*auto/s,
  );
  assert.match(
    css,
    /\.folder-navigation\s*>\s*button\s*\{[^}]*inline-size:\s*30px[^}]*block-size:\s*30px/s,
  );
});
