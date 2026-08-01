import test from "node:test";
import assert from "node:assert/strict";
import { bindTwoBayReset } from "../dist/panel/lib/two-bay-reset-controller.js";
import { createTwoBayResetSession } from "../dist/panel/lib/two-bay-reset-session.js";
import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";

test("requires confirmation and leaves state unchanged when dismissed", () => {
  const fake = harness(); let committed = 0;
  bindTwoBayReset(fake.elements, fake.session, {
    getConfiguration: createInitialTwoBayConfiguration, onCommitted: () => { committed += 1; },
  });
  fake.elements.reset.emit("click");
  assert.equal(fake.elements.dialog.open, true);
  assert.equal(committed, 0);
  fake.elements.dismiss.emit("click");
  assert.equal(fake.elements.dialog.open, false);
  assert.equal(committed, 0);
});

test("keeps a failed initial candidate for retry or cancel", async () => {
  const fake = harness({ fail: true });
  bindTwoBayReset(fake.elements, fake.session, {
    getConfiguration: createInitialTwoBayConfiguration, onCommitted: () => {},
  });
  fake.elements.reset.emit("click"); fake.elements.confirm.emit("click"); await settle();
  assert.equal(fake.elements.status.textContent, "初期化の保存に失敗しました");
  assert.equal(fake.elements.retry.hidden, false);
  assert.equal(fake.elements.confirm.disabled, true);
  fake.elements.dismiss.emit("click");
  assert.equal(fake.session.active, false);
});

function harness(options = {}) {
  const element = () => ({ hidden: false, disabled: false, open: false, textContent: "", listeners: {},
    addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); },
    emit(type) { for (const listener of this.listeners[type] ?? []) listener({ type, preventDefault() {} }); },
    showModal() { this.open = true; }, close() { this.open = false; } });
  const elements = { reset: element(), settingsDialog: element(), dialog: element(), confirm: element(),
    dismiss: element(), retry: element(), status: element() };
  elements.retry.hidden = true;
  return { elements, session: createTwoBayResetSession({ save: async () => { if (options.fail) throw new Error("failed"); } }) };
}
async function settle() { await new Promise((resolve) => setTimeout(resolve, 0)); }

