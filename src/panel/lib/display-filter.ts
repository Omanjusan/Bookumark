import type { BookmarkItem } from "./bookmarks.js";

export interface DisplayFilter<T extends BookmarkItem = BookmarkItem> {
  readonly id: string;
  matches(item: T): boolean;
}

/** 有効な全フィルタに一致する項目を、入力順を維持して返す。 */
export function applyDisplayFilters<T extends BookmarkItem>(
  items: readonly T[],
  filters: readonly DisplayFilter<T>[],
): T[] {
  if (filters.length === 0) return [...items];
  return items.filter((item) => filters.every((filter) => filter.matches(item)));
}
