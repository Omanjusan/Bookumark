import type { BookmarkItem } from "./bookmarks.js";

/** ソート機能からパネルへ渡す軸の契約。compareは昇順を表す。 */
export interface SortAxis<T> {
  id: string;
  scalable: boolean;
  direction: "asc" | "desc";
  valueOf(item: BookmarkItem): T | null | undefined;
  compare(a: BookmarkItem, b: BookmarkItem): number;
  formatValue?(value: T): string;
}

/**
 * 軸の欠損値と方向を適用し、パネルの表示順を返す。
 * 入力配列は変更せず、同値項目は渡された順序を維持する。
 */
export function sortForPanel<T>(
  items: readonly BookmarkItem[],
  axis: SortAxis<T>,
): BookmarkItem[] {
  const direction = axis.direction === "asc" ? 1 : -1;

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aMissing = axis.valueOf(a.item) == null;
      const bMissing = axis.valueOf(b.item) == null;

      let compared = 0;
      if (aMissing !== bMissing) compared = aMissing ? -1 : 1;
      else if (!aMissing) compared = axis.compare(a.item, b.item);

      const directed = compared * direction;
      return directed === 0 ? a.index - b.index : directed;
    })
    .map(({ item }) => item);
}
