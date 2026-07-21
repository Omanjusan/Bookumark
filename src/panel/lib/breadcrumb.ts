export interface BreadcrumbItem {
  guid: string;
  title: string;
}

export interface BreadcrumbFolder {
  guid: string;
  title: string;
  parentGuid: string | null;
}

/**
 * 現在フォルダから親参照をたどり、ルート側から並んだパンくずデータを返す。
 * 描画には関与せず、親欠損や循環がある場合は到達できた有限の経路だけを返す。
 */
export function buildBreadcrumb(
  currentFolderGuid: string,
  foldersByGuid: ReadonlyMap<string, BreadcrumbFolder>,
): BreadcrumbItem[] {
  const path: BreadcrumbItem[] = [];
  const visited = new Set<string>();
  let guid: string | null = currentFolderGuid;

  while (guid !== null && !visited.has(guid)) {
    const folder = foldersByGuid.get(guid);
    if (folder === undefined) break;
    visited.add(guid);
    path.push({ guid: folder.guid, title: folder.title });
    guid = folder.parentGuid;
  }

  return path.reverse();
}
