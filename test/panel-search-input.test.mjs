import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/panel/lib/docking-basic-chip-runtime.ts", import.meta.url), "utf8");

test("provides labelled search inputs through the dynamic renderer", () => {
  assert.doesNotMatch(html, /id="search"/);
  assert.match(runtime, /input\.type = "search"/);
  assert.match(runtime, /"aria-label", "ブックマークを検索"/);
});

test("delivers every changed search query immediately and can disconnect", async () => {
  const { bindPanelSearchInput } = await import(
    "../dist/panel/lib/panel-search-input.js"
  );
  const listeners = new Set();
  const input = {
    value: "",
    addEventListener(type, listener) {
      assert.equal(type, "input");
      listeners.add(listener);
    },
    removeEventListener(type, listener) {
      assert.equal(type, "input");
      listeners.delete(listener);
    },
  };
  const queries = [];
  const connection = bindPanelSearchInput(input, (query) => queries.push(query));

  input.value = "alpha beta";
  for (const listener of listeners) listener();
  input.value = "gamma";
  for (const listener of listeners) listener();

  assert.deepEqual(queries, ["alpha beta", "gamma"]);
  connection.disconnect();
  input.value = "ignored";
  for (const listener of listeners) listener();
  assert.deepEqual(queries, ["alpha beta", "gamma"]);
});
