import type { BookmarkItem } from "./bookmarks.js";

export interface BookmarkSortMetadata {
  readonly dateAdded?: number;
  readonly visitCount?: number;
  readonly lastVisitTime?: number;
}

export type DisplayBookmarkItem = BookmarkItem & BookmarkSortMetadata;

/** コアのブックマークを変更せず、表示・ソート用メタデータを合成する。 */
export function withBookmarkSortMetadata(
  item: BookmarkItem,
  metadata: BookmarkSortMetadata,
): DisplayBookmarkItem {
  return { ...item, ...metadata };
}
