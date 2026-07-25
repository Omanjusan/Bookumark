import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("places the search control in one fixed top bay", () => {
  assert.match(
    html,
    /<div[^>]+class="dock-rail dock-rail--top"[^>]+aria-label="上レール"[^>]*>[\s\S]*?<section[^>]+class="dock-bay dock-bay--search"[^>]+aria-label="検索ベイ"[^>]*>[\s\S]*?id="search"[\s\S]*?<\/section>[\s\S]*?<\/div>/,
  );
});

test("places history, sort, and movement controls in separate fixed bottom bays", () => {
  const bottomRail = html.match(
    /<footer[^>]+class="panel-tools dock-rail dock-rail--bottom"[^>]+aria-label="下レール"[^>]*>([\s\S]*?)<\/footer>/,
  )?.[1] ?? "";

  const historyAt = bottomRail.indexOf('aria-label="フォルダ履歴ベイ"');
  const sortAt = bottomRail.indexOf('aria-label="ソートベイ"');
  const movementAt = bottomRail.indexOf('aria-label="移動モードベイ"');
  assert.ok(historyAt >= 0 && historyAt < sortAt && sortAt < movementAt);
  assert.ok(bottomRail.indexOf('id="folder-back"', historyAt) < sortAt);
  assert.ok(bottomRail.indexOf('id="folder-forward"', historyAt) < sortAt);
  assert.ok(bottomRail.indexOf('id="sort-axis"', sortAt) < movementAt);
  assert.ok(bottomRail.indexOf('id="sort-direction"', sortAt) < movementAt);
  assert.ok(bottomRail.indexOf('id="movement-mode"', movementAt) > movementAt);
});

test("fixed bays have visible boundaries and wrap on narrow panels", () => {
  assert.match(css, /\.dock-bay\s*\{[^}]*border:\s*1px solid var\(--border\)[^}]*border-radius:/s);
  assert.match(css, /\.dock-rail--bottom\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /\.dock-bay--search\s*\{[^}]*width:\s*100%/s);
});
