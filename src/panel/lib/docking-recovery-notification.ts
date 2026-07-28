import type { CommonDialogNotification } from "./common-notification-queue.js";
import type { DeprecatedChipSummary } from "./docking-deprecated-chip-removal-session.js";
import type { DockingRecoverySnapshot } from "./docking-recovery-save-session.js";
import type { DockingDocuments } from "./docking-persistence-model.js";

const DOCUMENT_NAMES: Record<keyof DockingDocuments, string> = {
  bayConfigurations: "ベイ設定",
  mainLayouts: "レイアウト設定",
  dockingMetadata: "使用中レイアウト設定",
};

const RECOVERY_NAMES = {
  normalized: "破損箇所を補正",
  fallback: "内部デフォルトへ復元",
} as const;

/** unknown・構造復旧の詳細を初回または保存再試行用ダイアログへ整形する。 */
export function createDockingRecoveryDialogNotification(
  snapshot: DockingRecoverySnapshot,
  retry = false,
): CommonDialogNotification {
  const sections: string[] = [];
  const structural = snapshot.changedDocuments.flatMap((field) => {
    const recovery = snapshot.recoveries[field];
    return recovery === "unchanged"
      ? []
      : [`${DOCUMENT_NAMES[field]}: ${RECOVERY_NAMES[recovery]}`];
  });
  if (structural.length > 0) sections.push(`設定の復旧: ${structural.join("、")}`);

  const unknown = aggregateUnknown(snapshot).map(
    ({ bayName, chipType, count }) => `${bayName}／${chipType}（${count}件）`,
  );
  if (unknown.length > 0) sections.push(`削除する未対応チップ: ${unknown.join("、")}`);

  return {
    id: "docking-recovery",
    severity: "warning",
    title: retry ? "ドッキング設定の保存に失敗しました" : "ドッキング設定を復旧します",
    message: `${retry ? "復旧内容を保存できませんでした。同じ内容で再試行します。" : "破損または未対応の設定を安全な状態へ復旧します。"}\n${sections.join("\n")}`,
    primaryActionLabel: retry ? "保存を再試行" : "復旧して続行",
  };
}

/** deprecatedの型・ベイ・廃止時期・代替候補を1ダイアログへ整形する。 */
export function createDeprecatedChipDialogNotification(
  summary: readonly DeprecatedChipSummary[],
  retry = false,
): CommonDialogNotification {
  const details = summary.map((item) => {
    const bays = item.bays.map((bay) => `${bay.bayName}（${bay.count}件）`).join("、");
    const replacement = item.replacement === null
      ? ""
      : `、代替候補: ${item.replacement.displayName}`;
    return `${item.displayName}（廃止: ${item.removedSince}、合計${item.totalCount}件、対象: ${bays}${replacement}）`;
  });
  return {
    id: "docking-deprecated",
    severity: "warning",
    title: retry ? "廃止チップの削除保存に失敗しました" : "廃止されたチップを削除します",
    message: `${retry ? "削除内容を保存できませんでした。同じ内容で再試行します。" : "次の廃止チップを削除します。"}\n${details.join("\n")}`,
    primaryActionLabel: retry ? "保存を再試行" : "削除して続行",
  };
}

/** unknown個体列を入力順のベイ・型単位へ集約する。 */
function aggregateUnknown(snapshot: DockingRecoverySnapshot): Array<{
  bayName: string;
  chipType: string;
  count: number;
}> {
  const groups = new Map<string, { bayName: string; chipType: string; count: number }>();
  for (const item of snapshot.removedUnknown) {
    const key = `${item.bayId}\u0000${item.chipType}`;
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, { bayName: item.bayName, chipType: item.chipType, count: 1 });
    } else {
      group.count += 1;
    }
  }
  return [...groups.values()];
}
