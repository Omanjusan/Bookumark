import test from "node:test";
import assert from "node:assert/strict";

import { sortForPanel } from "../dist/panel/lib/sort-axis.js";

const items = {
  missingNull: { guid: "missing-null", title: "Missing null", url: "https://null.example" },
  missingUndefined: {
    guid: "missing-undefined",
    title: "Missing undefined",
    url: "https://undefined.example",
  },
  low: { guid: "low", title: "Low", url: "https://low.example" },
  high: { guid: "high", title: "High", url: "https://high.example" },
};

const values = new Map([
  [items.missingNull.guid, null],
  [items.missingUndefined.guid, undefined],
  [items.low.guid, 1],
  [items.high.guid, 10],
]);

function numericAxis(direction) {
  return {
    id: "score",
    scalable: true,
    direction,
    valueOf: (item) => values.get(item.guid),
    compare: (a, b) => values.get(a.guid) - values.get(b.guid),
  };
}

test("ascending order treats null and undefined as the lowest axis value", () => {
  const input = [items.high, items.missingNull, items.low, items.missingUndefined];

  const result = sortForPanel(input, numericAxis("asc"));

  assert.deepEqual(
    result.map((item) => item.guid),
    ["missing-null", "missing-undefined", "low", "high"],
  );
});

test("descending order places null and undefined after defined values", () => {
  const input = [items.low, items.missingNull, items.high, items.missingUndefined];

  const result = sortForPanel(input, numericAxis("desc"));

  assert.deepEqual(
    result.map((item) => item.guid),
    ["high", "low", "missing-null", "missing-undefined"],
  );
});

test("equal values preserve the order supplied to the panel", () => {
  const equalValues = new Map([
    ["third", 5],
    ["first", 5],
    ["second", 5],
  ]);
  const input = ["third", "first", "second"].map((guid) => ({
    guid,
    title: guid,
    url: `https://${guid}.example`,
  }));
  const axis = {
    id: "equal-score",
    scalable: true,
    direction: "asc",
    valueOf: (item) => equalValues.get(item.guid),
    compare: (a, b) => equalValues.get(a.guid) - equalValues.get(b.guid),
  };

  assert.deepEqual(
    sortForPanel(input, axis).map((item) => item.guid),
    ["third", "first", "second"],
  );
});

test("direction is applied by the panel sorter to an ascending comparator", () => {
  const input = [items.low, items.high];

  assert.deepEqual(
    sortForPanel(input, numericAxis("asc")).map((item) => item.guid),
    ["low", "high"],
  );
  assert.deepEqual(
    sortForPanel(input, numericAxis("desc")).map((item) => item.guid),
    ["high", "low"],
  );
});

test("sorting does not mutate the input array", () => {
  const input = [items.high, items.low];
  const snapshot = [...input];

  sortForPanel(input, numericAxis("asc"));

  assert.deepEqual(input, snapshot);
});
