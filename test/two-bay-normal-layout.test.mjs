import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");
const html = await readFile(new URL("../panel/panel.html", import.meta.url), "utf8");
const source = await readFile(new URL("../src/panel/panel.ts", import.meta.url), "utf8");
const viewSource = await readFile(new URL("../src/panel/lib/two-bay-view.ts", import.meta.url), "utf8");

test("uses a full-height three-row layout without page scrolling", () => {
  assert.match(css, /html,\s*body\s*\{[^}]*height:\s*100%/s);
  assert.match(css, /body\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.frame\[data-docking-runtime="two-bay"\]\s*\{[^}]*height:\s*100vh/s);
  assert.match(css, /\.frame\[data-docking-runtime="two-bay"\]\s+\.docking-grid\s*\{[^}]*grid-template-areas:[^}]*"top"[^}]*"center"[^}]*"bottom"/s);
  assert.match(css, /\.frame\[data-docking-runtime="two-bay"\]\s+#docking-center\s*\{[^}]*overflow-y:\s*auto/s);
});

test("removes the legacy title row from the active two-bay layout", () => {
  assert.match(html, /<header>[\s\S]*?<h1>Bookumark<\/h1>[\s\S]*?id="count"/);
  assert.match(css, /\.frame > header\[hidden\]\s*\{\s*display:\s*none/);
  assert.match(source, /const legacyPanelHeader = document\.querySelector\("\.frame > header"\)/);
  const disconnect = source.slice(
    source.indexOf("function disconnectLegacyDockingSurface"),
    source.indexOf("disconnectLegacyDockingSurface();"),
  );
  assert.match(disconnect, /legacyPanelHeader/);
});

test("gives every visible bay row its own horizontal scroll viewport", () => {
  assert.match(css, /\.two-bay-row\s*\{[^}]*display:\s*flex[^}]*width:\s*100%[^}]*box-sizing:\s*border-box[^}]*overflow-x:\s*auto[^}]*overflow-y:\s*hidden/s);
  assert.match(css, /\.frame\[data-docking-runtime="two-bay"\]\s+\.dock-rail--bottom\s*\{[^}]*flex-direction:\s*column-reverse/s);
});

test("groups normal rows inside one expanding bay frame", () => {
  assert.match(css, /\.dock-rail\[data-two-bay-presentation="normal"\]\s*\{[^}]*gap:\s*0[^}]*border:\s*1px solid var\(--border\)[^}]*border-radius:/s);
  assert.match(css, /\.dock-rail\[data-two-bay-presentation="normal"\] > \.two-bay-row\s*\{[^}]*border:\s*0[^}]*border-radius:\s*0[^}]*background:\s*transparent/s);
  assert.doesNotMatch(css, /data-two-bay-presentation="normal"\][^{]*\.two-bay-row \+ \.two-bay-row\s*\{/);
  assert.match(viewSource, /root\.dataset\.twoBayPresentation\s*=\s*options\.edit === undefined \? "normal" : "edit"/);
});

test("separates control, content, and lower-bay surfaces with spacing and boundaries", () => {
  assert.match(css, /--content-surface:\s*#[0-9a-f]{6}/i);
  assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*?--content-surface:\s*#[0-9a-f]{6}/i);
  assert.match(css, /\.frame\[data-docking-runtime="two-bay"\]\s+\.docking-grid\s*\{[^}]*row-gap:\s*10px/s);
  assert.match(css, /\.frame\[data-docking-runtime="two-bay"\]\s+#docking-center\s*\{[^}]*background:\s*var\(--content-surface\)[^}]*border-block:/s);
  assert.match(css, /\.dock-rail\[data-two-bay-presentation="normal"\]\s*\{[^}]*background:\s*var\(--surface\)[^}]*box-shadow:/s);
});

test("styles empty visible rows as placement areas without consuming pointer input", () => {
  assert.match(css, /\.two-bay-empty-placeholder\s*\{[^}]*border:\s*1px dashed var\(--border\)[^}]*pointer-events:\s*none/s);
});

test("renders the normalized two-bay plan before the first bookmark redraw", () => {
  const start = source.indexOf("async function loadAndStartPanelRuntime");
  const end = source.indexOf("export async function loadAndStartLegacyPanelRuntime");
  const active = source.slice(start, end);
  const renderStart = source.indexOf("function renderActiveTwoBayConfiguration");
  const renderEnd = source.indexOf("/** 動的4レール", renderStart);
  const render = source.slice(renderStart, renderEnd);
  assert.match(active, /renderActiveTwoBayConfiguration\(twoBayState\.configuration\)/);
  assert.match(render, /buildTwoBayDrawingPlan\(configuration\)/);
  assert.match(render, /renderTwoBay\(dockingRailRoots\.top/);
  assert.match(render, /renderTwoBay\(dockingRailRoots\.bottom/);
  assert.ok(render.indexOf("renderTwoBay(dockingRailRoots.top") < render.indexOf("redraw()"));
});
