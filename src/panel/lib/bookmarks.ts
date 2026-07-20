/* コア層(正本=公式DB)アクセス。browser.bookmarks に触るのはこのモジュールだけ */

export interface BookmarkItem {
  guid: string;
  title: string;
  url: string;
}

/**
 * ブックマークツリーをフラット化して返す。
 * フォルダ・セパレータ・place:クエリは除外(E2E版はブックマークのみの1リスト)。
 * Firefox では node.id がそのまま GUID。
 */
export async function getFlatBookmarks(): Promise<BookmarkItem[]> {
  const tree = await browser.bookmarks.getTree();
  const out: BookmarkItem[] = [];
  const walk = (nodes: browser.bookmarks.BookmarkTreeNode[]): void => {
    for (const node of nodes) {
      if (node.url && !node.url.startsWith("place:")) {
        out.push({
          guid: node.id,
          title: node.title || node.url,
          url: node.url,
        });
      }
      if (node.children) walk(node.children);
    }
  };
  walk(tree);
  return out;
}

/** 公式DBへの書き戻し。ブックマークを削除する。 */
export async function removeBookmark(guid: string): Promise<void> {
  await browser.bookmarks.remove(guid);
}
