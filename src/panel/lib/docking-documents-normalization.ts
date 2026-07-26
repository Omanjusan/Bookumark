import { normalizeBayConfigurationsDocument } from "./docking-bay-normalization.js";
import type { DockingRecovery } from "./docking-bay-normalization.js";
import { normalizeMainLayoutsDocument } from "./docking-layout-normalization.js";
import { normalizeDockingMetadataDocument } from "./docking-metadata-normalization.js";
import type { DockingDocuments } from "./docking-persistence-model.js";
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
