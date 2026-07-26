import type { BayOrientation } from "./docking-rail-drawing-plan.js";

export interface DockingRailOverflowPlan {
  readonly gap: 8 | 4 | 2;
  readonly scroll: boolean;
}

export interface DockingRailEdgePanArea {
  readonly start: number;
  readonly end: number;
  readonly threshold: number;
  readonly maxStep: number;
}

/** ベイ実寸を8px、4px、2pxの間隔で評価し、最後にスクロール要否を返す。 */
export function planDockingRailOverflow(
  availableExtent: number,
  bayExtents: readonly number[],
): DockingRailOverflowPlan {
  assertFiniteNonNegative(availableExtent, "available extent");
  for (const extent of bayExtents) assertFiniteNonNegative(extent, "bay extent");
  if (bayExtents.length === 0) return { gap: 8, scroll: false };

  const bayTotal = bayExtents.reduce((total, extent) => total + extent, 0);
  const boundaries = bayExtents.length - 1;
  for (const gap of [8, 4, 2] as const) {
    if (bayTotal + boundaries * gap <= availableExtent) return { gap, scroll: false };
  }
  return { gap: 2, scroll: true };
}

/** ポインターの端からの距離を、符号付きかつ上限付きのパン量へ変換する。 */
export function calculateDockingRailEdgePan(
  pointer: number,
  area: DockingRailEdgePanArea,
): number {
  if (!Number.isFinite(pointer)) throw new Error("pointer must be finite");
  if (!Number.isFinite(area.start) || !Number.isFinite(area.end) || area.start > area.end) {
    throw new Error("edge-pan range must be finite and ordered");
  }
  if (!Number.isFinite(area.threshold) || area.threshold <= 0) {
    throw new Error("edge-pan threshold must be finite and positive");
  }
  assertFiniteNonNegative(area.maxStep, "edge-pan max step");

  const fromStart = pointer - area.start;
  const fromEnd = area.end - pointer;
  const nearStart = fromStart < area.threshold;
  const nearEnd = fromEnd < area.threshold;
  if (nearStart && nearEnd && fromStart === fromEnd) return 0;
  if (nearStart && (!nearEnd || fromStart < fromEnd)) {
    return -rampedStep(fromStart, area.threshold, area.maxStep);
  }
  if (nearEnd) return rampedStep(fromEnd, area.threshold, area.maxStep);
  return 0;
}

/** 算出した端パン量を、横レールは横軸、縦レールは縦軸だけへ適用する。 */
export function applyDockingRailEdgePan(
  rail: Pick<HTMLElement, "scrollBy">,
  orientation: BayOrientation,
  pointer: number,
  area: DockingRailEdgePanArea,
): number {
  const step = calculateDockingRailEdgePan(pointer, area);
  if (step === 0) return 0;
  rail.scrollBy({
    left: orientation === "horizontal" ? step : 0,
    top: orientation === "vertical" ? step : 0,
    behavior: "auto",
  });
  return step;
}

/** 端の外側を最大値、閾値境界を0とする線形速度を返す。 */
function rampedStep(distance: number, threshold: number, maxStep: number): number {
  const ratio = Math.min(1, Math.max(0, (threshold - distance) / threshold));
  return Math.round(maxStep * ratio);
}

/** 寸法値が有限の非負数であることを確認する。 */
function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be finite non-negative`);
  }
}
