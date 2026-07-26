import type { BayPickerDragConnection } from "./bay-picker-drag.js";
import { applyDockingRailEdgePan } from "./docking-rail-overflow.js";
import type { BayOrientation } from "./docking-rail-drawing-plan.js";
import type { RailId } from "./docking-persistence-model.js";

export interface BayInsertionCandidate {
  readonly bayId: string;
  readonly start: number;
  readonly end: number;
}

export interface BayRailInsertionDrop {
  readonly bayId: string;
  readonly rail: RailId;
  readonly index: number;
}

export type BayRailInsertionRoots = Readonly<Record<RailId, HTMLElement>>;

export interface BayRailInsertionDropConnection {
  clear(): void;
  disconnect(): void;
}

interface BayRailInsertionDropOptions {
  readonly edgeThreshold?: number;
  readonly maxPanStep?: number;
}

const RAILS: readonly RailId[] = ["top", "left", "right", "bottom"];
const MARKER_CLASSES = [
  "dock-bay--drop-before-horizontal",
  "dock-bay--drop-after-horizontal",
  "dock-bay--drop-before-vertical",
  "dock-bay--drop-after-vertical",
] as const;

/** ドラッグ元を除外し、各候補の中心を境界として0始まりの挿入位置を返す。 */
export function calculateBayRailInsertionIndex(
  candidates: readonly BayInsertionCandidate[],
  draggedBayId: string,
  pointerCoordinate: number,
): number {
  if (!Number.isFinite(pointerCoordinate)) throw new Error("pointer coordinate must be finite");
  const remaining = candidates.filter(({ bayId }) => bayId !== draggedBayId);
  for (const candidate of remaining) {
    if (!Number.isFinite(candidate.start)
      || !Number.isFinite(candidate.end)
      || candidate.end < candidate.start) {
      throw new Error("candidate geometry is invalid");
    }
  }
  const index = remaining.findIndex(({ start, end }) => pointerCoordinate < (start + end) / 2);
  return index === -1 ? remaining.length : index;
}

/** 4レールへ中心境界の精密drop位置、向き別表示、端パンを接続する。 */
export function bindBayRailInsertionDrop(
  roots: BayRailInsertionRoots,
  drag: Pick<BayPickerDragConnection, "state" | "cancel">,
  deliver: (drop: BayRailInsertionDrop) => void,
  options: BayRailInsertionDropOptions = {},
): BayRailInsertionDropConnection {
  const edgeThreshold = options.edgeThreshold ?? 32;
  const maxPanStep = options.maxPanStep ?? 16;
  const removers: Array<() => void> = [];
  let markedRoot: HTMLElement | null = null;
  let markedBay: HTMLElement | null = null;

  for (const rail of RAILS) {
    const root = roots[rail];
    const orientation = orientationOf(rail);
    const onDragOver = (event: Event): void => {
      const state = drag.state();
      if (state === null) return;
      event.preventDefault();
      const dragEvent = event as DragEvent;
      const coordinate = orientation === "horizontal" ? dragEvent.clientX : dragEvent.clientY;
      const candidates = candidateBays(root, state.bayId, orientation);
      const index = calculateBayRailInsertionIndex(
        candidates.map(({ bayId, start, end }) => ({ bayId, start, end })),
        state.bayId,
        coordinate,
      );
      mark(root, candidates.map(({ element }) => element), orientation, index);
      pan(root, orientation, coordinate, edgeThreshold, maxPanStep);
      if (dragEvent.dataTransfer !== null) dragEvent.dataTransfer.dropEffect = "move";
    };
    const onDragLeave = (event: Event): void => {
      const related = (event as DragEvent).relatedTarget;
      if (related === null || !root.contains(related as Node)) clearMark();
    };
    const onDrop = (event: Event): void => {
      const state = drag.state();
      if (state === null) return;
      event.preventDefault();
      const dragEvent = event as DragEvent;
      const coordinate = orientation === "horizontal" ? dragEvent.clientX : dragEvent.clientY;
      const candidates = candidateBays(root, state.bayId, orientation);
      const index = calculateBayRailInsertionIndex(candidates, state.bayId, coordinate);
      clearMark();
      deliver({ bayId: state.bayId, rail, index });
      drag.cancel();
    };
    root.addEventListener("dragover", onDragOver);
    root.addEventListener("dragleave", onDragLeave);
    root.addEventListener("drop", onDrop);
    removers.push(() => {
      root.removeEventListener("dragover", onDragOver);
      root.removeEventListener("dragleave", onDragLeave);
      root.removeEventListener("drop", onDrop);
    });
  }

  /** 現在の挿入境界だけを向き別の線で表示する。 */
  function mark(
    root: HTMLElement,
    candidates: readonly HTMLElement[],
    orientation: BayOrientation,
    index: number,
  ): void {
    clearMark();
    markedRoot = root;
    if (candidates.length === 0) {
      root.classList.add("dock-rail--bay-drop-empty");
      return;
    }
    const atEnd = index === candidates.length;
    markedBay = atEnd ? candidates.at(-1) ?? null : candidates[index] ?? null;
    markedBay?.classList.add(`dock-bay--drop-${atEnd ? "after" : "before"}-${orientation}`);
  }

  /** 全向きの挿入表示をイベント終了経路から解除する。 */
  function clearMark(): void {
    markedRoot?.classList.remove("dock-rail--bay-drop-empty");
    markedBay?.classList.remove(...MARKER_CLASSES);
    markedRoot = null;
    markedBay = null;
  }

  return {
    clear: clearMark,
    disconnect(): void {
      for (const remove of removers) remove();
      clearMark();
    },
  };
}

/** レールDOMからドラッグ元を除いた配置ベイと向き別の座標を取得する。 */
function candidateBays(
  root: HTMLElement,
  draggedBayId: string,
  orientation: BayOrientation,
): Array<BayInsertionCandidate & { readonly element: HTMLElement }> {
  return [...root.querySelectorAll<HTMLElement>(".dock-bay--preview")]
    .filter(({ dataset }) => dataset.bayId !== draggedBayId)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        element,
        bayId: element.dataset.bayId ?? "",
        start: orientation === "horizontal" ? rect.left : rect.top,
        end: orientation === "horizontal" ? rect.right : rect.bottom,
      };
    });
}

/** レールIDから挿入判定軸を選ぶ。 */
function orientationOf(rail: RailId): BayOrientation {
  return rail === "top" || rail === "bottom" ? "horizontal" : "vertical";
}

/** 精密drop中も既存の向き別端パン計算を適用する。 */
function pan(
  root: HTMLElement,
  orientation: BayOrientation,
  coordinate: number,
  edgeThreshold: number,
  maxPanStep: number,
): void {
  const rect = root.getBoundingClientRect();
  applyDockingRailEdgePan(root, orientation, coordinate, {
    start: orientation === "horizontal" ? rect.left : rect.top,
    end: orientation === "horizontal" ? rect.right : rect.bottom,
    threshold: edgeThreshold,
    maxStep: maxPanStep,
  });
}
