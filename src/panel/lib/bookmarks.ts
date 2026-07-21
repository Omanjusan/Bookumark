/* コア層(正本=公式DB)アクセス。browser.bookmarks に触るのはこのモジュールだけ */

export interface BookmarkItem {
  guid: string;
  title: string;
  url: string;
  dateAdded?: number;
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
  const tree = await browser.bookmarks.getTree();
  const out: BookmarkItem[] = [];

  /**
   * ブックマークツリーを深さ優先で走査し、表示可能な項目を結果配列へ追加する。
   *
   * @param nodes 走査するブックマークノード
   */
  const walk = (nodes: browser.bookmarks.BookmarkTreeNode[]): void => {
    for (const node of nodes) {
      if (node.url && !node.url.startsWith("place:")) {
        out.push({
          guid: node.id,
          title: node.title || node.url,
          url: node.url,
          ...(node.dateAdded === undefined ? {} : { dateAdded: node.dateAdded }),
        });
      }
      if (node.children) walk(node.children);
    }
  };
  walk(tree);
  return out;
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
