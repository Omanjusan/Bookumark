import test from "node:test";
import assert from "node:assert/strict";

import {
  createPanelInitialLoadController,
} from "../dist/panel/lib/panel-initial-load-controller.js";
import {
  createCommonNotificationQueue,
} from "../dist/panel/lib/common-notification-queue.js";

test("publishes one successful initial load without showing an error dialog", async () => {
  const fake = harness(["ready"]);

  assert.equal(await fake.controller.start(), true);

  assert.deepEqual(fake.published, ["ready"]);
  assert.equal(fake.queue.dialogSnapshot().active, null);
  assert.equal(fake.attempts(), 1);
});

test("keeps a failed candidate unpublished and queues the fixed retry dialog", async () => {
  const failure = new Error("partial private state");
  const fake = harness([failure]);

  assert.equal(await fake.controller.start(), false);

  assert.deepEqual(fake.published, []);
  assert.equal(fake.queue.dialogSnapshot().active?.id, "panel-initial-load-failure");
  assert.doesNotMatch(fake.queue.dialogSnapshot().active.message, /partial private state/);
  assert.deepEqual(fake.diagnostics, [{ operation: "initial-load", error: failure }]);
});

test("restarts the complete load and publishes once after a successful retry", async () => {
  const fake = harness([new Error("first"), "ready"]);
  await fake.controller.start();

  assert.equal(await fake.controller.handlePrimary("panel-initial-load-failure"), true);

  assert.equal(fake.attempts(), 2);
  assert.deepEqual(fake.published, ["ready"]);
  assert.equal(fake.queue.dialogSnapshot().active, null);
});

test("blocks duplicate starts and retry actions while an attempt is running", async () => {
  const pending = deferred();
  const fake = harness([new Error("first"), pending.promise]);
  await fake.controller.start();

  const retry = fake.controller.handlePrimary("panel-initial-load-failure");
  assert.equal(fake.queue.dialogSnapshot().active?.busy, true);
  assert.equal(await fake.controller.handlePrimary("panel-initial-load-failure"), false);
  assert.equal(await fake.controller.start(), false);
  assert.equal(fake.attempts(), 2);

  pending.resolve("ready");
  assert.equal(await retry, true);
  assert.deepEqual(fake.published, ["ready"]);
});

test("returns a failed retry to the same retryable dialog", async () => {
  const retryFailure = new Error("retry failed");
  const fake = harness([new Error("first"), retryFailure]);
  await fake.controller.start();

  assert.equal(await fake.controller.handlePrimary("panel-initial-load-failure"), false);

  assert.equal(fake.queue.dialogSnapshot().active?.id, "panel-initial-load-failure");
  assert.equal(fake.queue.dialogSnapshot().active?.busy, false);
  assert.deepEqual(fake.published, []);
  assert.deepEqual(fake.diagnostics.map(({ error }) => error), [
    fake.outcomes[0], retryFailure,
  ]);
});

test("preserves an active dialog and FIFO order around an initial load failure", async () => {
  const fake = harness([new Error("load")]);
  fake.queue.enqueueDialog(dialog("existing"));

  await fake.controller.start();

  assert.equal(fake.queue.dialogSnapshot().active?.id, "existing");
  assert.deepEqual(fake.queue.dialogSnapshot().pending.map(({ id }) => id), [
    "panel-initial-load-failure",
  ]);
  assert.equal(await fake.controller.handlePrimary("panel-initial-load-failure"), false);
  fake.queue.completeActiveDialog("existing");
  assert.equal(fake.queue.dialogSnapshot().active?.id, "panel-initial-load-failure");
});

test("keeps the retry usable when failure reporting or rendering fails", async () => {
  const queue = createCommonNotificationQueue();
  const controller = createPanelInitialLoadController({
    load: async () => { throw new Error("load"); },
    publish: () => { throw new Error("must not publish"); },
    queue,
    notifyFailure: () => {
      queue.enqueueDialog(dialog("panel-initial-load-failure"));
      throw new Error("render failed");
    },
    reportRetryFailure: () => { throw new Error("diagnostic failed"); },
    render: () => { throw new Error("render failed"); },
  });

  assert.equal(await controller.start(), false);
  assert.equal(queue.dialogSnapshot().active?.id, "panel-initial-load-failure");
  assert.equal(await controller.handlePrimary("panel-initial-load-failure"), false);
  assert.equal(queue.dialogSnapshot().active?.busy, false);
});

function harness(outcomes) {
  const queue = createCommonNotificationQueue();
  const published = [];
  const diagnostics = [];
  let attempt = 0;
  const controller = createPanelInitialLoadController({
    load: async () => {
      const outcome = outcomes[attempt];
      attempt += 1;
      const settled = await outcome;
      if (settled instanceof Error) throw settled;
      return settled;
    },
    publish: (candidate) => { published.push(candidate); },
    queue,
    notifyFailure: (error) => {
      diagnostics.push({ operation: "initial-load", error });
      queue.enqueueDialog(dialog("panel-initial-load-failure"));
    },
    reportRetryFailure: (error) => {
      diagnostics.push({ operation: "initial-load", error });
    },
    render: () => {},
  });
  return {
    controller,
    queue,
    outcomes,
    published,
    diagnostics,
    attempts: () => attempt,
  };
}

function dialog(id) {
  return {
    id,
    severity: "error",
    title: "Bookumarkの読み込みに失敗しました",
    message: "Bookumarkの読み込みに失敗しました。再試行してください",
    primaryActionLabel: "再試行",
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
