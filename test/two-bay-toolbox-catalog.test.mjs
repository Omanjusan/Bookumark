import test from "node:test";
import assert from "node:assert/strict";

import { TWO_BAY_TOOLBOX_CATEGORIES } from "../dist/panel/lib/two-bay-toolbox-catalog.js";

test("defines display categories independently from chip types", () => {
  assert.deepEqual(TWO_BAY_TOOLBOX_CATEGORIES.map(({ id, label }) => [id, label]), [
    ["filter", "絞り込み"], ["navigation", "ナビゲーション"],
    ["display", "表示"], ["information", "情報"],
  ]);
  assert.deepEqual(TWO_BAY_TOOLBOX_CATEGORIES[0].tools.map((tool) => tool.chipType), [
    "search", "visit-status",
  ]);
  assert.deepEqual(TWO_BAY_TOOLBOX_CATEGORIES[3].tools.map((tool) => tool.label), [
    "タイトル・件数", "日付", "時計",
  ]);
  assert.equal(TWO_BAY_TOOLBOX_CATEGORIES[3].tools[0].chipType, "bookmark-summary");
  assert.equal(TWO_BAY_TOOLBOX_CATEGORIES[3].tools.every((tool) => tool.enabled), true);
});
