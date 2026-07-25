import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");

test("places an accessible four-choice view bay between sort and movement", () => {
  const sortAt = html.indexOf('aria-label="ソートベイ"');
  const viewAt = html.indexOf('aria-label="表示形式ベイ"');
  const movementAt = html.indexOf('aria-label="移動モードベイ"');
  assert.ok(sortAt >= 0 && sortAt < viewAt && viewAt < movementAt);
  assert.match(
    html,
    /<fieldset[^>]+id="view-type"[^>]+class="view-type"[^>]*>[\s\S]*?<legend>表示形式<\/legend>/,
  );
  for (const [value, label] of [
    ["panel", "パネル"],
    ["icon", "アイコン"],
    ["card", "カード"],
    ["list", "一覧"],
  ]) {
    assert.match(
      html,
      new RegExp(`<input[^>]+type="radio"[^>]+name="view-type"[^>]+value="${value}"[^>]*>[\\s\\S]*?${label}`),
    );
  }
  const panel = html.match(/<input[^>]+value="panel"[^>]*>/)?.[0] ?? "";
  assert.match(panel, /\bchecked\b/);
});

test("delivers valid view changes and synchronizes multiple controls", async () => {
  const { bindViewTypeInput } = await import(
    "../dist/panel/lib/panel-view-type-input.js"
  );
  const first = createFakeGroup();
  const second = createFakeGroup();
  const connections = [];
  const renderAll = (value) => {
    for (const connection of connections) connection.setValue(value);
  };
  connections.push(bindViewTypeInput(first.root, renderAll));
  connections.push(bindViewTypeInput(second.root, renderAll));

  first.change(first.inputs[2]);
  assert.deepEqual(first.inputs.map(({ checked }) => checked), [false, false, true, false]);
  assert.deepEqual(second.inputs.map(({ checked }) => checked), [false, false, true, false]);

  connections.forEach((connection) => connection.disconnect());
  second.change(second.inputs[3]);
  assert.deepEqual(first.inputs.map(({ checked }) => checked), [false, false, true, false]);
});

function createFakeGroup() {
  const listeners = new Set();
  const inputs = ["panel", "icon", "card", "list"].map((value) => ({
    value,
    checked: value === "panel",
  }));
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, 'input[name="view-type"]');
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
