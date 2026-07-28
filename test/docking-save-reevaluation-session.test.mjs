import test from "node:test";
import assert from "node:assert/strict";

import {
  createDockingSaveReevaluationSession,
} from "../dist/panel/lib/docking-save-reevaluation-session.js";
import { createDefaultDockingSharedState } from "../dist/panel/lib/docking-shared-state.js";

test("resets, reloads, and reevaluates exactly once after a successful save", async () => {
  const calls = [];
  const saved = fixture("saved");
  const reloaded = fixture("reloaded");
  const definitions = conditionDefinitions(calls);
  const session = createDockingSaveReevaluationSession(
    { ...createDefaultDockingSharedState("layout-1"), query: "temporary", folderHistory: { index: 3 } },
    definitions,
    {
      reloadDocuments: async () => { calls.push("reload"); return reloaded; },
    },
  );

  const result = await session.run(async () => { calls.push("save"); return saved; });

  assert.deepEqual(calls, ["save", "reload", ["apply", "reloaded", ""]]);
  assert.deepEqual(result.state, {
    ...createDefaultDockingSharedState("layout-1"),
    query: "reloaded",
  });
  assert.deepEqual(session.getState(), result.state);
  assert.deepEqual(result.documents, reloaded);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.conditionFailures, []);
  assert.equal("folderHistory" in result.state, false);
});

test("does not reset, reload, or evaluate when saving fails", async () => {
  let reloads = 0;
  const calls = [];
  const initial = {
    ...createDefaultDockingSharedState("layout-1"),
    query: "temporary",
    folderHistory: { index: 2 },
  };
  const session = createDockingSaveReevaluationSession(initial, conditionDefinitions(calls), {
    reloadDocuments: async () => { reloads += 1; return fixture("ignored"); },
  });

  await assert.rejects(session.run(async () => { throw new Error("save failed"); }), /save failed/);

  assert.equal(reloads, 0);
  assert.deepEqual(calls, []);
  assert.deepEqual(session.getState(), initial);
});

test("falls back to a defensive saved candidate when storage reload fails", async () => {
  const calls = [];
  const candidate = fixture("fallback");
  const session = createDockingSaveReevaluationSession(
    createDefaultDockingSharedState("layout-1"),
    conditionDefinitions(calls),
    { reloadDocuments: async () => { throw new Error("storage unavailable"); } },
  );

  const result = await session.run(async () => candidate);
  candidate.bayConfigurations.bays[0].chips[0].settings.query = "mutated later";
  result.documents.bayConfigurations.bays[0].chips[0].settings.query = "mutated consumer";

  assert.deepEqual(calls, [["apply", "fallback", ""]]);
  assert.equal(result.state.query, "fallback");
  assert.equal(session.getDocuments().bayConfigurations.bays[0].chips[0].settings.query, "fallback");
  assert.deepEqual(result.warnings, [{ reason: "storage-reload-failed" }]);
});

test("returns condition failures while preserving successful reevaluation results", async () => {
  const documents = fixture("after");
  documents.bayConfigurations.bays[0].chips.unshift({
    instanceId: "chip-broken",
    chipType: "broken-condition",
    order: 1,
    settings: {},
  });
  documents.bayConfigurations.bays[0].chips[1].order = 2;
  const definitions = conditionDefinitions([]);
  definitions.set("broken-condition", {
    chipType: "broken-condition",
    kind: "condition",
    apply: () => { throw new Error("broken"); },
  });
  const session = createDockingSaveReevaluationSession(
    createDefaultDockingSharedState("layout-1"),
    definitions,
    { reloadDocuments: async () => documents },
  );

  const result = await session.run(async () => fixture("saved"));

  assert.equal(result.state.query, "after");
  assert.deepEqual(result.conditionFailures, [{
    instanceId: "chip-broken",
    chipType: "broken-condition",
    reason: "apply-threw",
  }]);
});

function conditionDefinitions(calls) {
  return new Map([["query-condition", {
    chipType: "query-condition",
    kind: "condition",
    apply: (state, settings) => {
      calls.push(["apply", settings.query, state.query]);
      return { ...state, query: settings.query };
    },
  }]]);
}

function fixture(query) {
  return {
    bayConfigurations: {
      schemaVersion: 1,
      nextBaySequence: 2,
      nextChipSequence: 2,
      bays: [{
        id: "bay-1",
        name: "条件",
        permanent: false,
        chips: [{
          instanceId: "chip-1",
          chipType: "query-condition",
          order: 1,
          settings: { query },
        }],
      }],
    },
    mainLayouts: {
      schemaVersion: 1,
      nextLayoutSequence: 2,
      layouts: [{
        id: "layout-1",
        name: "作業",
        systemDefault: false,
        placements: [{ bayId: "bay-1", rail: "top", order: 1 }],
      }],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-1" },
  };
}
