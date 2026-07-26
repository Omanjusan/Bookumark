import type {
  DockingMetadataDocument,
  MainLayoutsDocument,
} from "./docking-persistence-model.js";

export interface LayoutDeletionResult {
  readonly mainLayouts: MainLayoutsDocument;
  readonly dockingMetadata: DockingMetadataDocument;
}

/** 名前付きレイアウトを削除し、無効になった選択参照を安全な順序で復旧する。 */
export function deleteNamedLayout(
  layouts: MainLayoutsDocument,
  metadata: DockingMetadataDocument,
  layoutId: string,
): LayoutDeletionResult {
  const target = layouts.layouts.find((layout) => layout.id === layoutId);
  if (!target) throw new Error(`layout was not found: ${layoutId}`);
  if (target.systemDefault) throw new Error("system default layout cannot be deleted");

  const systemDefaults = layouts.layouts.filter((layout) => layout.systemDefault);
  if (systemDefaults.length !== 1) {
    throw new Error("exactly one system default layout is required");
  }

  const mainLayouts = structuredClone(layouts);
  mainLayouts.layouts = mainLayouts.layouts.filter((layout) => layout.id !== layoutId);
  const validIds = new Set(mainLayouts.layouts.map((layout) => layout.id));
  const lastUsedLayoutId = validReference(metadata.lastUsedLayoutId, validIds);
  const preferredLayoutId = validReference(metadata.preferredLayoutId, validIds);
  const activeLayoutId = validReference(metadata.activeLayoutId, validIds)
    ?? lastUsedLayoutId
    ?? preferredLayoutId
    ?? systemDefaults[0].id;

  const dockingMetadata: DockingMetadataDocument = {
    schemaVersion: metadata.schemaVersion,
    activeLayoutId,
  };
  if (preferredLayoutId !== undefined) dockingMetadata.preferredLayoutId = preferredLayoutId;
  if (lastUsedLayoutId !== undefined) dockingMetadata.lastUsedLayoutId = lastUsedLayoutId;
  return { mainLayouts, dockingMetadata };
}

/** 残存レイアウトを参照するIDだけを返す。 */
function validReference(
  layoutId: string | undefined,
  validIds: ReadonlySet<string>,
): string | undefined {
  return layoutId !== undefined && validIds.has(layoutId) ? layoutId : undefined;
}
