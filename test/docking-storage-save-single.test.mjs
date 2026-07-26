import test from "node:test";
import assert from "node:assert/strict";

import {
  saveBayConfigurations,
  saveDockingMetadata,
  saveMainLayouts,
} from "../dist/panel/lib/docking-storage.js";

const bayConfigurations = {
  schemaVersion: 1,
  nextBaySequence: 2,
  nextChipSequence: 2,
  bays: [{ id: "bay-1", name: "ベイ", permanent: false, chips: [] }],
};
const mainLayouts = {
  schemaVersion: 1,
  nextLayoutSequence: 2,
  layouts: [{ id: "layout-1", name: "既定", systemDefault: true, placements: [] }],
};
const dockingMetadata = {
  schemaVersion: 1,
  activeLayoutId: "layout-1",
};

test("saves each docking document under only its corresponding key", async () => {
  const writes = [];
  globalThis.browser = {
    storage: { local: { set: async (value) => writes.push(value) } },
  };

  await saveBayConfigurations(bayConfigurations);
  await saveMainLayouts(mainLayouts);
  await saveDockingMetadata(dockingMetadata);

  assert.deepEqual(writes, [
    { "bayConfigurations.v1": bayConfigurations },
    { "mainLayouts.v1": mainLayouts },
    { "dockingMetadata.v1": dockingMetadata },
  ]);
});

test("passes a defensive copy to storage before awaiting completion", async () => {
  const writes = [];
  let release;
  globalThis.browser = {
    storage: { local: { set: (value) => {
      writes.push(value);
      return new Promise((resolve) => { release = resolve; });
    } } },
  };
  const input = structuredClone(bayConfigurations);

  const saving = saveBayConfigurations(input);
  input.bays[0].name = "呼出後の変更";
  release();
  await saving;

  assert.equal(writes[0]["bayConfigurations.v1"].bays[0].name, "ベイ");
  assert.notEqual(writes[0]["bayConfigurations.v1"], input);
});

test("propagates asynchronous and synchronous save failures", async () => {
  const asynchronousFailure = new Error("asynchronous failure");
  globalThis.browser = {
    storage: { local: { set: async () => { throw asynchronousFailure; } } },
  };
  await assert.rejects(
    saveMainLayouts(mainLayouts),
    (error) => error === asynchronousFailure,
  );

  const synchronousFailure = new Error("synchronous failure");
  globalThis.browser = {
    storage: { local: { set: () => { throw synchronousFailure; } } },
  };
  await assert.rejects(
    saveDockingMetadata(dockingMetadata),
    (error) => error === synchronousFailure,
  );
});
