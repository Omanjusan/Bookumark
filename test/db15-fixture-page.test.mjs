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
