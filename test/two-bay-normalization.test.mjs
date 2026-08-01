import test from "node:test";
import assert from "node:assert/strict";

import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";
import {
  loadNormalizedTwoBayConfiguration,
  normalizeTwoBayConfiguration,
} from "../dist/panel/lib/two-bay-normalization.js";

test("uses a fresh initial candidate when the new key is absent or structurally broken", () => {
  for (const stored of [undefined, null, "broken", {}, { schemaVersion: 2 }]) {
    const result = normalizeTwoBayConfiguration(stored);
    assert.equal(result.recovery, "fallback");
    assert.deepEqual(result.configuration, createInitialTwoBayConfiguration());
  }
});

test("returns a defensive unchanged configuration for valid stored data", () => {
  const stored = createInitialTwoBayConfiguration();
  const result = normalizeTwoBayConfiguration(stored);

  assert.equal(result.recovery, "unchanged");
  assert.deepEqual(result.configuration, stored);
  assert.notEqual(result.configuration, stored);
  assert.notEqual(result.configuration.bays.top, stored.bays.top);
});

test("migrates schema v1 by adding the default bookmark summary without losing saved chips", () => {
  const stored = createInitialTwoBayConfiguration();
  stored.schemaVersion = 1;
  stored.nextChipSequence = 7;
  stored.bays.top.chips = stored.bays.top.chips
    .filter(({ chipType }) => chipType !== "bookmark-summary")
    .map((entry, index) => ({ ...entry, order: index + 1 }));
  stored.bays.bottom.visibleRows = 1;
  stored.bays.bottom.chips.push(chip("custom-id", "date", 1, 1, { kept: true }));

  const result = normalizeTwoBayConfiguration(stored);

  assert.equal(result.recovery, "normalized");
  assert.equal(result.configuration.schemaVersion, 2);
  assert.deepEqual(result.configuration.bays.top.chips.map(({ chipType }) => chipType), [
    "bookmark-summary", "search", "visit-status", "folder-history", "sort", "view-type",
    "movement-mode",
  ]);
  assert.deepEqual(result.configuration.bays.bottom.chips[0].settings, { kept: true });
});

test("keeps a bookmark summary removed from a saved schema v2 configuration", () => {
  const stored = createInitialTwoBayConfiguration();
  stored.bays.top.chips = stored.bays.top.chips
    .filter(({ chipType }) => chipType !== "bookmark-summary")
    .map((entry, index) => ({ ...entry, order: index + 1 }));

  const result = normalizeTwoBayConfiguration(stored);

  assert.equal(result.recovery, "unchanged");
  assert.equal(result.configuration.bays.top.chips.some(
    ({ chipType }) => chipType === "bookmark-summary",
  ), false);
});

test("clamps row counts and keeps the selected system bay visible", () => {
  const stored = createInitialTwoBayConfiguration();
  stored.systemBay = "bottom";
  stored.bays.top.visibleRows = 9;
  stored.bays.bottom.visibleRows = -2;

  const result = normalizeTwoBayConfiguration(stored);

  assert.equal(result.recovery, "normalized");
  assert.equal(result.configuration.bays.top.visibleRows, 3);
  assert.equal(result.configuration.bays.bottom.visibleRows, 1);
});

test("truncates fractional rows and preserves chips in hidden rows", () => {
  const stored = createInitialTwoBayConfiguration();
  stored.bays.bottom.visibleRows = 1.9;
  stored.bays.bottom.chips.push(chip("chip-7", "unknown-future-chip", 3, 8));
  stored.nextChipSequence = 8;

  const result = normalizeTwoBayConfiguration(stored);

  assert.equal(result.configuration.bays.bottom.visibleRows, 1);
  assert.deepEqual(
    result.configuration.bays.bottom.chips[0],
    chip("chip-7", "unknown-future-chip", 3, 8),
  );
});

test("repairs invalid and duplicate IDs without removing unknown chips", () => {
  const stored = createInitialTwoBayConfiguration();
  stored.bays.bottom.chips.push(
    chip("chip-1", "date", 1, 1),
    chip("bad-id", "clock", 1, 2),
  );
  stored.nextChipSequence = 2;

  const result = normalizeTwoBayConfiguration(stored);
  const bottom = result.configuration.bays.bottom.chips;

  assert.equal(result.recovery, "normalized");
  assert.deepEqual(bottom.map(({ instanceId }) => instanceId), ["chip-7", "chip-8"]);
  assert.deepEqual(bottom.map(({ chipType }) => chipType), ["date", "clock"]);
  assert.equal(result.configuration.nextChipSequence, 9);
});

test("repairs chip rows, settings, and row-local order in stable array order", () => {
  const stored = createInitialTwoBayConfiguration();
  stored.bays.bottom.chips.push(
    chip("chip-7", "date", 0, 4, []),
    chip("chip-8", "clock", 4, 4),
    chip("chip-9", "unknown-future-chip", 4, 4),
  );
  stored.nextChipSequence = 10;

  const result = normalizeTwoBayConfiguration(stored);

  assert.deepEqual(result.configuration.bays.bottom.chips, [
    chip("chip-7", "date", 1, 1),
    chip("chip-8", "clock", 3, 1),
    chip("chip-9", "unknown-future-chip", 3, 2),
  ]);
});

test("drops malformed chip records but keeps valid chips and advances the sequence", () => {
  const stored = createInitialTwoBayConfiguration();
  stored.bays.bottom.chips.push(
    null,
    { instanceId: "chip-7", chipType: "", row: 1, order: 1, settings: {} },
    chip("chip-8", "date", 1, 1),
  );
  stored.nextChipSequence = 1;

  const result = normalizeTwoBayConfiguration(stored);

  assert.deepEqual(result.configuration.bays.bottom.chips, [chip("chip-8", "date", 1, 1)]);
  assert.equal(result.configuration.nextChipSequence, 9);
});

test("persists only repaired candidates and propagates repair-save failure", async () => {
  const writes = [];
  globalThis.browser = {
    storage: { local: {
      get: async () => ({}),
      set: async (value) => { writes.push(value); },
    } },
  };

  const repaired = await loadNormalizedTwoBayConfiguration();
  assert.equal(repaired.recovery, "fallback");
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0]["twoBayConfiguration.v1"], repaired.configuration);

  const valid = createInitialTwoBayConfiguration();
  globalThis.browser = {
    storage: { local: {
      get: async () => ({ "twoBayConfiguration.v1": valid }),
      set: async () => { throw new Error("must not save unchanged data"); },
    } },
  };
  assert.equal((await loadNormalizedTwoBayConfiguration()).recovery, "unchanged");

  const failure = new Error("repair save failed");
  globalThis.browser = {
    storage: { local: {
      get: async () => ({}),
      set: async () => { throw failure; },
    } },
  };
  await assert.rejects(
    loadNormalizedTwoBayConfiguration(),
    (error) => error === failure,
  );
});

function chip(instanceId, chipType, row, order, settings = {}) {
  return { instanceId, chipType, row, order, settings };
}
