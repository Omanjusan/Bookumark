import type {
  DockingMetadataDocument,
  MainLayoutsDocument,
} from "./docking-persistence-model.js";

/** 名前付きレイアウトへ切り替え、最後に使用したレイアウトとして同時に記録する。 */
export function switchNamedLayout(
  metadata: DockingMetadataDocument,
  layouts: MainLayoutsDocument,
  layoutId: string,
): DockingMetadataDocument {
  const target = layouts.layouts.find((layout) => layout.id === layoutId);
  if (!target) throw new Error(`layout was not found: ${layoutId}`);
  if (target.systemDefault) {
    throw new Error("system default layout requires the restore action");
  }

  const document = structuredClone(metadata);
  document.activeLayoutId = layoutId;
  document.lastUsedLayoutId = layoutId;
  return document;
}

/** 専用の復旧操作として、既定・最終使用を維持したまま内部デフォルトへ切り替える。 */
export function restoreSystemDefaultLayout(
  metadata: DockingMetadataDocument,
  layouts: MainLayoutsDocument,
): DockingMetadataDocument {
  const systemDefaults = layouts.layouts.filter((layout) => layout.systemDefault);
  if (systemDefaults.length !== 1) {
    throw new Error("exactly one system default layout is required");
  }

  const document = structuredClone(metadata);
  document.activeLayoutId = systemDefaults[0].id;
  return document;
}
