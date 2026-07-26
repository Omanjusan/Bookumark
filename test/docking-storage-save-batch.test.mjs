import test from "node:test";
import assert from "node:assert/strict";

import { saveDockingDocuments } from "../dist/panel/lib/docking-storage.js";

const documents = {
  bayConfigurations: {
    schemaVersion: 1,
    nextBaySequence: 2,
    nextChipSequence: 1,
    bays: [{ id: "bay-1", name: "ベイ", permanent: false, chips: [] }],
  },
  mainLayouts: {
    schemaVersion: 1,
    nextLayoutSequence: 2,
    layouts: [{ id: "layout-1", name: "既定", systemDefault: true, placements: [] }],
  },
  dockingMetadata: {
    schemaVersion: 1,
    activeLayoutId: "layout-1",
  },
};

test("saves every supplied docking document in one storage request", async () => {
  const writes = [];
  globalThis.browser = {
    storage: { local: { set: async (value) => writes.push(value) } },
  };

  await saveDockingDocuments(documents);

  assert.deepEqual(writes, [{
    "bayConfigurations.v1": documents.bayConfigurations,
    "mainLayouts.v1": documents.mainLayouts,
    "dockingMetadata.v1": documents.dockingMetadata,
  }]);
});

test("saves only supplied documents and ignores explicit undefined values", async () => {
  const writes = [];
  globalThis.browser = {
    storage: { local: { set: async (value) => writes.push(value) } },
  };

  await saveDockingDocuments({
    bayConfigurations: documents.bayConfigurations,
    mainLayouts: undefined,
  });

  assert.deepEqual(writes, [{ "bayConfigurations.v1": documents.bayConfigurations }]);
});

test("does not request storage for an empty batch", async () => {
  let calls = 0;
  globalThis.browser = {
    storage: { local: { set: async () => { calls += 1; } } },
  };

  await saveDockingDocuments({});
  await saveDockingDocuments({ dockingMetadata: undefined });

  assert.equal(calls, 0);
});

test("defensively copies every document before awaiting the batch write", async () => {
  const writes = [];
  let release;
  globalThis.browser = {
    storage: { local: { set: (value) => {
      writes.push(value);
      return new Promise((resolve) => { release = resolve; });
    } } },
  };
  const input = structuredClone(documents);

  const saving = saveDockingDocuments(input);
  input.bayConfigurations.bays[0].name = "呼出後の変更";
  input.mainLayouts.layouts[0].name = "呼出後の変更";
  input.dockingMetadata.activeLayoutId = "変更";
  release();
  await saving;

  assert.equal(writes[0]["bayConfigurations.v1"].bays[0].name, "ベイ");
  assert.equal(writes[0]["mainLayouts.v1"].layouts[0].name, "既定");
  assert.equal(writes[0]["dockingMetadata.v1"].activeLayoutId, "layout-1");
});

test("propagates a batch storage failure", async () => {
  const failure = new Error("batch storage unavailable");
  globalThis.browser = {
    storage: { local: { set: async () => { throw failure; } } },
  };

  await assert.rejects(
    saveDockingDocuments(documents),
    (error) => error === failure,
  );
});
