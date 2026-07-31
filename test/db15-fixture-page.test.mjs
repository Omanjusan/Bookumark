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
