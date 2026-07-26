import test from "node:test";
import assert from "node:assert/strict";

import { createDockingChipRendererRegistry } from "../dist/panel/lib/docking-chip-renderer-registry.js";
import { renderHorizontalDockingRail } from "../dist/panel/lib/docking-horizontal-rail-view.js";

test("renders horizontal bays and chips in drawing-plan order", () => {
  const fake = createFakeDocument();
  const root = fake.element("div");
  const result = renderHorizontalDockingRail(root, railPlan(), registry(fake), {
    document: fake.document,
  });

  assert.deepEqual(root.children.map((bay) => ({
    bayId: bay.dataset.bayId,
    orientation: bay.dataset.orientation,
    label: bay.attributes["aria-label"],
    chips: bay.children.map((chip) => ({
      instanceId: chip.dataset.instanceId,
      chipType: chip.dataset.chipType,
      label: chip.attributes["aria-label"],
      control: chip.children[0].textContent,
    })),
  })), [
    {
      bayId: "bay-2",
      orientation: "horizontal",
      label: "絞り込みベイ",
      chips: [
        { instanceId: "chip-1", chipType: "search", label: "検索", control: "search:chip-1" },
        { instanceId: "chip-2", chipType: "visit-status", label: "訪問状態", control: "visit-status:chip-2" },
      ],
    },
    {
      bayId: "bay-3",
      orientation: "horizontal",
      label: "表示ベイ",
      chips: [
        { instanceId: "chip-3", chipType: "view-type", label: "表示形式", control: "view-type:chip-3" },
      ],
    },
  ]);
  assert.deepEqual(result, {
    renderedBayIds: ["bay-2", "bay-3"],
    renderedInstanceIds: ["chip-1", "chip-2", "chip-3"],
    skippedChips: [],
  });
});

test("keeps drawing after an unknown or failed chip and omits its wrapper", () => {
  const fake = createFakeDocument();
  const root = fake.element("div");
  const plan = railPlan();
  plan.bays[0].chips.splice(1, 0,
    chip("chip-x", "future-chip", 2),
    chip("chip-broken", "sort", 3),
  );
  const renderers = rendererSet(fake);
  renderers.sort = () => { throw new Error("broken"); };

  const result = renderHorizontalDockingRail(
    root,
    plan,
    createDockingChipRendererRegistry(renderers),
    { document: fake.document },
  );

  assert.deepEqual(
    root.children.flatMap((bay) => bay.children.map(({ dataset }) => dataset.instanceId)),
    ["chip-1", "chip-2", "chip-3"],
  );
  assert.deepEqual(result.skippedChips, [
    { instanceId: "chip-x", chipType: "future-chip", reason: "unknown-chip-type" },
    { instanceId: "chip-broken", chipType: "sort", reason: "render-error" },
  ]);
});

test("rejects a vertical rail plan at the horizontal view boundary", () => {
  const fake = createFakeDocument();
  const plan = railPlan();
  plan.rail = "left";
  plan.orientation = "vertical";

  assert.throws(
    () => renderHorizontalDockingRail(fake.element("div"), plan, registry(fake), {
      document: fake.document,
    }),
    /horizontal rail view cannot render: left/,
  );
});

function railPlan() {
  return {
    rail: "top",
    orientation: "horizontal",
    bays: [
      {
        bayId: "bay-2",
        name: "絞り込み",
        permanent: false,
        orientation: "horizontal",
        chips: [chip("chip-1", "search", 1), chip("chip-2", "visit-status", 2)],
      },
      {
        bayId: "bay-3",
        name: "表示",
        permanent: false,
        orientation: "horizontal",
        chips: [chip("chip-3", "view-type", 1)],
      },
    ],
  };
}

function chip(instanceId, chipType, order) {
  return { instanceId, chipType, order, settings: {} };
}

function registry(fake) {
  return createDockingChipRendererRegistry(rendererSet(fake));
}

function rendererSet(fake) {
  return Object.fromEntries([
    "search",
    "visit-status",
    "folder-history",
    "sort",
    "view-type",
    "movement-mode",
  ].map((chipType) => [chipType, (plan) => {
    const control = fake.element("button");
    control.textContent = `${chipType}:${plan.instanceId}`;
    return control;
  }]));
}

function createFakeDocument() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(),
    className: "",
    textContent: "",
    dataset: {},
    children: [],
    attributes: {},
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  return { document: { createElement: element }, element };
}
