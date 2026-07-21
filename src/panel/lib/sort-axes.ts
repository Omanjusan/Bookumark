import type { BookmarkItem } from "./bookmarks.js";
import type { DisplayBookmarkItem } from "./display-item.js";
import type { SortAxis } from "./sort-axis.js";

type SortDirection = "asc" | "desc";

const titleCollator = new Intl.Collator("ja", {
  sensitivity: "base",
  numeric: true,
  usage: "sort",
});

/** 日本語ロケールの自然順で比較する、非スケーラブルな名前軸を作る。 */
export function createTitleAxis(direction: SortDirection): SortAxis<string> {
  return {
    id: "title",
    scalable: false,
    direction,
    valueOf: (item) => normalizedTitleOf(item),
    compare: (a, b) => titleCollator.compare(normalizedTitleOf(a) ?? "", normalizedTitleOf(b) ?? ""),
  };
}

/** Firefoxの追加日時で比較する、非スケーラブルな軸を作る。 */
export function createDateAddedAxis(direction: SortDirection): SortAxis<number> {
  return {
    id: "dateAdded",
    scalable: false,
    direction,
    valueOf: dateAddedOf,
    compare: (a, b) => (dateAddedOf(a) ?? 0) - (dateAddedOf(b) ?? 0),
  };
}

function normalizedTitleOf(item: BookmarkItem): string | undefined {
  const title = item.title.trim();
  return title || undefined;
}

function dateAddedOf(item: BookmarkItem): number | undefined {
  return (item as DisplayBookmarkItem).dateAdded;
}
