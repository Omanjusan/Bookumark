export type SortDirection = "asc" | "desc";
export type StandardSortAxisId = "title" | "dateAdded" | "visitCount" | "lastVisitTime";
export type DisplaySortAxisId = StandardSortAxisId | "custom";
export type MovementMode = "custom-order" | "normal" | "directory-move";

export interface DisplaySortSelection<T extends DisplaySortAxisId = DisplaySortAxisId> {
  readonly axisId: T;
  readonly direction: SortDirection;
}

export interface DisplayState {
  readonly movementMode: MovementMode;
  readonly sort: DisplaySortSelection;
  readonly lastStandardSort: DisplaySortSelection<StandardSortAxisId>;
}

export type DisplayStateAction =
  | { readonly type: "setMovementMode"; readonly mode: MovementMode }
  | { readonly type: "resetMovementMode" }
  | {
    readonly type: "selectSort";
    readonly axisId: StandardSortAxisId;
    readonly direction: SortDirection;
  }
  | { readonly type: "toggleDirection" };

export const INITIAL_DISPLAY_STATE: DisplayState = {
  movementMode: "normal",
  sort: { axisId: "visitCount", direction: "desc" },
  lastStandardSort: { axisId: "visitCount", direction: "desc" },
};

/** 移動モードと通常ソートの関係を非破壊で更新する。 */
export function reduceDisplayState(
  state: DisplayState,
  action: DisplayStateAction,
): DisplayState {
  switch (action.type) {
    case "setMovementMode":
      return setMovementMode(state, action.mode);
    case "resetMovementMode":
      return setMovementMode(state, "normal");
    case "selectSort": {
      const selection: DisplaySortSelection<StandardSortAxisId> = {
        axisId: action.axisId,
        direction: action.direction,
      };
      return {
        movementMode: "normal",
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
        movementMode: "normal",
        sort: selection,
        lastStandardSort: selection,
      };
    }
  }
}

function setMovementMode(state: DisplayState, mode: MovementMode): DisplayState {
  if (mode === state.movementMode) return state;
  if (mode === "normal") {
    return {
      movementMode: "normal",
      sort: state.lastStandardSort,
      lastStandardSort: state.lastStandardSort,
    };
  }

  const lastStandardSort = state.sort.axisId === "custom"
    ? state.lastStandardSort
    : state.sort as DisplaySortSelection<StandardSortAxisId>;
  return {
    movementMode: mode,
    sort: { axisId: "custom", direction: lastStandardSort.direction },
    lastStandardSort,
  };
}
