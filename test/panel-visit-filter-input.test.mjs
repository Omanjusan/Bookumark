import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");

test("places one accessible visit filter bay after the search bay", () => {
  const searchAt = html.indexOf('aria-label="検索ベイ"');
  const filterAt = html.indexOf('aria-label="訪問状態フィルタベイ"');
  const foldersAt = html.indexOf('id="folders"');
  assert.ok(searchAt >= 0 && searchAt < filterAt && filterAt < foldersAt);
  assert.match(
    html,
    /<fieldset[^>]+id="visit-status-filter"[^>]+class="visit-status-filter"[^>]*>[\s\S]*?<legend>訪問状態<\/legend>/,
  );
  for (const [value, label] of [
    ["all", "すべて"],
    ["visited", "訪問あり"],
    ["unvisited", "未訪問"],
  ]) {
    assert.match(
      html,
      new RegExp(`<input[^>]+type="radio"[^>]+name="visit-status"[^>]+value="${value}"[^>]*>[\\s\\S]*?${label}`),
    );
  }
  const all = html.match(/<input[^>]+value="all"[^>]*>/)?.[0] ?? "";
  assert.match(all, /\bchecked\b/);
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
