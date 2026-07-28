import test from "node:test";
import assert from "node:assert/strict";

import {
  createCommonNotificationQueue,
} from "../dist/panel/lib/common-notification-queue.js";

test("shows one dialog at a time and advances the pending queue in FIFO order", () => {
  const queue = createCommonNotificationQueue();
  queue.enqueueDialog(dialog("first"));
  queue.enqueueDialog(dialog("second"));
  queue.enqueueDialog(dialog("third"));

  assert.equal(queue.dialogSnapshot().active?.id, "first");
  assert.deepEqual(queue.dialogSnapshot().pending.map(({ id }) => id), ["second", "third"]);

  assert.equal(queue.completeActiveDialog("first"), true);
  assert.equal(queue.dialogSnapshot().active?.id, "second");
  assert.deepEqual(queue.dialogSnapshot().pending.map(({ id }) => id), ["third"]);
});

test("blocks dialog completion and duplicate operations while the active dialog is busy", () => {
  const queue = createCommonNotificationQueue();
  queue.enqueueDialog(dialog("recovery"));

  assert.equal(queue.beginActiveDialogOperation("recovery"), true);
  assert.equal(queue.beginActiveDialogOperation("recovery"), false);
  assert.equal(queue.completeActiveDialog("recovery"), false);
  assert.equal(queue.dialogSnapshot().active?.busy, true);

  assert.equal(queue.endActiveDialogOperation("recovery"), true);
  assert.equal(queue.completeActiveDialog("recovery"), true);
  assert.equal(queue.dialogSnapshot().active, null);
});

test("keeps different toast aggregation keys as separate notifications", () => {
  const clock = createClock();
  const queue = createCommonNotificationQueue(clock.options);
  queue.enqueueToast(toast("condition", "condition-failures", "2件失敗"));
  queue.enqueueToast(toast("storage", "storage-failure", "保存失敗", "error"));

  assert.deepEqual(queue.toastSnapshot().map(({ id, occurrences }) => ({ id, occurrences })), [
    { id: "condition", occurrences: 1 },
    { id: "storage", occurrences: 1 },
  ]);
});

test("updates a matching toast without adding an item and restarts warning expiry", () => {
  const clock = createClock();
  const queue = createCommonNotificationQueue(clock.options);
  queue.enqueueToast(toast("condition-1", "condition-failures", "1件失敗"));
  const firstTimer = clock.scheduled.at(-1);

  queue.enqueueToast(toast("condition-2", "condition-failures", "3件失敗"));

  const [current] = queue.toastSnapshot();
  assert.equal(queue.toastSnapshot().length, 1);
  assert.equal(current.id, "condition-1");
  assert.equal(current.message, "3件失敗");
  assert.equal(current.occurrences, 2);
  assert.deepEqual(clock.cancelled, [firstTimer.handle]);
  assert.equal(clock.scheduled.at(-1).delay, 8_000);
});

test("auto-dismisses warnings after eight seconds and keeps errors until manually dismissed", () => {
  const clock = createClock();
  const queue = createCommonNotificationQueue(clock.options);
  queue.enqueueToast(toast("warning", "warning", "警告"));
  queue.enqueueToast(toast("error", "error", "エラー", "error"));

  assert.equal(clock.scheduled.length, 1);
  assert.equal(clock.scheduled[0].delay, 8_000);
  clock.scheduled[0].callback();
  assert.deepEqual(queue.toastSnapshot().map(({ id }) => id), ["error"]);

  assert.equal(queue.dismissToast("error"), true);
  assert.deepEqual(queue.toastSnapshot(), []);
});

test("rejects invalid notification contracts without changing state", () => {
  const queue = createCommonNotificationQueue();

  assert.throws(
    () => queue.enqueueDialog({ ...dialog("valid"), id: "" }),
    /notification id must not be empty/,
  );
  assert.throws(
    () => queue.enqueueToast({ ...toast("valid", "key", "警告"), severity: "fatal" }),
    /invalid notification severity/,
  );
  assert.deepEqual(queue.dialogSnapshot(), { active: null, pending: [] });
  assert.deepEqual(queue.toastSnapshot(), []);
});

test("returns defensive snapshots and treats unknown completion or dismissal as unchanged", () => {
  const sourceDialog = dialog("dialog");
  const sourceToast = toast("toast", "toast-key", "警告");
  const queue = createCommonNotificationQueue();
  queue.enqueueDialog(sourceDialog);
  queue.enqueueToast(sourceToast);
  sourceDialog.message = "mutated input";
  sourceToast.message = "mutated input";

  const dialogs = queue.dialogSnapshot();
  const toasts = queue.toastSnapshot();
  dialogs.active.message = "mutated snapshot";
  toasts[0].message = "mutated snapshot";

  assert.equal(queue.dialogSnapshot().active?.message, "dialog");
  assert.equal(queue.toastSnapshot()[0].message, "警告");
  assert.equal(queue.completeActiveDialog("unknown"), false);
  assert.equal(queue.dismissToast("unknown"), false);
  assert.equal(queue.dialogSnapshot().active?.id, "dialog");
  assert.equal(queue.toastSnapshot()[0].id, "toast");
});

function dialog(id) {
  return {
    id,
    severity: "warning",
    title: `title-${id}`,
    message: id,
    primaryActionLabel: "確認",
  };
}

function toast(id, aggregateKey, message, severity = "warning") {
  return { id, aggregateKey, severity, message };
}

function createClock() {
  let nextHandle = 1;
  const scheduled = [];
  const cancelled = [];
  return {
    scheduled,
    cancelled,
    options: {
      schedule: (callback, delay) => {
        const handle = nextHandle;
        nextHandle += 1;
        scheduled.push({ handle, callback, delay });
        return handle;
      },
      cancel: (handle) => { cancelled.push(handle); },
    },
  };
}
