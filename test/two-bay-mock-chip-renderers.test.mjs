import test from "node:test";
import assert from "node:assert/strict";

import { createTwoBayMockChipRenderers } from "../dist/panel/lib/two-bay-mock-chip-renderers.js";

test("renders date and clock as inert labelled placeholders", () => {
  const fake = createFakeDocument();
  const renderers = createTwoBayMockChipRenderers({ document: fake.document });
  const date = renderers.date(plan("chip-7", "date"));
  const clock = renderers.clock(plan("chip-8", "clock"));

  assert.deepEqual([date.textContent, clock.textContent], ["日付", "時計"]);
  assert.deepEqual([date.dataset.chipInstanceId, clock.dataset.chipInstanceId], ["chip-7", "chip-8"]);
  assert.equal(date.listeners.length, 0);
  assert.equal(clock.listeners.length, 0);
});

test("creates independent placeholders for repeated mock chip instances", () => {
  const fake = createFakeDocument();
  const renderers = createTwoBayMockChipRenderers({ document: fake.document });
  const first = renderers.date(plan("chip-7", "date"));
  const second = renderers.date(plan("chip-8", "date"));
  assert.notEqual(first, second);
  assert.deepEqual([first.dataset.chipInstanceId, second.dataset.chipInstanceId], ["chip-7", "chip-8"]);
});

function plan(instanceId, chipType) { return { instanceId, chipType, order: 1, settings: {} }; }
function createFakeDocument() {
  const createElement = () => ({
    className: "", textContent: "", dataset: {}, listeners: [],
    addEventListener(type) { this.listeners.push(type); },
  });
  return { document: { createElement } };
}
