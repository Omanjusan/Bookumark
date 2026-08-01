import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");
const source = await readFile(new URL("../src/panel/panel.ts", import.meta.url), "utf8");

test("provides the persistent system button, menu, and functional settings controls", () => {
  assert.match(html, /id="system-menu-button"[^>]*aria-label="システムメニューを開く"[^>]*>︙<\/button>/);
  assert.match(html, /id="system-menu"[^>]*hidden[\s\S]*?id="system-settings-entry"[\s\S]*?id="system-bay-edit-entry"[^>]*disabled/);
  assert.match(html, /id="two-bay-settings-dialog"[\s\S]*?name="system-bay"[^>]*value="top"[\s\S]*?name="system-bay"[^>]*value="bottom"/);
  assert.match(html, /id="two-bay-reset"[^>]*disabled/);
});

test("fixes the independent system button and menu above every normal surface", () => {
  const button = css.match(/#system-menu-button\s*\{([^}]*)\}/s)?.[1] ?? "";
  const menu = css.match(/#system-menu\s*\{([^}]*)\}/s)?.[1] ?? "";
  for (const rule of [button, menu]) {
    assert.match(rule, /position:\s*fixed/);
    assert.match(rule, /top:/);
    assert.match(rule, /left:/);
    assert.match(rule, /z-index:/);
  }
});

test("connects settings after the active two-bay configuration is rendered", () => {
  const active = source.slice(
    source.indexOf("async function loadAndStartPanelRuntime"),
    source.indexOf("export async function loadAndStartLegacyPanelRuntime"),
  );
  assert.match(active, /createTwoBaySystemSwitchSession\(twoBayState\.configuration/);
  assert.match(active, /bindTwoBaySettings/);
  assert.match(active, /onCommitted:[\s\S]*?renderActiveTwoBayConfiguration/);
});
