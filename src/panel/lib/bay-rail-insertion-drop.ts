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
  readonly requestFrame?: (callback: FrameRequestCallback) => number;
  readonly cancelFrame?: (handle: number) => void;
}

interface ActiveEdgePan {
  readonly root: HTMLElement;
  readonly orientation: BayOrientation;
  coordinate: number;
  observedPosition: number;
  stationaryFrames: number;
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
  const requestFrame = options.requestFrame
    ?? ((callback: FrameRequestCallback) => typeof requestAnimationFrame === "function"
      ? requestAnimationFrame(callback)
      : globalThis.setTimeout(() => callback(performance.now()), 16));
  const cancelFrame = options.cancelFrame ?? ((handle: number) => {
    if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(handle);
    else globalThis.clearTimeout(handle);
  });
  const removers: Array<() => void> = [];
  let markedRoot: HTMLElement | null = null;
  let markedBay: HTMLElement | null = null;
  let activePan: ActiveEdgePan | null = null;
  let panFrame: number | null = null;

  for (const rail of RAILS) {
    const root = roots[rail];
    const orientation = arrangementAxisOf(rail);
    const reverse = isReverseRail(rail);
    const onDragOver = (event: Event): void => {
      const state = drag.state();
      if (state === null) return;
      event.preventDefault();
      const dragEvent = event as DragEvent;
      const physicalCoordinate = orientation === "horizontal" ? dragEvent.clientX : dragEvent.clientY;
      const coordinate = normalizeCoordinate(physicalCoordinate, reverse);
      const candidates = candidateBays(root, state.bayId, orientation, reverse);
      const index = calculateBayRailInsertionIndex(
        candidates.map(({ bayId, start, end }) => ({ bayId, start, end })),
        state.bayId,
        coordinate,
      );
      mark(root, candidates.map(({ element }) => element), orientation, reverse, index);
      updatePan(root, orientation, physicalCoordinate);
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
      const physicalCoordinate = orientation === "horizontal" ? dragEvent.clientX : dragEvent.clientY;
      const coordinate = normalizeCoordinate(physicalCoordinate, reverse);
      const candidates = candidateBays(root, state.bayId, orientation, reverse);
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
    reverse: boolean,
    index: number,
  ): void {
    clearMarkerVisuals();
    markedRoot = root;
    if (candidates.length === 0) {
      root.classList.add("dock-rail--bay-drop-empty");
      return;
    }
    const atEnd = index === candidates.length;
    markedBay = atEnd ? candidates.at(-1) ?? null : candidates[index] ?? null;
    const visualSide = reverse === atEnd ? "before" : "after";
    markedBay?.classList.add(`dock-bay--drop-${visualSide}-${orientation}`);
  }

  /** 全向きの挿入表示をイベント終了経路から解除する。 */
  function clearMark(): void {
    stopPan();
    clearMarkerVisuals();
  }

  /** 端パン状態を変えず、全向きの挿入表示だけを解除する。 */
  function clearMarkerVisuals(): void {
    markedRoot?.classList.remove("dock-rail--bay-drop-empty");
    markedBay?.classList.remove(...MARKER_CLASSES);
    markedRoot = null;
    markedBay = null;
  }

  /** 最新ポインター位置を端パン対象にし、必要なら単一フレームを開始する。 */
  function updatePan(
    root: HTMLElement,
    orientation: BayOrientation,
    coordinate: number,
  ): void {
    if (activePan?.root === root && activePan.orientation === orientation) {
      activePan.coordinate = coordinate;
    } else {
      activePan = {
        root,
        orientation,
        coordinate,
        observedPosition: scrollPosition(root, orientation),
        stationaryFrames: 0,
      };
    }
    if (panFrame !== null) return;
    if (applyActivePan()) schedulePan();
    else activePan = null;
  }

  /** 現在の端パンを1回適用し、遅延反映を許容しつつ継続可否を返す。 */
  function applyActivePan(): boolean {
    if (activePan === null || drag.state() === null) return false;
    const { root, orientation, coordinate } = activePan;
    const before = scrollPosition(root, orientation);
    activePan.stationaryFrames = before === activePan.observedPosition
      ? activePan.stationaryFrames + 1
      : 0;
    activePan.observedPosition = before;
    const rect = root.getBoundingClientRect();
    const step = applyDockingRailEdgePan(root, orientation, coordinate, {
      start: orientation === "horizontal" ? rect.left : rect.top,
      end: orientation === "horizontal" ? rect.right : rect.bottom,
      threshold: edgeThreshold,
      maxStep: maxPanStep,
    });
    // FirefoxではscrollByの反映が次フレームになるため、連続2フレーム不変で終端と判定する。
    return step !== 0 && activePan.stationaryFrames < 2;
  }

  /** 静止ポインターでも端パンを継続する次フレームを一つだけ予約する。 */
  function schedulePan(): void {
    panFrame = requestFrame(() => {
      panFrame = null;
      if (applyActivePan()) schedulePan();
      else activePan = null;
    });
  }

  /** 予約済みフレームを破棄し、端パン対象を解除する。 */
  function stopPan(): void {
    if (panFrame !== null) cancelFrame(panFrame);
    panFrame = null;
    activePan = null;
  }

  return {
    clear: clearMark,
    disconnect(): void {
      for (const remove of removers) remove();
      clearMark();
    },
  };
}

/** レール配置軸の現在スクロール位置を返す。 */
function scrollPosition(root: HTMLElement, orientation: BayOrientation): number {
  return orientation === "horizontal" ? root.scrollLeft : root.scrollTop;
}

/** レールDOMからドラッグ元を除いた配置ベイと向き別の座標を取得する。 */
function candidateBays(
  root: HTMLElement,
  draggedBayId: string,
  orientation: BayOrientation,
  reverse: boolean,
): Array<BayInsertionCandidate & { readonly element: HTMLElement }> {
  return [...root.querySelectorAll<HTMLElement>(".dock-bay--preview")]
    .filter(({ dataset }) => dataset.bayId !== draggedBayId)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const physicalStart = orientation === "horizontal" ? rect.left : rect.top;
      const physicalEnd = orientation === "horizontal" ? rect.right : rect.bottom;
      return {
        element,
        bayId: element.dataset.bayId ?? "",
        start: reverse ? -physicalEnd : physicalStart,
        end: reverse ? -physicalStart : physicalEnd,
      };
    });
}

/** レールIDから複数ベイの配置軸を選ぶ。ベイ内部のチップ方向とは逆になる。 */
function arrangementAxisOf(rail: RailId): BayOrientation {
  return rail === "top" || rail === "bottom" ? "vertical" : "horizontal";
}

/** 外側から内側への保存順を逆flexで描画するレールかを返す。 */
function isReverseRail(rail: RailId): boolean {
  return rail === "right" || rail === "bottom";
}

/** 逆方向レールの物理座標を、保存順に増加する座標へ変換する。 */
function normalizeCoordinate(coordinate: number, reverse: boolean): number {
  return reverse ? -coordinate : coordinate;
}
