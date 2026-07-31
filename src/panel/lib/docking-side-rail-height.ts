type SideRailHeightTarget = Pick<HTMLElement, "getBoundingClientRect" | "style">;

/** レール上端からviewport下端までの、画面内で利用可能な高さを返す。 */
export function calculateDockingSideRailAvailableHeight(
  viewportHeight: number,
  railTop: number,
): number {
  assertFiniteNonNegative(viewportHeight, "viewport height");
  if (!Number.isFinite(railTop)) throw new Error("rail top must be finite");
  return Math.max(0, viewportHeight - Math.max(0, railTop));
}

/** 左右レールの現在位置を測り、縦ベイが画面内に収まるCSS上限を設定する。 */
export function applyDockingSideRailAvailableHeight(
  rail: SideRailHeightTarget,
  viewportHeight: number,
): number {
  const available = calculateDockingSideRailAvailableHeight(
    viewportHeight,
    rail.getBoundingClientRect().top,
  );
  rail.style.setProperty("--dock-side-rail-max-height", `${available}px`);
  return available;
}

/** 有限の非負数であることを確認する。 */
function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be finite non-negative`);
  }
}
