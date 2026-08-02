import test from "node:test";
import assert from "node:assert/strict";

import { bindListDateSettings } from "../dist/panel/lib/list-date-settings-controller.js";

test("keeps the overlay open through changes and closes it only with X", async () => {
  const elements = createElements();
  const changes = [];
  const controller = bindListDateSettings(elements, {
    onChange: async (format) => changes.push(format),
  });

  controller.open("en-GB");
  assert.equal(elements.root.hidden, false);
  assert.equal(elements.select.value, "en-GB");

  elements.select.value = "ja-JP";
  await elements.select.emit("change");
  assert.deepEqual(changes, ["ja-JP"]);
  assert.equal(elements.root.hidden, false);

  elements.close.emit("click");
  assert.equal(elements.root.hidden, true);
});

test("restores the current value and reports a failed immediate save", async () => {
  const elements = createElements();
  const controller = bindListDateSettings(elements, {
    onChange: async () => { throw new Error("save failed"); },
  });
  controller.open("browser");
  elements.select.value = "iso";

  await elements.select.emit("change");

  assert.equal(elements.select.value, "browser");
  assert.equal(elements.status.textContent, "日付表示方式を保存できませんでした");
  assert.equal(elements.root.hidden, false);
});

function createElements() {
  const element = () => ({
    hidden: true,
    disabled: false,
    value: "browser",
    textContent: "",
    listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    emit(type) { return this.listeners[type]?.(); },
    focus() {},
  });
  return { root: element(), close: element(), select: element(), status: element() };
}
