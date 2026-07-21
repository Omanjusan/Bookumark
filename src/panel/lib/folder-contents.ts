import type {
  BookmarkTreeBookmarkItem,
  BookmarkTreeFolderItem,
  BookmarkTreeItem,
} from "./bookmarks.js";

export interface DirectFolderContents {
  folders: BookmarkTreeFolderItem[];
  bookmarks: BookmarkTreeBookmarkItem[];
}

/** 現在フォルダ直下のフォルダとブックマークを公式index順で分離する。 */
export function directFolderContents(
  items: readonly BookmarkTreeItem[],
  parentGuid: string,
): DirectFolderContents {
  const direct = items
    .map((item, position) => ({ item, position }))
    .filter(({ item }) => item.parentGuid === parentGuid)
    .sort((a, b) => a.item.index - b.item.index || a.position - b.position)
    .map(({ item }) => item);

  return {
    folders: direct.filter((item): item is BookmarkTreeFolderItem => item.kind === "folder"),
    bookmarks: direct.filter(
      (item): item is BookmarkTreeBookmarkItem => item.kind === "bookmark",
    ),
  };
}
