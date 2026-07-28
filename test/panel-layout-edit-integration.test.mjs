import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/panel/panel.ts", import.meta.url), "utf8");

test("connects the panel to precise insertion drop instead of the coarse rail-end drop", () => {
  assert.match(source, /import \{ bindBayRailInsertionDrop \} from "\.\/lib\/bay-rail-insertion-drop\.js"/);
  assert.match(
    source,
    /bindBayRailInsertionDrop\([\s\S]*?\(\{ bayId, rail, index \}\)[\s\S]*?moveToRailPosition\(bayId, rail, index\)/,
  );
  assert.doesNotMatch(source, /bindBayRailDrop|moveToRailEnd\(bayId, rail\)/);
});

test("routes edit-bar deletion through named-layout deletion and finishes with its restored active state", () => {
  assert.match(source, /onDelete:\s*\(\) => \{ void deleteActiveLayout\(\); \}/);
  assert.match(source, /layoutCoordinator\.delete\(activeLayoutId\)/);
  assert.match(source, /layoutManagementConnection\.replaceDocuments\(deletedDocuments\)/);
  assert.match(source, /layoutEditMode\.finishWithDocuments\(deletedDocuments\)/);
});

test("hands a pending deletion retry to layout management when editing exits", () => {
  assert.match(
    source,
    /onExit:[\s\S]*?layoutCoordinator\.pending[\s\S]*?layoutManagementConnection\.showPendingRetry/,
  );
});
