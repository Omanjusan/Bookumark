import test from "node:test";
import assert from "node:assert/strict";

import { createLayoutSaveSession } from "../dist/panel/lib/layout-save-session.js";

test("saves only staged layout keys once and commits them after success", async () => {
  const requests = [];
  const source = documentsFixture();
  const session = createLayoutSaveSession(source, {
    saveDocuments: async (patch) => { requests.push(patch); },
  });
  const nextLayouts = structuredClone(source.mainLayouts);
  nextLayouts.layouts[1].name = "集中用";
  session.stage({ mainLayouts: nextLayouts });

  const result = await session.save();

  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0]), ["mainLayouts"]);
  assert.equal(result.mainLayouts.layouts[1].name, "集中用");
  assert.deepEqual(result.dockingMetadata, source.dockingMetadata);
  assert.equal(session.pending, false);
});

test("saves layout and metadata deletion candidates in one request", async () => {
  const requests = [];
  const source = documentsFixture();
  const session = createLayoutSaveSession(source, {
    saveDocuments: async (patch) => { requests.push(patch); },
  });
  const mainLayouts = structuredClone(source.mainLayouts);
  mainLayouts.layouts.pop();
  const dockingMetadata = { schemaVersion: 1, activeLayoutId: "layout-1" };
  session.stage({ mainLayouts, dockingMetadata });

  await session.save();

  assert.deepEqual(Object.keys(requests[0]).sort(), ["dockingMetadata", "mainLayouts"]);
  assert.equal(session.committedDocuments().mainLayouts.layouts.length, 1);
  assert.deepEqual(session.committedDocuments().dockingMetadata, dockingMetadata);
});

test("supports one atomic request containing all three documents", async () => {
  const requests = [];
  const source = documentsFixture();
  const session = createLayoutSaveSession(source, {
    saveDocuments: async (patch) => { requests.push(patch); },
  });
  session.stage(structuredClone(source));

  await session.save();

  assert.equal(requests.length, 1);
  assert.deepEqual(
    Object.keys(requests[0]).sort(),
    ["bayConfigurations", "dockingMetadata", "mainLayouts"],
  );
});

test("retains an independent staged candidate after failure and retries it", async () => {
  const requests = [];
  let attempts = 0;
  const source = documentsFixture();
  const nextLayouts = structuredClone(source.mainLayouts);
  nextLayouts.layouts[1].name = "集中用";
  const session = createLayoutSaveSession(source, {
    saveDocuments: async (patch) => {
      requests.push(structuredClone(patch));
      attempts += 1;
      patch.mainLayouts.layouts[1].name = "mutated by adapter";
      if (attempts === 1) throw new Error("storage failed");
    },
  });
  session.stage({ mainLayouts: nextLayouts });
  nextLayouts.layouts[1].name = "changed after stage";

  await assert.rejects(session.save(), /storage failed/);
  assert.equal(session.pending, true);
  assert.equal(session.saving, false);
  assert.equal(session.committedDocuments().mainLayouts.layouts[1].name, "作業用");

  const result = await session.save();
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(result.mainLayouts.layouts[1].name, "集中用");
});

test("rejects empty saves and prevents staging or duplicate saves while pending I/O", async () => {
  let finishSave;
  const waitForSave = new Promise((resolve) => { finishSave = resolve; });
  const session = createLayoutSaveSession(documentsFixture(), {
    saveDocuments: async () => { await waitForSave; },
  });

  assert.throws(() => session.stage({}), /at least one docking document is required/);
  await assert.rejects(session.save(), /layout save is not pending/);
  session.stage({ mainLayouts: documentsFixture().mainLayouts });
  const saving = session.save();
  assert.equal(session.saving, true);
  assert.throws(
    () => session.stage({ dockingMetadata: documentsFixture().dockingMetadata }),
    /layout save is in progress/,
  );
  await assert.rejects(session.save(), /layout save is already in progress/);
  finishSave();
  await saving;
});

test("returns defensive staged and committed document snapshots", () => {
  const source = documentsFixture();
  const session = createLayoutSaveSession(source, { saveDocuments: async () => {} });
  session.stage({ mainLayouts: source.mainLayouts });
  const staged = session.stagedDocuments();
  const committed = session.committedDocuments();
  staged.mainLayouts.layouts[0].name = "changed";
  committed.mainLayouts.layouts[0].name = "changed";

  assert.equal(session.stagedDocuments().mainLayouts.layouts[0].name, "内部デフォルト");
  assert.equal(session.committedDocuments().mainLayouts.layouts[0].name, "内部デフォルト");
  assert.equal(source.mainLayouts.layouts[0].name, "内部デフォルト");
});

test("adopts an independently saved state only while idle", async () => {
  const session = createLayoutSaveSession(documentsFixture(), { saveDocuments: async () => {} });
  const adopted = documentsFixture();
  adopted.mainLayouts.layouts[1].placements.push({ bayId: "bay-1", rail: "left", order: 1 });
  session.adoptCommittedDocuments(adopted);
  adopted.mainLayouts.layouts[1].placements.length = 0;
  assert.equal(session.committedDocuments().mainLayouts.layouts[1].placements.length, 1);

  session.stage({ mainLayouts: documentsFixture().mainLayouts });
  assert.throws(
    () => session.adoptCommittedDocuments(documentsFixture()),
    /layout save session is not idle/,
  );
  await session.save();
});

function documentsFixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 2,
      nextChipSequence: 1,
      bays: [{ id: "bay-1", name: "固定", permanent: true, chips: [] }],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 3,
      layouts: [
        { id: "layout-1", name: "内部デフォルト", systemDefault: true, placements: [] },
        { id: "layout-2", name: "作業用", systemDefault: false, placements: [] },
      ],
    },
    dockingMetadata: {
      schemaVersion: 1,
      activeLayoutId: "layout-2",
      lastUsedLayoutId: "layout-2",
    },
  };
}
