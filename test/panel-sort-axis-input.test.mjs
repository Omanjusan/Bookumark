import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");

test("provides a labelled sort-axis select enabled in the initial normal mode", () => {
  const select = html.match(/<select[^>]+id="sort-axis"[^>]*>/)?.[0] ?? "";
  assert.match(select, /aria-label="並び順"/);
  assert.doesNotMatch(select, /\bdisabled\b/);
  for (const axis of ["title", "dateAdded", "visitCount", "lastVisitTime"]) {
    assert.match(html, new RegExp(`<option[^>]+value="${axis}"`));
  }
  assert.ok(html.indexOf('id="app"') < html.indexOf('id="sort-axis"'));
});

test("delivers valid sort-axis changes and can disconnect", async () => {
  const { bindPanelSortAxisInput } = await import(
    "../dist/panel/lib/panel-sort-axis-input.js"
  );
  const listeners = new Set();
  const input = {
    value: "visitCount",
    addEventListener(type, listener) {
      assert.equal(type, "change");
      listeners.add(listener);
    },
    removeEventListener(type, listener) {
      assert.equal(type, "change");
      listeners.delete(listener);
    },
  };
  const axes = [];
  const connection = bindPanelSortAxisInput(input, (axis) => axes.push(axis));

  input.value = "title";
  for (const listener of listeners) listener();
  input.value = "lastVisitTime";
  for (const listener of listeners) listener();

  assert.deepEqual(axes, ["title", "lastVisitTime"]);
  connection.disconnect();
  input.value = "dateAdded";
  for (const listener of listeners) listener();
  assert.deepEqual(axes, ["title", "lastVisitTime"]);
});

test("ignores an axis value outside the standard axis contract", async () => {
  const { bindPanelSortAxisInput } = await import(
    "../dist/panel/lib/panel-sort-axis-input.js"
  );
  let listener;
  const input = {
    value: "custom",
    addEventListener(_type, nextListener) {
      listener = nextListener;
    },
    removeEventListener() {},
  };
  const axes = [];
  bindPanelSortAxisInput(input, (axis) => axes.push(axis));

  listener();

  assert.deepEqual(axes, []);
});
