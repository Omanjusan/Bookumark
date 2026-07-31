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
