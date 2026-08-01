import type { TwoBayId } from "./two-bay-persistence-model.js";

export type TwoBayChipDragDrop = {
  readonly type: "move";
  readonly instanceId: string;
  readonly bay: TwoBayId;
  readonly row: number;
  readonly index: number;
} | {
  readonly type: "remove";
  readonly instanceId: string;
};

type EventRoot = Pick<HTMLElement, "addEventListener" | "removeEventListener">;

/** 編集中のチップ移動と明示的な除去領域へのdropを接続する。 */
export function bindTwoBayChipDrag(
  frame: EventRoot,
  deliver: (drop: TwoBayChipDragDrop) => void,
): { disconnect(): void } {
  let instanceId: string | null = null;
  const onDragStart = (event: Event): void => {
    const chip = closest(event.target, ".dock-chip[data-instance-id]") as HTMLElement | null;
    if (chip?.dataset.instanceId === undefined) return;
    instanceId = chip.dataset.instanceId;
    const transfer = (event as DragEvent).dataTransfer;
    if (transfer !== null) {
      transfer.effectAllowed = "move";
      transfer.setData("text/plain", instanceId);
    }
  };
  const onDragOver = (event: Event): void => {
    if (instanceId === null || (!isRemoval(event.target) && targetRow(event.target) === null)) return;
    event.preventDefault();
    const transfer = (event as DragEvent).dataTransfer;
    if (transfer !== null) transfer.dropEffect = "move";
  };
  const onDrop = (event: Event): void => {
    if (instanceId === null) return;
    if (isRemoval(event.target)) {
      event.preventDefault();
      const removed = instanceId;
      instanceId = null;
      deliver({ type: "remove", instanceId: removed });
      return;
    }
    const row = targetRow(event.target);
    if (row === null) return;
    event.preventDefault();
    const moved = instanceId;
    instanceId = null;
    deliver({
      type: "move",
      instanceId: moved,
      bay: row.bay,
      row: row.row,
      index: insertionIndex(row.element, moved, (event as DragEvent).clientX),
    });
  };
  const onDragEnd = (): void => { instanceId = null; };
  frame.addEventListener("dragstart", onDragStart);
  frame.addEventListener("dragover", onDragOver);
  frame.addEventListener("drop", onDrop);
  frame.addEventListener("dragend", onDragEnd);
  return {
    disconnect(): void {
      frame.removeEventListener("dragstart", onDragStart);
      frame.removeEventListener("dragover", onDragOver);
      frame.removeEventListener("drop", onDrop);
      frame.removeEventListener("dragend", onDragEnd);
      instanceId = null;
    },
  };
}

/** event targetから可視行と所属情報を取得する。 */
function targetRow(target: EventTarget | null): {
  bay: TwoBayId;
  row: number;
  element: HTMLElement;
} | null {
  const element = closest(target, ".two-bay-row[data-bay][data-row]") as HTMLElement | null;
  const bay = element?.dataset.bay;
  const row = Number(element?.dataset.row);
  if ((bay !== "top" && bay !== "bottom") || !Number.isInteger(row) || row < 1 || element === null) {
    return null;
  }
  return { bay, row, element };
}

/** source自身を除いたチップの中心位置から挿入indexを算出する。 */
function insertionIndex(row: HTMLElement, sourceId: string, clientX: number): number {
  const chips = [...row.querySelectorAll<HTMLElement>(".dock-chip[data-instance-id]")]
    .filter((chip) => chip.dataset.instanceId !== sourceId);
  const index = chips.findIndex((chip) => {
    const rect = chip.getBoundingClientRect();
    return clientX < rect.left + rect.width / 2;
  });
  return index < 0 ? chips.length : index;
}

/** 明示的な中央除去領域だけを削除drop先とする。 */
function isRemoval(target: EventTarget | null): boolean {
  return closest(target, "#two-bay-chip-removal") !== null;
}

/** closest非対応targetを安全に無効扱いにする。 */
function closest(target: EventTarget | null, selector: string): Element | null {
  const method = (target as { closest?: (value: string) => Element | null } | null)?.closest;
  return method?.call(target, selector) ?? null;
}

