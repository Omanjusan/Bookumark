import test from "node:test";
import assert from "node:assert/strict";

import { sortForPanel } from "../dist/panel/lib/sort-axis.js";
import {
  createDateAddedAxis,
  createLastVisitTimeAxis,
  createTitleAxis,
  createVisitCountAxis,
} from "../dist/panel/lib/sort-axes.js";

function item(guid, title, dateAdded) {
  return {
    guid,
    title,
    url: `https://${guid}.example`,
    ...(dateAdded === undefined ? {} : { dateAdded }),
  };
}

test("creates non-scalable title and date-added axes", () => {
  assert.deepEqual(
    { id: createTitleAxis("asc").id, scalable: createTitleAxis("asc").scalable },
    { id: "title", scalable: false },
  );
  assert.deepEqual(
    { id: createDateAddedAxis("desc").id, scalable: createDateAddedAxis("desc").scalable },
    { id: "dateAdded", scalable: false },
  );
});

test("sorts titles case-insensitively with natural numeric ordering", () => {
  const items = [
    item("ten", "Item 10"),
    item("lower", "alpha"),
    item("two", "Item 2"),
    item("upper", "ALPHA"),
  ];

  assert.deepEqual(
    sortForPanel(items, createTitleAxis("asc")).map(({ guid }) => guid),
    ["lower", "upper", "two", "ten"],
  );
  assert.deepEqual(
    sortForPanel(items, createTitleAxis("desc")).map(({ guid }) => guid),
    ["ten", "two", "lower", "upper"],
  );
});

test("treats an empty title as the lowest title value", () => {
  const items = [item("named", "名前"), item("empty", "  ")];

  assert.deepEqual(
    sortForPanel(items, createTitleAxis("asc")).map(({ guid }) => guid),
    ["empty", "named"],
  );
  assert.deepEqual(
    sortForPanel(items, createTitleAxis("desc")).map(({ guid }) => guid),
    ["named", "empty"],
  );
});

test("sorts date-added timestamps and places missing values at the axis minimum", () => {
  const items = [
    item("middle", "Middle", 200),
    item("missing", "Missing"),
    item("newest", "Newest", 300),
    item("oldest", "Oldest", 100),
  ];

  assert.deepEqual(
    sortForPanel(items, createDateAddedAxis("asc")).map(({ guid }) => guid),
    ["missing", "oldest", "middle", "newest"],
  );
  assert.deepEqual(
    sortForPanel(items, createDateAddedAxis("desc")).map(({ guid }) => guid),
    ["newest", "middle", "oldest", "missing"],
  );
});

test("preserves input order for equal dates", () => {
  const items = [item("b", "B", 100), item("a", "A", 100)];

  assert.deepEqual(
    sortForPanel(items, createDateAddedAxis("asc")).map(({ guid }) => guid),
    ["b", "a"],
  );
});

test("makes only visit count scalable among the activity axes", () => {
  assert.equal(createVisitCountAxis("desc").scalable, true);
  assert.equal(createLastVisitTimeAxis("desc").scalable, false);
});

test("sorts visit counts in either direction with missing values at the minimum", () => {
  const items = [
    { ...item("five", "Five"), visitCount: 5 },
    item("missing", "Missing"),
    { ...item("zero", "Zero"), visitCount: 0 },
    { ...item("two", "Two"), visitCount: 2 },
  ];

  assert.deepEqual(
    sortForPanel(items, createVisitCountAxis("asc")).map(({ guid }) => guid),
    ["missing", "zero", "two", "five"],
  );
  assert.deepEqual(
    sortForPanel(items, createVisitCountAxis("desc")).map(({ guid }) => guid),
    ["five", "two", "zero", "missing"],
  );
});

test("sorts last-visit timestamps and preserves equal-value order", () => {
  const items = [
    { ...item("equal-b", "Equal B"), lastVisitTime: 200 },
    item("missing", "Missing"),
    { ...item("newest", "Newest"), lastVisitTime: 300 },
    { ...item("equal-a", "Equal A"), lastVisitTime: 200 },
  ];

  assert.deepEqual(
    sortForPanel(items, createLastVisitTimeAxis("desc")).map(({ guid }) => guid),
    ["newest", "equal-b", "equal-a", "missing"],
  );
});

test("formats activity values for panel display", () => {
  const visitAxis = createVisitCountAxis("desc");
  const lastVisitAxis = createLastVisitTimeAxis("desc");

  assert.equal(visitAxis.formatValue(5), "5回");
  assert.equal(typeof lastVisitAxis.formatValue(1_700_000_000_000), "string");
  assert.ok(lastVisitAxis.formatValue(1_700_000_000_000).length > 0);
});
