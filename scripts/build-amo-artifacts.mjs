import { mkdir, readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  createAmoArtifactPlan,
  validateReleaseVersions,
} from "./lib/amo-artifact-plan.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDocument = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const manifestDocument = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
validateReleaseVersions(packageDocument.version, manifestDocument.version);

const plan = createAmoArtifactPlan(packageDocument.version);
const artifactDirectory = path.join(root, plan.artifactDirectory);
await rm(artifactDirectory, { recursive: true, force: true });
await mkdir(artifactDirectory, { recursive: true });

await run(process.execPath, [path.join(root, "scripts", "build.mjs")]);
await run(process.execPath, [
  path.join(root, "node_modules", "web-ext", "bin", "web-ext.js"),
  "build",
  "--source-dir", path.join(root, "dist"),
  "--artifacts-dir", artifactDirectory,
  "--filename", plan.extensionArchive,
  "--overwrite-dest",
]);
await run("zip", [
  "-X", "-q", "-r",
  path.join(artifactDirectory, plan.sourceArchive),
  ...plan.sourceEntries,
]);

console.log(`AMO extension: ${path.join(artifactDirectory, plan.extensionArchive)}`);
console.log(`AMO source: ${path.join(artifactDirectory, plan.sourceArchive)}`);

/** 子プロセスをプロジェクトルートで実行し、正常終了まで待つ。 */
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}
