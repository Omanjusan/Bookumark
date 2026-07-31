import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("injects the DB-15 performance harness into development builds only", async () => {
  const build = await readFile("scripts/build.mjs", "utf8");
  const harness = await readFile("src/dev/db15-performance.ts", "utf8");

  assert.match(build, /db15-performance\.js/);
  assert.match(build, /<script type="module" src="\.\.\/dev\/db15-performance\.js"><\/script>/);
  assert.match(harness, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
  assert.match(harness, /sessionStorage/);
  for (const metric of ["startup", "view-switch", "search", "sort", "layout-switch", "layout-edit", "drop-redraw"]) {
    assert.match(harness, new RegExp(`"${metric}"`));
  }
});
