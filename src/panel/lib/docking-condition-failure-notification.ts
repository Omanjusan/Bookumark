import {
  classifyDockingChipType,
} from "./docking-chip-catalog.js";
import type { DockingChipCatalog } from "./docking-chip-catalog.js";
import type { DockingChipApplicationEntry } from "./docking-chip-application-order.js";
import type {
  DockingConditionFailure,
  DockingConditionFailureReason,
} from "./docking-condition-evaluator.js";
import type { CommonToastNotification } from "./common-notification-queue.js";
import type { DockingDocuments } from "./docking-persistence-model.js";

export interface DockingConditionFailureDiagnostic {
  readonly instanceId: string;
  readonly chipType: string;
  readonly reason: DockingConditionFailureReason;
  readonly bayId: string | null;
  readonly bayName: string;
}

export interface DockingConditionFailureNotification {
  readonly toast: CommonToastNotification;
  readonly diagnostics: DockingConditionFailureDiagnostic[];
}

interface FailureDisplayGroup {
  readonly bayId: string | null;
  readonly bayName: string;
  readonly chipType: string;
  readonly displayName: string;
  count: number;
}

const CONDITION_FAILURE_AGGREGATE_KEY = "docking-condition-failures";
const UNKNOWN_BAY_NAME = "不明なベイ";

/** condition失敗列を画面用の集約warningとconsole用の詳細診断へ分離する。 */
export function createDockingConditionFailureNotification(
  notificationId: string,
  failures: readonly DockingConditionFailure[],
  sequence: readonly DockingChipApplicationEntry[],
  documents: DockingDocuments,
  catalog: DockingChipCatalog,
): DockingConditionFailureNotification | null {
  if (failures.length === 0) return null;
  const applicationByInstance = new Map(sequence.map((entry) => [entry.instanceId, entry]));
  const bayNameById = new Map(
    documents.bayConfigurations.bays.map((bay) => [bay.id, bay.name]),
  );
  const diagnostics: DockingConditionFailureDiagnostic[] = [];
  const groups = new Map<string, FailureDisplayGroup>();

  for (const failure of failures) {
    const application = applicationByInstance.get(failure.instanceId);
    const bayId = application?.bayId ?? null;
    const bayName = bayId === null ? UNKNOWN_BAY_NAME : bayNameById.get(bayId) ?? UNKNOWN_BAY_NAME;
    diagnostics.push({ ...structuredClone(failure), bayId, bayName });

    const classification = classifyDockingChipType(failure.chipType, catalog);
    const displayName = classification.status === "unknown"
      ? failure.chipType
      : classification.displayName;
    const key = `${bayId ?? "unknown"}\u0000${failure.chipType}`;
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, { bayId, bayName, chipType: failure.chipType, displayName, count: 1 });
    } else {
      group.count += 1;
    }
  }

  const targetText = [...groups.values()].map((group) => {
    const count = group.count > 1 ? `（${group.count}件）` : "";
    return `${group.bayName}／${group.displayName}${count}`;
  }).join("、");
  return {
    toast: {
      id: notificationId,
      aggregateKey: CONDITION_FAILURE_AGGREGATE_KEY,
      severity: "warning",
      message: `条件チップの適用に${failures.length}件失敗しました\n対象: ${targetText}`,
    },
    diagnostics: structuredClone(diagnostics),
  };
}
