import type { DisplayFilter } from "./display-filter.js";
import type { DisplayBookmarkItem } from "./display-item.js";

export type VisitStatusFilterValue = "all" | "visited" | "unvisited";

/** 訪問状態の選択値を表示パイプライン用フィルタへ変換する。 */
export function createVisitStatusFilters(
  value: VisitStatusFilterValue,
): readonly DisplayFilter<DisplayBookmarkItem>[] {
  switch (value) {
    case "all":
      return [];
    case "visited":
      return [{
        id: "訪問あり",
        matches: (item) => typeof item.visitCount === "number" && item.visitCount > 0,
      }];
    case "unvisited":
      return [{
        id: "未訪問",
        matches: (item) => item.visitCount === 0,
      }];
    default:
      throw new TypeError(`Unknown visit status: ${String(value)}`);
  }
}
