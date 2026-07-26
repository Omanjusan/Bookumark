export type BayFactoryChipChange =
  | { readonly type: "reorder"; readonly instanceId: string; readonly index: number }
  | { readonly type: "delete"; readonly instanceId: string };

interface BayFactoryChipDragConnection {
  disconnect(): void;
}

type ChipDragEditor = Pick<
  HTMLElement,
  "addEventListener" | "removeEventListener" | "contains" | "querySelectorAll" | "classList"
>;

/** 配置済み文字チップの横並べ替えとベイ枠外dropによる削除を通知する。 */
export function bindBayFactoryChipDrag(
  editor: ChipDragEditor,
  deliver: (change: BayFactoryChipChange) => void,
): BayFactoryChipDragConnection {
  let draggedChip: HTMLElement | null = null;
  let instanceId: string | null = null;
  let markedEnd: Element | null = null;

  const onDragStart = (event: Event): void => {
    const dragEvent = event as DragEvent;
    const chip = chipOf(dragEvent.target);
    const nextInstanceId = chip?.dataset.instanceId;
    if (!chip || !nextInstanceId || !editor.contains(chip)) return;
    clearState();
    draggedChip = chip;
    instanceId = nextInstanceId;
    chip.classList.add("dragging");
    if (dragEvent.dataTransfer) {
      dragEvent.dataTransfer.effectAllowed = "move";
      try {
        dragEvent.dataTransfer.setData("text/plain", nextInstanceId);
      } catch {
        // Firefoxがデータ設定を拒否しても内部instanceIdで継続する。
      }
    }
  };

  const onDragOver = (event: Event): void => {
    if (instanceId === null || !isInsideEditor(editor, event.target)) return;
    event.preventDefault();
    clearDropMarks();
    const frame = bayFrameOf(event.target);
    if (frame) markInsertion(frame, insertionIndex(editor, (event as DragEvent).clientX));
    else editor.classList.add("delete-drop-target");
    const dragEvent = event as DragEvent;
    if (dragEvent.dataTransfer) dragEvent.dataTransfer.dropEffect = "move";
  };

  const onDrop = (event: Event): void => {
    if (instanceId === null || !isInsideEditor(editor, event.target)) return;
    event.preventDefault();
    const droppedInstanceId = instanceId;
    const sourceIndex = chipIndex(editor, droppedInstanceId);
    const inBayFrame = bayFrameOf(event.target) !== null;
    const rawIndex = inBayFrame ? insertionIndex(editor, (event as DragEvent).clientX) : -1;
    clearState();

    if (!inBayFrame) {
      deliver({ type: "delete", instanceId: droppedInstanceId });
      return;
    }
    if (sourceIndex < 0) return;
    // 移動元より右の境界は、移動元を除いた後の添字へ1つ戻す。
    const index = sourceIndex < rawIndex ? rawIndex - 1 : rawIndex;
    if (index !== sourceIndex) {
      deliver({ type: "reorder", instanceId: droppedInstanceId, index });
    }
  };

  const onDragEnd = (): void => clearState();

  /** ドラッグ中表示と内部識別子を解除する。 */
  function clearState(): void {
    draggedChip?.classList.remove("dragging");
    draggedChip = null;
    instanceId = null;
    clearDropMarks();
  }

  /** 挿入境界と削除候補表示をすべて解除する。 */
  function clearDropMarks(): void {
    for (const chip of editor.querySelectorAll<HTMLElement>(".bay-factory-chip")) {
      chip.classList.remove("drop-before");
    }
    markedEnd?.classList.remove("drop-at-end");
    markedEnd = null;
    editor.classList.remove("delete-drop-target");
  }

  /** 算出した挿入位置をチップ左辺またはベイ右端へ表示する。 */
  function markInsertion(frame: Element, index: number): void {
    const chips = [...editor.querySelectorAll<HTMLElement>(".bay-factory-chip")];
    if (index < chips.length) chips[index].classList.add("drop-before");
    else {
      frame.classList.add("drop-at-end");
      markedEnd = frame;
    }
  }

  editor.addEventListener("dragstart", onDragStart);
  editor.addEventListener("dragover", onDragOver);
  editor.addEventListener("drop", onDrop);
  editor.addEventListener("dragend", onDragEnd);

  return {
    disconnect(): void {
      editor.removeEventListener("dragstart", onDragStart);
      editor.removeEventListener("dragover", onDragOver);
      editor.removeEventListener("drop", onDrop);
      editor.removeEventListener("dragend", onDragEnd);
      clearState();
    },
  };
}

/** instanceIdに対応する現在のチップ添字を返す。 */
function chipIndex(editor: Pick<HTMLElement, "querySelectorAll">, instanceId: string): number {
  return [...editor.querySelectorAll<HTMLElement>(".bay-factory-chip")]
    .findIndex((chip) => chip.dataset.instanceId === instanceId);
}

/** ポインターより右に中心がある最初のチップを生の挿入境界とする。 */
function insertionIndex(editor: Pick<HTMLElement, "querySelectorAll">, clientX: number): number {
  const chips = [...editor.querySelectorAll<HTMLElement>(".bay-factory-chip")];
  const index = chips.findIndex((chip) => {
    const rect = chip.getBoundingClientRect();
    return clientX < rect.left + rect.width / 2;
  });
  return index < 0 ? chips.length : index;
}

/** イベント対象が横ベイ編集キャンバス内か判定する。 */
function isInsideEditor(
  editor: Pick<HTMLElement, "contains">,
  target: EventTarget | null,
): boolean {
  return target !== null && editor.contains(target as Node);
}

/** イベント対象が属する横ベイ枠を取得する。 */
function bayFrameOf(target: EventTarget | null): Element | null {
  const closest = (target as { closest?: (selector: string) => Element | null } | null)?.closest;
  return closest?.call(target, ".bay-factory-bay-preview") ?? null;
}

/** イベント対象から配置済み文字チップを取得する。 */
function chipOf(target: EventTarget | null): HTMLElement | null {
  const closest = (target as { closest?: (selector: string) => Element | null } | null)?.closest;
  return closest?.call(target, ".bay-factory-chip") as HTMLElement | null | undefined ?? null;
}
