import type { SelectableBayFactoryViewModel } from "./bay-factory-controller.js";
import type { DockingDocumentsNormalizationResult } from "./docking-documents-normalization.js";
import { loadUnpersistedNormalizedDockingDocuments } from "./docking-documents-normalization.js";
import { createInternalDefaultDockingDocuments } from "./docking-internal-defaults.js";
import {
  PRODUCTION_DOCKING_CHIP_CATALOG,
  classifyDockingChipType,
} from "./docking-chip-catalog.js";
import type {
  DockingDocuments,
  LayoutConfiguration,
} from "./docking-persistence-model.js";

interface PanelDockingBootstrapOptions {
  readonly loadNormalized?: (
    fallback: DockingDocuments,
  ) => Promise<DockingDocumentsNormalizationResult>;
}

export interface PanelDockingState {
  readonly normalization: DockingDocumentsNormalizationResult;
  readonly documents: DockingDocuments;
  readonly bays: SelectableBayFactoryViewModel[];
  readonly activeLayout: LayoutConfiguration;
}

/** 内部デフォルトを注入して永続文書をロードし、パネル接続用の状態へ変換する。 */
export async function loadPanelDockingState(
  options: PanelDockingBootstrapOptions = {},
): Promise<PanelDockingState> {
  const loadNormalized = options.loadNormalized ?? loadUnpersistedNormalizedDockingDocuments;
  const result = await loadNormalized(createInternalDefaultDockingDocuments());
  return buildPanelDockingState(result);
}

/** 正常化結果から復旧後にも再利用できるパネル接続状態を構築する。 */
export function buildPanelDockingState(
  result: DockingDocumentsNormalizationResult,
): PanelDockingState {
  const documents = structuredClone(result.documents);
  const activeLayout = documents.mainLayouts.layouts.find(
    (layout) => layout.id === documents.dockingMetadata.activeLayoutId,
  );
  if (activeLayout === undefined) {
    throw new Error(`active layout was not found: ${documents.dockingMetadata.activeLayoutId}`);
  }

  const bays = buildPanelBayModels(documents);
  return {
    normalization: structuredClone(result),
    documents,
    bays: structuredClone(bays),
    activeLayout: structuredClone(activeLayout),
  };
}

/** 正常化済みベイ文書をベイ工場の選択・編集表示モデルへ変換する。 */
export function buildPanelBayModels(
  documents: DockingDocuments,
): SelectableBayFactoryViewModel[] {
  return documents.bayConfigurations.bays.map((bay) => ({
    bayId: bay.id,
    name: bay.name,
    permanent: bay.permanent,
    chips: bay.chips.map((chip) => ({
      instanceId: chip.instanceId,
      label: displayNameFor(chip.chipType),
    })),
  }));
}

/** 現行・廃止台帳から表示名を解決し、未知型だけを保存値のまま表示する。 */
function displayNameFor(chipType: string): string {
  const classification = classifyDockingChipType(chipType, PRODUCTION_DOCKING_CHIP_CATALOG);
  return classification.status === "unknown" ? chipType : classification.displayName;
}
