import test from "node:test";
import assert from "node:assert/strict";

import {
  BASIC_DOCKING_CHIP_TYPES,
  createDockingChipRendererRegistry,
  renderDockingChips,
} from "../dist/panel/lib/docking-chip-renderer-registry.js";

test("registers one renderer for each of the six basic chip types", () => {
  const renderers = Object.fromEntries(BASIC_DOCKING_CHIP_TYPES.map((chipType) => [
    chipType,
    () => ({ chipType }),
  ]));
  const registry = createDockingChipRendererRegistry(renderers);

  assert.deepEqual(BASIC_DOCKING_CHIP_TYPES, [
    "search",
    "visit-status",
    "folder-history",
    "sort",
    "view-type",
    "movement-mode",
  ]);
  assert.deepEqual(
    BASIC_DOCKING_CHIP_TYPES.map((chipType) => registry.has(chipType)),
    [true, true, true, true, true, true],
  );
  assert.equal(registry.get("future-chip"), undefined);
});

test("renders known chips in order and passes an isolated chip plan", () => {
  const appended = [];
  const root = { appendChild: (element) => appended.push(element) };
  const source = [
    chip("chip-1", "search", { query: "book" }),
    chip("chip-2", "view-type", { value: "panel" }),
  ];
  const registry = createDockingChipRendererRegistry(rendererSet({
    search: (plan) => {
      plan.settings.query = "changed by renderer";
      return { instanceId: plan.instanceId };
    },
    "view-type": (plan) => ({ instanceId: plan.instanceId }),
  }));

  const result = renderDockingChips(root, source, registry);

  assert.deepEqual(appended, [{ instanceId: "chip-1" }, { instanceId: "chip-2" }]);
  assert.deepEqual(result, { renderedInstanceIds: ["chip-1", "chip-2"], skippedChips: [] });
  assert.equal(source[0].settings.query, "book");
});

test("skips unknown and failed chips while continuing the same bay", () => {
  const appended = [];
  const root = { appendChild: (element) => appended.push(element) };
  const registry = createDockingChipRendererRegistry(rendererSet({
    search: (plan) => ({ instanceId: plan.instanceId }),
    sort: () => {
      throw new Error("broken sort renderer");
    },
    "view-type": (plan) => ({ instanceId: plan.instanceId }),
  }));

  const result = renderDockingChips(root, [
    chip("chip-1", "search"),
    chip("chip-2", "future-chip"),
    chip("chip-3", "sort"),
    chip("chip-4", "view-type"),
  ], registry);

  assert.deepEqual(appended, [{ instanceId: "chip-1" }, { instanceId: "chip-4" }]);
  assert.deepEqual(result, {
    renderedInstanceIds: ["chip-1", "chip-4"],
    skippedChips: [
      { instanceId: "chip-2", chipType: "future-chip", reason: "unknown-chip-type" },
      { instanceId: "chip-3", chipType: "sort", reason: "render-error" },
    ],
  });
});

test("accepts inert two-bay renderers without changing the basic registry contract", () => {
  const registry = createDockingChipRendererRegistry(rendererSet(), {
    date: () => ({ chipType: "date" }),
    clock: () => ({ chipType: "clock" }),
  });
  assert.equal(registry.has("date"), true);
  assert.equal(registry.has("clock"), true);
  assert.equal(registry.has("future-chip"), false);
});

function rendererSet(overrides = {}) {
  return Object.fromEntries(BASIC_DOCKING_CHIP_TYPES.map((chipType) => [
    chipType,
    overrides[chipType] ?? ((plan) => ({ instanceId: plan.instanceId })),
  ]));
}

function chip(instanceId, chipType, settings = {}) {
  return { instanceId, chipType, order: 1, settings };
}
