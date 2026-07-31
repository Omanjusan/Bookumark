import type { BayOrientation } from "./docking-rail-drawing-plan.js";

type DockingRailScroller = Pick<
  HTMLElement,
  "scrollLeft" | "scrollTop" | "scrollWidth" | "scrollHeight" | "clientWidth" | "clientHeight"
>;

/** リサイズ後のスクロール位置を、逆向きflexの負値を含む有効範囲へ収める。 */
export function clampDockingRailScrollOffset(
  offset: number,
  scrollExtent: number,
  clientExtent: number,
): number {
  assertFinite(offset, "scroll offset");
  assertFiniteNonNegative(scrollExtent, "scroll extent");
  assertFiniteNonNegative(clientExtent, "client extent");
  const limit = Math.max(0, scrollExtent - clientExtent);
  return Math.min(limit, Math.max(-limit, offset));
}

/** レールの並び軸だけを、現在位置を保った最も近い有効位置へ補正する。 */
export function preserveDockingRailScrollPosition(
  rail: DockingRailScroller,
  orientation: BayOrientation,
): void {
  if (orientation === "horizontal") {
    rail.scrollLeft = clampDockingRailScrollOffset(
      rail.scrollLeft,
      rail.scrollWidth,
      rail.clientWidth,
    );
    return;
  }
  rail.scrollTop = clampDockingRailScrollOffset(
    rail.scrollTop,
    rail.scrollHeight,
    rail.clientHeight,
  );
}

/** 新しいレイアウトのレールを、向きに対応する外側の先頭位置へ戻す。 */
export function resetDockingRailScrollPosition(
  rail: Pick<HTMLElement, "scrollLeft" | "scrollTop">,
  orientation: BayOrientation,
): void {
  if (orientation === "horizontal") rail.scrollLeft = 0;
  else rail.scrollTop = 0;
}

/** 有限数であることを確認する。 */
function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
}

/** 有限の非負数であることを確認する。 */
function assertFiniteNonNegative(value: number, label: string): void {
  assertFinite(value, label);
  if (value < 0) throw new Error(`${label} must be non-negative`);
}
