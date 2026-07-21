import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("provides one accessible three-choice movement mode group", () => {
  assert.match(html, /<fieldset[^>]+id="movement-mode"[^>]+class="movement-mode"/);
  assert.match(html, /<legend[^>]*>移動モード<\/legend>/);

  for (const value of ["custom-order", "normal", "directory-move"]) {
    assert.match(
      html,
      new RegExp(`<input[^>]+type="radio"[^>]+name="movement-mode"[^>]+value="${value}"`),
    );
  }
  const normal = html.match(/<input[^>]+value="normal"[^>]*>/)?.[0] ?? "";
  assert.match(normal, /\bchecked\b/);
  assert.match(html, /公式整理/);
  assert.match(html, /Firefox本体へ反映/);
});

test("styles the choices as one segmented control with distinct mode colors", () => {
  assert.match(css, /\.movement-mode-options\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(3,/s);
  assert.match(css, /\.movement-option--custom/);
  assert.match(css, /\.movement-option--normal/);
  assert.match(css, /\.movement-option--directory/);
  assert.match(css, /input:checked\s*\+\s*\.movement-segment/);
});

test("delivers checked mode changes and synchronizes state back to radios", async () => {
  const { bindMovementModeInput } = await import(
    "../dist/panel/lib/panel-movement-mode-input.js"
  );
  const fake = harness();
  const changes = [];
  const connection = bindMovementModeInput(fake.root, (mode) => changes.push(mode));

  fake.change(fake.inputs[2], true);
  assert.deepEqual(changes, ["directory-move"]);

  connection.setMode("custom-order");
  assert.deepEqual(fake.inputs.map(({ checked }) => checked), [true, false, false]);

  connection.disconnect();
  fake.change(fake.inputs[1]);
  assert.deepEqual(changes, ["directory-move"]);
});

test("ignores unchecked and invalid radio changes", async () => {
  const { bindMovementModeInput } = await import(
    "../dist/panel/lib/panel-movement-mode-input.js"
  );
  const fake = harness();
  const changes = [];
  bindMovementModeInput(fake.root, (mode) => changes.push(mode));

  fake.change(fake.inputs[0], false);
  fake.change({ checked: true, value: "invalid" }, true);

  assert.deepEqual(changes, []);
});

function harness() {
  const listeners = new Set();
  const inputs = ["custom-order", "normal", "directory-move"].map((value) => ({
    value,
    checked: value === "normal",
  }));
  return {
    inputs,
    root: {
      addEventListener(type, listener) {
        assert.equal(type, "change");
        listeners.add(listener);
      },
      removeEventListener(type, listener) {
        assert.equal(type, "change");
        listeners.delete(listener);
      },
      querySelectorAll(selector) {
        assert.equal(selector, 'input[name="movement-mode"]');
        return inputs;
      },
    },
    change(target, checked) {
      if (inputs.includes(target) && checked) {
        for (const input of inputs) input.checked = input === target;
      } else {
        target.checked = checked;
      }
      for (const listener of listeners) listener({ target });
    },
  };
}
