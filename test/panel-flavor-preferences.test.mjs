import test from "node:test";
import assert from "node:assert/strict";

import { PANEL_FLAVOR_IDS, panelFlavorForGuid } from "../dist/panel/lib/panel-flavor.js";
import {
  PANEL_FLAVOR_PREFERENCES_STORAGE_KEY,
  createPanelFlavorPreferences,
  loadPanelFlavorPreferences,
  normalizePanelFlavorPreferences,
  panelFlavorFromPreferences,
  reconcilePanelFlavorOverrides,
  savePanelFlavorPreferences,
  setPanelFlavorOverride,
} from "../dist/panel/lib/panel-flavor-preferences.js";

test("creates versioned preferences with one persistent unsigned seed", () => {
  assert.deepEqual(createPanelFlavorPreferences(() => 0.5), {
    version: 1,
    seed: 0x80000000,
    overrides: {},
  });
});

test("normalizes a valid stored document without sharing override references", () => {
  const stored = { version: 1, seed: 42, overrides: { alpha: "coral", beta: "indigo" } };
  const result = normalizePanelFlavorPreferences(stored, () => 0);

  assert.equal(result.changed, false);
  assert.deepEqual(result.preferences, stored);
  stored.overrides.alpha = "pink";
  assert.equal(result.preferences.overrides.alpha, "coral");
});

test("repairs invalid roots and seeds with an injected seed", () => {
  assert.deepEqual(normalizePanelFlavorPreferences(null, () => 0.25), {
    preferences: { version: 1, seed: 0x40000000, overrides: {} },
    changed: true,
  });
  assert.deepEqual(normalizePanelFlavorPreferences({ version: 1, seed: -1, overrides: {} }, () => 0), {
    preferences: { version: 1, seed: 0, overrides: {} },
    changed: true,
  });
});

test("drops invalid override keys and flavor IDs while preserving valid entries", () => {
  const result = normalizePanelFlavorPreferences({
    version: 1,
    seed: 7,
    overrides: { alpha: "mint", "": "blue", beta: "unknown", gamma: 1 },
  }, () => 0);

  assert.deepEqual(result, {
    preferences: { version: 1, seed: 7, overrides: { alpha: "mint" } },
    changed: true,
  });
});

test("uses an override before the seed-derived flavor and removes it with auto", () => {
  const preferences = createPanelFlavorPreferences(() => 0);
  const overridden = setPanelFlavorOverride(preferences, "alpha", "rose");

  assert.equal(panelFlavorFromPreferences("alpha", overridden), "rose");
  assert.equal(panelFlavorFromPreferences("beta", overridden), panelFlavorForGuid("beta", 0));

  const automatic = setPanelFlavorOverride(overridden, "alpha", null);
  assert.equal(automatic.overrides.alpha, undefined);
  assert.equal(panelFlavorFromPreferences("alpha", automatic), panelFlavorForGuid("alpha", 0));
  assert.equal(preferences.overrides.alpha, undefined);
});

test("rejects unknown flavor IDs passed by an untrusted UI boundary", () => {
  const preferences = createPanelFlavorPreferences(() => 0);
  assert.throws(() => setPanelFlavorOverride(preferences, "alpha", "unknown"), /flavor/i);
  assert.throws(() => setPanelFlavorOverride(preferences, "", PANEL_FLAVOR_IDS[0]), /guid/i);
});

test("removes only orphan overrides using the complete bookmark GUID set", () => {
  const preferences = {
    version: 1,
    seed: 5,
    overrides: { alpha: "coral", beta: "blue", orphan: "pink" },
  };

  assert.deepEqual(reconcilePanelFlavorOverrides(preferences, ["beta", "alpha", "new"]), {
    preferences: { version: 1, seed: 5, overrides: { alpha: "coral", beta: "blue" } },
    changed: true,
  });
  assert.equal(reconcilePanelFlavorOverrides(preferences, ["alpha", "beta", "orphan"]).changed, false);
});

test("loads and saves only the dedicated key using defensive copies", async () => {
  const writes = [];
  const stored = { version: 1, seed: 9, overrides: { alpha: "teal" } };
  globalThis.browser = { storage: { local: {
    get: async (keys) => {
      assert.deepEqual(keys, [PANEL_FLAVOR_PREFERENCES_STORAGE_KEY]);
      return { [PANEL_FLAVOR_PREFERENCES_STORAGE_KEY]: stored, unrelated: true };
    },
    set: async (value) => { writes.push(value); },
  } } };

  assert.equal(PANEL_FLAVOR_PREFERENCES_STORAGE_KEY, "panelFlavorPreferences.v1");
  assert.equal(await loadPanelFlavorPreferences(), stored);

  const preferences = createPanelFlavorPreferences(() => 0);
  preferences.overrides.alpha = "blue";
  const saving = savePanelFlavorPreferences(preferences);
  preferences.overrides.alpha = "pink";
  await saving;

  assert.deepEqual(writes, [{
    [PANEL_FLAVOR_PREFERENCES_STORAGE_KEY]: {
      version: 1,
      seed: 0,
      overrides: { alpha: "blue" },
    },
  }]);
});

test("propagates storage read and write failures", async () => {
  const failure = new Error("storage failed");
  globalThis.browser = { storage: { local: {
    get: async () => { throw failure; },
    set: async () => { throw failure; },
  } } };

  await assert.rejects(loadPanelFlavorPreferences(), (error) => error === failure);
  await assert.rejects(
    savePanelFlavorPreferences(createPanelFlavorPreferences(() => 0)),
    (error) => error === failure,
  );
});
