import type { CustomOrderPlacement } from "./custom-order-move.js";

interface TileRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface TileDrop {
  readonly fromGuid: string;
  readonly toGuid: string;
  readonly placement: CustomOrderPlacement;
}

interface TileDragConnection {
  disconnect(): void;
}

interface TileDragOptions {
  readonly isEnabled?: () => boolean;
  readonly onDragStart?: () => void;
}

type TileDragRoot = Pick<
  HTMLElement,
  "addEventListener" | "removeEventListener" | "querySelectorAll"
>;

/** 横長は左右、それ以外は上下の中央を境界として挿入位置を返す。 */
export function placementForTilePointer(
  rect: TileRect,
  clientX: number,
  clientY: number,
): CustomOrderPlacement {
  if (rect.width > rect.height) {
    return clientX < rect.left + rect.width / 2 ? "before" : "after";
  }
  return clientY < rect.top + rect.height / 2 ? "before" : "after";
}

/** タイルのHTML D&Dイベントを、前後挿入を表すdrop通知へ変換する。 */
export function bindPanelTileDrag(
  root: TileDragRoot,
  deliver: (drop: TileDrop) => void,
  options: TileDragOptions = {},
): TileDragConnection {
  let draggedGuid: string | null = null;
  let activeBoundary: HTMLElement | null = null;

  const onDragStart = (event: Event): void => {
    if (options.isEnabled?.() === false) return;
    const dragEvent = event as DragEvent;
    const tile = tileOf(dragEvent.target);
    const guid = tile?.dataset.guid;
    if (!tile || !guid) return;
    draggedGuid = guid;
    options.onDragStart?.();
    tile.classList.add("dragging");
    if (dragEvent.dataTransfer) {
      dragEvent.dataTransfer.effectAllowed = "move";
      try {
        dragEvent.dataTransfer.setData("text/plain", guid);
      } catch {
        // Firefoxがデータ設定を拒否しても内部GUIDでドラッグを継続する。
      }
    }
  };

  const onDragOver = (event: Event): void => {
    if (options.isEnabled?.() === false) return;
    if (!draggedGuid) return;
    const dragEvent = event as DragEvent;
    const boundary = boundaryOf(dragEvent.target);
    if (boundary) {
      const targetGuid = boundary.dataset.targetGuid;
      clearDropMarks();
      clearBoundaryMark();
      if (!targetGuid || targetGuid === draggedGuid) return;
      dragEvent.preventDefault();
      activeBoundary = boundary;
      boundary.classList.add("drag-over");
      return;
    }
    const tile = tileOf(dragEvent.target);
    if (!tile?.dataset.guid || tile.dataset.guid === draggedGuid) return;
    dragEvent.preventDefault();
    clearDropMarks();
    clearBoundaryMark();
    const placement = placementForTilePointer(
      tile.getBoundingClientRect(),
      dragEvent.clientX,
      dragEvent.clientY,
    );
    tile.classList.toggle(
      "drag-over-horizontal",
      tile.getBoundingClientRect().width > tile.getBoundingClientRect().height,
    );
    tile.classList.toggle("drag-over-before", placement === "before");
    tile.classList.toggle("drag-over-after", placement === "after");
  };

  const onDrop = (event: Event): void => {
    if (options.isEnabled?.() === false) {
      clearDragState();
      return;
    }
    const dragEvent = event as DragEvent;
    const boundary = boundaryOf(dragEvent.target);
    const boundaryTargetGuid = boundary?.dataset.targetGuid;
    const boundaryPosition = boundary?.dataset.boundary;
    if (
      draggedGuid
      && boundaryTargetGuid
      && boundaryTargetGuid !== draggedGuid
      && (boundaryPosition === "start" || boundaryPosition === "end")
    ) {
      dragEvent.preventDefault();
      deliver({
        fromGuid: draggedGuid,
        toGuid: boundaryTargetGuid,
        placement: boundaryPosition === "start" ? "before" : "after",
      });
      clearDragState();
      return;
    }
    const tile = tileOf(dragEvent.target);
    const toGuid = tile?.dataset.guid;
    if (draggedGuid && tile && toGuid && toGuid !== draggedGuid) {
      dragEvent.preventDefault();
      deliver({
        fromGuid: draggedGuid,
        toGuid,
        placement: placementForTilePointer(
          tile.getBoundingClientRect(),
          dragEvent.clientX,
          dragEvent.clientY,
        ),
      });
    }
    clearDragState();
  };

  const onDragEnd = (): void => clearDragState();

  function clearDropMarks(): void {
    for (const tile of root.querySelectorAll<HTMLElement>(".panel-tile")) {
      tile.classList.remove("drag-over-before", "drag-over-after", "drag-over-horizontal");
    }
  }

  function clearDragState(): void {
    for (const tile of root.querySelectorAll<HTMLElement>(".panel-tile")) {
      tile.classList.remove(
        "dragging",
        "drag-over-before",
        "drag-over-after",
        "drag-over-horizontal",
      );
    }
    clearBoundaryMark();
    draggedGuid = null;
  }

  function clearBoundaryMark(): void {
    activeBoundary?.classList.remove("drag-over");
    activeBoundary = null;
  }

  root.addEventListener("dragstart", onDragStart);
  root.addEventListener("dragover", onDragOver);
  root.addEventListener("drop", onDrop);
  root.addEventListener("dragend", onDragEnd);

  return {
    disconnect(): void {
      root.removeEventListener("dragstart", onDragStart);
      root.removeEventListener("dragover", onDragOver);
      root.removeEventListener("drop", onDrop);
      root.removeEventListener("dragend", onDragEnd);
      clearDragState();
    },
  };
}

function tileOf(target: EventTarget | null): HTMLElement | null {
  const closest = (target as { closest?: (selector: string) => Element | null } | null)?.closest;
  return closest?.call(target, ".panel-tile") as HTMLElement | null | undefined ?? null;
}

function boundaryOf(target: EventTarget | null): HTMLElement | null {
  const closest = (target as { closest?: (selector: string) => Element | null } | null)?.closest;
  return closest?.call(target, ".panel-drop-boundary") as HTMLElement | null | undefined ?? null;
}
