import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/panel/lib/docking-basic-chip-runtime.ts", import.meta.url), "utf8");

test("provides the direction button through the dynamic sort renderer", () => {
  assert.doesNotMatch(html, /id="sort-direction"/);
  assert.match(runtime, /snapshot\.sortDirection === "asc" \? "昇順" : "降順"/);
  assert.match(runtime, /direction\.dataset\.direction = snapshot\.sortDirection/);
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
