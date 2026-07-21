import test from "node:test";
import assert from "node:assert/strict";

import { directFolderContents } from "../dist/panel/lib/folder-contents.js";
import { buildPanelDrawingPlan } from "../dist/panel/lib/panel-drawing-plan.js";

const state = {
  freeMovement: false,
  sort: { axisId: "visitCount", direction: "desc" },
  lastStandardSort: { axisId: "visitCount", direction: "desc" },
};

const root = {
  kind: "folder",
  guid: "root",
  parentGuid: null,
  index: 0,
  title: "Root",
};

const bookmarks = [
  {
    kind: "bookmark",
    guid: "low",
    parentGuid: "root",
    index: 0,
    title: "Low",
    url: "https://low.example",
    visitCount: 1,
  },
  {
    kind: "bookmark",
    guid: "high",
    parentGuid: "root",
    index: 1,
    title: "High",
    url: "https://high.example",
    visitCount: 10,
  },
];

function drawingPlan(tree, query = "") {
  const contents = directFolderContents(tree, "root");
  return {
    folders: contents.folders,
    plan: buildPanelDrawingPlan({
      items: contents.bookmarks,
      query,
      filters: [],
      state,
      columns: 16,
      rows: 32,
    }),
  };
}

test("folder count does not change bookmark rank or allocated size", () => {
  const withoutFolders = drawingPlan([root, ...bookmarks]);
  const manyFolders = Array.from({ length: 20 }, (_, index) => ({
    kind: "folder",
    guid: `folder-${index}`,
    parentGuid: "root",
    index: index + 2,
    title: `Folder ${index}`,
  }));
  const withFolders = drawingPlan([root, ...bookmarks, ...manyFolders]);

  assert.equal(withoutFolders.plan.status, "ready");
  assert.equal(withFolders.plan.status, "ready");
  assert.deepEqual(
    withFolders.plan.tiles.map(({ guid, size }) => ({ guid, size })),
    withoutFolders.plan.tiles.map(({ guid, size }) => ({ guid, size })),
  );
  assert.equal(withFolders.folders.length, 20);
});

test("folder titles are not included in bookmark search results", () => {
  const folder = {
    kind: "folder",
    guid: "matching-folder",
    parentGuid: "root",
    index: 2,
    title: "Unique search phrase",
  };
  const result = drawingPlan([root, ...bookmarks, folder], "Unique search phrase");

  assert.equal(result.plan.status, "ready");
  assert.deepEqual(result.plan.tiles, []);
  assert.deepEqual(result.folders.map(({ guid }) => guid), ["matching-folder"]);
});

test("supports folders without bookmarks as separate non-empty folder content", () => {
  const folder = {
    kind: "folder",
    guid: "only-folder",
    parentGuid: "root",
    index: 0,
    title: "Only folder",
  };
  const result = drawingPlan([root, folder]);

  assert.equal(result.plan.status, "ready");
  assert.deepEqual(result.plan.tiles, []);
  assert.deepEqual(result.folders.map(({ guid }) => guid), ["only-folder"]);
});

test("supports bookmarks without folders as a normal bookmark grid", () => {
  const result = drawingPlan([root, ...bookmarks]);

  assert.equal(result.plan.status, "ready");
  assert.deepEqual(result.folders, []);
  assert.deepEqual(result.plan.tiles.map(({ guid }) => guid), ["high", "low"]);
});
