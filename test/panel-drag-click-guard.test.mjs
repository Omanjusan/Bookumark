import test from "node:test";
import assert from "node:assert/strict";

test("consumes only the first click after a drag starts", async () => {
  const { createPanelDragClickGuard } = await import(
    "../dist/panel/lib/panel-drag-click-guard.js"
  );
  const guard = createPanelDragClickGuard();

  assert.equal(guard.consumeClick(), false);
  guard.markDragStarted();
  assert.equal(guard.consumeClick(), true);
  assert.equal(guard.consumeClick(), false);
});

test("repeated drag marks still suppress only one subsequent click", async () => {
  const { createPanelDragClickGuard } = await import(
    "../dist/panel/lib/panel-drag-click-guard.js"
  );
  const guard = createPanelDragClickGuard();

  guard.markDragStarted();
  guard.markDragStarted();

  assert.equal(guard.consumeClick(), true);
  assert.equal(guard.consumeClick(), false);
});
