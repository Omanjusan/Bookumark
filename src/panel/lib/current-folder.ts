import type { BookmarkTreeItem } from "./bookmarks.js";

const CURRENT_FOLDER_KEY = "currentFolder";

export interface StoredCurrentFolder {
  guid: string;
  ancestorGuids: string[];
}

function isStoredCurrentFolder(value: unknown): value is StoredCurrentFolder {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StoredCurrentFolder>;
  return typeof candidate.guid === "string"
    && Array.isArray(candidate.ancestorGuids)
    && candidate.ancestorGuids.every((guid) => typeof guid === "string");
}

/** 保存済みの現在フォルダ位置を読み込む。不正な値は未保存として扱う。 */
export async function loadCurrentFolder(): Promise<StoredCurrentFolder | null> {
  const stored = await browser.storage.local.get(CURRENT_FOLDER_KEY);
  const value: unknown = stored[CURRENT_FOLDER_KEY];
  if (!isStoredCurrentFolder(value)) return null;
  return {
    guid: value.guid,
    ancestorGuids: [...value.ancestorGuids],
  };
}

/** 現在フォルダと、その削除時に使用する祖先経路を全量保存する。 */
export async function saveCurrentFolder(value: StoredCurrentFolder): Promise<void> {
  await browser.storage.local.set({
    [CURRENT_FOLDER_KEY]: {
      guid: value.guid,
      ancestorGuids: [...value.ancestorGuids],
    },
  });
}

/**
 * 現在のツリーに対して保存位置を解決する。
 * 保存フォルダ、最寄りの保存祖先、Firefoxルートの順にフォールバックする。
 */
export function resolveCurrentFolderGuid(
  items: readonly BookmarkTreeItem[],
  stored: StoredCurrentFolder | null,
): string | null {
  const folders = items.filter((item) => item.kind === "folder");
  const folderGuids = new Set(folders.map(({ guid }) => guid));

  if (stored !== null) {
    const candidates = [stored.guid, ...stored.ancestorGuids.slice().reverse()];
    const found = candidates.find((guid) => folderGuids.has(guid));
    if (found !== undefined) return found;
  }

  return folders.find(({ parentGuid }) => parentGuid === null)?.guid ?? null;
}

/** 現在フォルダからルートまでをたどり、復元可能な保存値を生成する。 */
export function createStoredCurrentFolder(
  items: readonly BookmarkTreeItem[],
  currentFolderGuid: string,
): StoredCurrentFolder | null {
  const foldersByGuid = new Map(
    items
      .filter((item) => item.kind === "folder")
      .map((folder) => [folder.guid, folder]),
  );
  const current = foldersByGuid.get(currentFolderGuid);
  if (current === undefined) return null;

  const ancestorGuids: string[] = [];
  const visited = new Set([currentFolderGuid]);
  let parentGuid = current.parentGuid;

  while (parentGuid !== null && !visited.has(parentGuid)) {
    const parent = foldersByGuid.get(parentGuid);
    if (parent === undefined) break;
    ancestorGuids.unshift(parent.guid);
    visited.add(parent.guid);
    parentGuid = parent.parentGuid;
  }

  return { guid: currentFolderGuid, ancestorGuids };
}
