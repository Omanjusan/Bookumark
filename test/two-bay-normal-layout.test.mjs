import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");
const source = await readFile(new URL("../src/panel/panel.ts", import.meta.url), "utf8");

test("uses a full-height three-row layout without page scrolling", () => {
  assert.match(css, /html,\s*body\s*\{[^}]*height:\s*100%/s);
  assert.match(css, /body\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.frame\[data-docking-runtime="two-bay"\]\s*\{[^}]*height:\s*100vh/s);
  assert.match(css, /\.frame\[data-docking-runtime="two-bay"\]\s+\.docking-grid\s*\{[^}]*grid-template-areas:[^}]*"top"[^}]*"center"[^}]*"bottom"/s);
  assert.match(css, /\.frame\[data-docking-runtime="two-bay"\]\s+#docking-center\s*\{[^}]*overflow-y:\s*auto/s);
});

test("gives every visible bay row its own horizontal scroll viewport", () => {
  assert.match(css, /\.two-bay-row\s*\{[^}]*display:\s*flex[^}]*overflow-x:\s*auto[^}]*overflow-y:\s*hidden/s);
  assert.match(css, /\.frame\[data-docking-runtime="two-bay"\]\s+\.dock-rail--bottom\s*\{[^}]*flex-direction:\s*column-reverse/s);
});

test("renders the normalized two-bay plan before the first bookmark redraw", () => {
  const start = source.indexOf("async function loadAndStartPanelRuntime");
  const end = source.indexOf("export async function loadAndStartLegacyPanelRuntime");
  const active = source.slice(start, end);
  assert.match(active, /buildTwoBayDrawingPlan\(twoBayState\.configuration\)/);
  assert.match(active, /renderTwoBay\(dockingRailRoots\.top/);
  assert.match(active, /renderTwoBay\(dockingRailRoots\.bottom/);
  assert.ok(active.indexOf("renderTwoBay(dockingRailRoots.top") < active.indexOf("redraw()"));
});
