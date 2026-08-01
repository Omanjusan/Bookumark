import test from "node:test";
import assert from "node:assert/strict";

import {
  createTwoBayInformationChipRuntime,
} from "../dist/panel/lib/two-bay-information-chip-runtime.js";

test("renders the bookmark summary as an inert information chip and keeps its count current", () => {
  const fake = createFakeDocument();
  let count = 12;
  const runtime = createTwoBayInformationChipRuntime({
    document: fake.document,
    bookmarkCount: () => count,
  });

  const summary = runtime.renderers["bookmark-summary"](plan("chip-7", "bookmark-summary"));
  assert.equal(summary.textContent, "Bookumark 12件");
  assert.equal(summary.dataset.chipInstanceId, "chip-7");
  assert.equal(summary.dataset.chipType, "bookmark-summary");
  assert.equal(summary.listeners.length, 0);

  count = 25;
  runtime.sync();
  assert.equal(summary.textContent, "Bookumark 25件");
});

test("disconnect stops updating already rendered bookmark summaries", () => {
  const fake = createFakeDocument();
  let count = 1;
  const runtime = createTwoBayInformationChipRuntime({
    document: fake.document,
    bookmarkCount: () => count,
  });
  const summary = runtime.renderers["bookmark-summary"](plan("chip-7", "bookmark-summary"));

  runtime.disconnect();
  count = 2;
  runtime.sync();

  assert.equal(summary.textContent, "Bookumark 1件");
});

function plan(instanceId, chipType) { return { instanceId, chipType, order: 1, settings: {} }; }
function createFakeDocument() {
  const createElement = () => ({
    className: "", textContent: "", dataset: {}, listeners: [],
    addEventListener(type) { this.listeners.push(type); },
  });
  return { document: { createElement } };
}
