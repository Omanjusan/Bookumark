import test from "node:test";
import assert from "node:assert/strict";

import {
  createDeprecatedChipDialogNotification,
  createDockingRecoveryDialogNotification,
} from "../dist/panel/lib/docking-recovery-notification.js";

test("formats structural recovery and aggregates unknown chips by bay and type", () => {
  const snapshot = recoverySnapshot();
  const notification = createDockingRecoveryDialogNotification(snapshot);
  assert.match(notification.message, /ベイ設定: 破損箇所を補正/);
  assert.match(notification.message, /レイアウト設定: 内部デフォルトへ復元/);
  assert.match(notification.message, /一／future-a（2件）/);
  assert.match(notification.message, /二／future-a（1件）/);
  assert.doesNotMatch(notification.message, /chip-[123]/);
  assert.equal(notification.primaryActionLabel, "復旧して続行");
});

test("formats deprecated bay counts, removed version and optional replacement", () => {
  const notification = createDeprecatedChipDialogNotification(deprecatedSummary());
  assert.match(notification.message, /旧検索（廃止: 0\.4\.0、合計3件、対象: 一（2件）、二（1件）、代替候補: 検索）/);
  assert.match(notification.message, /旧表示（廃止: 0\.3\.0、合計1件、対象: 二（1件））/);
  assert.doesNotMatch(notification.message, /旧表示.*代替候補/);
});

test("creates explicit retry notifications without mutating summaries", () => {
  const snapshot = recoverySnapshot();
  const summary = deprecatedSummary();
  const before = structuredClone({ snapshot, summary });
  const recovery = createDockingRecoveryDialogNotification(snapshot, true);
  const deprecated = createDeprecatedChipDialogNotification(summary, true);
  assert.equal(recovery.primaryActionLabel, "保存を再試行");
  assert.match(recovery.title, /保存に失敗/);
  assert.equal(deprecated.primaryActionLabel, "保存を再試行");
  assert.match(deprecated.title, /保存に失敗/);
  assert.deepEqual({ snapshot, summary }, before);
});

function recoverySnapshot() {
  return {
    recoveries: { bayConfigurations: "normalized", mainLayouts: "fallback", dockingMetadata: "unchanged" },
    changedDocuments: ["bayConfigurations", "mainLayouts"],
    removedUnknown: [
      { bayId: "bay-1", bayName: "一", instanceId: "chip-1", chipType: "future-a" },
      { bayId: "bay-1", bayName: "一", instanceId: "chip-2", chipType: "future-a" },
      { bayId: "bay-2", bayName: "二", instanceId: "chip-3", chipType: "future-a" },
    ],
  };
}

function deprecatedSummary() {
  return [
    { chipType: "legacy-search", displayName: "旧検索", deprecatedSince: "0.3.0", removedSince: "0.4.0", totalCount: 3, replacement: { chipType: "search", displayName: "検索" }, bays: [{ bayId: "bay-1", bayName: "一", count: 2 }, { bayId: "bay-2", bayName: "二", count: 1 }] },
    { chipType: "legacy-view", displayName: "旧表示", deprecatedSince: "0.2.0", removedSince: "0.3.0", totalCount: 1, replacement: null, bays: [{ bayId: "bay-2", bayName: "二", count: 1 }] },
  ];
}
