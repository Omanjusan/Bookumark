import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");

test("provides an initially disabled free-movement checkbox outside the drawing root", () => {
  assert.match(
    html,
    /<input[^>]+id="free-movement"[^>]+type="checkbox"/,
  );
  assert.doesNotMatch(html.match(/<input[^>]+id="free-movement"[^>]*>/)?.[0] ?? "", /\bchecked\b/);
  assert.match(html, /<label[^>]*>[^<]*<input[^>]+id="free-movement"[^>]*>[^<]*自由移動/);
  assert.ok(html.indexOf('id="app"') < html.indexOf('id="free-movement"'));
});

test("delivers each free-movement change and can disconnect", async () => {
  const { bindFreeMovementInput } = await import(
    "../dist/panel/lib/panel-free-movement-input.js"
  );
  const listeners = new Set();
  const input = {
    checked: true,
    addEventListener(type, listener) {
      assert.equal(type, "change");
      listeners.add(listener);
    },
    removeEventListener(type, listener) {
      assert.equal(type, "change");
      listeners.delete(listener);
    },
  };
  const changes = [];
  const connection = bindFreeMovementInput(input, (enabled) => changes.push(enabled));

  input.checked = false;
  for (const listener of listeners) listener();
  input.checked = true;
  for (const listener of listeners) listener();

  assert.deepEqual(changes, [false, true]);
  connection.disconnect();
  input.checked = false;
  for (const listener of listeners) listener();
  assert.deepEqual(changes, [false, true]);
});
