import test from "node:test";
import assert from "node:assert/strict";

import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";
import { createTwoBaySystemSwitchSession } from "../dist/panel/lib/two-bay-system-switch-session.js";

test("raises a hidden target to one row and commits only after save succeeds", async () => {
  const baseline = createInitialTwoBayConfiguration();
  const writes = [];
  const session = createTwoBaySystemSwitchSession(baseline, {
    save: async (candidate) => { writes.push(candidate); },
  });

  const saved = await session.switchTo("bottom");

  assert.equal(saved.systemBay, "bottom");
  assert.equal(saved.bays.bottom.visibleRows, 1);
  assert.deepEqual(saved.bays.top, baseline.bays.top);
  assert.deepEqual(writes, [saved]);
  assert.equal(session.pending, false);
});

test("keeps the failed candidate for identical retry and blocks another switch", async () => {
  const baseline = createInitialTwoBayConfiguration();
  const writes = [];
  let fail = true;
  const session = createTwoBaySystemSwitchSession(baseline, {
    save: async (candidate) => {
      writes.push(candidate);
      if (fail) throw new Error("save failed");
    },
  });

  await assert.rejects(session.switchTo("bottom"), /save failed/);
  assert.equal(session.pending, true);
  assert.equal(session.committed().systemBay, "top");
  assert.throws(() => session.switchTo("top"), /system switch retry is pending/);

  fail = false;
  const saved = await session.retry();
  assert.deepEqual(writes[1], writes[0]);
  assert.equal(saved.systemBay, "bottom");
  assert.equal(session.pending, false);
});

test("cancels a failed candidate back to an independent committed baseline", async () => {
  const session = createTwoBaySystemSwitchSession(createInitialTwoBayConfiguration(), {
    save: async () => { throw new Error("save failed"); },
  });
  await assert.rejects(session.switchTo("bottom"));

  const restored = session.cancel();
  restored.bays.top.visibleRows = 3;

  assert.equal(session.pending, false);
  assert.equal(session.committed().systemBay, "top");
  assert.equal(session.committed().bays.top.visibleRows, 1);
});

test("does not save when the selected system bay is unchanged", async () => {
  let writes = 0;
  const session = createTwoBaySystemSwitchSession(createInitialTwoBayConfiguration(), {
    save: async () => { writes += 1; },
  });

  assert.equal((await session.switchTo("top")).systemBay, "top");
  assert.equal(writes, 0);
});
