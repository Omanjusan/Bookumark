import type { DockingChipCatalog } from "./docking-chip-catalog.js";
import type { DockingDocumentsNormalizationResult } from "./docking-documents-normalization.js";
import type { DockingRecovery } from "./docking-bay-normalization.js";
import type { DockingDocuments } from "./docking-persistence-model.js";
import {
  createUnknownChipRecoveryCandidate,
} from "./docking-unknown-chip-recovery.js";
import type {
  RemovedUnknownDockingChip,
} from "./docking-unknown-chip-recovery.js";

interface DockingRecoverySaveSessionOptions {
  readonly saveDocuments: (documents: Partial<DockingDocuments>) => Promise<void>;
}

export interface DockingRecoverySnapshot {
  readonly recoveries: Record<keyof DockingDocuments, DockingRecovery>;
  readonly changedDocuments: Array<keyof DockingDocuments>;
  readonly removedUnknown: RemovedUnknownDockingChip[];
}

export interface DockingRecoverySaveSession {
  readonly ready: boolean;
  readonly pending: boolean;
  readonly saving: boolean;
  recoverySnapshot(): DockingRecoverySnapshot;
  candidateDocuments(): DockingDocuments;
  save(): Promise<DockingDocuments>;
}

const DOCUMENT_FIELDS: readonly (keyof DockingDocuments)[] = [
  "bayConfigurations",
  "mainLayouts",
  "dockingMetadata",
];

/** 構造正常化とunknown除外を1つの保存候補へ統合し、runtime開始を保存成功まで保留する。 */
export function createDockingRecoverySaveSession(
  normalization: DockingDocumentsNormalizationResult,
  catalog: DockingChipCatalog,
  options: DockingRecoverySaveSessionOptions,
): DockingRecoverySaveSession {
  const unknownRecovery = createUnknownChipRecoveryCandidate(normalization.documents, catalog);
  const documents = structuredClone(unknownRecovery.documents);
  const recoveries = structuredClone(normalization.recoveries);
  const changedSet = new Set<keyof DockingDocuments>(normalization.changedDocuments);
  if (unknownRecovery.changed) changedSet.add("bayConfigurations");
  const changedDocuments = DOCUMENT_FIELDS.filter((field) => changedSet.has(field));
  const removedUnknown = structuredClone(unknownRecovery.removed);
  let pending = changedDocuments.length > 0;
  let saving = false;
  let ready = !pending;

  return {
    get ready(): boolean { return ready; },
    get pending(): boolean { return pending; },
    get saving(): boolean { return saving; },
    recoverySnapshot(): DockingRecoverySnapshot {
      return structuredClone({ recoveries, changedDocuments, removedUnknown });
    },
    candidateDocuments(): DockingDocuments {
      return structuredClone(documents);
    },
    async save(): Promise<DockingDocuments> {
      if (saving) throw new Error("recovery save is already in progress");
      if (!pending) return structuredClone(documents);
      saving = true;
      ready = false;
      try {
        // アダプターへ毎回独立した同一候補を渡し、失敗後の再試行内容を固定する。
        await options.saveDocuments(createSavePatch(documents, changedDocuments));
        pending = false;
        ready = true;
        return structuredClone(documents);
      } finally {
        saving = false;
      }
    },
  };
}

/** 変更対象だけを固定文書順で防御的なstorageパッチへ写す。 */
function createSavePatch(
  documents: DockingDocuments,
  fields: readonly (keyof DockingDocuments)[],
): Partial<DockingDocuments> {
  const patch: Partial<DockingDocuments> = {};
  if (fields.includes("bayConfigurations")) {
    patch.bayConfigurations = structuredClone(documents.bayConfigurations);
  }
  if (fields.includes("mainLayouts")) {
    patch.mainLayouts = structuredClone(documents.mainLayouts);
  }
  if (fields.includes("dockingMetadata")) {
    patch.dockingMetadata = structuredClone(documents.dockingMetadata);
  }
  return patch;
}
