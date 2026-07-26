import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bindPanelFolderHistoryInput } from "../dist/panel/lib/panel-folder-history-input.js";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/panel/lib/docking-basic-chip-runtime.ts", import.meta.url), "utf8");

test("provides accessible dynamic backward and forward folder buttons", () => {
  assert.doesNotMatch(html, /id="folder-(?:back|forward)"/);
  assert.match(runtime, /"前のフォルダへ戻る"/);
  assert.match(runtime, /"次のフォルダへ進む"/);
});

test("delivers button activations, synchronizes state, and disconnects", () => {
  const backward = fakeButton();
  const forward = fakeButton();
  const activations = [];
  const connection = bindPanelFolderHistoryInput(
    { backward, forward },
    (direction) => activations.push(direction),
  );

  connection.render({ canGoBack: true, canGoForward: false, pending: false });
  assert.equal(backward.disabled, false);
  assert.equal(forward.disabled, true);
  backward.click();
  forward.click();
  assert.deepEqual(activations, ["back", "forward"]);

  connection.render({ canGoBack: true, canGoForward: true, pending: true });
  assert.equal(backward.disabled, true);
  assert.equal(forward.disabled, true);

  connection.disconnect();
  backward.click();
  assert.deepEqual(activations, ["back", "forward"]);
});

function fakeButton() {
  const listeners = new Set();
  return {
    disabled: false,
    addEventListener(type, listener) {
      assert.equal(type, "click");
      listeners.add(listener);
    },
    removeEventListener(type, listener) {
      assert.equal(type, "click");
      listeners.delete(listener);
    },
    click() {
      for (const listener of listeners) listener();
    },
  };
}
