import type { TwoBayToolDrop } from "./two-bay-chip-add.js";
import type { TwoBayId } from "./two-bay-persistence-model.js";

type EventRoot = Pick<HTMLElement, "addEventListener" | "removeEventListener">;

/** ツールボックスから可視上下ベイ行へのcopy D&Dを接続する。 */
export function bindTwoBayToolboxDrag(
  toolbox: EventRoot,
  frame: EventRoot,
  deliver: (drop: TwoBayToolDrop) => void,
): { disconnect(): void } {
  let chipType: string | null = null;
  const onDragStart = (event: Event): void => {
    const tool = closest(event.target, ".two-bay-tool") as HTMLElement | null;
    if (tool?.dataset.chipType === undefined) return;
    chipType = tool.dataset.chipType;
    const transfer = (event as DragEvent).dataTransfer;
    if (transfer !== null) {
      transfer.effectAllowed = "copy";
      transfer.setData("text/plain", chipType);
    }
  };
  const onDragOver = (event: Event): void => {
    if (chipType === null || targetRow(event.target) === null || isDropDisabled(event.target)) return;
    event.preventDefault();
    const transfer = (event as DragEvent).dataTransfer;
    if (transfer !== null) transfer.dropEffect = "copy";
  };
  const onDrop = (event: Event): void => {
    const row = targetRow(event.target);
    if (chipType === null || row === null || isDropDisabled(event.target)) return;
    event.preventDefault();
    const dropped = chipType;
    chipType = null;
    deliver({ chipType: dropped, bay: row.bay, row: row.row });
  };
  const onDragEnd = (): void => { chipType = null; };
  toolbox.addEventListener("dragstart", onDragStart);
  toolbox.addEventListener("dragend", onDragEnd);
  frame.addEventListener("dragover", onDragOver);
  frame.addEventListener("drop", onDrop);
  return {
    disconnect(): void {
      toolbox.removeEventListener("dragstart", onDragStart);
      toolbox.removeEventListener("dragend", onDragEnd);
      frame.removeEventListener("dragover", onDragOver);
      frame.removeEventListener("drop", onDrop);
      chipType = null;
    },
  };
}

/** event targetから可視行のベイIDと行番号を取得する。 */
function targetRow(target: EventTarget | null): { bay: TwoBayId; row: number } | null {
  const element = closest(target, ".two-bay-row[data-bay][data-row]") as HTMLElement | null;
  const bay = element?.dataset.bay;
  const row = Number(element?.dataset.row);
  if ((bay !== "top" && bay !== "bottom") || !Number.isInteger(row) || row < 1) return null;
  return { bay, row };
}

/** 0行プレースホルダー配下をdrop対象から除外する。 */
function isDropDisabled(target: EventTarget | null): boolean {
  return closest(target, "[data-drop-disabled=\"true\"]") !== null;
}

/** closestを持たないevent targetを安全に無効扱いにする。 */
function closest(target: EventTarget | null, selector: string): Element | null {
  const method = (target as { closest?: (value: string) => Element | null } | null)?.closest;
  return method?.call(target, selector) ?? null;
}

