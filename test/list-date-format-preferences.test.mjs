import test from "node:test";
import assert from "node:assert/strict";

import {
  LIST_DATE_FORMAT_IDS,
  LIST_DATE_FORMAT_PREFERENCES_STORAGE_KEY,
  formatListDateTime,
  normalizeListDateFormatPreferences,
  saveListDateFormatPreferences,
} from "../dist/panel/lib/list-date-format-preferences.js";

test("normalizes missing and invalid preferences to the browser format", () => {
  for (const candidate of [undefined, null, {}, { version: 1, format: "unknown" }]) {
    assert.deepEqual(normalizeListDateFormatPreferences(candidate), {
      preferences: { version: 1, format: "browser" },
      changed: true,
    });
  }

  for (const format of LIST_DATE_FORMAT_IDS) {
    assert.deepEqual(normalizeListDateFormatPreferences({ version: 1, format }), {
      preferences: { version: 1, format },
      changed: false,
    });
  }
});

test("formats ISO directly and delegates regional formats to Intl", () => {
  const calls = [];
  const formatterFactory = (locale, options) => {
    calls.push([locale, options]);
    return { format: (value) => `formatted:${value.getTime()}` };
  };

  const localTimestamp = new Date(2026, 7, 3, 14, 5).getTime();
  assert.equal(formatListDateTime(
    localTimestamp,
    { version: 1, format: "iso" },
    formatterFactory,
  ), "2026-08-03 14:05");
  assert.equal(formatListDateTime(100, { version: 1, format: "browser" }, formatterFactory),
    "formatted:100");
  assert.equal(formatListDateTime(200, { version: 1, format: "ja-JP" }, formatterFactory),
    "formatted:200");
  assert.equal(calls[0][0], undefined);
  assert.equal(calls[1][0], "ja-JP");
  assert.deepEqual(calls[1][1], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
});

test("saves a defensive preference copy under the dedicated key", async () => {
  const writes = [];
  globalThis.browser = { storage: { local: { set: async (value) => writes.push(value) } } };
  const preferences = { version: 1, format: "en-GB" };

  await saveListDateFormatPreferences(preferences);
  preferences.format = "en-US";

  assert.deepEqual(writes, [{
    [LIST_DATE_FORMAT_PREFERENCES_STORAGE_KEY]: { version: 1, format: "en-GB" },
  }]);
});
