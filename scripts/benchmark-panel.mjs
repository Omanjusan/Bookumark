import { performance } from "node:perf_hooks";

import { buildPanelDrawingPlan } from "../dist/panel/lib/panel-drawing-plan.js";

const ITEM_COUNT = 2_000;
const WARMUP_RUNS = 20;
const SAMPLE_RUNS = 100;

const items = Array.from({ length: ITEM_COUNT }, (_, index) => ({
  guid: `bookmark-${index}`,
  title: `Bookmark ${String(index).padStart(4, "0")}`,
  url: `https://example-${index % 200}.test/path/${index}`,
  dateAdded: 1_700_000_000_000 + index,
  visitCount: (index * 37) % 1_001,
  lastVisitTime: 1_710_000_000_000 + index * 1_000,
}));

const input = {
  items,
  query: "",
  filters: [],
  state: {
    freeMovement: false,
    sort: { axisId: "visitCount", direction: "desc" },
    lastStandardSort: { axisId: "visitCount", direction: "desc" },
  },
  columns: 24,
  rows: 30,
};

for (let index = 0; index < WARMUP_RUNS; index += 1) runOnce();

const samples = Array.from({ length: SAMPLE_RUNS }, () => {
  const startedAt = performance.now();
  runOnce();
  return performance.now() - startedAt;
}).sort((a, b) => a - b);

const report = {
  environment: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    browser: "not measured (P8-2)",
  },
  fixture: {
    items: ITEM_COUNT,
    sortAxis: input.state.sort.axisId,
    direction: input.state.sort.direction,
    gridCells: `${input.columns}x${input.rows}`,
  },
  interval: "buildPanelDrawingPlan call",
  runs: {
    warmup: WARMUP_RUNS,
    samples: SAMPLE_RUNS,
  },
  milliseconds: {
    median: round(percentile(samples, 0.5)),
    p95: round(percentile(samples, 0.95)),
    min: round(samples[0]),
    max: round(samples.at(-1)),
  },
};

console.log(JSON.stringify(report, null, 2));

function runOnce() {
  const result = buildPanelDrawingPlan(input);
  if (result.status !== "ready" || result.tiles.length !== ITEM_COUNT) {
    throw new Error("benchmark output did not contain every fixture item");
  }
}

function percentile(sortedSamples, ratio) {
  return sortedSamples[Math.floor((sortedSamples.length - 1) * ratio)];
}

function round(value) {
  return Math.round(value * 1_000) / 1_000;
}
