import test from "node:test";
import assert from "node:assert/strict";

import {
  createAmoArtifactPlan,
  validateReleaseVersions,
} from "../scripts/lib/amo-artifact-plan.mjs";

test("creates versioned AMO and source artifact names", () => {
  assert.deepEqual(createAmoArtifactPlan("0.1.1"), {
    artifactDirectory: "amo-artifacts",
    extensionArchive: "bookumark-0.1.1.zip",
    sourceArchive: "bookumark-0.1.1-source.zip",
    sourceEntries: [
      "AMO_BUILD.md",
      "LICENSE",
      "README.md",
      "manifest.json",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "scripts/build.mjs",
      "src",
      "panel/panel.html",
      "panel/panel.css",
      "panel/icons/bookmark.svg",
    ],
  });
});

test("source entries exclude generated, private, and unrelated project content", () => {
  const entries = createAmoArtifactPlan("0.1.1").sourceEntries;

  for (const excluded of [
    "dist", "node_modules", ".git", ".env", "amo-artifacts", "web-ext-artifacts",
    "docs", "progress.md", "test", "assets", "dev",
    "panel", "panel/panel.js", "panel/panel.js.map",
  ]) {
    assert.equal(entries.includes(excluded), false, excluded);
  }
});

test("accepts matching package and manifest versions", () => {
  assert.doesNotThrow(() => validateReleaseVersions("0.1.1", "0.1.1"));
});

test("rejects mismatched package and manifest versions", () => {
  assert.throws(
    () => validateReleaseVersions("0.1.1", "0.1.0"),
    /package version 0\.1\.1 does not match manifest version 0\.1\.0/,
  );
});

test("rejects empty or non-string release versions", () => {
  assert.throws(() => validateReleaseVersions("", ""), /release version is required/);
  assert.throws(() => validateReleaseVersions(undefined, "0.1.1"), /release version is required/);
});
