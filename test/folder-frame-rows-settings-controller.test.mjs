import test from "node:test";
import assert from "node:assert/strict";

import {
  bindFolderFrameRowsSettings,
} from "../dist/panel/lib/folder-frame-rows-settings-controller.js";

test("saves the valid draft with X and closes only after success", async () => {
  const elements = createElements();
  const saves = [];
  const controller = bindFolderFrameRowsSettings(elements, {
    onSave: async (rows) => saves.push(rows),
  });

  controller.open(3);
  assert.equal(elements.root.open, true);
  assert.equal(elements.input.value, "3");
  elements.input.value = "5";

  await elements.close.emit("click");

  assert.deepEqual(saves, [5]);
  assert.equal(elements.root.open, false);
});

test("rejects invalid drafts without saving or closing", async () => {
  const elements = createElements();
  const saves = [];
  const controller = bindFolderFrameRowsSettings(elements, {
    onSave: async (rows) => saves.push(rows),
  });
  controller.open(3);

  for (const invalid of ["", "0", "-1", "1.5", "6", "not-a-number"]) {
    elements.input.value = invalid;
    await elements.close.emit("click");
    assert.equal(elements.root.open, true);
    assert.equal(elements.status.textContent, "表示段数は1から5の整数で指定してください");
  }
  assert.deepEqual(saves, []);
});

test("keeps the modal and formal value on save failure", async () => {
  const elements = createElements();
  const controller = bindFolderFrameRowsSettings(elements, {
    onSave: async () => { throw new Error("private storage failure"); },
  });
  controller.open(2);
  elements.input.value = "4";

  await elements.close.emit("click");

  assert.equal(elements.root.open, true);
  assert.equal(elements.input.value, "2");
  assert.equal(elements.status.textContent, "フォルダ欄の既定段数を保存できませんでした");
});

test("discards the draft with Escape and ignores outside interaction", () => {
  const elements = createElements();
  const controller = bindFolderFrameRowsSettings(elements, { onSave: async () => {} });
  controller.open(4);
  elements.input.value = "1";
  let prevented = false;

  elements.root.emit("cancel", { preventDefault: () => { prevented = true; } });

  assert.equal(prevented, true);
  assert.equal(elements.root.open, false);
  controller.open(4);
  elements.root.emit("click", { target: elements.root });
  assert.equal(elements.root.open, true);
  assert.equal(elements.input.value, "4");
});

function createElements() {
  const element = () => ({
    open: false,
    disabled: false,
    value: "",
    textContent: "",
    listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    emit(type, event = {}) { return this.listeners[type]?.(event); },
    focus() {},
    showModal() { this.open = true; },
    close() { this.open = false; },
  });
  return { root: element(), close: element(), input: element(), status: element() };
}
