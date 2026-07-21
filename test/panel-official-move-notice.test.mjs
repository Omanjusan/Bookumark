import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  bindOfficialMoveUndo,
  renderOfficialMoveNotice,
} from "../dist/panel/lib/panel-official-move-notice.js";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");

test("provides an aria-live official move notice with an Undo button", () => {
  assert.match(html, /id="official-move-notice"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(html, /id="official-move-message"/);
  assert.match(html, /id="official-move-undo"[^>]*>元に戻す<\/button>/);
});

test("renders success, error, and hidden notice states", () => {
  const fake = noticeHarness();

  renderOfficialMoveNotice(fake.elements, {
    status: "success",
    message: "移動しました",
    canUndo: true,
  });
  assert.deepEqual(fake.snapshot(), {
    hidden: false,
    state: "success",
    message: "移動しました",
    undoHidden: false,
  });

  renderOfficialMoveNotice(fake.elements, {
    status: "error",
    message: "移動できませんでした",
    canUndo: false,
  });
  assert.deepEqual(fake.snapshot(), {
    hidden: false,
    state: "error",
    message: "移動できませんでした",
    undoHidden: true,
  });

  renderOfficialMoveNotice(fake.elements, { status: "hidden" });
  assert.equal(fake.root.hidden, true);
});

test("delivers Undo clicks until disconnected", () => {
  const listeners = new Set();
  const button = {
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  };
  let undoCount = 0;
  const connection = bindOfficialMoveUndo(button, () => { undoCount += 1; });

  for (const listener of listeners) listener();
  connection.disconnect();
  for (const listener of listeners) listener();

  assert.equal(undoCount, 1);
});

function noticeHarness() {
  const root = { hidden: true, dataset: {} };
  const message = { textContent: "" };
  const undoButton = { hidden: true };
  return {
    root,
    elements: { root, message, undoButton },
    snapshot: () => ({
      hidden: root.hidden,
      state: root.dataset.state,
      message: message.textContent,
      undoHidden: undoButton.hidden,
    }),
  };
}
