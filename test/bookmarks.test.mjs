import test from "node:test";
import assert from "node:assert/strict";

import {
  getBookmarkTreeItems,
  getFlatBookmarks,
  moveBookmark,
  removeBookmark,
} from "../dist/panel/lib/bookmarks.js";

test("represents nested folders and bookmarks with their parent and Firefox index", async () => {
  globalThis.browser = {
    bookmarks: {
      getTree: async () => [{
        id: "root",
        title: "Root",
        children: [
          { id: "a", title: "A", url: "https://a.example", index: 0 },
          {
            id: "folder",
            title: "Folder",
            index: 1,
            children: [
              {
                id: "nested",
                title: "Nested",
                url: "https://nested.example",
                dateAdded: 1234,
                index: 0,
              },
            ],
          },
        ],
      }],
    },
  };

  assert.deepEqual(await getBookmarkTreeItems(), [
    { kind: "folder", guid: "root", parentGuid: null, index: 0, title: "Root" },
    {
      kind: "bookmark",
      guid: "a",
      parentGuid: "root",
      index: 0,
      title: "A",
      url: "https://a.example",
    },
    { kind: "folder", guid: "folder", parentGuid: "root", index: 1, title: "Folder" },
    {
      kind: "bookmark",
      guid: "nested",
      parentGuid: "folder",
      index: 0,
      title: "Nested",
      url: "https://nested.example",
      dateAdded: 1234,
    },
  ]);
});

test("keeps empty folders and derives missing indexes from sibling order", async () => {
  globalThis.browser = {
    bookmarks: {
      getTree: async () => [{
        id: "root",
        title: "Root",
        children: [
          { id: "first", title: "First", children: [] },
          { id: "second", title: "Second", children: [] },
        ],
      }],
    },
  };

  assert.deepEqual(await getBookmarkTreeItems(), [
    { kind: "folder", guid: "root", parentGuid: null, index: 0, title: "Root" },
    { kind: "folder", guid: "first", parentGuid: "root", index: 0, title: "First" },
    { kind: "folder", guid: "second", parentGuid: "root", index: 1, title: "Second" },
  ]);
});

test("excludes separators and place queries from tree items", async () => {
  globalThis.browser = {
    bookmarks: {
      getTree: async () => [{
        id: "root",
        title: "Root",
        children: [
          { id: "separator", type: "separator", index: 0 },
          { id: "query", title: "Query", url: "place:sort=8", index: 1 },
          { id: "kept", title: "Kept", url: "https://kept.example", index: 2 },
        ],
      }],
    },
  };

  assert.deepEqual(await getBookmarkTreeItems(), [
    { kind: "folder", guid: "root", parentGuid: null, index: 0, title: "Root" },
    {
      kind: "bookmark",
      guid: "kept",
      parentGuid: "root",
      index: 2,
      title: "Kept",
      url: "https://kept.example",
    },
  ]);
});

test("does not mutate the Firefox bookmark tree", async () => {
  const tree = [{
    id: "root",
    title: "Root",
    children: [{ id: "bookmark", title: "Bookmark", url: "https://example.com" }],
  }];
  const before = structuredClone(tree);
  globalThis.browser = { bookmarks: { getTree: async () => tree } };

  await getBookmarkTreeItems();

  assert.deepEqual(tree, before);
});

test("propagates bookmark tree API failures", async () => {
  const failure = new Error("bookmark DB unavailable");
  globalThis.browser = {
    bookmarks: {
      getTree: async () => { throw failure; },
    },
  };

  await assert.rejects(getBookmarkTreeItems(), (error) => error === failure);
});

test("flattens bookmark folders in Firefox tree order", async () => {
  globalThis.browser = {
    bookmarks: {
      getTree: async () => [
        {
          id: "root",
          title: "root",
          children: [
            { id: "a", title: "A", url: "https://a.example" },
            {
              id: "folder",
              title: "Folder",
              children: [
                { id: "b", title: "B", url: "https://b.example" },
                { id: "c", title: "C", url: "https://c.example" },
              ],
            },
            { id: "d", title: "D", url: "https://d.example" },
          ],
        },
      ],
    },
  };

  assert.deepEqual(await getFlatBookmarks(), [
    { guid: "a", title: "A", url: "https://a.example" },
    { guid: "b", title: "B", url: "https://b.example" },
    { guid: "c", title: "C", url: "https://c.example" },
    { guid: "d", title: "D", url: "https://d.example" },
  ]);
});

test("excludes folders, separators, and place queries", async () => {
  globalThis.browser = {
    bookmarks: {
      getTree: async () => [
        {
          id: "root",
          title: "root",
          children: [
            { id: "folder", title: "Folder", children: [] },
            { id: "separator", type: "separator" },
            { id: "query", title: "Query", url: "place:sort=8" },
            { id: "kept", title: "Kept", url: "https://kept.example" },
          ],
        },
      ],
    },
  };

  assert.deepEqual(await getFlatBookmarks(), [
    { guid: "kept", title: "Kept", url: "https://kept.example" },
  ]);
});

test("uses the URL as the title when Firefox supplies an empty title", async () => {
  globalThis.browser = {
    bookmarks: {
      getTree: async () => [{
        id: "root",
        children: [{ id: "untitled", title: "", url: "https://untitled.example" }],
      }],
    },
  };

  assert.deepEqual(await getFlatBookmarks(), [{
    guid: "untitled",
    title: "https://untitled.example",
    url: "https://untitled.example",
  }]);
});

test("keeps Firefox dateAdded only when it is available", async () => {
  globalThis.browser = {
    bookmarks: {
      getTree: async () => [{
        id: "root",
        children: [
          { id: "dated", title: "Dated", url: "https://dated.example", dateAdded: 1234 },
          { id: "undated", title: "Undated", url: "https://undated.example" },
        ],
      }],
    },
  };

  assert.deepEqual(await getFlatBookmarks(), [
    { guid: "dated", title: "Dated", url: "https://dated.example", dateAdded: 1234 },
    { guid: "undated", title: "Undated", url: "https://undated.example" },
  ]);
});

test("delegates bookmark deletion to Firefox without changing the GUID", async () => {
  const removed = [];
  globalThis.browser = {
    bookmarks: {
      remove: async (guid) => {
        removed.push(guid);
      },
    },
  };

  await removeBookmark("bookmark-guid");

  assert.deepEqual(removed, ["bookmark-guid"]);
});

test("delegates an official bookmark move with an unchanged destination", async () => {
  const moves = [];
  const moved = { id: "bookmark-guid", parentId: "root", index: 0 };
  globalThis.browser = {
    bookmarks: {
      move: async (guid, destination) => {
        moves.push([guid, destination]);
        return moved;
      },
    },
  };

  assert.equal(await moveBookmark("bookmark-guid", { parentId: "root", index: 0 }), moved);
  assert.deepEqual(moves, [["bookmark-guid", { parentId: "root", index: 0 }]]);
});
