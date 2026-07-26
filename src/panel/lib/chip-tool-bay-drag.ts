export interface ChipToolDrop {
  readonly chipType: string;
  readonly index: number;
}

interface ChipToolBayDragOptions {
  readonly document?: Pick<Document, "createElement" | "body">;
}

interface ChipToolBayDragConnection {
  disconnect(): void;
}

type DragRoot = Pick<HTMLElement, "addEventListener" | "removeEventListener">;

/** 文字チップツールのドラッグを横ベイ内の挿入位置へ変換する。 */
export function bindChipToolBayDrag(
  toolRoot: DragRoot,
  editor: DragRoot & Pick<HTMLElement, "contains" | "querySelectorAll">,
  deliver: (drop: ChipToolDrop) => void,
  options: ChipToolBayDragOptions = {},
): ChipToolBayDragConnection {
  const documentRef = options.document ?? document;
  let chipType: string | null = null;
  let draggedTool: HTMLElement | null = null;
  let preview: HTMLElement | null = null;
  let markedEnd: Element | null = null;

  const onDragStart = (event: Event): void => {
    const dragEvent = event as DragEvent;
    const tool = toolOf(dragEvent.target);
    const nextChipType = tool?.dataset.chipType;
    if (!tool || !nextChipType) return;
    clearState();
    chipType = nextChipType;
    draggedTool = tool;
    tool.classList.add("dragging");
    preview = createTextPreview(documentRef, tool.textContent ?? "");
    if (dragEvent.dataTransfer) {
      dragEvent.dataTransfer.effectAllowed = "copy";
      try {
        dragEvent.dataTransfer.setData("text/plain", nextChipType);
        dragEvent.dataTransfer.setDragImage(preview, 8, 8);
      } catch {
        // Firefoxがプレビュー設定を拒否しても内部状態でdropを継続する。
      }
    }
  };

  const onDragOver = (event: Event): void => {
    const zone = dropZoneOf(event.target);
    if (chipType === null || zone === null || !isInsideEditor(editor, event.target)) return;
    event.preventDefault();
    markInsertion(zone, insertionIndex(editor, (event as DragEvent).clientX));
    const dragEvent = event as DragEvent;
    if (dragEvent.dataTransfer) dragEvent.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (event: Event): void => {
    const zone = dropZoneOf(event.target);
    if (chipType === null || zone === null || !isInsideEditor(editor, event.target)) return;
    event.preventDefault();
    const index = insertionIndex(editor, (event as DragEvent).clientX);
    const droppedChipType = chipType;
    clearState();
    deliver({ chipType: droppedChipType, index });
  };

  const onDragEnd = (): void => clearState();

  /** ドラッグ元、プレビュー、内部識別子を次の操作へ持ち越さない。 */
  function clearState(): void {
    draggedTool?.classList.remove("dragging");
    preview?.remove();
    draggedTool = null;
    preview = null;
    chipType = null;
    clearDropMarks();
  }

  /** 挿入境界の表示をすべて解除する。 */
  function clearDropMarks(): void {
    for (const chip of editor.querySelectorAll<HTMLElement>(".bay-factory-chip")) {
      chip.classList.remove("drop-before");
    }
    markedEnd?.classList.remove("drop-at-end");
    markedEnd = null;
  }

  /** 算出した挿入位置をチップ左辺またはベイ右端へ表示する。 */
  function markInsertion(zone: Element, index: number): void {
    clearDropMarks();
    const chips = [...editor.querySelectorAll<HTMLElement>(".bay-factory-chip")];
    if (index < chips.length) chips[index].classList.add("drop-before");
    else {
      zone.classList.add("drop-at-end");
      markedEnd = zone;
    }
  }

  toolRoot.addEventListener("dragstart", onDragStart);
  toolRoot.addEventListener("dragend", onDragEnd);
  editor.addEventListener("dragover", onDragOver);
  editor.addEventListener("drop", onDrop);

  return {
    disconnect(): void {
      toolRoot.removeEventListener("dragstart", onDragStart);
      toolRoot.removeEventListener("dragend", onDragEnd);
      editor.removeEventListener("dragover", onDragOver);
      editor.removeEventListener("drop", onDrop);
      clearState();
    },
  };
}

/** イベント対象が属する横ベイdrop領域を取得する。 */
function dropZoneOf(target: EventTarget | null): Element | null {
  const closest = (target as { closest?: (selector: string) => Element | null } | null)?.closest;
  return closest?.call(target, ".bay-factory-bay-preview, .bay-factory-empty") ?? null;
}

/** ドラッグ画像として使う短い文字チップをbody直下へ生成する。 */
function createTextPreview(
  documentRef: Pick<Document, "createElement" | "body">,
  label: string,
): HTMLElement {
  const preview = documentRef.createElement("div");
  preview.className = "chip-tool-drag-preview";
  preview.textContent = label;
  documentRef.body.appendChild(preview);
  return preview;
}

/** ポインターより右側に中心がある最初のチップを挿入位置とする。 */
function insertionIndex(
  editor: Pick<HTMLElement, "querySelectorAll">,
  clientX: number,
): number {
  const chips = [...editor.querySelectorAll<HTMLElement>(".bay-factory-chip")];
  const index = chips.findIndex((chip) => {
    const rect = chip.getBoundingClientRect();
    return clientX < rect.left + rect.width / 2;
  });
  return index < 0 ? chips.length : index;
}

/** イベント対象が横ベイ編集領域内か判定する。 */
function isInsideEditor(
  editor: Pick<HTMLElement, "contains">,
  target: EventTarget | null,
): boolean {
  return target !== null && editor.contains(target as Node);
}

/** イベント対象から文字チップツールを取得する。 */
function toolOf(target: EventTarget | null): HTMLElement | null {
  const closest = (target as { closest?: (selector: string) => Element | null } | null)?.closest;
  return closest?.call(target, ".chip-tool-button") as HTMLElement | null | undefined ?? null;
}
