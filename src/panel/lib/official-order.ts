import type { BookmarkTreeItem } from "./bookmarks.js";

export type OfficialSiblingPlacement = "start" | "before" | "after" | "end";

export interface OfficialSiblingMoveRequest {
  readonly fromGuid: string;
  readonly toGuid: string;
  readonly placement: OfficialSiblingPlacement;
}

export interface OfficialSiblingMovePlan {
  readonly guid: string;
  readonly destination: {
    readonly parentId: string;
    readonly index?: number;
  };
}

/** 同一親内のdropをFirefox bookmarks.move用の挿入位置へ変換する。 */
export function planOfficialSiblingMove(
  items: readonly BookmarkTreeItem[],
  request: OfficialSiblingMoveRequest,
): OfficialSiblingMovePlan | null {
  const byGuid = new Map(items.map((item) => [item.guid, item]));
  const source = byGuid.get(request.fromGuid);
  const target = byGuid.get(request.toGuid);
  if (source === undefined || target === undefined) {
    throw new Error("Official move item not found");
  }
  if (source.parentGuid === null || target.parentGuid === null) {
    throw new Error("The bookmark root cannot be moved");
  }
  if (source.guid === target.guid) return null;
  if (source.parentGuid !== target.parentGuid) {
    throw new Error("Official sibling move requires the same parent");
  }

  const parentId = source.parentGuid;
  switch (request.placement) {
    case "start":
      return { guid: source.guid, destination: { parentId, index: 0 } };
    case "end":
      return { guid: source.guid, destination: { parentId } };
    case "before":
      return { guid: source.guid, destination: { parentId, index: target.index } };
    case "after":
      return { guid: source.guid, destination: { parentId, index: target.index + 1 } };
  }
}
