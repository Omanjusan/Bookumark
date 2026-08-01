import test from "node:test";
import assert from "node:assert/strict";

import { createTwoBayResetSession } from "../dist/panel/lib/two-bay-reset-session.js";
import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";

test("prepares an isolated initial candidate without changing the current configuration", () => {
  const current = createInitialTwoBayConfiguration();
  current.systemBay = "bottom"; current.bays.bottom.visibleRows = 2;
  const session = createTwoBayResetSession({ save: async () => {} });
  const candidate = session.prepare(current);
  candidate.bays.top.visibleRows = 3;
  assert.equal(current.systemBay, "bottom");
  assert.equal(session.candidate()?.systemBay, "top");
  assert.equal(session.candidate()?.bays.top.visibleRows, 1);
});

test("saves the complete internal default once and clears the reset state on success", async () => {
  const saved = [];
  const session = createTwoBayResetSession({ save: async (value) => saved.push(value) });
  const current = createInitialTwoBayConfiguration();
  current.bays.top.chips[0].settings = { custom: true };
  current.bays.bottom.chips.push({ instanceId: "chip-7", chipType: "date", row: 3, order: 1, settings: {} });
  session.prepare(current);
  const committed = await session.confirm();
  assert.deepEqual(committed, createInitialTwoBayConfiguration());
  assert.deepEqual(saved, [createInitialTwoBayConfiguration()]);
  assert.equal(session.active, false);
});

test("retains the identical initial candidate after failure for retry", async () => {
  const saved = []; let fail = true;
  const session = createTwoBayResetSession({ save: async (value) => { saved.push(value); if (fail) throw new Error("failed"); } });
  session.prepare(createInitialTwoBayConfiguration());
  await assert.rejects(session.confirm());
  assert.equal(session.pending, true);
  fail = false;
  await session.retry();
  assert.deepEqual(saved[1], saved[0]);
});

test("cancels confirmation or failed save without changing the baseline", async () => {
  const session = createTwoBayResetSession({ save: async () => { throw new Error("failed"); } });
  const current = createInitialTwoBayConfiguration(); current.systemBay = "bottom"; current.bays.bottom.visibleRows = 1;
  session.prepare(current); assert.deepEqual(session.cancel(), current);
  session.prepare(current); await assert.rejects(session.confirm());
  assert.deepEqual(session.cancel(), current);
  assert.equal(session.active, false);
});

