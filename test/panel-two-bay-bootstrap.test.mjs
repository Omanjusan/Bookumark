import test from "node:test";
import assert from "node:assert/strict";

import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";
import { loadPanelTwoBayState } from "../dist/panel/lib/panel-two-bay-bootstrap.js";

test("loads only the normalized two-bay configuration for panel startup", async () => {
  const configuration = createInitialTwoBayConfiguration();
  let attempts = 0;

  const result = await loadPanelTwoBayState({
    loadNormalized: async () => {
      attempts += 1;
      return { configuration, recovery: "unchanged" };
    },
  });

  assert.equal(attempts, 1);
  assert.deepEqual(result, { configuration, recovery: "unchanged" });
  assert.notEqual(result.configuration, configuration);
});

test("does not publish a startup candidate when recovery persistence fails", async () => {
  const failure = new Error("two-bay recovery save failed");

  await assert.rejects(
    loadPanelTwoBayState({ loadNormalized: async () => { throw failure; } }),
    (error) => error === failure,
  );
});
