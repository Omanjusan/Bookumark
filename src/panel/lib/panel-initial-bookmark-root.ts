import type { BookmarkTreeItem } from "./bookmarks.js";
import { resolveCurrentFolderGuid } from "./current-folder.js";
import type { StoredCurrentFolder } from "./current-folder.js";
import { ensureExperimentBookmarkRoot } from "./experiment-bookmark-root.js";

interface PanelInitialBookmarkRootInput {
  readonly treeItems: readonly BookmarkTreeItem[];
  readonly savedFolder: StoredCurrentFolder | null;
  readonly experiment: boolean;
}

interface PanelInitialBookmarkRootDependencies {
  readonly getChildren: (
    parentGuid: string,
  ) => Promise<readonly browser.bookmarks.BookmarkTreeNode[]>;
  readonly create: (
    details: browser.bookmarks.CreateDetails,
  ) => Promise<browser.bookmarks.BookmarkTreeNode>;
  readonly reloadTreeItems: () => Promise<readonly BookmarkTreeItem[]>;
}

export interface PanelInitialBookmarkRootResult {
  readonly treeItems: readonly BookmarkTreeItem[];
  readonly folderGuid: string | null;
  readonly error: unknown | null;
}

/**
 * productionでは保存位置を復元し、experimentでは専用フォルダを初期位置にする。
 * 専用フォルダの確保に失敗しても、取得済みツリーのFirefoxルートで起動を継続する。
 */
export async function resolvePanelInitialBookmarkRoot(
  input: PanelInitialBookmarkRootInput,
  dependencies: PanelInitialBookmarkRootDependencies,
): Promise<PanelInitialBookmarkRootResult> {
  if (!input.experiment) {
    return {
      treeItems: input.treeItems,
      folderGuid: resolveCurrentFolderGuid(input.treeItems, input.savedFolder),
      error: null,
    };
  }

  const firefoxRootGuid = resolveCurrentFolderGuid(input.treeItems, null);
  if (firefoxRootGuid === null) {
    return { treeItems: input.treeItems, folderGuid: null, error: null };
  }

  const experimentRoot = await ensureExperimentBookmarkRoot(firefoxRootGuid, dependencies);
  if (experimentRoot.error !== null) {
    return {
      treeItems: input.treeItems,
      folderGuid: firefoxRootGuid,
      error: experimentRoot.error,
    };
  }

  if (input.treeItems.some((item) => (
    item.kind === "folder" && item.guid === experimentRoot.folderGuid
  ))) {
    return {
      treeItems: input.treeItems,
      folderGuid: experimentRoot.folderGuid,
      error: null,
    };
  }

  try {
    const refreshedTreeItems = await dependencies.reloadTreeItems();
    return {
      treeItems: refreshedTreeItems,
      folderGuid: experimentRoot.folderGuid,
      error: null,
    };
  } catch (error) {
    return { treeItems: input.treeItems, folderGuid: firefoxRootGuid, error };
  }
}
