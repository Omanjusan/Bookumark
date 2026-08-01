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

