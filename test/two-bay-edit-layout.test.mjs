import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");
const source = await readFile(new URL("../src/panel/panel.ts", import.meta.url), "utf8");

test("provides the edit canvas, removal area, and persistent action footer", () => {
  assert.match(html, /id="two-bay-edit-canvas"[^>]*hidden[\s\S]*?id="two-bay-chip-toolbox"/);
  assert.match(html, /id="two-bay-chip-removal"[\s\S]*?id="two-bay-edit-confirm"[^>]*disabled[\s\S]*?id="two-bay-edit-cancel"/);
  assert.match(html, /id="two-bay-edit-retry"[^>]*hidden[\s\S]*?id="two-bay-edit-status"/);
});

test("blocks editing surfaces while a failed save candidate is pending", () => {
  assert.match(css, /data-two-bay-edit-blocked="true"[\s\S]*?pointer-events:\s*none/);
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
  assert.match(active, /changeTwoBayVisibleRows/);
  assert.match(active, /renderActiveTwoBayConfiguration\(configuration, \(bay, delta\)[\s\S]*?editSession\.update/);
});

test("styles edit-only controls and the hidden-bay overlay", () => {
  assert.match(css, /\.two-bay-edit-controls\s*\{/);
  assert.match(css, /\.two-bay-hidden-placeholder\s*\{[^}]*position:\s*relative/);
  assert.match(css, /\.two-bay-hidden-overlay\s*\{[^}]*position:\s*absolute/);
});

test("keeps empty rows full-height inside one expanding edit-bay frame", () => {
  assert.match(css, /\.two-bay-row\s*\{[^}]*min-height:\s*38px/);
  assert.match(css, /\.two-bay-edit-rows\s*\{[^}]*gap:\s*0[^}]*border:\s*1px solid var\(--border\)[^}]*border-radius:/);
  assert.match(css, /\.two-bay-edit-rows \.two-bay-row\s*\{[^}]*border:\s*0[^}]*border-radius:\s*0[^}]*background:\s*transparent/);
  assert.doesNotMatch(css, /\.two-bay-edit-rows \.two-bay-row \+ \.two-bay-row\s*\{/);
});

test("connects the data-driven toolbox and add drop to the active draft", () => {
  const active = source.slice(
    source.indexOf("async function loadAndStartPanelRuntime"),
    source.indexOf("export async function loadAndStartLegacyPanelRuntime"),
  );
  assert.match(html, /id="two-bay-chip-toolbox"[^>]*aria-label="チップツールボックス"/);
  assert.match(css, /\.two-bay-toolbox-tabs\s*\{/);
  assert.match(active, /renderTwoBayToolbox\(twoBayChipToolbox\)/);
  assert.match(active, /bindTwoBayToolboxDrag[\s\S]*?editSession\.update[\s\S]*?addTwoBayChip/);
});

test("connects chip move and explicit removal drops to the active draft", () => {
  const active = source.slice(
    source.indexOf("async function loadAndStartPanelRuntime"),
    source.indexOf("export async function loadAndStartLegacyPanelRuntime"),
  );
  assert.match(active, /bindTwoBayChipDrag[\s\S]*?editSession\.update/);
  assert.match(active, /drop\.type === "remove"[\s\S]*?removeTwoBayChip[\s\S]*?moveTwoBayChip/);
});

test("registers mock and information renderers only in the active two-bay view", () => {
  assert.match(source, /createTwoBayMockChipRenderers/);
  assert.match(source, /createTwoBayInformationChipRuntime/);
  assert.match(source, /createDockingChipRendererRegistry\(runtime\.renderers, \{[\s\S]*?createTwoBayMockChipRenderers\(\)[\s\S]*?informationRuntime\.renderers/);
});

test("adopts a successful edit save into the system switch baseline", () => {
  assert.match(source, /onCommitted:[\s\S]*?systemSwitchSession\.adopt\(configuration\)[\s\S]*?renderActiveTwoBayConfiguration/);
});
