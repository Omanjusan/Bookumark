import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_BAY_ROWS,
  TWO_BAY_SCHEMA_VERSION,
  assertTwoBayConfigurationInvariants,
  cloneTwoBayConfiguration,
  createInitialTwoBayConfiguration,
} from "../dist/panel/lib/two-bay-persistence-model.js";

test("creates the approved upper-system initial configuration", () => {
  assert.equal(TWO_BAY_SCHEMA_VERSION, 1);
  assert.equal(MAX_BAY_ROWS, 3);
  assert.deepEqual(createInitialTwoBayConfiguration(), {
    schemaVersion: 1,
    systemBay: "top",
    nextChipSequence: 7,
    bays: {
      top: {
        visibleRows: 1,
        chips: [
          chip("chip-1", "search", 1),
          chip("chip-2", "visit-status", 2),
          chip("chip-3", "folder-history", 3),
          chip("chip-4", "sort", 4),
          chip("chip-5", "view-type", 5),
          chip("chip-6", "movement-mode", 6),
        ],
      },
      bottom: { visibleRows: 0, chips: [] },
    },
  });
});

test("returns independent initial configurations and defensive clones", () => {
  const first = createInitialTwoBayConfiguration();
  const second = createInitialTwoBayConfiguration();
  const cloned = cloneTwoBayConfiguration(first);

  first.bays.top.visibleRows = 3;
  first.bays.top.chips[0].settings.changed = true;
  cloned.bays.top.chips[1].order = 99;

  assert.equal(second.bays.top.visibleRows, 1);
  assert.deepEqual(second.bays.top.chips[0].settings, {});
  assert.equal(first.bays.top.chips[1].order, 2);
});

test("accepts hidden-row chips without discarding their row and order", () => {
  const configuration = createInitialTwoBayConfiguration();
  configuration.bays.bottom.chips.push(chip("chip-7", "date", 4, 3));
  configuration.nextChipSequence = 8;

  assert.doesNotThrow(() => assertTwoBayConfigurationInvariants(configuration));
  assert.deepEqual(configuration.bays.bottom.chips[0], chip("chip-7", "date", 4, 3));
});

test("requires the system bay to keep at least one visible row", () => {
  const configuration = createInitialTwoBayConfiguration();
  configuration.bays.top.visibleRows = 0;

  assert.throws(
    () => assertTwoBayConfigurationInvariants(configuration),
    /system bay must have at least one visible row/,
  );
});

test("allows only integer visible rows between zero and the shared maximum", () => {
  for (const visibleRows of [-1, 1.5, MAX_BAY_ROWS + 1]) {
    const configuration = createInitialTwoBayConfiguration();
    configuration.bays.bottom.visibleRows = visibleRows;
    assert.throws(
      () => assertTwoBayConfigurationInvariants(configuration),
      /visibleRows must be an integer between 0 and MAX_BAY_ROWS/,
    );
  }
});

test("requires chip rows to stay within the shared maximum", () => {
  for (const row of [0, MAX_BAY_ROWS + 1, 1.5]) {
    const configuration = createInitialTwoBayConfiguration();
    configuration.bays.bottom.chips.push(chip("chip-7", "clock", 1, row));
    configuration.nextChipSequence = 8;
    assert.throws(
      () => assertTwoBayConfigurationInvariants(configuration),
      /chip row must be an integer between 1 and MAX_BAY_ROWS/,
    );
  }
});

test("rejects duplicate instance IDs and duplicate orders within one row", () => {
  const duplicateId = createInitialTwoBayConfiguration();
  duplicateId.bays.bottom.chips.push(chip("chip-1", "date", 1));
  duplicateId.nextChipSequence = 8;
  assert.throws(
    () => assertTwoBayConfigurationInvariants(duplicateId),
    /chip instanceId must be unique/,
  );

  const duplicateOrder = createInitialTwoBayConfiguration();
  duplicateOrder.bays.top.chips.push(chip("chip-7", "date", 1));
  duplicateOrder.nextChipSequence = 8;
  assert.throws(
    () => assertTwoBayConfigurationInvariants(duplicateOrder),
    /chip order must be unique within a bay row/,
  );
});

test("requires positive safe sequences and orders beyond issued chip IDs", () => {
  const invalidOrder = createInitialTwoBayConfiguration();
  invalidOrder.bays.bottom.chips.push(chip("chip-7", "date", 0));
  invalidOrder.nextChipSequence = 8;
  assert.throws(
    () => assertTwoBayConfigurationInvariants(invalidOrder),
    /chip order must be a positive safe integer/,
  );

  const collidingSequence = createInitialTwoBayConfiguration();
  collidingSequence.nextChipSequence = 6;
  assert.throws(
    () => assertTwoBayConfigurationInvariants(collidingSequence),
    /nextChipSequence must be greater than issued chip IDs/,
  );
});

function chip(instanceId, chipType, order, row = 1) {
  return { instanceId, chipType, row, order, settings: {} };
}
