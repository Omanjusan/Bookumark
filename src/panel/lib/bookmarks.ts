/* コア層(正本=公式DB)アクセス。browser.bookmarks に触るのはこのモジュールだけ */

export interface BookmarkItem {
  guid: string;
  title: string;
  url: string;
  dateAdded?: number;
}

interface BookmarkTreeItemBase {
  guid: string;
  parentGuid: string | null;
  index: number;
  title: string;
}

export interface BookmarkTreeBookmarkItem extends BookmarkTreeItemBase {
  kind: "bookmark";
  url: string;
  dateAdded?: number;
}

export interface BookmarkTreeFolderItem extends BookmarkTreeItemBase {
  kind: "folder";
}

export type BookmarkTreeItem = BookmarkTreeBookmarkItem | BookmarkTreeFolderItem;

/**
 * Firefoxのブックマークツリーを、親子関係と公式indexを保持したフラットな契約へ変換する。
 * フォルダと通常ブックマークを保持し、セパレーターとplace:クエリは除外する。
 *
 * @returns Firefoxの深さ優先順に並んだツリー項目
 * @throws FirefoxのブックマークAPIがツリー取得に失敗した場合
 */
export async function getBookmarkTreeItems(): Promise<BookmarkTreeItem[]> {
  const tree = await browser.bookmarks.getTree();
  const out: BookmarkTreeItem[] = [];

  const walk = (
    nodes: readonly browser.bookmarks.BookmarkTreeNode[],
    parentGuid: string | null,
  ): void => {
    nodes.forEach((node, siblingIndex) => {
      const index = node.index ?? siblingIndex;

      if (node.type === "separator") return;

      if (node.url) {
        if (node.url.startsWith("place:")) return;
        out.push({
          kind: "bookmark",
          guid: node.id,
          parentGuid,
          index,
          title: node.title || node.url,
          url: node.url,
          ...(node.dateAdded === undefined ? {} : { dateAdded: node.dateAdded }),
        });
        return;
      }

      out.push({
        kind: "folder",
        guid: node.id,
        parentGuid,
        index,
        title: node.title ?? "",
      });
      if (node.children) walk(node.children, node.id);
    });
  };

  walk(tree, null);
  return out;
}

/**
 * ブックマークツリーをフラット化して返す。
 * フォルダ・セパレータ・place:クエリは除外(E2E版はブックマークのみの1リスト)。
 * Firefox では node.id がそのまま GUID。
 *
 * @returns Firefoxのツリー順に並んだ表示可能なブックマーク
 * @throws FirefoxのブックマークAPIがツリー取得に失敗した場合
 */
export async function getFlatBookmarks(): Promise<BookmarkItem[]> {
  const items = await getBookmarkTreeItems();
  return items
    .filter((item): item is BookmarkTreeBookmarkItem => item.kind === "bookmark")
    .map(({ guid, title, url, dateAdded }) => ({
      guid,
      title,
      url,
      ...(dateAdded === undefined ? {} : { dateAdded }),
    }));
}

/**
 * Firefoxの公式ブックマークDBから指定項目を削除する。
 *
 * @param guid 削除するブックマークのGUID
 * @throws FirefoxのブックマークAPIが削除に失敗した場合
 */
export async function removeBookmark(guid: string): Promise<void> {
  await browser.bookmarks.remove(guid);
}

interface BookmarkMoveDestination {
  readonly parentId?: string;
  readonly index?: number;
}

/** Firefox公式ブックマークDB内で項目を指定位置へ移動する。 */
export async function moveBookmark(
  guid: string,
  destination: BookmarkMoveDestination,
): Promise<browser.bookmarks.BookmarkTreeNode> {
  return browser.bookmarks.move(guid, destination);
}
