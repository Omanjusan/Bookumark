import type { BayEditSession } from "./bay-edit-session.js";
import type { BayFactoryChipChange } from "./bay-factory-chip-drag.js";
import type { BayFactoryViewModel } from "./bay-factory-static-view.js";
import type { ChipToolDrop } from "./chip-tool-bay-drag.js";

interface BayEditTransactionElements {
  readonly undo: HTMLButtonElement;
  readonly redo: HTMLButtonElement;
  readonly save: HTMLButtonElement;
  readonly name?: HTMLInputElement;
}

interface BayEditTransactionOptions {
  readonly chipLabels: ReadonlyMap<string, string>;
  readonly render: (model: BayFactoryViewModel) => void;
  readonly onSaved?: () => void;
  readonly onSaveError?: (error: unknown) => void;
  readonly onNameError?: (error: unknown) => void;
}

export interface BayEditTransactionConnection {
  handleToolDrop(drop: ChipToolDrop): void;
  handleChipChange(change: BayFactoryChipChange): void;
  refresh(): void;
  disconnect(): void;
}

/** DB-6のD&D通知と工場メニューを1つのベイ編集セッションへ接続する。 */
export function bindBayEditTransaction(
  session: BayEditSession,
  elements: BayEditTransactionElements,
  options: BayEditTransactionOptions,
): BayEditTransactionConnection {
  /** 現在のドラフトを文字チップ表示モデルへ変換する。 */
  const currentModel = (): BayFactoryViewModel => {
    const bay = session.draftBay();
    return {
      bayId: bay.id,
      name: bay.name,
      chips: bay.chips.map((chip) => ({
        instanceId: chip.instanceId,
        label: options.chipLabels.get(chip.chipType) ?? chip.chipType,
      })),
    };
  };

  /** ドラフト表示と履歴・保存ボタンの状態を同期する。 */
  const refresh = (): void => {
    options.render(currentModel());
    elements.undo.disabled = session.saving || !session.canUndo;
    elements.redo.disabled = session.saving || !session.canRedo;
    elements.save.disabled = session.saving || !session.dirty;
    if (elements.name) {
      elements.name.value = session.draftBay().name;
      elements.name.disabled = session.saving;
    }
  };

  /** ツールからのdropを新規チップ追加として反映する。 */
  const handleToolDrop = (drop: ChipToolDrop): void => {
    session.addChip(drop.chipType, drop.index);
    refresh();
  };

  /** 配置済みチップの並べ替え・削除通知を反映する。 */
  const handleChipChange = (change: BayFactoryChipChange): void => {
    if (change.type === "reorder") session.reorderChip(change.instanceId, change.index);
    else session.deleteChip(change.instanceId);
    refresh();
  };

  const onUndo = (): void => {
    session.undo();
    refresh();
  };
  const onRedo = (): void => {
    session.redo();
    refresh();
  };
  const onSave = (): void => {
    const saving = session.save();
    refresh();
    void saving.then(
      () => options.onSaved?.(),
      (error: unknown) => options.onSaveError?.(error),
    ).finally(refresh);
  };
  const onNameChange = (): void => {
    if (!elements.name) return;
    try {
      session.renameBay(elements.name.value);
    } catch (error: unknown) {
      options.onNameError?.(error);
    }
    refresh();
  };

  elements.undo.addEventListener("click", onUndo);
  elements.redo.addEventListener("click", onRedo);
  elements.save.addEventListener("click", onSave);
  elements.name?.addEventListener("change", onNameChange);
  refresh();

  return {
    handleToolDrop,
    handleChipChange,
    refresh,
    disconnect(): void {
      elements.undo.removeEventListener("click", onUndo);
      elements.redo.removeEventListener("click", onRedo);
      elements.save.removeEventListener("click", onSave);
      elements.name?.removeEventListener("change", onNameChange);
    },
  };
}
