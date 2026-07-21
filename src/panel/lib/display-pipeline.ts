import type { DisplayFilter } from "./display-filter.js";
import { applyDisplayFilters } from "./display-filter.js";
import type { DisplayBookmarkItem } from "./display-item.js";
import { filterBookmarksByText } from "./display-search.js";
import type { DisplaySortSelection, DisplayState } from "./display-state.js";
import {
  createDateAddedAxis,
  createLastVisitTimeAxis,
  createTitleAxis,
  createVisitCountAxis,
} from "./sort-axes.js";
import type { SortAxis } from "./sort-axis.js";
import { sortForPanel } from "./sort-axis.js";

interface DisplayPipelineInput {
  readonly items: readonly DisplayBookmarkItem[];
  readonly query: string;
  readonly filters: readonly DisplayFilter<DisplayBookmarkItem>[];
  readonly state: DisplayState;
}

interface DisplaySet {
  readonly items: DisplayBookmarkItem[];
  readonly axis: SortAxis<unknown>;
}

const customAxis: SortAxis<unknown> = {
  id: "custom",
  scalable: false,
  direction: "asc",
  valueOf: () => null,
  compare: () => 0,
};

/** 検索、フィルタ、選択軸の順に適用して現在の表示集合を作る。 */
export function buildDisplaySet(input: DisplayPipelineInput): DisplaySet {
  const searched = filterBookmarksByText(input.items, input.query);
  const filtered = applyDisplayFilters(searched, input.filters);
  const axis = axisFor(input.state.sort);
  return {
    items: sortForPanel(filtered, axis),
    axis,
  };
}

function axisFor(selection: DisplaySortSelection): SortAxis<unknown> {
  switch (selection.axisId) {
    case "custom":
      return { ...customAxis, direction: selection.direction };
    case "title":
      return createTitleAxis(selection.direction);
    case "dateAdded":
      return createDateAddedAxis(selection.direction);
    case "visitCount":
      return createVisitCountAxis(selection.direction);
    case "lastVisitTime":
      return createLastVisitTimeAxis(selection.direction);
  }
}
