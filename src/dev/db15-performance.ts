type MetricName =
  | "startup"
  | "view-switch"
  | "search"
  | "sort"
  | "layout-switch"
  | "layout-edit"
  | "drop-redraw";

type Samples = Record<MetricName, number[]>;

const STORAGE_KEY = "db15.performance.samples.v1";
const METRICS: readonly MetricName[] = [
  "startup",
  "view-switch",
  "search",
  "sort",
  "layout-switch",
  "layout-edit",
  "drop-redraw",
];
let samples = loadSamples();
const view = createView();
render();

document.addEventListener("input", (event) => {
  if (closest(event.target, ".dock-control--search") !== null) startMeasurement("search");
}, true);
document.addEventListener("change", (event) => {
  const target = event.target;
  if (closest(target, ".dock-control--view-type") !== null) startMeasurement("view-switch");
  else if (closest(target, ".dock-control--sort") !== null) startMeasurement("sort");
  else if ((target as HTMLElement | null)?.id === "layout-select") startMeasurement("layout-switch");
}, true);
document.addEventListener("click", (event) => {
  if ((event.target as HTMLElement | null)?.id === "layout-edit-entry") {
    startMeasurement("layout-edit");
  }
}, true);
document.addEventListener("drop", () => startMeasurement("drop-redraw"), true);

const readyObserver = new MutationObserver(() => recordStartupWhenReady());
readyObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
recordStartupWhenReady();

/** パネル操作開始からブラウザーが2回描画機会を得るまでを記録する。 */
function startMeasurement(name: MetricName, start = performance.now()): void {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    samples[name].push(round(performance.now() - start));
    persistAndRender();
  }));
}

/** 初期データと件数が描画された最初のフレームを起動完了として記録する。 */
function recordStartupWhenReady(): void {
  const count = document.querySelector("#count")?.textContent ?? "";
  const app = document.querySelector("#app");
  if (!count.includes("件") || app === null || app.querySelector(".status") !== null) return;
  readyObserver.disconnect();
  startMeasurement("startup", 0);
}

/** 現在値をsessionStorageへ保存し、計測パネルを更新する。 */
function persistAndRender(): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
  render();
}

/** 計測値の件数、中央値、最大値を小さな開発パネルへ表示する。 */
function render(): void {
  view.output.textContent = METRICS.map((name) => {
    const values = samples[name];
    return `${name}: n=${values.length} median=${median(values)} max=${maximum(values)}`;
  }).join("\n");
}

/** 開発計測パネルをbody末尾へ生成する。 */
function createView(): { output: HTMLElement } {
  const details = document.createElement("details");
  details.hidden = true;
  details.style.cssText = "position:fixed;z-index:9999;left:8px;bottom:8px;max-width:calc(100vw - 16px);padding:6px;background:#111;color:#eee;border:1px solid #777;font:11px monospace";
  const summary = document.createElement("summary");
  summary.textContent = "DB-15性能計測";
  const output = document.createElement("pre");
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "JSONをコピー";
  copy.addEventListener("click", () => {
    void navigator.clipboard.writeText(JSON.stringify(samples, null, 2));
  });
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "リセット";
  reset.addEventListener("click", () => {
    samples = emptySamples();
    persistAndRender();
  });
  details.append(summary, output, copy, reset);
  document.body.appendChild(details);
  return { output };
}

/** 保存値を検証し、不正なら空の計測集合へ戻す。 */
function loadSamples(): Samples {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as unknown;
    if (typeof parsed !== "object" || parsed === null) return emptySamples();
    const record = parsed as Record<string, unknown>;
    if (!METRICS.every((name) => Array.isArray(record[name])
      && (record[name] as unknown[]).every((value) => typeof value === "number"))) {
      return emptySamples();
    }
    const loaded = emptySamples();
    for (const name of METRICS) loaded[name] = structuredClone(record[name]) as number[];
    return loaded;
  } catch {
    return emptySamples();
  }
}

/** 全7項目を空配列で初期化する。 */
function emptySamples(): Samples {
  return {
    startup: [],
    "view-switch": [],
    search: [],
    sort: [],
    "layout-switch": [],
    "layout-edit": [],
    "drop-redraw": [],
  };
}

/** EventTargetから指定selectorの祖先要素を取得する。 */
function closest(target: EventTarget | null, selector: string): Element | null {
  return (target as Element | null)?.closest?.(selector) ?? null;
}

/** 偶数件では中央2値の平均を返す。 */
function median(values: readonly number[]): string {
  if (values.length === 0) return "-";
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
  return `${round(value)}ms`;
}

/** 空配列を除き最大値を表示用文字列へ変換する。 */
function maximum(values: readonly number[]): string {
  return values.length === 0 ? "-" : `${round(Math.max(...values))}ms`;
}

/** ミリ秒を小数第3位へ丸める。 */
function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
