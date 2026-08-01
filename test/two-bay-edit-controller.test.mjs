import test from "node:test";
import assert from "node:assert/strict";

import { bindTwoBayEditMode } from "../dist/panel/lib/two-bay-edit-controller.js";
import { createTwoBayEditSession } from "../dist/panel/lib/two-bay-edit-session.js";
import { createInitialTwoBayConfiguration } from "../dist/panel/lib/two-bay-persistence-model.js";

test("enters edit mode from the menu and cancels back to normal mode", () => {
  const fake = harness();
  const rendered = [];
  bindTwoBayEditMode(fake.elements, fake.session, {
    getConfiguration: createInitialTwoBayConfiguration,
    onDraft: (configuration) => rendered.push(configuration.bays.bottom.visibleRows),
    onCancelled: (configuration) => rendered.push(configuration.bays.top.visibleRows),
  });

  assert.equal(fake.elements.entry.disabled, false);
  fake.elements.entry.emit("click");
  assert.equal(fake.elements.menu.hidden, true);
  assert.equal(fake.elements.frame.dataset.twoBayEditing, "true");
  assert.equal(fake.elements.canvas.hidden, false);
  assert.equal(fake.elements.confirm.disabled, true);
  assert.equal(fake.session.active, true);
  assert.deepEqual(rendered, [0]);

  fake.elements.cancel.emit("click");
  assert.equal("twoBayEditing" in fake.elements.frame.dataset, false);
  assert.equal(fake.elements.canvas.hidden, true);
  assert.equal(fake.session.active, false);
  assert.deepEqual(rendered, [0, 1]);
});

function harness() {
  const element = () => ({
    hidden: false,
    disabled: false,
    dataset: {},
    listeners: {},
    addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); },
    emit(type) { for (const listener of this.listeners[type] ?? []) listener({ type }); },
  });
  const elements = {
    entry: element(), menu: element(), frame: element(), canvas: element(),
    confirm: element(), cancel: element(),
  };
  return { elements, session: createTwoBayEditSession() };
}
