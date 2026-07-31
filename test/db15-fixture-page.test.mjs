import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("backs up and opens the generated bookmark folder as the current folder", async () => {
  const source = await readFile("src/dev/db15-fixture-page.ts", "utf8");

  assert.match(source, /const STORAGE_KEYS = \[\.\.\.Object\.values\(DOCKING_STORAGE_KEYS\), "currentFolder"\]/);
  assert.match(source, /currentFolder: \{ guid: root\.id, ancestorGuids: \[\] \}/);
  assert.match(source, /browser\.bookmarks\.getChildren\(backup\.fixtureRootId\)/);
  assert.match(source, /browser\.tabs\.create\(\{ url: browser\.runtime\.getURL\("panel\/panel\.html"\) \}\)/);
});

test("adds an idempotent child folder for official cross-folder D&D", async () => {
  const html = await readFile("dev/db15-fixture.html", "utf8");
  const source = await readFile("src/dev/db15-fixture-page.ts", "utf8");

  assert.match(html, /id="official-dnd-fixture"[^>]*>公式整理D&D用フォルダを準備</);
  assert.match(source, /const OFFICIAL_DND_FOLDER_TITLE = "DB15 公式整理 移動先"/);
  assert.match(source, /children\.some\(\s*\(child\) => child\.type === "folder"/);
  assert.match(source, /browser\.bookmarks\.create\(\{[\s\S]*parentId: backup\.fixtureRootId,[\s\S]*title: OFFICIAL_DND_FOLDER_TITLE/);
});

test("switches installed docking data to a long recovery notification fixture", async () => {
  const html = await readFile("dev/db15-fixture.html", "utf8");
  const source = await readFile("src/dev/db15-fixture-page.ts", "utf8");

  assert.match(html, /id="long-notification-fixture"[^>]*>長文通知fixtureへ切替</);
  assert.match(source, /createDb15LongNotificationFixture/);
  assert.match(source, /saveFixtureDocuments\(createDb15LongNotificationFixture\(\)\)/);
});

test("groups fixture actions around two splitters and labels the panel launch action", async () => {
  const html = await readFile("dev/db15-fixture.html", "utf8");

  assert.match(
    html,
    /<section[^>]+aria-label="fixtureの投入と復元"[^>]*>[\s\S]*?id="install"[\s\S]*?id="restore"[\s\S]*?<\/section>\s*<hr>\s*<section[^>]+aria-label="fixtureメニュー"[^>]*>[\s\S]*?id="edit-fixture"[\s\S]*?id="load-fixture"[\s\S]*?id="official-dnd-fixture"[\s\S]*?id="long-notification-fixture"[\s\S]*?<\/section>\s*<hr>\s*<section[^>]+aria-label="アドオン起動"[^>]*>[\s\S]*?id="open"[^>]*>アドオン実行<\/button>[\s\S]*?<\/section>/,
  );
  assert.match(html, /\.fixture-actions\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*wrap/s);
});

test("prepares and clears one-shot DB-16 failure switches independently", async () => {
  const html = await readFile("dev/db15-fixture.html", "utf8");
  const source = await readFile("src/dev/db15-fixture-page.ts", "utf8");
  const switches = await readFile("src/dev/db16-failure-switch.ts", "utf8");

  assert.match(html, /id="fail-initial-load-once"[^>]*>次回の初期読み込みを失敗</);
  assert.match(html, /id="fail-custom-order-save-once"[^>]*>次回の表示順保存を失敗</);
  assert.match(html, /id="clear-db16-failures"[^>]*>失敗スイッチを解除</);
  assert.match(source, /prepareDb16FailureSwitch\("initialLoad"\)/);
  assert.match(source, /prepareDb16FailureSwitch\("customOrderSave"\)/);
  assert.match(source, /clearDb16FailureSwitches\(\)/);
  assert.match(switches, /\[name\]: true/);
  assert.match(switches, /\[name\]: false/);
  assert.match(switches, /storage\.remove\(DB16_FAILURE_SWITCH_KEY\)/);
  const restoreHandler = source.match(
    /restore\.addEventListener\([\s\S]*?\n\}\)\);\n\nopen\.addEventListener/,
  )?.[0] ?? "";
  assert.doesNotMatch(restoreHandler, /DB16_FAILURE_SWITCH_KEY/);
});

test("injects one-shot DB-16 failures before panel startup in development only", async () => {
  const build = await readFile("scripts/build.mjs", "utf8");
  const source = await readFile("src/dev/db16-failure-fixture.ts", "utf8");
  const switches = await readFile("src/dev/db16-failure-switch.ts", "utf8");

  assert.match(build, /db16-failure-fixture\.js/);
  assert.match(build, /db16-failure-fixture\.js[\s\S]*panel\.js/);
  assert.match(source, /consumeDb16FailureSwitch\("initialLoad"[\s\S]*throw new Error/);
  assert.match(source, /consumeDb16FailureSwitch\("customOrderSave"[\s\S]*throw new Error/);
  assert.match(switches, /\[name\]: false[\s\S]*return true/);
  assert.match(source, /orderByFolder/);
});

test("keeps DB-16 fixture UI and execution code out of production output", async () => {
  const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8"));
  const panel = await readFile("dist/panel/panel.html", "utf8");
  const runtime = await readFile("dist/panel/panel.js", "utf8");

  assert.equal(manifest.options_ui, undefined);
  assert.equal(manifest.background, undefined);
  assert.doesNotMatch(panel, /db16-failure-fixture|fail-initial-load-once|fail-custom-order-save-once/);
  assert.doesNotMatch(runtime, /db16FailureSwitch|DB16 fixture/);
});
