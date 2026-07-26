import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("defines one labelled native dialog with only a top-right close control", () => {
  assert.match(
    html,
    /<dialog[^>]+id="bay-factory-dialog"[^>]+aria-labelledby="bay-factory-title"[^>]*>/,
  );
  assert.match(
    html,
    /<h2[^>]+id="bay-factory-title"[^>]*>ベイ工場<\/h2>[\s\S]*?<button[^>]+id="bay-factory-close"[^>]+aria-label="ベイ工場を閉じる"[^>]*>×<\/button>/,
  );
  const dialog = html.match(/<dialog[^>]+id="bay-factory-dialog"[\s\S]*?<\/dialog>/)?.[0] ?? "";
  assert.doesNotMatch(dialog, />キャンセル</);
  assert.doesNotMatch(dialog, />閉じる</);
  assert.doesNotMatch(dialog, /<footer/);
});

test("places the static menu actions in the agreed order and disables editing", () => {
  const menu = html.match(
    /<div[^>]+class="bay-factory-menu"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]+class="bay-factory-workspace"/,
  )?.[1] ?? "";
  const ids = [
    "bay-factory-name",
    "bay-factory-undo",
    "bay-factory-redo",
    "bay-factory-save",
    "bay-factory-duplicate",
    "bay-factory-delete",
  ];
  let previous = -1;
  for (const id of ids) {
    const position = menu.indexOf(`id="${id}"`);
    assert.ok(position > previous, `${id} must follow the previous menu control`);
    assert.match(menu.slice(position, menu.indexOf(">", position)), /disabled/);
    previous = position;
  }
});

test("reserves a chip tool area beside exactly one horizontal bay editor", () => {
  assert.match(
    html,
    /<aside[^>]+id="bay-factory-tools"[^>]+class="bay-factory-tools"[^>]+aria-label="チップツール"[^>]*>[\s\S]*?id="chip-tool-list"[\s\S]*?<\/aside>/,
  );
  assert.equal((html.match(/id="bay-factory-editor"/g) ?? []).length, 1);
  assert.match(
    html,
    /<section[^>]+id="bay-factory-editor"[^>]+class="bay-factory-editor"[^>]+aria-label="横ベイ編集領域"[^>]*><\/section>/,
  );
});

test("sizes the dialog within the viewport and adapts its workspace on narrow panels", () => {
  assert.match(
    css,
    /\.bay-factory-dialog\s*\{[^}]*width:\s*min\(600px,\s*calc\(100vw - 24px\)\)[^}]*max-height:\s*calc\(100vh - 24px\)/s,
  );
  assert.match(css, /\.bay-factory-dialog::backdrop\s*\{/);
  assert.match(
    css,
    /\.bay-factory-workspace\s*\{[^}]*grid-template-columns:\s*92px minmax\(0,\s*1fr\)/s,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*440px\)\s*\{[\s\S]*?\.bay-factory-dialog\s*\{[^}]*width:\s*calc\(100vw - 12px\)[^}]*max-height:\s*calc\(100vh - 12px\)/s,
  );
});

test("styles text chips and keeps the horizontal editor scrollable", () => {
  assert.match(
    css,
    /\.bay-factory-bay-preview\s*\{[^}]*display:\s*flex[^}]*overflow-x:\s*auto/s,
  );
  assert.match(
    css,
    /\.bay-factory-chip\s*\{[^}]*white-space:\s*nowrap/s,
  );
});
