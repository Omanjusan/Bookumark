import test from "node:test";
import assert from "node:assert/strict";

import {
  createPanelErrorNotificationAdapter,
} from "../dist/panel/lib/panel-error-notification.js";
import {
  createCommonNotificationQueue,
} from "../dist/panel/lib/common-notification-queue.js";

test("presents an initial load failure as a retry dialog without exposing diagnostics", () => {
  const fake = harness();
  const error = new Error("storage key folder-123 failed");
  const adapter = createPanelErrorNotificationAdapter(fake.dependencies);

  adapter.notify("initial-load", error);

  assert.deepEqual(fake.dialogs, [{
    id: "panel-initial-load-failure",
    severity: "error",
    title: "Bookumarkの読み込みに失敗しました",
    message: "Bookumarkの読み込みに失敗しました。再試行してください",
    primaryActionLabel: "再試行",
  }]);
  assert.doesNotMatch(JSON.stringify(fake.dialogs), /storage key|folder-123/);
  assert.deepEqual(fake.diagnostics, [{ operation: "initial-load", error }]);
  assert.equal(fake.renderCalls, 1);
});

test("aggregates folder navigation failures with a fixed error toast", () => {
  const fake = harness();
  const adapter = createPanelErrorNotificationAdapter(fake.dependencies);

  adapter.notify("folder-navigation", new Error("private-folder-name"));
  adapter.notify("folder-navigation", new Error("private-folder-name-2"));

  assert.deepEqual(fake.toasts, [
    {
      id: "panel-folder-navigation-failure-1",
      aggregateKey: "panel-folder-navigation-failures",
      severity: "error",
      message: "フォルダを読み込めませんでした。元の表示を維持しています",
    },
    {
      id: "panel-folder-navigation-failure-2",
      aggregateKey: "panel-folder-navigation-failures",
      severity: "error",
      message: "フォルダを読み込めませんでした。元の表示を維持しています",
    },
  ]);
  assert.doesNotMatch(JSON.stringify(fake.toasts), /private-folder-name/);
});

test("uses one save message while keeping bookmark and folder diagnostics distinct", () => {
  const fake = harness();
  const bookmarkError = new Error("bookmark-guid");
  const folderError = new Error("folder-guid");
  const adapter = createPanelErrorNotificationAdapter(fake.dependencies);

  adapter.notify("bookmark-custom-order-save", bookmarkError);
  adapter.notify("folder-custom-order-save", folderError);

  assert.equal(fake.toasts[0].message, "表示順を保存できませんでした。現在の並びはこの画面で維持されています");
  assert.equal(fake.toasts[1].message, fake.toasts[0].message);
  assert.notEqual(fake.toasts[0].aggregateKey, fake.toasts[1].aggregateKey);
  assert.deepEqual(fake.diagnostics, [
    { operation: "bookmark-custom-order-save", error: bookmarkError },
    { operation: "folder-custom-order-save", error: folderError },
  ]);
  assert.doesNotMatch(JSON.stringify(fake.toasts), /bookmark-guid|folder-guid/);
});

test("keeps notification ids unique while aggregate keys remain stable", () => {
  const fake = harness();
  const adapter = createPanelErrorNotificationAdapter(fake.dependencies);

  adapter.notify("bookmark-custom-order-save", new Error("first"));
  adapter.notify("bookmark-custom-order-save", new Error("second"));

  assert.equal(fake.toasts[0].aggregateKey, fake.toasts[1].aggregateKey);
  assert.notEqual(fake.toasts[0].id, fake.toasts[1].id);
});

test("reports a repeated failure without adding another notification", () => {
  const fake = harness();
  const retryError = new Error("retry failed");
  const adapter = createPanelErrorNotificationAdapter(fake.dependencies);

  adapter.notify("initial-load", new Error("first failed"));
  adapter.report("initial-load", retryError);

  assert.equal(fake.dialogs.length, 1);
  assert.deepEqual(fake.diagnostics.at(-1), {
    operation: "initial-load",
    error: retryError,
  });
});

test("does not schedule error toast expiry or change state when a toast is dismissed", () => {
  const fake = queueHarness();
  const state = { items: ["bookmark-1"], historyIndex: 2 };
  const before = structuredClone(state);
  const adapter = createPanelErrorNotificationAdapter({
    queue: fake.queue,
    render: () => {},
    reportDiagnostic: () => {},
  });

  adapter.notify("folder-navigation", new Error("failed"));
  const [toast] = fake.queue.toastSnapshot();
  fake.queue.dismissToast(toast.id);

  assert.equal(fake.scheduled.length, 0);
  assert.deepEqual(state, before);
});

test("isolates diagnostic, queue, and render failures from the caller", () => {
  const failures = [];
  const adapter = createPanelErrorNotificationAdapter({
    queue: {
      enqueueDialog: () => { throw new Error("dialog unavailable"); },
      enqueueToast: () => { throw new Error("toast unavailable"); },
    },
    render: () => { throw new Error("render unavailable"); },
    reportDiagnostic: () => { throw new Error("diagnostic unavailable"); },
    reportNotificationFailure: (failure) => { failures.push(failure); },
  });

  assert.doesNotThrow(() => adapter.notify("initial-load", new Error("load")));
  assert.doesNotThrow(() => adapter.notify("folder-navigation", new Error("navigation")));
  assert.deepEqual(failures.map(({ stage }) => stage), [
    "diagnostic", "enqueue", "diagnostic", "enqueue",
  ]);

  const renderFailures = [];
  const renderAdapter = createPanelErrorNotificationAdapter({
    queue: { enqueueDialog: () => {}, enqueueToast: () => {} },
    render: () => { throw new Error("render unavailable"); },
    reportDiagnostic: () => {},
    reportNotificationFailure: (failure) => { renderFailures.push(failure); },
  });
  assert.doesNotThrow(() => renderAdapter.notify("folder-navigation", new Error("navigation")));
  assert.deepEqual(renderFailures.map(({ stage }) => stage), ["render"]);

  const reportingAdapter = createPanelErrorNotificationAdapter({
    queue: { enqueueDialog: () => { throw new Error("queue unavailable"); }, enqueueToast: () => {} },
    render: () => {},
    reportDiagnostic: () => {},
    reportNotificationFailure: () => { throw new Error("report unavailable"); },
  });
  assert.doesNotThrow(() => reportingAdapter.notify("initial-load", new Error("load")));
});

function harness() {
  const dialogs = [];
  const toasts = [];
  const diagnostics = [];
  const result = {
    dialogs,
    toasts,
    diagnostics,
    renderCalls: 0,
  };
  result.dependencies = {
    queue: {
      enqueueDialog: (notification) => { dialogs.push(notification); },
      enqueueToast: (notification) => { toasts.push(notification); },
    },
    render: () => { result.renderCalls += 1; },
    reportDiagnostic: (diagnostic) => { diagnostics.push(diagnostic); },
  };
  return result;
}

function queueHarness() {
  const scheduled = [];
  return {
    scheduled,
    queue: createCommonNotificationQueue({
      schedule: (callback, delay) => {
        scheduled.push({ callback, delay });
        return scheduled.length;
      },
      cancel: () => {},
    }),
  };
}
