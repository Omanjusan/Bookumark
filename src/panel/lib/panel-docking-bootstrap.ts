import type { SelectableBayFactoryViewModel } from "./bay-factory-controller.js";
import type { DockingDocumentsNormalizationResult } from "./docking-documents-normalization.js";
import { loadNormalizedDockingDocuments } from "./docking-documents-normalization.js";
import { createInternalDefaultDockingDocuments } from "./docking-internal-defaults.js";
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
  readonly documents: DockingDocuments;
  readonly bays: SelectableBayFactoryViewModel[];
  readonly activeLayout: LayoutConfiguration;
}

const CHIP_LABELS = new Map<string, string>([
  ["search", "検索"],
  ["visit-status", "訪問状態"],
  ["folder-history", "フォルダ履歴"],
  ["sort", "ソート"],
  ["view-type", "表示形式"],
  ["movement-mode", "移動モード"],
]);

/** 内部デフォルトを注入して永続文書をロードし、パネル接続用の状態へ変換する。 */
export async function loadPanelDockingState(
  options: PanelDockingBootstrapOptions = {},
): Promise<PanelDockingState> {
  const loadNormalized = options.loadNormalized ?? loadNormalizedDockingDocuments;
  const result = await loadNormalized(createInternalDefaultDockingDocuments());
  const documents = structuredClone(result.documents);
  const activeLayout = documents.mainLayouts.layouts.find(
    (layout) => layout.id === documents.dockingMetadata.activeLayoutId,
  );
  if (activeLayout === undefined) {
    throw new Error(`active layout was not found: ${documents.dockingMetadata.activeLayoutId}`);
  }

  const bays = buildPanelBayModels(documents);
  return {
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
      label: CHIP_LABELS.get(chip.chipType) ?? chip.chipType,
    })),
  }));
}
