import type { RailId } from "./docking-persistence-model.js";

export interface BayPickerDragState {
  readonly bayId: string;
  readonly sourceRail?: RailId;
}

export interface BayPickerDragConnection {
  state(): BayPickerDragState | null;
  cancel(): void;
  disconnect(): void;
}

interface BayPickerDragOptions {
  readonly isEnabled?: () => boolean;
  readonly keyboardTarget?: Pick<Document, "addEventListener" | "removeEventListener">;
}

type DragEventRoot = Pick<HTMLElement, "addEventListener" | "removeEventListener">;
type PreviewRoot = Pick<HTMLElement, "querySelectorAll">;

/** ベイタグD&Dの開始・終了と、配置元プレビューの半透明表示を管理する。 */
export function bindBayPickerDrag(
  picker: DragEventRoot,
  previewRoots: readonly PreviewRoot[],
  options: BayPickerDragOptions = {},
): BayPickerDragConnection {
  const keyboardTarget = options.keyboardTarget ?? document;
  let draggedTag: HTMLElement | null = null;
  let sourcePreview: HTMLElement | null = null;
  let dragState: BayPickerDragState | null = null;

  const onDragStart = (event: Event): void => {
    if (options.isEnabled?.() === false) return;
    const dragEvent = event as DragEvent;
    const tag = tagOf(dragEvent.target);
    const bayId = tag?.dataset.bayId;
    if (tag === null || bayId === undefined) return;
    clearState();
    const sourceRail = railOf(tag.dataset.rail);
    dragState = sourceRail === undefined ? { bayId } : { bayId, sourceRail };
    draggedTag = tag;
    sourcePreview = sourceRail === undefined ? null : findPreview(previewRoots, bayId);
    tag.classList.add("dragging");
    sourcePreview?.classList.add("dock-bay--drag-source");
    if (dragEvent.dataTransfer !== null) {
      dragEvent.dataTransfer.effectAllowed = "move";
      try {
        dragEvent.dataTransfer.setData("text/plain", bayId);
      } catch {
        // Firefoxがデータ設定を拒否しても内部状態でD&Dを継続する。
      }
    }
  };

  const onDragEnd = (): void => clearState();
  const onKeyDown = (event: Event): void => {
    if ((event as KeyboardEvent).key === "Escape") clearState();
  };

  /** タグと配置元プレビューのドラッグ表示、および内部状態を復元する。 */
  function clearState(): void {
    draggedTag?.classList.remove("dragging");
    sourcePreview?.classList.remove("dock-bay--drag-source");
    draggedTag = null;
    sourcePreview = null;
    dragState = null;
  }

  picker.addEventListener("dragstart", onDragStart);
  picker.addEventListener("dragend", onDragEnd);
  keyboardTarget.addEventListener("keydown", onKeyDown);

  return {
    state: () => dragState === null ? null : { ...dragState },
    cancel: clearState,
    disconnect(): void {
      picker.removeEventListener("dragstart", onDragStart);
      picker.removeEventListener("dragend", onDragEnd);
      keyboardTarget.removeEventListener("keydown", onKeyDown);
      clearState();
    },
  };
}

/** 4レールから対象ベイの現在のプレビューDOMを探索する。 */
function findPreview(roots: readonly PreviewRoot[], bayId: string): HTMLElement | null {
  for (const root of roots) {
    const preview = [...root.querySelectorAll<HTMLElement>(".dock-bay--preview")]
      .find((candidate) => candidate.dataset.bayId === bayId);
    if (preview !== undefined) return preview;
  }
  return null;
}

/** イベント対象が属するベイタグを返す。 */
function tagOf(target: EventTarget | null): HTMLElement | null {
  const closest = (target as { closest?: (selector: string) => Element | null } | null)?.closest;
  return closest?.call(target, ".bay-picker-tag") as HTMLElement | null | undefined ?? null;
}

/** DOMデータ属性を既知のレールIDだけへ絞り込む。 */
function railOf(value: string | undefined): RailId | undefined {
  return value === "top" || value === "left" || value === "right" || value === "bottom"
    ? value
    : undefined;
}
