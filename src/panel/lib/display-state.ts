export type SortDirection = "asc" | "desc";
export type StandardSortAxisId = "title" | "dateAdded" | "visitCount" | "lastVisitTime";
export type DisplaySortAxisId = StandardSortAxisId | "custom";

export interface DisplaySortSelection<T extends DisplaySortAxisId = DisplaySortAxisId> {
  readonly axisId: T;
  readonly direction: SortDirection;
}

export interface DisplayState {
  readonly freeMovement: boolean;
  readonly sort: DisplaySortSelection;
  readonly lastStandardSort: DisplaySortSelection<StandardSortAxisId>;
}

export type DisplayStateAction =
  | { readonly type: "setFreeMovement"; readonly enabled: boolean }
  | {
    readonly type: "selectSort";
    readonly axisId: StandardSortAxisId;
    readonly direction: SortDirection;
  }
  | { readonly type: "toggleDirection" };

export const INITIAL_DISPLAY_STATE: DisplayState = {
  freeMovement: true,
  sort: { axisId: "custom", direction: "desc" },
  lastStandardSort: { axisId: "visitCount", direction: "desc" },
};

/** 自由移動と通常ソートの関係を非破壊で更新する。 */
export function reduceDisplayState(
  state: DisplayState,
  action: DisplayStateAction,
): DisplayState {
  switch (action.type) {
    case "setFreeMovement":
      return setFreeMovement(state, action.enabled);
    case "selectSort": {
      const selection: DisplaySortSelection<StandardSortAxisId> = {
        axisId: action.axisId,
        direction: action.direction,
      };
      return {
        freeMovement: false,
        sort: selection,
        lastStandardSort: selection,
      };
    }
    case "toggleDirection": {
      if (state.sort.axisId === "custom") return state;
      const selection: DisplaySortSelection<StandardSortAxisId> = {
        axisId: state.sort.axisId,
        direction: state.sort.direction === "asc" ? "desc" : "asc",
      };
      return {
        freeMovement: false,
        sort: selection,
        lastStandardSort: selection,
      };
    }
  }
}

function setFreeMovement(state: DisplayState, enabled: boolean): DisplayState {
  if (enabled === state.freeMovement) return state;
  if (!enabled) {
    return {
      freeMovement: false,
      sort: state.lastStandardSort,
      lastStandardSort: state.lastStandardSort,
    };
  }

  const lastStandardSort = state.sort.axisId === "custom"
    ? state.lastStandardSort
    : state.sort as DisplaySortSelection<StandardSortAxisId>;
  return {
    freeMovement: true,
    sort: { axisId: "custom", direction: lastStandardSort.direction },
    lastStandardSort,
  };
}
