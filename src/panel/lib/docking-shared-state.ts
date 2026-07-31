import type {
  ChipDefinitionRegistry,
  ChipSharedState,
} from "./chip-contract.js";
import type { DockingChipApplicationEntry } from "./docking-chip-application-order.js";
import {
  evaluateDockingConditions,
} from "./docking-condition-evaluator.js";
import type { DockingConditionEvaluation } from "./docking-condition-evaluator.js";
import type {
  MovementMode,
  SortDirection,
  StandardSortAxisId,
} from "./display-state.js";
import type { ViewType } from "./view-type.js";
import type { VisitStatusFilterValue } from "./visit-status-filter.js";

export interface DockingFilterState {
  readonly visitStatus: VisitStatusFilterValue;
  readonly [key: string]: unknown;
}

export interface DockingSortState {
  readonly axisId: StandardSortAxisId;
  readonly direction: SortDirection;
}

export interface DockingSharedState extends ChipSharedState {
  readonly query: string;
  readonly filters: DockingFilterState;
  readonly sort: DockingSortState;
  readonly viewType: ViewType;
  readonly movementMode: MovementMode;
  readonly activeLayoutId: string;
}

const VISIT_STATUSES: readonly VisitStatusFilterValue[] = ["all", "visited", "unvisited"];
const SORT_AXES: readonly StandardSortAxisId[] = [
  "title", "dateAdded", "visitCount", "lastVisitTime",
];
const SORT_DIRECTIONS: readonly SortDirection[] = ["asc", "desc"];
const VIEW_TYPES: readonly ViewType[] = ["panel", "icon", "card", "list"];
const MOVEMENT_MODES: readonly MovementMode[] = ["custom-order", "normal", "directory-move"];

/** activeレイアウトを基準にDocking runtimeの標準共有状態を生成する。 */
export function createDefaultDockingSharedState(activeLayoutId: string): DockingSharedState {
  return {
    query: "",
    filters: { visitStatus: "all" },
    sort: { axisId: "visitCount", direction: "desc" },
    viewType: "panel",
    movementMode: "normal",
    activeLayoutId,
  };
}

/** 凍結した公式整理状態を保存値へ書き戻さず、runtime上だけ仮想カスタムへ戻す。 */
export function normalizeDockingRuntimeSharedState(
  state: DockingSharedState,
): DockingSharedState {
  return {
    ...structuredClone(state),
    movementMode: state.movementMode === "directory-move"
      ? "custom-order"
      : state.movementMode,
  };
}

/** 標準キーを検証し、未知の拡張キーは制約せず保持可能にする。 */
export function isValidDockingSharedState(
  value: ChipSharedState,
  activeLayoutId: string,
): value is DockingSharedState {
  const filters = value.filters;
  const sort = value.sort;
  return typeof value.query === "string"
    && isRecord(filters)
    && includes(VISIT_STATUSES, filters.visitStatus)
    && isRecord(sort)
    && includes(SORT_AXES, sort.axisId)
    && includes(SORT_DIRECTIONS, sort.direction)
    && includes(VIEW_TYPES, value.viewType)
    && includes(MOVEMENT_MODES, value.movementMode)
    && value.activeLayoutId === activeLayoutId;
}

/** Docking標準キーの妥当性とactiveレイアウト不変条件を含めconditionを評価する。 */
export function evaluateDockingSharedStateConditions(
  initialState: DockingSharedState,
  sequence: readonly DockingChipApplicationEntry[],
  definitions: ChipDefinitionRegistry,
): DockingConditionEvaluation {
  const activeLayoutId = initialState.activeLayoutId;
  return evaluateDockingConditions(initialState, sequence, definitions, {
    validateCandidate: (candidate) => isValidDockingSharedState(candidate, activeLayoutId),
  });
}

/** readonly候補配列にunknown値が含まれるか型を保って判定する。 */
function includes<T>(values: readonly T[], candidate: unknown): candidate is T {
  return values.some((value) => value === candidate);
}

/** 配列とnullを除く共有状態用オブジェクトか判定する。 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
