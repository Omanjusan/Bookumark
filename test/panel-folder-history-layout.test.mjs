import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("groups folder history controls at the start of the docking bay", () => {
  assert.match(
    html,
    /<div[^>]+class="folder-navigation"[^>]+role="group"[^>]+aria-label="フォルダ履歴"[^>]*>[\s\S]*?id="folder-back"[\s\S]*?id="folder-forward"[\s\S]*?<\/div>/,
  );
  assert.ok(html.indexOf('class="folder-navigation"') < html.indexOf('id="sort-axis"'));
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
