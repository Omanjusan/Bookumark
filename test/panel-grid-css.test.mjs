import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

function ruleBody(selector) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `missing CSS selector: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

test("maps all seven size identifiers to their grid spans", () => {
  const expected = {
    "1/16": [1, 1],
    "1/8": [2, 1],
    "1/4": [2, 2],
    "1/2": [4, 2],
    "1": [4, 4],
    "2": [8, 4],
    "4": [8, 8],
  };

  for (const [size, [columns, rows]] of Object.entries(expected)) {
    const body = ruleBody(`.panel-tile[data-size="${size}"]`);
    assert.match(body, new RegExp(`grid-column:\\s*span ${columns}`));
    assert.match(body, new RegExp(`grid-row:\\s*span ${rows}`));
  }
});

test("uses source order without dense placement", () => {
  const grid = ruleBody(".panel-grid");

  assert.match(grid, /grid-auto-flow:\s*row/);
  assert.doesNotMatch(css, /grid-auto-flow:\s*dense/);
});

test("prevents horizontal scrolling and permits vertical scrolling", () => {
  const grid = ruleBody(".panel-grid");

  assert.match(grid, /overflow-x:\s*hidden/);
  assert.match(grid, /overflow-y:\s*auto/);
});

test("does not animate panel placement or size changes", () => {
  const panelCss = css.slice(css.indexOf("/* パネル表示モード */"));

  assert.doesNotMatch(panelCss, /\banimation\s*:/);
  assert.doesNotMatch(panelCss, /\btransition\s*:/);
});
