import test from "node:test";
import assert from "node:assert/strict";

import { executeOfficialMoveWithRecovery } from "../dist/panel/lib/official-move-executor.js";

const plan = { guid: "a", destination: { parentId: "folder", index: 0 } };
const refreshed = [{ kind: "folder", guid: "root", parentGuid: null, index: 0, title: "Root" }];

test("moves first and then returns the refreshed Firefox tree", async () => {
  const calls = [];
  const result = await executeOfficialMoveWithRecovery(plan, {
    move: async (guid, destination) => calls.push(["move", guid, destination]),
    loadTree: async () => {
      calls.push(["load"]);
      return refreshed;
    },
  });

  assert.deepEqual(calls, [
    ["move", "a", { parentId: "folder", index: 0 }],
    ["load"],
  ]);
  assert.deepEqual(result, { status: "success", items: refreshed });
});

test("reloads the Firefox tree even when move rejects", async () => {
  const failure = new Error("move failed");
  const result = await executeOfficialMoveWithRecovery(plan, {
    move: async () => { throw failure; },
    loadTree: async () => refreshed,
  });

  assert.deepEqual(result, {
    status: "move-failed",
    error: failure,
    items: refreshed,
  });
});

test("reports an unrecoverable state when refreshing also rejects", async () => {
  const failure = new Error("move failed");
  const recoveryFailure = new Error("reload failed");
  const result = await executeOfficialMoveWithRecovery(plan, {
    move: async () => { throw failure; },
    loadTree: async () => { throw recoveryFailure; },
  });

  assert.deepEqual(result, {
    status: "recovery-failed",
    error: failure,
    recoveryError: recoveryFailure,
  });
});
