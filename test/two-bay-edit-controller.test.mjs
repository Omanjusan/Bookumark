import test from "node:test";
import assert from "node:assert/strict";

import { bindTwoBayEditMode } from "../dist/panel/lib/two-bay-edit-controller.js";
import { createTwoBayEditSession } from "../dist/panel/lib/two-bay-edit-session.js";
import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";

test("enters edit mode from the menu and cancels back to normal mode", () => {
  const fake = harness();
  const rendered = [];
  const controller = bindTwoBayEditMode(fake.elements, fake.session, {
    getConfiguration: createInitialTwoBayConfiguration,
    onDraft: (configuration) => rendered.push(configuration.bays.bottom.visibleRows),
    onCancelled: (configuration) => rendered.push(configuration.bays.top.visibleRows),
    onCommitted: () => {},
  });

  assert.equal(fake.elements.entry.disabled, false);
  fake.elements.entry.emit("click");
  assert.equal(fake.elements.menu.hidden, true);
  assert.equal(fake.elements.frame.dataset.twoBayEditing, "true");
  assert.equal(fake.elements.canvas.hidden, false);
  assert.equal(fake.elements.confirm.disabled, true);
  assert.equal(fake.session.active, true);
  assert.deepEqual(rendered, [0]);
  fake.session.update((draft) => { draft.bays.bottom.visibleRows = 1; });
  controller.refresh();
  assert.equal(fake.elements.confirm.disabled, false);

  fake.elements.cancel.emit("click");
  assert.equal("twoBayEditing" in fake.elements.frame.dataset, false);
  assert.equal(fake.elements.canvas.hidden, true);
  assert.equal(fake.session.active, false);
  assert.deepEqual(rendered, [0, 1]);
});

test("keeps failed draft visible with retry or cancel as the only available actions", async () => {
  const fake = harness({ fail: true });
  const controller = bindTwoBayEditMode(fake.elements, fake.session, {
    getConfiguration: createInitialTwoBayConfiguration,
    onDraft: () => {}, onCancelled: () => {}, onCommitted: () => {},
  });
  fake.elements.entry.emit("click");
  fake.session.update((draft) => { draft.bays.bottom.visibleRows = 1; });
  controller.refresh();
  fake.elements.confirm.emit("click");
  await settle();
  assert.equal(fake.elements.status.textContent, "保存に失敗しました");
  assert.equal(fake.elements.retry.hidden, false);
  assert.equal(fake.elements.confirm.disabled, true);
  assert.equal(fake.elements.frame.dataset.twoBayEditBlocked, "true");

  fake.elements.cancel.emit("click");
  assert.equal(fake.session.active, false);
  assert.equal("twoBayEditBlocked" in fake.elements.frame.dataset, false);
});

function harness(options = {}) {
  const element = () => ({
    hidden: false,
    disabled: false,
    textContent: "",
    dataset: {},
    listeners: {},
    addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); },
    emit(type) { for (const listener of this.listeners[type] ?? []) listener({ type }); },
  });
  const elements = {
    entry: element(), menu: element(), frame: element(), canvas: element(),
    confirm: element(), retry: element(), cancel: element(), status: element(),
  };
  return { elements, session: createTwoBayEditSession({
    save: async () => { if (options.fail) throw new Error("failed"); },
  }) };
}

async function settle() { await new Promise((resolve) => setTimeout(resolve, 0)); }
