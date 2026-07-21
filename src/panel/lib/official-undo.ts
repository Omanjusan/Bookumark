import type { BookmarkTreeItem } from "./bookmarks.js";
import type { OfficialSiblingMovePlan } from "./official-order.js";

export interface BookmarkMoveSnapshot {
  readonly guid: string;
  readonly previousParentGuid: string;
  readonly previousIndex: number;
}

/** 公式移動直前の親とindexを保持する。 */
export function createBookmarkMoveSnapshot(
  items: readonly BookmarkTreeItem[],
  guid: string,
): BookmarkMoveSnapshot {
  const item = items.find((candidate) => candidate.guid === guid);
  if (item === undefined) throw new Error("Official move snapshot item not found");
  if (item.parentGuid === null) throw new Error("The bookmark root cannot be moved");
  return {
    guid: item.guid,
    previousParentGuid: item.parentGuid,
    previousIndex: item.index,
  };
}

/** 現在位置を考慮し、移動前の親とindexへ戻すAPI計画を返す。 */
export function planOfficialUndo(
  snapshot: BookmarkMoveSnapshot,
  currentItems: readonly BookmarkTreeItem[],
): OfficialSiblingMovePlan {
  const current = currentItems.find(({ guid }) => guid === snapshot.guid);
  if (current === undefined) throw new Error("Official Undo item not found");
  const movedUpInSameParent = current.parentGuid === snapshot.previousParentGuid
    && current.index < snapshot.previousIndex;
  return {
    guid: snapshot.guid,
    destination: {
      parentId: snapshot.previousParentGuid,
      index: snapshot.previousIndex + (movedUpInSameParent ? 1 : 0),
    },
  };
}
