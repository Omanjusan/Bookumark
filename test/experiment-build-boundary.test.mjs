import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("marks the panel as experiment mode only inside the development build branch", async () => {
  const source = await readFile(new URL("../scripts/build.mjs", import.meta.url), "utf8");
  const developmentBranch = source.slice(source.indexOf("if (development) {"));

  assert.match(developmentBranch, /data-experiment-mode="true"/);
  assert.doesNotMatch(source.slice(0, source.indexOf("if (development) {")), /data-experiment-mode/);
});
