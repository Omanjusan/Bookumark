import test from "node:test";
import assert from "node:assert/strict";

import { getFlatBookmarks, removeBookmark } from "../dist/panel/lib/bookmarks.js";

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
