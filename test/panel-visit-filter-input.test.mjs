import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/panel/lib/docking-basic-chip-runtime.ts", import.meta.url), "utf8");

test("provides accessible visit choices through the dynamic renderer", () => {
  assert.doesNotMatch(html, /id="visit-status-filter"/);
  assert.match(runtime, /fieldset\.className = "visit-status-filter"/);
  for (const value of ["all", "visited", "unvisited"]) assert.match(runtime, new RegExp(`"${value}"`));
  for (const label of ["すべて", "訪問あり", "未訪問"]) assert.match(runtime, new RegExp(label));
});

test("delivers valid changes, keeps choices exclusive, and synchronizes state", async () => {
  const { bindVisitStatusFilterInput } = await import(
    "../dist/panel/lib/panel-visit-filter-input.js"
  );
  const fake = createFakeGroup();
  const changes = [];
  const connection = bindVisitStatusFilterInput(fake.root, (value) => changes.push(value));

  fake.change(fake.inputs[1]);
  fake.change(fake.inputs[2]);
  assert.deepEqual(changes, ["visited", "unvisited"]);
  assert.deepEqual(fake.inputs.map(({ checked }) => checked), [false, false, true]);

  connection.setValue("all");
  assert.deepEqual(fake.inputs.map(({ checked }) => checked), [true, false, false]);
  connection.disconnect();
  fake.change(fake.inputs[1]);
  assert.deepEqual(changes, ["visited", "unvisited"]);
});

function createFakeGroup() {
  const listeners = new Set();
  const inputs = ["all", "visited", "unvisited"].map((value) => ({
    value,
    checked: value === "all",
  }));
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, 'input[name="visit-status"]');
      return inputs;
    },
    addEventListener(type, listener) {
      assert.equal(type, "change");
      listeners.add(listener);
    },
    removeEventListener(type, listener) {
      assert.equal(type, "change");
      listeners.delete(listener);
    },
  };
  return {
    root,
    inputs,
    change(input) {
      for (const candidate of inputs) candidate.checked = candidate === input;
      for (const listener of listeners) listener({ target: input });
    },
  };
}
