import test from "node:test";
import assert from "node:assert/strict";

import { createTwoBayEditSession } from "../dist/panel/lib/two-bay-edit-session.js";
import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";

test("starts with independent baseline and draft copies", () => {
  const source = createInitialTwoBayConfiguration();
  const session = createTwoBayEditSession();
  const draft = session.begin(source);

  source.bays.top.visibleRows = 3;
  draft.bays.top.visibleRows = 2;

  assert.equal(session.baseline()?.bays.top.visibleRows, 1);
  assert.equal(session.draft()?.bays.top.visibleRows, 1);
});

test("updates only the draft and never the baseline or source", () => {
  const source = createInitialTwoBayConfiguration();
  const session = createTwoBayEditSession();
  session.begin(source);

  const updated = session.update((draft) => { draft.bays.bottom.visibleRows = 1; });

  assert.equal(updated.bays.bottom.visibleRows, 1);
  assert.equal(session.draft()?.bays.bottom.visibleRows, 1);
  assert.equal(session.baseline()?.bays.bottom.visibleRows, 0);
  assert.equal(source.bays.bottom.visibleRows, 0);
});

test("cancels by returning the baseline and discarding the draft", () => {
  const session = createTwoBayEditSession();
  session.begin(createInitialTwoBayConfiguration());
  session.update((draft) => { draft.bays.bottom.visibleRows = 1; });

  const restored = session.cancel();
  restored.bays.top.visibleRows = 3;

  assert.equal(session.active, false);
  assert.equal(session.baseline(), null);
  assert.equal(session.draft(), null);
});

test("saves the whole draft once and closes only after success", async () => {
  const saved = [];
  const session = createTwoBayEditSession({ save: async (value) => saved.push(value) });
  session.begin(createInitialTwoBayConfiguration());
  session.update((draft) => { draft.bays.bottom.visibleRows = 1; });

  const committed = await session.confirm();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].bays.bottom.visibleRows, 1);
  assert.equal(committed.bays.bottom.visibleRows, 1);
  assert.equal(session.active, false);
});

test("retains an identical failed candidate for retry and blocks further edits", async () => {
  const saved = [];
  let fail = true;
  const session = createTwoBayEditSession({
    save: async (value) => { saved.push(value); if (fail) throw new Error("failed"); },
  });
  session.begin(createInitialTwoBayConfiguration());
  session.update((draft) => { draft.bays.bottom.visibleRows = 1; });

  await assert.rejects(session.confirm(), /failed/);
  assert.equal(session.pending, true);
  assert.throws(() => session.update(() => {}), /pending/);
  fail = false;
  const committed = await session.retry();
  assert.deepEqual(saved[1], saved[0]);
  assert.equal(committed.bays.bottom.visibleRows, 1);
});

test("cancels a failed save candidate back to its baseline", async () => {
  const session = createTwoBayEditSession({ save: async () => { throw new Error("failed"); } });
  session.begin(createInitialTwoBayConfiguration());
  session.update((draft) => { draft.bays.bottom.visibleRows = 1; });
  await assert.rejects(session.confirm());
  const restored = session.cancel();
  assert.equal(restored.bays.bottom.visibleRows, 0);
  assert.equal(session.pending, false);
  assert.equal(session.active, false);
});
