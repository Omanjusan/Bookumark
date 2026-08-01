import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PANEL_FLAVOR_IDS } from "../dist/panel/lib/panel-flavor.js";

const css = await readFile(new URL("../panel/panel.css", import.meta.url), "utf8");

test("defines light and dark backgrounds for every registered flavor", () => {
  for (const flavor of PANEL_FLAVOR_IDS) {
    const variable = `--panel-flavor-${flavor}-bg`;
    assert.equal(css.match(new RegExp(`${variable}:\\s*#[0-9a-f]{6}`, "gi"))?.length, 2);
    assert.match(css, new RegExp(`\\[data-panel-flavor="${flavor}"\\][^}]*background:\\s*var\\(${variable}\\)`, "s"));
  }
});

test("keeps panel flavor styling scoped away from the other three views", () => {
  assert.match(css, /\.panel-grid\s+\.panel-tile\[data-panel-flavor\]/);
  assert.doesNotMatch(css, /\.(?:list|icon|card)-tile\[data-panel-flavor\]/);
});

test("provides theme-specific readable text, border, and drag marker tokens", () => {
  for (const variable of ["text", "text-muted", "text-faint", "border"]) {
    assert.equal(css.match(new RegExp(`--panel-flavor-${variable}:\\s*#[0-9a-f]{6}`, "gi"))?.length, 2);
  }
  assert.match(css, /\.panel-grid\s+\.panel-tile\[data-panel-flavor\][^}]*--text:\s*var\(--panel-flavor-text\)/s);
  assert.match(css, /\.panel-grid\s+\.panel-tile\[data-panel-flavor\][^}]*--text-faint:\s*var\(--panel-flavor-text-faint\)/s);
});

test("meets the agreed contrast thresholds in both themes", () => {
  const light = css.match(/^:root\s*\{([^}]*)\}/s)?.[1] ?? "";
  const dark = css.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/s)?.[1] ?? "";

  for (const theme of [light, dark]) {
    const textColors = ["text", "text-muted", "text-faint"].map((name) => colorOf(theme, `panel-flavor-${name}`));
    const border = colorOf(theme, "panel-flavor-border");
    for (const flavor of PANEL_FLAVOR_IDS) {
      const background = colorOf(theme, `panel-flavor-${flavor}-bg`);
      for (const textColor of textColors) {
        assert.ok(contrastRatio(background, textColor) >= 4.5, `${flavor} text contrast`);
      }
      assert.ok(contrastRatio(background, border) >= 3, `${flavor} border contrast`);
    }
  }
});

function colorOf(cssBlock, variable) {
  const match = cssBlock.match(new RegExp(`--${variable}:\\s*(#[0-9a-f]{6})`, "i"));
  assert.ok(match, `missing --${variable}`);
  return match[1];
}

function contrastRatio(first, second) {
  const values = [relativeLuminance(first), relativeLuminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
