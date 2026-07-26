import test from "node:test";
import assert from "node:assert/strict";

import {
  measureBayAutoPlacementCandidate,
  renderBayPlacementPreviews,
} from "../dist/panel/lib/bay-placement-preview.js";

test("renders horizontal and vertical inert previews without interactive controls", () => {
  const fake = createFakeDocument();
  const roots = previewRoots(fake);
  renderBayPlacementPreviews(roots, fixture(), { document: fake.document });

  assert.equal(roots.top.children[0].dataset.orientation, "horizontal");
  assert.equal(roots.left.children[0].dataset.orientation, "vertical");
  assert.equal(roots.left.children[0].dataset.railSide, "left");
  for (const root of Object.values(roots)) {
    for (const bay of root.children) {
      assert.equal(bay.classList.values.includes("dock-bay--preview"), true);
      assert.equal(bay.attributes["aria-hidden"], "true");
      assert.equal(bay.inert, true);
      assert.equal(hasInteractiveElement(bay), false);
    }
  }
});

test("temporarily switches candidate orientation and returns real rail extents", () => {
  const fake = createFakeDocument();
  const roots = previewRoots(fake);
  renderBayPlacementPreviews(roots, fixture(), { document: fake.document });
  const counts = Object.fromEntries(Object.entries(roots).map(([rail, root]) => [rail, root.children.length]));

  const measurements = measureBayAutoPlacementCandidate(
    roots,
    fixture(),
    "bay-3",
    { document: fake.document },
  );

  assert.deepEqual(measurements, {
    top: { available: 300, existingExtents: [80], candidateExtent: 80 },
    left: { available: 200, existingExtents: [50], candidateExtent: 50 },
    right: { available: 200, existingExtents: [], candidateExtent: 50 },
    bottom: { available: 300, existingExtents: [], candidateExtent: 80 },
  });
  assert.deepEqual(
    Object.fromEntries(Object.entries(roots).map(([rail, root]) => [rail, root.children.length])),
    counts,
  );
});

function previewRoots(fake) {
  return {
    top: fake.element("div", { clientWidth: 300, clientHeight: 200 }),
    left: fake.element("div", { clientWidth: 300, clientHeight: 200 }),
    right: fake.element("div", { clientWidth: 300, clientHeight: 200 }),
    bottom: fake.element("div", { clientWidth: 300, clientHeight: 200 }),
  };
}

function hasInteractiveElement(element) {
  return ["INPUT", "SELECT", "BUTTON"].includes(element.tagName)
    || element.children.some(hasInteractiveElement);
}

function fixture() {
  return {
    bayConfigurations: {
      schemaVersion: 1, nextBaySequence: 4, nextChipSequence: 4,
      bays: [
        { id: "bay-1", name: "上", permanent: true, chips: [{ instanceId: "chip-1", chipType: "search", order: 1, settings: {} }] },
        { id: "bay-2", name: "左", permanent: false, chips: [{ instanceId: "chip-2", chipType: "sort", order: 1, settings: {} }] },
        { id: "bay-3", name: "候補", permanent: false, chips: [{ instanceId: "chip-3", chipType: "view-type", order: 1, settings: {} }] },
      ],
    },
    mainLayouts: {
      schemaVersion: 1, nextLayoutSequence: 3,
      layouts: [
        { id: "layout-1", name: "内部", systemDefault: true, placements: [] },
        { id: "layout-2", name: "作業", systemDefault: false, placements: [
          { bayId: "bay-1", rail: "top", order: 1 },
          { bayId: "bay-2", rail: "left", order: 1 },
        ] },
      ],
    },
    dockingMetadata: { schemaVersion: 1, activeLayoutId: "layout-2" },
  };
}

function createFakeDocument() {
  const element = (tagName, values = {}) => {
    const value = {
      tagName: tagName.toUpperCase(), className: "", textContent: "", dataset: {},
      attributes: {}, children: [], inert: false, clientWidth: 0, clientHeight: 0,
      appendChild(child) { child.parent = this; this.children.push(child); return child; },
      replaceChildren(...children) { this.children = []; for (const child of children) this.appendChild(child); },
      setAttribute(name, content) { this.attributes[name] = content; },
      getBoundingClientRect() { return { width: 80, height: 50 }; },
      remove() { this.parent.children = this.parent.children.filter((child) => child !== this); },
      ...values,
    };
    value.classList = { values: [], add(name) { this.values.push(name); } };
    return value;
  };
  return { document: { createElement: (tagName) => element(tagName) }, element };
}
