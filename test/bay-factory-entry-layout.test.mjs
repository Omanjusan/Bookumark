import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("places the global bay editing entry in the panel header", () => {
  const header = html.match(/<header>([\s\S]*?)<\/header>/)?.[1] ?? "";
  assert.match(header, /<button[^>]+id="bay-factory-entry"[^>]*>ベイを編集<\/button>/);
});

test("defines a hidden selection bar with a blank initial option and disabled edit action", () => {
  assert.match(
    html,
    /<div[^>]+id="bay-factory-selection"[^>]+class="bay-factory-selection"[^>]+hidden[^>]*>[\s\S]*?<select[^>]+id="bay-factory-select"[^>]*>[\s\S]*?<option value="">編集するベイを選択<\/option>[\s\S]*?<\/select>[\s\S]*?<button[^>]+id="bay-factory-open"[^>]+disabled[^>]*>選択したベイを編集<\/button>[\s\S]*?<\/div>/,
  );
});

test("styles the selection bar without adding edit controls to individual bays", () => {
  assert.match(
    css,
    /\.bay-factory-selection\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap/s,
  );
  assert.match(css, /\.bay-factory-selection\[hidden\]\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(html, /class="dock-bay[^>]*>[\s\S]{0,160}bay-factory-open/);
});
