import { normalizeBayConfigurationsDocument } from "./docking-bay-normalization.js";
import type { DockingRecovery } from "./docking-bay-normalization.js";
import { normalizeMainLayoutsDocument } from "./docking-layout-normalization.js";
import { normalizeDockingMetadataDocument } from "./docking-metadata-normalization.js";
import type { DockingDocuments } from "./docking-persistence-model.js";
import {
  loadDockingDocuments,
  saveDockingDocuments,
} from "./docking-storage.js";
import type { StoredDockingDocuments } from "./docking-storage.js";

export interface DockingDocumentsNormalizationResult {
  documents: DockingDocuments;
  recoveries: Record<keyof DockingDocuments, DockingRecovery>;
  changedDocuments: Array<keyof DockingDocuments>;
}

/** 3文書を依存順に正常化し、変更された文書名と復旧状態を返す。 */
export function normalizeDockingDocuments(
  stored: StoredDockingDocuments,
  fallback: DockingDocuments,
): DockingDocumentsNormalizationResult {
  const bayConfigurations = normalizeBayConfigurationsDocument(
    stored.bayConfigurations,
    fallback.bayConfigurations,
  );
  const validBayIds = new Set(
    bayConfigurations.document.bays.map((bay) => bay.id),
  );
  const mainLayouts = normalizeMainLayoutsDocument(
    stored.mainLayouts,
    fallback.mainLayouts,
    validBayIds,
  );
  const dockingMetadata = normalizeDockingMetadataDocument(
    stored.dockingMetadata,
    fallback.dockingMetadata,
    mainLayouts.document,
  );

  const recoveries: DockingDocumentsNormalizationResult["recoveries"] = {
    bayConfigurations: bayConfigurations.recovery,
    mainLayouts: mainLayouts.recovery,
    dockingMetadata: dockingMetadata.recovery,
  };
  const changedDocuments = (Object.keys(recoveries) as Array<keyof DockingDocuments>)
    .filter((field) => recoveries[field] !== "unchanged");
  return {
    documents: {
      bayConfigurations: bayConfigurations.document,
      mainLayouts: mainLayouts.document,
      dockingMetadata: dockingMetadata.document,
    },
    recoveries,
    changedDocuments,
  };
}

/** 3文書を一括読込・正常化し、変更文書だけを保存してから結果を返す。 */
export async function loadNormalizedDockingDocuments(
  fallback: DockingDocuments,
): Promise<DockingDocumentsNormalizationResult> {
  const stored = await loadDockingDocuments();
  const result = normalizeDockingDocuments(stored, fallback);
  const repaired: Partial<DockingDocuments> = {};
  for (const field of result.changedDocuments) {
    // 正常な文書を暗黙に書き換えず、補正・復旧した文書だけを再保存する。
    assignDocument(repaired, field, result.documents[field]);
  }
  await saveDockingDocuments(repaired);
  return result;
}

/** 3文書を読み込んで正常化するが、起動時復旧UIへ委ねるため保存は行わない。 */
export async function loadUnpersistedNormalizedDockingDocuments(
  fallback: DockingDocuments,
): Promise<DockingDocumentsNormalizationResult> {
  const stored = await loadDockingDocuments();
  return normalizeDockingDocuments(stored, fallback);
}

/** 文書フィールドと値の対応を保ったまま保存パッチへ代入する。 */
function assignDocument<Field extends keyof DockingDocuments>(
  target: Partial<DockingDocuments>,
  field: Field,
  document: DockingDocuments[Field],
): void {
  target[field] = document;
}
