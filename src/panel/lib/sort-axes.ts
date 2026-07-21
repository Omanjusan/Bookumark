import type { BookmarkItem } from "./bookmarks.js";
import type { DisplayBookmarkItem } from "./display-item.js";
import type { SortAxis } from "./sort-axis.js";

type SortDirection = "asc" | "desc";

const titleCollator = new Intl.Collator("ja", {
  sensitivity: "base",
  numeric: true,
  usage: "sort",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
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

/** 訪問回数で比較する、スケーラブルな活動軸を作る。 */
export function createVisitCountAxis(direction: SortDirection): SortAxis<number> {
  return {
    id: "visitCount",
    scalable: true,
    direction,
    valueOf: visitCountOf,
    compare: (a, b) => (visitCountOf(a) ?? 0) - (visitCountOf(b) ?? 0),
    formatValue: (value) => `${value}回`,
  };
}

/** 最終訪問日時で比較する、非スケーラブルな活動軸を作る。 */
export function createLastVisitTimeAxis(direction: SortDirection): SortAxis<number> {
  return {
    id: "lastVisitTime",
    scalable: false,
    direction,
    valueOf: lastVisitTimeOf,
    compare: (a, b) => (lastVisitTimeOf(a) ?? 0) - (lastVisitTimeOf(b) ?? 0),
    formatValue: (value) => dateTimeFormatter.format(value),
  };
}

function normalizedTitleOf(item: BookmarkItem): string | undefined {
  const title = item.title.trim();
  return title || undefined;
}

function dateAddedOf(item: BookmarkItem): number | undefined {
  return (item as DisplayBookmarkItem).dateAdded;
}

function visitCountOf(item: BookmarkItem): number | undefined {
  return (item as DisplayBookmarkItem).visitCount;
}

function lastVisitTimeOf(item: BookmarkItem): number | undefined {
  return (item as DisplayBookmarkItem).lastVisitTime;
}
