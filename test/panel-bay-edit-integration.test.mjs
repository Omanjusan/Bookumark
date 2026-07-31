import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/panel/panel.ts", "utf8");

test("renders every production chip record in the bay-factory tool selector", () => {
  assert.match(source, /renderChipToolSelector\(chipToolList, CURRENT_DOCKING_CHIP_RECORDS\.map/);
  assert.doesNotMatch(source, /renderChipToolSelector\(chipToolList, \[\]\)/);
});

test("routes both D&D sources through the active bay edit transaction", () => {
  assert.match(source, /activeBayEditTransaction\?\.handleToolDrop\(drop\)/);
  assert.match(source, /activeBayEditTransaction\?\.handleChipChange\(change\)/);
});

test("opens a persistent bay edit session and rebuilds runtime after save", () => {
  assert.match(source, /createBayEditSession\([\s\S]*?saveDocument:\s*async \(bayConfigurations\)/);
  assert.match(source, /bindBayEditTransaction\(session/);
  assert.match(source, /rebuildActiveDockingLayout\(documents, evaluatedState\)/);
});

test("opens new bays through the same edit transaction and formalizes them on save", () => {
  assert.match(source, /onStartEditing:\s*\(draft\)\s*=>\s*beginNewBayEditing\?\.\(draft\)/);
  assert.match(source, /saveNewBayConfiguration\(/);
  assert.match(source, /createBayEditSession\(\s*temporaryBayConfigurations/);
});
