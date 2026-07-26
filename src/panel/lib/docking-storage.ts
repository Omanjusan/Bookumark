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
