import type { DisplayFilter } from "./display-filter.js";
import type { DisplayBookmarkItem } from "./display-item.js";
import { buildDisplaySet } from "./display-pipeline.js";
import {
  INITIAL_DISPLAY_STATE,
  reduceDisplayState,
} from "./display-state.js";
import type {
  DisplayState,
  MovementMode,
  SortDirection,
  StandardSortAxisId,
} from "./display-state.js";

export interface FixedDisplayState {
  readonly query: string;
  readonly filters: readonly DisplayFilter<DisplayBookmarkItem>[];
  readonly display: DisplayState;
}

export type FixedDisplayAction =
  | { readonly type: "setQuery"; readonly query: string }
  | {
    readonly type: "setFilters";
    readonly filters: readonly DisplayFilter<DisplayBookmarkItem>[];
  }
  | { readonly type: "setMovementMode"; readonly mode: MovementMode }
  | {
    readonly type: "selectSort";
    readonly axisId: StandardSortAxisId;
    readonly direction: SortDirection;
  }
  | { readonly type: "toggleDirection" };

export const INITIAL_FIXED_DISPLAY_STATE: FixedDisplayState = {
  query: "",
  filters: [],
  display: INITIAL_DISPLAY_STATE,
};

/** 固定ベイの配置やDOMに依存せず、表示機能の共通状態を更新する。 */
export function reduceFixedDisplayState(
  state: FixedDisplayState,
  action: FixedDisplayAction,
): FixedDisplayState {
  switch (action.type) {
    case "setQuery":
      return {
        ...state,
        query: action.query,
        display: action.query.trim().length === 0
          ? state.display
          : reduceDisplayState(state.display, { type: "resetMovementMode" }),
      };
    case "setFilters": {
      const filters = [...action.filters];
      return {
        ...state,
        filters,
        display: filters.length === 0
          ? state.display
          : reduceDisplayState(state.display, { type: "resetMovementMode" }),
      };
    }
    case "setMovementMode":
      return {
        ...state,
        display: reduceDisplayState(state.display, action),
      };
    case "selectSort":
      return {
        ...state,
        display: reduceDisplayState(state.display, action),
      };
    case "toggleDirection":
      return {
        ...state,
        display: reduceDisplayState(state.display, action),
      };
  }
}

/** 共通状態から検索、フィルタ、ソート済みの表示集合を生成する。 */
export function buildFixedDisplaySet(
  items: readonly DisplayBookmarkItem[],
  state: FixedDisplayState,
): ReturnType<typeof buildDisplaySet> {
  return buildDisplaySet({
    items,
    query: state.query,
    filters: state.filters,
    state: state.display,
  });
}
