import test from "node:test";
import assert from "node:assert/strict";

import { createDockingChipCatalog } from "../dist/panel/lib/docking-chip-catalog.js";
import {
  createDeprecatedChipRemovalSession,
} from "../dist/panel/lib/docking-deprecated-chip-removal-session.js";

test("aggregates deprecated instances by type and bay with replacement display names", () => {
  const session = createSession(documentsFixture());

  assert.equal(session.ready, false);
  assert.equal(session.pending, true);
  assert.deepEqual(session.summary(), [
    {
      chipType: "legacy-search",
      displayName: "旧検索",
      deprecatedSince: "0.2.0",
      removedSince: "0.4.0",
      totalCount: 3,
      replacement: { chipType: "search", displayName: "検索" },
      bays: [
        { bayId: "bay-1", bayName: "一", count: 2 },
        { bayId: "bay-2", bayName: "二", count: 1 },
      ],
    },
    {
      chipType: "legacy-sort",
      displayName: "旧ソート",
      deprecatedSince: "0.1.0",
      removedSince: "0.3.0",
      totalCount: 1,
      replacement: null,
      bays: [{ bayId: "bay-2", bayName: "二", count: 1 }],
    },
  ]);
});

test("removes every deprecated instance and saves only bay configurations once", async () => {
  const requests = [];
  const session = createSession(documentsFixture(), {
    saveBayConfigurations: async (document) => { requests.push(document); },
  });

  const result = await session.confirmAndSave();

  assert.equal(requests.length, 1);
  assert.deepEqual(result.bayConfigurations.bays[0].chips, [
    { instanceId: "chip-1", chipType: "search", order: 1, settings: { kept: true } },
    { instanceId: "chip-4", chipType: "future-chip", order: 2, settings: {} },
  ]);
  assert.deepEqual(result.bayConfigurations.bays[1].chips, []);
  assert.deepEqual(requests[0], result.bayConfigurations);
  assert.equal(session.ready, true);
  assert.equal(session.pending, false);
});

test("preserves empty bays, layouts, metadata, counters, and non-deprecated settings", async () => {
  const source = documentsFixture();
  const session = createSession(source);

  const result = await session.confirmAndSave();

  assert.equal(result.bayConfigurations.bays.length, 2);
  assert.equal(result.bayConfigurations.nextBaySequence, 3);
  assert.equal(result.bayConfigurations.nextChipSequence, 8);
  assert.deepEqual(result.mainLayouts, source.mainLayouts);
  assert.deepEqual(result.dockingMetadata, source.dockingMetadata);
  assert.deepEqual(result.bayConfigurations.bays[0].chips[0].settings, { kept: true });
});

test("keeps the runtime gate closed and retries an identical candidate after save failure", async () => {
  const requests = [];
  let attempts = 0;
  const session = createSession(documentsFixture(), {
    saveBayConfigurations: async (document) => {
      requests.push(structuredClone(document));
      attempts += 1;
      document.bays[0].name = "adapter mutation";
      if (attempts === 1) throw new Error("storage failed");
    },
  });

  await assert.rejects(session.confirmAndSave(), /storage failed/);
  assert.equal(session.ready, false);
  assert.equal(session.pending, true);
  assert.equal(session.saving, false);
  assert.equal(session.summary()[0].displayName, "旧検索");

  const result = await session.confirmAndSave();
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(result.bayConfigurations.bays[0].name, "一");
  assert.equal(session.ready, true);
});

test("rejects duplicate confirmation while the deletion save is pending", async () => {
  let finish;
  const waiting = new Promise((resolve) => { finish = resolve; });
  const session = createSession(documentsFixture(), {
    saveBayConfigurations: async () => { await waiting; },
  });

  const saving = session.confirmAndSave();
  assert.equal(session.saving, true);
  await assert.rejects(session.confirmAndSave(), /deprecated save is already in progress/);
  finish();
  await saving;
});

test("uses successful deletion as acknowledgement and does not notify or save again", async () => {
  let calls = 0;
  const first = createSession(documentsFixture(), {
    saveBayConfigurations: async () => { calls += 1; },
  });
  const saved = await first.confirmAndSave();
  const next = createSession(saved, {
    saveBayConfigurations: async () => { calls += 1; },
  });

  assert.equal(next.ready, true);
  assert.equal(next.pending, false);
  assert.deepEqual(next.summary(), []);
  await next.confirmAndSave();
  assert.equal(calls, 1);
});

test("returns defensive summaries and candidates without changing source documents", () => {
  const source = documentsFixture();
  const before = structuredClone(source);
  const session = createSession(source);
  const summary = session.summary();
  const candidate = session.candidateDocuments();
  summary[0].displayName = "mutated summary";
  summary[0].bays[0].bayName = "mutated bay";
  candidate.bayConfigurations.bays[0].name = "mutated candidate";
  source.bayConfigurations.bays[0].name = "mutated source";

  assert.equal(session.summary()[0].displayName, "旧検索");
  assert.equal(session.summary()[0].bays[0].bayName, "一");
  assert.equal(session.candidateDocuments().bayConfigurations.bays[0].name, "一");
  assert.deepEqual({ ...source, bayConfigurations: before.bayConfigurations }, before);
});

function createSession(documents, options = {}) {
  return createDeprecatedChipRemovalSession(documents, catalog(), {
    saveBayConfigurations: async () => {},
    ...options,
  });
}

function catalog() {
  return createDockingChipCatalog([
    { chipType: "search", displayName: "検索", kind: "control" },
  ], [
    {
      chipType: "legacy-search",
      displayName: "旧検索",
      deprecatedSince: "0.2.0",
      removedSince: "0.4.0",
      replacementChipType: "search",
    },
    {
      chipType: "legacy-sort",
      displayName: "旧ソート",
      deprecatedSince: "0.1.0",
      removedSince: "0.3.0",
    },
  ]);
}

function documentsFixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 3,
      nextChipSequence: 8,
      bays: [
        {
          id: "bay-1",
          name: "一",
          permanent: false,
          chips: [
            { instanceId: "chip-1", chipType: "search", order: 1, settings: { kept: true } },
            { instanceId: "chip-2", chipType: "legacy-search", order: 2, settings: {} },
            { instanceId: "chip-3", chipType: "legacy-search", order: 3, settings: {} },
            { instanceId: "chip-4", chipType: "future-chip", order: 4, settings: {} },
          ],
        },
        {
          id: "bay-2",
          name: "二",
          permanent: false,
          chips: [
            { instanceId: "chip-5", chipType: "legacy-search", order: 1, settings: {} },
            { instanceId: "chip-6", chipType: "legacy-sort", order: 2, settings: {} },
          ],
        },
      ],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 2,
      layouts: [{
        id: "layout-1",
        name: "一",
        systemDefault: false,
        placements: [
          { bayId: "bay-1", rail: "top", order: 1 },
          { bayId: "bay-2", rail: "bottom", order: 1 },
        ],
      }],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-1" },
  };
}
