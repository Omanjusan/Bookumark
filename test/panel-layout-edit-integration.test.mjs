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

test("evaluates Docking shared state before rebuilding the panel runtime", () => {
  assert.match(source, /buildDockingChipApplicationOrder/);
  assert.match(source, /evaluateDockingSharedStateConditions/);
  assert.match(source, /createDefaultDockingSharedState/);
  assert.match(source, /docking condition evaluation failed/);
});

test("connects startup recovery and condition failures to common notifications", () => {
  assert.match(source, /runPanelDockingStartup/);
  assert.match(source, /presentStartupDialog/);
  assert.match(source, /createDockingConditionFailureNotification/);
  assert.match(source, /notificationQueue\.enqueueToast/);
  assert.match(source, /saveDockingDocuments/);
});

test("routes basic chip changes through the validated shared control store", () => {
  assert.match(source, /createDockingBasicControlStore/);
  assert.match(source, /updateDockingControl\("search", nextQuery\)/);
  assert.match(source, /updateDockingControl\("visit-status", value\)/);
  assert.match(source, /updateDockingControl\("view-type", viewType\)/);
  assert.match(source, /updateDockingControl\("movement-mode", mode\)/);
});

test("wraps placement saves in reload reevaluation and commits without runtime reconnect", () => {
  assert.match(source, /createDockingSaveReevaluationSession/);
  assert.match(source, /saveReevaluation\.run\(\(\) => request\)/);
  assert.match(source, /editRuntimeCoordinator\?\.commit\(reevaluated\)/);
  assert.match(source, /storage reload failed after Docking save/);
});

test("delegates editing previews and exit reconnect to the runtime coordinator", () => {
  assert.match(source, /createDockingEditRuntimeCoordinator/);
  assert.match(source, /editRuntimeCoordinator\?\.enter\(documents\)/);
  assert.match(source, /editRuntimeCoordinator\?\.preview\(activePlacementDraft\.documents\(\)\)/);
  assert.match(source, /editRuntimeCoordinator\?\.exit\(\)/);
});
