import test from "node:test";
import assert from "node:assert/strict";

import { addTwoBayChip } from "../dist/panel/lib/two-bay-chip-add.js";
import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";

test("adds independent instances at the end of a visible row", () => {
  const source = createInitialTwoBayConfiguration();
  const first = addTwoBayChip(source, { bay: "top", row: 1, chipType: "search" });
  const second = addTwoBayChip(first, { bay: "top", row: 1, chipType: "search" });
  const added = second.bays.top.chips.slice(-2);

  assert.deepEqual(added.map(({ instanceId, order }) => [instanceId, order]), [
    ["chip-7", 7], ["chip-8", 8],
  ]);
  assert.equal(second.nextChipSequence, 9);
  assert.equal(source.bays.top.chips.length, 6);
});

test("rejects hidden and out-of-range target rows without changing the source", () => {
  const source = createInitialTwoBayConfiguration();
  assert.throws(
    () => addTwoBayChip(source, { bay: "bottom", row: 1, chipType: "search" }),
    /visible row/,
  );
  assert.throws(
    () => addTwoBayChip(source, { bay: "top", row: 2, chipType: "search" }),
    /visible row/,
  );
  assert.equal(source.nextChipSequence, 7);
});

