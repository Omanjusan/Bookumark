import {
  classifyDockingChipType,
} from "./docking-chip-catalog.js";
import type { DockingChipCatalog } from "./docking-chip-catalog.js";
import type { DockingDocuments } from "./docking-persistence-model.js";

export interface RemovedUnknownDockingChip {
  readonly bayId: string;
  readonly bayName: string;
  readonly instanceId: string;
  readonly chipType: string;
}

export interface UnknownDockingChipRecoveryCandidate {
  readonly documents: DockingDocuments;
  readonly changed: boolean;
  readonly changedDocuments: Array<keyof DockingDocuments>;
  readonly removed: RemovedUnknownDockingChip[];
}

/** 正常化済み文書からunknownチップだけを除外した部分復旧候補を生成する。 */
export function createUnknownChipRecoveryCandidate(
  source: DockingDocuments,
  catalog: DockingChipCatalog,
): UnknownDockingChipRecoveryCandidate {
  const documents = structuredClone(source);
  const removed: RemovedUnknownDockingChip[] = [];

  for (const bay of documents.bayConfigurations.bays) {
    const retained = bay.chips.filter((chip) => {
      const classification = classifyDockingChipType(chip.chipType, catalog);
      if (classification.status !== "unknown") return true;
      removed.push({
        bayId: bay.id,
        bayName: bay.name,
        instanceId: chip.instanceId,
        chipType: chip.chipType,
      });
      return false;
    });
    if (retained.length === bay.chips.length) continue;
    // 除外後も相対順を保ち、永続モデルの1始まり連続orderへ戻す。
    bay.chips = retained.map((chip, index) => ({ ...chip, order: index + 1 }));
  }

  const changed = removed.length > 0;
  return {
    documents,
    changed,
    changedDocuments: changed ? ["bayConfigurations"] : [],
    removed: structuredClone(removed),
  };
}
