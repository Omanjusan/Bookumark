import test from "node:test";
import assert from "node:assert/strict";

import { createDockingChipCatalog } from "../dist/panel/lib/docking-chip-catalog.js";
import {
  createDockingRecoverySaveSession,
} from "../dist/panel/lib/docking-recovery-save-session.js";

test("saves only bay configurations once for an unknown-only recovery", async () => {
  const requests = [];
  const session = createSession(normalizationFixture(), {
    saveDocuments: async (patch) => { requests.push(patch); },
  });

  assert.equal(session.ready, false);
  const result = await session.save();

  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0]), ["bayConfigurations"]);
  assert.deepEqual(result.bayConfigurations.bays[0].chips.map(({ chipType }) => chipType), ["search"]);
  assert.equal(session.ready, true);
});

test("saves the union of structural and unknown recovery documents in one request", async () => {
  const requests = [];
  const normalization = normalizationFixture({
    recoveries: {
      bayConfigurations: "normalized",
      mainLayouts: "fallback",
      dockingMetadata: "normalized",
    },
    changedDocuments: ["bayConfigurations", "mainLayouts", "dockingMetadata"],
  });
  const session = createSession(normalization, {
    saveDocuments: async (patch) => { requests.push(patch); },
  });

  await session.save();

  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0]), [
    "bayConfigurations", "mainLayouts", "dockingMetadata",
  ]);
  assert.deepEqual(requests[0].bayConfigurations.bays[0].chips.map(({ chipType }) => chipType), ["search"]);
  assert.deepEqual(requests[0].mainLayouts, normalization.documents.mainLayouts);
});

test("exposes defensive structural and unknown recovery information", () => {
  const normalization = normalizationFixture({
    recoveries: {
      bayConfigurations: "unchanged",
      mainLayouts: "fallback",
      dockingMetadata: "normalized",
    },
    changedDocuments: ["mainLayouts", "dockingMetadata"],
  });
  const session = createSession(normalization);

  const snapshot = session.recoverySnapshot();
  assert.deepEqual(snapshot.recoveries, normalization.recoveries);
  assert.deepEqual(snapshot.changedDocuments, [
    "bayConfigurations", "mainLayouts", "dockingMetadata",
  ]);
  assert.deepEqual(snapshot.removedUnknown, [{
    bayId: "bay-1", bayName: "基本", instanceId: "chip-2", chipType: "future-chip",
  }]);

  snapshot.recoveries.mainLayouts = "unchanged";
  snapshot.removedUnknown[0].bayName = "mutated";
  assert.equal(session.recoverySnapshot().recoveries.mainLayouts, "fallback");
  assert.equal(session.recoverySnapshot().removedUnknown[0].bayName, "基本");
});

test("is ready without a storage request when no recovery is required", async () => {
  let calls = 0;
  const normalization = normalizationFixture({ unknown: false });
  const session = createSession(normalization, {
    saveDocuments: async () => { calls += 1; },
  });

  assert.equal(session.ready, true);
  assert.equal(session.pending, false);
  const result = await session.save();

  assert.equal(calls, 0);
  assert.deepEqual(result, normalization.documents);
});

test("keeps the runtime gate closed and retries the identical candidate after failure", async () => {
  const requests = [];
  let attempts = 0;
  const session = createSession(normalizationFixture(), {
    saveDocuments: async (patch) => {
      requests.push(structuredClone(patch));
      attempts += 1;
      patch.bayConfigurations.bays[0].name = "adapter mutation";
      if (attempts === 1) throw new Error("storage failed");
    },
  });

  await assert.rejects(session.save(), /storage failed/);
  assert.equal(session.ready, false);
  assert.equal(session.pending, true);
  assert.equal(session.saving, false);

  const result = await session.save();
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(result.bayConfigurations.bays[0].name, "基本");
  assert.equal(session.ready, true);
});

test("rejects a duplicate save while I/O is pending", async () => {
  let finish;
  const waiting = new Promise((resolve) => { finish = resolve; });
  const session = createSession(normalizationFixture(), {
    saveDocuments: async () => { await waiting; },
  });

  const saving = session.save();
  assert.equal(session.saving, true);
  await assert.rejects(session.save(), /recovery save is already in progress/);
  finish();
  await saving;
});

test("does not issue another storage request after a successful recovery save", async () => {
  let calls = 0;
  const session = createSession(normalizationFixture(), {
    saveDocuments: async () => { calls += 1; },
  });

  const first = await session.save();
  first.bayConfigurations.bays[0].name = "mutated result";
  const second = await session.save();

  assert.equal(calls, 1);
  assert.equal(second.bayConfigurations.bays[0].name, "基本");
});

test("defensively separates normalization input and candidate snapshots", () => {
  const normalization = normalizationFixture();
  const before = structuredClone(normalization);
  const session = createSession(normalization);
  const candidate = session.candidateDocuments();
  candidate.bayConfigurations.bays[0].name = "mutated candidate";
  normalization.documents.bayConfigurations.bays[0].name = "mutated input";

  assert.equal(session.candidateDocuments().bayConfigurations.bays[0].name, "基本");
  assert.deepEqual({ ...normalization, documents: before.documents }, before);
});

function createSession(normalization, options = {}) {
  return createDockingRecoverySaveSession(normalization, catalog(), {
    saveDocuments: async () => {},
    ...options,
  });
}

function catalog() {
  return createDockingChipCatalog([
    { chipType: "search", displayName: "検索", kind: "control" },
  ], []);
}

function normalizationFixture(overrides = {}) {
  const unknown = overrides.unknown ?? true;
  const documents = documentsFixture(unknown);
  return {
    documents,
    recoveries: overrides.recoveries ?? {
      bayConfigurations: "unchanged",
      mainLayouts: "unchanged",
      dockingMetadata: "unchanged",
    },
    changedDocuments: overrides.changedDocuments ?? [],
  };
}

function documentsFixture(withUnknown) {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 2,
      nextChipSequence: 3,
      bays: [{
        id: "bay-1",
        name: "基本",
        permanent: true,
        chips: [
          { instanceId: "chip-1", chipType: "search", order: 1, settings: {} },
          ...(withUnknown
            ? [{ instanceId: "chip-2", chipType: "future-chip", order: 2, settings: {} }]
            : []),
        ],
      }],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 2,
      layouts: [{
        id: "layout-1",
        name: "内部デフォルト",
        systemDefault: true,
        placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
      }],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-1" },
  };
}
