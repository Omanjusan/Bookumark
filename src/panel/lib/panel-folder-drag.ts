import type { CustomOrderPlacement } from "./custom-order-move.js";

interface FolderDrop {
  readonly fromGuid: string;
  readonly toGuid: string;
  readonly placement: CustomOrderPlacement;
}

interface FolderDragOptions {
  readonly isEnabled?: () => boolean;
  readonly onDragStart?: () => void;
}

interface FolderDragConnection {
  disconnect(): void;
}

type FolderDragRoot = Pick<
  HTMLElement,
  "addEventListener" | "removeEventListener" | "querySelectorAll"
>;

/** フォルダボタン間のD&Dを、左右半分に基づく前後挿入へ変換する。 */
export function bindPanelFolderDrag(
  root: FolderDragRoot,
  deliver: (drop: FolderDrop) => void,
  options: FolderDragOptions = {},
): FolderDragConnection {
  let draggedGuid: string | null = null;

  const onDragStart = (event: Event): void => {
    if (options.isEnabled?.() === false) return;
    const dragEvent = event as DragEvent;
    const button = folderOf(dragEvent.target);
    const guid = button?.dataset.folderGuid;
    if (!button || !guid) return;
    draggedGuid = guid;
    options.onDragStart?.();
    button.classList.add("dragging");
    if (dragEvent.dataTransfer) {
      dragEvent.dataTransfer.effectAllowed = "move";
      try {
        dragEvent.dataTransfer.setData("text/plain", guid);
      } catch {
        // Firefoxがデータ設定を拒否しても内部GUIDで継続する。
      }
    }
  };

  const onDragOver = (event: Event): void => {
    if (options.isEnabled?.() === false || draggedGuid === null) return;
    const dragEvent = event as DragEvent;
    const button = folderOf(dragEvent.target);
    const guid = button?.dataset.folderGuid;
    if (!button || !guid || guid === draggedGuid) return;
    dragEvent.preventDefault();
    clearDropMarks();
    const placement = placementForFolderPointer(button, dragEvent.clientX);
    button.classList.toggle("drag-over-before", placement === "before");
    button.classList.toggle("drag-over-after", placement === "after");
  };

  const onDrop = (event: Event): void => {
    if (options.isEnabled?.() === false) {
      clearDragState();
      return;
    }
    const dragEvent = event as DragEvent;
    const button = folderOf(dragEvent.target);
    const toGuid = button?.dataset.folderGuid;
    if (draggedGuid && button && toGuid && toGuid !== draggedGuid) {
      dragEvent.preventDefault();
      deliver({
        fromGuid: draggedGuid,
        toGuid,
        placement: placementForFolderPointer(button, dragEvent.clientX),
      });
    }
    clearDragState();
  };

  const onDragEnd = (): void => clearDragState();

  function clearDropMarks(): void {
    for (const button of root.querySelectorAll<HTMLElement>(".folder-button")) {
      button.classList.remove("drag-over-before", "drag-over-after");
    }
  }

  function clearDragState(): void {
    for (const button of root.querySelectorAll<HTMLElement>(".folder-button")) {
      button.classList.remove("dragging", "drag-over-before", "drag-over-after");
    }
    draggedGuid = null;
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

function placementForFolderPointer(
  button: Pick<HTMLElement, "getBoundingClientRect">,
  clientX: number,
): CustomOrderPlacement {
  const rect = button.getBoundingClientRect();
  return clientX < rect.left + rect.width / 2 ? "before" : "after";
}

function folderOf(target: EventTarget | null): HTMLElement | null {
  const closest = (target as { closest?: (selector: string) => Element | null } | null)?.closest;
  return closest?.call(target, ".folder-button") as HTMLElement | null | undefined ?? null;
}
