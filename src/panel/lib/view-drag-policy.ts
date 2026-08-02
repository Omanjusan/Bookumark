import type { MovementMode } from "./display-state.js";
import type { ViewType } from "./view-type.js";

export type ViewDragMode = "custom" | "official" | null;

interface ViewDragState {
  readonly viewType: ViewType;
  readonly movementMode: MovementMode;
  readonly query: string;
  readonly filterCount: number;
  readonly officialMovePending: boolean;
}

/** 表示形式と共有状態から現在許可するD&D操作種別を返す。 */
export function resolveViewDragMode(state: ViewDragState): ViewDragMode {
  if (!Number.isInteger(state.filterCount) || state.filterCount < 0) {
    throw new RangeError("filterCount must be a non-negative integer");
  }
  if (state.viewType === "list") return null;
  if (state.query.trim().length > 0 || state.filterCount > 0) return null;
  if (state.movementMode === "custom-order") return "custom";
  if (state.movementMode === "directory-move" && !state.officialMovePending) {
    return "official";
  }
  return null;
}
