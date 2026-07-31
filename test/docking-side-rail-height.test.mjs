import test from "node:test";
import assert from "node:assert/strict";

import {
  applyDockingSideRailAvailableHeight,
  calculateDockingSideRailAvailableHeight,
} from "../dist/panel/lib/docking-side-rail-height.js";

test("calculates the space from the rail top to the viewport bottom", () => {
  assert.equal(calculateDockingSideRailAvailableHeight(720, 240), 480);
  assert.equal(calculateDockingSideRailAvailableHeight(400, 350), 50);
  assert.equal(calculateDockingSideRailAvailableHeight(400, -20), 400);
  assert.equal(calculateDockingSideRailAvailableHeight(400, 450), 0);
});

test("writes the measured remaining height as a rail CSS variable", () => {
  const writes = [];
  const rail = {
    getBoundingClientRect: () => ({ top: 240 }),
    style: { setProperty: (name, value) => writes.push([name, value]) },
  };

  assert.equal(applyDockingSideRailAvailableHeight(rail, 720), 480);
  assert.deepEqual(writes, [["--dock-side-rail-max-height", "480px"]]);
});

test("rejects invalid viewport geometry", () => {
  assert.throws(() => calculateDockingSideRailAvailableHeight(-1, 0), /non-negative/);
  assert.throws(() => calculateDockingSideRailAvailableHeight(100, Number.NaN), /finite/);
});
