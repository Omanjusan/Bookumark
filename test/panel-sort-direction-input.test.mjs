import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");

test("provides an enabled direction button showing the initial descending direction", () => {
  assert.match(
    html,
    /<button[^>]+id="sort-direction"[^>]+type="button"[^>]+data-direction="desc"[^>]*>\s*降順\s*<\/button>/,
  );
  const button = html.match(/<button[^>]+id="sort-direction"[^>]*>/)?.[0] ?? "";
  assert.doesNotMatch(button, /\bdisabled\b/);
  assert.ok(html.indexOf('id="sort-axis"') < html.indexOf('id="sort-direction"'));
});

test("delivers each direction-button activation and can disconnect", async () => {
  const { bindPanelSortDirectionInput } = await import(
    "../dist/panel/lib/panel-sort-direction-input.js"
  );
  const listeners = new Set();
  const button = {
    addEventListener(type, listener) {
      assert.equal(type, "click");
      listeners.add(listener);
    },
    removeEventListener(type, listener) {
      assert.equal(type, "click");
      listeners.delete(listener);
    },
  };
  let activations = 0;
  const connection = bindPanelSortDirectionInput(button, () => {
    activations += 1;
  });

  for (const listener of listeners) listener();
  for (const listener of listeners) listener();
  assert.equal(activations, 2);

  connection.disconnect();
  for (const listener of listeners) listener();
  assert.equal(activations, 2);
});
