import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_FOLDER_FRAME_ROWS,
  MAX_FOLDER_FRAME_ROWS,
  MIN_FOLDER_FRAME_ROWS,
  createFolderFrameRowsState,
  effectiveFolderFrameRows,
  expandFolderFrame,
  expandItemFrame,
  resetFolderFrameSceneRows,
  setDefaultFolderFrameRows,
} from "../dist/panel/lib/folder-item-frame-rows.js";

test("starts from the agreed three-row default", () => {
  const state = createFolderFrameRowsState();

  assert.equal(DEFAULT_FOLDER_FRAME_ROWS, 3);
  assert.equal(MIN_FOLDER_FRAME_ROWS, 1);
  assert.equal(MAX_FOLDER_FRAME_ROWS, 5);
  assert.deepEqual(state, { defaultRows: 3, sceneRows: null });
  assert.equal(effectiveFolderFrameRows(state, 5, 5), 3);
});

test("shrinks only the effective rows when one row fits every folder", () => {
  const state = createFolderFrameRowsState(3);

  assert.equal(effectiveFolderFrameRows(state, 1, 5), 1);
  assert.deepEqual(state, { defaultRows: 3, sceneRows: null });
});

test("applies the viewport quarter cap without losing the requested rows", () => {
  const state = createFolderFrameRowsState(5);

  assert.equal(effectiveFolderFrameRows(state, 5, 2), 2);
  assert.deepEqual(state, { defaultRows: 5, sceneRows: null });
});

test("keeps one effective row for an empty folder frame or a tiny viewport", () => {
  const state = createFolderFrameRowsState(3);

  assert.equal(effectiveFolderFrameRows(state, 0, 5), 1);
  assert.equal(effectiveFolderFrameRows(state, 5, 0), 1);
});

test("expands the folder frame one requested row without mutating the input", () => {
  const state = createFolderFrameRowsState(3);
  const expanded = expandFolderFrame(state);

  assert.deepEqual(expanded, { defaultRows: 3, sceneRows: 4 });
  assert.deepEqual(state, { defaultRows: 3, sceneRows: null });
});

test("expands the item frame by reducing the folder request one row", () => {
  const state = createFolderFrameRowsState(3);
  const expanded = expandItemFrame(state);

  assert.deepEqual(expanded, { defaultRows: 3, sceneRows: 2 });
  assert.deepEqual(state, { defaultRows: 3, sceneRows: null });
});

test("does not move past either agreed row limit", () => {
  const maximum = createFolderFrameRowsState(5);
  const minimum = createFolderFrameRowsState(1);

  assert.equal(expandFolderFrame(maximum), maximum);
  assert.equal(expandItemFrame(minimum), minimum);
});

test("restores a temporarily hidden scene request when more rows become necessary", () => {
  const expanded = expandFolderFrame(createFolderFrameRowsState(3));

  assert.equal(effectiveFolderFrameRows(expanded, 1, 5), 1);
  assert.equal(effectiveFolderFrameRows(expanded, 5, 5), 4);
  assert.deepEqual(expanded, { defaultRows: 3, sceneRows: 4 });
});

test("recalculates effective rows without discarding a scene request", () => {
  const expanded = expandFolderFrame(createFolderFrameRowsState(3));

  assert.equal(effectiveFolderFrameRows(expanded, 5, 2), 2);
  assert.equal(effectiveFolderFrameRows(expanded, 5, 5), 4);
  assert.deepEqual(expanded, { defaultRows: 3, sceneRows: 4 });
});

test("resets scene rows independently from changing the persistent default", () => {
  const expanded = expandFolderFrame(createFolderFrameRowsState(3));
  const reset = resetFolderFrameSceneRows(expanded);
  const updated = setDefaultFolderFrameRows(expanded, 2);

  assert.deepEqual(reset, { defaultRows: 3, sceneRows: null });
  assert.deepEqual(updated, { defaultRows: 2, sceneRows: null });
  assert.deepEqual(expanded, { defaultRows: 3, sceneRows: 4 });
});

test("rejects invalid explicit default and effective-row inputs", () => {
  for (const invalid of [0, 6, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => createFolderFrameRowsState(invalid), RangeError);
  }
  const state = createFolderFrameRowsState();
  for (const invalid of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => effectiveFolderFrameRows(state, invalid, 5), RangeError);
    assert.throws(() => effectiveFolderFrameRows(state, 5, invalid), RangeError);
  }
});
