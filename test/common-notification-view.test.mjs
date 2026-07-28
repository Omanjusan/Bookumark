import test from "node:test";
import assert from "node:assert/strict";

import {
  bindCommonNotificationView,
} from "../dist/panel/lib/common-notification-view.js";

test("opens an active dialog with its content and focuses the primary action", () => {
  const fake = harness();
  const connection = bindCommonNotificationView(fake.elements, fake.options);

  connection.render({ dialog: dialogSnapshot(dialog("recovery")), toasts: [] });

  assert.equal(fake.elements.dialog.showModalCalls, 1);
  assert.equal(fake.elements.dialog.dataset.severity, "warning");
  assert.equal(fake.elements.title.textContent, "title-recovery");
  assert.equal(fake.elements.message.textContent, "recovery");
  assert.equal(fake.elements.primary.textContent, "確認");
  assert.equal(fake.elements.primary.focusCalls, 1);
});

test("reports the active id once and blocks the action while busy", () => {
  const fake = harness();
  const actions = [];
  const connection = bindCommonNotificationView(fake.elements, {
    ...fake.options,
    onDialogPrimary: (id) => actions.push(id),
  });
  connection.render({ dialog: dialogSnapshot(dialog("recovery")), toasts: [] });
  fake.elements.primary.emit("click");

  connection.render({ dialog: dialogSnapshot(dialog("recovery", true)), toasts: [] });
  fake.elements.primary.emit("click");

  assert.deepEqual(actions, ["recovery"]);
  assert.equal(fake.elements.primary.disabled, true);
  assert.equal(fake.elements.busy.hidden, false);
  assert.equal(fake.elements.busy.textContent, "処理中…");
});

test("updates the next FIFO dialog without reopening the native dialog", () => {
  const fake = harness();
  const connection = bindCommonNotificationView(fake.elements, fake.options);
  connection.render({ dialog: dialogSnapshot(dialog("first")), toasts: [] });

  connection.render({ dialog: dialogSnapshot(dialog("second")), toasts: [] });

  assert.equal(fake.elements.dialog.showModalCalls, 1);
  assert.equal(fake.elements.title.textContent, "title-second");
  assert.equal(fake.elements.message.textContent, "second");
});

test("prevents Escape and restores the previous focus when dialogs finish", () => {
  const fake = harness();
  const connection = bindCommonNotificationView(fake.elements, fake.options);
  connection.render({ dialog: dialogSnapshot(dialog("recovery")), toasts: [] });

  const cancel = fake.elements.dialog.emit("cancel");
  connection.render({ dialog: dialogSnapshot(null), toasts: [] });

  assert.equal(cancel.defaultPrevented, true);
  assert.equal(fake.elements.dialog.closeCalls, 1);
  assert.equal(fake.returnFocus.focusCalls, 1);
});

test("renders current toasts with severity and occurrence count in queue order", () => {
  const fake = harness();
  const connection = bindCommonNotificationView(fake.elements, fake.options);

  connection.render({
    dialog: dialogSnapshot(null),
    toasts: [
      toast("warning", "warning", "条件に失敗", 3),
      toast("error", "error", "保存に失敗", 1),
    ],
  });

  assert.deepEqual(fake.elements.toastRegion.children.map((item) => ({
    id: item.dataset.notificationId,
    severity: item.dataset.severity,
    message: item.children[0].textContent,
    occurrences: item.children[1].textContent,
  })), [
    { id: "warning", severity: "warning", message: "条件に失敗", occurrences: "3回" },
    { id: "error", severity: "error", message: "保存に失敗", occurrences: "" },
  ]);
});

test("dismisses only the selected toast and removes stale DOM on redraw", () => {
  const fake = harness();
  const dismissed = [];
  const connection = bindCommonNotificationView(fake.elements, {
    ...fake.options,
    onToastDismiss: (id) => dismissed.push(id),
  });
  const first = toast("first", "first", "一", 1);
  const second = toast("second", "second", "二", 1);
  connection.render({ dialog: dialogSnapshot(null), toasts: [first, second] });
  fake.elements.toastRegion.children[1].children[2].emit("click");

  connection.render({ dialog: dialogSnapshot(null), toasts: [first] });

  assert.deepEqual(dismissed, ["second"]);
  assert.deepEqual(
    fake.elements.toastRegion.children.map(({ dataset }) => dataset.notificationId),
    ["first"],
  );
});

test("does not mutate dialog or toast snapshots while rendering", () => {
  const fake = harness();
  const connection = bindCommonNotificationView(fake.elements, fake.options);
  const state = {
    dialog: dialogSnapshot(dialog("recovery")),
    toasts: [toast("warning", "warning", "警告", 2)],
  };
  const before = structuredClone(state);

  connection.render(state);

  assert.deepEqual(state, before);
});

function dialog(id, busy = false) {
  if (id === null) return null;
  return {
    id,
    severity: "warning",
    title: `title-${id}`,
    message: id,
    primaryActionLabel: "確認",
    busy,
  };
}

function dialogSnapshot(active) {
  return { active, pending: [] };
}

function toast(id, aggregateKey, message, occurrences) {
  return { id, aggregateKey, severity: id === "error" ? "error" : "warning", message, occurrences };
}

function harness() {
  const element = (tagName) => ({
    tagName: tagName.toUpperCase(),
    textContent: "",
    className: "",
    hidden: false,
    disabled: false,
    open: false,
    dataset: {},
    attributes: {},
    children: [],
    listeners: {},
    focusCalls: 0,
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...children) { this.children = children; },
    addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { this.focusCalls += 1; },
    emit(type, details = {}) {
      const event = {
        type,
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
        ...details,
      };
      for (const listener of this.listeners[type] ?? []) listener(event);
      return event;
    },
  });
  const returnFocus = element("button");
  const elements = {
    dialog: element("dialog"),
    title: element("h2"),
    message: element("p"),
    busy: element("p"),
    primary: element("button"),
    toastRegion: element("section"),
  };
  elements.busy.hidden = true;
  elements.dialog.showModalCalls = 0;
  elements.dialog.closeCalls = 0;
  elements.dialog.showModal = function () { this.open = true; this.showModalCalls += 1; };
  elements.dialog.close = function () { this.open = false; this.closeCalls += 1; };
  return {
    elements,
    returnFocus,
    options: {
      document: { activeElement: returnFocus, createElement: element },
      onDialogPrimary: () => {},
      onToastDismiss: () => {},
    },
  };
}
