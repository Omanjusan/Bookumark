import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_LIST_COLUMN_WIDTHS,
  LIST_COLUMN_IDS,
  LIST_COLUMN_MIN_WIDTHS,
  LIST_COLUMN_WIDTH_PREFERENCES_STORAGE_KEY,
  loadListColumnWidthPreferences,
  normalizeListColumnWidthPreferences,
  saveListColumnWidthPreferences,
  setListColumnWidth,
} from "../dist/panel/lib/list-column-width-preferences.js";

test("defines the agreed initial and minimum widths", () => {
  assert.deepEqual(LIST_COLUMN_IDS, [
    "icon", "title", "dateAdded", "lastVisitTime", "visitCount",
  ]);
  assert.deepEqual(LIST_COLUMN_MIN_WIDTHS, {
    icon: 24, title: 60, dateAdded: 64, lastVisitTime: 64, visitCount: 36,
  });
  assert.deepEqual(DEFAULT_LIST_COLUMN_WIDTHS, {
    icon: 24, title: 292, dateAdded: 160, lastVisitTime: 160, visitCount: 84,
  });
});

test("normalizes missing, invalid, and undersized stored widths", () => {
  assert.deepEqual(normalizeListColumnWidthPreferences(undefined), {
    preferences: { version: 1, widths: DEFAULT_LIST_COLUMN_WIDTHS },
    changed: true,
  });
  assert.deepEqual(normalizeListColumnWidthPreferences({
    version: 1,
    widths: {
      icon: 12,
      title: 100,
      dateAdded: Number.NaN,
      lastVisitTime: 200.5,
      visitCount: 20,
      unknown: 999,
    },
  }), {
    preferences: {
      version: 1,
      widths: { icon: 24, title: 100, dateAdded: 160, lastVisitTime: 200.5, visitCount: 36 },
    },
    changed: true,
  });
});

test("updates only the selected column and clamps it to its minimum", () => {
  const preferences = { version: 1, widths: { ...DEFAULT_LIST_COLUMN_WIDTHS } };
  const widened = setListColumnWidth(preferences, "title", 360);
  const clamped = setListColumnWidth(widened, "lastVisitTime", 10);

  assert.deepEqual(widened.widths, { ...DEFAULT_LIST_COLUMN_WIDTHS, title: 360 });
  assert.deepEqual(clamped.widths, {
    ...DEFAULT_LIST_COLUMN_WIDTHS,
    title: 360,
    lastVisitTime: 64,
  });
  assert.deepEqual(preferences.widths, DEFAULT_LIST_COLUMN_WIDTHS);
});

test("loads and saves a defensive copy under the dedicated key", async () => {
  const stored = { version: 1, widths: { ...DEFAULT_LIST_COLUMN_WIDTHS, title: 320 } };
  const writes = [];
  globalThis.browser = { storage: { local: {
    get: async (keys) => {
      assert.deepEqual(keys, [LIST_COLUMN_WIDTH_PREFERENCES_STORAGE_KEY]);
      return { [LIST_COLUMN_WIDTH_PREFERENCES_STORAGE_KEY]: stored };
    },
    set: async (value) => writes.push(value),
  } } };

  assert.equal(await loadListColumnWidthPreferences(), stored);
  await saveListColumnWidthPreferences(stored);
  stored.widths.title = 999;

  assert.equal(
    writes[0][LIST_COLUMN_WIDTH_PREFERENCES_STORAGE_KEY].widths.title,
    320,
  );
});
