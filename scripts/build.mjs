import { rm, mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const development = process.argv.includes("--development");

/**
 * 子プロセスを現在のプロジェクトルートで実行し、終了を待つ。
 *
 * @param {string} command 実行するコマンドのパス
 * @param {string[]} args コマンドへ渡す引数
 * @returns {Promise<void>} 終了コード0で解決するPromise
 * @throws {Error} プロセスの起動に失敗した場合、または終了コードが0以外の場合
 */
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

if (!development) {
  await rm(path.join(dist, "background.js"), { force: true });
}

await mkdir(path.join(dist, "panel"), { recursive: true });
await Promise.all([
  copyFile(path.join(root, "manifest.json"), path.join(dist, "manifest.json")),
  copyFile(path.join(root, "panel", "panel.html"), path.join(dist, "panel", "panel.html")),
  copyFile(path.join(root, "panel", "panel.css"), path.join(dist, "panel", "panel.css")),
]);

if (development) {
  const manifestPath = path.join(dist, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.background = { scripts: ["background.js"] };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
