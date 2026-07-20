import { rm, mkdir, copyFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

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

await rm(dist, { recursive: true, force: true });
await run(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc")]);

await mkdir(path.join(dist, "panel"), { recursive: true });
await Promise.all([
  copyFile(path.join(root, "manifest.json"), path.join(dist, "manifest.json")),
  copyFile(path.join(root, "panel", "panel.html"), path.join(dist, "panel", "panel.html")),
  copyFile(path.join(root, "panel", "panel.css"), path.join(dist, "panel", "panel.css")),
]);
