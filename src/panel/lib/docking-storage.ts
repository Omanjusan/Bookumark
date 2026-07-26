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
  await saveDockingDocument(DOCKING_STORAGE_KEYS.bayConfigurations, document);
}

/** メインレイアウト文書だけを対応する固定キーへ保存する。 */
export async function saveMainLayouts(document: MainLayoutsDocument): Promise<void> {
  await saveDockingDocument(DOCKING_STORAGE_KEYS.mainLayouts, document);
}

/** ドッキングメタデータ文書だけを対応する固定キーへ保存する。 */
export async function saveDockingMetadata(
  document: DockingMetadataDocument,
): Promise<void> {
  await saveDockingDocument(DOCKING_STORAGE_KEYS.dockingMetadata, document);
}

/** 文書を呼び出し元と状態共有しない値へ複製して単独保存する。 */
async function saveDockingDocument(
  key: typeof DOCKING_STORAGE_KEYS[keyof typeof DOCKING_STORAGE_KEYS],
  document: BayConfigurationsDocument | MainLayoutsDocument | DockingMetadataDocument,
): Promise<void> {
  await browser.storage.local.set({ [key]: structuredClone(document) });
}
import type {
  BayConfigurationsDocument,
  DockingMetadataDocument,
  MainLayoutsDocument,
} from "./docking-persistence-model.js";
