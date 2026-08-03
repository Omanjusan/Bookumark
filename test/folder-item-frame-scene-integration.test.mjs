import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/panel/panel.ts", import.meta.url), "utf8");

test("resets the temporary rows at every agreed scene boundary", () => {
  assert.match(source, /function setViewType[\s\S]*?resetFolderItemFrameScene\(\{ itemScroll: true \}\)/);
  assert.match(source, /await showFolder\(folderGuid\);[\s\S]*?folderHistory\?\.visit[\s\S]*?resetFolderItemFrameScene\(\{ folderScroll: true, itemScroll: true \}\)/);
  assert.match(source, /await showFolder\(destination\);[\s\S]*?folderHistory\.moveForward[\s\S]*?resetFolderItemFrameScene\(\{ folderScroll: true, itemScroll: true \}\)/);
  assert.match(source, /function rebuildActiveDockingLayout[\s\S]*?resetFolderFrameSceneRows\(folderFrameRowsState\)/);
});

test("keeps search, filter, sort, and resize outside the reset boundary", () => {
  for (const name of ["setSearchQuery", "setVisitStatus", "setSortAxis"]) {
    const start = source.indexOf(`function ${name}`);
    const end = source.indexOf("\n}", start);
    assert.doesNotMatch(source.slice(start, end), /resetFolderItemFrameScene/);
  }
  assert.match(source, /window\.addEventListener\("resize", \(\) => applyFolderItemFrameLayout\(\)\)/);
});
