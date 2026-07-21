import test from "node:test";
import assert from "node:assert/strict";

import {
  assignDesiredSizes,
  desiredSizeAt,
  percentileOf,
} from "../dist/panel/lib/desired-size.js";

test("calculates percentiles from zero-based ranks", () => {
  assert.equal(percentileOf(0, 0), null);
  assert.equal(percentileOf(0, 1), 0);
  assert.equal(percentileOf(0, 2), 0);
  assert.equal(percentileOf(1, 2), 0.5);
});

test("rejects ranks outside the display set", () => {
  assert.throws(() => percentileOf(-1, 2), RangeError);
  assert.throws(() => percentileOf(2, 2), RangeError);
  assert.throws(() => percentileOf(1, 0), RangeError);
  assert.throws(() => percentileOf(0, -1), RangeError);
});

test("maps every default boundary to the next smaller size", () => {
  const cases = [
    [0, "4"],
    [0.05, "2"],
    [0.15, "1"],
    [0.3, "1/2"],
    [0.5, "1/4"],
    [0.7, "1/8"],
    [0.85, "1/16"],
  ];
  for (const [percentile, expected] of cases) {
    assert.equal(desiredSizeAt(percentile), expected);
  }
});

test("keeps values immediately below boundaries in the larger band", () => {
  const cases = [
    [0.05 - Number.EPSILON, "4"],
    [0.15 - Number.EPSILON, "2"],
    [0.3 - Number.EPSILON, "1"],
    [0.5 - Number.EPSILON, "1/2"],
    [0.7 - Number.EPSILON, "1/4"],
    [0.85 - Number.EPSILON, "1/8"],
  ];
  for (const [percentile, expected] of cases) {
    assert.equal(desiredSizeAt(percentile), expected);
  }
});

test("assigns sizes using the current display-set count and order", () => {
  const items = ["a", "b"].map((guid) => ({ guid, title: guid, url: `https://${guid}.example` }));

  assert.deepEqual(assignDesiredSizes(items, { scalable: true }), [
    { guid: "a", size: "4" },
    { guid: "b", size: "1/4" },
  ]);
  assert.deepEqual(assignDesiredSizes([], { scalable: true }), []);
});

test("assigns size 1 to every item on a non-scalable axis", () => {
  const items = ["b", "a"].map((guid) => ({ guid, title: guid, url: `https://${guid}.example` }));

  assert.deepEqual(assignDesiredSizes(items, { scalable: false }), [
    { guid: "b", size: "1" },
    { guid: "a", size: "1" },
  ]);
});

test("supports replacement percentile bands", () => {
  const bands = [
    { from: 0, size: "2" },
    { from: 0.5, size: "1/8" },
  ];

  assert.equal(desiredSizeAt(0.49, bands), "2");
  assert.equal(desiredSizeAt(0.5, bands), "1/8");
});

test("rejects invalid percentiles and band configurations", () => {
  assert.throws(() => desiredSizeAt(-0.01), RangeError);
  assert.throws(() => desiredSizeAt(1), RangeError);
  assert.throws(() => desiredSizeAt(0, []), RangeError);
  assert.throws(() => desiredSizeAt(0, [{ from: 0.1, size: "1" }]), RangeError);
  assert.throws(
    () => desiredSizeAt(0, [{ from: 0, size: "1" }, { from: 0, size: "1/2" }]),
    RangeError,
  );
});
