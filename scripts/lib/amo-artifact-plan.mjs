const SOURCE_ENTRIES = Object.freeze([
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
]);

/** AMO提出用成果物の名前と、審査用ソースZIPの許可リストを返す。 */
export function createAmoArtifactPlan(version) {
  return {
    artifactDirectory: "amo-artifacts",
    extensionArchive: `bookumark-${version}.zip`,
    sourceArchive: `bookumark-${version}-source.zip`,
    sourceEntries: [...SOURCE_ENTRIES],
  };
}

/** packageとmanifestのリリースバージョンが存在し、一致することを検証する。 */
export function validateReleaseVersions(packageVersion, manifestVersion) {
  if (typeof packageVersion !== "string" || packageVersion.length === 0
    || typeof manifestVersion !== "string" || manifestVersion.length === 0) {
    throw new Error("release version is required");
  }
  if (packageVersion !== manifestVersion) {
    throw new Error(
      `package version ${packageVersion} does not match manifest version ${manifestVersion}`,
    );
  }
}
