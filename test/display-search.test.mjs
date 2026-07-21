import test from "node:test";
import assert from "node:assert/strict";

import { filterBookmarksByText } from "../dist/panel/lib/display-search.js";

const items = [
  { guid: "github", title: "GitHub Projects", url: "https://github.com/example/project" },
  { guid: "mdn", title: "Web documentation", url: "https://developer.mozilla.org/ja/" },
  { guid: "fullwidth", title: "Ｂｏｏｋｕｍａｒｋ 設計", url: "https://design.example/panel" },
  { guid: "invalid", title: "Local Note", url: "not a valid url" },
];

test("returns every item in input order for an empty or whitespace-only query", () => {
  assert.deepEqual(filterBookmarksByText(items, "").map(({ guid }) => guid), [
    "github", "mdn", "fullwidth", "invalid",
  ]);
  assert.deepEqual(filterBookmarksByText(items, "  \t ").map(({ guid }) => guid), [
    "github", "mdn", "fullwidth", "invalid",
  ]);
});

test("matches title, domain, and complete URL text without case sensitivity", () => {
  assert.deepEqual(filterBookmarksByText(items, "PROJECTS").map(({ guid }) => guid), ["github"]);
  assert.deepEqual(filterBookmarksByText(items, "MOZILLA.ORG").map(({ guid }) => guid), ["mdn"]);
  assert.deepEqual(filterBookmarksByText(items, "example/project").map(({ guid }) => guid), ["github"]);
});

test("normalizes full-width and half-width text with Unicode NFKC", () => {
  assert.deepEqual(filterBookmarksByText(items, "bookumark").map(({ guid }) => guid), ["fullwidth"]);
});

test("requires every whitespace-separated term to match somewhere in the item", () => {
  assert.deepEqual(filterBookmarksByText(items, "Git project").map(({ guid }) => guid), ["github"]);
  assert.deepEqual(filterBookmarksByText(items, "Git Mozilla").map(({ guid }) => guid), []);
});

test("still searches title and raw URL when a URL cannot be parsed", () => {
  assert.deepEqual(filterBookmarksByText(items, "local valid").map(({ guid }) => guid), ["invalid"]);
});

test("preserves result order and does not mutate the input", () => {
  const input = [items[2], items[0], items[1]];
  const snapshot = structuredClone(input);

  assert.deepEqual(filterBookmarksByText(input, "example").map(({ guid }) => guid), [
    "fullwidth", "github",
  ]);
  assert.deepEqual(input, snapshot);
});
