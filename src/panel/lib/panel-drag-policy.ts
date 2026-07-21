interface PanelDragState {
  readonly movementMode: "custom-order" | "normal" | "directory-move";
  readonly query: string;
  readonly filterCount: number;
}

/** 全体のカスタム順が明確な、未絞り込みのカスタム配置時だけD&Dを許可する。 */
export function isPanelDragEnabled(state: PanelDragState): boolean {
  if (!Number.isInteger(state.filterCount) || state.filterCount < 0) {
    throw new RangeError("filterCount must be a non-negative integer");
  }
  return state.movementMode === "custom-order"
    && state.query.trim().length === 0
    && state.filterCount === 0;
}
