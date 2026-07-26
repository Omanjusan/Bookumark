import type { BayPickerDragConnection } from "./bay-picker-drag.js";
import { applyDockingRailEdgePan } from "./docking-rail-overflow.js";
import type { BayOrientation } from "./docking-rail-drawing-plan.js";
import type { RailId } from "./docking-persistence-model.js";

export type BayRailDropRoots = Readonly<Record<RailId, HTMLElement>>;

export interface BayRailDrop {
  readonly bayId: string;
  readonly rail: RailId;
}

export interface BayRailDropConnection {
  clear(): void;
  disconnect(): void;
}

interface BayRailDropOptions {
  readonly edgeThreshold?: number;
  readonly maxPanStep?: number;
}

const RAILS: readonly RailId[] = ["top", "left", "right", "bottom"];

/** 4レールをベイ末尾drop領域として接続し、dragover時の向き別端パンを適用する。 */
export function bindBayRailDrop(
  roots: BayRailDropRoots,
  drag: Pick<BayPickerDragConnection, "state" | "cancel">,
  deliver: (drop: BayRailDrop) => void,
  options: BayRailDropOptions = {},
): BayRailDropConnection {
  const edgeThreshold = options.edgeThreshold ?? 32;
  const maxPanStep = options.maxPanStep ?? 16;
  const removers: Array<() => void> = [];
  let marked: HTMLElement | null = null;

  for (const rail of RAILS) {
    const root = roots[rail];
    const orientation: BayOrientation = rail === "top" || rail === "bottom"
      ? "horizontal"
      : "vertical";
    const onDragOver = (event: Event): void => {
      if (drag.state() === null) return;
      event.preventDefault();
      mark(root);
      const dragEvent = event as DragEvent;
      const rect = root.getBoundingClientRect();
      applyDockingRailEdgePan(
        root,
        orientation,
        orientation === "horizontal" ? dragEvent.clientX : dragEvent.clientY,
        {
          start: orientation === "horizontal" ? rect.left : rect.top,
          end: orientation === "horizontal" ? rect.right : rect.bottom,
          threshold: edgeThreshold,
          maxStep: maxPanStep,
        },
      );
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
      clearMark();
      deliver({ bayId: state.bayId, rail });
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

  /** 現在のレールだけを末尾drop候補として表示する。 */
  function mark(root: HTMLElement): void {
    if (marked === root) return;
    clearMark();
    marked = root;
    root.classList.add("dock-rail--bay-drop-end");
  }

  /** drop候補表示を全イベント終了経路から解除する。 */
  function clearMark(): void {
    marked?.classList.remove("dock-rail--bay-drop-end");
    marked = null;
  }

  return {
    clear: clearMark,
    disconnect(): void {
      for (const remove of removers) remove();
      clearMark();
    },
  };
}
