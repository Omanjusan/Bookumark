import test from "node:test";
import assert from "node:assert/strict";

import {
  clampDockingRailScrollOffset,
  preserveDockingRailScrollPosition,
  resetDockingRailScrollPosition,
} from "../dist/panel/lib/docking-rail-scroll-position.js";

test("preserves valid offsets and clamps both normal and reverse rails", () => {
  assert.equal(clampDockingRailScrollOffset(40, 300, 100), 40);
  assert.equal(clampDockingRailScrollOffset(260, 300, 100), 200);
  assert.equal(clampDockingRailScrollOffset(-260, 300, 100), -200);
  assert.equal(clampDockingRailScrollOffset(20, 80, 100), 0);
});

test("preserves only the arrangement-axis position after resize", () => {
  const horizontal = scroller({ scrollLeft: 240, scrollTop: 17, scrollWidth: 300, clientWidth: 100 });
  const vertical = scroller({ scrollLeft: 19, scrollTop: -240, scrollHeight: 300, clientHeight: 100 });

  preserveDockingRailScrollPosition(horizontal, "horizontal");
  preserveDockingRailScrollPosition(vertical, "vertical");

  assert.deepEqual(horizontal.position(), { left: 200, top: 17 });
  assert.deepEqual(vertical.position(), { left: 19, top: -200 });
});

test("resets only the arrangement axis to the outer start", () => {
  const horizontal = scroller({ scrollLeft: 80, scrollTop: 17 });
  const vertical = scroller({ scrollLeft: 19, scrollTop: -60 });

  resetDockingRailScrollPosition(horizontal, "horizontal");
  resetDockingRailScrollPosition(vertical, "vertical");

  assert.deepEqual(horizontal.position(), { left: 0, top: 17 });
  assert.deepEqual(vertical.position(), { left: 19, top: 0 });
});

test("rejects non-finite geometry", () => {
  assert.throws(() => clampDockingRailScrollOffset(Number.NaN, 100, 20), /finite/);
  assert.throws(() => clampDockingRailScrollOffset(0, -1, 20), /non-negative/);
});

function scroller(values) {
  const state = {
    scrollLeft: 0,
    scrollTop: 0,
    scrollWidth: 0,
    scrollHeight: 0,
    clientWidth: 0,
    clientHeight: 0,
    ...values,
  };
  return {
    get scrollLeft() { return state.scrollLeft; },
    set scrollLeft(value) { state.scrollLeft = value; },
    get scrollTop() { return state.scrollTop; },
    set scrollTop(value) { state.scrollTop = value; },
    get scrollWidth() { return state.scrollWidth; },
    get scrollHeight() { return state.scrollHeight; },
    get clientWidth() { return state.clientWidth; },
    get clientHeight() { return state.clientHeight; },
    position: () => ({ left: state.scrollLeft, top: state.scrollTop }),
  };
}
