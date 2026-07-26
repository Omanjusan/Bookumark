import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createDockingChipRendererRegistry } from "../dist/panel/lib/docking-chip-renderer-registry.js";
import { renderVerticalDockingRail } from "../dist/panel/lib/docking-vertical-rail-view.js";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("renders left-rail bays top-to-bottom with unrotated horizontal chip bodies", () => {
  const fake = createFakeDocument();
  const root = fake.element("div");
  const result = renderVerticalDockingRail(root, railPlan("left"), registry(fake), {
    document: fake.document,
  });

  assert.equal(root.dataset.railSide, "left");
  assert.deepEqual(root.children.map((bay) => ({
    bayId: bay.dataset.bayId,
    side: bay.dataset.railSide,
    orientation: bay.dataset.orientation,
    chips: bay.children.map((viewport) => ({
      instanceId: viewport.dataset.instanceId,
      label: viewport.attributes["aria-label"],
      viewportClass: viewport.className,
      bodyClass: viewport.children[0].className,
      control: viewport.children[0].children[0].textContent,
    })),
  })), [
    {
      bayId: "bay-1",
      side: "left",
      orientation: "vertical",
      chips: [
        {
          instanceId: "chip-1",
          label: "検索",
          viewportClass: "dock-chip dock-chip--vertical-viewport",
          bodyClass: "dock-chip__horizontal-body",
          control: "search:chip-1",
        },
        {
          instanceId: "chip-2",
          label: "表示形式",
          viewportClass: "dock-chip dock-chip--vertical-viewport",
          bodyClass: "dock-chip__horizontal-body",
          control: "view-type:chip-2",
        },
      ],
    },
    {
      bayId: "bay-2",
      side: "left",
      orientation: "vertical",
      chips: [],
    },
  ]);
  assert.deepEqual(result.renderedBayIds, ["bay-1", "bay-2"]);
  assert.deepEqual(result.renderedInstanceIds, ["chip-1", "chip-2"]);
});

test("marks right-rail bays so their left-origin chip start expands to the left", () => {
  const fake = createFakeDocument();
  const root = fake.element("div");

  renderVerticalDockingRail(root, railPlan("right"), registry(fake), {
    document: fake.document,
  });

  assert.equal(root.dataset.railSide, "right");
  assert.equal(root.children[0].dataset.railSide, "right");
  assert.match(root.children[0].className, /dock-bay--right/);
  assert.match(css, /#docking-rail-right\s*\{[^}]*justify-self:\s*end/s);
  assert.match(css, /\.dock-bay--right\s*\{[^}]*direction:\s*ltr/s);
});

test("clips from the horizontal body's left origin without rotating it", () => {
  assert.match(css, /\.dock-chip--vertical-viewport\s*\{[^}]*overflow:\s*hidden[^}]*width:\s*var\(--dock-vertical-chip-width\)/s);
  assert.match(css, /\.dock-chip__horizontal-body\s*\{[^}]*width:\s*max-content[^}]*transform:\s*none/s);
  assert.doesNotMatch(css, /\.dock-chip(?:--vertical-viewport|__horizontal-body)[^{]*\{[^}]*(?:rotate\(|writing-mode)/s);
});

test("isolates unknown and failed chips and rejects horizontal plans", () => {
  const fake = createFakeDocument();
  const root = fake.element("div");
  const plan = railPlan("left");
  plan.bays[0].chips.splice(1, 0, chip("chip-x", "future-chip", 2), chip("chip-y", "sort", 3));
  const renderers = rendererSet(fake);
  renderers.sort = () => { throw new Error("broken"); };

  const result = renderVerticalDockingRail(
    root,
    plan,
    createDockingChipRendererRegistry(renderers),
    { document: fake.document },
  );
  assert.deepEqual(result.skippedChips, [
    { instanceId: "chip-x", chipType: "future-chip", reason: "unknown-chip-type" },
    { instanceId: "chip-y", chipType: "sort", reason: "render-error" },
  ]);
  assert.deepEqual(root.children[0].children.map(({ dataset }) => dataset.instanceId), ["chip-1", "chip-2"]);

  const horizontal = railPlan("left");
  horizontal.rail = "top";
  horizontal.orientation = "horizontal";
  assert.throws(
    () => renderVerticalDockingRail(fake.element("div"), horizontal, registry(fake), {
      document: fake.document,
    }),
    /vertical rail view cannot render: top/,
  );
});

function railPlan(side) {
  return {
    rail: side,
    orientation: "vertical",
    bays: [
      {
        bayId: "bay-1",
        name: "操作",
        permanent: false,
        orientation: "vertical",
        chips: [chip("chip-1", "search", 1), chip("chip-2", "view-type", 2)],
      },
      { bayId: "bay-2", name: "空", permanent: false, orientation: "vertical", chips: [] },
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
    "search", "visit-status", "folder-history", "sort", "view-type", "movement-mode",
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
