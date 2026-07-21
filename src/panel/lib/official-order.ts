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

/** ブックマークまたはフォルダを指定フォルダの末尾へ移す計画を返す。 */
export function planOfficialFolderMove(
  items: readonly BookmarkTreeItem[],
  fromGuid: string,
  targetFolderGuid: string,
): OfficialSiblingMovePlan | null {
  const byGuid = new Map(items.map((item) => [item.guid, item]));
  const source = byGuid.get(fromGuid);
  const target = byGuid.get(targetFolderGuid);
  if (source === undefined || target === undefined) {
    throw new Error("Official hierarchy move item not found");
  }
  assertMovableSource(byGuid, source);
  if (source.guid === target.guid) return null;
  if (target.kind !== "folder") {
    throw new Error("Official hierarchy move target must be a folder");
  }
  if (target.parentGuid === null) {
    throw new Error("The bookmark root cannot accept moved items");
  }
  if (target.unmodifiable !== undefined) {
    throw new Error("The target folder is unmodifiable");
  }
  assertNotDescendant(byGuid, source, target);
  return {
    guid: source.guid,
    destination: { parentId: target.guid },
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
  if (target.parentGuid === null) {
    throw new Error("The bookmark root cannot be moved");
  }
  assertMovableSource(byGuid, source);
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

function assertMovableSource(
  byGuid: ReadonlyMap<string, BookmarkTreeItem>,
  source: BookmarkTreeItem,
): void {
  if (source.parentGuid === null) throw new Error("The bookmark root cannot be moved");
  if (source.unmodifiable !== undefined) throw new Error("The source item is unmodifiable");
  const parent = byGuid.get(source.parentGuid);
  if (parent?.parentGuid === null) {
    throw new Error("Firefox special root folders cannot be moved");
  }
}

function assertNotDescendant(
  byGuid: ReadonlyMap<string, BookmarkTreeItem>,
  source: BookmarkTreeItem,
  target: BookmarkTreeItem,
): void {
  if (source.kind !== "folder") return;
  const visited = new Set<string>();
  let current: BookmarkTreeItem | undefined = target;
  while (current !== undefined && !visited.has(current.guid)) {
    if (current.guid === source.guid) {
      throw new Error("A folder cannot be moved into its descendant");
    }
    visited.add(current.guid);
    current = current.parentGuid === null ? undefined : byGuid.get(current.parentGuid);
  }
}
