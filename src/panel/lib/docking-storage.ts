import type {
  BayConfigurationsDocument,
  DockingDocuments,
  DockingMetadataDocument,
  MainLayoutsDocument,
} from "./docking-persistence-model.js";

export const DOCKING_STORAGE_KEYS = {
  bayConfigurations: "bayConfigurations.v1",
  mainLayouts: "mainLayouts.v1",
  dockingMetadata: "dockingMetadata.v1",
} as const;

export interface StoredDockingDocuments {
  bayConfigurations: unknown;
  mainLayouts: unknown;
  dockingMetadata: unknown;
}

const ALL_DOCKING_STORAGE_KEYS = Object.values(DOCKING_STORAGE_KEYS);

/** 3つのドッキング文書を1回のストレージ要求で未解釈のまま読み込む。 */
export async function loadDockingDocuments(): Promise<StoredDockingDocuments> {
  const stored = await browser.storage.local.get(ALL_DOCKING_STORAGE_KEYS);
  return {
    bayConfigurations: stored[DOCKING_STORAGE_KEYS.bayConfigurations],
    mainLayouts: stored[DOCKING_STORAGE_KEYS.mainLayouts],
    dockingMetadata: stored[DOCKING_STORAGE_KEYS.dockingMetadata],
  };
}

/** ベイ設定文書だけを対応する固定キーへ保存する。 */
export async function saveBayConfigurations(
  document: BayConfigurationsDocument,
): Promise<void> {
  await saveDockingDocuments({ bayConfigurations: document });
}

/** メインレイアウト文書だけを対応する固定キーへ保存する。 */
export async function saveMainLayouts(document: MainLayoutsDocument): Promise<void> {
  await saveDockingDocuments({ mainLayouts: document });
}

/** ドッキングメタデータ文書だけを対応する固定キーへ保存する。 */
export async function saveDockingMetadata(
  document: DockingMetadataDocument,
): Promise<void> {
  await saveDockingDocuments({ dockingMetadata: document });
}

/** 指定されたドッキング文書を防御的コピーし、1回の要求で一括保存する。 */
export async function saveDockingDocuments(
  documents: Partial<DockingDocuments>,
): Promise<void> {
  const stored: Record<string, unknown> = {};
  for (const field of Object.keys(DOCKING_STORAGE_KEYS) as Array<keyof DockingDocuments>) {
    const document = documents[field];
    if (document !== undefined) {
      stored[DOCKING_STORAGE_KEYS[field]] = structuredClone(document);
    }
  }
  if (Object.keys(stored).length === 0) return;
  await browser.storage.local.set(stored);
}
