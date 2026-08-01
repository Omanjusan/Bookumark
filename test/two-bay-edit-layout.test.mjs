import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");
const source = await readFile(new URL("../src/panel/panel.ts", import.meta.url), "utf8");

test("provides the edit canvas, removal area, and persistent action footer", () => {
  assert.match(html, /id="two-bay-edit-canvas"[^>]*hidden[\s\S]*?id="two-bay-chip-toolbox"/);
  assert.match(html, /id="two-bay-chip-removal"[\s\S]*?id="two-bay-edit-confirm"[^>]*disabled[\s\S]*?id="two-bay-edit-cancel"/);
});

test("hides normal center content and scrolls only the minimum-sized edit canvas", () => {
  assert.match(css, /data-two-bay-editing="true"[^}]*#folders[\s\S]*?display:\s*none/);
  assert.match(css, /\.two-bay-edit-scroll\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(css, /\.two-bay-edit-canvas\s*\{[^}]*min-width:\s*640px[^}]*min-height:\s*360px/);
  assert.match(css, /\.two-bay-edit-footer\s*\{[^}]*position:\s*sticky[^}]*bottom:\s*0/);
});

test("connects the edit session to the active two-bay runtime", () => {
  const active = source.slice(
    source.indexOf("async function loadAndStartPanelRuntime"),
    source.indexOf("export async function loadAndStartLegacyPanelRuntime"),
  );
  assert.match(active, /createTwoBayEditSession\(\)/);
  assert.match(active, /bindTwoBayEditMode/);
  assert.match(active, /getConfiguration:[\s\S]*?systemSwitchSession\.committed/);
});

