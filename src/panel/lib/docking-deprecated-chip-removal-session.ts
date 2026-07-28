import {
  classifyDockingChipType,
} from "./docking-chip-catalog.js";
import type { DockingChipCatalog } from "./docking-chip-catalog.js";
import type {
  BayConfigurationsDocument,
  DockingDocuments,
} from "./docking-persistence-model.js";

interface DeprecatedChipRemovalSessionOptions {
  readonly saveBayConfigurations: (document: BayConfigurationsDocument) => Promise<void>;
}

export interface DeprecatedChipBaySummary {
  readonly bayId: string;
  readonly bayName: string;
  readonly count: number;
}

export interface DeprecatedChipReplacementSummary {
  readonly chipType: string;
  readonly displayName: string;
}

export interface DeprecatedChipSummary {
  readonly chipType: string;
  readonly displayName: string;
  readonly deprecatedSince: string;
  readonly removedSince: string;
  readonly totalCount: number;
  readonly replacement: DeprecatedChipReplacementSummary | null;
  readonly bays: DeprecatedChipBaySummary[];
}

export interface DeprecatedChipRemovalSession {
  readonly ready: boolean;
  readonly pending: boolean;
  readonly saving: boolean;
  summary(): DeprecatedChipSummary[];
  candidateDocuments(): DockingDocuments;
  confirmAndSave(): Promise<DockingDocuments>;
}

interface MutableDeprecatedChipSummary {
  readonly chipType: string;
  readonly displayName: string;
  readonly deprecatedSince: string;
  readonly removedSince: string;
  totalCount: number;
  readonly replacement: DeprecatedChipReplacementSummary | null;
  bays: DeprecatedChipBaySummary[];
}

/** deprecatedチップを集約し、確認後の全削除保存が成功するまでruntime開始を保留する。 */
export function createDeprecatedChipRemovalSession(
  source: DockingDocuments,
  catalog: DockingChipCatalog,
  options: DeprecatedChipRemovalSessionOptions,
): DeprecatedChipRemovalSession {
  const documents = structuredClone(source);
  const summaries = new Map<string, MutableDeprecatedChipSummary>();

  for (const bay of documents.bayConfigurations.bays) {
    const retained = bay.chips.filter((chip) => {
      const classification = classifyDockingChipType(chip.chipType, catalog);
      if (classification.status !== "deprecated") return true;
      recordDeprecated(summaries, classification, bay.id, bay.name, catalog);
      return false;
    });
    if (retained.length !== bay.chips.length) {
      // 全deprecated削除後も相対順を維持し、永続モデルの連続orderへ戻す。
      bay.chips = retained.map((chip, index) => ({ ...chip, order: index + 1 }));
    }
  }

  const summary = [...summaries.values()];
  let pending = summary.length > 0;
  let saving = false;
  let ready = !pending;

  return {
    get ready(): boolean { return ready; },
    get pending(): boolean { return pending; },
    get saving(): boolean { return saving; },
    summary(): DeprecatedChipSummary[] {
      return structuredClone(summary);
    },
    candidateDocuments(): DockingDocuments {
      return structuredClone(documents);
    },
    async confirmAndSave(): Promise<DockingDocuments> {
      if (saving) throw new Error("deprecated save is already in progress");
      if (!pending) return structuredClone(documents);
      saving = true;
      ready = false;
      try {
        await options.saveBayConfigurations(structuredClone(documents.bayConfigurations));
        pending = false;
        ready = true;
        return structuredClone(documents);
      } finally {
        saving = false;
      }
    },
  };
}

/** 1つのdeprecatedインスタンスを型別・ベイ別の通知サマリーへ加算する。 */
function recordDeprecated(
  summaries: Map<string, MutableDeprecatedChipSummary>,
  classification: Extract<ReturnType<typeof classifyDockingChipType>, { status: "deprecated" }>,
  bayId: string,
  bayName: string,
  catalog: DockingChipCatalog,
): void {
  let summary = summaries.get(classification.chipType);
  if (summary === undefined) {
    summary = {
      chipType: classification.chipType,
      displayName: classification.displayName,
      deprecatedSince: classification.deprecatedSince,
      removedSince: classification.removedSince,
      totalCount: 0,
      replacement: replacementSummary(classification.replacementChipType, catalog),
      bays: [],
    };
    summaries.set(classification.chipType, summary);
  }
  summary.totalCount += 1;
  const bay = summary.bays.find((entry) => entry.bayId === bayId);
  if (bay === undefined) {
    summary.bays.push({ bayId, bayName, count: 1 });
  } else {
    const index = summary.bays.indexOf(bay);
    summary.bays[index] = { ...bay, count: bay.count + 1 };
  }
}

/** replacementChipTypeを現行台帳の表示名付き案内へ変換する。 */
function replacementSummary(
  chipType: string | undefined,
  catalog: DockingChipCatalog,
): DeprecatedChipReplacementSummary | null {
  if (chipType === undefined) return null;
  const classification = classifyDockingChipType(chipType, catalog);
  return {
    chipType,
    displayName: classification.status === "current" ? classification.displayName : chipType,
  };
}
