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
  assert.equal(elements.root.open, true);
  assert.equal(elements.root.showModalCalls, 1);
  assert.equal(elements.select.value, "en-GB");
  let cancelPrevented = false;
  elements.root.emit("cancel", { preventDefault: () => { cancelPrevented = true; } });
  assert.equal(cancelPrevented, true);
  assert.equal(elements.root.open, true);

  elements.select.value = "ja-JP";
  await elements.select.emit("change");
  assert.deepEqual(changes, ["ja-JP"]);
  assert.equal(elements.root.open, true);

  elements.close.emit("click");
  assert.equal(elements.root.open, false);
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
  assert.equal(elements.root.open, true);
});

function createElements() {
  const element = () => ({
    open: false,
    showModalCalls: 0,
    disabled: false,
    value: "browser",
    textContent: "",
    listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    emit(type, event) { return this.listeners[type]?.(event); },
    focus() {},
    showModal() { this.open = true; this.showModalCalls += 1; },
    close() { this.open = false; },
  });
  return { root: element(), close: element(), select: element(), status: element() };
}
