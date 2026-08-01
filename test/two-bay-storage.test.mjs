import test from "node:test";
import assert from "node:assert/strict";

import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";
import {
  TWO_BAY_STORAGE_KEY,
  loadTwoBayConfiguration,
  saveTwoBayConfiguration,
} from "../dist/panel/lib/two-bay-storage.js";

test("loads only the independent two-bay key", async () => {
  const calls = [];
  const configuration = createInitialTwoBayConfiguration();
  globalThis.browser = {
    storage: { local: { get: async (keys) => {
      calls.push(keys);
      return {
        [TWO_BAY_STORAGE_KEY]: configuration,
        "bayConfigurations.v1": { legacy: true },
      };
    } } },
  };

  assert.equal(TWO_BAY_STORAGE_KEY, "twoBayConfiguration.v1");
  assert.deepEqual(await loadTwoBayConfiguration(), configuration);
  assert.deepEqual(calls, [["twoBayConfiguration.v1"]]);
});

test("returns undefined without inspecting legacy keys when the new key is absent", async () => {
  globalThis.browser = {
    storage: { local: { get: async () => ({
      "bayConfigurations.v1": { legacy: true },
      "mainLayouts.v1": { legacy: true },
      "dockingMetadata.v1": { legacy: true },
    }) } },
  };

  assert.equal(await loadTwoBayConfiguration(), undefined);
});

test("saves one defensive copy under only the new key", async () => {
  const writes = [];
  let release;
  globalThis.browser = {
    storage: { local: { set: (value) => {
      writes.push(value);
      return new Promise((resolve) => { release = resolve; });
    } } },
  };
  const configuration = createInitialTwoBayConfiguration();

  const saving = saveTwoBayConfiguration(configuration);
  configuration.bays.top.visibleRows = 3;
  release();
  await saving;

  assert.deepEqual(Object.keys(writes[0]), ["twoBayConfiguration.v1"]);
  assert.equal(writes[0][TWO_BAY_STORAGE_KEY].bays.top.visibleRows, 1);
});

test("propagates storage read and write failures", async () => {
  const readFailure = new Error("read failed");
  globalThis.browser = {
    storage: { local: { get: async () => { throw readFailure; } } },
  };
  await assert.rejects(loadTwoBayConfiguration(), (error) => error === readFailure);

  const writeFailure = new Error("write failed");
  globalThis.browser = {
    storage: { local: { set: async () => { throw writeFailure; } } },
  };
  await assert.rejects(
    saveTwoBayConfiguration(createInitialTwoBayConfiguration()),
    (error) => error === writeFailure,
  );
});
