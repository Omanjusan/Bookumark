import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/panel/panel.ts", import.meta.url), "utf8");

test("routes active panel startup through the independent two-bay boundary", () => {
  const activeStartup = functionSection("loadAndStartPanelRuntime", "loadAndStartLegacyPanelRuntime");

  assert.match(activeStartup, /loadPanelTwoBayState\(\)/);
  assert.match(activeStartup, /renderActiveTwoBayConfiguration\(twoBayState\.configuration\)/);
  assert.match(source, /dataset\.twoBaySystemBay = configuration\.systemBay/);
  assert.doesNotMatch(activeStartup, /loadPanelDockingState/);
  assert.doesNotMatch(activeStartup, /runPanelDockingStartup/);
  assert.doesNotMatch(activeStartup, /saveDockingDocuments/);
  assert.doesNotMatch(activeStartup, /rebuildActiveDockingLayout/);
  assert.doesNotMatch(activeStartup, /bindLayoutManagement/);
});

test("loads and repairs flavor preferences before publishing the first panel render", () => {
  const activeStartup = functionSection("loadAndStartPanelRuntime", "loadAndStartLegacyPanelRuntime");

  assert.match(activeStartup, /loadPanelFlavorPreferences\(\)/);
  assert.match(activeStartup, /preparePanelFlavorPreferences\([^;]*candidateTreeItems/s);
  assert.match(activeStartup, /if \(candidateFlavorState\.changed\)[\s\S]*?savePanelFlavorPreferences/);
  assert.match(activeStartup, /panelFlavorPreferences = candidateFlavorState\.preferences/);
  assert.match(source, /renderPanelGrid\([^;]*flavorPreferences:\s*panelFlavorPreferences/s);

  const publish = activeStartup.indexOf("panelFlavorPreferences = candidateFlavorState.preferences");
  const save = activeStartup.indexOf("savePanelFlavorPreferences");
  assert.ok(save >= 0 && save < publish);
});

test("connects panel gears to the shared flavor picker and persists successful choices", () => {
  assert.match(source, /bindPanelFlavorPicker\(/);
  assert.match(source, /onFlavorSettings:\s*\([^)]*\)\s*=>\s*panelFlavorPicker\.open/);
  assert.match(source, /setPanelFlavorOverride\(panelFlavorPreferences/);
  assert.match(source, /await savePanelFlavorPreferences\(candidate\)/);
  assert.match(source, /panelFlavorPreferences = candidate;[\s\S]*?redraw\(\)/);
});

test("keeps the legacy startup frozen and outside the initial-load controller", () => {
  assert.match(source, /export async function loadAndStartLegacyPanelRuntime/);
  assert.match(source, /load:\s*loadAndStartPanelRuntime/);
  assert.doesNotMatch(source, /load:\s*loadAndStartLegacyPanelRuntime/);
});

test("removes every legacy layout and bay-management entry point from the active surface", () => {
  assert.match(source, /function disconnectLegacyDockingSurface/);
  assert.match(source, /layoutSelect,[\s\S]*?layoutManage,[\s\S]*?layoutEditEntry/);
  assert.match(source, /bayFactoryAdd,[\s\S]*?bayFactoryEntry,[\s\S]*?bayFactorySelection/);
  assert.match(source, /layoutDialog,[\s\S]*?bayFactoryDialog/);
  assert.match(source, /frameRoot\.dataset\.dockingRuntime = "two-bay"/);
  assert.match(source, /disconnectLegacyDockingSurface\(\);[\s\S]*?initialLoadController\.start\(\)/);
});

function functionSection(startName, endName) {
  const start = source.indexOf(`async function ${startName}`);
  const end = source.indexOf(`export async function ${endName}`);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  assert.ok(start < end);
  return source.slice(start, end);
}
