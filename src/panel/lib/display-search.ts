import type { BookmarkItem } from "./bookmarks.js";

/** タイトル、ドメイン、URLを対象に複数語AND検索する。 */
export function filterBookmarksByText<T extends BookmarkItem>(
  items: readonly T[],
  query: string,
): T[] {
  const terms = normalized(query).trim().split(/\s+/u).filter(Boolean);
  if (terms.length === 0) return [...items];

  return items.filter((item) => {
    const searchable = normalized(`${item.title}\n${hostnameOf(item.url)}\n${item.url}`);
    return terms.every((term) => searchable.includes(term));
  });
}

function normalized(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase();
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
