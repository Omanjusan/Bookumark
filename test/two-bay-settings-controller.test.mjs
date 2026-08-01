import test from "node:test";
import assert from "node:assert/strict";

import { bindTwoBaySettings } from "../dist/panel/lib/two-bay-settings-controller.js";
import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";
import { createTwoBaySystemSwitchSession } from "../dist/panel/lib/two-bay-system-switch-session.js";

test("opens the system menu and settings dialog while bay editing remains unavailable", () => {
  const fake = harness();
  bindTwoBaySettings(fake.elements, fake.session);

  fake.elements.menuButton.emit("click");
  assert.equal(fake.elements.menu.hidden, false);
  assert.equal(fake.elements.bayEdit.disabled, true);

  fake.elements.settings.emit("click");
  assert.equal(fake.elements.menu.hidden, true);
  assert.equal(fake.elements.dialog.showModalCalls, 1);
  assert.equal(fake.elements.top.checked, true);
});

test("positions the menu below the top slot and above the bottom slot", () => {
  const fake = harness();
  bindTwoBaySettings(fake.elements, fake.session, { viewportHeight: () => 500 });

  fake.slot.dataset.bay = "top";
  fake.elements.menuButton.emit("click");
  assert.deepEqual(fake.elements.menu.style, { left: "12px", top: "44px", bottom: "" });

  fake.elements.menuButton.emit("click");
  fake.slot.dataset.bay = "bottom";
  fake.elements.menuButton.emit("click");
  assert.deepEqual(fake.elements.menu.style, { left: "12px", top: "", bottom: "64px" });
});

test("shows retry and cancel after save failure, then restores the baseline on cancel", async () => {
  const fake = harness({ fail: true });
  bindTwoBaySettings(fake.elements, fake.session);
  fake.elements.bottom.checked = true;
  fake.elements.bottom.emit("change");
  await settle();

  assert.equal(fake.elements.status.textContent, "保存に失敗しました");
  assert.equal(fake.elements.retry.hidden, false);
  assert.equal(fake.elements.cancel.hidden, false);
  assert.equal(fake.elements.top.disabled, true);
  assert.equal(fake.elements.bottom.disabled, true);

  const cancelEvent = fake.elements.dialog.emit("cancel");
  assert.equal(cancelEvent.defaultPrevented, true);

  fake.elements.cancel.emit("click");
  assert.equal(fake.elements.top.checked, true);
  assert.equal(fake.elements.bottom.checked, false);
  assert.equal(fake.elements.retry.hidden, true);
});

function harness(options = {}) {
  const element = () => ({
    hidden: false,
    disabled: false,
    checked: false,
    open: false,
    textContent: "",
    dataset: {},
    style: {},
    listeners: {},
    addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); },
    emit(type) {
      const event = {
        type,
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
      };
      for (const listener of this.listeners[type] ?? []) listener(event);
      return event;
    },
    showModalCalls: 0,
    showModal() { this.open = true; this.showModalCalls += 1; },
    close() { this.open = false; },
    getBoundingClientRect() {
      return this.dataset.bay === "bottom"
        ? { top: 440, right: 44, bottom: 472, left: 12 }
        : { top: 8, right: 44, bottom: 40, left: 12 };
    },
  });
  const slot = element();
  const elements = {
    menuButton: element(), menu: element(), settings: element(), bayEdit: element(),
    dialog: element(), close: element(), top: element(), bottom: element(),
    retry: element(), cancel: element(), status: element(), reset: element(),
  };
  elements.menuButton.parentElement = slot;
  elements.menu.hidden = true;
  const session = createTwoBaySystemSwitchSession(createInitialTwoBayConfiguration(), {
    save: async () => { if (options.fail) throw new Error("failed"); },
  });
  return { elements, session, slot };
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
