import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("keeps the first AMO candidate version synchronized", async () => {
  const packageDocument = JSON.parse(await read("package.json"));
  const lockDocument = JSON.parse(await read("package-lock.json"));
  const manifestDocument = JSON.parse(await read("manifest.json"));

  assert.equal(packageDocument.version, "0.1.1");
  assert.equal(lockDocument.version, "0.1.1");
  assert.equal(lockDocument.packages[""].version, "0.1.1");
  assert.equal(manifestDocument.version, "0.1.1");
});

test("documents manual unlisted submission without API credentials", async () => {
  const guide = await read("docs/amo-unlisted-release.md");

  assert.match(guide, /npm run build:amo/);
  assert.match(guide, /bookumark-0\.1\.1\.zip/);
  assert.match(guide, /bookumark-0\.1\.1-source\.zip/);
  assert.match(guide, /unlisted/);
  assert.match(guide, /APIキー.*使用しない/);
  assert.match(guide, /署名済みXPI/);
});

test("documents staged installation and the two DEV entry routes", async () => {
  const guide = await read("docs/amo-unlisted-release.md");

  assert.match(guide, /DEVプロファイル.*実務プロファイル/s);
  assert.match(guide, /ファイルからアドオンをインストール/);
  assert.match(guide, /npm run experiment/);
  assert.match(guide, /同時に使用しない/);
  assert.match(guide, /通常起動.*署名済み版/s);
});

function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}
