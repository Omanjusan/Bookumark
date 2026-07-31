import type { BookmarkItem, BookmarkTreeFolderItem, BookmarkTreeItem } from "./bookmarks.js";
import { createStoredCurrentFolder } from "./current-folder.js";
import type { StoredCurrentFolder } from "./current-folder.js";
import type { DisplayBookmarkItem } from "./display-item.js";
import type { MovementMode } from "./display-state.js";
import { directFolderContents } from "./folder-contents.js";
import { orderDirectFolderContents } from "./folder-order.js";
import type { CustomOrderByFolder } from "./folder-order.js";

interface PanelFolderLoadInput {
  readonly treeItems: readonly BookmarkTreeItem[];
  readonly folderOrders: CustomOrderByFolder;
  readonly movementMode: MovementMode;
  readonly folderGuid: string;
}

interface PanelFolderLoadDependencies {
  readonly loadHistory: (items: readonly BookmarkItem[]) => Promise<DisplayBookmarkItem[]>;
  readonly saveCurrentFolder: (stored: StoredCurrentFolder) => Promise<void>;
}

export interface PanelFolderCandidate {
  readonly folderGuid: string;
  readonly folders: BookmarkTreeFolderItem[];
  readonly items: DisplayBookmarkItem[];
  readonly storedFolder: StoredCurrentFolder;
}

/** 移動先の表示と保存位置をローカルで完成させ、両方成功した候補だけを返す。 */
export async function loadPanelFolderCandidate(
  input: PanelFolderLoadInput,
  dependencies: PanelFolderLoadDependencies,
): Promise<PanelFolderCandidate> {
  const storedFolder = createStoredCurrentFolder(input.treeItems, input.folderGuid);
  if (storedFolder === null) throw new Error(`Folder not found: ${input.folderGuid}`);

  const directContents = directFolderContents(input.treeItems, input.folderGuid);
  const contents = input.movementMode === "directory-move"
    ? directContents
    : orderDirectFolderContents(
      directContents,
      input.folderOrders[input.folderGuid] ?? [],
    );
  const items = await dependencies.loadHistory(contents.bookmarks);
  await dependencies.saveCurrentFolder(storedFolder);
  return structuredClone({
    folderGuid: input.folderGuid,
    folders: contents.folders,
    items,
    storedFolder,
  });
}
