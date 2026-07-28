import type { BayPickerDragConnection } from "./bay-picker-drag.js";

interface LayoutBayTrashOptions {
  readonly keyboardTarget?: Pick<Document, "addEventListener" | "removeEventListener">;
  readonly onUnplace: (bayId: string) => void;
}

export interface LayoutBayTrashConnection {
  clear(): void;
  disconnect(): void;
}

type EventRoot = Pick<HTMLElement, "addEventListener" | "removeEventListener">;

/** ベイドラッグ中だけ中央ゴミ箱を表示し、dropを未配置化として通知する。 */
export function bindLayoutBayTrash(
  trash: HTMLElement,
  picker: EventRoot,
  drag: Pick<BayPickerDragConnection, "state" | "cancel">,
  options: LayoutBayTrashOptions,
): LayoutBayTrashConnection {
  const keyboardTarget = options.keyboardTarget ?? document;
  const onDragStart = (): void => {
    if (drag.state() !== null) trash.hidden = false;
  };
  const onDragEnd = (): void => clear();
  const onKeyDown = (event: Event): void => {
    if ((event as KeyboardEvent).key === "Escape") clear();
  };
  const onDragOver = (event: Event): void => {
    if (drag.state() === null) return;
    event.preventDefault();
    trash.classList.add("layout-bay-trash--active");
    const transfer = (event as DragEvent).dataTransfer;
    if (transfer !== null) transfer.dropEffect = "move";
  };
  const onDragLeave = (event: Event): void => {
    const related = (event as DragEvent).relatedTarget;
    if (related === null || !trash.contains(related as Node)) {
      trash.classList.remove("layout-bay-trash--active");
    }
  };
  const onDrop = (event: Event): void => {
    const state = drag.state();
    if (state === null) return;
    event.preventDefault();
    options.onUnplace(state.bayId);
    drag.cancel();
    clear();
  };

  /** ハイライトと表示をすべての終了経路から解除する。 */
  function clear(): void {
    trash.classList.remove("layout-bay-trash--active");
    trash.hidden = true;
  }

  picker.addEventListener("dragstart", onDragStart);
  picker.addEventListener("dragend", onDragEnd);
  keyboardTarget.addEventListener("keydown", onKeyDown);
  trash.addEventListener("dragover", onDragOver);
  trash.addEventListener("dragleave", onDragLeave);
  trash.addEventListener("drop", onDrop);
  clear();

  return {
    clear,
    disconnect(): void {
      picker.removeEventListener("dragstart", onDragStart);
      picker.removeEventListener("dragend", onDragEnd);
      keyboardTarget.removeEventListener("keydown", onKeyDown);
      trash.removeEventListener("dragover", onDragOver);
      trash.removeEventListener("dragleave", onDragLeave);
      trash.removeEventListener("drop", onDrop);
      clear();
    },
  };
}
