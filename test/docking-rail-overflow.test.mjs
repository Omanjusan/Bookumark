import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  applyDockingRailEdgePan,
  calculateDockingRailEdgePan,
  planDockingRailOverflow,
} from "../dist/panel/lib/docking-rail-overflow.js";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("chooses 8px, then 4px, then 2px before requiring scroll", () => {
  const bayExtents = [40, 40, 40];

  assert.deepEqual(planDockingRailOverflow(136, bayExtents), { gap: 8, scroll: false });
  assert.deepEqual(planDockingRailOverflow(130, bayExtents), { gap: 4, scroll: false });
  assert.deepEqual(planDockingRailOverflow(125, bayExtents), { gap: 2, scroll: false });
  assert.deepEqual(planDockingRailOverflow(123, bayExtents), { gap: 2, scroll: true });
  assert.deepEqual(planDockingRailOverflow(0, []), { gap: 8, scroll: false });
});

test("rejects invalid available or bay extents", () => {
  for (const available of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => planDockingRailOverflow(available, []), /finite non-negative/);
  }
  assert.throws(() => planDockingRailOverflow(100, [20, -1]), /finite non-negative/);
});

test("calculates signed edge-pan speed with a bounded linear ramp", () => {
  const area = { start: 100, end: 300, threshold: 40, maxStep: 20 };

  assert.equal(calculateDockingRailEdgePan(200, area), 0);
  assert.equal(calculateDockingRailEdgePan(140, area), 0);
  assert.equal(calculateDockingRailEdgePan(130, area), -5);
  assert.equal(calculateDockingRailEdgePan(100, area), -20);
  assert.equal(calculateDockingRailEdgePan(70, area), -20);
  assert.equal(calculateDockingRailEdgePan(270, area), 5);
  assert.equal(calculateDockingRailEdgePan(300, area), 20);
  assert.equal(calculateDockingRailEdgePan(330, area), 20);
});

test("applies edge pan only to the rail orientation axis", () => {
  const horizontal = fakeScroller();
  const vertical = fakeScroller();

  assert.equal(applyDockingRailEdgePan(horizontal, "horizontal", 295, {
    start: 100, end: 300, threshold: 40, maxStep: 20,
  }), 18);
  assert.deepEqual(horizontal.calls, [{ left: 18, top: 0, behavior: "auto" }]);

  assert.equal(applyDockingRailEdgePan(vertical, "vertical", 110, {
    start: 100, end: 300, threshold: 40, maxStep: 20,
  }), -15);
  assert.deepEqual(vertical.calls, [{ left: 0, top: -15, behavior: "auto" }]);
});

test("styles horizontal and vertical rails for one-axis scrolling", () => {
  assert.match(css, /\.dock-rail--top,[\s\S]*?\.dock-rail--bottom\s*\{[^}]*overflow-x:\s*auto[^}]*overflow-y:\s*hidden/s);
  assert.match(css, /\.dock-rail--left,[\s\S]*?\.dock-rail--right\s*\{[^}]*overflow-x:\s*hidden[^}]*overflow-y:\s*auto/s);
  for (const gap of [8, 4, 2]) {
    assert.match(css, new RegExp(`\\.dock-rail\\[data-gap="${gap}"\\]\\s*\\{[^}]*gap:\\s*${gap}px`, "s"));
  }
});

function fakeScroller() {
  return {
    calls: [],
    scrollBy(options) { this.calls.push(options); },
  };
}
