import type { BookmarkTreeItem } from "./bookmarks.js";
import type { DirectFolderContents } from "./folder-contents.js";

export type CustomOrderByFolder = Record<string, string[]>;

export interface ReconcileFolderOrdersResult {
  orders: CustomOrderByFolder;
  changed: boolean;
}

function sameOrders(a: CustomOrderByFolder, b: CustomOrderByFolder): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => {
    const left = a[key];
    const right = b[key];
    return right !== undefined
      && left.length === right.length
      && left.every((guid, index) => guid === right[index]);
  });
}

/** 旧全体順を各項目の現在の親フォルダごとに分割する。 */
export function migrateLegacyOrder(
  legacyOrder: readonly string[],
  items: readonly BookmarkTreeItem[],
): CustomOrderByFolder {
  const byGuid = new Map(items.map((item) => [item.guid, item]));
  const seed: CustomOrderByFolder = {};

  for (const item of items) {
    if (item.kind === "folder") seed[item.guid] = [];
  }
  for (const guid of legacyOrder) {
    const item = byGuid.get(guid);
    if (item?.parentGuid === null || item === undefined) continue;
    seed[item.parentGuid]?.push(guid);
  }

  return reconcileFolderOrders(seed, items).orders;
}

/** 保存済みフォルダ順を現在のツリーと再整合する。 */
export function reconcileFolderOrders(
  saved: CustomOrderByFolder,
  items: readonly BookmarkTreeItem[],
): ReconcileFolderOrdersResult {
  const orders: CustomOrderByFolder = {};
  const officialByParent = new Map<string, Array<{ item: BookmarkTreeItem; position: number }>>();

  for (const item of items) {
    if (item.kind === "folder") orders[item.guid] = [];
  }
  items.forEach((item, position) => {
    if (item.parentGuid === null || orders[item.parentGuid] === undefined) return;
    const direct = officialByParent.get(item.parentGuid) ?? [];
    direct.push({ item, position });
    officialByParent.set(item.parentGuid, direct);
  });

  for (const folderGuid of Object.keys(orders)) {
    const official = (officialByParent.get(folderGuid) ?? [])
      .sort((a, b) => a.item.index - b.item.index || a.position - b.position)
      .map(({ item }) => item.guid);
    const current = new Set(official);
    const seen = new Set<string>();
    const kept = (saved[folderGuid] ?? []).filter((guid) => {
      if (!current.has(guid) || seen.has(guid)) return false;
      seen.add(guid);
      return true;
    });
    orders[folderGuid] = kept.concat(official.filter((guid) => !seen.has(guid)));
  }

  return { orders, changed: !sameOrders(saved, orders) };
}

/** 直下項目を保存済み順へ並べ、フォルダとブックマークの表示集合を分離する。 */
export function orderDirectFolderContents(
  contents: DirectFolderContents,
  order: readonly string[],
): DirectFolderContents {
  const all = [...contents.folders, ...contents.bookmarks];
  const byGuid = new Map(all.map((item) => [item.guid, item]));
  const seen = new Set<string>();
  const ordered = order
    .map((guid) => byGuid.get(guid))
    .filter((item): item is BookmarkTreeItem => {
      if (item === undefined || seen.has(item.guid)) return false;
      seen.add(item.guid);
      return true;
    })
    .concat(all.filter(({ guid }) => !seen.has(guid)));

  return {
    folders: ordered.filter((item) => item.kind === "folder"),
    bookmarks: ordered.filter((item) => item.kind === "bookmark"),
  };
}

/** 混在順のうち、並べ替え対象になった部分集合のスロットだけを置換する。 */
export function replaceFolderOrderSubset(
  order: readonly string[],
  reorderedSubset: readonly string[],
): string[] {
  const subset = new Set(reorderedSubset);
  let nextIndex = 0;
  const replaced = order.map((guid) => (
    subset.has(guid) ? reorderedSubset[nextIndex++] : guid
  ));
  return replaced.concat(reorderedSubset.slice(nextIndex));
}
