import test from "node:test";
import assert from "node:assert/strict";

import {
  FOLDER_FRAME_ROW_PREFERENCES_STORAGE_KEY,
  loadFolderFrameRowPreferences,
  normalizeFolderFrameRowPreferences,
  saveFolderFrameRowPreferences,
} from "../dist/panel/lib/folder-frame-row-preferences.js";

test("normalizes missing and malformed rows to the agreed three-row default", () => {
  for (const candidate of [
    undefined,
    null,
    {},
    { version: 2, defaultRows: 4 },
    { version: 1, defaultRows: 0 },
    { version: 1, defaultRows: 6 },
    { version: 1, defaultRows: 2.5 },
    { version: 1, defaultRows: "3" },
  ]) {
    assert.deepEqual(normalizeFolderFrameRowPreferences(candidate), {
      preferences: { version: 1, defaultRows: 3 },
      changed: true,
    });
  }
});

test("accepts only complete version-one preferences in the one-to-five range", () => {
  for (const defaultRows of [1, 2, 3, 4, 5]) {
    assert.deepEqual(normalizeFolderFrameRowPreferences({ version: 1, defaultRows }), {
      preferences: { version: 1, defaultRows },
      changed: false,
    });
  }
  assert.equal(normalizeFolderFrameRowPreferences({
    version: 1, defaultRows: 4, extra: true,
  }).changed, true);
});

test("loads and saves the dedicated preference defensively", async () => {
  const stored = { version: 1, defaultRows: 4 };
  const writes = [];
  globalThis.browser = { storage: { local: {
    get: async (keys) => {
      assert.deepEqual(keys, [FOLDER_FRAME_ROW_PREFERENCES_STORAGE_KEY]);
      return { [FOLDER_FRAME_ROW_PREFERENCES_STORAGE_KEY]: stored };
    },
    set: async (value) => writes.push(value),
  } } };

  assert.equal(await loadFolderFrameRowPreferences(), stored);
  await saveFolderFrameRowPreferences(stored);
  stored.defaultRows = 1;

  assert.deepEqual(writes, [{
    [FOLDER_FRAME_ROW_PREFERENCES_STORAGE_KEY]: { version: 1, defaultRows: 4 },
  }]);
});
